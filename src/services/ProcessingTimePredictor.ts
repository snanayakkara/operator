/**
 * Processing Time Predictor Service
 * 
 * Intelligently predicts processing times based on transcription length,
 * historical performance data, and agent-specific characteristics.
 * Replaces static estimates with data-driven predictions.
 */

import type { AgentType } from '@/types/medical.types';
import { PerformanceMonitoringService } from './PerformanceMonitoringService';
import { logger } from '@/utils/Logger';

export interface ProcessingTimeEstimate {
  estimatedDurationMs: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  factors: EstimationFactor[];
  range: { min: number; max: number };
  basedOnSessions: number;
  displayText: string; // e.g., "Expected: 4-6s (High confidence)"
}

export interface EstimationFactor {
  name: string;
  impact: number; // multiplier (e.g., 1.2 = +20%) or additive (ms)
  description: string;
  type: 'multiplier' | 'additive';
}

export interface TranscriptionLengthCategory {
  category: 'short' | 'medium' | 'long' | 'very-long';
  range: { min: number; max: number }; // character count
  description: string;
}

export interface AgentPerformanceProfile {
  baselineMs: number;
  lengthScalingFactor: number;
  modelComplexity: 'lightweight' | 'standard' | 'heavy';
  expectedRange: { min: number; max: number };
}

export interface HistoricalDataPoint {
  agentType: AgentType;
  transcriptionLength: number;
  actualProcessingTime: number;
  timestamp: number;
  systemPerformance?: number; // 0-100 scale
}

export class ProcessingTimePredictor {
  private static instance: ProcessingTimePredictor;
  private historicalData: HistoricalDataPoint[] = [];
  private readonly maxHistorySize = 200; // Keep last 200 data points
  private performanceService: PerformanceMonitoringService;

  // Agent performance profiles based on model complexity and typical behavior
  private agentProfiles: Record<AgentType, AgentPerformanceProfile> = {
    // Lightweight agents (Google Gemma-3n-e4b model)
    'investigation-summary': {
      baselineMs: 1500,
      lengthScalingFactor: 0.8,
      modelComplexity: 'lightweight',
      expectedRange: { min: 1000, max: 3000 }
    },
    'medication': {
      baselineMs: 1800,
      lengthScalingFactor: 0.9,
      modelComplexity: 'lightweight',
      expectedRange: { min: 1200, max: 3500 }
    },
    'background': {
      baselineMs: 2000,
      lengthScalingFactor: 1.0,
      modelComplexity: 'lightweight',
      expectedRange: { min: 1500, max: 4000 }
    },
    'bloods': {
      baselineMs: 1600,
      lengthScalingFactor: 0.85,
      modelComplexity: 'lightweight',
      expectedRange: { min: 1100, max: 3200 }
    },
    'imaging': {
      baselineMs: 1700,
      lengthScalingFactor: 0.9,
      modelComplexity: 'lightweight',
      expectedRange: { min: 1200, max: 3400 }
    },
    'ohif-viewer': {
      baselineMs: 2400,
      lengthScalingFactor: 0.8,
      modelComplexity: 'lightweight',
      expectedRange: { min: 1500, max: 5000 }
    },

    // Standard agents (MedGemma-27b MLX model)
    'quick-letter': {
      baselineMs: 4000,
      lengthScalingFactor: 1.2,
      modelComplexity: 'standard',
      expectedRange: { min: 2500, max: 8000 }
    },
    'consultation': {
      baselineMs: 5000,
      lengthScalingFactor: 1.4,
      modelComplexity: 'standard',
      expectedRange: { min: 3000, max: 12000 }
    },

    // Heavy agents (Complex medical procedures with MedGemma-27b)
    'tavi': {
      baselineMs: 6000,
      lengthScalingFactor: 1.8,
      modelComplexity: 'heavy',
      expectedRange: { min: 4000, max: 15000 }
    },
    'angiogram-pci': {
      baselineMs: 6500,
      lengthScalingFactor: 1.8,
      modelComplexity: 'heavy',
      expectedRange: { min: 4000, max: 15000 }
    },
    'mteer': {
      baselineMs: 6000,
      lengthScalingFactor: 1.7,
      modelComplexity: 'heavy',
      expectedRange: { min: 4000, max: 14000 }
    },
    'tteer': {
      baselineMs: 6000,
      lengthScalingFactor: 1.7,
      modelComplexity: 'heavy',
      expectedRange: { min: 4000, max: 14000 }
    },
    'pfo-closure': {
      baselineMs: 5500,
      lengthScalingFactor: 1.6,
      modelComplexity: 'heavy',
      expectedRange: { min: 3500, max: 12000 }
    },
    'asd-closure': {
      baselineMs: 5500,
      lengthScalingFactor: 1.6,
      modelComplexity: 'heavy',
      expectedRange: { min: 3500, max: 12000 }
    },
    'right-heart-cath': {
      baselineMs: 5800,
      lengthScalingFactor: 1.7,
      modelComplexity: 'heavy',
      expectedRange: { min: 3800, max: 13000 }
    },
    'pvl-plug': {
      baselineMs: 5500,
      lengthScalingFactor: 1.6,
      modelComplexity: 'heavy',
      expectedRange: { min: 3500, max: 12000 }
    },
    'bypass-graft': {
      baselineMs: 7000,
      lengthScalingFactor: 2.0,
      modelComplexity: 'heavy',
      expectedRange: { min: 4500, max: 18000 }
    },
    'tavi-workup': {
      baselineMs: 6500,
      lengthScalingFactor: 1.9,
      modelComplexity: 'heavy',
      expectedRange: { min: 4000, max: 16000 }
    },

    // Special agents
    'ai-medical-review': {
      baselineMs: 8000,
      lengthScalingFactor: 2.2,
      modelComplexity: 'heavy',
      expectedRange: { min: 5000, max: 20000 }
    },
    'batch-ai-review': {
      baselineMs: 15000,
      lengthScalingFactor: 3.0,
      modelComplexity: 'heavy',
      expectedRange: { min: 10000, max: 45000 }
    },
    'aus-medical-review': {
      baselineMs: 5200,
      lengthScalingFactor: 1.6,
      modelComplexity: 'standard',
      expectedRange: { min: 3200, max: 12000 }
    },
    'patient-education': {
      baselineMs: 4500,
      lengthScalingFactor: 1.3,
      modelComplexity: 'standard',
      expectedRange: { min: 3000, max: 10000 }
    },
    'enhancement': {
      baselineMs: 3000,
      lengthScalingFactor: 1.1,
      modelComplexity: 'standard',
      expectedRange: { min: 2000, max: 6000 }
    },
    'transcription': {
      baselineMs: 2000,
      lengthScalingFactor: 0.5,
      modelComplexity: 'lightweight',
      expectedRange: { min: 1000, max: 4000 }
    },
    'generation': {
      baselineMs: 4500,
      lengthScalingFactor: 1.3,
      modelComplexity: 'standard',
      expectedRange: { min: 2500, max: 9000 }
    }
  };

  private constructor() {
    this.performanceService = PerformanceMonitoringService.getInstance();
    this.loadHistoricalData();
  }

  public static getInstance(): ProcessingTimePredictor {
    if (!ProcessingTimePredictor.instance) {
      ProcessingTimePredictor.instance = new ProcessingTimePredictor();
    }
    return ProcessingTimePredictor.instance;
  }

  /**
   * Predict processing time for a given agent and transcription
   */
  predictProcessingTime(
    agentType: AgentType,
    transcriptionLength: number,
    options?: {
      systemPerformance?: number; // 0-100 scale
      includeTranscriptionTime?: boolean;
    }
  ): ProcessingTimeEstimate {
    const profile = this.agentProfiles[agentType];
    if (!profile) {
      throw new Error(`Unknown agent type: ${agentType}`);
    }

    // Get historical data for this agent
    const historicalForAgent = this.historicalData.filter(d => d.agentType === agentType);
    const lengthCategory = this.categorizeTranscriptionLength(transcriptionLength);

    // Calculate base estimate from profile
    const baseEstimate = profile.baselineMs;
    const lengthFactor = this.calculateLengthFactor(transcriptionLength, profile.lengthScalingFactor);
    
    // Apply historical adjustments
    const historicalAdjustment = this.calculateHistoricalAdjustment(
      agentType,
      transcriptionLength,
      historicalForAgent
    );

    // Apply system performance factor
    const systemPerformanceFactor = this.calculateSystemPerformanceFactor(
      options?.systemPerformance
    );

    // Calculate final estimate
    const rawEstimate = (baseEstimate * lengthFactor * historicalAdjustment * systemPerformanceFactor);
    
    // Constrain to reasonable bounds
    const constrainedEstimate = Math.max(
      profile.expectedRange.min,
      Math.min(profile.expectedRange.max, rawEstimate)
    );

    // Add transcription time if requested
    const totalEstimate = options?.includeTranscriptionTime 
      ? constrainedEstimate + this.estimateTranscriptionTime(transcriptionLength)
      : constrainedEstimate;

    // Calculate confidence level
    const confidenceLevel = this.calculateConfidenceLevel(historicalForAgent.length, lengthCategory);

    // Calculate range (±20% for high confidence, ±40% for medium, ±60% for low)
    const rangePercent = confidenceLevel === 'high' ? 0.2 : confidenceLevel === 'medium' ? 0.4 : 0.6;
    const range = {
      min: Math.round(totalEstimate * (1 - rangePercent)),
      max: Math.round(totalEstimate * (1 + rangePercent))
    };

    // Build estimation factors
    const factors: EstimationFactor[] = [
      {
        name: 'Agent baseline',
        impact: baseEstimate,
        description: `${profile.modelComplexity} model baseline`,
        type: 'additive'
      },
      {
        name: 'Transcription length',
        impact: lengthFactor,
        description: `${lengthCategory.category} transcription (${transcriptionLength} chars)`,
        type: 'multiplier'
      }
    ];

    if (historicalAdjustment !== 1.0) {
      factors.push({
        name: 'Historical performance',
        impact: historicalAdjustment,
        description: `Based on ${historicalForAgent.length} similar sessions`,
        type: 'multiplier'
      });
    }

    if (systemPerformanceFactor !== 1.0) {
      factors.push({
        name: 'System performance',
        impact: systemPerformanceFactor,
        description: options?.systemPerformance 
          ? `Current system load: ${options.systemPerformance}%`
          : 'System performance adjustment',
        type: 'multiplier'
      });
    }

    return {
      estimatedDurationMs: Math.round(totalEstimate),
      confidenceLevel,
      factors,
      range,
      basedOnSessions: historicalForAgent.length,
      displayText: this.formatEstimateForDisplay(range, confidenceLevel, historicalForAgent.length)
    };
  }

  /**
   * Categorize transcription length for analysis
   */
  private categorizeTranscriptionLength(length: number): TranscriptionLengthCategory {
    if (length < 300) {
      return {
        category: 'short',
        range: { min: 0, max: 300 },
        description: 'Short dictation (< 300 characters)'
      };
    } else if (length < 800) {
      return {
        category: 'medium',
        range: { min: 300, max: 800 },
        description: 'Medium dictation (300-800 characters)'
      };
    } else if (length < 1500) {
      return {
        category: 'long',
        range: { min: 800, max: 1500 },
        description: 'Long dictation (800-1500 characters)'
      };
    } else {
      return {
        category: 'very-long',
        range: { min: 1500, max: Infinity },
        description: 'Very long dictation (> 1500 characters)'
      };
    }
  }

  /**
   * Calculate length scaling factor
   */
  private calculateLengthFactor(length: number, scalingFactor: number): number {
    // Scale based on character count with diminishing returns
    const baseLength = 500; // Reference length
    const lengthRatio = length / baseLength;
    
    // Apply scaling factor with logarithmic curve to prevent extreme scaling
    return 1 + (Math.log(lengthRatio + 1) * scalingFactor * 0.3);
  }

  /**
   * Calculate historical performance adjustment
   */
  private calculateHistoricalAdjustment(
    agentType: AgentType,
    transcriptionLength: number,
    historicalData: HistoricalDataPoint[]
  ): number {
    if (historicalData.length < 3) {
      return 1.0; // Not enough data for adjustment
    }

    // Find similar sessions (±50% length)
    const lengthRange = { min: transcriptionLength * 0.5, max: transcriptionLength * 1.5 };
    const similarSessions = historicalData.filter(d => 
      d.transcriptionLength >= lengthRange.min && 
      d.transcriptionLength <= lengthRange.max
    );

    if (similarSessions.length < 2) {
      // Use all sessions if not enough similar ones
      return this.calculateAveragePerformanceRatio(historicalData, agentType);
    }

    return this.calculateAveragePerformanceRatio(similarSessions, agentType);
  }

  /**
   * Calculate average performance ratio compared to baseline
   */
  private calculateAveragePerformanceRatio(
    sessions: HistoricalDataPoint[],
    agentType: AgentType
  ): number {
    const profile = this.agentProfiles[agentType];
    const ratios = sessions.map(session => {
      const expectedTime = profile.baselineMs * 
        this.calculateLengthFactor(session.transcriptionLength, profile.lengthScalingFactor);
      return session.actualProcessingTime / expectedTime;
    });

    const avgRatio = ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
    
    // Limit adjustment to reasonable bounds (0.5x to 2x)
    return Math.max(0.5, Math.min(2.0, avgRatio));
  }

  /**
   * Calculate system performance factor
   */
  private calculateSystemPerformanceFactor(systemPerformance?: number): number {
    if (!systemPerformance) {
      // Try to get current system performance from performance service
      const _performanceSummary = this.performanceService.getPerformanceSummary();
      const recentIssues = this.performanceService.getRecentIssues(2);
      
      if (recentIssues.length > 0) {
        return 1.3; // 30% slower if recent performance issues
      }
      
      return 1.0; // Normal performance
    }

    // Convert system performance (0-100) to multiplier
    // 0 = very slow (2x), 50 = normal (1x), 100 = fast (0.8x)
    const normalized = Math.max(0, Math.min(100, systemPerformance));
    return 2.0 - (normalized / 100 * 1.2);
  }

  /**
   * Estimate transcription time based on length
   */
  private estimateTranscriptionTime(transcriptionLength: number): number {
    // Base transcription time + length factor
    // MLX Whisper is very fast (~50x real-time), so this is mostly I/O overhead
    const baseTime = 1500; // 1.5s base
    const lengthFactor = Math.log(transcriptionLength / 100 + 1) * 200;
    return baseTime + lengthFactor;
  }

  /**
   * Calculate confidence level based on historical data
   */
  private calculateConfidenceLevel(
    historicalSessionCount: number,
    _lengthCategory: TranscriptionLengthCategory
  ): 'high' | 'medium' | 'low' {
    if (historicalSessionCount >= 20) return 'high';
    if (historicalSessionCount >= 8) return 'medium';
    return 'low';
  }

  /**
   * Format estimate for display in UI
   */
  private formatEstimateForDisplay(
    range: { min: number; max: number },
    confidence: 'high' | 'medium' | 'low',
    basedOnSessions: number
  ): string {
    const minStr = this.formatDuration(range.min);
    const maxStr = this.formatDuration(range.max);
    const confidenceText = confidence === 'high' ? 'High confidence' : 
                          confidence === 'medium' ? 'Medium confidence' : 'Low confidence';
    
    if (basedOnSessions > 0) {
      return `Expected: ${minStr}-${maxStr} (${confidenceText}, ${basedOnSessions} sessions)`;
    } else {
      return `Expected: ${minStr}-${maxStr} (${confidenceText})`;
    }
  }

  /**
   * Format duration for display
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    const seconds = ms / 1000;
    if (seconds < 10) return `${seconds.toFixed(1)}s`;
    return `${Math.round(seconds)}s`;
  }

  /**
   * Record actual processing time for learning
   */
  recordActualProcessingTime(
    agentType: AgentType,
    transcriptionLength: number,
    actualProcessingTimeMs: number,
    systemPerformance?: number
  ): void {
    const dataPoint: HistoricalDataPoint = {
      agentType,
      transcriptionLength,
      actualProcessingTime: actualProcessingTimeMs,
      timestamp: Date.now(),
      systemPerformance
    };

    this.historicalData.push(dataPoint);

    // Keep only recent data
    if (this.historicalData.length > this.maxHistorySize) {
      this.historicalData = this.historicalData.slice(-this.maxHistorySize);
    }

    // Save to storage periodically
    this.saveHistoricalData();

    logger.info(`Recorded processing time for ${agentType}`, {
      component: 'processing-predictor',
      operation: 'record-time',
      agentType,
      transcriptionLength,
      processingTime: actualProcessingTimeMs
    });
  }

  /**
   * Update prediction accuracy based on actual results
   */
  updatePredictionAccuracy(
    prediction: ProcessingTimeEstimate,
    actualTimeMs: number
  ): { accuracy: number; wasWithinRange: boolean } {
    const wasWithinRange = actualTimeMs >= prediction.range.min && actualTimeMs <= prediction.range.max;
    const accuracy = 1 - Math.abs(prediction.estimatedDurationMs - actualTimeMs) / prediction.estimatedDurationMs;
    
    logger.info(`Prediction accuracy: ${Math.round(accuracy * 100)}%, within range: ${wasWithinRange}`, {
      component: 'processing-predictor',
      operation: 'accuracy-check',
      accuracy: Math.round(accuracy * 100),
      withinRange: wasWithinRange
    });
    
    return { accuracy: Math.max(0, accuracy), wasWithinRange };
  }

  /**
   * Get performance stats for a specific agent
   */
  getAgentPerformanceStats(agentType: AgentType): {
    averageTime: number;
    sessionCount: number;
    accuracyTrend: 'improving' | 'stable' | 'declining';
  } {
    const agentData = this.historicalData.filter(d => d.agentType === agentType);
    
    if (agentData.length === 0) {
      return {
        averageTime: this.agentProfiles[agentType]?.baselineMs || 5000,
        sessionCount: 0,
        accuracyTrend: 'stable'
      };
    }

    const averageTime = agentData.reduce((sum, d) => sum + d.actualProcessingTime, 0) / agentData.length;
    
    // Simple trend analysis - compare first half vs second half
    const accuracyTrend = this.analyzeTrend(agentData);

    return {
      averageTime: Math.round(averageTime),
      sessionCount: agentData.length,
      accuracyTrend
    };
  }

  /**
   * Analyze performance trend
   */
  private analyzeTrend(data: HistoricalDataPoint[]): 'improving' | 'stable' | 'declining' {
    if (data.length < 6) return 'stable';
    
    const mid = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, mid);
    const secondHalf = data.slice(mid);
    
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.actualProcessingTime, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.actualProcessingTime, 0) / secondHalf.length;
    
    const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (changePercent < -10) return 'improving'; // Getting faster
    if (changePercent > 10) return 'declining';  // Getting slower
    return 'stable';
  }

  /**
   * Load historical data from storage
   */
  private async loadHistoricalData(): Promise<void> {
    try {
      const result = await chrome.storage.local.get('processingTimeHistory');
      if (result.processingTimeHistory) {
        this.historicalData = result.processingTimeHistory.slice(-this.maxHistorySize);
        logger.info(`Loaded ${this.historicalData.length} historical processing time data points`, {
          component: 'processing-predictor',
          operation: 'load-data',
          dataPoints: this.historicalData.length
        });
      }
    } catch (error) {
      logger.warn('Failed to load historical processing time data', {
        component: 'processing-predictor',
        operation: 'load-data',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Save historical data to storage
   */
  private async saveHistoricalData(): Promise<void> {
    try {
      await chrome.storage.local.set({
        processingTimeHistory: this.historicalData
      });
    } catch (error) {
      logger.warn('Failed to save historical processing time data', {
        component: 'processing-predictor',
        operation: 'save-data',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Clear historical data (for testing or privacy)
   */
  clearHistoricalData(): void {
    this.historicalData = [];
    chrome.storage.local.remove('processingTimeHistory');
    logger.info('Cleared historical processing time data', {
      component: 'processing-predictor',
      operation: 'clear-data'
    });
  }

  /**
   * Export historical data for analysis
   */
  exportHistoricalData(): HistoricalDataPoint[] {
    return [...this.historicalData];
  }
}
