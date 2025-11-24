/**
 * Circular Countdown Timer Component
 *
 * Lightweight custom SVG-based circular timer that shows real-time countdown
 * with pipeline stage colors and current stage name.
 *
 * Features:
 * - Pure SVG implementation (~2 kB vs 15-20 kB for external library)
 * - Matches pipeline stage colors from design system
 * - Smooth CSS-based animations
 * - Responsive sizing
 * - Accessible with ARIA labels
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { PipelineStage } from '@/types/medical.types';
import { getStateColors, pipelineStageToState } from '@/utils/stateColors';

interface CircularCountdownTimerProps {
  /** Countdown time remaining in milliseconds */
  remainingMs: number;
  /** Current progress percentage (0-100) */
  progress: number;
  /** Current pipeline stage for color matching */
  stage: PipelineStage;
  /** Size in pixels (diameter) */
  size?: number;
  /** Optional className for container */
  className?: string;
}

// Stage display names
const STAGE_LABELS: Record<PipelineStage, string> = {
  'audio-processing': 'Processing',
  'transcribing': 'Transcribing',
  'ai-analysis': 'AI Analysis',
  'generation': 'Generating'
};

/**
 * Format milliseconds to countdown string
 * Examples: "23s", "2m 34s", "+5s" (overtime)
 */
function formatCountdown(ms: number): string {
  const isNegative = ms < 0;
  const absMs = Math.abs(ms);
  const totalSeconds = Math.floor(absMs / 1000);

  if (totalSeconds < 60) {
    // Show whole seconds only (no decimals)
    const formatted = `${totalSeconds}s`;
    return isNegative ? `+${formatted}` : formatted;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formatted = `${minutes}m ${seconds}s`;

  // Show "+" prefix for overtime
  return isNegative ? `+${formatted}` : formatted;
}

/**
 * Extract primary color from gradient definition
 * Gradients are in format: "from-red-500 to-red-600" -> extract red-500
 */
function extractPrimaryColorFromGradient(gradient: string): string {
  // Map Tailwind gradient classes to more muted hex colors for clinical clarity
  const colorMap: Record<string, string> = {
    'from-red-500': '#64748b',     // slate-500 for recording
    'from-blue-500': '#64748b',    // slate-500 for transcribing
    'from-purple-500': '#64748b',  // slate-500 for AI analysis
    'from-emerald-500': '#059669', // emerald-600 for generation
    'from-indigo-500': '#64748b',  // slate-500 default
    'from-rose-500': '#64748b',    // slate-500
    'from-teal-500': '#0d9488'     // teal-600 for completed
  };

  // Extract the "from-*" class
  const fromClass = gradient.split(' ').find(c => c.startsWith('from-'));
  return fromClass && colorMap[fromClass] ? colorMap[fromClass] : '#64748b'; // Default slate
}

export const CircularCountdownTimer: React.FC<CircularCountdownTimerProps> = ({
  remainingMs,
  progress,
  stage,
  size = 200,
  className = ''
}) => {
  // Get stage colors from design system
  const stageColors = useMemo(() => {
    const state = pipelineStageToState(stage);
    return getStateColors(state);
  }, [stage]);

  // Extract primary color from gradient
  const primaryColor = useMemo(() => {
    return extractPrimaryColorFromGradient(stageColors.progressGradient.active);
  }, [stageColors]);

  // Calculate SVG circle properties
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate stroke-dashoffset for progress (inverted - counts down)
  const progressOffset = circumference - (progress / 100) * circumference;

  // Format countdown text
  const countdownText = useMemo(() => formatCountdown(remainingMs), [remainingMs]);
  const stageLabel = STAGE_LABELS[stage];

  // Calculate center point
  const center = size / 2;

  return (
    <motion.div
      className={`flex items-center justify-center ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      role="timer"
      aria-live="polite"
      aria-label={`${countdownText} remaining, ${stageLabel}`}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))' }}
      >
        {/* Background circle (trail) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
          className="opacity-30"
        />

        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={primaryColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={progressOffset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease',
          }}
        />

        {/* Center content - rotated back to normal */}
        <g transform={`rotate(90 ${center} ${center})`}>
          {/* Countdown time */}
          <text
            x={center}
            y={center - 5}
            textAnchor="middle"
            dominantBaseline="middle"
            className="font-bold"
            style={{
              fontSize: size * 0.18, // Responsive font size
              fill: primaryColor,
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            {countdownText}
          </text>

          {/* Stage label */}
          <text
            x={center}
            y={center + (size * 0.12)}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-gray-600"
            style={{
              fontSize: size * 0.07, // Smaller font for label
              fill: '#4b5563',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            {stageLabel}
          </text>
        </g>
      </svg>
    </motion.div>
  );
};
