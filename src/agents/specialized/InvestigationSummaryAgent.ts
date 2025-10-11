/**
 * InvestigationSummaryAgent - Enhanced with Phase 3 capabilities
 *
 * Processes voice-dictated investigation results with enhanced clinical finding extraction,
 * intelligent medical pattern recognition, quality assessment and validation,
 * and hybrid processing with legacy fallback for safety.
 *
 * Integrates MedicalSummaryExtractor and Phase 2 normalization while maintaining
 * full backward compatibility and exact behavior for investigation formatting.
 */

import { MedicalAgent } from '../base/MedicalAgent';
import { LMStudioService, MODEL_CONFIG } from '@/services/LMStudioService';
import { systemPromptLoader } from '@/services/SystemPromptLoader';
import { preNormalizeInvestigationText } from './InvestigationSummarySystemPrompts';
import { MedicalSummaryExtractor, MedicalSummaryConfig, ClinicalFocusArea } from '@/utils/text-extraction/MedicalSummaryExtractor';
import { preNormalizeMedicalText } from '@/utils/medical-text/Phase2TextNormalizer';
import type {
  MedicalContext,
  MedicalReport,
  ReportSection,
  ChatMessage
} from '@/types/medical.types';

/**
 * Enhanced Investigation Summary Agent with comprehensive clinical analysis
 */
export class InvestigationSummaryAgent extends MedicalAgent {
  private lmStudioService: LMStudioService;
  private systemPromptInitialized = false;
  private medicalSummaryExtractor: MedicalSummaryExtractor;

  private readonly enableEnhanced: boolean = true;
  private readonly fallbackToLegacy: boolean = false;
  private readonly enablePhase2Normalization: boolean = true;

  constructor() {
    super(
      'Investigation Summary Agent',
      'Medical Investigation Documentation',
      'Enhanced agent with unified summary extraction and comprehensive investigation processing',
      'investigation-summary',
      '' // Will be loaded dynamically
    );

    this.lmStudioService = LMStudioService.getInstance();
    this.medicalSummaryExtractor = MedicalSummaryExtractor.getInstance();

    console.log('InvestigationSummaryAgent enhanced initialized', {
      enableEnhanced: this.enableEnhanced,
      enablePhase2: this.enablePhase2Normalization,
      fallbackEnabled: this.fallbackToLegacy
    });
  }

  private async initializeSystemPrompt(): Promise<void> {
    if (this.systemPromptInitialized) return;

    try {
      this.systemPrompt = await systemPromptLoader.loadSystemPrompt('investigation-summary', 'primary');
      this.systemPromptInitialized = true;
    } catch (error) {
      console.error('❌ InvestigationSummaryAgent: Failed to load system prompt:', error);
      this.systemPrompt = 'You are a medical investigation summary specialist formatting voice-dictated investigation results.'; // Fallback
    }
  }

  async process(input: string, _context?: MedicalContext): Promise<MedicalReport> {
    await this.initializeSystemPrompt();

    const startTime = Date.now();

    console.log('🔬 InvestigationSummaryAgent processing input:', input?.substring(0, 100) + '...');

    try {
      // Enhanced processing attempt
      if (this.enableEnhanced) {
        const enhancedResult = await this.processWithEnhancedAnalysis(input, _context);
        if (enhancedResult) {
          const processingTime = Date.now() - startTime;
          console.log(`✅ InvestigationSummaryAgent completed with enhanced processing in ${processingTime}ms`);
          return enhancedResult;
        }
      }

      // Fallback to legacy processing
      if (this.fallbackToLegacy) {
        console.log('📋 InvestigationSummaryAgent falling back to legacy processing');
        return await this.processWithLegacy(input, _context);
      }

      throw new Error('Both enhanced and legacy processing failed');

    } catch (error) {
      console.error('❌ InvestigationSummaryAgent processing failed completely:', error);
      return this.createErrorReport(input, error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  /**
   * Enhanced processing with intelligent clinical finding extraction
   */
  private async processWithEnhancedAnalysis(input: string, _context?: MedicalContext): Promise<MedicalReport | null> {
    const enhancedStartTime = performance.now();

    try {
      console.log('🧠 Starting enhanced investigation processing');

      // Report progress: Starting processing (50%)
      _context?.onProgress?.('Starting investigation analysis', 50, 'Analyzing dictation');

      // Step 1: Enhanced normalization using Phase 2 + legacy
      const normalizedInput = await this.enhancedNormalization(input);

      // Step 2: Extract clinical findings using enhanced system
      const summaryResult = await this.extractInvestigationFindings(normalizedInput, _context);

      // Report progress: Clinical analysis (65%)
      _context?.onProgress?.('Extracting clinical findings', 65, 'Processing medical terminology');

      // Step 3: Generate structured investigation format
      const structuredFormat = await this.generateStructuredInvestigationFormat(normalizedInput, summaryResult, _context);

      // Step 4: Validate investigation format compliance
      const formatValidation = this.validateInvestigationFormat(structuredFormat, summaryResult);

      if (!formatValidation.isValid) {
        console.warn('Enhanced investigation format validation failed', {
          issues: formatValidation.issues,
          confidence: formatValidation.confidence
        });
        return null; // Trigger fallback
      }

      // Step 5: Parse structured sections using enhanced logic
      const sections = this.parseResponseEnhanced(structuredFormat, summaryResult);

      const endTime = performance.now();
      const processingTime = endTime - enhancedStartTime;

      // Create enhanced report
      const report = this.createReport(
        structuredFormat.trim(),
        sections,
        _context,
        Math.round(processingTime),
        formatValidation.confidence,
        formatValidation.warnings,
        formatValidation.issues.length > 0 ? formatValidation.issues : undefined
      );

      // Add enhanced metadata
      const extractedFindings = Array.isArray(summaryResult.findings)
        ? summaryResult.findings.map((finding: any) => ({
            category: finding.category,
            finding: finding.finding,
            severity: finding.severity,
            confidence: finding.confidence,
            context: finding.context,
            location: finding.location,
            measurement: finding.measurement
          }))
        : [];

      report.metadata = {
        ...report.metadata,
        enhancedProcessing: {
          summaryExtraction: summaryResult.extractionStats,
          qualityMetrics: summaryResult.qualityMetrics,
          clinicalFindings: summaryResult.findings.length,
          processingMethod: 'Enhanced_Investigation_Processing',
          normalizedInputLength: normalizedInput.length,
          investigationTypes: this.extractInvestigationTypes(structuredFormat),
          medicalCodes: this.extractMedicalCodes(structuredFormat),
          extractedFindings
        },
        medicalCodes: this.extractMedicalCodes(structuredFormat),
        modelUsed: MODEL_CONFIG.QUICK_MODEL
      };

      console.log('✅ Enhanced InvestigationSummary processing completed successfully', {
        processingTime,
        confidence: formatValidation.confidence,
        clinicalFindings: summaryResult.findings.length,
        qualityScore: summaryResult.qualityMetrics.overallQuality
      });

      return report;

    } catch (error) {
      console.error('❌ Enhanced InvestigationSummary processing failed:', error);
      return null; // Trigger fallback
    }
  }

  /**
   * Enhanced normalization combining Phase 2 + Investigation-specific rules
   */
  private async enhancedNormalization(input: string): Promise<string> {
    try {
      let normalizedText = input;

      console.log('📝 Enhanced normalization started');

      // Step 1: Apply Phase 2 normalization first
      if (this.enablePhase2Normalization) {
        normalizedText = preNormalizeMedicalText(input);
        console.log('📝 Phase 2 normalization completed');
      }

      // Step 2: Apply investigation-specific legacy normalization
      const investigationNormalized = preNormalizeInvestigationText(normalizedText);

      console.log('📝 Enhanced normalization completed');

      return investigationNormalized;

    } catch (error) {
      console.warn('Enhanced normalization failed, using legacy only:', error);
      return preNormalizeInvestigationText(input);
    }
  }

  /**
   * Extract investigation findings using enhanced system
   */
  private async extractInvestigationFindings(normalizedInput: string, _context?: MedicalContext) {
    const summaryConfig: MedicalSummaryConfig = {
      agentType: 'investigation-summary',
      summaryLength: 'standard',
      focusAreas: this.getInvestigationFocusAreas(normalizedInput),
      extractFindings: true,
      includeMetrics: true,
      preserveOriginalFormat: false, // We'll structure it ourselves
      australianCompliance: true
    };

    const summaryResult = await this.medicalSummaryExtractor.extractSummary(normalizedInput, summaryConfig);

    console.log('🔍 Enhanced investigation findings extraction completed', {
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
   * Generate structured investigation format using enhanced insights
   */
  private async generateStructuredInvestigationFormat(
    normalizedInput: string,
    summaryResult: any,
    _context?: MedicalContext
  ): Promise<string> {

    // Build enhanced prompt with clinical insights
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

    console.log('🤖 Generating structured investigation format with enhanced context');

    // Report progress: Generating format (75%)
    if (_context?.onProgress) {
      _context.onProgress('Generating investigation format', 75, 'Formatting results');
    }

    // Generate structured format using enhanced prompt
    const response = await this.lmStudioService.processWithAgent(
      enhancedPrompt,
      normalizedInput,
      'investigation-summary'
    );

    // Report progress: Post-processing (90%)
    if (_context?.onProgress) {
      _context.onProgress('Finalizing investigation summary', 90, 'Applying medical abbreviations');
    }

    // Apply post-processing abbreviation enforcement
    const abbreviationEnforcedResponse = this.enforceAbbreviations(response);

    console.log('📝 Post-processing abbreviation enforcement applied');

    return abbreviationEnforcedResponse;
  }

  /**
   * Enforce critical abbreviations in post-processing
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

      // Severity abbreviations - Apply BEFORE chamber/valve abbreviations
      { pattern: /\bmoderately dilated (left atrium|left ventricle|right atrium|right ventricle)\b/gi, replacement: 'mod dil $1' },
      { pattern: /\bmildly dilated (left atrium|left ventricle|right atrium|right ventricle)\b/gi, replacement: 'mild dil $1' },
      { pattern: /\bseverely dilated (left atrium|left ventricle|right atrium|right ventricle)\b/gi, replacement: 'sev dil $1' },

      // Standalone moderate (when not followed by specific terms)
      { pattern: /\bmoderate(?!\s+(to|stenosis|regurgitation|AR|MR|TR|PR))\b/gi, replacement: 'mod' },

      // Valves
      { pattern: /\baortic valve\b/gi, replacement: 'AV' },
      { pattern: /\bmitral valve\b/gi, replacement: 'MV' },
      { pattern: /\btricuspid valve\b/gi, replacement: 'TV' },
      { pattern: /\bpulmonary valve\b/gi, replacement: 'PV' },

      // Coronary anatomy - fix "osteo" to "ostial"
      { pattern: /\bosteo D1\b/gi, replacement: 'ostial D1' },
      { pattern: /\bosteo (\w+)\b/gi, replacement: 'ostial $1' },

      // Stent sizing - fix format like "4x0.0 by 20" to "4.0x20"
      { pattern: /\b(\d+)x0\.0\s+by\s+(\d+)\b/gi, replacement: '$1.0x$2' },
      { pattern: /\b(\d+)\.(\d+)\s*x\s*(\d+)\s+by\s+(\d+)\b/gi, replacement: '$1.$2x$4' },

      // Device abbreviations
      { pattern: /\bDrug Eluding Stent\b/gi, replacement: 'DES' },
      { pattern: /\bDrug Eluting Stent\b/gi, replacement: 'DES' },
      { pattern: /\bSynergy Drug Eluding Stent\b/gi, replacement: 'Synergy DES' },
      { pattern: /\bSynergy Drug Eluting Stent\b/gi, replacement: 'Synergy DES' },

      // Units - add mmHg to gradients without units
      { pattern: /\bmean gradient (\d+)(?!\s*(mmHg|mm Hg|mmhg))/gi, replacement: 'mean gradient $1mmHg' },
      { pattern: /\bpeak gradient (\d+)(?!\s*(mmHg|mm Hg|mmhg))/gi, replacement: 'peak gradient $1mmHg' },
      { pattern: /\bMPG (\d+)(?!\s*(mmHg|mm Hg|mmhg))/gi, replacement: 'MPG $1mmHg' },
      { pattern: /\bPPG (\d+)(?!\s*(mmHg|mm Hg|mmhg))/gi, replacement: 'PPG $1mmHg' },

      // CRITICAL: Fix measurement spacing - Remove hyphens, ensure spaces
      // Echo measurements
      { pattern: /\bLVEDD-(\d+)/gi, replacement: 'LVEDD $1' },
      { pattern: /\bLVESD-(\d+)/gi, replacement: 'LVESD $1' },
      { pattern: /\bLVEDD(\d+)/gi, replacement: 'LVEDD $1' },
      { pattern: /\bLVESD(\d+)/gi, replacement: 'LVESD $1' },
      { pattern: /\bEF-(\d+)/gi, replacement: 'EF $1' },
      { pattern: /\bEF(\d{2})/g, replacement: 'EF $1' }, // Match EF followed by 2 digits
      { pattern: /\bGLS-(-?\d+)/gi, replacement: 'GLS $1' },
      { pattern: /\bGLS(-?\d+)/gi, replacement: 'GLS $1' },
      { pattern: /\bLAVI-(\d+)/gi, replacement: 'LAVI $1' },
      { pattern: /\bLAVI(\d+)/gi, replacement: 'LAVI $1' },
      { pattern: /\bRAVI-(\d+)/gi, replacement: 'RAVI $1' },
      { pattern: /\bRAVI(\d+)/gi, replacement: 'RAVI $1' },
      { pattern: /\bTAPSE-(\d+)/gi, replacement: 'TAPSE $1' },
      { pattern: /\bTAPSE(\d+)/gi, replacement: 'TAPSE $1' },
    ];

    // Apply each rule
    for (const rule of abbreviationRules) {
      enforcedResponse = enforcedResponse.replace(rule.pattern, rule.replacement);
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

    console.log('🔍 Enhanced investigation format validation completed', {
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
   * Parse response with enhanced insights
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

    // Add enhanced clinical findings if available
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
  private async processWithLegacy(input: string, _context?: MedicalContext): Promise<MedicalReport> {
    console.log('📋 Using legacy InvestigationSummary processing');

    const startTime = Date.now();

    // Apply legacy normalization
    const normalizedInput = preNormalizeInvestigationText(input);

    // Use legacy LLM processing
    const response = await this.lmStudioService.processWithAgent(
      this.systemPrompt,
      normalizedInput,
      'investigation-summary'
    );

    // Apply post-processing abbreviation enforcement (same as enhanced)
    const abbreviationEnforcedResponse = this.enforceAbbreviations(response);

    console.log('📝 Legacy processing with abbreviation enforcement completed');

    // Check for error response
    const trimmedResponse = abbreviationEnforcedResponse.trim();
    if (trimmedResponse.startsWith('ERROR – investigation dictation could not be parsed') ||
        trimmedResponse === 'ERROR – investigation dictation could not be parsed coherently.') {
      return this.createErrorReport(input, 'Investigation dictation could not be parsed coherently');
    }

    // Parse using legacy method
    const sections = this.parseResponse(abbreviationEnforcedResponse, _context);

    const processingTime = Date.now() - startTime;

    const report = this.createReport(
      abbreviationEnforcedResponse.trim(),
      sections,
      _context,
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

  protected async buildMessages(input: string, _context?: MedicalContext): Promise<ChatMessage[]> {
    await this.initializeSystemPrompt();

    let systemContent = this.systemPrompt;

    // Add enhanced context if available
    if (_context?.enhancedProcessing) {
      systemContent += '\n\nEnhanced Processing: Focus on clinical accuracy, proper investigation formatting, and preservation of medical terminology.';
    }

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemContent
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

  protected parseResponse(response: string, __context?: MedicalContext): ReportSection[] {
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
