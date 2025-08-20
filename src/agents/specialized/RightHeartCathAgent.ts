import { MedicalAgent } from '@/agents/base/MedicalAgent';
import type { 
  MedicalContext, 
  ChatMessage, 
  ReportSection, 
  RightHeartCathReport,
  RightHeartCathData,
  HaemodynamicPressures,
  CardiacOutput,
  ExerciseHaemodynamics,
  RHCComplication,
  VenousAccess,
  RHCIndication
} from '@/types/medical.types';
import { LMStudioService } from '@/services/LMStudioService';
import { RightHeartCathSystemPrompts, RightHeartCathMedicalPatterns, RightHeartCathValidationRules } from './RightHeartCathSystemPrompts';

/**
 * Specialized agent for processing Right Heart Catheterisation (RHC) procedures.
 * Handles comprehensive haemodynamic assessment with structured pressure measurements,
 * cardiac output calculations, and exercise testing following Australian medical terminology.
 */
export class RightHeartCathAgent extends MedicalAgent {
  private lmStudioService: LMStudioService;
  
  // RHC-specific medical knowledge
  private readonly venousAccessSites: Record<string, VenousAccess> = {
    'basilic': 'right_basilic',
    'right basilic': 'right_basilic',
    'internal jugular': 'right_internal_jugular',
    'right internal jugular': 'right_internal_jugular',
    'femoral': 'right_femoral',
    'right femoral': 'right_femoral'
  };

  private readonly rhcIndications: Record<string, RHCIndication> = {
    'heart failure': 'heart_failure',
    'pulmonary hypertension': 'pulmonary_hypertension',
    'transplant evaluation': 'transplant_evaluation',
    'haemodynamic assessment': 'haemodynamic_assessment',
    'cardiomyopathy': 'cardiomyopathy_evaluation'
  };

  private readonly normalValues = {
    ra: { min: 2, max: 8 },
    rv_systolic: { min: 15, max: 30 },
    rv_diastolic: { min: 2, max: 8 },
    rvedp: { max: 8 },
    pa_systolic: { min: 15, max: 30 },
    pa_diastolic: { min: 4, max: 12 },
    pa_mean: { min: 9, max: 18 },
    pcwp: { min: 6, max: 15 },
    co: { min: 4, max: 8 },
    ci: { min: 2.5, max: 4.0 },
    mixed_venous_o2: { min: 65, max: 75 }
  };

  // Medical terminology corrections for RHC with Australian spelling
  private readonly rhcTerminologyCorrections: Record<string, string> = {
    'right heart cath': 'right heart catheterisation',
    'rhc': 'right heart catheterisation',
    'catheterization': 'catheterisation',
    'hemodynamic': 'haemodynamic',
    'anesthesia': 'anaesthesia',
    'color doppler': 'colour Doppler',
    'color': 'colour',
    'recognize': 'recognise',
    'optimize': 'optimise',
    'utilize': 'utilise',
    'center': 'centre',
    'pulmonary wedge': 'pulmonary capillary wedge pressure',
    'wedge pressure': 'PCWP',
    'swan ganz': 'Swan-Ganz catheter',
    'thermodilution': 'thermodilution'
  };

  constructor() {
    super(
      'Right Heart Cath Agent',
      'Cardiology',
      'Generates comprehensive right heart catheterisation procedural reports with structured haemodynamic assessment',
      'right-heart-cath',
      'You are a specialist cardiologist generating right heart catheterisation procedural reports for medical records.'
    );
    this.lmStudioService = LMStudioService.getInstance();
  }

  async process(input: string, context?: MedicalContext): Promise<RightHeartCathReport> {
    const startTime = Date.now();
    
    try {
      // Store input in memory
      this.updateMemory('currentInput', input);
      this.updateMemory('processingContext', context);

      // Correct RHC-specific terminology with Australian spelling
      const correctedInput = this.correctRHCTerminology(input);
      
      // Extract RHC data from input
      const rhcData = this.extractRHCData(correctedInput);
      
      // Analyze haemodynamic pressures
      const haemodynamicPressures = this.extractHaemodynamicPressures(correctedInput);
      
      // Assess cardiac output
      const cardiacOutput = this.extractCardiacOutput(correctedInput);
      
      // Extract exercise data if present
      const exerciseHaemodynamics = this.extractExerciseHaemodynamics(correctedInput);
      
      // Identify complications
      const complications = this.identifyComplications(correctedInput);

      // Generate structured report content
      const reportContent = await this.generateStructuredReport(
        rhcData, 
        haemodynamicPressures, 
        cardiacOutput, 
        exerciseHaemodynamics,
        complications,
        correctedInput
      );

      // Parse response into sections
      const sections = this.parseResponse(reportContent, context);

      // Create comprehensive RHC report
      const processingTime = Date.now() - startTime;
      const report: RightHeartCathReport = {
        ...this.createReport(reportContent, sections, context, processingTime, 0.95),
        rhcData,
        haemodynamicPressures,
        cardiacOutput,
        exerciseHaemodynamics,
        complications
      };

      // Store procedure in memory
      this.addProcedureMemory('RHC', {
        indication: rhcData.indication,
        accessSite: rhcData.vascularAccess,
        cardiacOutput: cardiacOutput.thermodilution.co,
        complications: complications.length
      }, 'successful');

      return report;

    } catch (error) {
      console.error('RHC processing error:', error);
      
      // Return fallback report
      const processingTime = Date.now() - startTime;
      return {
        ...this.createReport(
          `RHC processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          [],
          context,
          processingTime,
          0.1
        ),
        rhcData: this.getEmptyRHCData(),
        haemodynamicPressures: this.getEmptyHaemodynamicPressures(),
        cardiacOutput: this.getEmptyCardiacOutput(),
        exerciseHaemodynamics: null,
        complications: []
      };
    }
  }

  protected buildMessages(input: string, _context?: MedicalContext): ChatMessage[] {
    // Use centralized system prompts from RightHeartCathSystemPrompts
    const systemPrompt = RightHeartCathSystemPrompts.rightHeartCathProcedureAgent.systemPrompt;
    const userPrompt = RightHeartCathSystemPrompts.rightHeartCathProcedureAgent.userPromptTemplate.replace('{input}', input);

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

  private correctRHCTerminology(text: string): string {
    let correctedText = text;
    
    // Apply RHC-specific terminology corrections
    for (const [incorrect, correct] of Object.entries(this.rhcTerminologyCorrections)) {
      const regex = new RegExp(incorrect, 'gi');
      correctedText = correctedText.replace(regex, correct);
    }

    // Apply Australian spelling from validation rules
    for (const { us, au } of RightHeartCathValidationRules.australianSpelling) {
      const regex = new RegExp(`\\b${us}\\b`, 'gi');
      correctedText = correctedText.replace(regex, au);
    }

    // Preserve clinical phrases from validation rules
    for (const phrase of RightHeartCathValidationRules.clinicalPhrases) {
      const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      if (regex.test(correctedText)) {
        // Ensure proper capitalization of preserved clinical phrases
        correctedText = correctedText.replace(regex, phrase);
      }
    }

    return correctedText;
  }

  private extractRHCData(input: string): RightHeartCathData {
    return {
      procedureType: 'Right Heart Catheterisation',
      indication: this.extractIndication(input),
      clinicalPresentation: this.extractClinicalPresentation(input),
      recentInvestigations: this.extractRecentInvestigations(input),
      vascularAccess: this.extractVascularAccess(input),
      catheterDetails: this.extractCatheterDetails(input),
      laboratoryValues: this.extractLaboratoryValues(input),
      immediateOutcomes: this.extractImmediateOutcomes(input),
      recommendations: this.extractRecommendations(input),
      followUp: this.extractFollowUp(input)
    };
  }

  private extractHaemodynamicPressures(input: string): HaemodynamicPressures {
    
    // Use enhanced patterns from RightHeartCathSystemPrompts
    return {
      ra: {
        aWave: this.extractMeasurement(input, RightHeartCathMedicalPatterns.raPressurea),
        vWave: this.extractMeasurement(input, RightHeartCathMedicalPatterns.raPressureV),
        mean: this.extractMeasurement(input, RightHeartCathMedicalPatterns.raPressureMean)
      },
      rv: {
        systolic: this.extractMeasurement(input, RightHeartCathMedicalPatterns.rvPressureSystolic),
        diastolic: this.extractMeasurement(input, RightHeartCathMedicalPatterns.rvPressureDiastolic),
        rvedp: this.extractMeasurement(input, RightHeartCathMedicalPatterns.rvedp)
      },
      pa: {
        systolic: this.extractMeasurement(input, RightHeartCathMedicalPatterns.paPressureSystolic),
        diastolic: this.extractMeasurement(input, RightHeartCathMedicalPatterns.paPressureDiastolic),
        mean: this.extractMeasurement(input, RightHeartCathMedicalPatterns.paPressureMean)
      },
      pcwp: {
        aWave: this.extractMeasurement(input, RightHeartCathMedicalPatterns.pcwpPressureA),
        vWave: this.extractMeasurement(input, RightHeartCathMedicalPatterns.pcwpPressureV),
        mean: this.extractMeasurement(input, RightHeartCathMedicalPatterns.pcwpPressureMean)
      }
    };
  }

  private extractCardiacOutput(input: string): CardiacOutput {
    
    return {
      thermodilution: {
        co: this.extractMeasurement(input, RightHeartCathMedicalPatterns.thermodilutionCO),
        ci: this.extractMeasurement(input, RightHeartCathMedicalPatterns.thermodilutionCI)
      },
      fick: {
        co: this.extractMeasurement(input, RightHeartCathMedicalPatterns.fickCO),
        ci: this.extractMeasurement(input, RightHeartCathMedicalPatterns.fickCI)
      },
      mixedVenousO2: this.extractMeasurement(input, RightHeartCathMedicalPatterns.mixedVenousO2),
      wedgeSaturation: this.extractMeasurement(input, RightHeartCathMedicalPatterns.wedgeSaturation)
    };
  }

  private extractExerciseHaemodynamics(input: string): ExerciseHaemodynamics | null {
    const text = input.toLowerCase();
    
    // Check if exercise testing was performed
    if (!RightHeartCathMedicalPatterns.exerciseProtocol.test(text) && !RightHeartCathMedicalPatterns.postExercise.test(text)) {
      return null;
    }

    // Extract exercise duration
    const durationMatch = text.match(RightHeartCathMedicalPatterns.exerciseDuration);
    const duration = durationMatch ? parseInt(durationMatch[1]) : 2; // Default 2 minutes

    // Split text to find post-exercise measurements
    const postExerciseText = text.split(/post[-\s]?exercise/i)[1] || '';
    
    return {
      protocol: 'Straight leg raising',
      duration: `${duration} minutes`,
      preExercise: this.extractHaemodynamicPressures(input), // Use full input for baseline
      postExercise: this.extractHaemodynamicPressures(postExerciseText), // Use post-exercise text
      response: this.calculateExerciseResponse(input)
    };
  }

  private identifyComplications(input: string): RHCComplication[] {
    const text = input.toLowerCase();
    const complications: RHCComplication[] = [];

    // Check for specific complications
    const complicationPatterns = [
      {
        pattern: RightHeartCathMedicalPatterns.arrhythmias,
        type: 'arrhythmias' as const,
        severity: 'minor' as const
      },
      {
        pattern: RightHeartCathMedicalPatterns.catheterKnotting,
        type: 'catheter_knotting' as const,
        severity: 'major' as const
      },
      {
        pattern: RightHeartCathMedicalPatterns.tricuspidRegurgitation,
        type: 'tricuspid_regurgitation' as const,
        severity: 'minor' as const
      },
      {
        pattern: RightHeartCathMedicalPatterns.pneumothorax,
        type: 'pneumothorax' as const,
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
    rhcData: RightHeartCathData,
    haemodynamicPressures: HaemodynamicPressures,
    cardiacOutput: CardiacOutput,
    exerciseHaemodynamics: ExerciseHaemodynamics | null,
    complications: RHCComplication[],
    originalInput: string
  ): Promise<string> {
    console.log('🔧 Generating RHC report with LMStudio medgemma-27b...');
    
    try {
      // Prepare comprehensive context for LMStudio
      const extractedData = {
        rhcData,
        haemodynamicPressures,
        cardiacOutput,
        exerciseHaemodynamics,
        complications
      };
      
      // Use LMStudio for content generation with extracted data context
      const contextualPrompt = `${this.systemPrompt}

EXTRACTED DATA CONTEXT:
${JSON.stringify(extractedData, null, 2)}

Generate a comprehensive right heart catheterisation procedural report using the above extracted data and the following dictation. Include all relevant pressure measurements, cardiac output calculations, and haemodynamic assessments. Use proper Australian medical terminology (catheterisation, haemodynamic, colour) and structured formatting with precise units.`;

      const report = await this.lmStudioService.processWithAgent(contextualPrompt, originalInput);
      
      console.log('✅ RHC report generated successfully');
      return report;
      
    } catch (error) {
      console.error('❌ Error generating RHC report:', error);
      
      // Fallback to narrative format if LMStudio fails
      return `**PREAMBLE**
Patient underwent right heart catheterisation for ${rhcData.indication.replace('_', ' ')} assessment. ${rhcData.clinicalPresentation ? `Clinical presentation included ${rhcData.clinicalPresentation}.` : ''} ${rhcData.recentInvestigations ? `Recent investigations demonstrated ${rhcData.recentInvestigations}.` : ''} Vascular access was planned via ${rhcData.vascularAccess.replace('_', ' ')}.

**FINDINGS**
Right heart catheterisation was performed via ${rhcData.vascularAccess.replace('_', ' ')} approach with successful catheter positioning. Resting haemodynamic assessment revealed right atrial pressures with ${haemodynamicPressures.ra.aWave ? `a wave of ${haemodynamicPressures.ra.aWave} mmHg` : 'normal a wave'}, ${haemodynamicPressures.ra.vWave ? `v wave of ${haemodynamicPressures.ra.vWave} mmHg` : 'normal v wave'}, and ${haemodynamicPressures.ra.mean ? `mean pressure of ${haemodynamicPressures.ra.mean} mmHg` : 'normal mean pressure'}.

Right ventricular pressures demonstrated ${haemodynamicPressures.rv.systolic ? `systolic pressure of ${haemodynamicPressures.rv.systolic} mmHg` : 'normal systolic pressure'} with ${haemodynamicPressures.rv.diastolic ? `diastolic pressure of ${haemodynamicPressures.rv.diastolic} mmHg` : 'normal diastolic pressure'} and ${haemodynamicPressures.rv.rvedp ? `right ventricular end-diastolic pressure of ${haemodynamicPressures.rv.rvedp} mmHg` : 'normal end-diastolic pressure'}.

Pulmonary artery pressures showed ${haemodynamicPressures.pa.systolic ? `systolic pressure of ${haemodynamicPressures.pa.systolic} mmHg` : 'normal systolic pressure'}, ${haemodynamicPressures.pa.diastolic ? `diastolic pressure of ${haemodynamicPressures.pa.diastolic} mmHg` : 'normal diastolic pressure'}, and ${haemodynamicPressures.pa.mean ? `mean pressure of ${haemodynamicPressures.pa.mean} mmHg` : 'normal mean pressure'}.

Cardiac output assessment by thermodilution demonstrated ${cardiacOutput.thermodilution.co ? `${cardiacOutput.thermodilution.co} L/min` : 'normal cardiac output'} with ${cardiacOutput.thermodilution.ci ? `cardiac index of ${cardiacOutput.thermodilution.ci} L/min/m²` : 'normal cardiac index'}. ${cardiacOutput.fick.co ? `Fick method confirmed cardiac output of ${cardiacOutput.fick.co} L/min.` : ''} ${cardiacOutput.mixedVenousO2 ? `Mixed venous oxygen saturation was ${cardiacOutput.mixedVenousO2}%.` : ''} ${rhcData.laboratoryValues.haemoglobin ? `Laboratory assessment showed haemoglobin of ${rhcData.laboratoryValues.haemoglobin} g/L` : ''}${rhcData.laboratoryValues.lactate ? ` and lactate of ${rhcData.laboratoryValues.lactate} mmol/L.` : '.'}

**CONCLUSION**
The haemodynamic assessment demonstrates findings consistent with the clinical indication. ${complications.length > 0 ? `Procedural complications included ${complications.map(c => c.description).join(', ')}.` : 'No procedural complications were encountered.'} ${rhcData.recommendations ? rhcData.recommendations : 'Further management recommendations will be based on these findings.'} ${rhcData.followUp ? rhcData.followUp : 'Follow-up assessment is planned as clinically indicated.'}

Note: This report was generated with limited AI processing. Clinical review is recommended.`;
    }
  }

  // Helper methods for data extraction
  private extractMeasurement(text: string, pattern: RegExp): string | null {
    const matches = text.match(pattern);
    return matches ? matches[matches.length - 1] : null;
  }

  private extractIndication(input: string): RHCIndication {
    const text = input.toLowerCase();
    
    for (const [key, value] of Object.entries(this.rhcIndications)) {
      if (text.includes(key)) {
        return value;
      }
    }
    
    return 'haemodynamic_assessment'; // Default indication
  }

  private extractVascularAccess(input: string): VenousAccess {
    const text = input.toLowerCase();
    
    for (const [key, value] of Object.entries(this.venousAccessSites)) {
      if (text.includes(key)) {
        return value;
      }
    }
    
    return 'right_femoral'; // Default access site
  }

  private extractClinicalPresentation(input: string): string {
    return this.extractValue(input, /(?:clinical\s+)?presentation[:\s]+([^.]+)/i) || '';
  }

  private extractRecentInvestigations(input: string): string {
    return this.extractValue(input, /(?:recent\s+)?(?:echo|echocardiography|investigation)[:\s]+([^.]+)/i) || '';
  }

  private extractCatheterDetails(input: string): string {
    const frenchMatch = input.match(RightHeartCathMedicalPatterns.frenchSize);
    const swanGanzMatch = input.match(RightHeartCathMedicalPatterns.swanGanz);
    
    if (frenchMatch) return `${frenchMatch[1]}F catheter`;
    if (swanGanzMatch) return 'Swan-Ganz catheter';
    return 'Thermodilution catheter';
  }

  private extractLaboratoryValues(input: string) {
    return {
      haemoglobin: this.extractMeasurement(input, RightHeartCathMedicalPatterns.haemoglobin),
      lactate: this.extractMeasurement(input, RightHeartCathMedicalPatterns.lactate)
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

  private calculateExerciseResponse(input: string): string {
    // Simple exercise response calculation - could be enhanced
    return 'Exercise response assessed with pressure changes documented';
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
  private getEmptyRHCData(): RightHeartCathData {
    return {
      procedureType: 'Right Heart Catheterisation',
      indication: 'haemodynamic_assessment',
      clinicalPresentation: '',
      recentInvestigations: '',
      vascularAccess: 'right_femoral',
      catheterDetails: 'Thermodilution catheter',
      laboratoryValues: {
        haemoglobin: null,
        lactate: null
      },
      immediateOutcomes: '',
      recommendations: '',
      followUp: ''
    };
  }

  private getEmptyHaemodynamicPressures(): HaemodynamicPressures {
    return {
      ra: { aWave: null, vWave: null, mean: null },
      rv: { systolic: null, diastolic: null, rvedp: null },
      pa: { systolic: null, diastolic: null, mean: null },
      pcwp: { aWave: null, vWave: null, mean: null }
    };
  }

  private getEmptyCardiacOutput(): CardiacOutput {
    return {
      thermodilution: { co: null, ci: null },
      fick: { co: null, ci: null },
      mixedVenousO2: null,
      wedgeSaturation: null
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
    const highPriority = ['findings', 'procedure', 'indication', 'complications', 'assessment'];
    const title = line.toLowerCase();
    
    for (const keyword of highPriority) {
      if (title.includes(keyword)) return 'high';
    }
    
    return 'medium';
  }
}