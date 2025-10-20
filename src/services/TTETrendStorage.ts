import { DEFAULT_TTE_TREND_SETTINGS } from '@/config/tteTrendConfig';
import type { TTETrendSession, TTETrendSettings } from '@/types/TTETrendTypes';
import { logger } from '@/utils/Logger';

const STORAGE_KEYS = {
  LATEST: 'tte-trend-latest',
  SETTINGS: 'tte-trend-settings',
  HISTORY: 'tte-trend-history'
} as const;

const HISTORY_LIMIT = 5;

export class TTETrendStorage {
  private static instance: TTETrendStorage;

  static getInstance(): TTETrendStorage {
    if (!TTETrendStorage.instance) {
      TTETrendStorage.instance = new TTETrendStorage();
    }
    return TTETrendStorage.instance;
  }

  async saveSession(session: TTETrendSession): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.LATEST]: session });
    await this.appendHistory(session);
    logger.info('TTE trend session saved', { component: 'tte-trend-storage', rows: session.rows.length });
  }

  async loadLatestSession(): Promise<TTETrendSession | null> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.LATEST);
    return (result[STORAGE_KEYS.LATEST] as TTETrendSession | undefined) ?? null;
  }

  async clearLatest(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEYS.LATEST);
  }

  async saveSettings(settings: TTETrendSettings): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
  }

  async loadSettings(): Promise<TTETrendSettings> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const stored = result[STORAGE_KEYS.SETTINGS] as TTETrendSettings | undefined;
    if (!stored) {
      return DEFAULT_TTE_TREND_SETTINGS;
    }
    return {
      ...DEFAULT_TTE_TREND_SETTINGS,
      ...stored,
      enabledSeries: {
        ...DEFAULT_TTE_TREND_SETTINGS.enabledSeries,
        ...stored.enabledSeries
      },
      contextBands: {
        ...DEFAULT_TTE_TREND_SETTINGS.contextBands,
        ...stored.contextBands
      }
    };
  }

  private async appendHistory(session: TTETrendSession): Promise<void> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
      const history = (result[STORAGE_KEYS.HISTORY] as TTETrendSession[] | undefined) ?? [];
      history.unshift(session);
      const trimmed = history.slice(0, HISTORY_LIMIT);
      await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: trimmed });
    } catch (error) {
      logger.warn('Failed to append TTE trend history', {
        component: 'tte-trend-storage',
        error: error instanceof Error ? error.message : 'unknown'
      });
    }
  }
}
