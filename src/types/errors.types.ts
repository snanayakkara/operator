/**
 * Custom Error Types for Medical Extension
 *
 * Provides specialized error classes for different failure scenarios
 * with enhanced context for user-friendly error handling.
 */

/**
 * Error thrown when LM Studio fails to load a model due to system resource constraints
 */
export class ModelLoadingError extends Error {
  public readonly isMemoryIssue: boolean;
  public readonly requestedModel: string;
  public readonly availableModels: string[];
  public readonly freeMemoryMB?: number;
  public readonly httpStatus?: number;
  public readonly rawErrorMessage: string;

  constructor(
    message: string,
    options: {
      requestedModel: string;
      isMemoryIssue?: boolean;
      availableModels?: string[];
      freeMemoryMB?: number;
      httpStatus?: number;
      rawErrorMessage?: string;
    }
  ) {
    super(message);
    this.name = 'ModelLoadingError';
    this.requestedModel = options.requestedModel;
    this.isMemoryIssue = options.isMemoryIssue ?? true;
    this.availableModels = options.availableModels || [];
    this.freeMemoryMB = options.freeMemoryMB;
    this.httpStatus = options.httpStatus;
    this.rawErrorMessage = options.rawErrorMessage || message;

    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ModelLoadingError);
    }
  }
}

/**
 * Type guard to check if an error is a ModelLoadingError
 */
export function isModelLoadingError(error: unknown): error is ModelLoadingError {
  return error instanceof ModelLoadingError ||
    (error instanceof Error && error.name === 'ModelLoadingError');
}
