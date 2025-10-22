import { MedicalAgent } from '../base/MedicalAgent';
import { LMStudioService, MODEL_CONFIG } from '@/services/LMStudioService';
import { PRE_OP_PLAN_SYSTEM_PROMPT } from './PreOpPlanSystemPrompt';
import type {
  MedicalContext,
  MedicalReport,
  ReportSection,
  ChatMessage,
  PreOpProcedureType,
  PreOpPlanReport
} from '@/types/medical.types';
import { logger } from '@/utils/Logger';

/**
 * Pre-Op Plan Agent
 *
 * Generates A5 pre-procedure summary cards for cath lab procedures.
 * Detects procedure type from dictation and outputs dual format:
 * 1. Markdown card (A5-optimized, ≤18 lines)
 * 2. Structured JSON metadata
 *
 * Supports: ANGIOGRAM_OR_PCI, RIGHT_HEART_CATH, TAVI, MITRAL_TEER
 */
export class PreOpPlanAgent extends MedicalAgent {
  protected lmStudioService: LMStudioService;

  constructor() {
    super(
      'Pre-Op Plan Agent',
      'Cath Lab Procedure Planning',
      'Generates A5 pre-procedure summary cards for angiogram, RHC, TAVI, and mTEER procedures',
      'pre-op-plan',
      PRE_OP_PLAN_SYSTEM_PROMPT
    );

    this.lmStudioService = LMStudioService.getInstance();
    logger.info('PreOpPlanAgent initialized');
  }

  async process(input: string, context?: MedicalContext): Promise<MedicalReport> {
    const startTime = Date.now();
    logger.info('PreOpPlanAgent: Starting processing', {
      inputLength: input.length,
      sessionId: context?.sessionId
    });

    try {
      // Build messages with system prompt and dictation
      const messages = await this.buildMessages(input, context);

      // Generate response from LLM
      const userMessage = messages.find(message => message.role === 'user');
      const userContent = typeof userMessage?.content === 'string'
        ? userMessage.content
        : this.normalizeContent(userMessage?.content);

      const response = await this.lmStudioService.processWithAgent(
        this.systemPrompt,
        userContent || `DICTATION\n${input.trim()}`,
        this.agentType,
        undefined,
        MODEL_CONFIG.REASONING_MODEL
      );

      logger.info('PreOpPlanAgent: Received LLM response', {
        responseLength: response.length
      });

      // Parse the response into card and JSON
      const { cardMarkdown, jsonData, procedureType } = this.parsePreOpResponse(response);

      // Create report sections
      const sections: ReportSection[] = [
        {
          title: 'Pre-Op Summary Card',
          content: cardMarkdown,
          type: 'narrative',
          priority: 'high'
        },
        {
          title: 'Structured Data',
          content: JSON.stringify(jsonData, null, 2),
          type: 'structured',
          priority: 'medium'
        }
      ];

      // Calculate processing time
      const processingTime = Date.now() - startTime;

      // Create the medical report
      const report = this.createReport(
        cardMarkdown,
        sections,
        context,
        processingTime,
        0.95, // High confidence for structured output
        [],
        []
      ) as PreOpPlanReport;

      // Add Pre-Op Plan specific data
      report.planData = {
        procedureType,
        cardMarkdown,
        jsonData,
        completenessScore: this.calculateCompleteness(jsonData)
      };

      logger.info('PreOpPlanAgent: Processing completed', {
        processingTime,
        procedureType,
        completenessScore: report.planData.completenessScore
      });

      return report;

    } catch (error) {
      logger.error('PreOpPlanAgent: Processing failed', {
        error: error instanceof Error ? error.message : String(error),
        inputLength: input.length
      });

      // Return error report
      const processingTime = Date.now() - startTime;
      return this.createReport(
        'Failed to generate pre-op plan',
        [],
        context,
        processingTime,
        0.0,
        [],
        [error instanceof Error ? error.message : 'Unknown error']
      );
    }
  }

  protected async buildMessages(input: string, _context?: MedicalContext): Promise<ChatMessage[]> {
    return [
      {
        role: 'system',
        content: this.systemPrompt
      },
      {
        role: 'user',
        content: `DICTATION\n${input.trim()}`
      }
    ];
  }

  protected parseResponse(_response: string, _context?: MedicalContext): ReportSection[] {
    // This is handled by parsePreOpResponse for this agent
    return [];
  }

  /**
   * Parse LLM response into card markdown and JSON data
   */
  private parsePreOpResponse(response: string): {
    cardMarkdown: string;
    jsonData: any;
    procedureType: PreOpProcedureType;
  } {
    try {
      // Extract CARD section
      const cardMatch = response.match(/CARD:\s*\n([\s\S]*?)(?=\n\s*JSON:|$)/i);
      const cardMarkdown = cardMatch
        ? cardMatch[1].trim()
        : response.substring(0, response.indexOf('JSON:') > 0 ? response.indexOf('JSON:') : undefined).trim();

      // Extract JSON section
      const jsonMatch = response.match(/JSON:\s*\n```json\s*\n([\s\S]*?)\n```/i) ||
                       response.match(/```json\s*\n([\s\S]*?)\n```/i);

      let jsonData: any;
      let procedureType: PreOpProcedureType = 'ANGIOGRAM_OR_PCI'; // Default

      if (jsonMatch) {
        try {
          jsonData = JSON.parse(jsonMatch[1].trim());
          procedureType = jsonData.procedure_type || procedureType;
        } catch (parseError) {
          logger.warn('PreOpPlanAgent: JSON parsing failed, using default structure', {
            error: parseError instanceof Error ? parseError.message : String(parseError)
          });
          // Fallback JSON structure
          jsonData = {
            procedure_type: procedureType,
            fields: {
              procedure: 'Not specified',
              indication: 'Not specified',
              parsing_error: 'Failed to parse LLM response'
            }
          };
        }
      } else {
        logger.warn('PreOpPlanAgent: No JSON found in response');
        jsonData = {
          procedure_type: procedureType,
          fields: {
            procedure: 'Not specified',
            indication: 'Not specified',
            parsing_error: 'No JSON section found'
          }
        };
      }

      return {
        cardMarkdown,
        jsonData,
        procedureType
      };

    } catch (error) {
      logger.error('PreOpPlanAgent: Response parsing failed', {
        error: error instanceof Error ? error.message : String(error)
      });

      // Return error structure
      return {
        cardMarkdown: '# Error\nFailed to parse response',
        jsonData: {
          procedure_type: 'ANGIOGRAM_OR_PCI',
          fields: {
            error: 'Parsing failed'
          }
        },
        procedureType: 'ANGIOGRAM_OR_PCI'
      };
    }
  }

  /**
   * Calculate completeness score based on required fields
   */
  private calculateCompleteness(jsonData: any): string {
    const requiredFieldsByType: Record<PreOpProcedureType, string[]> = {
      'ANGIOGRAM_OR_PCI': [
        'procedure', 'indication', 'primary_access', 'sheath_size_fr',
        'catheters', 'allergies', 'nok_name'
      ],
      'RIGHT_HEART_CATH': [
        'procedure', 'indication', 'access_site', 'sheath_size_fr',
        'catheters', 'co_measurement', 'blood_gas_samples', 'nok_name'
      ],
      'TAVI': [
        'procedure', 'indication', 'primary_access', 'secondary_access',
        'valve_type_size', 'wire', 'pacing_wire_access', 'closure_plan',
        'protamine', 'goals_of_care', 'nok_name'
      ],
      'MITRAL_TEER': [
        'procedure', 'indication', 'access_site', 'transeptal_catheter',
        'wire', 'closure_plan', 'echo_summary', 'nok_name'
      ]
    };

    const procedureType = jsonData.procedure_type as PreOpProcedureType;
    const requiredFields = requiredFieldsByType[procedureType] || [];
    const fields = jsonData.fields || {};

    let presentCount = 0;
    for (const field of requiredFields) {
      const value = fields[field];
      if (value && value !== 'Not specified' && value !== '') {
        presentCount++;
      }
    }

    const percentage = requiredFields.length > 0
      ? Math.round((presentCount / requiredFields.length) * 100)
      : 100;

    return `${percentage}% (${presentCount}/${requiredFields.length} required fields)`;
  }

  /**
   * Detect procedure type from dictation text (helper method)
   */
  private detectProcedureType(input: string): PreOpProcedureType {
    const lowerInput = input.toLowerCase();

    // TAVI keywords
    if (lowerInput.includes('tavi') ||
        lowerInput.includes('transcatheter aortic') ||
        lowerInput.includes('tavr') ||
        (lowerInput.includes('valve') && lowerInput.includes('aortic'))) {
      return 'TAVI';
    }

    // mTEER keywords
    if (lowerInput.includes('mteer') ||
        lowerInput.includes('mitraclip') ||
        lowerInput.includes('edge-to-edge') ||
        lowerInput.includes('teer')) {
      return 'MITRAL_TEER';
    }

    // Right Heart Cath keywords
    if (lowerInput.includes('right heart') ||
        lowerInput.includes('rhc') ||
        lowerInput.includes('swan-ganz') ||
        lowerInput.includes('cardiac output')) {
      return 'RIGHT_HEART_CATH';
    }

    // Default to angiogram/PCI
    return 'ANGIOGRAM_OR_PCI';
  }

  private normalizeContent(content?: ChatMessage['content']): string {
    if (!content) {
      return '';
    }

    if (typeof content === 'string') {
      return content;
    }

    return content
      .map(block => (block.type === 'text' ? block.text : ''))
      .join('\n');
  }
}
