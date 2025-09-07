/**
 * Processing Time Predictor Hook
 * 
 * Provides easy integration with the ProcessingTimePredictor service
 * for components that need time estimation capabilities.
 */

import { useState, useCallback, useEffect } from 'react';
import { ProcessingTimePredictor, type ProcessingTimeEstimate } from '@/services/ProcessingTimePredictor';
import type { AgentType } from '@/types/medical.types';

export interface UseProcessingTimePredictorReturn {
  // Current prediction
  prediction: ProcessingTimeEstimate | null;
  
  // Actions
  generatePrediction: (agentType: AgentType, transcriptionLength: number) => void;
  recordActualTime: (agentType: AgentType, transcriptionLength: number, actualTimeMs: number) => void;
  clearPrediction: () => void;
  
  // Agent performance stats
  getAgentStats: (agentType: AgentType) => {
    averageTime: number;
    sessionCount: number;
    accuracyTrend: 'improving' | 'stable' | 'declining';
  };
  
  // Historical data management
  clearHistory: () => void;
  exportHistory: () => any[];
}

export function useProcessingTimePredictor(): UseProcessingTimePredictorReturn {
  const [prediction, setPrediction] = useState<ProcessingTimeEstimate | null>(null);
  const [predictor] = useState(() => ProcessingTimePredictor.getInstance());

  const generatePrediction = useCallback((agentType: AgentType, transcriptionLength: number) => {
    try {
      const estimate = predictor.predictProcessingTime(agentType, transcriptionLength, {
        includeTranscriptionTime: false // Usually we only show processing time
      });
      setPrediction(estimate);
      console.log(`📊 Generated prediction for ${agentType}:`, estimate.displayText);
    } catch (error) {
      console.warn('Failed to generate prediction:', error);
      setPrediction(null);
    }
  }, [predictor]);

  const recordActualTime = useCallback((
    agentType: AgentType, 
    transcriptionLength: number, 
    actualTimeMs: number
  ) => {
    predictor.recordActualProcessingTime(agentType, transcriptionLength, actualTimeMs);
    
    // Calculate accuracy if we have a prediction
    if (prediction) {
      const accuracy = predictor.updatePredictionAccuracy(prediction, actualTimeMs);
      console.log(`🎯 Prediction accuracy: ${Math.round(accuracy.accuracy * 100)}%, within range: ${accuracy.wasWithinRange}`);
    }
  }, [predictor, prediction]);

  const clearPrediction = useCallback(() => {
    setPrediction(null);
  }, []);

  const getAgentStats = useCallback((agentType: AgentType) => {
    return predictor.getAgentPerformanceStats(agentType);
  }, [predictor]);

  const clearHistory = useCallback(() => {
    predictor.clearHistoricalData();
  }, [predictor]);

  const exportHistory = useCallback(() => {
    return predictor.exportHistoricalData();
  }, [predictor]);

  return {
    prediction,
    generatePrediction,
    recordActualTime,
    clearPrediction,
    getAgentStats,
    clearHistory,
    exportHistory
  };
}

/**
 * Hook for components that want to automatically manage predictions
 * during processing workflows
 */
export function useAutomaticPrediction(
  agentType?: AgentType,
  transcriptionLength?: number,
  isProcessing?: boolean
) {
  const { 
    prediction, 
    generatePrediction, 
    recordActualTime, 
    clearPrediction 
  } = useProcessingTimePredictor();

  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);

  // Generate prediction when processing starts
  useEffect(() => {
    if (isProcessing && agentType && transcriptionLength && !prediction) {
      generatePrediction(agentType, transcriptionLength);
      setProcessingStartTime(Date.now());
    } else if (!isProcessing) {
      // Record actual time when processing completes
      if (prediction && processingStartTime && agentType && transcriptionLength) {
        const actualTime = Date.now() - processingStartTime;
        recordActualTime(agentType, transcriptionLength, actualTime);
      }
      clearPrediction();
      setProcessingStartTime(null);
    }
  }, [isProcessing, agentType, transcriptionLength, prediction, processingStartTime, generatePrediction, recordActualTime, clearPrediction]);

  return {
    prediction,
    processingStartTime,
    recordManualTime: recordActualTime
  };
}