/**
 * NextStepInferenceAgent
 * 
 * A post-letter clinical reasoning agent that identifies optional,
 * patient-specific next clinical steps that the clinician may wish to consider.
 * 
 * This is NOT a letter generator. It is an additive, opt-in intelligence layer
 * that runs asynchronously after letter generation is complete.
 * 
 * @see docs/Operator_NextStep_Engine_Reference.md
 */

import { MedicalAgent } from '../base/MedicalAgent';
import { LMStudioService, MODEL_CONFIG } from '@/services/LMStudioService';
import type { MedicalContext, MedicalReport, ChatMessage, ReportSection } from '@/types/medical.types';
import type {
  NextStepSuggestion,
  NextStepEngineInput,
  NextStepEngineResult,
  NextStepIntegrationRequest,
  NextStepIntegrationResult,
  NextStepPatientContext,
  NextStepPriority
} from '@/types/nextStep.types';
import {
  NEXT_STEP_INFERENCE_SYSTEM_PROMPT,
  NEXT_STEP_INTEGRATION_SYSTEM_PROMPT,
  buildNextStepInferencePrompt,
  buildNextStepIntegrationPrompt
} from './NextStepInferenceSystemPrompts';
import { logger } from '@/utils/Logger';

/**
 * Priority ordering for sorting suggestions.
 */
const PRIORITY_ORDER: Record<NextStepPriority, number> = {
  high: 0,
  medium: 1,
  low: 2
};

/**
 * NextStepInferenceAgent
 * 
 * A clinical gap-detection and planning assistant that:
 * - Runs AFTER letter generation is complete
 * - Analyzes the letter against patient context
 * - Identifies optional next steps the clinician may wish to consider
 * - Returns zero or more structured suggestions
 * - Never modifies the letter directly
 */
export class NextStepInferenceAgent extends MedicalAgent {
  private lmStudioService: LMStudioService;

  constructor() {
    super(
      'Next-Step Inference Agent',
      'Clinical Planning',
      'Identifies optional, patient-specific next clinical steps for consideration',
      'next-step-inference' as any, // Type assertion since this is a new agent type
      NEXT_STEP_INFERENCE_SYSTEM_PROMPT
    );
    
    this.lmStudioService = LMStudioService.getInstance();
    
    logger.info('NextStepInferenceAgent initialized', {
      component: 'next-step-agent',
      operation: 'init'
    });
  }

  /**
   * Main processing method (required by MedicalAgent base class).
   * For Next-Step inference, use inferNextSteps() directly instead.
   */
  async process(input: string, context?: MedicalContext): Promise<MedicalReport> {
    const startTime = Date.now();
    
    // Parse the input as a NextStepEngineInput
    let engineInput: NextStepEngineInput;
    try {
      engineInput = JSON.parse(input);
    } catch {
      // If not JSON, treat the input as the letter text
      engineInput = {
        letterText: input,
        patientContext: {},
        sessionId: context?.sessionId || 'unknown',
        sourceAgentType: 'unknown'
      };
    }
    
    const result = await this.inferNextSteps(engineInput);
    
    return this.createReport(
      JSON.stringify(result.suggestions, null, 2),
      [],
      context,
      Date.now() - startTime,
      result.suggestions.length > 0 ? 0.8 : 0.95,
      [],
      result.error ? [result.error] : []
    );
  }

  protected buildMessages(input: string, _context?: MedicalContext): ChatMessage[] {
    return [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: input }
    ];
  }

  protected parseResponse(_response: string, _context?: MedicalContext): ReportSection[] {
    // Next-Step agent returns structured suggestions, not sections
    return [];
  }

  /**
   * Primary method for inferring next clinical steps.
   * 
   * This method:
   * 1. Takes the final letter and patient context
   * 2. Analyzes for clinical gaps
   * 3. Returns structured suggestions (may be empty)
   * 
   * @param input - The letter text and patient context
   * @returns Structured result with suggestions
   */
  async inferNextSteps(input: NextStepEngineInput): Promise<NextStepEngineResult> {
    const startTime = Date.now();
    
    logger.info('NextStepInferenceAgent: Starting inference', {
      component: 'next-step-agent',
      operation: 'infer',
      sessionId: input.sessionId,
      letterLength: input.letterText.length,
      hasContext: Object.keys(input.patientContext).length > 0
    });

    try {
      // Build the inference prompt
      const userPrompt = buildNextStepInferencePrompt(
        input.letterText,
        input.patientContext
      );

      // Call the LLM using processWithAgent
      const response = await this.lmStudioService.processWithAgent(
        NEXT_STEP_INFERENCE_SYSTEM_PROMPT,
        userPrompt,
        'next-step-inference',
        undefined, // no abort signal
        MODEL_CONFIG.REASONING_MODEL
      );

      // Parse the response
      const suggestions = this.parseNextStepResponse(response);

      // Sort by priority
      suggestions.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

      const processingTime = Date.now() - startTime;

      logger.info('NextStepInferenceAgent: Inference complete', {
        component: 'next-step-agent',
        operation: 'infer-complete',
        sessionId: input.sessionId,
        suggestionCount: suggestions.length,
        processingTime
      });

      return {
        suggestions,
        status: 'completed',
        processingTime,
        timestamp: Date.now()
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('NextStepInferenceAgent: Inference failed', error as Error, {
        component: 'next-step-agent',
        operation: 'infer-error',
        sessionId: input.sessionId
      });

      return {
        suggestions: [],
        status: 'error',
        processingTime,
        error: errorMessage,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Integrate selected suggestions into the letter.
   * 
   * This performs a full-letter rewrite that:
   * - Takes the current letter version (including any manual edits)
   * - Smoothly integrates selected suggestions
   * - Maintains the clinician's voice and terminology
   * - Does NOT introduce new clinical inference
   * 
   * @param request - The integration request with letter and suggestions
   * @returns The rewritten letter
   */
  async integrateIntoLetter(request: NextStepIntegrationRequest): Promise<NextStepIntegrationResult> {
    const startTime = Date.now();

    logger.info('NextStepInferenceAgent: Starting integration', {
      component: 'next-step-agent',
      operation: 'integrate',
      sessionId: request.sessionId,
      suggestionCount: request.suggestions.length
    });

    if (request.suggestions.length === 0) {
      return {
        rewrittenLetter: request.currentLetter,
        success: true,
        processingTime: Date.now() - startTime,
        integratedSuggestionIds: []
      };
    }

    try {
      // Build the integration prompt
      const userPrompt = buildNextStepIntegrationPrompt(
        request.currentLetter,
        request.suggestions.map(s => ({ title: s.title, suggestedText: s.suggestedText }))
      );

      // Call the LLM for integration using processWithAgent
      const response = await this.lmStudioService.processWithAgent(
        NEXT_STEP_INTEGRATION_SYSTEM_PROMPT,
        userPrompt,
        'next-step-integration',
        undefined, // no abort signal
        MODEL_CONFIG.REASONING_MODEL
      );

      // Clean the response
      const rewrittenLetter = this.cleanIntegratedLetter(response);

      const processingTime = Date.now() - startTime;

      logger.info('NextStepInferenceAgent: Integration complete', {
        component: 'next-step-agent',
        operation: 'integrate-complete',
        sessionId: request.sessionId,
        processingTime,
        originalLength: request.currentLetter.length,
        newLength: rewrittenLetter.length
      });

      return {
        rewrittenLetter,
        success: true,
        processingTime,
        integratedSuggestionIds: request.suggestions.map(s => s.id)
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('NextStepInferenceAgent: Integration failed', error as Error, {
        component: 'next-step-agent',
        operation: 'integrate-error',
        sessionId: request.sessionId
      });

      return {
        rewrittenLetter: request.currentLetter, // Return original on error
        success: false,
        error: errorMessage,
        processingTime,
        integratedSuggestionIds: []
      };
    }
  }

  /**
   * Parse the LLM response into structured suggestions.
   */
  private parseNextStepResponse(response: string): NextStepSuggestion[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        // Check if the response indicates no suggestions
        if (response.toLowerCase().includes('no suggestion') || 
            response.toLowerCase().includes('no additional') ||
            response.trim() === '[]') {
          return [];
        }
        logger.warn('NextStepInferenceAgent: No JSON array found in response');
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!Array.isArray(parsed)) {
        logger.warn('NextStepInferenceAgent: Parsed response is not an array');
        return [];
      }

      // Validate and transform each suggestion
      const suggestions: NextStepSuggestion[] = [];
      
      for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i];
        
        // Validate required fields
        if (!item.title || !item.reason || !item.suggestedText) {
          logger.warn('NextStepInferenceAgent: Skipping invalid suggestion', { index: i });
          continue;
        }

        // Validate and normalize priority
        const priority = this.normalizePriority(item.priority);
        
        // Generate ID if not present
        const id = item.id || `ns-${Date.now()}-${i}`;

        suggestions.push({
          id,
          title: String(item.title).substring(0, 100), // Limit title length
          reason: String(item.reason).substring(0, 500), // Limit reason length
          suggestedText: String(item.suggestedText).substring(0, 1000), // Limit text length
          priority,
          category: this.normalizeCategory(item.category)
        });
      }

      return suggestions;

    } catch (error) {
      logger.error('NextStepInferenceAgent: Failed to parse response', error as Error);
      return [];
    }
  }

  /**
   * Normalize priority value to valid enum.
   */
  private normalizePriority(priority: unknown): NextStepPriority {
    if (typeof priority === 'string') {
      const lower = priority.toLowerCase();
      if (lower === 'high' || lower === 'medium' || lower === 'low') {
        return lower as NextStepPriority;
      }
    }
    return 'medium'; // Default
  }

  /**
   * Normalize category value to valid enum.
   */
  private normalizeCategory(category: unknown): NextStepSuggestion['category'] {
    if (typeof category === 'string') {
      const lower = category.toLowerCase();
      const validCategories = ['investigation', 'medication', 'referral', 'follow-up', 'lifestyle', 'monitoring', 'other'];
      if (validCategories.includes(lower)) {
        return lower as NextStepSuggestion['category'];
      }
    }
    return 'other';
  }

  /**
   * Clean the integrated letter response.
   */
  private cleanIntegratedLetter(response: string): string {
    let cleaned = response;

    // Remove any meta-commentary that might have slipped through
    cleaned = cleaned.replace(/^(Here is the|Here's the|Below is the|The following is the)[\s\S]*?:\s*\n*/i, '');
    cleaned = cleaned.replace(/\n*\[Note:[\s\S]*?\]/gi, '');
    cleaned = cleaned.replace(/\n*\*Note:[\s\S]*?\*/gi, '');

    // Clean up excessive whitespace
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    cleaned = cleaned.trim();

    return cleaned;
  }
}

// Singleton instance
let nextStepInferenceAgentInstance: NextStepInferenceAgent | null = null;

/**
 * Get the singleton instance of NextStepInferenceAgent.
 */
export function getNextStepInferenceAgent(): NextStepInferenceAgent {
  if (!nextStepInferenceAgentInstance) {
    nextStepInferenceAgentInstance = new NextStepInferenceAgent();
  }
  return nextStepInferenceAgentInstance;
}
