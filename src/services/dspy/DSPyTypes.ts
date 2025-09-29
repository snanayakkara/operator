/**
 * TypeScript types for DSPy integration
 *
 * These types correspond to the Python DSPy signatures and predictors
 * defined in the external llm/ directory for type-safe browser integration.
 */

export interface DSPySignatureInput {
  transcript: string;
  context?: string;
  metadata?: Record<string, any>;
}

export interface DSPySignatureOutput {
  report_text: string;
  confidence?: number;
  metadata?: Record<string, any>;
}

export interface DSPyPredictorOptions {
  temperature?: number;
  max_tokens?: number;
  timeout_ms?: number;
  use_cache?: boolean;
}

/**
 * Angiogram/PCI Report Signature
 * Corresponds to AngioToReport in llm/signatures.py
 */
export interface AngioToReportInput extends DSPySignatureInput {
  transcript: string;
}

export interface AngioToReportOutput extends DSPySignatureOutput {
  report_text: string;
}

/**
 * Quick Letter Signature
 * Corresponds to LetterFromDictation in llm/signatures.py
 */
export interface LetterFromDictationInput extends DSPySignatureInput {
  transcript: string;
}

export interface LetterFromDictationOutput extends DSPySignatureOutput {
  report_text: string;
}

/**
 * TAVI Report Signature
 * Corresponds to TAVIToStructuredReport in llm/signatures.py
 */
export interface TAVIToStructuredReportInput extends DSPySignatureInput {
  transcript: string;
}

export interface TAVIToStructuredReportOutput extends DSPySignatureOutput {
  report_text: string;
  structured_data?: Record<string, any>;
}

/**
 * Investigation Summary Signature
 * Corresponds to InvestigationToSummary in llm/signatures.py
 */
export interface InvestigationToSummaryInput extends DSPySignatureInput {
  transcript: string;
}

export interface InvestigationToSummaryOutput extends DSPySignatureOutput {
  report_text: string;
}

/**
 * Consultation Signature
 * Corresponds to ConsultationToReport in llm/signatures.py
 */
export interface ConsultationToReportInput extends DSPySignatureInput {
  transcript: string;
}

export interface ConsultationToReportOutput extends DSPySignatureOutput {
  report_text: string;
}

/**
 * Generic DSPy Predictor Interface
 */
export interface DSPyPredictor<TInput extends DSPySignatureInput, TOutput extends DSPySignatureOutput> {
  predict(input: TInput, options?: DSPyPredictorOptions): Promise<TOutput>;
  forward(input: TInput, options?: DSPyPredictorOptions): Promise<TOutput>;
}

/**
 * DSPy Module Interface
 */
export interface DSPyModule {
  name: string;
  signature: string;
  description: string;
  predictors: string[];
}

/**
 * DSPy Pipeline Result
 */
export interface DSPyPipelineResult {
  success: boolean;
  output?: DSPySignatureOutput;
  error?: string;
  processing_time_ms: number;
  cache_hit?: boolean;
  metadata?: {
    model_used?: string;
    prompt_version?: string;
    temperature?: number;
    max_tokens?: number;
    agent_type?: string;
    signature?: string;
  };
}

/**
 * DSPy Evaluation Metrics
 */
export interface DSPyEvaluationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  custom_metrics: Record<string, number>;
  total_examples: number;
  correct_examples: number;
}

/**
 * DSPy Optimization Result
 */
export interface DSPyOptimizationResult {
  initial_score: number;
  final_score: number;
  improvement: number;
  iterations_completed: number;
  best_prompt: string;
  optimization_history: Array<{
    iteration: number;
    score: number;
    prompt: string;
  }>;
}