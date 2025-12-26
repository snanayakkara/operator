/**
 * Valve Sizing Bar - Phase 9
 *
 * Visual horizontal bar showing oversizing position with:
 * - Gray background bar
 * - Blue highlighted optimal range zone
 * - Blue vertical marker at current oversizing value
 * - Percentage label tag below marker
 * - Red dot indicator when off-scale (matches TAVItool)
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
        <div className="absolute inset-0 bg-gray-100 rounded" />

        {/* Optimal range highlight */}
        <div
          className="absolute top-0 bottom-0 bg-blue-100 opacity-70"
          style={{
            left: `${optimalStart}%`,
            width: `${optimalWidth}%`
          }}
        />

        {/* Current value marker - blue line for in-range values */}
        {isInRange && (
          <div
            className="absolute top-0 w-0.5 bg-blue-400 transition-all duration-300"
            style={{
              left: `${markerPosition}%`,
              height: height + 4,
              marginTop: -2,
              transform: 'translateX(-50%)'
            }}
          />
        )}
      </div>

      {/* Label below with red dot indicator for off-scale (matches TAVItool) */}
      {showLabel && (
        <div
          className="absolute transition-all duration-300 flex flex-col items-center"
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
                ? 'bg-emerald-50 text-emerald-600'
                : isOffScaleLeft || isOffScaleRight
                ? 'bg-rose-50 text-rose-600'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {oversizing.toFixed(1)}%
          </span>
          {/* Red dot indicator for off-scale values (matches TAVItool) */}
          {(isOffScaleLeft || isOffScaleRight) && (
            <div className="w-2 h-2 rounded-full bg-rose-400 mt-1" />
          )}
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
