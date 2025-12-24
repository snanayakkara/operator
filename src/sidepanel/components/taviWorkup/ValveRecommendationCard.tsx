/**
 * Valve Recommendation Card - Phase 9
 *
 * Displays automated TAVI valve prosthesis recommendations based on CT measurements.
 * Uses ValveSizingServiceV2 with accurate algorithms ported from tavitool.pages.dev.
 * Shows best valve per manufacturer with oversizing percentages and optimal indicators.
 */

import React, { useMemo } from 'react';
import { Award, ChevronDown, ChevronUp, Info, Check } from 'lucide-react';
import { ValveSizingServiceV2, type ValveBrand, type ValveResult } from '@/services/ValveSizingServiceV2';
import type { TAVIWorkupCTMeasurements } from '@/types/medical.types';

interface ValveRecommendationCardProps {
  measurements?: TAVIWorkupCTMeasurements;
}

export const ValveRecommendationCard: React.FC<ValveRecommendationCardProps> = ({ measurements }) => {
  const [expanded, setExpanded] = React.useState(true);

  const service = ValveSizingServiceV2.getInstance();

  // Get best valve per manufacturer
  const { bestPerBrand, hasData, overallBest } = useMemo(() => {
    const area = measurements?.annulusArea;
    const perimeter = measurements?.annulusPerimeter;

    if (!area || !perimeter) {
      return { bestPerBrand: null, hasData: false, overallBest: null };
    }

    const validation = service.validateMeasurements(area, perimeter);
    if (!validation.valid) {
      return { bestPerBrand: null, hasData: false, overallBest: null };
    }

    const best = service.getBestValvePerBrand(area, perimeter);

    // Find overall best (optimal valve with highest score)
    let overall: ValveResult | null = null;
    for (const brand of service.getBrandOrder()) {
      const result = best[brand];
      if (result?.isOptimal) {
        if (!overall || result.oversizing < overall.oversizing) {
          overall = result;
        }
      }
    }
    // If no optimal found, pick first result
    if (!overall) {
      for (const brand of service.getBrandOrder()) {
        if (best[brand]) {
          overall = best[brand];
          break;
        }
      }
    }

    return { bestPerBrand: best, hasData: true, overallBest: overall };
  }, [measurements, service]);

  // Brand display colors
  const getBrandColor = (brand: ValveBrand) => {
    switch (brand) {
      case 'evolut':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'sapien':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'navitor':
        return 'bg-purple-50 border-purple-200 text-purple-700';
      case 'myval':
        return 'bg-teal-50 border-teal-200 text-teal-700';
    }
  };

  const getOversizingColor = (result: ValveResult) => {
    if (result.isOptimal) return 'text-emerald-600';
    const range = service.getOptimalRange(result.brand);
    if (result.oversizing < range.min) return 'text-amber-600';
    if (result.oversizing > range.max) return 'text-rose-600';
    return 'text-ink-secondary';
  };

  return (
    <div className="bg-white rounded-lg border border-line-primary overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors ${
          overallBest?.isOptimal
            ? 'bg-emerald-50 border-l-4 border-l-emerald-500'
            : hasData
            ? 'bg-blue-50 border-l-4 border-l-blue-500'
            : 'bg-gray-50 border-l-4 border-l-gray-300'
        }`}
      >
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-purple-600" />
          <div className="text-left">
            <h3 className="text-sm font-semibold text-ink-primary">AI Recommendation</h3>
            <p className="text-xs text-ink-tertiary">
              {overallBest
                ? `${service.getManufacturer(overallBest.brand).displayName} ${overallBest.size}mm (${overallBest.oversizing.toFixed(1)}%)`
                : hasData
                ? 'Calculating...'
                : 'Enter annulus area & perimeter'}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-ink-tertiary" />
        ) : (
          <ChevronDown className="w-4 h-4 text-ink-tertiary" />
        )}
      </button>

      {/* Content */}
      {expanded && (
        <div className="p-3 border-t border-line-primary space-y-3">
          {/* No Data State */}
          {!hasData && (
            <div className="flex items-start gap-2 p-3 bg-gray-50 rounded border border-gray-200">
              <Info className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-gray-700">
                <p className="font-medium mb-1">Missing Measurements</p>
                <p>Enter annulus area (mm²) and perimeter (mm) to calculate valve recommendations.</p>
              </div>
            </div>
          )}

          {/* Best per manufacturer */}
          {bestPerBrand && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-ink-primary">Best by Manufacturer</h4>
              <div className="grid grid-cols-2 gap-2">
                {service.getBrandOrder().map((brand) => {
                  const result = bestPerBrand[brand];
                  if (!result) return null;

                  const manufacturer = service.getManufacturer(brand);

                  return (
                    <div
                      key={brand}
                      className={`p-2 rounded border ${getBrandColor(brand)}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold">{manufacturer.displayName}</span>
                        {result.isOptimal && (
                          <span className="flex items-center gap-0.5 text-xs text-emerald-600">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold">{result.sizeName}</p>
                      <p className={`text-xs font-medium ${getOversizingColor(result)}`}>
                        {result.oversizing.toFixed(1)}% oversizing
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reference note */}
          {hasData && measurements && (
            <div className="pt-2 border-t border-line-primary">
              <p className="text-xs text-ink-tertiary">
                Based on annulus area ({measurements.annulusArea!.toFixed(0)}mm²) and perimeter ({measurements.annulusPerimeter!.toFixed(1)}mm).
                Optimal ranges: Evolut/Navitor 15-25%, Sapien 0-10%, MyVal 5-15%.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ValveRecommendationCard;
