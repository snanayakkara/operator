/**
 * StateChip Component
 *
 * Displays current recording/processing state as a compact pill.
 * Status-only (not interactive), with clear visual hierarchy.
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { ProcessingStatus } from '@/types/medical.types';

export interface StateChipProps {
  status: ProcessingStatus;
  isRecording?: boolean;
  micAvailable?: boolean;
  className?: string;
}

interface ChipConfig {
  label: string;
  bgColor: string;
  textColor: string;
  showDot?: boolean;
  showIcon?: boolean;
  animated?: boolean;
}

const STATUS_CHIP_CONFIGS: Record<ProcessingStatus, ChipConfig> = {
  idle: {
    label: 'Ready',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    showDot: false
  },
  'extracting-patient': {
    label: 'Preparing',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    showDot: true,
    animated: true
  },
  recording: {
    label: 'Recording…',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    showDot: true,
    animated: true
  },
  transcribing: {
    label: 'Transcribing',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    showDot: true,
    animated: true
  },
  classifying: {
    label: 'Analyzing',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    showDot: true,
    animated: true
  },
  processing: {
    label: 'Processing',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    showDot: true,
    animated: true
  },
  enhancing: {
    label: 'Enhancing',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    showDot: true,
    animated: true
  },
  complete: {
    label: 'Complete',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-700',
    showDot: false
  },
  error: {
    label: 'Error',
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-700',
    showIcon: true
  },
  cancelled: {
    label: 'Cancelled',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-600',
    showDot: false
  },
  cancelling: {
    label: 'Cancelling',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    showDot: true,
    animated: true
  }
};

export const StateChip: React.FC<StateChipProps> = React.memo(({
  status,
  isRecording: _isRecording = false,
  micAvailable = true,
  className = ''
}) => {
  // Override with mic unavailable state if needed
  let config: ChipConfig;
  if (!micAvailable && status === 'idle') {
    config = {
      label: 'Mic unavailable',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-600',
      showIcon: true
    };
  } else {
    config = STATUS_CHIP_CONFIGS[status] || STATUS_CHIP_CONFIGS.idle;
  }

  return (
    <div
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full
        ${config.bgColor} ${config.textColor}
        ${className}
      `}
      role="status"
      aria-live="polite"
      aria-label={`Status: ${config.label}`}
    >
      {/* Animated dot for active states */}
      {config.showDot && (
        <span
          className={`
            w-1.5 h-1.5 rounded-full bg-current
            ${config.animated ? 'motion-safe:animate-pulse' : ''}
          `}
          aria-hidden="true"
        />
      )}

      {/* Warning icon for error/unavailable states */}
      {config.showIcon && (
        <AlertTriangle
          className="w-3 h-3"
          aria-hidden="true"
        />
      )}

      {/* Status label */}
      <span className="text-xs font-medium leading-none">
        {config.label}
      </span>
    </div>
  );
});

StateChip.displayName = 'StateChip';
