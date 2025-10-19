import type { LipidProfileSession, LipidChartSettings } from '@/types/LipidTypes';
import { DEFAULT_LIPID_FRAMEWORK_ID, DEFAULT_LIPID_BAND_ID } from '@/config/lipidOverlays';
import { logger } from '@/utils/Logger';

const STORAGE_KEYS = {
  LATEST: 'lipid-profile-latest',
  HISTORY: 'lipid-profile-history',
  SETTINGS: 'lipid-profile-settings'
} as const;

const MAX_HISTORY = 5;

export const DEFAULT_LIPID_SETTINGS: LipidChartSettings = {
  framework: DEFAULT_LIPID_FRAMEWORK_ID as 'au-practice',
  selectedBandId: DEFAULT_LIPID_BAND_ID,
  selectedAnalytes: ['ldl', 'tchol'],
  timeFilter: '6m',
  ldlOnlyView: false,
  showTherapyBands: true
};

export class LipidProfileStorage {
  private static instance: LipidProfileStorage;

  private constructor() {}

  public static getInstance(): LipidProfileStorage {
    if (!LipidProfileStorage.instance) {
      LipidProfileStorage.instance = new LipidProfileStorage();
    }
    return LipidProfileStorage.instance;
  }

  async saveSession(session: LipidProfileSession): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.LATEST]: session });
    logger.info('Lipid profile session saved', {
      component: 'lipid-storage',
      id: session.id,
      readings: session.readings.length
    });
    await this.addToHistory(session);
  }

  async loadLatestSession(): Promise<LipidProfileSession | null> {
    const data = await chrome.storage.local.get(STORAGE_KEYS.LATEST);
    return (data[STORAGE_KEYS.LATEST] as LipidProfileSession | undefined) ?? null;
  }

  async clearLatest(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEYS.LATEST);
  }

  async saveSettings(settings: LipidChartSettings): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
  }

  async loadSettings(): Promise<LipidChartSettings> {
    const data = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return (data[STORAGE_KEYS.SETTINGS] as LipidChartSettings | undefined) ?? DEFAULT_LIPID_SETTINGS;
  }

  private async addToHistory(session: LipidProfileSession): Promise<void> {
    try {
      const data = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
      const history = (data[STORAGE_KEYS.HISTORY] as LipidProfileSession[] | undefined) ?? [];
      history.unshift(session);
      const trimmed = history.slice(0, MAX_HISTORY);
      await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: trimmed });
    } catch (error) {
      logger.warn('Failed to append lipid profile session to history', {
        component: 'lipid-storage',
        error: error instanceof Error ? error.message : 'unknown'
      });
    }
  }
}

