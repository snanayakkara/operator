import { MedicalAgent } from '@/agents/base/MedicalAgent';
import type {
  MedicalContext,
  ReportSection,
  TAVIWorkupReport,
  TAVIWorkupStructuredSections,
  TAVIWorkupData,
  TAVIWorkupAlerts,
  TAVIWorkupSection,
  ChatMessage,
  ValidationResult,
  TAVIExtractedData
} from '@/types/medical.types';
import { LMStudioService, MODEL_CONFIG } from '@/services/LMStudioService';
import { systemPromptLoader } from '@/services/SystemPromptLoader';
import { TAVI_WORKUP_SYSTEM_PROMPTS } from './TAVIWorkupSystemPrompts';
import { TAVIWorkupExtractor } from '@/utils/text-extraction/TAVIWorkupExtractor';

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
      const { data: extractedWorkupData, alerts: extractedAlerts, missingFields: extractedMissingFields } =
        TAVIWorkupExtractor.extract(input, { referenceDate: new Date(context?.timestamp ?? Date.now()) });

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

      // Apply locked facts from proof mode if present (Phase 3)
      if (context?.lockedFacts && Object.keys(context.lockedFacts).length > 0) {
        console.log('[TAVIWorkupAgent] Applying locked facts from proof mode');
        this.applyLockedFacts(context.lockedFacts, correctedData);
      }

      // Merge any user-provided fields from validation modal (reprocessing flow)
      let mergedExtractedData = correctedData;
      if (context?.userProvidedFields && Object.keys(context.userProvidedFields).length > 0) {
        console.log('🚨 TAVI AGENT: Merging user-provided fields...');
        mergedExtractedData = this.mergeUserInput(correctedData, context.userProvidedFields);
      }

      // INTERACTIVE CHECKPOINT: Check for unresolved critical gaps / low-confidence corrections
      const unresolvedCritical = validation.missingCritical
        .filter(field => field.critical === true)
        .filter(field => this.isMissingNestedField(mergedExtractedData, field.field));

      const unresolvedLowConfidence = validation.corrections
        .filter(correction => correction.confidence < 0.8)
        .filter(correction => {
          if (this.isMissingNestedField(mergedExtractedData, correction.field)) return true;
          const currentValue = this.getNestedField(mergedExtractedData, correction.field);
          return String(currentValue) !== String(correction.correctValue);
        });

      if (unresolvedCritical.length > 0 || unresolvedLowConfidence.length > 0) {
        console.log(
          `⚠️ TAVI AGENT: Validation requires user input (${unresolvedCritical.length} critical fields missing, ${unresolvedLowConfidence.length} low-confidence corrections)`
        );

        const filteredValidation: ValidationResult = {
          ...validation,
          missingCritical: unresolvedCritical,
          corrections: validation.corrections
        };

        const structuredFallback = this.buildStructuredSectionsFromWorkupData(
          extractedWorkupData,
          extractedAlerts,
          extractedMissingFields,
          emrData
        );

        // Return incomplete report with validation state
        const baseReport = this.createReport('', [], context, 0, 0);
        return {
          ...baseReport,
          workupData: extractedWorkupData,
          alerts: extractedAlerts,
          missingFields: extractedMissingFields,
          structuredSections: structuredFallback,
          status: 'awaiting_validation',
          validationResult: filteredValidation,
          extractedData: mergedExtractedData
        } as TAVIWorkupReport;
      }

      // Check if this is a proof mode extraction request (early return before expensive LLM generation)
      if (context?.requestProofMode) {
        console.log('[TAVIWorkupAgent] Proof mode requested - extracting facts and pausing before LLM generation');
        const keyFacts = this.extractKeyFacts(correctedData);

        // Return early with extracted data and facts for proof mode
        const processingTime = Date.now() - startTime;
        return {
          ...this.createReport('', [], context, processingTime, 0.5),
          status: 'awaiting_proof',
          keyFacts,
          taviData: correctedData,  // Store extracted data for later use
          extractedData: correctedData,  // For consistency with other agents
          message: 'Key facts extracted. Please review and confirm before report generation.'
        } as TAVIWorkupReport;
      }

    console.log('✅ TAVI AGENT: Validation complete, proceeding to reasoning model');

      // Phase 2: LLM Processing
      reportProgress('Processing dictation with AI', 0, 'Preparing comprehensive TAVI analysis');
      const llmPayload = this.buildLLMPayload(input, emrData, {
        isMinimalInput,
        wordCount,
        extractedData: mergedExtractedData,
        userProvidedFields: context?.userProvidedFields
      });
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
      const formattedContent = this.formatReportContent(sections, response);
      const processingTime = Date.now() - startTime;
      reportProgress('Formatting results', 100, `TAVI workup complete - ${processingTime}ms`);

      console.log(`✅ Parsed ${sections.length} sections from TAVI workup response`);

      // Create structured report
      const baseReport = this.createReport(
        formattedContent,
        sections,
        context,
        processingTime,
        this.assessConfidence(input, response)
      );

      const missingInfo = this.mergeMissingFields(
        extractedMissingFields,
        this.extractMissingInformation(response)
      );

      // Parse structured sections from JSON response
      let structuredSections = this.parseStructuredSections(response);
      if (!structuredSections) {
        structuredSections = this.buildStructuredSectionsFromReportSections(sections, missingInfo);
      }

      // Create TAVI-specific report with both legacy and new structure
      const taviReport: TAVIWorkupReport = {
        ...baseReport,
        workupData: extractedWorkupData,
        alerts: extractedAlerts,
        missingFields: missingInfo,
        structuredSections: structuredSections || undefined,
        metadata: {
          ...baseReport.metadata,
          missingInformation: {
            missing_structured: missingInfo
          },
          rawAIOutput: response,
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

    try {
      const xmlSections = this.parseXMLResponse(response);
      if (xmlSections.length > 0) {
        console.log(`✅ TAVI Parser: XML parsing successful - ${xmlSections.length} sections`);
        return xmlSections;
      }
    } catch (xmlError) {
      console.warn('⚠️ TAVI Parser: XML parsing failed, trying text patterns');
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
      // enhanced_ct REMOVED - CT data now in ctMeasurements
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

    // Plain heading format (legacy): "Patient\n...\n\nClinical\n..."
    const plainHeadingSections = this.parsePlainHeadingSections(response);
    if (plainHeadingSections.length > 0) {
      return plainHeadingSections;
    }

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

  private parseXMLResponse(response: string): ReportSection[] {
    const sections: ReportSection[] = [];
    const sectionRegex = /<section\s+title="([^"]+)"\s*>([\s\S]*?)<\/section>/gi;
    let match: RegExpExecArray | null;

    while ((match = sectionRegex.exec(response)) !== null) {
      const title = match[1]?.trim();
      const rawContent = match[2] ?? '';
      const content = rawContent
        .replace(/<\/?[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (title && content) {
        sections.push({
          title,
          content,
          type: 'narrative',
          priority: title.toLowerCase().includes('alerts') ? 'high' : 'medium'
        });
      }
    }

    return sections;
  }

  private parsePlainHeadingSections(response: string): ReportSection[] {
    const normalized = response.replace(/\r\n/g, '\n').trim();
    if (!normalized) return [];

    const knownHeadings = new Map<string, { title: string; priority: 'high' | 'medium' | 'low' }>([
      ['patient', { title: 'Patient', priority: 'medium' }],
      ['clinical', { title: 'Clinical', priority: 'medium' }],
      ['laboratory values', { title: 'Laboratory Values', priority: 'medium' }],
      ['ecg assessment', { title: 'ECG Assessment', priority: 'medium' }],
      ['background', { title: 'Background', priority: 'medium' }],
      ['medications', { title: 'Medications', priority: 'medium' }],
      ['medications (problem list)', { title: 'Medications (Problem List)', priority: 'medium' }],
      ['social history', { title: 'Social History', priority: 'medium' }],
      ['investigation summary', { title: 'Investigation Summary', priority: 'medium' }],
      ['investigations', { title: 'Investigations', priority: 'medium' }],
      ['other investigations', { title: 'Other Investigations', priority: 'medium' }],
      ['echocardiography', { title: 'Echocardiography', priority: 'medium' }],
      ['ct measurements', { title: 'CT Measurements', priority: 'medium' }],
      ['enhanced ct analysis', { title: 'Enhanced CT Analysis', priority: 'medium' }],
      ['procedure planning', { title: 'Procedure Planning', priority: 'medium' }],
      ['devices planned', { title: 'Devices Planned', priority: 'medium' }],
      ['alerts & anatomical considerations', { title: 'Alerts & Anatomical Considerations', priority: 'high' }],
      ['missing / not stated', { title: 'Missing / Not Stated', priority: 'medium' }],
    ]);

    const lines = normalized.split('\n');
    const headings: Array<{ lineIndex: number; key: string }> = [];

    for (let i = 0; i < lines.length; i++) {
      const key = lines[i].trim().toLowerCase();
      if (knownHeadings.has(key)) {
        headings.push({ lineIndex: i, key });
      }
    }

    if (headings.length === 0) return [];

    const sections: ReportSection[] = [];
    for (let i = 0; i < headings.length; i++) {
      const start = headings[i].lineIndex + 1;
      const end = (headings[i + 1]?.lineIndex ?? lines.length);
      const body = lines.slice(start, end).join('\n').trim();
      if (!body) continue;
      const meta = knownHeadings.get(headings[i].key)!;
      sections.push({
        title: meta.title,
        content: body,
        type: 'narrative',
        priority: meta.priority
      });
    }

    return sections;
  }

  private formatReportContent(sections: ReportSection[], rawResponse: string): string {
    if (!sections || sections.length === 0) {
      return `TAVI Workup Summary\n\n${rawResponse.trim()}`;
    }

    return sections.map(section => `${section.title}\n\n${section.content.trim()}`).join('\n\n');
  }

  private mergeMissingFields(primary: string[], additional: string[]): string[] {
    const merged: string[] = [];
    for (const item of [...primary, ...additional]) {
      const trimmed = item.trim();
      if (!trimmed) continue;
      if (!merged.some(existing => existing.toLowerCase() === trimmed.toLowerCase())) {
        merged.push(trimmed);
      }
    }
    return merged;
  }

  private buildStructuredSectionsFromReportSections(
    sections: ReportSection[],
    missingInfo: string[]
  ): TAVIWorkupStructuredSections {
    const blank = (content: string): TAVIWorkupSection => ({ content, missing: [] });

    const structured: TAVIWorkupStructuredSections = {
      patient: blank('Not provided'),
      clinical: blank('Not provided'),
      laboratory: blank('Not provided'),
      ecg: blank('Not provided'),
      background: blank('Not provided'),
      medications: blank('Not provided'),
      social_history: blank('Not provided'),
      investigations: blank('Not provided'),
      echocardiography: blank('Not provided'),
      // enhanced_ct REMOVED - CT data now in ctMeasurements
      procedure_planning: blank('Not provided'),
      alerts: blank('None'),
      missing_summary: {
        missing_clinical: [],
        missing_diagnostic: [],
        missing_measurements: [...missingInfo],
        completeness_score: 'Not assessed'
      }
    };

    const appendSection = (key: keyof Omit<TAVIWorkupStructuredSections, 'missing_summary'>, content: string) => {
      const current = structured[key].content;
      const next = this.normalizeStructuredSectionContent(content, key);
      if (!next) return;
      if (current && current !== 'Not provided' && current !== 'None') {
        structured[key] = blank(`${current}\n${next}`);
      } else {
        structured[key] = blank(next);
      }
    };

    for (const section of sections) {
      const key = this.mapSectionTitleToKey(section.title);
      if (!key) continue;

      if (key === 'missing_summary') {
        const extractedMissing = this.extractMissingListFromText(section.content);
        structured.missing_summary.missing_measurements = this.mergeMissingFields(
          structured.missing_summary.missing_measurements,
          extractedMissing
        );
        continue;
      }

      appendSection(key, section.content);
    }

    return structured;
  }

  private buildStructuredSectionsFromWorkupData(
    workupData: TAVIWorkupData,
    alerts: TAVIWorkupAlerts,
    missingFields: string[],
    emrData: { background: string; investigations: string; medications: string; socialHistory: string; patientData?: any }
  ): TAVIWorkupStructuredSections {
    const blank = (content: string): TAVIWorkupSection => ({ content, missing: [] });

    const patientParts: string[] = [];
    const emrPatient = this.formatPatientData(emrData.patientData);
    if (emrPatient && emrPatient !== 'Not available') {
      patientParts.push(emrPatient);
    }

    const dictatedPatientParts: string[] = [];
    if (workupData.patient.name) dictatedPatientParts.push(`Name: ${workupData.patient.name}`);
    if (workupData.patient.dob) dictatedPatientParts.push(`DOB: ${workupData.patient.dob}`);
    if (workupData.patient.ageYears != null) dictatedPatientParts.push(`Age: ${workupData.patient.ageYears} years`);
    if (workupData.patient.heightCm != null) dictatedPatientParts.push(`Height: ${workupData.patient.heightCm} cm`);
    if (workupData.patient.weightKg != null) dictatedPatientParts.push(`Weight: ${workupData.patient.weightKg} kg`);
    if (workupData.patient.bmi != null) dictatedPatientParts.push(`BMI: ${workupData.patient.bmi}`);
    if (workupData.patient.bsaMosteller != null) dictatedPatientParts.push(`BSA (Mosteller): ${workupData.patient.bsaMosteller} m²`);
    if (dictatedPatientParts.length > 0) {
      patientParts.push(dictatedPatientParts.join(', '));
    }
    const patientContent = patientParts.length > 0 ? patientParts.join('\n') : 'Not provided';

    const clinicalParts: string[] = [];
    if (workupData.clinical.indication) clinicalParts.push(`Indication: ${workupData.clinical.indication}`);
    if (workupData.clinical.nyhaClass) clinicalParts.push(`NYHA: ${workupData.clinical.nyhaClass}`);
    if (workupData.clinical.stsPercent != null) clinicalParts.push(`STS: ${workupData.clinical.stsPercent}%`);
    if (workupData.clinical.euroScorePercent != null) clinicalParts.push(`EuroSCORE II: ${workupData.clinical.euroScorePercent}%`);
    const clinicalContent = clinicalParts.length > 0 ? clinicalParts.join('\n') : 'Not provided';

    const labParts: string[] = [];
    if (workupData.laboratory.creatinine != null) labParts.push(`Creatinine: ${workupData.laboratory.creatinine} μmol/L`);
    if (workupData.laboratory.egfr != null) labParts.push(`eGFR: ${workupData.laboratory.egfr} mL/min/1.73m²`);
    if (workupData.laboratory.hemoglobin != null) labParts.push(`Haemoglobin: ${workupData.laboratory.hemoglobin} g/L`);
    if (workupData.laboratory.albumin != null) labParts.push(`Albumin: ${workupData.laboratory.albumin} g/L`);
    const labContent = labParts.length > 0 ? labParts.join('\n') : 'Not provided';

    const ecgParts: string[] = [];
    if (workupData.ecg.rate != null) ecgParts.push(`Rate: ${workupData.ecg.rate} bpm`);
    if (workupData.ecg.rhythm) ecgParts.push(`Rhythm: ${workupData.ecg.rhythm}`);
    if (workupData.ecg.morphology) ecgParts.push(`QRS morphology: ${workupData.ecg.morphology}`);
    if (workupData.ecg.qrsWidthMs != null) ecgParts.push(`QRS: ${workupData.ecg.qrsWidthMs} ms`);
    if (workupData.ecg.prIntervalMs != null) ecgParts.push(`PR: ${workupData.ecg.prIntervalMs} ms`);
    const ecgContent = ecgParts.length > 0 ? ecgParts.join('\n') : 'Not provided';

    const echoParts: string[] = [];
    if (workupData.echocardiography.studyDate) echoParts.push(`Study date: ${workupData.echocardiography.studyDate}`);
    if (workupData.echocardiography.ejectionFractionPercent != null) echoParts.push(`EF: ${workupData.echocardiography.ejectionFractionPercent}%`);
    if (workupData.echocardiography.septalThicknessMm != null) echoParts.push(`Septal thickness: ${workupData.echocardiography.septalThicknessMm} mm`);
    if (workupData.echocardiography.meanGradientMmHg != null) echoParts.push(`Mean gradient: ${workupData.echocardiography.meanGradientMmHg} mmHg`);
    if (workupData.echocardiography.aorticValveAreaCm2 != null) echoParts.push(`AVA: ${workupData.echocardiography.aorticValveAreaCm2} cm²`);
    if (workupData.echocardiography.dimensionlessIndex != null) echoParts.push(`Dimensionless index: ${workupData.echocardiography.dimensionlessIndex}`);
    if (workupData.echocardiography.mitralRegurgitationGrade) echoParts.push(`MR: ${workupData.echocardiography.mitralRegurgitationGrade}`);
    if (workupData.echocardiography.rightVentricularSystolicPressureMmHg != null) {
      echoParts.push(`RVSP: ${workupData.echocardiography.rightVentricularSystolicPressureMmHg} mmHg`);
    }
    if (workupData.echocardiography.comments) echoParts.push(workupData.echocardiography.comments);
    const echoContent = echoParts.length > 0 ? echoParts.join('\n') : 'Not provided';

    // CT data now stored in ctMeasurements (numeric fields) instead of enhanced_ct text section

    const planParts: string[] = [];
    if (workupData.procedurePlan.valveSelection.type) planParts.push(`Valve: ${workupData.procedurePlan.valveSelection.type}`);
    if (workupData.procedurePlan.valveSelection.size) planParts.push(`Valve size: ${workupData.procedurePlan.valveSelection.size}`);
    if (workupData.procedurePlan.valveSelection.model) planParts.push(`Valve model: ${workupData.procedurePlan.valveSelection.model}`);
    if (workupData.procedurePlan.valveSelection.reason) planParts.push(`Rationale: ${workupData.procedurePlan.valveSelection.reason}`);
    if (workupData.procedurePlan.access.primary) planParts.push(`Primary access: ${workupData.procedurePlan.access.primary}`);
    if (workupData.procedurePlan.access.secondary) planParts.push(`Secondary access: ${workupData.procedurePlan.access.secondary}`);
    if (workupData.procedurePlan.access.wire) planParts.push(`Wire: ${workupData.procedurePlan.access.wire}`);
    if (workupData.procedurePlan.strategy.pacing) planParts.push(`Pacing: ${workupData.procedurePlan.strategy.pacing}`);
    if (workupData.procedurePlan.strategy.bav) planParts.push(`BAV: ${workupData.procedurePlan.strategy.bav}`);
    if (workupData.procedurePlan.strategy.closure) planParts.push(`Closure: ${workupData.procedurePlan.strategy.closure}`);
    if (workupData.procedurePlan.strategy.protamine != null) {
      planParts.push(`Protamine: ${workupData.procedurePlan.strategy.protamine ? 'Yes' : 'No'}`);
    }
    if (workupData.procedurePlan.goals) planParts.push(`Goals: ${workupData.procedurePlan.goals}`);
    if (workupData.procedurePlan.caseNotes) planParts.push(`Case notes: ${workupData.procedurePlan.caseNotes}`);
    if (workupData.devicesPlanned) planParts.push(`Devices planned: ${workupData.devicesPlanned}`);
    const planContent = planParts.length > 0 ? planParts.join('\n') : 'Not provided';

    const backgroundContent = this.normalizeStructuredSectionContent(emrData.background || '', 'background') || 'Not provided';
    const medicationsContent = this.normalizeStructuredSectionContent(emrData.medications || '', 'medications') || 'Not provided';
    const socialContent = this.normalizeStructuredSectionContent(emrData.socialHistory || '', 'social_history') || 'Not provided';
    const investigationsContent = this.normalizeStructuredSectionContent(emrData.investigations || '', 'investigations') || 'Not provided';

    const alertsContent =
      alerts.alertMessages.length > 0 ? alerts.alertMessages.join('\n') : 'None';

    return {
      patient: blank(patientContent),
      clinical: blank(clinicalContent),
      laboratory: blank(labContent),
      ecg: blank(ecgContent),
      background: blank(backgroundContent),
      medications: blank(medicationsContent),
      social_history: blank(socialContent),
      investigations: blank(investigationsContent),
      echocardiography: blank(echoContent),
      // enhanced_ct REMOVED - CT content moved to ctMeasurements.narrative
      procedure_planning: blank(planContent),
      alerts: blank(alertsContent),
      missing_summary: {
        missing_clinical: [],
        missing_diagnostic: [],
        missing_measurements: [...missingFields],
        completeness_score: 'Validation pending'
      }
    };
  }

  private mapSectionTitleToKey(
    title: string
  ): keyof Omit<TAVIWorkupStructuredSections, 'missing_summary'> | 'missing_summary' | null {
    const normalized = title.trim().toLowerCase();

    if (normalized === 'patient' || normalized.includes('patient')) return 'patient';
    if (normalized === 'clinical' || normalized.includes('clinical')) return 'clinical';
    if (normalized === 'laboratory values' || normalized === 'bloods' || normalized.includes('laboratory')) return 'laboratory';
    if (normalized === 'ecg assessment' || normalized === 'ecg' || normalized.includes('ecg')) return 'ecg';
    if (normalized === 'background' || normalized.includes('background')) return 'background';
    if (normalized.startsWith('medications')) return 'medications';
    if (normalized === 'social history' || normalized.includes('social')) return 'social_history';
    if (normalized.includes('investigation')) return 'investigations';
    if (normalized === 'echocardiography' || normalized === 'echo' || normalized.includes('echo')) return 'echocardiography';
    // CT measurements now handled separately via ctMeasurements field (not enhanced_ct section)
    if (normalized === 'procedure planning' || normalized.includes('procedure')) return 'procedure_planning';
    if (normalized.includes('alerts')) return 'alerts';
    if (normalized.includes('missing')) return 'missing_summary';

    return null;
  }

  private normalizeStructuredSectionContent(
    content: string,
    sectionKey: keyof Omit<TAVIWorkupStructuredSections, 'missing_summary'>
  ): string {
    const trimmed = content.trim();
    if (!trimmed) {
      return sectionKey === 'alerts' ? 'None' : 'Not provided';
    }

    const lower = trimmed.toLowerCase();
    const indicatesMissing =
      /\bnot available\b/.test(lower) ||
      /\bno data available\b/.test(lower) ||
      /\bnot provided\b/.test(lower) ||
      /\bno\b.*\bprovided\b/.test(lower);

    if (indicatesMissing) {
      return sectionKey === 'alerts' ? 'None' : 'Not provided';
    }

    return trimmed;
  }

  private extractMissingListFromText(content: string): string[] {
    const cleaned = content
      .replace(/\r\n/g, '\n')
      .replace(/[•·]/g, '\n')
      .replace(/;/g, '\n')
      .trim();

    if (!cleaned) return [];

    return cleaned
      .split('\n')
      .map(item => item.trim())
      .filter(item => item.length > 0);
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
  private buildLLMPayload(
    input: string,
    emrData: any,
    validation?: {
      isMinimalInput?: boolean;
      wordCount?: number;
      extractedData?: TAVIExtractedData;
      userProvidedFields?: Record<string, unknown>;
    }
  ): string {
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

STRUCTURED DATA CONTEXT (if present):
Auto-extracted (regex + validation): ${validation?.extractedData ? JSON.stringify(validation.extractedData) : 'Not available'}
Clinician-provided overrides (take precedence): ${validation?.userProvidedFields ? JSON.stringify(validation.userProvidedFields) : 'Not available'}

INSTRUCTIONS:
- Prefer clinician-provided overrides when present, even if not stated verbatim in dictation.
- Prefer auto-extracted structured values when they match the dictation.
- If a value is not present in dictation/EMR/validated overrides, explicitly mark as missing.

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
        // enhanced_ct REMOVED - CT data now in ctMeasurements
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

    const errorContent = `Processing Error\n\nTAVI workup processing failed. Please review the dictation and try again.\n\nError details: ${errorMessage}`;

    const sections: ReportSection[] = [
      {
        title: 'Processing Error',
        content: `TAVI workup processing failed.\n\n${errorMessage}`,
        type: 'narrative',
        priority: 'high'
      }
    ];

    const fallback = this.createReport(
      errorContent,
      sections,
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
        alertMessages: ['Processing error.'],
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
    const annulusDiamMatch = text.match(/annulus\s+diameter\s+(\d+(?:\.\d+)?)(?:\s*(?:mm|millimeters|millimetres))?/i);
    const annulusPerimMatch = text.match(/(?:annulus\s+)?perimeter\s+(\d+(?:\.\d+)?)(?:\s*(?:mm|millimeters|millimetres))?/i);
    const annulusAreaMatch = text.match(/(?:annulus|ct)\s+area\s+(\d+(?:\.\d+)?)(?:\s*(?:mm²|mm2|sq\s*mm))?/i);

    if (annulusDiamMatch || annulusPerimMatch || annulusAreaMatch) {
      extracted.valveSizing = {
        annulusDiameter: annulusDiamMatch ? parseFloat(annulusDiamMatch[1]) : undefined,
        annulusPerimeter: annulusPerimMatch ? parseFloat(annulusPerimMatch[1]) : undefined,
        annulusArea: annulusAreaMatch ? parseFloat(annulusAreaMatch[1]) : undefined
      };
    }

    // Access Assessment
    const accessSiteMatch = text.match(/(?:access|approach)\s+(?:via|through)\s+(femoral|radial|subclavian|transapical|transaortic)/i);
    const iliofemoralMatch =
      text.match(/(?:iliac|femoral)\s+(?:arteries|vessels)\s+(\d+(?:-\d+)?)(?:\s*(?:mm|millimeters|millimetres))?/i) ||
      text.match(/\bcfa\s+(?:diameter|min(?:imum)?\s+diameter)\s+(\d+(?:\.\d+)?)(?:\s*(?:mm|millimeters|millimetres))?/i);

    if (accessSiteMatch || iliofemoralMatch) {
      extracted.accessAssessment = {
        site: accessSiteMatch ? accessSiteMatch[1] : undefined,
        iliofemoralDimensions: iliofemoralMatch ? iliofemoralMatch[0] : undefined
      };
    }

    // Coronary Heights
    const leftCoronaryMatch = text.match(/left\s+(?:main|coronary)\s+height\s+(\d+(?:\.\d+)?)(?:\s*(?:mm|millimeters|millimetres))?/i);
    const rightCoronaryMatch = text.match(/right\s+coronary\s+height\s+(\d+(?:\.\d+)?)(?:\s*(?:mm|millimeters|millimetres))?/i);

    if (leftCoronaryMatch || rightCoronaryMatch) {
      extracted.coronaryHeights = {
        leftCoronary: leftCoronaryMatch ? parseFloat(leftCoronaryMatch[1]) : undefined,
        rightCoronary: rightCoronaryMatch ? parseFloat(rightCoronaryMatch[1]) : undefined
      };
    }

    // Aortic Valve Assessment from Echo
    const peakGradMatch = text.match(/(?:peak|max)\s+gradient\s+(\d+(?:\.\d+)?)(?:\s*(?:mmhg|mm\s*hg))?/i);
    const meanGradMatch = text.match(/mean\s+gradient\s+(\d+(?:\.\d+)?)(?:\s*(?:mmhg|mm\s*hg))?/i);
    const avAreaMatch = text.match(/(?:aortic\s+valve\s+area|ava)\s+(\d+(?:\.\d+)?)(?:\s*(?:cm²|cm2))?/i);

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
    const valveTypeMatch = text.match(/(sapien\s*(?:3|iii|ultra)|evolut\s+(?:r|pro|fx)|acurate\s+(?:neo|neo2))/i);
    const valveSizeMatch =
      text.match(/(\d+)\s*mm\s+(?:sapien|evolut|acurate|navitor|valve)\b/i) ||
      text.match(/planned\s+valve\s+(\d+)\s*mm/i);
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

  private getNestedField(obj: any, path: string): unknown {
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
      if (current == null || typeof current !== 'object' || !(key in current)) {
        return undefined;
      }
      current = current[key];
    }
    return current;
  }

  private isMissingNestedField(obj: any, path: string): boolean {
    const value = this.getNestedField(obj, path);
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (typeof value === 'number') return Number.isNaN(value);
    return false;
  }

  /**
   * Extract key facts from TAVI data for proof mode verification
   * Returns array of critical facts that must be verified before report generation
   */
  extractKeyFacts(extracted: TAVIExtractedData): import('@/types/medical.types').KeyFact[] {
    const facts: import('@/types/medical.types').KeyFact[] = [];
    let factId = 1;

    // Category 1: Valve Sizing (CRITICAL for prosthesis selection)
    if (extracted.valveSizing?.annulusDiameter) {
      facts.push({
        id: String(factId++),
        category: 'Valve Sizing',
        label: 'Annulus Diameter',
        value: `${extracted.valveSizing.annulusDiameter} mm`,
        sourceField: 'valveSizing.annulusDiameter',
        critical: true,
        confidence: 0.95,
        status: 'pending'
      });
    }

    if (extracted.valveSizing?.annulusPerimeter) {
      facts.push({
        id: String(factId++),
        category: 'Valve Sizing',
        label: 'Annulus Perimeter',
        value: `${extracted.valveSizing.annulusPerimeter} mm`,
        sourceField: 'valveSizing.annulusPerimeter',
        critical: true,
        confidence: 0.95,
        status: 'pending'
      });
    }

    if (extracted.valveSizing?.annulusArea) {
      facts.push({
        id: String(factId++),
        category: 'Valve Sizing',
        label: 'Annulus Area',
        value: `${extracted.valveSizing.annulusArea} mm²`,
        sourceField: 'valveSizing.annulusArea',
        critical: true,
        confidence: 0.95,
        status: 'pending'
      });
    }

    // Category 2: Coronary Heights (CRITICAL for safety - coronary occlusion risk)
    if (extracted.coronaryHeights?.leftCoronary) {
      facts.push({
        id: String(factId++),
        category: 'Coronary Heights',
        label: 'Left Coronary Height',
        value: `${extracted.coronaryHeights.leftCoronary} mm`,
        sourceField: 'coronaryHeights.leftCoronary',
        critical: true,
        confidence: 0.95,
        status: 'pending'
      });
    }

    if (extracted.coronaryHeights?.rightCoronary) {
      facts.push({
        id: String(factId++),
        category: 'Coronary Heights',
        label: 'Right Coronary Height',
        value: `${extracted.coronaryHeights.rightCoronary} mm`,
        sourceField: 'coronaryHeights.rightCoronary',
        critical: true,
        confidence: 0.95,
        status: 'pending'
      });
    }

    // Category 3: Access Assessment
    if (extracted.accessAssessment?.site) {
      facts.push({
        id: String(factId++),
        category: 'Access Assessment',
        label: 'Access Site',
        value: extracted.accessAssessment.site,
        sourceField: 'accessAssessment.site',
        critical: false,
        confidence: 0.90,
        status: 'pending'
      });
    }

    if (extracted.accessAssessment?.iliofemoralDimensions) {
      facts.push({
        id: String(factId++),
        category: 'Access Assessment',
        label: 'Iliofemoral Dimensions',
        value: extracted.accessAssessment.iliofemoralDimensions,
        sourceField: 'accessAssessment.iliofemoralDimensions',
        critical: false,
        confidence: 0.85,
        status: 'pending'
      });
    }

    // Category 4: Aortic Valve Assessment
    if (extracted.aorticValve?.peakGradient) {
      facts.push({
        id: String(factId++),
        category: 'Aortic Valve',
        label: 'Peak Gradient',
        value: `${extracted.aorticValve.peakGradient} mmHg`,
        sourceField: 'aorticValve.peakGradient',
        critical: false,
        confidence: 0.90,
        status: 'pending'
      });
    }

    if (extracted.aorticValve?.meanGradient) {
      facts.push({
        id: String(factId++),
        category: 'Aortic Valve',
        label: 'Mean Gradient',
        value: `${extracted.aorticValve.meanGradient} mmHg`,
        sourceField: 'aorticValve.meanGradient',
        critical: false,
        confidence: 0.90,
        status: 'pending'
      });
    }

    if (extracted.aorticValve?.avArea) {
      facts.push({
        id: String(factId++),
        category: 'Aortic Valve',
        label: 'AV Area',
        value: `${extracted.aorticValve.avArea} cm²`,
        sourceField: 'aorticValve.avArea',
        critical: false,
        confidence: 0.90,
        status: 'pending'
      });
    }

    // Category 5: LV Assessment
    if (extracted.lvAssessment?.ef) {
      facts.push({
        id: String(factId++),
        category: 'LV Assessment',
        label: 'Ejection Fraction',
        value: `${extracted.lvAssessment.ef}%`,
        sourceField: 'lvAssessment.ef',
        critical: false,
        confidence: 0.90,
        status: 'pending'
      });
    }

    if (extracted.lvAssessment?.lvidd) {
      facts.push({
        id: String(factId++),
        category: 'LV Assessment',
        label: 'LVIDD',
        value: `${extracted.lvAssessment.lvidd} mm`,
        sourceField: 'lvAssessment.lvidd',
        critical: false,
        confidence: 0.85,
        status: 'pending'
      });
    }

    if (extracted.lvAssessment?.lvids) {
      facts.push({
        id: String(factId++),
        category: 'LV Assessment',
        label: 'LVIDS',
        value: `${extracted.lvAssessment.lvids} mm`,
        sourceField: 'lvAssessment.lvids',
        critical: false,
        confidence: 0.85,
        status: 'pending'
      });
    }

    // Category 6: Procedure Details
    if (extracted.procedureDetails?.valveType) {
      facts.push({
        id: String(factId++),
        category: 'Procedure Details',
        label: 'Valve Type',
        value: extracted.procedureDetails.valveType,
        sourceField: 'procedureDetails.valveType',
        critical: true,
        confidence: 0.95,
        status: 'pending'
      });
    }

    if (extracted.procedureDetails?.valveSize) {
      facts.push({
        id: String(factId++),
        category: 'Procedure Details',
        label: 'Valve Size',
        value: `${extracted.procedureDetails.valveSize} mm`,
        sourceField: 'procedureDetails.valveSize',
        critical: true,
        confidence: 0.95,
        status: 'pending'
      });
    }

    if (extracted.procedureDetails?.deploymentDepth) {
      facts.push({
        id: String(factId++),
        category: 'Procedure Details',
        label: 'Deployment Depth',
        value: `${extracted.procedureDetails.deploymentDepth} mm`,
        sourceField: 'procedureDetails.deploymentDepth',
        critical: false,
        confidence: 0.85,
        status: 'pending'
      });
    }

    console.log(`[TAVIWorkupAgent] Extracted ${facts.length} key facts for proof mode`);
    return facts;
  }

  /**
   * Apply user-confirmed facts back to extracted data
   * (Phase 3: Fact Locking Enforcement)
   */
  private applyLockedFacts(
    lockedFacts: Record<string, string>,
    extracted: TAVIExtractedData
  ): void {
    console.log('[TAVIWorkupAgent] Applying locked facts to extracted data...');

    Object.entries(lockedFacts).forEach(([sourceField, value]) => {
      console.log(`  Locking: ${sourceField} = "${value}"`);

      // Parse nested field paths and apply values
      const parts = sourceField.split('.');

      if (parts.length === 2) {
        const [category, field] = parts;

        // Ensure category object exists
        if (!extracted[category as keyof TAVIExtractedData]) {
          (extracted as any)[category] = {};
        }

        // Parse numeric values for measurement fields
        const numericFields = [
          'annulusDiameter', 'annulusPerimeter', 'annulusArea',
          'leftCoronary', 'rightCoronary',
          'peakGradient', 'meanGradient', 'avArea',
          'ef', 'lvidd', 'lvids',
          'valveSize', 'deploymentDepth'
        ];

        if (numericFields.includes(field)) {
          // Extract numeric value from string like "25 mm" or "65%"
          const match = value.match(/(\d+(?:\.\d+)?)/);
          if (match) {
            (extracted as any)[category][field] = parseFloat(match[1]);
          }
        } else {
          // String field (accessSite, iliofemoralDimensions, valveType)
          (extracted as any)[category][field] = value;
        }
      }
    });

    console.log('[TAVIWorkupAgent] Locked facts applied successfully');
  }
}
