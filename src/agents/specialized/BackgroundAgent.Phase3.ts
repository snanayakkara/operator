/**
 * Phase 3 Migration: BackgroundAgent with Enhanced Summary Extraction
 * 
 * Migrates BackgroundAgent to Phase 3 architecture with:
 * - MedicalSummaryExtractor integration for intelligent clinical finding extraction
 * - Enhanced medical background pattern recognition 
 * - Quality assessment and validation for background histories
 * - Hybrid processing with legacy fallback for safety
 */

import { BackgroundAgent } from './BackgroundAgent';
import { MedicalSummaryExtractor, MedicalSummaryConfig, ClinicalFocusArea } from '@/utils/text-extraction/MedicalSummaryExtractor';
import { preNormalizeMedicalText } from '@/utils/medical-text/Phase2TextNormalizer';
import type { 
  MedicalContext, 
  MedicalReport, 
  ReportSection, 
  ChatMessage 
} from '@/types/medical.types';

/**
 * Phase 3 BackgroundAgent with intelligent clinical finding extraction
 * and enhanced medical background processing capabilities
 */
export class BackgroundAgentPhase3 extends BackgroundAgent {
  private medicalSummaryExtractor: MedicalSummaryExtractor;

  constructor() {
    super();
    // Phase 3 capabilities wiring
    this.medicalSummaryExtractor = MedicalSummaryExtractor.getInstance();
  }

  async process(input: string, context?: MedicalContext): Promise<MedicalReport> {
    const startTime = Date.now();
    console.log('🏥 BackgroundAgent.Phase3 processing input:', input?.substring(0, 100) + '...');
    
    try {
      // Determine processing approach based on feature flags or context
      const usePhase3 = this.shouldUsePhase3Processing(context);
      
      if (usePhase3) {
        const phase3Result = await this.processWithPhase3(input, context, 'PHASE3');
        if (phase3Result) {
          const processingTime = Date.now() - startTime;
          console.log(`✅ BackgroundAgent.Phase3 completed successfully in ${processingTime}ms`);
          return phase3Result;
        }
      }
      
      // Fallback to legacy processing
      console.log('📋 BackgroundAgent.Phase3 falling back to legacy processing');
      return await super.process(input, context);

    } catch (error) {
      console.error('❌ BackgroundAgent.Phase3 processing failed, falling back to legacy:', error);
      return await super.process(input, context);
    }
  }

  /**
   * Phase 3 processing with enhanced background analysis
   */
  private async processWithPhase3(
    input: string, 
    context?: MedicalContext,
    processingType: string = 'PHASE3'
  ): Promise<MedicalReport | null> {
    try {
      console.log(`🧠 Starting ${processingType} background processing`);

      // Enhanced normalization combining Phase 2 + Background-specific
      const normalizedInput = await this.enhancedNormalization(input);
      console.log('📝 Enhanced background normalization completed');

      // Extract clinical findings with background-focused configuration
      const summaryResult = await this.extractBackgroundFindings(normalizedInput, context);
      console.log('🔍 Background clinical findings extracted');

      // Generate structured background format with AI
      const structuredBackground = await this.lmStudioService.processWithAgent(
        this.systemPrompt,
        normalizedInput,
        'background'
      );

      // Validate background format and quality
      const validation = this.validateBackgroundFormat(structuredBackground, summaryResult);
      if (!validation.isValid) {
        console.warn('⚠️ Background format validation failed, falling back to legacy');
        return null;
      }

      // Create enhanced report with Phase 3 intelligence
      const sections = await this.parseEnhancedResponse(structuredBackground, summaryResult, context);
      
      const report = this.createReport(
        structuredBackground.trim(),
        sections,
        context,
        0, // caller computes total processing time
        validation.confidence
      );

      // Enhanced metadata with Phase 3 insights
      report.metadata = {
        ...report.metadata,
        phase3Processing: {
          summaryExtraction: true,
          clinicalFindings: summaryResult.findings.length,
          qualityScore: summaryResult.qualityMetrics?.clinicalAccuracy ?? 0,
          backgroundCategories: this.categorizeBackgroundFindings(summaryResult.findings),
          processingType
        },
        validationResults: {
          formatValid: validation.isValid,
          confidence: validation.confidence,
          issues: validation.issues,
          warnings: validation.warnings
        }
      };

      console.log('✅ Phase 3 background processing completed successfully');
      return report;

    } catch (error) {
      console.error('❌ Phase 3 background processing failed:', error);
      return null;
    }
  }

  /**
   * Enhanced normalization combining Phase 2 + Background-specific rules
   */
  private async enhancedNormalization(input: string): Promise<string> {
    // Apply Phase 2 normalization first
    let normalized = preNormalizeMedicalText(input);

    // Background-specific normalization patterns
    const backgroundPatterns = [
      // Medical condition standardization
      { pattern: /\bhypertension\b/gi, replacement: 'hypertension' },
      { pattern: /\bhigh blood pressure\b/gi, replacement: 'hypertension' },
      { pattern: /\bdiabetes mellitus\b/gi, replacement: 'diabetes' },
      { pattern: /\btype 2 diabetes\b/gi, replacement: 'diabetes' },
      { pattern: /\batrial fibrillation\b/gi, replacement: 'atrial fibrillation' },
      { pattern: /\ba\s*f\b/gi, replacement: 'atrial fibrillation' },
      { pattern: /\bcoronary artery disease\b/gi, replacement: 'coronary artery disease' },
      { pattern: /\bc\s*a\s*d\b/gi, replacement: 'coronary artery disease' },
      { pattern: /\bischemic heart disease\b/gi, replacement: 'ischaemic heart disease' },
      { pattern: /\bchronic kidney disease\b/gi, replacement: 'chronic kidney disease' },
      { pattern: /\bc\s*k\s*d\b/gi, replacement: 'chronic kidney disease' },
      
      // Procedure standardization
      { pattern: /\bcabg\b/gi, replacement: 'coronary artery bypass graft' },
      { pattern: /\bpci\b/gi, replacement: 'percutaneous coronary intervention' },
      { pattern: /\bmitral valve repair\b/gi, replacement: 'mitral valve repair' },
      { pattern: /\baortic valve replacement\b/gi, replacement: 'aortic valve replacement' },
      
      // Social history standardization
      { pattern: /\bex\s*smoker\b/gi, replacement: 'ex-smoker' },
      { pattern: /\bnon\s*smoker\b/gi, replacement: 'non-smoker' },
      { pattern: /\boccasional alcohol\b/gi, replacement: 'occasional alcohol use' },
      { pattern: /\bno alcohol\b/gi, replacement: 'no alcohol use' }
    ];

    // Apply background-specific patterns
    backgroundPatterns.forEach(({ pattern, replacement }) => {
      normalized = normalized.replace(pattern, replacement);
    });

    return normalized;
  }

  /**
   * Extract clinical findings with background-focused configuration
   */
  private async extractBackgroundFindings(
    normalizedInput: string, 
    context?: MedicalContext
  ) {
    const config: MedicalSummaryConfig = {
      focusAreas: [
        'medical_history',
        'medications', 
        'social_history',
        'family_history',
        'procedures',
        'investigations',
        'risk_factors'
      ] as ClinicalFocusArea[],
      summaryLength: 'comprehensive',
      extractFindings: true,
      includeMetrics: true,
      preserveOriginalFormat: false,
      australianCompliance: true
    };

    return await this.medicalSummaryExtractor.extractSummary(normalizedInput, config);
  }

  /**
   * Validate background format and assess quality
   */
  private validateBackgroundFormat(
    structuredBackground: string, 
    summaryResult: any
  ): { 
    isValid: boolean; 
    confidence: number; 
    issues: string[]; 
    warnings: string[] 
  } {
    const issues: string[] = [];
    const warnings: string[] = [];
    let confidence = 0.7; // Base confidence

    // Check for proper ↪ arrow formatting
    const arrowCount = (structuredBackground.match(/↪/g) || []).length;
    if (arrowCount === 0) {
      issues.push('Missing ↪ arrow formatting for background conditions');
      confidence -= 0.2;
    } else if (arrowCount < 2) {
      warnings.push('Few background conditions identified - ensure completeness');
      confidence -= 0.1;
    }

    // Check for medical terminology preservation
    const medicalTermCount = summaryResult.findings.filter((f: any) => 
      f.category === 'medical_history' || f.category === 'medications'
    ).length;

    if (medicalTermCount < 2) {
      warnings.push('Limited medical terminology detected');
      confidence -= 0.1;
    }

    // Check for structured format consistency
    const lines = structuredBackground.split('\n').filter(line => line.trim());
    const malformedLines = lines.filter(line => {
      const hasArrow = line.includes('↪');
      const hasContent = line.replace('↪', '').trim().length > 5;
      return hasArrow && !hasContent;
    });

    if (malformedLines.length > 0) {
      issues.push(`${malformedLines.length} malformed background entries detected`);
      confidence -= 0.15;
    }

    // Quality threshold check
    const qualityScore = summaryResult.qualityMetrics?.clinicalAccuracy || 0.5;
    if (qualityScore < 0.6) {
      issues.push('Low clinical accuracy in background summary');
      confidence -= 0.2;
    }

    // Overall validation
    const isValid = issues.length === 0 && confidence > 0.5;

    return {
      isValid,
      confidence: Math.max(0.1, Math.min(1.0, confidence)),
      issues,
      warnings
    };
  }

  /**
   * Parse enhanced response with Phase 3 intelligence
   */
  private async parseEnhancedResponse(
    structuredBackground: string, 
    summaryResult: any,
    context?: MedicalContext
  ): Promise<ReportSection[]> {
    // Get base sections from legacy parsing
    const baseSections = this.parseResponse(structuredBackground, context);

    // Add Phase 3 enhanced sections
    const enhancedSections: ReportSection[] = [
      ...baseSections,
      {
        title: 'Clinical Insights',
        content: this.generateClinicalInsights(summaryResult),
        type: 'structured',
        priority: 'medium'
      }
    ];

    // Add condition categorization if available
    const medicalHistory = summaryResult.findings.filter((f: any) => f.category === 'medical_history');
    if (medicalHistory.length > 0) {
      enhancedSections.push({
        title: 'Condition Categories',
        content: this.categorizeConditions(medicalHistory),
        type: 'structured',
        priority: 'low'
      });
    }

    // Add risk factor analysis
    const riskFactors = summaryResult.findings.filter((f: any) => f.category === 'risk_factors');
    if (riskFactors.length > 0) {
      enhancedSections.push({
        title: 'Risk Factor Analysis',
        content: this.analyzeRiskFactors(riskFactors),
        type: 'structured',
        priority: 'medium'
      });
    }

    return enhancedSections;
  }

  /**
   * Generate clinical insights from extracted findings
   */
  private generateClinicalInsights(summaryResult: any): string {
    const insights: string[] = [];

    // Medical history insights
    const medicalHistory = summaryResult.findings.filter((f: any) => f.category === 'medical_history');
    if (medicalHistory.length > 0) {
      const cardiacConditions = medicalHistory.filter((f: any) => 
        f.finding.toLowerCase().includes('cardiac') ||
        f.finding.toLowerCase().includes('heart') ||
        f.finding.toLowerCase().includes('atrial') ||
        f.finding.toLowerCase().includes('coronary')
      );

      if (cardiacConditions.length > 0) {
        insights.push(`${cardiacConditions.length} cardiac condition(s) identified`);
      }

      const metabolicConditions = medicalHistory.filter((f: any) =>
        f.finding.toLowerCase().includes('diabetes') ||
        f.finding.toLowerCase().includes('hypertension') ||
        f.finding.toLowerCase().includes('kidney')
      );

      if (metabolicConditions.length > 0) {
        insights.push(`${metabolicConditions.length} metabolic/renal condition(s) identified`);
      }
    }

    // Quality insights
    const qualityScore = summaryResult.qualityMetrics?.clinicalAccuracy || 0;
    if (qualityScore > 0.8) {
      insights.push('High clinical accuracy detected');
    } else if (qualityScore < 0.6) {
      insights.push('Review recommended for clinical accuracy');
    }

    return insights.length > 0 ? insights.join(', ') : 'Background history processed successfully';
  }

  /**
   * Categorize background findings by medical domain
   */
  private categorizeBackgroundFindings(findings: any[]): { [key: string]: number } {
    const categories = {
      cardiac: 0,
      endocrine: 0,
      respiratory: 0,
      neurological: 0,
      renal: 0,
      gastrointestinal: 0,
      procedures: 0,
      social: 0,
      family: 0,
      other: 0
    };

    findings.forEach(finding => {
      const text = finding.finding.toLowerCase();
      
      if (text.includes('heart') || text.includes('cardiac') || text.includes('atrial') || text.includes('coronary')) {
        categories.cardiac++;
      } else if (text.includes('diabetes') || text.includes('thyroid') || text.includes('endocrine')) {
        categories.endocrine++;
      } else if (text.includes('asthma') || text.includes('copd') || text.includes('lung') || text.includes('respiratory')) {
        categories.respiratory++;
      } else if (text.includes('stroke') || text.includes('neurological') || text.includes('seizure')) {
        categories.neurological++;
      } else if (text.includes('kidney') || text.includes('renal') || text.includes('dialysis')) {
        categories.renal++;
      } else if (text.includes('bowel') || text.includes('stomach') || text.includes('liver') || text.includes('gastro')) {
        categories.gastrointestinal++;
      } else if (finding.category === 'procedures') {
        categories.procedures++;
      } else if (finding.category === 'social_history') {
        categories.social++;
      } else if (finding.category === 'family_history') {
        categories.family++;
      } else {
        categories.other++;
      }
    });

    return categories;
  }

  /**
   * Categorize conditions by clinical domain
   */
  private categorizeConditions(conditions: any[]): string {
    const categories = this.categorizeBackgroundFindings(conditions);
    const categoryDescriptions: string[] = [];

    Object.entries(categories).forEach(([category, count]: [string, number]) => {
      if (count > 0) {
        categoryDescriptions.push(`${category}: ${count}`);
      }
    });

    return categoryDescriptions.length > 0 
      ? categoryDescriptions.join(', ')
      : 'No specific condition categories identified';
  }

  /**
   * Analyze risk factors from background
   */
  private analyzeRiskFactors(riskFactors: any[]): string {
    const modifiableRisks: string[] = [];
    const nonModifiableRisks: string[] = [];

    riskFactors.forEach(risk => {
      const riskText = risk.finding.toLowerCase();
      
      if (riskText.includes('smoking') || riskText.includes('alcohol') || 
          riskText.includes('sedentary') || riskText.includes('diet')) {
        modifiableRisks.push(risk.finding);
      } else if (riskText.includes('age') || riskText.includes('family history') || 
                 riskText.includes('genetic')) {
        nonModifiableRisks.push(risk.finding);
      }
    });

    const analysis: string[] = [];
    if (modifiableRisks.length > 0) {
      analysis.push(`Modifiable risks: ${modifiableRisks.length}`);
    }
    if (nonModifiableRisks.length > 0) {
      analysis.push(`Non-modifiable risks: ${nonModifiableRisks.length}`);
    }

    return analysis.length > 0 
      ? analysis.join(', ')
      : 'Risk factor analysis completed';
  }

  /**
   * Determine if Phase 3 processing should be used
   */
  private shouldUsePhase3Processing(context?: MedicalContext): boolean {
    // Check for Phase 3 feature flag
    if (context?.processingMode === 'legacy') {
      return false;
    }

    // Default to Phase 3 for enhanced capabilities
    return true;
  }

  /**
   * Override buildMessages to include Phase 3 context
   */
  protected buildMessages(input: string, context?: MedicalContext): ChatMessage[] {
    const baseMessages = super.buildMessages(input, context);
    
    // Add Phase 3 enhancement context
    if (context?.phase3Enhancement) {
      baseMessages[0].content += '\n\nPhase 3 Enhancement: Focus on clinical accuracy, structured formatting with ↪ arrows, and preservation of medical terminology.';
    }

    return baseMessages;
  }
}
