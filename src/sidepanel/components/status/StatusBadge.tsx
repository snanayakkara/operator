/**
 * StatusBadge Component
 *
 * Unified status badge component using stateColors.ts definitions
 * Displays consistent state visualization across the application
 */

import React from 'react';
import {
  Mic,
  FileText,
  Brain,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
} from 'lucide-react';
import { ProcessingState, getStateColors } from '@/utils/stateColors';

export type BadgeSize = 'sm' | 'md' | 'lg';
export type BadgeVariant = 'default' | 'dot' | 'outline';

interface StatusBadgeProps {
  /**
   * Processing state
   */
  state: ProcessingState;

  /**
   * Badge size
   */
  size?: BadgeSize;

  /**
   * Badge variant
   */
  variant?: BadgeVariant;

  /**
   * Custom label (overrides default state label)
   */
  label?: string;

  /**
   * Show icon
   */
  showIcon?: boolean;

  /**
   * Action button (e.g., "Stop", "Retry")
   */
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };

  /**
   * Additional classes
   */
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  state,
  size = 'md',
  variant = 'default',
  label,
  showIcon = true,
  action,
  className = '',
}) => {
  const colors = getStateColors(state);

  // Default labels for states
  const defaultLabels: Record<ProcessingState, string> = {
    recording: 'Recording',
    transcribing: 'Transcribing',
    'ai-analysis': 'AI Analysis',
    generation: 'Generating',
    completed: 'Completed',
    error: 'Error',
    needs_review: 'Needs Review',
    processing: 'Processing',
  };

  // Icons for states
  const stateIcons: Record<ProcessingState, React.ReactNode> = {
    recording: <Mic className="w-full h-full" />,
    transcribing: <FileText className="w-full h-full" />,
    'ai-analysis': <Brain className="w-full h-full" />,
    generation: <Sparkles className="w-full h-full" />,
    completed: <CheckCircle2 className="w-full h-full" />,
    error: <AlertCircle className="w-full h-full" />,
    needs_review: <AlertTriangle className="w-full h-full" />,
    processing: <Brain className="w-full h-full" />,
  };

  // Size classes
  const sizeClasses = {
    sm: {
      container: 'h-6 px-2 text-xs gap-1',
      icon: 'w-3 h-3',
      dot: 'w-1.5 h-1.5',
      action: 'ml-1 -mr-1 p-0.5',
      actionIcon: 'w-3 h-3',
    },
    md: {
      container: 'h-7 px-2.5 text-sm gap-1.5',
      icon: 'w-3.5 h-3.5',
      dot: 'w-2 h-2',
      action: 'ml-1.5 -mr-1 p-0.5',
      actionIcon: 'w-3.5 h-3.5',
    },
    lg: {
      container: 'h-8 px-3 text-base gap-2',
      icon: 'w-4 h-4',
      dot: 'w-2.5 h-2.5',
      action: 'ml-2 -mr-1 p-1',
      actionIcon: 'w-4 h-4',
    },
  };

  const sizeConfig = sizeClasses[size];
  const displayLabel = label || defaultLabels[state];

  // Variant styles
  const variantStyles = {
    default: `
      ${colors.bgGradient}
      border border-${colors.border}/70
      text-${colors.text}
    `,
    dot: `
      bg-gray-50
      border border-gray-200
      text-gray-700
    `,
    outline: `
      bg-transparent
      border-2 border-${colors.border}
      text-${colors.text}
    `,
  };

  return (
    <div
      className={`
        inline-flex items-center
        ${sizeConfig.container}
        ${variantStyles[variant]}
        rounded-full
        font-medium
        transition-all duration-200
        ${className}
      `}
      role="status"
      aria-label={`Status: ${displayLabel}`}
    >
      {/* Icon or Dot */}
      {showIcon && (
        <>
          {variant === 'dot' ? (
            <span
              className={`
                ${sizeConfig.dot}
                bg-${colors.indicator}
                rounded-full
                animate-pulse
              `}
            />
          ) : (
            <span className={`${sizeConfig.icon} text-${colors.indicator} flex-shrink-0`}>
              {stateIcons[state]}
            </span>
          )}
        </>
      )}

      {/* Label */}
      <span className="whitespace-nowrap">{displayLabel}</span>

      {/* Action Button */}
      {action && (
        <button
          onClick={action.onClick}
          className={`
            ${sizeConfig.action}
            rounded-full
            hover:bg-black/10
            transition-colors
            focus:outline-none focus:ring-2 focus:ring-${colors.indicator}
          `}
          aria-label={action.label}
        >
          {action.icon ? (
            <span className={sizeConfig.actionIcon}>{action.icon}</span>
          ) : (
            <X className={sizeConfig.actionIcon} />
          )}
        </button>
      )}
    </div>
  );
};

/**
 * StatusChip Component
 * Minimal status indicator (just dot + text, no background)
 */
interface StatusChipProps {
  state: ProcessingState;
  label?: string;
  size?: BadgeSize;
  className?: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({
  state,
  label,
  size = 'md',
  className = '',
}) => {
  const colors = getStateColors(state);

  const defaultLabels: Record<ProcessingState, string> = {
    recording: 'Recording',
    transcribing: 'Transcribing',
    'ai-analysis': 'AI Analysis',
    generation: 'Generating',
    completed: 'Completed',
    error: 'Error',
    needs_review: 'Needs Review',
    processing: 'Processing',
  };

  const sizeClasses = {
    sm: { container: 'text-xs gap-1.5', dot: 'w-1.5 h-1.5' },
    md: { container: 'text-sm gap-2', dot: 'w-2 h-2' },
    lg: { container: 'text-base gap-2.5', dot: 'w-2.5 h-2.5' },
  };

  const sizeConfig = sizeClasses[size];
  const displayLabel = label || defaultLabels[state];

  return (
    <div
      className={`inline-flex items-center ${sizeConfig.container} ${className}`}
      role="status"
      aria-label={`Status: ${displayLabel}`}
    >
      <span
        className={`
          ${sizeConfig.dot}
          bg-${colors.indicator}
          rounded-full
          animate-pulse
        `}
      />
      <span className={`text-${colors.text} font-medium`}>{displayLabel}</span>
    </div>
  );
};

/**
 * StateIndicator Component
 * Just a pulsing dot (for minimal space usage)
 */
interface StateIndicatorProps {
  state: ProcessingState;
  size?: BadgeSize;
  withTooltip?: boolean;
  className?: string;
}

export const StateIndicator: React.FC<StateIndicatorProps> = ({
  state,
  size = 'md',
  withTooltip = true,
  className = '',
}) => {
  const colors = getStateColors(state);

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  const defaultLabels: Record<ProcessingState, string> = {
    recording: 'Recording',
    transcribing: 'Transcribing',
    'ai-analysis': 'AI Analysis',
    generation: 'Generating',
    completed: 'Completed',
    error: 'Error',
    needs_review: 'Needs Review',
    processing: 'Processing',
  };

  return (
    <span
      className={`
        ${sizeClasses[size]}
        bg-${colors.indicator}
        border border-${colors.border}
        rounded-full
        animate-pulse
        ${className}
      `}
      role="status"
      aria-label={withTooltip ? defaultLabels[state] : undefined}
      title={withTooltip ? defaultLabels[state] : undefined}
    />
  );
};

/**
 * ProgressBadge Component
 * Badge with progress percentage
 */
interface ProgressBadgeProps {
  state: ProcessingState;
  progress: number; // 0-100
  showPercentage?: boolean;
  size?: BadgeSize;
  className?: string;
}

export const ProgressBadge: React.FC<ProgressBadgeProps> = ({
  state,
  progress,
  showPercentage = true,
  size = 'md',
  className = '',
}) => {
  const colors = getStateColors(state);

  const sizeClasses = {
    sm: 'h-6 px-2 text-xs',
    md: 'h-7 px-2.5 text-sm',
    lg: 'h-8 px-3 text-base',
  };

  const defaultLabels: Record<ProcessingState, string> = {
    recording: 'Recording',
    transcribing: 'Transcribing',
    'ai-analysis': 'AI Analysis',
    generation: 'Generating',
    completed: 'Completed',
    error: 'Error',
    needs_review: 'Needs Review',
    processing: 'Processing',
  };

  return (
    <div
      className={`
        relative inline-flex items-center justify-center
        ${sizeClasses[size]}
        ${colors.bgGradient}
        border border-${colors.border}/70
        text-${colors.text}
        rounded-full
        font-medium
        overflow-hidden
        ${className}
      `}
      role="status"
      aria-label={`${defaultLabels[state]}: ${progress}%`}
    >
      {/* Progress bar background */}
      <div
        className={`absolute inset-0 ${colors.progressGradient.active} opacity-20`}
        style={{ width: `${progress}%` }}
      />

      {/* Content */}
      <span className="relative z-10">
        {showPercentage ? `${Math.round(progress)}%` : defaultLabels[state]}
      </span>
    </div>
  );
};

export default StatusBadge;
