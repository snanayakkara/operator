/**
 * Performance Monitoring Service
 * 
 * Monitors system performance, resource usage, and processing times
 * Provides insights for optimization and troubleshooting
 */

export interface PerformanceMetrics {
  timestamp: number;
  processingPhase: 'transcription' | 'agent-loading' | 'agent-processing' | 'complete';
  duration: number;
  agentType?: string;
  audioSize?: number;
  compressionRatio?: number;
  memoryUsage?: MemoryInfo;
  systemLoad?: SystemLoad;
}

export interface MemoryInfo {
  totalAgents: number;
  estimatedMemoryMB: number;
  jsHeapSizeLimit: number;
  jsHeapTotalSize: number;
  jsHeapUsedSize: number;
}

export interface SystemLoad {
  cpuUsage?: number; // Estimated based on processing times
  isMainThreadBlocked?: boolean;
  frameDrops?: number;
}

export interface PerformanceSummary {
  totalSessions: number;
  averageTranscriptionTime: number;
  averageProcessingTime: number;
  averageCompressionRatio: number;
  memoryTrend: 'stable' | 'increasing' | 'decreasing';
  recommendedOptimizations: string[];
}

export class PerformanceMonitoringService {
  private static instance: PerformanceMonitoringService;
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetricsHistory = 100; // Keep last 100 sessions
  
  private constructor() {}

  public static getInstance(): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance = new PerformanceMonitoringService();
    }
    return PerformanceMonitoringService.instance;
  }

  /**
   * Record performance metrics for a processing phase
   */
  recordMetrics(
    phase: PerformanceMetrics['processingPhase'],
    duration: number,
    additionalData?: Partial<PerformanceMetrics>
  ): void {
    try {
      const metrics: PerformanceMetrics = {
        timestamp: Date.now(),
        processingPhase: phase,
        duration: Math.max(0, duration || 0), // Ensure positive duration
        memoryUsage: this.getMemoryInfo(),
        systemLoad: this.getSystemLoad(),
        ...additionalData
      };

      this.metrics.push(metrics);

      // Keep only recent metrics to prevent memory bloat
      if (this.metrics.length > this.maxMetricsHistory) {
        this.metrics = this.metrics.slice(-this.maxMetricsHistory);
      }

      console.log(`📊 Performance: ${phase} completed in ${duration}ms`, {
        phase,
        duration,
        agentType: additionalData?.agentType,
        audioSize: additionalData?.audioSize ? Math.round(additionalData.audioSize / 1024) + 'KB' : undefined,
        memoryUsage: metrics.memoryUsage?.estimatedMemoryMB ? metrics.memoryUsage.estimatedMemoryMB + 'MB' : 'N/A'
      });

      // Check for performance issues
      this.detectPerformanceIssues(metrics);
    } catch (error) {
      console.warn('⚠️ Failed to record performance metrics:', error);
    }
  }

  /**
   * Get current memory information
   */
  private getMemoryInfo(): MemoryInfo {
    // Try to get agent memory info
    let agentMemory = { totalAgents: 0, estimatedMemoryMB: 0 };
    try {
      // This will be available when AgentFactory is loaded
      if (typeof window !== 'undefined' && (window as any).AgentFactory) {
        const memEstimate = (window as any).AgentFactory.getMemoryEstimate();
        if (memEstimate && typeof memEstimate === 'object') {
          agentMemory = {
            totalAgents: Math.max(0, memEstimate.totalAgents || 0),
            estimatedMemoryMB: Math.max(0, memEstimate.estimatedMemoryMB || 0)
          };
        }
      }
    } catch (error) {
      // AgentFactory not loaded yet or error accessing it
    }

    // Get JavaScript heap information with feature detection
    let heapInfo = {
      jsHeapSizeLimit: 0,
      jsHeapTotalSize: 0,
      jsHeapUsedSize: 0
    };

    try {
      if (typeof window !== 'undefined' &&
          window.performance &&
          'memory' in window.performance &&
          window.performance.memory) {
        const memory = window.performance.memory as any;
        heapInfo = {
          jsHeapSizeLimit: Math.max(0, memory.jsHeapSizeLimit || 0),
          jsHeapTotalSize: Math.max(0, memory.totalJSHeapSize || 0),
          jsHeapUsedSize: Math.max(0, memory.usedJSHeapSize || 0)
        };
      }
    } catch (error) {
      // Performance memory API not available or access restricted
    }

    return {
      ...agentMemory,
      ...heapInfo
    };
  }

  /**
   * Estimate system load based on processing patterns
   */
  private getSystemLoad(): SystemLoad {
    try {
      const recentMetrics = this.metrics.slice(-5).filter(m =>
        m && typeof m.duration === 'number' && m.duration >= 0
      );

      if (recentMetrics.length === 0) {
        return {};
      }

      // Estimate CPU usage based on processing times vs expected times
      const totalDuration = recentMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
      const avgDuration = totalDuration / recentMetrics.length;

      const expectedDurations = {
        'transcription': 2000,      // Expected ~2s for transcription
        'agent-loading': 500,       // Expected ~500ms for agent loading
        'agent-processing': 5000,   // Expected ~5s for processing
        'complete': 0
      };

      let cpuLoad = 0;
      recentMetrics.forEach(metric => {
        const expected = expectedDurations[metric.processingPhase] || 1000;
        if (expected > 0) {
          const ratio = (metric.duration || 0) / expected;
          cpuLoad += Math.min(Math.max(ratio, 0), 3); // Cap between 0 and 3x expected time
        }
      });

      const avgCpuLoad = recentMetrics.length > 0 ? (cpuLoad / recentMetrics.length) * 100 : 0;

      return {
        cpuUsage: Math.min(Math.max(avgCpuLoad, 0), 100),
        isMainThreadBlocked: avgDuration > 10000, // Over 10s suggests blocking
        frameDrops: avgCpuLoad > 200 ? Math.max(0, Math.floor(avgCpuLoad / 50)) : 0
      };
    } catch (error) {
      console.warn('⚠️ Failed to calculate system load:', error);
      return {};
    }
  }

  /**
   * Detect and log performance issues
   */
  private detectPerformanceIssues(metrics: PerformanceMetrics): void {
    try {
      if (!metrics || typeof metrics.duration !== 'number') {
        return;
      }

      const issues: string[] = [];
      const duration = Math.max(0, metrics.duration);

      // Check for slow transcription
      if (metrics.processingPhase === 'transcription' && duration > 10000) {
        issues.push(`Slow transcription (${duration}ms) - check MLX Whisper server`);
      }

      // Check for slow agent processing
      if (metrics.processingPhase === 'agent-processing' && duration > 30000) {
        const agentType = metrics.agentType || 'unknown';
        issues.push(`Slow processing (${duration}ms) - agent: ${agentType}`);
      }

      // Check for high memory usage with safe access
      if (metrics.memoryUsage &&
          typeof metrics.memoryUsage.jsHeapUsedSize === 'number' &&
          metrics.memoryUsage.jsHeapUsedSize > 100 * 1024 * 1024) { // 100MB
        const memoryMB = Math.round(metrics.memoryUsage.jsHeapUsedSize / 1024 / 1024);
        issues.push(`High memory usage (${memoryMB}MB)`);
      }

      // Check for too many loaded agents
      if (metrics.memoryUsage &&
          typeof metrics.memoryUsage.totalAgents === 'number' &&
          metrics.memoryUsage.totalAgents > 8) {
        issues.push(`Too many agents loaded (${metrics.memoryUsage.totalAgents}) - consider cache optimization`);
      }

      // Log issues
      if (issues.length > 0) {
        console.warn('⚠️ Performance issues detected:', issues);
      }
    } catch (error) {
      console.warn('⚠️ Failed to detect performance issues:', error);
    }
  }

  /**
   * Get performance summary and recommendations
   */
  getPerformanceSummary(): PerformanceSummary {
    if (this.metrics.length === 0) {
      return {
        totalSessions: 0,
        averageTranscriptionTime: 0,
        averageProcessingTime: 0,
        averageCompressionRatio: 0,
        memoryTrend: 'stable',
        recommendedOptimizations: ['Start using the extension to collect performance data']
      };
    }

    // Calculate averages
    const transcriptionMetrics = this.metrics.filter(m => m.processingPhase === 'transcription');
    const processingMetrics = this.metrics.filter(m => m.processingPhase === 'agent-processing');
    const compressionMetrics = this.metrics.filter(m => m.compressionRatio !== undefined);

    const avgTranscriptionTime = transcriptionMetrics.length > 0 
      ? transcriptionMetrics.reduce((sum, m) => sum + m.duration, 0) / transcriptionMetrics.length
      : 0;

    const avgProcessingTime = processingMetrics.length > 0
      ? processingMetrics.reduce((sum, m) => sum + m.duration, 0) / processingMetrics.length
      : 0;

    const avgCompressionRatio = compressionMetrics.length > 0
      ? compressionMetrics.reduce((sum, m) => sum + (m.compressionRatio || 0), 0) / compressionMetrics.length
      : 0;

    // Analyze memory trend
    const memoryTrend = this.analyzeMemoryTrend();

    // Generate recommendations
    const recommendations = this.generateOptimizationRecommendations(
      avgTranscriptionTime,
      avgProcessingTime,
      avgCompressionRatio,
      memoryTrend
    );

    return {
      totalSessions: Math.floor(this.metrics.filter(m => m.processingPhase === 'complete').length),
      averageTranscriptionTime: Math.round(avgTranscriptionTime),
      averageProcessingTime: Math.round(avgProcessingTime),
      averageCompressionRatio: Math.round(avgCompressionRatio * 10) / 10,
      memoryTrend,
      recommendedOptimizations: recommendations
    };
  }

  /**
   * Analyze memory usage trend
   */
  private analyzeMemoryTrend(): 'stable' | 'increasing' | 'decreasing' {
    try {
      const recentMetrics = this.metrics
        .slice(-20)
        .filter(m => m && m.memoryUsage && typeof m.memoryUsage.jsHeapUsedSize === 'number');

      if (recentMetrics.length < 5) {
        return 'stable';
      }

      const midpoint = Math.floor(recentMetrics.length / 2);
      const firstHalf = recentMetrics.slice(0, midpoint);
      const secondHalf = recentMetrics.slice(midpoint);

      if (firstHalf.length === 0 || secondHalf.length === 0) {
        return 'stable';
      }

      const firstHalfSum = firstHalf.reduce((sum, m) => sum + (m.memoryUsage?.jsHeapUsedSize || 0), 0);
      const secondHalfSum = secondHalf.reduce((sum, m) => sum + (m.memoryUsage?.jsHeapUsedSize || 0), 0);

      const firstHalfAvg = firstHalfSum / firstHalf.length;
      const secondHalfAvg = secondHalfSum / secondHalf.length;

      if (firstHalfAvg === 0) {
        return 'stable';
      }

      const changePercent = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

      if (changePercent > 10) return 'increasing';
      if (changePercent < -10) return 'decreasing';
      return 'stable';
    } catch (error) {
      console.warn('⚠️ Failed to analyze memory trend:', error);
      return 'stable';
    }
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(
    avgTranscriptionTime: number,
    avgProcessingTime: number,
    avgCompressionRatio: number,
    memoryTrend: string
  ): string[] {
    const recommendations: string[] = [];

    // Transcription recommendations
    if (avgTranscriptionTime > 8000) {
      recommendations.push('Transcription is slow - check MLX Whisper server performance');
      recommendations.push('Consider restarting the Whisper server: ./start-whisper-server.sh');
    }

    // Processing recommendations
    if (avgProcessingTime > 20000) {
      recommendations.push('Agent processing is slow - consider using lighter models for simple tasks');
    }

    // Compression recommendations
    if (avgCompressionRatio < 20) {
      recommendations.push('Low compression ratio - audio files may benefit from better compression');
    }

    // Memory recommendations
    if (memoryTrend === 'increasing') {
      recommendations.push('Memory usage is increasing - enable automatic cache optimization');
      recommendations.push('Consider restarting the extension periodically for long sessions');
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Performance is optimal - no specific optimizations needed');
      recommendations.push('Continue using agent preloading for best performance');
    }

    return recommendations;
  }

  /**
   * Clear performance metrics history
   */
  clearMetrics(): void {
    this.metrics = [];
    console.log('🧹 Performance metrics cleared');
  }

  /**
   * Export performance data for analysis
   */
  exportMetrics(): PerformanceMetrics[] {
    return [...this.metrics]; // Return copy
  }

  /**
   * Get recent performance issues
   */
  getRecentIssues(lastMinutes: number = 5): string[] {
    const cutoffTime = Date.now() - (lastMinutes * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoffTime);
    
    const issues: string[] = [];
    
    recentMetrics.forEach(metric => {
      if (metric.processingPhase === 'transcription' && metric.duration > 10000) {
        issues.push(`Slow transcription: ${metric.duration}ms`);
      }
      if (metric.processingPhase === 'agent-processing' && metric.duration > 30000) {
        issues.push(`Slow ${metric.agentType} processing: ${metric.duration}ms`);
      }
    });

    return [...new Set(issues)]; // Remove duplicates
  }
}