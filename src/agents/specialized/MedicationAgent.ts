import { MedicalAgent } from '../base/MedicalAgent';
import { LMStudioService } from '@/services/LMStudioService';
import { MEDICATION_SYSTEM_PROMPTS } from './MedicationSystemPrompts';
import type { 
  MedicalContext, 
  MedicalReport, 
  ReportSection, 
  ChatMessage 
} from '@/types/medical.types';

/**
 * Specialized agent for processing voice-dictated medication lists
 * into structured ↪ arrow format for clinical documentation.
 * 
 * Handles medication reconciliation, dosing standardization, and formatting
 * raw transcription into structured format: "↪ medication dose frequency"
 */
export class MedicationAgent extends MedicalAgent {
  private lmStudioService: LMStudioService;

  constructor() {
    super(
      'Medication Management Agent',
      'Medication List Documentation',
      'Formats voice-dictated medication lists into structured ↪ arrow format',
      'medication',
      MEDICATION_SYSTEM_PROMPTS.primary
    );
    
    this.lmStudioService = LMStudioService.getInstance();
  }

  async process(input: string, context?: MedicalContext): Promise<MedicalReport> {
    console.log('💊 MedicationAgent processing input:', input?.substring(0, 100) + '...');
    
    try {
      // Get formatted medication list from configured model (Google Gemma-3n-e4b for this agent)
      console.log('🤖 Sending to LLM for medication list formatting...');
      const response = await this.lmStudioService.processWithAgent(
        this.systemPrompt,
        input,
        'medication' // Pass agent type for model selection (uses google/gemma-3n-e4b)
      );
      
      console.log('🔍 Raw LLM response:', JSON.stringify(response));
      
      // Check for error response - be more precise about error detection
      const trimmedResponse = response.trim();
      if (trimmedResponse.startsWith('ERROR – medication list could not be parsed') ||
          trimmedResponse === 'ERROR – medication list could not be parsed coherently.') {
        console.warn('⚠️ Medication list could not be parsed coherently');
        return this.createErrorReport(input, 'Medication list could not be parsed coherently');
      }

      // Parse the formatted response
      const sections = this.parseResponse(response, context);
      
      // Create medical report
      const report: MedicalReport = {
        id: `medication-${Date.now()}`,
        agentName: this.name,
        content: response.trim(),
        sections,
        metadata: {
          confidence: this.assessConfidence(input, response),
          processingTime: Date.now() - (context?.timestamp || Date.now()),
          medicalCodes: this.extractMedicalCodes(response),
          modelUsed: 'google/gemma-3n-e4b'
        },
        timestamp: Date.now()
      };

      console.log('✅ Medication list formatted successfully');
      return report;

    } catch (error) {
      console.error('❌ MedicationAgent processing failed:', error);
      return this.createErrorReport(input, error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  protected buildMessages(input: string, _context?: MedicalContext): ChatMessage[] {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: this.systemPrompt
      },
      {
        role: 'user',
        content: `Please format this voice-dictated medication list into a clean, simple line-separated format:

"${input}"

Remember to use simple line format with no arrows or bullets, standardise medication names to generic forms, preserve all dosing and frequency information exactly as dictated, and use Australian medication names and spellings.`
      }
    ];

    return messages;
  }

  protected parseResponse(response: string, _context?: MedicalContext): ReportSection[] {
    const cleanResponse = response.trim();
    
    // Count number of medications (non-empty lines, excluding allergies)
    const medicationLines = cleanResponse.split('\n').filter(line => 
      line.trim() && 
      !line.toLowerCase().startsWith('allergies:') && 
      !line.toLowerCase().startsWith('no known drug allergies')
    );
    const medicationCount = medicationLines.length;
    
    // Split into individual medications for analysis
    const medications = medicationLines;
    
    const sections: ReportSection[] = [
      {
        title: 'Medication List',
        content: cleanResponse,
        type: 'structured',
        priority: 'high'
      }
    ];

    // Add medication count metadata
    if (medicationCount > 0) {
      sections.push({
        title: 'Medication Summary',
        content: `${medicationCount} medications documented`,
        type: 'structured',
        priority: 'medium'
      });
    }

    // Add individual medications for easier parsing and validation
    medications.forEach((medication, index) => {
      const medicationName = medication.trim();
      
      // Extract basic medication info for validation
      const medMatch = medicationName.match(/^([a-zA-Z\s/-]+)\s+(.+)$/);
      if (medMatch) {
        const [, drugName, dosageInfo] = medMatch;
        sections.push({
          title: `Medication ${index + 1}`,
          content: `${drugName.trim()}: ${dosageInfo.trim()}`,
          type: 'structured',
          priority: 'low'
        });
      } else {
        sections.push({
          title: `Medication ${index + 1}`,
          content: medicationName,
          type: 'structured',
          priority: 'low'
        });
      }
    });

    // Check for allergies section
    if (cleanResponse.toLowerCase().includes('allergies') || cleanResponse.toLowerCase().includes('nkda')) {
      sections.push({
        title: 'Allergy Information',
        content: 'Allergy information included',
        type: 'structured',
        priority: 'high'
      });
    }

    return sections;
  }

  private assessConfidence(input: string, output: string): number {
    // Simple confidence assessment based on:
    // 1. Presence of ↪ formatting
    // 2. Preservation of medication terms
    // 3. Appropriate dosing patterns
    // 4. Frequency patterns
    
    let confidence = 0.5; // Base confidence
    
    // Check for proper line formatting (no arrows/bullets)
    const hasArrows = output.includes('↪') || output.includes('•') || output.includes('-');
    if (!hasArrows && output.split('\n').filter(line => line.trim()).length > 0) {
      confidence += 0.2;
    }
    
    // Check for dosing patterns (mg, mcg, units)
    const dosingPatterns = /\b\d+(?:\.\d+)?\s*(mg|mcg|g|units|IU|mmol|mL)\b/gi;
    const dosingCount = (output.match(dosingPatterns) || []).length;
    if (dosingCount > 0) {
      confidence += 0.2;
    }
    
    // Check for frequency patterns  
    const frequencyPatterns = /\b(daily|BD|TDS|QID|PRN|nocte|mane|twice daily|three times daily)\b/gi;
    const frequencyCount = (output.match(frequencyPatterns) || []).length;
    if (frequencyCount > 0) {
      confidence += 0.2;
    }
    
    // Check for preservation of key medication terms
    const commonMedications = [
      'aspirin', 'atorvastatin', 'metformin', 'metoprolol', 'amlodipine',
      'perindopril', 'frusemide', 'warfarin', 'clopidogrel', 'paracetamol',
      'omeprazole', 'salbutamol', 'insulin', 'prednisolone'
    ];
    
    const inputMeds = commonMedications.filter(med => 
      input.toLowerCase().includes(med.toLowerCase())
    );
    const outputMeds = commonMedications.filter(med => 
      output.toLowerCase().includes(med.toLowerCase())
    );
    
    if (inputMeds.length > 0) {
      confidence += (outputMeds.length / inputMeds.length) * 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  private extractMedicalCodes(response: string): any[] {
    // Extract medication-related codes (ATC codes, PBS codes)
    const codes: any[] = [];
    
    // Basic medication class mapping to ATC codes
    const medicationMappings = [
      // Cardiac medications
      { medication: 'aspirin', code: 'B01AC06', description: 'Acetylsalicylic acid', class: 'Antiplatelet' },
      { medication: 'clopidogrel', code: 'B01AC04', description: 'Clopidogrel', class: 'Antiplatelet' },
      { medication: 'atorvastatin', code: 'C10AA05', description: 'Atorvastatin', class: 'Statin' },
      { medication: 'metoprolol', code: 'C07AB02', description: 'Metoprolol', class: 'Beta-blocker' },
      { medication: 'amlodipine', code: 'C08CA01', description: 'Amlodipine', class: 'Calcium channel blocker' },
      { medication: 'perindopril', code: 'C09AA04', description: 'Perindopril', class: 'ACE inhibitor' },
      { medication: 'frusemide', code: 'C03CA01', description: 'Furosemide', class: 'Loop diuretic' },
      { medication: 'warfarin', code: 'B01AA03', description: 'Warfarin', class: 'Anticoagulant' },
      
      // Diabetes medications
      { medication: 'metformin', code: 'A10BA02', description: 'Metformin', class: 'Biguanide' },
      { medication: 'insulin', code: 'A10A', description: 'Insulin', class: 'Insulin' },
      { medication: 'gliclazide', code: 'A10BB09', description: 'Gliclazide', class: 'Sulfonylurea' },
      
      // Common others
      { medication: 'paracetamol', code: 'N02BE01', description: 'Paracetamol', class: 'Analgesic' },
      { medication: 'omeprazole', code: 'A02BC01', description: 'Omeprazole', class: 'Proton pump inhibitor' },
      { medication: 'salbutamol', code: 'R03AC02', description: 'Salbutamol', class: 'Beta2-agonist' }
    ];
    
    medicationMappings.forEach(mapping => {
      if (response.toLowerCase().includes(mapping.medication.toLowerCase())) {
        codes.push({ 
          code: mapping.code, 
          description: mapping.description,
          class: mapping.class,
          system: 'ATC'
        });
      }
    });
    
    return codes;
  }

  private createErrorReport(input: string, errorMessage: string): MedicalReport {
    return {
      id: `medication-error-${Date.now()}`,
      agentName: this.name,
      content: `Error processing medication list: ${errorMessage}`,
      sections: [
        {
          title: 'Processing Error',
          content: errorMessage,
          type: 'narrative',
          priority: 'high'
        },
        {
          title: 'Original Input',
          content: input,
          type: 'narrative',
          priority: 'medium'
        }
      ],
      metadata: {
        confidence: 0,
        processingTime: 0,
        medicalCodes: [],
        modelUsed: 'google/gemma-3n-e4b'
      },
      timestamp: Date.now(),
      errors: [errorMessage]
    };
  }
}