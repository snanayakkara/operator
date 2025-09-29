/**
 * DSPy Angiogram/PCI Processor Wrapper
 *
 * TypeScript wrapper for the external DSPy angiogram processing pipeline.
 * Provides type-safe interface to the Python DSPy predictors.
 */

import { DSPyService } from '../DSPyService';
import type {
  AngioToReportInput,
  AngioToReportOutput,
  DSPyPredictor,
  DSPyPredictorOptions,
  DSPyPipelineResult
} from './DSPyTypes';
import { logger } from '@/utils/Logger';

export class AngioProcessor implements DSPyPredictor<AngioToReportInput, AngioToReportOutput> {
  private dspyService: DSPyService;
  private readonly agentType = 'angiogram-pci';

  constructor() {
    this.dspyService = DSPyService.getInstance();
  }

  /**
   * Process angiogram/PCI transcript using DSPy predictor
   */
  async predict(input: AngioToReportInput, options: DSPyPredictorOptions = {}): Promise<AngioToReportOutput> {
    try {
      logger.info('Processing angiogram transcript with DSPy', {
        component: 'AngioProcessor',
        transcript_length: input.transcript.length,
        options
      });

      const result = await this.dspyService.processWithDSPy(
        this.agentType,
        input.transcript,
        {
          timeout: options.timeout_ms || 60000,
          ...options
        }
      );

      if (!result.success) {
        throw new Error(result.error || 'DSPy processing failed');
      }

      const output: AngioToReportOutput = {
        report_text: result.result || '',
        confidence: 0.9, // TODO: Get from DSPy response
        metadata: {
          processing_time_ms: result.processing_time,
          cached: result.cached,
          agent_type: this.agentType
        }
      };

      logger.info('Angiogram DSPy processing completed', {
        component: 'AngioProcessor',
        output_length: output.report_text.length,
        processing_time: result.processing_time,
        cached: result.cached
      });

      return output;

    } catch (error) {
      logger.error('Angiogram DSPy processing failed', {
        component: 'AngioProcessor',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  /**
   * Alias for predict() - follows DSPy naming convention
   */
  async forward(input: AngioToReportInput, options?: DSPyPredictorOptions): Promise<AngioToReportOutput> {
    return this.predict(input, options);
  }

  /**
   * Process with full pipeline result (includes metadata)
   */
  async processWithMetadata(input: AngioToReportInput, options: DSPyPredictorOptions = {}): Promise<DSPyPipelineResult> {
    const startTime = Date.now();

    try {
      const output = await this.predict(input, options);

      return {
        success: true,
        output,
        processing_time_ms: Date.now() - startTime,
        metadata: {
          agent_type: this.agentType,
          signature: 'AngioToReport',
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
          signature: 'AngioToReport'
        }
      };
    }
  }

  /**
   * Check if DSPy is available for angiogram processing
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await this.dspyService.isDSPyEnabled(this.agentType);
    } catch (error) {
      logger.error('Failed to check AngioProcessor availability', { error });
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
   * Run evaluation on angiogram task
   */
  async runEvaluation(options: { devSetPath?: string; freshRun?: boolean } = {}) {
    return this.dspyService.runEvaluation(this.agentType, options);
  }

  /**
   * Run GEPA optimization on angiogram task
   */
  async runOptimization(options: { iterations?: number; withHuman?: boolean } = {}) {
    return this.dspyService.runOptimization(this.agentType, options);
  }
}