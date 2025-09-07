import { MedicalAgent } from '@/agents/base/MedicalAgent';
import type { 
  MedicalContext, 
  ChatMessage, 
  ReportSection, 
  MTEERReport,
  MTEERData,
  MitralRegurgitationData,
  ClipAssessment,
  MTEERComplication,
  ClipType,
  MRSeverityGrade
} from '@/types/medical.types';
import { LMStudioService, MODEL_CONFIG } from '@/services/LMStudioService';
import { MTEERSystemPrompts, MTEERMedicalPatterns, MTEERValidationRules } from './MTEERSystemPrompts';

/**
 * Specialized agent for processing Mitral Transcatheter Edge-to-Edge Repair (mTEER) procedures.
 * Handles MitraClip and PASCAL device deployments with comprehensive TOE guidance documentation
 * and mitral regurgitation assessment following Australian medical terminology.
 */
export class MTEERAgent extends MedicalAgent {
  private lmStudioService: LMStudioService;
  
  // mTEER-specific medical knowledge
  private readonly clipTypes: Record<string, ClipType> = {
    'mitraclip nt': 'MitraClip NT',
    'mitraclip ntw': 'MitraClip NTW',
    'mitraclip xtw': 'MitraClip XTW',
    'pascal p10': 'PASCAL P10',
    'pascal ace': 'PASCAL ACE'
  };

  private readonly mrGrades: Record<string, MRSeverityGrade> = {
    '1+': 'mild',
    '2+': 'moderate',
    '3+': 'moderate-severe',
    '4+': 'severe'
  };

  private readonly anatomicalLocations: Record<string, string> = {
    'a2-p2': 'A2-P2 level',
    'a1-p1': 'A1-P1 level',
    'a3-p3': 'A3-P3 level',
    'commissural': 'Commissural level'
  };

  // Medical terminology corrections for mTEER with Australian spelling
  private readonly mteerTerminologyCorrections: Record<string, string> = {
    'mitral transcatheter edge to edge repair': 'mTEER',
    'mitraclip': 'MitraClip',
    'pascal clip': 'PASCAL',
    'transesophageal': 'transoesophageal',
    'esophageal': 'oesophageal',
    'tee': 'TOE', // Critical Australian correction
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
      'mTEER Procedure Agent',
      'Interventional Cardiology',
      'Generates comprehensive mTEER procedural reports with clip deployment and mitral regurgitation assessment',
      'mteer',
      'You are a specialist interventional cardiologist generating mTEER procedural reports for medical records.'
    );
    this.lmStudioService = LMStudioService.getInstance();
  }

  async process(input: string, context?: MedicalContext): Promise<MTEERReport> {
    const startTime = Date.now();
    
    try {
      // Store input in memory
      this.updateMemory('currentInput', input);
      this.updateMemory('processingContext', context);

      // Correct mTEER-specific terminology with Australian spelling
      const correctedInput = this.correctMTEERTerminology(input);
      
      // Extract mTEER data from input
      const mteerData = this.extractMTEERData(correctedInput);
      
      // Analyze mitral regurgitation
      const mitralRegurgitation = this.extractMitralRegurgitationData(correctedInput);
      
      // Assess clip deployment and positioning
      const clipAssessment = this.assessClipDeployment(correctedInput);
      
      // Identify complications
      const complications = this.identifyComplications(correctedInput);

      // Build messages for LLM processing - interface compliance
      
      // Generate structured report content
      const reportContent = await this.generateStructuredReport(
        mteerData, 
        mitralRegurgitation, 
        clipAssessment, 
        complications,
        correctedInput
      );

      // Parse response into sections
      const sections = this.parseResponse(reportContent, context);

      // Create comprehensive mTEER report
      const processingTime = Date.now() - startTime;
      const report: MTEERReport = {
        ...this.createReport(reportContent, sections, context, processingTime, 0.95),
        mteerData,
        mitralRegurgitation,
        clipAssessment,
        complications
      };

      // Store procedure in memory
      this.addProcedureMemory('mTEER', {
        clips: clipAssessment.clipsDeployed,
        finalMRGrade: mitralRegurgitation.postProcedure.mrGrade,
        complications: complications.length
      }, clipAssessment.deploymentSuccess);

      return report;

    } catch (error) {
      console.error('mTEER processing error:', error);
      
      // Return fallback report
      const processingTime = Date.now() - startTime;
      return {
        ...this.createReport(
          `mTEER processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          [],
          context,
          processingTime,
          0.1
        ),
        mteerData: this.getEmptyMTEERData(),
        mitralRegurgitation: this.getEmptyMitralRegurgitationData(),
        clipAssessment: this.getEmptyClipAssessment(),
        complications: []
      };
    }
  }

  protected buildMessages(input: string, _context?: MedicalContext): ChatMessage[] {
    // Use centralized system prompts from MTEERSystemPrompts
    const systemPrompt = MTEERSystemPrompts.mteerProcedureAgent.systemPrompt;
    const userPrompt = MTEERSystemPrompts.mteerProcedureAgent.userPromptTemplate.replace('{input}', input);

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

  private correctMTEERTerminology(text: string): string {
    let correctedText = text;
    
    // Apply mTEER-specific terminology corrections
    for (const [incorrect, correct] of Object.entries(this.mteerTerminologyCorrections)) {
      const regex = new RegExp(incorrect, 'gi');
      correctedText = correctedText.replace(regex, correct);
    }

    // Apply Australian spelling from validation rules
    for (const { us, au } of MTEERValidationRules.australianSpelling) {
      const regex = new RegExp(`\\b${us}\\b`, 'gi');
      correctedText = correctedText.replace(regex, au);
    }

    // Preserve clinical phrases from validation rules
    for (const phrase of MTEERValidationRules.clinicalPhrases) {
      const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      if (regex.test(correctedText)) {
        // Ensure proper capitalization of preserved clinical phrases
        correctedText = correctedText.replace(regex, phrase);
      }
    }

    return correctedText;
  }

  private extractMTEERData(input: string): MTEERData {
    return {
      procedureType: 'mTEER',
      indication: this.extractIndication(input),
      anatomicalAssessment: this.extractAnatomicalAssessment(input),
      deviceDetails: this.extractDeviceDetails(input),
      proceduralDetails: this.extractProceduralDetails(input),
      immediateOutcomes: this.extractImmediateOutcomes(input),
      recommendations: this.extractRecommendations(input),
      followUp: this.extractFollowUp(input)
    };
  }

  private extractMitralRegurgitationData(input: string): MitralRegurgitationData {
    const text = input.toLowerCase();
    
    // Use enhanced patterns from MTEERSystemPrompts
    const eroaPattern = MTEERMedicalPatterns.eroa;
    const regurgitantVolumePattern = MTEERMedicalPatterns.regurgitantVolume;

    // Split text into pre/post sections
    const parts = text.split(/(?:post[-\s]?(?:procedure|deployment|clip)|after\s+(?:clip|deployment)|final|immediate\s+(?:assessment|outcome))/i);
    const preText = parts[0] || '';
    const postText = parts.length > 1 ? parts[1] : '';

    // Extract pre-procedure measurements
    const preMRGrade = this.extractMRGrade(preText);
    const preEROA = this.extractMeasurement(preText, eroaPattern);
    const preRegurgitantVolume = this.extractMeasurement(preText, regurgitantVolumePattern);

    // Extract post-procedure measurements
    const postMRGrade = this.extractMRGrade(postText) || this.extractMRGrade(input); // Fallback to full text
    const postRegurgitantVolume = this.extractMeasurement(postText, regurgitantVolumePattern);

    // Determine aetiology
    const aetiology = this.extractMRAetiology(input);

    return {
      preProcedure: {
        mrGrade: preMRGrade,
        eroa: preEROA ? `${preEROA} cm²` : '',
        regurgitantVolume: preRegurgitantVolume ? `${preRegurgitantVolume} ml` : '',
        aetiology
      },
      postProcedure: {
        mrGrade: postMRGrade,
        regurgitantVolume: postRegurgitantVolume ? `${postRegurgitantVolume} ml` : '',
        transmitralGradient: this.extractTransmitralGradient(input)
      },
      improvement: this.calculateMRImprovement(preMRGrade, postMRGrade)
    };
  }

  private assessClipDeployment(input: string): ClipAssessment {
    const text = input.toLowerCase();
    
    // Assess deployment success
    let deploymentSuccess: 'successful' | 'complicated' | 'unknown' = 'unknown';
    if (text.includes('satisfactory') && (text.includes('capture') || text.includes('deployment'))) {
      deploymentSuccess = 'successful';
    } else if (text.includes('failed') || text.includes('unsuccessful')) {
      deploymentSuccess = 'complicated';
    }

    // Count clips deployed
    const clipMatch = text.match(MTEERMedicalPatterns.clipNumbers);
    const clipsDeployed = clipMatch ? parseInt(clipMatch[1]) : 1;

    // Assess leaflet capture
    const leafletCapture = text.includes('satisfactory') && text.includes('capture') ? 'satisfactory' : 
                          text.includes('adequate') && text.includes('capture') ? 'adequate' : 'unknown';

    // Extract positioning
    const positioning = this.extractClipPositioning(input);

    // Extract complications
    const complications = this.extractDeploymentComplications(text);

    return {
      deploymentSuccess,
      clipsDeployed,
      leafletCapture,
      positioning,
      complications
    };
  }

  private identifyComplications(input: string): MTEERComplication[] {
    const text = input.toLowerCase();
    const complications: MTEERComplication[] = [];

    // Check for specific complications
    const complicationPatterns = [
      {
        pattern: MTEERMedicalPatterns.leafletTear,
        type: 'leaflet_tear' as const,
        severity: 'major' as const
      },
      {
        pattern: MTEERMedicalPatterns.chordaeRupture,
        type: 'chordae_rupture' as const,
        severity: 'major' as const
      },
      {
        pattern: MTEERMedicalPatterns.cardiacTamponade,
        type: 'cardiac_tamponade' as const,
        severity: 'life-threatening' as const
      },
      {
        pattern: MTEERMedicalPatterns.residualShunt,
        type: 'residual_shunt' as const,
        severity: 'minor' as const
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
    mteerData: MTEERData,
    mitralRegurgitation: MitralRegurgitationData,
    clipAssessment: ClipAssessment,
    complications: MTEERComplication[],
    originalInput: string
  ): Promise<string> {
    console.log(`🔧 Generating mTEER report with LMStudio ${MODEL_CONFIG.REASONING_MODEL}...`);
    
    try {
      // Use simplified context to prevent system overload
      const summaryContext = {
        clips: clipAssessment.clipsDeployed,
        preMR: mitralRegurgitation.preProcedure.mrGrade,
        postMR: mitralRegurgitation.postProcedure.mrGrade,
        device: `${mteerData.deviceDetails.manufacturer} ${mteerData.deviceDetails.model}`,
        complications: complications.length
      };
      
      // Use LMStudio with proper agent type and simplified context to prevent performance issues
      const contextualPrompt = `${this.systemPrompt}

SIMPLIFIED CONTEXT: ${JSON.stringify(summaryContext)}

Generate a comprehensive mTEER procedural report using the following dictation. Focus on clip deployment, mitral regurgitation assessment, and outcomes. Use proper Australian medical terminology (TOE, anaesthesia, colour Doppler) and structured formatting.`;

      const report = await this.lmStudioService.processWithAgent(contextualPrompt, originalInput, 'mteer');
      
      console.log('✅ mTEER report generated successfully');
      return report;
      
    } catch (error) {
      console.error('❌ Error generating mTEER report:', error);
      
      // Fallback to basic structured format if LMStudio fails
      return `**MITRAL TRANSCATHETER EDGE-TO-EDGE REPAIR REPORT**

**INDICATION**: ${mteerData.indication || '[Not specified in dictation]'}

**PROCEDURE**: 
- Device: ${mteerData.deviceDetails.manufacturer} ${mteerData.deviceDetails.model}
- Clips Deployed: ${clipAssessment.clipsDeployed}
- Positioning: ${clipAssessment.positioning}
- Leaflet Capture: ${clipAssessment.leafletCapture}

**MITRAL REGURGITATION ASSESSMENT**: 
- Pre-procedure: ${mitralRegurgitation.preProcedure.mrGrade} (${mitralRegurgitation.preProcedure.aetiology})
- Post-procedure: ${mitralRegurgitation.postProcedure.mrGrade}
- Improvement: ${mitralRegurgitation.improvement}

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

  private extractMRGrade(text: string): MRSeverityGrade {
    const gradeMatch = text.match(MTEERMedicalPatterns.mrGrade);
    if (gradeMatch) {
      const grade = gradeMatch[1];
      return this.mrGrades[grade] || 'moderate';
    }
    
    // Fallback to severity description
    if (text.includes('severe')) return 'severe';
    if (text.includes('moderate-severe')) return 'moderate-severe';
    if (text.includes('moderate')) return 'moderate';
    if (text.includes('mild')) return 'mild';
    
    return 'moderate';
  }

  private extractMRAetiology(input: string): 'degenerative' | 'functional' | 'mixed' | 'unknown' {
    const text = input.toLowerCase();
    
    if (text.includes('degenerative')) return 'degenerative';
    if (text.includes('functional')) return 'functional';
    if (text.includes('mixed')) return 'mixed';
    
    return 'unknown';
  }

  private extractTransmitralGradient(input: string): string {
    const gradientMatch = input.match(/transmitral\s+gradient\s+(?:of\s+)?(\d+)\s*mm\s*hg/i);
    return gradientMatch ? `${gradientMatch[1]} mmHg` : '';
  }

  private calculateMRImprovement(preMR: MRSeverityGrade, postMR: MRSeverityGrade): string {
    const gradeValues = { 'mild': 1, 'moderate': 2, 'moderate-severe': 3, 'severe': 4 };
    const preValue = gradeValues[preMR] || 0;
    const postValue = gradeValues[postMR] || 0;
    const improvement = preValue - postValue;
    
    if (improvement >= 2) return 'Significant improvement';
    if (improvement === 1) return 'Moderate improvement';
    if (improvement === 0) return 'No change';
    return 'Minimal change';
  }

  private extractIndication(input: string): string {
    const indicationPattern = /indication[:\s]+([^.]+)/i;
    const match = input.match(indicationPattern);
    return match ? match[1].trim() : '';
  }

  private extractAnatomicalAssessment(input: string) {
    return {
      leafletMorphology: this.extractValue(input, /leaflet\s+morphology[:\s]+([^.]+)/i) || '',
      coaptationLength: this.extractValue(input, /coaptation\s+length[:\s]+([^.]+)/i) || '',
      calcification: this.extractValue(input, /calcification[:\s]+([^.]+)/i) || '',
      mobility: this.extractValue(input, /mobility[:\s]+([^.]+)/i) || ''
    };
  }

  private extractDeviceDetails(input: string) {
    const text = input.toLowerCase();
    
    // Determine device manufacturer and model
    let manufacturer = 'Abbott';
    let model = 'MitraClip';
    
    if (text.includes('pascal')) {
      manufacturer = 'Edwards';
      model = text.includes('ace') ? 'PASCAL ACE' : 'PASCAL P10';
    } else if (text.includes('mitraclip')) {
      if (text.includes('xtw')) model = 'MitraClip XTW';
      else if (text.includes('ntw')) model = 'MitraClip NTW';
      else if (text.includes('nt')) model = 'MitraClip NT';
    }

    return {
      manufacturer,
      model,
      deliverySystem: this.extractValue(input, /delivery\s+system[:\s]+([^.]+)/i) || '',
      guideCatheter: this.extractValue(input, /guide\s+catheter[:\s]+([^.]+)/i) || ''
    };
  }

  private extractProceduralDetails(input: string) {
    return {
      toeGuidance: input.toLowerCase().includes('toe') ? 'Comprehensive TOE guidance' : '',
      transseptalPuncture: this.extractValue(input, /transseptal[:\s]+([^.]+)/i) || '',
      clipDeployment: this.extractValue(input, /deployment[:\s]+([^.]+)/i) || '',
      leafletCapture: this.extractValue(input, /capture[:\s]+([^.]+)/i) || ''
    };
  }

  private extractClipPositioning(input: string): string {
    const text = input.toLowerCase();
    
    for (const [key, location] of Object.entries(this.anatomicalLocations)) {
      if (text.includes(key)) {
        return location;
      }
    }
    
    return this.extractValue(input, /(?:clip\s+)?position[:\s]+([^.]+)/i) || '';
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
    
    if (text.includes('leaflet tear')) complications.push('leaflet_tear');
    if (text.includes('inadequate capture')) complications.push('inadequate_capture');
    if (text.includes('malposition')) complications.push('malposition');
    if (text.includes('clip detachment')) complications.push('clip_detachment');
    
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
  private getEmptyMTEERData(): MTEERData {
    return {
      procedureType: 'mTEER',
      indication: '',
      anatomicalAssessment: {
        leafletMorphology: '',
        coaptationLength: '',
        calcification: '',
        mobility: ''
      },
      deviceDetails: {
        manufacturer: 'Abbott',
        model: 'MitraClip',
        deliverySystem: '',
        guideCatheter: ''
      },
      proceduralDetails: {
        toeGuidance: '',
        transseptalPuncture: '',
        clipDeployment: '',
        leafletCapture: ''
      },
      immediateOutcomes: '',
      recommendations: '',
      followUp: ''
    };
  }

  private getEmptyMitralRegurgitationData(): MitralRegurgitationData {
    return {
      preProcedure: {
        mrGrade: 'moderate',
        eroa: '',
        regurgitantVolume: '',
        aetiology: 'unknown'
      },
      postProcedure: {
        mrGrade: 'moderate',
        regurgitantVolume: '',
        transmitralGradient: ''
      },
      improvement: 'No change'
    };
  }

  private getEmptyClipAssessment(): ClipAssessment {
    return {
      deploymentSuccess: 'unknown',
      clipsDeployed: 1,
      leafletCapture: 'unknown',
      positioning: '',
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