import { MedicalAgent } from '@/agents/base/MedicalAgent';
import type {
  MedicalContext,
  ReportSection,
  TAVIWorkupReport,
  TAVIWorkupStructuredSections,
  ChatMessage,
  ValidationResult,
  TAVIExtractedData
} from '@/types/medical.types';
import { LMStudioService, MODEL_CONFIG } from '@/services/LMStudioService';
import { systemPromptLoader } from '@/services/SystemPromptLoader';
import { TAVI_WORKUP_SYSTEM_PROMPTS } from './TAVIWorkupSystemPrompts';

/**
 * Streamlined TAVI Workup Agent following standard MedicalAgent pattern.
 * Processes comprehensive TAVI dictation into structured JSON sections for PDF export.
 * Uses single LLM call with sophisticated system prompt for medical intelligence.
 */
export class TAVIWorkupAgent extends MedicalAgent {
  protected lmStudioService: LMStudioService;
  private systemPromptInitialized = false;

  constructor() {
    super(
      'TAVI Workup Agent',
      'Interventional Cardiology',
      'Processes comprehensive TAVI dictation into structured sections for clinical documentation',
      'tavi-workup',
      '' // Will be loaded dynamically
    );
    this.lmStudioService = LMStudioService.getInstance();
  }

  private async initializeSystemPrompt(): Promise<void> {
    if (this.systemPromptInitialized) return;

    try {
      this.systemPrompt = await systemPromptLoader.loadSystemPrompt('tavi-workup', 'primary');
      this.systemPromptInitialized = true;
    } catch (error) {
      console.error('❌ TAVIWorkupAgent: Failed to load system prompt:', error);
      this.systemPrompt = 'You are a specialist interventional cardiologist processing comprehensive TAVI workup documentation.'; // Fallback
    }
  }

  async process(input: string, context?: MedicalContext): Promise<TAVIWorkupReport> {
    await this.initializeSystemPrompt();

    const startTime = Date.now();
    const processingType = context?.isReprocessing ? 'REPROCESSING' : 'ORIGINAL';
    console.log(`🫀 TAVI Workup [${processingType}]: Starting streamlined TAVI workup processing`);
    console.log(`📥 Input preview:`, input.substring(0, 150) + '...');

    // Input validation for clinical safety
    const trimmedInput = input.trim();
    const wordCount = trimmedInput.split(/\s+/).length;
    const isMinimalInput = wordCount < 10 || trimmedInput.length < 50;

    if (isMinimalInput) {
      console.warn(`⚠️ TAVI: Minimal input detected (${wordCount} words, ${trimmedInput.length} chars) - proceeding with strict anti-hallucination mode`);
    }

    try {
      // Progress callback helper
      const reportProgress = (phase: string, progress: number, details?: string) => {
        console.log(`📊 Progress Update: ${phase} - ${progress}% ${details ? `(${details})` : ''}`);
        if (context?.onProgress) {
          try {
            context.onProgress(phase, progress, details);
          } catch (progressError) {
            console.error(`❌ Progress callback failed:`, progressError);
          }
        }
      };

      // Phase 1: EMR Data Extraction
      reportProgress('Extracting EMR data', 0, 'Reading patient demographics and EMR fields');
      const emrData = await this.extractEMRData();
      reportProgress('Extracting EMR data', 100, 'EMR extraction complete');
      console.log(`✅ EMR data extracted:`, Object.keys(emrData));

      // Phase 1.5: Regex Extraction + Quick Model Validation
      console.log('🚨 TAVI AGENT: Starting validation workflow...');
      const regexExtracted = this.extractTAVIData(input);
      console.log('📋 Regex extracted:', JSON.stringify(regexExtracted, null, 2));

      const validation = await this.validateAndDetectGaps(regexExtracted, input);
      const correctedData = this.applyCorrections(regexExtracted, validation.corrections, 0.8);

      // INTERACTIVE CHECKPOINT: Check for critical gaps
      if (validation.missingCritical.length > 0 ||
          validation.corrections.some(c => c.confidence < 0.8)) {

        console.log(`⚠️ TAVI AGENT: Validation requires user input (${validation.missingCritical.length} critical fields missing)`);

        // Return incomplete report with validation state
        const baseReport = this.createReport('', [], context, 0, 0);
        return {
          ...baseReport,
          workupData: {
            patient: {},
            clinical: {},
            laboratory: {},
            ecg: {},
            echocardiography: {},
            ctMeasurements: {
              coronaryHeights: {},
              sinusOfValsalva: {},
              coplanarAngles: [],
              accessVessels: {}
            },
            procedurePlan: {
              valveSelection: {},
              access: {},
              strategy: {}
            }
          },
          alerts: {
            alertMessages: [],
            triggers: {
              lowLeftMainHeight: false,
              lowSinusDiameters: [],
              lowCoronaryHeights: [],
              smallAccessVessels: [],
              calciumBurden: 'unknown',
              accessConcerns: [],
              contraindicationFlags: []
            }
          },
          missingFields: [],
          status: 'awaiting_validation',
          validationResult: validation,
          extractedData: correctedData
        } as TAVIWorkupReport;
      }

      // Merge user input if provided
      let finalData = correctedData;
      if (context?.userProvidedFields) {
        console.log('🚨 TAVI AGENT: Merging user-provided fields...');
        finalData = this.mergeUserInput(correctedData, context.userProvidedFields);
      }

      console.log('✅ TAVI AGENT: Validation complete, proceeding to reasoning model');

      // Phase 2: LLM Processing
      reportProgress('Processing dictation with AI', 0, 'Preparing comprehensive TAVI analysis');
      const llmPayload = this.buildLLMPayload(input, emrData, { isMinimalInput, wordCount });
      reportProgress('Processing dictation with AI', 25, `Payload prepared (${llmPayload.length} chars)`);

      console.log(`🤖 Sending to MedGemma-27B for TAVI workup processing...`);
      const response = await this.lmStudioService.processWithAgent(
        this.systemPrompt,
        llmPayload,
        'tavi-workup' // Uses MODEL_CONFIG.REASONING_MODEL (MedGemma-27B)
      );

      reportProgress('Processing dictation with AI', 100, `LLM response received (${response.length} chars)`);
      console.log(`✅ LLM processing complete`);

      // Phase 3: Parse and Format Results
      reportProgress('Formatting results', 0, 'Parsing structured TAVI workup');
      const sections = this.parseResponse(response, context);
      const processingTime = Date.now() - startTime;
      reportProgress('Formatting results', 100, `TAVI workup complete - ${processingTime}ms`);

      console.log(`✅ Parsed ${sections.length} sections from TAVI workup response`);

      // Create structured report
      const baseReport = this.createReport(
        response.trim(),
        sections,
        context,
        processingTime,
        this.assessConfidence(input, response)
      );

      // Extract missing information from the response (similar to QuickLetter pattern)
      const missingInfo = this.extractMissingInformation(response);

      // Parse structured sections from JSON response
      const structuredSections = this.parseStructuredSections(response);

      // Create TAVI-specific report with both legacy and new structure
      const taviReport: TAVIWorkupReport = {
        ...baseReport,
        workupData: {
          patient: {},
          clinical: {},
          laboratory: {},
          ecg: {},
          echocardiography: {},
          ctMeasurements: {
            coronaryHeights: {},
            sinusOfValsalva: {},
            coplanarAngles: [],
            accessVessels: {}
          },
          procedurePlan: {
            valveSelection: {},
            access: {},
            strategy: {}
          }
        },
        alerts: {
          alertMessages: structuredSections?.alerts?.missing || [],
          triggers: {
            lowLeftMainHeight: false,
            lowSinusDiameters: [],
            smallAccessVessels: []
          }
        },
        missingFields: missingInfo,
        structuredSections: structuredSections || undefined,
        metadata: {
          ...baseReport.metadata,
          modelUsed: MODEL_CONFIG.REASONING_MODEL
        }
      };

      console.log(`🎉 TAVI Workup processing complete - ${processingTime}ms`);
      return taviReport;

    } catch (error) {
      console.error(`❌ TAVI Workup processing failed:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.createErrorReport(errorMessage, Date.now() - startTime, context);
    }
  }

  protected async buildMessages(input: string, _context?: MedicalContext): Promise<ChatMessage[]> {
    await this.initializeSystemPrompt();

    return [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: input },
    ];
  }

  protected parseResponse(response: string, _context?: MedicalContext): ReportSection[] {
    console.log('📖 TAVI Parser: Starting response parsing');

    try {
      // Try JSON parsing first (primary strategy)
      console.log('🔍 TAVI Parser: Attempting JSON parsing');
      const sections = this.parseJSONResponse(response);
      if (sections.length > 0) {
        console.log(`✅ TAVI Parser: JSON parsing successful - ${sections.length} sections`);
        return sections;
      }
    } catch (jsonError) {
      console.warn('⚠️ TAVI Parser: JSON parsing failed, trying text patterns');
    }

    // Fallback to text pattern parsing
    console.log('🔍 TAVI Parser: Using text pattern parsing');
    const textSections = this.parseTextPatterns(response);
    console.log(`✅ TAVI Parser: Text parsing extracted ${textSections.length} sections`);
    return textSections;
  }

  /**
   * Parse JSON structured response from the LLM
   */
  private parseJSONResponse(response: string): ReportSection[] {
    const sections: ReportSection[] = [];

    // Clean the response to extract JSON
    let jsonContent = response.trim();
    jsonContent = jsonContent.replace(/```json\s*/, '').replace(/```\s*$/, '');

    // Try to find JSON object in the response
    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }

    const jsonData = JSON.parse(jsonMatch[0]);
    console.log(`📋 TAVI JSON Parser: Successfully parsed JSON response`);

    // Define the expected sections and their display titles
    const sectionMapping = [
      { key: 'patient', title: 'Patient' },
      { key: 'clinical', title: 'Clinical' },
      { key: 'laboratory', title: 'Laboratory Values' },
      { key: 'ecg', title: 'ECG Assessment' },
      { key: 'background', title: 'Background' },
      { key: 'medications', title: 'Medications' },
      { key: 'social_history', title: 'Social History' },
      { key: 'investigations', title: 'Other Investigations' },
      { key: 'echocardiography', title: 'Echocardiography' },
      { key: 'enhanced_ct', title: 'Enhanced CT Analysis' },
      { key: 'procedure_planning', title: 'Procedure Planning' },
      { key: 'alerts', title: 'Alerts & Anatomical Considerations' }
    ];

    // Extract sections from JSON
    sectionMapping.forEach(({ key, title }) => {
      const sectionData = jsonData[key];
      if (sectionData && sectionData.content) {
        const content = sectionData.content.trim();
        if (content && content !== 'Not provided' && content !== 'No data available' && content.length > 0) {
          sections.push({
            title,
            content,
            type: 'narrative',
            priority: title === 'Alerts & Anatomical Considerations' ? 'high' : 'medium',
          });
          console.log(`✅ TAVI JSON Parser: Parsed section "${title}" (${content.length} chars)`);
        }
      }
    });

    return sections;
  }

  /**
   * Text pattern parsing for backwards compatibility
   */
  private parseTextPatterns(response: string): ReportSection[] {
    const sections: ReportSection[] = [];

    // Look for common section headers
    const sectionPatterns = [
      /\*\*Patient\*\*\s*([\s\S]*?)(?=\*\*|$)/i,
      /\*\*Background\*\*\s*([\s\S]*?)(?=\*\*|$)/i,
      /\*\*Medications\*\*\s*([\s\S]*?)(?=\*\*|$)/i,
      /\*\*Social\*\*\s*([\s\S]*?)(?=\*\*|$)/i,
      /\*\*Bloods\*\*\s*([\s\S]*?)(?=\*\*|$)/i,
      /\*\*ECG\*\*\s*([\s\S]*?)(?=\*\*|$)/i,
      /\*\*Echo\*\*\s*([\s\S]*?)(?=\*\*|$)/i,
      /\*\*CT\*\*\s*([\s\S]*?)(?=\*\*|$)/i,
      /\*\*Procedure Plan\*\*\s*([\s\S]*?)(?=\*\*|$)/i
    ];

    const sectionTitles = [
      'Patient', 'Background', 'Medications', 'Social History',
      'Laboratory Values', 'ECG Assessment', 'Echocardiography',
      'Enhanced CT Analysis', 'Procedure Planning'
    ];

    sectionPatterns.forEach((pattern, index) => {
      const match = response.match(pattern);
      if (match && match[1]) {
        const content = match[1].trim();
        if (content.length > 10) {
          sections.push({
            title: sectionTitles[index],
            content,
            type: 'narrative',
            priority: 'medium'
          });
        }
      }
    });

    return sections;
  }

  /**
   * Extract EMR data using standard pattern (like other agents)
   */
  private async extractEMRData(): Promise<{
    background: string;
    investigations: string;
    medications: string;
    socialHistory: string;
    patientData?: any;
  }> {
    try {
      console.log('📋 TAVI: Starting standard EMR data extraction...');

      // Get current tab for content script communication
      const activeTab = await chrome.tabs.query({ active: true, currentWindow: true });
      const tabId = activeTab[0]?.id;
      if (!tabId) {
        console.warn('⚠️ TAVI: No active tab found for EMR extraction');
        return { background: '', investigations: '', medications: '', socialHistory: '' };
      }

      // Extract EMR fields using standard pattern
      const [backgroundResult, investigationResult, medicationResult, socialResult, patientResult] = await Promise.allSettled([
        chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_CUSTOM_NOTE_CONTENT', fieldName: 'Background' }),
        chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_CUSTOM_NOTE_CONTENT', fieldName: 'Investigation Summary' }),
        chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_CUSTOM_NOTE_CONTENT', fieldName: 'Medications (Problem List for Phil)' }),
        chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_SOCIAL_HISTORY_TABLE' }),
        chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_PATIENT_DATA' })
      ]);

      const background = this.extractContentFromResult(backgroundResult, 'Background');
      const investigations = this.extractContentFromResult(investigationResult, 'Investigation Summary');
      const medications = this.extractContentFromResult(medicationResult, 'Medications (Problem List for Phil)');
      const socialHistory = this.extractContentFromResult(socialResult, 'Social History');
      const patientData = this.extractContentFromResult(patientResult, 'Patient Data');

      console.log(`✅ TAVI: EMR extraction complete`);
      return { background, investigations, medications, socialHistory, patientData };

    } catch (error) {
      console.warn('⚠️ TAVI: EMR extraction failed, continuing without EMR data:', error);
      return { background: '', investigations: '', medications: '', socialHistory: '' };
    }
  }

  private extractContentFromResult(result: PromiseSettledResult<any>, fieldName: string): any {
    if (result.status === 'fulfilled' && result.value?.success) {
      const content = result.value.data || result.value.content || '';

      // Special handling for patient data to parse demographics
      if (fieldName === 'Patient Data' && content) {
        const parsedDemographics = this.parsePatientDemographics(content);
        console.log(`📋 TAVI: ${fieldName} extracted and parsed`, parsedDemographics);
        return parsedDemographics;
      }

      console.log(`📋 TAVI: ${fieldName} extracted (${content.length} chars)`);
      return content;
    } else {
      console.log(`📋 TAVI: ${fieldName} extraction failed`);
      return fieldName === 'Patient Data' ? {} : '';
    }
  }

  /**
   * Parse patient demographics from XestroBoxContent format
   */
  private parsePatientDemographics(content: any): any {
    const demographics: any = { raw: content };

    try {
      // Ensure content is a string before parsing
      const contentStr = typeof content === 'string' ? content : String(content || '');

      if (!contentStr) {
        console.warn('⚠️ TAVI: No content provided for demographics parsing');
        return demographics;
      }

      // Extract DOB and age pattern: "05/06/1959 (66)"
      const dobAgeMatch = contentStr.match(/(\d{2}\/\d{2}\/\d{4})\s*\((\d+)\)/);
      if (dobAgeMatch) {
        demographics.dateOfBirth = dobAgeMatch[1];
        demographics.age = parseInt(dobAgeMatch[2]);
        console.log(`✅ TAVI: Parsed DOB: ${demographics.dateOfBirth}, Age: ${demographics.age}`);
      }

      // Extract name (first line before any HTML elements)
      const nameMatch = contentStr.match(/^([^<]+)/);
      if (nameMatch) {
        demographics.name = nameMatch[1].trim();
      }

      // Extract ID
      const idMatch = contentStr.match(/ID:\s*(\d+)/);
      if (idMatch) {
        demographics.id = idMatch[1];
      }

      // Extract Medicare number
      const medicareMatch = contentStr.match(/Medicare:\s*([^<]+)/);
      if (medicareMatch) {
        demographics.medicare = medicareMatch[1].trim();
      }

    } catch (error) {
      console.warn('⚠️ TAVI: Error parsing patient demographics:', error);
    }

    return demographics;
  }

  /**
   * Format patient data for LLM payload
   */
  private formatPatientData(patientData: any): string {
    if (!patientData || Object.keys(patientData).length === 0) {
      return 'Not available';
    }

    const parts = [];

    if (patientData.name) {
      parts.push(`Name: ${patientData.name}`);
    }

    if (patientData.dateOfBirth) {
      parts.push(`DOB: ${patientData.dateOfBirth}`);
    }

    if (patientData.age) {
      parts.push(`Age: ${patientData.age} years`);
    }

    if (patientData.id) {
      parts.push(`ID: ${patientData.id}`);
    }

    if (patientData.medicare) {
      parts.push(`Medicare: ${patientData.medicare}`);
    }

    return parts.length > 0 ? parts.join(', ') : 'Not available';
  }

  /**
   * Build comprehensive LLM payload with dictation and EMR data
   */
  private buildLLMPayload(input: string, emrData: any, validation?: { isMinimalInput: boolean; wordCount: number }): string {
    let payload = `
DICTATED TAVI WORKUP:
${input}`;

    // Add validation warning for minimal input
    if (validation?.isMinimalInput) {
      payload += `

⚠️ CLINICAL SAFETY WARNING: This dictation is very brief (${validation.wordCount} words). Exercise extreme caution against hallucination. ONLY process explicit information provided. Most sections should be marked as "Not provided" with extensive missing information lists.`;
    }

    payload += `

EMR DATA CONTEXT:
Background: ${emrData.background || 'Not available'}
Investigation Summary: ${emrData.investigations || 'Not available'}
Medications: ${emrData.medications || 'Not available'}
Social History: ${emrData.socialHistory || 'Not available'}
Patient Demographics: ${this.formatPatientData(emrData.patientData)}

Please process this comprehensive TAVI workup dictation and format according to the system prompt instructions.`;

    return payload.trim();
  }

  /**
   * Parse structured sections from JSON response for PDF export
   */
  private parseStructuredSections(response: string): TAVIWorkupStructuredSections | undefined {
    try {
      // Clean the response to extract JSON
      let jsonContent = response.trim();
      jsonContent = jsonContent.replace(/```json\s*/, '').replace(/```\s*$/, '');

      // Debug: Log the cleaned content for investigation
      console.log('🔍 TAVI: Cleaned response content (first 500 chars):', jsonContent.substring(0, 500));

      // Try to find JSON object in the response
      const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('⚠️ TAVI: No JSON object found for structured sections');
        console.warn('🔍 TAVI: Response preview (first 200 chars):', response.substring(0, 200));
        return undefined;
      }

      console.log('🔍 TAVI: Found JSON match, attempting to parse...');
      const jsonData = JSON.parse(jsonMatch[0]);
      console.log(`📋 TAVI: Successfully parsed structured sections from JSON response`, {
        keys: Object.keys(jsonData),
        patientContent: jsonData.patient?.content ? 'Present' : 'Missing',
        clinicalContent: jsonData.clinical?.content ? 'Present' : 'Missing'
      });

      // Convert to TAVIWorkupStructuredSections format
      const structuredSections: TAVIWorkupStructuredSections = {
        patient: {
          content: jsonData.patient?.content || 'Not provided',
          missing: jsonData.patient?.missing || []
        },
        clinical: {
          content: jsonData.clinical?.content || 'Not provided',
          missing: jsonData.clinical?.missing || []
        },
        laboratory: {
          content: jsonData.laboratory?.content || 'Not provided',
          missing: jsonData.laboratory?.missing || []
        },
        ecg: {
          content: jsonData.ecg?.content || 'Not provided',
          missing: jsonData.ecg?.missing || []
        },
        background: {
          content: jsonData.background?.content || 'Not provided',
          missing: jsonData.background?.missing || []
        },
        medications: {
          content: jsonData.medications?.content || 'Not provided',
          missing: jsonData.medications?.missing || []
        },
        social_history: {
          content: jsonData.social_history?.content || 'Not provided',
          missing: jsonData.social_history?.missing || []
        },
        investigations: {
          content: jsonData.investigations?.content || 'Not provided',
          missing: jsonData.investigations?.missing || []
        },
        echocardiography: {
          content: jsonData.echocardiography?.content || 'Not provided',
          missing: jsonData.echocardiography?.missing || []
        },
        enhanced_ct: {
          content: jsonData.enhanced_ct?.content || 'Not provided',
          missing: jsonData.enhanced_ct?.missing || []
        },
        procedure_planning: {
          content: jsonData.procedure_planning?.content || 'Not provided',
          missing: jsonData.procedure_planning?.missing || []
        },
        alerts: {
          content: jsonData.alerts?.content || 'None',
          missing: jsonData.alerts?.missing || [],
          pre_anaesthetic_review_text: jsonData.alerts?.pre_anaesthetic_review_text,
          pre_anaesthetic_review_json: jsonData.alerts?.pre_anaesthetic_review_json
        },
        missing_summary: {
          missing_clinical: jsonData.missing_summary?.missing_clinical || [],
          missing_diagnostic: jsonData.missing_summary?.missing_diagnostic || [],
          missing_measurements: jsonData.missing_summary?.missing_measurements || [],
          completeness_score: jsonData.missing_summary?.completeness_score || 'Not assessed'
        }
      };

      return structuredSections;

    } catch (error) {
      console.warn('⚠️ TAVI: Failed to parse structured sections:', error);
      return undefined;
    }
  }

  /**
   * Extract missing information from the response (QuickLetter pattern)
   */
  private extractMissingInformation(response: string): string[] {
    const missingFields: string[] = [];

    // Look for missing information indicators in the response
    const missingPatterns = [
      /missing:?\s*([^.]+)/gi,
      /not\s+provided:?\s*([^.]+)/gi,
      /incomplete:?\s*([^.]+)/gi,
      /requires?:?\s*([^.]+)/gi
    ];

    missingPatterns.forEach(pattern => {
      const matches = response.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          missingFields.push(match[1].trim());
        }
      }
    });

    return missingFields;
  }

  /**
   * Assess confidence based on response quality
   */
  private assessConfidence(input: string, response: string): number {
    // Basic confidence assessment
    if (!response || response.length < 100) return 0.1;
    if (response.includes('ERROR') || response.includes('error')) return 0.3;
    if (response.length < input.length * 0.5) return 0.5;
    return 0.85; // High confidence for complete responses
  }

  /**
   * Create error report following the established pattern
   */
  private createErrorReport(errorMessage: string, processingTime: number, context?: MedicalContext): TAVIWorkupReport {
    console.log('🔧 TAVI Error Handler: Creating error report');

    // Use content-only error display for cleaner UI
    const errorContent = `TAVI workup processing encountered an error. Please review the dictation and try again.\n\nError details: ${errorMessage}`;

    const fallback = this.createReport(
      errorContent,
      [], // No sections for error reports
      context,
      processingTime,
      0.1,
      ['Processing failed'],
      [`Processing failed: ${errorMessage}`]
    );

    const errorReport: TAVIWorkupReport = {
      ...fallback,
      summary: `TAVI workup processing failed: ${errorMessage}`,
      workupData: {
        patient: {},
        clinical: {},
        laboratory: {},
        ecg: {},
        echocardiography: {},
        ctMeasurements: {
          coronaryHeights: {},
          sinusOfValsalva: {},
          coplanarAngles: [],
          accessVessels: {}
        },
        procedurePlan: {
          valveSelection: {},
          access: {},
          strategy: {}
        }
      },
      alerts: {
        alertMessages: [],
        triggers: {
          lowLeftMainHeight: false,
          lowSinusDiameters: [],
          smallAccessVessels: []
        }
      },
      missingFields: [],
      structuredSections: undefined,
      metadata: {
        ...fallback.metadata,
        modelUsed: MODEL_CONFIG.REASONING_MODEL
      }
    };

    return errorReport;
  }

  // ============================================================
  // Validation Workflow Methods (following RHC pattern)
  // ============================================================

  /**
   * Extract TAVI data using regex patterns from transcription
   */
  private extractTAVIData(input: string): TAVIExtractedData {
    const text = input.toLowerCase();

    const extracted: TAVIExtractedData = {};

    // Valve Sizing from CT
    const annulusDiamMatch = text.match(/annulus\s+diameter\s+(\d+(?:\.\d+)?)\s*mm/i);
    const annulusPerimMatch = text.match(/annulus\s+perimeter\s+(\d+(?:\.\d+)?)\s*mm/i);
    const annulusAreaMatch = text.match(/(?:annulus|ct)\s+area\s+(\d+(?:\.\d+)?)\s*(?:mm²|mm2|sq\s*mm)/i);

    if (annulusDiamMatch || annulusPerimMatch || annulusAreaMatch) {
      extracted.valveSizing = {
        annulusDiameter: annulusDiamMatch ? parseFloat(annulusDiamMatch[1]) : undefined,
        annulusPerimeter: annulusPerimMatch ? parseFloat(annulusPerimMatch[1]) : undefined,
        annulusArea: annulusAreaMatch ? parseFloat(annulusAreaMatch[1]) : undefined
      };
    }

    // Access Assessment
    const accessSiteMatch = text.match(/(?:access|approach)\s+(?:via|through)\s+(femoral|radial|subclavian|transapical|transaortic)/i);
    const iliofemoralMatch = text.match(/(?:iliac|femoral)\s+(?:arteries|vessels)\s+(\d+(?:-\d+)?)\s*mm/i);

    if (accessSiteMatch || iliofemoralMatch) {
      extracted.accessAssessment = {
        site: accessSiteMatch ? accessSiteMatch[1] : undefined,
        iliofemoralDimensions: iliofemoralMatch ? iliofemoralMatch[0] : undefined
      };
    }

    // Coronary Heights
    const leftCoronaryMatch = text.match(/left\s+coronary\s+height\s+(\d+(?:\.\d+)?)\s*mm/i);
    const rightCoronaryMatch = text.match(/right\s+coronary\s+height\s+(\d+(?:\.\d+)?)\s*mm/i);

    if (leftCoronaryMatch || rightCoronaryMatch) {
      extracted.coronaryHeights = {
        leftCoronary: leftCoronaryMatch ? parseFloat(leftCoronaryMatch[1]) : undefined,
        rightCoronary: rightCoronaryMatch ? parseFloat(rightCoronaryMatch[1]) : undefined
      };
    }

    // Aortic Valve Assessment from Echo
    const peakGradMatch = text.match(/(?:peak|max)\s+gradient\s+(\d+(?:\.\d+)?)\s*mmhg/i);
    const meanGradMatch = text.match(/mean\s+gradient\s+(\d+(?:\.\d+)?)\s*mmhg/i);
    const avAreaMatch = text.match(/(?:aortic\s+valve\s+area|ava)\s+(\d+(?:\.\d+)?)\s*cm²/i);

    if (peakGradMatch || meanGradMatch || avAreaMatch) {
      extracted.aorticValve = {
        peakGradient: peakGradMatch ? parseFloat(peakGradMatch[1]) : undefined,
        meanGradient: meanGradMatch ? parseFloat(meanGradMatch[1]) : undefined,
        avArea: avAreaMatch ? parseFloat(avAreaMatch[1]) : undefined
      };
    }

    // LV Assessment
    const efMatch = text.match(/(?:lvef|ejection\s+fraction|ef)\s+(\d+)\s*%/i);
    const lviddMatch = text.match(/lvidd\s+(\d+(?:\.\d+)?)\s*mm/i);
    const lvidsMatch = text.match(/lvids\s+(\d+(?:\.\d+)?)\s*mm/i);

    if (efMatch || lviddMatch || lvidsMatch) {
      extracted.lvAssessment = {
        ef: efMatch ? parseFloat(efMatch[1]) : undefined,
        lvidd: lviddMatch ? parseFloat(lviddMatch[1]) : undefined,
        lvids: lvidsMatch ? parseFloat(lvidsMatch[1]) : undefined
      };
    }

    // Procedure Details - Valve selection
    const valveTypeMatch = text.match(/(sapien\s+(?:3|ultra)|evolut\s+(?:r|pro|fx)|acurate\s+(?:neo|neo2))/i);
    const valveSizeMatch = text.match(/(\d+)\s*mm\s+valve/i);
    const deploymentDepthMatch = text.match(/deployment\s+depth\s+(\d+(?:\.\d+)?)\s*mm/i);

    if (valveTypeMatch || valveSizeMatch || deploymentDepthMatch) {
      extracted.procedureDetails = {
        valveType: valveTypeMatch ? valveTypeMatch[1] : undefined,
        valveSize: valveSizeMatch ? parseFloat(valveSizeMatch[1]) : undefined,
        deploymentDepth: deploymentDepthMatch ? parseFloat(deploymentDepthMatch[1]) : undefined
      };
    }

    return extracted;
  }

  /**
   * Validate extracted data using quick model
   */
  private async validateAndDetectGaps(
    extracted: TAVIExtractedData,
    transcription: string
  ): Promise<ValidationResult> {
    console.log('🔍 TAVI AGENT: Starting quick model validation...');

    try {
      const userMessage = `REGEX EXTRACTED:\n${JSON.stringify(extracted, null, 2)}\n\nTRANSCRIPTION:\n${transcription}\n\nValidate the extraction and output JSON only.`;

      const response = await this.lmStudioService.processWithAgent(
        TAVI_WORKUP_SYSTEM_PROMPTS.dataValidationPrompt,
        userMessage,
        'tavi-validation',
        undefined,
        MODEL_CONFIG.QUICK_MODEL
      );

      // Parse validation result - handle potential markdown code fences
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : response;

      try {
        const validationResult = JSON.parse(jsonString);
        console.log('✅ TAVI AGENT: Validation complete');
        console.log(`   - Corrections: ${validationResult.corrections.length}`);
        console.log(`   - Missing critical: ${validationResult.missingCritical.length}`);
        console.log(`   - Missing optional: ${validationResult.missingOptional.length}`);
        console.log(`   - Confidence: ${validationResult.confidence.toFixed(2)}`);

        return validationResult;
      } catch (parseError) {
        console.error('❌ Failed to parse validation JSON:', parseError);
        return {
          corrections: [],
          missingCritical: [],
          missingOptional: [],
          confidence: 0.5
        };
      }
    } catch (error) {
      console.error('❌ TAVI AGENT: Validation failed:', error);
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
   */
  private applyCorrections(
    extracted: TAVIExtractedData,
    corrections: ValidationResult['corrections'],
    confidenceThreshold: number = 0.8
  ): TAVIExtractedData {
    const result = JSON.parse(JSON.stringify(extracted)) as TAVIExtractedData;

    for (const correction of corrections) {
      if (correction.confidence >= confidenceThreshold) {
        this.setNestedField(result, correction.field, correction.correctValue);
        console.log(`✅ Auto-corrected ${correction.field}: ${correction.regexValue} → ${correction.correctValue}`);
      }
    }

    return result;
  }

  /**
   * Merge user-provided fields from validation modal
   */
  private mergeUserInput(
    extracted: TAVIExtractedData,
    userFields: Record<string, any>
  ): TAVIExtractedData {
    const result = JSON.parse(JSON.stringify(extracted)) as TAVIExtractedData;

    for (const [fieldPath, value] of Object.entries(userFields)) {
      if (value !== null && value !== undefined && value !== '') {
        this.setNestedField(result, fieldPath, value);
        console.log(`✅ User-provided ${fieldPath}: ${value}`);
      }
    }

    return result;
  }

  /**
   * Helper to set nested field via dot notation
   */
  private setNestedField(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key]) current[key] = {};
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }
}
