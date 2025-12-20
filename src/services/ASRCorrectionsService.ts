/**
 * ASR Corrections Service (E16)
 *
 * Manages ASR (Automatic Speech Recognition) corrections:
 * - Persists corrections to the DSPy server
 * - Fetches and caches corrections on startup
 * - Applies corrections to transcripts
 *
 * Corrections are stored server-side in data/asr/uploaded_corrections.json
 * and are loaded once per session for efficiency.
 */

import { logger } from '@/utils/Logger';
import type { ASRCorrection } from '@/sidepanel/components/ASRTeachingPopover';

const DSPY_SERVER_BASE = 'http://localhost:8002';

class ASRCorrectionsService {
  private static instance: ASRCorrectionsService;
  private corrections: ASRCorrection[] = [];
  private correctionsLoaded = false;
  private loadingPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): ASRCorrectionsService {
    if (!ASRCorrectionsService.instance) {
      ASRCorrectionsService.instance = new ASRCorrectionsService();
    }
    return ASRCorrectionsService.instance;
  }

  /**
   * Load corrections from server (once per session)
   */
  public async loadCorrections(): Promise<ASRCorrection[]> {
    // If already loading, wait for that to finish
    if (this.loadingPromise) {
      await this.loadingPromise;
      return this.corrections;
    }

    // If already loaded, return cached
    if (this.correctionsLoaded) {
      return this.corrections;
    }

    // Start loading
    this.loadingPromise = this._fetchCorrections();
    await this.loadingPromise;
    this.loadingPromise = null;

    return this.corrections;
  }

  private async _fetchCorrections(): Promise<void> {
    try {
      const response = await fetch(`${DSPY_SERVER_BASE}/v1/asr/corrections/export`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.data?.corrections)) {
        this.corrections = data.data.corrections;
        logger.info('ASR corrections loaded', {
          component: 'ASRCorrectionsService',
          count: this.corrections.length
        });
      }
      this.correctionsLoaded = true;
    } catch (error) {
      logger.warn('Failed to load ASR corrections', {
        component: 'ASRCorrectionsService',
        error: (error as Error).message
      });
      // Mark as loaded to prevent repeated failed attempts
      this.correctionsLoaded = true;
      this.corrections = [];
    }
  }

  /**
   * Persist a new correction to the server
   */
  public async persistCorrection(correction: ASRCorrection): Promise<boolean> {
    try {
      // Add to local cache first
      this.corrections.push(correction);

      // Upload all corrections (server expects full list)
      const response = await fetch(`${DSPY_SERVER_BASE}/v1/asr/corrections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corrections: this.corrections })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }

      logger.info('ASR correction persisted', {
        component: 'ASRCorrectionsService',
        from: correction.rawText,
        to: correction.correctedText
      });

      return true;
    } catch (error) {
      logger.error('Failed to persist ASR correction', error as Error, {
        component: 'ASRCorrectionsService'
      });
      return false;
    }
  }

  /**
   * Apply all corrections to a transcript
   * Returns the corrected transcript and count of applied corrections
   */
  public applyCorrections(transcript: string): { text: string; appliedCount: number } {
    if (!transcript || this.corrections.length === 0) {
      return { text: transcript, appliedCount: 0 };
    }

    let result = transcript;
    let appliedCount = 0;

    for (const correction of this.corrections) {
      // Case-insensitive exact match replacement
      // Use word boundaries to avoid partial matches
      const regex = new RegExp(this.escapeRegex(correction.rawText), 'gi');
      const beforeReplace = result;
      result = result.replace(regex, correction.correctedText);

      if (result !== beforeReplace) {
        appliedCount++;
      }
    }

    if (appliedCount > 0) {
      logger.info('Applied ASR corrections to transcript', {
        component: 'ASRCorrectionsService',
        appliedCount,
        totalCorrections: this.corrections.length
      });
    }

    return { text: result, appliedCount };
  }

  /**
   * Apply a single correction to a transcript
   */
  public applySingleCorrection(transcript: string, from: string, to: string): string {
    if (!transcript) return transcript;
    
    // Case-insensitive exact match replacement
    const regex = new RegExp(this.escapeRegex(from), 'gi');
    return transcript.replace(regex, to);
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Get all cached corrections
   */
  public getCorrections(): ASRCorrection[] {
    return [...this.corrections];
  }

  /**
   * Clear corrections cache (for testing/reset)
   */
  public clearCache(): void {
    this.corrections = [];
    this.correctionsLoaded = false;
    this.loadingPromise = null;
  }
}

// Export singleton instance
export const asrCorrectionsService = ASRCorrectionsService.getInstance();
export default asrCorrectionsService;
