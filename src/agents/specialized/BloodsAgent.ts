/**
 * Bloods/Pathology Ordering Agent
 * Specialized for formatting voice-dictated blood test orders
 * into structured pathology requisitions
 */

import { MedicalAgent } from '../base/MedicalAgent';
import { systemPromptLoader } from '@/services/SystemPromptLoader';
import { BLOODS_MEDICAL_PATTERNS, BloodTestMedicalPatterns, BloodsDataValidationPrompt } from './BloodsSystemPrompts';
import { LMStudioService, MODEL_CONFIG } from '@/services/LMStudioService';
import { ASRCorrectionEngine } from '@/utils/asr/ASRCorrectionEngine';
import type {
  MedicalReport,
  ReportSection,
  MedicalContext,
  ChatMessage,
  BloodsExtractedData,
  BloodsValidationResult,
  BloodsFieldCorrection
} from '@/types/medical.types';

export class BloodsAgent extends MedicalAgent {
  private lmStudioService: LMStudioService;
  private asrEngine: ASRCorrectionEngine;
  private systemPromptInitialized = false;

  constructor() {
    super(
      'Bloods Specialist',
      'Pathology',
      'Blood test and pathology ordering specialist',
      'bloods',
      '' // Will be loaded dynamically
    );
    
    this.lmStudioService = LMStudioService.getInstance();
    this.asrEngine = ASRCorrectionEngine.getInstance();
  }

  private async initializeSystemPrompt(): Promise<void> {
    if (this.systemPromptInitialized) return;

    try {
      this.systemPrompt = await systemPromptLoader.loadSystemPrompt('bloods', 'primary');
      this.systemPromptInitialized = true;
    } catch (error) {
      console.error('❌ BloodsAgent: Failed to load system prompt:', error);
      this.systemPrompt = 'You are a blood test and pathology ordering specialist.'; // Fallback
    }
  }

  async process(input: string, context?: MedicalContext): Promise<MedicalReport> {
    await this.initializeSystemPrompt();

    const startTime = Date.now();
    console.log('🩸 BloodsAgent: Processing blood test order:', input.substring(0, 100));

    try {
      // ===== STEP 1: ASR CORRECTIONS =====
      const correctedInput = await this.asrEngine.applyPathologyCorrections(input);
      console.log('✅ Step 1: Applied pathology ASR corrections');

      // ===== STEP 2: REGEX EXTRACTION =====
      const regexExtracted = this.extractBloodTests(correctedInput);
      console.log(`✅ Step 2: Regex extraction complete. Found ${regexExtracted.tests.length} test(s)`);

      // ===== STEP 3: QUICK MODEL VALIDATION =====
      const validation = await this.validateAndDetectGaps(regexExtracted, correctedInput);
      console.log(`✅ Step 3: Validation complete. Overall confidence: ${validation.confidence}`);

      // ===== STEP 4: AUTO-APPLY HIGH-CONFIDENCE CORRECTIONS =====
      let correctedData = this.applyCorrections(regexExtracted, validation.corrections, 0.8);
      console.log('✅ Step 4: Auto-applied high-confidence corrections');

      // ===== STEP 5: CHECKPOINT - DECIDE IF MODAL NEEDED =====
      // Get list of fields that were auto-corrected
      const autoCorrectedFields = validation.corrections
        .filter(c => c.confidence >= 0.8)
        .map(c => c.field);

      // Filter out critical gaps that were already auto-corrected
      const remainingCriticalGaps = validation.missingCritical
        .filter(field => !autoCorrectedFields.includes(field.field))
        .filter(field => field.critical === true);

      // Check if we have low-confidence corrections that need user review
      const hasLowConfidenceCorrections = validation.corrections.some(c => c.confidence < 0.8);

      // CHECKPOINT DECISION: Show modal if:
      // - No tests extracted (empty array)
      // - Critical gaps remain after auto-corrections
      // - Low-confidence corrections need user review
      if (correctedData.tests.length === 0 ||
          remainingCriticalGaps.length > 0 ||
          hasLowConfidenceCorrections) {
        console.log('⚠️  CHECKPOINT: Validation modal required');
        console.log(`   - Tests extracted: ${correctedData.tests.length}`);
        console.log(`   - Remaining critical gaps: ${remainingCriticalGaps.length}`);
        console.log(`   - Low-confidence corrections: ${hasLowConfidenceCorrections}`);

        // Build base report for awaiting_validation state
        const baseReport: MedicalReport = {
          id: `bloods-${Date.now()}`,
          agentName: this.name,
          timestamp: Date.now(),
          content: '', // Will be filled after validation
          sections: [],
          metadata: {
            processingTime: Date.now() - startTime,
            modelUsed: MODEL_CONFIG.QUICK_MODEL,
            confidence: validation.confidence
          },
          status: 'awaiting_validation',
          validationResult: validation,
          extractedData: correctedData
        };

        console.log('🚨 BloodsAgent: Returning awaiting_validation status');
        return baseReport;
      }

      // ===== STEP 6: MERGE USER INPUT (if reprocessing after modal) =====
      if (context?.userProvidedFields) {
        console.log('👤 Step 6: Merging user-provided fields from validation modal');
        correctedData = this.mergeUserInput(correctedData, context.userProvidedFields);
      }

      // ===== STEP 7: FORMAT AS COMMA-SEPARATED STRING =====
      const formattedTests = this.formatBloodTests(correctedData);
      console.log(`✅ Step 7: Formatted tests: "${formattedTests}"`);

      // ===== STEP 8: BUILD FINAL REPORT =====
      const sections = this.parseResponse(formattedTests, context);

      const report: MedicalReport = {
        id: `bloods-${Date.now()}`,
        agentName: this.name,
        timestamp: Date.now(),
        content: formattedTests,
        sections,
        metadata: {
          processingTime: Date.now() - startTime,
          modelUsed: MODEL_CONFIG.QUICK_MODEL,
          confidence: validation.confidence
        },
        status: 'complete'
      };

      console.log('✅ BloodsAgent: Report generated successfully');
      return report;

    } catch (error) {
      console.error('❌ BloodsAgent processing failed:', error);
      throw new Error(`Blood test ordering failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  protected async buildMessages(input: string, _context?: MedicalContext): Promise<ChatMessage[]> {
    await this.initializeSystemPrompt();

    return [
      {
        role: 'system',
        content: this.systemPrompt
      },
      {
        role: 'user',
        content: `Please format this voice-dictated blood test order into structured pathology requisitions:

"${input}"

Format into ↪ arrow structure for each blood test with clinical indications and urgency as appropriate.`
      }
    ];
  }

  protected parseResponse(response: string, _context?: MedicalContext): ReportSection[] {
    const sections: ReportSection[] = [];
    
    // Clean the response by removing any AI conversational text
    const cleanedResponse = response.replace(/^(Okay,|Here is|Here's).*?:?\s*/i, '').trim();
    
    // For the new comma-separated format, create a single section
    if (cleanedResponse && !cleanedResponse.includes('↪')) {
      sections.push({
        title: 'Blood Tests Ordered',
        content: cleanedResponse,
        type: 'structured',
        priority: 'medium'
      });
    } else {
      // Fallback to old arrow format parsing for backward compatibility
      const lines = response.split('\n').filter(line => line.trim());
      let currentSection: ReportSection | null = null;
      
      for (const line of lines) {
        if (line.startsWith('↪')) {
          // New test group
          if (currentSection) {
            sections.push(currentSection);
          }
          
          currentSection = {
            title: line.substring(1).trim(),
            content: line,
            type: 'structured',
            priority: 'medium'
          };
        } else if (line.startsWith('-') && currentSection) {
          // Sub-test under current group
          currentSection.content += '\n' + line;
        } else if (line.trim() && currentSection) {
          // Additional content for current section
          currentSection.content += '\n' + line;
        }
      }
      
      // Add the final section
      if (currentSection) {
        sections.push(currentSection);
      }
    }
    
    return sections;
  }

  protected extractMedicalTerms(text: string): string[] {
    const terms = new Set<string>();
    const input = text.toLowerCase();

    // For comma-separated format, split by commas and extract each test
    if (!text.includes('↪')) {
      const tests = text.split(',').map(test => test.trim());
      tests.forEach(test => {
        if (test) {
          // Add the full test name
          terms.add(test);
          
          // Also check for known abbreviations
          BLOODS_MEDICAL_PATTERNS.commonTests.forEach(commonTest => {
            if (test.toLowerCase().includes(commonTest.toLowerCase())) {
              terms.add(commonTest);
            }
          });
        }
      });
    } else {
      // Fallback to pattern matching for arrow format
      BLOODS_MEDICAL_PATTERNS.commonTests.forEach(test => {
        if (input.includes(test.toLowerCase())) {
          terms.add(test);
        }
      });
    }

    // Extract pathology-specific terms using patterns
    const pathologyPatterns = [
      // Test categories
      /\b(?:haematology|biochemistry|immunology|microbiology)\b/gi,
      // Specific tests
      /\b(?:troponin|creatinine|cholesterol|triglycerides|glucose|HbA1c|FBE|EUC|TFT|LFTs|CRP|ESR)\b/gi,
      // Units and values
      /\b\d+\.?\d*\s*(?:mmol\/L|mg\/dL|g\/L|%|units\/L)\b/gi,
      // Fasting requirements
      /\b(?:fasting|non-fasting|random)\s+(?:glucose|lipids|sample)\b/gi,
      // Clinical context
      /\b(?:diabetes|cardiovascular|cardiac|renal|hepatic)\s+(?:monitoring|assessment|risk)\b/gi
    ];

    pathologyPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => terms.add(match));
      }
    });

    return Array.from(terms);
  }

  private extractTestGroups(response: string): string[] {
    // For comma-separated format, split by commas
    if (!response.includes('↪')) {
      return response.split(',').map(test => test.trim()).filter(test => test.length > 0);
    }
    
    // Fallback to arrow format parsing
    const groups: string[] = [];
    const lines = response.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('↪')) {
        groups.push(line.substring(1).trim());
      }
    }
    
    return groups;
  }

  private identifyCommonTests(input: string): string[] {
    const identified: string[] = [];
    const inputLower = input.toLowerCase();

    // Check for common test abbreviations and expansions
    for (const [abbrev] of Object.entries(BLOODS_MEDICAL_PATTERNS.expansionRules)) {
      if (inputLower.includes(abbrev.toLowerCase())) {
        identified.push(abbrev);
      }
    }

    return identified;
  }

  // ============================================================
  // PHASE 1: REGEX EXTRACTION
  // ============================================================

  /**
   * Extract pathology tests from transcription using regex patterns
   * Handles blood tests, urine, stool, swabs, and metadata (fasting, urgency, indication)
   */
  private extractBloodTests(input: string): BloodsExtractedData {
    const tests = new Set<string>(); // Use Set to automatically deduplicate
    let fastingRequired = false;
    let urgency: 'routine' | 'urgent' | 'stat' | undefined = undefined;
    let clinicalIndication: string | undefined = undefined;

    console.log('🔍 BloodsAgent: Starting regex extraction...');

    // Extract all pathology tests using regex patterns
    for (const [testName, pattern] of Object.entries(BloodTestMedicalPatterns)) {
      // Skip metadata patterns (urgency, fasting, clinicalIndication)
      if (['urgent', 'routine', 'fasting', 'clinicalIndication'].includes(testName)) {
        continue;
      }

      pattern.lastIndex = 0; // Reset regex index
      const match = pattern.exec(input);
      if (match) {
        // Extract the matched test name
        const extractedTest = match[0].trim();

        // Standardize test names
        const standardizedTest = this.standardizeTestName(testName, extractedTest);
        tests.add(standardizedTest);

        console.log(`  ✓ Extracted: ${standardizedTest} (from: "${extractedTest}")`);
      }
    }

    // Extract urgency
    BloodTestMedicalPatterns.urgent.lastIndex = 0;
    if (BloodTestMedicalPatterns.urgent.test(input)) {
      const urgentMatch = input.match(/\b(stat|STAT|emergency|ASAP)\b/i);
      urgency = urgentMatch ? 'stat' : 'urgent';
      console.log(`  ⚡ Urgency: ${urgency}`);
    } else {
      BloodTestMedicalPatterns.routine.lastIndex = 0;
      if (BloodTestMedicalPatterns.routine.test(input)) {
        urgency = 'routine';
        console.log('  📅 Urgency: routine');
      }
    }

    // Extract fasting requirement
    BloodTestMedicalPatterns.fasting.lastIndex = 0;
    if (BloodTestMedicalPatterns.fasting.test(input)) {
      fastingRequired = true;
      console.log('  🍽️  Fasting required: YES');
    }

    // Extract clinical indication
    BloodTestMedicalPatterns.clinicalIndication.lastIndex = 0;
    const indicationMatch = BloodTestMedicalPatterns.clinicalIndication.exec(input);
    if (indicationMatch && indicationMatch[1]) {
      clinicalIndication = indicationMatch[1].trim();
      console.log(`  📋 Clinical indication: ${clinicalIndication}`);
    }

    const extractedData: BloodsExtractedData = {
      tests: Array.from(tests),
      fastingRequired: fastingRequired || undefined,
      urgency,
      clinicalIndication
    };

    console.log(`✅ BloodsAgent: Regex extraction complete. Found ${tests.size} test(s).`);
    return extractedData;
  }

  /**
   * Standardize test names from regex matches to consistent abbreviations
   */
  private standardizeTestName(patternKey: string, extractedText: string): string {
    const standardizations: Record<string, string> = {
      fbe: 'FBE',
      euc: 'EUC',
      tft: 'TFT',
      lft: 'LFTs',
      coags: 'Coags',
      crp: 'CRP',
      esr: 'ESR',
      fastingLipids: 'Fasting Lipids',
      cholesterol: 'Total Cholesterol',
      ldl: 'LDL-C',
      hdl: 'HDL-C',
      triglycerides: 'Triglycerides',
      fastingGlucose: 'Fasting Glucose',
      randomGlucose: 'Random Glucose',
      hba1c: 'HbA1c',
      ogtt: 'OGTT',
      troponin: 'Troponin',
      bnp: 'BNP',
      cardiacEnzymes: 'Cardiac Enzymes',
      vitaminD: 'Vitamin D',
      vitaminB12: 'Vitamin B12',
      folate: 'Folate',
      iron: 'Iron Studies',
      magnesium: 'Magnesium',
      phosphate: 'Phosphate',
      calcium: 'Calcium',
      tsh: 'TSH',
      t4: 'Free T4',
      t3: 'Free T3',
      cortisol: 'Cortisol',
      acth: 'ACTH',
      psa: 'PSA',
      cea: 'CEA',
      ca125: 'CA-125',
      ca199: 'CA 19-9',
      afp: 'AFP',
      procalcitonin: 'Procalcitonin',
      lactate: 'Lactate',
      creatinine: 'Creatinine',
      urea: 'Urea',
      egfr: 'eGFR',
      alt: 'ALT',
      ast: 'AST',
      alp: 'ALP',
      ggt: 'GGT',
      bilirubin: 'Bilirubin',
      albumin: 'Albumin',
      ana: 'ANA',
      ena: 'ENA',
      complement: 'Complement',
      immunoglobulins: 'Immunoglobulins',
      urineMCS: 'Urine MCS',
      urineMicroscopy: 'Urine Microscopy',
      urineProtein: 'Urine Protein',
      urineACR: 'Urine ACR',
      urinePCR: 'Urine PCR',
      urineElectrolytes: 'Urine Electrolytes',
      stoolMCS: 'Stool MCS',
      faecalOccultBlood: 'Faecal Occult Blood',
      stoolCalprotectin: 'Faecal Calprotectin',
      woundSwab: 'Wound Swab',
      throatSwab: 'Throat Swab',
      nasalSwab: 'Nasal Swab'
    };

    return standardizations[patternKey] || extractedText;
  }

  // ============================================================
  // PHASE 2: QUICK MODEL VALIDATION
  // ============================================================

  /**
   * Validate regex-extracted data using QUICK model
   * Detects gaps, suggests corrections, assigns confidence scores
   */
  private async validateAndDetectGaps(
    extracted: BloodsExtractedData,
    transcription: string
  ): Promise<BloodsValidationResult> {
    console.log('🔍 BloodsAgent: Starting QUICK model validation...');

    // Build validation request
    const userMessage = `REGEX EXTRACTED:\n${JSON.stringify(extracted, null, 2)}\n\nTRANSCRIPTION:\n${transcription}\n\nValidate the extraction and output JSON only.`;

    try {
      // Call QUICK model with validation prompt
      const response = await this.lmStudioService.processWithAgent(
        BloodsDataValidationPrompt,
        userMessage,
        'bloods-validation',
        undefined,
        MODEL_CONFIG.QUICK_MODEL // Force QUICK model for validation
      );

      console.log('📝 Validation response:', response.substring(0, 200));

      // Parse JSON response
      const cleanedResponse = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const validationResult: BloodsValidationResult = JSON.parse(cleanedResponse);

      console.log(`✅ Validation complete. Confidence: ${validationResult.confidence}`);
      console.log(`  - Corrections: ${validationResult.corrections.length}`);
      console.log(`  - Missing critical: ${validationResult.missingCritical.length}`);
      console.log(`  - Missing optional: ${validationResult.missingOptional.length}`);

      return validationResult;
    } catch (error) {
      console.error('❌ Validation failed:', error);
      // Return fallback validation result (assume extraction is good)
      return {
        corrections: [],
        missingCritical: [],
        missingOptional: [],
        confidence: 0.75,
        modelReasoning: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Apply high-confidence corrections to extracted data
   * Auto-applies corrections with confidence >= threshold
   */
  private applyCorrections(
    extracted: BloodsExtractedData,
    corrections: BloodsFieldCorrection[],
    confidenceThreshold: number = 0.8
  ): BloodsExtractedData {
    const result = JSON.parse(JSON.stringify(extracted)) as BloodsExtractedData;

    for (const correction of corrections) {
      if (correction.confidence >= confidenceThreshold) {
        // Auto-apply high-confidence correction
        this.setNestedField(result, correction.field, correction.correctValue);
        console.log(`  ✅ Auto-corrected ${correction.field}: ${correction.regexValue} → ${correction.correctValue} (${(correction.confidence * 100).toFixed(0)}%)`);
      } else {
        console.log(`  ⚠️  Low-confidence correction (${(correction.confidence * 100).toFixed(0)}%) - user review needed: ${correction.field}`);
      }
    }

    return result;
  }

  /**
   * Set nested field using dot notation (e.g., "tests[0]" or "fastingRequired")
   */
  private setNestedField(obj: any, path: string, value: any): void {
    // Handle array notation (e.g., "tests[0]")
    const arrayMatch = path.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, arrayName, indexStr] = arrayMatch;
      const index = parseInt(indexStr, 10);
      if (!obj[arrayName]) obj[arrayName] = [];
      obj[arrayName][index] = value;
      return;
    }

    // Handle simple field (e.g., "fastingRequired")
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  }

  /**
   * Merge user-provided fields from validation modal
   */
  private mergeUserInput(
    extracted: BloodsExtractedData,
    userFields: Record<string, any>
  ): BloodsExtractedData {
    const result = JSON.parse(JSON.stringify(extracted)) as BloodsExtractedData;

    for (const [fieldPath, value] of Object.entries(userFields)) {
      if (value !== null && value !== undefined && value !== '') {
        this.setNestedField(result, fieldPath, value);
        console.log(`  👤 User provided ${fieldPath}: ${value}`);
      }
    }

    return result;
  }

  /**
   * Format BloodsExtractedData as comma-separated string with markers
   */
  private formatBloodTests(data: BloodsExtractedData): string {
    let result = data.tests.join(', ');

    if (data.fastingRequired) {
      result += ' (FASTING REQUIRED)';
    }

    if (data.urgency === 'urgent' || data.urgency === 'stat') {
      result += ` [${data.urgency.toUpperCase()}]`;
    }

    if (data.clinicalIndication) {
      result += ` - ${data.clinicalIndication}`;
    }

    return result;
  }

  // Additional utility methods for blood test ordering
  public formatPathologyOrder(tests: string[], clinicalContext?: string): string {
    let order = '';
    
    tests.forEach(test => {
      order += `↪ ${test}\n`;
    });
    
    if (clinicalContext) {
      order += `\nClinical indication: ${clinicalContext}`;
    }
    
    return order;
  }

  public expandAbbreviation(abbrev: string): string {
    return BLOODS_MEDICAL_PATTERNS.expansionRules[abbrev as keyof typeof BLOODS_MEDICAL_PATTERNS.expansionRules] || abbrev;
  }

}