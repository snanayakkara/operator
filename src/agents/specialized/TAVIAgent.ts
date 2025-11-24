import { MedicalAgent } from '@/agents/base/MedicalAgent';
import type {
  MedicalContext,
  ChatMessage,
  ReportSection,
  TAVIReportStructured,
  TAVIReportData,
  TAVIData,
  HemodynamicData,
  ValveAssessment,
  TAVIComplication,
  ValveManufacturer,
  ValveSize,
  AorticRegurgitationGrade,
  AccessApproach,
} from '@/types/medical.types';
import { TAVIReportSchema } from '@/types/medical.types';
import { LMStudioService, MODEL_CONFIG } from '@/services/LMStudioService';
import { systemPromptLoader } from '@/services/SystemPromptLoader';
import { TAVIMedicalPatterns, TAVIValidationRules } from './TAVISystemPrompts';

/**
 * Specialized agent for processing Transcatheter Aortic Valve Implantation (TAVI/TAVR) procedures.
 * Handles valve sizing, positioning, deployment, and post-implant assessment with comprehensive
 * medical knowledge extracted from the Reflow2 implementation.
 */
export class TAVIAgent extends MedicalAgent {
  private lmStudioService: LMStudioService;
  private systemPromptInitialized = false;
  
  // TAVI-specific medical knowledge
  private readonly valveTypes: Record<string, ValveManufacturer> = {
    'sapien': 'Edwards SAPIEN',
    'evolut': 'Medtronic Evolut',
    'acurate': 'Boston Scientific ACURATE',
    'portico': 'Abbott Portico',
    'lotus': 'Boston Scientific Lotus'
  };

  private readonly valveSizes: Record<string, ValveSize> = {
    '20mm': '20mm',
    '23mm': '23mm',
    '26mm': '26mm',
    '29mm': '29mm',
    '34mm': '34mm'
  };

  private readonly accessRoutes: Record<string, string> = {
    'transfemoral': 'Transfemoral approach',
    'transapical': 'Transapical approach',
    'transaortic': 'Transaortic approach',
    'transcaval': 'Transcaval approach',
    'transcarotid': 'Transcarotid approach'
  };

  private readonly aorticRegurgitationGrades: Record<string, AorticRegurgitationGrade> = {
    'none': 'none',
    'trace': 'trace',
    'mild': 'mild',
    'moderate': 'moderate',
    'severe': 'severe'
  };

  // Medical terminology corrections for TAVI
  private readonly taviTerminologyCorrections: Record<string, string> = {
    'transcatheter aortic valve replacement': 'TAVR',
    'transcatheter aortic valve implantation': 'TAVI',
    'edwards sapien': 'Edwards SAPIEN',
    'medtronic evolut': 'Medtronic Evolut',
    'trans femoral': 'transfemoral',
    'trans apical': 'transapical',
    'aortic valve area': 'AVA',
    'left ventricular ejection fraction': 'LVEF',
    'paravalvular regurgitation': 'paravalvular leak',
    'millimeter': 'mm',
    'millimeters of mercury': 'mmHg',
    'centimeter squared': 'cm²'
  };

  constructor() {
    super(
      'TAVI Procedure Agent',
      'Interventional Cardiology',
      'Generates comprehensive TAVI procedural reports with structured JSON data and narrative analysis',
      'tavi',
      '' // Will be loaded dynamically
    );
    this.lmStudioService = LMStudioService.getInstance();
  }

  private async initializeSystemPrompt(): Promise<void> {
    if (this.systemPromptInitialized) return;

    try {
      this.systemPrompt = await systemPromptLoader.loadSystemPrompt('tavi', 'primary');
      this.systemPromptInitialized = true;
    } catch (error) {
      console.error('❌ TAVIAgent: Failed to load system prompt:', error);
      this.systemPrompt = 'You are a specialist interventional cardiologist generating comprehensive TAVI procedural reports.'; // Fallback
    }
  }

  async process(input: string, context?: MedicalContext): Promise<TAVIReportStructured> {
    await this.initializeSystemPrompt();

    const startTime = Date.now();
    
    try {
      // Store input in memory
      this.updateMemory('currentInput', input);
      this.updateMemory('processingContext', context);

      // Correct TAVI-specific terminology
      const correctedInput = this.correctTAVITerminology(input);
      
      // Extract TAVI data from input
      const taviData = this.extractTAVIData(correctedInput);
      
      // Analyze hemodynamics
      const hemodynamics = this.extractHemodynamicData(correctedInput);
      
      // Assess valve positioning and deployment
      const valveAssessment = this.assessValvePositioning(correctedInput);
      
      // Identify complications
      const complications = this.identifyComplications(correctedInput);

      // Build messages for LLM processing (handled internally by generateStructuredReport)
      
      // Generate structured report content with JSON + narrative
      const reportContent = await this.generateStructuredReport(
        taviData,
        hemodynamics,
        valveAssessment,
        complications,
        correctedInput
      );

      // Parse and validate JSON data from response
      const { jsonData, validationErrors, narrativeContent } = this.parseJSONAndNarrative(reportContent);

      // Parse response into sections (using the narrative part)
      const sections = this.parseResponse(narrativeContent, context);

      // Create comprehensive TAVI report with structured JSON data
      const processingTime = Date.now() - startTime;
      const report: TAVIReportStructured = {
        ...this.createReport(narrativeContent, sections, context, processingTime, 0.95),
        taviData,
        hemodynamics,
        valveAssessment,
        complications,
        taviJsonData: jsonData ?? undefined,
        validationErrors,
        isValidJson: validationErrors.length === 0
      };

      // Store procedure in memory
      this.addProcedureMemory('TAVI', {
        valve: taviData.valveDetails,
        hemodynamics,
        complications: complications.length
      }, valveAssessment.deploymentSuccess);

      return report;

    } catch (error) {
      console.error('TAVI processing error:', error);
      
      // Return fallback report
      const processingTime = Date.now() - startTime;
      return {
        ...this.createReport(
          `TAVI processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          [],
          context,
          processingTime,
          0.1
        ),
        taviData: this.getEmptyTAVIData(),
        hemodynamics: this.getEmptyHemodynamicData(),
        valveAssessment: this.getEmptyValveAssessment(),
        complications: [],
        taviJsonData: undefined,
        validationErrors: [error instanceof Error ? error.message : String(error)],
        isValidJson: false
      };
    }
  }

  protected async buildMessages(input: string, _context?: MedicalContext): Promise<ChatMessage[]> {
    await this.initializeSystemPrompt();

    return [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: `Please analyze this TAVI procedural dictation and generate a comprehensive report with structured JSON data:

"${input}"

Provide both JSON structured data and narrative analysis following TAVI procedural reporting standards.` }
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

  private correctTAVITerminology(text: string): string {
    let correctedText = text;
    
    // Apply TAVI-specific terminology corrections
    for (const [incorrect, correct] of Object.entries(this.taviTerminologyCorrections)) {
      const regex = new RegExp(incorrect, 'gi');
      correctedText = correctedText.replace(regex, correct);
    }

    // Apply Australian spelling from validation rules
    for (const { us, au } of TAVIValidationRules.australianSpelling) {
      const regex = new RegExp(`\\b${us}\\b`, 'gi');
      correctedText = correctedText.replace(regex, au);
    }

    // Preserve clinical phrases from validation rules
    for (const phrase of TAVIValidationRules.clinicalPhrases) {
      const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      if (regex.test(correctedText)) {
        // Ensure proper capitalization of preserved clinical phrases
        correctedText = correctedText.replace(regex, phrase);
      }
    }

    return correctedText;
  }

  private extractTAVIData(input: string): TAVIData {
    const text = input.toLowerCase();

    return {
      procedureType: text.includes('tavr') ? 'TAVR' : 'TAVI',
      indication: this.extractIndication(input),
      riskAssessment: this.extractRiskAssessment(input),
      accessApproach: this.extractAccessApproach(input),
      preImplant: this.extractPreImplantData(input),
      valveDetails: this.extractValveDetails(input),
      proceduralDetails: this.extractProceduralDetails(input),
      postImplant: this.extractPostImplantData(input),
      immediateOutcomes: this.extractImmediateOutcomes(input),
      recommendations: this.extractRecommendations(input),
      followUp: this.extractFollowUp(input)
    };
  }

  private extractHemodynamicData(input: string): HemodynamicData {
    const text = input.toLowerCase();
    
    // Use enhanced patterns from TAVISystemPrompts
    const meanGradientPattern = TAVIMedicalPatterns.meanGradient;
    const peakGradientPattern = TAVIMedicalPatterns.peakGradient;
    const invasiveGradientPattern = TAVIMedicalPatterns.invasiveGradient;
    const valveAreaPattern = TAVIMedicalPatterns.valveArea;
    const lvefPattern = TAVIMedicalPatterns.lvef;
    const lvedpPattern = TAVIMedicalPatterns.lvedp;
    const calciumScorePattern = TAVIMedicalPatterns.calciumScore;

    // Split text into pre/post sections with enhanced keywords
    const parts = text.split(/(?:post[-\s]?(?:implant|operative|procedural)|after\s+(?:implant|deployment|valve)|final|immediate\s+(?:assessment|outcome))/i);
    const preText = parts[0] || '';
    const postText = parts.length > 1 ? parts[1] : '';

    // Extract pre-implant measurements with enhanced patterns
    const preMean = this.extractMeasurement(preText, meanGradientPattern);
    const prePeak = this.extractMeasurement(preText, peakGradientPattern);
    const invasiveGradient = this.extractMeasurement(input, invasiveGradientPattern);
    const preArea = this.extractMeasurement(preText, valveAreaPattern);
    const preLVEF = this.extractMeasurement(preText, lvefPattern);
    const lvedp = this.extractMeasurement(input, lvedpPattern);
    const calciumScore = this.extractMeasurement(input, calciumScorePattern);

    // Extract post-implant measurements
    const postMean = this.extractMeasurement(postText, meanGradientPattern);
    const postPeak = this.extractMeasurement(postText, peakGradientPattern);
    const postLVEF = this.extractMeasurement(postText, lvefPattern);

    // Calculate improvements with enhanced logic
    const gradientImprovement = this.calculateGradientImprovement(
      preMean, postMean, prePeak, postPeak
    );

    return {
      preImplant: {
        meanGradient: preMean ? `${preMean} mmHg` : '',
        peakGradient: prePeak ? `${prePeak} mmHg` : '',
        invasiveGradient: invasiveGradient ? `${invasiveGradient} mmHg` : '',
        valveArea: preArea ? `${preArea} cm²` : '',
        lvef: preLVEF ? `${preLVEF}%` : '',
        lvedp: lvedp ? `${lvedp} mmHg` : '',
        calciumScore: calciumScore ? calciumScore : ''
      },
      postImplant: {
        meanGradient: postMean ? `${postMean} mmHg` : '',
        peakGradient: postPeak ? `${postPeak} mmHg` : '',
        lvef: postLVEF ? `${postLVEF}%` : ''
      },
      gradientImprovement
    };
  }

  private assessValvePositioning(input: string): ValveAssessment {
    const text = input.toLowerCase();
    
    // Assess deployment success
    let deploymentSuccess: 'successful' | 'complicated' | 'unknown' = 'unknown';
    if (text.includes('well positioned') || text.includes('appropriate position')) {
      deploymentSuccess = 'successful';
    } else if (text.includes('malposition') || text.includes('migration')) {
      deploymentSuccess = 'complicated';
    }

    // Assess paravalvular leak
    let paravalvularLeak: 'minimal' | 'mild' | 'moderate' | 'severe' | 'unknown' = 'unknown';
    if (text.includes('no paravalvular') || text.includes('trace paravalvular')) {
      paravalvularLeak = 'minimal';
    } else if (text.includes('mild paravalvular')) {
      paravalvularLeak = 'mild';
    } else if (text.includes('moderate paravalvular')) {
      paravalvularLeak = 'moderate';
    } else if (text.includes('severe paravalvular')) {
      paravalvularLeak = 'severe';
    }

    // Extract complications
    const complications = this.extractPositioningComplications(text);

    return {
      deploymentSuccess,
      positionRelativeToAnnulus: deploymentSuccess === 'successful' ? 'appropriate' : 'unknown',
      valveGeometry: deploymentSuccess === 'successful' ? 'normal' : 'unknown',
      paravalvularLeak,
      complications
    };
  }

  private identifyComplications(input: string): TAVIComplication[] {
    const text = input.toLowerCase();
    const complications: TAVIComplication[] = [];

    // Check for specific complications
    const complicationPatterns = [
      {
        pattern: /migration|embolization/i,
        type: 'valve_migration' as const,
        severity: 'major' as const
      },
      {
        pattern: /paravalvular.*(?:leak|regurgitation)/i,
        type: 'paravalvular_leak' as const,
        severity: 'minor' as const
      },
      {
        pattern: /coronary.*(?:occlusion|compromise)/i,
        type: 'coronary_occlusion' as const,
        severity: 'life-threatening' as const
      },
      {
        pattern: /(?:conduction|heart).*block/i,
        type: 'conduction_block' as const,
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
    taviData: TAVIData,
    hemodynamics: HemodynamicData,
    valveAssessment: ValveAssessment,
    complications: TAVIComplication[],
    originalInput: string
  ): Promise<string> {
    console.log(`🔧 Generating TAVI report with LMStudio ${MODEL_CONFIG.REASONING_MODEL}...`);
    
    try {
      // Prepare comprehensive context for LMStudio
      const extractedData = {
        taviData,
        hemodynamics,
        valveAssessment,
        complications
      };
      
      // Use enhanced TAVI system prompt with JSON requirements
      const contextualPrompt = `${this.systemPrompt}

EXTRACTED DATA CONTEXT:
${JSON.stringify(extractedData, null, 2)}`;

      // Use enhanced user prompt for JSON + narrative output
      const _userPrompt = `Please analyze this TAVI procedural dictation and generate a comprehensive report with structured JSON data:

"${originalInput}"

Provide both JSON structured data and narrative analysis following TAVI procedural reporting standards.`;

      const report = await this.lmStudioService.processWithAgent(contextualPrompt, originalInput);
      
      console.log('✅ TAVI report generated successfully');
      return report;
      
    } catch (error) {
      console.error('❌ Error generating TAVI report:', error);
      
      // Fallback to basic structured format if LMStudio fails
      return `**TRANSCATHETER AORTIC VALVE IMPLANTATION REPORT**

**INDICATION**: ${taviData.indication || '[Not specified in dictation]'}

**PROCEDURE**: 
- Access Approach: ${taviData.accessApproach.description}
- Valve: ${taviData.valveDetails.manufacturer} ${taviData.valveDetails.model} ${taviData.valveDetails.size}
- Deployment: ${valveAssessment.deploymentSuccess}

**HEMODYNAMICS**: 
- Pre-implant: Mean ${hemodynamics.preImplant.meanGradient}, Peak ${hemodynamics.preImplant.peakGradient}
- Post-implant: Mean ${hemodynamics.postImplant.meanGradient}, Peak ${hemodynamics.postImplant.peakGradient}

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

  private calculateGradientImprovement(
    preMean: string | null,
    postMean: string | null,
    prePeak: string | null,
    postPeak: string | null
  ) {
    const improvement: any = {};
    
    if (preMean && postMean) {
      const preValue = parseInt(preMean);
      const postValue = parseInt(postMean);
      const delta = preValue - postValue;
      improvement.meanGradient = `${delta} mmHg reduction`;
    }

    if (prePeak && postPeak) {
      const preValue = parseInt(prePeak);
      const postValue = parseInt(postPeak);
      const delta = preValue - postValue;
      improvement.peakGradient = `${delta} mmHg reduction`;
    }

    return improvement;
  }

  private extractIndication(input: string): string {
    // Extract clinical indication from input
    const indicationPattern = /indication[:\s]+([^.]+)/i;
    const match = input.match(indicationPattern);
    return match ? match[1].trim() : '';
  }

  private extractRiskAssessment(input: string) {
    return {
      stsScore: this.extractValue(input, /sts\s+score[:\s]+([^.]+)/i),
      euroscore: this.extractValue(input, /euroscore[:\s]+([^.]+)/i),
      frailtyAssessment: this.extractValue(input, /frailty[:\s]+([^.]+)/i)
    };
  }

  private extractAccessApproach(input: string): AccessApproach {
    const text = input.toLowerCase();
    
    for (const [key, description] of Object.entries(this.accessRoutes)) {
      if (text.includes(key)) {
        return {
          primary: key as any,
          description
        };
      }
    }

    return {
      primary: 'transfemoral', // Default to most common approach
      description: '[Access approach not specified in dictation]'
    };
  }

  private extractPreImplantData(input: string) {
    return {
      aorticValveArea: this.extractValue(input, /(?:aortic\s+)?valve\s+area[:\s]+([^.]+)/i) || '',
      meanGradient: this.extractValue(input, /mean\s+gradient[:\s]+([^.]+)/i) || '',
      peakGradient: this.extractValue(input, /peak\s+gradient[:\s]+([^.]+)/i) || '',
      lvef: this.extractValue(input, /lvef[:\s]+([^.]+)/i) || '',
      annulusDimensions: {}
    };
  }

  private extractValveDetails(input: string) {
    const text = input.toLowerCase();
    
    // Use enhanced valve patterns from SystemPrompts
    const edwardsMatch = text.match(TAVIMedicalPatterns.edwardsValves);
    const medtronicMatch = text.match(TAVIMedicalPatterns.medtronicValves);
    const generalManufacturerMatch = text.match(TAVIMedicalPatterns.valveManufacturer);
    
    // Determine valve manufacturer with enhanced detection
    let manufacturer: ValveManufacturer = 'Edwards SAPIEN';
    if (edwardsMatch) {
      manufacturer = 'Edwards SAPIEN';
    } else if (medtronicMatch) {
      manufacturer = 'Medtronic Evolut';
    } else if (generalManufacturerMatch) {
      const match = generalManufacturerMatch[0].toLowerCase();
      if (match.includes('medtronic') || match.includes('evolut')) {
        manufacturer = 'Medtronic Evolut';
      } else if (match.includes('edwards') || match.includes('sapien')) {
        manufacturer = 'Edwards SAPIEN';
      } else if (match.includes('acurate')) {
        manufacturer = 'Boston Scientific ACURATE';
      }
    }

    // Extract valve size with enhanced pattern
    let size: ValveSize = '26mm';
    const sizeMatch = text.match(TAVIMedicalPatterns.valveSize);
    if (sizeMatch) {
      const extractedSize = sizeMatch[0];
      if (Object.keys(this.valveSizes).includes(extractedSize)) {
        size = extractedSize as ValveSize;
      }
    }

    // Extract valve model details
    let model = '';
    if (manufacturer === 'Edwards SAPIEN') {
      if (text.includes('ultra')) model = 'SAPIEN 3 Ultra';
      else if (text.includes('sapien 3')) model = 'SAPIEN 3';
      else model = 'SAPIEN';
    } else if (manufacturer === 'Medtronic Evolut') {
      if (text.includes('evolut r')) model = 'Evolut R';
      else if (text.includes('evolut pro')) model = 'Evolut Pro';
      else if (text.includes('evolut fx')) model = 'Evolut FX';
      else model = 'Evolut';
    }

    return {
      manufacturer,
      model: model || manufacturer.split(' ')[1] || 'Standard',
      size,
      positioning: this.extractValue(input, /(?:positioning|position)[:\s]+([^.]+)/i) || '',
      deploymentTechnique: this.extractValue(input, /deployment[:\s]+([^.]+)/i) || ''
    };
  }

  private extractProceduralDetails(input: string) {
    return {
      contrastVolume: this.extractValue(input, /contrast[:\s]+([^.]+)/i) || '',
      fluoroscopyTime: this.extractValue(input, /fluoroscopy[:\s]+([^.]+)/i) || '',
      complications: this.extractValue(input, /complications[:\s]+([^.]+)/i) || 'None',
      pacingRequired: this.extractValue(input, /pacing[:\s]+([^.]+)/i) || '',
      postDilatation: this.extractValue(input, /(?:post[- ]?dilatation|balloon)[:\s]+([^.]+)/i) || ''
    };
  }

  private extractPostImplantData(input: string) {
    return {
      valvePosition: this.extractValue(input, /valve\s+position[:\s]+([^.]+)/i) || '',
      aorticRegurgitation: this.extractAorticRegurgitation(input),
      meanGradient: this.extractValue(input, /final.*mean\s+gradient[:\s]+([^.]+)/i) || '',
      peakGradient: this.extractValue(input, /final.*peak\s+gradient[:\s]+([^.]+)/i) || '',
      lvef: this.extractValue(input, /final.*lvef[:\s]+([^.]+)/i) || '',
      conductionIssues: this.extractValue(input, /conduction[:\s]+([^.]+)/i) || ''
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

  private extractAorticRegurgitation(input: string): AorticRegurgitationGrade {
    const text = input.toLowerCase();
    
    for (const [key, value] of Object.entries(this.aorticRegurgitationGrades)) {
      if (text.includes(`${key} aortic regurgitation`) || text.includes(`${key} ar`)) {
        return value;
      }
    }
    
    return 'none';
  }

  private extractPositioningComplications(text: string): string[] {
    const complications: string[] = [];
    
    if (text.includes('malposition')) complications.push('malposition');
    if (text.includes('migration')) complications.push('migration');
    if (text.includes('too high')) complications.push('high_position');
    if (text.includes('too low')) complications.push('low_position');
    
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
  private getEmptyTAVIData(): TAVIData {
    return {
      procedureType: 'TAVI',
      indication: '',
      riskAssessment: {},
      accessApproach: { primary: 'transfemoral', description: '[Access approach not specified in dictation]' },
      preImplant: {
        aorticValveArea: '',
        meanGradient: '',
        peakGradient: '',
        lvef: '',
        annulusDimensions: {}
      },
      valveDetails: {
        manufacturer: 'Edwards SAPIEN',
        model: '',
        size: '26mm',
        positioning: '',
        deploymentTechnique: ''
      },
      proceduralDetails: {
        contrastVolume: '',
        fluoroscopyTime: '',
        complications: '',
        pacingRequired: '',
        postDilatation: ''
      },
      postImplant: {
        valvePosition: '',
        aorticRegurgitation: 'none',
        meanGradient: '',
        peakGradient: '',
        lvef: '',
        conductionIssues: ''
      },
      immediateOutcomes: '',
      recommendations: '',
      followUp: ''
    };
  }

  private getEmptyHemodynamicData(): HemodynamicData {
    return {
      preImplant: {},
      postImplant: {},
      gradientImprovement: {}
    };
  }

  private getEmptyValveAssessment(): ValveAssessment {
    return {
      deploymentSuccess: 'unknown',
      positionRelativeToAnnulus: '',
      valveGeometry: '',
      paravalvularLeak: 'unknown',
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

  /**
   * Parse JSON data and narrative content from TAVI LLM response
   * Expected format: JSON block first, then narrative report
   */
  private parseJSONAndNarrative(response: string): {
    jsonData: TAVIReportData | null;
    validationErrors: string[];
    narrativeContent: string;
  } {
    const validationErrors: string[] = [];
    let jsonData: TAVIReportData | null = null;
    let narrativeContent = response;

    try {
      // Strip conversational preamble if LLM ignores output format instructions
      // Common patterns: "Okay, here is...", "Sure, I'll...", "Here's the...", etc.
      let cleanedResponse = response.replace(
        /^(?:okay|sure|alright|here(?:'s| is)|let me|i'll|i will|based on|certainly)[^{]*?(?=\{)/i,
        ''
      ).trim();

      // Look for JSON block (now at the beginning after stripping preamble)
      const jsonBlockMatch = cleanedResponse.match(/^\s*\{[\s\S]*?\}(?=\s*(?:\n\n|\*\*|$))/);

      if (jsonBlockMatch) {
        const jsonString = jsonBlockMatch[0];
        console.log('🔍 Found JSON block in TAVI response:', jsonString.substring(0, 200) + '...');

        try {
          // Parse and validate the JSON
          const parsedJson = JSON.parse(jsonString);
          const validationResult = TAVIReportSchema.safeParse(parsedJson);

          if (validationResult.success) {
            jsonData = validationResult.data;
            console.log('✅ TAVI JSON validation successful');

            // Remove JSON block from narrative content (use cleanedResponse)
            narrativeContent = cleanedResponse.substring(jsonString.length).trim();

            // Log missing fields if any
            if (jsonData.missingFields && jsonData.missingFields.length > 0) {
              console.log('⚠️ Missing fields in TAVI data:', jsonData.missingFields);
              validationErrors.push(`Missing fields: ${jsonData.missingFields.join(', ')}`);
            }
          } else {
            console.warn('❌ TAVI JSON validation failed:', validationResult.error.issues);
            validationErrors.push('JSON schema validation failed');
            validationErrors.push(...validationResult.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`));
          }
        } catch (parseError) {
          console.warn('❌ Failed to parse TAVI JSON:', parseError);
          validationErrors.push('Invalid JSON format');
        }
      } else {
        console.log('ℹ️ No JSON block found in TAVI response, using narrative-only');
        validationErrors.push('No JSON data block found in response');
      }
    } catch (error) {
      console.error('❌ Error parsing TAVI JSON and narrative:', error);
      validationErrors.push('Failed to parse response format');
    }

    // Fallback: if no narrative content after JSON removal, use cleaned response
    if (!narrativeContent || narrativeContent.trim().length === 0) {
      // Strip any remaining preamble from narrative content
      narrativeContent = response.replace(
        /^(?:okay|sure|alright|here(?:'s| is)|let me|i'll|i will|based on|certainly)[^*{]*?(?=\*\*)/i,
        ''
      ).trim() || response;
    }

    console.log(`📊 TAVI parsing result: JSON=${jsonData ? 'valid' : 'invalid'}, errors=${validationErrors.length}, narrative=${narrativeContent.length} chars`);

    return {
      jsonData,
      validationErrors,
      narrativeContent
    };
  }
}
