/**
 * TAVI Workup Storage Service
 *
 * Singleton service for managing persistent TAVI workup storage.
 * Pattern mirrors RoundsStorageService:
 * - Debounced writes (250ms) to avoid thrashing storage
 * - Subscriber pattern for real-time UI updates
 * - chrome.storage.local for persistent storage
 *
 * Usage:
 *   const storage = TAVIWorkupStorageService.getInstance();
 *   const workups = await storage.loadWorkups();
 *   storage.subscribe((workups) => setWorkups(workups));
 */

import type { TAVIWorkupItem } from '@/types/taviWorkup.types';

export class TAVIWorkupStorageService {
  private static STORAGE_KEY = 'TAVI_WORKUPS_V1';
  private static SAVE_DEBOUNCE_MS = 250;
  private static instance: TAVIWorkupStorageService | null = null;

  private cache: TAVIWorkupItem[] = [];
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<(workups: TAVIWorkupItem[]) => void>();
  private storageListener: ((changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => void) | null = null;

  private constructor() {
    // Listen for external storage changes (e.g., from other instances or background script)
    this.storageListener = (changes, areaName) => {
      if (areaName === 'local' && changes[TAVIWorkupStorageService.STORAGE_KEY]) {
        const newValue = changes[TAVIWorkupStorageService.STORAGE_KEY].newValue;
        if (newValue) {
          this.cache = newValue;
          this.notify();
        }
      }
    };
    chrome.storage.onChanged.addListener(this.storageListener);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): TAVIWorkupStorageService {
    if (!TAVIWorkupStorageService.instance) {
      TAVIWorkupStorageService.instance = new TAVIWorkupStorageService();
    }
    return TAVIWorkupStorageService.instance;
  }

  // === CORE CRUD OPERATIONS ===

  /**
   * Load all workups from storage
   */
  public async loadWorkups(): Promise<TAVIWorkupItem[]> {
    try {
      const result = await chrome.storage.local.get(TAVIWorkupStorageService.STORAGE_KEY);
      const stored = result[TAVIWorkupStorageService.STORAGE_KEY];

      if (Array.isArray(stored)) {
        this.cache = stored;
        console.log(`[TAVIWorkupStorage] Loaded ${stored.length} workups`);
        return [...this.cache];
      }

      console.log('[TAVIWorkupStorage] No workups found, initializing empty array');
      this.cache = [];
      return [];
    } catch (error) {
      console.error('[TAVIWorkupStorage] Failed to load workups:', error);
      this.cache = [];
      return [];
    }
  }

  /**
   * Save all workups to storage (overwrites entire array)
   */
  public async saveWorkups(workups: TAVIWorkupItem[]): Promise<void> {
    this.cache = [...workups];
    this.schedulePersist();
    this.notify();
  }

  /**
   * Update a single workup using an updater function
   * Pattern: updateWorkup(id, w => ({ ...w, status: 'ready' }))
   */
  public async updateWorkup(
    id: string,
    updater: (workup: TAVIWorkupItem) => TAVIWorkupItem
  ): Promise<void> {
    this.cache = this.cache.map(w => (w.id === id ? updater(w) : w));
    this.schedulePersist();
    this.notify();
  }

  /**
   * Delete a workup by ID
   */
  public async deleteWorkup(id: string): Promise<void> {
    this.cache = this.cache.filter(w => w.id !== id);
    this.schedulePersist();
    this.notify();
  }

  /**
   * Add a new workup (convenience method)
   */
  public async addWorkup(workup: TAVIWorkupItem): Promise<void> {
    this.cache = [...this.cache, workup];
    this.schedulePersist();
    this.notify();
  }

  // === SUBSCRIPTION PATTERN ===

  /**
   * Subscribe to workup changes
   * Returns unsubscribe function
   */
  public subscribe(listener: (workups: TAVIWorkupItem[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all subscribers of changes
   */
  private notify(): void {
    const snapshot = [...this.cache];
    this.listeners.forEach(listener => {
      try {
        listener(snapshot);
      } catch (error) {
        console.error('[TAVIWorkupStorage] Subscriber error:', error);
      }
    });
  }

  // === DEBOUNCED PERSISTENCE ===

  /**
   * Schedule a debounced save (250ms delay)
   */
  private schedulePersist(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.persist().catch(error => {
        console.error('[TAVIWorkupStorage] Persist failed:', error);
      });
    }, TAVIWorkupStorageService.SAVE_DEBOUNCE_MS);
  }

  /**
   * Immediately persist cache to chrome.storage.local
   */
  private async persist(): Promise<void> {
    try {
      await chrome.storage.local.set({
        [TAVIWorkupStorageService.STORAGE_KEY]: this.cache
      });
      console.log(`[TAVIWorkupStorage] Persisted ${this.cache.length} workups`);
    } catch (error) {
      console.error('[TAVIWorkupStorage] Failed to persist workups:', error);
      throw error;
    }
  }

  // === UTILITY METHODS ===

  /**
   * Get current cache (synchronous)
   */
  public getCache(): TAVIWorkupItem[] {
    return [...this.cache];
  }

  /**
   * Find workup by ID (synchronous)
   */
  public findById(id: string): TAVIWorkupItem | undefined {
    return this.cache.find(w => w.id === id);
  }

  /**
   * Clear all workups (dangerous - use with caution)
   */
  public async clearAll(): Promise<void> {
    this.cache = [];
    await this.persist();
    this.notify();
  }

  /**
   * Cleanup (remove storage listener)
   */
  public destroy(): void {
    if (this.storageListener) {
      chrome.storage.onChanged.removeListener(this.storageListener);
      this.storageListener = null;
    }
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.listeners.clear();
  }
}
