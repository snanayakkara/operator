import { MedicalAgent } from '../base/MedicalAgent';
import { LMStudioService, MODEL_CONFIG } from '@/services/LMStudioService';
import { BACKGROUND_SYSTEM_PROMPTS } from './BackgroundSystemPrompts';
import type { 
  MedicalContext, 
  MedicalReport, 
  ReportSection, 
  ChatMessage 
} from '@/types/medical.types';

/**
 * Specialized agent for processing voice-dictated medical background/history
 * into structured ↪ arrow format for clinical documentation.
 * 
 * Handles medical conditions, medications, social history, family history, etc.
 * Formats raw transcription into structured format: "↪ Condition\n- details"
 */
export class BackgroundAgent extends MedicalAgent {
  private lmStudioService: LMStudioService;

  constructor() {
    super(
      'Background Medical History Agent',
      'Medical Background Documentation',
      'Formats voice-dictated medical background/history into structured ↪ arrow format',
      'background',
      BACKGROUND_SYSTEM_PROMPTS.primary
    );
    
    this.lmStudioService = LMStudioService.getInstance();
  }

  async process(input: string, context?: MedicalContext): Promise<MedicalReport> {
    const startTime = Date.now();
    console.log('🏥 BackgroundAgent processing input:', input?.substring(0, 100) + '...');
    
    try {
      // Get formatted background from lightweight quick model (Google Gemma-3n-e4b for fast formatting)
      console.log('🤖 Sending to lightweight LLM for medical background formatting...');
      const response = await this.lmStudioService.processWithAgent(
        this.systemPrompt,
        input,
        'background' // Pass agent type for model selection (uses MODEL_CONFIG.QUICK_MODEL for 3-8s processing)
      );
      
      console.log('🔍 Raw LLM response:', JSON.stringify(response));
      
      // Check for error response - be more precise about error detection
      const trimmedResponse = response.trim();
      if (trimmedResponse.startsWith('ERROR – medical background could not be parsed') ||
          trimmedResponse === 'ERROR – medical background could not be parsed coherently.') {
        console.warn('⚠️ Medical background could not be parsed coherently');
        return this.createErrorReport(input, 'Medical background could not be parsed coherently');
      }

      // Parse the formatted response
      const sections = this.parseResponse(response, context);
      
      // Calculate actual processing time
      const processingTime = Date.now() - startTime;
      
      // Use base class createReport method for consistent metadata structure
      const report = this.createReport(
        response.trim(),
        sections,
        context,
        processingTime,
        this.assessConfidence(input, response)
      );

      // Add additional metadata specific to background summaries
      report.metadata = {
        ...report.metadata,
        medicalCodes: this.extractMedicalCodes(response),
        modelUsed: MODEL_CONFIG.QUICK_MODEL // Now correctly using the quick model for background formatting
      };

      console.log('✅ Medical background formatted successfully');
      return report;

    } catch (error) {
      console.error('❌ BackgroundAgent processing failed:', error);
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
        content: `Please format this voice-dictated medical background/history into structured ↪ arrow format:

"${input}"

Remember to use ↪ for each major condition and - for sub-details, preserve all medical terminology exactly as dictated, and use Australian medical spelling.`
      }
    ];

    return messages;
  }

  protected parseResponse(response: string, _context?: MedicalContext): ReportSection[] {
    const cleanResponse = response.trim();
    
    // Count number of conditions (↪ symbols)
    const conditionCount = (cleanResponse.match(/↪/g) || []).length;
    
    // Split into individual conditions for analysis
    const conditions = cleanResponse.split('\n').filter(line => line.startsWith('↪'));
    
    const sections: ReportSection[] = [
      {
        title: 'Medical Background',
        content: cleanResponse,
        type: 'structured',
        priority: 'high'
      }
    ];

    // Add condition count metadata
    if (conditionCount > 0) {
      sections.push({
        title: 'Condition Summary',
        content: `${conditionCount} medical conditions documented`,
        type: 'structured',
        priority: 'medium'
      });
    }

    // Add individual conditions for easier parsing
    conditions.forEach((condition, index) => {
      const conditionName = condition.replace('↪ ', '').trim();
      sections.push({
        title: `Condition ${index + 1}`,
        content: conditionName,
        type: 'structured',
        priority: 'low'
      });
    });

    return sections;
  }

  private assessConfidence(input: string, output: string): number {
    // Simple confidence assessment based on:
    // 1. Presence of ↪ formatting
    // 2. Preservation of medical terms
    // 3. Appropriate structure
    
    let confidence = 0.5; // Base confidence
    
    // Check for proper ↪ formatting
    const arrowCount = (output.match(/↪/g) || []).length;
    if (arrowCount > 0) {
      confidence += 0.3;
    }
    
    // Check for preservation of key medical terms
    const medicalTerms = [
      'hypertension', 'diabetes', 'atrial fibrillation', 'coronary', 'heart failure',
      'asthma', 'COPD', 'kidney', 'stroke', 'cancer', 'AF', 'HTN', 'DM', 'CAD'
    ];
    
    const inputTerms = medicalTerms.filter(term => 
      input.toLowerCase().includes(term.toLowerCase())
    );
    const outputTerms = medicalTerms.filter(term => 
      output.toLowerCase().includes(term.toLowerCase())
    );
    
    if (inputTerms.length > 0) {
      confidence += (outputTerms.length / inputTerms.length) * 0.2;
    }
    
    return Math.min(confidence, 1.0);
  }

  private extractMedicalCodes(response: string): any[] {
    // Extract common medical conditions and their potential ICD codes
    const codes: any[] = [];
    
    // Basic condition mapping to ICD codes
    const conditionMappings = [
      { condition: 'hypertension', code: 'I10', description: 'Essential hypertension' },
      { condition: 'diabetes', code: 'E11', description: 'Type 2 diabetes mellitus' },
      { condition: 'atrial fibrillation', code: 'I48', description: 'Atrial fibrillation' },
      { condition: 'coronary artery disease', code: 'I25', description: 'Chronic ischaemic heart disease' },
      { condition: 'heart failure', code: 'I50', description: 'Heart failure' },
      { condition: 'asthma', code: 'J45', description: 'Asthma' },
      { condition: 'chronic kidney disease', code: 'N18', description: 'Chronic kidney disease' },
      { condition: 'aortic stenosis', code: 'I35.0', description: 'Nonrheumatic aortic stenosis' }
    ];
    
    conditionMappings.forEach(mapping => {
      if (response.toLowerCase().includes(mapping.condition.toLowerCase())) {
        codes.push({ 
          code: mapping.code, 
          description: mapping.description,
          system: 'ICD-10'
        });
      }
    });
    
    return codes;
  }

  private createErrorReport(input: string, errorMessage: string): MedicalReport {
    return {
      id: `background-error-${Date.now()}`,
      agentName: this.name,
      content: `Error processing medical background: ${errorMessage}`,
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
        modelUsed: MODEL_CONFIG.QUICK_MODEL
      },
      timestamp: Date.now(),
      errors: [errorMessage]
    };
  }
}