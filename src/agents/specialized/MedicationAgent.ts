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
 * Specialized agent for processing voice-dictated medication lists
 * into structured format for clinical documentation.
 *
 * Features:
 * - MedicalSummaryExtractor integration for intelligent medication analysis
 * - Enhanced medication reconciliation and drug interaction awareness
 * - Quality assessment and validation for medication lists
 * - Hybrid processing with legacy fallback for safety
 * - Medication-specific normalization and formatting
 * - Dosing standardization and frequency recognition
 */
export class MedicationAgent extends MedicalAgent {
  protected lmStudioService: LMStudioService;
  private systemPromptInitialized = false;
  private medicalSummaryExtractor: MedicalSummaryExtractor;

  constructor() {
    super(
      'Medication Management Agent',
      'Medication List Documentation',
      'Formats voice-dictated medication lists into structured format with enhanced analysis',
      'medication',
      '' // Will be loaded dynamically
    );

    this.lmStudioService = LMStudioService.getInstance();
    this.medicalSummaryExtractor = MedicalSummaryExtractor.getInstance();
  }

  private async initializeSystemPrompt(): Promise<void> {
    if (this.systemPromptInitialized) return;

    try {
      this.systemPrompt = await systemPromptLoader.loadSystemPrompt('medication', 'primary');
      this.systemPromptInitialized = true;
    } catch (error) {
      console.error('❌ MedicationAgent: Failed to load system prompt:', error);
      this.systemPrompt = 'You are a medication management specialist formatting voice-dictated medication lists.'; // Fallback
    }
  }

  async process(input: string, _context?: MedicalContext): Promise<MedicalReport> {
    await this.initializeSystemPrompt();

    const startTime = Date.now();
    console.log('💊 MedicationAgent processing input:', input?.substring(0, 100) + '...');

    try {
      // Determine processing approach based on feature flags or context
      const useEnhanced = this.shouldUseEnhancedProcessing(_context);

      if (useEnhanced) {
        const enhancedResult = await this.processWithEnhancedAnalysis(input, _context);
        if (enhancedResult) {
          const processingTime = Date.now() - startTime;
          console.log(`✅ MedicationAgent completed with enhanced processing in ${processingTime}ms`);
          return enhancedResult;
        }
      }

      // Fallback to legacy processing
      console.log('📋 MedicationAgent falling back to standard processing');
      return await this.processStandard(input, _context);

    } catch (error) {
      console.error('❌ MedicationAgent processing failed, falling back to standard:', error);
      return await this.processStandard(input, _context);
    }
  }

  /**
   * Enhanced processing with medication analysis
   */
  private async processWithEnhancedAnalysis(
    input: string,
    _context?: MedicalContext
  ): Promise<MedicalReport | null> {
    try {
      console.log('💊 Starting enhanced medication processing');

      // Enhanced normalization combining Phase 2 + Medication-specific
      const normalizedInput = await this.enhancedNormalization(input);
      console.log('📝 Enhanced medication normalization completed');

      // Extract clinical findings with medication-focused configuration
      const summaryResult = await this.extractMedicationFindings(normalizedInput, _context);
      console.log('🔍 Medication clinical findings extracted');

      // Generate structured medication list with AI
      const structuredMedications = await this.lmStudioService.processWithAgent(
        this.systemPrompt,
        normalizedInput,
        'medication'
      );

      // Validate medication format and quality
      const validation = this.validateMedicationFormat(structuredMedications, summaryResult);
      if (!validation.isValid) {
        console.warn('⚠️ Medication format validation failed, falling back to standard');
        return null;
      }

      // Create enhanced report with enhanced intelligence
      const sections = await this.parseEnhancedResponse(structuredMedications, summaryResult, _context);

      const report = this.createReport(
        structuredMedications.trim(),
        sections,
        _context,
        0, // caller computes total processing time
        validation.confidence
      );

      // Enhanced metadata with insights
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
          summaryExtraction: true,
          clinicalFindings: summaryResult.findings.length,
          qualityScore: summaryResult.qualityMetrics.clinicalAccuracy,
          medicationClasses: this.classifyMedications(summaryResult.findings),
          drugInteractionFlags: this.identifyPotentialInteractions(summaryResult.findings),
          extractedFindings
        },
        validationResults: {
          formatValid: validation.isValid,
          confidence: validation.confidence,
          issues: validation.issues,
          warnings: validation.warnings
        }
      };

      console.log('✅ Enhanced medication processing completed successfully');
      return report;

    } catch (error) {
      console.error('❌ Enhanced medication processing failed:', error);
      return null;
    }
  }

  /**
   * Standard processing method (legacy fallback)
   */
  private async processStandard(input: string, _context?: MedicalContext): Promise<MedicalReport> {
    const startTime = Date.now();

    try {
      // Get formatted medications from lightweight quick model
      console.log('🤖 Sending to LLM for medication formatting...');
      const response = await this.lmStudioService.processWithAgent(
        this.systemPrompt,
        input,
        'medication'
      );

      console.log('🔍 Raw LLM response:', JSON.stringify(response));

      // Check for error response
      const trimmedResponse = response.trim();
      if (trimmedResponse.startsWith('ERROR – medication list could not be parsed') ||
          trimmedResponse === 'ERROR – medication list could not be parsed coherently.') {
        console.warn('⚠️ Medication list could not be parsed coherently');
        return this.createErrorReport(input, 'Medication list could not be parsed coherently');
      }

      // Parse the formatted response
      const sections = this.parseResponse(response, _context);

      // Calculate actual processing time
      const processingTime = Date.now() - startTime;

      // Use base class createReport method for consistent metadata structure
      const report = this.createReport(
        response.trim(),
        sections,
        _context,
        processingTime,
        this.assessConfidence(input, response)
      );

      // Add additional metadata specific to medication summaries
      report.metadata = {
        ...report.metadata,
        medicalCodes: this.extractMedicalCodes(response),
        modelUsed: MODEL_CONFIG.QUICK_MODEL
      };

      console.log('✅ Medication list formatted successfully');
      return report;

    } catch (error) {
      console.error('❌ MedicationAgent processing failed:', error);
      return this.createErrorReport(input, error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  /**
   * Enhanced normalization combining Phase 2 + Medication-specific rules
   */
  private async enhancedNormalization(input: string): Promise<string> {
    // Apply Phase 2 normalization first
    let normalized = preNormalizeMedicalText(input);

    // Medication-specific normalization patterns
    const medicationPatterns = [
      // Drug name standardization (generic names)
      { pattern: /\batenolol\b/gi, replacement: 'atenolol' },
      { pattern: /\bmetoprolol\b/gi, replacement: 'metoprolol' },
      { pattern: /\bcarvedilol\b/gi, replacement: 'carvedilol' },
      { pattern: /\bamlodipine\b/gi, replacement: 'amlodipine' },
      { pattern: /\bperindopril\b/gi, replacement: 'perindopril' },
      { pattern: /\benalapril\b/gi, replacement: 'enalapril' },
      { pattern: /\batorvastatin\b/gi, replacement: 'atorvastatin' },
      { pattern: /\bsimvastatin\b/gi, replacement: 'simvastatin' },
      { pattern: /\brosuvastatin\b/gi, replacement: 'rosuvastatin' },
      { pattern: /\bmetformin\b/gi, replacement: 'metformin' },
      { pattern: /\bgliclazide\b/gi, replacement: 'gliclazide' },
      { pattern: /\bwarfarin\b/gi, replacement: 'warfarin' },
      { pattern: /\bdabigatran\b/gi, replacement: 'dabigatran' },
      { pattern: /\brivaroxaban\b/gi, replacement: 'rivaroxaban' },
      { pattern: /\bapixaban\b/gi, replacement: 'apixaban' },
      { pattern: /\baspirin\b/gi, replacement: 'aspirin' },
      { pattern: /\bclopidogrel\b/gi, replacement: 'clopidogrel' },
      { pattern: /\bfrusemide\b/gi, replacement: 'frusemide' },
      { pattern: /\bspironolactone\b/gi, replacement: 'spironolactone' },
      { pattern: /\bomeprazole\b/gi, replacement: 'omeprazole' },
      { pattern: /\bpantoprazole\b/gi, replacement: 'pantoprazole' },
      { pattern: /\bparacetamol\b/gi, replacement: 'paracetamol' },

      // Dosing standardization
      { pattern: /\bmilligrams?\b/gi, replacement: 'mg' },
      { pattern: /\bmicrograms?\b/gi, replacement: 'mcg' },
      { pattern: /\bunits?\b/gi, replacement: 'units' },
      { pattern: /\bmillilitres?\b/gi, replacement: 'mL' },

      // Frequency standardization
      { pattern: /\bonce daily\b/gi, replacement: 'daily' },
      { pattern: /\bonce a day\b/gi, replacement: 'daily' },
      { pattern: /\btwice daily\b/gi, replacement: 'BD' },
      { pattern: /\btwice a day\b/gi, replacement: 'BD' },
      { pattern: /\bthree times daily\b/gi, replacement: 'TDS' },
      { pattern: /\bthree times a day\b/gi, replacement: 'TDS' },
      { pattern: /\bfour times daily\b/gi, replacement: 'QID' },
      { pattern: /\bfour times a day\b/gi, replacement: 'QID' },
      { pattern: /\bas required\b/gi, replacement: 'PRN' },
      { pattern: /\bwhen required\b/gi, replacement: 'PRN' },
      { pattern: /\bat night\b/gi, replacement: 'nocte' },
      { pattern: /\bin the morning\b/gi, replacement: 'mane' },

      // Route standardization
      { pattern: /\bby mouth\b/gi, replacement: 'PO' },
      { pattern: /\borally\b/gi, replacement: 'PO' },
      { pattern: /\bsubcutaneous\b/gi, replacement: 'SC' },
      { pattern: /\bintravenous\b/gi, replacement: 'IV' },
      { pattern: /\bintramuscular\b/gi, replacement: 'IM' }
    ];

    // Apply medication-specific patterns
    medicationPatterns.forEach(({ pattern, replacement }) => {
      normalized = normalized.replace(pattern, replacement);
    });

    return normalized;
  }

  /**
   * Extract clinical findings with medication-focused configuration
   */
  private async extractMedicationFindings(
    normalizedInput: string,
    _context?: MedicalContext
  ) {
    const config: MedicalSummaryConfig = {
      focusAreas: [
        'medications'
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
   * Validate medication format and assess quality
   */
  private validateMedicationFormat(
    structuredMedications: string,
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

    // Check for proper line-based formatting (no arrows or bullets)
    const hasArrows = structuredMedications.includes('↪') ||
                      structuredMedications.includes('•') ||
                      structuredMedications.includes('- ');
    if (hasArrows) {
      issues.push('Medication list should use simple line format, not bullet points');
      confidence -= 0.2;
    }

    // Check for medication count
    const medicationLines = structuredMedications.split('\n').filter(line =>
      line.trim() &&
      !line.toLowerCase().startsWith('allergies:') &&
      !line.toLowerCase().startsWith('no known drug allergies')
    );

    if (medicationLines.length === 0) {
      issues.push('No medications identified in structured format');
      confidence -= 0.3;
    } else if (medicationLines.length < 2) {
      warnings.push('Few medications identified - ensure completeness');
      confidence -= 0.1;
    }

    // Check for dosing information
    const dosingPattern = /\b\d+(?:\.\d+)?\s*(mg|mcg|g|units|IU|mmol|mL)\b/gi;
    const dosingMatches = (structuredMedications.match(dosingPattern) || []).length;

    if (dosingMatches < medicationLines.length * 0.7) {
      warnings.push('Some medications may be missing dosing information');
      confidence -= 0.1;
    }

    // Check for frequency information
    const frequencyPattern = /\b(daily|BD|TDS|QID|PRN|nocte|mane|twice daily|three times daily)\b/gi;
    const frequencyMatches = (structuredMedications.match(frequencyPattern) || []).length;

    if (frequencyMatches < medicationLines.length * 0.7) {
      warnings.push('Some medications may be missing frequency information');
      confidence -= 0.1;
    }

    // Check for drug name quality
    const drugFindings = summaryResult.findings.filter((f: any) => f.category === 'medications');
    if (drugFindings.length < medicationLines.length * 0.8) {
      warnings.push('Some medication names may not be properly recognized');
      confidence -= 0.1;
    }

    // Quality threshold check
    const qualityScore = summaryResult.qualityMetrics?.clinicalAccuracy || 0.5;
    if (qualityScore < 0.6) {
      issues.push('Low clinical accuracy in medication list');
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
    structuredMedications: string,
    summaryResult: any,
    _context?: MedicalContext
  ): Promise<ReportSection[]> {
    // Get base sections from legacy parsing
    const baseSections = this.parseResponse(structuredMedications, _context);

    // Add enhanced sections
    const enhancedSections: ReportSection[] = [
      ...baseSections,
      {
        title: 'Medication Analysis',
        content: this.generateMedicationAnalysis(summaryResult),
        type: 'structured',
        priority: 'medium'
      }
    ];

    // Add drug classification if available
    const medications = summaryResult.findings.filter((f: any) => f.category === 'medications');
    if (medications.length > 0) {
      enhancedSections.push({
        title: 'Drug Classifications',
        content: this.classifyMedicationsByTherapeuticClass(medications),
        type: 'structured',
        priority: 'low'
      });
    }

    // Add potential interaction flags
    const interactions = this.identifyPotentialInteractions(medications);
    if (interactions.length > 0) {
      enhancedSections.push({
        title: 'Interaction Flags',
        content: interactions.join(', '),
        type: 'structured',
        priority: 'high'
      });
    }

    // Add adherence insights
    const adherenceFindings = summaryResult.findings.filter((f: any) => f.category === 'adherence');
    if (adherenceFindings.length > 0) {
      enhancedSections.push({
        title: 'Adherence Notes',
        content: this.analyzeAdherence(adherenceFindings),
        type: 'structured',
        priority: 'medium'
      });
    }

    return enhancedSections;
  }

  /**
   * Generate medication analysis from extracted findings
   */
  private generateMedicationAnalysis(summaryResult: any): string {
    const analysis: string[] = [];
    const medications = summaryResult.findings.filter((f: any) => f.category === 'medications');

    // Count by therapeutic class
    const cardiacMeds = medications.filter((m: any) =>
      /beta.?blocker|ace.?inhibitor|arb|calcium.?channel|diuretic|statin|antiplatelet|anticoagulant/i.test(m.finding)
    );

    const diabeticMeds = medications.filter((m: any) =>
      /metformin|gliclazide|insulin|sglt2|glp.?1/i.test(m.finding)
    );

    const painMeds = medications.filter((m: any) =>
      /paracetamol|ibuprofen|aspirin|codeine|morphine|tramadol/i.test(m.finding)
    );

    if (cardiacMeds.length > 0) {
      analysis.push(`${cardiacMeds.length} cardiovascular medication(s)`);
    }
    if (diabeticMeds.length > 0) {
      analysis.push(`${diabeticMeds.length} diabetes medication(s)`);
    }
    if (painMeds.length > 0) {
      analysis.push(`${painMeds.length} analgesic medication(s)`);
    }

    // Quality analysis
    const qualityScore = summaryResult.qualityMetrics?.clinicalAccuracy || 0;
    if (qualityScore > 0.8) {
      analysis.push('High medication accuracy detected');
    } else if (qualityScore < 0.6) {
      analysis.push('Review recommended for medication accuracy');
    }

    return analysis.length > 0 ? analysis.join(', ') : 'Medication list processed successfully';
  }

  /**
   * Classify medications by therapeutic class
   */
  private classifyMedications(findings: any[]): { [key: string]: number } {
    const classes = {
      cardiovascular: 0,
      diabetes: 0,
      respiratory: 0,
      gastrointestinal: 0,
      neurological: 0,
      analgesics: 0,
      antibiotics: 0,
      vitamins: 0,
      other: 0
    };

    const medications = findings.filter((f: any) => f.category === 'medications');

    medications.forEach(med => {
      const text = med.finding.toLowerCase();

      if (/beta.?blocker|ace.?inhibitor|arb|calcium.?channel|diuretic|statin|antiplatelet|anticoagulant|atenolol|metoprolol|amlodipine|perindopril|atorvastatin|warfarin|aspirin|clopidogrel|frusemide/i.test(text)) {
        classes.cardiovascular++;
      } else if (/metformin|gliclazide|insulin|diabetes/i.test(text)) {
        classes.diabetes++;
      } else if (/salbutamol|ventolin|seretide|symbicort|spiriva|asthma|copd/i.test(text)) {
        classes.respiratory++;
      } else if (/omeprazole|pantoprazole|gaviscon|loperamide|lactulose/i.test(text)) {
        classes.gastrointestinal++;
      } else if (/sertraline|fluoxetine|amitriptyline|gabapentin|pregabalin/i.test(text)) {
        classes.neurological++;
      } else if (/paracetamol|ibuprofen|codeine|tramadol|morphine/i.test(text)) {
        classes.analgesics++;
      } else if (/amoxicillin|doxycycline|cephalexin|ciprofloxacin/i.test(text)) {
        classes.antibiotics++;
      } else if (/vitamin|thiamine|folate|b12|calcium|magnesium/i.test(text)) {
        classes.vitamins++;
      } else {
        classes.other++;
      }
    });

    return classes;
  }

  /**
   * Classify medications by therapeutic class for display
   */
  private classifyMedicationsByTherapeuticClass(medications: any[]): string {
    const classes = this.classifyMedications(medications);
    const classDescriptions: string[] = [];

    Object.entries(classes).forEach(([className, count]: [string, number]) => {
      if (count > 0) {
        classDescriptions.push(`${className}: ${count}`);
      }
    });

    return classDescriptions.length > 0
      ? classDescriptions.join(', ')
      : 'No specific therapeutic classes identified';
  }

  /**
   * Identify potential drug interactions (basic screening)
   */
  private identifyPotentialInteractions(medications: any[]): string[] {
    const interactions: string[] = [];
    const medNames = medications.map((m: any) => m.finding.toLowerCase());

    // Common interaction pairs
    if (medNames.some((m: string) => m.includes('warfarin')) && medNames.some((m: string) => m.includes('aspirin'))) {
      interactions.push('Warfarin + Aspirin: bleeding risk');
    }

    if (medNames.some((m: string) => m.includes('ace inhibitor') || m.includes('perindopril') || m.includes('enalapril')) &&
        medNames.some((m: string) => m.includes('spironolactone'))) {
      interactions.push('ACE inhibitor + Spironolactone: hyperkalaemia risk');
    }

    if (medNames.some((m: string) => m.includes('digoxin')) && medNames.some((m: string) => m.includes('frusemide'))) {
      interactions.push('Digoxin + Diuretic: digoxin toxicity risk');
    }

    if (medNames.some((m: string) => m.includes('statin')) && medNames.some((m: string) => m.includes('amiodarone'))) {
      interactions.push('Statin + Amiodarone: myopathy risk');
    }

    return interactions;
  }

  /**
   * Analyze medication adherence information
   */
  private analyzeAdherence(adherenceFindings: any[]): string {
    const adherenceIssues: string[] = [];

    adherenceFindings.forEach(finding => {
      const text = finding.finding.toLowerCase();

      if (text.includes('non-compliant') || text.includes('poor adherence')) {
        adherenceIssues.push('poor adherence noted');
      } else if (text.includes('good adherence') || text.includes('compliant')) {
        adherenceIssues.push('good adherence reported');
      } else if (text.includes('side effects')) {
        adherenceIssues.push('side effects affecting adherence');
      } else if (text.includes('cost') || text.includes('financial')) {
        adherenceIssues.push('cost barriers identified');
      }
    });

    return adherenceIssues.length > 0
      ? adherenceIssues.join(', ')
      : 'adherence information noted';
  }

  /**
   * Determine if enhanced processing should be used
   */
  private shouldUseEnhancedProcessing(_context?: MedicalContext): boolean {
    // Check for legacy processing mode flag
    if (_context?.processingMode === 'legacy') {
      return false;
    }

    // Default to enhanced for better capabilities
    return true;
  }

  protected async buildMessages(input: string, _context?: MedicalContext): Promise<ChatMessage[]> {
    await this.initializeSystemPrompt();

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: this.systemPrompt
      },
      {
        role: 'user',
        content: `Please format this voice-dictated medication list into structured format:

"${input}"

Format each medication on a separate line with: medication name, dose, frequency.
Use Australian medication names and standard abbreviations (BD, TDS, QID, PRN, mane, nocte).
Include any allergies noted.`
      }
    ];

    return messages;
  }

  protected parseResponse(response: string, __context?: MedicalContext): ReportSection[] {
    const cleanResponse = response.trim();

    // Count number of medications
    const medicationLines = cleanResponse.split('\n').filter(line =>
      line.trim() &&
      !line.toLowerCase().startsWith('allergies:') &&
      !line.toLowerCase().startsWith('no known drug allergies')
    );

    const sections: ReportSection[] = [
      {
        title: 'Medication List',
        content: cleanResponse,
        type: 'structured',
        priority: 'high'
      }
    ];

    // Add medication count summary
    if (medicationLines.length > 0) {
      sections.push({
        title: 'Medication Summary',
        content: `${medicationLines.length} medication(s) documented`,
        type: 'structured',
        priority: 'medium'
      });
    }

    // Extract individual medications for analysis
    medicationLines.forEach((medication, index) => {
      sections.push({
        title: `Medication ${index + 1}`,
        content: medication.trim(),
        type: 'structured',
        priority: 'low'
      });
    });

    return sections;
  }

  private assessConfidence(input: string, output: string): number {
    let confidence = 0.5; // Base confidence

    // Check for proper medication formatting
    const medicationLines = output.split('\n').filter(line => line.trim());
    if (medicationLines.length > 0) {
      confidence += 0.3;
    }

    // Check for preservation of key medication terms
    const medicationTerms = [
      'mg', 'daily', 'BD', 'TDS', 'QID', 'PRN', 'metformin', 'aspirin',
      'amlodipine', 'atenolol', 'metoprolol', 'warfarin', 'frusemide'
    ];

    const inputTerms = medicationTerms.filter(term =>
      input.toLowerCase().includes(term.toLowerCase())
    );
    const outputTerms = medicationTerms.filter(term =>
      output.toLowerCase().includes(term.toLowerCase())
    );

    if (inputTerms.length > 0) {
      confidence += (outputTerms.length / inputTerms.length) * 0.2;
    }

    return Math.min(confidence, 1.0);
  }

  private extractMedicalCodes(response: string): any[] {
    const codes: any[] = [];

    // Basic medication mapping to ATC codes
    const medicationMappings = [
      { medication: 'metformin', code: 'A10BA02', description: 'Metformin' },
      { medication: 'aspirin', code: 'B01AC06', description: 'Acetylsalicylic acid' },
      { medication: 'amlodipine', code: 'C08CA01', description: 'Amlodipine' },
      { medication: 'atenolol', code: 'C07AB03', description: 'Atenolol' },
      { medication: 'metoprolol', code: 'C07AB02', description: 'Metoprolol' },
      { medication: 'atorvastatin', code: 'C10AA05', description: 'Atorvastatin' },
      { medication: 'warfarin', code: 'B01AA03', description: 'Warfarin' },
      { medication: 'frusemide', code: 'C03CA01', description: 'Furosemide' }
    ];

    medicationMappings.forEach(mapping => {
      if (response.toLowerCase().includes(mapping.medication.toLowerCase())) {
        codes.push({
          code: mapping.code,
          description: mapping.description,
          system: 'ATC'
        });
      }
    });

    return codes;
  }

  private createErrorReport(input: string, errorMessage: string): MedicalReport {
    return {
      id: `medication-error-${Date.now()}`,
      agentName: this.name,
      content: `Error processing medication list: ${errorMessage}`,
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
