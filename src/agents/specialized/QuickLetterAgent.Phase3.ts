/**
 * QuickLetterAgent - Phase 3 Migration
 * 
 * Migrated version integrating with Phase 3 MedicalSummaryExtractor
 * while maintaining full backward compatibility and exact behavior.
 * 
 * MIGRATION STATUS: Hybrid mode - uses Phase 3 when possible, fallback to legacy
 */

import { NarrativeLetterAgent } from '../base/NarrativeLetterAgent';
import { QUICK_LETTER_SYSTEM_PROMPTS } from './QuickLetterSystemPrompts';
import { QUICK_LETTER_PATIENT_VERSION_SYSTEM_PROMPTS } from './QuickLetterPatientVersionSystemPrompts';
import type { MedicalContext, MedicalReport } from '@/types/medical.types';

// Phase 3 imports
import { medicalSummaryExtractor, type MedicalSummaryConfig, type ClinicalFocusArea } from '@/utils/text-extraction/MedicalSummaryExtractor';
import { medicalTextNormalizer } from '@/utils/medical-text/MedicalTextNormalizer';
import { logger } from '@/utils/Logger';
import { recordConsolidationBenchmark } from '@/utils/performance/ConsolidationMetrics';

/**
 * Phase 3 Migrated Quick Letter Agent
 * Integrates with unified summary extraction while preserving all legacy functionality
 */
export class QuickLetterAgentPhase3 extends NarrativeLetterAgent {
  
  private readonly enablePhase3: boolean = true; // Phase 3 processing enabled
  private readonly fallbackToLegacy: boolean = false; // Phase 3 is stable, no fallback needed

  /**
   * Simple heuristic to detect hallucinated content:
   * Counts tokens (>3 chars) that never appeared in the original dictation.
   * If >15 novel tokens are present, we flag it as hallucination.
   */
  protected detectHallucination(source: string, generated: string): boolean {
    const srcTokens = new Set((source.toLowerCase().match(/\b[a-z0-9]+\b/g) || []));
    const genTokens = generated.toLowerCase().match(/\b[a-z0-9]+\b/g) || [];
    let novel = 0;
    for (const tok of genTokens) {
      if (tok.length > 3 && !srcTokens.has(tok)) {
        novel++;
        if (novel > 15) return true;
      }
    }
    return false;
  }

  // Legacy medication categories preserved for backward compatibility
  private readonly medicationCategories: Record<string, string[]> = {
    'cardiac': [
      'aspirin', 'clopidogrel', 'ticagrelor', 'prasugrel',
      'warfarin', 'rivaroxaban', 'apixaban', 'dabigatran', 'enoxaparin',
      'perindopril', 'ramipril', 'lisinopril', 'candesartan', 'irbesartan', 'telmisartan',
      'metoprolol', 'bisoprolol', 'carvedilol', 'atenolol', 'nebivolol',
      'amlodipine', 'diltiazem', 'verapamil', 'felodipine', 'lercanidipine',
      'frusemide', 'indapamide', 'hydrochlorothiazide', 'spironolactone', 'eplerenone', 'amiloride',
      'atorvastatin', 'simvastatin', 'rosuvastatin', 'pravastatin',
      'amiodarone', 'sotalol', 'flecainide', 'digoxin',
      'sacubitril-valsartan', 'ivabradine', 'vericiguat',
      'glyceryl trinitrate', 'isosorbide mononitrate', 'isosorbide dinitrate', 'nicorandil', 'hydralazine',
      'evolocumab', 'alirocumab', 'inclisiran',
      'dofetilide', 'propafenone', 'disopyramide',
      'macitentan', 'sildenafil', 'tadalafil', 'ambrisentan', 'riociguat'
    ],
    'diabetes': [
      'metformin', 'gliclazide', 'glimepiride', 'insulin', 'empagliflozin', 
      'dapagliflozin', 'sitagliptin', 'linagliptin', 'dulaglutide', 'semaglutide'
    ],
    'respiratory': [
      'salbutamol', 'tiotropium', 'budesonide', 'prednisolone', 'formoterol',
      'salmeterol', 'ipratropium', 'montelukast'
    ],
    'pain': [
      'paracetamol', 'ibuprofen', 'tramadol', 'morphine', 'oxycodone',
      'celecoxib', 'diclofenac', 'naproxen'
    ],
    'gastrointestinal': [
      'omeprazole', 'esomeprazole', 'pantoprazole', 'lansoprazole', 'ranitidine'
    ],
    'other': [
      'allopurinol', 'colchicine', 'levothyroxine', 'vitamin_d', 'calcium'
    ]
  };

  constructor() {
    super(
      'Quick Letter Agent (Phase 3)',
      'Medical Correspondence',
      'Phase 3 migrated agent with unified summary extraction',
      'quick-letter'
    );
    
    this.systemPrompt = QUICK_LETTER_SYSTEM_PROMPTS.primary;
    logger.info('QuickLetterAgent Phase 3 initialized', {
      enablePhase3: this.enablePhase3,
      fallbackEnabled: this.fallbackToLegacy
    });
  }

  async process(input: string, context?: MedicalContext): Promise<MedicalReport> {
    const startTime = Date.now();
    const processingType = context?.isReprocessing ? 'REPROCESSING' : 'ORIGINAL';
    
    logger.info(`Starting QuickLetter Phase 3 processing`, {
      type: processingType,
      inputLength: input.length,
      enablePhase3: this.enablePhase3
    });

    try {
      // Phase 3: Try consolidated approach first
      if (this.enablePhase3) {
        const phase3Result = await this.processWithPhase3(input, context, processingType);
        if (phase3Result) {
          logger.info('QuickLetter Phase 3 processing successful', {
            processingTime: Date.now() - startTime
          });
          return phase3Result;
        }
      }

      // Fallback to legacy processing
      if (this.fallbackToLegacy) {
        logger.warn('QuickLetter falling back to legacy processing', {
          reason: this.enablePhase3 ? 'Phase 3 failed' : 'Phase 3 disabled'
        });
        return await this.processWithLegacy(input, context, processingType);
      }

      throw new Error('Both Phase 3 and legacy processing failed');

    } catch (error) {
      logger.error('QuickLetter processing failed completely', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Process with Phase 3 consolidated approach
   */
  private async processWithPhase3(
    input: string, 
    context?: MedicalContext,
    processingType: string = 'PHASE3'
  ): Promise<MedicalReport | null> {
    const phase3StartTime = performance.now();

    try {
      logger.debug(`Phase 3 QuickLetter processing started`, {
        type: processingType,
        inputLength: input.length
      });

      // Step 1: Normalize input text using Phase 2 consolidation
      const normalizedInput = await this.normalizeInputWithPhase2(input);
      
      // Step 2: Extract enhanced summary using Phase 3 system
      const summaryResult = await this.extractEnhancedSummary(normalizedInput, context);
      
      // Step 3: Generate letter content using enhanced system prompt with context
      const letterContent = await this.generateEnhancedLetterContent(normalizedInput, summaryResult, context);
      
      // Step 4: Apply Phase 3 quality validation
      const qualityValidation = await this.validatePhase3Quality(input, letterContent, summaryResult);
      
      if (!qualityValidation.isValid) {
        logger.warn('Phase 3 quality validation failed', {
          issues: qualityValidation.issues,
          confidence: qualityValidation.confidence
        });
        return null; // Trigger fallback
      }

      // Step 5: Final text processing using Phase 2 consolidation
      const finalContent = await this.finalizeContentWithPhase2(letterContent);
      
      // Step 6: Legacy compatibility checks
      const hasHallucination = this.detectHallucination(input, finalContent);
      const warnings: string[] = hasHallucination ? 
        ['Output may contain material not present in original dictation. Please review carefully.'] : [];
      
      const confidence = this.calculateNarrativeConfidence(input, finalContent);
      const validation = this.validateAndFormatContent(finalContent, input, confidence);
      
      const errors: string[] = [];
      if (validation.hasError && validation.errorMessage) {
        errors.push(validation.errorMessage);
      }

      const endTime = performance.now();
      const processingTime = endTime - phase3StartTime;

      // Record Phase 3 performance
      recordConsolidationBenchmark('quickletter_phase3', processingTime, processingTime, 0);

      // Create enhanced report with Phase 3 metadata
      const report = this.createReport(
        validation.content,
        [],
        context,
        Date.now() - performance.now(), // Convert to ms
        confidence,
        warnings,
        errors
      );

      // Add Phase 3 metadata
      report.metadata.phase3Processing = {
        summaryExtraction: summaryResult.extractionStats,
        qualityMetrics: summaryResult.qualityMetrics,
        clinicalFindings: summaryResult.findings.length,
        processingMethod: 'Phase3_Consolidation',
        normalizedInputLength: normalizedInput.length
      };

      logger.info('Phase 3 QuickLetter processing completed successfully', {
        processingTime,
        confidence,
        clinicalFindings: summaryResult.findings.length,
        qualityScore: summaryResult.qualityMetrics.overallQuality
      });

      return { ...report, content: validation.content, summary: summaryResult.summary };

    } catch (error) {
      logger.error('Phase 3 QuickLetter processing failed', error instanceof Error ? error : new Error(String(error)));
      return null; // Trigger fallback
    }
  }

  /**
   * Normalize input text using Phase 2 consolidation
   */
  private async normalizeInputWithPhase2(input: string): Promise<string> {
    try {
      const result = await medicalTextNormalizer.normalize(input, {
        agentType: 'quick-letter',
        mode: 'narrative',
        enableCrossAgentPatterns: true,
        australianSpelling: true,
        strictMedicalTerms: false,
        preserveFormatting: true
      });

      logger.debug('Phase 2 input normalization completed', {
        originalLength: input.length,
        normalizedLength: result.normalizedText.length,
        patternsApplied: result.appliedPatterns.length
      });

      return result.normalizedText;
    } catch (error) {
      logger.warn('Phase 2 input normalization failed, using original', { error: error instanceof Error ? error.message : String(error) });
      return input;
    }
  }

  /**
   * Extract enhanced summary using Phase 3 system
   */
  private async extractEnhancedSummary(
    normalizedInput: string,
    context?: MedicalContext
  ) {
    const summaryConfig: MedicalSummaryConfig = {
      agentType: 'quick-letter',
      summaryLength: 'standard',
      focusAreas: this.getQuickLetterFocusAreas(normalizedInput),
      extractFindings: true,
      includeMetrics: true,
      preserveOriginalFormat: false,
      australianCompliance: true
    };

    const summaryResult = await medicalSummaryExtractor.extractSummary(normalizedInput, summaryConfig);

    logger.debug('Phase 3 summary extraction completed', {
      summaryLength: summaryResult.summary.length,
      findingsCount: summaryResult.findings.length,
      qualityScore: summaryResult.qualityMetrics.overallQuality,
      processingTime: summaryResult.extractionStats.processingTimeMs
    });

    return summaryResult;
  }

  /**
   * Determine focus areas based on letter content
   */
  private getQuickLetterFocusAreas(text: string): ClinicalFocusArea[] {
    const areas: ClinicalFocusArea[] = ['diagnosis', 'outcomes', 'management'];
    const lowerText = text.toLowerCase();

    // Add focus areas based on content
    if (lowerText.includes('medication') || lowerText.includes('prescription') || lowerText.includes('drug')) {
      areas.push('medications');
    }
    if (lowerText.includes('test') || lowerText.includes('investigation') || lowerText.includes('scan')) {
      areas.push('investigations');
    }
    if (lowerText.includes('procedure') || lowerText.includes('surgery') || lowerText.includes('operation')) {
      areas.push('procedures');
    }
    if (lowerText.includes('complication') || lowerText.includes('adverse') || lowerText.includes('bleeding')) {
      areas.push('complications');
    }

    return areas;
  }

  /**
   * Generate enhanced letter content using Phase 3 insights
   */
  private async generateEnhancedLetterContent(
    normalizedInput: string,
    summaryResult: any,
    context?: MedicalContext
  ): Promise<string> {
    
    // Extract basic letter data for context
    const extractedData = this.extractBasicLetterData(normalizedInput);
    
    // Build enhanced context-aware prompt
    let contextualPrompt = this.systemPrompt;
    
    if (extractedData.letterType !== 'general') {
      contextualPrompt += `\n\nDetected context: This appears to be ${extractedData.letterType} correspondence. Focus on the relevant clinical content while maintaining continuous narrative prose format.`;
    }

    // Add Phase 3 clinical insights to prompt
    if (summaryResult.findings.length > 0) {
      const keyFindings = summaryResult.findings
        .filter((f: any) => f.confidence >= 80)
        .slice(0, 3)
        .map((f: any) => f.finding)
        .join(', ');
      
      if (keyFindings) {
        contextualPrompt += `\n\nKey clinical findings identified: ${keyFindings}. Ensure these are appropriately addressed in the letter.`;
      }
    }

    logger.debug('Generating enhanced letter content', {
      letterType: extractedData.letterType,
      keyFindings: summaryResult.findings.length,
      contextualPromptLength: contextualPrompt.length
    });

    // Get raw model output
    const rawOutput = await this.lmStudioService.processWithAgent(
      contextualPrompt,
      normalizedInput,
      this.agentType
    );

    // Parse structured response
    const { letterContent } = this.parseStructuredResponse(rawOutput);
    
    return letterContent;
  }

  /**
   * Validate Phase 3 quality
   */
  private async validatePhase3Quality(
    originalInput: string,
    letterContent: string,
    summaryResult: any
  ): Promise<{ isValid: boolean; confidence: number; issues: string[] }> {
    
    const issues: string[] = [];
    let confidence = summaryResult.qualityMetrics.overallQuality;

    // Validation checks
    if (letterContent.length < 50) {
      issues.push('Letter content too short');
      confidence -= 30;
    }

    if (letterContent.length > originalInput.length * 5) {
      issues.push('Letter content significantly longer than input (possible hallucination)');
      confidence -= 20;
    }

    // Check for key medical terms preservation
    const originalTerms = this.extractMedicalTerms(originalInput);
    const letterTerms = this.extractMedicalTerms(letterContent);
    
    if (originalTerms.length > 0) {
      const preservedTerms = originalTerms.filter(term => 
        letterTerms.some(letterTerm => 
          letterTerm.toLowerCase().includes(term.toLowerCase()) ||
          term.toLowerCase().includes(letterTerm.toLowerCase())
        )
      );
      
      const preservationRate = preservedTerms.length / originalTerms.length;
      if (preservationRate < 0.7) {
        issues.push('Poor medical terminology preservation');
        confidence -= 25;
      }
    }

    // Quality threshold check
    if (summaryResult.qualityMetrics.clinicalAccuracy < 70) {
      issues.push('Low clinical accuracy score');
      confidence -= 15;
    }

    const isValid = confidence >= 60 && issues.filter(i => i.includes('too short') || i.includes('hallucination')).length === 0;

    logger.debug('Phase 3 quality validation completed', {
      isValid,
      confidence,
      issues: issues.length,
      clinicalAccuracy: summaryResult.qualityMetrics.clinicalAccuracy
    });

    return { isValid, confidence: Math.max(0, confidence), issues };
  }

  /**
   * Finalize content using Phase 2 consolidation
   */
  private async finalizeContentWithPhase2(letterContent: string): Promise<string> {
    try {
      // Apply Phase 2 text cleaning
      const result = await medicalTextNormalizer.normalize(letterContent, {
        mode: 'narrative',
        enableCrossAgentPatterns: false, // Avoid over-processing
        australianSpelling: true,
        preserveFormatting: true
      });

      // Apply legacy paragraph formatting for compatibility
      const finalContent = this.applyFallbackParagraphFormatting(result.normalizedText);

      logger.debug('Phase 2 content finalization completed', {
        originalLength: letterContent.length,
        finalLength: finalContent.length
      });

      return finalContent;
    } catch (error) {
      logger.warn('Phase 2 content finalization failed, using basic cleaning', { error: error instanceof Error ? error.message : String(error) });
      return this.cleanNarrativeTextPreserveParagraphs(letterContent);
    }
  }

  /**
   * Legacy processing method (preserved for fallback)
   */
  private async processWithLegacy(
    input: string, 
    context?: MedicalContext,
    processingType: string = 'LEGACY'
  ): Promise<MedicalReport> {
    logger.info('Using legacy QuickLetter processing', { processingType });

    // Original legacy implementation
    const extractedData = this.extractBasicLetterData(input);
    
    let contextualPrompt = this.systemPrompt;
    if (extractedData.letterType !== 'general') {
      contextualPrompt += `\n\nDetected context: This appears to be ${extractedData.letterType} correspondence. Focus on the relevant clinical content while maintaining continuous narrative prose format.`;
    }

    const rawOutput = await this.lmStudioService.processWithAgent(
      contextualPrompt,
      input,
      this.agentType
    );

    const { summary, letterContent } = this.parseStructuredResponse(rawOutput);
    const cleanedLetter = this.cleanNarrativeTextPreserveParagraphs(letterContent);
    const finalLetter = this.applyFallbackParagraphFormatting(cleanedLetter);
    
    const hasHallucination = this.detectHallucination(input, finalLetter);
    const warnings: string[] = hasHallucination ? 
      ['Output may contain material not present in original dictation. Please review carefully.'] : [];
    const confidence = this.calculateNarrativeConfidence(input, finalLetter);

    const missingInfo = await this.detectMissingInformation(input, extractedData.letterType);
    const validation = this.validateAndFormatContent(finalLetter, input, confidence);
    const errors: string[] = [];
    if (validation.hasError && validation.errorMessage) {
      errors.push(validation.errorMessage);
    }

    const processingTime = Date.now() - Date.now();
    const report = this.createReport(
      validation.content,
      [],
      context,
      processingTime,
      confidence,
      warnings,
      errors
    );

    if (missingInfo) {
      report.metadata.missingInformation = missingInfo;
    }

    return { ...report, content: validation.content, summary };
  }

  // Use base class extractMedicalTerms() for consistency across agents

  // ===== PRESERVED LEGACY METHODS =====
  // All legacy methods preserved exactly for backward compatibility

  private cleanNarrativeTextPreserveParagraphs(text: string): string {
    let cleaned = text;

    // Remove salutations and sign-offs (end-only). Do NOT remove 'Thank you' in body.
    cleaned = cleaned.replace(/^(Dear\s+[^,\n]+,?\s*)/gmi, '');
    cleaned = cleaned.replace(/(?:\r?\n|\r)(Kind\s+regards|Yours\s+sincerely|Best\s+wishes)[\s\S]*$/gmi, '');

    // Remove section headers and formatting
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, ''); // Remove **headings**
    cleaned = cleaned.replace(/^#+\s+.*/gm, ''); // Remove markdown headers
    cleaned = cleaned.replace(/^[-=]{2,}$/gm, ''); // Remove dividers

    // Strip filler words and false starts
    cleaned = cleaned.replace(/\b(um|uh|er|you know|like|I mean|actually|basically|sort of|kind of)\b/gi, '');
    cleaned = cleaned.replace(/\b(\w+)\s+\.\.\.\s+\1\b/gi, '$1');

    // Convert numbers to digits with units
    cleaned = cleaned.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+(mg|mcg|g|ml|l|mmol\/l|mmhg|units?|years?|months?|weeks?|days?|hours?)\b/gi, (match, num, unit) => {
      const numbers: { [key: string]: string } = {
        'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
        'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10'
      };
      return `${numbers[num.toLowerCase()]} ${unit}`;
    });

    // Australian spelling conversions
    const australianSpelling: { [key: string]: string } = {
      'recognize': 'recognise', 'optimize': 'optimise', 'center': 'centre',
      'favor': 'favour', 'color': 'colour', 'organize': 'organise',
      'realize': 'realise', 'analyze': 'analyse', 'defense': 'defence',
      'dyspnea': 'dyspnoea', 'anemia': 'anaemia', 'edema': 'oedema',
      'esophageal': 'oesophageal', 'hemoglobin': 'haemoglobin', 'hemorrhage': 'haemorrhage',
      'leukemia': 'leukaemia', 'pediatric': 'paediatric', 'orthopedic': 'orthopaedic',
      'anesthesia': 'anaesthesia', 'hemodynamic': 'haemodynamic', 'tumor': 'tumour',
      'diarrhea': 'diarrhoea', 'estrogen': 'oestrogen', 'fetus': 'foetus'
    };
    for (const [american, australian] of Object.entries(australianSpelling)) {
      const regex = new RegExp(`\\b${american}\\b`, 'gi');
      cleaned = cleaned.replace(regex, australian);
    }

    // Preserve paragraph structure
    cleaned = cleaned.replace(/\r\n?/g, '\n');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    const paragraphs = cleaned.split('\n\n');
    cleaned = paragraphs
      .map(paragraph => 
        paragraph
          .split('\n')
          .map(line => line.trim())
          .join('\n')
          .trim()
      )
      .filter(paragraph => paragraph.length > 0)
      .join('\n\n');

    cleaned = cleaned.replace(/([.!?])\s*([A-Z])/g, '$1 $2');
    cleaned = cleaned.trim();
    return cleaned;
  }

  private parseStructuredResponse(outputText: string): { summary: string; letterContent: string } {
    try {
      const cleanedOutput = this.preprocessResponseOutput(outputText);
      
      const summaryIdx = cleanedOutput.indexOf('SUMMARY:');
      const letterIdx = cleanedOutput.indexOf('LETTER:');

      if (summaryIdx !== -1 && letterIdx !== -1 && summaryIdx < letterIdx) {
        const summaryRaw = cleanedOutput
          .substring(summaryIdx + 'SUMMARY:'.length, letterIdx)
          .trim();
        const letterContent = cleanedOutput
          .substring(letterIdx + 'LETTER:'.length)
          .trim();

        const summary = this.cleanSummaryText(summaryRaw);
        return { summary, letterContent };
      }

      // Fallback parsing
      const intelligentSummary = this.generateIntelligentSummary(cleanedOutput);
      const fallbackSummary = intelligentSummary.length > 150
        ? intelligentSummary.substring(0, 147) + '...'
        : intelligentSummary;

      return {
        summary: fallbackSummary,
        letterContent: cleanedOutput
      };
    } catch (error) {
      logger.warn('Error parsing structured response', { error });
      const cleanedOutput = this.preprocessResponseOutput(outputText);
      const fallbackSummary = cleanedOutput.length > 150
        ? cleanedOutput.substring(0, 147) + '...'
        : cleanedOutput;
      return { summary: fallbackSummary, letterContent: cleanedOutput };
    }
  }

  private cleanSummaryText(summaryText: string): string {
    return summaryText
      .trim()
      .replace(/[-–—]+\s*$/, '')
      .trim();
  }

  private preprocessResponseOutput(outputText: string): string {
    // Preserved legacy preprocessing logic for compatibility
    let cleaned = outputText;
    const reasoningBlockPatterns = [
      /\[Full rewritten letter content\]\s*\n*/g,
      /\*\*Dictation Analysis:\*\*[\s\S]*?(?=\*\*|SUMMARY:|$)/g,
      /\*\*Summary Planning:\*\*[\s\S]*?(?=\*\*|SUMMARY:|$)/g,
      /\*\*Letter Planning:\*\*[\s\S]*?(?=\*\*|SUMMARY:|$)/g,
    ];

    reasoningBlockPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });

    cleaned = cleaned
      .replace(/\n{4,}/g, '\n\n')
      .replace(/^\s+|\s+$/g, '')
      .trim();

    return cleaned;
  }

  private applyFallbackParagraphFormatting(text: string): string {
    const currentParagraphs = (text.match(/\n\n/g) || []).length;
    const totalSentences = (text.match(/[.!?]\s+/g) || []).length;
    const textLength = text.length;

    if (currentParagraphs > 0 && textLength > 200) {
      const paragraphDensity = totalSentences / (currentParagraphs + 1);
      const minExpectedParagraphs = Math.floor(textLength / 400);
      
      if (paragraphDensity <= 6 && currentParagraphs >= minExpectedParagraphs) {
        return text;
      }
    }

    let formatted = text;
    const paragraphBreakPatterns = [
      /\.\s+(Today|Yesterday|On \w+|This morning|This afternoon|This evening|Initially|Subsequently|Following|After|During|Prior to)\s/g,
      /\.\s+(On examination|Examination revealed|Clinical assessment|Assessment shows|I found|I noted|I observed|The patient|He|She)\s/g,
      /\.\s+(Investigations|Results showed|The ECG|The echo|The chest X-ray|Blood tests|Further testing|Imaging|Laboratory results)\s/g,
      /\.\s+(Treatment|Management|The plan|I recommend|I have arranged|We discussed|I explained|Follow.up|Next steps)\s/g,
      /\.\s+(Given|Considering|In view of|Based on|Therefore|Hence|Consequently|As a result)\s/g,
    ];

    paragraphBreakPatterns.forEach(pattern => {
      formatted = formatted.replace(pattern, (match) => {
        const parts = match.split(/\.\s+/);
        if (parts.length >= 2) {
          return parts[0] + '.\n\n' + parts.slice(1).join('. ');
        }
        return match;
      });
    });

    formatted = formatted.replace(/\n{3,}/g, '\n\n').trim();
    return formatted;
  }

  private generateIntelligentSummary(content: string): string {
    // Legacy intelligent summary generation preserved
    const text = content.toLowerCase();
    const summaryComponents: string[] = [];
    
    const cardiacFindings = this.extractCardiacFindings(text);
    if (cardiacFindings.length > 0) {
      summaryComponents.push(cardiacFindings.join(' + '));
    }
    
    if (summaryComponents.length > 0) {
      let summary = summaryComponents.join('. ');
      summary = this.cleanUpSummary(summary);
      if (!summary.match(/[.!?]$/)) {
        summary += '.';
      }
      return summary;
    }
    
    return this.extractFallbackSummary(content);
  }

  private extractCardiacFindings(text: string): string[] {
    const findings: string[] = [];
    
    const valvePatterns = [
      { pattern: /\b(severe|moderate|mild)\s+(mitral\s+regurgitation|mr)\b/g, abbrev: (severity: string) => `${severity} MR` },
      { pattern: /\b(severe|moderate|mild)\s+(aortic\s+stenosis|as)\b/g, abbrev: (severity: string) => `${severity} AS` },
    ];
    
    valvePatterns.forEach(({ pattern, abbrev }) => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        findings.push(abbrev(match[1]));
      }
    });
    
    return findings;
  }

  private cleanUpSummary(summary: string): string {
    return summary
      .replace(/\s+/g, ' ')
      .replace(/\.\s*\./g, '.')
      .replace(/;\s*;/g, ';')
      .replace(/,\s*,/g, ',')
      .trim();
  }

  private extractFallbackSummary(content: string): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15);
    const clinicalSentences = sentences.filter(s => {
      const lower = s.toLowerCase();
      return !lower.includes('thank you') && !lower.includes('dear') && lower.length > 20;
    });
    
    if (clinicalSentences.length > 0) {
      let summary = clinicalSentences[0].trim();
      if (summary.length > 150) {
        summary = summary.substring(0, 147) + '...';
      }
      return summary;
    }
    
    return content.substring(0, 150).trim() + (content.length > 150 ? '...' : '');
  }

  private extractBasicLetterData(input: string) {
    const text = input.toLowerCase();
    
    return {
      letterType: this.determineLetterType(text),
      urgency: this.extractUrgency(text),
      medications: this.extractMentionedMedications(text)
    };
  }

  private determineLetterType(text: string): string {
    if (text.includes('refer') || text.includes('referral')) return 'referral';
    if (text.includes('follow up') || text.includes('follow-up')) return 'follow-up';
    if (text.includes('discharge') || text.includes('discharged')) return 'discharge';
    if (text.includes('consultation') || text.includes('consult')) return 'consultation';
    if (text.includes('results') || text.includes('test')) return 'results';
    if (text.includes('medication') || text.includes('prescription')) return 'medication';
    return 'general';
  }

  private extractUrgency(text: string): string {
    if (text.includes('immediate') || text.includes('emergent')) return 'immediate';
    if (text.includes('very urgent') || text.includes('asap')) return 'very_urgent';
    if (text.includes('urgent') || text.includes('soon')) return 'urgent';
    if (text.includes('semi urgent')) return 'semi_urgent';
    return 'routine';
  }

  private extractMentionedMedications(text: string): string[] {
    const medications: string[] = [];
    
    for (const [, meds] of Object.entries(this.medicationCategories)) {
      for (const med of meds) {
        if (text.includes(med.toLowerCase())) {
          medications.push(med);
        }
      }
    }
    
    return [...new Set(medications)];
  }

  private async detectMissingInformation(input: string, letterType: string): Promise<any> {
    try {
      const missingInfoPrompt = `${QUICK_LETTER_SYSTEM_PROMPTS.missingInfoDetection}

DICTATION TO ANALYZE:
${input}`;

      const response = await this.lmStudioService.processWithAgent(missingInfoPrompt, input);
      
      try {
        const missingInfo = JSON.parse(response.replace(/```json|```/g, '').trim());
        return missingInfo;
      } catch (parseError) {
        return this.fallbackMissingInfoDetection(input, letterType);
      }
      
    } catch (error) {
      return this.fallbackMissingInfoDetection(input, letterType);
    }
  }

  private fallbackMissingInfoDetection(input: string, letterType: string): any {
    const text = input.toLowerCase();
    const missing = {
      letter_type: letterType,
      missing_purpose: [] as string[],
      missing_clinical: [] as string[],
      missing_recommendations: [] as string[],
      completeness_score: "80%"
    };

    // Basic fallback checks
    if (!text.includes('refer') && !text.includes('follow up') && letterType === 'general') {
      missing.missing_purpose.push('Letter purpose or reason for correspondence');
    }

    return missing;
  }
}
