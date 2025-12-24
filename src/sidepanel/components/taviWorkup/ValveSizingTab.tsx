/**
 * Valve Sizing Tab - Phase 9
 *
 * Full 4-column grid layout for presentation mode matching tavitool.pages.dev:
 * - Manufacturer headers with logos
 * - All valve sizes with sizing bars
 * - Interactive volume adjustment for Sapien
 * - Print-friendly styling
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Minus, Plus, Check } from 'lucide-react';
import { ValveSizingBar } from './ValveSizingBar';
import {
  ValveSizingServiceV2,
  type ValveBrand,
  type ValveResult,
  type ValveSelection
} from '@/services/ValveSizingServiceV2';

interface ValveSizingTabProps {
  area: number;
  perimeter: number;
  selectedValve?: ValveSelection;
  onSelectValve?: (selection: ValveSelection) => void;
  interactive?: boolean; // Allow selection and volume adjustment
}

interface ValveSizeRowProps {
  result: ValveResult;
  isSelected: boolean;
  onSelect?: () => void;
  onVolumeChange?: (adjustment: number) => void;
  interactive: boolean;
}

const ValveSizeRow: React.FC<ValveSizeRowProps> = ({
  result,
  isSelected,
  onSelect,
  onVolumeChange,
  interactive
}) => {
  const canAdjustVolume = result.brand === 'sapien' && onVolumeChange && interactive;

  const formatRange = () => {
    if (!result.range) return null;

    const parts: string[] = [];
    if (result.range.perimeter) {
      parts.push(`${result.range.perimeter.min}-${result.range.perimeter.max}mm`);
    }
    if (result.range.area) {
      parts.push(`${result.range.area.min}-${result.range.area.max}mm²`);
    }
    return parts.join(' / ');
  };

  return (
    <div
      className={`p-3 rounded-lg border transition-all ${
        isSelected
          ? 'border-purple-500 bg-purple-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      } ${interactive ? 'cursor-pointer' : ''}`}
      onClick={interactive ? onSelect : undefined}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-ink-primary">
            {result.sizeName}
          </span>
          {isSelected && (
            <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* Volume controls for Sapien */}
        {canAdjustVolume && (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() =>
                onVolumeChange!((result.volumeAdjustment ?? 0) - 0.5)
              }
              className="p-1.5 rounded-full hover:bg-gray-200 transition-colors"
              title="Decrease balloon volume"
            >
              <Minus className="w-4 h-4 text-ink-secondary" />
            </button>
            <span className="text-sm text-ink-secondary min-w-[50px] text-center font-mono">
              {result.volumeAdjustment !== null && result.volumeAdjustment !== 0 ? (
                <>
                  {result.volumeAdjustment > 0 ? '+' : ''}
                  {result.volumeAdjustment.toFixed(1)}mL
                </>
              ) : (
                '0mL'
              )}
            </span>
            <button
              type="button"
              onClick={() =>
                onVolumeChange!((result.volumeAdjustment ?? 0) + 0.5)
              }
              className="p-1.5 rounded-full hover:bg-gray-200 transition-colors"
              title="Increase balloon volume"
            >
              <Plus className="w-4 h-4 text-ink-secondary" />
            </button>
          </div>
        )}
      </div>

      {/* Sizing bar */}
      <ValveSizingBar
        brand={result.brand}
        oversizing={result.oversizing}
        isOptimal={result.isOptimal}
        height={20}
      />

      {/* Range info */}
      {result.range && (
        <div className="mt-2 text-xs text-ink-tertiary">{formatRange()}</div>
      )}

      {/* Optimal indicator */}
      {result.isOptimal && (
        <div className="mt-2">
          <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-medium">
            OPTIMAL
          </span>
        </div>
      )}
    </div>
  );
};

interface ManufacturerColumnProps {
  brand: ValveBrand;
  displayName: string;
  manufacturer: string;
  results: ValveResult[];
  selectedValve?: ValveSelection;
  onSelectValve?: (result: ValveResult) => void;
  onVolumeChange?: (size: number, adjustment: number) => void;
  interactive: boolean;
}

const ManufacturerColumn: React.FC<ManufacturerColumnProps> = ({
  brand,
  displayName,
  manufacturer,
  results,
  selectedValve,
  onSelectValve,
  onVolumeChange,
  interactive
}) => {
  // Brand-specific header colors
  const headerColors: Record<ValveBrand, string> = {
    evolut: 'bg-blue-600',
    sapien: 'bg-red-600',
    navitor: 'bg-purple-600',
    myval: 'bg-teal-600'
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className={`${headerColors[brand]} text-white p-4 rounded-t-lg`}>
        <h3 className="text-lg font-bold">{displayName}</h3>
        <p className="text-sm opacity-90">{manufacturer}</p>
      </div>

      {/* Valve sizes */}
      <div className="bg-gray-50 p-3 rounded-b-lg flex-1 space-y-3">
        {results.map((result) => (
          <ValveSizeRow
            key={`${result.brand}-${result.size}`}
            result={result}
            isSelected={
              selectedValve?.brand === result.brand &&
              selectedValve?.size === result.size
            }
            onSelect={onSelectValve ? () => onSelectValve(result) : undefined}
            onVolumeChange={
              onVolumeChange
                ? (adj) => onVolumeChange(result.size, adj)
                : undefined
            }
            interactive={interactive}
          />
        ))}
      </div>
    </div>
  );
};

export const ValveSizingTab: React.FC<ValveSizingTabProps> = ({
  area,
  perimeter,
  selectedValve,
  onSelectValve,
  interactive = true
}) => {
  const service = ValveSizingServiceV2.getInstance();
  const [sapienAdjustments, setSapienAdjustments] = useState<Record<number, number>>({});

  // Calculate all results
  const grouped = useMemo(() => {
    const results = service.getResultsByBrand(area, perimeter);

    // Apply Sapien volume adjustments
    if (results.sapien) {
      results.sapien = results.sapien.map((r) => {
        const adj = sapienAdjustments[r.size] ?? 0;
        if (adj !== 0) {
          return service.adjustSapienVolume(r, area, perimeter, adj);
        }
        return r;
      });
    }

    return results;
  }, [area, perimeter, sapienAdjustments, service]);

  const handleSelectValve = useCallback(
    (result: ValveResult) => {
      if (!onSelectValve) return;

      const selection: ValveSelection = {
        brand: result.brand,
        size: result.size,
        volumeAdjustment: result.volumeAdjustment ?? undefined,
        selectedAt: Date.now(),
        selectedBy: 'user'
      };
      onSelectValve(selection);
    },
    [onSelectValve]
  );

  const handleSapienVolumeChange = useCallback(
    (size: number, adjustment: number) => {
      setSapienAdjustments((prev) => ({
        ...prev,
        [size]: adjustment
      }));

      // If this valve is selected, update the selection
      if (selectedValve?.brand === 'sapien' && selectedValve?.size === size) {
        onSelectValve?.({
          ...selectedValve,
          volumeAdjustment: adjustment,
          selectedAt: Date.now()
        });
      }
    },
    [selectedValve, onSelectValve]
  );

  const brandOrder = service.getBrandOrder();

  return (
    <div className="p-6 bg-gray-100 min-h-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-ink-primary mb-2">
          TAVI Valve Sizing
        </h2>
        <p className="text-ink-secondary">
          Area: <span className="font-semibold">{area.toFixed(0)}mm²</span>
          {' | '}
          Perimeter: <span className="font-semibold">{perimeter.toFixed(1)}mm</span>
        </p>
      </div>

      {/* 4-column grid */}
      <div className="grid grid-cols-4 gap-4">
        {brandOrder.map((brand) => {
          const manufacturer = service.getManufacturer(brand);
          return (
            <ManufacturerColumn
              key={brand}
              brand={brand}
              displayName={manufacturer.displayName}
              manufacturer={manufacturer.manufacturer}
              results={grouped[brand]}
              selectedValve={selectedValve}
              onSelectValve={interactive ? handleSelectValve : undefined}
              onVolumeChange={
                brand === 'sapien' && interactive
                  ? handleSapienVolumeChange
                  : undefined
              }
              interactive={interactive}
            />
          );
        })}
      </div>

      {/* Selected valve summary */}
      {selectedValve && (
        <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h3 className="text-sm font-semibold text-purple-700 mb-1">
            Selected Valve
          </h3>
          <p className="text-lg font-bold text-purple-900">
            {service.getManufacturer(selectedValve.brand).displayName}{' '}
            {selectedValve.size}mm
            {selectedValve.volumeAdjustment !== undefined &&
              selectedValve.volumeAdjustment !== 0 && (
                <span className="text-sm font-normal ml-2">
                  ({selectedValve.volumeAdjustment > 0 ? '+' : ''}
                  {selectedValve.volumeAdjustment.toFixed(1)}mL balloon adjustment)
                </span>
              )}
          </p>
        </div>
      )}

      {/* Print-friendly footer */}
      <div className="mt-6 pt-4 border-t border-gray-300 text-xs text-ink-tertiary print:block hidden">
        <p>
          Generated by Operator TAVI Workup | Valve sizing based on IFU guidelines
        </p>
      </div>
    </div>
  );
};

/**
 * Generate static HTML for the valve sizing tab (for presentation export)
 */
export function generateValveSizingHTML(
  area: number,
  perimeter: number,
  selectedValve?: ValveSelection
): string {
  const service = ValveSizingServiceV2.getInstance();
  const grouped = service.getResultsByBrand(area, perimeter);
  const brandOrder = service.getBrandOrder();

  const brandColors: Record<ValveBrand, string> = {
    evolut: '#2563eb',
    sapien: '#dc2626',
    navitor: '#9333ea',
    myval: '#0d9488'
  };

  let html = `
    <div style="padding: 24px; background: #f3f4f6; min-height: 100%;">
      <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">TAVI Valve Sizing</h2>
      <p style="color: #6b7280; margin-bottom: 24px;">
        Area: <strong>${area.toFixed(0)}mm²</strong> | Perimeter: <strong>${perimeter.toFixed(1)}mm</strong>
      </p>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
  `;

  for (const brand of brandOrder) {
    const manufacturer = service.getManufacturer(brand);
    const results = grouped[brand];

    html += `
      <div style="display: flex; flex-direction: column;">
        <div style="background: ${brandColors[brand]}; color: white; padding: 16px; border-radius: 8px 8px 0 0;">
          <h3 style="font-size: 18px; font-weight: bold; margin: 0;">${manufacturer.displayName}</h3>
          <p style="font-size: 14px; opacity: 0.9; margin: 4px 0 0 0;">${manufacturer.manufacturer}</p>
        </div>
        <div style="background: #f9fafb; padding: 12px; border-radius: 0 0 8px 8px; flex: 1;">
    `;

    for (const result of results) {
      const isSelected =
        selectedValve?.brand === result.brand && selectedValve?.size === result.size;
      const optimalRange = service.getOptimalRange(brand);
      const displayRange = service.getDisplayRange(brand);

      // Calculate bar positions
      const rangeSpan = displayRange.max - displayRange.min;
      const optimalStart = ((optimalRange.min - displayRange.min) / rangeSpan) * 100;
      const optimalWidth = ((optimalRange.max - optimalRange.min) / rangeSpan) * 100;
      const isInRange =
        result.oversizing >= displayRange.min && result.oversizing <= displayRange.max;
      const markerPos = isInRange
        ? ((result.oversizing - displayRange.min) / rangeSpan) * 100
        : result.oversizing < displayRange.min
        ? 0
        : 100;

      html += `
        <div style="padding: 12px; background: ${isSelected ? '#f3e8ff' : 'white'}; border: 1px solid ${isSelected ? '#a855f7' : '#e5e7eb'}; border-radius: 8px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-weight: 600;">${result.sizeName}</span>
            ${result.isOptimal ? '<span style="font-size: 12px; background: #d1fae5; color: #059669; padding: 2px 8px; border-radius: 12px;">OPTIMAL</span>' : ''}
          </div>
          <div style="position: relative; height: 16px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">
            <div style="position: absolute; top: 0; bottom: 0; left: ${optimalStart}%; width: ${optimalWidth}%; background: rgba(59, 130, 246, 0.3);"></div>
            ${isInRange ? `<div style="position: absolute; top: -2px; left: ${markerPos}%; width: 2px; height: 20px; background: #2563eb; transform: translateX(-50%);"></div>` : ''}
          </div>
          <div style="text-align: center; margin-top: 4px;">
            <span style="font-size: 12px; font-weight: 500; color: ${result.isOptimal ? '#059669' : '#6b7280'};">
              ${result.oversizing.toFixed(1)}%
            </span>
          </div>
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;
  }

  html += `
      </div>
    </div>
  `;

  return html;
}

export default ValveSizingTab;
