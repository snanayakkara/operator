/**
 * GEPA Error Surface Evaluator
 *
 * Evaluates error patterns and failure resilience:
 * - Exception tracking and categorization
 * - Retry behavior analysis
 * - Critical error pattern detection
 * - Failure rate monitoring
 */

import type {
  GEPAEvaluator,
  GEPAEvaluationResult,
  ErrorSurfaceEvaluationCriteria,
  PerformanceMetrics
} from './GEPATypes';
import type { AgentType } from '@/types/medical.types';
import { logger } from '@/utils/Logger';

interface ErrorAnalysisResult {
  totalErrors: number;
  criticalErrors: number;
  retrySuccess: boolean;
  errorTypes: Record<string, number>;
  criticalPatterns: string[];
}

export class ErrorSurfaceEvaluator implements GEPAEvaluator<ErrorSurfaceEvaluationCriteria> {
  public readonly name = 'ErrorSurfaceEvaluator';
  public readonly description = 'Evaluates error patterns, retry behavior, and failure resilience';

  private criteria: ErrorSurfaceEvaluationCriteria;
  private errorHistory: Array<{
    timestamp: number;
    errors: PerformanceMetrics['errors'];
    retryCount: number;
  }> = [];

  constructor(criteria?: ErrorSurfaceEvaluationCriteria) {
    this.criteria = criteria || this.getDefaultCriteria();
  }


  /**
   * Evaluate error surface metrics
   */
  async evaluate(metrics: PerformanceMetrics, criteria?: ErrorSurfaceEvaluationCriteria): Promise<GEPAEvaluationResult> {
    const evalCriteria = criteria || this.criteria;
    const startTime = Date.now();

    try {
      logger.debug('Starting error surface evaluation', {
        component: 'ErrorSurfaceEvaluator',
        errorCount: metrics.errors.length,
        retryCount: metrics.retryCount
      });

      // Add to error history
      this.errorHistory.push({
        timestamp: Date.now(),
        errors: metrics.errors,
        retryCount: metrics.retryCount
      });

      // Keep last 50 error records
      if (this.errorHistory.length > 50) {
        this.errorHistory = this.errorHistory.slice(-50);
      }

      const errorAnalysis = this.analyzeErrors(metrics.errors);
      const results = await Promise.all([
        this.evaluateRetryBehavior(metrics.retryCount, evalCriteria.maxRetries),
        this.evaluateErrorTypes(errorAnalysis.errorTypes, evalCriteria.allowedExceptionTypes),
        this.evaluateFailureRate(evalCriteria.maxFailureRate),
        this.evaluateCriticalPatterns(errorAnalysis.criticalPatterns, evalCriteria.criticalErrorPatterns)
      ]);

      // Calculate overall score
      const totalScore = results.reduce((sum, result) => sum + result.score, 0);
      const maxScore = results.reduce((sum, result) => sum + result.maxScore, 0);
      const overallScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 100; // Default to 100 if no errors

      // Compile feedback
      const allFeedback = results.map(r => r.feedback).filter(f => f);
      const allSuggestions = results.flatMap(r => r.suggestions);

      const result: GEPAEvaluationResult = {
        criteria: 'error_surface',
        score: Math.round(overallScore),
        maxScore: 100,
        passed: overallScore >= 85, // 85% threshold for error resilience
        feedback: allFeedback.join(' ') || 'No significant errors detected',
        suggestions: allSuggestions,
        metadata: {
          subResults: results,
          processingTimeMs: Date.now() - startTime,
          criteriaUsed: evalCriteria,
          errorAnalysis,
          currentFailureRate: this.calculateCurrentFailureRate()
        }
      };

      logger.debug('Error surface evaluation completed', {
        component: 'ErrorSurfaceEvaluator',
        score: result.score,
        passed: result.passed,
        totalErrors: errorAnalysis.totalErrors,
        criticalErrors: errorAnalysis.criticalErrors
      });

      return result;

    } catch (error) {
      logger.error('Error surface evaluation failed', {
        component: 'ErrorSurfaceEvaluator',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        criteria: 'error_surface',
        score: 0,
        maxScore: 100,
        passed: false,
        feedback: `Error surface evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestions: ['Check error monitoring setup'],
        metadata: {
          error: true,
          processingTimeMs: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Analyze error patterns
   */
  private analyzeErrors(errors: PerformanceMetrics['errors']): ErrorAnalysisResult {
    const errorTypes: Record<string, number> = {};
    const criticalPatterns: string[] = [];

    for (const error of errors) {
      // Count error types
      errorTypes[error.type] = (errorTypes[error.type] || 0) + 1;

      // Detect critical patterns
      if (this.isCriticalError(error)) {
        criticalPatterns.push(error.message);
      }
    }

    return {
      totalErrors: errors.length,
      criticalErrors: criticalPatterns.length,
      retrySuccess: errors.length > 0, // If we have errors but still got here, retries worked
      errorTypes,
      criticalPatterns
    };
  }

  /**
   * Check if error is critical
   */
  private isCriticalError(error: PerformanceMetrics['errors'][0]): boolean {
    const criticalKeywords = [
      'out of memory',
      'connection refused',
      'authentication failed',
      'permission denied',
      'corrupted',
      'fatal',
      'panic',
      'segmentation fault'
    ];

    const errorMessage = error.message.toLowerCase();
    return criticalKeywords.some(keyword => errorMessage.includes(keyword));
  }

  /**
   * Evaluate retry behavior
   */
  private async evaluateRetryBehavior(retryCount: number, maxRetries: number): Promise<{
    score: number;
    maxScore: number;
    feedback: string;
    suggestions: string[];
  }> {
    const isWithinLimit = retryCount <= maxRetries;

    return {
      score: isWithinLimit ? 1 : Math.max(0, 1 - (retryCount - maxRetries) / maxRetries),
      maxScore: 1,
      feedback: isWithinLimit
        ? `Retry count ${retryCount} within limit`
        : `Retry count ${retryCount} exceeds limit of ${maxRetries}`,
      suggestions: retryCount > maxRetries
        ? ['Investigate root cause of failures', 'Optimize retry strategy', 'Check service dependencies']
        : []
    };
  }

  /**
   * Evaluate error types
   */
  private async evaluateErrorTypes(errorTypes: Record<string, number>, allowedTypes: string[]): Promise<{
    score: number;
    maxScore: number;
    feedback: string;
    suggestions: string[];
  }> {
    const disallowedTypes = Object.keys(errorTypes).filter(type => !allowedTypes.includes(type));
    const score = disallowedTypes.length === 0 ? 1 : Math.max(0, 1 - disallowedTypes.length * 0.2);

    return {
      score,
      maxScore: 1,
      feedback: disallowedTypes.length > 0
        ? `Encountered disallowed error types: ${disallowedTypes.join(', ')}`
        : 'All error types are within allowed categories',
      suggestions: disallowedTypes.map(type => `Investigate and handle ${type} errors`)
    };
  }

  /**
   * Evaluate failure rate
   */
  private async evaluateFailureRate(maxFailureRate: number): Promise<{
    score: number;
    maxScore: number;
    feedback: string;
    suggestions: string[];
  }> {
    const currentFailureRate = this.calculateCurrentFailureRate();
    const isWithinLimit = currentFailureRate <= maxFailureRate;

    return {
      score: isWithinLimit ? 1 : Math.max(0, 1 - (currentFailureRate - maxFailureRate) / maxFailureRate),
      maxScore: 1,
      feedback: isWithinLimit
        ? `Failure rate ${(currentFailureRate * 100).toFixed(1)}% within limit`
        : `Failure rate ${(currentFailureRate * 100).toFixed(1)}% exceeds limit of ${(maxFailureRate * 100).toFixed(1)}%`,
      suggestions: !isWithinLimit
        ? ['Monitor failure trends', 'Improve error handling', 'Review system stability']
        : []
    };
  }

  /**
   * Evaluate critical error patterns
   */
  private async evaluateCriticalPatterns(patterns: string[], criticalPatterns: string[]): Promise<{
    score: number;
    maxScore: number;
    feedback: string;
    suggestions: string[];
  }> {
    const foundCritical = patterns.filter(pattern =>
      criticalPatterns.some(critical => pattern.toLowerCase().includes(critical.toLowerCase()))
    );

    const score = foundCritical.length === 0 ? 1 : 0;

    return {
      score,
      maxScore: 1,
      feedback: foundCritical.length > 0
        ? `Critical error patterns detected: ${foundCritical.length} instances`
        : 'No critical error patterns detected',
      suggestions: foundCritical.length > 0
        ? ['Immediate investigation required', 'Review system logs', 'Alert development team']
        : []
    };
  }

  /**
   * Calculate current failure rate
   */
  private calculateCurrentFailureRate(): number {
    if (this.errorHistory.length === 0) return 0;

    const recentHistory = this.errorHistory.slice(-20); // Last 20 sessions
    const sessionsWithErrors = recentHistory.filter(session => session.errors.length > 0).length;

    return sessionsWithErrors / recentHistory.length;
  }

  /**
   * Get default criteria
   */
  getDefaultCriteria(): ErrorSurfaceEvaluationCriteria {
    return {
      maxRetries: 3,
      allowedExceptionTypes: [
        'timeout',
        'network',
        'validation',
        'parsing',
        'user_cancellation'
      ],
      maxFailureRate: 0.05, // 5% failure rate
      criticalErrorPatterns: [
        'out of memory',
        'connection refused',
        'authentication failed',
        'corrupted data',
        'fatal error'
      ]
    };
  }

  /**
   * Get evaluation criteria
   */
  getCriteria(): ErrorSurfaceEvaluationCriteria {
    return this.criteria;
  }

  /**
   * Set evaluation criteria
   */
  setCriteria(criteria: ErrorSurfaceEvaluationCriteria): void {
    this.criteria = criteria;
  }

  /**
   * Get criteria for specific agent type
   */
  static getCriteriaForAgent(agentType: AgentType): ErrorSurfaceEvaluationCriteria {
    const baseCriteria = new ErrorSurfaceEvaluator().getDefaultCriteria();

    switch (agentType) {
      case 'quick-letter':
        return {
          ...baseCriteria,
          maxRetries: 2, // Lower retry tolerance for quick operations
          maxFailureRate: 0.02 // 2% failure rate for simple operations
        };

      case 'angiogram-pci':
      case 'tavi':
        return {
          ...baseCriteria,
          maxRetries: 5, // Higher retry tolerance for complex procedures
          maxFailureRate: 0.1, // 10% failure rate acceptable for complex operations
          criticalErrorPatterns: [
            ...baseCriteria.criticalErrorPatterns,
            'medical data corruption',
            'structured parsing failed'
          ]
        };

      default:
        return baseCriteria;
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalSessions: number;
    sessionsWithErrors: number;
    failureRate: number;
    commonErrorTypes: Array<{ type: string; count: number }>;
    criticalErrorCount: number;
  } {
    if (this.errorHistory.length === 0) {
      return {
        totalSessions: 0,
        sessionsWithErrors: 0,
        failureRate: 0,
        commonErrorTypes: [],
        criticalErrorCount: 0
      };
    }

    const errorTypeCounts: Record<string, number> = {};
    let criticalErrorCount = 0;
    let sessionsWithErrors = 0;

    for (const session of this.errorHistory) {
      if (session.errors.length > 0) {
        sessionsWithErrors++;

        for (const error of session.errors) {
          errorTypeCounts[error.type] = (errorTypeCounts[error.type] || 0) + 1;

          if (this.isCriticalError(error)) {
            criticalErrorCount++;
          }
        }
      }
    }

    const commonErrorTypes = Object.entries(errorTypeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalSessions: this.errorHistory.length,
      sessionsWithErrors,
      failureRate: sessionsWithErrors / this.errorHistory.length,
      commonErrorTypes,
      criticalErrorCount
    };
  }
}