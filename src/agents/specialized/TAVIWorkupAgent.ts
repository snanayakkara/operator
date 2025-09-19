import { MedicalAgent } from '@/agents/base/MedicalAgent';
import type {
  ChatMessage,
  MedicalContext,
  ReportSection,
  TAVIWorkupAlerts,
  TAVIWorkupData,
  TAVIWorkupReport,
} from '@/types/medical.types';
import { LMStudioService, streamChatCompletion } from '@/services/LMStudioService';
import { TAVIWorkupExtractor } from '@/utils/text-extraction/TAVIWorkupExtractor';
import { TAVI_WORKUP_SYSTEM_PROMPTS } from './TAVIWorkupSystemPrompts';

/**
 * Generates structured TAVI workup summaries from a single dictation pass.
 * Handles local transcription output, applies deterministic extraction rules,
 * and asks the on-device LLM to phrase the final clinician-facing narrative.
 */
export class TAVIWorkupAgent extends MedicalAgent {
  private lmStudioService: LMStudioService;

  constructor() {
    super(
      'TAVI Workup Dictation',
      'Interventional Cardiology',
      'Produces structured TAVI workup summaries with alerts and missing-field detection',
      'tavi-workup',
      TAVI_WORKUP_SYSTEM_PROMPTS.generation
    );
    this.lmStudioService = LMStudioService.getInstance();
  }

  async process(
    input: string,
    context?: MedicalContext,
    options?: {
      streaming?: boolean;
      onStreamToken?: (token: string) => void;
      onStreamComplete?: (final: string) => void;
      signal?: AbortSignal;
    }
  ): Promise<TAVIWorkupReport> {
    const startTime = Date.now();
    const isReprocessing = context && context.isReprocessing;
    const processingType = isReprocessing ? 'REPROCESSING' : 'ORIGINAL';

    try {
      console.log(`🫀 TAVI Workup [${processingType}]: Starting comprehensive TAVI workup processing`);
      console.log(`📥 [${processingType}] Input preview:`, input.substring(0, 150) + '...');
      console.log(`⚙️ [${processingType}] Context provided:`, context ? 'Yes' : 'No');

      // Progress callback helper
      const reportProgress = (phase: string, progress: number, details?: string) => {
        if (context?.onProgress) {
          context.onProgress(phase, progress, details);
        }
      };

      // Phase 1: Data Extraction
      reportProgress('Data Extraction', 0, 'Parsing TAVI procedural dictation');
      console.log(`🔍 [${processingType}] Phase 1: Extracting structured data from dictation`);
      const extraction = TAVIWorkupExtractor.extract(input);
      reportProgress('Data Extraction', 100, `Extraction complete - ${extraction.missingFields.length} missing fields, ${extraction.alerts.alertMessages.length} alerts`);
      console.log(`✅ [${processingType}] Data extraction complete - Missing fields: ${extraction.missingFields.length}, Alerts: ${extraction.alerts.alertMessages.length}`);

      // Phase 2: EMR Integration
      reportProgress('EMR Integration', 0, 'Extracting EMR dialog fields');
      console.log(`📋 [${processingType}] Phase 2: Extracting EMR dialog fields`);
      const emrData = await this.extractEMRDialogFields();
      reportProgress('EMR Integration', 100, 'EMR integration complete');
      console.log(`✅ [${processingType}] EMR integration complete`);

      // Phase 3: Main LLM Processing
      reportProgress('Main LLM Processing', 0, 'Preparing payload for MedGemma-27b');
      console.log(`🤖 [${processingType}] Phase 3: Processing with LLM for structured narrative`);
      const llmPayload = this.buildLLMPayload(input, extraction.data, extraction.alerts, extraction.missingFields, emrData);
      reportProgress('Main LLM Processing', 25, `Payload prepared (${llmPayload.length} chars)`);
      console.log(`📤 [${processingType}] LLM payload prepared (${llmPayload.length} chars)`);

      reportProgress('Main LLM Processing', 50, 'Generating structured narrative...');

      let rawOutput: string;

      if (options?.streaming && options.onStreamToken) {
        // Streaming mode for real-time generation feedback
        console.log(`🌊 [${processingType}] Using streaming generation for TAVI workup`);
        let streamedOutput = '';

        await streamChatCompletion({
          model: 'medgemma-27b-mlx',
          messages: [
            { role: 'system', content: this.systemPrompt },
            { role: 'user', content: llmPayload }
          ],
          temperature: 0.3,
          maxTokens: 6000,
          signal: options.signal,
          onToken: (token) => {
            streamedOutput += token;
            options.onStreamToken!(token);
            // Update progress based on estimated output length
            const estimatedLength = 4000; // Rough estimate for TAVI workup JSON
            const currentProgress = Math.min(90, 50 + (streamedOutput.length / estimatedLength) * 40);
            reportProgress('Main LLM Processing', currentProgress, `Generating... (${streamedOutput.length} chars)`);
          },
          onEnd: (final) => {
            streamedOutput = final;
            if (options.onStreamComplete) {
              options.onStreamComplete(final);
            }
            reportProgress('Main LLM Processing', 100, `Streaming complete (${final.length} chars)`);
          },
          onError: (error) => {
            console.error(`❌ [${processingType}] Streaming failed:`, error);
            throw error;
          }
        });

        rawOutput = streamedOutput;
      } else {
        // Traditional blocking mode
        rawOutput = await this.lmStudioService.processWithAgent(
          this.systemPrompt,
          llmPayload,
          this.agentType
        );
        reportProgress('Main LLM Processing', 100, `LLM output received (${rawOutput.length} chars)`);
      }
      console.log(`📥 [${processingType}] Raw LLM output received (${rawOutput.length} chars)`);

      // Phase 4: Multi-Strategy Response Parsing
      reportProgress('Multi-Strategy Response Parsing', 0, 'Attempting JSON parsing');
      console.log(`📖 [${processingType}] Phase 4: Parsing LLM response with multi-strategy approach`);
      const cleanedOutput = this.cleanMedicalText(rawOutput);
      reportProgress('Multi-Strategy Response Parsing', 50, 'Applying text pattern recognition');
      const sections = this.parseResponse(cleanedOutput, context);
      reportProgress('Multi-Strategy Response Parsing', 100, `Parsing complete - ${sections.length} sections extracted`);
      console.log(`✅ [${processingType}] Response parsing complete - ${sections.length} sections extracted`);

      // Phase 5: Missing Information Detection
      reportProgress('Missing Information Detection', 0, 'Analyzing clinical assessment completeness');
      console.log(`🔍 [${processingType}] Phase 5: Analyzing missing information (separate LLM call)`);
      const missingInfo = await this.detectMissingInformation(input, extraction);
      reportProgress('Missing Information Detection', 100, 'Missing info analysis complete');
      console.log(`📊 [${processingType}] Missing info analysis complete`);

      // Phase 6: Report Composition
      reportProgress('Report Composition', 0, 'Compiling final TAVI workup report');
      console.log(`📝 [${processingType}] Phase 6: Composing final TAVI workup report`);
      const processingTime = Date.now() - startTime;

      // Compose final text output with proper section formatting
      const structuredText = this.composeStructuredText(sections);

      const baseReport = this.createReport(
        structuredText,
        sections,
        context,
        processingTime,
        0.92
      );

      // Enhanced metadata with comprehensive missing information
      baseReport.metadata.missingInformation = {
        ...missingInfo,
        alerts: extraction.alerts.alertMessages,
        alertTriggers: extraction.alerts.triggers,
      };

      const reportWithData: TAVIWorkupReport = {
        ...baseReport,
        workupData: extraction.data,
        alerts: extraction.alerts,
        missingFields: extraction.missingFields,
      };

      // Update agent memory
      this.addProcedureMemory('tavi-workup', {
        extractedData: extraction.data,
        alertsTriggered: extraction.alerts.alertMessages,
        missingFields: extraction.missingFields,
        processingType,
        sectionsGenerated: sections.length,
        processingTime,
      });

      reportProgress('Report Composition', 100, `TAVI workup complete - ${processingTime}ms`);
      console.log(`🎉 [${processingType}] TAVI Workup processing complete - ${processingTime}ms`);
      return reportWithData;
    } catch (error) {
      console.error(`❌ TAVI Workup [${processingType}] processing failed:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      return this.createErrorReport(errorMessage, Date.now() - startTime, context);
    }
  }

  protected buildMessages(input: string, _context?: MedicalContext): ChatMessage[] {
    return [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: input },
    ];
  }

  protected parseResponse(response: string, context?: MedicalContext): ReportSection[] {
    console.log('📖 TAVI Parser: Starting multi-strategy response parsing');

    // Strategy 1: JSON Structured Parsing (Primary)
    console.log('🔍 TAVI Parser: Attempting Strategy 1 - JSON structured parsing');
    const jsonSections = this.parseJSONStructuredResponse(response);
    if (jsonSections.length > 0) {
      console.log(`✅ TAVI Parser: Strategy 1 SUCCESS - JSON parsing extracted ${jsonSections.length} sections`);
      return jsonSections;
    }

    // Strategy 2: Text Pattern Parsing (Secondary)
    console.log('⚠️ TAVI Parser: Strategy 1 failed, attempting Strategy 2 - Text pattern parsing');
    const textSections = this.parseTextPatterns(response);
    if (textSections.length > 0) {
      console.log(`✅ TAVI Parser: Strategy 2 SUCCESS - Text pattern parsing extracted ${textSections.length} sections`);
      return textSections;
    }

    // Strategy 3: Legacy Parsing (Compatibility)
    console.log('⚠️ TAVI Parser: Strategy 2 failed, attempting Strategy 3 - Legacy parsing');
    const legacySections = this.parseLegacyResponse(response);
    if (legacySections.length > 0) {
      console.log(`✅ TAVI Parser: Strategy 3 SUCCESS - Legacy parsing extracted ${legacySections.length} sections`);
      return legacySections;
    }

    // Strategy 4: Deterministic Fallback (Final)
    console.warn('⚠️ TAVI Parser: All parsing strategies failed, using deterministic fallback');
    const deterministicSections = this.composeDeterministicReport(response, context);
    console.log(`🔧 TAVI Parser: Deterministic fallback created ${deterministicSections.length} sections`);
    return deterministicSections;
  }

  /**
   * Strategy 2: Parse unstructured text using pattern recognition
   * Following AIReview pattern for extracting sections from natural text
   */
  private parseTextPatterns(response: string): ReportSection[] {
    const sections: ReportSection[] = [];
    console.log('🔄 TAVI Text Parser: Attempting text pattern extraction...');

    try {
      // Clean the response for pattern matching
      const cleanResponse = this.preprocessResponseForTextParsing(response);

      // Define TAVI-specific section patterns
      const sectionPatterns = [
        {
          key: 'patient',
          title: 'Patient',
          patterns: [
            /(?:^|\n)\s*(?:Patient|Demographics?|Patient Information)\s*:?\s*([\s\S]*?)(?=(?:\n\s*(?:Clinical|Laboratory|ECG|Background|Medications|Social|Investigation|Echocardiography|Enhanced CT|Procedure|Alerts|Missing))|$)/gi,
            /(?:^|\n)\s*(?:Demographics?|Patient.*(?:Information|Details))\s*:?\s*([\s\S]*?)(?=(?:\n\s*(?:Clinical|Laboratory|ECG|Background|Medications|Social|Investigation|Echocardiography|Enhanced CT|Procedure|Alerts|Missing))|$)/gi
          ]
        },
        {
          key: 'clinical',
          title: 'Clinical Assessment',
          patterns: [
            /(?:^|\n)\s*(?:Clinical|Clinical Assessment|Assessment)\s*:?\s*([\s\S]*?)(?=(?:\n\s*(?:Laboratory|ECG|Background|Medications|Social|Investigation|Echocardiography|Enhanced CT|Procedure|Alerts|Missing))|$)/gi,
            /(?:^|\n)\s*(?:Risk.*Assessment|Clinical.*Status)\s*:?\s*([\s\S]*?)(?=(?:\n\s*(?:Laboratory|ECG|Background|Medications|Social|Investigation|Echocardiography|Enhanced CT|Procedure|Alerts|Missing))|$)/gi
          ]
        },
        {
          key: 'laboratory',
          title: 'Laboratory Values',
          patterns: [
            /(?:^|\n)\s*(?:Laboratory Values?|Laboratory|Labs?|Blood.*Tests?)\s*:?\s*([\s\S]*?)(?=(?:\n\s*(?:ECG|Background|Medications|Social|Investigation|Echocardiography|Enhanced CT|Procedure|Alerts|Missing))|$)/gi
          ]
        },
        {
          key: 'ecg',
          title: 'ECG Assessment',
          patterns: [
            /(?:^|\n)\s*(?:ECG Assessment|ECG|Electrocardiogram)\s*:?\s*([\s\S]*?)(?=(?:\n\s*(?:Background|Medications|Social|Investigation|Echocardiography|Enhanced CT|Procedure|Alerts|Missing))|$)/gi
          ]
        },
        {
          key: 'echocardiography',
          title: 'Echocardiography',
          patterns: [
            /(?:^|\n)\s*(?:Echocardiography|Echo|Echocardiogram)\s*:?\s*([\s\S]*?)(?=(?:\n\s*(?:Enhanced CT|Procedure|Alerts|Missing))|$)/gi,
            /(?:^|\n)\s*(?:Transthoracic.*Echo|TTE|Cardiac.*Ultrasound)\s*:?\s*([\s\S]*?)(?=(?:\n\s*(?:Enhanced CT|Procedure|Alerts|Missing))|$)/gi
          ]
        },
        {
          key: 'enhanced_ct',
          title: 'Enhanced CT Analysis',
          patterns: [
            /(?:^|\n)\s*(?:Enhanced CT Analysis|CT Analysis|CT|Computed Tomography)\s*:?\s*([\s\S]*?)(?=(?:\n\s*(?:Procedure|Alerts|Missing))|$)/gi,
            /(?:^|\n)\s*(?:Cardiac.*CT|CT.*Aortic|Aortic.*CT)\s*:?\s*([\s\S]*?)(?=(?:\n\s*(?:Procedure|Alerts|Missing))|$)/gi
          ]
        },
        {
          key: 'procedure_planning',
          title: 'Procedure Planning',
          patterns: [
            /(?:^|\n)\s*(?:Procedure Planning|Planning|TAVI.*Planning|Valve.*Planning)\s*:?\s*([\s\S]*?)(?=(?:\n\s*(?:Alerts|Missing))|$)/gi,
            /(?:^|\n)\s*(?:Procedural.*Approach|Surgical.*Plan|Treatment.*Plan)\s*:?\s*([\s\S]*?)(?=(?:\n\s*(?:Alerts|Missing))|$)/gi
          ]
        },
        {
          key: 'alerts',
          title: 'Alerts & Anatomical Considerations',
          patterns: [
            /(?:^|\n)\s*(?:Alerts.*Anatomical.*Considerations|Alerts|Anatomical.*Considerations|Warnings)\s*:?\s*([\s\S]*?)(?=(?:\n\s*Missing)|$)/gi,
            /(?:^|\n)\s*(?:Clinical.*Alerts|Risk.*Factors|Contraindications)\s*:?\s*([\s\S]*?)(?=(?:\n\s*Missing)|$)/gi
          ]
        }
      ];

      let sectionsFound = 0;

      // Try to extract each section using patterns
      sectionPatterns.forEach(({ title, patterns }) => {
        for (const pattern of patterns) {
          const match = pattern.exec(cleanResponse);
          if (match && match[1]) {
            const content = match[1].trim();
            if (content.length > 10 && !this.isGenericContent(content)) {
              sections.push({
                title,
                content,
                type: 'narrative',
                priority: title === 'Alerts & Anatomical Considerations' ? 'high' : 'medium',
              });
              console.log(`✅ TAVI Text Parser: Extracted "${title}" (${content.length} chars)`);
              sectionsFound++;
              break; // Move to next section after finding first match
            }
          }
        }
      });

      console.log(`📊 TAVI Text Parser: Extracted ${sectionsFound} sections via pattern matching`);

      // Validate minimum sections for TAVI workup
      if (sections.length < 2) {
        console.warn(`⚠️ TAVI Text Parser: Only ${sections.length} sections found, may not be sufficient`);
      }

      return sections;

    } catch (error) {
      console.error('❌ TAVI Text Parser: Error in text pattern parsing:', error);
      return [];
    }
  }

  /**
   * Preprocess response for better text pattern matching
   */
  private preprocessResponseForTextParsing(response: string): string {
    // Remove code block markers, extra whitespace, and normalize line endings
    return response
      .replace(/```json|```/gi, '')
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Check if content is too generic/empty to be useful
   */
  private isGenericContent(content: string): boolean {
    const generic = [
      'not provided', 'no data available', 'not available', 'none', 'n/a',
      'not specified', 'not mentioned', 'not stated', 'unknown'
    ];
    const lowerContent = content.toLowerCase();
    return generic.some(phrase => lowerContent.includes(phrase)) && content.length < 50;
  }

  /**
   * Parse JSON structured response from the LLM
   */
  private parseJSONStructuredResponse(response: string): ReportSection[] {
    const sections: ReportSection[] = [];

    try {
      console.log('🔍 TAVI JSON Parser: Attempting to parse structured response...');

      // Clean the response to extract JSON
      let jsonContent = response.trim();

      // Remove code block markers if present
      jsonContent = jsonContent.replace(/```json\s*/, '').replace(/```\s*$/, '');

      // Try to find JSON object in the response
      const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('⚠️ TAVI JSON Parser: No JSON object found in response');
        return [];
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
        { key: 'medications', title: 'Medications (Problem List)' },
        { key: 'social_history', title: 'Social History' },
        { key: 'investigations', title: 'Investigation Summary' },
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
          if (content &&
              content !== 'Not provided' &&
              content !== 'No data available' &&
              content.length > 0) {
            sections.push({
              title,
              content,
              type: 'narrative',
              priority: title === 'Alerts & Anatomical Considerations' ? 'high' : 'medium',
            });
            console.log(`✅ TAVI JSON Parser: Parsed section "${title}" (${content.length} chars)`);
          } else {
            console.log(`⏭️ TAVI JSON Parser: Skipped empty section "${title}"`);
          }
        }
      });

      // JSON data successfully parsed for section extraction

      console.log(`📊 TAVI JSON Parser: Successfully parsed ${sections.length} sections from JSON`);

      // Validate minimum expected sections for TAVI workup
      if (sections.length < 3) {
        console.warn(`⚠️ TAVI JSON Parser: Only ${sections.length} sections found, expected at least 3.`);
      }

      return sections;
    } catch (error) {
      console.error('❌ TAVI JSON Parser: Error parsing JSON response:', error);
      console.log('📝 TAVI JSON Parser: Raw response for debugging:', response.substring(0, 500));
      return [];
    }
  }

  /**
   * Legacy text-based parsing for backwards compatibility
   */
  private parseLegacyResponse(response: string): ReportSection[] {
    const sections: ReportSection[] = [];
    const headingRegex = /^(Patient|Clinical|Background|Medications.*Problem List.*|Social History|Investigation Summary|Echocardiography|CT Measurements|Devices Planned|Alerts & Anatomical Considerations|Missing \/ Not Stated)\n([\s\S]*?)(?=^(?:Patient|Clinical|Background|Medications.*Problem List.*|Social History|Investigation Summary|Echocardiography|CT Measurements|Devices Planned|Alerts & Anatomical Considerations|Missing \/ Not Stated)\n|\s*$)/gmi;

    let match: RegExpExecArray | null;
    while ((match = headingRegex.exec(response)) !== null) {
      const title = match[1].trim();
      const content = match[2].trim();
      if (!content) continue;
      sections.push({
        title,
        content,
        type: 'narrative',
        priority: title === 'Alerts & Anatomical Considerations' ? 'high' : 'medium',
      });
    }

    return sections;
  }

  /**
   * Deterministic fallback composer when LLM output is malformed
   * Uses structured data from extraction to generate proper sections
   */
  private composeDeterministicReport(response: string, _context?: MedicalContext): ReportSection[] {
    const sections: ReportSection[] = [];
    console.log('🔧 TAVI Deterministic Composer: Creating structured fallback from extracted data...');

    try {
      // Add raw response as backup but create proper structured sections
      if (response && response.trim()) {
        sections.push({
          title: 'LLM Output (Raw)',
          content: response.trim(),
          type: 'narrative',
          priority: 'medium',
        });
      }

      // Add guidance section for structured output
      sections.push({
        title: 'Processing Note',
        content: 'The LLM response could not be parsed into the expected XML format. The raw output is shown above. Please check the console for detailed parsing logs, and consider re-running the workup if sections are missing.',
        type: 'narrative',
        priority: 'high',
      });

      // Add troubleshooting section
      sections.push({
        title: 'Expected Structure',
        content: 'TAVI Workup should contain sections: Patient, Clinical, Laboratory Values, ECG Assessment, Background, Medications (Problem List), Social History, Investigation Summary, Echocardiography, Enhanced CT Analysis, Procedure Planning, Alerts & Anatomical Considerations, and Missing / Not Stated.',
        type: 'narrative',
        priority: 'medium',
      });

      console.log(`🔧 TAVI Deterministic Composer: Created ${sections.length} fallback sections`);
      return sections;
    } catch (error) {
      console.error('❌ TAVI Deterministic Composer: Error creating fallback:', error);

      // Final fallback
      return [{
        title: 'Processing Error',
        content: 'TAVI workup processing encountered an error. Please try recording again.',
        type: 'narrative',
        priority: 'high',
      }];
    }
  }

  /**
   * Compose final structured text output with proper section formatting
   */
  private composeStructuredText(sections: ReportSection[]): string {
    if (sections.length === 0) {
      return 'No structured content was generated.';
    }

    const output: string[] = [];

    sections.forEach(section => {
      // Add section heading with double line break
      output.push(`${section.title}\n`);

      // Add section content with line break after
      output.push(`${section.content}\n`);
    });

    return output.join('\n').trim();
  }

  /**
   * Extract EMR dialog fields and patient demographics efficiently using direct content script communication
   * Reads .customNote elements directly without opening dialogs - matches efficient agents like AI Review
   */
  private async extractEMRDialogFields(): Promise<{
    background: string;
    investigations: string;
    medications: string;
    socialHistory: string;
    patientData?: {
      name?: string;
      id?: string;
      dob?: string;
      age?: string;
      phone?: string;
      email?: string;
      medicare?: string;
      insurance?: string;
      address?: string;
    };
  }> {
    try {
      console.log('📋 TAVI: Starting efficient EMR data extraction (no dialog opening)...');

      // Get current tab for direct content script communication
      const activeTab = await chrome.tabs.query({ active: true, currentWindow: true });
      const tabId = activeTab[0]?.id;
      if (!tabId) {
        console.warn('⚠️ TAVI: No active tab found for EMR extraction');
        return { background: '', investigations: '', medications: '', socialHistory: '' };
      }

      // Extract EMR fields using direct content script communication (efficient)
      const extractionPromises = [
        {
          name: 'background',
          promise: chrome.tabs.sendMessage(tabId, {
            type: 'EXTRACT_CUSTOM_NOTE_CONTENT',
            fieldName: 'Background'
          })
        },
        {
          name: 'investigations',
          promise: chrome.tabs.sendMessage(tabId, {
            type: 'EXTRACT_CUSTOM_NOTE_CONTENT',
            fieldName: 'Investigation Summary'
          })
        },
        {
          name: 'medications',
          promise: chrome.tabs.sendMessage(tabId, {
            type: 'EXTRACT_CUSTOM_NOTE_CONTENT',
            fieldName: 'Medications (Problem List for Phil)'
          })
        },
        // Try social history extraction (may not always be present)
        {
          name: 'socialHistory',
          promise: chrome.tabs.sendMessage(tabId, {
            type: 'EXTRACT_CUSTOM_NOTE_CONTENT',
            fieldName: 'Social History'
          })
        }
      ];

      // Extract patient demographics using existing efficient method
      const patientDataPromise = chrome.tabs.sendMessage(tabId, {
        type: 'EXTRACT_PATIENT_DATA'
      });

      // Wait for all extractions to complete
      const [backgroundResult, investigationResult, medicationResult, socialResult, patientResult] = await Promise.allSettled([
        ...extractionPromises.map(item => item.promise),
        patientDataPromise
      ]);

      // Extract content from direct content script responses
      const background = this.extractDirectContentResponse(backgroundResult, 'Background');
      const investigations = this.extractDirectContentResponse(investigationResult, 'Investigation Summary');
      const medications = this.extractDirectContentResponse(medicationResult, 'Medications');
      const socialHistory = this.extractDirectContentResponse(socialResult, 'Social History');
      const patientData = this.extractPatientDataResponse(patientResult);

      console.log('📋 TAVI: Efficient EMR extraction summary (no dialogs opened):', {
        background: { length: background.length, hasContent: !!background.trim() },
        investigations: { length: investigations.length, hasContent: !!investigations.trim() },
        medications: { length: medications.length, hasContent: !!medications.trim() },
        socialHistory: { length: socialHistory.length, hasContent: !!socialHistory.trim() },
        patientData: {
          hasName: !!patientData?.name,
          hasId: !!patientData?.id,
          hasDob: !!patientData?.dob
        }
      });

      return { background, investigations, medications, socialHistory, patientData };
    } catch (error) {
      console.warn('⚠️ TAVI: Efficient EMR extraction failed, continuing without EMR data:', error);
      return { background: '', investigations: '', medications: '', socialHistory: '' };
    }
  }

  /**
   * Helper function to extract content from direct content script responses (EXTRACT_CUSTOM_NOTE_CONTENT)
   */
  private extractDirectContentResponse(result: PromiseSettledResult<any>, fieldName: string): string {
    if (result.status === 'rejected') {
      console.log(`📋 TAVI: ${fieldName} direct extraction failed:`, result.reason);
      return '';
    }

    const response = result.value;
    if (!response) {
      console.log(`📋 TAVI: ${fieldName} - No response received from direct extraction`);
      return '';
    }

    // Direct content script responses have { success: boolean, data: string } format
    if (response.success && typeof response.data === 'string') {
      console.log(`📋 TAVI: ${fieldName} - Extracted ${response.data.length} characters directly`);
      return response.data;
    } else {
      console.log(`📋 TAVI: ${fieldName} - Direct extraction failed:`, response.error || 'Unknown error');
      return '';
    }
  }

  /**
   * Helper function to extract patient data from EXTRACT_PATIENT_DATA responses
   */
  private extractPatientDataResponse(result: PromiseSettledResult<any>): any {
    if (result.status === 'rejected') {
      console.log('📋 TAVI: Patient data extraction failed:', result.reason);
      return null;
    }

    const response = result.value;
    if (!response) {
      console.log('📋 TAVI: Patient data - No response received');
      return null;
    }

    // Patient data responses have { success: boolean, data: object } format
    if (response.success && response.data) {
      console.log('📋 TAVI: Patient data - Extracted successfully:', {
        hasName: !!response.data.name,
        hasId: !!response.data.id,
        hasDob: !!response.data.dob
      });
      return response.data;
    } else {
      console.log('📋 TAVI: Patient data extraction failed:', response.error || 'Unknown error');
      return null;
    }
  }

  private buildLLMPayload(
    transcript: string,
    data: TAVIWorkupData,
    alerts: TAVIWorkupAlerts,
    missingFields: string[],
    emrData?: {
      background: string;
      investigations: string;
      medications: string;
      socialHistory: string;
      patientData?: {
        name?: string;
        id?: string;
        dob?: string;
        age?: string;
        phone?: string;
        email?: string;
        medicare?: string;
        insurance?: string;
        address?: string;
      };
    }
  ): string {
    const payload = {
      transcript,
      structured_data: this.formatDataForLLM(data),
      alerts: alerts.alertMessages,
      missing_fields: missingFields,
      // EMR clinical data
      emr_fields: emrData ? {
        background: emrData.background || 'Not available',
        investigation_summary: emrData.investigations || 'Not available',
        medications_problem_list: emrData.medications || 'Not available',
        social_history: emrData.socialHistory || 'Not available'
      } : {
        background: 'Not available',
        investigation_summary: 'Not available',
        medications_problem_list: 'Not available',
        social_history: 'Not available'
      },
      // Patient demographics (automatically extracted from EMR)
      patient_demographics: emrData?.patientData ? {
        name: emrData.patientData.name || 'Not available',
        id: emrData.patientData.id || 'Not available',
        date_of_birth: emrData.patientData.dob || 'Not available',
        age: emrData.patientData.age || 'Not available',
        phone: emrData.patientData.phone || 'Not available',
        email: emrData.patientData.email || 'Not available',
        medicare: emrData.patientData.medicare || 'Not available',
        insurance: emrData.patientData.insurance || 'Not available',
        address: emrData.patientData.address || 'Not available'
      } : {
        name: 'Not available',
        id: 'Not available',
        date_of_birth: 'Not available',
        age: 'Not available',
        phone: 'Not available',
        email: 'Not available',
        medicare: 'Not available',
        insurance: 'Not available',
        address: 'Not available'
      }
    };

    return JSON.stringify(payload, null, 2);
  }

  /**
   * Detect missing information in TAVI workup dictation using dedicated LLM analysis
   * Following QuickLetter pattern for comprehensive missing info detection
   */
  private async detectMissingInformation(input: string, extraction: any): Promise<any> {
    try {
      console.log('🔍 TAVI Missing Info: Starting dedicated missing information analysis');

      const missingInfoPrompt = `${TAVI_WORKUP_SYSTEM_PROMPTS.missingInfoDetection}

TAVI WORKUP DICTATION TO ANALYZE:
${input}

EXTRACTED STRUCTURED DATA AVAILABLE:
${JSON.stringify(extraction.data, null, 2)}

CURRENT ALERTS IDENTIFIED:
${extraction.alerts.alertMessages.join('; ')}

Based on this information, analyze what clinical information is missing that would be valuable for comprehensive TAVI workup and procedural planning.`;

      console.log('🤖 TAVI Missing Info: Sending request to LLM for missing info analysis');
      const response = await this.lmStudioService.processWithAgent(
        missingInfoPrompt,
        input,
        this.agentType
      );

      console.log('📥 TAVI Missing Info: Received response from LLM');

      try {
        // Parse the JSON response
        const cleanResponse = response.replace(/```json|```/g, '').trim();
        const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          const missingInfo = JSON.parse(jsonMatch[0]);
          console.log('✅ TAVI Missing Info: Successfully parsed JSON response');
          console.log(`📊 Missing info summary - Clinical: ${missingInfo.missing_clinical_assessment?.length || 0}, Diagnostic: ${missingInfo.missing_diagnostic_studies?.length || 0}, Procedural: ${missingInfo.missing_procedural_planning?.length || 0}`);

          // Transform to MissingInfoPanel format
          return {
            missing_clinical: missingInfo.missing_clinical_assessment || [],
            missing_diagnostic: missingInfo.missing_diagnostic_studies || [],
            missing_measurements: missingInfo.missing_procedural_planning || [],
            missing_structured: extraction.missingFields || [],
            completeness_score: missingInfo.completeness_score || '50% (Incomplete)',
            critical_gaps: missingInfo.critical_gaps || []
          };
        } else {
          console.warn('⚠️ TAVI Missing Info: No JSON found in response, using fallback');
          return this.fallbackMissingInfoDetection(input, extraction);
        }
      } catch (parseError) {
        console.warn('⚠️ TAVI Missing Info: JSON parsing failed, using fallback');
        console.error('Parse error:', parseError);
        return this.fallbackMissingInfoDetection(input, extraction);
      }

    } catch (error) {
      console.error('❌ TAVI Missing Info: Error in missing information detection:', error);
      return this.fallbackMissingInfoDetection(input, extraction);
    }
  }

  /**
   * Fallback missing info detection using keyword analysis for TAVI workup
   */
  private fallbackMissingInfoDetection(input: string, extraction: any): any {
    console.log('🔄 TAVI Missing Info: Using fallback keyword-based detection');

    const text = input.toLowerCase();
    const missing = {
      missing_clinical: [] as string[],
      missing_diagnostic: [] as string[],
      missing_measurements: [] as string[],
      missing_structured: extraction.missingFields || [],
      completeness_score: '60% (Fair)',
      critical_gaps: [] as string[]
    };

    // Check for common TAVI clinical assessments
    if (!text.includes('nyha') && !text.includes('functional class')) {
      missing.missing_clinical.push('NYHA functional class assessment');
    }
    if (!text.includes('sts') && !text.includes('score')) {
      missing.missing_clinical.push('STS PROM risk score');
    }
    if (!text.includes('euroscore')) {
      missing.missing_clinical.push('EuroSCORE II calculation');
    }

    // Check for diagnostic studies
    if (!text.includes('echo') && !text.includes('echocardiogram')) {
      missing.missing_diagnostic.push('Recent echocardiographic assessment');
    }
    if (!text.includes('ct') && !text.includes('computed tomography')) {
      missing.missing_diagnostic.push('CT aortic root assessment');
    }
    if (!text.includes('creatinine') && !text.includes('kidney function')) {
      missing.missing_diagnostic.push('Renal function assessment');
    }

    // Check for procedural planning
    if (!text.includes('valve') && !text.includes('prosthesis')) {
      missing.missing_measurements.push('Valve selection and sizing strategy');
    }
    if (!text.includes('access') && !text.includes('femoral')) {
      missing.missing_measurements.push('Vascular access assessment');
    }

    console.log(`📊 TAVI Fallback Missing Info: Generated ${missing.missing_clinical.length + missing.missing_diagnostic.length + missing.missing_measurements.length} missing items`);
    return missing;
  }

  /**
   * Create error report following the established pattern
   */
  private createErrorReport(errorMessage: string, processingTime: number, context?: MedicalContext): TAVIWorkupReport {
    console.log('🔧 TAVI Error Handler: Creating structured error report');

    const fallbackSections = [{
      title: 'Processing Error',
      content: 'TAVI workup processing encountered an error. Please review the dictation and try again.',
      type: 'narrative' as const,
      priority: 'high' as const
    }];

    const fallbackText = this.composeStructuredText(fallbackSections);

    const fallback = this.createReport(
      fallbackText,
      fallbackSections,
      context,
      processingTime,
      0.1,
      ['Processing failed'],
      [`Processing failed: ${errorMessage}`]
    );

    const emptyReport: TAVIWorkupReport = {
      ...fallback,
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
          accessVessels: {},
        },
        procedurePlan: {
          valveSelection: {},
          access: {},
          strategy: {},
        },
      },
      alerts: {
        alertMessages: ['Processing error.'],
        triggers: {
          lowLeftMainHeight: false,
          lowSinusDiameters: [],
          smallAccessVessels: [],
        },
      },
      missingFields: [],
    };

    return emptyReport;
  }



  private formatDataForLLM(data: TAVIWorkupData): Record<string, unknown> {
    const formatValue = (value?: number, unit?: string) => {
      if (value == null) return null;
      const valueStr = Number.isInteger(value) ? value.toString() : value.toString();
      return unit ? `${valueStr} ${unit}` : valueStr;
    };

    return {
      patient: {
        name: data.patient.name ?? null,
        dob: data.patient.dob ?? null,
        age_years: data.patient.ageYears ?? null,
        height_cm: formatValue(data.patient.heightCm, 'cm'),
        weight_kg: formatValue(data.patient.weightKg, 'kg'),
        bmi: formatValue(data.patient.bmi),
        bsa_m2: formatValue(data.patient.bsaMosteller, 'm²'),
      },
      clinical: {
        indication: data.clinical.indication ?? null,
        nyha_class: data.clinical.nyhaClass ?? null,
        sts_percent: formatValue(data.clinical.stsPercent, '%'),
        euro_score_percent: formatValue(data.clinical.euroScorePercent, '%'),
      },
      laboratory: {
        creatinine: formatValue(data.laboratory.creatinine, 'μmol/L'),
        egfr: formatValue(data.laboratory.egfr, 'mL/min/1.73m²'),
        hemoglobin: formatValue(data.laboratory.hemoglobin, 'g/L'),
        albumin: formatValue(data.laboratory.albumin, 'g/L'),
      },
      ecg: {
        heart_rate: formatValue(data.ecg.rate, 'bpm'),
        rhythm: data.ecg.rhythm ?? null,
        morphology: data.ecg.morphology ?? null,
        qrs_width: formatValue(data.ecg.qrsWidthMs, 'ms'),
        pr_interval: formatValue(data.ecg.prIntervalMs, 'ms'),
      },
      echocardiography: {
        study_date: data.echocardiography.studyDate ?? null,
        ejection_fraction: formatValue(data.echocardiography.ejectionFractionPercent, '%'),
        septal_thickness: formatValue(data.echocardiography.septalThicknessMm, 'mm'),
        mean_pressure_gradient: formatValue(data.echocardiography.meanGradientMmHg, 'mmHg'),
        aortic_valve_area: formatValue(data.echocardiography.aorticValveAreaCm2, 'cm²'),
        dimensionless_index: data.echocardiography.dimensionlessIndex ?? null,
        mitral_regurgitation_grade: data.echocardiography.mitralRegurgitationGrade ?? null,
        rv_systolic_pressure: formatValue(data.echocardiography.rightVentricularSystolicPressureMmHg, 'mmHg'),
        comments: data.echocardiography.comments ?? null,
      },
      ct_measurements: {
        annulus_area: formatValue(data.ctMeasurements.annulusAreaMm2, 'mm²'),
        annulus_perimeter: formatValue(data.ctMeasurements.annulusPerimeterMm, 'mm'),
        annulus_min_diameter: formatValue(data.ctMeasurements.annulusMinDiameterMm, 'mm'),
        annulus_max_diameter: formatValue(data.ctMeasurements.annulusMaxDiameterMm, 'mm'),
        coronary_heights: {
          left_main: formatValue(data.ctMeasurements.coronaryHeights.leftMainMm, 'mm'),
          right_coronary: formatValue(data.ctMeasurements.coronaryHeights.rightCoronaryMm, 'mm'),
        },
        sinus_of_valsalva: {
          left: formatValue(data.ctMeasurements.sinusOfValsalva.leftMm, 'mm'),
          right: formatValue(data.ctMeasurements.sinusOfValsalva.rightMm, 'mm'),
          non_coronary: formatValue(data.ctMeasurements.sinusOfValsalva.nonCoronaryMm, 'mm'),
        },
        coplanar_angles: data.ctMeasurements.coplanarAngles.length > 0 ? data.ctMeasurements.coplanarAngles : null,
        access_vessels_mm: {
          right_cia: formatValue(data.ctMeasurements.accessVessels.rightCIAmm, 'mm'),
          left_cia: formatValue(data.ctMeasurements.accessVessels.leftCIAmm, 'mm'),
          right_eia: formatValue(data.ctMeasurements.accessVessels.rightEIAmm, 'mm'),
          left_eia: formatValue(data.ctMeasurements.accessVessels.leftEIAmm, 'mm'),
          right_cfa: formatValue(data.ctMeasurements.accessVessels.rightCFAmm, 'mm'),
          left_cfa: formatValue(data.ctMeasurements.accessVessels.leftCFAmm, 'mm'),
        },
        // Enhanced LVOT and calcium measurements
        lvot_area: formatValue(data.ctMeasurements.lvotAreaMm2, 'mm²'),
        lvot_perimeter: formatValue(data.ctMeasurements.lvotPerimeterMm, 'mm'),
        stj_diameter: formatValue(data.ctMeasurements.stjDiameterMm, 'mm'),
        stj_height: formatValue(data.ctMeasurements.stjHeightMm, 'mm'),
        calcium_score: formatValue(data.ctMeasurements.calciumScore),
        lvot_calcium_score: formatValue(data.ctMeasurements.lvotCalciumScore),
        aortic_dimensions: data.ctMeasurements.aorticDimensions ?? null,
      },
      procedure_plan: {
        valve_selection: {
          type: data.procedurePlan.valveSelection.type ?? null,
          size: data.procedurePlan.valveSelection.size ?? null,
          model: data.procedurePlan.valveSelection.model ?? null,
          reason: data.procedurePlan.valveSelection.reason ?? null,
        },
        access: {
          primary: data.procedurePlan.access.primary ?? null,
          secondary: data.procedurePlan.access.secondary ?? null,
          wire: data.procedurePlan.access.wire ?? null,
        },
        strategy: {
          pacing: data.procedurePlan.strategy.pacing ?? null,
          bav: data.procedurePlan.strategy.bav ?? null,
          closure: data.procedurePlan.strategy.closure ?? null,
          protamine: data.procedurePlan.strategy.protamine ?? null,
        },
        goals: data.procedurePlan.goals ?? null,
        case_notes: data.procedurePlan.caseNotes ?? null,
      },
      devices_planned: data.devicesPlanned ?? null,
    };
  }
}
