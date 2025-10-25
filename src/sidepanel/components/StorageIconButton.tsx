/**
 * StorageIconButton Component
 *
 * Compact header icon showing storage status with conditional percentage badge.
 * Badge appears only when storage usage is ≥80%.
 * Click to open full storage management modal.
 */

import React, { memo } from 'react';
import { HardDrive, AlertTriangle } from 'lucide-react';
import type { StorageStats } from '@/types/persistence.types';

interface StorageIconButtonProps {
  stats: StorageStats | null;
  onClick?: () => void;
}

export const StorageIconButton: React.FC<StorageIconButtonProps> = memo(({ stats, onClick }) => {
  if (!stats) {
    return null;
  }

  const { usedPercentage } = stats;

  // Determine if badge should be shown (≥80%)
  const showBadge = usedPercentage >= 80;

  // Determine color based on usage percentage
  const getColorClasses = () => {
    if (usedPercentage >= 90) {
      return {
        icon: 'text-red-600',
        badge: 'bg-red-600'
      };
    } else if (usedPercentage >= 80) {
      return {
        icon: 'text-amber-600',
        badge: 'bg-amber-600'
      };
    } else {
      return {
        icon: 'text-gray-600',
        badge: 'bg-gray-600'
      };
    }
  };

  const colors = getColorClasses();

  return (
    <button
      onClick={onClick}
      className="
        relative p-1.5 rounded hover:bg-gray-100 transition-colors
        focus:outline-none focus:ring-2 focus:ring-blue-500
      "
      aria-label={`Storage ${usedPercentage.toFixed(0)}% used. Click to manage storage.`}
      title={`Storage: ${usedPercentage.toFixed(0)}% used`}
    >
      {/* Icon */}
      {usedPercentage >= 90 ? (
        <AlertTriangle className={`w-4 h-4 ${colors.icon}`} />
      ) : (
        <HardDrive className={`w-4 h-4 ${colors.icon}`} />
      )}

      {/* Badge (conditional - only shown when ≥80%) */}
      {showBadge && (
        <span
          className={`
            absolute -top-1 -right-1
            min-w-[18px] h-[18px] px-1
            ${colors.badge} text-white
            text-[9px] font-bold
            rounded-full
            flex items-center justify-center
          `}
        >
          {usedPercentage.toFixed(0)}
        </span>
      )}
    </button>
  );
});

StorageIconButton.displayName = 'StorageIconButton';
