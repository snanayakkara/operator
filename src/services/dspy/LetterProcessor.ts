/**
 * DSPy Quick Letter Processor Wrapper
 *
 * TypeScript wrapper for the external DSPy quick letter processing pipeline.
 * Provides type-safe interface to the Python DSPy predictors.
 */

import { DSPyService } from '../DSPyService';
import type {
  LetterFromDictationInput,
  LetterFromDictationOutput,
  DSPyPredictor,
  DSPyPredictorOptions,
  DSPyPipelineResult
} from './DSPyTypes';
import { logger } from '@/utils/Logger';

export class LetterProcessor implements DSPyPredictor<LetterFromDictationInput, LetterFromDictationOutput> {
  private dspyService: DSPyService;
  private readonly agentType = 'quick-letter';

  constructor() {
    this.dspyService = DSPyService.getInstance();
  }

  /**
   * Process quick letter transcript using DSPy predictor
   */
  async predict(input: LetterFromDictationInput, options: DSPyPredictorOptions = {}): Promise<LetterFromDictationOutput> {
    try {
      logger.info('Processing quick letter transcript with DSPy', {
        component: 'LetterProcessor',
        transcript_length: input.transcript.length,
        options
      });

      const result = await this.dspyService.processWithDSPy(
        this.agentType,
        input.transcript,
        {
          timeout: options.timeout_ms || 30000, // Shorter timeout for quick letters
          ...options
        }
      );

      if (!result.success) {
        throw new Error(result.error || 'DSPy processing failed');
      }

      const output: LetterFromDictationOutput = {
        report_text: result.result || '',
        confidence: 0.85, // TODO: Get from DSPy response
        metadata: {
          processing_time_ms: result.processing_time,
          cached: result.cached,
          agent_type: this.agentType
        }
      };

      logger.info('Quick letter DSPy processing completed', {
        component: 'LetterProcessor',
        output_length: output.report_text.length,
        processing_time: result.processing_time,
        cached: result.cached
      });

      return output;

    } catch (error) {
      logger.error('Quick letter DSPy processing failed', {
        component: 'LetterProcessor',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  /**
   * Alias for predict() - follows DSPy naming convention
   */
  async forward(input: LetterFromDictationInput, options?: DSPyPredictorOptions): Promise<LetterFromDictationOutput> {
    return this.predict(input, options);
  }

  /**
   * Process with full pipeline result (includes metadata)
   */
  async processWithMetadata(input: LetterFromDictationInput, options: DSPyPredictorOptions = {}): Promise<DSPyPipelineResult> {
    const startTime = Date.now();

    try {
      const output = await this.predict(input, options);

      return {
        success: true,
        output,
        processing_time_ms: Date.now() - startTime,
        metadata: {
          agent_type: this.agentType,
          signature: 'LetterFromDictation',
          model_used: 'dspy_optimized',
          ...output.metadata
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processing_time_ms: Date.now() - startTime,
        metadata: {
          agent_type: this.agentType,
          signature: 'LetterFromDictation'
        }
      };
    }
  }

  /**
   * Check if DSPy is available for quick letter processing
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await this.dspyService.isDSPyEnabled(this.agentType);
    } catch (error) {
      logger.error('Failed to check LetterProcessor availability', { error });
      return false;
    }
  }

  /**
   * Get current server connection status
   */
  getConnectionStatus(): 'unknown' | 'healthy' | 'unhealthy' {
    return this.dspyService.getConnectionStatus();
  }

  /**
   * Run evaluation on quick letter task
   */
  async runEvaluation(options: { devSetPath?: string; freshRun?: boolean } = {}) {
    return this.dspyService.runEvaluation(this.agentType, options);
  }

  /**
   * Run GEPA optimization on quick letter task
   */
  async runOptimization(options: { iterations?: number; withHuman?: boolean } = {}) {
    return this.dspyService.runOptimization(this.agentType, options);
  }

  /**
   * Validate letter format and quality
   */
  async validateLetterFormat(reportText: string): Promise<{
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check for common letter format issues
    if (reportText.length < 50) {
      issues.push('Letter is too short');
      suggestions.push('Add more clinical detail');
    }

    if (reportText.includes('Dear')) {
      issues.push('Contains salutation which should be removed');
      suggestions.push('Remove "Dear" greeting');
    }

    if (reportText.includes('Kind regards') || reportText.includes('Yours sincerely')) {
      issues.push('Contains sign-off which should be removed');
      suggestions.push('Remove closing signature');
    }

    // Check for paragraph structure
    const paragraphs = reportText.split('\n\n').filter(p => p.trim());
    if (paragraphs.length < 2) {
      issues.push('Lacks proper paragraph structure');
      suggestions.push('Break content into logical paragraphs');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }
}