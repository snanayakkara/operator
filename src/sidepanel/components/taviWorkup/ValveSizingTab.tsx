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

  const formatRange = (): React.ReactNode => {
    if (!result.range) return null;

    // For Navitor: show on two lines with prefixes (matches TAVItool)
    if (result.brand === 'navitor') {
      return (
        <>
          {result.range.perimeter && (
            <>P {result.range.perimeter.min}–{result.range.perimeter.max} mm</>
          )}
          {result.range.perimeter && result.range.area && <br />}
          {result.range.area && (
            <>A {result.range.area.min}–{result.range.area.max} mm²</>
          )}
        </>
      );
    }

    // For Evolut: perimeter only with P prefix (matches TAVItool)
    if (result.range.perimeter) {
      return `P ${result.range.perimeter.min}-${result.range.perimeter.max} mm`;
    }
    return null;
  };

  return (
    <div
      className={`p-3 rounded-lg border transition-all ${
        isSelected
          ? 'border-purple-500 bg-purple-50'
          : result.isOptimal
          ? 'border-blue-400 bg-blue-50 shadow-sm'  // TAVItool style: blue for optimal
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

        {/* Volume controls for Sapien - shows actual balloon volume (matches TAVItool) */}
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
            <span className="text-sm text-ink-secondary min-w-[32px] text-center font-medium">
              {result.nominalVolume !== null && (
                (result.nominalVolume + (result.volumeAdjustment ?? 0))
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
            {/* Volume adjustment indicator */}
            {result.volumeAdjustment !== null && result.volumeAdjustment !== 0 && (
              <span className="text-xs text-ink-tertiary">
                ({result.volumeAdjustment > 0 ? '+' : ''}{result.volumeAdjustment.toFixed(1)}mL)
              </span>
            )}
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

  const sapienAdjustment =
    selectedValve?.brand === 'sapien' && typeof selectedValve.volumeAdjustment === 'number'
      ? selectedValve.volumeAdjustment
      : null;

  if (sapienAdjustment !== null && selectedValve) {
    grouped.sapien = grouped.sapien.map((result) =>
      result.size === selectedValve.size
        ? service.adjustSapienVolume(result, area, perimeter, sapienAdjustment)
        : result
    );
  }

  const brandAccents: Record<ValveBrand, { color: string; icon: string }> = {
    evolut: { color: '#2563eb', icon: 'ME' },
    sapien: { color: '#dc2626', icon: 'ES' },
    navitor: { color: '#9333ea', icon: 'AN' },
    myval: { color: '#0d9488', icon: 'MM' }
  };

  const formatRange = (result: ValveResult): string => {
    if (!result.range) return '';
    if (result.brand === 'navitor') {
      const perimeter = result.range.perimeter;
      const areaRange = result.range.area;
      return `
        ${perimeter ? `<div>P ${perimeter.min}-${perimeter.max} mm</div>` : ''}
        ${areaRange ? `<div>A ${areaRange.min}-${areaRange.max} mm²</div>` : ''}
      `;
    }
    if (result.range.perimeter) {
      return `P ${result.range.perimeter.min}-${result.range.perimeter.max} mm`;
    }
    return '';
  };

  const renderVolumeControls = (result: ValveResult): string => {
    if (result.brand !== 'sapien' || result.nominalVolume === null) return '';
    const volume = (result.nominalVolume + (result.volumeAdjustment ?? 0)).toFixed(1);
    return `
      <div style="position: absolute; top: 8px; right: 8px; display: flex; align-items: center; gap: 6px; color: #6b7280;">
        <span style="font-size: 12px; font-weight: 600;">-</span>
        <span style="font-size: 11px; font-weight: 600; min-width: 24px; text-align: center;">${volume}</span>
        <span style="font-size: 12px; font-weight: 600;">+</span>
      </div>
    `;
  };

  const renderSizingBar = (result: ValveResult): string => {
    const displayRange = service.getDisplayRange(result.brand);
    const optimalRange = service.getOptimalRange(result.brand);
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
    const isOffScaleLeft = result.oversizing < displayRange.min;
    const isOffScaleRight = result.oversizing > displayRange.max;
    const tagBg = result.isOptimal ? '#d6e7ff' : '#eef2f7';
    const tagColor = result.isOptimal ? '#365b8c' : '#6b7280';

    return `
      <div style="position: relative; height: 8px; background: #f1f5f9; border-radius: 999px; box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.08);">
        <div style="position: absolute; top: 0; bottom: 0; left: ${optimalStart}%; width: ${optimalWidth}%; background: #e2e8f0; border-radius: 999px;"></div>
        ${isInRange ? `<div style="position: absolute; top: -3px; left: ${markerPos}%; width: 4px; height: 28px; background: #7aa5f7; border-radius: 999px; transform: translateX(-50%);"></div>` : ''}
        ${isOffScaleLeft ? '<div style="position: absolute; top: 0; left: 0; width: 8px; height: 8px; background: #fca5a5; border-radius: 999px;"></div>' : ''}
        ${isOffScaleRight ? '<div style="position: absolute; top: 0; left: calc(100% - 4px); width: 8px; height: 8px; background: #fca5a5; border-radius: 999px;"></div>' : ''}
        <div style="position: absolute; top: -24px; left: ${markerPos}%; transform: translateX(-50%);">
          <span style="display: inline-block; padding: 2px 6px; border-radius: 6px; font-size: 11px; font-weight: 600; background: ${tagBg}; color: ${tagColor};">
            ${result.oversizing.toFixed(1)}%
          </span>
        </div>
      </div>
    `;
  };

  let html = `
    <div style="padding: 24px; background: #f3f4f6; min-height: 100%;">
      <div style="width: 95%; max-width: 1400px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 12px; box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="font-size: 22px; font-weight: 300; letter-spacing: 0.08em; text-transform: uppercase; color: #111827; margin-bottom: 8px;">TAVI Valve Sizing</div>
          <div style="font-size: 13px; color: #6b7280;">
            Area: <strong>${area.toFixed(0)}mm²</strong> | Perimeter: <strong>${perimeter.toFixed(1)}mm</strong>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 24px;">
  `;

  for (const brand of brandOrder) {
    const manufacturer = service.getManufacturer(brand);
    const results = grouped[brand];
    const brandAccent = brandAccents[brand];

    html += `
      <div style="display: flex; flex-direction: column;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          <div style="width: 32px; height: 32px; border-radius: 10px; border: 1px solid #e5e7eb; background: #f8fafc; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: ${brandAccent.color};">
            ${brandAccent.icon}
          </div>
          <div style="font-size: 18px; font-weight: 700; color: #111827;">${manufacturer.displayName}</div>
        </div>
    `;

    for (const result of results) {
      const rangeHtml = formatRange(result);
      const volumeIndicator =
        result.brand === 'sapien' && result.volumeAdjustment
          ? `(${result.volumeAdjustment > 0 ? '+' : ''}${result.volumeAdjustment.toFixed(1)}mL)`
          : '';
      const isOptimal = result.isOptimal;
      const cardBorder = isOptimal ? '2px solid #7aa5f7' : '1px solid #e5e7eb';
      const cardBackground = isOptimal ? '#f0f7ff' : '#ffffff';

      html += `
        <div style="background: ${cardBackground}; border: ${cardBorder}; border-radius: 12px; padding: 16px; margin-bottom: 20px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06); position: relative;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-weight: 600; font-size: 16px; color: #111827;">${result.sizeName}</span>
          </div>
          ${rangeHtml ? `<div style="position: absolute; top: 8px; right: 8px; font-size: 11px; color: #6b7280; text-align: right; line-height: 1.2;">${rangeHtml}</div>` : ''}
          ${renderVolumeControls(result)}
          ${volumeIndicator ? `<div style="font-size: 11px; color: #16a34a; margin-bottom: 6px;">${volumeIndicator}</div>` : ''}
          <div style="margin-top: 8px;">
            ${renderSizingBar(result)}
          </div>
        </div>
      `;
    }

    html += `
      </div>
    `;
  }

  html += `
        </div>
      </div>
    </div>
  `;

  return html;
}

export default ValveSizingTab;
