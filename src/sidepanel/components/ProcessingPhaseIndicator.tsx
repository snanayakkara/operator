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

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Brain, FileCheck, CheckCircle, Clock, TrendingUp, BarChart3 as _BarChart3 } from 'lucide-react';
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

  // Format timer with enhanced formatting: seconds for first 60s, then minutes:seconds
  const formatElapsedTime = (ms: number): string => {
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

  const getPhaseStatus = (phase: ProcessingPhase) => {
    if (completedPhases.has(phase.id)) {
      return 'completed';
    } else if (activePhaseId === phase.id) {
      return 'active';
    } else {
      return 'pending';
    }
  };

  const getPhaseProgress = (phase: ProcessingPhase) => {
    const [start, end] = phase.progressRange;
    if (currentProgress <= start) return 0;
    if (currentProgress >= end) return 100;
    
    // Calculate progress within this phase
    return ((currentProgress - start) / (end - start)) * 100;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'active':
        return 'text-indigo-600 bg-indigo-100 border-indigo-200';
      default:
        return 'text-gray-400 bg-gray-50 border-gray-200';
    }
  };

  const getIconComponent = (phase: ProcessingPhase, status: string) => {
    if (status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
    
    const IconComponent = phase.icon;
    const iconClass = status === 'active' 
      ? 'w-5 h-5 text-indigo-600' 
      : 'w-5 h-5 text-gray-400';
    
    return <IconComponent className={iconClass} />;
  };

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
      className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}
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

      {/* Phase List */}
      <motion.div 
        className="space-y-3"
        variants={withReducedMotion(staggerContainer)}
        initial="hidden"
        animate="visible"
        transition={{
          staggerChildren: STAGGER_CONFIGS.tight,
          delayChildren: 0.3
        }}
      >
        {PROCESSING_PHASES.map((phase, index) => {
          const status = getPhaseStatus(phase);
          const phaseProgress = getPhaseProgress(phase);
          
          return (
            <motion.div
              key={phase.id}
              className={`relative flex items-start space-x-3 p-3 rounded-lg border ${getStatusColor(status)}`}
              role="listitem"
              aria-label={`${phase.label}: ${status === 'completed' ? 'Complete' : status === 'active' ? 'In progress' : 'Pending'}`}
              variants={withReducedMotion(listItemVariants)}
              animate={{
                scale: status === 'active' ? [1, 1.02, 1] : 1,
                borderColor: status === 'active' ? ['rgb(199, 210, 254)', 'rgb(129, 140, 248)', 'rgb(199, 210, 254)'] : undefined
              }}
              transition={{
                scale: {
                  duration: 2,
                  repeat: status === 'active' ? Infinity : 0,
                  ease: 'easeInOut'
                },
                ...createSpringTransition(SPRING_CONFIGS.gentle)
              }}
            >
              {/* Phase Icon */}
              <motion.div 
                className="flex-shrink-0 mt-0.5"
                animate={{
                  scale: status === 'active' ? [1, 1.1, 1] : 1,
                  rotate: status === 'active' && phase.icon === Brain ? [0, 5, -5, 0] : 0
                }}
                transition={{
                  scale: {
                    duration: 1.5,
                    repeat: status === 'active' ? Infinity : 0,
                    ease: 'easeInOut'
                  },
                  rotate: {
                    duration: 2,
                    repeat: status === 'active' && phase.icon === Brain ? Infinity : 0,
                    ease: 'easeInOut'
                  }
                }}
              >
                {getIconComponent(phase, status)}
              </motion.div>

              {/* Phase Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h5 className="text-sm font-medium text-gray-900">
                    {phase.label}
                  </h5>
                  {status === 'active' && (
                    <span className="text-xs text-indigo-600 font-medium">
                      {Math.round(phaseProgress)}%
                    </span>
                  )}
                </div>
                
                <p className="text-xs text-gray-600 mb-2">
                  {phase.description}
                </p>

                {/* Phase-specific Progress Bar */}
                <AnimatePresence>
                  {status === 'active' && (
                    <motion.div 
                      className="w-full bg-indigo-200 rounded-full h-1"
                      role="progressbar"
                      aria-valuenow={phaseProgress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${phase.label} progress`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 4 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: _ANIMATION_DURATIONS.quick }}
                    >
                      <motion.div 
                        className="bg-indigo-600 h-1 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${phaseProgress}%` }}
                        transition={{
                          type: 'spring',
                          damping: 25,
                          stiffness: 400,
                          mass: 0.5
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Connection Line to Next Phase */}
              {index < PROCESSING_PHASES.length - 1 && (
                <div className="absolute left-6 top-12 w-0.5 h-4 bg-gray-200" />
              )}
            </motion.div>
          );
        })}
      </motion.div>

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
