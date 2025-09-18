/**
 * InvestigationSummaryAgent - Phase 3 Migration
 * 
 * Migrated version integrating with Phase 3 MedicalSummaryExtractor and Phase 2 normalization
 * while maintaining full backward compatibility and exact behavior for investigation formatting.
 * 
 * MIGRATION STATUS: Hybrid mode - uses Phase 3 for enhanced extraction, legacy for formatting
 */

import { MedicalAgent } from '../base/MedicalAgent';
import { LMStudioService, MODEL_CONFIG } from '@/services/LMStudioService';
import { INVESTIGATION_SUMMARY_SYSTEM_PROMPTS, preNormalizeInvestigationText } from './InvestigationSummarySystemPrompts';
import type { 
  MedicalContext, 
  MedicalReport, 
  ReportSection, 
  ChatMessage 
} from '@/types/medical.types';

// Phase 3 imports
import { medicalSummaryExtractor, type MedicalSummaryConfig, type ClinicalFocusArea } from '@/utils/text-extraction/MedicalSummaryExtractor';
import { medicalTextNormalizer } from '@/utils/medical-text/MedicalTextNormalizer';
import { logger } from '@/utils/Logger';
import { recordConsolidationBenchmark } from '@/utils/performance/ConsolidationMetrics';

/**
 * Phase 3 Migrated Investigation Summary Agent
 * High consolidation potential due to intensive pattern processing and medical terminology extraction
 */
export class InvestigationSummaryAgentPhase3 extends MedicalAgent {
  private lmStudioService: LMStudioService;
  
  private readonly enablePhase3: boolean = true; // Phase 3 processing enabled
  private readonly fallbackToLegacy: boolean = false; // Phase 3 is stable, no fallback needed
  private readonly enablePhase2Normalization: boolean = true; // Use Phase 2 for normalization

  constructor() {
    super(
      'Investigation Summary Agent (Phase 3)',
      'Medical Investigation Documentation',
      'Phase 3 migrated agent with unified summary extraction and enhanced investigation processing',
      'investigation-summary',
      INVESTIGATION_SUMMARY_SYSTEM_PROMPTS.primary
    );
    
    this.lmStudioService = LMStudioService.getInstance();
    
    logger.info('InvestigationSummaryAgent Phase 3 initialized', {
      enablePhase3: this.enablePhase3,
      enablePhase2: this.enablePhase2Normalization,
      fallbackEnabled: this.fallbackToLegacy
    });
  }

  async process(input: string, context?: MedicalContext): Promise<MedicalReport> {
    const startTime = Date.now();
    
    logger.info('Starting InvestigationSummary Phase 3 processing', {
      inputLength: input.length,
      enablePhase3: this.enablePhase3,
      enablePhase2: this.enablePhase2Normalization
    });

    try {
      // Phase 3: Try consolidated approach first
      if (this.enablePhase3) {
        const phase3Result = await this.processWithPhase3(input, context);
        if (phase3Result) {
          logger.info('InvestigationSummary Phase 3 processing successful', {
            processingTime: Date.now() - startTime
          });
          return phase3Result;
        }
      }

      // Fallback to legacy processing
      if (this.fallbackToLegacy) {
        logger.warn('InvestigationSummary falling back to legacy processing', {
          reason: this.enablePhase3 ? 'Phase 3 failed' : 'Phase 3 disabled'
        });
        return await this.processWithLegacy(input, context);
      }

      throw new Error('Both Phase 3 and legacy processing failed');

    } catch (error) {
      logger.error('InvestigationSummary processing failed completely', error instanceof Error ? error : new Error(String(error)));
      return this.createErrorReport(input, error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  /**
   * Process with Phase 3 consolidated approach
   */
  private async processWithPhase3(input: string, context?: MedicalContext): Promise<MedicalReport | null> {
    const phase3StartTime = performance.now();

    try {
      logger.debug('Phase 3 InvestigationSummary processing started', {
        inputLength: input.length
      });

      // Step 1: Enhanced normalization using Phase 2 + legacy
      const normalizedInput = await this.enhancedNormalization(input);
      
      // Step 2: Extract clinical findings using Phase 3 system
      const summaryResult = await this.extractInvestigationFindings(normalizedInput, context);
      
      // Step 3: Generate structured investigation format
      const structuredFormat = await this.generateStructuredInvestigationFormat(normalizedInput, summaryResult, context);
      
      // Step 4: Validate investigation format compliance
      const formatValidation = this.validateInvestigationFormat(structuredFormat, summaryResult);
      
      if (!formatValidation.isValid) {
        logger.warn('Phase 3 investigation format validation failed', {
          issues: formatValidation.issues,
          confidence: formatValidation.confidence
        });
        return null; // Trigger fallback
      }

      // Step 5: Parse structured sections using enhanced logic
      const sections = this.parseResponseEnhanced(structuredFormat, summaryResult);
      
      const endTime = performance.now();
      const processingTime = endTime - phase3StartTime;

      // Record Phase 3 performance
      recordConsolidationBenchmark('investigation_summary_phase3', processingTime, processingTime, 0);

      // Create enhanced report with Phase 3 metadata
      const report = this.createReport(
        structuredFormat.trim(),
        sections,
        context,
        Math.round(processingTime),
        formatValidation.confidence,
        formatValidation.warnings,
        formatValidation.issues.length > 0 ? formatValidation.issues : undefined
      );

      // Add Phase 3 metadata
      report.metadata = {
        ...report.metadata,
        phase3Processing: {
          summaryExtraction: summaryResult.extractionStats,
          qualityMetrics: summaryResult.qualityMetrics,
          clinicalFindings: summaryResult.findings.length,
          processingMethod: 'Phase3_Investigation_Consolidation',
          normalizedInputLength: normalizedInput.length,
          investigationTypes: this.extractInvestigationTypes(structuredFormat),
          medicalCodes: this.extractMedicalCodes(structuredFormat)
        },
        medicalCodes: this.extractMedicalCodes(structuredFormat),
        modelUsed: MODEL_CONFIG.QUICK_MODEL
      };

      logger.info('Phase 3 InvestigationSummary processing completed successfully', {
        processingTime,
        confidence: formatValidation.confidence,
        clinicalFindings: summaryResult.findings.length,
        qualityScore: summaryResult.qualityMetrics.overallQuality
      });

      return report;

    } catch (error) {
      logger.error('Phase 3 InvestigationSummary processing failed', error instanceof Error ? error : new Error(String(error)));
      return null; // Trigger fallback
    }
  }

  /**
   * Enhanced normalization combining Phase 2 + Investigation-specific rules
   */
  private async enhancedNormalization(input: string): Promise<string> {
    try {
      let normalizedText = input;

      logger.debug('Enhanced normalization started', {
        originalText: input,
        originalLength: input.length
      });

      // Step 1: Apply Phase 2 normalization first
      if (this.enablePhase2Normalization) {
        const phase2Result = await medicalTextNormalizer.normalize(input, {
          agentType: 'investigation-summary',
          mode: 'investigation',
          enableCrossAgentPatterns: true,
          australianSpelling: true,
          strictMedicalTerms: true,
          preserveUnits: true
        });
        normalizedText = phase2Result.normalizedText;

        logger.debug('Phase 2 normalization completed', {
          originalText: input,
          phase2Text: normalizedText,
          originalLength: input.length,
          normalizedLength: normalizedText.length,
          patternsApplied: phase2Result.appliedPatterns.length,
          confidence: phase2Result.confidence,
          appliedPatterns: phase2Result.appliedPatterns
        });
      }

      // Step 2: Apply investigation-specific legacy normalization
      const investigationNormalized = preNormalizeInvestigationText(normalizedText);

      logger.debug('Enhanced normalization completed', {
        originalText: input,
        phase2Text: normalizedText,
        finalText: investigationNormalized,
        originalLength: input.length,
        phase2Length: normalizedText.length,
        finalLength: investigationNormalized.length
      });

      return investigationNormalized;

    } catch (error) {
      logger.warn('Enhanced normalization failed, using legacy only', { error: error instanceof Error ? error.message : String(error) });
      return preNormalizeInvestigationText(input);
    }
  }

  /**
   * Extract investigation findings using Phase 3 system
   */
  private async extractInvestigationFindings(normalizedInput: string, context?: MedicalContext) {
    const summaryConfig: MedicalSummaryConfig = {
      agentType: 'investigation-summary',
      summaryLength: 'standard',
      focusAreas: this.getInvestigationFocusAreas(normalizedInput),
      extractFindings: true,
      includeMetrics: true,
      preserveOriginalFormat: false, // We'll structure it ourselves
      australianCompliance: true
    };

    const summaryResult = await medicalSummaryExtractor.extractSummary(normalizedInput, summaryConfig);

    logger.debug('Phase 3 investigation findings extraction completed', {
      findingsCount: summaryResult.findings.length,
      investigationFindings: summaryResult.findings.filter(f => f.category === 'investigations').length,
      anatomyFindings: summaryResult.findings.filter(f => f.category === 'anatomy').length,
      hemodynamicFindings: summaryResult.findings.filter(f => f.category === 'hemodynamics').length,
      qualityScore: summaryResult.qualityMetrics.overallQuality,
      processingTime: summaryResult.extractionStats.processingTimeMs
    });

    return summaryResult;
  }

  /**
   * Determine investigation-specific focus areas
   */
  private getInvestigationFocusAreas(text: string): ClinicalFocusArea[] {
    const areas: ClinicalFocusArea[] = ['investigations', 'anatomy', 'outcomes'];
    const lowerText = text.toLowerCase();

    // Always include investigations as primary focus
    if (lowerText.includes('hemodynamic') || lowerText.includes('pressure') || lowerText.includes('gradient')) {
      areas.push('hemodynamics');
    }
    if (lowerText.includes('diagnosis') || lowerText.includes('finding') || lowerText.includes('shows')) {
      areas.push('diagnosis');
    }
    if (lowerText.includes('medication') || lowerText.includes('contrast') || lowerText.includes('agent')) {
      areas.push('medications');
    }
    if (lowerText.includes('complication') || lowerText.includes('adverse') || lowerText.includes('reaction')) {
      areas.push('complications');
    }

    return areas;
  }

  /**
   * Generate structured investigation format using Phase 3 insights
   */
  private async generateStructuredInvestigationFormat(
    normalizedInput: string,
    summaryResult: any,
    context?: MedicalContext
  ): Promise<string> {
    
    // Build enhanced prompt with Phase 3 clinical insights
    let enhancedPrompt = this.systemPrompt;

    // Add investigation-specific findings context
    if (summaryResult.findings.length > 0) {
      const investigationFindings = summaryResult.findings.filter((f: any) => 
        f.category === 'investigations' || f.category === 'anatomy' || f.category === 'hemodynamics'
      );
      
      if (investigationFindings.length > 0) {
        const keyFindings = investigationFindings
          .filter((f: any) => f.confidence >= 75)
          .slice(0, 5)
          .map((f: any) => `${f.finding}${f.measurement ? ` (${f.measurement.value}${f.measurement.unit || ''})` : ''}`)
          .join(', ');
        
        if (keyFindings) {
          enhancedPrompt += `\n\nKey clinical findings identified: ${keyFindings}. Ensure these are properly formatted in the investigation summary.`;
        }
      }
    }

    // Add investigation type context
    const detectedTypes = this.detectInvestigationTypes(normalizedInput);
    if (detectedTypes.length > 0) {
      enhancedPrompt += `\n\nDetected investigation types: ${detectedTypes.join(', ')}. Use appropriate medical abbreviations and formatting.`;
    }

    logger.debug('Generating structured investigation format', {
      investigationTypes: detectedTypes,
      keyFindings: summaryResult.findings.length,
      enhancedPromptLength: enhancedPrompt.length,
      normalizedInput: normalizedInput,
      enhancedPrompt: enhancedPrompt.substring(0, 500) + '...' // First 500 chars for debugging
    });

    // Generate structured format using enhanced prompt
    const response = await this.lmStudioService.processWithAgent(
      enhancedPrompt,
      normalizedInput,
      'investigation-summary'
    );

    logger.debug('LLM response received', {
      rawResponse: response,
      responseLength: response.length,
      normalizedInputUsed: normalizedInput
    });

    // Apply post-processing abbreviation enforcement
    const abbreviationEnforcedResponse = this.enforceAbbreviations(response);

    logger.debug('Post-processing abbreviation enforcement applied', {
      originalResponse: response,
      enforcedResponse: abbreviationEnforcedResponse,
      changesApplied: response !== abbreviationEnforcedResponse
    });

    return abbreviationEnforcedResponse;
  }

  /**
   * Enforce critical abbreviations in post-processing
   * This acts as a final safety net to ensure abbreviations are applied
   */
  private enforceAbbreviations(response: string): string {
    let enforcedResponse = response;

    // Critical abbreviations that must be enforced
    const abbreviationRules = [
      // Cardiac chambers and structures
      { pattern: /\bleft ventricular size\b/gi, replacement: 'LV size' },
      { pattern: /\bleft ventricular function\b/gi, replacement: 'LV function' },
      { pattern: /\bleft ventricular\b/gi, replacement: 'LV' },
      { pattern: /\bright ventricular\b/gi, replacement: 'RV' },
      { pattern: /\bleft atrial\b/gi, replacement: 'LA' },
      { pattern: /\bright atrial\b/gi, replacement: 'RA' },
      { pattern: /\bleft atrium\b/gi, replacement: 'LA' },
      { pattern: /\bright atrium\b/gi, replacement: 'RA' },

      // Regurgitation
      { pattern: /\btricuspid regurgitation\b/gi, replacement: 'TR' },
      { pattern: /\bmitral regurgitation\b/gi, replacement: 'MR' },
      { pattern: /\baortic regurgitation\b/gi, replacement: 'AR' },
      { pattern: /\bpulmonary regurgitation\b/gi, replacement: 'PR' },
      { pattern: /\bmoderate to severe\b/gi, replacement: 'mod-sev' },

      // Valves
      { pattern: /\baortic valve\b/gi, replacement: 'AV' },
      { pattern: /\bmitral valve\b/gi, replacement: 'MV' },
      { pattern: /\btricuspid valve\b/gi, replacement: 'TV' },
      { pattern: /\bpulmonary valve\b/gi, replacement: 'PV' },

      // Units - add mmHg to gradients without units
      { pattern: /\bmean gradient (\d+)(?!\s*(mmHg|mm Hg|mmhg))/gi, replacement: 'mean gradient $1mmHg' },
      { pattern: /\bpeak gradient (\d+)(?!\s*(mmHg|mm Hg|mmhg))/gi, replacement: 'peak gradient $1mmHg' },
      { pattern: /\bMPG (\d+)(?!\s*(mmHg|mm Hg|mmhg))/gi, replacement: 'MPG $1mmHg' },
      { pattern: /\bPPG (\d+)(?!\s*(mmHg|mm Hg|mmhg))/gi, replacement: 'PPG $1mmHg' },
    ];

    // Apply each rule
    for (const rule of abbreviationRules) {
      const originalResponse = enforcedResponse;
      enforcedResponse = enforcedResponse.replace(rule.pattern, rule.replacement);

      if (originalResponse !== enforcedResponse) {
        logger.debug(`Applied abbreviation rule: ${rule.pattern} → ${rule.replacement}`, {
          before: originalResponse,
          after: enforcedResponse
        });
      }
    }

    return enforcedResponse;
  }

  /**
   * Detect investigation types from text
   */
  private detectInvestigationTypes(text: string): string[] {
    const types: string[] = [];
    const lowerText = text.toLowerCase();

    const typePatterns = [
      { pattern: /\b(?:trans\s*thoracic\s*echo|tte)\b/i, type: 'TTE' },
      { pattern: /\b(?:trans\s*oesophageal\s*echo|trans\s*esophageal\s*echo|toe|tee)\b/i, type: 'TOE' },
      { pattern: /\b(?:ct\s*coronary\s*angiogram|ctca)\b/i, type: 'CTCA' },
      { pattern: /\b(?:coronary\s*angiogram|angiography)\b/i, type: 'Coronary Angiogram' },
      { pattern: /\b(?:stress\s*echo|stress\s*test)\b/i, type: 'Stress Test' },
      { pattern: /\b(?:blood\s*test|bloods|laboratory)\b/i, type: 'Bloods' },
      { pattern: /\b(?:chest\s*x.?ray|cxr)\b/i, type: 'Chest X-ray' },
      { pattern: /\b(?:ecg|electrocardiogram)\b/i, type: 'ECG' },
      { pattern: /\b(?:holter|event\s*monitor)\b/i, type: 'Holter Monitor' },
      { pattern: /\b(?:calcium\s*score|ca\s*score)\b/i, type: 'Calcium Score' },
      { pattern: /\b(?:right\s*heart\s*cath|rhc)\b/i, type: 'RHC' }
    ];

    for (const { pattern, type } of typePatterns) {
      if (pattern.test(lowerText)) {
        types.push(type);
      }
    }

    return [...new Set(types)]; // Remove duplicates
  }

  /**
   * Validate investigation format compliance
   */
  private validateInvestigationFormat(
    structuredFormat: string,
    summaryResult: any
  ): { isValid: boolean; confidence: number; issues: string[]; warnings: string[] } {
    
    const issues: string[] = [];
    const warnings: string[] = [];
    let confidence = summaryResult.qualityMetrics.overallQuality;

    const trimmedFormat = structuredFormat.trim();

    // Check for proper investigation format: "INVESTIGATION (DD MMM YYYY): findings"
    const formatPattern = /^[^(]+\s*\([^)]+\):\s*.+/;
    if (!formatPattern.test(trimmedFormat)) {
      issues.push('Does not match required investigation format: "INVESTIGATION (DATE): findings"');
      confidence -= 30;
    }

    // Check for minimum content length
    if (trimmedFormat.length < 20) {
      issues.push('Investigation format too short');
      confidence -= 25;
    }

    // Check for error responses
    if (trimmedFormat.startsWith('ERROR') || trimmedFormat.includes('could not be parsed')) {
      issues.push('Investigation parsing error detected');
      confidence -= 50;
    }

    // Check for medical terminology preservation
    const medicalTerms = ['TTE', 'CTCA', 'LAD', 'LV', 'RV', 'EF', 'MPG', 'SCAD', 'Ca score', 'METs'];
    const foundTerms = medicalTerms.filter(term => trimmedFormat.includes(term));
    const originalTerms = medicalTerms.filter(term => summaryResult.originalText.toLowerCase().includes(term.toLowerCase()));
    
    if (originalTerms.length > 0) {
      const preservationRate = foundTerms.length / originalTerms.length;
      if (preservationRate < 0.8) {
        warnings.push(`Medical terminology preservation: ${(preservationRate * 100).toFixed(1)}%`);
        confidence -= 10;
      }
    }

    // Check for appropriate abbreviations
    const investigationTypes = this.detectInvestigationTypes(trimmedFormat);
    if (investigationTypes.length === 0 && trimmedFormat.length > 30) {
      warnings.push('No clear investigation type detected in format');
      confidence -= 5;
    }

    // Quality threshold check
    if (summaryResult.qualityMetrics.clinicalAccuracy < 70) {
      warnings.push('Low clinical accuracy in source extraction');
      confidence -= 10;
    }

    const isValid = confidence >= 50 && !issues.some(i => i.includes('parsing error') || i.includes('too short'));

    logger.debug('Phase 3 investigation format validation completed', {
      isValid,
      confidence,
      issues: issues.length,
      warnings: warnings.length,
      formatLength: trimmedFormat.length,
      investigationTypes: investigationTypes.length
    });

    return { isValid, confidence: Math.max(0, confidence), issues, warnings };
  }

  /**
   * Parse response with enhanced Phase 3 insights
   */
  private parseResponseEnhanced(structuredFormat: string, summaryResult: any): ReportSection[] {
    const cleanResponse = structuredFormat.trim();
    
    // Extract investigation type and date if possible
    const investigationMatch = cleanResponse.match(/^([^(]+)\s*\(([^)]+)\):\s*(.+)$/);
    
    const sections: ReportSection[] = [
      {
        title: 'Investigation Summary',
        content: cleanResponse,
        type: 'structured',
        priority: 'high'
      }
    ];

    if (investigationMatch) {
      const [, investigationType, dateStr, findings] = investigationMatch;
      
      sections.push(
        {
          title: 'Investigation Type',
          content: investigationType.trim(),
          type: 'structured',
          priority: 'medium'
        },
        {
          title: 'Investigation Date',
          content: dateStr.trim(),
          type: 'structured',
          priority: 'medium'
        },
        {
          title: 'Findings',
          content: findings.trim(),
          type: 'narrative',
          priority: 'high'
        }
      );
    }

    // Add Phase 3 clinical findings if available
    if (summaryResult.findings.length > 0) {
      const significantFindings = summaryResult.findings
        .filter((f: any) => f.confidence >= 70)
        .slice(0, 5);

      if (significantFindings.length > 0) {
        sections.push({
          title: 'Clinical Findings',
          content: significantFindings.map((f: any) => 
            `${f.finding}${f.severity ? ` (${f.severity})` : ''}${f.measurement ? ` - ${f.measurement.value}${f.measurement.unit || ''}` : ''}`
          ).join('; '),
          type: 'structured',
          priority: 'high'
        });
      }
    }

    return sections;
  }

  /**
   * Extract investigation types for metadata
   */
  private extractInvestigationTypes(text: string): string[] {
    return this.detectInvestigationTypes(text);
  }

  /**
   * Legacy processing method (preserved for fallback)
   */
  private async processWithLegacy(input: string, context?: MedicalContext): Promise<MedicalReport> {
    logger.info('Using legacy InvestigationSummary processing');

    const startTime = Date.now();

    // Apply legacy normalization
    const normalizedInput = preNormalizeInvestigationText(input);
    
    // Use legacy LLM processing
    const response = await this.lmStudioService.processWithAgent(
      this.systemPrompt,
      normalizedInput,
      'investigation-summary'
    );

    // Apply post-processing abbreviation enforcement (same as Phase 3)
    const abbreviationEnforcedResponse = this.enforceAbbreviations(response);

    logger.debug('Legacy processing with abbreviation enforcement', {
      originalResponse: response,
      enforcedResponse: abbreviationEnforcedResponse,
      changesApplied: response !== abbreviationEnforcedResponse
    });

    // Check for error response
    const trimmedResponse = abbreviationEnforcedResponse.trim();
    if (trimmedResponse.startsWith('ERROR – investigation dictation could not be parsed') ||
        trimmedResponse === 'ERROR – investigation dictation could not be parsed coherently.') {
      return this.createErrorReport(input, 'Investigation dictation could not be parsed coherently');
    }

    // Parse using legacy method
    const sections = this.parseResponse(abbreviationEnforcedResponse, context);

    const processingTime = Date.now() - startTime;

    const report = this.createReport(
      abbreviationEnforcedResponse.trim(),
      sections,
      context,
      processingTime,
      this.assessConfidence(input, abbreviationEnforcedResponse)
    );

    report.metadata = {
      ...report.metadata,
      medicalCodes: this.extractMedicalCodes(abbreviationEnforcedResponse),
      modelUsed: MODEL_CONFIG.QUICK_MODEL
    };

    return report;
  }

  // ===== PRESERVED LEGACY METHODS =====
  // All legacy methods preserved exactly for backward compatibility

  protected buildMessages(input: string, _context?: MedicalContext): ChatMessage[] {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: this.systemPrompt
      },
      {
        role: 'user',
        content: `Please format this voice-dictated investigation result into a structured summary:

"${input}"

Remember to maintain the exact format: "INVESTIGATION (DD MMM YYYY): comma-separated findings"`
      }
    ];

    return messages;
  }

  protected parseResponse(response: string, _context?: MedicalContext): ReportSection[] {
    const cleanResponse = response.trim();
    
    const investigationMatch = cleanResponse.match(/^([^(]+)\s*\([^)]+\):\s*(.+)$/);
    
    if (investigationMatch) {
      const [, investigationType, findings] = investigationMatch;
      
      return [
        {
          title: 'Investigation Summary',
          content: cleanResponse,
          type: 'structured',
          priority: 'high'
        },
        {
          title: 'Investigation Type',
          content: investigationType.trim(),
          type: 'structured',
          priority: 'medium'
        },
        {
          title: 'Findings',
          content: findings.trim(),
          type: 'narrative',
          priority: 'high'
        }
      ];
    } else {
      return [
        {
          title: 'Investigation Summary',
          content: cleanResponse,
          type: 'narrative',
          priority: 'high'
        }
      ];
    }
  }

  private assessConfidence(input: string, output: string): number {
    let confidence = 0.5;
    
    if (output.match(/^[^(]+\s*\([^)]+\):\s*[^,]+(,\s*[^,]+)*$/)) {
      confidence += 0.3;
    }
    
    const medicalTerms = ['TTE', 'CTCA', 'LAD', 'LV', 'RV', 'EF', 'MPG', 'SCAD', 'Ca score', 'METs'];
    const inputTerms = medicalTerms.filter(term => input.toLowerCase().includes(term.toLowerCase()));
    const outputTerms = medicalTerms.filter(term => output.includes(term));
    
    if (inputTerms.length > 0) {
      confidence += (outputTerms.length / inputTerms.length) * 0.2;
    }
    
    return Math.min(confidence, 1.0);
  }

  private extractMedicalCodes(response: string): any[] {
    const codes = [];
    
    if (response.includes('TTE')) {
      codes.push({ code: '93303', description: 'Transthoracic Echocardiogram' });
    }
    if (response.includes('CTCA')) {
      codes.push({ code: '75571', description: 'CT Coronary Angiography' });
    }
    if (response.includes('Coronary Angiogram')) {
      codes.push({ code: '93458', description: 'Coronary Angiography' });
    }
    if (response.includes('Stress')) {
      codes.push({ code: '93017', description: 'Stress Test' });
    }
    
    return codes;
  }

  private createErrorReport(input: string, errorMessage: string): MedicalReport {
    return {
      id: `investigation-error-${Date.now()}`,
      agentName: this.name,
      content: `Error processing investigation: ${errorMessage}`,
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

// Export for compatibility
export { InvestigationSummaryAgentPhase3 as InvestigationSummaryAgent };
