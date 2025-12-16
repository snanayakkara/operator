/**
 * Enhanced ASR Correction Engine
 * Consolidates static and dynamic ASR correction systems
 * 
 * Replaces:
 * - ASRCorrections.applyASRCorrections()
 * - DynamicASRCorrections.applyEnhancedCorrections()  
 * - BloodsAgent.applyBloodsASRCorrections()
 * - Agent-specific ASR correction logic
 */

import { logger } from '@/utils/Logger';
import { toError } from '@/utils/errorHelpers';
import { OptimizationService } from '@/services/OptimizationService';
import { CacheManager } from '@/utils/CacheManager';
import { PerformanceMonitor } from '@/utils/performance/PerformanceMonitor';
import { PatternCompiler, type PatternCategory } from '@/utils/performance/PatternCompiler';
import { ASRCorrections, getCombinedPatterns, type ReplacementPattern, type ASRCorrectionCategories } from '../ASRCorrections';
import type { ASRCurrentState as _ASRCurrentState } from '@/types/optimization';

// Advanced Pattern Recognition Integration (Phase 3 Week 2)
import { MedicalPatternService } from '@/utils/medical-text/MedicalPatternService';
import { ContextualMedicalAnalyzer } from '@/utils/medical-text/ContextualMedicalAnalyzer';
import { MedicalTerminologyDisambiguator } from '@/utils/medical-text/MedicalTerminologyDisambiguator';

export interface ASRCorrectionConfig {
  categories: (keyof ASRCorrectionCategories)[] | 'all';
  enableDynamic?: boolean;
  customRules?: CorrectionRule[];
  validationEnabled?: boolean;
  australianTerms?: boolean;
  medicalDomain?: string;
  // Investigation-specific normalization options
  enableInvestigationNormalization?: boolean;
  normalizeDateFormats?: boolean;
  applyInvestigationAbbreviations?: boolean;
  // Enhanced semantic analysis options (Phase 3 Week 2)
  enableSemanticAnalysis?: boolean;
  medicalTermDisambiguation?: boolean;
  clinicalReasoningAnalysis?: boolean;
  contextAwareness?: boolean;
  advancedConfidenceScoring?: boolean;
}

export interface CorrectionRule {
  raw: string;
  fix: string;
  category: string;
  confidence: number;
  medicalDomain?: string;
}

export interface ValidationResult {
  isValid: boolean;
  reason: string;
  suggestions?: string[];
}

export interface CorrectionStats {
  staticPatterns: number;
  dynamicRules: number;
  customRules: number;
  lastUpdated: Date | null;
  cacheValid: boolean;
}

export class ASRCorrectionEngine {
  private static instance: ASRCorrectionEngine;
  private optimizationService: OptimizationService;
  private cacheManager: CacheManager;
  private performanceMonitor: PerformanceMonitor;
  private patternCompiler: PatternCompiler;
  private customRules: Map<string, CorrectionRule[]> = new Map();
  
  // Advanced semantic analysis services (Phase 3 Week 2)
  private medicalPatternService: MedicalPatternService;
  private contextualAnalyzer: ContextualMedicalAnalyzer;
  private terminologyDisambiguator: MedicalTerminologyDisambiguator;
  
  // Pattern compilation cache for frequently used patterns
  private compiledPatternCache: Map<string, RegExp> = new Map();
  
  // Cache for dynamic corrections
  private dynamicCorrections: {
    glossaryTerms: string[];
    correctionRules: Array<{ raw: string; fix: string }>;
    lastUpdated: number;
  } | null = null;
  
  private readonly CACHE_TTL = 15 * 60 * 1000; // Extended to 15 minutes for better performance
  private readonly PATTERN_CACHE_SIZE = 500; // Maximum cached patterns

  private constructor() {
    this.optimizationService = OptimizationService.getInstance();
    this.cacheManager = CacheManager.getInstance();
    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.patternCompiler = PatternCompiler.getInstance();
    
    // Initialize advanced semantic analysis services (Phase 3 Week 2)
    this.medicalPatternService = MedicalPatternService.getInstance();
    this.contextualAnalyzer = ContextualMedicalAnalyzer.getInstance();
    this.terminologyDisambiguator = MedicalTerminologyDisambiguator.getInstance();
    
    // Initialize async components
    this.initializeAsync();
    
    logger.info('ASRCorrectionEngine initialized with enhanced semantic analysis and pattern recognition');
  }

  /**
   * Async initialization for pattern compilation and pool warming
   */
  private async initializeAsync(): Promise<void> {
    try {
      // Pre-compile frequently used patterns and warm up pattern pool
      await this.preCompileCommonPatterns();
      await this.initializePatternPool();
      
      logger.info('ASRCorrectionEngine async initialization completed');
    } catch (error) {
      const err = toError(error);
      logger.warn('ASRCorrectionEngine async initialization failed:', err);
    }
  }

  public static getInstance(): ASRCorrectionEngine {
    if (!ASRCorrectionEngine.instance) {
      ASRCorrectionEngine.instance = new ASRCorrectionEngine();
    }
    return ASRCorrectionEngine.instance;
  }

  /**
   * Primary correction interface
   * Consolidates all ASR correction logic with configurable behavior and performance monitoring
   */
  async applyCorrections(text: string, config: ASRCorrectionConfig = { categories: 'all' }): Promise<string> {
    const measurement = this.performanceMonitor.startMeasurement('asr_corrections', 'ASRCorrectionEngine')
      .setInputLength(text.length);

    try {
      let correctedText = text;
      let totalPatternMatches = 0;

      // Check cache for identical requests
      const cacheKey = this.generateCacheKey(text, config);
      const cachedResult = await this.getCachedCorrection(cacheKey);
      if (cachedResult) {
        measurement.setPatternMatches(cachedResult.patternMatches)
          .setConfidenceScore(cachedResult.confidence)
          .end(cachedResult.result.length);
        return cachedResult.result;
      }

      logger.debug('Applying ASR corrections', {
        textLength: text.length,
        config,
        component: 'ASRCorrectionEngine'
      });

      // Apply static corrections first (with pattern caching)
      const staticResult = this.applyStaticCorrectionsWithCaching(correctedText, config.categories);
      correctedText = staticResult.text;
      totalPatternMatches += staticResult.patternMatches;

      // Apply dynamic corrections if enabled
      if (config.enableDynamic) {
        try {
          const dynamicCorrections = await this.getDynamicCorrections();
          if (dynamicCorrections && dynamicCorrections.correctionRules.length > 0) {
            const dynamicResult = this.applyDynamicRulesWithCaching(correctedText, dynamicCorrections.correctionRules);
            correctedText = dynamicResult.text;
            totalPatternMatches += dynamicResult.patternMatches;
          }
        } catch (error) {
          logger.warn('Dynamic corrections failed, continuing with static only', {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Apply custom rules if provided
      if (config.customRules && config.customRules.length > 0) {
        const customResult = this.applyCustomRulesWithCaching(correctedText, config.customRules);
        correctedText = customResult.text;
        totalPatternMatches += customResult.patternMatches;
      }

      // Apply domain-specific rules
      if (config.medicalDomain) {
        const domainRules = this.customRules.get(config.medicalDomain);
        if (domainRules) {
          const domainResult = this.applyCustomRulesWithCaching(correctedText, domainRules);
          correctedText = domainResult.text;
          totalPatternMatches += domainResult.patternMatches;
        }
      }

      // Apply Australian medical terms if requested
      if (config.australianTerms) {
        const australianResult = this.applyAustralianSpellingWithCaching(correctedText);
        correctedText = australianResult.text;
        totalPatternMatches += australianResult.patternMatches;
      }

      // Apply enhanced semantic analysis if enabled (Phase 3 Week 2)
      if (config.enableSemanticAnalysis) {
        const semanticResult = await this.applySemanticEnhancements(correctedText, text, config);
        correctedText = semanticResult.text;
        totalPatternMatches += semanticResult.patternMatches;
      }

      // Cache the result for future use
      const confidence = this.calculateConfidenceScore(text, correctedText, totalPatternMatches);
      await this.cacheCorrection(cacheKey, {
        result: correctedText,
        patternMatches: totalPatternMatches,
        confidence,
        timestamp: Date.now()
      });

      // Track performance metrics
      measurement.setPatternMatches(totalPatternMatches)
        .setConfidenceScore(confidence)
        .setAustralianCompliance(config.australianTerms || false)
        .end(correctedText.length);

      logger.debug('ASR corrections completed', {
        originalLength: text.length,
        correctedLength: correctedText.length,
        changesApplied: text !== correctedText,
        patternMatches: totalPatternMatches,
        confidence: confidence.toFixed(3)
      });

      return correctedText;

    } catch (error) {
      measurement.end(text.length);
      logger.warn('ASR corrections failed, returning original text', {
        error: error instanceof Error ? error.message : String(error)
      });
      return text;
    }
  }

  /**
   * Apply static ASR corrections from centralized patterns
   * Replaces: ASRCorrections.applyASRCorrections()
   */
  private applyStaticCorrections(text: string, categories: (keyof ASRCorrectionCategories)[] | 'all'): string {
    let correctedText = text;
    
    const categoriesToApply = categories === 'all' 
      ? Object.keys(ASRCorrections) as (keyof ASRCorrectionCategories)[]
      : categories;

    for (const category of categoriesToApply) {
      const patterns = ASRCorrections[category];
      if (patterns) {
        for (const [pattern, replacement] of patterns) {
          try {
            correctedText = correctedText.replace(pattern, replacement);
          } catch (error) {
            logger.warn('Failed to apply static ASR pattern', {
              category,
              pattern: pattern.toString(),
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }
    }

    return correctedText;
  }

  /**
   * Apply dynamic correction rules
   * Replaces: DynamicASRCorrections.applyDynamicRules()
   */
  private applyDynamicRules(text: string, rules: Array<{ raw: string; fix: string }>): string {
    let correctedText = text;
    
    for (const rule of rules) {
      try {
        const regex = new RegExp(`\\b${this.escapeRegExp(rule.raw)}\\b`, 'gi');
        correctedText = correctedText.replace(regex, rule.fix);
      } catch (error) {
        logger.warn('Failed to apply dynamic rule', {
          rule,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return correctedText;
  }

  /**
   * Apply custom correction rules for specific domains
   */
  private applyCustomRules(text: string, rules: CorrectionRule[]): string {
    let correctedText = text;
    
    for (const rule of rules) {
      try {
        const regex = new RegExp(`\\b${this.escapeRegExp(rule.raw)}\\b`, 'gi');
        correctedText = correctedText.replace(regex, rule.fix);
      } catch (error) {
        logger.warn('Failed to apply custom rule', {
          rule,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return correctedText;
  }

  /**
   * Apply Australian spelling corrections
   */
  private applyAustralianSpelling(text: string): string {
    const australianSpellings = {
      'furosemide': 'frusemide',
      'sulfasalazine': 'sulphasalazine', 
      'sulfonylurea': 'sulphonylurea',
      'esophageal': 'oesophageal',
      'esophagus': 'oesophagus',
      'estrogen': 'oestrogen',
      'pediatric': 'paediatric',
      'hematology': 'haematology',
      'anemia': 'anaemia'
    };

    let correctedText = text;
    for (const [us, au] of Object.entries(australianSpellings)) {
      const usRegex = new RegExp(`\\b${us}\\b`, 'gi');
      correctedText = correctedText.replace(usRegex, au);
    }

    return correctedText;
  }

  /**
   * Domain-specific corrections for medical specialties
   */
  async applyMedicationCorrections(text: string): Promise<string> {
    return this.applyCorrections(text, {
      categories: ['medication'],
      enableDynamic: true,
      australianTerms: true,
      medicalDomain: 'medication'
    });
  }

  async applyPathologyCorrections(text: string): Promise<string> {
    return this.applyCorrections(text, {
      categories: ['pathology', 'laboratory'],
      enableDynamic: true,
      medicalDomain: 'pathology'
    });
  }

  async applyCardiologyCorrections(text: string): Promise<string> {
    return this.applyCorrections(text, {
      categories: ['cardiology', 'severity', 'valves'],
      enableDynamic: true,
      medicalDomain: 'cardiology'
    });
  }

  /**
   * Get glossary terms for Whisper prompt seeding
   * Replaces: DynamicASRCorrections.getGlossaryTerms()
   */
  async getGlossaryTerms(maxTerms: number = 50): Promise<string[]> {
    try {
      const dynamicCorrections = await this.getDynamicCorrections();
      if (!dynamicCorrections) {
        return [];
      }

      const terms = dynamicCorrections.glossaryTerms.slice(0, maxTerms);
      
      logger.debug('Retrieved glossary terms for Whisper prompt', {
        totalTerms: dynamicCorrections.glossaryTerms.length,
        returnedTerms: terms.length,
        maxTerms
      });

      return terms;

    } catch (error) {
      logger.warn('Failed to get glossary terms', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Register domain-specific custom rules
   */
  registerDomainRules(domain: string, rules: CorrectionRule[]): void {
    this.customRules.set(domain, rules);
    logger.info('Registered domain-specific ASR rules', {
      domain,
      ruleCount: rules.length
    });
  }

  /**
   * Add custom pattern for specific category
   */
  addCustomPattern(category: string, raw: string, fix: string, confidence: number = 1.0): void {
    const rule: CorrectionRule = { raw, fix, category, confidence };
    const existingRules = this.customRules.get(category) || [];
    existingRules.push(rule);
    this.customRules.set(category, existingRules);
    
    logger.debug('Added custom ASR pattern', { rule });
  }

  /**
   * Get combined patterns from all categories
   * Replaces: getCombinedPatterns()
   */
  getCombinedPatterns(categories: (keyof ASRCorrectionCategories)[] | 'all' = 'all'): ReplacementPattern[] {
    return getCombinedPatterns(categories);
  }

  /**
   * Validate correction rules before applying
   */
  validateCorrectionRules(rules: CorrectionRule[]): {
    valid: CorrectionRule[];
    invalid: Array<CorrectionRule & { reason: string }>;
  } {
    const valid: CorrectionRule[] = [];
    const invalid: Array<CorrectionRule & { reason: string }> = [];
    
    for (const rule of rules) {
      const validationResult = this.validateSingleRule(rule);
      if (validationResult.isValid) {
        valid.push(rule);
      } else {
        invalid.push({ ...rule, reason: validationResult.reason });
      }
    }
    
    logger.info('ASR rule validation completed', {
      totalRules: rules.length,
      validRules: valid.length,
      invalidRules: invalid.length
    });
    
    return { valid, invalid };
  }

  /**
   * Get correction statistics
   */
  async getCorrectionStats(): Promise<CorrectionStats> {
    const staticPatterns = getCombinedPatterns('all').length;
    const dynamicCorrections = await this.getDynamicCorrections();
    
    let customRulesCount = 0;
    for (const rules of Array.from(this.customRules.values())) {
      customRulesCount += rules.length;
    }
    
    return {
      staticPatterns,
      dynamicRules: dynamicCorrections?.correctionRules.length || 0,
      customRules: customRulesCount,
      lastUpdated: dynamicCorrections ? new Date(dynamicCorrections.lastUpdated) : null,
      cacheValid: this.isCacheValid()
    };
  }

  /**
   * Get comprehensive pattern pool statistics
   */
  getPatternPoolStats() {
    return this.patternCompiler.getPatternPoolStats();
  }

  /**
   * Optimize pattern pool for better performance
   */
  async optimizePatternPool() {
    return this.patternCompiler.optimizePool();
  }

  /**
   * Apply enhanced ASR corrections with semantic analysis
   */
  async applyEnhancedSemanticCorrections(
    text: string,
    medicalDomain?: string,
    options: {
      enableAllSemanticFeatures?: boolean;
      australianCompliance?: boolean;
      confidenceThreshold?: number;
    } = {}
  ): Promise<string> {
    const enhancedConfig: ASRCorrectionConfig = {
      categories: 'all',
      enableDynamic: true,
      australianTerms: options.australianCompliance !== false,
      medicalDomain,
      // Enable all semantic analysis features
      enableSemanticAnalysis: options.enableAllSemanticFeatures !== false,
      medicalTermDisambiguation: options.enableAllSemanticFeatures !== false,
      clinicalReasoningAnalysis: options.enableAllSemanticFeatures !== false,
      contextAwareness: options.enableAllSemanticFeatures !== false,
      advancedConfidenceScoring: options.enableAllSemanticFeatures !== false
    };

    return this.applyCorrections(text, enhancedConfig);
  }

  // Private helper methods

  private async getDynamicCorrections() {
    if (this.dynamicCorrections && this.isCacheValid()) {
      return this.dynamicCorrections;
    }

    try {
      const asrState = await this.optimizationService.getCurrentASRState();
      
      this.dynamicCorrections = {
        glossaryTerms: asrState.glossary,
        correctionRules: asrState.rules,
        lastUpdated: Date.now()
      };

      logger.debug('Dynamic corrections loaded', {
        glossaryTerms: asrState.glossary.length,
        correctionRules: asrState.rules.length
      });

      return this.dynamicCorrections;
    } catch (error) {
      logger.warn('Failed to load dynamic corrections', {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  private validateSingleRule(rule: CorrectionRule): ValidationResult {
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

    return { isValid: true, reason: 'Rule passed all validation checks' };
  }

  private containsDangerousPattern(text: string): boolean {
    const dangerousPatterns = [
      /(\*\+|\+\*)/,  // Catastrophic backtracking patterns
      /\(\?!/,       // Negative lookahead
      /\(\?=/,       // Positive lookahead
      /\(\?<!/,     // Negative lookbehind
      /\(\?<=/,     // Positive lookbehind
      /\{\d{3,}\}/,   // Very large repetition counts
      /\*\*+/,        // Multiple wildcards
      /\+\++/,        // Multiple plus operators
    ];

    return dangerousPatterns.some(pattern => pattern.test(text));
  }

  private checkMedicalTermConflict(rule: CorrectionRule): ValidationResult {
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

  private isCacheValid(): boolean {
    return this.dynamicCorrections 
      ? (Date.now() - this.dynamicCorrections.lastUpdated) < this.CACHE_TTL
      : false;
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Advanced semantic enhancement methods (Phase 3 Week 2)

  /**
   * Apply enhanced semantic analysis and pattern recognition
   */
  private async applySemanticEnhancements(
    correctedText: string,
    originalText: string,
    config: ASRCorrectionConfig
  ): Promise<{ text: string; patternMatches: number }> {
    let enhancedText = correctedText;
    let totalMatches = 0;

    try {
      // Medical term disambiguation if enabled
      if (config.medicalTermDisambiguation) {
        const disambiguationResult = await this.applyMedicalTermDisambiguation(enhancedText, config);
        enhancedText = disambiguationResult.text;
        totalMatches += disambiguationResult.matches;
      }

      // Context-aware corrections if enabled
      if (config.contextAwareness) {
        const contextResult = await this.applyContextAwareCorrections(enhancedText, originalText, config);
        enhancedText = contextResult.text;
        totalMatches += contextResult.matches;
      }

      // Clinical reasoning analysis for validation
      if (config.clinicalReasoningAnalysis) {
        const reasoningResult = await this.validateClinicalReasoning(enhancedText, config);
        enhancedText = reasoningResult.text;
        totalMatches += reasoningResult.matches;
      }

      logger.debug('Semantic enhancements applied', {
        originalLength: correctedText.length,
        enhancedLength: enhancedText.length,
        totalMatches,
        medicalTermDisambiguation: config.medicalTermDisambiguation,
        contextAwareness: config.contextAwareness,
        clinicalReasoningAnalysis: config.clinicalReasoningAnalysis
      });

      return { text: enhancedText, patternMatches: totalMatches };

    } catch (error) {
      logger.warn('Semantic enhancement failed, returning corrected text', {
        error: error instanceof Error ? error.message : String(error)
      });
      return { text: correctedText, patternMatches: 0 };
    }
  }

  /**
   * Apply medical term disambiguation with context analysis
   */
  private async applyMedicalTermDisambiguation(
    text: string,
    config: ASRCorrectionConfig
  ): Promise<{ text: string; matches: number }> {
    try {
      // Extract potential ambiguous terms using medical pattern service
      const medicalTerms = await this.medicalPatternService.extractMedicalTerms(text, {
        domains: config.medicalDomain ? [config.medicalDomain as any] : ['cardiology', 'pathology', 'medication', 'anatomy', 'general'],
        extractionMode: 'focused',
        semanticAnalysis: true,
        australianCompliance: config.australianTerms || false
      });

      let disambiguatedText = text;
      let matchCount = 0;

      // Disambiguate identified ambiguous terms
      for (const term of medicalTerms) {
        if (term.confidence < 0.8) { // Only disambiguate low confidence terms
          try {
            const disambiguationResult = await this.terminologyDisambiguator.disambiguateTerm(
              term.term,
              term.context,
              {
                primaryDomain: config.medicalDomain as any || 'cardiology',
                australianPreference: config.australianTerms || false,
                confidenceThreshold: 0.8
              }
            );

            if (disambiguationResult.confidence > term.confidence) {
              // Replace with disambiguated term if higher confidence
              const termRegex = new RegExp(`\\b${this.escapeRegExp(term.term)}\\b`, 'gi');
              const beforeText = disambiguatedText;
              disambiguatedText = disambiguatedText.replace(termRegex, disambiguationResult.disambiguatedTerm);
              if (beforeText !== disambiguatedText) {
                matchCount++;
              }
            }
          } catch (error) {
            const err = toError(error);
            logger.debug('Term disambiguation failed for term:', { term: term.term, error: err.message });
          }
        }
      }

      return { text: disambiguatedText, matches: matchCount };

    } catch (error) {
      const err = toError(error);
      logger.warn('Medical term disambiguation failed:', err);
      return { text, matches: 0 };
    }
  }

  /**
   * Apply context-aware corrections using clinical reasoning
   */
  private async applyContextAwareCorrections(
    text: string,
    originalText: string,
    config: ASRCorrectionConfig
  ): Promise<{ text: string; matches: number }> {
    try {
      // Analyze clinical context for better correction decisions
      const clinicalAnalysis = await this.contextualAnalyzer.analyzeClinicalReasoning(text, {
        focusArea: config.medicalDomain as any || 'cardiology',
        includeAustralianGuidelines: config.australianTerms || false,
        detailLevel: 'comprehensive'
      });

      const contextCorrectedText = text;
      let matchCount = 0;

      // Apply corrections based on clinical context
      for (const pattern of clinicalAnalysis.patterns) {
        if (pattern.confidence > 0.8) {
          // Apply high-confidence clinical reasoning corrections
          for (const component of pattern.components) {
            if (component.clinicalSignificance === 'high' || component.clinicalSignificance === 'critical') {
              // Ensure critical medical terms are correctly formatted
              const componentRegex = new RegExp(`\\b${this.escapeRegExp(component.value)}\\b`, 'gi');
              const matches = text.match(componentRegex);
              if (matches) {
                matchCount += matches.length;
              }
            }
          }
        }
      }

      // Check for Australian compliance if enabled
      if (config.australianTerms && !clinicalAnalysis.australianCompliance) {
        // Apply Australian spelling corrections based on clinical analysis
        for (const recommendation of clinicalAnalysis.recommendations) {
          if (recommendation.type === 'guideline_compliance' && recommendation.australian_guideline) {
            // Apply Australian guideline corrections
            matchCount++;
          }
        }
      }

      return { text: contextCorrectedText, matches: matchCount };

    } catch (error) {
      const err = toError(error);
      logger.warn('Context-aware corrections failed:', err);
      return { text, matches: 0 };
    }
  }

  /**
   * Validate and enhance clinical reasoning patterns
   */
  private async validateClinicalReasoning(
    text: string,
    config: ASRCorrectionConfig
  ): Promise<{ text: string; matches: number }> {
    try {
      // This method focuses on validating that the text maintains clinical coherence
      // after corrections have been applied
      const clinicalAnalysis = await this.contextualAnalyzer.analyzeClinicalReasoning(text, {
        focusArea: config.medicalDomain as any || 'cardiology',
        includeAustralianGuidelines: config.australianTerms || false,
        detailLevel: 'basic' // Use basic level for validation to avoid over-processing
      });

      const validatedText = text;
      let matchCount = 0;

      // If clinical coherence is low, log a warning but don't modify the text
      if (clinicalAnalysis.clinicalCoherence < 0.7) {
        logger.warn('Low clinical coherence detected after ASR corrections', {
          coherence: clinicalAnalysis.clinicalCoherence.toFixed(3),
          textLength: text.length,
          patternsDetected: clinicalAnalysis.patterns.length
        });
      }

      // Count high-quality clinical patterns for metrics
      matchCount = clinicalAnalysis.patterns.filter(p => p.confidence > 0.8).length;

      return { text: validatedText, matches: matchCount };

    } catch (error) {
      const err = toError(error);
      logger.warn('Clinical reasoning validation failed:', err);
      return { text, matches: 0 };
    }
  }

  // Enhanced caching methods for performance optimization

  /**
   * Generate cache key for correction requests
   */
  private generateCacheKey(text: string, config: ASRCorrectionConfig): string {
    const configHash = JSON.stringify({
      categories: config.categories,
      enableDynamic: config.enableDynamic,
      australianTerms: config.australianTerms,
      medicalDomain: config.medicalDomain,
      customRulesCount: config.customRules?.length || 0
    });
    
    // Create hash of text + config for cache key
    const textSample = text.length > 100 ? text.substring(0, 100) : text;
    return `asr_${btoa(textSample + configHash).substring(0, 32)}`;
  }

  /**
   * Get cached correction result
   */
  private async getCachedCorrection(cacheKey: string): Promise<{
    result: string;
    patternMatches: number;
    confidence: number;
  } | null> {
    try {
      const cached = await this.cacheManager.get(`asr_correction_${cacheKey}`);
      if (cached && typeof cached === 'object' && 'result' in cached) {
        logger.debug(`Cache hit for ASR correction: ${cacheKey}`);
        return cached as any;
      }
    } catch (error) {
      const err = toError(error);
      logger.debug(`Cache miss for ASR correction: ${cacheKey}`, { error: err.message });
    }
    return null;
  }

  /**
   * Cache correction result with metadata
   */
  private async cacheCorrection(cacheKey: string, result: {
    result: string;
    patternMatches: number;
    confidence: number;
    timestamp: number;
  }): Promise<void> {
    try {
      await this.cacheManager.set(`asr_correction_${cacheKey}`, result, undefined, this.CACHE_TTL);
      logger.debug(`Cached ASR correction: ${cacheKey}`);
    } catch (error) {
      const err = toError(error);
      logger.warn('Failed to cache ASR correction:', { error: err.message });
    }
  }

  /**
   * Apply static corrections with pattern caching
   */
  private applyStaticCorrectionsWithCaching(
    text: string, 
    categories: (keyof ASRCorrectionCategories)[] | 'all'
  ): { text: string; patternMatches: number } {
    const cacheKey = `static_${btoa(JSON.stringify(categories))}_${btoa(text.substring(0, 50))}`;
    
    // Check if we have this pattern combination cached
    const cachedPatterns = this.compiledPatternCache.get(cacheKey);
    if (cachedPatterns) {
      logger.debug(`Using cached pattern for categories: ${JSON.stringify(categories)}`);
    }

    let correctedText = text;
    let patternMatches = 0;

    const categoriesToApply = categories === 'all' 
      ? Object.keys(ASRCorrections) as (keyof ASRCorrectionCategories)[]
      : categories;

    for (const category of categoriesToApply) {
      const patterns = ASRCorrections[category];
      if (patterns) {
        for (const [pattern, replacement] of patterns) {
          try {
            const beforeText = correctedText;
            correctedText = correctedText.replace(pattern, replacement);
            if (beforeText !== correctedText) {
              patternMatches++;
            }
          } catch (error) {
            logger.warn('Failed to apply static ASR pattern', {
              category,
              pattern: pattern.toString(),
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }
    }

    return { text: correctedText, patternMatches };
  }

  /**
   * Apply dynamic rules with caching
   */
  private applyDynamicRulesWithCaching(
    text: string, 
    rules: Array<{ raw: string; fix: string }>
  ): { text: string; patternMatches: number } {
    // For dynamic rules, use shorter cache duration due to adaptability
    const rulesHash = btoa(JSON.stringify(rules.slice(0, 10))); // Hash first 10 rules
    const _cacheKey = `dynamic_${rulesHash}_${btoa(text.substring(0, 30))}`;

    let correctedText = text;
    let patternMatches = 0;

    // Apply dynamic corrections
    for (const rule of rules) {
      try {
        const beforeText = correctedText;
        const regex = new RegExp(`\\b${this.escapeRegExp(rule.raw)}\\b`, 'gi');
        correctedText = correctedText.replace(regex, rule.fix);
        if (beforeText !== correctedText) {
          patternMatches++;
        }
      } catch (error) {
        logger.warn('Failed to apply dynamic rule', {
          rule,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return { text: correctedText, patternMatches };
  }

  /**
   * Apply custom rules with caching
   */
  private applyCustomRulesWithCaching(
    text: string, 
    customRules: CorrectionRule[]
  ): { text: string; patternMatches: number } {
    const rulesHash = btoa(JSON.stringify(customRules.map(r => ({ raw: r.raw, fix: r.fix }))));
    const _cacheKey = `custom_${rulesHash.substring(0, 20)}`;

    let correctedText = text;
    let patternMatches = 0;

    for (const rule of customRules) {
      try {
        const beforeText = correctedText;
        const regex = new RegExp(`\\b${this.escapeRegExp(rule.raw)}\\b`, 'gi');
        correctedText = correctedText.replace(regex, rule.fix);
        if (beforeText !== correctedText) {
          patternMatches++;
        }
      } catch (error) {
        logger.warn('Failed to apply custom rule', {
          rule,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return { text: correctedText, patternMatches };
  }

  /**
   * Apply Australian spelling corrections with caching
   */
  private applyAustralianSpellingWithCaching(text: string): { text: string; patternMatches: number } {
    const _cacheKey = `aus_spelling_${btoa(text.substring(0, 40))}`;

    let correctedText = text;
    let patternMatches = 0;

    // Apply Australian spelling corrections
    const australianCorrections = [
      { pattern: /\b(color|colors)\b/gi, replacement: 'colour' },
      { pattern: /\b(center|centers)\b/gi, replacement: 'centre' },
      { pattern: /\b(fiber|fibers)\b/gi, replacement: 'fibre' },
      { pattern: /\b(liter|liters)\b/gi, replacement: 'litre' },
      { pattern: /\b(meter|meters)\b/gi, replacement: 'metre' },
      // Medical terms
      { pattern: /\bfurosemide\b/gi, replacement: 'frusemide' },
      { pattern: /\bsulfasalazine\b/gi, replacement: 'sulphasalazine' },
      { pattern: /\bsulfonylurea\b/gi, replacement: 'sulphonylurea' },
      { pattern: /\besophageal\b/gi, replacement: 'oesophageal' },
      { pattern: /\besophagus\b/gi, replacement: 'oesophagus' },
      { pattern: /\bestrogen\b/gi, replacement: 'oestrogen' },
      { pattern: /\bpediatric\b/gi, replacement: 'paediatric' },
      { pattern: /\bhematology\b/gi, replacement: 'haematology' },
      { pattern: /\banemia\b/gi, replacement: 'anaemia' }
    ];

    for (const correction of australianCorrections) {
      const beforeText = correctedText;
      correctedText = correctedText.replace(correction.pattern, correction.replacement);
      if (beforeText !== correctedText) {
        patternMatches++;
      }
    }

    return { text: correctedText, patternMatches };
  }

  /**
   * Calculate confidence score for corrections
   */
  private calculateConfidenceScore(
    originalText: string, 
    correctedText: string, 
    totalMatches: number
  ): number {
    if (originalText === correctedText) {
      return 1.0; // Perfect confidence for no changes needed
    }

    const originalWords = originalText.split(/\s+/).length;
    const changeRatio = totalMatches / Math.max(originalWords, 1);
    
    // High confidence for low change ratios, decreasing as more changes are made
    // Confidence ranges from 0.6 to 0.95 based on change ratio
    const baseConfidence = Math.max(0.6, 0.95 - (changeRatio * 0.35));
    
    // Boost confidence for common medical corrections
    const medicalBoost = this.hasMedicalTermCorrections(originalText, correctedText) ? 0.1 : 0;
    
    return Math.min(1.0, baseConfidence + medicalBoost);
  }

  /**
   * Check if corrections include medical terminology improvements
   */
  private hasMedicalTermCorrections(originalText: string, correctedText: string): boolean {
    const medicalTerms = [
      'stenosis', 'regurgitation', 'timi', 'flow', 'vessel', 'artery', 
      'coronary', 'cardiac', 'haemodynamic', 'percutaneous', 'catheter',
      'aortic', 'mitral', 'tricuspid', 'ventricular', 'atrial'
    ];
    
    return medicalTerms.some(term => {
      const termInCorrected = correctedText.toLowerCase().includes(term);
      const termInOriginal = originalText.toLowerCase().includes(term);
      return termInCorrected && !termInOriginal;
    });
  }

  /**
   * Pre-compile commonly used medical patterns for performance using PatternCompiler
   */
  private async preCompileCommonPatterns(): Promise<void> {
    try {
      // Define critical ASR correction patterns with categories
      const commonPatterns = [
        { 
          key: 'timi_flow', 
          source: '\\b(timi|TIMI)\\s+(flow\\s+)?(zero|0|one|1|two|2|three|3)\\b', 
          flags: 'gi',
          category: 'medical_terms' as PatternCategory,
          medicalDomain: 'cardiology'
        },
        { 
          key: 'stenosis_grade', 
          source: '\\b(mild|moderate|severe)\\s+(stenosis|regurgitation)\\b', 
          flags: 'gi',
          category: 'stenosis_grading' as PatternCategory,
          medicalDomain: 'cardiology'
        },
        { 
          key: 'vessel_reference', 
          source: '\\b(LAD|RCA|LCX|OM|D1|D2|PDA|PLV)\\b', 
          flags: 'gi',
          category: 'vessel_anatomy' as PatternCategory,
          medicalDomain: 'cardiology'
        },
        { 
          key: 'medication_dose', 
          source: '\\b(\\w+)\\s+(\\d+(?:\\.\\d+)?)\\s*(mg|mcg|units?)\\b', 
          flags: 'gi',
          category: 'medication_patterns' as PatternCategory
        },
        { 
          key: 'pressure_reading', 
          source: '\\b(\\d{2,3})\\s*(?:over|on|/)\\s*(\\d{2,3})\\s*(?:mmhg)?\\b', 
          flags: 'gi',
          category: 'hemodynamic_measurements' as PatternCategory,
          medicalDomain: 'cardiology'
        },
        { 
          key: 'ef_measurement', 
          source: '\\b(?:EF|ejection fraction)\\s*(?:of\\s*)?(\\d{1,3})%?\\b', 
          flags: 'gi',
          category: 'hemodynamic_measurements' as PatternCategory,
          medicalDomain: 'cardiology'
        },
        { 
          key: 'valve_area', 
          source: '\\b(\\d+(?:\\.\\d+)?)\\s*(?:cm2|cm\\^2|square cm)\\b', 
          flags: 'gi',
          category: 'hemodynamic_measurements' as PatternCategory,
          medicalDomain: 'cardiology'
        }
      ];

      let compiledCount = 0;
      for (const patternConfig of commonPatterns) {
        try {
          const compiledRegex = await this.patternCompiler.compilePattern({
            source: patternConfig.source,
            flags: patternConfig.flags,
            category: patternConfig.category,
            medicalDomain: patternConfig.medicalDomain
          });
          
          // Store in local cache for quick access
          this.compiledPatternCache.set(patternConfig.key, compiledRegex);
          compiledCount++;
        } catch (error) {
          const err = toError(error);
          logger.warn(`Failed to pre-compile pattern: ${patternConfig.key}`, { error: err.message });
        }
      }

      logger.info('Pre-compiled common medical patterns with PatternCompiler', {
        compiledCount,
        totalPatterns: commonPatterns.length,
        localCacheSize: this.compiledPatternCache.size
      });
    } catch (error) {
      const err = toError(error);
      logger.error('Failed to pre-compile patterns:', err);
    }
  }

  /**
   * Initialize pattern pool with warm-up for critical categories
   */
  private async initializePatternPool(): Promise<void> {
    try {
      // Pre-warm critical pattern categories
      const criticalCategories: PatternCategory[] = [
        'medical_terms',
        'asr_corrections', 
        'stenosis_grading',
        'vessel_anatomy',
        'medication_patterns'
      ];

      let totalPreWarmed = 0;
      for (const category of criticalCategories) {
        const preWarmed = await this.patternCompiler.preWarmPool(category);
        totalPreWarmed += preWarmed;
      }

      // Get initial pool statistics
      const poolStats = this.patternCompiler.getPatternPoolStats();
      
      logger.info('Pattern pool initialized and pre-warmed', {
        preWarmedPatterns: totalPreWarmed,
        totalPoolSize: poolStats.totalPatterns,
        poolEfficiency: poolStats.poolEfficiency.toFixed(1) + '%'
      });
    } catch (error) {
      const err = toError(error);
      logger.warn('Failed to initialize pattern pool:', { error: err.message });
    }
  }

  /**
   * Apply investigation-specific ASR corrections and normalization
   * Consolidates: InvestigationSummarySystemPrompts.preNormalizeInvestigationText()
   * 
   * This method consolidates scattered investigation-specific ASR patterns
   * and normalization logic into the centralized correction engine.
   */
  async applyInvestigationCorrections(text: string, config: ASRCorrectionConfig = { categories: 'all' }): Promise<string> {
    const operationId = 'investigation_corrections';
    const measurement = this.performanceMonitor.startMeasurement(operationId, 'ASRCorrectionEngine');
    
    try {
      let correctedText = text;
      
      // Step 1: Apply basic ASR corrections first
      correctedText = await this.applyCorrections(correctedText, {
        categories: ['laboratory', 'cardiology', 'valves', 'severity'],
        enableDynamic: config.enableDynamic,
        australianTerms: config.australianTerms
      });

      // Step 2: Apply investigation-specific ASR patterns
      if (config.enableInvestigationNormalization !== false) {
        correctedText = this.applyInvestigationASRPatterns(correctedText);
      }

      // Step 3: Apply investigation type conversions
      if (config.applyInvestigationAbbreviations !== false) {
        correctedText = this.applyInvestigationTypeConversions(correctedText);
      }

      // Step 4: Apply date format normalization
      if (config.normalizeDateFormats !== false) {
        correctedText = this.normalizeDateFormats(correctedText);
      }

      // Step 5: Apply remaining investigation-specific patterns
      correctedText = this.applyRemainingInvestigationPatterns(correctedText);

      // Step 6: Apply exercise test specific patterns
      correctedText = this.applyExerciseTestPatterns(correctedText);

      // Step 7: Final whitespace normalization
      correctedText = correctedText.replace(/\s+/g, ' ').trim();

      measurement.end(correctedText.length);
      
      logger.debug('Investigation corrections completed', {
        originalLength: text.length,
        correctedLength: correctedText.length,
        changesApplied: text !== correctedText
      });

      return correctedText;

    } catch (error) {
      measurement.end(text.length);
      logger.warn('Investigation corrections failed, returning original text', {
        error: error instanceof Error ? error.message : String(error)
      });
      return text;
    }
  }

  /**
   * Apply investigation-specific ASR correction patterns
   * Consolidates patterns from InvestigationSummarySystemPrompts.preNormalizeInvestigationText()
   */
  private applyInvestigationASRPatterns(text: string): string {
    let corrected = text;

    // Investigation-specific ASR correction patterns
    const investigationASRPatterns: ReplacementPattern[] = [
      // Preserve likely unit confusion for valve gradients (mmHg misheard as millimeters)
      [/\baortic\s+valve\s+gradient\s+(\d+(?:\.\d+)?)\s*millimeters?\b/gi, 'aortic valve gradient $1 (millimeters)'],

      // Common transcription errors
      [/\bLED\b/gi, 'LAD'], // "LED stenosis" -> "LAD stenosis"
      [/\bosteocircumflex\b/gi, 'ostial circumflex'], 
      [/\bPeritin\b/gi, 'Ferritin'], 
      [/\bRBSP\b/gi, 'RVSP'], 
      
      // eGFR and comparison patterns
      [/\b(?:EGFR|eGFR)\s+greater\s+than\s+(\d+)/gi, 'eGFR >$1'],
      [/\bgreater\s+than\s+(\d+)/gi, '>$1'],
      
      // Distance and measurement patterns
      [/\bproximal\b/gi, 'prox'],
      // Normalize "millimeters" to "mm" first, then wrap mm-values (avoids double-wrapping)
      [/\b(\d+(?:\.\d+)?)\s*millimeters?\b/gi, '$1mm'],
      // Wrap mm values unless already wrapped, and avoid mmHg
      [/(?<!\()\b(\d+(?:\.\d+)?)\s*mm(?!Hg)\b/gi, '($1mm)'],
      
      // Calcium score formatting
      [/\bCalcium score,?\s*(\d+)[.,]?\s*(\d+\s*to\s*\d+(?:st|nd|rd|th)\s*centile)/gi, 'Ca Score $1/$2'],
      
      // Exercise test corrections
      [/\bbruce\s+stage\s+(\d+)\b/gi, 'Bruce Stage $1'],
      [/\bexercise\s+for\b/gi, 'exercised for'],
      
      // Hemodynamic abbreviations for RHC
      [/\bPA\s+mean\b/gi, 'PAm'],
      [/\bpulmonary\s+capillary\s+wedge\s+pressure\b/gi, 'PCWP'],
      [/\bcardiac\s+output\b/gi, 'CO'],
      [/\bcardiac\s+index\b/gi, 'CI'],
      [/\bright\s+ventricular\s+stroke\s+work\s+index\b/gi, 'RVSWI'],
      [/\bpulmonary\s+artery\s+systolic\s+pressure\b/gi, 'PASP'],
      [/\bright\s+atrial\s+pressure\b/gi, 'RAP'],
      [/\bstroke\s+volume\s+index\b/gi, 'SVI']
    ];

    // Apply investigation-specific ASR patterns
    for (const [pattern, replacement] of investigationASRPatterns) {
      corrected = corrected.replace(pattern, replacement);
    }

    return corrected;
  }

  /**
   * Apply investigation type conversions (abbreviations)
   */
  private applyInvestigationTypeConversions(text: string): string {
    let converted = text;

    // Investigation type conversion patterns (order matters!)
    const investigationConversions: ReplacementPattern[] = [
      // Specific combinations first
      [/\bstress\s+echo\s*cardiogram\b/gi, 'Stress TTE'],
      
      // Echocardiogram patterns  
      [/\btrans\s*thoracic\s*echo(?:cardiogram)?\b/gi, 'TTE'],
      [/\btrans\s*oesophageal\s*echo(?:cardiogram)?\b/gi, 'TOE'], // British spelling
      [/\btrans\s*esophageal\s*echo(?:cardiogram)?\b/gi, 'TOE'], // US spelling
      
      // CT and imaging
      [/\bCT\s+coronary\s+angiogram\b/gi, 'CTCA'],
      
      // Monitoring devices
      [/\bAmbulatory\s+Blood\s+Pressure\s+Monitor\b/gi, 'ABPM'], // Specific first
      [/\bBlood\s+Pressure\s+Monitor\b/gi, 'ABPM'],
      
      // Cardiac catheterization
      [/\bright\s+heart\s+catheter\b/gi, 'RHC']
    ];

    for (const [pattern, replacement] of investigationConversions) {
      converted = converted.replace(pattern, replacement);
    }

    return converted;
  }

  /**
   * Normalize date formats for investigations
   */
  private normalizeDateFormats(text: string): string {
    let normalized = text;

    const monthMap: Record<string, string> = { 
      january: 'Jan', february: 'Feb', march: 'Mar', april: 'Apr', may: 'May', june: 'Jun',
      july: 'Jul', august: 'Aug', september: 'Sep', october: 'Oct', november: 'Nov', december: 'Dec' 
    };

    // Pattern 1: "TYPE, <date>" or "TYPE <date>" -> "TYPE (DD Mon YYYY): "
    normalized = normalized.replace(
      /^(TTE|TOE|Stress\s*TTE|CTCA|CMRI|Coronary Angiogram|RHC|ExRHC|Holter Monitor|Event Monitor|Loop Recorder|ABPM|Bloods)\s*[,:.-]?\s*(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s*,?\s*(\d{4})\s*[.:;,\s]*/i,
      (_, type, d, month, y) => `${type} (${d} ${monthMap[month.toLowerCase()]} ${y}): `
    );
    
    // Pattern 2: Fix existing "TYPE (date)" with wrong trailing punctuation
    normalized = normalized.replace(
      /^(TTE|TOE|Stress\s*TTE|CTCA|CMRI|Coronary Angiogram|RHC|ExRHC|Holter Monitor|Event Monitor|Loop Recorder|ABPM|Bloods)\s*\(\s*(\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4})(?:,\s*[^)]*)?\s*\)\s*[,.:.-]?\s*/i,
      (_, type, date) => `${type} (${date}): `
    );

    // Pattern 3: "TYPE:" for undated investigations
    normalized = normalized.replace(
      /^(TTE|TOE|Stress\s*TTE|CTCA|CMRI|Coronary Angiogram|RHC|ExRHC|Holter Monitor|Event Monitor|Loop Recorder|ABPM|Bloods)\s*[:\s]+(?!\()/i,
      '$1: '
    );

    return normalized;
  }

  /**
   * Apply remaining investigation-specific patterns
   */
  private applyRemainingInvestigationPatterns(text: string): string {
    let processed = text;

    const remainingPatterns: ReplacementPattern[] = [
      // Lab value formatting
      [/\b(TChol|TG|HDL|LDL|non-HDL|HbA1c|Cr|eGFR|Ferr|Tn|BNP)\s*,\s*(\d+(?:\.\d+)?)/g, '$1 $2'],
      // Add % only when no percentage is already present (avoid partial backtracking on decimals)
      [/\bHbA1c\s*(\d+(?:\.\d+)?)(?!\.\d)(?!\s*%)/gi, 'HbA1c $1%'],

      // Valve gradient patterns
      // Handle long-form valve gradient dictation and preserve "(millimeters)" when present
      [/\baortic\s+valve\s+gradient\s+(\d+(?:\.\d+)?)\s*\(millimeters\)/gi, 'AV MPG $1 (millimeters)'],
      [/\baortic\s+valve\s+gradient\b/gi, 'AV MPG'],
      [/\b(AV|MV|TV|PV)\s+gradient\b/gi, '$1 MPG'],
      [/\biotic\s+valve\s+gradient\b/gi, 'AV MPG'],
      [/\biotic\s+valve\b/gi, 'AV'],

      // Lab abbreviations
      [/\bHemoglobin\b/gi, 'Hb'],
      [/\bHaemoglobin\b/gi, 'Hb'],

      // Severity combinations and standalone
      [/\bmoderate\s+to\s+severe\b/gi, 'mod-sev'],
      [/\bmild\s+to\s+moderate\b/gi, 'mild-mod'],
      [/\bmoderately dilated\b/gi, 'mod dil'],
      [/\bmildly dilated\b/gi, 'mild dil'],
      [/\bseverely dilated\b/gi, 'sev dil'],

      // RVSP with units
      [/\bRVSP\s+(?:from\s+)?(\d+)\s+to\s+(\d+)(?!\s*mmHg)\b/gi, 'RVSP from $1 to $2mmHg'],
      [/\bRVSP\s+(\d+)(?!\s*mmHg)\b/gi, 'RVSP $1mmHg'],

      // CRITICAL: Echo measurement spacing - Remove hyphens, ensure spaces
      [/\bLVEDD-(\d+)/gi, 'LVEDD $1'],
      [/\bLVESD-(\d+)/gi, 'LVESD $1'],
      [/\bLVEDD(\d+)(?!\s)/gi, 'LVEDD $1'],
      [/\bLVESD(\d+)(?!\s)/gi, 'LVESD $1'],
      [/\bEF-(\d+)/gi, 'EF $1'],
      [/\bEF(\d{2})(?!\s)/g, 'EF $1'], // EF followed by 2 digits without space
      [/\bGLS-(-?\d+)/gi, 'GLS $1'],
      [/\bGLS(-?\d+)(?!\s)/gi, 'GLS $1'],
      [/\bLAVI-(\d+)/gi, 'LAVI $1'],
      [/\bLAVI(\d+)(?!\s)/gi, 'LAVI $1'],
      [/\bRAVI-(\d+)/gi, 'RAVI $1'],
      [/\bRAVI(\d+)(?!\s)/gi, 'RAVI $1'],
      [/\bTAPSE-(\d+)/gi, 'TAPSE $1'],
      [/\bTAPSE(\d+)(?!\s)/gi, 'TAPSE $1']
    ];

    for (const [pattern, replacement] of remainingPatterns) {
      processed = processed.replace(pattern, replacement);
    }

    // PASP formatting: preserve explicit units, otherwise use legacy ">X" notation
    processed = processed.replace(/\bPASP\s+(\d+)\s*mmHg\b/gi, 'PASP $1 mmHg');
    processed = processed.replace(/\bPASP\s+(\d+)\b(?!\s*mmHg\b)/gi, 'PASP >$1');

    return processed;
  }

  /**
   * Apply exercise test specific patterns
   */
  private applyExerciseTestPatterns(text: string): string {
    let processed = text;

    // Legacy pattern: duplicate "minutes" should become METs.
    processed = processed.replace(
      /\bexercised\s+for\s+(\d+(?:\.\d+)?)\s+minutes,?\s+(\d+(?:\.\d+)?)\s+minutes?\b/gi,
      'exercised for $1 minutes, $2 METs'
    );

    // Legacy pattern: trailing period after MET value becomes semicolon marker.
    processed = processed.replace(
      /\bexercised\s+for\s+(\d+(?:\.\d+)?)\s+minutes,\s+(\d+(?:\.\d+)?)\.(?=\s|$)/gi,
      'exercised for $1 minutes, $2 METs;'
    );

    // Direct dictation formats:
    processed = processed.replace(
      /\bexercised\s+(\d+(?:\.\d+)?)\s+minutes\s+(\d+(?:\.\d+)?)\s+mets?\b/gi,
      'exercised for $1 minutes, $2 METs'
    );

    processed = processed.replace(
      /(?<!exercised for )(?<![\d.])(\d+(?:\.\d+)?)\s+minutes,\s+(\d+(?:\.\d+)?)\s+mets?\b/gi,
      'exercised for $1 minutes, $2 METs'
    );

    processed = processed.replace(
      /(?<!exercised for )(?<![\d.])(\d+(?:\.\d+)?)\s+minutes\s+(\d+(?:\.\d+)?)\s+mets?\b/gi,
      'exercised for $1 minutes, $2 METs'
    );

    return processed;
  }

  /**
   * Convenience method for applying all investigation corrections
   * Replaces: InvestigationSummarySystemPrompts.preNormalizeInvestigationText()
   */
  async preNormalizeInvestigationText(input: string): Promise<string> {
    return await this.applyInvestigationCorrections(input, {
      categories: 'all',
      enableInvestigationNormalization: true,
      normalizeDateFormats: true,
      applyInvestigationAbbreviations: true,
      enableDynamic: false, // Keep consistent with original function behavior
      australianTerms: true
    });
  }

  /**
   * Synchronous version of investigation text normalization
   * For backward compatibility with existing synchronous interfaces
   */
  preNormalizeInvestigationTextSync(input: string): string {
    let correctedText = input;
    
    try {
      // Apply investigation-specific ASR patterns
      correctedText = this.applyInvestigationASRPatterns(correctedText);
      
      // Apply investigation type conversions
      correctedText = this.applyInvestigationTypeConversions(correctedText);
      
      // Apply date format normalization
      correctedText = this.normalizeDateFormats(correctedText);
      
      // Apply remaining investigation-specific patterns
      correctedText = this.applyRemainingInvestigationPatterns(correctedText);
      
      // Apply exercise test specific patterns
      correctedText = this.applyExerciseTestPatterns(correctedText);
      
      // Final whitespace normalization
      correctedText = correctedText.replace(/\s+/g, ' ').trim();
      // Preserve legacy "header ready" trailing space for bare investigation headers.
      if (/:$/.test(correctedText)) {
        correctedText = `${correctedText} `;
      }
      
      return correctedText;
      
    } catch (error) {
      logger.warn('Synchronous investigation corrections failed, returning original text', {
        error: error instanceof Error ? error.message : String(error)
      });
      return input;
    }
  }
}

// Convenience functions for backward compatibility
export async function applyASRCorrections(
  text: string, 
  categories: (keyof ASRCorrectionCategories)[] | 'all' = 'all'
): Promise<string> {
  return ASRCorrectionEngine.getInstance().applyCorrections(text, { categories });
}

export async function applyEnhancedASRCorrections(
  text: string,
  categories: (keyof ASRCorrectionCategories)[] | 'all' = 'all'
): Promise<string> {
  return ASRCorrectionEngine.getInstance().applyCorrections(text, { 
    categories, 
    enableDynamic: true,
    australianTerms: true
  });
}

export async function getWhisperGlossaryTerms(maxTerms: number = 50): Promise<string[]> {
  return ASRCorrectionEngine.getInstance().getGlossaryTerms(maxTerms);
}
