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
      
      // Extract relevant data based on procedure type
      const procedureData = this.extractProcedureData(correctedInput, procedureType);
      
      // Detect missing information
      const missingInfo = await this.detectMissingInformation(correctedInput, procedureType);
      
      // Generate structured report content based on procedure type
      const reportContent = await this.generateStructuredReport(correctedInput, procedureData, procedureType);

      // Parse response into sections
      const sections = this.parseResponse(reportContent, context);

      // Create comprehensive report
      const processingTime = Date.now() - startTime;
      const report = this.createReport(
        reportContent, 
        sections, 
        context, 
        processingTime, 
        0.95
      );

      // Add missing information warnings to metadata
      if (missingInfo) {
        report.metadata.missingInformation = missingInfo;
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
    // Always use unified 3-section report format
    const contextualSystemPrompt = this.systemPrompt +
      '\n\nFORMAT: Use the unified three-section format (PREAMBLE, FINDINGS/PROCEDURE, CONCLUSION) regardless of procedure type. Integrate PCI details within FINDINGS/PROCEDURE when applicable.';

    const userPrompt = `Generate a ${procedureType.toLowerCase().replace('_', ' ')} report using the appropriate format.

Dictation to process:
${input}

Use the clinician's exact terminology as provided. Include all relevant details while maintaining clinical accuracy and proper medical terminology.`;

    return [
      { role: 'system', content: contextualSystemPrompt },
      { role: 'user', content: userPrompt }
    ];
  }

  protected parseResponse(response: string, _context?: MedicalContext): ReportSection[] {
    // Get procedure type from memory
    const procedureType: ProcedureType = this.getMemory().shortTerm['detectedProcedureType'] || 'DIAGNOSTIC_ANGIOGRAM';
    const sections: ReportSection[] = [];
    const lines = response.split('\n');
    let currentSection: ReportSection | null = null;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Check if this is a section header
      if (this.isSectionHeader(trimmedLine, procedureType)) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }

        // Start new section
        currentSection = {
          title: this.cleanSectionTitle(trimmedLine),
          content: '',
          type: 'structured',
          priority: this.getSectionPriority(trimmedLine, procedureType)
        };
      } else if (currentSection) {
        // Add content to current section
        currentSection.content += (currentSection.content ? '\n' : '') + trimmedLine;
      } else if (trimmedLine && !currentSection) {
        // Handle content without explicit headers (fallback)
        const defaultTitle = procedureType === 'DIAGNOSTIC_ANGIOGRAM' 
          ? 'Angiogram Report' 
          : 'Cardiac Catheterization Report';
        currentSection = {
          title: defaultTitle,
          content: trimmedLine,
          type: 'structured',
          priority: 'high'
        };
      }
    }

    // Add final section
    if (currentSection) {
      sections.push(currentSection);
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
      // Use processWithAgent with unified three-section format instruction
      const contextualSystemPrompt = this.systemPrompt +
        '\n\nFORMAT: Use the unified three-section format (PREAMBLE, FINDINGS/PROCEDURE, CONCLUSION). Integrate any PCI details within FINDINGS/PROCEDURE.';
      
      const report = await this.lmStudioService.processWithAgent(contextualSystemPrompt, input);
      
      console.log('✅ Report generated successfully');
      console.log('📄 Report length:', report.length, 'characters');
      
      return report;
      
    } catch (error) {
      console.error('❌ Error generating report:', error);
      
      // Fallback to basic structured format
      return this.generateFallbackReport(input, procedureData, procedureType);
    }
  }

  private generateFallbackReport(_input: string, procedureData: any, procedureType: ProcedureType): string {
    const pciPerformed = procedureType === 'PCI_INTERVENTION' || procedureType === 'COMBINED';
    return `**PREAMBLE**
Cardiac catheterization performed. ${procedureData.accessSite || '[Access details not specified]'}${procedureData.contrastVolume ? `, Contrast: ${procedureData.contrastVolume}` : ''}${procedureData.fluoroscopyTime ? `, Fluoroscopy: ${procedureData.fluoroscopyTime}` : ''}.

**FINDINGS/PROCEDURE**
Coronary anatomy and dominance: [Not specified in dictation]
Left Main: ${this.describeLMFindings(procedureData) || '[Not specified in dictation]'}
Left Anterior Descending: ${this.describeLADFindings(procedureData) || '[Not specified in dictation]'}
Circumflex: ${this.describeLCxFindings(procedureData) || '[Not specified in dictation]'}
Right Coronary Artery: ${this.describeRCAFindings(procedureData) || '[Not specified in dictation]'}
Left ventricle/valves/hemodynamics: ${procedureData.hemodynamics || '[Not specified in dictation]'}
${pciPerformed ? `\nPCI Details:\n- Target lesion/vessel: ${procedureData.interventionDetails?.targetVessel || '[Not specified]'}\n- Lesion characteristics: ${procedureData.interventionDetails?.lesionCharacteristics || '[Not specified]'}\n- Strategy: ${procedureData.interventionDetails?.interventionType || '[Not specified]'}\n- Devices: ${procedureData.interventionDetails?.stentDetails || '[Not specified]'}\n- Result: ${procedureData.interventionDetails?.angiographicResult || '[Not specified]'}\n- Intra-procedural meds: ${procedureData.interventionDetails?.medications || '[Not specified]'}\n` : ''}
Complications: ${procedureData.complications.length > 0 ? procedureData.complications.join(', ') : '[None specified]'}

**CONCLUSION**
${pciPerformed 
      ? `${procedureData.proceduralOutcome || 'PCI completed.'} Post-procedural plan: [Not specified].`
      : `${procedureData.proceduralOutcome || 'Coronary angiography completed.'} Clinical correlation recommended.`}

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
      missing_diagnostic: [] as string[],
      missing_intervention: [] as string[],
      completeness_score: "75%"
    };

    // Check diagnostic elements
    if (!text.includes('left main') && !text.includes('lm ')) {
      missing.missing_diagnostic.push('Left Main coronary artery');
    }
    if (!text.includes('lad') && !text.includes('left anterior descending')) {
      missing.missing_diagnostic.push('Left Anterior Descending artery');
    }

    // Check intervention elements if applicable
    if (procedureType === 'PCI_INTERVENTION' || procedureType === 'COMBINED') {
      if (!text.includes('stent') && !text.includes('balloon')) {
        missing.missing_intervention.push('Device specifications');
      }
      if (!text.includes('timi')) {
        missing.missing_intervention.push('TIMI flow assessment');
      }
    }

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
  private isSectionHeader(line: string, _procedureType: ProcedureType): boolean {
    const normalizedLine = line.toLowerCase().replace(/\*/g, '').trim();
    return normalizedLine === 'preamble' ||
           normalizedLine === 'findings' ||
           normalizedLine === 'findings/procedure' ||
           normalizedLine === 'conclusion' ||
           (line.startsWith('**') && line.endsWith('**')) ||
           (line.toUpperCase() === line && line.length > 3);
  }

  private getSectionPriority(line: string, _procedureType: ProcedureType): 'high' | 'medium' | 'low' {
    const highPriority = [
      'preamble', 'findings', 'findings/procedure', 'conclusion', 'procedure', 'indication', 
      'complications', 'assessment', 'device', 'angiographic', 'hemodynamic'
    ];
    const title = line.toLowerCase();
    
    for (const keyword of highPriority) {
      if (title.includes(keyword)) return 'high';
    }
    
    return 'medium';
  }

  private cleanSectionTitle(line: string): string {
    return line.replace(/\*\*/g, '').replace(/:/g, '').trim();
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
}
