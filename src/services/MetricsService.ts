/**
 * MetricsService - Performance Metrics Storage and Analytics
 * 
 * Handles local storage of recording metrics and provides analytics
 * for transcription/processing performance over time.
 */

import type { AgentType } from '@/types/medical.types';

export interface RecordingMetric {
  sessionId: string;
  timestamp: Date;
  agentType: AgentType;
  transcriptionTime: number; // milliseconds
  processingTime: number; // milliseconds
  totalDuration: number; // milliseconds
  audioLength?: number; // seconds
  modelUsed: string;
  success: boolean;
  errorMessage?: string;
}

export interface MetricsAnalytics {
  totalRecordings: number;
  averageTranscriptionTime: number;
  averageProcessingTime: number;
  averageTotalDuration: number;
  agentTypeBreakdown: Partial<Record<AgentType, {
    count: number;
    avgTranscription: number;
    avgProcessing: number;
    avgTotal: number;
  }>>;
  recentTrend: {
    last10Avg: number;
    last25Avg: number;
    improvementPercent: number;
  };
  modelPerformance: Record<string, {
    count: number;
    avgTime: number;
  }>;
}

export class MetricsService {
  private static instance: MetricsService;
  private readonly STORAGE_KEY = 'xestro-recording-metrics';
  private readonly MAX_STORED_METRICS = 5000; // Preserve lifetime history while guarding storage growth

  private constructor() {}

  public static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  /**
   * Store a new recording metric
   */
  public async storeMetric(metric: Omit<RecordingMetric, 'sessionId' | 'timestamp'>): Promise<void> {
    try {
      if (!metric || typeof metric.agentType !== 'string') {
        console.warn('⚠️ Invalid metric data provided');
        return;
      }

      const completeMetric: RecordingMetric = {
        ...metric,
        sessionId: this.generateSessionId(),
        timestamp: new Date(),
        transcriptionTime: Math.max(0, metric.transcriptionTime || 0),
        processingTime: Math.max(0, metric.processingTime || 0),
        totalDuration: Math.max(0, metric.totalDuration || 0),
        success: Boolean(metric.success)
      };

      const existingMetrics = await this.getAllMetrics();
      const updatedMetrics = [completeMetric, ...existingMetrics].slice(0, this.MAX_STORED_METRICS);

      if (chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({
          [this.STORAGE_KEY]: JSON.stringify(updatedMetrics)
        });
      }

      console.log('📊 Metric stored:', {
        agent: metric.agentType,
        transcription: `${completeMetric.transcriptionTime}ms`,
        processing: `${completeMetric.processingTime}ms`,
        total: `${completeMetric.totalDuration}ms`
      });
    } catch (error) {
      console.error('Failed to store metric:', error);
    }
  }

  /**
   * Get all stored metrics
   */
  public async getAllMetrics(): Promise<RecordingMetric[]> {
    try {
      if (!chrome.storage || !chrome.storage.local) {
        console.warn('⚠️ Chrome storage API not available');
        return [];
      }

      const result = await chrome.storage.local.get(this.STORAGE_KEY);
      const stored = result[this.STORAGE_KEY];

      if (!stored || typeof stored !== 'string') return [];

      const parsed = JSON.parse(stored);

      if (!Array.isArray(parsed)) {
        console.warn('⚠️ Invalid stored metrics format');
        return [];
      }

      // Convert timestamp strings back to Date objects with validation
      return parsed
        .filter(metric => metric && typeof metric === 'object')
        .map((metric: any) => ({
          ...metric,
          timestamp: metric.timestamp ? new Date(metric.timestamp) : new Date(),
          transcriptionTime: Math.max(0, Number(metric.transcriptionTime) || 0),
          processingTime: Math.max(0, Number(metric.processingTime) || 0),
          totalDuration: Math.max(0, Number(metric.totalDuration) || 0),
          success: Boolean(metric.success)
        }));
    } catch (error) {
      console.error('Failed to get metrics:', error);
      return [];
    }
  }

  /**
   * Get metrics analytics and insights
   */
  public async getAnalytics(): Promise<MetricsAnalytics> {
    try {
      const metrics = await this.getAllMetrics();
      const successfulMetrics = metrics.filter(m => m && m.success === true);

      if (successfulMetrics.length === 0) {
        return this.getEmptyAnalytics();
      }

      // Calculate agent type breakdown
      const agentTypeBreakdown: Record<string, any> = {};
      const modelPerformance: Record<string, any> = {};

      successfulMetrics.forEach(metric => {
        if (!metric || typeof metric.agentType !== 'string') return;

        // Agent type analytics
        if (!agentTypeBreakdown[metric.agentType]) {
          agentTypeBreakdown[metric.agentType] = {
            count: 0,
            totalTranscription: 0,
            totalProcessing: 0,
            totalDuration: 0
          };
        }

        const agentData = agentTypeBreakdown[metric.agentType];
        agentData.count++;
        agentData.totalTranscription += Math.max(0, metric.transcriptionTime || 0);
        agentData.totalProcessing += Math.max(0, metric.processingTime || 0);
        agentData.totalDuration += Math.max(0, metric.totalDuration || 0);

        // Model performance analytics
        const modelUsed = metric.modelUsed || 'unknown';
        if (!modelPerformance[modelUsed]) {
          modelPerformance[modelUsed] = {
            count: 0,
            totalTime: 0
          };
        }
        modelPerformance[modelUsed].count++;
        modelPerformance[modelUsed].totalTime += Math.max(0, metric.processingTime || 0);
      });

      // Calculate averages for agent types with safe division
      const finalAgentBreakdown: Partial<Record<AgentType, any>> = {};
      Object.entries(agentTypeBreakdown).forEach(([agentType, data]: [string, any]) => {
        if (data && data.count > 0) {
          finalAgentBreakdown[agentType as AgentType] = {
            count: data.count,
            avgTranscription: Math.round(data.totalTranscription / data.count),
            avgProcessing: Math.round(data.totalProcessing / data.count),
            avgTotal: Math.round(data.totalDuration / data.count)
          };
        }
      });

      // Calculate model performance averages with safe division
      const finalModelPerformance: Record<string, any> = {};
      Object.entries(modelPerformance).forEach(([model, data]: [string, any]) => {
        if (data && data.count > 0) {
          finalModelPerformance[model] = {
            count: data.count,
            avgTime: Math.round(data.totalTime / data.count)
          };
        }
      });

      // Calculate recent trends with safe operations
      const recent10 = successfulMetrics.slice(0, 10).filter(m => m && typeof m.totalDuration === 'number');
      const recent25 = successfulMetrics.slice(0, 25).filter(m => m && typeof m.totalDuration === 'number');

      const last10Avg = recent10.length > 0
        ? Math.round(recent10.reduce((sum, m) => sum + (m.totalDuration || 0), 0) / recent10.length)
        : 0;
      const last25Avg = recent25.length > 0
        ? Math.round(recent25.reduce((sum, m) => sum + (m.totalDuration || 0), 0) / recent25.length)
        : 0;

      const improvementPercent = last25Avg > 0 && last10Avg >= 0
        ? Math.round(((last25Avg - last10Avg) / last25Avg) * 100)
        : 0;

      // Safe metric calculations
      const validMetrics = successfulMetrics.filter(m =>
        m && typeof m.transcriptionTime === 'number' &&
        typeof m.processingTime === 'number' &&
        typeof m.totalDuration === 'number'
      );

      return {
        totalRecordings: validMetrics.length,
        averageTranscriptionTime: validMetrics.length > 0
          ? Math.round(validMetrics.reduce((sum, m) => sum + m.transcriptionTime, 0) / validMetrics.length)
          : 0,
        averageProcessingTime: validMetrics.length > 0
          ? Math.round(validMetrics.reduce((sum, m) => sum + m.processingTime, 0) / validMetrics.length)
          : 0,
        averageTotalDuration: validMetrics.length > 0
          ? Math.round(validMetrics.reduce((sum, m) => sum + m.totalDuration, 0) / validMetrics.length)
          : 0,
        agentTypeBreakdown: finalAgentBreakdown,
        recentTrend: {
          last10Avg,
          last25Avg,
          improvementPercent
        },
        modelPerformance: finalModelPerformance
      };
    } catch (error) {
      console.error('Failed to calculate analytics:', error);
      return this.getEmptyAnalytics();
    }
  }

  /**
   * Clear all stored metrics
   */
  public async clearAllMetrics(): Promise<void> {
    try {
      if (chrome.storage && chrome.storage.local) {
        await chrome.storage.local.remove(this.STORAGE_KEY);
        console.log('📊 All metrics cleared');
      } else {
        console.warn('⚠️ Chrome storage API not available');
      }
    } catch (error) {
      console.error('Failed to clear metrics:', error);
    }
  }

  /**
   * Get metrics for a specific agent type
   */
  public async getMetricsByAgent(agentType: AgentType): Promise<RecordingMetric[]> {
    const allMetrics = await this.getAllMetrics();
    return allMetrics.filter(metric => metric.agentType === agentType);
  }

  /**
   * Export metrics as JSON for backup
   */
  public async exportMetrics(): Promise<string> {
    const metrics = await this.getAllMetrics();
    return JSON.stringify(metrics, null, 2);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getEmptyAnalytics(): MetricsAnalytics {
    return {
      totalRecordings: 0,
      averageTranscriptionTime: 0,
      averageProcessingTime: 0,
      averageTotalDuration: 0,
      agentTypeBreakdown: {} as any,
      recentTrend: {
        last10Avg: 0,
        last25Avg: 0,
        improvementPercent: 0
      },
      modelPerformance: {}
    };
  }
}
