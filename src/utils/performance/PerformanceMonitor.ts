/**
 * Performance Monitoring Suite for Medical Text Processing
 * 
 * Provides comprehensive performance tracking, metrics collection, and optimization
 * recommendations for the 14-agent medical AI system. Tracks processing times,
 * memory usage, and medical accuracy across all text processing operations.
 */

import { logger } from '@/utils/Logger';

export interface ProcessingMetrics {
  operation: string;
  agentType: string;
  processingTime: number;
  memoryUsage: number;
  inputLength: number;
  outputLength: number;
  patternMatches: number;
  confidenceScore?: number;
  medicalAccuracy?: number;
  australianCompliance?: boolean;
  timestamp: number;
}

export interface PerformanceBaseline {
  operation: string;
  averageTime: number;
  medianTime: number;
  p95Time: number;
  memoryAverage: number;
  successRate: number;
  lastUpdated: number;
}

export interface OptimizationRecommendation {
  type: 'CACHE_OPPORTUNITY' | 'MEMORY_OPTIMIZATION' | 'PATTERN_OPTIMIZATION' | 'BATCH_PROCESSING';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  estimatedImprovement: string;
  implementation: string;
  impact: {
    speedImprovement?: number;
    memoryReduction?: number;
    accuracyImprovement?: number;
  };
}

export interface PerformanceReport {
  period: string;
  totalOperations: number;
  averageProcessingTime: number;
  memoryEfficiency: number;
  medicalAccuracy: number;
  australianCompliance: number;
  topBottlenecks: string[];
  recommendations: OptimizationRecommendation[];
  trends: {
    processingTime: 'IMPROVING' | 'STABLE' | 'DEGRADING';
    memoryUsage: 'IMPROVING' | 'STABLE' | 'DEGRADING';
    accuracy: 'IMPROVING' | 'STABLE' | 'DEGRADING';
  };
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: ProcessingMetrics[] = [];
  private baselines: Map<string, PerformanceBaseline> = new Map();
  private maxMetricsHistory = 10000; // Keep last 10k operations
  private baselineUpdateInterval = 300000; // 5 minutes
  private lastBaselineUpdate = 0;

  private constructor() {
    logger.info('PerformanceMonitor initialized');
    this.initializeBaselines();
    this.startPeriodicReporting();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Track a medical text processing operation
   */
  public trackProcessing(metrics: ProcessingMetrics): void {
    const timestamp = Date.now();
    const enrichedMetrics: ProcessingMetrics = {
      ...metrics,
      timestamp
    };

    // Add to metrics history
    this.metrics.push(enrichedMetrics);

    // Maintain maximum history size
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    // Update baselines if needed
    if (timestamp - this.lastBaselineUpdate > this.baselineUpdateInterval) {
      this.updateBaselines();
      this.lastBaselineUpdate = timestamp;
    }

    // Log performance warnings for slow operations
    if (metrics.processingTime > this.getSlowOperationThreshold(metrics.operation)) {
      logger.warn('Slow medical text processing detected', {
        operation: metrics.operation,
        agentType: metrics.agentType,
        processingTime: metrics.processingTime,
        inputLength: metrics.inputLength
      });
    }

    // Log memory usage warnings
    if (metrics.memoryUsage > 50 * 1024 * 1024) { // 50MB threshold
      logger.warn('High memory usage in medical text processing', {
        operation: metrics.operation,
        agentType: metrics.agentType,
        memoryUsage: metrics.memoryUsage
      });
    }
  }

  /**
   * Start a performance measurement for an operation
   */
  public startMeasurement(operation: string, agentType: string): PerformanceMeasurement {
    return new PerformanceMeasurement(operation, agentType, this);
  }

  /**
   * Get current performance baselines for comparison
   */
  public getBaselines(): Map<string, PerformanceBaseline> {
    return new Map(this.baselines);
  }

  /**
   * Generate optimization recommendations based on current metrics
   */
  public getOptimizationRecommendations(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    const recentMetrics = this.getRecentMetrics(3600000); // Last hour

    // Analyze for caching opportunities
    const cacheOpportunities = this.analyzeCacheOpportunities(recentMetrics);
    recommendations.push(...cacheOpportunities);

    // Analyze for memory optimization
    const memoryOptimizations = this.analyzeMemoryOptimizations(recentMetrics);
    recommendations.push(...memoryOptimizations);

    // Analyze for pattern optimization
    const patternOptimizations = this.analyzePatternOptimizations(recentMetrics);
    recommendations.push(...patternOptimizations);

    // Analyze for batch processing opportunities
    const batchOptimizations = this.analyzeBatchProcessingOpportunities(recentMetrics);
    recommendations.push(...batchOptimizations);

    // Sort by priority and impact
    return recommendations.sort((a, b) => {
      const priorityWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    });
  }

  /**
   * Generate comprehensive performance report
   */
  public generatePerformanceReport(periodHours: number = 24): PerformanceReport {
    const periodMs = periodHours * 60 * 60 * 1000;
    const recentMetrics = this.getRecentMetrics(periodMs);

    if (recentMetrics.length === 0) {
      return this.getEmptyReport(periodHours);
    }

    const averageProcessingTime = recentMetrics.reduce((sum, m) => sum + m.processingTime, 0) / recentMetrics.length;
    const averageMemoryUsage = recentMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / recentMetrics.length;

    // Calculate medical accuracy (only for metrics with accuracy data)
    const accuracyMetrics = recentMetrics.filter(m => m.medicalAccuracy !== undefined);
    const medicalAccuracy = accuracyMetrics.length > 0 
      ? accuracyMetrics.reduce((sum, m) => sum + (m.medicalAccuracy || 0), 0) / accuracyMetrics.length
      : 0;

    // Calculate Australian compliance
    const complianceMetrics = recentMetrics.filter(m => m.australianCompliance !== undefined);
    const australianCompliance = complianceMetrics.length > 0
      ? complianceMetrics.filter(m => m.australianCompliance).length / complianceMetrics.length
      : 0;

    // Identify top bottlenecks
    const operationTimes = new Map<string, number[]>();
    recentMetrics.forEach(m => {
      if (!operationTimes.has(m.operation)) {
        operationTimes.set(m.operation, []);
      }
      operationTimes.get(m.operation)!.push(m.processingTime);
    });

    const topBottlenecks = Array.from(operationTimes.entries())
      .map(([operation, times]) => ({
        operation,
        averageTime: times.reduce((sum, t) => sum + t, 0) / times.length
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 5)
      .map(item => `${item.operation} (${item.averageTime.toFixed(2)}ms avg)`);

    return {
      period: `${periodHours}h`,
      totalOperations: recentMetrics.length,
      averageProcessingTime,
      memoryEfficiency: this.calculateMemoryEfficiency(averageMemoryUsage),
      medicalAccuracy,
      australianCompliance,
      topBottlenecks,
      recommendations: this.getOptimizationRecommendations(),
      trends: this.calculateTrends(recentMetrics)
    };
  }

  /**
   * Get real-time performance statistics
   */
  public getRealTimeStats(): {
    currentOperations: number;
    averageProcessingTime: number;
    memoryUsage: number;
    recentErrors: number;
    topOperations: Array<{ operation: string; count: number; avgTime: number }>;
  } {
    const last5Minutes = this.getRecentMetrics(300000); // 5 minutes

    const operationStats = new Map<string, { count: number; totalTime: number }>();
    
    last5Minutes.forEach(m => {
      if (!operationStats.has(m.operation)) {
        operationStats.set(m.operation, { count: 0, totalTime: 0 });
      }
      const stats = operationStats.get(m.operation)!;
      stats.count++;
      stats.totalTime += m.processingTime;
    });

    const topOperations = Array.from(operationStats.entries())
      .map(([operation, stats]) => ({
        operation,
        count: stats.count,
        avgTime: stats.totalTime / stats.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      currentOperations: last5Minutes.length,
      averageProcessingTime: last5Minutes.reduce((sum, m) => sum + m.processingTime, 0) / Math.max(last5Minutes.length, 1),
      memoryUsage: last5Minutes.reduce((sum, m) => sum + m.memoryUsage, 0) / Math.max(last5Minutes.length, 1),
      recentErrors: 0, // TODO: Implement error tracking
      topOperations
    };
  }

  /**
   * Clear all metrics (useful for testing)
   */
  public clearMetrics(): void {
    this.metrics = [];
    this.baselines.clear();
    this.lastBaselineUpdate = 0;
    logger.info('Performance metrics cleared');
  }

  // Private helper methods

  private initializeBaselines(): void {
    // Initialize with default baselines for common operations
    const defaultBaselines = [
      { operation: 'asr_corrections', averageTime: 50, medianTime: 45, p95Time: 120, memoryAverage: 2 * 1024 * 1024, successRate: 0.98 },
      { operation: 'medical_text_cleaning', averageTime: 25, medianTime: 20, p95Time: 60, memoryAverage: 1 * 1024 * 1024, successRate: 0.99 },
      { operation: 'pattern_extraction', averageTime: 75, medianTime: 65, p95Time: 180, memoryAverage: 3 * 1024 * 1024, successRate: 0.95 },
      { operation: 'agent_processing', averageTime: 200, medianTime: 180, p95Time: 500, memoryAverage: 5 * 1024 * 1024, successRate: 0.92 }
    ];

    defaultBaselines.forEach(baseline => {
      this.baselines.set(baseline.operation, {
        ...baseline,
        lastUpdated: Date.now()
      });
    });
  }

  private getRecentMetrics(periodMs: number): ProcessingMetrics[] {
    const cutoff = Date.now() - periodMs;
    return this.metrics.filter(m => m.timestamp > cutoff);
  }

  private updateBaselines(): void {
    const recentMetrics = this.getRecentMetrics(3600000); // Last hour
    
    // Group by operation
    const operationGroups = new Map<string, ProcessingMetrics[]>();
    recentMetrics.forEach(m => {
      if (!operationGroups.has(m.operation)) {
        operationGroups.set(m.operation, []);
      }
      operationGroups.get(m.operation)!.push(m);
    });

    // Update baselines for each operation
    operationGroups.forEach((metrics, operation) => {
      if (metrics.length < 10) return; // Need at least 10 samples

      const times = metrics.map(m => m.processingTime).sort((a, b) => a - b);
      const memories = metrics.map(m => m.memoryUsage);

      const baseline: PerformanceBaseline = {
        operation,
        averageTime: times.reduce((sum, t) => sum + t, 0) / times.length,
        medianTime: times[Math.floor(times.length / 2)],
        p95Time: times[Math.floor(times.length * 0.95)],
        memoryAverage: memories.reduce((sum, m) => sum + m, 0) / memories.length,
        successRate: 1.0, // TODO: Implement error tracking
        lastUpdated: Date.now()
      };

      this.baselines.set(operation, baseline);
    });

    logger.debug('Performance baselines updated', {
      operations: operationGroups.size,
      totalSamples: recentMetrics.length
    });
  }

  private getSlowOperationThreshold(operation: string): number {
    const baseline = this.baselines.get(operation);
    return baseline ? baseline.p95Time * 2 : 1000; // Default 1s threshold
  }

  private analyzeCacheOpportunities(metrics: ProcessingMetrics[]): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    
    // Look for repeated pattern processing
    const patternOperations = metrics.filter(m => m.operation.includes('pattern') || m.operation.includes('asr'));
    if (patternOperations.length > 100) { // High volume
      recommendations.push({
        type: 'CACHE_OPPORTUNITY',
        priority: 'HIGH',
        description: 'High volume pattern processing detected - implement pattern compilation caching',
        estimatedImprovement: '40-60% speed improvement',
        implementation: 'Add pattern compilation cache to ASRCorrectionEngine and MedicalPatternService',
        impact: {
          speedImprovement: 0.5,
          memoryReduction: 0.2
        }
      });
    }

    return recommendations;
  }

  private analyzeMemoryOptimizations(metrics: ProcessingMetrics[]): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    
    const avgMemory = metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / metrics.length;
    if (avgMemory > 10 * 1024 * 1024) { // 10MB average
      recommendations.push({
        type: 'MEMORY_OPTIMIZATION',
        priority: 'MEDIUM',
        description: 'High memory usage detected - implement object pooling',
        estimatedImprovement: '30% memory reduction',
        implementation: 'Implement shared object pools for frequent operations',
        impact: {
          memoryReduction: 0.3
        }
      });
    }

    return recommendations;
  }

  private analyzePatternOptimizations(metrics: ProcessingMetrics[]): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    
    const patternMetrics = metrics.filter(m => m.patternMatches > 0);
    const avgMatchesPerOperation = patternMetrics.reduce((sum, m) => sum + m.patternMatches, 0) / Math.max(patternMetrics.length, 1);
    
    if (avgMatchesPerOperation > 50) {
      recommendations.push({
        type: 'PATTERN_OPTIMIZATION',
        priority: 'MEDIUM',
        description: 'High pattern matching volume - optimize regex compilation',
        estimatedImprovement: '25% speed improvement',
        implementation: 'Pre-compile regex patterns and use shared pattern pool',
        impact: {
          speedImprovement: 0.25
        }
      });
    }

    return recommendations;
  }

  private analyzeBatchProcessingOpportunities(metrics: ProcessingMetrics[]): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    
    // Look for rapid sequential operations
    const recentOperations = metrics.slice(-100);
    const timeGaps = [];
    
    for (let i = 1; i < recentOperations.length; i++) {
      timeGaps.push(recentOperations[i].timestamp - recentOperations[i-1].timestamp);
    }
    
    const avgGap = timeGaps.reduce((sum, gap) => sum + gap, 0) / timeGaps.length;
    if (avgGap < 100) { // Less than 100ms between operations
      recommendations.push({
        type: 'BATCH_PROCESSING',
        priority: 'HIGH',
        description: 'Rapid sequential operations detected - implement batch processing',
        estimatedImprovement: '50% throughput improvement',
        implementation: 'Add batch processing capabilities to ASRCorrectionEngine',
        impact: {
          speedImprovement: 0.5
        }
      });
    }

    return recommendations;
  }

  private calculateMemoryEfficiency(avgMemoryUsage: number): number {
    // Efficiency score based on memory usage (lower is better)
    const baselineMemory = 5 * 1024 * 1024; // 5MB baseline
    return Math.max(0, 1 - (avgMemoryUsage - baselineMemory) / (20 * 1024 * 1024));
  }

  private calculateTrends(metrics: ProcessingMetrics[]): PerformanceReport['trends'] {
    if (metrics.length < 20) {
      return {
        processingTime: 'STABLE',
        memoryUsage: 'STABLE',
        accuracy: 'STABLE'
      };
    }

    const half = Math.floor(metrics.length / 2);
    const firstHalf = metrics.slice(0, half);
    const secondHalf = metrics.slice(half);

    const firstHalfTime = firstHalf.reduce((sum, m) => sum + m.processingTime, 0) / firstHalf.length;
    const secondHalfTime = secondHalf.reduce((sum, m) => sum + m.processingTime, 0) / secondHalf.length;

    const firstHalfMemory = firstHalf.reduce((sum, m) => sum + m.memoryUsage, 0) / firstHalf.length;
    const secondHalfMemory = secondHalf.reduce((sum, m) => sum + m.memoryUsage, 0) / secondHalf.length;

    const timeTrend = secondHalfTime < firstHalfTime * 0.95 ? 'IMPROVING' : 
                    secondHalfTime > firstHalfTime * 1.05 ? 'DEGRADING' : 'STABLE';

    const memoryTrend = secondHalfMemory < firstHalfMemory * 0.95 ? 'IMPROVING' :
                       secondHalfMemory > firstHalfMemory * 1.05 ? 'DEGRADING' : 'STABLE';

    return {
      processingTime: timeTrend,
      memoryUsage: memoryTrend,
      accuracy: 'STABLE' // TODO: Calculate accuracy trend
    };
  }

  private getEmptyReport(periodHours: number): PerformanceReport {
    return {
      period: `${periodHours}h`,
      totalOperations: 0,
      averageProcessingTime: 0,
      memoryEfficiency: 1.0,
      medicalAccuracy: 0,
      australianCompliance: 0,
      topBottlenecks: [],
      recommendations: [],
      trends: {
        processingTime: 'STABLE',
        memoryUsage: 'STABLE',
        accuracy: 'STABLE'
      }
    };
  }

  private startPeriodicReporting(): void {
    // Generate performance reports every 30 minutes
    setInterval(() => {
      const report = this.generatePerformanceReport(1); // Last hour
      if (report.totalOperations > 0) {
        logger.info('Periodic performance report', {
          operations: report.totalOperations,
          avgProcessingTime: report.averageProcessingTime.toFixed(2) + 'ms',
          memoryEfficiency: (report.memoryEfficiency * 100).toFixed(1) + '%',
          topBottlenecks: report.topBottlenecks.slice(0, 3)
        });

        // Log high priority recommendations
        const highPriorityRecs = report.recommendations.filter(r => r.priority === 'HIGH');
        if (highPriorityRecs.length > 0) {
          logger.warn('High priority performance recommendations available', {
            count: highPriorityRecs.length,
            recommendations: highPriorityRecs.map(r => r.description)
          });
        }
      }
    }, 1800000); // 30 minutes
  }
}

/**
 * Helper class for measuring individual operations
 */
export class PerformanceMeasurement {
  private startTime: number;
  private startMemory: number;
  private operation: string;
  private agentType: string;
  private monitor: PerformanceMonitor;
  private inputLength: number = 0;
  private patternMatches: number = 0;
  private confidenceScore?: number;
  private medicalAccuracy?: number;
  private australianCompliance?: boolean;

  constructor(operation: string, agentType: string, monitor: PerformanceMonitor) {
    this.operation = operation;
    this.agentType = agentType;
    this.monitor = monitor;
    this.startTime = performance.now();
    
    // Estimate current memory usage (rough approximation)
    this.startMemory = (performance as any).memory?.usedJSHeapSize || 0;
  }

  public setInputLength(length: number): PerformanceMeasurement {
    this.inputLength = length;
    return this;
  }

  public setPatternMatches(matches: number): PerformanceMeasurement {
    this.patternMatches = matches;
    return this;
  }

  public setConfidenceScore(score: number): PerformanceMeasurement {
    this.confidenceScore = score;
    return this;
  }

  public setMedicalAccuracy(accuracy: number): PerformanceMeasurement {
    this.medicalAccuracy = accuracy;
    return this;
  }

  public setAustralianCompliance(compliant: boolean): PerformanceMeasurement {
    this.australianCompliance = compliant;
    return this;
  }

  public end(outputLength: number = 0): void {
    const endTime = performance.now();
    const endMemory = (performance as any).memory?.usedJSHeapSize || this.startMemory;

    const metrics: ProcessingMetrics = {
      operation: this.operation,
      agentType: this.agentType,
      processingTime: endTime - this.startTime,
      memoryUsage: Math.max(0, endMemory - this.startMemory),
      inputLength: this.inputLength,
      outputLength,
      patternMatches: this.patternMatches,
      confidenceScore: this.confidenceScore,
      medicalAccuracy: this.medicalAccuracy,
      australianCompliance: this.australianCompliance,
      timestamp: Date.now()
    };

    this.monitor.trackProcessing(metrics);
  }
}