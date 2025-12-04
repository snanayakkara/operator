import { MedicalAgent } from '@/agents/base/MedicalAgent';
import type {
  MedicalContext,
  ChatMessage,
  ReportSection,
  RightHeartCathReport,
  RightHeartCathData,
  HaemodynamicPressures,
  CardiacOutput,
  ExerciseHaemodynamics,
  RHCComplication,
  VenousAccess,
  RHCIndication,
  RHCPatientData,
  CalculatedHaemodynamics,
  RHCExtractedData,
  RHCValidationResult,
  RHCFieldCorrection
} from '@/types/medical.types';
import { LMStudioService, MODEL_CONFIG } from '@/services/LMStudioService';
import { systemPromptLoader } from '@/services/SystemPromptLoader';
import { RightHeartCathSystemPrompts, RightHeartCathMedicalPatterns, RightHeartCathValidationRules } from './RightHeartCathSystemPrompts';
import * as RHCCalc from '@/services/RHCCalculationService';
import { applyASRCorrections } from '@/utils/ASRCorrections';

/**
 * Specialized agent for processing Right Heart Catheterisation (RHC) procedures.
 * Handles comprehensive haemodynamic assessment with structured pressure measurements,
 * cardiac output calculations, and exercise testing following Australian medical terminology.
 */
export class RightHeartCathAgent extends MedicalAgent {
  private lmStudioService: LMStudioService;
  private systemPromptInitialized = false;
  
  // RHC-specific medical knowledge
  private readonly venousAccessSites: Record<string, VenousAccess> = {
    'basilic': 'right_basilic',
    'right basilic': 'right_basilic',
    'internal jugular': 'right_internal_jugular',
    'right internal jugular': 'right_internal_jugular',
    'femoral': 'right_femoral',
    'right femoral': 'right_femoral'
  };

  private readonly rhcIndications: Record<string, RHCIndication> = {
    'heart failure': 'heart_failure',
    'pulmonary hypertension': 'pulmonary_hypertension',
    'transplant evaluation': 'transplant_evaluation',
    'haemodynamic assessment': 'haemodynamic_assessment',
    'cardiomyopathy': 'cardiomyopathy_evaluation'
  };

  private readonly normalValues = {
    ra: { min: 2, max: 8 },
    rv_systolic: { min: 15, max: 30 },
    rv_diastolic: { min: 2, max: 8 },
    rvedp: { max: 8 },
    pa_systolic: { min: 15, max: 30 },
    pa_diastolic: { min: 4, max: 12 },
    pa_mean: { min: 9, max: 18 },
    pcwp: { min: 6, max: 15 },
    co: { min: 4, max: 8 },
    ci: { min: 2.5, max: 4.0 },
    mixed_venous_o2: { min: 65, max: 75 }
  };

  // Medical terminology corrections for RHC with Australian spelling
  private readonly rhcTerminologyCorrections: Record<string, string> = {
    'right heart cath': 'right heart catheterisation',
    'rhc': 'right heart catheterisation',
    'catheterization': 'catheterisation',
    'hemodynamic': 'haemodynamic',
    'anesthesia': 'anaesthesia',
    'color doppler': 'colour Doppler',
    'color': 'colour',
    'recognize': 'recognise',
    'optimize': 'optimise',
    'utilize': 'utilise',
    'center': 'centre',
    'pulmonary wedge': 'pulmonary capillary wedge pressure',
    'wedge pressure': 'PCWP',
    'swan ganz': 'Swan-Ganz catheter',
    'thermodilution': 'thermodilution',
    // Common transcription errors
    'thick cardiac': 'Fick cardiac', // "thick" is often mishearing of "Fick"
    'tick cardiac': 'Fick cardiac',   // "tick" is also common
    // Vascular access transcription errors
    'venous axis': 'venous access',
    'venus axis': 'venous access',
    'venus access': 'venous access',
    'brachial axis': 'brachial access',
    'brakial': 'brachial',
    'antecubital axis': 'antecubital access',
    'jugular axis': 'jugular access',
    'femoral axis': 'femoral access'
  };

  constructor() {
    super(
      'Right Heart Cath Agent',
      'Cardiology',
      'Generates comprehensive right heart catheterisation procedural reports with structured haemodynamic assessment',
      'right-heart-cath',
      '' // Will be loaded dynamically
    );
    this.lmStudioService = LMStudioService.getInstance();
  }

  private async initializeSystemPrompt(): Promise<void> {
    if (this.systemPromptInitialized) return;

    try {
      this.systemPrompt = await systemPromptLoader.loadSystemPrompt('right-heart-cath', 'primary');
      this.systemPromptInitialized = true;
    } catch (error) {
      console.error('❌ RightHeartCathAgent: Failed to load system prompt:', error);
      this.systemPrompt = 'You are a specialist cardiologist generating right heart catheterisation procedural reports for medical records.'; // Fallback
    }
  }

  async process(input: string, context?: MedicalContext): Promise<RightHeartCathReport> {
    await this.initializeSystemPrompt();

    // DIAGNOSTIC: Confirm process() method is being called
    console.log('🚨 RHC AGENT: process() method STARTED');
    console.log('🚨 RHC AGENT: Input length:', input.length, 'chars');
    console.log('🚨 RHC AGENT: Input preview:', input.substring(0, 200));

    const startTime = Date.now();
    
    try {
      // Store input in memory
      this.updateMemory('currentInput', input);
      this.updateMemory('processingContext', context);

      // Apply ASR corrections for common transcription errors (BEFORE RHC terminology corrections)
      console.log('🚨 RHC AGENT: Applying ASR corrections...');
      const asrCorrectedInput = applyASRCorrections(input, ['cardiology']);
      console.log('✅ RHC AGENT: ASR corrections applied');

      // Correct RHC-specific terminology with Australian spelling
      const correctedInput = this.correctRHCTerminology(asrCorrectedInput);

      // STEP 1: Regex extraction
      console.log('🚨 RHC AGENT: Calling extractRHCData()...');
      const rhcData = this.extractRHCData(correctedInput);
      console.log('🚨 RHC AGENT: extractRHCData() completed');

      console.log('🚨 RHC AGENT: Calling extractHaemodynamicPressures()...');
      const haemodynamicPressures = this.extractHaemodynamicPressures(correctedInput);
      console.log('📊 Extracted haemodynamic pressures:', JSON.stringify(haemodynamicPressures, null, 2));

      console.log('🚨 RHC AGENT: Calling extractCardiacOutput()...');
      const cardiacOutput = this.extractCardiacOutput(correctedInput);
      console.log('💓 Extracted cardiac output:', JSON.stringify(cardiacOutput, null, 2));

      console.log('🚨 RHC AGENT: Calling extractPatientData()...');
      const patientData = this.extractPatientData(correctedInput);
      console.log('👤 Extracted patient data:', JSON.stringify(patientData, null, 2));

      const regexExtracted: RHCExtractedData = {
        rhcData,
        haemodynamicPressures,
        cardiacOutput,
        patientData
      };

      // STEP 2: Quick model validation
      console.log('🚨 RHC AGENT: Starting validation phase...');
      const validation = await this.validateAndDetectGaps(regexExtracted, correctedInput);

      // STEP 3: Apply high-confidence corrections automatically
      console.log('🚨 RHC AGENT: Applying corrections...');
      const correctedData = this.applyCorrections(regexExtracted, validation.corrections, 0.8);

      // STEP 4: Check for critical gaps - INTERACTIVE CHECKPOINT
      // Only trigger checkpoint if there are ACTUALLY critical fields (critical: true)
      // CRITICAL FIX: Exclude fields that were successfully auto-corrected (≥0.8 confidence)
      const autoCorrectedFieldPaths = validation.corrections
        .filter(c => c.confidence >= 0.8)
        .map(c => c.field);

      const remainingCriticalGaps = validation.missingCritical
        .filter(field => !autoCorrectedFieldPaths.includes(field.field)) // Exclude auto-corrected fields
        .filter(field => field.critical === true); // Only truly critical

      const hasLowConfidenceCorrections = validation.corrections.some(c => c.confidence < 0.8);

      if (remainingCriticalGaps.length > 0 || hasLowConfidenceCorrections) {
        console.log(`⚠️ RHC AGENT: Validation requires user input (${remainingCriticalGaps.length} critical fields missing, ${validation.corrections.filter(c => c.confidence < 0.8).length} low-confidence corrections)`);

        // Return incomplete report with validation state
        // UI will show validation modal and re-run process() with user input
        const baseReport = this.createReport('', [], context, 0, 0);
        return {
          ...baseReport,
          title: 'Right Heart Catheterisation - Validation Required',
          content: '',
          sections: [],
          status: 'awaiting_validation',
          validationResult: validation,
          extractedData: correctedData,
          rhcData: correctedData.rhcData,
          haemodynamicPressures: correctedData.haemodynamicPressures,
          cardiacOutput: correctedData.cardiacOutput,
          exerciseHaemodynamics: null,
          complications: [],
          patientData: correctedData.patientData
        } as RightHeartCathReport;
      }

      // STEP 5: Merge user input if provided
      let finalData = correctedData;
      if (context?.userProvidedFields) {
        console.log('🚨 RHC AGENT: Merging user-provided fields...');
        finalData = this.mergeUserInput(correctedData, context.userProvidedFields);
      }

      // STEP 6: Extract exercise/complications
      const exerciseHaemodynamics = this.extractExerciseHaemodynamics(correctedInput);
      const complications = this.identifyComplications(correctedInput);

      // STEP 7: Calculate all derived haemodynamic values - now guaranteed to have all inputs
      console.log('🚨 RHC AGENT: Calling calculateDerivedHaemodynamics()...');
      const calculations = this.calculateDerivedHaemodynamics(
        finalData.haemodynamicPressures,
        finalData.cardiacOutput,
        finalData.patientData
      );
      console.log('🧮 Calculated haemodynamics:', JSON.stringify(calculations, null, 2));

      // Auto-populate calculated CI and Fick CO/CI back into cardiacOutput for display/export
      if (calculations.cardiacIndex !== undefined && !finalData.cardiacOutput.thermodilution.ci) {
        finalData.cardiacOutput.thermodilution.ci = calculations.cardiacIndex.toFixed(2);
      }
      if (calculations.fickCO !== undefined && !finalData.cardiacOutput.fick.co) {
        finalData.cardiacOutput.fick.co = calculations.fickCO.toFixed(2);
      }
      if (calculations.fickCI !== undefined && !finalData.cardiacOutput.fick.ci) {
        finalData.cardiacOutput.fick.ci = calculations.fickCI.toFixed(2);
      }

      // STEP 8: Generate structured report content
      let reportContent = await this.generateStructuredReport(
        finalData.rhcData,
        finalData.haemodynamicPressures,
        finalData.cardiacOutput,
        exerciseHaemodynamics,
        complications,
        correctedInput
      );

      // Apply post-processing formatting to report output
      reportContent = this.formatReportOutput(reportContent);

      // Parse response into sections
      const sections = this.parseResponse(reportContent, context);

      // Create comprehensive RHC report
      const processingTime = Date.now() - startTime;

      // Serialize structured data for display layer parsing
      const structuredDataJson = JSON.stringify({
        rhcData: finalData.rhcData,
        haemodynamicPressures: finalData.haemodynamicPressures,
        cardiacOutput: finalData.cardiacOutput,
        exerciseHaemodynamics,
        complications,
        calculations,
        patientData: finalData.patientData
      }, null, 2);

      // Combine report content with JSON data for backward compatibility
      const combinedContent = `${reportContent}\n\n<!-- RHC_STRUCTURED_DATA_JSON -->\n${structuredDataJson}`;

      const baseReport = this.createReport(combinedContent, sections, context, processingTime, 0.95);

      // Identify missing fields required for calculations
      const missingCalculationFields = this.identifyMissingCalculationFields(
        finalData.haemodynamicPressures,
        finalData.cardiacOutput,
        finalData.patientData
      );

      const report: RightHeartCathReport = {
        ...baseReport,
        status: 'complete',
        rhcData: finalData.rhcData,
        haemodynamicPressures: finalData.haemodynamicPressures,
        cardiacOutput: finalData.cardiacOutput,
        exerciseHaemodynamics,
        complications,
        calculations,
        patientData: finalData.patientData,
        missingCalculationFields
      };

      // DIAGNOSTIC: Verify report structure before return
      console.log('🚨 RHC AGENT: Final report has rhcData?', 'rhcData' in report);
      console.log('🚨 RHC AGENT: Report keys:', Object.keys(report));
      console.log('🚨 RHC AGENT: calculations present?', !!report.calculations);
      console.log('🚨 RHC AGENT: calculations:', JSON.stringify(calculations, null, 2));

      // Store procedure in memory
      this.addProcedureMemory('RHC', {
        indication: rhcData.indication,
        accessSite: rhcData.vascularAccess,
        cardiacOutput: cardiacOutput.thermodilution.co,
        complications: complications.length
      }, 'successful');

      return report;

    } catch (error) {
      console.error('RHC processing error:', error);
      
      // Return fallback report
      const processingTime = Date.now() - startTime;
      return {
        ...this.createReport(
          `RHC processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          [],
          context,
          processingTime,
          0.1
        ),
        rhcData: this.getEmptyRHCData(),
        haemodynamicPressures: this.getEmptyHaemodynamicPressures(),
        cardiacOutput: this.getEmptyCardiacOutput(),
        exerciseHaemodynamics: null,
        complications: []
      };
    }
  }

  protected async buildMessages(input: string, _context?: MedicalContext): Promise<ChatMessage[]> {
    await this.initializeSystemPrompt();

    return [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: `Please analyze this right heart catheterisation procedural dictation and generate a comprehensive report:\n\n"${input}"\n\nGenerate a comprehensive right heart catheterisation procedural report with structured haemodynamic assessment. Use Australian medical terminology (catheterisation, haemodynamic, anaesthesia, colour Doppler) and proper clinical formatting.` }
    ];
  }

  protected parseResponse(response: string, _context?: MedicalContext): ReportSection[] {
    const sections: ReportSection[] = [];
    const lines = response.split('\n');
    let currentSection: ReportSection | null = null;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Check if this is a section header
      if (this.isSectionHeader(trimmedLine)) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }

        // Start new section
        currentSection = {
          title: this.cleanSectionTitle(trimmedLine),
          content: '',
          type: 'structured',
          priority: this.getSectionPriority(trimmedLine)
        };
      } else if (currentSection) {
        // Add content to current section
        currentSection.content += (currentSection.content ? '\n' : '') + trimmedLine;
      }
    }

    // Add final section
    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  private correctRHCTerminology(text: string): string {
    let correctedText = text;
    
    // Apply RHC-specific terminology corrections
    for (const [incorrect, correct] of Object.entries(this.rhcTerminologyCorrections)) {
      const regex = new RegExp(incorrect, 'gi');
      correctedText = correctedText.replace(regex, correct);
    }

    // Apply Australian spelling from validation rules
    for (const { us, au } of RightHeartCathValidationRules.australianSpelling) {
      const regex = new RegExp(`\\b${us}\\b`, 'gi');
      correctedText = correctedText.replace(regex, au);
    }

    // Preserve clinical phrases from validation rules
    for (const phrase of RightHeartCathValidationRules.clinicalPhrases) {
      const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      if (regex.test(correctedText)) {
        // Ensure proper capitalization of preserved clinical phrases
        correctedText = correctedText.replace(regex, phrase);
      }
    }

    return correctedText;
  }

  /**
   * Format the generated report output for consistent styling
   * Applied AFTER LLM generation to fix spacing, capitalization, and phrasing
   */
  private formatReportOutput(reportContent: string): string {
    let formatted = reportContent;

    // ========== ANTI-HALLUCINATION POST-PROCESSING ==========
    // Remove example text that may have leaked from system prompts

    // Detect and flag if exact example conclusion appears (highly suspicious)
    const examplePhrases = [
      /Moderate pulmonary hypertension,\s+with preserved cardiac output and normal left sided pressures\.\s+Significant an[a|æ]emia noted\./gi,
      /\[Primary haemodynamic finding from dictated data\]/gi,
      /\[cardiac output status from measurements\]/gi,
      /\[other significant abnormalities if dictated\]/gi,
      /\[Age\] year old \[gender\]/gi,
      /\[stated diagnosis/gi,
      /\[actual/gi,
      /\[explicitly dictated/gi
    ];

    for (const phrase of examplePhrases) {
      if (phrase.test(formatted)) {
        console.warn('⚠️ RHC AGENT: Detected leaked example text or placeholder in output - this should not happen!');
        console.warn('⚠️ Phrase matched:', phrase);
        // Remove the problematic text
        formatted = formatted.replace(phrase, '[REMOVED - PLACEHOLDER TEXT]');
      }
    }

    // Remove any remaining bracketed placeholders that shouldn't be in final output
    formatted = formatted.replace(/\[.*?\]/g, (match) => {
      // Allow legitimate bracketed content like [site not specified]
      if (match.includes('site not specified') || match.includes('not stated')) {
        return match;
      }
      console.warn('⚠️ RHC AGENT: Removed placeholder bracket text:', match);
      return '';
    });

    // Fix unit spacing: "168 cm" → "168cm", "72 kg" → "72kg"
    // Only applies to height/weight/vital signs, NOT to pressure measurements
    formatted = formatted.replace(/(\d+)\s+(cm|kg)\b/g, '$1$2');

    // Fix conjunction: "mmHg, heart rate" → "mmHg with a heart rate"
    formatted = formatted.replace(/mmHg,\s+heart\s+rate/gi, 'mmHg with a heart rate');

    // Fix Swan-Ganz capitalization variants
    formatted = formatted.replace(/swan\s+gans/gi, 'Swan-Ganz');
    formatted = formatted.replace(/swan\s+ganz/gi, 'Swan-Ganz');
    formatted = formatted.replace(/SWAN\s+GANS/g, 'Swan-Ganz');
    formatted = formatted.replace(/SWAN\s+GANZ/g, 'Swan-Ganz');

    // Add "right heart catheterisation was performed" before catheter description
    formatted = formatted.replace(
      /(vascular\s+access\s+was\s+obtained[^.]+\.)\s+(using\s+a\s+)/gi,
      '$1 Right heart catheterisation was performed $2'
    );

    // Fix "under ultrasound guidance using" → "under ultrasound guidance, and right heart catheterisation was performed using"
    formatted = formatted.replace(
      /under\s+ultrasound\s+guidance\s+using\s+a\s+/gi,
      'under ultrasound guidance, and right heart catheterisation was performed using a '
    );

    return formatted;
  }

  private extractRHCData(input: string): RightHeartCathData {
    return {
      procedureType: 'Right Heart Catheterisation',
      indication: this.extractIndication(input),
      clinicalPresentation: this.extractClinicalPresentation(input),
      recentInvestigations: this.extractRecentInvestigations(input),
      vascularAccess: this.extractVascularAccess(input),
      catheterDetails: this.extractCatheterDetails(input),
      laboratoryValues: this.extractLaboratoryValues(input),
      // Extract radiation safety and contrast data
      fluoroscopyTime: this.extractMeasurement(input, RightHeartCathMedicalPatterns.fluoroscopyTime) || undefined,
      fluoroscopyDose: this.extractMeasurement(input, RightHeartCathMedicalPatterns.fluoroscopyDose) || undefined,
      doseAreaProduct: this.extractMeasurement(input, RightHeartCathMedicalPatterns.doseAreaProduct) || undefined,
      contrastVolume: this.extractMeasurement(input, RightHeartCathMedicalPatterns.contrastVolume) || undefined,
      immediateOutcomes: this.extractImmediateOutcomes(input),
      recommendations: this.extractRecommendations(input),
      followUp: this.extractFollowUp(input)
    };
  }

  private extractHaemodynamicPressures(input: string): HaemodynamicPressures {

    // Use enhanced patterns from RightHeartCathSystemPrompts
    const pcwpMean = this.extractMeasurement(input, RightHeartCathMedicalPatterns.pcwpPressureMean);

    // If PCWP not available, try LVEDP as fallback (e.g., "unable to obtain PCWP, LVEDP imputed 13")
    const lvedp = !pcwpMean ? this.extractMeasurement(input, RightHeartCathMedicalPatterns.lvedp) : null;

    return {
      ra: {
        aWave: this.extractMeasurement(input, RightHeartCathMedicalPatterns.raPressurea),
        vWave: this.extractMeasurement(input, RightHeartCathMedicalPatterns.raPressureV),
        mean: this.extractMeasurement(input, RightHeartCathMedicalPatterns.raPressureMean)
      },
      rv: {
        systolic: this.extractMeasurement(input, RightHeartCathMedicalPatterns.rvPressureSystolic),
        diastolic: this.extractMeasurement(input, RightHeartCathMedicalPatterns.rvPressureDiastolic),
        rvedp: this.extractMeasurement(input, RightHeartCathMedicalPatterns.rvedp)
      },
      pa: {
        systolic: this.extractMeasurement(input, RightHeartCathMedicalPatterns.paPressureSystolic),
        diastolic: this.extractMeasurement(input, RightHeartCathMedicalPatterns.paPressureDiastolic),
        mean: this.extractMeasurement(input, RightHeartCathMedicalPatterns.paPressureMean)
      },
      pcwp: {
        aWave: this.extractMeasurement(input, RightHeartCathMedicalPatterns.pcwpPressureA),
        vWave: this.extractMeasurement(input, RightHeartCathMedicalPatterns.pcwpPressureV),
        mean: pcwpMean || lvedp  // Use LVEDP if PCWP unavailable
      }
    };
  }

  private extractCardiacOutput(input: string): CardiacOutput {

    return {
      thermodilution: {
        co: this.extractMeasurement(input, RightHeartCathMedicalPatterns.thermodilutionCO),
        ci: this.extractMeasurement(input, RightHeartCathMedicalPatterns.thermodilutionCI)
      },
      fick: {
        co: this.extractMeasurement(input, RightHeartCathMedicalPatterns.fickCO),
        ci: this.extractMeasurement(input, RightHeartCathMedicalPatterns.fickCI)
      },
      mixedVenousO2: this.extractMeasurement(input, RightHeartCathMedicalPatterns.mixedVenousO2) ||
                     this.extractMeasurement(input, RightHeartCathMedicalPatterns.pulmonaryArterySaturation), // Fallback to PA saturation
      wedgeSaturation: this.extractMeasurement(input, RightHeartCathMedicalPatterns.wedgeSaturation)
    };
  }

  private extractExerciseHaemodynamics(input: string): ExerciseHaemodynamics | null {
    const text = input.toLowerCase();
    
    // Check if exercise testing was performed
    if (!RightHeartCathMedicalPatterns.exerciseProtocol.test(text) && !RightHeartCathMedicalPatterns.postExercise.test(text)) {
      return null;
    }

    // Extract exercise duration
    const durationMatch = text.match(RightHeartCathMedicalPatterns.exerciseDuration);
    const duration = durationMatch ? parseInt(durationMatch[1]) : 2; // Default 2 minutes

    // Split text to find post-exercise measurements
    const postExerciseText = text.split(/post[-\s]?exercise/i)[1] || '';
    
    return {
      protocol: 'Straight leg raising',
      duration: `${duration} minutes`,
      preExercise: this.extractHaemodynamicPressures(input), // Use full input for baseline
      postExercise: this.extractHaemodynamicPressures(postExerciseText), // Use post-exercise text
      response: this.calculateExerciseResponse(input)
    };
  }

  private identifyComplications(input: string): RHCComplication[] {
    const text = input.toLowerCase();
    const complications: RHCComplication[] = [];

    // Check for specific complications
    const complicationPatterns = [
      {
        pattern: RightHeartCathMedicalPatterns.arrhythmias,
        type: 'arrhythmias' as const,
        severity: 'minor' as const
      },
      {
        pattern: RightHeartCathMedicalPatterns.catheterKnotting,
        type: 'catheter_knotting' as const,
        severity: 'major' as const
      },
      {
        pattern: RightHeartCathMedicalPatterns.tricuspidRegurgitation,
        type: 'tricuspid_regurgitation' as const,
        severity: 'minor' as const
      },
      {
        pattern: RightHeartCathMedicalPatterns.pneumothorax,
        type: 'pneumothorax' as const,
        severity: 'major' as const
      }
    ];

    for (const { pattern, type, severity } of complicationPatterns) {
      if (pattern.test(text)) {
        complications.push({
          type,
          severity,
          description: this.extractComplicationDescription(text, pattern),
          management: this.extractComplicationManagement(text, pattern)
        });
      }
    }

    return complications;
  }

  private async generateStructuredReport(
    rhcData: RightHeartCathData,
    haemodynamicPressures: HaemodynamicPressures,
    cardiacOutput: CardiacOutput,
    exerciseHaemodynamics: ExerciseHaemodynamics | null,
    complications: RHCComplication[],
    originalInput: string
  ): Promise<string> {
    console.log(`🔧 Generating RHC report with LMStudio ${MODEL_CONFIG.REASONING_MODEL}...`);
    
    try {
      // Prepare comprehensive context for LMStudio
      const extractedData = {
        rhcData,
        haemodynamicPressures,
        cardiacOutput,
        exerciseHaemodynamics,
        complications
      };
      
      // Use proper RHC system prompts for content generation with extracted data context
      const contextualPrompt = `${RightHeartCathSystemPrompts.rightHeartCathProcedureAgent.systemPrompt}

EXTRACTED DATA CONTEXT:
${JSON.stringify(extractedData, null, 2)}

Generate a comprehensive right heart catheterisation procedural report using the above extracted data and the following dictation. Include all relevant pressure measurements, cardiac output calculations, and haemodynamic assessments. Use proper Australian medical terminology (catheterisation, haemodynamic, colour) and structured formatting with precise units.`;

      const rawReport = await this.lmStudioService.processWithAgent(contextualPrompt, originalInput);

      // Post-process the report to clean output and enforce Australian spelling
      const cleanedReport = this.postProcessReport(rawReport);

      console.log('✅ RHC report generated successfully');
      return cleanedReport;
      
    } catch (error) {
      console.error('❌ Error generating RHC report:', error);
      
      // Fallback to narrative format if LMStudio fails
      return `**PREAMBLE**
Patient underwent right heart catheterisation for ${rhcData.indication.replace('_', ' ')} assessment. ${rhcData.clinicalPresentation ? `Clinical presentation included ${rhcData.clinicalPresentation}.` : ''} ${rhcData.recentInvestigations ? `Recent investigations demonstrated ${rhcData.recentInvestigations}.` : ''} Vascular access was planned via ${rhcData.vascularAccess.replace('_', ' ')}.

**FINDINGS**
Right heart catheterisation was performed via ${rhcData.vascularAccess.replace('_', ' ')} approach with successful catheter positioning. Resting haemodynamic assessment revealed right atrial pressures with ${haemodynamicPressures.ra.aWave ? `a wave of ${haemodynamicPressures.ra.aWave} mmHg` : 'normal a wave'}, ${haemodynamicPressures.ra.vWave ? `v wave of ${haemodynamicPressures.ra.vWave} mmHg` : 'normal v wave'}, and ${haemodynamicPressures.ra.mean ? `mean pressure of ${haemodynamicPressures.ra.mean} mmHg` : 'normal mean pressure'}.

Right ventricular pressures demonstrated ${haemodynamicPressures.rv.systolic ? `systolic pressure of ${haemodynamicPressures.rv.systolic} mmHg` : 'normal systolic pressure'} with ${haemodynamicPressures.rv.diastolic ? `diastolic pressure of ${haemodynamicPressures.rv.diastolic} mmHg` : 'normal diastolic pressure'} and ${haemodynamicPressures.rv.rvedp ? `right ventricular end-diastolic pressure of ${haemodynamicPressures.rv.rvedp} mmHg` : 'normal end-diastolic pressure'}.

Pulmonary artery pressures showed ${haemodynamicPressures.pa.systolic ? `systolic pressure of ${haemodynamicPressures.pa.systolic} mmHg` : 'normal systolic pressure'}, ${haemodynamicPressures.pa.diastolic ? `diastolic pressure of ${haemodynamicPressures.pa.diastolic} mmHg` : 'normal diastolic pressure'}, and ${haemodynamicPressures.pa.mean ? `mean pressure of ${haemodynamicPressures.pa.mean} mmHg` : 'normal mean pressure'}.

Cardiac output assessment by thermodilution demonstrated ${cardiacOutput.thermodilution.co ? `${cardiacOutput.thermodilution.co} L/min` : 'normal cardiac output'} with ${cardiacOutput.thermodilution.ci ? `cardiac index of ${cardiacOutput.thermodilution.ci} L/min/m²` : 'normal cardiac index'}. ${cardiacOutput.fick.co ? `Fick method confirmed cardiac output of ${cardiacOutput.fick.co} L/min.` : ''} ${cardiacOutput.mixedVenousO2 ? `Mixed venous oxygen saturation was ${cardiacOutput.mixedVenousO2}%.` : ''} ${rhcData.laboratoryValues.haemoglobin ? `Laboratory assessment showed haemoglobin of ${rhcData.laboratoryValues.haemoglobin} g/L` : ''}${rhcData.laboratoryValues.lactate ? ` and lactate of ${rhcData.laboratoryValues.lactate} mmol/L.` : '.'}

**CONCLUSION**
The haemodynamic assessment demonstrates findings consistent with the clinical indication. ${complications.length > 0 ? `Procedural complications included ${complications.map(c => c.description).join(', ')}.` : 'No procedural complications were encountered.'} ${rhcData.recommendations ? rhcData.recommendations : 'Further management recommendations will be based on these findings.'} ${rhcData.followUp ? rhcData.followUp : 'Follow-up assessment is planned as clinically indicated.'}

Note: This report was generated with limited AI processing. Clinical review is recommended.`;
    }
  }

  /**
   * Identify missing fields required for haemodynamic calculations
   */
  private identifyMissingCalculationFields(
    pressures: HaemodynamicPressures,
    cardiacOutput: CardiacOutput,
    patientData: RHCPatientData
  ): string[] {
    const missing: string[] = [];

    // Essential patient data for calculations
    if (!patientData.height) {
      missing.push('Height (cm) - required for BSA and cardiac index calculations');
    }
    if (!patientData.weight) {
      missing.push('Weight (kg) - required for BSA, BMI, and cardiac index calculations');
    }
    if (!patientData.heartRate) {
      missing.push('Heart rate (bpm) - required for stroke volume calculation');
    }
    if (!patientData.systolicBP || !patientData.diastolicBP) {
      missing.push('Blood pressure (mmHg) - required for MAP and SVR calculations');
    }

    // Pressure measurements for TPG, DPG, PVR
    if (!pressures.pa.mean) {
      missing.push('PA mean pressure (mmHg) - required for TPG and PVR calculations');
    }
    if (!pressures.pa.diastolic) {
      missing.push('PA diastolic pressure (mmHg) - required for DPG calculation');
    }
    if (!pressures.pcwp.mean) {
      missing.push('PCWP mean pressure (mmHg) - required for TPG, DPG, and PVR calculations');
    }

    // Cardiac output for PVR and other indices
    if (!cardiacOutput.thermodilution.co) {
      missing.push('Cardiac output (L/min) - required for PVR, CI, and resistance calculations');
    }

    // Additional data for Fick calculations
    if (!patientData.haemoglobin) {
      missing.push('Haemoglobin (g/L) - required for Fick cardiac output calculation');
    }
    if (!patientData.sao2) {
      missing.push('Arterial oxygen saturation (%) - required for Fick calculation');
    }
    if (!patientData.svo2 && !cardiacOutput.mixedVenousO2) {
      missing.push('Mixed venous oxygen saturation (%) - required for Fick calculation and O2 extraction ratio');
    }

    return missing;
  }

  /**
   * Post-process LLM output to remove markdown, conversational preambles, and enforce Australian spelling
   */
  private postProcessReport(rawReport: string): string {
    let cleaned = rawReport;

    // Remove conversational preambles
    const preamblePatterns = [
      /^Okay,?\s+here\s+is\s+(?:a\s+)?(?:draft\s+)?.*?:\s*/i,
      /^Sure,?\s+I\s+can\s+(?:help\s+)?(?:with\s+)?.*?:\s*/i,
      /^Let\s+me\s+(?:generate|create|draft).*?:\s*/i,
      /^Here\s+is\s+(?:a\s+)?(?:the\s+)?.*?:\s*/i
    ];

    for (const pattern of preamblePatterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    // Remove markdown bold syntax
    cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');

    // Remove markdown headers (## or ###)
    cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');

    // Remove markdown bullet points (convert to plain text)
    cleaned = cleaned.replace(/^[*-]\s+/gm, '');

    // Remove template placeholders
    cleaned = cleaned.replace(/\[Insert\s+[^\]]+\]/gi, '');

    // Enforce Australian spelling
    for (const { us, au } of RightHeartCathValidationRules.australianSpelling) {
      const regex = new RegExp(`\\b${us}\\b`, 'gi');
      cleaned = cleaned.replace(regex, au);
    }

    // Additional American to Australian conversions
    cleaned = cleaned.replace(/\bhemoglobin\b/gi, 'haemoglobin');
    cleaned = cleaned.replace(/\bhemodynamic\b/gi, 'haemodynamic');
    cleaned = cleaned.replace(/\bcatheterization\b/gi, 'catheterisation');
    cleaned = cleaned.replace(/\banalyze\b/gi, 'analyse');
    cleaned = cleaned.replace(/\borganize\b/gi, 'organise');

    // Trim excess whitespace
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines
    cleaned = cleaned.trim();

    return cleaned;
  }

  // Helper methods for data extraction
  private extractMeasurement(text: string, pattern: RegExp): string | null {
    // Reset regex lastIndex to ensure fresh search
    pattern.lastIndex = 0;

    const match = pattern.exec(text);
    if (match) {
      // Return the first non-undefined captured group (the numeric value)
      // This handles patterns with multiple capture groups where only one matches
      return match[1] || match[2] || match[3] || null;
    }
    return null;
  }

  private extractIndication(input: string): RHCIndication {
    const text = input.toLowerCase();
    
    for (const [key, value] of Object.entries(this.rhcIndications)) {
      if (text.includes(key)) {
        return value;
      }
    }
    
    return 'haemodynamic_assessment'; // Default indication
  }

  private extractVascularAccess(input: string): VenousAccess {
    const text = input.toLowerCase();
    
    for (const [key, value] of Object.entries(this.venousAccessSites)) {
      if (text.includes(key)) {
        return value;
      }
    }
    
    return 'right_femoral'; // Default access site
  }

  private extractClinicalPresentation(input: string): string {
    return this.extractValue(input, /(?:clinical\s+)?presentation[:\s]+([^.]+)/i) || '';
  }

  private extractRecentInvestigations(input: string): string {
    return this.extractValue(input, /(?:recent\s+)?(?:echo|echocardiography|investigation)[:\s]+([^.]+)/i) || '';
  }

  private extractCatheterDetails(input: string): string {
    const frenchMatch = input.match(RightHeartCathMedicalPatterns.frenchSize);
    const swanGanzMatch = input.match(RightHeartCathMedicalPatterns.swanGanz);

    const size = frenchMatch ? frenchMatch[1] : null;
    const isSwanGanz = !!swanGanzMatch;

    console.log('🔍 Catheter extraction:', {
      input: input.substring(input.length - 50),
      frenchMatch: frenchMatch?.[0],
      size,
      swanGanzMatch: swanGanzMatch?.[0],
      isSwanGanz
    });

    // Combine size and type when both are present
    if (size && isSwanGanz) {
      return `${size}F Swan-Ganz catheter`;
    } else if (size) {
      return `${size}F catheter`;
    } else if (isSwanGanz) {
      return 'Swan-Ganz catheter';
    }
    return 'Thermodilution catheter';
  }

  private extractLaboratoryValues(input: string) {
    return {
      haemoglobin: this.extractMeasurement(input, RightHeartCathMedicalPatterns.haemoglobin),
      lactate: this.extractMeasurement(input, RightHeartCathMedicalPatterns.lactate)
    };
  }

  private extractImmediateOutcomes(input: string): string {
    return this.extractValue(input, /(?:outcomes?|results?)[:\s]+([^.]+)/i) || '';
  }

  private extractRecommendations(input: string): string {
    return this.extractValue(input, /recommendations?[:\s]+([^.]+)/i) || '';
  }

  private extractFollowUp(input: string): string {
    return this.extractValue(input, /follow[- ]?up[:\s]+([^.]+)/i) || '';
  }

  private extractValue(input: string, pattern: RegExp): string | undefined {
    const match = input.match(pattern);
    return match ? match[1].trim() : undefined;
  }

  private calculateExerciseResponse(_input: string): string {
    // Simple exercise response calculation - could be enhanced
    return 'Exercise response assessed with pressure changes documented';
  }

  private extractComplicationDescription(text: string, pattern: RegExp): string {
    const match = text.match(pattern);
    return match ? match[0] : 'Complication identified';
  }

  private extractComplicationManagement(text: string, pattern: RegExp): string | undefined {
    // Look for management text near the complication
    const match = text.match(pattern);
    if (match) {
      const index = match.index || 0;
      const afterText = text.substring(index + match[0].length, index + match[0].length + 200);
      const managementMatch = afterText.match(/(?:managed|treated|addressed)[^.]+/i);
      return managementMatch ? managementMatch[0] : undefined;
    }
    return undefined;
  }

  /**
   * Extract patient anthropometric and vital sign data from dictation
   */
  private extractPatientData(input: string): RHCPatientData {
    const patientData: RHCPatientData = {};

    console.log('🔍 RHC: Extracting patient data from input:', input.substring(0, 300));

    // Extract height (cm) - handles "height: 180", "height. 180", "Patient height 180 centimeters"
    const heightMatch = input.match(/(?:patient\s+)?height[:\s.]+(\d+)\s*(?:cm|centimeters?)?/i);
    if (heightMatch) {
      patientData.height = parseFloat(heightMatch[1]);
      console.log('✅ RHC: Extracted height:', patientData.height, 'cm from match:', heightMatch[0]);
    } else {
      console.log('❌ RHC: No height match found');
    }

    // Extract weight (kg) - handles "weight: 100", "weight. 100", "Patient weight 100 kilograms"
    const weightMatch = input.match(/(?:patient\s+)?weight[:\s.]+(\d+(?:\.\d+)?)\s*(?:kg|kilograms?)?/i);
    if (weightMatch) {
      patientData.weight = parseFloat(weightMatch[1]);
      console.log('✅ RHC: Extracted weight:', patientData.weight, 'kg from match:', weightMatch[0]);
    } else {
      console.log('❌ RHC: No weight match found');
    }

    // Extract age (years)
    const ageMatch = input.match(/(?:age|aged)[:\s]+(\d+)\s*(?:years?|yo|y\/o)?/i);
    if (ageMatch) {
      patientData.age = parseFloat(ageMatch[1]);
    }

    // Extract gender
    const genderMatch = input.match(/(?:gender|sex)[:\s]+(male|female|m|f)\b/i);
    if (genderMatch) {
      const genderRaw = genderMatch[1].toLowerCase();
      if (genderRaw === 'male' || genderRaw === 'm') {
        patientData.gender = 'male';
      } else if (genderRaw === 'female' || genderRaw === 'f') {
        patientData.gender = 'female';
      } else {
        patientData.gender = 'other';
      }
    }

    // Extract heart rate (bpm) - enhanced to handle multiple variations
    const hrMatch = input.match(/(?:heart\s+rate|HR|pulse|resting\s+heart\s+rate)(?:\s+was|\s+is)?[:\s]+(\d+)|(\d+)\s+(?:beats?\s+per\s+minute|bpm)/i);
    if (hrMatch) {
      patientData.heartRate = parseFloat(hrMatch[1] || hrMatch[2]);
    }

    // Extract blood pressure - enhanced to handle "systemic blood pressure" and "on" separator
    const sysBPMatch = input.match(/(?:systemic\s+)?blood\s+pressure[:\s]+(\d+)\s*(?:\/|on|-)\s*(\d+)/i);
    if (sysBPMatch) {
      patientData.systolicBP = parseFloat(sysBPMatch[1]);
      patientData.diastolicBP = parseFloat(sysBPMatch[2]);
    }

    // Extract MAP (mean arterial pressure)
    const mapMatch = input.match(/(?:map|mean\s+arterial\s+pressure)[:\s]+(\d+)/i);
    if (mapMatch) {
      patientData.meanArterialPressure = parseFloat(mapMatch[1]);
    } else if (patientData.systolicBP && patientData.diastolicBP) {
      // Calculate MAP if not provided: MAP = (SBP + 2*DBP) / 3
      patientData.meanArterialPressure = RHCCalc.calculateMAP(patientData.systolicBP, patientData.diastolicBP);
    }

    // Extract arterial oxygen saturation - enhanced to handle "aortic arterial saturation"
    const sao2Match = input.match(/(?:aortic|arterial)\s+(?:arterial\s+)?(?:oxygen\s+)?saturation[:\s,]+(\d+)/i);
    if (sao2Match) {
      patientData.sao2 = parseFloat(sao2Match[1]);
      console.log('✅ RHC: Extracted SaO2:', patientData.sao2, '% from match:', sao2Match[0]);
    } else {
      console.log('❌ RHC: No SaO2 match found');
    }

    // Extract mixed venous oxygen saturation - enhanced with PA saturation fallback
    // Pattern handles: "mixed venous", "mixed mean is" (ASR error), "mixed means" (ASR error)
    // Note: ASR corrections should convert these to "mixed venous", but defensive pattern kept for robustness
    const svo2Match = input.match(/mixed\s+(?:venous|mean\s+(?:is|venous)|means)\s+(?:oxygen\s+)?saturation[:\s,]+(\d+)/i);
    if (svo2Match) {
      patientData.svo2 = parseFloat(svo2Match[1]);
      console.log('✅ RHC: Extracted SvO2:', patientData.svo2, '% from match:', svo2Match[0]);
    } else {
      // Fallback to pulmonary artery saturation if mixed venous not available
      const paSatMatch = input.match(/pulmonary\s+artery\s+(?:oxygen\s+)?saturation[:\s,]+(\d+)/i);
      if (paSatMatch) {
        patientData.svo2 = parseFloat(paSatMatch[1]);
        console.log('✅ RHC: Extracted SvO2 from PA saturation:', patientData.svo2, '% from match:', paSatMatch[0]);
      } else {
        console.log('❌ RHC: No SvO2 match found');
      }
    }

    // Extract PaO2
    const pao2Match = input.match(/PaO2[:\s]+(\d+)|arterial\s+(?:partial\s+)?pressure\s+(?:of\s+)?oxygen[:\s]+(\d+)/i);
    if (pao2Match) {
      patientData.pao2 = parseFloat(pao2Match[1] || pao2Match[2]);
    }

    // Extract haemoglobin (g/L) - already extracted in laboratory values, but also check here
    const hbMatch = input.match(/h(?:ae|e)moglobin[:\s]+(\d+)|Hb[:\s]+(\d+)/i);
    if (hbMatch) {
      patientData.haemoglobin = parseFloat(hbMatch[1] || hbMatch[2]);
    }

    // Extract lactate (mmol/L)
    const lactateMatch = input.match(/lactate[:\s]+(\d+(?:\.\d+)?)/i);
    if (lactateMatch) {
      patientData.lactate = parseFloat(lactateMatch[1]);
    }

    // Calculate BSA if height and weight available
    if (patientData.height && patientData.weight) {
      patientData.bsa = RHCCalc.calculateBSA(patientData.height, patientData.weight);
      patientData.bmi = RHCCalc.calculateBMI(patientData.height, patientData.weight);
    }

    // Calculate MAP if BP available
    if (patientData.systolicBP && patientData.diastolicBP) {
      patientData.meanArterialPressure = RHCCalc.calculateMAP(patientData.systolicBP, patientData.diastolicBP);
    }

    console.log('📊 RHC: Final extracted patient data:', {
      height: patientData.height,
      weight: patientData.weight,
      bsa: patientData.bsa,
      sao2: patientData.sao2,
      svo2: patientData.svo2,
      haemoglobin: patientData.haemoglobin
    });

    return patientData;
  }

  /**
   * Calculate all derived haemodynamic values using the RHC Calculation Service
   * Implements all three tiers of calculations following Australian/ESC 2022 guidelines
   */
  private calculateDerivedHaemodynamics(
    pressures: HaemodynamicPressures,
    cardiacOutput: CardiacOutput,
    patientData: RHCPatientData
  ): CalculatedHaemodynamics {
    const calculations: CalculatedHaemodynamics = {};

    // Convert string values to numbers for calculations
    const parseValue = (val: string | null | undefined): number | undefined => {
      if (!val) return undefined;
      const parsed = parseFloat(val);
      return isNaN(parsed) ? undefined : parsed;
    };

    // Extract numeric values from pressure data
    const rapMean = parseValue(pressures.ra.mean);
    const _rvSys = parseValue(pressures.rv.systolic);
    const _rvDia = parseValue(pressures.rv.diastolic);
    const paSys = parseValue(pressures.pa.systolic);
    const paDia = parseValue(pressures.pa.diastolic);
    const paMean = parseValue(pressures.pa.mean);
    const pcwpMean = parseValue(pressures.pcwp.mean);

    // Extract cardiac output values
    const thermodilutionCO = parseValue(cardiacOutput.thermodilution.co);
    const _thermodilutionCI = parseValue(cardiacOutput.thermodilution.ci);
    const _mixedVenousO2 = parseValue(cardiacOutput.mixedVenousO2);

    // ========== TIER 1: ESSENTIAL CALCULATIONS ==========
    // Copy calculated patient data
    if (patientData.bsa) calculations.bsa = patientData.bsa;
    if (patientData.bmi) calculations.bmi = patientData.bmi;
    if (patientData.meanArterialPressure) calculations.map = patientData.meanArterialPressure;

    // Calculate stroke volume
    if (thermodilutionCO && patientData.heartRate) {
      calculations.strokeVolume = RHCCalc.calculateStrokeVolume(thermodilutionCO, patientData.heartRate);
    }

    // Calculate cardiac index
    if (thermodilutionCO && patientData.bsa) {
      calculations.cardiacIndex = RHCCalc.calculateCardiacIndex(thermodilutionCO, patientData.bsa);
    }

    // Estimate VO2 with gender-specific formula
    if (patientData.bsa) {
      calculations.estimatedVO2 = RHCCalc.estimateVO2(patientData.bsa, patientData.gender);
    }

    // Transpulmonary gradient
    calculations.transpulmonaryGradient = RHCCalc.calculateTPG(paMean, pcwpMean);

    // Diastolic pressure gradient
    calculations.diastolicPressureGradient = RHCCalc.calculateDPG(paDia, pcwpMean);

    // Pulmonary vascular resistance
    calculations.pulmonaryVascularResistance = RHCCalc.calculatePVR(paMean, pcwpMean, thermodilutionCO);
    if (calculations.pulmonaryVascularResistance && patientData.bsa) {
      calculations.pulmonaryVascularResistanceIndex = RHCCalc.calculatePVRI(
        calculations.pulmonaryVascularResistance,
        patientData.bsa
      );
    }

    // Systemic vascular resistance
    if (patientData.meanArterialPressure && thermodilutionCO) {
      calculations.systemicVascularResistance = RHCCalc.calculateSVR(
        patientData.meanArterialPressure,
        rapMean || 0,
        thermodilutionCO
      );
      if (calculations.systemicVascularResistance && patientData.bsa) {
        calculations.systemicVascularResistanceIndex = RHCCalc.calculateSVRI(
          calculations.systemicVascularResistance,
          patientData.bsa
        );
      }
    }

    // ========== TIER 2: HIGH-VALUE CALCULATIONS ==========
    // Fick cardiac output
    if (calculations.estimatedVO2 && patientData.haemoglobin && patientData.sao2 && patientData.svo2) {
      calculations.fickCO = RHCCalc.calculateFickCO(
        calculations.estimatedVO2,
        patientData.haemoglobin,
        patientData.sao2,
        patientData.svo2
      );
      if (calculations.fickCO && patientData.bsa) {
        calculations.fickCI = RHCCalc.calculateCardiacIndex(calculations.fickCO, patientData.bsa);
      }
    }

    // Cardiac power output
    if (patientData.meanArterialPressure && thermodilutionCO) {
      calculations.cardiacPowerOutput = RHCCalc.calculateCPO(patientData.meanArterialPressure, thermodilutionCO);
    }

    // Cardiac power index
    if (patientData.meanArterialPressure && calculations.cardiacIndex) {
      calculations.cardiacPowerIndex = RHCCalc.calculateCPI(patientData.meanArterialPressure, calculations.cardiacIndex);
    }

    // Stroke volume index
    if (calculations.cardiacIndex && patientData.heartRate) {
      calculations.strokeVolumeIndex = RHCCalc.calculateSVI(calculations.cardiacIndex, patientData.heartRate);
    }

    // RVSWI
    if (paMean && calculations.strokeVolumeIndex) {
      calculations.rvswi = RHCCalc.calculateRVSWI(paMean, rapMean || 0, calculations.strokeVolumeIndex);
    }

    // LVSWI
    if (patientData.meanArterialPressure && pcwpMean && calculations.strokeVolumeIndex) {
      calculations.lvswi = RHCCalc.calculateLVSWI(
        patientData.meanArterialPressure,
        pcwpMean,
        calculations.strokeVolumeIndex
      );
    }

    // PAPi
    calculations.papi = RHCCalc.calculatePAPi(paSys, paDia, rapMean);

    // RAP:PCWP ratio
    calculations.rapPawpRatio = RHCCalc.calculateRAPPCWPRatio(rapMean, pcwpMean);

    // RV cardiac power output
    if (paMean && thermodilutionCO) {
      calculations.rvCardiacPowerOutput = RHCCalc.calculateRVCPO(paMean, thermodilutionCO);
    }

    // ========== TIER 3: ADVANCED CALCULATIONS ==========
    // Oxygen delivery
    if (thermodilutionCO && patientData.haemoglobin && patientData.sao2) {
      calculations.oxygenDelivery = RHCCalc.calculateOxygenDelivery(
        thermodilutionCO,
        patientData.haemoglobin,
        patientData.sao2,
        patientData.pao2
      );
    }

    // Oxygen extraction ratio
    if (patientData.sao2 && patientData.svo2) {
      calculations.oxygenExtractionRatio = RHCCalc.calculateOxygenExtractionRatio(
        patientData.sao2,
        patientData.svo2
      );
    }

    // Pulmonary arterial compliance
    if (calculations.strokeVolume && paSys && paDia) {
      calculations.pulmonaryArterialCompliance = RHCCalc.calculatePAC(
        calculations.strokeVolume,
        paSys,
        paDia
      );

      // Pulmonary RC time
      if (calculations.pulmonaryVascularResistance && calculations.pulmonaryArterialCompliance) {
        calculations.pulmonaryRCTime = RHCCalc.calculatePulmonaryRCTime(
          calculations.pulmonaryVascularResistance,
          calculations.pulmonaryArterialCompliance
        );
      }
    }

    // Effective pulmonary Ea
    if (paMean && pcwpMean && calculations.strokeVolume) {
      calculations.effectivePulmonaryEa = RHCCalc.calculateEffectivePulmonaryEa(
        paMean,
        pcwpMean,
        calculations.strokeVolume
      );
    }

    // LV end-systolic elastance (if volume data available)
    if (patientData.lvesp && patientData.lvesv) {
      calculations.lvEes = RHCCalc.calculateLVEes(patientData.lvesp, patientData.lvesv);
    }

    // RA end-systolic elastance (if volume data available)
    if (patientData.rapSystolic && patientData.raesv) {
      calculations.raEes = RHCCalc.calculateRAEes(
        patientData.rapSystolic,
        patientData.rapZero,
        patientData.raesv
      );
    }

    // ========== CLINICAL ASSESSMENT ==========
    // Pulmonary hypertension classification
    calculations.phClassification = RHCCalc.classifyPulmonaryHypertension(
      paMean,
      pcwpMean,
      calculations.pulmonaryVascularResistance
    );

    // Generate comprehensive clinical assessment
    const clinicalAssessment = RHCCalc.generateClinicalAssessment({
      paMean,
      pcwp: pcwpMean,
      pvr: calculations.pulmonaryVascularResistance,
      cardiacIndex: calculations.cardiacIndex,
      rap: rapMean,
      svr: calculations.systemicVascularResistance
    });

    calculations.clinicalAssessment = clinicalAssessment.assessment;
    calculations.riskStratification = clinicalAssessment.riskStratification;

    return calculations;
  }

  // Helper methods for empty data structures
  private getEmptyRHCData(): RightHeartCathData {
    return {
      procedureType: 'Right Heart Catheterisation',
      indication: 'haemodynamic_assessment',
      clinicalPresentation: '',
      recentInvestigations: '',
      vascularAccess: 'right_femoral',
      catheterDetails: 'Thermodilution catheter',
      laboratoryValues: {
        haemoglobin: null,
        lactate: null
      },
      fluoroscopyTime: undefined,
      fluoroscopyDose: undefined,
      doseAreaProduct: undefined,
      contrastVolume: undefined,
      immediateOutcomes: '',
      recommendations: '',
      followUp: ''
    };
  }

  private getEmptyHaemodynamicPressures(): HaemodynamicPressures {
    return {
      ra: { aWave: null, vWave: null, mean: null },
      rv: { systolic: null, diastolic: null, rvedp: null },
      pa: { systolic: null, diastolic: null, mean: null },
      pcwp: { aWave: null, vWave: null, mean: null }
    };
  }

  private getEmptyCardiacOutput(): CardiacOutput {
    return {
      thermodilution: { co: null, ci: null },
      fick: { co: null, ci: null },
      mixedVenousO2: null,
      wedgeSaturation: null
    };
  }

  // Section parsing helpers
  private isSectionHeader(line: string): boolean {
    return line.startsWith('**') && line.endsWith('**') ||
           line.toUpperCase() === line && line.length > 3;
  }

  private cleanSectionTitle(line: string): string {
    return line.replace(/\*\*/g, '').replace(/:/g, '').trim();
  }

  private getSectionPriority(line: string): 'high' | 'medium' | 'low' {
    const highPriority = ['findings', 'procedure', 'indication', 'complications', 'assessment'];
    const title = line.toLowerCase();

    for (const keyword of highPriority) {
      if (title.includes(keyword)) return 'high';
    }

    return 'medium';
  }

  // ========== VALIDATION HELPERS ==========

  /**
   * Set a nested field value using dot notation (e.g., "patientData.svo2")
   */
  private setNestedField(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Get a nested field value using dot notation
   */
  private getNestedField(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Validate regex-extracted data using quick model and detect missing fields
   *
   * @param extracted - Regex-extracted RHC data
   * @param transcription - Original corrected transcription
   * @returns Validation result with corrections and missing fields
   */
  private async validateAndDetectGaps(
    extracted: RHCExtractedData,
    transcription: string
  ): Promise<RHCValidationResult> {
    console.log('🔍 RHC AGENT: Starting quick model validation...');

    try {
      // Call quick model for validation
      const userMessage = `REGEX EXTRACTED:\n${JSON.stringify(extracted, null, 2)}\n\nTRANSCRIPTION:\n${transcription}\n\nValidate the extraction and output JSON only.`;

      const response = await this.lmStudioService.processWithAgent(
        RightHeartCathSystemPrompts.dataValidationPrompt,
        userMessage,
        'rhc-validation', // agentType
        undefined, // signal
        MODEL_CONFIG.QUICK_MODEL // modelOverride
      );

      // Parse validation result - handle potential markdown code fences
      let validationResult: RHCValidationResult;

      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : response;
      
      // Capture any reasoning text outside the JSON block
      let modelReasoning: string | undefined;
      if (jsonMatch) {
        // Text before and after JSON block is reasoning
        const beforeJson = response.substring(0, jsonMatch.index || 0).trim();
        const afterJson = response.substring((jsonMatch.index || 0) + jsonMatch[0].length).trim();
        const reasoning = [beforeJson, afterJson].filter(Boolean).join('\n\n');
        if (reasoning) {
          modelReasoning = reasoning;
        }
      }

      try {
        validationResult = JSON.parse(jsonString);
        
        // Ensure required fields have defaults (LLM may omit them)
        validationResult.corrections = validationResult.corrections ?? [];
        validationResult.missingCritical = validationResult.missingCritical ?? [];
        validationResult.missingOptional = validationResult.missingOptional ?? [];
        validationResult.confidence = validationResult.confidence ?? 0.8;
        
        // Attach model reasoning to the result
        if (modelReasoning) {
          validationResult.modelReasoning = modelReasoning;
        }
      } catch (parseError) {
        console.error('❌ Failed to parse validation JSON:', parseError);
        console.log('Raw response:', response);

        // Fallback: return empty validation (proceed with regex data as-is)
        return {
          corrections: [],
          missingCritical: [],
          missingOptional: [],
          confidence: 0.5
        };
      }

      console.log('✅ RHC AGENT: Validation complete');
      console.log(`   - Corrections: ${validationResult.corrections.length}`);
      console.log(`   - Missing critical: ${validationResult.missingCritical.length}`);
      console.log(`   - Missing optional: ${validationResult.missingOptional.length}`);
      console.log(`   - Confidence: ${(validationResult.confidence ?? 0.5).toFixed(2)}`);

      return validationResult;

    } catch (error) {
      console.error('❌ RHC AGENT: Validation failed:', error);

      // Fallback: proceed with regex extraction as-is
      return {
        corrections: [],
        missingCritical: [],
        missingOptional: [],
        confidence: 0.5
      };
    }
  }

  /**
   * Apply high-confidence corrections automatically
   * Low-confidence corrections are added to user validation list
   *
   * @param extracted - Original regex-extracted data
   * @param corrections - Corrections suggested by quick model
   * @param confidenceThreshold - Minimum confidence for auto-apply (default 0.8)
   * @returns Corrected data with metadata tracking
   */
  private applyCorrections(
    extracted: RHCExtractedData,
    corrections: RHCFieldCorrection[],
    confidenceThreshold: number = 0.8
  ): RHCExtractedData {
    // Deep clone to avoid mutations
    const result = JSON.parse(JSON.stringify(extracted)) as RHCExtractedData;

    for (const correction of corrections) {
      const confidence = correction.confidence ?? 0.5;
      if (confidence >= confidenceThreshold) {
        // Auto-apply high-confidence corrections
        this.setNestedField(result, correction.field, correction.correctValue);
        console.log(`✅ Auto-corrected ${correction.field}: ${correction.regexValue} → ${correction.correctValue} (confidence: ${confidence.toFixed(2)})`);
      } else {
        // Low confidence - will be shown to user for review
        console.log(`⚠️ Low-confidence correction for ${correction.field} (${confidence.toFixed(2)}), requiring user review`);
      }
    }

    return result;
  }

  /**
   * Merge user-provided field values with extracted data
   *
   * @param extracted - Auto-corrected extracted data
   * @param userFields - User-provided field values from validation modal
   * @returns Merged data with user inputs
   */
  private mergeUserInput(
    extracted: RHCExtractedData,
    userFields: Record<string, any>
  ): RHCExtractedData {
    const result = JSON.parse(JSON.stringify(extracted)) as RHCExtractedData;

    for (const [fieldPath, value] of Object.entries(userFields)) {
      if (value !== null && value !== undefined && value !== '') {
        this.setNestedField(result, fieldPath, value);
        console.log(`👤 User provided ${fieldPath}: ${value}`);
      }
    }

    return result;
  }
}