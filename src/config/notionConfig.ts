/**
 * Configuration for Notion integration
 * 
 * NOTE:
 * - This extension can talk directly to the Notion API (`https://api.notion.com/v1`)
 *   as long as the extension CSP allows it.
 * - Database IDs are user-specific and must be configured per user.
 */

export interface NotionConfig {
  apiKey: string;
  /**
   * Base URL for Notion requests.
   * - Direct: `https://api.notion.com/v1`
   * - Proxy (optional): `http://localhost:3000/api/notion` (must forward to Notion v1)
   */
  proxyUrl: string;
  databases: {
    billing: string;
    patients: string;
    mbsCodes: string;
    currentInpatients: string;
    structuralWorkup: string;
  };
}

// Default database IDs for Shane's Notion workspace
export const DEFAULT_NOTION_CONFIG: Partial<NotionConfig> = {
  proxyUrl: 'https://api.notion.com/v1',
  databases: {
    billing: '957924dc-d33e-4e3b-8a6c-edec21d6a73c',
    patients: 'cb37d7b0-9fff-4bb5-b6fe-a05fe0bcfc65',
    mbsCodes: '8e18e854-4262-4e4f-a667-307bf45c6bdc',
    currentInpatients: '1e057ad4-537e-80aa-b26a-c88fc932c0cd',
    structuralWorkup: '3c8c6bb4-6dcc-4598-b4bf-77e6d27d6b26',
  }
};

export const NOTION_CONFIG_KEY = 'operator_notion_config_v1';

/**
 * Load Notion configuration from storage
 */
export const loadNotionConfig = async (): Promise<NotionConfig | null> => {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const result = await chrome.storage.local.get(NOTION_CONFIG_KEY);
      const stored = result[NOTION_CONFIG_KEY];
      if (stored) {
        return {
          ...DEFAULT_NOTION_CONFIG,
          ...stored,
          databases: {
            ...DEFAULT_NOTION_CONFIG.databases,
            ...stored.databases
          }
        } as NotionConfig;
      }
    } else {
      const stored = localStorage.getItem(NOTION_CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed) {
          return {
            ...DEFAULT_NOTION_CONFIG,
            ...parsed,
            databases: {
              ...DEFAULT_NOTION_CONFIG.databases,
              ...parsed.databases
            }
          } as NotionConfig;
        }
      }
    }
  } catch (error) {
    console.warn('Failed to load Notion config:', error);
  }
  return null;
};

/**
 * Save Notion configuration to storage
 */
export const saveNotionConfig = async (config: Partial<NotionConfig>): Promise<void> => {
  try {
    const existing = await loadNotionConfig();
    const merged = {
      ...DEFAULT_NOTION_CONFIG,
      ...existing,
      ...config,
      databases: {
        ...DEFAULT_NOTION_CONFIG.databases,
        ...existing?.databases,
        ...config.databases
      }
    };
    
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [NOTION_CONFIG_KEY]: merged });
    } else {
      localStorage.setItem(NOTION_CONFIG_KEY, JSON.stringify(merged));
    }
  } catch (error) {
    console.error('Failed to save Notion config:', error);
    throw error;
  }
};

/**
 * Check if Notion is configured (has API key)
 */
export const isNotionConfigured = async (): Promise<boolean> => {
  const config = await loadNotionConfig();
  return !!(config?.apiKey);
};
