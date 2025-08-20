/**
 * Metrics Collector
 * 
 * Comprehensive performance monitoring and metrics collection system.
 * Tracks timing, success rates, memory usage, and operation performance
 * with detailed analysis and export capabilities.
 */

import type {
  PerformanceMetrics,
  MemorySnapshot,
  OperationTiming,
  TimingInfo,
  PerformanceIndicators
} from '@/types/BatchProcessingTypes';

export interface MetricsConfig {
  enableDetailedTiming: boolean;
  enableMemoryTracking: boolean;
  enablePerformanceMarks: boolean;
  sampleInterval: number; // Memory sampling interval in ms
  retentionPeriod: number; // How long to keep metrics in ms
  exportFormat: 'json' | 'csv';
  autoExport: boolean;
}

export interface MetricsReport {
  summary: MetricsSummary;
  timingAnalysis: TimingAnalysis;
  memoryAnalysis: MemoryAnalysis;
  errorAnalysis: ErrorAnalysis;
  performanceInsights: PerformanceInsight[];
  recommendations: string[];
}

export interface MetricsSummary {
  sessionId: string;
  totalDuration: number;
  totalPatients: number;
  successfulPatients: number;
  failedPatients: number;
  averageTimePerPatient: number;
  successRate: number;
  throughputPatientsPerHour: number;
}

export interface TimingAnalysis {
  operationBreakdown: Map<string, OperationStats>;
  criticalPath: string[];
  bottlenecks: Bottleneck[];
  percentiles: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
}

export interface OperationStats {
  operation: string;
  count: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  standardDeviation: number;
  successRate: number;
}

export interface Bottleneck {
  operation: string;
  averageTime: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
}

export interface MemoryAnalysis {
  peakUsage: number;
  averageUsage: number;
  growthRate: number; // MB per minute
  leakDetection: MemoryLeak[];
  gcImpact: number; // Time spent in garbage collection
}

export interface MemoryLeak {
  suspected: boolean;
  confidence: number;
  description: string;
  growthPattern: 'linear' | 'exponential' | 'step' | 'unknown';
}

export interface ErrorAnalysis {
  totalErrors: number;
  errorsByType: Map<string, number>;
  errorsByOperation: Map<string, number>;
  errorRate: number;
  recoveryRate: number;
  impactOnPerformance: number;
}

export interface PerformanceInsight {
  type: 'optimization' | 'warning' | 'info';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  actionRequired: boolean;
}

export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: PerformanceMetrics;
  private config: MetricsConfig;
  private memorySnapshots: MemorySnapshot[] = [];
  private activeOperations: Map<string, number> = new Map();
  private memoryMonitorInterval?: number;
  private debugMode = false;

  private constructor() {
    this.config = this.getDefaultConfig();
    this.metrics = this.initializeMetrics();
    this.startMemoryMonitoring();
  }

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  /**
   * Start a new metrics session
   */
  public startSession(sessionId: string): void {
    this.log(`📊 Starting metrics session: ${sessionId}`);
    
    this.metrics = this.initializeMetrics();
    this.metrics.sessionId = sessionId;
    this.metrics.batchStartTime = Date.now();
    
    // Chrome performance mark
    if (this.config.enablePerformanceMarks) {
      performance.mark(`batch-start-${sessionId}`);
    }
  }

  /**
   * End the current metrics session
   */
  public endSession(): MetricsReport {
    const endTime = Date.now();
    this.metrics.totalProcessingTime = endTime - this.metrics.batchStartTime;
    
    this.log(`📊 Ending metrics session: ${this.metrics.sessionId}`);
    
    // Chrome performance mark
    if (this.config.enablePerformanceMarks) {
      performance.mark(`batch-end-${this.metrics.sessionId}`);
      performance.measure(
        `batch-duration-${this.metrics.sessionId}`,
        `batch-start-${this.metrics.sessionId}`,
        `batch-end-${this.metrics.sessionId}`
      );
    }

    const report = this.generateReport();
    
    if (this.config.autoExport) {
      this.exportMetrics(report);
    }

    return report;
  }

  /**
   * Start timing an operation
   */
  public startOperation(operationId: string, operation: string, patientIndex?: number): void {
    const startTime = Date.now();
    this.activeOperations.set(operationId, startTime);
    
    this.log(`⏱️ Started operation: ${operation} (${operationId})`);
    
    // Chrome performance mark
    if (this.config.enablePerformanceMarks) {
      performance.mark(`op-start-${operationId}`);
    }
  }

  /**
   * End timing an operation
   */
  public endOperation(
    operationId: string, 
    operation: string, 
    success: boolean, 
    patientIndex?: number,
    metadata?: Record<string, any>
  ): OperationTiming {
    const endTime = Date.now();
    const startTime = this.activeOperations.get(operationId);
    
    if (!startTime) {
      this.log(`⚠️ No start time found for operation: ${operationId}`);
      return this.createEmptyTiming(operation, operationId);
    }

    const duration = endTime - startTime;
    this.activeOperations.delete(operationId);
    
    const timing: OperationTiming = {
      operation,
      startTime,
      endTime,
      duration,
      success,
      patientIndex,
      metadata
    };

    this.metrics.operationTimings.push(timing);
    
    // Update categorized timings
    switch (operation) {
      case 'patient-activation':
        this.metrics.patientActivationTimes.push(duration);
        break;
      case 'data-extraction':
        this.metrics.dataExtractionTimes.push(duration);
        break;
      case 'ai-review':
        this.metrics.aiReviewTimes.push(duration);
        break;
      case 'content-script-response':
        this.metrics.contentScriptResponseTimes.push(duration);
        break;
    }

    // Update retry count
    if (!success) {
      const currentCount = this.metrics.retryCount.get(operation) || 0;
      this.metrics.retryCount.set(operation, currentCount + 1);
    }

    this.log(`✅ Completed operation: ${operation} in ${duration}ms (success: ${success})`);
    
    // Chrome performance mark
    if (this.config.enablePerformanceMarks) {
      performance.mark(`op-end-${operationId}`);
      performance.measure(`op-duration-${operationId}`, `op-start-${operationId}`, `op-end-${operationId}`);
    }

    return timing;
  }

  /**
   * Record an error occurrence
   */
  public recordError(operation: string, error: string, patientIndex?: number): void {
    const errorType = this.classifyError(error);
    
    // Update error frequency maps
    const currentErrorCount = this.metrics.errorFrequency.get(errorType) || 0;
    this.metrics.errorFrequency.set(errorType, currentErrorCount + 1);
    
    const currentOpErrorCount = this.metrics.errorFrequency.get(operation) || 0;
    this.metrics.errorFrequency.set(operation, currentOpErrorCount + 1);
    
    this.log(`❌ Recorded error: ${errorType} in ${operation} (patient ${patientIndex})`);
  }

  /**
   * Take a memory snapshot
   */
  public takeMemorySnapshot(): MemorySnapshot {
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: 0,
      heapTotal: 0,
      external: 0
    };

    // Get memory info if available (Chrome extension context)
    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      snapshot.heapUsed = memory.usedJSHeapSize;
      snapshot.heapTotal = memory.totalJSHeapSize;
      snapshot.external = memory.usedJSHeapSize; // Approximation
    }

    this.memorySnapshots.push(snapshot);
    this.metrics.memoryUsageHistory.push(snapshot);
    
    // Keep only recent snapshots to prevent memory issues
    if (this.memorySnapshots.length > 1000) {
      this.memorySnapshots = this.memorySnapshots.slice(-500);
    }

    return snapshot;
  }

  /**
   * Calculate current performance indicators
   */
  public getPerformanceIndicators(): PerformanceIndicators {
    const recentTimings = this.getRecentTimings(300000); // Last 5 minutes
    const totalOperations = this.metrics.operationTimings.length;
    const successfulOperations = this.metrics.operationTimings.filter(t => t.success).length;
    
    // Calculate average time per patient
    const patientTimings = recentTimings.filter(t => t.patientIndex !== undefined);
    const avgTimePerPatient = patientTimings.length > 0 
      ? patientTimings.reduce((sum, t) => sum + t.duration, 0) / patientTimings.length
      : 0;

    // Calculate success rate
    const successRate = totalOperations > 0 ? successfulOperations / totalOperations : 1;

    // Determine current speed
    let currentSpeed: 'fast' | 'normal' | 'slow' | 'degraded' = 'normal';
    if (avgTimePerPatient > 0) {
      if (avgTimePerPatient < 30000) currentSpeed = 'fast';
      else if (avgTimePerPatient < 60000) currentSpeed = 'normal';
      else if (avgTimePerPatient < 120000) currentSpeed = 'slow';
      else currentSpeed = 'degraded';
    }

    // Calculate error rate
    const totalErrors = Array.from(this.metrics.errorFrequency.values()).reduce((sum, count) => sum + count, 0);
    const errorRate = totalOperations > 0 ? totalErrors / totalOperations : 0;

    // Get memory usage
    const latestMemory = this.memorySnapshots[this.memorySnapshots.length - 1];
    const memoryUsage = latestMemory ? latestMemory.heapUsed / (1024 * 1024) : 0; // MB

    return {
      averageTimePerPatient: avgTimePerPatient,
      successRate,
      currentSpeed,
      errorRate,
      memoryUsage
    };
  }

  /**
   * Generate comprehensive metrics report
   */
  public generateReport(): MetricsReport {
    const summary = this.generateSummary();
    const timingAnalysis = this.analyzeTimings();
    const memoryAnalysis = this.analyzeMemory();
    const errorAnalysis = this.analyzeErrors();
    const insights = this.generateInsights();
    const recommendations = this.generateRecommendations(insights);

    return {
      summary,
      timingAnalysis,
      memoryAnalysis,
      errorAnalysis,
      performanceInsights: insights,
      recommendations
    };
  }

  /**
   * Export metrics in specified format
   */
  public async exportMetrics(report: MetricsReport): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `batch-metrics-${report.summary.sessionId}-${timestamp}`;

    if (this.config.exportFormat === 'csv') {
      return this.exportAsCSV(report, filename);
    } else {
      return this.exportAsJSON(report, filename);
    }
  }

  // ============================================================================
  // Private Analysis Methods
  // ============================================================================

  private generateSummary(): MetricsSummary {
    const totalPatients = new Set(
      this.metrics.operationTimings
        .filter(t => t.patientIndex !== undefined)
        .map(t => t.patientIndex)
    ).size;

    const successfulPatients = new Set(
      this.metrics.operationTimings
        .filter(t => t.patientIndex !== undefined && t.success)
        .map(t => t.patientIndex)
    ).size;

    const failedPatients = totalPatients - successfulPatients;
    
    const patientTimings = this.metrics.operationTimings.filter(t => t.patientIndex !== undefined);
    const avgTimePerPatient = patientTimings.length > 0
      ? patientTimings.reduce((sum, t) => sum + t.duration, 0) / patientTimings.length
      : 0;

    const successRate = totalPatients > 0 ? successfulPatients / totalPatients : 0;
    
    const totalHours = this.metrics.totalProcessingTime / (1000 * 60 * 60);
    const throughputPatientsPerHour = totalHours > 0 ? totalPatients / totalHours : 0;

    return {
      sessionId: this.metrics.sessionId,
      totalDuration: this.metrics.totalProcessingTime,
      totalPatients,
      successfulPatients,
      failedPatients,
      averageTimePerPatient: avgTimePerPatient,
      successRate,
      throughputPatientsPerHour
    };
  }

  private analyzeTimings(): TimingAnalysis {
    const operationBreakdown = new Map<string, OperationStats>();
    const allDurations: number[] = [];

    // Group timings by operation
    for (const timing of this.metrics.operationTimings) {
      allDurations.push(timing.duration);
      
      let stats = operationBreakdown.get(timing.operation);
      if (!stats) {
        stats = {
          operation: timing.operation,
          count: 0,
          totalTime: 0,
          averageTime: 0,
          minTime: Infinity,
          maxTime: 0,
          standardDeviation: 0,
          successRate: 0
        };
        operationBreakdown.set(timing.operation, stats);
      }

      stats.count++;
      stats.totalTime += timing.duration;
      stats.minTime = Math.min(stats.minTime, timing.duration);
      stats.maxTime = Math.max(stats.maxTime, timing.duration);
      
      if (timing.success) {
        stats.successRate++;
      }
    }

    // Calculate averages and standard deviations
    for (const stats of operationBreakdown.values()) {
      stats.averageTime = stats.totalTime / stats.count;
      stats.successRate = stats.successRate / stats.count;
      
      // Calculate standard deviation
      const operationTimings = this.metrics.operationTimings
        .filter(t => t.operation === stats.operation)
        .map(t => t.duration);
      
      const variance = operationTimings.reduce((sum, duration) => {
        return sum + Math.pow(duration - stats.averageTime, 2);
      }, 0) / operationTimings.length;
      
      stats.standardDeviation = Math.sqrt(variance);
    }

    // Calculate percentiles
    allDurations.sort((a, b) => a - b);
    const percentiles = {
      p50: this.getPercentile(allDurations, 50),
      p90: this.getPercentile(allDurations, 90),
      p95: this.getPercentile(allDurations, 95),
      p99: this.getPercentile(allDurations, 99)
    };

    // Identify bottlenecks
    const bottlenecks = this.identifyBottlenecks(operationBreakdown);

    // Determine critical path
    const criticalPath = this.determineCriticalPath(operationBreakdown);

    return {
      operationBreakdown,
      criticalPath,
      bottlenecks,
      percentiles
    };
  }

  private analyzeMemory(): MemoryAnalysis {
    if (this.memorySnapshots.length < 2) {
      return {
        peakUsage: 0,
        averageUsage: 0,
        growthRate: 0,
        leakDetection: [],
        gcImpact: 0
      };
    }

    const heapUsages = this.memorySnapshots.map(s => s.heapUsed);
    const peakUsage = Math.max(...heapUsages);
    const averageUsage = heapUsages.reduce((sum, usage) => sum + usage, 0) / heapUsages.length;

    // Calculate growth rate (MB per minute)
    const firstSnapshot = this.memorySnapshots[0];
    const lastSnapshot = this.memorySnapshots[this.memorySnapshots.length - 1];
    const timeDiff = (lastSnapshot.timestamp - firstSnapshot.timestamp) / (1000 * 60); // minutes
    const memoryDiff = (lastSnapshot.heapUsed - firstSnapshot.heapUsed) / (1024 * 1024); // MB
    const growthRate = timeDiff > 0 ? memoryDiff / timeDiff : 0;

    // Detect potential memory leaks
    const leakDetection = this.detectMemoryLeaks();

    return {
      peakUsage: peakUsage / (1024 * 1024), // Convert to MB
      averageUsage: averageUsage / (1024 * 1024), // Convert to MB
      growthRate,
      leakDetection,
      gcImpact: 0 // Would need more sophisticated GC tracking
    };
  }

  private analyzeErrors(): ErrorAnalysis {
    const totalErrors = Array.from(this.metrics.errorFrequency.values()).reduce((sum, count) => sum + count, 0);
    const totalOperations = this.metrics.operationTimings.length;
    const successfulOperations = this.metrics.operationTimings.filter(t => t.success).length;
    
    const errorRate = totalOperations > 0 ? totalErrors / totalOperations : 0;
    const recoveryRate = totalOperations > totalErrors ? (successfulOperations - (totalOperations - totalErrors)) / totalErrors : 0;

    // Group errors by type and operation
    const errorsByType = new Map<string, number>();
    const errorsByOperation = new Map<string, number>();

    for (const [key, count] of this.metrics.errorFrequency) {
      if (this.isErrorType(key)) {
        errorsByType.set(key, count);
      } else {
        errorsByOperation.set(key, count);
      }
    }

    // Calculate impact on performance
    const failedTimings = this.metrics.operationTimings.filter(t => !t.success);
    const avgFailedTime = failedTimings.length > 0
      ? failedTimings.reduce((sum, t) => sum + t.duration, 0) / failedTimings.length
      : 0;
    
    const successfulTimings = this.metrics.operationTimings.filter(t => t.success);
    const avgSuccessfulTime = successfulTimings.length > 0
      ? successfulTimings.reduce((sum, t) => sum + t.duration, 0) / successfulTimings.length
      : 0;

    const impactOnPerformance = avgSuccessfulTime > 0 ? (avgFailedTime - avgSuccessfulTime) / avgSuccessfulTime : 0;

    return {
      totalErrors,
      errorsByType,
      errorsByOperation,
      errorRate,
      recoveryRate,
      impactOnPerformance
    };
  }

  private generateInsights(): PerformanceInsight[] {
    const insights: PerformanceInsight[] = [];
    const indicators = this.getPerformanceIndicators();

    // Performance insights based on current metrics
    if (indicators.currentSpeed === 'degraded') {
      insights.push({
        type: 'warning',
        title: 'Severely Degraded Performance',
        description: `Average processing time per patient is ${Math.round(indicators.averageTimePerPatient / 1000)}s, indicating severe performance issues.`,
        impact: 'high',
        actionRequired: true
      });
    }

    if (indicators.errorRate > 0.1) {
      insights.push({
        type: 'warning',
        title: 'High Error Rate',
        description: `Error rate of ${Math.round(indicators.errorRate * 100)}% is concerning and may indicate system issues.`,
        impact: 'high',
        actionRequired: true
      });
    }

    if (indicators.memoryUsage > 500) {
      insights.push({
        type: 'warning',
        title: 'High Memory Usage',
        description: `Memory usage of ${Math.round(indicators.memoryUsage)}MB is high and may cause performance issues.`,
        impact: 'medium',
        actionRequired: false
      });
    }

    if (indicators.successRate < 0.9) {
      insights.push({
        type: 'optimization',
        title: 'Low Success Rate',
        description: `Success rate of ${Math.round(indicators.successRate * 100)}% suggests opportunities for improvement.`,
        impact: 'medium',
        actionRequired: false
      });
    }

    return insights;
  }

  private generateRecommendations(insights: PerformanceInsight[]): string[] {
    const recommendations: string[] = [];

    for (const insight of insights) {
      switch (insight.title) {
        case 'Severely Degraded Performance':
          recommendations.push('Consider reducing batch size or increasing timeout values');
          recommendations.push('Check for network connectivity issues');
          break;
        case 'High Error Rate':
          recommendations.push('Review error logs to identify common failure patterns');
          recommendations.push('Consider implementing additional retry strategies');
          break;
        case 'High Memory Usage':
          recommendations.push('Implement more frequent garbage collection');
          recommendations.push('Reduce the number of concurrent operations');
          break;
        case 'Low Success Rate':
          recommendations.push('Improve error handling and recovery mechanisms');
          recommendations.push('Add more robust validation checks');
          break;
      }
    }

    return recommendations;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private identifyBottlenecks(operationBreakdown: Map<string, OperationStats>): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];
    
    for (const stats of operationBreakdown.values()) {
      let impact: 'low' | 'medium' | 'high' | 'critical' = 'low';
      let suggestion = '';

      if (stats.averageTime > 60000) { // 1 minute
        impact = 'critical';
        suggestion = 'This operation is extremely slow and should be optimized immediately';
      } else if (stats.averageTime > 30000) { // 30 seconds
        impact = 'high';
        suggestion = 'Consider optimizing this operation or implementing caching';
      } else if (stats.averageTime > 15000) { // 15 seconds
        impact = 'medium';
        suggestion = 'Monitor this operation for potential optimization opportunities';
      }

      if (impact !== 'low') {
        bottlenecks.push({
          operation: stats.operation,
          averageTime: stats.averageTime,
          impact,
          description: `${stats.operation} takes an average of ${Math.round(stats.averageTime / 1000)}s`,
          suggestion
        });
      }
    }

    return bottlenecks.sort((a, b) => b.averageTime - a.averageTime);
  }

  private determineCriticalPath(operationBreakdown: Map<string, OperationStats>): string[] {
    // Simple critical path based on highest impact operations
    const operations = Array.from(operationBreakdown.values())
      .sort((a, b) => (b.averageTime * b.count) - (a.averageTime * a.count))
      .slice(0, 5)
      .map(op => op.operation);

    return operations;
  }

  private detectMemoryLeaks(): MemoryLeak[] {
    const leaks: MemoryLeak[] = [];
    
    if (this.memorySnapshots.length < 10) {
      return leaks;
    }

    const recentSnapshots = this.memorySnapshots.slice(-10);
    const growthValues = [];

    for (let i = 1; i < recentSnapshots.length; i++) {
      const growth = recentSnapshots[i].heapUsed - recentSnapshots[i - 1].heapUsed;
      growthValues.push(growth);
    }

    const averageGrowth = growthValues.reduce((sum, growth) => sum + growth, 0) / growthValues.length;
    const totalGrowth = recentSnapshots[recentSnapshots.length - 1].heapUsed - recentSnapshots[0].heapUsed;

    if (averageGrowth > 1024 * 1024) { // 1MB per sample
      leaks.push({
        suspected: true,
        confidence: Math.min(averageGrowth / (5 * 1024 * 1024), 1), // Confidence based on growth rate
        description: 'Consistent memory growth detected',
        growthPattern: 'linear'
      });
    }

    return leaks;
  }

  private getPercentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))] || 0;
  }

  private getRecentTimings(timeWindowMs: number): OperationTiming[] {
    const cutoff = Date.now() - timeWindowMs;
    return this.metrics.operationTimings.filter(t => t.startTime >= cutoff);
  }

  private classifyError(error: string): string {
    const errorLower = error.toLowerCase();
    
    if (errorLower.includes('timeout')) return 'timeout';
    if (errorLower.includes('network')) return 'network';
    if (errorLower.includes('permission')) return 'permission';
    if (errorLower.includes('not found')) return 'not_found';
    if (errorLower.includes('memory')) return 'memory';
    
    return 'unknown';
  }

  private isErrorType(key: string): boolean {
    const errorTypes = ['timeout', 'network', 'permission', 'not_found', 'memory', 'unknown'];
    return errorTypes.includes(key);
  }

  private createEmptyTiming(operation: string, operationId: string): OperationTiming {
    return {
      operation,
      startTime: Date.now(),
      endTime: Date.now(),
      duration: 0,
      success: false,
      metadata: { error: 'No start time found', operationId }
    };
  }

  // ============================================================================
  // Export Methods
  // ============================================================================

  private async exportAsJSON(report: MetricsReport, filename: string): Promise<string> {
    const data = JSON.stringify(report, null, 2);
    
    // In a browser environment, trigger download
    if (typeof window !== 'undefined') {
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    
    return data;
  }

  private async exportAsCSV(report: MetricsReport, filename: string): Promise<string> {
    const rows: string[] = [];
    
    // Header
    rows.push('Category,Metric,Value,Unit');
    
    // Summary metrics
    rows.push(`Summary,Session ID,${report.summary.sessionId},`);
    rows.push(`Summary,Total Duration,${report.summary.totalDuration},ms`);
    rows.push(`Summary,Total Patients,${report.summary.totalPatients},count`);
    rows.push(`Summary,Success Rate,${report.summary.successRate},percentage`);
    rows.push(`Summary,Avg Time Per Patient,${report.summary.averageTimePerPatient},ms`);
    
    // Operation breakdowns
    for (const [operation, stats] of report.timingAnalysis.operationBreakdown) {
      rows.push(`Timing,${operation} Count,${stats.count},count`);
      rows.push(`Timing,${operation} Avg Time,${stats.averageTime},ms`);
      rows.push(`Timing,${operation} Success Rate,${stats.successRate},percentage`);
    }
    
    // Memory metrics
    rows.push(`Memory,Peak Usage,${report.memoryAnalysis.peakUsage},MB`);
    rows.push(`Memory,Average Usage,${report.memoryAnalysis.averageUsage},MB`);
    rows.push(`Memory,Growth Rate,${report.memoryAnalysis.growthRate},MB/min`);
    
    const csvData = rows.join('\n');
    
    // In a browser environment, trigger download
    if (typeof window !== 'undefined') {
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    
    return csvData;
  }

  // ============================================================================
  // Memory Monitoring
  // ============================================================================

  private startMemoryMonitoring(): void {
    if (this.config.enableMemoryTracking) {
      this.memoryMonitorInterval = setInterval(() => {
        this.takeMemorySnapshot();
      }, this.config.sampleInterval);
    }
  }

  private stopMemoryMonitoring(): void {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = undefined;
    }
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  private initializeMetrics(): PerformanceMetrics {
    return {
      sessionId: '',
      batchStartTime: 0,
      patientActivationTimes: [],
      dataExtractionTimes: [],
      aiReviewTimes: [],
      contentScriptResponseTimes: [],
      totalProcessingTime: 0,
      retryCount: new Map(),
      errorFrequency: new Map(),
      memoryUsageHistory: [],
      operationTimings: []
    };
  }

  private getDefaultConfig(): MetricsConfig {
    return {
      enableDetailedTiming: true,
      enableMemoryTracking: true,
      enablePerformanceMarks: true,
      sampleInterval: 5000, // 5 seconds
      retentionPeriod: 3600000, // 1 hour
      exportFormat: 'json',
      autoExport: false
    };
  }

  private log(...args: any[]): void {
    if (this.debugMode) {
      console.log('[MetricsCollector]', ...args);
    }
  }

  // ============================================================================
  // Public Configuration Methods
  // ============================================================================

  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  public updateConfig(config: Partial<MetricsConfig>): void {
    Object.assign(this.config, config);
    
    // Restart memory monitoring if interval changed
    if (config.sampleInterval !== undefined || config.enableMemoryTracking !== undefined) {
      this.stopMemoryMonitoring();
      this.startMemoryMonitoring();
    }
  }

  public getConfig(): MetricsConfig {
    return { ...this.config };
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public clearMetrics(): void {
    this.metrics = this.initializeMetrics();
    this.memorySnapshots = [];
    this.activeOperations.clear();
  }

  public cleanup(): void {
    this.stopMemoryMonitoring();
    this.clearMetrics();
  }
}