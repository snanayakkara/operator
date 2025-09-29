/**
 * PhrasebookService - User-customizable terminology management
 *
 * Provides CRUD operations for managing user-defined medical terminology
 * preferences for both ASR corrections and generation bias.
 */

import { logger } from '@/utils/Logger';
import { toError } from '@/utils/errorHelpers';

export interface PhrasebookEntry {
  id: string;
  term: string;
  preferred: string;
  type: 'asr' | 'gen';
  tags?: string[];
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PhrasebookCompilation {
  asrCorrections: Array<{ fromRegex: RegExp; to: string; metadata: any }>;
  generationBias: string; // Compact bullet list for system prompts
}

export class PhrasebookService {
  private static instance: PhrasebookService;
  private readonly STORAGE_KEY = 'phrasebook_v1';
  private cache: PhrasebookEntry[] | null = null;

  private constructor() {
    logger.info('PhrasebookService initialized', { component: 'phrasebook' });
  }

  public static getInstance(): PhrasebookService {
    if (!PhrasebookService.instance) {
      PhrasebookService.instance = new PhrasebookService();
    }
    return PhrasebookService.instance;
  }

  /**
   * Get all phrasebook entries
   */
  public async getAll(): Promise<PhrasebookEntry[]> {
    if (this.cache !== null) {
      return [...this.cache];
    }

    try {
      const result = await chrome.storage.local.get([this.STORAGE_KEY]);
      const entries: PhrasebookEntry[] = result[this.STORAGE_KEY] || [];

      // Cache the results
      this.cache = entries;

      logger.info(`Loaded ${entries.length} phrasebook entries from storage`, {
        component: 'phrasebook',
        operation: 'load',
        count: entries.length
      });
      return [...entries];
    } catch (error) {
      const err = toError(error);
      logger.error('Failed to load phrasebook entries', err, {
        component: 'phrasebook',
        operation: 'load'
      });
      return [];
    }
  }

  /**
   * Save a new or updated phrasebook entry
   */
  public async save(entry: Omit<PhrasebookEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<PhrasebookEntry> {
    const now = Date.now();
    const fullEntry: PhrasebookEntry = {
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
      ...entry
    };

    const allEntries = await this.getAll();
    allEntries.push(fullEntry);

    await this.saveAll(allEntries);
    logger.info(`Saved phrasebook entry: "${entry.term}" → "${entry.preferred}"`, {
      component: 'phrasebook',
      operation: 'save',
      term: entry.term,
      preferred: entry.preferred,
      type: entry.type
    });

    return fullEntry;
  }

  /**
   * Update an existing phrasebook entry
   */
  public async update(id: string, updates: Partial<Omit<PhrasebookEntry, 'id' | 'createdAt'>>): Promise<PhrasebookEntry | null> {
    const allEntries = await this.getAll();
    const entryIndex = allEntries.findIndex(e => e.id === id);

    if (entryIndex === -1) {
      logger.warn(`Phrasebook entry not found: ${id}`, {
        component: 'phrasebook',
        operation: 'update',
        entryId: id
      });
      return null;
    }

    const updatedEntry: PhrasebookEntry = {
      ...allEntries[entryIndex],
      ...updates,
      updatedAt: Date.now()
    };

    allEntries[entryIndex] = updatedEntry;
    await this.saveAll(allEntries);

    logger.info(`Updated phrasebook entry: ${id}`, {
      component: 'phrasebook',
      operation: 'update',
      entryId: id
    });
    return updatedEntry;
  }

  /**
   * Remove a phrasebook entry
   */
  public async remove(id: string): Promise<boolean> {
    const allEntries = await this.getAll();
    const initialLength = allEntries.length;
    const filteredEntries = allEntries.filter(e => e.id !== id);

    if (filteredEntries.length === initialLength) {
      logger.warn(`Phrasebook entry not found for removal: ${id}`, {
        component: 'phrasebook',
        operation: 'remove',
        entryId: id
      });
      return false;
    }

    await this.saveAll(filteredEntries);
    logger.info(`Removed phrasebook entry: ${id}`, {
      component: 'phrasebook',
      operation: 'remove',
      entryId: id
    });
    return true;
  }

  /**
   * Search entries by term or preferred text
   */
  public async search(query: string): Promise<PhrasebookEntry[]> {
    const allEntries = await this.getAll();
    const lowerQuery = query.toLowerCase();

    return allEntries.filter(entry =>
      entry.term.toLowerCase().includes(lowerQuery) ||
      entry.preferred.toLowerCase().includes(lowerQuery) ||
      entry.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      entry.notes?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Filter entries by type
   */
  public async getByType(type: 'asr' | 'gen'): Promise<PhrasebookEntry[]> {
    const allEntries = await this.getAll();
    return allEntries.filter(entry => entry.type === type);
  }

  /**
   * Compile ASR corrections from phrasebook entries
   */
  public async compileForASR(): Promise<Array<{ fromRegex: RegExp; to: string; metadata: any }>> {
    const asrEntries = await this.getByType('asr');
    const corrections: Array<{ fromRegex: RegExp; to: string; metadata: any }> = [];

    for (const entry of asrEntries) {
      try {
        // Create word boundary regex for safe replacement
        const fromRegex = new RegExp(`\\b${this.escapeRegex(entry.term)}\\b`, 'gi');

        corrections.push({
          fromRegex,
          to: entry.preferred,
          metadata: {
            id: entry.id,
            source: 'phrasebook',
            tags: entry.tags || []
          }
        });
      } catch (error) {
        logger.warn(`Invalid regex for phrasebook term: "${entry.term}"`, {
          component: 'phrasebook',
          operation: 'compile-asr',
          term: entry.term,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    logger.info(`Compiled ${corrections.length} ASR corrections from phrasebook`, {
      component: 'phrasebook',
      operation: 'compile-asr',
      count: corrections.length
    });
    return corrections;
  }

  /**
   * Compile generation bias prompts from phrasebook entries
   */
  public async compileForSystemPrompt(): Promise<string> {
    const genEntries = await this.getByType('gen');

    if (genEntries.length === 0) {
      return '';
    }

    const bullets = genEntries.map(entry =>
      `• Use "${entry.preferred}" instead of "${entry.term}"`
    );

    const prompt = `
**Terminology Preferences:**
${bullets.join('\n')}
**Australian Spelling:** Use Australian medical terminology and spelling throughout.
`.trim();

    logger.info(`Compiled generation bias with ${genEntries.length} terminology preferences`, {
      component: 'phrasebook',
      operation: 'compile-gen',
      count: genEntries.length
    });
    return prompt;
  }

  /**
   * Export all entries to JSON
   */
  public async export(): Promise<string> {
    const allEntries = await this.getAll();
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      entries: allEntries
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import entries from JSON
   */
  public async import(jsonData: string, merge: boolean = false): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    try {
      const data = JSON.parse(jsonData);

      if (!Array.isArray(data.entries)) {
        errors.push('Invalid format: entries must be an array');
        return { imported: 0, errors };
      }

      const existingEntries = merge ? await this.getAll() : [];
      const newEntries: PhrasebookEntry[] = [];

      for (const [index, entry] of data.entries.entries()) {
        try {
          // Validate required fields
          if (!entry.term || !entry.preferred || !entry.type) {
            errors.push(`Entry ${index + 1}: Missing required fields (term, preferred, type)`);
            continue;
          }

          if (!['asr', 'gen'].includes(entry.type)) {
            errors.push(`Entry ${index + 1}: Invalid type "${entry.type}", must be 'asr' or 'gen'`);
            continue;
          }

          // Create validated entry
          const validatedEntry: PhrasebookEntry = {
            id: entry.id || this.generateId(),
            term: entry.term,
            preferred: entry.preferred,
            type: entry.type,
            tags: Array.isArray(entry.tags) ? entry.tags : [],
            notes: entry.notes || '',
            createdAt: entry.createdAt || Date.now(),
            updatedAt: entry.updatedAt || Date.now()
          };

          newEntries.push(validatedEntry);
          imported++;

        } catch (entryError) {
          errors.push(`Entry ${index + 1}: ${entryError instanceof Error ? entryError.message : 'Invalid entry'}`);
        }
      }

      // Save combined entries
      const finalEntries = merge ? [...existingEntries, ...newEntries] : newEntries;
      await this.saveAll(finalEntries);

      logger.info(`Imported ${imported} phrasebook entries with ${errors.length} errors`, {
        component: 'phrasebook',
        operation: 'import',
        imported,
        errors: errors.length
      });

    } catch (error) {
      errors.push(`JSON parsing error: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
    }

    return { imported, errors };
  }

  /**
   * Clear all entries (with confirmation)
   */
  public async clear(): Promise<void> {
    await this.saveAll([]);
    logger.info('Cleared all phrasebook entries', {
      component: 'phrasebook',
      operation: 'clear'
    });
  }

  /**
   * Get statistics about the phrasebook
   */
  public async getStatistics(): Promise<{ total: number; asr: number; gen: number; tags: string[] }> {
    const allEntries = await this.getAll();
    const asrCount = allEntries.filter(e => e.type === 'asr').length;
    const genCount = allEntries.filter(e => e.type === 'gen').length;

    // Collect all unique tags
    const allTags = new Set<string>();
    allEntries.forEach(entry => {
      entry.tags?.forEach(tag => allTags.add(tag));
    });

    return {
      total: allEntries.length,
      asr: asrCount,
      gen: genCount,
      tags: Array.from(allTags).sort()
    };
  }

  // Private methods

  private async saveAll(entries: PhrasebookEntry[]): Promise<void> {
    try {
      await chrome.storage.local.set({ [this.STORAGE_KEY]: entries });
      this.cache = [...entries]; // Update cache
    } catch (error) {
      const err = toError(error);
      logger.error('Failed to save phrasebook entries', err, {
        component: 'phrasebook',
        operation: 'save-all'
      });
      throw new Error('Failed to save phrasebook entries to storage');
    }
  }

  private generateId(): string {
    return `pb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}