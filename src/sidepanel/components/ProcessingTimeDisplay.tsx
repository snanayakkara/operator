import React, { useState, useEffect } from 'react';
import { Clock, Zap, Activity, Mic } from 'lucide-react';
import type { AppState, AgentType } from '@/types/medical.types';
import { ProcessingTimePredictor, type ProcessingTimeEstimate } from '@/services/ProcessingTimePredictor';

interface ProcessingTimeDisplayProps {
  appState: AppState;
  isRecording?: boolean;
  recordingTime?: number;
  transcriptionLength?: number; // optional: provide transcript length for predictions
  modelUsed?: string | null; // optional: actual model used for this session
}

interface AgentExpectedTimes {
  [key: string]: { min: number; max: number; complexity: 'low' | 'medium' | 'high' };
}

/**
 * Map model IDs to user-friendly display names
 */
const getModelDisplayName = (modelId: string | null | undefined): string => {
  if (!modelId) return 'MedGemma-27B MLX';

  // Model display name mappings
  const modelMap: Record<string, string> = {
    'medgemma-27b-text-it-mlx': 'MedGemma-27B MLX',
    'qwen/qwen3-4b-2507': 'Qwen 3-4B',
    'qwen3-4b': 'Qwen 3-4B',
    'gemma-3n-e4b': 'Gemma 3N-E4B',
  };

  // Try exact match first
  if (modelMap[modelId]) return modelMap[modelId];

  // Try partial match for variations
  const lowerModelId = modelId.toLowerCase();
  for (const [key, value] of Object.entries(modelMap)) {
    if (lowerModelId.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerModelId)) {
      return value;
    }
  }

  // Fallback: return original model ID if no mapping found
  return modelId;
};

const AGENT_EXPECTED_TIMES: AgentExpectedTimes = {
  // Documentation agents - simpler tasks, some using lighter models
  'quick-letter': { min: 30000, max: 60000, complexity: 'low' },        // 30s-1min
  'consultation': { min: 120000, max: 240000, complexity: 'medium' },   // 2-4min
  'investigation-summary': { min: 10000, max: 30000, complexity: 'low' }, // 10-30s (uses QUICK_MODEL)
  
  // Complex procedure agents - detailed medical reports using REASONING_MODEL
  'tavi': { min: 480000, max: 720000, complexity: 'high' },            // 8-12min
  'mteer': { min: 420000, max: 600000, complexity: 'high' },           // 7-10min
  'pfo-closure': { min: 300000, max: 480000, complexity: 'medium' },    // 5-8min
  'right-heart-cath': { min: 360000, max: 600000, complexity: 'medium' }, // 6-10min
  'angiogram-pci': { min: 480000, max: 900000, complexity: 'high' },    // 8-15min
  
  // AI Review - comprehensive clinical analysis using REASONING_MODEL
  'ai-medical-review': { min: 180000, max: 240000, complexity: 'medium' } // 3-4min (user reported 3min actual)
};

export const ProcessingTimeDisplay: React.FC<ProcessingTimeDisplayProps> = ({ appState, isRecording = false, recordingTime = 0, transcriptionLength, modelUsed = null }) => {
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [prediction, setPrediction] = useState<ProcessingTimeEstimate | null>(null);
  const [predictor] = useState(() => ProcessingTimePredictor.getInstance());

  // Update elapsed time during processing
  useEffect(() => {
    let intervalId: number;

    if (appState.processingStatus === 'transcribing' || appState.processingStatus === 'processing') {
      intervalId = window.setInterval(() => {
        if (appState.processingStartTime) {
          setElapsedTime(Date.now() - appState.processingStartTime);
        }
      }, 100);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [appState.processingStatus, appState.processingStartTime]);

  // Generate prediction when we have agent + transcriptionLength
  useEffect(() => {
    try {
      if (appState.currentAgent && typeof transcriptionLength === 'number' && transcriptionLength > 0) {
        const estimate = predictor.predictProcessingTime(appState.currentAgent, transcriptionLength, {
          includeTranscriptionTime: true
        });
        setPrediction(estimate);
      } else {
        setPrediction(null);
      }
    } catch (e) {
      console.warn('Failed to predict processing time:', e);
      setPrediction(null);
    }
  }, [appState.currentAgent, transcriptionLength, predictor]);

  // Format time with enhanced formatting: seconds for first 60s, then minutes:seconds
  const formatTime = (ms: number | null): string => {
    if (ms === null) return '0s';
    
    const totalSeconds = Math.floor(ms / 1000);
    
    if (totalSeconds < 60) {
      // Show seconds with 1 decimal for first 60 seconds
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      // Show minutes:seconds format after 60 seconds
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes}m ${seconds}s`;
    }
  };

  // Format real-time timer (counting up) with aesthetic formatting
  const formatRealTimeTimer = (ms: number | null): string => {
    if (ms === null) return '0s';
    
    const totalSeconds = Math.floor(ms / 1000);
    
    if (totalSeconds < 60) {
      // Show seconds only for first 60 seconds
      return `${totalSeconds}s`;
    } else {
      // Show minutes:seconds format after 60 seconds  
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
    }
  };

  // Get performance indicator
  const getPerformanceIndicator = (actualTime: number, agentType: AgentType | null): { icon: string; color: string; label: string } => {
    // Prefer dynamic prediction range when available
    if (prediction) {
      if (actualTime < prediction.range.min) return { icon: '🟢', color: 'text-green-600', label: 'Fast' };
      if (actualTime <= prediction.range.max) return { icon: '🟡', color: 'text-yellow-600', label: 'Normal' };
      return { icon: '🔴', color: 'text-red-600', label: 'Slow' };
    }

    // Fallback to static expected times by agent
    if (!agentType || !AGENT_EXPECTED_TIMES[agentType]) {
      return { icon: '🟡', color: 'text-yellow-600', label: 'Normal' };
    }
    const expected = AGENT_EXPECTED_TIMES[agentType];
    if (actualTime < expected.min) return { icon: '🟢', color: 'text-green-600', label: 'Fast' };
    if (actualTime <= expected.max) return { icon: '🟡', color: 'text-yellow-600', label: 'Normal' };
    return { icon: '🔴', color: 'text-red-600', label: 'Slow' };
  };

  // During recording - show recording timer
  if (isRecording && recordingTime > 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
        <div className="flex items-center space-x-2">
          <Mic className="h-4 w-4 text-red-600 animate-pulse" />
          <span className="text-sm font-medium text-red-800">Recording...</span>
          <span className="text-sm text-red-600 font-mono">({formatRealTimeTimer(recordingTime)} elapsed)</span>
        </div>
      </div>
    );
  }

  // During processing - show real-time elapsed time
  if (appState.processingStatus === 'transcribing') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div className="flex items-center space-x-2">
          <Activity className="h-4 w-4 text-blue-600 animate-pulse" />
          <span className="text-sm font-medium text-blue-800">Transcribing...</span>
          <span className="text-sm text-blue-600 font-mono">({formatRealTimeTimer(elapsedTime)} elapsed)</span>
        </div>
      </div>
    );
  }

  if (appState.processingStatus === 'processing') {
    return (
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
        <div className="flex items-center space-x-2">
          <Zap className="h-4 w-4 text-purple-600 animate-pulse" />
          <span className="text-sm font-medium text-purple-800">
            {appState.currentAgentName || 'Agent'} Processing...
          </span>
          <span className="text-sm text-purple-600 font-mono">({formatRealTimeTimer(elapsedTime)} elapsed)</span>
        </div>
      </div>
    );
  }

  // After completion - show timing breakdown
  if (appState.processingStatus === 'complete' && appState.totalProcessingTime) {
    const performance = getPerformanceIndicator(appState.totalProcessingTime, appState.currentAgent);
    const recordingPercent = appState.recordingTime ? 
      Math.round((appState.recordingTime / appState.totalProcessingTime) * 100) : 0;
    const transcriptionPercent = appState.transcriptionTime ? 
      Math.round((appState.transcriptionTime / appState.totalProcessingTime) * 100) : 0;
    const agentPercent = appState.agentProcessingTime ? 
      Math.round((appState.agentProcessingTime / appState.totalProcessingTime) * 100) : 0;

    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Processing Complete</span>
              <span className={`text-xs ${performance.color}`}>
                {performance.icon} {performance.label}
              </span>
            </div>
            <span className="text-sm font-semibold text-green-800">
              {formatTime(appState.totalProcessingTime)}
            </span>
          </div>

          {/* Timing Breakdown */}
          <div className="space-y-2">
            {/* Recording */}
            {appState.recordingTime && (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                  <span className="text-gray-700">Recording (Voice Input)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-red-400 h-1.5 rounded-full" 
                      style={{ width: `${recordingPercent}%` }}
                    ></div>
                  </div>
                  <span className="w-12 text-right font-medium">{formatTime(appState.recordingTime)}</span>
                  <span className="w-8 text-right text-gray-500">{recordingPercent}%</span>
                </div>
              </div>
            )}

            {/* Transcription */}
            {appState.transcriptionTime && (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                  <span className="text-gray-700">Transcription (MLX Whisper)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-blue-400 h-1.5 rounded-full" 
                      style={{ width: `${transcriptionPercent}%` }}
                    ></div>
                  </div>
                  <span className="w-12 text-right font-medium">{formatTime(appState.transcriptionTime)}</span>
                  <span className="w-8 text-right text-gray-500">{transcriptionPercent}%</span>
                </div>
              </div>
            )}

            {/* Agent Processing */}
            {appState.agentProcessingTime && (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                  <span className="text-gray-700">{appState.currentAgentName || 'Agent'} ({getModelDisplayName(modelUsed)})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-purple-400 h-1.5 rounded-full"
                      style={{ width: `${agentPercent}%` }}
                    ></div>
                  </div>
                  <span className="w-12 text-right font-medium">{formatTime(appState.agentProcessingTime)}</span>
                  <span className="w-8 text-right text-gray-500">{agentPercent}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Performance Context */}
          {/* Prediction or static context */}
          {(() => {
            if (prediction) {
              return (
                <div className="text-xs text-gray-600 pt-1 border-t border-green-100">
                  {prediction.displayText}
                </div>
              );
            }
            if (appState.currentAgent && AGENT_EXPECTED_TIMES[appState.currentAgent]) {
              const exp = AGENT_EXPECTED_TIMES[appState.currentAgent];
              return (
                <div className="text-xs text-gray-600 pt-1 border-t border-green-100">
                  Expected: {formatTime(exp.min)} - {formatTime(exp.max)} ({exp.complexity} complexity)
                </div>
              );
            }
            return null;
          })()}
        </div>
      </div>
    );
  }

  // Don't render anything if no processing has occurred
  return null;
};
