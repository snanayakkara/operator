/**
 * Medical Text Normalizer - Phase 2 Consolidation
 * 
 * Unified text normalization system that integrates with the Cardiology Pattern Registry
 * to provide consistent medical text standardization across all agents.
 * Consolidates investigation text formatting, medical terminology standardization,
 * and cross-agent pattern application.
 */

import { cardiologyRegistry, type CardiologyPattern, type AgentCardiologyPatterns } from './CardiologyPatternRegistry';
import { MedicalPatternService } from './MedicalPatternService';
import type { AgentType } from '@/types/medical.types';
import { logger } from '@/utils/Logger';
import { recordConsolidationBenchmark } from '@/utils/performance/ConsolidationMetrics';

export interface NormalizationConfig {
  agentType?: AgentType;
  mode: 'investigation' | 'narrative' | 'summary' | 'full';
  preserveFormatting?: boolean;
  applyAbbreviations?: boolean;
  enableCrossAgentPatterns?: boolean;
  australianSpelling?: boolean;
  strictMedicalTerms?: boolean;
  preserveUnits?: boolean;
}

export interface NormalizationResult {
  originalText: string;
  normalizedText: string;
  appliedPatterns: string[];
  replacements: Array<{
    original: string;
    normalized: string;
    pattern: string;
    position: number;
  }>;
  warnings: string[];
  processingTimeMs: number;
  confidence: number;
}

export interface InvestigationNormalizationRules {
  dateFormatting: boolean;
  abbreviationExpansion: boolean;
  unitStandardization: boolean;
  hemodynamicFormatting: boolean;
  stenosisPatternApplication: boolean;
  timiFlowPreservation: boolean;
}

/**
 * Medical Text Normalizer with Cardiology Registry Integration
 * Provides unified text normalization across all medical agents
 */
export class MedicalTextNormalizer {
  private static instance: MedicalTextNormalizer;
  private patternService: MedicalPatternService;
  private processingCache: Map<string, NormalizationResult> = new Map();

  // Investigation-specific normalization patterns
  private readonly investigationPatterns = {
    // Date normalization patterns
    dateNormalization: [
      { pattern: /(\w+),?\s*(\d{1,2})(?:st|nd|rd|th)\s+(\w+)\s+(\d{4})/gi, replacement: '$1 ($2 $3 $4): ' },
      { pattern: /(\w+)\s*\((\d{1,2})\s+(\w+)\s+(\d{4})\),?/gi, replacement: '$1 ($2 $3 $4): ' },
      { pattern: /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)\s+(\w+)\s+(\d{4})\s+/gi, replacement: '$1 ($2 $3 $4): ' }
    ],

    // Hemodynamic abbreviations for RHC
    hemodynamicAbbreviations: [
      { pattern: /\bPA mean\b/gi, replacement: 'PAm' },
      { pattern: /\bpulmonary capillary wedge pressure\b/gi, replacement: 'PCWP' },
      { pattern: /\bcardiac output\b/gi, replacement: 'CO' },
      { pattern: /\bcardiac index\b/gi, replacement: 'CI' },
      { pattern: /\bright ventricular stroke work index\b/gi, replacement: 'RVSWI' },
      { pattern: /\bpulmonary artery systolic pressure\b/gi, replacement: 'PASP' },
      { pattern: /\bright atrial pressure\b/gi, replacement: 'RAP' },
      { pattern: /\bstroke volume index\b/gi, replacement: 'SVI' }
    ],

    // Investigation type conversions (specific patterns first)
    investigationTypes: [
      { pattern: /\bstress echo cardiogram\b/gi, replacement: 'Stress TTE' },
      { pattern: /\btrans thoracic echo\b/gi, replacement: 'TTE' },
      { pattern: /\btrans (?:oesophageal|esophageal) echo\b/gi, replacement: 'TOE' },
      { pattern: /\bCT coronary angiogram\b/gi, replacement: 'CTCA' },
      { pattern: /\bAmbulatory Blood Pressure Monitor\b/gi, replacement: 'ABPM' },
      { pattern: /\bBlood Pressure Monitor\b/gi, replacement: 'ABPM' },
      { pattern: /\bright heart catheter\b/gi, replacement: 'RHC' }
    ],

    // Lab value and measurement formatting
    labFormatting: [
      { pattern: /\b(\w+),\s*(\d+\.?\d*)\b/gi, replacement: '$1 $2' },
      { pattern: /\bHbA1c\s+(\d+\.?\d*)(?!%)\b/gi, replacement: 'HbA1c $1%' },
      { pattern: /\b(?:Hemoglobin|Haemoglobin)\b/gi, replacement: 'Hb' },
      { pattern: /\bmoderate to severe\b/gi, replacement: 'mod-sev' },
      { pattern: /\bmild to moderate\b/gi, replacement: 'mild-mod' },
      { pattern: /\bPASP\s+(\d+)(?!\s*mmHg)(?!\s*>)\b/gi, replacement: 'PASP >$1' },
      { pattern: /\bRVSP\s+(\d+)(?!\s*mmHg)\b/gi, replacement: 'RVSP $1mmHg' },
      { pattern: /\bRVSP\s+from\s+(\d+)\s+to\s+(\d+)(?!\s*mmHg)\b/gi, replacement: 'RVSP from $1 to $2mmHg' }
    ],

    // Exercise test patterns
    exercisePatterns: [
      { pattern: /\bbruce stage\s+(\d+)\b/gi, replacement: 'Bruce Stage $1' },
      { pattern: /\bexercise for\b/gi, replacement: 'exercised for' },
      { pattern: /\bexercised for\s+(\d+\.?\d*)\s+minutes,\s+(\d+\.?\d*)\s+minutes\b/gi, replacement: 'exercised for $1 minutes, $2 METs' },
      { pattern: /\bexercised for\s+(\d+\.?\d*)\s+minutes,\s+(\d+\.?\d*)\.\s*$/gi, replacement: 'exercised for $1 minutes, $2 METs;' }
    ],

    // ASR-specific medical corrections
    asrCorrections: [
      { pattern: /\bLED stenosis\b/gi, replacement: 'LAD stenosis' },
      { pattern: /\bosteocircumflex artery\b/gi, replacement: 'ostial circumflex artery' },
      { pattern: /\bPeritin levels\b/gi, replacement: 'Ferritin levels' },
      { pattern: /\bRBSP\b/gi, replacement: 'RVSP' },
      { pattern: /\bEGFR greater than\b/gi, replacement: 'eGFR >' },
      { pattern: /\bgreater than\s+(\d+)\b/gi, replacement: '>$1' },
      { pattern: /\bproximal\s+(LAD|RCA|LCX)\b/gi, replacement: 'prox $1' },
      { pattern: /\b(\d+\.?\d*)\s+millimeters(?!\s+stenosis)\b/gi, replacement: '($1mm)' },
      { pattern: /\b(\d+\.?\d*)\s*mm(?!Hg)\b/gi, replacement: '($1mm)' },
      { pattern: /\bCalcium score,\s*(\d+)\.\s*(\d+)\s+to\s+(\d+)(?:st|nd|rd|th)\s+centile\b/gi, replacement: 'Ca Score $1/$2 to $3th centile' },
      { pattern: /\biotic valve gradient\b/gi, replacement: 'AV MPG' },
      { pattern: /\bAV gradient\b/gi, replacement: 'AV MPG' }
    ],

    // Final formatting cleanup
    finalFormatting: [
      { pattern: /(\w+)\s+normal\s+function\b/gi, replacement: '$1: normal function' },
      { pattern: /(\w+):\s+normal\s+function\b/gi, replacement: '$1: normal function' },
      { pattern: /\s+/g, replacement: ' ' }, // Normalize whitespace
      { pattern: /^\s+|\s+$/g, replacement: '' } // Trim
    ]
  };

  private constructor() {
    this.patternService = MedicalPatternService.getInstance();
  }

  public static getInstance(): MedicalTextNormalizer {
    if (!MedicalTextNormalizer.instance) {
      MedicalTextNormalizer.instance = new MedicalTextNormalizer();
    }
    return MedicalTextNormalizer.instance;
  }

  /**
   * Main normalization entry point
   */
  async normalize(text: string, config: NormalizationConfig): Promise<NormalizationResult> {
    const startTime = performance.now();
    
    try {
      const cacheKey = this.generateCacheKey(text, config);
      const cached = this.processingCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      logger.debug('Starting medical text normalization', {
        textLength: text.length,
        mode: config.mode,
        agentType: config.agentType
      });

      let normalizedText = text;
      const appliedPatterns: string[] = [];
      const replacements: Array<{ original: string; normalized: string; pattern: string; position: number }> = [];
      const warnings: string[] = [];

      // Apply mode-specific normalization
      switch (config.mode) {
        case 'investigation': {
          const result = await this.normalizeInvestigationText(normalizedText, config);
          normalizedText = result.normalizedText;
          appliedPatterns.push(...result.appliedPatterns);
          replacements.push(...result.replacements);
          if (result.warnings) warnings.push(...result.warnings);
          break;
        }
        case 'narrative': {
          const result = await this.normalizeNarrativeText(normalizedText, config);
          normalizedText = result.normalizedText;
          appliedPatterns.push(...result.appliedPatterns);
          replacements.push(...result.replacements);
          break;
        }
        case 'summary': {
          const result = await this.normalizeSummaryText(normalizedText, config);
          normalizedText = result.normalizedText;
          appliedPatterns.push(...result.appliedPatterns);
          replacements.push(...result.replacements);
          break;
        }
        case 'full': {
          const result = await this.normalizeFullText(normalizedText, config);
          normalizedText = result.normalizedText;
          appliedPatterns.push(...result.appliedPatterns);
          replacements.push(...result.replacements);
          if (result.warnings) warnings.push(...result.warnings);
          break;
        }
      }

      // Apply cardiology registry patterns if agent specified
      if (config.agentType && config.enableCrossAgentPatterns) {
        const agentPatterns = cardiologyRegistry.getAgentPatterns(config.agentType);
        const agentResult = this.applyCardiologyPatterns(normalizedText, agentPatterns, config);
        normalizedText = agentResult.text;
        appliedPatterns.push(...agentResult.appliedPatterns);
        replacements.push(...agentResult.replacements);
      }

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      const result: NormalizationResult = {
        originalText: text,
        normalizedText,
        appliedPatterns,
        replacements,
        warnings,
        processingTimeMs: processingTime,
        confidence: this.calculateConfidence(text, normalizedText, appliedPatterns.length)
      };

      // Cache result
      this.processingCache.set(cacheKey, result);
      
      // Record performance metrics
      recordConsolidationBenchmark('text_normalization', processingTime, processingTime, 0);

      logger.debug('Medical text normalization completed', {
        originalLength: text.length,
        normalizedLength: normalizedText.length,
        patternsApplied: appliedPatterns.length,
        replacements: replacements.length,
        processingTime,
        confidence: result.confidence
      });

      return result;

    } catch (error) {
      const endTime = performance.now();
      logger.error('Medical text normalization failed', error instanceof Error ? error : new Error(String(error)), { processingTime: endTime - startTime });
      
      return {
        originalText: text,
        normalizedText: text, // Return original on error
        appliedPatterns: [],
        replacements: [],
        warnings: [`Normalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        processingTimeMs: endTime - startTime,
        confidence: 0
      };
    }
  }

  /**
   * Investigation-specific text normalization
   */
  private async normalizeInvestigationText(
    text: string, 
    config: NormalizationConfig
  ): Promise<{
    normalizedText: string;
    appliedPatterns: string[];
    replacements: Array<{ original: string; normalized: string; pattern: string; position: number }>;
    warnings: string[];
  }> {
    let normalizedText = text;
    const appliedPatterns: string[] = [];
    const replacements: Array<{ original: string; normalized: string; pattern: string; position: number }> = [];
    const warnings: string[] = [];

    // Apply investigation patterns in order
    const patternGroups = [
      { name: 'ASR Corrections', patterns: this.investigationPatterns.asrCorrections },
      { name: 'Hemodynamic Abbreviations', patterns: this.investigationPatterns.hemodynamicAbbreviations },
      { name: 'Investigation Types', patterns: this.investigationPatterns.investigationTypes },
      { name: 'Date Formatting', patterns: this.investigationPatterns.dateNormalization },
      { name: 'Lab Formatting', patterns: this.investigationPatterns.labFormatting },
      { name: 'Exercise Patterns', patterns: this.investigationPatterns.exercisePatterns },
      { name: 'Final Formatting', patterns: this.investigationPatterns.finalFormatting }
    ];

    for (const group of patternGroups) {
      for (const patternRule of group.patterns) {
        const beforeText = normalizedText;
        normalizedText = normalizedText.replace(patternRule.pattern, patternRule.replacement);
        
        if (beforeText !== normalizedText) {
          appliedPatterns.push(`${group.name}: ${patternRule.pattern.source}`);
          
          // Track specific replacements for detailed reporting
          let match;
          const regex = new RegExp(patternRule.pattern.source, patternRule.pattern.flags);
          while ((match = regex.exec(beforeText)) !== null) {
            replacements.push({
              original: match[0],
              normalized: match[0].replace(patternRule.pattern, patternRule.replacement),
              pattern: `${group.name}: ${patternRule.pattern.source}`,
              position: match.index
            });
            
            if (!patternRule.pattern.global) break;
          }
        }
      }
    }

    // Validate investigation-specific requirements
    if (config.strictMedicalTerms) {
      const medicalTermValidation = this.validateMedicalTerms(normalizedText);
      if (medicalTermValidation.warnings.length > 0) {
        warnings.push(...medicalTermValidation.warnings);
      }
    }

    return { normalizedText, appliedPatterns, replacements, warnings };
  }

  /**
   * Narrative text normalization
   */
  private async normalizeNarrativeText(
    text: string, 
    config: NormalizationConfig
  ): Promise<{
    normalizedText: string;
    appliedPatterns: string[];
    replacements: Array<{ original: string; normalized: string; pattern: string; position: number }>;
  }> {
    let normalizedText = text;
    const appliedPatterns: string[] = [];
    const replacements: Array<{ original: string; normalized: string; pattern: string; position: number }> = [];

    // Apply narrative-specific patterns (subset of investigation patterns)
    const narrativePatternGroups = [
      { name: 'Medical Corrections', patterns: this.investigationPatterns.asrCorrections },
      { name: 'Abbreviations', patterns: this.investigationPatterns.hemodynamicAbbreviations },
      { name: 'Final Formatting', patterns: this.investigationPatterns.finalFormatting.slice(0, -1) } // Exclude whitespace normalization for narrative
    ];

    for (const group of narrativePatternGroups) {
      for (const patternRule of group.patterns) {
        const beforeText = normalizedText;
        normalizedText = normalizedText.replace(patternRule.pattern, patternRule.replacement);
        
        if (beforeText !== normalizedText) {
          appliedPatterns.push(`${group.name}: ${patternRule.pattern.source}`);
        }
      }
    }

    return { normalizedText, appliedPatterns, replacements };
  }

  /**
   * Summary text normalization  
   */
  private async normalizeSummaryText(
    text: string, 
    config: NormalizationConfig
  ): Promise<{
    normalizedText: string;
    appliedPatterns: string[];
    replacements: Array<{ original: string; normalized: string; pattern: string; position: number }>;
  }> {
    let normalizedText = text;
    const appliedPatterns: string[] = [];
    const replacements: Array<{ original: string; normalized: string; pattern: string; position: number }> = [];

    // Apply minimal patterns for summaries
    const summaryPatterns = [
      { name: 'Basic Corrections', patterns: this.investigationPatterns.asrCorrections.slice(0, 5) }, // Most critical corrections
      { name: 'Whitespace Cleanup', patterns: [this.investigationPatterns.finalFormatting[this.investigationPatterns.finalFormatting.length - 2]] }
    ];

    for (const group of summaryPatterns) {
      for (const patternRule of group.patterns) {
        const beforeText = normalizedText;
        normalizedText = normalizedText.replace(patternRule.pattern, patternRule.replacement);
        
        if (beforeText !== normalizedText) {
          appliedPatterns.push(`${group.name}: ${patternRule.pattern.source}`);
        }
      }
    }

    return { normalizedText, appliedPatterns, replacements };
  }

  /**
   * Full text normalization (comprehensive)
   */
  private async normalizeFullText(
    text: string, 
    config: NormalizationConfig
  ): Promise<{
    normalizedText: string;
    appliedPatterns: string[];
    replacements: Array<{ original: string; normalized: string; pattern: string; position: number }>;
    warnings: string[];
  }> {
    // Full normalization uses investigation normalization as the most comprehensive
    return await this.normalizeInvestigationText(text, config);
  }

  /**
   * Apply cardiology registry patterns
   */
  private applyCardiologyPatterns(
    text: string,
    patterns: CardiologyPattern[],
    config: NormalizationConfig
  ): {
    text: string;
    appliedPatterns: string[];
    replacements: Array<{ original: string; normalized: string; pattern: string; position: number }>;
  } {
    let normalizedText = text;
    const appliedPatterns: string[] = [];
    const replacements: Array<{ original: string; normalized: string; pattern: string; position: number }> = [];

    for (const pattern of patterns) {
      const beforeText = normalizedText;
      
      if (pattern.replacements && pattern.replacements.length > 0) {
        for (const replacement of pattern.replacements) {
          const replacementPattern = new RegExp(replacement.match, 'gi');
          normalizedText = normalizedText.replace(replacementPattern, replacement.replacement);
        }
      }
      
      if (beforeText !== normalizedText) {
        appliedPatterns.push(`Cardiology: ${pattern.id}`);
      }
    }

    return { text: normalizedText, appliedPatterns, replacements };
  }

  /**
   * Validate medical terms for accuracy
   */
  private validateMedicalTerms(text: string): { warnings: string[] } {
    const warnings: string[] = [];

    // Check for potential medical inaccuracies
    const problematicPatterns = [
      { pattern: /\d+%\s+stenosis/gi, warning: 'Percentage stenosis detected - consider qualitative grading (mild/moderate/severe)' },
      { pattern: /TIMI\s+\d+%/gi, warning: 'TIMI flow should not be expressed as percentage' },
      { pattern: /\bmm Hg\b/gi, warning: 'Unit formatting: consider mmHg (no space)' },
      { pattern: /\beGFR\s+\d+\s*%/gi, warning: 'eGFR should not be expressed as percentage' }
    ];

    for (const check of problematicPatterns) {
      if (check.pattern.test(text)) {
        warnings.push(check.warning);
      }
    }

    return { warnings };
  }

  /**
   * Calculate normalization confidence score
   */
  private calculateConfidence(originalText: string, normalizedText: string, patternsApplied: number): number {
    if (originalText === normalizedText) {
      return patternsApplied === 0 ? 100 : 95; // High confidence if no changes needed or patterns applied
    }

    const changeRatio = Math.abs(normalizedText.length - originalText.length) / originalText.length;
    const baseConfidence = Math.max(60, 100 - (changeRatio * 100));
    
    // Increase confidence with more patterns applied (indicates active processing)
    const patternBonus = Math.min(20, patternsApplied * 2);
    
    return Math.min(100, baseConfidence + patternBonus);
  }

  /**
   * Generate cache key for normalization results
   */
  private generateCacheKey(text: string, config: NormalizationConfig): string {
    const configString = JSON.stringify({
      agentType: config.agentType,
      mode: config.mode,
      enableCrossAgentPatterns: config.enableCrossAgentPatterns,
      australianSpelling: config.australianSpelling,
      strictMedicalTerms: config.strictMedicalTerms
    });
    
    // Simple hash for text + config
    const textHash = text.length.toString() + text.slice(0, 50) + text.slice(-50);
    return `${textHash}_${btoa(configString)}`;
  }

  /**
   * Clear processing cache
   */
  clearCache(): void {
    this.processingCache.clear();
    logger.info('Medical text normalizer cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; memoryEstimate: number } {
    const size = this.processingCache.size;
    const memoryEstimate = size * 1024; // Rough estimate: 1KB per cached item
    return { size, memoryEstimate };
  }

  /**
   * Synchronous investigation text normalization for backward compatibility
   */
  preNormalizeInvestigationTextSync(input: string): string {
    if (!input || input.trim() === '') {
      return '';
    }

    try {
      // Apply patterns synchronously (simplified version)
      let result = input;
      
      // Apply critical patterns in order
      const criticalPatterns = [
        ...this.investigationPatterns.asrCorrections,
        ...this.investigationPatterns.hemodynamicAbbreviations,
        ...this.investigationPatterns.investigationTypes,
        ...this.investigationPatterns.labFormatting,
        ...this.investigationPatterns.exercisePatterns,
        ...this.investigationPatterns.finalFormatting
      ];

      for (const patternRule of criticalPatterns) {
        result = result.replace(patternRule.pattern, patternRule.replacement);
      }

      return result;

    } catch (error) {
      logger.warn('Synchronous investigation normalization failed', { error });
      return input;
    }
  }
}

// Convenience exports
export const medicalTextNormalizer = MedicalTextNormalizer.getInstance();

// Legacy compatibility functions
export function preNormalizeInvestigationText(input: string): string {
  return medicalTextNormalizer.preNormalizeInvestigationTextSync(input);
}

export async function normalizeInvestigationText(input: string, agentType?: AgentType): Promise<string> {
  const result = await medicalTextNormalizer.normalize(input, {
    mode: 'investigation',
    agentType,
    enableCrossAgentPatterns: true,
    australianSpelling: true,
    strictMedicalTerms: true
  });
  
  return result.normalizedText;
}
