/**
 * VerticalStepper Component
 *
 * A reusable vertical stepper that displays processing phases as a pipeline
 * with numbered steps, connecting rail, and state-specific styling.
 *
 * Features:
 * - Numbered step indicators with icons
 * - Connecting rail between steps
 * - State-specific styling (queued/running/done/failed)
 * - Per-step progress bars for active steps
 * - ARIA live regions for accessibility
 * - Reduced motion support
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import {
  listItemVariants,
  withReducedMotion,
  SPRING_CONFIGS,
  createSpringTransition,
  ANIMATION_DURATIONS
} from '@/utils/animations';

export type StepStatus = 'queued' | 'running' | 'done' | 'failed';

export interface Step {
  id: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  status: StepStatus;
  progress?: number; // 0-100 for running steps
}

export interface VerticalStepperProps {
  steps: Step[];
  className?: string;
  compact?: boolean;
}

const getStatusStyles = (status: StepStatus) => {
  switch (status) {
    case 'done':
      return {
        containerClass: 'bg-green-50 border-green-200',
        numberClass: 'bg-green-500 text-white',
        textClass: 'text-green-900',
        descClass: 'text-green-700',
        railClass: 'bg-green-300'
      };
    case 'running':
      return {
        containerClass: 'bg-indigo-50 border-indigo-300',
        numberClass: 'bg-indigo-600 text-white animate-pulse',
        textClass: 'text-indigo-900',
        descClass: 'text-indigo-700',
        railClass: 'bg-indigo-200'
      };
    case 'failed':
      return {
        containerClass: 'bg-red-50 border-red-200',
        numberClass: 'bg-red-500 text-white',
        textClass: 'text-red-900',
        descClass: 'text-red-700',
        railClass: 'bg-red-200'
      };
    case 'queued':
    default:
      return {
        containerClass: 'bg-gray-50 border-gray-200',
        numberClass: 'bg-gray-300 text-gray-600',
        textClass: 'text-gray-600',
        descClass: 'text-gray-500',
        railClass: 'bg-gray-200'
      };
  }
};

const getStatusIcon = (status: StepStatus, IconComponent?: React.ComponentType<{ className?: string }>) => {
  if (status === 'done') {
    return <CheckCircle className="w-4 h-4 text-white" />;
  }
  if (status === 'failed') {
    return <AlertCircle className="w-4 h-4 text-white" />;
  }
  if (status === 'running') {
    return <Loader2 className="w-4 h-4 text-white animate-spin" />;
  }
  if (IconComponent) {
    return <IconComponent className="w-4 h-4" />;
  }
  return null;
};

const getStatusLabel = (status: StepStatus): string => {
  switch (status) {
    case 'done':
      return 'Complete';
    case 'running':
      return 'In progress';
    case 'failed':
      return 'Failed';
    case 'queued':
    default:
      return 'Pending';
  }
};

export const VerticalStepper: React.FC<VerticalStepperProps> = ({
  steps,
  className = '',
  compact = false
}) => {
  return (
    <div
      className={`space-y-3 ${className}`}
      role="list"
      aria-label="Processing steps"
    >
      {steps.map((step, index) => {
        const styles = getStatusStyles(step.status);
        const isLast = index === steps.length - 1;
        const stepNumber = index + 1;

        return (
          <motion.div
            key={step.id}
            className="relative"
            variants={withReducedMotion(listItemVariants)}
            initial="hidden"
            animate="visible"
            transition={{
              delay: index * 0.1,
              ...createSpringTransition(SPRING_CONFIGS.gentle)
            }}
          >
            <div
              className={`relative flex items-start space-x-3 p-3 rounded-lg border transition-all ${styles.containerClass}`}
              role="listitem"
              aria-label={`Step ${stepNumber}: ${step.label} - ${getStatusLabel(step.status)}`}
            >
              {/* Step Number/Icon */}
              <div className="flex-shrink-0 mt-0.5">
                <div
                  className={`flex items-center justify-center w-6 h-6 rounded-full font-semibold text-xs transition-all ${styles.numberClass}`}
                  aria-hidden="true"
                >
                  {getStatusIcon(step.status, step.icon) || stepNumber}
                </div>
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h5 className={`text-sm font-medium ${styles.textClass}`}>
                    {step.label}
                  </h5>
                  {step.status === 'running' && typeof step.progress === 'number' && (
                    <span
                      className="text-xs font-medium text-indigo-600 tabular-nums"
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      {Math.round(step.progress)}%
                    </span>
                  )}
                </div>

                {step.description && !compact && (
                  <p className={`text-xs ${styles.descClass} mb-2`}>
                    {step.description}
                  </p>
                )}

                {/* Progress Bar for Running Steps */}
                <AnimatePresence>
                  {step.status === 'running' && typeof step.progress === 'number' && (
                    <motion.div
                      className="w-full bg-indigo-200 rounded-full h-1 mt-2"
                      role="progressbar"
                      aria-valuenow={step.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${step.label} progress`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 4 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: ANIMATION_DURATIONS.quick }}
                    >
                      <motion.div
                        className="bg-indigo-600 h-1 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${step.progress}%` }}
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
            </div>

            {/* Connecting Rail */}
            {!isLast && (
              <div
                className="absolute left-8 top-[54px] w-0.5 h-3 transition-colors"
                style={{
                  backgroundColor: step.status === 'done' ? styles.railClass : '#e5e7eb'
                }}
                aria-hidden="true"
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
};
