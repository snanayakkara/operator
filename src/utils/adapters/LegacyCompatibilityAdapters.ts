/**
 * Legacy Compatibility Adapters for Medical Text Processing Consolidation
 * 
 * Provides backward-compatible interfaces for legacy code while routing
 * to consolidated Phase 2 implementations. Enables gradual migration with zero
 * breaking changes to existing functionality.
 * 
 * PHASE 2 MIGRATION: Now routes to Phase 2 consolidation system
 */

import { logger } from '@/utils/Logger';
import { MedicalTextCleaner } from '@/utils/medical-text/TextCleaner';
import { ASRCorrectionEngine } from '@/utils/asr/ASRCorrectionEngine';
import { recordConsolidationBenchmark } from '@/utils/performance/ConsolidationMetrics';

// Phase 2 imports
import { medicalTextNormalizer } from '@/utils/medical-text/MedicalTextNormalizer';
import { agentIntegrationAdapter as _agentIntegrationAdapter } from '@/utils/medical-text/Phase2AdapterPatterns';

// Legacy ASR Corrections compatibility
import type { ReplacementPattern, ASRCorrectionCategories } from '@/utils/ASRCorrections';

/**
 * Adapter for legacy ASRCorrections.applyASRCorrections()
 * Routes to consolidated ASRCorrectionEngine while maintaining exact API
 */
export class ASRCorrectionsAdapter {
  private static instance: ASRCorrectionsAdapter;
  private asrEngine: ASRCorrectionEngine;

  private constructor() {
    this.asrEngine = ASRCorrectionEngine.getInstance();
  }

  public static getInstance(): ASRCorrectionsAdapter {
    if (!ASRCorrectionsAdapter.instance) {
      ASRCorrectionsAdapter.instance = new ASRCorrectionsAdapter();
    }
    return ASRCorrectionsAdapter.instance;
  }

  /**
   * Legacy-compatible ASR corrections application
   * Maintains exact API while routing to consolidated engine
   */
  async applyASRCorrections(
    text: string, 
    categories: (keyof ASRCorrectionCategories)[] | 'all'
  ): Promise<string> {
    const startTime = performance.now();
    
    try {
      const result = await this.asrEngine.applyCorrections(text, {
        categories,
        enableDynamic: false, // Legacy behavior was static-only
        australianTerms: true
      });

      const endTime = performance.now();
      recordConsolidationBenchmark('asr_correction_legacy', endTime - startTime, endTime - startTime, 0);

      logger.debug('Legacy ASR corrections applied via adapter', {
        inputLength: text.length,
        outputLength: result.length,
        categories: categories === 'all' ? 'all' : categories.join(', ')
      });

      return result;

    } catch (error) {
      logger.warn('Legacy ASR corrections failed, returning original text', { error });
      return text;
    }
  }

  /**
   * Legacy-compatible pattern retrieval  
   * Routes to consolidated engine pattern access
   */
  getCombinedPatterns(categories: (keyof ASRCorrectionCategories)[] | 'all' = 'all'): ReplacementPattern[] {
    return this.asrEngine.getCombinedPatterns(categories);
  }
}

/**
 * Adapter for legacy MedicalAgent.cleanMedicalText()
 * Routes to consolidated MedicalTextCleaner while maintaining exact API
 */
export class MedicalTextAdapter {
  private static instance: MedicalTextAdapter;
  private textCleaner: MedicalTextCleaner;

  private constructor() {
    this.textCleaner = MedicalTextCleaner.getInstance();
  }

  public static getInstance(): MedicalTextAdapter {
    if (!MedicalTextAdapter.instance) {
      MedicalTextAdapter.instance = new MedicalTextAdapter();
    }
    return MedicalTextAdapter.instance;
  }

  /**
   * Legacy-compatible medical text cleaning
   * PHASE 2: Routes to unified Phase 2 normalizer system
   */
  cleanMedicalText(text: string): string {
    const startTime = performance.now();
    
    try {
      // Phase 2: Use consolidated normalization system
      const result = medicalTextNormalizer.preNormalizeInvestigationTextSync(text);
      const endTime = performance.now();
      
      recordConsolidationBenchmark('text_cleaning_legacy_phase2', endTime - startTime, endTime - startTime, 0);

      logger.debug('Phase 2 medical text cleaning applied via legacy adapter', {
        inputLength: text.length,
        outputLength: result.length,
        phase: 'Phase 2 Consolidation'
      });

      return result;

    } catch (error) {
      logger.warn('Phase 2 medical text cleaning failed, falling back to legacy', { error });
      // Fallback to original method
      try {
        return this.textCleaner.clean(text, { level: 'medical' });
      } catch (fallbackError) {
        logger.error('Both Phase 2 and legacy cleaning failed', { fallbackError });
        return text;
      }
    }
  }

  /**
   * Legacy-compatible narrative text cleaning  
   * PHASE 2: Routes to Phase 2 narrative normalization
   */
  async cleanNarrativeText(text: string, preserveParagraphs: boolean = false): Promise<string> {
    const startTime = performance.now();
    
    try {
      // Phase 2: Use consolidated narrative normalization
      const result = await medicalTextNormalizer.normalize(text, {
        mode: 'narrative',
        preserveFormatting: preserveParagraphs,
        enableCrossAgentPatterns: true,
        australianSpelling: true
      });
      const endTime = performance.now();
      
      recordConsolidationBenchmark('narrative_cleaning_legacy_phase2', endTime - startTime, endTime - startTime, 0);

      logger.debug('Phase 2 narrative text cleaning applied via legacy adapter', {
        inputLength: text.length,
        outputLength: result.normalizedText.length,
        phase: 'Phase 2 Consolidation',
        preserveParagraphs
      });

      return result.normalizedText;

    } catch (error) {
      logger.warn('Phase 2 narrative text cleaning failed, falling back to legacy', { error });
      // Fallback to original method
      try {
        return this.textCleaner.clean(text, { 
          level: 'narrative',
          preserveParagraphs
        });
      } catch (fallbackError) {
        logger.error('Both Phase 2 and legacy narrative cleaning failed', { fallbackError });
        return text;
      }
    }
  }

  /**
   * Synchronous version for backward compatibility
   * PHASE 2: Routes to Phase 2 synchronous normalizer
   */
  cleanNarrativeTextSync(text: string, preserveParagraphs: boolean = false): string {
    const startTime = performance.now();
    
    try {
      // Phase 2: Use synchronous normalization for backward compatibility
      const result = medicalTextNormalizer.preNormalizeInvestigationTextSync(text);
      const endTime = performance.now();
      
      recordConsolidationBenchmark('narrative_cleaning_sync_phase2', endTime - startTime, endTime - startTime, 0);

      return result;

    } catch (error) {
      logger.warn('Phase 2 synchronous narrative cleaning failed, falling back to legacy', { error });
      try {
        return this.textCleaner.clean(text, { 
          level: 'narrative',
          preserveParagraphs
        });
      } catch (fallbackError) {
        logger.error('Both Phase 2 and legacy synchronous narrative cleaning failed', { fallbackError });
        return text;
      }
    }
  }

  /**
   * Legacy-compatible summary text cleaning
   * PHASE 2: Routes to Phase 2 summary normalization
   */
  async cleanSummaryText(text: string): Promise<string> {
    const startTime = performance.now();
    
    try {
      // Phase 2: Use consolidated summary normalization
      const result = await medicalTextNormalizer.normalize(text, {
        mode: 'summary',
        enableCrossAgentPatterns: true,
        australianSpelling: true,
        strictMedicalTerms: false // More lenient for summaries
      });
      const endTime = performance.now();
      
      recordConsolidationBenchmark('summary_cleaning_legacy_phase2', endTime - startTime, endTime - startTime, 0);

      logger.debug('Phase 2 summary text cleaning applied via legacy adapter', {
        inputLength: text.length,
        outputLength: result.normalizedText.length,
        phase: 'Phase 2 Consolidation'
      });

      return result.normalizedText;

    } catch (error) {
      logger.warn('Phase 2 summary text cleaning failed, falling back to legacy', { error });
      // Fallback to original method
      try {
        return this.textCleaner.clean(text, { level: 'summary' });
      } catch (fallbackError) {
        logger.error('Both Phase 2 and legacy summary cleaning failed', { fallbackError });
        return text;
      }
    }
  }

  /**
   * Synchronous version for backward compatibility
   * PHASE 2: Routes to Phase 2 synchronous normalizer
   */
  cleanSummaryTextSync(text: string): string {
    const startTime = performance.now();
    
    try {
      // Phase 2: Use synchronous normalization for backward compatibility
      const result = medicalTextNormalizer.preNormalizeInvestigationTextSync(text);
      const endTime = performance.now();
      
      recordConsolidationBenchmark('summary_cleaning_sync_phase2', endTime - startTime, endTime - startTime, 0);

      return result;

    } catch (error) {
      logger.warn('Phase 2 synchronous summary cleaning failed, falling back to legacy', { error });
      try {
        return this.textCleaner.clean(text, { level: 'summary' });
      } catch (fallbackError) {
        logger.error('Both Phase 2 and legacy synchronous summary cleaning failed', { fallbackError });
        return text;
      }
    }
  }
}

/**
 * Adapter for legacy InvestigationSummarySystemPrompts.preNormalizeInvestigationText()
 * Routes to consolidated ASRCorrectionEngine investigation methods
 */
export class InvestigationNormalizationAdapter {
  private static instance: InvestigationNormalizationAdapter;
  private asrEngine: ASRCorrectionEngine;

  private constructor() {
    this.asrEngine = ASRCorrectionEngine.getInstance();
  }

  public static getInstance(): InvestigationNormalizationAdapter {
    if (!InvestigationNormalizationAdapter.instance) {
      InvestigationNormalizationAdapter.instance = new InvestigationNormalizationAdapter();
    }
    return InvestigationNormalizationAdapter.instance;
  }

  /**
   * Legacy-compatible investigation text normalization
   * PHASE 2: Routes to Phase 2 investigation normalization system
   */
  preNormalizeInvestigationText(input: string): string {
    const startTime = performance.now();
    
    try {
      // Phase 2: Use consolidated investigation normalization
      const result = medicalTextNormalizer.preNormalizeInvestigationTextSync(input);
      const endTime = performance.now();
      
      recordConsolidationBenchmark('investigation_normalization_legacy_phase2', endTime - startTime, endTime - startTime, 0);

      logger.debug('Phase 2 investigation normalization applied via legacy adapter', {
        inputLength: input.length,
        outputLength: result.length,
        phase: 'Phase 2 Consolidation'
      });

      return result;

    } catch (error) {
      logger.warn('Phase 2 investigation normalization failed, falling back to legacy', { error });
      // Fallback to original method
      try {
        return this.asrEngine.preNormalizeInvestigationTextSync(input);
      } catch (fallbackError) {
        logger.error('Both Phase 2 and legacy investigation normalization failed', { fallbackError });
        return input;
      }
    }
  }

  /**
   * Async version for future compatibility
   * PHASE 2: Routes to Phase 2 async investigation normalization
   */
  async preNormalizeInvestigationTextAsync(input: string): Promise<string> {
    const startTime = performance.now();
    
    try {
      // Phase 2: Use consolidated async investigation normalization
      const result = await medicalTextNormalizer.normalize(input, {
        mode: 'investigation',
        enableCrossAgentPatterns: true,
        australianSpelling: true,
        strictMedicalTerms: true
      });
      const endTime = performance.now();
      
      recordConsolidationBenchmark('investigation_normalization_async_phase2', endTime - startTime, endTime - startTime, 0);

      logger.debug('Phase 2 async investigation normalization applied via legacy adapter', {
        inputLength: input.length,
        outputLength: result.normalizedText.length,
        phase: 'Phase 2 Consolidation',
        confidence: result.confidence
      });

      return result.normalizedText;

    } catch (error) {
      logger.warn('Phase 2 async investigation normalization failed, falling back to legacy', { error });
      // Fallback to original method
      try {
        return await this.asrEngine.preNormalizeInvestigationText(input);
      } catch (fallbackError) {
        logger.error('Both Phase 2 and legacy async investigation normalization failed', { fallbackError });
        return input;
      }
    }
  }
}

/**
 * Migration Helper - Provides utilities for gradual migration
 */
export class MigrationHelper {
  private static instance: MigrationHelper;
  private migrationLog: Map<string, MigrationEntry> = new Map();

  private constructor() {}

  public static getInstance(): MigrationHelper {
    if (!MigrationHelper.instance) {
      MigrationHelper.instance = new MigrationHelper();
    }
    return MigrationHelper.instance;
  }

  /**
   * Log usage of legacy functions for migration tracking
   */
  logLegacyUsage(
    functionName: string,
    callerContext: string,
    migrationPath: string
  ): void {
    const key = `${functionName}:${callerContext}`;
    const existing = this.migrationLog.get(key);

    if (existing) {
      existing.usageCount++;
      existing.lastUsed = Date.now();
    } else {
      this.migrationLog.set(key, {
        functionName,
        callerContext,
        migrationPath,
        usageCount: 1,
        firstUsed: Date.now(),
        lastUsed: Date.now()
      });
    }

    logger.debug('Legacy function usage logged', {
      functionName,
      callerContext,
      migrationPath
    });
  }

  /**
   * Get migration status report
   */
  getMigrationReport(): {
    totalLegacyUsages: number;
    uniqueFunctions: number;
    mostUsedFunctions: MigrationEntry[];
    migrationRecommendations: string[];
  } {
    const entries = Array.from(this.migrationLog.values());
    const totalUsages = entries.reduce((sum, entry) => sum + entry.usageCount, 0);
    
    const mostUsed = entries
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10);

    const recommendations = this.generateMigrationRecommendations(entries);

    return {
      totalLegacyUsages: totalUsages,
      uniqueFunctions: entries.length,
      mostUsedFunctions: mostUsed,
      migrationRecommendations: recommendations
    };
  }

  /**
   * Check if function has been migrated
   */
  isFunctionMigrated(functionName: string): boolean {
    const migratedFunctions = new Set([
      'cleanMedicalText',
      'cleanNarrativeText', 
      'cleanSummaryText',
      'applyASRCorrections',
      'preNormalizeInvestigationText'
    ]);

    return migratedFunctions.has(functionName);
  }

  /**
   * Get migration path for a legacy function
   */
  getMigrationPath(functionName: string): string | null {
    const migrationPaths: Record<string, string> = {
      'cleanMedicalText': 'MedicalTextCleaner.getInstance().clean(text, { level: "medical" })',
      'cleanNarrativeText': 'MedicalTextCleaner.getInstance().clean(text, { level: "narrative" })',
      'cleanSummaryText': 'MedicalTextCleaner.getInstance().clean(text, { level: "summary" })',
      'applyASRCorrections': 'ASRCorrectionEngine.getInstance().correctText(text, { categories })',
      'preNormalizeInvestigationText': 'ASRCorrectionEngine.getInstance().preNormalizeInvestigationTextSync(text)'
    };

    return migrationPaths[functionName] || null;
  }

  private generateMigrationRecommendations(entries: MigrationEntry[]): string[] {
    const recommendations: string[] = [];

    // High usage functions should be prioritized
    const highUsageFunctions = entries.filter(e => e.usageCount > 10);
    if (highUsageFunctions.length > 0) {
      recommendations.push(`Prioritize migrating high-usage functions: ${highUsageFunctions.map(e => e.functionName).join(', ')}`);
    }

    // Recent usage indicates active code paths
    const recentlyUsed = entries.filter(e => Date.now() - e.lastUsed < 24 * 60 * 60 * 1000); // Last 24 hours
    if (recentlyUsed.length > 0) {
      recommendations.push(`Recently used functions need attention: ${recentlyUsed.map(e => e.functionName).join(', ')}`);
    }

    // General recommendations
    if (entries.length > 20) {
      recommendations.push('Consider batch migration approach for remaining legacy functions');
    }

    if (entries.length === 0) {
      recommendations.push('✅ All tracked functions have been migrated or are no longer in use');
    }

    return recommendations;
  }
}

interface MigrationEntry {
  functionName: string;
  callerContext: string;
  migrationPath: string;
  usageCount: number;
  firstUsed: number;
  lastUsed: number;
}

// Convenience functions for easy adoption
export const legacyASRCorrections = ASRCorrectionsAdapter.getInstance();
export const legacyMedicalText = MedicalTextAdapter.getInstance();
export const legacyInvestigationNormalization = InvestigationNormalizationAdapter.getInstance();
export const migrationHelper = MigrationHelper.getInstance();

// Phase 2 Drop-in replacements for common legacy functions
export function cleanMedicalText(text: string): string {
  migrationHelper.logLegacyUsage('cleanMedicalText', 'global_phase2', 'medicalTextNormalizer.preNormalizeInvestigationTextSync(text)');
  return legacyMedicalText.cleanMedicalText(text);
}

export function cleanNarrativeText(text: string, preserveParagraphs?: boolean): string {
  migrationHelper.logLegacyUsage('cleanNarrativeText', 'global_phase2', 'medicalTextNormalizer.normalize(text, { mode: "narrative", preserveFormatting: preserveParagraphs })');
  return legacyMedicalText.cleanNarrativeTextSync(text, preserveParagraphs);
}

export function cleanSummaryText(text: string): string {
  migrationHelper.logLegacyUsage('cleanSummaryText', 'global_phase2', 'medicalTextNormalizer.normalize(text, { mode: "summary" })');
  return legacyMedicalText.cleanSummaryTextSync(text);
}

export async function applyASRCorrections(
  text: string,
  categories: (keyof ASRCorrectionCategories)[] | 'all'
): Promise<string> {
  migrationHelper.logLegacyUsage('applyASRCorrections', 'global_phase2', 'ASRCorrectionEngine.getInstance().correctText(text, { categories })');
  return await legacyASRCorrections.applyASRCorrections(text, categories);
}

export function preNormalizeInvestigationText(input: string): string {
  migrationHelper.logLegacyUsage('preNormalizeInvestigationText', 'global_phase2', 'medicalTextNormalizer.preNormalizeInvestigationTextSync(input)');
  return legacyInvestigationNormalization.preNormalizeInvestigationText(input);
}

// Phase 2 Async versions for new functionality
export async function cleanNarrativeTextAsync(text: string, preserveParagraphs?: boolean): Promise<string> {
  migrationHelper.logLegacyUsage('cleanNarrativeTextAsync', 'global_phase2_async', 'medicalTextNormalizer.normalize(text, { mode: "narrative" })');
  return await legacyMedicalText.cleanNarrativeText(text, preserveParagraphs);
}

export async function cleanSummaryTextAsync(text: string): Promise<string> {
  migrationHelper.logLegacyUsage('cleanSummaryTextAsync', 'global_phase2_async', 'medicalTextNormalizer.normalize(text, { mode: "summary" })');
  return await legacyMedicalText.cleanSummaryText(text);
}

export async function preNormalizeInvestigationTextAsync(input: string): Promise<string> {
  migrationHelper.logLegacyUsage('preNormalizeInvestigationTextAsync', 'global_phase2_async', 'medicalTextNormalizer.normalize(input, { mode: "investigation" })');
  return await legacyInvestigationNormalization.preNormalizeInvestigationTextAsync(input);
}