/**
 * GEPA Latency Evaluator
 *
 * Evaluates performance metrics and latency constraints:
 * - Transcription timing
 * - Processing timing
 * - Total workflow timing
 * - Performance percentiles and SLO compliance
 */

import type {
  GEPAEvaluator,
  GEPAEvaluationResult,
  LatencyEvaluationCriteria,
  PerformanceMetrics
} from './GEPATypes';
import type { AgentType } from '@/types/medical.types';
import { logger } from '@/utils/Logger';

export class LatencyEvaluator implements GEPAEvaluator<LatencyEvaluationCriteria> {
  public readonly name = 'LatencyEvaluator';
  public readonly description = 'Evaluates performance metrics and latency constraints for workflow timing';

  private criteria: LatencyEvaluationCriteria;
  private performanceHistory: PerformanceMetrics[] = [];

  constructor(criteria?: LatencyEvaluationCriteria) {
    this.criteria = criteria || this.getDefaultCriteria();
  }


  /**
   * Evaluate performance metrics against latency criteria
   */
  async evaluate(metrics: PerformanceMetrics, criteria?: LatencyEvaluationCriteria): Promise<GEPAEvaluationResult> {
    const evalCriteria = criteria || this.criteria;
    const startTime = Date.now();

    try {
      logger.debug('Starting latency evaluation', {
        component: 'LatencyEvaluator',
        metrics
      });

      // Add to performance history for percentile calculations
      this.performanceHistory.push(metrics);
      if (this.performanceHistory.length > 100) {
        this.performanceHistory = this.performanceHistory.slice(-100); // Keep last 100 records
      }

      const results = await Promise.all([
        this.evaluateTranscriptionLatency(metrics, evalCriteria.maxTranscriptionTime),
        this.evaluateProcessingLatency(metrics, evalCriteria.maxProcessingTime),
        this.evaluateTotalLatency(metrics, evalCriteria.maxTotalTime),
        this.evaluatePerformancePercentile(metrics, evalCriteria.targetPerformancePercentile)
      ]);

      // Calculate overall score
      const totalScore = results.reduce((sum, result) => sum + result.score, 0);
      const maxScore = results.reduce((sum, result) => sum + result.maxScore, 0);
      const overallScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

      // Compile feedback
      const allFeedback = results.map(r => r.feedback).filter(f => f);
      const allSuggestions = results.flatMap(r => r.suggestions);

      const result: GEPAEvaluationResult = {
        criteria: 'latency',
        score: Math.round(overallScore),
        maxScore: 100,
        passed: overallScore >= 75, // 75% threshold for latency
        feedback: allFeedback.join(' '),
        suggestions: allSuggestions,
        metadata: {
          subResults: results,
          processingTimeMs: Date.now() - startTime,
          criteriaUsed: evalCriteria,
          actualTimings: this.extractTimings(metrics),
          performancePercentile: this.calculatePercentile(metrics)
        }
      };

      logger.debug('Latency evaluation completed', {
        component: 'LatencyEvaluator',
        score: result.score,
        passed: result.passed,
        actualTimings: result.metadata?.actualTimings
      });

      return result;

    } catch (error) {
      logger.error('Latency evaluation failed', {
        component: 'LatencyEvaluator',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        criteria: 'latency',
        score: 0,
        maxScore: 100,
        passed: false,
        feedback: `Latency evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestions: ['Check performance monitoring setup'],
        metadata: {
          error: true,
          processingTimeMs: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Evaluate transcription latency
   */
  private async evaluateTranscriptionLatency(metrics: PerformanceMetrics, maxTime: number): Promise<{
    score: number;
    maxScore: number;
    feedback: string;
    suggestions: string[];
  }> {
    const transcriptionTime = metrics.transcriptionEndTime - metrics.transcriptionStartTime;
    const isWithinLimit = transcriptionTime <= maxTime;

    return {
      score: isWithinLimit ? 1 : Math.max(0, 1 - (transcriptionTime - maxTime) / maxTime),
      maxScore: 1,
      feedback: isWithinLimit
        ? `Transcription time ${transcriptionTime}ms within limit`
        : `Transcription time ${transcriptionTime}ms exceeds limit of ${maxTime}ms`,
      suggestions: !isWithinLimit
        ? ['Optimize transcription service', 'Check audio quality', 'Monitor server load']
        : []
    };
  }

  /**
   * Evaluate processing latency
   */
  private async evaluateProcessingLatency(metrics: PerformanceMetrics, maxTime: number): Promise<{
    score: number;
    maxScore: number;
    feedback: string;
    suggestions: string[];
  }> {
    const processingTime = metrics.processingEndTime - metrics.processingStartTime;
    const isWithinLimit = processingTime <= maxTime;

    return {
      score: isWithinLimit ? 1 : Math.max(0, 1 - (processingTime - maxTime) / maxTime),
      maxScore: 1,
      feedback: isWithinLimit
        ? `Processing time ${processingTime}ms within limit`
        : `Processing time ${processingTime}ms exceeds limit of ${maxTime}ms`,
      suggestions: !isWithinLimit
        ? ['Optimize agent processing', 'Review model configuration', 'Check LM Studio performance']
        : []
    };
  }

  /**
   * Evaluate total workflow latency
   */
  private async evaluateTotalLatency(metrics: PerformanceMetrics, maxTime: number): Promise<{
    score: number;
    maxScore: number;
    feedback: string;
    suggestions: string[];
  }> {
    const totalTime = metrics.totalEndTime - metrics.totalStartTime;
    const isWithinLimit = totalTime <= maxTime;

    return {
      score: isWithinLimit ? 1 : Math.max(0, 1 - (totalTime - maxTime) / maxTime),
      maxScore: 1,
      feedback: isWithinLimit
        ? `Total workflow time ${totalTime}ms within limit`
        : `Total workflow time ${totalTime}ms exceeds limit of ${maxTime}ms`,
      suggestions: !isWithinLimit
        ? ['Optimize overall workflow', 'Review queue management', 'Check system resources']
        : []
    };
  }

  /**
   * Evaluate performance percentile
   */
  private async evaluatePerformancePercentile(metrics: PerformanceMetrics, targetPercentile: number): Promise<{
    score: number;
    maxScore: number;
    feedback: string;
    suggestions: string[];
  }> {
    if (this.performanceHistory.length < 10) {
      return {
        score: 1, // Give benefit of doubt for insufficient data
        maxScore: 1,
        feedback: 'Insufficient performance history for percentile calculation',
        suggestions: []
      };
    }

    const currentTotal = metrics.totalEndTime - metrics.totalStartTime;
    const sortedTimes = this.performanceHistory
      .map(m => m.totalEndTime - m.totalStartTime)
      .sort((a, b) => a - b);

    const percentileIndex = Math.floor((targetPercentile / 100) * sortedTimes.length);
    const percentileTime = sortedTimes[percentileIndex];

    const isWithinPercentile = currentTotal <= percentileTime;

    return {
      score: isWithinPercentile ? 1 : 0.5, // Partial credit for percentile miss
      maxScore: 1,
      feedback: isWithinPercentile
        ? `Performance in ${targetPercentile}th percentile`
        : `Performance below ${targetPercentile}th percentile (${percentileTime}ms)`,
      suggestions: !isWithinPercentile
        ? ['Monitor performance trends', 'Investigate performance regression']
        : []
    };
  }

  /**
   * Extract timing information from metrics
   */
  private extractTimings(metrics: PerformanceMetrics): Record<string, number> {
    return {
      transcriptionTime: metrics.transcriptionEndTime - metrics.transcriptionStartTime,
      processingTime: metrics.processingEndTime - metrics.processingStartTime,
      totalTime: metrics.totalEndTime - metrics.totalStartTime,
      retryCount: metrics.retryCount
    };
  }

  /**
   * Calculate performance percentile for current metrics
   */
  private calculatePercentile(metrics: PerformanceMetrics): number {
    if (this.performanceHistory.length < 2) return 100;

    const currentTotal = metrics.totalEndTime - metrics.totalStartTime;
    const sortedTimes = this.performanceHistory
      .map(m => m.totalEndTime - m.totalStartTime)
      .sort((a, b) => a - b);

    const index = sortedTimes.findIndex(time => time >= currentTotal);
    return index === -1 ? 100 : (index / sortedTimes.length) * 100;
  }

  /**
   * Get default criteria
   */
  getDefaultCriteria(): LatencyEvaluationCriteria {
    return {
      maxTranscriptionTime: 30000, // 30 seconds
      maxProcessingTime: 60000,    // 60 seconds
      maxTotalTime: 120000,        // 2 minutes
      targetPerformancePercentile: 90
    };
  }

  /**
   * Get evaluation criteria
   */
  getCriteria(): LatencyEvaluationCriteria {
    return this.criteria;
  }

  /**
   * Set evaluation criteria
   */
  setCriteria(criteria: LatencyEvaluationCriteria): void {
    this.criteria = criteria;
  }

  /**
   * Get criteria for specific agent type
   */
  static getCriteriaForAgent(agentType: AgentType): LatencyEvaluationCriteria {
    const baseCriteria = new LatencyEvaluator().getDefaultCriteria();

    switch (agentType) {
      case 'quick-letter':
        return {
          ...baseCriteria,
          maxTranscriptionTime: 15000, // 15 seconds for quick letters
          maxProcessingTime: 30000,    // 30 seconds
          maxTotalTime: 60000          // 1 minute total
        };

      case 'angiogram-pci':
        return {
          ...baseCriteria,
          maxTranscriptionTime: 45000, // 45 seconds for complex procedures
          maxProcessingTime: 90000,    // 90 seconds
          maxTotalTime: 180000         // 3 minutes total
        };

      case 'tavi':
        return {
          ...baseCriteria,
          maxTranscriptionTime: 60000, // 60 seconds for TAVI
          maxProcessingTime: 120000,   // 2 minutes
          maxTotalTime: 240000         // 4 minutes total
        };

      default:
        return baseCriteria;
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    sampleSize: number;
    averageTranscriptionTime: number;
    averageProcessingTime: number;
    averageTotalTime: number;
    p90TotalTime: number;
    p95TotalTime: number;
  } {
    if (this.performanceHistory.length === 0) {
      return {
        sampleSize: 0,
        averageTranscriptionTime: 0,
        averageProcessingTime: 0,
        averageTotalTime: 0,
        p90TotalTime: 0,
        p95TotalTime: 0
      };
    }

    const transcriptionTimes = this.performanceHistory.map(m => m.transcriptionEndTime - m.transcriptionStartTime);
    const processingTimes = this.performanceHistory.map(m => m.processingEndTime - m.processingStartTime);
    const totalTimes = this.performanceHistory.map(m => m.totalEndTime - m.totalStartTime);

    const sortedTotalTimes = [...totalTimes].sort((a, b) => a - b);
    const p90Index = Math.floor(0.9 * sortedTotalTimes.length);
    const p95Index = Math.floor(0.95 * sortedTotalTimes.length);

    return {
      sampleSize: this.performanceHistory.length,
      averageTranscriptionTime: transcriptionTimes.reduce((a, b) => a + b, 0) / transcriptionTimes.length,
      averageProcessingTime: processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length,
      averageTotalTime: totalTimes.reduce((a, b) => a + b, 0) / totalTimes.length,
      p90TotalTime: sortedTotalTimes[p90Index] || 0,
      p95TotalTime: sortedTotalTimes[p95Index] || 0
    };
  }
}