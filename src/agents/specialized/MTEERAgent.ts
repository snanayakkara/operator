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
  MRSeverityGrade,
  ValidationResult,
  MTEERExtractedData
} from '@/types/medical.types';
import { LMStudioService, MODEL_CONFIG } from '@/services/LMStudioService';
import { systemPromptLoader } from '@/services/SystemPromptLoader';
import { MTEERMedicalPatterns, MTEERValidationRules, MTEERSystemPrompts } from './MTEERSystemPrompts';

/**
 * Specialized agent for processing Mitral Transcatheter Edge-to-Edge Repair (mTEER) procedures.
 * Handles MitraClip and PASCAL device deployments with comprehensive TOE guidance documentation
 * and mitral regurgitation assessment following Australian medical terminology.
 */
export class MTEERAgent extends MedicalAgent {
  private lmStudioService: LMStudioService;
  private systemPromptInitialized = false;
  
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
      '' // Will be loaded dynamically
    );
    this.lmStudioService = LMStudioService.getInstance();
  }

  private async initializeSystemPrompt(): Promise<void> {
    if (this.systemPromptInitialized) return;

    try {
      this.systemPrompt = await systemPromptLoader.loadSystemPrompt('mteer', 'primary');
      this.systemPromptInitialized = true;
    } catch (error) {
      console.error('❌ MTEERAgent: Failed to load system prompt:', error);
      this.systemPrompt = 'You are a specialist interventional cardiologist generating mTEER procedural reports for medical records.'; // Fallback
    }
  }

  async process(input: string, context?: MedicalContext): Promise<MTEERReport> {
    await this.initializeSystemPrompt();

    const startTime = Date.now();
    
    try {
      // Store input in memory
      this.updateMemory('currentInput', input);
      this.updateMemory('processingContext', context);

      // Correct mTEER-specific terminology with Australian spelling
      const correctedInput = this.correctMTEERTerminology(input);

      // Phase 1.5: Regex extraction + quick-model validation
      console.log('🚨 MTEER AGENT: Starting validation workflow...');
      const regexExtracted = this.extractMTEERValidationData(correctedInput);
      console.log('📋 Regex extracted:', JSON.stringify(regexExtracted, null, 2));

      const validation = await this.validateAndDetectGaps(regexExtracted, correctedInput);
      const correctedData = this.applyCorrections(regexExtracted, validation.corrections, 0.8);

      // Interactive checkpoint - require user input if critical gaps remain
      // Only trigger checkpoint if there are ACTUALLY critical fields (critical: true)
      const hasCriticalGaps = validation.missingCritical.some(field => field.critical === true);
      const hasLowConfidenceCorrections = validation.corrections.some(correction => correction.confidence < 0.8);

      if (hasCriticalGaps || hasLowConfidenceCorrections) {
        const criticalCount = validation.missingCritical.filter(f => f.critical === true).length;
        console.log(`⚠️ MTEER AGENT: Validation requires user input (${criticalCount} critical fields missing, ${validation.corrections.filter(c => c.confidence < 0.8).length} low-confidence corrections)`);

        const baseReport = this.createReport('', [], context, 0, 0);
        return {
          ...baseReport,
          mteerData: this.getEmptyMTEERData(),
          mitralRegurgitation: this.getEmptyMitralRegurgitationData(),
          clipAssessment: this.getEmptyClipAssessment(),
          complications: [],
          status: 'awaiting_validation',
          validationResult: validation,
          extractedData: correctedData
        };
      }

      // Merge user-provided fields from validation modal
      let finalData = correctedData;
      if (context?.userProvidedFields) {
        console.log('🚨 MTEER AGENT: Merging user-provided fields...');
        finalData = this.mergeUserInput(correctedData, context.userProvidedFields);
      }

      console.log('✅ MTEER AGENT: Validation complete, proceeding to reasoning model');

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

  protected async buildMessages(input: string, _context?: MedicalContext): Promise<ChatMessage[]> {
    await this.initializeSystemPrompt();

    return [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: `Please analyze this mTEER procedural dictation and generate a comprehensive report:\n\n"${input}"\n\nGenerate a comprehensive mTEER procedural report with clip deployment and mitral regurgitation assessment. Use Australian medical terminology (TOE, anaesthesia, colour Doppler) and proper clinical formatting.` }
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
  // ============================================================
  // Validation workflow methods (regex extraction + quick model)
  // ============================================================

  private extractMTEERValidationData(input: string): MTEERExtractedData {
    const extracted: MTEERExtractedData = {};

    // Mitral regurgitation pre/post grading
    const preGradeMatch = input.match(/(?:pre(?:-|\s)?(?:procedure|deployment)|baseline)[^.\n]{0,120}?(?:mr|mitral regurgitation)\s*(?:grade\s*)?(?:was\s*)?((?:[1-4]\+)|(?:moderate-severe|moderately\s+severe|severe|moderate|mild))/i);
    const postGradeMatch = input.match(/(?:post(?:-|\s)?(?:procedure|deployment)|after\s+(?:clip|deployment)|final)[^.\n]{0,120}?(?:mr|mitral regurgitation)\s*(?:grade\s*)?(?:is\s*)?((?:[1-4]\+)|(?:moderate-severe|moderately\s+severe|severe|moderate|mild))/i);

    if (preGradeMatch || postGradeMatch) {
      extracted.mitralRegurgitation = {
        preGrade: preGradeMatch ? preGradeMatch[1] : undefined,
        postGrade: postGradeMatch ? postGradeMatch[1] : undefined,
        preMRGrade: preGradeMatch ? preGradeMatch[1] : undefined,
        postMRGrade: postGradeMatch ? postGradeMatch[1] : undefined
      };
    }

    // Clip details
    const clipTypeMatch = input.match(/(mitraclip\s+(?:ntw|nt|xtw)|pascal\s+(?:p10|ace))/i);
    const clipSizeMatch = input.match(/(?:clip\s+size|size|clip)\s*(\d+(?:\.\d+)?)\s*mm/i);
    const clipNumberMatch = input.match(/(\d+)\s+(?:clip|clips|devices)\s+(?:were\s+)?(?:deployed|implanted|placed|used)/i);

    if (clipTypeMatch || clipSizeMatch || clipNumberMatch) {
      const clipTypeKey = clipTypeMatch ? (clipTypeMatch[1] || clipTypeMatch[0]).toLowerCase() : undefined;
      extracted.clipDetails = {
        type: clipTypeKey ? (this.clipTypes[clipTypeKey] || clipTypeMatch?.[0]) : undefined,
        size: clipSizeMatch ? `${clipSizeMatch[1]} mm` : undefined,
        number: clipNumberMatch ? parseInt(clipNumberMatch[1], 10) : undefined
      };
    }

    // Anatomical location (A2-P2 etc.)
    const locationMatch = input.match(/(a[1-3]\s*[-]\s*p[1-3]|a[1-3]p[1-3]|commissural)/i);
    if (locationMatch) {
      const locationRaw = (locationMatch[1] || '').toUpperCase().replace(/\s+/g, '');
      const formattedLocation = locationRaw.includes('-') ? locationRaw.replace(/\s+/g, '') : locationRaw.replace(/([AP][1-3])([AP][1-3])/, '$1-$2');
      extracted.anatomicalLocation = formattedLocation;
    }

    // EROA measurements (pre/post)
    const preEroaMatch = input.match(/(?:pre(?:-|\s)?(?:procedure|deployment)|baseline)[^.\n]{0,120}?eroa\s+(?:of\s+)?(\d+\.?\d*)\s*cm²?/i);
    const postEroaMatch = input.match(/(?:post(?:-|\s)?(?:procedure|deployment)|after\s+(?:clip|deployment)|final)[^.\n]{0,120}?eroa\s+(?:of\s+)?(\d+\.?\d*)\s*cm²?/i);
    if (preEroaMatch || postEroaMatch) {
      extracted.eroa = {
        pre: preEroaMatch ? parseFloat(preEroaMatch[1]) : undefined,
        post: postEroaMatch ? parseFloat(postEroaMatch[1]) : undefined
      };
    }

    // Transmitral gradient (pre/post)
    const preGradientMatch = input.match(/(?:pre(?:-|\s)?(?:procedure|deployment)|baseline)[^.\n]{0,120}?transmitral\s+gradient\s+(?:of\s+)?(\d+\.?\d*)\s*(?:mm\s*hg|mmhg)/i);
    const postGradientMatch = input.match(/(?:post(?:-|\s)?(?:procedure|deployment)|after\s+(?:clip|deployment)|final)[^.\n]{0,120}?transmitral\s+gradient\s+(?:of\s+)?(\d+\.?\d*)\s*(?:mm\s*hg|mmhg)/i);
    if (preGradientMatch || postGradientMatch) {
      extracted.transmitralGradient = {
        pre: preGradientMatch ? parseFloat(preGradientMatch[1]) : undefined,
        post: postGradientMatch ? parseFloat(postGradientMatch[1]) : undefined
      };
    }

    return extracted;
  }

  private async validateAndDetectGaps(
    extracted: MTEERExtractedData,
    transcription: string
  ): Promise<ValidationResult> {
    console.log('🔍 MTEER AGENT: Starting quick model validation...');

    try {
      const userMessage = `REGEX EXTRACTED:\n${JSON.stringify(extracted, null, 2)}\n\nTRANSCRIPTION:\n${transcription}\n\nValidate the extraction and output JSON only.`;

      const response = await this.lmStudioService.processWithAgent(
        MTEERSystemPrompts.dataValidationPrompt,
        userMessage,
        'mteer-validation',
        undefined,
        MODEL_CONFIG.QUICK_MODEL
      );

      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : response;

      try {
        const validationResult = JSON.parse(jsonString);
        console.log('✅ MTEER AGENT: Validation complete');
        console.log(`   - Corrections: ${validationResult.corrections.length}`);
        console.log(`   - Missing critical: ${validationResult.missingCritical.length}`);
        console.log(`   - Missing optional: ${validationResult.missingOptional.length}`);
        console.log(`   - Confidence: ${typeof validationResult.confidence === 'number' ? validationResult.confidence.toFixed(2) : 'n/a'}`);
        return validationResult;
      } catch (parseError) {
        console.error('❌ Failed to parse mTEER validation JSON:', parseError);
        return {
          corrections: [],
          missingCritical: [],
          missingOptional: [],
          confidence: 0.5
        };
      }
    } catch (error) {
      console.error('❌ MTEER AGENT: Validation request failed:', error);
      return {
        corrections: [],
        missingCritical: [],
        missingOptional: [],
        confidence: 0.5
      };
    }
  }

  private applyCorrections(
    extracted: MTEERExtractedData,
    corrections: ValidationResult['corrections'],
    confidenceThreshold: number = 0.8
  ): MTEERExtractedData {
    const result = JSON.parse(JSON.stringify(extracted)) as MTEERExtractedData;

    for (const correction of corrections) {
      if (correction.confidence >= confidenceThreshold) {
        this.setNestedField(result, correction.field, correction.correctValue);
        console.log(`✅ Auto-corrected ${correction.field}: ${correction.regexValue} → ${correction.correctValue}`);
      }
    }

    return result;
  }

  private mergeUserInput(
    extracted: MTEERExtractedData,
    userFields: Record<string, unknown>
  ): MTEERExtractedData {
    const result = JSON.parse(JSON.stringify(extracted)) as MTEERExtractedData;

    for (const [fieldPath, value] of Object.entries(userFields)) {
      if (value !== null && value !== undefined && value !== '') {
        this.setNestedField(result, fieldPath, value);
        console.log(`✅ User-provided ${fieldPath}: ${value as string}`);
      }
    }

    return result;
  }

  private setNestedField(obj: any, path: string, value: unknown): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key]) current[key] = {};
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
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
