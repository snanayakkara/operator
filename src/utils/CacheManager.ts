/**
 * Cache Manager
 * 
 * Intelligent caching system with change detection, compression, and smart
 * invalidation strategies. Provides both in-memory and persistent storage
 * with automatic cleanup and size management.
 */

import type {
  CacheEntry,
  CacheConfig,
  CacheStats,
  ExtractedData as _ExtractedData,
  DataQualityReport
} from '@/types/BatchProcessingTypes';

import type { PatientAppointment } from '@/types/medical.types';

export interface CacheKey {
  patientId: string;
  dataType: 'extracted_data' | 'ai_review' | 'validation_result';
  version?: string;
}

export interface CacheResult<T> {
  hit: boolean;
  data?: T;
  entry?: CacheEntry;
  reason?: string;
}

export interface CacheInvalidationRule {
  name: string;
  condition: (entry: CacheEntry) => boolean;
  action: 'remove' | 'refresh' | 'mark_stale';
}

export class CacheManager {
  private static instance: CacheManager;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private stats: CacheStats;
  private invalidationRules: CacheInvalidationRule[] = [];
  private cleanupInterval?: ReturnType<typeof setInterval>;
  private debugMode = false;

  private constructor() {
    this.config = this.getDefaultConfig();
    this.stats = this.initializeStats();
    this.initializeInvalidationRules();
    this.startPeriodicCleanup();
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Store data in cache with automatic hashing and compression
   */
  public async set<T>(
    key: CacheKey | string,
    data: T,
    quality?: DataQualityReport,
    ttl?: number
  ): Promise<void> {
    const { cacheKey, patientId, dataType } = this.resolveKey(key);
    const timestamp = Date.now();
    const dataHash = await this.calculateDataHash(data);
    const expiryTime = timestamp + (ttl || this.config.defaultTtlMs);

    this.log(`💾 Caching data for key: ${cacheKey}`);

    const entry: CacheEntry = {
      key: cacheKey,
      patientId,
      extractedData: data as any, // Generic for different data types
      timestamp,
      dataHash,
      quality: quality || this.createDefaultQuality(),
      expiryTime,
      accessCount: 0,
      lastAccessed: timestamp,
      dataType: dataType ?? 'extracted_data'
    };

    // Store in memory cache
    this.memoryCache.set(cacheKey, entry);

    // Store in persistent storage if enabled
    if (this.config.persistToDisk) {
      await this.saveToPersistentStorage(cacheKey, entry);
    }

    // Update stats
    this.updateStats('set');

    // Check if cleanup is needed
    await this.checkSizeConstraints();

    this.log(`✅ Cached data for key: ${cacheKey} (expires: ${new Date(expiryTime).toISOString()})`);
  }

  /**
   * Retrieve data from cache with validation
   */
  public async get<T>(key: CacheKey | string): Promise<CacheResult<T>> {
    const { cacheKey } = this.resolveKey(key);
    
    this.log(`🔍 Looking for cached data: ${cacheKey}`);

    // Check memory cache first
    let entry = this.memoryCache.get(cacheKey);

    // If not in memory and persistent storage is enabled, check disk
    if (!entry && this.config.persistToDisk) {
      const loadedEntry = await this.loadFromPersistentStorage(cacheKey);
      if (loadedEntry) {
        entry = loadedEntry;
        // Add back to memory cache
        this.memoryCache.set(cacheKey, entry);
      }
    }

    if (!entry) {
      this.updateStats('miss');
      this.log(`❌ Cache miss for key: ${cacheKey}`);
      return { hit: false, reason: 'not_found' };
    }

    // Check if expired
    if (Date.now() > entry.expiryTime) {
      this.memoryCache.delete(cacheKey);
      await this.removeFromPersistentStorage(cacheKey);
      this.updateStats('miss');
      this.log(`⏰ Cache expired for key: ${cacheKey}`);
      return { hit: false, reason: 'expired' };
    }

    // Update access information
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    this.updateStats('hit');
    this.log(`✅ Cache hit for key: ${cacheKey} (accessed ${entry.accessCount} times)`);

    return {
      hit: true,
      data: entry.extractedData as T,
      entry
    };
  }

  /**
   * Check if cached data has changed
   */
  public async hasChanged<T>(key: CacheKey | string, currentData: T): Promise<boolean> {
    const result = await this.get<T>(key);
    
    if (!result.hit || !result.entry) {
      return true; // No cache means it's "changed"
    }

    const currentHash = await this.calculateDataHash(currentData);
    return currentHash !== result.entry.dataHash;
  }

  /**
   * Invalidate specific cache entry
   */
  public async invalidate(key: CacheKey | string): Promise<void> {
    const { cacheKey } = this.resolveKey(key);
    
    this.log(`🗑️ Invalidating cache entry: ${cacheKey}`);
    
    this.memoryCache.delete(cacheKey);
    await this.removeFromPersistentStorage(cacheKey);
  }

  /**
   * Invalidate all cache entries for a patient
   */
  public async invalidatePatient(patientId: string): Promise<number> {
    let invalidated = 0;

    // Invalidate from memory cache
    for (const [key, entry] of this.memoryCache) {
      if (entry.patientId === patientId) {
        this.memoryCache.delete(key);
        await this.removeFromPersistentStorage(key);
        invalidated++;
      }
    }

    this.log(`🗑️ Invalidated ${invalidated} cache entries for patient: ${patientId}`);
    return invalidated;
  }

  /**
   * Apply invalidation rules to clean stale data
   */
  public async applyInvalidationRules(): Promise<number> {
    let processed = 0;
    const toRemove: string[] = [];
    const toRefresh: string[] = [];

    for (const [key, entry] of this.memoryCache) {
      for (const rule of this.invalidationRules) {
        if (rule.condition(entry)) {
          switch (rule.action) {
            case 'remove':
              toRemove.push(key);
              break;
            case 'refresh':
              toRefresh.push(key);
              break;
            case 'mark_stale':
              // Could add a stale flag to entry
              break;
          }
          processed++;
          break; // Apply only first matching rule
        }
      }
    }

    // Execute removals
    for (const key of toRemove) {
      this.memoryCache.delete(key);
      await this.removeFromPersistentStorage(key);
    }

    // Mark refresh entries (implementation depends on use case)
    for (const key of toRefresh) {
      const entry = this.memoryCache.get(key);
      if (entry) {
        entry.expiryTime = Date.now(); // Force immediate expiry
      }
    }

    this.log(`🧹 Applied invalidation rules: ${processed} entries processed, ${toRemove.length} removed, ${toRefresh.length} marked for refresh`);
    return processed;
  }

  /**
   * Get comprehensive cache statistics
   */
  public getStats(): CacheStats {
    const now = Date.now();
    let totalSize = 0;
    let oldestEntry = now;
    let newestEntry = 0;

    for (const entry of this.memoryCache.values()) {
      totalSize += this.estimateEntrySize(entry);
      oldestEntry = Math.min(oldestEntry, entry.timestamp);
      newestEntry = Math.max(newestEntry, entry.timestamp);
    }

    return {
      ...this.stats,
      totalSizeBytes: totalSize,
      entryCount: this.memoryCache.size,
      oldestEntry: oldestEntry === now ? 0 : oldestEntry,
      newestEntry
    };
  }

  /**
   * Get detailed cache information for debugging
   */
  public getCacheInfo(): {
    memoryEntries: CacheEntry[];
    topAccessed: CacheEntry[];
    expiringSoon: CacheEntry[];
    sizeByPatient: Map<string, number>;
  } {
    const entries = Array.from(this.memoryCache.values());
    const now = Date.now();

    const topAccessed = entries
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);

    const expiringSoon = entries
      .filter(e => e.expiryTime - now < 300000) // Expiring in 5 minutes
      .sort((a, b) => a.expiryTime - b.expiryTime);

    const sizeByPatient = new Map<string, number>();
    for (const entry of entries) {
      const currentSize = sizeByPatient.get(entry.patientId) || 0;
      sizeByPatient.set(entry.patientId, currentSize + this.estimateEntrySize(entry));
    }

    return {
      memoryEntries: entries,
      topAccessed,
      expiringSoon,
      sizeByPatient
    };
  }

  /**
   * Clear all cache data
   */
  public async clear(): Promise<void> {
    this.log(`🧹 Clearing all cache data`);
    
    this.memoryCache.clear();
    
    if (this.config.persistToDisk) {
      await this.clearPersistentStorage();
    }
    
    this.stats = this.initializeStats();
  }

  /**
   * Export cache data for analysis
   */
  public async exportCache(): Promise<string> {
    const cacheData = {
      timestamp: new Date().toISOString(),
      config: this.config,
      stats: this.getStats(),
      entries: Array.from(this.memoryCache.values()).map(entry => ({
        ...entry,
        extractedData: '[DATA_REDACTED]' // Don't export sensitive data
      }))
    };

    return JSON.stringify(cacheData, null, 2);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private generateCacheKey(key: CacheKey): string {
    const version = key.version || 'v1';
    return `${key.patientId}_${key.dataType}_${version}`;
  }

  private resolveKey(key: CacheKey | string): { cacheKey: string; patientId: string; dataType?: CacheKey['dataType'] } {
    if (typeof key === 'string') {
      return {
        cacheKey: key,
        patientId: 'legacy',
        dataType: 'extracted_data'
      };
    }

    return {
      cacheKey: this.generateCacheKey(key),
      patientId: key.patientId,
      dataType: key.dataType
    };
  }

  private async calculateDataHash(data: any): Promise<string> {
    const dataString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(dataString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private estimateEntrySize(entry: CacheEntry): number {
    // Rough estimation of entry size in bytes
    const jsonString = JSON.stringify(entry);
    return new Blob([jsonString]).size;
  }

  private async checkSizeConstraints(): Promise<void> {
    const stats = this.getStats();
    
    // Check memory constraint
    if (stats.totalSizeBytes > this.config.maxSizeBytes) {
      await this.evictLeastRecentlyUsed(Math.floor(this.memoryCache.size * 0.2)); // Remove 20%
    }

    // Check entry count constraint
    if (stats.entryCount > this.config.maxEntries) {
      await this.evictLeastRecentlyUsed(stats.entryCount - this.config.maxEntries);
    }
  }

  private async evictLeastRecentlyUsed(count: number): Promise<void> {
    const entries = Array.from(this.memoryCache.entries());
    
    // Sort by last accessed time (oldest first)
    entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
    
    const toEvict = entries.slice(0, count);
    
    for (const [key] of toEvict) {
      this.memoryCache.delete(key);
      await this.removeFromPersistentStorage(key);
    }

    this.log(`🗑️ Evicted ${toEvict.length} least recently used entries`);
  }

  private initializeInvalidationRules(): void {
    this.invalidationRules = [
      {
        name: 'expired_entries',
        condition: (entry) => Date.now() > entry.expiryTime,
        action: 'remove'
      },
      {
        name: 'low_quality_old_data',
        condition: (entry) => {
          const age = Date.now() - entry.timestamp;
          return entry.quality.confidenceLevel === 'low' && age > 1800000; // 30 minutes
        },
        action: 'remove'
      },
      {
        name: 'unused_entries',
        condition: (entry) => {
          const age = Date.now() - entry.lastAccessed;
          return entry.accessCount === 0 && age > 3600000; // 1 hour
        },
        action: 'remove'
      },
      {
        name: 'refresh_high_access',
        condition: (entry) => {
          const age = Date.now() - entry.timestamp;
          return entry.accessCount > 10 && age > 7200000; // 2 hours
        },
        action: 'refresh'
      }
    ];
  }

  private startPeriodicCleanup(): void {
    this.cleanupInterval = setInterval(async () => {
      await this.applyInvalidationRules();
      await this.checkSizeConstraints();
    }, 300000); // Every 5 minutes
  }

  private stopPeriodicCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  private updateStats(operation: 'hit' | 'miss' | 'set'): void {
    this.stats.totalRequests++;
    
    switch (operation) {
      case 'hit':
        this.stats.hitCount++;
        break;
      case 'miss':
        this.stats.missCount++;
        break;
      case 'set':
        // No specific counter, but updates totalRequests
        break;
    }
    
    this.stats.hitRate = this.stats.totalRequests > 0 
      ? this.stats.hitCount / this.stats.totalRequests 
      : 0;
  }

  private createDefaultQuality(): DataQualityReport {
    return {
      completenessScore: 1.0,
      contentRichness: 1.0,
      confidenceLevel: 'high',
      missingFields: [],
      extractionWarnings: [],
      medicalTermsFound: 0,
      estimatedWordCount: 0
    };
  }

  // ============================================================================
  // Persistent Storage Methods
  // ============================================================================

  private async saveToPersistentStorage(key: string, entry: CacheEntry): Promise<void> {
    try {
      const storageKey = `cache_${key}`;
      let data = JSON.stringify(entry);
      
      if (this.config.compressionEnabled) {
        data = await this.compressData(data);
      }
      
      await chrome.storage.local.set({ [storageKey]: data });
      
    } catch (error) {
      this.log(`❌ Failed to save to persistent storage:`, error);
    }
  }

  private async loadFromPersistentStorage(key: string): Promise<CacheEntry | null> {
    try {
      const storageKey = `cache_${key}`;
      const result = await chrome.storage.local.get(storageKey);
      
      if (!result[storageKey]) {
        return null;
      }
      
      let data = result[storageKey];
      
      if (this.config.compressionEnabled) {
        data = await this.decompressData(data);
      }
      
      return JSON.parse(data);
      
    } catch (error) {
      this.log(`❌ Failed to load from persistent storage:`, error);
      return null;
    }
  }

  private async removeFromPersistentStorage(key: string): Promise<void> {
    try {
      const storageKey = `cache_${key}`;
      await chrome.storage.local.remove(storageKey);
    } catch (error) {
      this.log(`❌ Failed to remove from persistent storage:`, error);
    }
  }

  private async clearPersistentStorage(): Promise<void> {
    try {
      const allItems = await chrome.storage.local.get(null);
      const cacheKeys = Object.keys(allItems).filter(key => key.startsWith('cache_'));
      await chrome.storage.local.remove(cacheKeys);
    } catch (error) {
      this.log(`❌ Failed to clear persistent storage:`, error);
    }
  }

  // ============================================================================
  // Compression Methods (Basic Implementation)
  // ============================================================================

  private async compressData(data: string): Promise<string> {
    // Simple compression - in production, use a proper compression library
    return btoa(data);
  }

  private async decompressData(data: string): Promise<string> {
    // Simple decompression
    return atob(data);
  }

  // ============================================================================
  // Configuration and Initialization
  // ============================================================================

  private getDefaultConfig(): CacheConfig {
    return {
      maxSizeBytes: 50 * 1024 * 1024, // 50MB
      maxEntries: 1000,
      defaultTtlMs: 3600000, // 1 hour
      compressionEnabled: true,
      persistToDisk: true
    };
  }

  private initializeStats(): CacheStats {
    return {
      hitCount: 0,
      missCount: 0,
      totalRequests: 0,
      hitRate: 0,
      totalSizeBytes: 0,
      entryCount: 0,
      oldestEntry: 0,
      newestEntry: 0
    };
  }

  private log(...args: any[]): void {
    if (this.debugMode) {
      console.log('[CacheManager]', ...args);
    }
  }

  // ============================================================================
  // Public Configuration Methods
  // ============================================================================

  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  public updateConfig(config: Partial<CacheConfig>): void {
    Object.assign(this.config, config);
  }

  public getConfig(): CacheConfig {
    return { ...this.config };
  }

  public addInvalidationRule(rule: CacheInvalidationRule): void {
    this.invalidationRules.push(rule);
  }

  public removeInvalidationRule(name: string): boolean {
    const index = this.invalidationRules.findIndex(rule => rule.name === name);
    if (index >= 0) {
      this.invalidationRules.splice(index, 1);
      return true;
    }
    return false;
  }

  public cleanup(): void {
    this.stopPeriodicCleanup();
    this.memoryCache.clear();
  }

  // ============================================================================
  // Utility Methods for External Use
  // ============================================================================

  /**
   * Warm up cache with patient data
   */
  public async warmup(patients: PatientAppointment[]): Promise<void> {
    this.log(`🔥 Warming up cache for ${patients.length} patients`);
    
    // Pre-create cache keys for expected data types
    for (const patient of patients) {
      const keys = [
        { patientId: patient.fileNumber, dataType: 'extracted_data' as const },
        { patientId: patient.fileNumber, dataType: 'ai_review' as const },
        { patientId: patient.fileNumber, dataType: 'validation_result' as const }
      ];
      
      // Check which keys are missing from cache
      for (const key of keys) {
        const result = await this.get(key);
        if (!result.hit) {
          // Mark for future caching by setting a placeholder
          await this.set(key, null, undefined, 60000); // 1 minute TTL for placeholders
        }
      }
    }
  }

  /**
   * Preload cache from previous batch data
   */
  public async preload(cacheData: any[]): Promise<number> {
    let loaded = 0;
    
    for (const data of cacheData) {
      try {
        const key: CacheKey = {
          patientId: data.patientId,
          dataType: data.dataType,
          version: data.version
        };
        
        await this.set(key, data.content, data.quality, data.ttl);
        loaded++;
      } catch (error) {
        this.log(`❌ Failed to preload cache entry:`, error);
      }
    }
    
    this.log(`📥 Preloaded ${loaded} cache entries`);
    return loaded;
  }
}
