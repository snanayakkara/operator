/**
 * ASRCorrectionsLog - Chrome Storage Management for ASR Corrections
 * 
 * Handles collection, storage, and retrieval of ASR corrections from daily usage.
 * Integrates with Chrome's storage.local API with quota management.
 * 
 * Features:
 * - Persistent logging of transcript corrections
 * - Quota-aware storage with automatic cleanup
 * - Filtering and aggregation for batch processing
 * - Privacy-focused local-only storage
 */

import { logger } from '@/utils/Logger';
import { toError } from '@/utils/errorHelpers';
import { PhrasebookService } from '@/services/PhrasebookService';
import type {
  ASRCorrectionsEntry,
  OptimizationSettings,
  AgentType
} from '@/types/optimization';

interface StoredCorrections {
  entries: ASRCorrectionsEntry[];
  lastCleanup: number;
  totalSize: number;
}

interface StorageQuotaInfo {
  used: number;
  available: number;
  percentage: number;
  nearLimit: boolean;
}

export class ASRCorrectionsLog {
  private static instance: ASRCorrectionsLog;
  private readonly STORAGE_KEY = 'asr_corrections_log';
  private readonly SETTINGS_KEY = 'optimization_settings';
  private readonly MAX_STORAGE_MB = 4; // Leave 1MB buffer from Chrome's 5MB quota
  private readonly MAX_ENTRIES = 1000;
  private readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  private cache: ASRCorrectionsEntry[] | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_TTL = 60 * 1000; // 1 minute

  // Async operation queue to prevent blocking message handlers
  private storageQueue: Promise<any> = Promise.resolve();
  private pendingReads = 0;

  private constructor() {
    logger.info('ASRCorrectionsLog initialized', {
      component: 'ASRCorrectionsLog',
      maxStorageMB: this.MAX_STORAGE_MB,
      maxEntries: this.MAX_ENTRIES
    });
  }

  public static getInstance(): ASRCorrectionsLog {
    if (!ASRCorrectionsLog.instance) {
      ASRCorrectionsLog.instance = new ASRCorrectionsLog();
    }
    return ASRCorrectionsLog.instance;
  }

  /**
   * Add a correction entry to the log
   */
  async addCorrection(entry: Omit<ASRCorrectionsEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      const id = this.generateEntryId();
      const timestamp = Date.now();
      
      const correctionEntry: ASRCorrectionsEntry = {
        ...entry,
        id,
        timestamp
      };

      const stored = await this.getStoredData();
      stored.entries.push(correctionEntry);

      // Check if cleanup is needed
      const quotaInfo = await this.getStorageQuota();
      if (quotaInfo.nearLimit || stored.entries.length > this.MAX_ENTRIES) {
        await this.performCleanup(stored);
      }

      await this.saveStoredData(stored);
      this.invalidateCache();

      logger.debug('ASR correction added', {
        component: 'ASRCorrectionsLog',
        id,
        agentType: entry.agentType,
        rawLength: entry.rawText.length,
        correctedLength: entry.correctedText.length
      });

    } catch (error) {
      const err = toError(error);
      logger.error('Failed to add ASR correction', err, {
        component: 'ASRCorrectionsLog',
        agentType: entry.agentType
      });
      throw err;
    }
  }

  /**
   * Get corrections within a date range
   */
  async getCorrections(options: {
    since?: Date;
    until?: Date;
    agentType?: AgentType;
    limit?: number;
  } = {}): Promise<ASRCorrectionsEntry[]> {
    try {
      const stored = await this.getStoredData();
      let entries = [...stored.entries];

      // Apply filters
      if (options.since) {
        entries = entries.filter(entry => entry.timestamp >= options.since!.getTime());
      }

      if (options.until) {
        entries = entries.filter(entry => entry.timestamp <= options.until!.getTime());
      }

      if (options.agentType) {
        entries = entries.filter(entry => entry.agentType === options.agentType);
      }

      // Sort by timestamp (most recent first)
      entries.sort((a, b) => b.timestamp - a.timestamp);

      // Apply limit
      if (options.limit) {
        entries = entries.slice(0, options.limit);
      }

      logger.debug('Retrieved ASR corrections', {
        component: 'ASRCorrectionsLog',
        totalEntries: stored.entries.length,
        filteredEntries: entries.length,
        options
      });

      return entries;

    } catch (error) {
      const err = toError(error);
      logger.error('Failed to get ASR corrections', err, {
        component: 'ASRCorrectionsLog',
        options
      });
      return [];
    }
  }

  /**
   * Update an existing correction entry
   */
  async updateCorrection(id: string, updates: Partial<Omit<ASRCorrectionsEntry, 'id'>>): Promise<void> {
    try {
      const stored = await this.getStoredData();
      const entryIndex = stored.entries.findIndex(entry => entry.id === id);

      if (entryIndex === -1) {
        throw new Error(`Correction with id ${id} not found`);
      }

      // Update the entry with new values
      stored.entries[entryIndex] = {
        ...stored.entries[entryIndex],
        ...updates,
        id // Preserve the original ID
      };

      await this.saveStoredData(stored);
      this.invalidateCache();

      logger.debug('ASR correction updated', {
        component: 'ASRCorrectionsLog',
        id,
        updates: Object.keys(updates)
      });

    } catch (error) {
      const err = toError(error);
      logger.error('Failed to update ASR correction', err, {
        component: 'ASRCorrectionsLog',
        id
      });
      throw err;
    }
  }

  /**
   * Delete a correction entry
   */
  async deleteCorrection(id: string): Promise<void> {
    try {
      const stored = await this.getStoredData();
      const originalLength = stored.entries.length;

      stored.entries = stored.entries.filter(entry => entry.id !== id);

      if (stored.entries.length === originalLength) {
        throw new Error(`Correction with id ${id} not found`);
      }

      await this.saveStoredData(stored);
      this.invalidateCache();

      logger.debug('ASR correction deleted', {
        component: 'ASRCorrectionsLog',
        id,
        remainingEntries: stored.entries.length
      });

    } catch (error) {
      const err = toError(error);
      logger.error('Failed to delete ASR correction', err, {
        component: 'ASRCorrectionsLog',
        id
      });
      throw err;
    }
  }

  /**
   * Get corrections aggregated for batch processing
   */
  async getAggregatedCorrections(options: {
    since?: Date;
    minFrequency?: number;
  } = {}): Promise<{
    glossaryTerms: { term: string; count: number }[];
    correctionRules: { raw: string; fix: string; count: number; examples: string[] }[];
  }> {
    try {
      const entries = await this.getCorrections(options);
      const glossaryMap = new Map<string, number>();
      const correctionMap = new Map<string, { count: number; examples: string[] }>();

      for (const entry of entries) {
        // Extract potential glossary terms (words that appear in both raw and corrected)
        const _rawWords = this.extractMedicalTerms(entry.rawText);
        const correctedWords = this.extractMedicalTerms(entry.correctedText);

        for (const word of correctedWords) {
          if (word.length > 3 && this.isMedicalTerm(word)) {
            glossaryMap.set(word, (glossaryMap.get(word) || 0) + 1);
          }
        }

        // Extract correction rules (raw -> fix patterns)
        const corrections = this.extractCorrectionPairs(entry.rawText, entry.correctedText);
        for (const { raw, fix } of corrections) {
          const key = `${raw}→${fix}`;
          const existing = correctionMap.get(key);
          if (existing) {
            existing.count++;
            if (existing.examples.length < 3) {
              existing.examples.push(this.getContextSnippet(entry.rawText, raw));
            }
          } else {
            correctionMap.set(key, {
              count: 1,
              examples: [this.getContextSnippet(entry.rawText, raw)]
            });
          }
        }
      }

      // Filter by minimum frequency
      const minFreq = options.minFrequency || 2;
      
      const glossaryTerms = Array.from(glossaryMap.entries())
        .filter(([_, count]) => count >= minFreq)
        .map(([term, count]) => ({ term, count }))
        .sort((a, b) => b.count - a.count);

      const correctionRules = Array.from(correctionMap.entries())
        .filter(([_, data]) => data.count >= minFreq)
        .map(([key, data]) => {
          const [raw, fix] = key.split('→');
          return {
            raw,
            fix,
            count: data.count,
            examples: data.examples
          };
        })
        .sort((a, b) => b.count - a.count);

      logger.info('Aggregated ASR corrections', {
        component: 'ASRCorrectionsLog',
        sourceEntries: entries.length,
        glossaryTerms: glossaryTerms.length,
        correctionRules: correctionRules.length,
        minFrequency: minFreq
      });

      return { glossaryTerms, correctionRules };

    } catch (error) {
      const err = toError(error);
      logger.error('Failed to aggregate ASR corrections', err, {
        component: 'ASRCorrectionsLog'
      });
      return { glossaryTerms: [], correctionRules: [] };
    }
  }

  /**
   * Clear corrections older than specified date
   */
  async clearOldCorrections(beforeDate: Date): Promise<number> {
    try {
      const stored = await this.getStoredData();
      const beforeTimestamp = beforeDate.getTime();
      const initialCount = stored.entries.length;
      
      stored.entries = stored.entries.filter(entry => entry.timestamp >= beforeTimestamp);
      stored.lastCleanup = Date.now();
      
      await this.saveStoredData(stored);
      this.invalidateCache();

      const deletedCount = initialCount - stored.entries.length;
      
      logger.info('Cleared old ASR corrections', {
        component: 'ASRCorrectionsLog',
        deletedCount,
        remainingCount: stored.entries.length,
        beforeDate: beforeDate.toISOString()
      });

      return deletedCount;

    } catch (error) {
      const err = toError(error);
      logger.error('Failed to clear old corrections', err, {
        component: 'ASRCorrectionsLog'
      });
      return 0;
    }
  }

  /**
   * Get storage quota information
   */
  async getStorageQuota(): Promise<StorageQuotaInfo> {
    try {
      const bytesInUse = await new Promise<number>((resolve) => {
        chrome.storage.local.getBytesInUse(null, resolve);
      });

      const maxBytes = this.MAX_STORAGE_MB * 1024 * 1024;
      const percentage = (bytesInUse / maxBytes) * 100;
      const nearLimit = percentage > 80;

      return {
        used: bytesInUse,
        available: maxBytes - bytesInUse,
        percentage: Math.round(percentage * 100) / 100,
        nearLimit
      };

    } catch (error) {
      const err = toError(error);
      logger.error('Failed to get storage quota', err, {
        component: 'ASRCorrectionsLog'
      });
      return {
        used: 0,
        available: this.MAX_STORAGE_MB * 1024 * 1024,
        percentage: 0,
        nearLimit: false
      };
    }
  }

  /**
   * Get optimization settings
   */
  async getSettings(): Promise<OptimizationSettings> {
    try {
      const result = await new Promise<{ [key: string]: any }>((resolve) => {
        chrome.storage.local.get([this.SETTINGS_KEY], resolve);
      });

      const defaultSettings: OptimizationSettings = {
        overnight_enabled: true,
        default_iterations: 5,
        auto_apply_threshold: 75,
        max_corrections_to_store: this.MAX_ENTRIES,
        asr_collection_enabled: true
      };

      return { ...defaultSettings, ...result[this.SETTINGS_KEY] };

    } catch (error) {
      const err = toError(error);
      logger.error('Failed to get optimization settings', err, {
        component: 'ASRCorrectionsLog'
      });
      return {
        overnight_enabled: true,
        default_iterations: 5,
        auto_apply_threshold: 75,
        max_corrections_to_store: this.MAX_ENTRIES,
        asr_collection_enabled: true
      };
    }
  }

  /**
   * Update optimization settings
   */
  async updateSettings(settings: Partial<OptimizationSettings>): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = { ...currentSettings, ...settings };

      await new Promise<void>((resolve, reject) => {
        chrome.storage.local.set({ [this.SETTINGS_KEY]: updatedSettings }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });

      logger.info('Optimization settings updated', {
        component: 'ASRCorrectionsLog',
        settings: updatedSettings
      });

    } catch (error) {
      const err = toError(error);
      logger.error('Failed to update optimization settings', err, {
        component: 'ASRCorrectionsLog'
      });
      throw err;
    }
  }

  /**
   * Apply phrasebook corrections to transcription text
   */
  async applyPhrasebookCorrections(
    transcription: string,
    agentType?: AgentType
  ): Promise<{ correctedText: string; appliedCorrections: number }> {
    try {
      const phrasebookService = PhrasebookService.getInstance();
      const asrCorrections = await phrasebookService.compileForASR();

      let correctedText = transcription;
      let appliedCorrections = 0;

      // Apply each correction rule
      for (const correction of asrCorrections) {
        const beforeLength = correctedText.length;
        correctedText = correctedText.replace(correction.fromRegex, correction.to);

        // Count if correction was applied
        if (correctedText.length !== beforeLength || correctedText !== transcription) {
          appliedCorrections++;

          logger.debug('Applied phrasebook correction', {
            component: 'ASRCorrectionsLog',
            from: correction.fromRegex.source,
            to: correction.to,
            agentType,
            metadata: correction.metadata
          });
        }
      }

      // Log corrections if any were applied
      if (appliedCorrections > 0) {
        logger.info('Phrasebook corrections applied', {
          component: 'ASRCorrectionsLog',
          agentType,
          appliedCorrections,
          originalLength: transcription.length,
          correctedLength: correctedText.length
        });

        // Add entry to log for learning
        await this.addCorrection({
          rawText: transcription,
          correctedText,
          agentType: agentType ?? 'transcription',
          confidence: 0.95, // High confidence for user-defined corrections
          source: 'phrasebook',
          correctionType: 'terminology',
          approvalStatus: 'approved',
          userExplicitlyApproved: true
        });
      }

      return {
        correctedText,
        appliedCorrections
      };

    } catch (error) {
      const err = toError(error);
      logger.error('Failed to apply phrasebook corrections', err, {
        component: 'ASRCorrectionsLog',
        agentType
      });

      // Return original text on error
      return {
        correctedText: transcription,
        appliedCorrections: 0
      };
    }
  }

  // Private helper methods

  private async getStoredData(): Promise<StoredCorrections> {
    // Use cache if valid
    if (this.cache && (Date.now() - this.cacheTimestamp) < this.CACHE_TTL) {
      return {
        entries: this.cache,
        lastCleanup: Date.now(),
        totalSize: 0
      };
    }

    // Queue the storage operation to prevent blocking message handlers
    this.pendingReads++;

    return this.storageQueue = this.storageQueue.then(async () => {
      try {
        // Double-check cache after queue wait (another operation might have loaded it)
        if (this.cache && (Date.now() - this.cacheTimestamp) < this.CACHE_TTL) {
          return {
            entries: this.cache,
            lastCleanup: Date.now(),
            totalSize: 0
          };
        }

        const result = await new Promise<{ [key: string]: any }>((resolve) => {
          chrome.storage.local.get([this.STORAGE_KEY], resolve);
        });

        const stored = result[this.STORAGE_KEY] || {
          entries: [],
          lastCleanup: Date.now(),
          totalSize: 0
        };

        // Update cache
        this.cache = stored.entries;
        this.cacheTimestamp = Date.now();

        return stored;

      } catch (error) {
        const err = toError(error);
        logger.error('Failed to get stored ASR data', err, {
          component: 'ASRCorrectionsLog'
        });
        return {
          entries: [],
          lastCleanup: Date.now(),
          totalSize: 0
        };
      } finally {
        this.pendingReads--;
      }
    });
  }

  private async saveStoredData(data: StoredCorrections): Promise<void> {
    // Queue write operations to prevent blocking
    return this.storageQueue = this.storageQueue.then(async () => {
      try {
        await new Promise<void>((resolve, reject) => {
          chrome.storage.local.set({ [this.STORAGE_KEY]: data }, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });

        // Update cache
        this.cache = data.entries;
        this.cacheTimestamp = Date.now();

      } catch (error) {
        const err = toError(error);
        logger.error('Failed to save ASR corrections', err, {
          component: 'ASRCorrectionsLog',
          entriesCount: data.entries.length
        });
        throw err;
      }
    });
  }

  private async performCleanup(stored: StoredCorrections): Promise<void> {
    const oldCount = stored.entries.length;

    // Remove entries older than 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    stored.entries = stored.entries.filter(entry => entry.timestamp >= thirtyDaysAgo);

    // If still too many, keep only the most recent MAX_ENTRIES
    if (stored.entries.length > this.MAX_ENTRIES) {
      stored.entries.sort((a, b) => b.timestamp - a.timestamp);
      stored.entries = stored.entries.slice(0, this.MAX_ENTRIES);
    }

    stored.lastCleanup = Date.now();

    logger.info('ASR corrections cleanup performed', {
      component: 'ASRCorrectionsLog',
      oldCount,
      newCount: stored.entries.length,
      removed: oldCount - stored.entries.length
    });
  }

  private invalidateCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }

  private generateEntryId(): string {
    return `asr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractMedicalTerms(text: string): string[] {
    // Extract potential medical terms (capitalized words, medical abbreviations, etc.)
    const medicalTermPattern = /\b(?:[A-Z][a-z]+|[A-Z]{2,}|[a-z]+-[a-z]+)\b/g;
    return Array.from(text.matchAll(medicalTermPattern)).map(match => match[0]);
  }

  private isMedicalTerm(word: string): boolean {
    // Simple heuristic to identify likely medical terms
    const medicalIndicators = [
      /^\d+mg$/, /^\d+mcg$/, /^\d+ml$/, /^\d+%$/,  // Dosages/measurements
      /^[A-Z]{2,}$/, // Abbreviations like EF, LVEF, etc.
      /-[a-z]+$/, // Hyphenated terms
      /ation$/, /itis$/, /osis$/, /pathy$/ // Medical suffixes
    ];
    
    return medicalIndicators.some(pattern => pattern.test(word)) || 
           word.length > 6; // Longer words are more likely to be medical terms
  }

  private extractCorrectionPairs(raw: string, corrected: string): Array<{ raw: string; fix: string }> {
    // Simple word-level diff to find corrections
    const rawWords = raw.toLowerCase().split(/\s+/);
    const correctedWords = corrected.toLowerCase().split(/\s+/);
    const corrections: Array<{ raw: string; fix: string }> = [];

    // Find word substitutions (simple approach)
    const minLength = Math.min(rawWords.length, correctedWords.length);
    for (let i = 0; i < minLength; i++) {
      if (rawWords[i] !== correctedWords[i]) {
        corrections.push({
          raw: rawWords[i],
          fix: correctedWords[i]
        });
      }
    }

    return corrections;
  }

  private getContextSnippet(text: string, term: string): string {
    const index = text.toLowerCase().indexOf(term.toLowerCase());
    if (index === -1) return text.substr(0, 50) + '...';
    
    const start = Math.max(0, index - 20);
    const end = Math.min(text.length, index + term.length + 20);
    const snippet = text.substring(start, end);
    
    return start > 0 ? '...' + snippet : snippet;
  }
}
