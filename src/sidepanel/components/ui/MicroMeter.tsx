/**
 * MicroMeter Component
 *
 * Tiny bar meter for showing levels (mic input, confidence, etc.)
 * Inspired by TE hardware indicators.
 */

import React, { memo } from 'react';

interface MicroMeterProps {
  /** Value between 0 and 1 */
  value: number;
  /** Orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Size variant */
  size?: 'xs' | 'sm';
  /** Color when filled */
  color?: 'gray' | 'emerald' | 'amber' | 'rose' | 'blue';
  /** Show value as percentage */
  showValue?: boolean;
  /** Label text */
  label?: string;
  className?: string;
}

const colorClasses: Record<string, string> = {
  gray: 'bg-gray-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  blue: 'bg-blue-500'
};

export const MicroMeter: React.FC<MicroMeterProps> = memo(({
  value,
  orientation = 'horizontal',
  size = 'xs',
  color = 'gray',
  showValue = false,
  label,
  className = ''
}) => {
  const clampedValue = Math.max(0, Math.min(1, value));
  const percentage = Math.round(clampedValue * 100);

  const sizeStyles = {
    xs: orientation === 'horizontal' ? 'h-1 w-12' : 'w-1 h-8',
    sm: orientation === 'horizontal' ? 'h-1.5 w-16' : 'w-1.5 h-12'
  };

  const fillStyle = orientation === 'horizontal'
    ? { width: `${percentage}%` }
    : { height: `${percentage}%` };

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {label && (
        <span className="text-[10px] text-gray-500 font-medium">{label}</span>
      )}
      <div
        className={`
          relative rounded-sm overflow-hidden bg-gray-200
          ${sizeStyles[size]}
        `}
        role="meter"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Level meter'}
      >
        <div
          className={`
            absolute rounded-sm transition-all duration-150
            ${orientation === 'horizontal' ? 'left-0 top-0 h-full' : 'bottom-0 left-0 w-full'}
            ${colorClasses[color]}
          `}
          style={fillStyle}
        />
      </div>
      {showValue && (
        <span className="text-[10px] text-gray-500 tabular-nums">{percentage}%</span>
      )}
    </div>
  );
});

MicroMeter.displayName = 'MicroMeter';

/**
 * ConfidenceMeter - Pre-configured for confidence display
 */
interface ConfidenceMeterProps {
  confidence: number;
  className?: string;
}

export const ConfidenceMeter: React.FC<ConfidenceMeterProps> = memo(({
  confidence,
  className = ''
}) => {
  const color = confidence >= 0.8 ? 'emerald' : confidence >= 0.5 ? 'amber' : 'rose';

  return (
    <MicroMeter
      value={confidence}
      color={color}
      label="Conf"
      showValue
      size="xs"
      className={className}
    />
  );
});

ConfidenceMeter.displayName = 'ConfidenceMeter';

export default MicroMeter;
