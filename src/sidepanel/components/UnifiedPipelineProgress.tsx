/**
 * Unified Pipeline Progress Component
 *
 * Single horizontal segmented progress bar showing live updates through the entire processing pipeline:
 * 1. Audio Processing (0-10%) - Recording validation, format conversion
 * 2. Transcribing (10-40%) - Whisper transcription with queue status
 * 3. AI Analysis (40-90%) - Agent-specific processing with model name
 * 4. Generation (90-100%) - Final formatting, streaming tokens
 *
 * Replaces FieldIngestionOverlay and ProcessingPhaseIndicator with unified progress tracking.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Mic, FileText, Brain, Sparkles, Clock, TrendingUp } from 'lucide-react';
import { formatElapsedTime } from '@/utils/formatting';
import { ProcessingTimePredictor, type ProcessingTimeEstimate } from '@/services/ProcessingTimePredictor';
import type { PipelineProgress, PipelineStage, AgentType } from '@/types/medical.types';
import { getStateColors, pipelineStageToState } from '@/utils/stateColors';

interface UnifiedPipelineProgressProps {
  progress: PipelineProgress;
  startTime?: number;
  agentType?: AgentType;
  transcriptionLength?: number;
  showTimeEstimate?: boolean;
  className?: string;
}

interface PipelineSegment {
  id: PipelineStage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  range: [number, number]; // Progress range this segment covers
  color: {
    inactive: string;
    active: string;
    complete: string;
  };
}

// Generate pipeline segments with consistent colors from shared state definitions
const PIPELINE_SEGMENTS: PipelineSegment[] = [
  {
    id: 'audio-processing',
    label: 'Processing Audio',
    icon: Mic,
    range: [0, 10],
    color: getStateColors(pipelineStageToState('audio-processing')).progressGradient
  },
  {
    id: 'transcribing',
    label: 'Transcribing',
    icon: FileText,
    range: [10, 40],
    color: getStateColors(pipelineStageToState('transcribing')).progressGradient
  },
  {
    id: 'ai-analysis',
    label: 'AI Analysis',
    icon: Brain,
    range: [40, 90],
    color: getStateColors(pipelineStageToState('ai-analysis')).progressGradient
  },
  {
    id: 'generation',
    label: 'Generating',
    icon: Sparkles,
    range: [90, 100],
    color: getStateColors(pipelineStageToState('generation')).progressGradient
  }
];

export const UnifiedPipelineProgress: React.FC<UnifiedPipelineProgressProps> = ({
  progress,
  startTime,
  agentType,
  transcriptionLength,
  showTimeEstimate = true,
  className = ''
}) => {
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [prediction, setPrediction] = useState<ProcessingTimeEstimate | null>(null);
  const [predictor] = useState(() => ProcessingTimePredictor.getInstance());

  const effectiveStartTime = startTime || Date.now();

  // Update elapsed time
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const elapsed = Date.now() - effectiveStartTime;
      if (elapsed >= 0 && elapsed < 86400000) {
        setElapsedTime(elapsed);
      }
    }, 100);

    return () => clearInterval(intervalId);
  }, [effectiveStartTime]);

  // Generate time prediction
  useEffect(() => {
    if (agentType && transcriptionLength && showTimeEstimate && !prediction) {
      try {
        const estimate = predictor.predictProcessingTime(agentType, transcriptionLength, {
          includeTranscriptionTime: true
        });
        setPrediction(estimate);
      } catch (error) {
        console.warn('Failed to generate time prediction:', error);
      }
    }
  }, [agentType, transcriptionLength, showTimeEstimate, prediction, predictor]);

  // Calculate segment status
  const getSegmentStatus = (segment: PipelineSegment): 'inactive' | 'active' | 'complete' => {
    const [start, end] = segment.range;
    if (progress.progress >= end) return 'complete';
    if (progress.progress >= start && progress.progress < end) return 'active';
    return 'inactive';
  };

  // Calculate segment fill percentage
  const getSegmentFill = (segment: PipelineSegment): number => {
    const status = getSegmentStatus(segment);
    if (status === 'complete') return 100;
    if (status === 'inactive') return 0;

    const [start, end] = segment.range;
    const segmentProgress = ((progress.progress - start) / (end - start)) * 100;
    return Math.max(0, Math.min(100, segmentProgress));
  };

  // Get current active segment
  const activeSegment = useMemo(() => {
    return PIPELINE_SEGMENTS.find(seg => getSegmentStatus(seg) === 'active');
  }, [progress.progress]);

  // Calculate remaining time
  const getRemainingTime = (): number | null => {
    if (!prediction || progress.progress >= 100) return null;

    const remainingProgress = (100 - progress.progress) / 100;
    const estimatedRemaining = prediction.estimatedDurationMs * remainingProgress;

    // Adjust based on actual progress
    const predictedTimeForCurrentProgress = prediction.estimatedDurationMs * (progress.progress / 100);
    const actualTimeRatio = elapsedTime / Math.max(predictedTimeForCurrentProgress, 100);

    return Math.max(0, estimatedRemaining * actualTimeRatio);
  };

  const formatRemainingTime = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000);
    if (totalSeconds < 60) return `~${totalSeconds}s left`;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `~${minutes}m ${seconds}s left`;
  };

  const remainingTime = getRemainingTime();

  return (
    <motion.div
      className={`bg-white rounded-lg border border-gray-200 p-4 shadow-sm ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      role="status"
      aria-live="polite"
      aria-label="Processing pipeline progress"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {activeSegment && <activeSegment.icon className="w-4 h-4 text-gray-700" />}
          <h4 className="text-sm font-medium text-gray-900">
            {agentType
              ? agentType.charAt(0).toUpperCase() + agentType.slice(1).replace('-', ' ')
              : 'Processing'}
          </h4>
          {progress.modelName && (
            <span className="text-xs text-gray-500">• {progress.modelName}</span>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 text-indigo-600">
            <Clock className="w-3 h-3" />
            <span className="text-xs font-mono font-medium">
              {formatElapsedTime(elapsedTime)}
            </span>
          </div>
          {remainingTime !== null && remainingTime > 1000 && (
            <div className="flex items-center space-x-1 text-purple-600">
              <TrendingUp className="w-3 h-3" />
              <span className="text-xs font-medium">
                {formatRemainingTime(remainingTime)}
              </span>
            </div>
          )}
          <span className="text-xs text-gray-500 font-medium">
            {Math.round(progress.progress)}%
          </span>
        </div>
      </div>

      {/* Segmented Progress Bar */}
      <div className="mb-3">
        <div className="flex gap-1">
          {PIPELINE_SEGMENTS.map((segment) => {
            const status = getSegmentStatus(segment);
            const fill = getSegmentFill(segment);
            const segmentWidth = segment.range[1] - segment.range[0]; // Relative width

            return (
              <div
                key={segment.id}
                className="relative overflow-hidden rounded-sm"
                style={{ flex: segmentWidth }}
              >
                {/* Background */}
                <div className={`h-2 ${segment.color.inactive}`} />
                {/* Fill */}
                <motion.div
                  className={`absolute inset-y-0 left-0 ${
                    status === 'complete'
                      ? segment.color.complete
                      : status === 'active'
                      ? segment.color.active
                      : segment.color.inactive
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${fill}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
                {/* Pulse animation for active segment */}
                {status === 'active' && (
                  <motion.div
                    className={`absolute inset-0 ${segment.color.active} opacity-50`}
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage Labels */}
      <div className="flex justify-between text-xs mb-3">
        {PIPELINE_SEGMENTS.map((segment) => {
          const status = getSegmentStatus(segment);
          const Icon = segment.icon;

          return (
            <div
              key={segment.id}
              className={`flex items-center space-x-1 ${
                status === 'complete'
                  ? 'text-gray-600'
                  : status === 'active'
                  ? 'text-gray-900 font-medium'
                  : 'text-gray-400'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{segment.label}</span>
            </div>
          );
        })}
      </div>

      {/* Current Status Details */}
      {progress.details && (
        <div className="text-xs text-gray-600 text-center py-2 bg-gray-50 rounded border border-gray-100">
          {progress.details}
          {progress.queuePosition !== undefined && progress.queuePosition > 0 && (
            <span className="ml-2 text-gray-500">• Queue position: {progress.queuePosition}</span>
          )}
          {progress.tokenCount !== undefined && progress.tokenCount > 0 && (
            <span className="ml-2 text-emerald-600">• {progress.tokenCount} tokens</span>
          )}
        </div>
      )}

      {/* Footer with model info */}
      <div className="mt-3 pt-2 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-500">
          {progress.progress >= 100
            ? '✅ Processing complete'
            : '🔄 Local processing - privacy-first'}
        </p>
      </div>
    </motion.div>
  );
};
