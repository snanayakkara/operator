import { MedicalAgent } from '@/agents/base/MedicalAgent';
import type {
  MedicalContext,
  MedicalContextWithLockedFacts,
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
    'centimeter squared': 'cm²',
    // Additional terminology fixes
    'confidant wire': 'Confida wire',
    'confidant': 'Confida',
    'lvadp': 'LVEDP',
    'lv diastolic pressure': 'LVEDP',
    'lv end-diastolic pressure': 'LVEDP',
    'evolut fx plus': 'Evolut FX+',
    'evolut fx-plus': 'Evolut FX+',
    'valvular balloon': 'Valver balloon',
    'protamine sulphate': 'Protamine',
    'protamine sulfate': 'Protamine'
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

  async process(input: string, context?: MedicalContextWithLockedFacts): Promise<TAVIReportStructured> {
    await this.initializeSystemPrompt();

    const startTime = Date.now();

    try {
      // Store input in memory
      this.updateMemory('currentInput', input);
      this.updateMemory('processingContext', context);

      // Check for locked facts from proof mode
      const hasLockedFacts = context?.lockedFacts && Object.keys(context.lockedFacts).length > 0;
      if (hasLockedFacts) {
        console.log('[TAVIAgent] Processing with locked facts:', context.lockedFacts);
      }

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

      // Check if this is a proof mode extraction request (early return before expensive LLM generation)
      if (context?.requestProofMode) {
        console.log('[TAVIAgent] Proof mode requested - extracting facts and pausing before LLM generation');
        const keyFacts = this.extractKeyFacts(taviData, hemodynamics);

        // Return early with extracted data and facts for proof mode
        const processingTime = Date.now() - startTime;
        return {
          ...this.createReport(
            '', // No content yet - will be generated after proof mode
            [],
            context,
            processingTime,
            0.5
          ),
          status: 'awaiting_proof' as any, // Special status to signal proof mode checkpoint
          taviData,
          hemodynamics,
          valveAssessment,
          complications,
          keyFacts // Include extracted facts for proof mode dialog
        } as any;
      }

      // Apply locked facts to extracted data (override with user-confirmed values)
      if (hasLockedFacts && context?.lockedFacts) {
        this.applyLockedFacts(context.lockedFacts, taviData, hemodynamics);
      }

      // Build messages for LLM processing (handled internally by generateStructuredReport)

      // Generate structured report content with JSON + narrative
      const reportContent = await this.generateStructuredReport(
        taviData,
        hemodynamics,
        valveAssessment,
        complications,
        correctedInput,
        context
      );

      // Parse and validate JSON data from response
      const { jsonData, validationErrors, narrativeContent } = this.parseJSONAndNarrative(reportContent);

      // Final sanitization: strip any remaining markdown artifacts
      const cleanedNarrativeContent = narrativeContent
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .replace(/^\s*`+/gm, '')
        .trim();

      // Parse response into sections (using the narrative part)
      const sections = this.parseResponse(cleanedNarrativeContent, context);

      // Create comprehensive TAVI report with structured JSON data
      const processingTime = Date.now() - startTime;
      const report: TAVIReportStructured = {
        ...this.createReport(cleanedNarrativeContent, sections, context, processingTime, 0.95),
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
    originalInput: string,
    context?: MedicalContextWithLockedFacts
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
      let contextualPrompt = `${this.systemPrompt}

EXTRACTED DATA CONTEXT:
${JSON.stringify(extractedData, null, 2)}`;

      // Inject fact-locking instruction if user confirmed facts exist
      const hasLockedFacts = context?.lockedFacts && Object.keys(context.lockedFacts).length > 0;
      if (hasLockedFacts && context?.lockedFacts) {
        const lockedFactsList = Object.entries(context.lockedFacts)
          .map(([field, value]) => `  - ${field}: ${value}`)
          .join('\n');

        contextualPrompt += `\n\n**CRITICAL: USER-CONFIRMED FACTS (DO NOT MODIFY)**\n${lockedFactsList}\n\nYou MUST use these exact values in your narrative. Do NOT change, rephrase, or contradict these confirmed facts.`;
      }

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
      // STEP 1: Strip ALL markdown code fences globally (LLM often ignores format instructions)
      let cleanedResponse = response
        // Remove all markdown code fence markers globally
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
      
      // STEP 2: Strip conversational preamble before JSON
      cleanedResponse = cleanedResponse
        .replace(
          /^(?:okay|sure|alright|here(?:'s| is)|let me|i'll|i will|i understand|based on|certainly|of course|absolutely|right|medical report)[^{]*?(?=\{)/i,
          ''
        )
        .replace(
          /^[^{]*?(?:i understand|you want me to|i'll|i will|let me|here is|here's)[^{]*?(?=\{)/i,
          ''
        )
        .trim();
      
      // STEP 3: If still no JSON at start, find it and extract
      if (!cleanedResponse.startsWith('{')) {
        const jsonStart = cleanedResponse.indexOf('{');
        if (jsonStart > 0) {
          console.log('⚠️ Stripping preamble before JSON:', cleanedResponse.substring(0, Math.min(jsonStart, 100)) + '...');
          cleanedResponse = cleanedResponse.substring(jsonStart);
        }
      }

      // STEP 4: Extract complete JSON object by counting braces
      let jsonString = '';
      if (cleanedResponse.startsWith('{')) {
        let braceCount = 0;
        let inString = false;
        let escapeNext = false;
        
        for (let i = 0; i < cleanedResponse.length; i++) {
          const char = cleanedResponse[i];
          jsonString += char;
          
          if (escapeNext) {
            escapeNext = false;
            continue;
          }
          
          if (char === '\\') {
            escapeNext = true;
            continue;
          }
          
          if (char === '"') {
            inString = !inString;
            continue;
          }
          
          if (!inString) {
            if (char === '{') braceCount++;
            else if (char === '}') {
              braceCount--;
              if (braceCount === 0) break; // Complete JSON object found
            }
          }
        }
      }

      if (jsonString) {
        console.log('🔍 Found JSON block in TAVI response:', jsonString.substring(0, 200) + '...');

        // ALWAYS remove JSON block from narrative content, regardless of validation success
        narrativeContent = cleanedResponse.substring(jsonString.length).trim();

        try {
          // Parse and validate the JSON
          const parsedJson = JSON.parse(jsonString);
          const validationResult = TAVIReportSchema.safeParse(parsedJson);

          if (validationResult.success) {
            jsonData = validationResult.data;
            console.log('✅ TAVI JSON validation successful');

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
      // Strip markdown fences and preamble from narrative content
      narrativeContent = response
        // Remove all markdown code fence markers
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        // Strip preamble patterns
        .replace(
          /^(?:okay|sure|alright|here(?:'s| is)|let me|i'll|i will|i understand|based on|certainly|of course|medical report)[^*{]*?(?=\*\*)/i,
          ''
        )
        .replace(
          /^[^*]*?(?:i understand|you want me to|i'll structure|here is a)[^*]*?(?=\*\*)/i,
          ''
        )
        .trim() || response.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      
      // Also strip template placeholders if present (indicates template output, not real report)
      if (narrativeContent.includes('[Insert') || narrativeContent.includes('[insert')) {
        console.warn('⚠️ TAVI response contains template placeholders - LLM may not have generated actual content');
        validationErrors.push('Response contains template placeholders instead of actual content');
      }
    }

    // FINAL CLEANUP: Ensure ALL markdown code fences are removed from narrative
    narrativeContent = narrativeContent
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .replace(/^\s*`+\s*/gm, '')  // Strip any orphaned backticks at line starts
      .trim();

    console.log(`📊 TAVI parsing result: JSON=${jsonData ? 'valid' : 'invalid'}, errors=${validationErrors.length}, narrative=${narrativeContent.length} chars`);

    return {
      jsonData,
      validationErrors,
      narrativeContent
    };
  }

  /**
   * Extract key facts from TAVI data for proof mode verification
   * Returns array of critical facts that must be verified before report generation
   */
  extractKeyFacts(taviData: TAVIData, hemodynamics: HemodynamicData): import('@/types/medical.types').KeyFact[] {
    const facts: import('@/types/medical.types').KeyFact[] = [];
    let factId = 1;

    // Valve size and type (CRITICAL)
    if (taviData.valveDetails?.size || taviData.valveDetails?.manufacturer) {
      facts.push({
        id: `tavi-fact-${factId++}`,
        category: 'valve',
        label: 'Valve Type & Size',
        value: `${taviData.valveDetails.manufacturer || 'Not specified'} ${taviData.valveDetails.size || ''}`.trim(),
        sourceField: 'valveDetails.manufacturer+size',
        critical: true,
        status: 'pending',
        unit: ''
      });
    }

    // Annulus dimensions (CRITICAL for sizing)
    if (taviData.preImplant?.annulusDimensions) {
      const dims = taviData.preImplant.annulusDimensions;
      const dimText = [
        dims.minDiameter ? `Min Ø ${dims.minDiameter}` : null,
        dims.maxDiameter ? `Max Ø ${dims.maxDiameter}` : null,
        dims.perimeter ? `P ${dims.perimeter}` : null,
        dims.area ? `A ${dims.area}` : null
      ].filter(Boolean).join(', ');

      if (dimText) {
        facts.push({
          id: `tavi-fact-${factId++}`,
          category: 'measurements',
          label: 'Annulus Dimensions',
          value: dimText,
          sourceField: 'preImplant.annulusDimensions',
          critical: true,
          status: 'pending',
          unit: 'mm/cm²'
        });
      }
    }

    // Access approach
    if (taviData.accessApproach?.primary) {
      facts.push({
        id: `tavi-fact-${factId++}`,
        category: 'access',
        label: 'Access Route',
        value: taviData.accessApproach.primary,
        sourceField: 'accessApproach.primary',
        critical: false,
        status: 'pending',
        unit: ''
      });
    }

    // Pre-implant haemodynamics
    if (hemodynamics?.preImplant) {
      const pre = hemodynamics.preImplant;
      if (pre.meanGradient) {
        facts.push({
          id: `tavi-fact-${factId++}`,
          category: 'haemodynamics',
          label: 'Pre-Implant Mean Gradient',
          value: pre.meanGradient,
          sourceField: 'hemodynamics.preImplant.meanGradient',
          critical: false,
          status: 'pending',
          unit: 'mmHg'
        });
      }

      if (pre.valveArea) {
        facts.push({
          id: `tavi-fact-${factId++}`,
          category: 'haemodynamics',
          label: 'Pre-Implant AVA',
          value: pre.valveArea,
          sourceField: 'hemodynamics.preImplant.valveArea',
          critical: false,
          status: 'pending',
          unit: 'cm²'
        });
      }
    }

    // Post-implant haemodynamics (CRITICAL for success)
    if (hemodynamics?.postImplant) {
      const post = hemodynamics.postImplant;
      if (post.meanGradient) {
        facts.push({
          id: `tavi-fact-${factId++}`,
          category: 'haemodynamics',
          label: 'Post-Implant Mean Gradient',
          value: post.meanGradient,
          sourceField: 'hemodynamics.postImplant.meanGradient',
          critical: true,
          status: 'pending',
          unit: 'mmHg'
        });
      }
    }

    // Post-implant AR from TAVIData (CRITICAL for success)
    if (taviData.postImplant?.aorticRegurgitation) {
      facts.push({
        id: `tavi-fact-${factId++}`,
        category: 'haemodynamics',
        label: 'Post-Implant AR',
        value: taviData.postImplant.aorticRegurgitation,
        sourceField: 'postImplant.aorticRegurgitation',
        critical: true,
        status: 'pending',
        unit: ''
      });
    }

    // Contrast and fluoroscopy (safety documentation)
    if (taviData.proceduralDetails?.contrastVolume) {
      facts.push({
        id: `tavi-fact-${factId++}`,
        category: 'resources',
        label: 'Contrast Volume',
        value: taviData.proceduralDetails.contrastVolume,
        sourceField: 'proceduralDetails.contrastVolume',
        critical: false,
        status: 'pending',
        unit: 'mL'
      });
    }

    if (taviData.proceduralDetails?.fluoroscopyTime) {
      facts.push({
        id: `tavi-fact-${factId++}`,
        category: 'resources',
        label: 'Fluoroscopy Time',
        value: taviData.proceduralDetails.fluoroscopyTime,
        sourceField: 'proceduralDetails.fluoroscopyTime',
        critical: false,
        status: 'pending',
        unit: 'min'
      });
    }

    console.log(`✅ Extracted ${facts.length} key facts for TAVI proof mode`);
    return facts;
  }

  /**
   * Apply locked facts from proof mode to extracted data
   * Overrides extracted values with user-confirmed values
   */
  private applyLockedFacts(
    lockedFacts: Record<string, string>,
    taviData: TAVIData,
    hemodynamics: HemodynamicData
  ): void {
    console.log('[TAVIAgent] Applying locked facts to extracted data...');

    for (const [sourceField, confirmedValue] of Object.entries(lockedFacts)) {
      const [dataType, ...fieldPath] = sourceField.split('.');
      const field = fieldPath.join('.');

      try {
        if (dataType === 'valveDetails') {
          // Apply to valve data
          if (field === 'size') {
            taviData.valveDetails.size = confirmedValue as ValveSize;
            console.log(`  ✓ Locked valve size: ${confirmedValue}`);
          } else if (field === 'manufacturer') {
            taviData.valveDetails.manufacturer = confirmedValue as ValveManufacturer;
            console.log(`  ✓ Locked valve manufacturer: ${confirmedValue}`);
          } else if (field === 'model') {
            taviData.valveDetails.model = confirmedValue;
            console.log(`  ✓ Locked valve model: ${confirmedValue}`);
          } else if (field === 'manufacturer+size') {
            // Combined field - parse it
            const parts = confirmedValue.split(' ');
            const size = parts[parts.length - 1];
            const manufacturer = parts.slice(0, -1).join(' ');
            if (size && this.valveSizes[size]) {
              taviData.valveDetails.size = size as ValveSize;
            }
            if (manufacturer) {
              taviData.valveDetails.manufacturer = manufacturer as ValveManufacturer;
            }
            console.log(`  ✓ Locked valve: ${confirmedValue}`);
          }
        } else if (dataType === 'preImplant') {
          // Apply to pre-implant data
          if (field === 'annulusDimensions.minDiameter') {
            if (!taviData.preImplant.annulusDimensions) {
              taviData.preImplant.annulusDimensions = {};
            }
            taviData.preImplant.annulusDimensions.minDiameter = confirmedValue;
            console.log(`  ✓ Locked annulus min diameter: ${confirmedValue}`);
          } else if (field === 'annulusDimensions.maxDiameter') {
            if (!taviData.preImplant.annulusDimensions) {
              taviData.preImplant.annulusDimensions = {};
            }
            taviData.preImplant.annulusDimensions.maxDiameter = confirmedValue;
            console.log(`  ✓ Locked annulus max diameter: ${confirmedValue}`);
          } else if (field === 'annulusDimensions.perimeter') {
            if (!taviData.preImplant.annulusDimensions) {
              taviData.preImplant.annulusDimensions = {};
            }
            taviData.preImplant.annulusDimensions.perimeter = confirmedValue;
            console.log(`  ✓ Locked annulus perimeter: ${confirmedValue}`);
          } else if (field === 'annulusDimensions.area') {
            if (!taviData.preImplant.annulusDimensions) {
              taviData.preImplant.annulusDimensions = {};
            }
            taviData.preImplant.annulusDimensions.area = confirmedValue;
            console.log(`  ✓ Locked annulus area: ${confirmedValue}`);
          }
        } else if (dataType === 'hemodynamics') {
          // Apply to hemodynamic data
          const [phase, measurement] = fieldPath;
          if (phase === 'preImplant') {
            if (measurement === 'meanGradient') {
              hemodynamics.preImplant.meanGradient = confirmedValue;
              console.log(`  ✓ Locked pre-implant mean gradient: ${confirmedValue}`);
            } else if (measurement === 'peakGradient') {
              hemodynamics.preImplant.peakGradient = confirmedValue;
              console.log(`  ✓ Locked pre-implant peak gradient: ${confirmedValue}`);
            }
          } else if (phase === 'postImplant') {
            if (measurement === 'meanGradient') {
              hemodynamics.postImplant.meanGradient = confirmedValue;
              console.log(`  ✓ Locked post-implant mean gradient: ${confirmedValue}`);
            } else if (measurement === 'peakGradient') {
              hemodynamics.postImplant.peakGradient = confirmedValue;
              console.log(`  ✓ Locked post-implant peak gradient: ${confirmedValue}`);
            }
          }
        } else if (dataType === 'postImplant') {
          // Apply to post-implant data
          if (field === 'aorticRegurgitation') {
            taviData.postImplant.aorticRegurgitation = confirmedValue as AorticRegurgitationGrade;
            console.log(`  ✓ Locked aortic regurgitation: ${confirmedValue}`);
          }
        } else if (dataType === 'proceduralDetails') {
          // Apply to procedural details
          if (field === 'contrastVolume') {
            taviData.proceduralDetails.contrastVolume = confirmedValue;
            console.log(`  ✓ Locked contrast volume: ${confirmedValue}`);
          } else if (field === 'fluoroscopyTime') {
            taviData.proceduralDetails.fluoroscopyTime = confirmedValue;
            console.log(`  ✓ Locked fluoroscopy time: ${confirmedValue}`);
          }
        }
      } catch (error) {
        console.warn(`  ⚠️ Failed to apply locked fact ${sourceField}:`, error);
      }
    }

    console.log('[TAVIAgent] ✅ Locked facts applied successfully');
  }
}
