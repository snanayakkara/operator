import { MedicalAgent } from '@/agents/base/MedicalAgent';
import type { 
  MedicalContext, 
  ChatMessage, 
  ReportSection, 
  PFOClosureReport,
  PFOClosureData,
  PFOAnatomyData,
  DeviceAssessment,
  PFOClosureComplication,
  OccluderType,
  ClosureIndication
} from '@/types/medical.types';
import { LMStudioService, MODEL_CONFIG } from '@/services/LMStudioService';
import { systemPromptLoader } from '@/services/SystemPromptLoader';
import { PFOClosureMedicalPatterns, PFOClosureValidationRules } from './PFOClosureSystemPrompts';

/**
 * Specialized agent for processing Patent Foramen Ovale (PFO) closure procedures.
 * Handles Amplatzer, Gore Cardioform, and Occlutech device deployments with comprehensive
 * ICE/TOE guidance documentation following Australian medical terminology.
 */
export class PFOClosureAgent extends MedicalAgent {
  private lmStudioService: LMStudioService;
  private systemPromptInitialized = false;
  
  // PFO closure-specific medical knowledge
  private readonly occluderTypes: Record<string, OccluderType> = {
    'amplatzer pfo occluder': 'Amplatzer PFO Occluder',
    'gore cardioform': 'Gore Cardioform',
    'occlutech figulla': 'Occlutech Figulla',
    'figulla flex': 'Occlutech Figulla Flex'
  };

  private readonly closureIndications: Record<string, ClosureIndication> = {
    'cryptogenic stroke': 'cryptogenic_stroke',
    'migraine with aura': 'migraine_with_aura',
    'decompression sickness': 'decompression_sickness',
    'paradoxical embolism': 'paradoxical_embolism'
  };

  private readonly deviceSizes: Record<string, string> = {
    '18mm': '18mm',
    '20mm': '20mm',
    '22mm': '22mm',
    '25mm': '25mm',
    '27mm': '27mm',
    '30mm': '30mm',
    '35mm': '35mm'
  };

  // Medical terminology corrections for PFO closure with Australian spelling
  private readonly pfoTerminologyCorrections: Record<string, string> = {
    'patent foramen ovale closure': 'PFO closure',
    'pfo occluder': 'PFO occluder',
    'amplatzer': 'Amplatzer',
    'cardioform': 'Cardioform',
    'occlutech': 'Occlutech',
    'figulla': 'Figulla',
    'transesophageal': 'transoesophageal',
    'esophageal': 'oesophageal',
    'tee': 'TOE', // Critical Australian correction
    'intracardiac echo': 'intracardiac echo',
    'ice guidance': 'ICE guidance',
    'anesthesia': 'anaesthesia',
    'color doppler': 'colour Doppler',
    'color': 'colour',
    'recognize': 'recognise',
    'optimize': 'optimise',
    'utilize': 'utilise',
    'center': 'centre'
  };

  constructor() {
    super(
      'PFO Closure Agent',
      'Interventional Cardiology',
      'Generates comprehensive PFO closure procedural reports with device deployment and closure assessment',
      'pfo-closure',
      '' // Will be loaded dynamically
    );
    this.lmStudioService = LMStudioService.getInstance();
  }

  private async initializeSystemPrompt(): Promise<void> {
    if (this.systemPromptInitialized) return;

    try {
      this.systemPrompt = await systemPromptLoader.loadSystemPrompt('pfo-closure', 'primary');
      this.systemPromptInitialized = true;
    } catch (error) {
      console.error('❌ PFOClosureAgent: Failed to load system prompt:', error);
      this.systemPrompt = 'You are a specialist interventional cardiologist generating PFO closure procedural reports for medical records.'; // Fallback
    }
  }

  async process(input: string, context?: MedicalContext): Promise<PFOClosureReport> {
    await this.initializeSystemPrompt();

    const startTime = Date.now();
    
    try {
      // Store input in memory
      this.updateMemory('currentInput', input);
      this.updateMemory('processingContext', context);

      // Correct PFO closure-specific terminology with Australian spelling
      const correctedInput = this.correctPFOTerminology(input);
      
      // Extract PFO closure data from input
      const pfoClosureData = this.extractPFOClosureData(correctedInput);
      
      // Analyze PFO anatomy
      const pfoAnatomy = this.extractPFOAnatomyData(correctedInput);
      
      // Assess device deployment and positioning
      const deviceAssessment = this.assessDeviceDeployment(correctedInput);
      
      // Identify complications
      const complications = this.identifyComplications(correctedInput);

      // Generate structured report content
      const reportContent = await this.generateStructuredReport(
        pfoClosureData, 
        pfoAnatomy, 
        deviceAssessment, 
        complications,
        correctedInput
      );

      // Parse response into sections
      const sections = this.parseResponse(reportContent, context);

      // Create comprehensive PFO closure report
      const processingTime = Date.now() - startTime;
      const report: PFOClosureReport = {
        ...this.createReport(reportContent, sections, context, processingTime, 0.95),
        pfoClosureData,
        pfoAnatomy,
        deviceAssessment,
        complications
      };

      // Store procedure in memory
      this.addProcedureMemory('PFO Closure', {
        device: deviceAssessment.deviceType,
        size: deviceAssessment.deviceSize,
        closureStatus: deviceAssessment.closureStatus,
        complications: complications.length
      }, deviceAssessment.deploymentSuccess);

      return report;

    } catch (error) {
      console.error('PFO closure processing error:', error);
      
      // Return fallback report
      const processingTime = Date.now() - startTime;
      return {
        ...this.createReport(
          `PFO closure processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          [],
          context,
          processingTime,
          0.1
        ),
        pfoClosureData: this.getEmptyPFOClosureData(),
        pfoAnatomy: this.getEmptyPFOAnatomyData(),
        deviceAssessment: this.getEmptyDeviceAssessment(),
        complications: []
      };
    }
  }

  protected async buildMessages(input: string, _context?: MedicalContext): Promise<ChatMessage[]> {
    await this.initializeSystemPrompt();

    return [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: `Please format this PFO closure procedural dictation into a structured report:

"${input}"

Generate a comprehensive PFO closure procedural report with device deployment and closure assessment. Use Australian medical terminology (TOE, ICE, anaesthesia, colour Doppler) and proper clinical formatting.` }
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

  private correctPFOTerminology(text: string): string {
    let correctedText = text;
    
    // Apply PFO closure-specific terminology corrections
    for (const [incorrect, correct] of Object.entries(this.pfoTerminologyCorrections)) {
      const regex = new RegExp(incorrect, 'gi');
      correctedText = correctedText.replace(regex, correct);
    }

    // Apply Australian spelling from validation rules
    for (const { us, au } of PFOClosureValidationRules.australianSpelling) {
      const regex = new RegExp(`\\b${us}\\b`, 'gi');
      correctedText = correctedText.replace(regex, au);
    }

    // Preserve clinical phrases from validation rules
    for (const phrase of PFOClosureValidationRules.clinicalPhrases) {
      const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      if (regex.test(correctedText)) {
        // Ensure proper capitalization of preserved clinical phrases
        correctedText = correctedText.replace(regex, phrase);
      }
    }

    return correctedText;
  }

  private extractPFOClosureData(input: string): PFOClosureData {
    return {
      procedureType: 'PFO Closure',
      indication: this.extractIndication(input),
      clinicalPresentation: this.extractClinicalPresentation(input),
      neurologicalWorkup: this.extractNeurologicalWorkup(input),
      imagingFindings: this.extractImagingFindings(input),
      deviceSelection: this.extractDeviceSelection(input),
      proceduralDetails: this.extractProceduralDetails(input),
      immediateOutcomes: this.extractImmediateOutcomes(input),
      recommendations: this.extractRecommendations(input),
      followUp: this.extractFollowUp(input)
    };
  }

  private extractPFOAnatomyData(input: string): PFOAnatomyData {
    const text = input.toLowerCase();
    
    // Use enhanced patterns from PFOClosureSystemPrompts
    const tunnelLengthPattern = PFOClosureMedicalPatterns.pfoTunnelLength;
    const septalThicknessPattern = PFOClosureMedicalPatterns.septalThickness;

    // Extract anatomical measurements
    const tunnelLength = this.extractMeasurement(input, tunnelLengthPattern);
    const septalThickness = this.extractMeasurement(input, septalThicknessPattern);

    // Assess anatomical features
    const hasAtrialSeptalAneurysm = PFOClosureMedicalPatterns.atrialSeptalAneurysm.test(text);
    const hasEustachianValve = PFOClosureMedicalPatterns.eustachianValve.test(text);

    // Extract rim assessment
    const rimAssessment = this.extractRimAssessment(input);

    return {
      tunnelLength: tunnelLength ? `${tunnelLength}mm` : '',
      septalThickness: septalThickness ? `${septalThickness}mm` : '',
      tunnelDiameter: this.extractValue(input, /tunnel\s+diameter[:\s]+([^.]+)/i) || '',
      atrialSeptalAneurysm: hasAtrialSeptalAneurysm,
      eustachianValve: hasEustachianValve,
      rimAssessment,
      shuntQuantification: this.extractShuntQuantification(input)
    };
  }

  private assessDeviceDeployment(input: string): DeviceAssessment {
    const text = input.toLowerCase();
    
    // Assess deployment success
    let deploymentSuccess: 'successful' | 'complicated' | 'unknown' = 'unknown';
    if (text.includes('satisfactory') && (text.includes('position') || text.includes('deployment'))) {
      deploymentSuccess = 'successful';
    } else if (text.includes('failed') || text.includes('unsuccessful') || text.includes('embolization')) {
      deploymentSuccess = 'complicated';
    }

    // Extract device details
    const deviceType = this.extractDeviceType(input);
    const deviceSize = this.extractDeviceSize(input);

    // Assess closure status
    let closureStatus: 'complete' | 'residual_shunt' | 'unknown' = 'unknown';
    if (text.includes('complete closure') || (text.includes('no') && text.includes('shunt'))) {
      closureStatus = 'complete';
    } else if (text.includes('residual shunt') || text.includes('trivial shunt')) {
      closureStatus = 'residual_shunt';
    }

    // Assess device stability
    const deviceStability = text.includes('stable') || text.includes('well positioned') ? 'stable' : 'unknown';

    // Extract complications
    const complications = this.extractDeploymentComplications(text);

    return {
      deploymentSuccess,
      deviceType,
      deviceSize,
      closureStatus,
      deviceStability,
      balloonSizing: this.extractBalloonSizing(input),
      complications
    };
  }

  private identifyComplications(input: string): PFOClosureComplication[] {
    const text = input.toLowerCase();
    const complications: PFOClosureComplication[] = [];

    // Check for specific complications
    const complicationPatterns = [
      {
        pattern: PFOClosureMedicalPatterns.deviceEmbolization,
        type: 'device_embolization' as const,
        severity: 'major' as const
      },
      {
        pattern: PFOClosureMedicalPatterns.arrhythmias,
        type: 'arrhythmias' as const,
        severity: 'minor' as const
      },
      {
        pattern: PFOClosureMedicalPatterns.airEmbolism,
        type: 'air_embolism' as const,
        severity: 'major' as const
      },
      {
        pattern: PFOClosureMedicalPatterns.perforation,
        type: 'perforation' as const,
        severity: 'life-threatening' as const
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
    pfoClosureData: PFOClosureData,
    pfoAnatomy: PFOAnatomyData,
    deviceAssessment: DeviceAssessment,
    complications: PFOClosureComplication[],
    originalInput: string
  ): Promise<string> {
    console.log(`🔧 Generating PFO closure report with LMStudio ${MODEL_CONFIG.REASONING_MODEL}...`);
    
    try {
      // Prepare comprehensive context for LMStudio
      const extractedData = {
        pfoClosureData,
        pfoAnatomy,
        deviceAssessment,
        complications
      };
      
      // Use LMStudio for content generation with extracted data context
      const contextualPrompt = `${this.systemPrompt}

EXTRACTED DATA CONTEXT:
${JSON.stringify(extractedData, null, 2)}

Generate a comprehensive PFO closure procedural report using the above extracted data and the following dictation. Include all relevant device specifications, anatomical assessments, deployment details, and closure outcomes. Use proper Australian medical terminology (TOE, ICE, anaesthesia, colour Doppler) and structured formatting.`;

      const report = await this.lmStudioService.processWithAgent(contextualPrompt, originalInput);
      
      console.log('✅ PFO closure report generated successfully');
      return report;
      
    } catch (error) {
      console.error('❌ Error generating PFO closure report:', error);
      
      // Fallback to basic structured format if LMStudio fails
      return `**PATENT FORAMEN OVALE CLOSURE REPORT**

**INDICATION**: ${pfoClosureData.indication || '[Not specified in dictation]'}

**PROCEDURE**: 
- Device: ${deviceAssessment.deviceType} ${deviceAssessment.deviceSize}
- Deployment: ${deviceAssessment.deploymentSuccess}
- Closure Status: ${deviceAssessment.closureStatus}
- Device Stability: ${deviceAssessment.deviceStability}

**PFO ANATOMY**: 
- Tunnel Length: ${pfoAnatomy.tunnelLength}
- Septal Thickness: ${pfoAnatomy.septalThickness}
- Atrial Septal Aneurysm: ${pfoAnatomy.atrialSeptalAneurysm ? 'Present' : 'Absent'}

**COMPLICATIONS**: ${complications.length === 0 ? '[None specified]' : complications.map(c => c.description).join(', ')}

**ASSESSMENT**: [Assessment not specified in dictation]

**RECOMMENDATIONS**: [Recommendations not specified in dictation]

Note: This report was generated with limited AI processing due to technical issues. Please review and complete manually.`;
    }
  }

  // Helper methods for data extraction
  private extractMeasurement(text: string, pattern: RegExp): string | null {
    const matches = text.match(pattern);
    return matches ? matches[matches.length - 1] : null;
  }

  private extractIndication(input: string): ClosureIndication {
    const text = input.toLowerCase();
    
    for (const [key, value] of Object.entries(this.closureIndications)) {
      if (text.includes(key)) {
        return value;
      }
    }
    
    return 'cryptogenic_stroke'; // Default most common indication
  }

  private extractDeviceType(input: string): OccluderType {
    const text = input.toLowerCase();
    
    for (const [key, value] of Object.entries(this.occluderTypes)) {
      if (text.includes(key)) {
        return value;
      }
    }
    
    return 'Amplatzer PFO Occluder'; // Default most common device
  }

  private extractDeviceSize(input: string): string {
    const sizeMatch = input.match(PFOClosureMedicalPatterns.deviceSize);
    if (sizeMatch) {
      const size = `${sizeMatch[1]}mm`;
      return Object.keys(this.deviceSizes).includes(size) ? size : '25mm';
    }
    
    return '25mm'; // Default size
  }

  private extractClinicalPresentation(input: string): string {
    return this.extractValue(input, /(?:clinical\s+)?presentation[:\s]+([^.]+)/i) || '';
  }

  private extractNeurologicalWorkup(input: string): string {
    return this.extractValue(input, /neurological\s+(?:workup|assessment)[:\s]+([^.]+)/i) || '';
  }

  private extractImagingFindings(input: string): string {
    return this.extractValue(input, /(?:imaging|echo)\s+findings[:\s]+([^.]+)/i) || '';
  }

  private extractDeviceSelection(input: string): string {
    return this.extractValue(input, /device\s+selection[:\s]+([^.]+)/i) || '';
  }

  private extractProceduralDetails(input: string) {
    return {
      iceGuidance: input.toLowerCase().includes('ice') ? 'Comprehensive ICE guidance' : '',
      toeGuidance: input.toLowerCase().includes('toe') ? 'TOE guidance' : '',
      balloonSizing: this.extractBalloonSizing(input),
      deviceDeployment: this.extractValue(input, /deployment[:\s]+([^.]+)/i) || '',
      closureConfirmation: this.extractValue(input, /closure[:\s]+([^.]+)/i) || ''
    };
  }

  private extractBalloonSizing(input: string): string {
    const balloonMatch = input.match(/balloon\s+siz/i);
    return balloonMatch ? 'Balloon sizing performed' : '';
  }

  private extractRimAssessment(input: string): string {
    return this.extractValue(input, /rim\s+assessment[:\s]+([^.]+)/i) || '';
  }

  private extractShuntQuantification(input: string): string {
    return this.extractValue(input, /shunt[:\s]+([^.]+)/i) || '';
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

  private extractDeploymentComplications(text: string): string[] {
    const complications: string[] = [];
    
    if (text.includes('embolization')) complications.push('device_embolization');
    if (text.includes('arrhythmia')) complications.push('arrhythmias');
    if (text.includes('air embolism')) complications.push('air_embolism');
    if (text.includes('perforation')) complications.push('perforation');
    
    return complications;
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

  // Helper methods for empty data structures
  private getEmptyPFOClosureData(): PFOClosureData {
    return {
      procedureType: 'PFO Closure',
      indication: 'cryptogenic_stroke',
      clinicalPresentation: '',
      neurologicalWorkup: '',
      imagingFindings: '',
      deviceSelection: '',
      proceduralDetails: {
        iceGuidance: '',
        toeGuidance: '',
        balloonSizing: '',
        deviceDeployment: '',
        closureConfirmation: ''
      },
      immediateOutcomes: '',
      recommendations: '',
      followUp: ''
    };
  }

  private getEmptyPFOAnatomyData(): PFOAnatomyData {
    return {
      tunnelLength: '',
      septalThickness: '',
      tunnelDiameter: '',
      atrialSeptalAneurysm: false,
      eustachianValve: false,
      rimAssessment: '',
      shuntQuantification: ''
    };
  }

  private getEmptyDeviceAssessment(): DeviceAssessment {
    return {
      deploymentSuccess: 'unknown',
      deviceType: 'Amplatzer PFO Occluder',
      deviceSize: '25mm',
      closureStatus: 'unknown',
      deviceStability: 'unknown',
      balloonSizing: '',
      complications: []
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
    const highPriority = ['procedure', 'indication', 'complications', 'assessment'];
    const title = line.toLowerCase();
    
    for (const keyword of highPriority) {
      if (title.includes(keyword)) return 'high';
    }
    
    return 'medium';
  }
}