/**
 * NotionBillingService
 * 
 * Handles syncing billing entries to Notion database.
 * Creates billing records in Notion when entries are marked as "entered".
 */

import { BillingEntry } from '@/types/rounds.types';
import { loadNotionConfig, NotionConfig } from '@/config/notionConfig';

interface NotionCreateResponse {
  id: string;
  object: string;
  created_time: string;
}

interface NotionUserMeResponse {
  id: string;
  object: string;
  name?: string;
}

interface NotionDatabaseResponse {
  id: string;
  title?: Array<{ plain_text?: string }>;
  properties?: Record<string, any>;
}

interface NotionQueryResponse {
  object: string;
  results: Array<{
    id: string;
    properties: Record<string, unknown>;
  }>;
  next_cursor: string | null;
  has_more: boolean;
}

export class NotionBillingService {
  private static instance: NotionBillingService | null = null;
  private config: NotionConfig | null = null;
  private configLoaded = false;
  private databaseSchemaCache = new Map<string, NotionDatabaseResponse>();

  private constructor() {}

  public static getInstance(): NotionBillingService {
    if (!NotionBillingService.instance) {
      NotionBillingService.instance = new NotionBillingService();
    }
    return NotionBillingService.instance;
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
    if (!this.config.databases?.billing?.trim()) {
      throw new Error('Notion billing database is not configured. Please add your Billing Database ID in settings.');
    }
    return this.config;
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
      return !!(config?.apiKey?.trim() && config?.databases?.billing?.trim());
    } catch {
      return false;
    }
  }

  /**
   * Make a request to the Notion proxy
   */
  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
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
   * Lightweight configuration test.
   * - For direct Notion API, this calls `/users/me`.
   * - For a proxy, the proxy must forward `/users/me` to Notion v1.
   */
  public async testConnection(): Promise<{ userId: string; name?: string }> {
    const me = await this.request<NotionUserMeResponse>('/users/me', { method: 'GET' });
    return { userId: me.id, name: me.name };
  }

  public async getBillingDatabaseInfo(): Promise<{ databaseId: string; title: string }> {
    const config = await this.ensureConfig();
    const databaseId = config.databases.billing;
    const db = await this.request<NotionDatabaseResponse>(`/databases/${databaseId}`, { method: 'GET' });
    const title = (db.title || []).map(t => t.plain_text).filter(Boolean).join('') || databaseId;
    return { databaseId: db.id || databaseId, title };
  }

  public async getDatabaseSchemaSummary(databaseId: string): Promise<{
    databaseId: string;
    title: string;
    properties: Array<{
      name: string;
      type: string;
      relationDatabaseId?: string;
      selectOptions?: string[];
    }>;
  }> {
    if (!databaseId?.trim()) {
      throw new Error('Database ID is required to fetch schema.');
    }
    const db = await this.getDatabaseSchema(databaseId.trim());
    const title = (db.title || []).map(t => t.plain_text).filter(Boolean).join('') || databaseId.trim();
    const properties = Object.entries(db.properties || {})
      .map(([name, prop]) => {
        const type = String(prop?.type || 'unknown');
        const relationDatabaseId = prop?.type === 'relation' ? prop?.relation?.database_id : undefined;
        const selectOptions =
          prop?.type === 'select'
            ? (prop?.select?.options || []).map((o: any) => o?.name).filter(Boolean)
            : undefined;
        return { name, type, relationDatabaseId, selectOptions };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return { databaseId: db.id || databaseId.trim(), title, properties };
  }

  private normalizePropertyName(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private findTitlePropertyName(db: NotionDatabaseResponse): string | null {
    const props = db.properties || {};
    for (const [name, prop] of Object.entries(props)) {
      if (prop?.type === 'title') return name;
    }
    return null;
  }

  private findPropertyByTypeAndKeywords(
    db: NotionDatabaseResponse,
    type: string,
    keywords: string[]
  ): string | null {
    const props = db.properties || {};
    const normalizedKeywords = keywords.map(k => this.normalizePropertyName(k));
    for (const [name, prop] of Object.entries(props)) {
      if (prop?.type !== type) continue;
      const normalizedName = this.normalizePropertyName(name);
      if (normalizedKeywords.some(k => normalizedName.includes(k))) return name;
    }
    return null;
  }

  private findRelationPropertyForDatabase(
    db: NotionDatabaseResponse,
    relatedDatabaseId: string,
    fallbackKeywords: string[] = []
  ): string | null {
    const props = db.properties || {};
    for (const [name, prop] of Object.entries(props)) {
      if (prop?.type !== 'relation') continue;
      const targetId = prop?.relation?.database_id;
      if (targetId && targetId === relatedDatabaseId) return name;
    }
    if (fallbackKeywords.length > 0) {
      return this.findPropertyByTypeAndKeywords(db, 'relation', fallbackKeywords);
    }
    return null;
  }

  private async getDatabaseSchema(databaseId: string): Promise<NotionDatabaseResponse> {
    const cached = this.databaseSchemaCache.get(databaseId);
    if (cached) return cached;
    const db = await this.request<NotionDatabaseResponse>(`/databases/${databaseId}`, { method: 'GET' });
    this.databaseSchemaCache.set(databaseId, db);
    return db;
  }

  private async findPageIdByTextEquals(
    databaseId: string,
    propertyName: string,
    propertyType: 'title' | 'rich_text',
    value: string
  ): Promise<string | null> {
    const response = await this.request<NotionQueryResponse>(`/databases/${databaseId}/query`, {
      method: 'POST',
      body: JSON.stringify({
        page_size: 1,
        filter: {
          property: propertyName,
          [propertyType]: { equals: value }
        }
      })
    });
    return response.results[0]?.id || null;
  }

  private async createPageInDatabase(
    databaseId: string,
    properties: Record<string, unknown>
  ): Promise<string> {
    const response = await this.request<NotionCreateResponse>('/pages', {
      method: 'POST',
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties
      })
    });
    return response.id;
  }

  private async ensurePatientPage(patientName: string): Promise<string> {
    const config = await this.ensureConfig();
    const patientsDbId = config.databases.patients?.trim();
    if (!patientsDbId) {
      throw new Error('Notion patients database is not configured (needed for Patient relation).');
    }

    const db = await this.getDatabaseSchema(patientsDbId);
    const titleProp = this.findTitlePropertyName(db) || 'Name';

    const existing = await this.findPageIdByTextEquals(patientsDbId, titleProp, 'title', patientName);
    if (existing) return existing;

    const props: Record<string, unknown> = {
      [titleProp]: { title: [{ text: { content: patientName } }] }
    };
    return this.createPageInDatabase(patientsDbId, props);
  }

  private async ensureMbsCodePage(entry: BillingEntry): Promise<string> {
    const config = await this.ensureConfig();
    const mbsDbId = config.databases.mbsCodes?.trim();
    if (!mbsDbId) {
      throw new Error('Notion MBS codes database is not configured (needed for MBS Code relation).');
    }

    const db = await this.getDatabaseSchema(mbsDbId);
    const props = db.properties || {};

    const codePropName =
      Object.entries(props).find(([name, prop]) => prop?.type === 'title' && this.normalizePropertyName(name).includes('code'))?.[0] ||
      this.findTitlePropertyName(db) ||
      'Code';

    const codePropType: 'title' | 'rich_text' =
      (props[codePropName]?.type === 'rich_text' ? 'rich_text' : 'title');

    const existing = await this.findPageIdByTextEquals(mbsDbId, codePropName, codePropType, entry.mbsCode);
    if (existing) return existing;

    const descriptionProp = this.findPropertyByTypeAndKeywords(db, 'rich_text', ['description']);
    const feeProp = this.findPropertyByTypeAndKeywords(db, 'number', ['fee', 'mbs fee', 'amount']);

    const createProps: Record<string, unknown> = {};
    if (codePropType === 'title') {
      createProps[codePropName] = { title: [{ text: { content: entry.mbsCode } }] };
    } else {
      createProps[codePropName] = { rich_text: [{ text: { content: entry.mbsCode } }] };
    }
    if (descriptionProp) {
      createProps[descriptionProp] = { rich_text: [{ text: { content: entry.description } }] };
    }
    if (feeProp && entry.fee !== undefined) {
      createProps[feeProp] = { number: entry.fee };
    }

    return this.createPageInDatabase(mbsDbId, createProps);
  }

  /**
   * Create a billing entry in Notion
   * Returns the Notion page ID if successful
   */
  public async createBillingEntry(
    entry: BillingEntry,
    patientName: string
  ): Promise<string> {
    const config = await this.ensureConfig();
    const databaseId = config.databases.billing;

    const billingDb = await this.getDatabaseSchema(databaseId);
    const properties: Record<string, unknown> = {};

    const titleProp = this.findTitlePropertyName(billingDb);
    if (titleProp) {
      const titleText = (entry.notes || '').trim() || `${entry.mbsCode} - ${entry.description}`.trim() || entry.mbsCode;
      properties[titleProp] = {
        title: [{ text: { content: titleText } }]
      };
    }

    // Support logger-style schema (relations) and simple schema (text properties)
    const patientRelationProp = this.findRelationPropertyForDatabase(
      billingDb,
      config.databases.patients,
      ['patient']
    );
    const mbsRelationProp = this.findRelationPropertyForDatabase(
      billingDb,
      config.databases.mbsCodes,
      ['mbs', 'code']
    );

    const dateProp =
      this.findPropertyByTypeAndKeywords(billingDb, 'date', ['date of service']) ||
      this.findPropertyByTypeAndKeywords(billingDb, 'date', ['date', 'service']);

    const notesProp =
      this.findPropertyByTypeAndKeywords(billingDb, 'rich_text', ['notes']) ||
      this.findPropertyByTypeAndKeywords(billingDb, 'rich_text', ['note']);

    const enteredProp = this.findPropertyByTypeAndKeywords(billingDb, 'checkbox', ['billing entered', 'entered']);
    const statusSelectProp = this.findPropertyByTypeAndKeywords(billingDb, 'select', ['status']);

    const feeProp = this.findPropertyByTypeAndKeywords(billingDb, 'number', ['fee', 'amount']);
    const descriptionProp = this.findPropertyByTypeAndKeywords(billingDb, 'rich_text', ['description']);

    if (patientRelationProp) {
      const patientPageId = await this.ensurePatientPage(patientName);
      properties[patientRelationProp] = { relation: [{ id: patientPageId }] };
    } else if (billingDb.properties?.Patient?.type === 'title') {
      properties['Patient'] = { title: [{ text: { content: patientName } }] };
    }

    if (mbsRelationProp) {
      const mbsPageId = await this.ensureMbsCodePage(entry);
      properties[mbsRelationProp] = { relation: [{ id: mbsPageId }] };
    } else if (billingDb.properties?.['MBS Code']?.type === 'rich_text') {
      properties['MBS Code'] = { rich_text: [{ text: { content: entry.mbsCode } }] };
    }

    if (descriptionProp) {
      properties[descriptionProp] = { rich_text: [{ text: { content: entry.description } }] };
    }

    if (dateProp) {
      properties[dateProp] = { date: { start: entry.serviceDate } };
    }

    if (notesProp) {
      const notesText = (entry.notes || '').trim() || entry.description;
      if (notesText) {
        properties[notesProp] = { rich_text: [{ text: { content: notesText } }] };
      }
    }

    // IMPORTANT: "Billing Entered?" is managed by staff in Notion (do not auto-tick from Operator).
    if (enteredProp) {
      properties[enteredProp] = { checkbox: false };
    } else if (statusSelectProp) {
      properties[statusSelectProp] = {
        select: { name: entry.status === 'entered' ? 'Entered' : entry.status === 'rejected' ? 'Rejected' : 'Pending' }
      };
    }

    if (feeProp && entry.fee !== undefined) {
      properties[feeProp] = { number: entry.fee };
    }

    const pageId = await this.createPageInDatabase(databaseId, properties);
    console.log(`[NotionBilling] Created billing entry in Notion: ${pageId}`);
    return pageId;
  }

  /**
   * Update a billing entry in Notion
   */
  public async updateBillingEntry(
    notionPageId: string,
    updates: Partial<BillingEntry>
  ): Promise<void> {
    const properties: Record<string, unknown> = {};

    if (updates.status) {
      properties['Status'] = {
        select: { name: updates.status === 'entered' ? 'Entered' : updates.status === 'rejected' ? 'Rejected' : 'Pending' }
      };
    }

    if (updates.notes !== undefined) {
      properties['Notes'] = {
        rich_text: [{ text: { content: updates.notes || '' } }]
      };
    }

    await this.request(`/pages/${notionPageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ properties })
    });

    console.log(`[NotionBilling] Updated billing entry: ${notionPageId}`);
  }

  /**
   * Query billing entries from Notion for a specific date range
   */
  public async queryBillingEntries(
    startDate: string,
    endDate: string
  ): Promise<BillingEntry[]> {
    const config = await this.ensureConfig();
    const databaseId = config.databases.billing;

    const response = await this.request<NotionQueryResponse>(
      `/databases/${databaseId}/query`,
      {
        method: 'POST',
        body: JSON.stringify({
          filter: {
            and: [
              {
                property: 'Date of Service',
                date: { on_or_after: startDate }
              },
              {
                property: 'Date of Service',
                date: { on_or_before: endDate }
              }
            ]
          },
          sorts: [
            { property: 'Date of Service', direction: 'descending' }
          ]
        })
      }
    );

    // Map Notion pages to BillingEntry objects
    // Note: This mapping depends on your Notion database schema
    return response.results.map(page => this.mapNotionPageToBillingEntry(page));
  }

  /**
   * Map a Notion page to a BillingEntry
   * Adjust this based on your actual Notion database property names
   */
  private mapNotionPageToBillingEntry(page: { id: string; properties: Record<string, unknown> }): BillingEntry {
    const props = page.properties as Record<string, any>;
    
    // Helper to safely extract text from Notion properties
    const getText = (prop: any): string => {
      if (!prop) return '';
      if (prop.title) return prop.title[0]?.text?.content || '';
      if (prop.rich_text) return prop.rich_text[0]?.text?.content || '';
      return '';
    };

    const getNumber = (prop: any): number | undefined => {
      return prop?.number || undefined;
    };

    const getDate = (prop: any): string => {
      return prop?.date?.start || new Date().toISOString().split('T')[0];
    };

    const getSelect = (prop: any): string => {
      return prop?.select?.name || '';
    };

    const statusMap: Record<string, BillingEntry['status']> = {
      'Entered': 'entered',
      'Rejected': 'rejected',
      'Pending': 'pending'
    };

    return {
      id: page.id,
      mbsCode: getText(props['MBS Code']),
      description: getText(props['Description']),
      fee: getNumber(props['Fee']),
      serviceDate: getDate(props['Date of Service']),
      notes: getText(props['Notes']),
      status: statusMap[getSelect(props['Status'])] || 'pending',
      notionId: page.id,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Get daily billing totals from Notion
   */
  public async getDailyTotals(date: string): Promise<{
    total: number;
    count: number;
    entries: BillingEntry[];
  }> {
    const entries = await this.queryBillingEntries(date, date);
    const total = entries.reduce((sum, e) => sum + (e.fee || 0), 0);
    
    return {
      total,
      count: entries.length,
      entries
    };
  }
}

// Export singleton instance
export const notionBillingService = NotionBillingService.getInstance();
