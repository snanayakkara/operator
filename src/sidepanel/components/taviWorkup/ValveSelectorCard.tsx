/**
 * Valve Selector Card - Phase 9
 *
 * Compact card for sidebar workup editor with:
 * - Shows all 4 manufacturers in vertical accordion
 * - Click to select a valve -> stores in workup
 * - Volume adjustment buttons for Sapien
 * - Shows "Selected" badge on chosen valve
 * - Selected valve summary at bottom
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronUp, Target, X } from 'lucide-react';
import { ValveCard, ValveCardMini } from './ValveCard';
import {
  ValveSizingServiceV2,
  type ValveBrand,
  type ValveResult,
  type ValveSelection
} from '@/services/ValveSizingServiceV2';

interface ValveSelectorCardProps {
  area?: number;
  perimeter?: number;
  selectedValve?: ValveSelection;
  onSelectValve: (selection: ValveSelection | undefined) => void;
  expanded?: boolean;
}

interface BrandAccordionProps {
  brand: ValveBrand;
  displayName: string;
  results: ValveResult[];
  isExpanded: boolean;
  onToggle: () => void;
  selectedValve?: ValveSelection;
  onSelectValve: (result: ValveResult) => void;
  onVolumeChange: (result: ValveResult, adjustment: number) => void;
  hasOptimal: boolean;
  area: number;
  perimeter: number;
}

const BrandAccordion: React.FC<BrandAccordionProps> = ({
  brand,
  displayName,
  results,
  isExpanded,
  onToggle,
  selectedValve,
  onSelectValve,
  onVolumeChange,
  hasOptimal,
  area,
  perimeter
}) => {
  const isThisBrandSelected = selectedValve?.brand === brand;
  const selectedSize = isThisBrandSelected ? selectedValve.size : undefined;

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors ${
          isThisBrandSelected ? 'bg-purple-50' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-ink-tertiary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-ink-tertiary" />
          )}
          <span className="text-sm font-medium text-ink-primary">{displayName}</span>
          {hasOptimal && !isThisBrandSelected && (
            <span className="text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-medium">
              Optimal available
            </span>
          )}
          {isThisBrandSelected && (
            <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">
              Selected
            </span>
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-2 pb-2 space-y-1">
          {results.map((result) => (
            <ValveCardMini
              key={`${result.brand}-${result.size}`}
              result={result}
              isSelected={selectedValve?.brand === result.brand && selectedValve?.size === result.size}
              onSelect={() => onSelectValve(result)}
              onVolumeChange={
                result.brand === 'sapien'
                  ? (adj) => onVolumeChange(result, adj)
                  : undefined
              }
              selectable
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const ValveSelectorCard: React.FC<ValveSelectorCardProps> = ({
  area,
  perimeter,
  selectedValve,
  onSelectValve,
  expanded: initialExpanded = true
}) => {
  const [cardExpanded, setCardExpanded] = useState(initialExpanded);
  const [expandedBrands, setExpandedBrands] = useState<Set<ValveBrand>>(new Set(['evolut']));
  const [sapienAdjustments, setSapienAdjustments] = useState<Record<number, number>>({});

  const service = ValveSizingServiceV2.getInstance();

  // Calculate results
  const { grouped, hasMeasurements, bestPerBrand } = useMemo(() => {
    if (!area || !perimeter) {
      return { grouped: null, hasMeasurements: false, bestPerBrand: null };
    }

    const validation = service.validateMeasurements(area, perimeter);
    if (!validation.valid) {
      return { grouped: null, hasMeasurements: false, bestPerBrand: null };
    }

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

    return {
      grouped: results,
      hasMeasurements: true,
      bestPerBrand: service.getBestValvePerBrand(area, perimeter)
    };
  }, [area, perimeter, sapienAdjustments, service]);

  // Auto-expand brand with optimal valve on first render
  useEffect(() => {
    if (bestPerBrand) {
      const brandsWithOptimal: ValveBrand[] = [];
      for (const [brand, result] of Object.entries(bestPerBrand)) {
        if (result?.isOptimal) {
          brandsWithOptimal.push(brand as ValveBrand);
        }
      }
      if (brandsWithOptimal.length > 0) {
        setExpandedBrands(new Set([brandsWithOptimal[0]]));
      }
    }
  }, [bestPerBrand]);

  const toggleBrand = useCallback((brand: ValveBrand) => {
    setExpandedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(brand)) {
        next.delete(brand);
      } else {
        next.add(brand);
      }
      return next;
    });
  }, []);

  const handleSelectValve = useCallback(
    (result: ValveResult) => {
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

  const handleVolumeChange = useCallback(
    (result: ValveResult, adjustment: number) => {
      if (result.brand !== 'sapien') return;

      setSapienAdjustments((prev) => ({
        ...prev,
        [result.size]: adjustment
      }));

      // If this valve is selected, update the selection with new adjustment
      if (
        selectedValve?.brand === 'sapien' &&
        selectedValve?.size === result.size
      ) {
        onSelectValve({
          ...selectedValve,
          volumeAdjustment: adjustment,
          selectedAt: Date.now()
        });
      }
    },
    [selectedValve, onSelectValve]
  );

  const handleClearSelection = useCallback(() => {
    onSelectValve(undefined);
  }, [onSelectValve]);

  const brandOrder = service.getBrandOrder();

  return (
    <div className="bg-white rounded-lg border border-line-primary overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setCardExpanded(!cardExpanded)}
        className={`w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors ${
          selectedValve
            ? 'bg-purple-50 border-l-4 border-l-purple-500'
            : hasMeasurements
            ? 'bg-blue-50 border-l-4 border-l-blue-500'
            : 'bg-gray-50 border-l-4 border-l-gray-300'
        }`}
      >
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-purple-600" />
          <div className="text-left">
            <h3 className="text-sm font-semibold text-ink-primary">Valve Selection</h3>
            <p className="text-xs text-ink-tertiary">
              {selectedValve
                ? `${service.getManufacturer(selectedValve.brand).displayName} ${selectedValve.size}mm`
                : hasMeasurements
                ? 'Select a valve based on CT measurements'
                : 'Enter annulus area & perimeter'}
            </p>
          </div>
        </div>
        {cardExpanded ? (
          <ChevronUp className="w-4 h-4 text-ink-tertiary" />
        ) : (
          <ChevronDown className="w-4 h-4 text-ink-tertiary" />
        )}
      </button>

      {/* Content */}
      {cardExpanded && (
        <div className="border-t border-line-primary">
          {/* Measurements display */}
          {hasMeasurements && (
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
              <p className="text-xs text-ink-secondary">
                Area: <span className="font-medium">{area?.toFixed(0)}mm²</span>
                {' | '}
                Perimeter: <span className="font-medium">{perimeter?.toFixed(1)}mm</span>
              </p>
            </div>
          )}

          {/* No measurements state */}
          {!hasMeasurements && (
            <div className="p-4 text-center">
              <p className="text-sm text-ink-secondary">
                Enter annulus area and perimeter in CT Measurements to see valve sizing options.
              </p>
            </div>
          )}

          {/* Brand accordions */}
          {grouped && (
            <div>
              {brandOrder.map((brand) => {
                const results = grouped[brand];
                const hasOptimal = results.some((r) => r.isOptimal);

                return (
                  <BrandAccordion
                    key={brand}
                    brand={brand}
                    displayName={service.getManufacturer(brand).displayName}
                    results={results}
                    isExpanded={expandedBrands.has(brand)}
                    onToggle={() => toggleBrand(brand)}
                    selectedValve={selectedValve}
                    onSelectValve={handleSelectValve}
                    onVolumeChange={handleVolumeChange}
                    hasOptimal={hasOptimal}
                    area={area!}
                    perimeter={perimeter!}
                  />
                );
              })}
            </div>
          )}

          {/* Selected valve summary */}
          {selectedValve && (
            <div className="px-3 py-2 bg-purple-50 border-t border-purple-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-purple-700">
                  Selected: {service.getManufacturer(selectedValve.brand).displayName}{' '}
                  {selectedValve.size}mm
                  {selectedValve.volumeAdjustment !== undefined &&
                    selectedValve.volumeAdjustment !== 0 && (
                      <span className="ml-1">
                        ({selectedValve.volumeAdjustment > 0 ? '+' : ''}
                        {selectedValve.volumeAdjustment.toFixed(1)}mL)
                      </span>
                    )}
                </p>
                <p className="text-xs text-purple-600">
                  User selected
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearSelection}
                className="p-1 hover:bg-purple-100 rounded transition-colors"
                title="Clear selection"
              >
                <X className="w-4 h-4 text-purple-600" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ValveSelectorCard;
