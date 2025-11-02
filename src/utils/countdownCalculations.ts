/**
 * Countdown Calculations Utility
 *
 * Shared logic for calculating adaptive ETA with velocity-based blending.
 * Used by both UnifiedPipelineProgress and CircularCountdownTimer to ensure
 * consistent countdown across all UI elements.
 */

import type { ProcessingTimeEstimate } from '@/services/ProcessingTimePredictor';

/**
 * Calculate remaining time with pure time-based countdown
 *
 * Simple linear countdown from initial prediction:
 * - Makes prediction once at start based on audio duration and agent type
 * - Counts down linearly: prediction - elapsed time
 * - Can go negative if prediction was too optimistic (shows "+X.Xs" overtime)
 * - ProcessingTimePredictor learns from actual times to improve future predictions
 *
 * @param prediction - Initial time prediction from ProcessingTimePredictor
 * @param currentProgress - Current progress percentage (0-100)
 * @param _velocity - Unused (marked with underscore)
 * @param elapsedTime - Time elapsed since start in milliseconds
 * @returns Remaining time in milliseconds (can be negative for overtime)
 */
export function calculateAdaptiveRemainingTime(
  prediction: ProcessingTimeEstimate | null,
  currentProgress: number,
  _velocity: number,
  elapsedTime: number
): number | null {
  // Hide countdown when complete
  if (!prediction || currentProgress >= 100) {
    return null;
  }

  // Pure time-based countdown: prediction - elapsed time
  // Can go negative if prediction was too optimistic (learning feedback)
  return prediction.estimatedDurationMs - elapsedTime;
}

/**
 * Format remaining time for display
 *
 * @param ms - Milliseconds remaining
 * @returns Formatted string (e.g., "23.4s left", "2m 34.2s left")
 */
export function formatRemainingTime(ms: number): string {
  const totalSeconds = ms / 1000; // Keep decimal precision

  if (totalSeconds < 60) {
    // Show precise seconds with 1 decimal: "23.4s left"
    return `${totalSeconds.toFixed(1)}s left`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // Show precise countdown: "2m 34.2s left"
  return `${minutes}m ${seconds.toFixed(1)}s left`;
}

/**
 * Format countdown time (without "left" suffix)
 * Used for circular timer display
 *
 * @param ms - Milliseconds remaining
 * @returns Formatted string (e.g., "23.4s", "2m 34s")
 */
export function formatCountdown(ms: number): string {
  const totalSeconds = ms / 1000;

  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return `${minutes}m ${seconds}s`;
}
