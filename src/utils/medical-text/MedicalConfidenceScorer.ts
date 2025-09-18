import { Logger } from '@/utils/Logger';
import { CacheManager } from '@/utils/performance/CacheManager';
import { PerformanceMonitor } from '@/utils/performance/PerformanceMonitor';
import { MedicalPatternService } from './MedicalPatternService';
import { ContextualMedicalAnalyzer } from './ContextualMedicalAnalyzer';
import { MedicalTerminologyDisambiguator } from './MedicalTerminologyDisambiguator';
import { MedicalKnowledgeGraph } from './MedicalKnowledgeGraph';

export interface ConfidenceMetrics {
  overallConfidence: number;
  semanticAccuracy: number;
  terminologyAccuracy: number;
  clinicalReasoningAccuracy: number;
  australianCompliance: number;
  factualAccuracy: number;
  coherenceScore: number;
  completenessScore: number;
  consistencyScore: number;
}

export interface ValidationResult {
  isValid: boolean;
  confidence: ConfidenceMetrics;
  issues: ValidationIssue[];
  recommendations: string[];
  medicalAccuracyFlags: MedicalAccuracyFlag[];
  australianComplianceFlags: ComplianceFlag[];
}

export interface ValidationIssue {
  type: IssueType;
  severity: IssueSeverity;
  description: string;
  location: TextLocation;
  suggestion: string;
  confidence: number;
  medicalDomain?: MedicalDomain;
}

export interface MedicalAccuracyFlag {
  type: AccuracyFlagType;
  description: string;
  severity: 'critical' | 'major' | 'minor' | 'informational';
  medicalRationale: string;
  suggestedCorrection?: string;
  clinicalEvidence?: string[];
  australianGuideline?: string;
}

export interface ComplianceFlag {
  guidelineId: string;
  guidelineName: string;
  complianceLevel: 'compliant' | 'partial' | 'non_compliant' | 'unclear';
  description: string;
  requirement: string;
  recommendation: string;
}

export interface TextLocation {
  start: number;
  end: number;
  line?: number;
  column?: number;
  context: string;
}

export type IssueType = 
  | 'terminology_inconsistency'
  | 'clinical_reasoning_gap'
  | 'factual_inaccuracy'
  | 'australian_compliance_issue'
  | 'semantic_ambiguity'
  | 'completeness_issue'
  | 'coherence_problem'
  | 'measurement_inconsistency'
  | 'medication_safety_concern'
  | 'procedural_accuracy_issue';

export type IssueSeverity = 'critical' | 'major' | 'minor' | 'informational';

export type AccuracyFlagType = 
  | 'anatomical_reference'
  | 'medication_dosage'
  | 'measurement_unit'
  | 'procedural_step'
  | 'diagnostic_criteria'
  | 'contraindication'
  | 'clinical_guideline'
  | 'drug_interaction'
  | 'normal_ranges'
  | 'terminology_precision';

export type MedicalDomain = 
  | 'cardiology'
  | 'interventional_cardiology'
  | 'general_medicine'
  | 'pharmacology'
  | 'radiology'
  | 'pathology'
  | 'emergency_medicine'
  | 'surgery';

export interface ConfidenceScoringConfig {
  enableSemanticValidation?: boolean;
  enableTerminologyValidation?: boolean;
  enableClinicalReasoningValidation?: boolean;
  enableAustralianComplianceCheck?: boolean;
  enableFactualAccuracyCheck?: boolean;
  confidenceThreshold?: number;
  severityFilter?: IssueSeverity[];
  medicalDomains?: MedicalDomain[];
  includeRecommendations?: boolean;
  detailedAnalysis?: boolean;
}

export class MedicalConfidenceScorer {
  private static instance: MedicalConfidenceScorer;
  private cacheManager: CacheManager;
  private performanceMonitor: PerformanceMonitor;
  private medicalPatternService: MedicalPatternService;
  private clinicalAnalyzer: ContextualMedicalAnalyzer;
  private terminologyDisambiguator: MedicalTerminologyDisambiguator;
  private knowledgeGraph: MedicalKnowledgeGraph;

  private constructor() {
    this.cacheManager = CacheManager.getInstance();
    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.medicalPatternService = MedicalPatternService.getInstance();
    this.clinicalAnalyzer = ContextualMedicalAnalyzer.getInstance();
    this.terminologyDisambiguator = MedicalTerminologyDisambiguator.getInstance();
    this.knowledgeGraph = MedicalKnowledgeGraph.getInstance();
  }

  public static getInstance(): MedicalConfidenceScorer {
    if (!MedicalConfidenceScorer.instance) {
      MedicalConfidenceScorer.instance = new MedicalConfidenceScorer();
    }
    return MedicalConfidenceScorer.instance;
  }

  async validateMedicalAccuracy(
    text: string,
    config: ConfidenceScoringConfig = {}
  ): Promise<ValidationResult> {
    const operationId = `validate_medical_accuracy_${Date.now()}`;
    const cacheKey = `medical_validation:${this.generateCacheKey(text, config)}`;

    try {
      this.performanceMonitor.startOperation(operationId, 'medical_validation');

      // Check cache first
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        Logger.info('🎯 Medical validation cache hit', { cacheKey });
        return cached as ValidationResult;
      }

      const issues: ValidationIssue[] = [];
      const medicalAccuracyFlags: MedicalAccuracyFlag[] = [];
      const australianComplianceFlags: ComplianceFlag[] = [];
      const recommendations: string[] = [];

      // Extract medical patterns for analysis
      const medicalTerms = await this.medicalPatternService.extractMedicalTerms(text, {
        semanticAnalysis: true,
        includeRelationships: true,
        australianCompliance: true
      });

      // Perform comprehensive validation checks
      const validationTasks = [];

      if (config.enableSemanticValidation !== false) {
        validationTasks.push(this.validateSemanticAccuracy(text, medicalTerms, issues, medicalAccuracyFlags));
      }

      if (config.enableTerminologyValidation !== false) {
        validationTasks.push(this.validateTerminologyAccuracy(text, issues, medicalAccuracyFlags));
      }

      if (config.enableClinicalReasoningValidation !== false) {
        validationTasks.push(this.validateClinicalReasoning(text, issues, medicalAccuracyFlags));
      }

      if (config.enableAustralianComplianceCheck !== false) {
        validationTasks.push(this.validateAustralianCompliance(text, australianComplianceFlags, issues));
      }

      if (config.enableFactualAccuracyCheck !== false) {
        validationTasks.push(this.validateFactualAccuracy(text, medicalTerms, issues, medicalAccuracyFlags));
      }

      await Promise.all(validationTasks);

      // Calculate confidence metrics
      const confidence = await this.calculateConfidenceMetrics(text, issues, medicalAccuracyFlags);

      // Generate recommendations
      if (config.includeRecommendations !== false) {
        recommendations.push(...this.generateRecommendations(issues, medicalAccuracyFlags, australianComplianceFlags));
      }

      // Filter issues by severity if specified
      const filteredIssues = config.severityFilter 
        ? issues.filter(issue => config.severityFilter!.includes(issue.severity))
        : issues;

      const result: ValidationResult = {
        isValid: this.determineOverallValidity(confidence, filteredIssues),
        confidence,
        issues: filteredIssues,
        recommendations,
        medicalAccuracyFlags,
        australianComplianceFlags
      };

      // Cache the result
      await this.cacheManager.set(cacheKey, result, 20 * 60 * 1000); // 20 minutes

      this.performanceMonitor.endOperation(operationId);
      Logger.info('✅ Medical accuracy validation completed', { 
        operationId,
        overallConfidence: confidence.overallConfidence,
        issuesFound: filteredIssues.length,
        isValid: result.isValid
      });

      return result;

    } catch (error) {
      this.performanceMonitor.recordError(operationId, error as Error);
      Logger.error('❌ Medical accuracy validation failed', { error, operationId });
      throw error;
    }
  }

  private async validateSemanticAccuracy(
    text: string,
    medicalTerms: any[],
    issues: ValidationIssue[],
    accuracyFlags: MedicalAccuracyFlag[]
  ): Promise<void> {
    try {
      // Check for semantic inconsistencies
      const semanticAnalysis = await this.clinicalAnalyzer.analyzeClinicalReasoning(text, {
        includeAustralianGuidelines: true,
        detailLevel: 'comprehensive'
      });

      // Validate terminology usage consistency
      const terminologyMap = new Map<string, string[]>();
      medicalTerms.forEach(term => {
        const key = term.text.toLowerCase();
        if (!terminologyMap.has(key)) {
          terminologyMap.set(key, []);
        }
        terminologyMap.get(key)!.push(term.text);
      });

      // Check for inconsistent terminology usage
      terminologyMap.forEach((variants, term) => {
        if (variants.length > 1 && new Set(variants).size > 1) {
          issues.push({
            type: 'terminology_inconsistency',
            severity: 'minor',
            description: `Inconsistent terminology usage: ${variants.join(', ')}`,
            location: this.findTextLocation(text, variants[0]),
            suggestion: `Use consistent terminology throughout the text`,
            confidence: 0.8,
            medicalDomain: this.inferMedicalDomain(term)
          });
        }
      });

      // Validate semantic relationships
      if (semanticAnalysis.relationships) {
        for (const relationship of semanticAnalysis.relationships) {
          if (relationship.confidence < 0.6) {
            accuracyFlags.push({
              type: 'clinical_guideline',
              description: `Low confidence clinical relationship: ${relationship.type}`,
              severity: 'minor',
              medicalRationale: 'Clinical relationship may need verification',
              suggestedCorrection: 'Review and clarify the clinical relationship',
              australianGuideline: relationship.australianGuideline
            });
          }
        }
      }

    } catch (error) {
      Logger.error('❌ Semantic accuracy validation failed', { error });
    }
  }

  private async validateTerminologyAccuracy(
    text: string,
    issues: ValidationIssue[],
    accuracyFlags: MedicalAccuracyFlag[]
  ): Promise<void> {
    try {
      // Extract potential medical terms and validate them
      const medicalTermPattern = /\b(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*|[A-Z]{2,})\b/g;
      const potentialTerms = text.match(medicalTermPattern) || [];

      for (const term of potentialTerms) {
        const disambiguation = await this.terminologyDisambiguator.disambiguateTerm(term, text, {
          includeAustralianTerminology: true,
          contextWindow: 50
        });

        if (disambiguation.confidence < 0.7 && disambiguation.alternatives.length > 0) {
          issues.push({
            type: 'semantic_ambiguity',
            severity: 'minor',
            description: `Ambiguous medical term: "${term}"`,
            location: this.findTextLocation(text, term),
            suggestion: `Consider using: ${disambiguation.alternatives.slice(0, 2).map(alt => alt.term).join(' or ')}`,
            confidence: disambiguation.confidence,
            medicalDomain: disambiguation.domain
          });
        }

        // Check for terminology precision
        if (disambiguation.australianVariant && disambiguation.australianVariant !== term) {
          accuracyFlags.push({
            type: 'terminology_precision',
            description: `Australian terminology variant available: "${disambiguation.australianVariant}"`,
            severity: 'informational',
            medicalRationale: 'Australian medical terminology standards recommend local variants',
            suggestedCorrection: disambiguation.australianVariant,
            australianGuideline: 'Australian Medical Terminology Standards'
          });
        }
      }

    } catch (error) {
      Logger.error('❌ Terminology accuracy validation failed', { error });
    }
  }

  private async validateClinicalReasoning(
    text: string,
    issues: ValidationIssue[],
    accuracyFlags: MedicalAccuracyFlag[]
  ): Promise<void> {
    try {
      const reasoning = await this.clinicalAnalyzer.analyzeClinicalReasoning(text, {
        includeAustralianGuidelines: true,
        detailLevel: 'expert'
      });

      // Check for clinical reasoning gaps
      if (reasoning.patterns) {
        for (const pattern of reasoning.patterns) {
          if (pattern.confidence < 0.6) {
            issues.push({
              type: 'clinical_reasoning_gap',
              severity: 'major',
              description: `Weak clinical reasoning pattern detected: ${pattern.type}`,
              location: { start: 0, end: text.length, context: text.substring(0, 100) },
              suggestion: 'Strengthen clinical justification and evidence',
              confidence: pattern.confidence
            });
          }

          // Check for missing components in clinical reasoning
          if (pattern.components && pattern.components.length < 2) {
            accuracyFlags.push({
              type: 'clinical_guideline',
              description: 'Clinical reasoning may lack sufficient supporting components',
              severity: 'minor',
              medicalRationale: 'Comprehensive clinical reasoning should include multiple supporting elements',
              suggestedCorrection: 'Add supporting clinical evidence or rationale'
            });
          }
        }
      }

      // Validate workflow completeness
      if (reasoning.workflow && reasoning.workflow.steps) {
        const criticalSteps = reasoning.workflow.steps.filter(step => step.isCritical);
        if (criticalSteps.length === 0) {
          issues.push({
            type: 'completeness_issue',
            severity: 'major',
            description: 'No critical clinical steps identified in workflow',
            location: { start: 0, end: text.length, context: text.substring(0, 100) },
            suggestion: 'Ensure critical clinical decision points are clearly documented',
            confidence: 0.8
          });
        }
      }

    } catch (error) {
      Logger.error('❌ Clinical reasoning validation failed', { error });
    }
  }

  private async validateAustralianCompliance(
    text: string,
    complianceFlags: ComplianceFlag[],
    issues: ValidationIssue[]
  ): Promise<void> {
    try {
      // Check for Australian medical guideline compliance
      const australianGuidelines = [
        {
          id: 'NHMRC_001',
          name: 'NHMRC Clinical Practice Guidelines',
          keywords: ['evidence-based', 'clinical practice', 'guideline'],
          requirement: 'Evidence-based clinical decision making'
        },
        {
          id: 'TGA_001', 
          name: 'TGA Medication Guidelines',
          keywords: ['medication', 'drug', 'pharmaceutical', 'dosage'],
          requirement: 'TGA-approved medication references'
        },
        {
          id: 'ACSQHC_001',
          name: 'Australian Commission Safety & Quality',
          keywords: ['safety', 'quality', 'patient care', 'adverse event'],
          requirement: 'Patient safety and quality standards'
        }
      ];

      for (const guideline of australianGuidelines) {
        const hasRelevantContent = guideline.keywords.some(keyword => 
          text.toLowerCase().includes(keyword.toLowerCase())
        );

        if (hasRelevantContent) {
          // For now, mark as requiring review - in a real system this would check against actual guidelines
          complianceFlags.push({
            guidelineId: guideline.id,
            guidelineName: guideline.name,
            complianceLevel: 'unclear',
            description: `Content relevant to ${guideline.name} detected`,
            requirement: guideline.requirement,
            recommendation: `Verify compliance with ${guideline.name} standards`
          });
        }
      }

      // Check for Australian spelling patterns
      const americanAustralianSpellings = [
        { american: 'ize', australian: 'ise' },
        { american: 'ization', australian: 'isation' },
        { american: 'olor', australian: 'olour' },
        { american: 'center', australian: 'centre' }
      ];

      for (const spelling of americanAustralianSpellings) {
        if (text.includes(spelling.american)) {
          issues.push({
            type: 'australian_compliance_issue',
            severity: 'informational',
            description: `American spelling detected: consider Australian variant`,
            location: this.findTextLocation(text, spelling.american),
            suggestion: `Use Australian spelling: ${spelling.australian}`,
            confidence: 0.9
          });
        }
      }

    } catch (error) {
      Logger.error('❌ Australian compliance validation failed', { error });
    }
  }

  private async validateFactualAccuracy(
    text: string,
    medicalTerms: any[],
    issues: ValidationIssue[],
    accuracyFlags: MedicalAccuracyFlag[]
  ): Promise<void> {
    try {
      // Validate measurement units and normal ranges
      const measurementPattern = /(\d+(?:\.\d+)?)\s*(mg|mcg|ml|mmol|mmHg|bpm|%)/gi;
      const measurements = text.match(measurementPattern) || [];

      for (const measurement of measurements) {
        const result = await this.validateMeasurementAccuracy(measurement, text);
        if (!result.isValid) {
          accuracyFlags.push({
            type: 'measurement_unit',
            description: result.issue,
            severity: result.severity as any,
            medicalRationale: result.rationale,
            suggestedCorrection: result.suggestion
          });
        }
      }

      // Use knowledge graph to validate medical relationships
      for (const term of medicalTerms.slice(0, 5)) { // Limit to prevent excessive API calls
        try {
          const graphResult = await this.knowledgeGraph.queryGraph(term.text, {
            maxDepth: 1,
            australianFocus: true
          });

          if (graphResult.concepts.length === 0) {
            accuracyFlags.push({
              type: 'anatomical_reference',
              description: `Medical term not found in knowledge base: "${term.text}"`,
              severity: 'informational',
              medicalRationale: 'Term may require verification against medical references',
              suggestedCorrection: 'Verify spelling and medical accuracy of term'
            });
          }
        } catch (error) {
          // Silently continue if knowledge graph query fails
        }
      }

    } catch (error) {
      Logger.error('❌ Factual accuracy validation failed', { error });
    }
  }

  private async validateMeasurementAccuracy(
    measurement: string,
    context: string
  ): Promise<{
    isValid: boolean;
    issue?: string;
    severity?: string;
    rationale?: string;
    suggestion?: string;
  }> {
    // Basic measurement validation - in a real system this would check against medical reference ranges
    const numericValue = parseFloat(measurement);
    const unit = measurement.match(/[a-zA-Z%]+$/)?.[0]?.toLowerCase();

    // Example validation rules
    const validationRules = {
      'mg': { min: 0.1, max: 5000, typical: [1, 500] },
      'mcg': { min: 0.1, max: 1000, typical: [1, 100] },
      'mmhg': { min: 0, max: 300, typical: [60, 200] },
      'bpm': { min: 20, max: 250, typical: [50, 120] },
      '%': { min: 0, max: 100, typical: [0, 100] }
    };

    if (unit && validationRules[unit as keyof typeof validationRules]) {
      const rule = validationRules[unit as keyof typeof validationRules];
      
      if (numericValue < rule.min || numericValue > rule.max) {
        return {
          isValid: false,
          issue: `Measurement value outside expected range: ${measurement}`,
          severity: 'major',
          rationale: `${unit.toUpperCase()} values typically range from ${rule.min} to ${rule.max}`,
          suggestion: `Verify measurement accuracy`
        };
      }

      if (numericValue < rule.typical[0] || numericValue > rule.typical[1]) {
        return {
          isValid: false,
          issue: `Measurement value outside typical range: ${measurement}`,
          severity: 'minor',
          rationale: `${unit.toUpperCase()} values typically range from ${rule.typical[0]} to ${rule.typical[1]}`,
          suggestion: `Consider reviewing measurement for clinical context`
        };
      }
    }

    return { isValid: true };
  }

  private async calculateConfidenceMetrics(
    text: string,
    issues: ValidationIssue[],
    accuracyFlags: MedicalAccuracyFlag[]
  ): Promise<ConfidenceMetrics> {
    const totalIssues = issues.length;
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const majorIssues = issues.filter(i => i.severity === 'major').length;
    const minorIssues = issues.filter(i => i.severity === 'minor').length;

    const criticalAccuracyFlags = accuracyFlags.filter(f => f.severity === 'critical').length;
    const majorAccuracyFlags = accuracyFlags.filter(f => f.severity === 'major').length;

    // Calculate base confidence (higher is better)
    const baseConfidence = Math.max(0, 1.0 - (
      (criticalIssues * 0.3) + 
      (majorIssues * 0.2) + 
      (minorIssues * 0.1) +
      (criticalAccuracyFlags * 0.25) +
      (majorAccuracyFlags * 0.15)
    ));

    // Calculate specific accuracy metrics
    const semanticAccuracy = this.calculateSemanticAccuracy(issues, accuracyFlags);
    const terminologyAccuracy = this.calculateTerminologyAccuracy(issues, accuracyFlags);
    const clinicalReasoningAccuracy = this.calculateClinicalReasoningAccuracy(issues, accuracyFlags);
    const australianCompliance = this.calculateAustralianCompliance(issues, accuracyFlags);
    const factualAccuracy = this.calculateFactualAccuracy(issues, accuracyFlags);

    // Text analysis metrics
    const coherenceScore = await this.calculateCoherenceScore(text);
    const completenessScore = await this.calculateCompletenessScore(text);
    const consistencyScore = this.calculateConsistencyScore(text, issues);

    const overallConfidence = Math.min(1.0, Math.max(0.1, 
      (baseConfidence * 0.4) +
      (semanticAccuracy * 0.15) +
      (terminologyAccuracy * 0.15) +
      (clinicalReasoningAccuracy * 0.1) +
      (australianCompliance * 0.05) +
      (factualAccuracy * 0.15)
    ));

    return {
      overallConfidence,
      semanticAccuracy,
      terminologyAccuracy,
      clinicalReasoningAccuracy,
      australianCompliance,
      factualAccuracy,
      coherenceScore,
      completenessScore,
      consistencyScore
    };
  }

  private calculateSemanticAccuracy(issues: ValidationIssue[], accuracyFlags: MedicalAccuracyFlag[]): number {
    const semanticIssues = issues.filter(i => 
      i.type === 'semantic_ambiguity' || i.type === 'terminology_inconsistency'
    ).length;
    const semanticFlags = accuracyFlags.filter(f => 
      f.type === 'terminology_precision' || f.type === 'anatomical_reference'
    ).length;
    
    return Math.max(0.1, 1.0 - (semanticIssues * 0.2 + semanticFlags * 0.1));
  }

  private calculateTerminologyAccuracy(issues: ValidationIssue[], accuracyFlags: MedicalAccuracyFlag[]): number {
    const terminologyIssues = issues.filter(i => 
      i.type === 'terminology_inconsistency'
    ).length;
    const terminologyFlags = accuracyFlags.filter(f => 
      f.type === 'terminology_precision'
    ).length;
    
    return Math.max(0.1, 1.0 - (terminologyIssues * 0.25 + terminologyFlags * 0.1));
  }

  private calculateClinicalReasoningAccuracy(issues: ValidationIssue[], accuracyFlags: MedicalAccuracyFlag[]): number {
    const reasoningIssues = issues.filter(i => 
      i.type === 'clinical_reasoning_gap' || i.type === 'completeness_issue'
    ).length;
    const reasoningFlags = accuracyFlags.filter(f => 
      f.type === 'clinical_guideline' || f.type === 'procedural_step'
    ).length;
    
    return Math.max(0.1, 1.0 - (reasoningIssues * 0.3 + reasoningFlags * 0.15));
  }

  private calculateAustralianCompliance(issues: ValidationIssue[], accuracyFlags: MedicalAccuracyFlag[]): number {
    const complianceIssues = issues.filter(i => 
      i.type === 'australian_compliance_issue'
    ).length;
    const complianceFlags = accuracyFlags.filter(f => 
      f.australianGuideline
    ).length;
    
    return Math.max(0.3, 1.0 - (complianceIssues * 0.2 + complianceFlags * 0.1));
  }

  private calculateFactualAccuracy(issues: ValidationIssue[], accuracyFlags: MedicalAccuracyFlag[]): number {
    const factualIssues = issues.filter(i => 
      i.type === 'factual_inaccuracy' || i.type === 'measurement_inconsistency'
    ).length;
    const factualFlags = accuracyFlags.filter(f => 
      f.type === 'measurement_unit' || f.type === 'normal_ranges'
    ).length;
    
    return Math.max(0.1, 1.0 - (factualIssues * 0.4 + factualFlags * 0.2));
  }

  private async calculateCoherenceScore(text: string): Promise<number> {
    // Simple coherence calculation based on sentence structure and medical flow
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return 0.1;

    const averageSentenceLength = sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0) / sentences.length;
    
    // Optimal medical text has sentences between 10-25 words
    const lengthScore = averageSentenceLength >= 10 && averageSentenceLength <= 25 ? 1.0 : 
                      Math.max(0.3, 1.0 - Math.abs(averageSentenceLength - 17.5) / 20);

    return Math.min(1.0, lengthScore);
  }

  private async calculateCompletenessScore(text: string): Promise<number> {
    // Basic completeness check based on text length and medical content density
    const wordCount = text.trim().split(/\s+/).length;
    const medicalTermDensity = (text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || []).length / wordCount;
    
    const lengthScore = wordCount >= 50 ? 1.0 : Math.max(0.3, wordCount / 50);
    const densityScore = medicalTermDensity >= 0.1 ? 1.0 : Math.max(0.5, medicalTermDensity * 10);
    
    return Math.min(1.0, (lengthScore + densityScore) / 2);
  }

  private calculateConsistencyScore(text: string, issues: ValidationIssue[]): number {
    const consistencyIssues = issues.filter(i => 
      i.type === 'terminology_inconsistency' || 
      i.type === 'measurement_inconsistency'
    ).length;
    
    return Math.max(0.3, 1.0 - (consistencyIssues * 0.2));
  }

  private determineOverallValidity(
    confidence: ConfidenceMetrics,
    issues: ValidationIssue[]
  ): boolean {
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const majorIssues = issues.filter(i => i.severity === 'major').length;
    
    // Text is considered valid if:
    // - No critical issues
    // - Less than 3 major issues
    // - Overall confidence above 0.6
    return criticalIssues === 0 && 
           majorIssues < 3 && 
           confidence.overallConfidence >= 0.6;
  }

  private generateRecommendations(
    issues: ValidationIssue[],
    accuracyFlags: MedicalAccuracyFlag[],
    complianceFlags: ComplianceFlag[]
  ): string[] {
    const recommendations: string[] = [];

    // Issue-based recommendations
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const majorIssues = issues.filter(i => i.severity === 'major');

    if (criticalIssues.length > 0) {
      recommendations.push('🚨 Address critical medical accuracy issues before proceeding');
    }

    if (majorIssues.length > 0) {
      recommendations.push('⚠️ Review and resolve major clinical concerns');
    }

    // Accuracy flag recommendations
    const criticalFlags = accuracyFlags.filter(f => f.severity === 'critical');
    const majorFlags = accuracyFlags.filter(f => f.severity === 'major');

    if (criticalFlags.length > 0) {
      recommendations.push('🏥 Critical medical accuracy flags require immediate attention');
    }

    if (majorFlags.length > 0) {
      recommendations.push('📋 Review clinical guidelines and accuracy concerns');
    }

    // Compliance recommendations
    const nonCompliantFlags = complianceFlags.filter(f => f.complianceLevel === 'non_compliant');
    const partialComplianceFlags = complianceFlags.filter(f => f.complianceLevel === 'partial');

    if (nonCompliantFlags.length > 0) {
      recommendations.push('🇦🇺 Address Australian medical guideline compliance issues');
    }

    if (partialComplianceFlags.length > 0) {
      recommendations.push('📚 Review Australian medical standards for full compliance');
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('✅ Medical content appears accurate - consider final clinical review');
    }

    return recommendations;
  }

  private findTextLocation(text: string, searchTerm: string): TextLocation {
    const index = text.toLowerCase().indexOf(searchTerm.toLowerCase());
    if (index === -1) {
      return {
        start: 0,
        end: 0,
        context: text.substring(0, 50)
      };
    }

    const start = index;
    const end = index + searchTerm.length;
    const contextStart = Math.max(0, start - 25);
    const contextEnd = Math.min(text.length, end + 25);
    const context = text.substring(contextStart, contextEnd);

    return {
      start,
      end,
      context
    };
  }

  private inferMedicalDomain(term: string): MedicalDomain {
    const cardiologyTerms = ['cardiac', 'heart', 'coronary', 'artery', 'valve', 'ecg', 'ekg'];
    const pharmacologyTerms = ['mg', 'mcg', 'dose', 'medication', 'drug', 'tablet'];
    const radiologyTerms = ['ct', 'mri', 'xray', 'scan', 'image', 'contrast'];

    const lowerTerm = term.toLowerCase();

    if (cardiologyTerms.some(t => lowerTerm.includes(t))) return 'cardiology';
    if (pharmacologyTerms.some(t => lowerTerm.includes(t))) return 'pharmacology';
    if (radiologyTerms.some(t => lowerTerm.includes(t))) return 'radiology';

    return 'general_medicine';
  }

  private generateCacheKey(text: string, config: ConfidenceScoringConfig): string {
    const textHash = text.length > 100 ? 
      `${text.substring(0, 50)}...${text.substring(text.length - 50)}_${text.length}` : text;
    const configHash = JSON.stringify(config);
    return `${textHash}_${configHash}`.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  async calculateQuickConfidence(text: string): Promise<number> {
    const cacheKey = `quick_confidence:${this.generateCacheKey(text, {})}`;
    
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached as number;
    }

    // Quick confidence calculation without full validation
    const wordCount = text.trim().split(/\s+/).length;
    const medicalTermCount = (text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || []).length;
    const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;

    const lengthScore = Math.min(1.0, wordCount / 100);
    const medicalDensity = medicalTermCount / wordCount;
    const structureScore = sentenceCount >= 2 ? 1.0 : 0.5;

    const quickConfidence = (lengthScore + Math.min(1.0, medicalDensity * 5) + structureScore) / 3;

    await this.cacheManager.set(cacheKey, quickConfidence, 10 * 60 * 1000); // 10 minutes
    return quickConfidence;
  }
}