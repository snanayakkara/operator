import { MedicalAgent } from '@/agents/base/MedicalAgent';
import type { 
  MedicalContext, 
  ChatMessage, 
  ReportSection, 
  MedicalReport,
  MedicalCode
} from '@/types/medical.types';
import { systemPromptLoader } from '@/services/SystemPromptLoader';
import { ANGIOGRAM_PCI_SYSTEM_PROMPTS, ANGIOGRAM_PCI_MEDICAL_KNOWLEDGE } from './AngiogramPCISystemPrompts';
import { LMStudioService, MODEL_CONFIG } from '@/services/LMStudioService';

type ProcedureType = 'DIAGNOSTIC_ANGIOGRAM' | 'PCI_INTERVENTION' | 'COMBINED';

/**
 * Unified agent for cardiac catheterization procedures including diagnostic angiography and PCI.
 * Intelligently detects procedure type from dictation and adapts report format accordingly.
 * Supports: Diagnostic-only angiograms, PCI interventions, and combined procedures.
 */
export class AngiogramPCIAgent extends MedicalAgent {
  private lmStudioService: LMStudioService;
  private systemPromptInitialized = false;
  
  // Combined medical knowledge from both specialties
  private readonly vesselSegments = ANGIOGRAM_PCI_MEDICAL_KNOWLEDGE.coronarySegments;
  private readonly stenosisGrading = ANGIOGRAM_PCI_MEDICAL_KNOWLEDGE.stenosisGrading;
  private readonly timiFlow = ANGIOGRAM_PCI_MEDICAL_KNOWLEDGE.timiFlow;
  private readonly stentTypes = ANGIOGRAM_PCI_MEDICAL_KNOWLEDGE.stentTypes;
  private readonly stentManufacturers = ANGIOGRAM_PCI_MEDICAL_KNOWLEDGE.stentManufacturers;
  private readonly interventionTypes = ANGIOGRAM_PCI_MEDICAL_KNOWLEDGE.interventionTypes;
  private readonly accessSites = ANGIOGRAM_PCI_MEDICAL_KNOWLEDGE.accessSites;
  private readonly complications = ANGIOGRAM_PCI_MEDICAL_KNOWLEDGE.complications;
  private readonly hemodynamicNormals = ANGIOGRAM_PCI_MEDICAL_KNOWLEDGE.hemodynamicNormals;
  private readonly terminologyCorrections = ANGIOGRAM_PCI_MEDICAL_KNOWLEDGE.terminologyCorrections;
  private readonly criticalFindings = ANGIOGRAM_PCI_MEDICAL_KNOWLEDGE.criticalFindings;

  constructor() {
    super(
      'Angiogram/PCI Agent',
      'Interventional Cardiology',
      'Unified agent for cardiac catheterization: diagnostic angiography, PCI interventions, and combined procedures',
      'angiogram-pci',
      '' // Will be loaded dynamically
    );
    this.lmStudioService = LMStudioService.getInstance();
  }

  private async initializeSystemPrompt(): Promise<void> {
    if (this.systemPromptInitialized) return;

    try {
      this.systemPrompt = await systemPromptLoader.loadSystemPrompt('angiogram-pci', 'primary');
      this.systemPromptInitialized = true;
    } catch (error) {
      console.error('❌ AngiogramPCIAgent: Failed to load system prompt:', error);
      this.systemPrompt = 'You are a specialist interventional cardiologist generating comprehensive angiogram and PCI procedural reports.'; // Fallback
    }
  }

  async process(input: string, context?: MedicalContext): Promise<MedicalReport> {
    await this.initializeSystemPrompt();

    const startTime = Date.now();
    
    try {
      // Store input in memory
      this.updateMemory('currentInput', input);
      this.updateMemory('processingContext', context);

      // Detect procedure type from dictation
      const procedureType = await this.detectProcedureType(input);
      console.log(`🔍 Detected procedure type: ${procedureType}`);
      
      // Store procedure type in memory for use in other methods
      this.updateMemory('detectedProcedureType', procedureType);

      // Correct terminology
      const correctedInput = this.correctTerminology(input);

      // Detect critical findings that must be preserved
      const criticalFindingsDetected = this.detectCriticalFindings(correctedInput);
      if (criticalFindingsDetected.length > 0) {
        console.log(`🔴 Critical findings detected: ${criticalFindingsDetected.join(', ')}`);
        this.updateMemory('criticalFindings', criticalFindingsDetected);
      }

      // Extract relevant data based on procedure type
      const procedureData = this.extractProcedureData(correctedInput, procedureType);

      // Detect missing information
      const missingInfo = await this.detectMissingInformation(correctedInput, procedureType);

      // Generate structured report content based on procedure type
      const reportContent = await this.generateStructuredReport(correctedInput, procedureData, procedureType);

      // Validate dominance before normalization
      const dominanceValidation = this.validateDominance(correctedInput, reportContent);
      if (dominanceValidation.hasContradiction) {
        console.warn(`⚠️ Dominance mismatch: input="${dominanceValidation.dictatedDominance}", output="${dominanceValidation.reportedDominance}"`);
      }

      const normalizedReportContent = this.normalizeReportContent(reportContent, procedureData, procedureType);

      // Parse response into sections
      const sections = this.parseResponse(normalizedReportContent, context);

      // Create comprehensive report
      const processingTime = Date.now() - startTime;
      const report = this.createReport(
        normalizedReportContent, 
        sections, 
        context, 
        processingTime, 
        0.95
      );

      // Add missing information warnings to metadata
      if (missingInfo) {
        report.metadata.missingInformation = missingInfo;
      }

      // Add patient summary if present
      const patientSummary = this.getMemory().shortTerm['patientSummary'];
      if (patientSummary) {
        report.metadata.patientSummary = patientSummary;
      }

      // Add medical codes based on procedure type
      report.metadata.medicalCodes = this.generateMedicalCodes(procedureData, procedureType);

      // Store procedure in memory
      this.addProcedureMemory(
        procedureType === 'DIAGNOSTIC_ANGIOGRAM' ? 'Angiogram' : 'PCI', 
        {
          procedureType,
          indication: procedureData.indication,
          findings: procedureData.vesselFindings,
          intervention: 'interventionDetails' in procedureData ? procedureData.interventionDetails : undefined,
          outcome: procedureData.proceduralOutcome
        }, 
        procedureData.proceduralOutcome
      );

      return report;

    } catch (error) {
      console.error('AngiogramPCI processing error:', error);
      
      // Return fallback report
      const processingTime = Date.now() - startTime;
      return this.createReport(
        `Cardiac catheterization processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [],
        context,
        processingTime,
        0.1
      );
    }
  }

  /**
   * Intelligently detect procedure type from dictation content
   */
  private async detectProcedureType(input: string): Promise<ProcedureType> {
    try {
      const detectionPrompt = `${ANGIOGRAM_PCI_SYSTEM_PROMPTS.procedureDetection}

DICTATION TO ANALYZE:
${input}`;

      const response = await this.lmStudioService.processWithAgent(detectionPrompt, input);
      const cleanResponse = response.trim().toUpperCase();
      
      if (cleanResponse.includes('DIAGNOSTIC_ANGIOGRAM')) {
        return 'DIAGNOSTIC_ANGIOGRAM';
      } else if (cleanResponse.includes('PCI_INTERVENTION')) {
        return 'PCI_INTERVENTION'; 
      } else if (cleanResponse.includes('COMBINED')) {
        return 'COMBINED';
      }
      
      // Fallback detection based on keywords
      return this.fallbackProcedureDetection(input);
      
    } catch (error) {
      console.error('❌ Error in procedure type detection:', error);
      return this.fallbackProcedureDetection(input);
    }
  }

  /**
   * Fallback procedure detection using keyword analysis
   */
  private fallbackProcedureDetection(input: string): ProcedureType {
    const text = input.toLowerCase();
    
    // Check for intervention keywords
    const interventionKeywords = [
      'stent', 'ptca', 'balloon', 'angioplasty', 'intervention',
      'deployed', 'implanted', 'inflated', 'device', 'wire'
    ];
    
    const diagnosticKeywords = [
      'findings', 'assessment', 'stenosis', 'vessel', 'artery',
      'coronary', 'catheterization', 'angiography'
    ];
    
    const hasIntervention = interventionKeywords.some(keyword => text.includes(keyword));
    const hasDiagnostic = diagnosticKeywords.some(keyword => text.includes(keyword));
    
    if (hasIntervention && hasDiagnostic) {
      return 'COMBINED';
    } else if (hasIntervention) {
      return 'PCI_INTERVENTION';
    } else {
      return 'DIAGNOSTIC_ANGIOGRAM';
    }
  }

  protected async buildMessages(input: string, _context?: MedicalContext): Promise<ChatMessage[]> {
    await this.initializeSystemPrompt();

    // Detect procedure type if not already stored in memory
    const procedureType: ProcedureType = this.getMemory().shortTerm['detectedProcedureType'] || 'DIAGNOSTIC_ANGIOGRAM';

    const userPrompt = `Generate a ${procedureType.toLowerCase().replace('_', ' ')} report using the appropriate format.

Dictation to process:
${input}

Use the clinician's exact terminology as provided. Include all relevant details while maintaining clinical accuracy and proper medical terminology.`;

    return [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: userPrompt }
    ];
  }

  protected parseResponse(response: string, _context?: MedicalContext): ReportSection[] {
    // Get procedure type from memory
    const procedureType: ProcedureType = this.getMemory().shortTerm['detectedProcedureType'] || 'DIAGNOSTIC_ANGIOGRAM';

    // Extract sections from content
    const extractedSections = this.extractSectionsFromContent(response);

    // Check for PATIENT SUMMARY and store in metadata if present
    const patientSummary = extractedSections['PATIENT SUMMARY'];
    if (patientSummary && patientSummary.trim()) {
      // Store in memory to be picked up by report creation
      this.updateMemory('patientSummary', patientSummary.trim());
    }

    // Build sections in canonical order: CONCLUSION → PREAMBLE → PROCEDURE → FINDINGS
    const sections: ReportSection[] = [];
    const sectionOrder = ['CONCLUSION', 'PREAMBLE', 'PROCEDURE', 'FINDINGS'];

    for (const sectionName of sectionOrder) {
      const content = extractedSections[sectionName];
      if (content && content.trim()) {
        sections.push({
          title: sectionName,
          content: content.trim(),
          type: 'structured',
          priority: this.getSectionPriority(sectionName, procedureType)
        });
      }
    }

    // Fallback if no sections were found
    if (sections.length === 0) {
      const defaultTitle = procedureType === 'DIAGNOSTIC_ANGIOGRAM'
        ? 'Angiogram Report'
        : 'Cardiac Catheterization Report';
      sections.push({
        title: defaultTitle,
        content: response.trim(),
        type: 'structured',
        priority: 'high'
      });
    }

    return sections;
  }

  private correctTerminology(text: string): string {
    let correctedText = text;
    
    for (const [incorrect, correct] of Object.entries(this.terminologyCorrections)) {
      const regex = new RegExp(incorrect, 'gi');
      correctedText = correctedText.replace(regex, correct);
    }

    return correctedText;
  }

  private extractProcedureData(input: string, procedureType: ProcedureType) {
    const baseData = {
      indication: this.extractIndication(input),
      accessSite: this.extractAccessSite(input),
      vesselFindings: this.extractVesselFindings(input),
      hemodynamics: this.extractHemodynamics(input),
      complications: this.extractComplications(input),
      proceduralOutcome: this.extractProceduralOutcome(input),
      contrastVolume: this.extractContrastVolume(input),
      fluoroscopyTime: this.extractFluoroscopyTime(input)
    };

    if (procedureType === 'PCI_INTERVENTION' || procedureType === 'COMBINED') {
      return {
        ...baseData,
        interventionDetails: {
          targetVessel: this.extractTargetVessel(input),
          lesionCharacteristics: this.extractLesionCharacteristics(input),
          interventionType: this.extractInterventionType(input),
          stentDetails: this.extractStentDetails(input),
          angiographicResult: this.extractAngiographicResult(input),
          medications: this.extractMedications(input)
        }
      };
    }

    return baseData;
  }

  private async generateStructuredReport(
    input: string,
    procedureData: any,
    procedureType: ProcedureType
  ): Promise<string> {
    console.log(`🏥 Generating ${procedureType} report with LMStudio ${MODEL_CONFIG.REASONING_MODEL}...`);

    try {
      const report = await this.lmStudioService.processWithAgent(this.systemPrompt, input);

      console.log('✅ Report generated successfully');
      console.log('📄 Report length:', report.length, 'characters');

      return report;

    } catch (error) {
      console.error('❌ Error generating report:', error);

      // Fallback to basic structured format
      return this.generateFallbackReport(input, procedureData, procedureType);
    }
  }

  private normalizeReportContent(
    reportContent: string,
    procedureData: any,
    procedureType: ProcedureType
  ): string {
    if (!reportContent || !reportContent.trim()) {
      return this.generateFallbackReport(reportContent, procedureData, procedureType);
    }

    const sections = this.extractSectionsFromContent(reportContent);

    // Extract all four sections (no merging)
    let conclusion = (sections['CONCLUSION'] || '').trim();
    let preamble = (sections['PREAMBLE'] || '').trim();
    let procedure = (sections['PROCEDURE'] || '').trim();
    let findings = (sections['FINDINGS'] || '').trim();

    // If all four headings exist but content is missing, try fallbacks
    if (!conclusion) {
      conclusion = this.buildFallbackConclusion(procedureData, procedureType);
    }
    if (!preamble) {
      preamble = this.generateFallbackPreamble(procedureData);
    }
    if (!procedure && (procedureType === 'PCI_INTERVENTION' || procedureType === 'COMBINED')) {
      procedure = 'Procedure details not specified in dictation.';
    }
    if (!findings) {
      findings = this.normalizeFindingsSection('', procedureData);
    } else {
      findings = this.normalizeFindingsSection(findings, procedureData);
    }

    const conciseConclusion = this.limitConclusionLength(conclusion);

    // Build sections in canonical order: CONCLUSION → PREAMBLE → PROCEDURE → FINDINGS
    const formattedSections = [
      { title: 'CONCLUSION', content: conciseConclusion.trim() },
      { title: 'PREAMBLE', content: preamble.trim() },
      { title: 'PROCEDURE', content: procedure.trim() },
      { title: 'FINDINGS', content: findings.trim() }
    ].filter(section => section.content.length > 0);

    return formattedSections
      .map(section => `**${section.title}**\n${section.content}`)
      .join('\n\n');
  }

  private extractSectionsFromContent(content: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const lines = content.split('\n');
    const knownHeaders = new Set([
      'CONCLUSION',
      'PREAMBLE',
      'PROCEDURE',
      'FINDINGS',
      'PATIENT SUMMARY'
    ]);

    let currentHeader: string | null = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Normalize: strip **, trailing :, trim, uppercase
      const normalized = line.replace(/\*\*/g, '').replace(/:$/, '').trim().toUpperCase();

      if (knownHeaders.has(normalized)) {
        currentHeader = normalized;
        if (!sections[currentHeader]) {
          sections[currentHeader] = '';
        }
        continue;
      }

      if (currentHeader) {
        sections[currentHeader] += (sections[currentHeader] ? '\n' : '') + rawLine.trimEnd();
      }
    }

    return sections;
  }

  private normalizeFindingsSection(findingsContent: string, procedureData: any): string {
    const baseContent = findingsContent || '';
    let workingContent = baseContent;

    // Check if critical findings from input are present in findings content
    const criticalFindingsFromInput = this.getMemory().shortTerm['criticalFindings'] || [];
    if (criticalFindingsFromInput.length > 0) {
      const findingsLower = workingContent.toLowerCase();
      const missingCriticalFindings = criticalFindingsFromInput.filter(
        (finding: string) => !findingsLower.includes(finding.toLowerCase())
      );

      if (missingCriticalFindings.length > 0) {
        console.warn(`⚠️ Critical findings missing from FINDINGS section: ${missingCriticalFindings.join(', ')}`);
      }
    }

    let coronaryAnatomy = '';
    const coronaryMatch = workingContent.match(/coronary anatomy[:\s-]*([^\n]+)/i);
    if (coronaryMatch) {
      coronaryAnatomy = coronaryMatch[1].trim();
      workingContent = workingContent.replace(coronaryMatch[0], '');
    }

    const keywordGroups: Record<string, string[]> = {
      lm: ['left main', ' lm ', '(lm)', 'lm '],
      lad: ['left anterior descending', ' lad ', '(lad)', 'lad '],
      lcx: ['left circumflex', 'lcx', '(lcx)'],
      rca: ['right coronary artery', 'rca', '(rca)'],
      lv: ['left ventricle', 'lvedp', 'lv '],
    };

    const { matches, remainder } = this.extractSentencesByKeywords(workingContent, keywordGroups);

    const vesselSections = [
      {
        key: 'lm',
        heading: '**LM (left main)**',
        fallback: this.describeLMFindings(procedureData)
      },
      {
        key: 'lad',
        heading: '**LAD (left anterior descending)**',
        fallback: this.describeLADFindings(procedureData)
      },
      {
        key: 'lcx',
        heading: '**LCx (left circumflex)**',
        fallback: this.describeLCxFindings(procedureData)
      },
      {
        key: 'rca',
        heading: '**RCA (right coronary artery)**',
        fallback: this.describeRCAFindings(procedureData)
      }
    ];

    const sectionBlocks: string[] = [];

    if (coronaryAnatomy) {
      sectionBlocks.push(`Coronary Anatomy\n${coronaryAnatomy}`);
    }

    for (const section of vesselSections) {
      const sentences = matches[section.key];
      const content = sentences && sentences.length > 0
        ? sentences.join(' ')
        : section.fallback;

      sectionBlocks.push(`${section.heading}\n${content.trim()}`);
    }

    const lvSentences = matches['lv'];
    if (lvSentences && lvSentences.length > 0) {
      sectionBlocks.push(`Left Ventricle\n${lvSentences.join(' ').trim()}`);
    }

    const additionalNotes = remainder
      .filter(sentence => sentence && sentence.trim().length > 0)
      .join(' ')
      .trim();

    if (additionalNotes) {
      sectionBlocks.push(`Additional Notes\n${additionalNotes}`);
    }

    return sectionBlocks.join('\n\n').trim();
  }

  private extractSentencesByKeywords(
    content: string,
    keywordGroups: Record<string, string[]>
  ): { matches: Record<string, string[]>; remainder: string[] } {
    const sentences = content
      .split(/(?<=[.!?])\s+/)
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 0);

    const matches: Record<string, string[]> = {};
    const remainder: string[] = [];

    for (const sentence of sentences) {
      const normalizedSentence = ` ${sentence.toLowerCase()} `;
      let matchedKey: string | null = null;

      for (const [key, keywords] of Object.entries(keywordGroups)) {
        if (keywords.some(keyword => normalizedSentence.includes(keyword))) {
          matchedKey = key;
          break;
        }
      }

      if (matchedKey) {
        if (!matches[matchedKey]) {
          matches[matchedKey] = [];
        }
        matches[matchedKey].push(sentence.trim());
      } else {
        remainder.push(sentence.trim());
      }
    }

    return { matches, remainder };
  }

  private generateFallbackPreamble(procedureData: any): string {
    // Use neutral language when indication is not explicitly provided
    // Do not fabricate clinical context like symptoms or test results
    const indication = procedureData.indication && procedureData.indication !== 'coronary assessment'
      ? procedureData.indication
      : 'coronary assessment';

    return `Cardiac catheterisation performed for ${indication}.`;
  }

  private buildFallbackConclusion(procedureData: any, procedureType: ProcedureType): string {
    const outcome = procedureData.proceduralOutcome || 'Procedure completed without complication';

    if (procedureType === 'PCI_INTERVENTION' || procedureType === 'COMBINED') {
      return `${outcome}. Continue guideline-directed medical therapy and dual antiplatelet therapy per protocol.`;
    }

    return `${outcome}. Optimise medical management and correlate with clinical presentation.`;
  }

  private limitConclusionLength(conclusion: string): string {
    const cleaned = conclusion.replace(/\s+/g, ' ').trim();
    if (!cleaned) return '';

    const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
    const trimmedSentences = sentences.slice(0, 3);
    let candidate = trimmedSentences.join(' ').trim();

    const words = candidate.split(/\s+/);
    if (words.length > 35) {
      candidate = words.slice(0, 35).join(' ').replace(/[.,;:]?$/, '') + '.';
    }

    if (!/[.!?]$/.test(candidate)) {
      candidate += '.';
    }

    return candidate;
  }

  private generateFallbackReport(_input: string, procedureData: any, procedureType: ProcedureType): string {
    const pciPerformed = procedureType === 'PCI_INTERVENTION' || procedureType === 'COMBINED';

    // CONCLUSION first
    const conclusion = pciPerformed
      ? `${procedureData.proceduralOutcome || 'PCI completed.'} Post-procedural plan: [Not specified].`
      : `${procedureData.proceduralOutcome || 'Coronary angiography completed.'} Clinical correlation recommended.`;

    // PREAMBLE - patient context and indication
    const preamble = `Cardiac catheterisation performed for ${procedureData.indication || 'coronary assessment'}.`;

    // PROCEDURE - technique details
    const procedureDetails = [
      procedureData.accessSite || '[Access details not specified]',
      procedureData.contrastVolume ? `Contrast: ${procedureData.contrastVolume}` : null,
      procedureData.fluoroscopyTime ? `Fluoroscopy: ${procedureData.fluoroscopyTime}` : null,
      pciPerformed ? `\nPCI Details:\n- Target lesion/vessel: ${procedureData.interventionDetails?.targetVessel || '[Not specified]'}\n- Lesion characteristics: ${procedureData.interventionDetails?.lesionCharacteristics || '[Not specified]'}\n- Strategy: ${procedureData.interventionDetails?.interventionType || '[Not specified]'}\n- Devices: ${procedureData.interventionDetails?.stentDetails || '[Not specified]'}\n- Result: ${procedureData.interventionDetails?.angiographicResult || '[Not specified]'}\n- Intra-procedural meds: ${procedureData.interventionDetails?.medications || '[Not specified]'}` : null,
      `Complications: ${procedureData.complications.length > 0 ? procedureData.complications.join(', ') : 'None'}`
    ].filter(Boolean).join('. ');

    // FINDINGS - coronary anatomy
    const findings = `Coronary anatomy and dominance: [Not specified in dictation]

**LM (left main)**
${this.describeLMFindings(procedureData) || '[Not specified in dictation]'}

**LAD (left anterior descending)**
${this.describeLADFindings(procedureData) || '[Not specified in dictation]'}

**LCx (left circumflex)**
${this.describeLCxFindings(procedureData) || '[Not specified in dictation]'}

**RCA (right coronary artery)**
${this.describeRCAFindings(procedureData) || '[Not specified in dictation]'}

Left ventricle/valves/hemodynamics: ${procedureData.hemodynamics || '[Not specified in dictation]'}`;

    return `**CONCLUSION**
${conclusion}

**PREAMBLE**
${preamble}

**PROCEDURE**
${procedureDetails}

**FINDINGS**
${findings}

Note: This report was generated with limited AI processing due to technical issues.`;
  }

  private async detectMissingInformation(input: string, procedureType: ProcedureType): Promise<any> {
    try {
      const missingInfoPrompt = `${ANGIOGRAM_PCI_SYSTEM_PROMPTS.missingInfoDetection}

DICTATION TO ANALYZE:
${input}`;

      const response = await this.lmStudioService.processWithAgent(missingInfoPrompt, input);

      try {
        const missingInfo = JSON.parse(response.replace(/```json|```/g, '').trim());

        // Ensure completeness_score is an integer (not a string like "75%")
        if (typeof missingInfo.completeness_score === 'string') {
          missingInfo.completeness_score = parseInt(missingInfo.completeness_score.replace('%', ''), 10);
        }

        return missingInfo;
      } catch (parseError) {
        return this.fallbackMissingInfoDetection(input, procedureType);
      }

    } catch (error) {
      console.error('❌ Error detecting missing information:', error);
      return this.fallbackMissingInfoDetection(input, procedureType);
    }
  }

  private fallbackMissingInfoDetection(input: string, procedureType: ProcedureType): any {
    const text = input.toLowerCase();
    const missing = {
      procedure_type: procedureType,
      missing_preamble: [] as string[],
      missing_procedure: [] as string[],
      missing_diagnostic: [] as string[],
      missing_intervention: [] as string[],
      ask_for: [] as string[],
      completeness_score: 75
    };

    // Check preamble elements
    if (!text.includes('indication') && !text.includes('reason') && !text.includes('referred')) {
      missing.missing_preamble.push('Indication or symptoms prompting angiography');
      missing.ask_for.push('What was the clinical indication for this procedure?');
    }

    // Check procedure elements
    if (!text.includes('radial') && !text.includes('femoral') && !text.includes('access')) {
      missing.missing_procedure.push('Access site');
      missing.ask_for.push('Which access site was used?');
    }
    if (!text.includes('contrast') && !text.includes('ml')) {
      missing.missing_procedure.push('Contrast volume');
    }
    if (!text.includes('fluoroscopy') && !text.includes('fluoro')) {
      missing.missing_procedure.push('Fluoroscopy time');
    }

    // Check diagnostic elements
    if (!text.includes('left main') && !text.includes('lm ')) {
      missing.missing_diagnostic.push('Left Main coronary artery findings');
      missing.ask_for.push('What were the Left Main findings?');
    }
    if (!text.includes('lad') && !text.includes('left anterior descending')) {
      missing.missing_diagnostic.push('Left Anterior Descending artery findings');
      missing.ask_for.push('What were the LAD findings?');
    }
    if (!text.includes('lcx') && !text.includes('circumflex')) {
      missing.missing_diagnostic.push('Left Circumflex artery findings');
    }
    if (!text.includes('rca') && !text.includes('right coronary')) {
      missing.missing_diagnostic.push('Right Coronary Artery findings');
    }

    // Check intervention elements if applicable
    if (procedureType === 'PCI_INTERVENTION' || procedureType === 'COMBINED') {
      if (!text.includes('stent') && !text.includes('balloon')) {
        missing.missing_intervention.push('Device specifications');
        missing.ask_for.push('What devices were used in the intervention?');
      }
      if (!text.includes('timi')) {
        missing.missing_intervention.push('TIMI flow assessment');
        missing.ask_for.push('What was the final TIMI flow?');
      }
      if (!text.includes('complications') && !text.includes('complication')) {
        missing.missing_intervention.push('Complications status');
      }
    }

    // Calculate completeness score based on missing items
    const totalPossibleItems =
      2 + // preamble (indication + prior revascularisation)
      4 + // procedure (access, catheters, meds, contrast/fluoro, closure, complications)
      5 + // diagnostic (dominance, LM, LAD, LCx, RCA)
      (procedureType !== 'DIAGNOSTIC_ANGIOGRAM' ? 4 : 0); // intervention (target, devices, adjuncts, outcomes)

    const missingItemsCount =
      missing.missing_preamble.length +
      missing.missing_procedure.length +
      missing.missing_diagnostic.length +
      missing.missing_intervention.length;

    missing.completeness_score = Math.max(0, Math.round(100 - (missingItemsCount / totalPossibleItems) * 100));

    return missing;
  }

  private generateMedicalCodes(procedureData: any, procedureType: ProcedureType): MedicalCode[] {
    const codes: MedicalCode[] = [];

    if (procedureType === 'DIAGNOSTIC_ANGIOGRAM') {
      codes.push({
        system: 'CPT',
        code: '93458',
        description: 'Catheter placement in coronary arteries for coronary angiography'
      });
    } else {
      codes.push({
        system: 'CPT',
        code: '92928',
        description: 'Percutaneous transcatheter placement of intracoronary stent(s)'
      });
    }

    // Add diagnosis codes based on findings
    if (procedureData.proceduralOutcome?.includes('normal')) {
      codes.push({
        system: 'ICD-10',
        code: 'Z87.891',
        description: 'Personal history of cardiac catheterization'
      });
    } else {
      codes.push({
        system: 'ICD-10',
        code: 'I25.10',
        description: 'Atherosclerotic heart disease of native coronary artery without angina pectoris'
      });
    }

    return codes;
  }

  // Helper methods for data extraction (simplified versions combining both agent approaches)
  private extractIndication(input: string): string {
    const indicationPatterns = [
      /indication[:\s]+([^.]+)/i,
      /referred\s+for\s+([^.]+)/i,
      /(?:chest pain|angina|dyspnoea|shortness of breath|stemi|nstemi)/i
    ];
    
    for (const pattern of indicationPatterns) {
      const match = input.match(pattern);
      if (match) return match[1]?.trim() || match[0];
    }
    
    return 'Coronary artery assessment';
  }

  private extractAccessSite(input: string): string {
    const text = input.toLowerCase();
    
    for (const [key, description] of Object.entries(this.accessSites)) {
      if (text.includes(key.replace('_', ' '))) {
        return description;
      }
    }
    
    return 'Radial artery access';
  }

  private extractVesselFindings(input: string): Record<string, string> {
    const findings: Record<string, string> = {};
    const vessels = ['lm', 'lad', 'lcx', 'rca'];
    
    for (const vessel of vessels) {
      const vesselPattern = new RegExp(`${vessel}[\\s:]+([^.]+)`, 'i');
      const match = input.match(vesselPattern);
      if (match) {
        findings[vessel] = match[1].trim();
      }
    }
    
    return findings;
  }

  private extractHemodynamics(input: string): string {
    const measurements = [];
    
    const aorticMatch = input.match(/aortic[:\s]+(\d+)\/(\d+)\s*mmhg/i);
    if (aorticMatch) {
      measurements.push(`Aortic pressure ${aorticMatch[1]}/${aorticMatch[2]} mmHg`);
    }
    
    const lvedpMatch = input.match(/lvedp[:\s]+(\d+)\s*mmhg/i);
    if (lvedpMatch) {
      measurements.push(`LVEDP ${lvedpMatch[1]} mmHg`);
    }
    
    return measurements.length > 0 ? measurements.join(', ') : '[Hemodynamic parameters not specified]';
  }

  private extractComplications(input: string): string[] {
    const text = input.toLowerCase();
    const foundComplications = [];
    
    if (text.includes('hematoma')) foundComplications.push('Access site hematoma');
    if (text.includes('dissection')) foundComplications.push('Arterial dissection');
    if (text.includes('perforation')) foundComplications.push('Vessel perforation');
    if (text.includes('spasm')) foundComplications.push('Coronary spasm');
    
    return foundComplications;
  }

  private extractProceduralOutcome(input: string): string {
    const text = input.toLowerCase();
    
    if (text.includes('successful') || text.includes('completed without')) {
      return 'Procedure completed successfully';
    } else if (text.includes('complicated')) {
      return 'Procedure completed with complications as noted';
    }
    
    return 'Cardiac catheterization completed';
  }

  private extractContrastVolume(input: string): string {
    const match = input.match(/(\d+)\s*(?:ml|mls|cc)\s*(?:of\s*)?contrast/i);
    return match ? `${match[1]} mL contrast` : '';
  }

  private extractFluoroscopyTime(input: string): string {
    const match = input.match(/(?:fluoroscopy|fluoro)\s*(?:time[:\s]*)?(\d+)\s*(?:min|minutes)/i);
    return match ? `${match[1]} minutes fluoroscopy time` : '';
  }

  // PCI-specific extraction methods
  private extractTargetVessel(input: string): string {
    const text = input.toLowerCase();
    const vessels = Object.keys(this.vesselSegments);
    
    for (const vessel of vessels) {
      if (text.includes(vessel.toLowerCase()) && vessel in this.vesselSegments) {
        return this.vesselSegments[vessel as keyof typeof this.vesselSegments];
      }
    }
    
    return 'Coronary vessel';
  }

  private extractLesionCharacteristics(input: string): string {
    const characteristics = [];
    const text = input.toLowerCase();
    
    if (text.includes('severe')) characteristics.push('severe stenosis');
    if (text.includes('calcif')) characteristics.push('calcified');
    if (text.includes('total occlusion') || text.includes('cto')) characteristics.push('chronic total occlusion');
    
    const stenosisMatch = text.match(/(\d+)%?\s*stenosis/);
    if (stenosisMatch) {
      characteristics.push(`${stenosisMatch[1]}% stenosis`);
    }
    
    return characteristics.length > 0 ? characteristics.join(', ') : 'coronary stenosis';
  }

  private extractInterventionType(input: string): string {
    const text = input.toLowerCase();
    
    for (const [key, description] of Object.entries(this.interventionTypes)) {
      if (text.includes(key.toLowerCase())) {
        return description;
      }
    }
    
    return 'Percutaneous Coronary Intervention';
  }

  private extractStentDetails(input: string): string {
    const text = input.toLowerCase();
    const details = [];
    
    // Extract stent type
    for (const [key, type] of Object.entries(this.stentTypes)) {
      if (text.includes(key.toLowerCase())) {
        details.push(type);
        break;
      }
    }
    
    // Extract dimensions
    const sizeMatch = text.match(/(\d+\.?\d*)\s*(?:×|x|by)\s*(\d+)\s*mm/);
    if (sizeMatch) {
      details.push(`${sizeMatch[1]}×${sizeMatch[2]}mm`);
    }
    
    return details.length > 0 ? details.join(' ') : 'coronary stent';
  }

  private extractAngiographicResult(input: string): string {
    const text = input.toLowerCase();
    
    if (text.includes('timi 3') || text.includes('timi iii')) return 'TIMI III flow achieved';
    if (text.includes('timi 2') || text.includes('timi ii')) return 'TIMI II flow';
    if (text.includes('excellent') || text.includes('optimal')) return 'Excellent angiographic result';
    
    return 'Satisfactory angiographic result';
  }

  private extractMedications(input: string): string {
    const medications = [];
    const text = input.toLowerCase();
    
    if (text.includes('aspirin')) medications.push('Aspirin');
    if (text.includes('clopidogrel') || text.includes('plavix')) medications.push('Clopidogrel');
    if (text.includes('ticagrelor')) medications.push('Ticagrelor');
    if (text.includes('heparin')) medications.push('Heparin anticoagulation');
    
    return medications.length > 0 ? medications.join(', ') : '[Medications not specified]';
  }

  // Section parsing helpers
  private getSectionPriority(line: string, _procedureType: ProcedureType): 'high' | 'medium' | 'low' {
    const normalized = line.toUpperCase();

    // CONCLUSION and FINDINGS are high priority
    if (normalized === 'CONCLUSION' || normalized === 'FINDINGS') {
      return 'high';
    }

    // PREAMBLE and PROCEDURE are medium priority
    if (normalized === 'PREAMBLE' || normalized === 'PROCEDURE') {
      return 'medium';
    }

    return 'medium';
  }

  // Helper methods for vessel findings display
  private describeLMFindings(procedureData: any): string {
    return procedureData.vesselFindings?.lm || '[Left main findings not specified in dictation]';
  }

  private describeLADFindings(procedureData: any): string {
    return procedureData.vesselFindings?.lad || '[LAD findings not specified in dictation]';
  }

  private describeLCxFindings(procedureData: any): string {
    return procedureData.vesselFindings?.lcx || '[LCx findings not specified in dictation]';
  }

  private describeRCAFindings(procedureData: any): string {
    return procedureData.vesselFindings?.rca || '[RCA findings not specified in dictation]';
  }

  /**
   * Detect critical findings in the input that must be preserved in output
   */
  private detectCriticalFindings(input: string): string[] {
    const text = input.toLowerCase();
    const detected: string[] = [];

    for (const finding of this.criticalFindings) {
      if (text.includes(finding.toLowerCase())) {
        detected.push(finding);
      }
    }

    return detected;
  }

  /**
   * Validate dominance mentioned in dictation and check for contradictions in output
   */
  private validateDominance(input: string, reportContent: string): {
    dictatedDominance: 'right' | 'left' | 'codominant' | 'unspecified';
    reportedDominance: 'right' | 'left' | 'codominant' | 'unspecified';
    hasContradiction: boolean;
  } {
    const inputText = input.toLowerCase();
    const reportText = reportContent.toLowerCase();

    // Detect dominance from input dictation
    let dictatedDominance: 'right' | 'left' | 'codominant' | 'unspecified' = 'unspecified';
    if (inputText.includes('dominant rca') || inputText.includes('dominant right')) {
      dictatedDominance = 'right';
    } else if (inputText.includes('dominant lcx') || inputText.includes('dominant circumflex') || inputText.includes('dominant left')) {
      dictatedDominance = 'left';
    } else if (inputText.includes('codominant') || inputText.includes('co-dominant')) {
      dictatedDominance = 'codominant';
    }

    // Detect dominance from report output
    let reportedDominance: 'right' | 'left' | 'codominant' | 'unspecified' = 'unspecified';
    if (reportText.includes('right dominant') || reportText.includes('rca') && reportText.includes('dominant')) {
      reportedDominance = 'right';
    } else if (reportText.includes('left dominant') || reportText.includes('lcx') && reportText.includes('dominant')) {
      reportedDominance = 'left';
    } else if (reportText.includes('codominant') || reportText.includes('co-dominant')) {
      reportedDominance = 'codominant';
    }

    // Check for contradiction
    const hasContradiction =
      dictatedDominance !== 'unspecified' &&
      reportedDominance !== 'unspecified' &&
      dictatedDominance !== reportedDominance;

    if (hasContradiction) {
      console.warn(`⚠️ Dominance contradiction detected: dictation says "${dictatedDominance}" but report says "${reportedDominance}"`);
    }

    return { dictatedDominance, reportedDominance, hasContradiction };
  }

  /**
   * Generate a patient-friendly version of an angiogram/PCI report
   * Converts medical jargon into accessible language for patients
   */
  async generatePatientVersion(medicalReport: string): Promise<string> {
    try {
      const startTime = Date.now();

      console.log('🎯 AngiogramPCI: Generating patient-friendly version');

      // Build the prompt for patient version conversion
      const conversionPrompt = `${ANGIOGRAM_PCI_SYSTEM_PROMPTS.patientVersion}

TECHNICAL REPORT TO CONVERT:
${medicalReport}

Please rewrite this cardiac catheterisation report in clear, patient-friendly language that patients and their families can easily understand.`;

      // Process with LMStudio service
      const patientFriendlyContent = await this.lmStudioService.processWithAgent(
        conversionPrompt,
        medicalReport,
        'angiogram-pci'
      );

      // Clean up the patient version content
      const cleanedContent = this.cleanPatientVersionContent(patientFriendlyContent);

      const processingTime = Date.now() - startTime;
      console.log(`✅ Patient version generated in ${processingTime}ms`);

      return cleanedContent;

    } catch (error) {
      console.error('❌ Error generating patient version:', error);

      // Fallback patient-friendly message
      return `Dear Patient,

We performed a heart catheterisation procedure to examine your coronary arteries (the blood vessels that supply your heart muscle).

${this.createFallbackPatientVersion(medicalReport)}

If you have any questions about these results, please don't hesitate to contact your cardiologist.`;
    }
  }

  /**
   * Clean and format patient version content
   */
  private cleanPatientVersionContent(content: string): string {
    let cleaned = content.trim();

    // Remove any system prompt artifacts
    cleaned = cleaned.replace(/^(You are|Please rewrite|TECHNICAL REPORT|Patient Version|CONVERSION:).*$/gim, '');

    // Ensure proper paragraph spacing
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // Replace common cardiac abbreviations with full terms
    const cardiacAbbreviations: Record<string, string> = {
      'LAD': 'left anterior descending artery',
      'LCx': 'left circumflex artery',
      'RCA': 'right coronary artery',
      'LM': 'left main artery',
      'PCI': 'angioplasty',
      'DES': 'drug-coated stent',
      'TIMI': 'blood flow',
      'LVEDP': 'heart pressure',
      'CAD': 'coronary artery disease',
      'MI': 'heart attack',
      'STEMI': 'severe heart attack',
      'NSTEMI': 'heart attack'
    };

    // Replace abbreviations with full terms (only if not already explained in parentheses)
    Object.entries(cardiacAbbreviations).forEach(([abbrev, fullTerm]) => {
      const regex = new RegExp(`\\b${abbrev}\\b(?!\\s*\\()`, 'gi');
      cleaned = cleaned.replace(regex, fullTerm);
    });

    return cleaned.trim();
  }

  /**
   * Create a simple fallback patient version
   */
  private createFallbackPatientVersion(medicalReport: string): string {
    const text = medicalReport.toLowerCase();

    // Extract key information
    const hasIntervention = text.includes('stent') || text.includes('angioplasty');
    const hasNormalFindings = text.includes('normal') && !text.includes('abnormal');
    const hasBlockage = text.includes('stenosis') || text.includes('blockage') || text.includes('narrowing');

    if (hasNormalFindings && !hasBlockage) {
      return `Good news - your coronary arteries appear healthy with no significant blockages. We recommend continuing with your current medications and regular follow-up appointments.`;
    } else if (hasIntervention) {
      return `We found narrowing in one or more of your heart arteries and treated it during the procedure by opening the artery with a balloon and placing a stent (a small mesh tube) to keep it open. You'll need to take blood-thinning medications to help the stent work properly.`;
    } else if (hasBlockage) {
      return `We found some narrowing in your heart arteries. Your cardiologist will discuss the findings with you and recommend the best treatment plan, which may include medications or further procedures.`;
    }

    return `We completed the catheterisation procedure to examine your heart arteries. Your cardiologist will discuss the detailed findings and recommendations with you at your follow-up appointment.`;
  }
}
