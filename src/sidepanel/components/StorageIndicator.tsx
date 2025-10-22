/**
 * StorageIndicator Component
 *
 * Compact storage usage indicator showing current usage with color-coded visual feedback.
 * Click to open storage management modal.
 */

import React, { memo } from 'react';
import { HardDrive, AlertTriangle } from 'lucide-react';
import type { StorageStats } from '@/types/persistence.types';

interface StorageIndicatorProps {
  stats: StorageStats | null;
  onClick?: () => void;
  className?: string;
}

export const StorageIndicator: React.FC<StorageIndicatorProps> = memo(({ stats, onClick, className = '' }) => {
  if (!stats) {
    return null;
  }

  const { usedBytes, totalBytes, usedPercentage, sessionCount } = stats;

  // Determine color based on usage percentage
  const getColorClasses = () => {
    if (usedPercentage >= 90) {
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        bar: 'bg-red-500',
        icon: 'text-red-600'
      };
    } else if (usedPercentage >= 80) {
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
        bar: 'bg-amber-500',
        icon: 'text-amber-600'
      };
    } else if (usedPercentage >= 50) {
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        bar: 'bg-blue-500',
        icon: 'text-blue-600'
      };
    } else {
      return {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-700',
        bar: 'bg-emerald-500',
        icon: 'text-emerald-600'
      };
    }
  };

  const colors = getColorClasses();

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const isClickable = !!onClick;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colors.bg} ${colors.border} ${
        isClickable ? 'cursor-pointer hover:shadow-md transition-all' : ''
      } ${className}`}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      title={isClickable ? 'Click to manage storage' : undefined}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        {usedPercentage >= 90 ? (
          <AlertTriangle className={`w-4 h-4 ${colors.icon}`} />
        ) : (
          <HardDrive className={`w-4 h-4 ${colors.icon}`} />
        )}
      </div>

      {/* Storage info */}
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <span className={`text-[10px] font-semibold ${colors.text}`}>
            {formatBytes(usedBytes)} / {formatBytes(totalBytes)}
          </span>
          <span className="text-[9px] text-slate-500">
            {sessionCount} session{sessionCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${colors.bar} transition-all duration-300`}
            style={{ width: `${Math.min(100, usedPercentage)}%` }}
          />
        </div>

        {/* Percentage */}
        <span className={`text-[10px] font-bold ${colors.text} min-w-[2.5rem] text-right`}>
          {usedPercentage.toFixed(0)}%
        </span>
      </div>
    </div>
  );
});

StorageIndicator.displayName = 'StorageIndicator';
