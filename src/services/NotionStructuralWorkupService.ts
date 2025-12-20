/**
 * NotionStructuralWorkupService
 *
 * Handles syncing with Notion Structural Workup database.
 * One-way fetch of patient list + one-way push of status updates.
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

interface NotionPageUpdateResponse {
  id: string;
  object: string;
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
      const config = await this.ensureConfig();
      return !!(config.apiKey && config.databases?.structuralWorkup);
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

    const config = await this.ensureConfig();
    const baseUrl = this.getBaseUrl(config.proxyUrl);
    const url = `${baseUrl}/databases/${databaseId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch database schema: ${response.status} ${errorText}`);
    }

    const schema = await response.json() as NotionDatabaseResponse;
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
        return property.title?.[0]?.plain_text || '';
      case 'rich_text':
        return property.rich_text?.[0]?.plain_text || '';
      case 'date':
        return property.date?.start || null;
      case 'select':
        return property.select?.name || null;
      case 'checkbox':
        return property.checkbox || false;
      case 'number':
        return property.number || null;
      default:
        return null;
    }
  }

  /**
   * Fetch patient list from Notion Structural Workup database
   * Filters out patients with Status = "Presented"
   * Sorts by Procedure Date ASC
   */
  public async fetchPatientList(): Promise<NotionTAVIPatient[]> {
    const config = await this.ensureConfig();
    const databaseId = config.databases.structuralWorkup;
    const baseUrl = this.getBaseUrl(config.proxyUrl);
    const url = `${baseUrl}/databases/${databaseId}/query`;

    // Fetch database schema to detect property names
    const schema = await this.getDatabaseSchema(databaseId);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filter: {
          property: 'Status',
          status: {
            does_not_equal: 'Presented'
          }
        },
        sorts: [
          {
            property: 'Procedure Date',
            direction: 'ascending'
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch patient list: ${response.status} ${errorText}`);
    }

    const data = await response.json() as NotionQueryResponse;

    // Parse results into NotionTAVIPatient objects
    return data.results.map(page => {
      const props = page.properties;

      return {
        notionPageId: page.id,
        notionUrl: page.url,
        patient: this.extractPropertyValue(props['Patient'], 'title'),
        referralDate: this.extractPropertyValue(props['Referral Date'], 'date'),
        referrer: this.extractPropertyValue(props['Referrer'], 'rich_text'),
        location: this.extractPropertyValue(props['Location'], 'select'),
        procedureDate: this.extractPropertyValue(props['Procedure Date'], 'date'),
        status: this.extractPropertyValue(props['Status'], 'status') || this.extractPropertyValue(props['Status'], 'select'),
        category: this.extractPropertyValue(props['Category'], 'select'),
        readyToPresent: this.extractPropertyValue(props['Ready To Present'], 'checkbox'),
        lastEditedTime: new Date(page.last_edited_time).getTime()
      };
    });
  }

  /**
   * Update workup status in Notion (one-way push)
   * Maps extension status to Notion status
   */
  public async updateWorkupStatus(
    notionPageId: string,
    status: 'pending' | 'in-progress' | 'presented'
  ): Promise<void> {
    const config = await this.ensureConfig();
    const baseUrl = this.getBaseUrl(config.proxyUrl);
    const url = `${baseUrl}/pages/${notionPageId}`;

    // Map extension status to Notion status values
    const notionStatus = {
      'pending': 'Pending',
      'in-progress': 'In Progress',
      'presented': 'Presented'
    }[status];

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          'Status': {
            status: {
              name: notionStatus
            }
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update workup status: ${response.status} ${errorText}`);
    }
  }

  /**
   * Mark workup as ready to present in Notion
   */
  public async markReadyToPresent(notionPageId: string, ready: boolean): Promise<void> {
    const config = await this.ensureConfig();
    const baseUrl = this.getBaseUrl(config.proxyUrl);
    const url = `${baseUrl}/pages/${notionPageId}`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          'Ready To Present': {
            checkbox: ready
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to mark ready to present: ${response.status} ${errorText}`);
    }
  }
}
