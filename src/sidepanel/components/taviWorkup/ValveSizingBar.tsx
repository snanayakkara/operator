/**
 * Valve Sizing Bar - Phase 9
 *
 * Visual horizontal bar showing oversizing position with:
 * - Gray background bar
 * - Blue highlighted optimal range zone
 * - Blue vertical marker at current oversizing value
 * - Percentage label tag below marker
 * - Red arrow indicators when off-scale
 */

import React from 'react';
import { ValveBrand, DISPLAY_RANGES, ValveSizingServiceV2 } from '@/services/ValveSizingServiceV2';

interface ValveSizingBarProps {
  brand: ValveBrand;
  oversizing: number;
  isOptimal: boolean;
  showLabel?: boolean;
  height?: number;
  className?: string;
}

export const ValveSizingBar: React.FC<ValveSizingBarProps> = ({
  brand,
  oversizing,
  isOptimal,
  showLabel = true,
  height = 20,
  className = ''
}) => {
  const service = ValveSizingServiceV2.getInstance();
  const displayRange = DISPLAY_RANGES[brand];
  const optimalRange = service.getOptimalRange(brand);

  // Calculate positions as percentages
  const rangeSpan = displayRange.max - displayRange.min;

  // Optimal zone position and width
  const optimalStart = ((optimalRange.min - displayRange.min) / rangeSpan) * 100;
  const optimalWidth = ((optimalRange.max - optimalRange.min) / rangeSpan) * 100;

  // Current marker position
  const isInRange = oversizing >= displayRange.min && oversizing <= displayRange.max;
  const markerPosition = isInRange
    ? ((oversizing - displayRange.min) / rangeSpan) * 100
    : oversizing < displayRange.min ? 0 : 100;

  // Determine if off-scale
  const isOffScaleLeft = oversizing < displayRange.min;
  const isOffScaleRight = oversizing > displayRange.max;

  return (
    <div className={`relative ${className}`} style={{ height: showLabel ? height + 24 : height }}>
      {/* Main bar container */}
      <div
        className="relative w-full rounded overflow-hidden"
        style={{ height }}
      >
        {/* Background */}
        <div className="absolute inset-0 bg-gray-200 rounded" />

        {/* Optimal range highlight */}
        <div
          className="absolute top-0 bottom-0 bg-blue-200 opacity-60"
          style={{
            left: `${optimalStart}%`,
            width: `${optimalWidth}%`
          }}
        />

        {/* Current value marker or off-scale arrow */}
        {isInRange ? (
          // Normal marker
          <div
            className="absolute top-0 w-0.5 bg-blue-600 transition-all duration-300"
            style={{
              left: `${markerPosition}%`,
              height: height + 4,
              marginTop: -2,
              transform: 'translateX(-50%)'
            }}
          />
        ) : (
          // Off-scale arrow
          <div
            className="absolute top-1/2 -translate-y-1/2"
            style={{
              left: isOffScaleLeft ? 2 : undefined,
              right: isOffScaleRight ? 2 : undefined
            }}
          >
            <svg
              width="10"
              height="14"
              viewBox="0 0 10 14"
              fill="none"
              className="text-rose-500"
            >
              {isOffScaleLeft ? (
                // Left arrow
                <path
                  d="M10 0L0 7L10 14V0Z"
                  fill="currentColor"
                />
              ) : (
                // Right arrow
                <path
                  d="M0 0L10 7L0 14V0Z"
                  fill="currentColor"
                />
              )}
            </svg>
          </div>
        )}
      </div>

      {/* Label below */}
      {showLabel && (
        <div
          className="absolute transition-all duration-300"
          style={{
            top: height + 4,
            left: isOffScaleLeft ? 0 : isOffScaleRight ? undefined : `${markerPosition}%`,
            right: isOffScaleRight ? 0 : undefined,
            transform: isInRange ? 'translateX(-50%)' : undefined
          }}
        >
          <span
            className={`text-xs px-1.5 py-0.5 rounded font-medium ${
              isOptimal
                ? 'bg-emerald-100 text-emerald-700'
                : isOffScaleLeft || isOffScaleRight
                ? 'bg-rose-100 text-rose-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {oversizing.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Compact version without label - just the bar
 */
export const ValveSizingBarCompact: React.FC<Omit<ValveSizingBarProps, 'showLabel'>> = (props) => (
  <ValveSizingBar {...props} showLabel={false} height={12} />
);

export default ValveSizingBar;
