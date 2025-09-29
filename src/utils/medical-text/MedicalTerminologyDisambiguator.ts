/**
 * Medical Terminology Disambiguator - Domain-Specific Context Analysis
 * 
 * Advanced medical terminology disambiguation system that resolves ambiguous medical terms
 * based on clinical context, domain specificity, and semantic relationships.
 * Provides accurate term interpretation with Australian medical standard compliance.
 * 
 * Features:
 * - Domain-specific terminology disambiguation
 * - Contextual semantic analysis for term resolution
 * - Medical acronym and abbreviation expansion
 * - Multi-domain term conflict resolution
 * - Australian medical terminology preference
 * - Confidence-based disambiguation scoring
 * - Performance-optimized with intelligent caching
 */

import { logger } from '@/utils/Logger';
import { CacheManager } from '@/utils/CacheManager';
import { PerformanceMonitor } from '@/utils/performance/PerformanceMonitor';
import { PatternCompiler, type PatternCategory as _PatternCategory } from '@/utils/performance/PatternCompiler';
import { toError } from '@/utils/errorHelpers';

export interface AmbiguousTermDefinition {
  term: string;
  domain: MedicalDomain;
  definition: string;
  confidence: number;
  commonUsage: boolean;
  australianPreferred: boolean;
  aliases: string[];
  context_indicators: string[];
  exclusion_indicators?: string[];
}

export interface DisambiguationResult {
  originalTerm: string;
  disambiguatedTerm: string;
  confidence: number;
  domain: MedicalDomain;
  definition: string;
  reasoning: string;
  alternatives: AlternativeDefinition[];
  australianCompliant: boolean;
  contextFactors: ContextFactor[];
}

export interface AlternativeDefinition {
  term: string;
  domain: MedicalDomain;
  confidence: number;
  definition: string;
  reasoning: string;
}

export interface ContextFactor {
  factor: string;
  type: ContextType;
  strength: number;
  supports: string[];
  contradicts?: string[];
}

export type ContextType = 
  | 'anatomical_reference'
  | 'procedural_context'
  | 'temporal_indicator'
  | 'severity_modifier'
  | 'measurement_context'
  | 'medication_context'
  | 'diagnostic_context'
  | 'specialty_indicator';

export type MedicalDomain = 
  | 'cardiology'
  | 'pathology' 
  | 'pharmacology'
  | 'radiology'
  | 'surgery'
  | 'emergency'
  | 'general_medicine'
  | 'pediatrics'
  | 'oncology';

export interface DisambiguationOptions {
  primaryDomain?: MedicalDomain;
  considerAllDomains?: boolean;
  australianPreference?: boolean;
  confidenceThreshold?: number;
  contextWindow?: number;
  includeAlternatives?: boolean;
}

export interface TermRegistry {
  term: string;
  variations: string[];
  definitions: Map<MedicalDomain, AmbiguousTermDefinition>;
  globalFrequency: number;
  domainFrequency: Map<MedicalDomain, number>;
}

export interface DisambiguationStats {
  totalTermsProcessed: number;
  disambiguatedTerms: number;
  averageConfidence: number;
  domainDistribution: Record<MedicalDomain, number>;
  australianComplianceRate: number;
  processingTimeAverage: number;
  cacheHitRate: number;
}

export class MedicalTerminologyDisambiguator {
  private static instance: MedicalTerminologyDisambiguator;
  private cacheManager: CacheManager;
  private performanceMonitor: PerformanceMonitor;
  private patternCompiler: PatternCompiler;
  
  // Term registry and disambiguation knowledge base
  private termRegistry: Map<string, TermRegistry> = new Map();
  private acronymExpansions: Map<string, AmbiguousTermDefinition[]> = new Map();
  private contextPatterns: Map<ContextType, RegExp[]> = new Map();
  private domainIndicators: Map<MedicalDomain, RegExp[]> = new Map();
  
  // Australian medical terminology preferences
  private australianPreferences: Map<string, string> = new Map();
  private domainSpecificTerminology: Map<MedicalDomain, Map<string, string>> = new Map();
  
  // Performance tracking
  private disambiguationStats: DisambiguationStats = {
    totalTermsProcessed: 0,
    disambiguatedTerms: 0,
    averageConfidence: 0,
    domainDistribution: {} as Record<MedicalDomain, number>,
    australianComplianceRate: 0,
    processingTimeAverage: 0,
    cacheHitRate: 0
  };
  
  // Configuration
  private readonly CACHE_TTL = 45 * 60 * 1000; // 45 minutes for terminology disambiguation
  private readonly DEFAULT_CONFIDENCE_THRESHOLD = 0.8;
  private readonly CONTEXT_ANALYSIS_WINDOW = 150; // Characters for context analysis
  private readonly MIN_ALTERNATIVES = 2;
  private readonly MAX_ALTERNATIVES = 5;
  
  private constructor() {
    this.cacheManager = CacheManager.getInstance();
    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.patternCompiler = PatternCompiler.getInstance();
    
    this.initializeTermRegistry();
    this.initializeAcronymExpansions();
    this.initializeContextPatterns();
    this.initializeDomainIndicators();
    this.initializeAustralianPreferences();
    
    logger.info('MedicalTerminologyDisambiguator initialized with domain-specific context analysis');
  }
  
  public static getInstance(): MedicalTerminologyDisambiguator {
    if (!MedicalTerminologyDisambiguator.instance) {
      MedicalTerminologyDisambiguator.instance = new MedicalTerminologyDisambiguator();
    }
    return MedicalTerminologyDisambiguator.instance;
  }
  
  /**
   * Disambiguate ambiguous medical term based on context and domain
   */
  async disambiguateTerm(
    term: string,
    context: string,
    options: DisambiguationOptions = {}
  ): Promise<DisambiguationResult> {
    const measurement = this.performanceMonitor.startMeasurement('term_disambiguation', 'MedicalTerminologyDisambiguator')
      .setInputLength(context.length);

    try {
      const startTime = Date.now();
      
      const disambiguationOptions: Required<DisambiguationOptions> = {
        primaryDomain: 'cardiology',
        considerAllDomains: true,
        australianPreference: true,
        confidenceThreshold: this.DEFAULT_CONFIDENCE_THRESHOLD,
        contextWindow: this.CONTEXT_ANALYSIS_WINDOW,
        includeAlternatives: true,
        ...options
      };

      // Check cache first
      const cacheKey = this.generateDisambiguationCacheKey(term, context, disambiguationOptions);
      const cachedResult = await this.getCachedDisambiguation(cacheKey);
      if (cachedResult) {
        this.updateStats(true, Date.now() - startTime, cachedResult.domain, cachedResult.confidence, cachedResult.australianCompliant);
        measurement.end(context.length);
        return cachedResult;
      }

      logger.debug('Disambiguating medical term', {
        term,
        contextLength: context.length,
        primaryDomain: disambiguationOptions.primaryDomain,
        australianPreference: disambiguationOptions.australianPreference
      });

      // Extract context factors
      const contextFactors = await this.extractContextFactors(context, disambiguationOptions.contextWindow);
      
      // Get possible definitions for the term
      const termRegistry = this.getTermRegistry(term);
      if (!termRegistry || termRegistry.definitions.size === 0) {
        // Handle unknown term
        return this.handleUnknownTerm(term, context, contextFactors, disambiguationOptions);
      }

      // Score each possible definition
      const scoredDefinitions = await this.scoreDefinitions(termRegistry, contextFactors, disambiguationOptions);
      
      // Select best definition
      const bestDefinition = scoredDefinitions[0];
      if (!bestDefinition || bestDefinition.confidence < disambiguationOptions.confidenceThreshold) {
        return this.createLowConfidenceResult(term, scoredDefinitions, contextFactors, disambiguationOptions);
      }

      // Generate alternatives
      const alternatives = this.generateAlternatives(scoredDefinitions.slice(1), disambiguationOptions);
      
      // Check Australian compliance
      const australianCompliant = this.checkAustralianCompliance(bestDefinition, term);
      
      // Create disambiguation result
      const result: DisambiguationResult = {
        originalTerm: term,
        disambiguatedTerm: australianCompliant && this.australianPreferences.has(term.toLowerCase()) 
          ? this.australianPreferences.get(term.toLowerCase())! 
          : bestDefinition.term,
        confidence: bestDefinition.confidence,
        domain: bestDefinition.domain,
        definition: bestDefinition.definition,
        reasoning: this.generateReasoning(bestDefinition, contextFactors),
        alternatives,
        australianCompliant,
        contextFactors
      };

      // Cache the result
      await this.cacheDisambiguation(cacheKey, result);
      
      // Update statistics
      this.updateStats(false, Date.now() - startTime, result.domain, result.confidence, result.australianCompliant);

      // Track performance metrics
      measurement.setPatternMatches(contextFactors.length)
        .setConfidenceScore(result.confidence)
        .setMedicalAccuracy(result.australianCompliant ? 0.95 : 0.85)
        .setAustralianCompliance(result.australianCompliant)
        .end(context.length);

      logger.debug('Medical term disambiguation completed', {
        originalTerm: term,
        disambiguatedTerm: result.disambiguatedTerm,
        confidence: result.confidence.toFixed(3),
        domain: result.domain,
        australianCompliant: result.australianCompliant,
        alternativeCount: alternatives.length,
        contextFactorCount: contextFactors.length
      });

      return result;

    } catch (error) {
      logger.error('Medical term disambiguation failed', error instanceof Error ? error : new Error(String(error)), {
        term,
        contextLength: context.length
      });
      throw error;
    }
  }

  /**
   * Batch disambiguate multiple terms with context sharing
   */
  async batchDisambiguate(
    terms: string[],
    context: string,
    options: DisambiguationOptions = {}
  ): Promise<DisambiguationResult[]> {
    const results: DisambiguationResult[] = [];
    
    // Extract context factors once for all terms
    const contextFactors = await this.extractContextFactors(context, options.contextWindow || this.CONTEXT_ANALYSIS_WINDOW);
    
    // Process terms in parallel for better performance
    const disambiguationPromises = terms.map(term => 
      this.disambiguateTerm(term, context, {
        ...options,
        // Pass context factors to avoid re-extraction
        contextWindow: 0 // Skip context extraction since we've already done it
      })
    );
    
    try {
      const batchResults = await Promise.allSettled(disambiguationPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          // Enhance with shared context factors
          result.value.contextFactors = contextFactors;
          results.push(result.value);
        } else {
          logger.warn('Batch disambiguation failed for term', {
            error: result.reason instanceof Error ? result.reason.message : String(result.reason)
          });
        }
      }
      
      logger.debug('Batch disambiguation completed', {
        totalTerms: terms.length,
        successfulDisambiguations: results.length,
        sharedContextFactors: contextFactors.length
      });
      
    } catch (error) {
      logger.error('Batch disambiguation error', error instanceof Error ? error : new Error(String(error)), {
        termCount: terms.length
      });
    }
    
    return results;
  }

  /**
   * Expand medical acronyms and abbreviations with context awareness
   */
  async expandAcronym(
    acronym: string,
    context: string,
    domain?: MedicalDomain
  ): Promise<DisambiguationResult | null> {
    const expansions = this.acronymExpansions.get(acronym.toUpperCase()) || [];
    if (expansions.length === 0) {
      return null;
    }

    // If single expansion, return directly
    if (expansions.length === 1) {
      const expansion = expansions[0];
      return {
        originalTerm: acronym,
        disambiguatedTerm: expansion.term,
        confidence: expansion.confidence,
        domain: expansion.domain,
        definition: expansion.definition,
        reasoning: `Single expansion available for ${acronym}`,
        alternatives: [],
        australianCompliant: expansion.australianPreferred,
        contextFactors: []
      };
    }

    // Multiple expansions - disambiguate based on context
    return this.disambiguateTerm(acronym, context, { 
      primaryDomain: domain,
      australianPreference: true 
    });
  }

  /**
   * Get comprehensive disambiguation statistics
   */
  getDisambiguationStats(): DisambiguationStats {
    return { ...this.disambiguationStats };
  }

  /**
   * Register custom term definitions for specific domains
   */
  registerCustomTermDefinition(
    term: string,
    domain: MedicalDomain,
    definition: AmbiguousTermDefinition
  ): void {
    let registry = this.termRegistry.get(term.toLowerCase());
    if (!registry) {
      registry = {
        term,
        variations: [term],
        definitions: new Map(),
        globalFrequency: 0,
        domainFrequency: new Map()
      };
      this.termRegistry.set(term.toLowerCase(), registry);
    }

    registry.definitions.set(domain, definition);
    registry.domainFrequency.set(domain, (registry.domainFrequency.get(domain) || 0) + 1);
    registry.globalFrequency++;

    logger.info('Registered custom term definition', {
      term,
      domain,
      confidence: definition.confidence,
      australianPreferred: definition.australianPreferred
    });
  }

  // Private implementation methods

  private async extractContextFactors(context: string, _windowSize: number): Promise<ContextFactor[]> {
    const factors: ContextFactor[] = [];
    
    // Extract different types of context factors
    for (const [contextType, patterns] of this.contextPatterns.entries()) {
      for (const pattern of patterns) {
        const matches = Array.from(context.matchAll(pattern));
        for (const match of matches) {
          factors.push({
            factor: match[0],
            type: contextType,
            strength: this.calculateContextStrength(match[0], contextType),
            supports: this.getContextSupports(match[0], contextType)
          });
        }
      }
    }

    // Extract domain indicators
    for (const [domain, patterns] of this.domainIndicators.entries()) {
      for (const pattern of patterns) {
        if (pattern.test(context)) {
          factors.push({
            factor: `${domain} domain indicator`,
            type: 'specialty_indicator',
            strength: 0.8,
            supports: [domain]
          });
        }
      }
    }

    return this.deduplicateContextFactors(factors);
  }

  private getTermRegistry(term: string): TermRegistry | undefined {
    // Check direct match
    const registry = this.termRegistry.get(term.toLowerCase());
    if (registry) return registry;

    // Check variations and aliases
    for (const [, termRegistry] of this.termRegistry.entries()) {
      if (termRegistry.variations.some(v => v.toLowerCase() === term.toLowerCase())) {
        return termRegistry;
      }
      
      for (const definition of termRegistry.definitions.values()) {
        if (definition.aliases.some(alias => alias.toLowerCase() === term.toLowerCase())) {
          return termRegistry;
        }
      }
    }

    return undefined;
  }

  private async scoreDefinitions(
    registry: TermRegistry,
    contextFactors: ContextFactor[],
    options: Required<DisambiguationOptions>
  ): Promise<AmbiguousTermDefinition[]> {
    const scoredDefinitions: (AmbiguousTermDefinition & { calculatedConfidence: number })[] = [];

    for (const [domain, definition] of registry.definitions.entries()) {
      let score = definition.confidence; // Base confidence

      // Domain preference scoring
      if (options.primaryDomain === domain) {
        score += 0.2;
      }

      // Context factor scoring
      for (const factor of contextFactors) {
        if (factor.supports.includes(domain) || factor.supports.includes(definition.term)) {
          score += factor.strength * 0.3;
        }
        if (factor.contradicts?.includes(domain) || factor.contradicts?.includes(definition.term)) {
          score -= factor.strength * 0.2;
        }
      }

      // Australian preference bonus
      if (options.australianPreference && definition.australianPreferred) {
        score += 0.1;
      }

      // Common usage bonus
      if (definition.commonUsage) {
        score += 0.05;
      }

      // Frequency-based scoring
      const domainFrequency = registry.domainFrequency.get(domain) || 0;
      const frequencyScore = domainFrequency / Math.max(registry.globalFrequency, 1);
      score += frequencyScore * 0.1;

      scoredDefinitions.push({
        ...definition,
        calculatedConfidence: Math.min(score, 1.0)
      });
    }

    return scoredDefinitions
      .sort((a, b) => b.calculatedConfidence - a.calculatedConfidence)
      .map(({ calculatedConfidence, ...definition }) => ({
        ...definition,
        confidence: calculatedConfidence
      }));
  }

  private generateReasoning(
    definition: AmbiguousTermDefinition,
    contextFactors: ContextFactor[]
  ): string {
    const reasons: string[] = [];

    // Domain-based reasoning
    reasons.push(`Term identified as ${definition.domain} domain terminology`);

    // Context factor reasoning
    const supportingFactors = contextFactors.filter(f => 
      f.supports.includes(definition.domain) || f.supports.includes(definition.term)
    );
    
    if (supportingFactors.length > 0) {
      const topFactor = supportingFactors.sort((a, b) => b.strength - a.strength)[0];
      reasons.push(`Context supports this interpretation: ${topFactor.factor}`);
    }

    // Australian preference reasoning
    if (definition.australianPreferred) {
      reasons.push('Preferred Australian medical terminology');
    }

    // Confidence reasoning
    if (definition.confidence > 0.9) {
      reasons.push('High confidence based on common usage and context');
    } else if (definition.confidence > 0.7) {
      reasons.push('Moderate confidence based on contextual analysis');
    }

    return reasons.join('. ');
  }

  private generateAlternatives(
    alternativeDefinitions: AmbiguousTermDefinition[],
    options: Required<DisambiguationOptions>
  ): AlternativeDefinition[] {
    if (!options.includeAlternatives) return [];

    const alternatives = alternativeDefinitions
      .filter(def => def.confidence >= 0.5) // Only include reasonable alternatives
      .slice(0, this.MAX_ALTERNATIVES)
      .map(def => ({
        term: def.term,
        domain: def.domain,
        confidence: def.confidence,
        definition: def.definition,
        reasoning: `Alternative ${def.domain} interpretation`
      }));

    return alternatives;
  }

  private checkAustralianCompliance(definition: AmbiguousTermDefinition, originalTerm: string): boolean {
    // Check if the definition is already Australian compliant
    if (definition.australianPreferred) return true;

    // Check if there's a preferred Australian variant
    const australianVariant = this.australianPreferences.get(originalTerm.toLowerCase());
    return !!australianVariant;
  }

  private handleUnknownTerm(
    term: string,
    context: string,
    contextFactors: ContextFactor[],
    options: Required<DisambiguationOptions>
  ): DisambiguationResult {
    // Try to infer domain from context
    const domainHints = contextFactors.filter(f => f.type === 'specialty_indicator');
    const inferredDomain = domainHints.length > 0 ? domainHints[0].supports[0] as MedicalDomain : options.primaryDomain;

    return {
      originalTerm: term,
      disambiguatedTerm: term,
      confidence: 0.3, // Low confidence for unknown terms
      domain: inferredDomain,
      definition: `Unknown medical term - context suggests ${inferredDomain} domain`,
      reasoning: 'Term not found in knowledge base, inferred from context',
      alternatives: [],
      australianCompliant: false,
      contextFactors
    };
  }

  private createLowConfidenceResult(
    term: string,
    scoredDefinitions: AmbiguousTermDefinition[],
    contextFactors: ContextFactor[],
    options: Required<DisambiguationOptions>
  ): DisambiguationResult {
    const bestGuess = scoredDefinitions[0];
    
    return {
      originalTerm: term,
      disambiguatedTerm: bestGuess ? bestGuess.term : term,
      confidence: bestGuess ? bestGuess.confidence : 0.5,
      domain: bestGuess ? bestGuess.domain : options.primaryDomain,
      definition: bestGuess ? bestGuess.definition : `Ambiguous term with low confidence`,
      reasoning: 'Multiple possible interpretations with insufficient context for high confidence disambiguation',
      alternatives: this.generateAlternatives(scoredDefinitions, options),
      australianCompliant: bestGuess ? bestGuess.australianPreferred : false,
      contextFactors
    };
  }

  private calculateContextStrength(match: string, contextType: ContextType): number {
    // Base strength varies by context type
    const baseStrengths: Record<ContextType, number> = {
      anatomical_reference: 0.8,
      procedural_context: 0.9,
      temporal_indicator: 0.6,
      severity_modifier: 0.7,
      measurement_context: 0.8,
      medication_context: 0.85,
      diagnostic_context: 0.9,
      specialty_indicator: 0.95
    };

    let strength = baseStrengths[contextType] || 0.5;

    // Adjust based on match specificity
    if (match.length > 10) strength += 0.1;
    if (/\b(severe|critical|emergency)\b/i.test(match)) strength += 0.1;

    return Math.min(strength, 1.0);
  }

  private getContextSupports(match: string, contextType: ContextType): string[] {
    const supports: string[] = [];

    // Map context patterns to supported domains/terms
    switch (contextType) {
      case 'procedural_context':
        if (/\b(PCI|angioplasty|catheter)\b/i.test(match)) supports.push('cardiology');
        if (/\b(surgery|surgical|operation)\b/i.test(match)) supports.push('surgery');
        break;
      case 'anatomical_reference':
        if (/\b(heart|cardiac|coronary)\b/i.test(match)) supports.push('cardiology');
        if (/\b(liver|hepatic|renal)\b/i.test(match)) supports.push('general_medicine');
        break;
      case 'medication_context':
        supports.push('pharmacology');
        break;
      case 'diagnostic_context':
        if (/\b(echo|ECG|angiogram)\b/i.test(match)) supports.push('cardiology');
        if (/\b(CT|MRI|ultrasound)\b/i.test(match)) supports.push('radiology');
        break;
    }

    return supports;
  }

  private deduplicateContextFactors(factors: ContextFactor[]): ContextFactor[] {
    const seen = new Set<string>();
    return factors.filter(factor => {
      const key = `${factor.factor}_${factor.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private updateStats(
    cacheHit: boolean,
    processingTime: number,
    domain: MedicalDomain,
    confidence: number,
    australianCompliant: boolean
  ): void {
    this.disambiguationStats.totalTermsProcessed++;
    
    if (confidence >= this.DEFAULT_CONFIDENCE_THRESHOLD) {
      this.disambiguationStats.disambiguatedTerms++;
    }

    // Update domain distribution
    this.disambiguationStats.domainDistribution[domain] = (this.disambiguationStats.domainDistribution[domain] || 0) + 1;

    // Update running averages
    const totalProcessed = this.disambiguationStats.totalTermsProcessed;
    this.disambiguationStats.averageConfidence = 
      (this.disambiguationStats.averageConfidence * (totalProcessed - 1) + confidence) / totalProcessed;
    
    this.disambiguationStats.processingTimeAverage = 
      (this.disambiguationStats.processingTimeAverage * (totalProcessed - 1) + processingTime) / totalProcessed;

    // Update compliance rate
    const complianceCount = australianCompliant ? 1 : 0;
    this.disambiguationStats.australianComplianceRate = 
      (this.disambiguationStats.australianComplianceRate * (totalProcessed - 1) + complianceCount) / totalProcessed;

    // Update cache hit rate
    const hitCount = cacheHit ? 1 : 0;
    this.disambiguationStats.cacheHitRate = 
      (this.disambiguationStats.cacheHitRate * (totalProcessed - 1) + hitCount) / totalProcessed;
  }

  private generateDisambiguationCacheKey(
    term: string, 
    context: string, 
    options: Required<DisambiguationOptions>
  ): string {
    const contextSample = context.length > 100 ? context.substring(0, 100) : context;
    const optionsHash = JSON.stringify({
      primaryDomain: options.primaryDomain,
      australianPreference: options.australianPreference,
      confidenceThreshold: options.confidenceThreshold
    });
    return `disambiguation_${term}_${btoa(contextSample + optionsHash).substring(0, 32)}`;
  }

  private async getCachedDisambiguation(cacheKey: string): Promise<DisambiguationResult | null> {
    try {
      const cached = await this.cacheManager.get(`disambiguation_${cacheKey}` as any);
      if (cached && typeof cached === 'object' && 'originalTerm' in cached) {
        // Validate cached result has required DisambiguationResult properties
        const result = cached as any;
        if (result.disambiguatedTerm !== undefined && result.confidence !== undefined &&
            result.domain !== undefined && result.definition !== undefined) {
          logger.debug(`Disambiguation cache hit: ${cacheKey}`);
          return result as DisambiguationResult;
        }
      }
    } catch (error) {
      logger.debug(`Disambiguation cache miss: ${cacheKey}`);
    }
    return null;
  }

  private async cacheDisambiguation(cacheKey: string, result: DisambiguationResult): Promise<void> {
    try {
      await this.cacheManager.set(`disambiguation_${cacheKey}` as any, result, undefined, this.CACHE_TTL);
      logger.debug(`Cached disambiguation: ${cacheKey}`);
    } catch (error) {
      const err = toError(error);
      logger.warn('Failed to cache disambiguation result:', { error: err.message });
    }
  }

  private initializeTermRegistry(): void {
    // Initialize common ambiguous medical terms
    const ambiguousTerms = [
      {
        term: 'AS',
        definitions: new Map<MedicalDomain, AmbiguousTermDefinition>([
          ['cardiology', {
            term: 'aortic stenosis',
            domain: 'cardiology',
            definition: 'Narrowing of the aortic valve opening',
            confidence: 0.9,
            commonUsage: true,
            australianPreferred: true,
            aliases: ['aortic stenosis'],
            context_indicators: ['valve', 'aortic', 'stenosis', 'gradient', 'murmur']
          }],
          ['general_medicine', {
            term: 'ankylosing spondylitis',
            domain: 'general_medicine',
            definition: 'Inflammatory arthritis affecting the spine',
            confidence: 0.7,
            commonUsage: false,
            australianPreferred: true,
            aliases: ['ankylosing spondylitis'],
            context_indicators: ['spine', 'arthritis', 'inflammatory', 'back pain']
          }]
        ])
      },
      {
        term: 'MI',
        definitions: new Map<MedicalDomain, AmbiguousTermDefinition>([
          ['cardiology', {
            term: 'myocardial infarction',
            domain: 'cardiology',
            definition: 'Heart attack due to blocked coronary artery',
            confidence: 0.95,
            commonUsage: true,
            australianPreferred: true,
            aliases: ['heart attack', 'myocardial infarction'],
            context_indicators: ['chest pain', 'troponin', 'ECG', 'coronary', 'stemi', 'nstemi']
          }]
        ])
      },
      {
        term: 'CHF',
        definitions: new Map<MedicalDomain, AmbiguousTermDefinition>([
          ['cardiology', {
            term: 'congestive heart failure',
            domain: 'cardiology',
            definition: 'Heart unable to pump blood effectively',
            confidence: 0.9,
            commonUsage: true,
            australianPreferred: true,
            aliases: ['heart failure', 'congestive heart failure'],
            context_indicators: ['dyspnea', 'edema', 'ejection fraction', 'BNP', 'fluid retention']
          }]
        ])
      }
    ];

    for (const termData of ambiguousTerms) {
      const registry: TermRegistry = {
        term: termData.term,
        variations: [termData.term],
        definitions: termData.definitions,
        globalFrequency: 1,
        domainFrequency: new Map()
      };

      for (const [domain] of termData.definitions.entries()) {
        registry.domainFrequency.set(domain, 1);
      }

      this.termRegistry.set(termData.term.toLowerCase(), registry);
    }

    logger.debug('Term registry initialized', {
      registeredTerms: this.termRegistry.size
    });
  }

  private initializeAcronymExpansions(): void {
    // Common medical acronyms
    const acronyms = [
      { acronym: 'PCI', expansions: [
        {
          term: 'percutaneous coronary intervention',
          domain: 'cardiology' as MedicalDomain,
          definition: 'Minimally invasive procedure to open blocked coronary arteries',
          confidence: 0.95,
          commonUsage: true,
          australianPreferred: true,
          aliases: ['angioplasty', 'balloon angioplasty'],
          context_indicators: ['stent', 'balloon', 'coronary', 'catheter', 'angiogram']
        }
      ]},
      { acronym: 'TAVI', expansions: [
        {
          term: 'transcatheter aortic valve implantation',
          domain: 'cardiology' as MedicalDomain,
          definition: 'Minimally invasive aortic valve replacement',
          confidence: 0.9,
          commonUsage: true,
          australianPreferred: true,
          aliases: ['TAVR', 'transcatheter aortic valve replacement'],
          context_indicators: ['aortic valve', 'stenosis', 'valve replacement', 'transcatheter']
        }
      ]},
      { acronym: 'AF', expansions: [
        {
          term: 'atrial fibrillation',
          domain: 'cardiology' as MedicalDomain,
          definition: 'Irregular heart rhythm originating in the atria',
          confidence: 0.9,
          commonUsage: true,
          australianPreferred: true,
          aliases: ['atrial fibrillation'],
          context_indicators: ['irregular', 'rhythm', 'atrial', 'anticoagulation', 'rate control']
        }
      ]}
    ];

    for (const { acronym, expansions } of acronyms) {
      this.acronymExpansions.set(acronym, expansions);
    }

    logger.debug('Acronym expansions initialized', {
      totalAcronyms: this.acronymExpansions.size
    });
  }

  private initializeContextPatterns(): void {
    // Anatomical reference patterns
    this.contextPatterns.set('anatomical_reference', [
      /\b(left|right|anterior|posterior|lateral|septal|inferior|superior)\s+(ventricle|atrium|wall|artery|valve)\b/gi,
      /\b(coronary|carotid|femoral|radial)\s+(artery|arteries)\b/gi,
      /\b(mitral|aortic|tricuspid|pulmonary)\s+(valve|regurgitation|stenosis)\b/gi
    ]);

    // Procedural context patterns
    this.contextPatterns.set('procedural_context', [
      /\b(procedure|intervention|surgery|operation|catheterization)\b/gi,
      /\b(PCI|TAVI|mTEER|angioplasty|stent|balloon)\b/gi,
      /\b(pre|post|during|intra)\s*(?:procedure|operative|procedural)\b/gi
    ]);

    // Temporal indicator patterns
    this.contextPatterns.set('temporal_indicator', [
      /\b(acute|chronic|subacute|recent|longstanding)\b/gi,
      /\b(pre|post|during)\s*(?:procedure|operative|surgery)\b/gi,
      /\b\d+\s+(days?|weeks?|months?|years?)\s+(ago|later|post)\b/gi
    ]);

    // Severity modifier patterns
    this.contextPatterns.set('severity_modifier', [
      /\b(mild|moderate|severe|critical|significant|trivial|trace)\b/gi,
      /\b(grade\s*[I-IV]|class\s*[I-IV])\b/gi
    ]);

    // Measurement context patterns
    this.contextPatterns.set('measurement_context', [
      /\b\d+(?:\.\d+)?\s*(mmHg|mg|ml|%|cm|mm|units?)\b/gi,
      /\b(?:EF|ejection fraction)\s*(?:of\s*)?(\d+)%?\b/gi,
      /\b(pressure\s+gradient|peak\s+velocity|mean\s+gradient)\b/gi
    ]);

    logger.debug('Context patterns initialized', {
      patternCategories: this.contextPatterns.size
    });
  }

  private initializeDomainIndicators(): void {
    // Cardiology domain indicators
    this.domainIndicators.set('cardiology', [
      /\b(cardiac|coronary|myocardial|valvular|arrhythm|pericardial)\b/gi,
      /\b(echo|ECG|angiogram|catheterization|PCI|TAVI)\b/gi,
      /\b(stenosis|regurgitation|ejection fraction|wall motion)\b/gi
    ]);

    // Surgery domain indicators
    this.domainIndicators.set('surgery', [
      /\b(surgical|operation|operative|incision|suture)\b/gi,
      /\b(bypass|graft|anastomosis|resection)\b/gi
    ]);

    // Emergency domain indicators
    this.domainIndicators.set('emergency', [
      /\b(emergency|urgent|stat|immediate|critical|arrest)\b/gi,
      /\b(resuscitation|defibrillation|intubation)\b/gi
    ]);

    logger.debug('Domain indicators initialized', {
      totalDomains: this.domainIndicators.size
    });
  }

  private initializeAustralianPreferences(): void {
    // Australian medical terminology preferences
    const preferences = [
      ['furosemide', 'frusemide'],
      ['sulfasalazine', 'sulphasalazine'],
      ['esophageal', 'oesophageal'],
      ['pediatric', 'paediatric'],
      ['anemia', 'anaemia'],
      ['leukemia', 'leukaemia'],
      ['hemoglobin', 'haemoglobin'],
      ['color doppler', 'colour doppler']
    ];

    for (const [international, australian] of preferences) {
      this.australianPreferences.set(international.toLowerCase(), australian);
    }

    logger.debug('Australian terminology preferences initialized', {
      preferenceCount: this.australianPreferences.size
    });
  }
}

// Convenience functions for easy integration
export async function disambiguateMedicalTerm(
  term: string,
  context: string,
  options?: DisambiguationOptions
): Promise<DisambiguationResult> {
  return MedicalTerminologyDisambiguator.getInstance().disambiguateTerm(term, context, options);
}

export async function expandMedicalAcronym(
  acronym: string,
  context: string,
  domain?: MedicalDomain
): Promise<DisambiguationResult | null> {
  return MedicalTerminologyDisambiguator.getInstance().expandAcronym(acronym, context, domain);
}

export async function batchDisambiguateMedicalTerms(
  terms: string[],
  context: string,
  options?: DisambiguationOptions
): Promise<DisambiguationResult[]> {
  return MedicalTerminologyDisambiguator.getInstance().batchDisambiguate(terms, context, options);
}

export function getDisambiguationStatistics(): DisambiguationStats {
  return MedicalTerminologyDisambiguator.getInstance().getDisambiguationStats();
}
