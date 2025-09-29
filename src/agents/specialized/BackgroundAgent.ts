import { MedicalAgent } from '../base/MedicalAgent';
import { LMStudioService, MODEL_CONFIG } from '@/services/LMStudioService';
import { systemPromptLoader } from '@/services/SystemPromptLoader';
import { MedicalSummaryExtractor, MedicalSummaryConfig, ClinicalFocusArea } from '@/utils/text-extraction/MedicalSummaryExtractor';
import { preNormalizeMedicalText } from '@/utils/medical-text/Phase2TextNormalizer';
import type {
  MedicalContext,
  MedicalReport,
  ReportSection,
  ChatMessage
} from '@/types/medical.types';

/**
 * Specialized agent for processing voice-dictated medical background/history
 * into structured ↪ arrow format for clinical documentation.
 *
 * Enhanced with intelligent clinical finding extraction, enhanced medical
 * background pattern recognition, quality assessment and validation for
 * background histories, and hybrid processing with legacy fallback for safety.
 *
 * Handles medical conditions, medications, social history, family history, etc.
 * Formats raw transcription into structured format: "↪ Condition\n- details"
 */
export class BackgroundAgent extends MedicalAgent {
  protected lmStudioService: LMStudioService;
  private systemPromptInitialized = false;
  private medicalSummaryExtractor: MedicalSummaryExtractor;

  constructor() {
    super(
      'Background Medical History Agent',
      'Medical Background Documentation',
      'Formats voice-dictated medical background/history into structured ↪ arrow format with enhanced clinical analysis',
      'background',
      '' // Will be loaded dynamically
    );

    this.lmStudioService = LMStudioService.getInstance();
    this.medicalSummaryExtractor = MedicalSummaryExtractor.getInstance();
  }

  private async initializeSystemPrompt(): Promise<void> {
    if (this.systemPromptInitialized) return;

    try {
      this.systemPrompt = await systemPromptLoader.loadSystemPrompt('background', 'primary');
      this.systemPromptInitialized = true;
    } catch (error) {
      console.error('❌ BackgroundAgent: Failed to load system prompt:', error);
      this.systemPrompt = 'You are a medical background documentation assistant.'; // Fallback
    }
  }

  async process(input: string, context?: MedicalContext): Promise<MedicalReport> {
    await this.initializeSystemPrompt();

    const startTime = Date.now();
    console.log('🏥 BackgroundAgent processing input:', input?.substring(0, 100) + '...');

    try {
      // Determine processing approach based on context and features
      const useEnhanced = this.shouldUseEnhancedProcessing(context);

      if (useEnhanced) {
        const enhancedResult = await this.processWithEnhancedAnalysis(input, context);
        if (enhancedResult) {
          const processingTime = Date.now() - startTime;
          console.log(`✅ BackgroundAgent completed with enhanced processing in ${processingTime}ms`);
          return enhancedResult;
        }
      }

      // Fallback to legacy processing
      console.log('📋 BackgroundAgent falling back to standard processing');
      return await this.processStandard(input, context);

    } catch (error) {
      console.error('❌ BackgroundAgent processing failed, falling back to standard:', error);
      return await this.processStandard(input, context);
    }
  }

  /**
   * Enhanced processing with intelligent clinical finding extraction
   */
  private async processWithEnhancedAnalysis(
    input: string,
    context?: MedicalContext
  ): Promise<MedicalReport | null> {
    try {
      console.log('🧠 Starting enhanced background processing');

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
        console.warn('⚠️ Background format validation failed, falling back to standard');
        return null;
      }

      // Create enhanced report with enhanced intelligence
      const sections = await this.parseEnhancedResponse(structuredBackground, summaryResult, context);

      const report = this.createReport(
        structuredBackground.trim(),
        sections,
        context,
        0, // caller computes total processing time
        validation.confidence
      );

      // Enhanced metadata with insights
      report.metadata = {
        ...report.metadata,
        enhancedProcessing: {
          summaryExtraction: true,
          clinicalFindings: summaryResult.findings.length,
          qualityScore: summaryResult.qualityMetrics?.clinicalAccuracy ?? 0,
          backgroundCategories: this.categorizeBackgroundFindings(summaryResult.findings),
          processingType: 'ENHANCED'
        },
        validationResults: {
          formatValid: validation.isValid,
          confidence: validation.confidence,
          issues: validation.issues,
          warnings: validation.warnings
        },
        medicalCodes: this.extractMedicalCodes(structuredBackground),
        modelUsed: MODEL_CONFIG.QUICK_MODEL
      };

      console.log('✅ Enhanced background processing completed successfully');
      return report;

    } catch (error) {
      console.error('❌ Enhanced background processing failed:', error);
      return null;
    }
  }

  /**
   * Standard processing method (legacy fallback)
   */
  private async processStandard(input: string, context?: MedicalContext): Promise<MedicalReport> {
    const startTime = Date.now();

    // Get formatted background from lightweight quick model (Google Gemma-3n-e4b for fast formatting)
    console.log('🤖 Sending to lightweight LLM for medical background formatting...');
    const response = await this.lmStudioService.processWithAgent(
      this.systemPrompt,
      input,
      'background' // Pass agent type for model selection (uses MODEL_CONFIG.QUICK_MODEL for 3-8s processing)
    );

    console.log('🔍 Raw LLM response:', JSON.stringify(response));

    // Check for error response - be more precise about error detection
    const trimmedResponse = response.trim();
    if (trimmedResponse.startsWith('ERROR – medical background could not be parsed') ||
        trimmedResponse === 'ERROR – medical background could not be parsed coherently.') {
      console.warn('⚠️ Medical background could not be parsed coherently');
      return this.createErrorReport(input, 'Medical background could not be parsed coherently');
    }

    // Parse the formatted response
    const sections = this.parseResponse(response, context);

    // Calculate actual processing time
    const processingTime = Date.now() - startTime;

    // Use base class createReport method for consistent metadata structure
    const report = this.createReport(
      response.trim(),
      sections,
      context,
      processingTime,
      this.assessConfidence(input, response)
    );

    // Add additional metadata specific to background summaries
    report.metadata = {
      ...report.metadata,
      medicalCodes: this.extractMedicalCodes(response),
      modelUsed: MODEL_CONFIG.QUICK_MODEL // Now correctly using the quick model for background formatting
    };

    console.log('✅ Medical background formatted successfully');
    return report;
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
    _context?: MedicalContext
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
   * Parse enhanced response with enhanced intelligence
   */
  private async parseEnhancedResponse(
    structuredBackground: string,
    summaryResult: any,
    context?: MedicalContext
  ): Promise<ReportSection[]> {
    // Get base sections from legacy parsing
    const baseSections = this.parseResponse(structuredBackground, context);

    // Add enhanced sections
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
   * Determine if enhanced processing should be used
   */
  private shouldUseEnhancedProcessing(context?: MedicalContext): boolean {
    // Check for legacy processing mode
    if (context?.processingMode === 'legacy') {
      return false;
    }

    // Default to enhanced for improved capabilities
    return true;
  }

  protected async buildMessages(input: string, context?: MedicalContext): Promise<ChatMessage[]> {
    await this.initializeSystemPrompt();

    let systemContent = this.systemPrompt;

    // Add enhanced context if available
    if (context?.enhancedProcessing) {
      systemContent += '\n\nEnhanced Processing: Focus on clinical accuracy, structured formatting with ↪ arrows, and preservation of medical terminology.';
    }

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemContent
      },
      {
        role: 'user',
        content: `Please format this voice-dictated medical background/history into structured ↪ arrow format:

"${input}"

Remember to use ↪ for each major condition and - for sub-details, preserve all medical terminology exactly as dictated, and use Australian medical spelling.`
      }
    ];

    return messages;
  }

  protected parseResponse(response: string, _context?: MedicalContext): ReportSection[] {
    const cleanResponse = response.trim();
    
    // Count number of conditions (↪ symbols)
    const conditionCount = (cleanResponse.match(/↪/g) || []).length;
    
    // Split into individual conditions for analysis
    const conditions = cleanResponse.split('\n').filter(line => line.startsWith('↪'));
    
    const sections: ReportSection[] = [
      {
        title: 'Medical Background',
        content: cleanResponse,
        type: 'structured',
        priority: 'high'
      }
    ];

    // Add condition count metadata
    if (conditionCount > 0) {
      sections.push({
        title: 'Condition Summary',
        content: `${conditionCount} medical conditions documented`,
        type: 'structured',
        priority: 'medium'
      });
    }

    // Add individual conditions for easier parsing
    conditions.forEach((condition, index) => {
      const conditionName = condition.replace('↪ ', '').trim();
      sections.push({
        title: `Condition ${index + 1}`,
        content: conditionName,
        type: 'structured',
        priority: 'low'
      });
    });

    return sections;
  }

  private assessConfidence(input: string, output: string): number {
    // Simple confidence assessment based on:
    // 1. Presence of ↪ formatting
    // 2. Preservation of medical terms
    // 3. Appropriate structure
    
    let confidence = 0.5; // Base confidence
    
    // Check for proper ↪ formatting
    const arrowCount = (output.match(/↪/g) || []).length;
    if (arrowCount > 0) {
      confidence += 0.3;
    }
    
    // Check for preservation of key medical terms
    const medicalTerms = [
      'hypertension', 'diabetes', 'atrial fibrillation', 'coronary', 'heart failure',
      'asthma', 'COPD', 'kidney', 'stroke', 'cancer', 'AF', 'HTN', 'DM', 'CAD'
    ];
    
    const inputTerms = medicalTerms.filter(term => 
      input.toLowerCase().includes(term.toLowerCase())
    );
    const outputTerms = medicalTerms.filter(term => 
      output.toLowerCase().includes(term.toLowerCase())
    );
    
    if (inputTerms.length > 0) {
      confidence += (outputTerms.length / inputTerms.length) * 0.2;
    }
    
    return Math.min(confidence, 1.0);
  }

  private extractMedicalCodes(response: string): any[] {
    // Extract common medical conditions and their potential ICD codes
    const codes: any[] = [];
    
    // Basic condition mapping to ICD codes
    const conditionMappings = [
      { condition: 'hypertension', code: 'I10', description: 'Essential hypertension' },
      { condition: 'diabetes', code: 'E11', description: 'Type 2 diabetes mellitus' },
      { condition: 'atrial fibrillation', code: 'I48', description: 'Atrial fibrillation' },
      { condition: 'coronary artery disease', code: 'I25', description: 'Chronic ischaemic heart disease' },
      { condition: 'heart failure', code: 'I50', description: 'Heart failure' },
      { condition: 'asthma', code: 'J45', description: 'Asthma' },
      { condition: 'chronic kidney disease', code: 'N18', description: 'Chronic kidney disease' },
      { condition: 'aortic stenosis', code: 'I35.0', description: 'Nonrheumatic aortic stenosis' }
    ];
    
    conditionMappings.forEach(mapping => {
      if (response.toLowerCase().includes(mapping.condition.toLowerCase())) {
        codes.push({ 
          code: mapping.code, 
          description: mapping.description,
          system: 'ICD-10'
        });
      }
    });
    
    return codes;
  }

  private createErrorReport(input: string, errorMessage: string): MedicalReport {
    return {
      id: `background-error-${Date.now()}`,
      agentName: this.name,
      content: `Error processing medical background: ${errorMessage}`,
      sections: [
        {
          title: 'Processing Error',
          content: errorMessage,
          type: 'narrative',
          priority: 'high'
        },
        {
          title: 'Original Input',
          content: input,
          type: 'narrative',
          priority: 'medium'
        }
      ],
      metadata: {
        confidence: 0,
        processingTime: 0,
        medicalCodes: [],
        modelUsed: MODEL_CONFIG.QUICK_MODEL
      },
      timestamp: Date.now(),
      errors: [errorMessage]
    };
  }
}
