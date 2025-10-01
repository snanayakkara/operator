/**
 * BP Diary Storage Service
 *
 * Handles persistence of BP diary sessions using chrome.storage.local.
 * Stores the latest session and optional history for future enhancements.
 */

import type { BPDiarySession, BPDiarySettings } from '@/types/BPTypes';
import { DEFAULT_BP_SETTINGS } from '@/types/BPTypes';
import { logger } from '@/utils/Logger';

const STORAGE_KEYS = {
  LATEST_SESSION: 'bp-diary-latest',
  SETTINGS: 'bp-diary-settings',
  HISTORY: 'bp-diary-history'
} as const;

const MAX_HISTORY_ITEMS = 10; // Keep last 10 sessions

export class BPDiaryStorage {
  private static instance: BPDiaryStorage;

  private constructor() {}

  public static getInstance(): BPDiaryStorage {
    if (!BPDiaryStorage.instance) {
      BPDiaryStorage.instance = new BPDiaryStorage();
    }
    return BPDiaryStorage.instance;
  }

  /**
   * Save the latest BP diary session
   */
  public async saveSession(session: BPDiarySession): Promise<void> {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.LATEST_SESSION]: session
      });

      logger.info('BP diary session saved', {
        component: 'bp-storage',
        sessionId: session.id,
        readingsCount: session.readings.length
      });

      // Also add to history
      await this.addToHistory(session);

    } catch (error) {
      logger.error('Failed to save BP diary session', {
        component: 'bp-storage',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Load the latest BP diary session
   */
  public async loadLatestSession(): Promise<BPDiarySession | null> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.LATEST_SESSION);
      const session = result[STORAGE_KEYS.LATEST_SESSION] as BPDiarySession | undefined;

      if (session) {
        logger.info('BP diary session loaded', {
          component: 'bp-storage',
          sessionId: session.id,
          readingsCount: session.readings.length
        });
      }

      return session || null;

    } catch (error) {
      logger.error('Failed to load BP diary session', {
        component: 'bp-storage',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Clear the latest session
   */
  public async clearLatestSession(): Promise<void> {
    try {
      await chrome.storage.local.remove(STORAGE_KEYS.LATEST_SESSION);
      logger.info('BP diary latest session cleared', { component: 'bp-storage' });
    } catch (error) {
      logger.error('Failed to clear BP diary session', {
        component: 'bp-storage',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Save user settings
   */
  public async saveSettings(settings: BPDiarySettings): Promise<void> {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.SETTINGS]: settings
      });

      logger.info('BP diary settings saved', { component: 'bp-storage' });

    } catch (error) {
      logger.error('Failed to save BP diary settings', {
        component: 'bp-storage',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Load user settings (with defaults)
   */
  public async loadSettings(): Promise<BPDiarySettings> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
      const settings = result[STORAGE_KEYS.SETTINGS] as BPDiarySettings | undefined;

      return settings || DEFAULT_BP_SETTINGS;

    } catch (error) {
      logger.error('Failed to load BP diary settings', {
        component: 'bp-storage',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return DEFAULT_BP_SETTINGS;
    }
  }

  /**
   * Add session to history (for future feature: view past imports)
   */
  private async addToHistory(session: BPDiarySession): Promise<void> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
      let history = (result[STORAGE_KEYS.HISTORY] as BPDiarySession[]) || [];

      // Add to beginning of history
      history.unshift(session);

      // Keep only last N items
      if (history.length > MAX_HISTORY_ITEMS) {
        history = history.slice(0, MAX_HISTORY_ITEMS);
      }

      await chrome.storage.local.set({
        [STORAGE_KEYS.HISTORY]: history
      });

    } catch (error) {
      // Non-critical error, just log it
      logger.warn('Failed to add session to history', {
        component: 'bp-storage',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Load session history (for future enhancement)
   */
  public async loadHistory(): Promise<BPDiarySession[]> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
      return (result[STORAGE_KEYS.HISTORY] as BPDiarySession[]) || [];
    } catch (error) {
      logger.error('Failed to load BP diary history', {
        component: 'bp-storage',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Clear all BP diary data
   */
  public async clearAll(): Promise<void> {
    try {
      await chrome.storage.local.remove([
        STORAGE_KEYS.LATEST_SESSION,
        STORAGE_KEYS.SETTINGS,
        STORAGE_KEYS.HISTORY
      ]);
      logger.info('All BP diary data cleared', { component: 'bp-storage' });
    } catch (error) {
      logger.error('Failed to clear BP diary data', {
        component: 'bp-storage',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}