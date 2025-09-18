/**
 * Medical Summary Extractor - Phase 3 Implementation
 * 
 * Provides intelligent medical summary generation with clinical finding extraction,
 * quality assessment metrics, and integration with Phase 2 consolidation system.
 * Consolidates 6 summary extraction systems across specialized agents.
 */

import { medicalTextNormalizer } from '@/utils/medical-text/MedicalTextNormalizer';
import { cardiologyRegistry } from '@/utils/medical-text/CardiologyPatternRegistry';
import { MedicalPatternService } from '@/utils/medical-text/MedicalPatternService';
import type { AgentType } from '@/types/medical.types';
import { logger } from '@/utils/Logger';
import { recordConsolidationBenchmark } from '@/utils/performance/ConsolidationMetrics';

export interface MedicalSummaryConfig {
  agentType?: AgentType;
  summaryLength: 'brief' | 'standard' | 'comprehensive';
  focusAreas?: ClinicalFocusArea[];
  extractFindings?: boolean;
  includeMetrics?: boolean;
  preserveOriginalFormat?: boolean;
  australianCompliance?: boolean;
}

export type ClinicalFocusArea = 
  | 'diagnosis'
  | 'procedures'
  | 'medications'
  | 'investigations'
  | 'outcomes'
  | 'complications'
  | 'hemodynamics'
  | 'anatomy'
  | 'management';

export interface ClinicalFinding {
  category: ClinicalFocusArea;
  finding: string;
  severity?: 'mild' | 'moderate' | 'severe' | 'critical';
  confidence: number;
  context?: string;
  location?: string;
  measurement?: {
    value: string;
    unit?: string;
    reference?: string;
  };
}

export interface SummaryQualityMetrics {
  clinicalAccuracy: number;
  completeness: number;
  conciseness: number;
  readability: number;
  medicalTerminologyUse: number;
  overallQuality: number;
  warnings: string[];
  recommendations: string[];
}

export interface MedicalSummaryResult {
  originalText: string;
  summary: string;
  findings: ClinicalFinding[];
  qualityMetrics: SummaryQualityMetrics;
  extractionStats: {
    originalLength: number;
    summaryLength: number;
    compressionRatio: number;
    processingTimeMs: number;
    patternsDetected: number;
    findingsExtracted: number;
  };
  metadata: {
    agentType?: AgentType;
    extractionMethod: string;
    timestamp: number;
    version: string;
  };
}

/**
 * Intelligent Medical Summary Extractor
 * Consolidates summary extraction across all medical agents
 */
export class MedicalSummaryExtractor {
  private static instance: MedicalSummaryExtractor;
  private patternService: MedicalPatternService;
  private summaryCache: Map<string, MedicalSummaryResult> = new Map();

  // Clinical finding extraction patterns
  private readonly clinicalPatterns = {
    diagnosis: [
      /(?:diagnosis|diagnosed with|shows|demonstrates|evidence of)\s+([^.]+)/gi,
      /(?:consistent with|suggestive of|indicates)\s+([^.]+)/gi,
      /(?:stenosis|regurgitation|insufficiency|disease|syndrome)\b/gi
    ],
    procedures: [
      /(?:performed|underwent|procedure|intervention)\s+([^.]+)/gi,
      /(?:TAVI|PCI|CABG|valvuloplasty|angioplasty|catheterization)\b/gi,
      /(?:deployed|implanted|placed|inserted)\s+([^.]+)/gi
    ],
    medications: [
      /(?:given|administered|prescribed|started on)\s+([^.]+)/gi,
      /(?:aspirin|clopidogrel|heparin|statin|ACE inhibitor|beta.?blocker)\b/gi,
      /\b\d+\s*(?:mg|mcg|units)\b/gi
    ],
    investigations: [
      /(?:TTE|TOE|CTCA|angiogram|ECG|chest x.?ray|blood tests?)\b/gi,
      /(?:shows?|demonstrates?|reveals?)\s+([^.]+)/gi,
      /(?:EF|ejection fraction)\s*(?:of\s*)?(\d+%?)/gi
    ],
    outcomes: [
      /(?:outcome|result|success|complication|improvement)\s+([^.]+)/gi,
      /(?:successful|unsuccessful|complicated by|resulted in)\s+([^.]+)/gi,
      /(?:good|poor|excellent|satisfactory)\s+(?:outcome|result)/gi
    ],
    complications: [
      /(?:complication|complicat(?:ed by|ion)|adverse event|bleeding|dissection)\b/gi,
      /(?:emergency|urgent|immediate)\s+([^.]+)/gi,
      /(?:required|needed)\s+(?:emergency|urgent|immediate)\s+([^.]+)/gi
    ],
    hemodynamics: [
      /(?:PA|RA|PCWP|LVEDP|CO|CI|SVR|PVR)\s*\d+/gi,
      /\d+\s*mmHg/gi,
      /(?:gradient|pressure|output|index)\s*(?:of\s*)?\d+/gi
    ],
    anatomy: [
      /(?:LAD|RCA|LCX|LMS|aortic|mitral|tricuspid|pulmonary)\s+(?:valve|artery|stenosis)/gi,
      /(?:proximal|mid|distal|ostial)\s+(?:LAD|RCA|LCX)/gi,
      /(?:left|right)\s+(?:ventricle|atrium|heart)/gi
    ],
    management: [
      /(?:plan|recommend|advise|follow.?up|continue|discontinue)\s+([^.]+)/gi,
      /(?:increase|decrease|adjust|maintain)\s+([^.]+)/gi,
      /(?:clinic|appointment|review)\s+([^.]+)/gi
    ]
  };

  private constructor() {
    this.patternService = MedicalPatternService.getInstance();
  }

  public static getInstance(): MedicalSummaryExtractor {
    if (!MedicalSummaryExtractor.instance) {
      MedicalSummaryExtractor.instance = new MedicalSummaryExtractor();
    }
    return MedicalSummaryExtractor.instance;
  }

  /**
   * Main summary extraction entry point
   */
  async extractSummary(
    text: string,
    config: MedicalSummaryConfig
  ): Promise<MedicalSummaryResult> {
    const startTime = performance.now();

    try {
      const cacheKey = this.generateCacheKey(text, config);
      const cached = this.summaryCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      logger.debug('Starting medical summary extraction', {
        textLength: text.length,
        agentType: config.agentType,
        summaryLength: config.summaryLength
      });

      // Step 1: Normalize the input text using Phase 2 consolidation
      const normalizedText = await this.normalizeInputText(text, config);

      // Step 2: Extract clinical findings
      const findings = config.extractFindings !== false ? 
        await this.extractClinicalFindings(normalizedText, config) : [];

      // Step 3: Generate intelligent summary
      const summary = await this.generateIntelligentSummary(normalizedText, findings, config);

      // Step 4: Assess summary quality
      const qualityMetrics = config.includeMetrics !== false ?
        await this.assessSummaryQuality(text, summary, findings, config) :
        this.getBasicQualityMetrics();

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Step 5: Compile extraction statistics
      const extractionStats = {
        originalLength: text.length,
        summaryLength: summary.length,
        compressionRatio: text.length > 0 ? (text.length - summary.length) / text.length * 100 : 0,
        processingTimeMs: processingTime,
        patternsDetected: this.countDetectedPatterns(normalizedText, config),
        findingsExtracted: findings.length
      };

      const result: MedicalSummaryResult = {
        originalText: text,
        summary,
        findings,
        qualityMetrics,
        extractionStats,
        metadata: {
          agentType: config.agentType,
          extractionMethod: 'Phase3_Consolidation',
          timestamp: Date.now(),
          version: '3.0.0'
        }
      };

      // Cache result
      this.summaryCache.set(cacheKey, result);

      // Record performance metrics
      recordConsolidationBenchmark('summary_extraction', processingTime, processingTime, 0);

      logger.info('Medical summary extraction completed', {
        originalLength: text.length,
        summaryLength: summary.length,
        compressionRatio: extractionStats.compressionRatio.toFixed(1) + '%',
        findingsCount: findings.length,
        processingTime,
        qualityScore: qualityMetrics.overallQuality.toFixed(1)
      });

      return result;

    } catch (error) {
      const endTime = performance.now();
      logger.error('Medical summary extraction failed', error instanceof Error ? error : new Error(String(error)), { 
        processingTime: endTime - startTime 
      });
      throw error;
    }
  }

  /**
   * Normalize input text using Phase 2 consolidation
   */
  private async normalizeInputText(text: string, config: MedicalSummaryConfig): Promise<string> {
    try {
      // Use Phase 2 medical text normalizer
      const result = await medicalTextNormalizer.normalize(text, {
        agentType: config.agentType,
        mode: 'summary',
        enableCrossAgentPatterns: true,
        australianSpelling: config.australianCompliance !== false,
        strictMedicalTerms: false, // More lenient for summaries
        preserveUnits: true
      });

      return result.normalizedText;
    } catch (error) {
      logger.warn('Text normalization failed, using original text', { error });
      return text;
    }
  }

  /**
   * Extract clinical findings from normalized text
   */
  private async extractClinicalFindings(
    text: string,
    config: MedicalSummaryConfig
  ): Promise<ClinicalFinding[]> {
    const findings: ClinicalFinding[] = [];
    const focusAreas = config.focusAreas || Object.keys(this.clinicalPatterns) as ClinicalFocusArea[];

    for (const area of focusAreas) {
      const areaPatterns = this.clinicalPatterns[area];
      if (!areaPatterns) continue;

      for (const pattern of areaPatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          const finding = this.createClinicalFinding(area, match, text, config);
          if (finding && finding.confidence >= 70) { // Minimum confidence threshold
            findings.push(finding);
          }

          // Prevent infinite loops
          if (!pattern.global) break;
        }
      }
    }

    // Deduplicate and sort by confidence
    const uniqueFindings = this.deduplicateFindings(findings);
    return uniqueFindings.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Create clinical finding from pattern match
   */
  private createClinicalFinding(
    category: ClinicalFocusArea,
    match: RegExpExecArray,
    fullText: string,
    config: MedicalSummaryConfig
  ): ClinicalFinding | null {
    const finding = match[1] || match[0];
    if (!finding || finding.length < 3) return null;

    // Calculate confidence based on various factors
    let confidence = 60; // Base confidence

    // Boost confidence for medical terminology
    if (this.containsMedicalTerminology(finding)) confidence += 20;
    
    // Boost for agent-specific patterns
    if (config.agentType && this.isAgentRelevant(finding, config.agentType)) confidence += 15;

    // Extract severity if present
    const severity = this.extractSeverity(finding);
    if (severity) confidence += 10;

    // Extract measurements
    const measurement = this.extractMeasurement(finding);

    // Get surrounding context
    const contextStart = Math.max(0, match.index! - 50);
    const contextEnd = Math.min(fullText.length, match.index! + finding.length + 50);
    const context = fullText.substring(contextStart, contextEnd);

    return {
      category,
      finding: finding.trim(),
      severity,
      confidence: Math.min(100, confidence),
      context: context.trim(),
      measurement
    };
  }

  /**
   * Generate intelligent summary based on findings and configuration
   */
  private async generateIntelligentSummary(
    text: string,
    findings: ClinicalFinding[],
    config: MedicalSummaryConfig
  ): Promise<string> {
    
    // Extract key sentences based on clinical importance
    const sentences = this.splitIntoSentences(text);
    const scoredSentences = sentences.map(sentence => ({
      sentence,
      score: this.scoreSentenceImportance(sentence, findings, config)
    }));

    // Sort by importance and select based on summary length
    const sortedSentences = scoredSentences
      .sort((a, b) => b.score - a.score)
      .filter(s => s.score > 10); // Minimum relevance threshold

    // Determine target summary length
    let targetSentences: number;
    switch (config.summaryLength) {
      case 'brief':
        targetSentences = Math.max(1, Math.min(3, Math.ceil(sentences.length * 0.2)));
        break;
      case 'comprehensive':
        targetSentences = Math.max(3, Math.min(10, Math.ceil(sentences.length * 0.6)));
        break;
      default: // standard
        targetSentences = Math.max(2, Math.min(6, Math.ceil(sentences.length * 0.4)));
    }

    // Select top sentences
    const selectedSentences = sortedSentences
      .slice(0, targetSentences)
      .map(s => s.sentence);

    // Create coherent summary
    const summary = this.createCoherentSummary(selectedSentences, findings, config);

    return summary;
  }

  /**
   * Score sentence importance for summary inclusion
   */
  private scoreSentenceImportance(
    sentence: string,
    findings: ClinicalFinding[],
    config: MedicalSummaryConfig
  ): number {
    let score = 0;

    // Medical terminology boost
    if (this.containsMedicalTerminology(sentence)) score += 20;

    // Finding overlap boost
    const sentenceFindings = findings.filter(f => 
      sentence.toLowerCase().includes(f.finding.toLowerCase())
    );
    score += sentenceFindings.length * 15;

    // High-confidence findings boost
    const highConfidenceFindings = sentenceFindings.filter(f => f.confidence >= 85);
    score += highConfidenceFindings.length * 10;

    // Agent-specific relevance
    if (config.agentType && this.isAgentRelevant(sentence, config.agentType)) {
      score += 25;
    }

    // Focus area relevance
    if (config.focusAreas) {
      for (const area of config.focusAreas) {
        if (this.sentenceRelevantToArea(sentence, area)) {
          score += 15;
          break;
        }
      }
    }

    // Measurement presence boost
    if (this.containsMeasurements(sentence)) score += 10;

    // Severity indicators boost
    if (this.containsSeverityIndicators(sentence)) score += 8;

    // Length penalty for very long or very short sentences
    if (sentence.length < 20 || sentence.length > 200) score -= 5;

    return Math.max(0, score);
  }

  /**
   * Create coherent summary from selected sentences
   */
  private createCoherentSummary(
    sentences: string[],
    findings: ClinicalFinding[],
    config: MedicalSummaryConfig
  ): string {
    if (sentences.length === 0) {
      return "No significant clinical findings identified.";
    }

    // Group sentences by clinical area
    const grouped = this.groupSentencesByClinicalArea(sentences);
    
    // Create structured summary
    const summaryParts: string[] = [];

    // Add primary findings first
    if (grouped.primary && grouped.primary.length > 0) {
      summaryParts.push(...grouped.primary);
    }

    // Add secondary findings
    if (grouped.secondary && grouped.secondary.length > 0) {
      summaryParts.push(...grouped.secondary.slice(0, 2)); // Limit secondary content
    }

    // Ensure proper sentence flow and formatting
    let summary = summaryParts.join(' ');
    
    // Clean up formatting
    summary = this.cleanSummaryFormatting(summary);

    // Add Australian spelling if required
    if (config.australianCompliance) {
      summary = this.applyAustralianSpelling(summary);
    }

    return summary;
  }

  /**
   * Assess summary quality with multiple metrics
   */
  private async assessSummaryQuality(
    originalText: string,
    summary: string,
    findings: ClinicalFinding[],
    config: MedicalSummaryConfig
  ): Promise<SummaryQualityMetrics> {
    
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Clinical accuracy assessment
    const clinicalAccuracy = this.assessClinicalAccuracy(originalText, summary, findings);
    if (clinicalAccuracy < 80) {
      warnings.push('Clinical accuracy may be compromised - review medical terminology');
    }

    // Completeness assessment
    const completeness = this.assessCompleteness(originalText, summary, findings);
    if (completeness < 70) {
      recommendations.push('Consider including more clinical details for completeness');
    }

    // Conciseness assessment
    const conciseness = this.assessConciseness(originalText, summary);
    if (conciseness < 60) {
      recommendations.push('Summary could be more concise while maintaining clinical value');
    }

    // Readability assessment
    const readability = this.assessReadability(summary);
    if (readability < 70) {
      recommendations.push('Improve sentence structure for better readability');
    }

    // Medical terminology usage
    const medicalTerminologyUse = this.assessMedicalTerminologyUsage(summary);
    if (medicalTerminologyUse < 60) {
      warnings.push('Limited use of appropriate medical terminology');
    }

    // Overall quality score (weighted average)
    const overallQuality = (
      clinicalAccuracy * 0.3 +
      completeness * 0.25 +
      conciseness * 0.2 +
      readability * 0.15 +
      medicalTerminologyUse * 0.1
    );

    return {
      clinicalAccuracy,
      completeness,
      conciseness,
      readability,
      medicalTerminologyUse,
      overallQuality,
      warnings,
      recommendations
    };
  }

  /**
   * Helper methods for quality assessment
   */
  private assessClinicalAccuracy(originalText: string, summary: string, findings: ClinicalFinding[]): number {
    // Check preservation of key medical terms
    const originalMedicalTerms = this.extractMedicalTerms(originalText);
    const summaryMedicalTerms = this.extractMedicalTerms(summary);
    
    if (originalMedicalTerms.length === 0) return 100;
    
    const preservedTerms = originalMedicalTerms.filter(term => 
      summaryMedicalTerms.some(summaryTerm => 
        summaryTerm.toLowerCase().includes(term.toLowerCase()) ||
        term.toLowerCase().includes(summaryTerm.toLowerCase())
      )
    );

    return (preservedTerms.length / originalMedicalTerms.length) * 100;
  }

  private assessCompleteness(originalText: string, summary: string, findings: ClinicalFinding[]): number {
    // Check if high-confidence findings are represented
    const highConfidenceFindings = findings.filter(f => f.confidence >= 85);
    if (highConfidenceFindings.length === 0) return 100;

    const representedFindings = highConfidenceFindings.filter(finding =>
      summary.toLowerCase().includes(finding.finding.toLowerCase())
    );

    return (representedFindings.length / highConfidenceFindings.length) * 100;
  }

  private assessConciseness(originalText: string, summary: string): number {
    const compressionRatio = (originalText.length - summary.length) / originalText.length;
    
    // Optimal compression ratio is between 60-85%
    if (compressionRatio >= 0.6 && compressionRatio <= 0.85) {
      return 100;
    } else if (compressionRatio < 0.6) {
      return Math.max(0, 100 - ((0.6 - compressionRatio) * 200)); // Penalty for low compression
    } else {
      return Math.max(0, 100 - ((compressionRatio - 0.85) * 300)); // Penalty for over-compression
    }
  }

  private assessReadability(summary: string): number {
    const sentences = this.splitIntoSentences(summary);
    const averageSentenceLength = summary.split(' ').length / sentences.length;
    
    // Optimal sentence length for medical summaries: 15-25 words
    if (averageSentenceLength >= 15 && averageSentenceLength <= 25) {
      return 100;
    } else if (averageSentenceLength < 15) {
      return Math.max(60, 100 - ((15 - averageSentenceLength) * 3));
    } else {
      return Math.max(40, 100 - ((averageSentenceLength - 25) * 2));
    }
  }

  private assessMedicalTerminologyUsage(summary: string): number {
    const words = summary.split(/\s+/);
    const medicalTerms = this.extractMedicalTerms(summary);
    
    if (words.length === 0) return 0;
    
    const medicalTermRatio = (medicalTerms.length / words.length) * 100;
    
    // Optimal medical term ratio: 15-30%
    if (medicalTermRatio >= 15 && medicalTermRatio <= 30) {
      return 100;
    } else if (medicalTermRatio < 15) {
      return (medicalTermRatio / 15) * 100;
    } else {
      return Math.max(70, 100 - ((medicalTermRatio - 30) * 2));
    }
  }

  /**
   * Utility methods
   */
  private containsMedicalTerminology(text: string): boolean {
    const medicalPatterns = [
      /\b(?:stenosis|regurgitation|insufficiency|cardiomyopathy|arrhythmia)\b/i,
      /\b(?:TAVI|PCI|CABG|TTE|TOE|CTCA|ECG)\b/i,
      /\b(?:LAD|RCA|LCX|LMS|aortic|mitral|tricuspid)\b/i,
      /\b(?:mmHg|L\/min|mg|mcg|units|gradient|EF)\b/i,
      /\b(?:moderate|severe|mild)\s+(?:stenosis|regurgitation)\b/i
    ];

    return medicalPatterns.some(pattern => pattern.test(text));
  }

  private isAgentRelevant(text: string, agentType: AgentType): boolean {
    const agentPatterns = cardiologyRegistry.getAgentPatterns(agentType);
    return agentPatterns.some(pattern => pattern.pattern.test(text));
  }

  private extractSeverity(text: string): 'mild' | 'moderate' | 'severe' | 'critical' | undefined {
    if (/\bcritical\b/i.test(text)) return 'critical';
    if (/\bsevere\b/i.test(text)) return 'severe';
    if (/\bmoderate\b/i.test(text)) return 'moderate';
    if (/\bmild\b/i.test(text)) return 'mild';
    return undefined;
  }

  private extractMeasurement(text: string): { value: string; unit?: string; reference?: string } | undefined {
    const measurementPattern = /(\d+(?:\.\d+)?)\s*(mmHg|mg|mcg|L\/min|%|units?)?/i;
    const match = measurementPattern.exec(text);
    
    if (match) {
      return {
        value: match[1],
        unit: match[2] || undefined
      };
    }
    
    return undefined;
  }

  private splitIntoSentences(text: string): string[] {
    return text.split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  private sentenceRelevantToArea(sentence: string, area: ClinicalFocusArea): boolean {
    const patterns = this.clinicalPatterns[area];
    return patterns ? patterns.some(pattern => pattern.test(sentence)) : false;
  }

  private containsMeasurements(text: string): boolean {
    return /\d+(?:\.\d+)?\s*(?:mmHg|mg|mcg|L\/min|%|units?)\b/i.test(text);
  }

  private containsSeverityIndicators(text: string): boolean {
    return /\b(?:mild|moderate|severe|critical|normal|abnormal|significant)\b/i.test(text);
  }

  private groupSentencesByClinicalArea(sentences: string[]): { primary: string[]; secondary: string[] } {
    const primary: string[] = [];
    const secondary: string[] = [];

    for (const sentence of sentences) {
      if (this.containsMedicalTerminology(sentence) && this.containsMeasurements(sentence)) {
        primary.push(sentence);
      } else {
        secondary.push(sentence);
      }
    }

    return { primary, secondary };
  }

  private cleanSummaryFormatting(summary: string): string {
    return summary
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\s*([a-z])/g, '$1 $2')
      .trim();
  }

  private applyAustralianSpelling(text: string): string {
    const australianSpellings: Record<string, string> = {
      'esophageal': 'oesophageal',
      'esophagus': 'oesophagus',
      'anesthesia': 'anaesthesia',
      'anesthetic': 'anaesthetic',
      'hemorrhage': 'haemorrhage',
      'hemoglobin': 'haemoglobin'
    };

    let result = text;
    for (const [us, au] of Object.entries(australianSpellings)) {
      const pattern = new RegExp(`\\b${us}\\b`, 'gi');
      result = result.replace(pattern, au);
    }

    return result;
  }

  private extractMedicalTerms(text: string): string[] {
    // Use legacy pattern service sync extraction for compatibility in sync code paths
    try {
      const legacyTerms = this.patternService.extractMedicalTermsLegacy(text);
      return legacyTerms;
    } catch (error) {
      logger.warn('Medical term extraction failed, using fallback', { error });
      // Fallback to basic pattern matching
      const patterns = [
        /\b(?:LAD|RCA|LCX|LMS|TAVI|PCI|CABG|TTE|TOE|CTCA)\b/gi,
        /\b(?:stenosis|regurgitation|insufficiency|gradient|EF)\b/gi,
        /\b(?:moderate|severe|mild)\s+(?:stenosis|regurgitation)\b/gi
      ];
      
      const terms: string[] = [];
      for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches) terms.push(...matches);
      }
      
      return [...new Set(terms)];
    }
  }

  private countDetectedPatterns(text: string, config: MedicalSummaryConfig): number {
    let count = 0;
    const allPatterns = Object.values(this.clinicalPatterns).flat();
    
    for (const pattern of allPatterns) {
      const matches = text.match(pattern);
      if (matches) count += matches.length;
    }
    
    return count;
  }

  private deduplicateFindings(findings: ClinicalFinding[]): ClinicalFinding[] {
    const seen = new Set<string>();
    return findings.filter(finding => {
      const key = `${finding.category}:${finding.finding.toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private getBasicQualityMetrics(): SummaryQualityMetrics {
    return {
      clinicalAccuracy: 85,
      completeness: 80,
      conciseness: 75,
      readability: 80,
      medicalTerminologyUse: 70,
      overallQuality: 78,
      warnings: [],
      recommendations: []
    };
  }

  private generateCacheKey(text: string, config: MedicalSummaryConfig): string {
    const configString = JSON.stringify({
      agentType: config.agentType,
      summaryLength: config.summaryLength,
      focusAreas: config.focusAreas,
      extractFindings: config.extractFindings,
      includeMetrics: config.includeMetrics
    });
    
    const textHash = text.length.toString() + text.slice(0, 100).replace(/\s/g, '');
    return `${textHash}_${btoa(configString)}`;
  }

  /**
   * Clear summary cache
   */
  clearCache(): void {
    this.summaryCache.clear();
    logger.info('Medical summary extractor cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; memoryEstimate: number } {
    const size = this.summaryCache.size;
    const memoryEstimate = size * 2048; // Rough estimate: 2KB per cached summary
    return { size, memoryEstimate };
  }
}

// Convenience exports
export const medicalSummaryExtractor = MedicalSummaryExtractor.getInstance();

// Legacy compatibility functions for Phase 3 migration
export async function extractMedicalSummary(
  text: string,
  agentType?: AgentType,
  summaryType: 'brief' | 'standard' | 'comprehensive' = 'standard'
): Promise<string> {
  const result = await medicalSummaryExtractor.extractSummary(text, {
    agentType,
    summaryLength: summaryType,
    extractFindings: true,
    includeMetrics: false,
    australianCompliance: true
  });
  
  return result.summary;
}

export async function extractClinicalFindings(
  text: string,
  focusAreas?: ClinicalFocusArea[]
): Promise<ClinicalFinding[]> {
  const result = await medicalSummaryExtractor.extractSummary(text, {
    summaryLength: 'standard',
    focusAreas,
    extractFindings: true,
    includeMetrics: false
  });
  
  return result.findings;
}
