/**
 * Countdown Calculations Utility
 *
 * Shared logic for calculating adaptive ETA with velocity-based blending.
 * Used by both UnifiedPipelineProgress and CircularCountdownTimer to ensure
 * consistent countdown across all UI elements.
 */

import type { ProcessingTimeEstimate } from '@/services/ProcessingTimePredictor';

/**
 * Calculate adaptive remaining time with velocity-based ETA
 *
 * Blends initial prediction with actual velocity as processing progresses:
 * - 0-5% progress: 100% prediction-based
 * - 5-70% progress: Gradual blend from prediction to velocity
 * - 70%+ progress: 70% velocity-based, 30% prediction
 *
 * @param prediction - Initial time prediction from ProcessingTimePredictor
 * @param currentProgress - Current progress percentage (0-100)
 * @param velocity - Progress per millisecond (progress / elapsedTime)
 * @param elapsedTime - Time elapsed since start in milliseconds
 * @returns Remaining time in milliseconds
 */
export function calculateAdaptiveRemainingTime(
  prediction: ProcessingTimeEstimate | null,
  currentProgress: number,
  velocity: number,
  _elapsedTime: number
): number | null {
  if (!prediction || currentProgress >= 100) {
    return null;
  }

  const remainingProgress = 100 - currentProgress;

  // If we haven't made much progress yet, trust the prediction
  if (currentProgress < 5 || velocity === 0) {
    const remainingProgressRatio = remainingProgress / 100;
    return prediction.estimatedDurationMs * remainingProgressRatio;
  }

  // Calculate velocity-based projection
  const projectedTimeRemaining = remainingProgress / velocity;

  // Calculate prediction-based estimate
  const remainingProgressRatio = remainingProgress / 100;
  const predictionBasedRemaining = prediction.estimatedDurationMs * remainingProgressRatio;

  // Blend prediction with velocity (trust velocity more as we progress)
  // At 0% progress: 100% prediction, 0% velocity
  // At 70%+ progress: 30% prediction, 70% velocity
  const progressWeight = Math.min(currentProgress / 100, 0.7);
  const adaptiveETA = predictionBasedRemaining * (1 - progressWeight) + projectedTimeRemaining * progressWeight;

  return Math.max(0, adaptiveETA);
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
