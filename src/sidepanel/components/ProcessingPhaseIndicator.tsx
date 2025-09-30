/**
 * Processing Phase Indicator Component
 * 
 * Multi-stage progress indicator for AI Review processing phases:
 * 1. Field Discovery & Extraction
 * 2. AI Processing & Analysis  
 * 3. Clinical Advisory Generation
 * 
 * Includes enhanced real-time timer with proper formatting.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Brain, FileCheck, Clock, TrendingUp } from 'lucide-react';
import { VerticalStepper, type Step } from './VerticalStepper';
import { formatElapsedTime } from '@/utils/formatting';
import {
  progressVariants as _progressVariants,
  listItemVariants,
  cardVariants as _cardVariants,
  textVariants,
  staggerContainer,
  withReducedMotion,
  ANIMATION_DURATIONS as _ANIMATION_DURATIONS,
  STAGGER_CONFIGS,
  createSpringTransition,
  SPRING_CONFIGS
} from '@/utils/animations';
import { ProcessingTimePredictor, type ProcessingTimeEstimate } from '@/services/ProcessingTimePredictor';
import type { AgentType } from '@/types/medical.types';

interface ProcessingPhase {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  progressRange: [number, number]; // [start%, end%]
}

interface ProcessingPhaseIndicatorProps {
  currentProgress: number;
  isActive: boolean;
  className?: string;
  startTime?: number; // Timestamp when processing started
  // Prediction parameters
  agentType?: AgentType;
  transcriptionLength?: number;
  showTimeEstimate?: boolean;
  onProcessingComplete?: (actualTimeMs: number) => void;
  // Streaming indicator
  streaming?: boolean;
  tokenCount?: number;
}

const PROCESSING_PHASES: ProcessingPhase[] = [
  {
    id: 'extraction',
    label: 'Field Extraction',
    description: 'Discovering and extracting EMR field content',
    icon: Search,
    progressRange: [0, 30]
  },
  {
    id: 'analysis',
    label: 'AI Analysis',
    description: 'Processing data with MedGemma-27b model',
    icon: Brain,
    progressRange: [30, 90]
  },
  {
    id: 'generation',
    label: 'Advisory Generation',
    description: 'Creating clinical advisory cards',
    icon: FileCheck,
    progressRange: [90, 100]
  }
];

export const ProcessingPhaseIndicator: React.FC<ProcessingPhaseIndicatorProps> = ({
  currentProgress,
  isActive,
  className = '',
  startTime = Date.now(),
  agentType,
  transcriptionLength,
  showTimeEstimate = true,
  onProcessingComplete,
  streaming = false,
  tokenCount
}) => {
  const [activePhaseId, setActivePhaseId] = useState<string>('');
  const [completedPhases, setCompletedPhases] = useState<Set<string>>(new Set());
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [prediction, setPrediction] = useState<ProcessingTimeEstimate | null>(null);
  const [predictor] = useState(() => ProcessingTimePredictor.getInstance());

  // Update elapsed time every second
  useEffect(() => {
    let intervalId: number;

    if (isActive) {
      intervalId = window.setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 100); // Update every 100ms for smooth countdown
    } else {
      setElapsedTime(0);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isActive, startTime]);

  useEffect(() => {
    if (!isActive) {
      setActivePhaseId('');
      setCompletedPhases(new Set());
      return;
    }

    // Determine active phase based on current progress
    const currentPhase = PROCESSING_PHASES.find(phase => 
      currentProgress >= phase.progressRange[0] && currentProgress <= phase.progressRange[1]
    );

    if (currentPhase) {
      setActivePhaseId(currentPhase.id);
      
      // Mark previous phases as completed
      const newCompleted = new Set<string>();
      PROCESSING_PHASES.forEach(phase => {
        if (phase.progressRange[1] <= currentProgress) {
          newCompleted.add(phase.id);
        }
      });
      setCompletedPhases(newCompleted);
    }
  }, [currentProgress, isActive]);

  // Generate time prediction when processing starts
  useEffect(() => {
    if (isActive && agentType && transcriptionLength && showTimeEstimate && !prediction) {
      try {
        const estimate = predictor.predictProcessingTime(agentType, transcriptionLength, {
          includeTranscriptionTime: false // We're only showing processing time
        });
        setPrediction(estimate);
        console.log(`📊 Time prediction for ${agentType}:`, estimate.displayText);
      } catch (error) {
        console.warn('Failed to generate time prediction:', error);
      }
    } else if (!isActive) {
      // Record actual time when processing completes
      if (prediction && currentProgress >= 100 && onProcessingComplete) {
        const actualTime = elapsedTime;
        onProcessingComplete(actualTime);
        
        // Record for learning if we have the required data
        if (agentType && transcriptionLength) {
          predictor.recordActualProcessingTime(agentType, transcriptionLength, actualTime);
          const accuracy = predictor.updatePredictionAccuracy(prediction, actualTime);
          console.log(`🎯 Prediction accuracy: ${Math.round(accuracy.accuracy * 100)}%`);
        }
      }
      setPrediction(null);
    }
  }, [isActive, agentType, transcriptionLength, showTimeEstimate, prediction, currentProgress, elapsedTime, onProcessingComplete, predictor]);

  // Helper function to calculate phase progress
  const getPhaseProgress = (phase: ProcessingPhase) => {
    const [start, end] = phase.progressRange;
    if (currentProgress <= start) return 0;
    if (currentProgress >= end) return 100;

    // Calculate progress within this phase
    return ((currentProgress - start) / (end - start)) * 100;
  };

  // Convert PROCESSING_PHASES to Step[] for VerticalStepper
  const steps: Step[] = useMemo(() => {
    return PROCESSING_PHASES.map(phase => {
      const isCompleted = completedPhases.has(phase.id);
      const isActive = activePhaseId === phase.id;
      const phaseProgress = getPhaseProgress(phase);

      let status: 'queued' | 'running' | 'done' | 'failed' = 'queued';
      if (isCompleted) status = 'done';
      else if (isActive) status = 'running';

      return {
        id: phase.id,
        label: phase.label,
        description: phase.description,
        icon: phase.icon,
        status,
        progress: isActive ? phaseProgress : undefined
      };
    });
  }, [completedPhases, activePhaseId, currentProgress]);

  // Calculate remaining time based on prediction and current progress
  const getRemainingTime = (): { timeMs: number; isEstimate: boolean } => {
    if (!prediction || currentProgress >= 100) {
      return { timeMs: 0, isEstimate: false };
    }

    // Simple linear interpolation based on progress
    const remainingProgress = (100 - currentProgress) / 100;
    const estimatedRemaining = prediction.estimatedDurationMs * remainingProgress;
    
    // Adjust based on actual vs predicted time so far
    const predictedTimeForCurrentProgress = prediction.estimatedDurationMs * (currentProgress / 100);
    const actualTimeRatio = elapsedTime / Math.max(predictedTimeForCurrentProgress, 100); // Avoid division by zero
    
    // Apply the adjustment ratio to the remaining estimate
    const adjustedRemaining = estimatedRemaining * actualTimeRatio;
    
    return { 
      timeMs: Math.max(0, adjustedRemaining), 
      isEstimate: true 
    };
  };

  // Format remaining time for display
  const formatRemainingTime = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000); // Round up for remaining time
    
    if (totalSeconds < 60) {
      return `~${totalSeconds}s left`;
    } else {
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `~${minutes}m ${seconds}s left`;
    }
  };

  if (!isActive) {
    return null;
  }

  return (
    <motion.div
      className={`bg-white rounded-lg border border-gray-200 p-4 pointer-events-auto ${className}`}
      role="status"
      aria-labelledby="processing-status-title"
      aria-describedby="processing-status-description"
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={createSpringTransition(SPRING_CONFIGS.gentle)}
    >
      {/* Header */}
      <motion.div 
        className="flex items-center justify-between mb-4"
        variants={withReducedMotion(textVariants)}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center space-x-2">
          <h4 id="processing-status-title" className="text-sm font-medium text-gray-900">
            {agentType ? agentType.charAt(0).toUpperCase() + agentType.slice(1).replace('-', ' ') : 'AI Medical Review'}
          </h4>
          {streaming && (
            <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">Generating (streaming…){typeof tokenCount === 'number' ? ` • ${tokenCount}` : ''}</span>
          )}
          <div className="flex items-center space-x-1 text-indigo-600">
            <Clock className="w-3 h-3" />
            <span className="text-xs font-mono font-medium" aria-live="polite">
              {formatElapsedTime(elapsedTime)}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {/* Time estimate */}
          {prediction && showTimeEstimate && (() => {
            const remaining = getRemainingTime();
            return remaining.isEstimate && remaining.timeMs > 1000 ? (
              <div className="flex items-center space-x-1 text-purple-600">
                <TrendingUp className="w-3 h-3" />
                <span className="text-xs font-medium" aria-live="polite">
                  {formatRemainingTime(remaining.timeMs)}
                </span>
              </div>
            ) : null;
          })()}
          <span className="text-xs text-gray-500" aria-live="polite">
            {Math.round(currentProgress)}%
          </span>
        </div>
      </motion.div>

      {/* Overall Progress Bar */}
      <motion.div 
        className="mb-4"
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.2, duration: _ANIMATION_DURATIONS.normal }}
      >
        <div 
          className="w-full bg-gray-200 rounded-full h-1.5"
          role="progressbar"
          aria-valuenow={currentProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Overall processing progress"
        >
          <motion.div 
            className="bg-indigo-600 h-1.5 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${currentProgress}%` }}
            transition={createSpringTransition(SPRING_CONFIGS.gentle)}
          />
        </div>
      </motion.div>

      {/* Vertical Stepper for Phases */}
      <VerticalStepper steps={steps} />

      {/* Footer */}
      <motion.div 
        className="mt-4 pt-3 border-t border-gray-200"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: _ANIMATION_DURATIONS.quick }}
      >
        <div className="flex flex-col items-center space-y-1">
          <p className="text-xs text-gray-500 text-center">
            {currentProgress >= 100 
              ? '✅ Processing complete - clinical advisory ready' 
              : '🔄 Local processing with MedGemma-27b model'
            }
          </p>
          
          {/* Prediction details */}
          {prediction && showTimeEstimate && currentProgress < 100 && (
            <div className="flex items-center justify-center space-x-2 text-xs">
              <span className="text-purple-600 font-medium">
                {prediction.displayText}
              </span>
              {prediction.confidenceLevel === 'high' && (
                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                  High confidence
                </span>
              )}
              {prediction.confidenceLevel === 'medium' && (
                <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                  Medium confidence
                </span>
              )}
              {prediction.confidenceLevel === 'low' && (
                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                  Low confidence
                </span>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
