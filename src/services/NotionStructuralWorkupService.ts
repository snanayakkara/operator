/**
 * NotionStructuralWorkupService
 *
 * Handles syncing with Notion Structural Workup database.
 * Bidirectional sync of Notion fields + patient list fetching.
 *
 * Pattern: Similar to NotionBillingService with schema detection
 */

import type { NotionTAVIPatient } from '@/types/taviWorkup.types';
import { loadNotionConfig, type NotionConfig } from '@/config/notionConfig';

interface NotionDatabaseResponse {
  id: string;
  title?: Array<{ plain_text?: string }>;
  properties?: Record<string, any>;
}

interface NotionUserMeResponse {
  id: string;
  object: string;
  name?: string;
}

interface NotionQueryResponse {
  object: string;
  results: Array<{
    id: string;
    url: string;
    properties: Record<string, any>;
    last_edited_time: string;
  }>;
  next_cursor: string | null;
  has_more: boolean;
}

interface NotionPageResponse {
  id: string;
  object: string;
  url?: string;
  last_edited_time?: string;
}

export class NotionStructuralWorkupService {
  private static instance: NotionStructuralWorkupService | null = null;
  private config: NotionConfig | null = null;
  private configLoaded = false;
  private databaseSchemaCache = new Map<string, NotionDatabaseResponse>();

  private constructor() {}

  public static getInstance(): NotionStructuralWorkupService {
    if (!NotionStructuralWorkupService.instance) {
      NotionStructuralWorkupService.instance = new NotionStructuralWorkupService();
    }
    return NotionStructuralWorkupService.instance;
  }

  private getBaseUrl(proxyUrl: string): string {
    return proxyUrl.replace(/\/$/, '');
  }

  private isDirectNotionApiBase(proxyUrl: string): boolean {
    try {
      const url = new URL(proxyUrl);
      return url.hostname === 'api.notion.com';
    } catch {
      return false;
    }
  }

  /**
   * Ensure config is loaded before making requests
   */
  private async ensureConfig(): Promise<NotionConfig> {
    if (!this.configLoaded) {
      this.config = await loadNotionConfig();
      this.configLoaded = true;
    }
    if (!this.config) {
      throw new Error('Notion is not configured. Please add your API key in settings.');
    }
    if (!this.config.apiKey?.trim()) {
      throw new Error('Notion is not configured. Please add your API key in settings.');
    }
    if (!this.config.databases?.structuralWorkup?.trim()) {
      throw new Error('Notion Structural Workup database is not configured. Please add your Structural Workup Database ID in settings.');
    }
    return this.config;
  }

  /**
   * Make a request to Notion (direct or proxy).
   */
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const config = await this.ensureConfig();
    const baseUrl = this.getBaseUrl(config.proxyUrl);
    const url = `${baseUrl}${path}`;

    const isDirect = this.isDirectNotionApiBase(baseUrl);
    const authHeaders: Record<string, string> = isDirect
      ? { 'Authorization': `Bearer ${config.apiKey}` }
      : { 'x-notion-api-key': config.apiKey };

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        'Notion-Version': '2022-06-28',
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Notion API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  /**
   * Reload configuration (call after settings change)
   */
  public async reloadConfig(): Promise<void> {
    this.configLoaded = false;
    this.config = null;
    this.databaseSchemaCache.clear();
    await this.ensureConfig();
  }

  /**
   * Check if Notion integration is available
   */
  public async isAvailable(): Promise<boolean> {
    try {
      const config = await loadNotionConfig();
      return !!(config?.apiKey?.trim() && config?.databases?.structuralWorkup?.trim());
    } catch {
      return false;
    }
  }

  /**
   * Fetch database schema to detect property names
   */
  private async getDatabaseSchema(databaseId: string): Promise<NotionDatabaseResponse> {
    if (this.databaseSchemaCache.has(databaseId)) {
      return this.databaseSchemaCache.get(databaseId)!;
    }

    const schema = await this.request<NotionDatabaseResponse>(`/databases/${databaseId}`, { method: 'GET' });
    this.databaseSchemaCache.set(databaseId, schema);
    return schema;
  }

  /**
   * Extract property value from Notion response
   */
  private extractPropertyValue(property: any, type: string): any {
    if (!property) return null;

    switch (type) {
      case 'title':
        return this.extractPlainText(property);
      case 'rich_text':
        return this.extractPlainText(property);
      case 'date':
        return property.date?.start || null;
      case 'select':
        return property.select?.name || null;
      case 'status':
        return property.status?.name || null;
      case 'multi_select':
        return property.multi_select?.map((item: any) => item?.name).filter(Boolean) || [];
      case 'checkbox':
        return property.checkbox || false;
      case 'number':
        return property.number || null;
      default:
        return null;
    }
  }

  private extractPlainText(property: any): string {
    const parts = property?.title || property?.rich_text || [];
    if (!Array.isArray(parts)) return '';
    return parts
      .map((part: any) => part?.plain_text || part?.text?.content || '')
      .filter(Boolean)
      .join('');
  }

  private getPropertyType(schema: NotionDatabaseResponse, propertyName: string): string | null {
    const prop = schema.properties?.[propertyName];
    return prop?.type ? String(prop.type) : null;
  }

  /**
   * Fetch patient list from Notion Structural Workup database
   * Sorts by Procedure Date ASC
   * Optionally exclude Status = "Presented"
   */
  public async fetchPatientList(options: { includePresented?: boolean } = {}): Promise<NotionTAVIPatient[]> {
    const config = await this.ensureConfig();
    const databaseId = config.databases.structuralWorkup;
    const includePresented = options.includePresented ?? true;

    // Fetch database schema to detect property names
    const schema = await this.getDatabaseSchema(databaseId);
    const statusType = this.getPropertyType(schema, 'Status');
    const statusFilter = !includePresented
      ? statusType === 'status'
        ? { status: { does_not_equal: 'Presented' } }
        : statusType === 'select'
          ? { select: { does_not_equal: 'Presented' } }
          : null
      : null;

    const body: Record<string, any> = {
      sorts: [
        {
          property: 'Procedure Date',
          direction: 'ascending'
        }
      ]
    };
    if (statusFilter) {
      body.filter = {
        property: 'Status',
        ...statusFilter
      };
    }

    const data = await this.request<NotionQueryResponse>(`/databases/${databaseId}/query`, {
      method: 'POST',
      body: JSON.stringify(body)
    });

    // Parse results into NotionTAVIPatient objects
    return data.results.map(page => {
      const props = page.properties;
      const normalizedStatusType = statusType === 'status' ? 'status' : 'select';

      return {
        notionPageId: page.id,
        notionUrl: page.url,
        patient: this.extractPropertyValue(props['Patient'], 'title'),
        referralDate: this.extractPropertyValue(props['Referral Date'], 'date'),
        referrer: this.extractPropertyValue(props['Referrer'], 'select'),
        location: this.extractPropertyValue(props['Location'], 'select'),
        procedureDate: this.extractPropertyValue(props['Procedure Date'], 'date'),
        status: this.extractPropertyValue(props['Status'], normalizedStatusType),
        category: this.extractPropertyValue(props['Category'], 'select'),
        notes: this.extractPropertyValue(props['Notes'], 'rich_text'),
        datePresented: this.extractPropertyValue(props['Date Presented'], 'date'),
        lastEditedTime: new Date(page.last_edited_time).getTime()
      };
    });
  }

  /**
   * Lightweight configuration test.
   * - For direct Notion API, this calls `/users/me`.
   * - For a proxy, the proxy must forward `/users/me` to Notion v1.
   */
  public async testConnection(): Promise<{ userId: string; name?: string }> {
    const me = await this.request<NotionUserMeResponse>('/users/me', { method: 'GET' });
    return { userId: me.id, name: me.name };
  }

  public async getDatabaseInfo(databaseId: string): Promise<{ databaseId: string; title: string }> {
    if (!databaseId?.trim()) {
      throw new Error('Database ID is required.');
    }
    const trimmedId = databaseId.trim();
    const db = await this.request<NotionDatabaseResponse>(`/databases/${trimmedId}`, { method: 'GET' });
    const title = (db.title || []).map(t => t.plain_text).filter(Boolean).join('') || trimmedId;
    return { databaseId: db.id || trimmedId, title };
  }

  /**
   * Create a new workup page in the Structural Workup database.
   */
  public async createWorkupPage(workup: {
    patient: string;
    status?: string;
    referralDate?: string;
    referrer?: string;
    location?: string;
    procedureDate?: string;
    category?: string;
    notes?: string;
    datePresented?: string;
  }): Promise<NotionPageResponse> {
    const config = await this.ensureConfig();
    const databaseId = config.databases.structuralWorkup;
    const schema = await this.getDatabaseSchema(databaseId);
    const properties = this.buildWorkupProperties(schema, workup, { includeEmpty: false });

    return this.request<NotionPageResponse>('/pages', {
      method: 'POST',
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties
      })
    });
  }

  /**
   * Update an existing workup page in Notion.
   */
  public async updateWorkupPage(
    notionPageId: string,
    workup: {
      patient: string;
      status?: string;
      referralDate?: string;
      referrer?: string;
      location?: string;
      procedureDate?: string;
      category?: string;
      notes?: string;
      datePresented?: string;
    }
  ): Promise<NotionPageResponse> {
    const config = await this.ensureConfig();
    const databaseId = config.databases.structuralWorkup;
    const schema = await this.getDatabaseSchema(databaseId);
    const properties = this.buildWorkupProperties(schema, workup, { includeEmpty: true });

    return this.request<NotionPageResponse>(`/pages/${notionPageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ properties })
    });
  }

  private buildWorkupProperties(
    schema: NotionDatabaseResponse,
    workup: {
      patient: string;
      status?: string;
      referralDate?: string;
      referrer?: string;
      location?: string;
      procedureDate?: string;
      category?: string;
      notes?: string;
      datePresented?: string;
    },
    options: { includeEmpty: boolean }
  ): Record<string, any> {
    const properties: Record<string, any> = {};
    const includeEmpty = options.includeEmpty;

    const statusType = this.getPropertyType(schema, 'Status');
    const referrerType = this.getPropertyType(schema, 'Referrer');
    const categoryType = this.getPropertyType(schema, 'Category');
    const locationType = this.getPropertyType(schema, 'Location');
    const notesType = this.getPropertyType(schema, 'Notes');
    const referralDateType = this.getPropertyType(schema, 'Referral Date');
    const procedureDateType = this.getPropertyType(schema, 'Procedure Date');
    const datePresentedType = this.getPropertyType(schema, 'Date Presented');

    const defaultStatus = workup.status?.trim() || 'Undergoing Workup';

    this.addProperty(properties, 'Patient', this.buildTextProperty('title', workup.patient || 'New Workup', includeEmpty));
    this.addProperty(properties, 'Status', this.buildSelectOrStatusProperty(statusType, defaultStatus, includeEmpty));
    this.addProperty(properties, 'Category', this.buildSelectOrStatusProperty(categoryType, workup.category, includeEmpty));
    this.addProperty(properties, 'Referrer', this.buildSelectOrStatusProperty(referrerType, workup.referrer, includeEmpty));
    this.addProperty(properties, 'Location', this.buildSelectOrStatusProperty(locationType, workup.location, includeEmpty));
    if (notesType === 'title' || notesType === 'rich_text') {
      this.addProperty(properties, 'Notes', this.buildTextProperty(notesType === 'title' ? 'title' : 'rich_text', workup.notes, includeEmpty));
    }
    this.addProperty(properties, 'Referral Date', this.buildDateProperty(referralDateType, workup.referralDate, includeEmpty));
    this.addProperty(properties, 'Procedure Date', this.buildDateProperty(procedureDateType, workup.procedureDate, includeEmpty));
    this.addProperty(properties, 'Date Presented', this.buildDateProperty(datePresentedType, workup.datePresented, includeEmpty));

    return properties;
  }

  private addProperty(properties: Record<string, any>, name: string, payload?: Record<string, any>): void {
    if (payload) {
      properties[name] = payload;
    }
  }

  private buildTextProperty(type: 'title' | 'rich_text', value?: string, includeEmpty = false): Record<string, any> | undefined {
    const trimmed = value?.trim();
    if (!trimmed && !includeEmpty) return undefined;
    if (type === 'title') {
      return { title: trimmed ? [{ text: { content: trimmed } }] : [] };
    }
    return { rich_text: trimmed ? [{ text: { content: trimmed } }] : [] };
  }

  private buildSelectOrStatusProperty(type: string | null, value?: string, includeEmpty = false): Record<string, any> | undefined {
    if (type !== 'select' && type !== 'status') return undefined;
    const trimmed = value?.trim();
    if (!trimmed && !includeEmpty) return undefined;
    if (type === 'status') {
      return { status: trimmed ? { name: trimmed } : null };
    }
    return { select: trimmed ? { name: trimmed } : null };
  }

  private buildDateProperty(type: string | null, value?: string, includeEmpty = false): Record<string, any> | undefined {
    if (type && type !== 'date') return undefined;
    if (!value && !includeEmpty) return undefined;
    return { date: value ? { start: value } : null };
  }
}
