/**
 * Valve Card - Phase 9
 *
 * Reusable card for displaying a single valve option with:
 * - Valve size name
 * - Perimeter/area range (for Evolut/Navitor)
 * - Sizing bar with oversizing visualization
 * - Volume adjustment controls (Sapien only)
 * - Selection state styling (radio button style)
 */

import React from 'react';
import { Minus, Plus, Check } from 'lucide-react';
import { ValveSizingBar, ValveSizingBarCompact } from './ValveSizingBar';
import type { ValveResult, ValveBrand } from '@/services/ValveSizingServiceV2';

interface ValveCardProps {
  result: ValveResult;
  isSelected?: boolean;
  onSelect?: () => void;
  onVolumeChange?: (adjustment: number) => void;
  compact?: boolean;
  showRange?: boolean;
  selectable?: boolean;
}

export const ValveCard: React.FC<ValveCardProps> = ({
  result,
  isSelected = false,
  onSelect,
  onVolumeChange,
  compact = false,
  showRange = true,
  selectable = true
}) => {
  const canAdjustVolume = result.brand === 'sapien' && onVolumeChange;

  const handleVolumeDecrease = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onVolumeChange && result.volumeAdjustment !== null) {
      onVolumeChange(result.volumeAdjustment - 0.5);
    }
  };

  const handleVolumeIncrease = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onVolumeChange && result.volumeAdjustment !== null) {
      onVolumeChange(result.volumeAdjustment + 0.5);
    }
  };

  const formatRange = () => {
    if (!result.range) return null;

    const parts: string[] = [];
    if (result.range.perimeter) {
      parts.push(`${result.range.perimeter.min}-${result.range.perimeter.max}mm`);
    }
    if (result.range.area) {
      parts.push(`${result.range.area.min}-${result.range.area.max}mm²`);
    }
    return parts.join(' | ');
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={selectable ? onSelect : undefined}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded border transition-all ${
          isSelected
            ? 'border-purple-500 bg-purple-50'
            : selectable
            ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            : 'border-gray-200 bg-white'
        } ${selectable ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {/* Selection indicator */}
        {selectable && (
          <div
            className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
              isSelected ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
            }`}
          >
            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
          </div>
        )}

        {/* Size name */}
        <span className="text-xs font-medium text-ink-primary w-12">
          {result.sizeName}
        </span>

        {/* Sizing bar */}
        <div className="flex-1">
          <ValveSizingBarCompact
            brand={result.brand}
            oversizing={result.oversizing}
            isOptimal={result.isOptimal}
          />
        </div>

        {/* Percentage */}
        <span
          className={`text-xs font-medium w-12 text-right ${
            result.isOptimal ? 'text-emerald-600' : 'text-ink-secondary'
          }`}
        >
          {result.oversizing.toFixed(1)}%
        </span>

        {/* Optimal badge */}
        {result.isOptimal && (
          <span className="text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-medium">
            Optimal
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      onClick={selectable ? onSelect : undefined}
      className={`p-3 rounded-lg border transition-all ${
        isSelected
          ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-200'
          : selectable
          ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer'
          : 'border-gray-200 bg-white'
      }`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Selection indicator */}
          {selectable && (
            <div
              className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                isSelected ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
              }`}
            >
              {isSelected && <Check className="w-3 h-3 text-white" />}
            </div>
          )}

          {/* Size name */}
          <span className="text-sm font-semibold text-ink-primary">
            {result.sizeName}
          </span>

          {/* Optimal badge */}
          {result.isOptimal && (
            <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
              Optimal
            </span>
          )}
        </div>

        {/* Volume controls for Sapien */}
        {canAdjustVolume && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleVolumeDecrease}
              className="p-1 rounded hover:bg-gray-200 transition-colors"
              title="Decrease balloon volume"
            >
              <Minus className="w-3.5 h-3.5 text-ink-secondary" />
            </button>
            <span className="text-xs text-ink-secondary min-w-[40px] text-center">
              {result.volumeAdjustment !== null && result.volumeAdjustment !== 0 && (
                <>
                  {result.volumeAdjustment > 0 ? '+' : ''}
                  {result.volumeAdjustment.toFixed(1)}mL
                </>
              )}
            </span>
            <button
              type="button"
              onClick={handleVolumeIncrease}
              className="p-1 rounded hover:bg-gray-200 transition-colors"
              title="Increase balloon volume"
            >
              <Plus className="w-3.5 h-3.5 text-ink-secondary" />
            </button>
          </div>
        )}
      </div>

      {/* Range info */}
      {showRange && result.range && (
        <div className="text-xs text-ink-tertiary mb-2">
          {formatRange()}
        </div>
      )}

      {/* Sizing bar */}
      <ValveSizingBar
        brand={result.brand}
        oversizing={result.oversizing}
        isOptimal={result.isOptimal}
        height={16}
      />
    </div>
  );
};

/**
 * Mini valve card for compact layouts
 */
export const ValveCardMini: React.FC<Omit<ValveCardProps, 'compact'>> = (props) => (
  <ValveCard {...props} compact showRange={false} />
);

export default ValveCard;
