import React from 'react';

interface SessionProgressIndicatorProps {
  phase: string;
  progress: number;
  compact?: boolean;
}

/**
 * SessionProgressIndicator - Live progress bar for processing sessions
 *
 * Visual Form: Slim horizontal progress bar with monochrome + shimmer treatment
 * Placement: Colocated with status pill in timeline card header
 * Motion: 60fps CSS animation with prefers-reduced-motion support
 * Accessibility: WCAG AA contrast + aria-live announcements
 */
export const SessionProgressIndicator: React.FC<SessionProgressIndicatorProps> = ({
  phase,
  progress,
  compact = false
}) => {
  // Defensive: clamp progress to 0-100 range
  const safeProgress = Math.max(0, Math.min(100, progress));

  // Format progress label
  const progressLabel = compact
    ? `${safeProgress}%`
    : `${phase} · ${safeProgress}%`;

  return (
    <div className="flex items-center gap-1.5">
      {/* Progress Bar */}
      <div
        className="session-progress-bar"
        role="progressbar"
        aria-valuenow={safeProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Processing progress: ${safeProgress}%`}
      >
        <div
          className="session-progress-fill"
          style={{ width: `${safeProgress}%` }}
        />
      </div>

      {/* Progress Label */}
      <span
        className="text-[10px] font-medium text-slate-600 tabular-nums"
        aria-live="polite"
        aria-atomic="true"
      >
        {progressLabel}
      </span>
    </div>
  );
};