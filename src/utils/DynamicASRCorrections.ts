/**
 * Dynamic ASR Corrections - Runtime Merge Logic
 * 
 * @deprecated This file has been replaced by ASRCorrectionEngine which provides
 * better architecture, caching, and unified interface. Use the new consolidated engine:
 * `import { ASRCorrectionEngine } from '@/utils/asr/ASRCorrectionEngine'`
 * 
 * Migration guide:
 *   Old: await applyEnhancedASRCorrections(text, ['medication'])
 *   New: await ASRCorrectionEngine.getInstance().applyCorrections(text, {
 *          categories: ['medication'], enableDynamic: true, australianTerms: true
 *        })
 * 
 * Merges static ASR corrections from ASRCorrections.ts with dynamic corrections
 * from the optimization system. Provides unified correction application.
 * 
 * Features:
 * - Runtime loading of dynamic corrections from DSPy server
 * - Merge static + dynamic patterns with conflict resolution
 * - Caching for performance optimization
 * - Fallback to static-only mode if dynamic corrections unavailable
 */

import { logger } from '@/utils/Logger';
import { 
  applyASRCorrections, 
  getCombinedPatterns, 
  type ReplacementPattern,
  type ASRCorrectionCategories 
} from './ASRCorrections';
import { OptimizationService } from '@/services/OptimizationService';
import type { ASRCurrentState } from '@/types/optimization';

interface DynamicCorrections {
  glossaryTerms: string[];
  correctionRules: Array<{ raw: string; fix: string }>;
  lastUpdated: number;
}

interface MergedCorrections {
  staticPatterns: ReplacementPattern[];
  dynamicPatterns: ReplacementPattern[];
  glossaryTerms: string[];
  lastMerged: number;
}

export class DynamicASRCorrections {
  private static instance: DynamicASRCorrections;
  private optimizationService: OptimizationService;
  
  // Cache for dynamic corrections
  private dynamicCorrections: DynamicCorrections | null = null;
  private mergedCorrections: MergedCorrections | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private isLoadingDynamic = false;

  private constructor() {
    this.optimizationService = OptimizationService.getInstance();
    logger.info('DynamicASRCorrections initialized', { 
      component: 'DynamicASRCorrections'
    });
  }

  public static getInstance(): DynamicASRCorrections {
    if (!DynamicASRCorrections.instance) {
      DynamicASRCorrections.instance = new DynamicASRCorrections();
    }
    return DynamicASRCorrections.instance;
  }

  /**
   * Apply both static and dynamic ASR corrections to text
   */
  async applyEnhancedCorrections(
    text: string, 
    categories: (keyof ASRCorrectionCategories)[] | 'all' = 'all'
  ): Promise<string> {
    try {
      // First apply static corrections
      let correctedText = applyASRCorrections(text, categories);

      // Then apply dynamic corrections
      const dynamicCorrections = await this.getDynamicCorrections();
      if (dynamicCorrections && dynamicCorrections.correctionRules.length > 0) {
        correctedText = this.applyDynamicRules(correctedText, dynamicCorrections.correctionRules);
      }

      return correctedText;

    } catch (error) {
      logger.warn('Enhanced ASR corrections failed, falling back to static only', {
        component: 'DynamicASRCorrections',
        error: error.message
      });
      
      // Fallback to static corrections only
      return applyASRCorrections(text, categories);
    }
  }

  /**
   * Get combined patterns for external processing
   */
  async getCombinedCorrectionPatterns(
    categories: (keyof ASRCorrectionCategories)[] | 'all' = 'all'
  ): Promise<ReplacementPattern[]> {
    try {
      const merged = await this.getMergedCorrections(categories);
      return [...merged.staticPatterns, ...merged.dynamicPatterns];

    } catch (error) {
      logger.warn('Failed to get combined patterns, falling back to static', {
        component: 'DynamicASRCorrections',
        error: error.message
      });
      
      return getCombinedPatterns(categories);
    }
  }

  /**
   * Get glossary terms for Whisper prompt seeding
   */
  async getGlossaryTerms(maxTerms: number = 50): Promise<string[]> {
    try {
      const dynamicCorrections = await this.getDynamicCorrections();
      if (!dynamicCorrections) {
        return [];
      }

      // Limit terms to stay within Whisper's ~224 token limit
      const terms = dynamicCorrections.glossaryTerms.slice(0, maxTerms);
      
      logger.debug('Retrieved glossary terms for Whisper prompt', {
        component: 'DynamicASRCorrections',
        totalTerms: dynamicCorrections.glossaryTerms.length,
        returnedTerms: terms.length,
        maxTerms
      });

      return terms;

    } catch (error) {
      logger.warn('Failed to get glossary terms', {
        component: 'DynamicASRCorrections',
        error: error.message
      });
      return [];
    }
  }

  /**
   * Force refresh dynamic corrections from server
   */
  async refreshDynamicCorrections(): Promise<void> {
    logger.info('Refreshing dynamic ASR corrections', {
      component: 'DynamicASRCorrections'
    });

    this.dynamicCorrections = null;
    this.mergedCorrections = null;
    
    // Trigger reload
    await this.getDynamicCorrections();
  }

  /**
   * Check if dynamic corrections are available
   */
  async isDynamicCorrectionsAvailable(): Promise<boolean> {
    try {
      await this.optimizationService.testConnection();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get statistics about current corrections
   */
  async getCorrectionsStats(): Promise<{
    staticPatterns: number;
    dynamicRules: number;
    glossaryTerms: number;
    lastUpdated: Date | null;
    cacheValid: boolean;
  }> {
    const staticPatterns = getCombinedPatterns('all').length;
    const dynamicCorrections = await this.getDynamicCorrections();
    
    return {
      staticPatterns,
      dynamicRules: dynamicCorrections?.correctionRules.length || 0,
      glossaryTerms: dynamicCorrections?.glossaryTerms.length || 0,
      lastUpdated: dynamicCorrections ? new Date(dynamicCorrections.lastUpdated) : null,
      cacheValid: this.isCacheValid()
    };
  }

  // Private Methods

  private async getDynamicCorrections(): Promise<DynamicCorrections | null> {
    // Return cached data if valid
    if (this.dynamicCorrections && this.isCacheValid()) {
      return this.dynamicCorrections;
    }

    // Prevent multiple simultaneous requests
    if (this.isLoadingDynamic) {
      // Wait for ongoing request with timeout
      const startTime = Date.now();
      const timeout = 10000; // 10 seconds
      
      while (this.isLoadingDynamic && (Date.now() - startTime) < timeout) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return this.dynamicCorrections;
    }

    try {
      this.isLoadingDynamic = true;
      
      const asrState = await this.optimizationService.getCurrentASRState();
      
      this.dynamicCorrections = {
        glossaryTerms: asrState.glossary,
        correctionRules: asrState.rules,
        lastUpdated: Date.now()
      };

      logger.debug('Dynamic corrections loaded', {
        component: 'DynamicASRCorrections',
        glossaryTerms: asrState.glossary.length,
        correctionRules: asrState.rules.length
      });

      return this.dynamicCorrections;

    } catch (error) {
      logger.warn('Failed to load dynamic corrections', {
        component: 'DynamicASRCorrections',
        error: error.message
      });
      
      return null;
    } finally {
      this.isLoadingDynamic = false;
    }
  }

  private async getMergedCorrections(
    categories: (keyof ASRCorrectionCategories)[] | 'all' = 'all'
  ): Promise<MergedCorrections> {
    // Return cached merged data if valid
    if (this.mergedCorrections && this.isCacheValid(this.mergedCorrections.lastMerged)) {
      return this.mergedCorrections;
    }

    const staticPatterns = getCombinedPatterns(categories);
    const dynamicCorrections = await this.getDynamicCorrections();
    
    let dynamicPatterns: ReplacementPattern[] = [];
    if (dynamicCorrections) {
      dynamicPatterns = this.convertRulesToPatterns(dynamicCorrections.correctionRules);
    }

    this.mergedCorrections = {
      staticPatterns,
      dynamicPatterns,
      glossaryTerms: dynamicCorrections?.glossaryTerms || [],
      lastMerged: Date.now()
    };

    logger.debug('Corrections merged', {
      component: 'DynamicASRCorrections',
      staticPatterns: staticPatterns.length,
      dynamicPatterns: dynamicPatterns.length,
      glossaryTerms: this.mergedCorrections.glossaryTerms.length
    });

    return this.mergedCorrections;
  }

  private applyDynamicRules(text: string, rules: Array<{ raw: string; fix: string }>): string {
    let correctedText = text;
    
    for (const rule of rules) {
      try {
        // Create case-insensitive regex with word boundaries
        const regex = new RegExp(`\\b${this.escapeRegExp(rule.raw)}\\b`, 'gi');
        correctedText = correctedText.replace(regex, rule.fix);
      } catch (error) {
        logger.warn('Failed to apply dynamic rule', {
          component: 'DynamicASRCorrections',
          rule,
          error: error.message
        });
      }
    }
    
    return correctedText;
  }

  /**
   * Validate ASR correction rules before applying them
   */
  validateCorrectionRules(rules: Array<{ raw: string; fix: string }>): {
    valid: Array<{ raw: string; fix: string }>;
    invalid: Array<{ raw: string; fix: string; reason: string }>;
  } {
    const valid: Array<{ raw: string; fix: string }> = [];
    const invalid: Array<{ raw: string; fix: string; reason: string }> = [];
    
    for (const rule of rules) {
      const validationResult = this.validateSingleRule(rule);
      if (validationResult.isValid) {
        valid.push(rule);
      } else {
        invalid.push({ ...rule, reason: validationResult.reason });
      }
    }
    
    logger.info('ASR rule validation completed', {
      component: 'DynamicASRCorrections',
      totalRules: rules.length,
      validRules: valid.length,
      invalidRules: invalid.length
    });
    
    return { valid, invalid };
  }

  /**
   * Validate a single ASR correction rule
   */
  private validateSingleRule(rule: { raw: string; fix: string }): {
    isValid: boolean;
    reason: string;
  } {
    // Rule 1: Both raw and fix must be non-empty
    if (!rule.raw.trim() || !rule.fix.trim()) {
      return { isValid: false, reason: 'Raw and fix text cannot be empty' };
    }

    // Rule 2: Raw and fix must be different
    if (rule.raw.trim().toLowerCase() === rule.fix.trim().toLowerCase()) {
      return { isValid: false, reason: 'Raw and fix text cannot be identical' };
    }

    // Rule 3: No excessive length (prevent DoS)
    if (rule.raw.length > 100 || rule.fix.length > 100) {
      return { isValid: false, reason: 'Rule text exceeds maximum length (100 characters)' };
    }

    // Rule 4: Prevent dangerous regex patterns
    if (this.containsDangerousPattern(rule.raw)) {
      return { isValid: false, reason: 'Raw text contains potentially dangerous regex patterns' };
    }

    // Rule 5: Check for medical term conflicts
    const conflictCheck = this.checkMedicalTermConflict(rule);
    if (!conflictCheck.isValid) {
      return conflictCheck;
    }

    // Rule 6: Prevent infinite loops and cycles
    const cycleCheck = this.checkForCycles(rule);
    if (!cycleCheck.isValid) {
      return cycleCheck;
    }

    return { isValid: true, reason: 'Rule passed all validation checks' };
  }

  /**
   * Check for dangerous regex patterns that could cause performance issues
   */
  private containsDangerousPattern(text: string): boolean {
    const dangerousPatterns = [
      /(\*\+|\+\*)/,  // Catastrophic backtracking patterns
      /\(\?\!/,       // Negative lookahead
      /\(\?\=/,       // Positive lookahead
      /\(\?\<\!/,     // Negative lookbehind
      /\(\?\<\=/,     // Positive lookbehind
      /\{\d{3,}\}/,   // Very large repetition counts
      /\*\*+/,        // Multiple wildcards
      /\+\++/,        // Multiple plus operators
    ];

    return dangerousPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Check if a rule conflicts with critical medical terms
   */
  private checkMedicalTermConflict(rule: { raw: string; fix: string }): {
    isValid: boolean;
    reason: string;
  } {
    // Critical medical terms that should never be changed accidentally
    const criticalTerms = [
      'mg', 'mcg', 'ml', 'units', 'dose', 'tablet', 'capsule',
      'severe', 'mild', 'moderate', 'critical', 
      'systolic', 'diastolic', 'timi', 'ef', 'ejection fraction',
      'stenosis', 'regurgitation', 'aortic', 'mitral', 'tricuspid'
    ];

    const fixLower = rule.fix.toLowerCase();
    const rawLower = rule.raw.toLowerCase();

    // Check if we're accidentally converting a critical term
    for (const term of criticalTerms) {
      if (term === rawLower && !criticalTerms.includes(fixLower)) {
        return {
          isValid: false,
          reason: `Cannot convert critical medical term "${term}" to non-medical text`
        };
      }
    }

    return { isValid: true, reason: 'No medical term conflicts detected' };
  }

  /**
   * Check for potential cycles in correction rules
   */
  private checkForCycles(newRule: { raw: string; fix: string }): {
    isValid: boolean;
    reason: string;
  } {
    // Get current rules to check against
    const currentRules = this.dynamicCorrections?.correctionRules || [];
    
    // Check if the new rule would create a cycle with existing rules
    for (const existingRule of currentRules) {
      if (existingRule.fix.toLowerCase() === newRule.raw.toLowerCase() &&
          existingRule.raw.toLowerCase() === newRule.fix.toLowerCase()) {
        return {
          isValid: false,
          reason: `Rule creates cycle with existing rule: ${existingRule.raw} ↔ ${existingRule.fix}`
        };
      }
    }

    return { isValid: true, reason: 'No cycles detected' };
  }

  /**
   * Apply validation and safety checks before updating dynamic corrections
   */
  async applySafeCorrections(rules: Array<{ raw: string; fix: string }>): Promise<{
    applied: Array<{ raw: string; fix: string }>;
    rejected: Array<{ raw: string; fix: string; reason: string }>;
  }> {
    const validation = this.validateCorrectionRules(rules);
    
    // Log rejected rules
    if (validation.invalid.length > 0) {
      logger.warn('ASR rules rejected due to validation failures', {
        component: 'DynamicASRCorrections',
        rejectedRules: validation.invalid
      });
    }

    // Only apply valid rules
    try {
      // Update cache with valid rules only
      if (this.dynamicCorrections) {
        this.dynamicCorrections.correctionRules = [
          ...this.dynamicCorrections.correctionRules,
          ...validation.valid
        ];
        this.dynamicCorrections.lastUpdated = Date.now();
      }

      logger.info('ASR corrections applied safely', {
        component: 'DynamicASRCorrections',
        appliedCount: validation.valid.length,
        rejectedCount: validation.invalid.length
      });

      return {
        applied: validation.valid,
        rejected: validation.invalid
      };
    } catch (error) {
      logger.error('Failed to apply safe ASR corrections', {
        component: 'DynamicASRCorrections',
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        applied: [],
        rejected: rules.map(rule => ({ ...rule, reason: 'Application failed' }))
      };
    }
  }

  private convertRulesToPatterns(rules: Array<{ raw: string; fix: string }>): ReplacementPattern[] {
    return rules.map(rule => {
      try {
        const regex = new RegExp(`\\b${this.escapeRegExp(rule.raw)}\\b`, 'gi');
        return [regex, rule.fix] as ReplacementPattern;
      } catch (error) {
        logger.warn('Failed to convert rule to pattern', {
          component: 'DynamicASRCorrections',
          rule,
          error: error.message
        });
        // Return a simple string replacement as fallback
        return [new RegExp(rule.raw, 'gi'), rule.fix] as ReplacementPattern;
      }
    });
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private isCacheValid(timestamp?: number): boolean {
    const cacheTime = timestamp || this.dynamicCorrections?.lastUpdated || 0;
    return (Date.now() - cacheTime) < this.CACHE_TTL;
  }
}

/**
 * Convenience function for applying enhanced ASR corrections
 */
export async function applyEnhancedASRCorrections(
  text: string,
  categories: (keyof ASRCorrectionCategories)[] | 'all' = 'all'
): Promise<string> {
  const dynamicASR = DynamicASRCorrections.getInstance();
  return await dynamicASR.applyEnhancedCorrections(text, categories);
}

/**
 * Get glossary terms for Whisper prompt seeding
 */
export async function getWhisperGlossaryTerms(maxTerms: number = 50): Promise<string[]> {
  const dynamicASR = DynamicASRCorrections.getInstance();
  return await dynamicASR.getGlossaryTerms(maxTerms);
}