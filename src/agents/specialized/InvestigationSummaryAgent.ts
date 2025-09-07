import { MedicalAgent } from '../base/MedicalAgent';
import { LMStudioService, MODEL_CONFIG } from '@/services/LMStudioService';
import { INVESTIGATION_SUMMARY_SYSTEM_PROMPTS, preNormalizeInvestigationText } from './InvestigationSummarySystemPrompts';
import type { 
  MedicalContext, 
  MedicalReport, 
  ReportSection, 
  ChatMessage 
} from '@/types/medical.types';

/**
 * Specialized agent for processing voice-dictated medical investigation results
 * into structured, standardized summaries for e-Intray documentation.
 * 
 * Handles investigations like TTE, CTCA, Coronary Angiogram, Bloods, etc.
 * Formats raw transcription into clinical format: "TEST (DD MMM YYYY): findings"
 */
export class InvestigationSummaryAgent extends MedicalAgent {
  private lmStudioService: LMStudioService;

  constructor() {
    super(
      'Investigation Summary Agent',
      'Medical Investigation Documentation',
      'Formats voice-dictated investigation results into structured clinical summaries',
      'investigation-summary',
      INVESTIGATION_SUMMARY_SYSTEM_PROMPTS.primary
    );
    
    this.lmStudioService = LMStudioService.getInstance();
  }

  async process(input: string, context?: MedicalContext): Promise<MedicalReport> {
    const startTime = Date.now();
    console.log('🔬 InvestigationSummaryAgent processing input:', input?.substring(0, 100) + '...');
    
    try {
      // Pre-normalize the input text to apply medical abbreviation rules
      const normalizedInput = preNormalizeInvestigationText(input);
      console.log('📝 Pre-normalized input applied abbreviation rules');
      
      // Get formatted summary from configured model (Google Gemma-3n-e4b for this agent)
      console.log('🤖 Sending to LLM for investigation formatting...');
      const response = await this.lmStudioService.processWithAgent(
        this.systemPrompt,
        normalizedInput,
        'investigation-summary' // Pass agent type for model selection
      );
      
      console.log('🔍 Raw LLM response:', JSON.stringify(response));
      
      // Check for error response - be more precise about error detection
      const trimmedResponse = response.trim();
      if (trimmedResponse.startsWith('ERROR – investigation dictation could not be parsed') ||
          trimmedResponse === 'ERROR – investigation dictation could not be parsed coherently.') {
        console.warn('⚠️ Investigation could not be parsed coherently');
        return this.createErrorReport(input, 'Investigation dictation could not be parsed coherently');
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

      // Add additional metadata specific to investigation summaries
      report.metadata = {
        ...report.metadata,
        medicalCodes: this.extractMedicalCodes(response),
        modelUsed: MODEL_CONFIG.QUICK_MODEL
      };

      console.log('✅ Investigation summary formatted successfully');
      return report;

    } catch (error) {
      console.error('❌ InvestigationSummaryAgent processing failed:', error);
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
        content: `Please format this voice-dictated investigation result into a structured summary:

"${input}"

Remember to maintain the exact format: "INVESTIGATION (DD MMM YYYY): comma-separated findings"`
      }
    ];

    return messages;
  }

  protected parseResponse(response: string, _context?: MedicalContext): ReportSection[] {
    const cleanResponse = response.trim();
    
    // Extract investigation type and date if possible
    const investigationMatch = cleanResponse.match(/^([^(]+)\s*\([^)]+\):\s*(.+)$/);
    
    if (investigationMatch) {
      const [, investigationType, findings] = investigationMatch;
      
      return [
        {
          title: 'Investigation Summary',
          content: cleanResponse,
          type: 'structured',
          priority: 'high'
        },
        {
          title: 'Investigation Type',
          content: investigationType.trim(),
          type: 'structured',
          priority: 'medium'
        },
        {
          title: 'Findings',
          content: findings.trim(),
          type: 'narrative',
          priority: 'high'
        }
      ];
    } else {
      // Fallback for non-standard formats
      return [
        {
          title: 'Investigation Summary',
          content: cleanResponse,
          type: 'narrative',
          priority: 'high'
        }
      ];
    }
  }

  private assessConfidence(input: string, output: string): number {
    // Simple confidence assessment based on:
    // 1. Length ratio (should be similar)
    // 2. Presence of key medical terms
    // 3. Proper formatting
    
    let confidence = 0.5; // Base confidence
    
    // Check for proper formatting
    if (output.match(/^[^(]+\s*\([^)]+\):\s*[^,]+(,\s*[^,]+)*$/)) {
      confidence += 0.3;
    }
    
    // Check for preservation of key terms
    const medicalTerms = ['TTE', 'CTCA', 'LAD', 'LV', 'RV', 'EF', 'MPG', 'SCAD', 'Ca score', 'METs'];
    const inputTerms = medicalTerms.filter(term => input.toLowerCase().includes(term.toLowerCase()));
    const outputTerms = medicalTerms.filter(term => output.includes(term));
    
    if (inputTerms.length > 0) {
      confidence += (outputTerms.length / inputTerms.length) * 0.2;
    }
    
    return Math.min(confidence, 1.0);
  }

  private extractMedicalCodes(response: string): any[] {
    // Extract common medical codes/procedures from the formatted response
    const codes = [];
    
    // Basic investigation type mapping
    if (response.includes('TTE')) {
      codes.push({ code: '93303', description: 'Transthoracic Echocardiogram' });
    }
    if (response.includes('CTCA')) {
      codes.push({ code: '75571', description: 'CT Coronary Angiography' });
    }
    if (response.includes('Coronary Angiogram')) {
      codes.push({ code: '93458', description: 'Coronary Angiography' });
    }
    if (response.includes('Stress')) {
      codes.push({ code: '93017', description: 'Stress Test' });
    }
    
    return codes;
  }

  private createErrorReport(input: string, errorMessage: string): MedicalReport {
    return {
      id: `investigation-error-${Date.now()}`,
      agentName: this.name,
      content: `Error processing investigation: ${errorMessage}`,
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