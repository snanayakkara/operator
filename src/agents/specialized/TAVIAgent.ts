import { MedicalAgent } from '@/agents/base/MedicalAgent';
import type { 
  MedicalContext, 
  ChatMessage, 
  ReportSection, 
  TAVIReport,
  TAVIData,
  HemodynamicData,
  ValveAssessment,
  TAVIComplication,
  ValveManufacturer,
  ValveSize,
  AorticRegurgitationGrade,
  AccessApproach,
} from '@/types/medical.types';
import { LMStudioService, MODEL_CONFIG } from '@/services/LMStudioService';
import { TAVISystemPrompts, TAVIMedicalPatterns, TAVIValidationRules } from './TAVISystemPrompts';

/**
 * Specialized agent for processing Transcatheter Aortic Valve Implantation (TAVI/TAVR) procedures.
 * Handles valve sizing, positioning, deployment, and post-implant assessment with comprehensive
 * medical knowledge extracted from the Reflow2 implementation.
 */
export class TAVIAgent extends MedicalAgent {
  private lmStudioService: LMStudioService;
  
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
      'Generates comprehensive TAVI procedural reports with valve assessment and hemodynamic analysis',
      'tavi',
      'You are a specialist interventional cardiologist generating TAVI procedural reports for medical records.'
    );
    this.lmStudioService = LMStudioService.getInstance();
  }

  async process(input: string, context?: MedicalContext): Promise<TAVIReport> {
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
      
      // Generate structured report content
      const reportContent = await this.generateStructuredReport(
        taviData, 
        hemodynamics, 
        valveAssessment, 
        complications,
        correctedInput
      );

      // Parse response into sections
      const sections = this.parseResponse(reportContent, context);

      // Create comprehensive TAVI report
      const processingTime = Date.now() - startTime;
      const report: TAVIReport = {
        ...this.createReport(reportContent, sections, context, processingTime, 0.95),
        taviData,
        hemodynamics,
        valveAssessment,
        complications
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
        complications: []
      };
    }
  }

  protected buildMessages(input: string, _context?: MedicalContext): ChatMessage[] {
    // Use centralized system prompts from TAVISystemPrompts
    const systemPrompt = TAVISystemPrompts.taviProcedureAgent.systemPrompt;
    const userPrompt = TAVISystemPrompts.taviProcedureAgent.userPromptTemplate.replace('{input}', input);

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
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
      
      // Use LMStudio for content generation with extracted data context
      const contextualPrompt = `${this.systemPrompt}

EXTRACTED DATA CONTEXT:
${JSON.stringify(extractedData, null, 2)}

Generate a comprehensive TAVI procedural report using the above extracted data and the following dictation. Include all relevant valve specifications, hemodynamic measurements, deployment details, and outcomes. Use proper medical terminology and structured formatting.`;

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
}