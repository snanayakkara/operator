/**
 * Valve Recommendation Card - Phase 8.3
 *
 * Displays automated TAVI valve prosthesis recommendations based on CT measurements.
 * Shows primary recommendation + alternatives with suitability scores and warnings.
 */

import React, { useMemo } from 'react';
import { Award, AlertTriangle, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { ValveSizingService, type ValveRecommendation } from '@/services/ValveSizingService';
import type { TAVIWorkupCTMeasurements } from '@/types/medical.types';

interface ValveRecommendationCardProps {
  measurements?: TAVIWorkupCTMeasurements;
}

export const ValveRecommendationCard: React.FC<ValveRecommendationCardProps> = ({ measurements }) => {
  const [expanded, setExpanded] = React.useState(true);
  const [showAllAlternatives, setShowAllAlternatives] = React.useState(false);

  const recommendations = useMemo(() => {
    if (!measurements) return [];
    const service = ValveSizingService.getInstance();
    return service.calculateRecommendations(measurements);
  }, [measurements]);

  const primary = recommendations.length > 0 ? recommendations[0] : null;
  const alternatives = recommendations.slice(1, showAllAlternatives ? undefined : 3);
  const hasMoreAlternatives = recommendations.length > 4;

  // Check if we have required measurements
  const hasRequiredData = measurements?.annulusAreaMm2 && measurements?.annulusPerimeterMm;

  // Get suitability color
  const getSuitabilityColor = (category: ValveRecommendation['sizeCategory']) => {
    switch (category) {
      case 'optimal':
        return 'text-emerald-700 bg-emerald-100 border-emerald-300';
      case 'within_range':
        return 'text-blue-700 bg-blue-100 border-blue-300';
      case 'borderline':
        return 'text-amber-700 bg-amber-100 border-amber-300';
      case 'outside_range':
        return 'text-rose-700 bg-rose-100 border-rose-300';
    }
  };

  const getCategoryLabel = (category: ValveRecommendation['sizeCategory']) => {
    switch (category) {
      case 'optimal':
        return 'Optimal';
      case 'within_range':
        return 'Within Range';
      case 'borderline':
        return 'Borderline';
      case 'outside_range':
        return 'Outside Range';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-line-primary overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors ${
          primary && primary.sizeCategory === 'optimal'
            ? 'bg-emerald-50 border-l-4 border-l-emerald-500'
            : hasRequiredData
            ? 'bg-blue-50 border-l-4 border-l-blue-500'
            : 'bg-gray-50 border-l-4 border-l-gray-300'
        }`}
      >
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-purple-600" />
          <div className="text-left">
            <h3 className="text-sm font-semibold text-ink-primary">Valve Recommendation</h3>
            <p className="text-xs text-ink-tertiary">
              {primary
                ? `${primary.valve.model} ${primary.size.size}mm`
                : hasRequiredData
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
          {!hasRequiredData && (
            <div className="flex items-start gap-2 p-3 bg-gray-50 rounded border border-gray-200">
              <Info className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-gray-700">
                <p className="font-medium mb-1">Missing Measurements</p>
                <p>Enter annulus area (mm²) and perimeter (mm) to calculate valve recommendations.</p>
              </div>
            </div>
          )}

          {/* Primary Recommendation */}
          {primary && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-ink-primary">Primary Recommendation</h4>
              <div className={`p-3 rounded border ${getSuitabilityColor(primary.sizeCategory)}`}>
                {/* Valve Info */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold">{primary.valve.model} {primary.size.size}mm</p>
                    <p className="text-xs text-ink-secondary mt-0.5">
                      {primary.valve.manufacturer} · {primary.valve.deploymentMethod}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium">{primary.suitabilityScore}%</span>
                    <p className="text-xs text-ink-tertiary">{getCategoryLabel(primary.sizeCategory)}</p>
                  </div>
                </div>

                {/* Oversizing */}
                <div className="mb-2">
                  <p className="text-xs">
                    <span className="font-medium">Oversizing:</span> {primary.oversizing.toFixed(1)}%
                    <span className="text-ink-tertiary ml-1">
                      (target {primary.size.oversizingMin}-{primary.size.oversizingMax}%)
                    </span>
                  </p>
                  <p className="text-xs">
                    <span className="font-medium">Catheter:</span> {primary.size.catheterSize}F
                  </p>
                </div>

                {/* Reasoning */}
                {primary.reasoning.length > 0 && (
                  <div className="mb-2">
                    <ul className="text-xs space-y-0.5">
                      {primary.reasoning.map((reason, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="text-emerald-600 mt-0.5">✓</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Warnings */}
                {primary.warnings.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-current opacity-60">
                    <div className="flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <div className="text-xs space-y-0.5">
                        {primary.warnings.map((warning, idx) => (
                          <p key={idx}>{warning}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Alternatives */}
          {alternatives.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-ink-primary">Alternatives</h4>
              <div className="space-y-2">
                {alternatives.map((rec, idx) => (
                  <div
                    key={`${rec.valve.id}-${rec.size.size}`}
                    className="p-2 rounded border border-gray-200 bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-ink-primary">
                          {rec.valve.model} {rec.size.size}mm
                        </p>
                        <p className="text-xs text-ink-tertiary">
                          {rec.oversizing.toFixed(1)}% oversizing · {rec.size.catheterSize}F catheter
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${getSuitabilityColor(rec.sizeCategory)}`}>
                          {rec.suitabilityScore}%
                        </span>
                      </div>
                    </div>

                    {/* Warnings for alternatives */}
                    {rec.warnings.length > 0 && (
                      <div className="mt-1.5 flex items-start gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-ink-secondary">{rec.warnings[0]}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Show More/Less */}
              {hasMoreAlternatives && (
                <button
                  type="button"
                  onClick={() => setShowAllAlternatives(!showAllAlternatives)}
                  className="w-full text-xs text-purple-600 hover:text-purple-700 py-1 transition-colors"
                >
                  {showAllAlternatives
                    ? 'Show fewer alternatives'
                    : `Show ${recommendations.length - 4} more alternatives`}
                </button>
              )}
            </div>
          )}

          {/* Sizing Chart Reference */}
          {primary && (
            <div className="pt-2 border-t border-line-primary">
              <p className="text-xs text-ink-tertiary">
                Based on annulus area ({measurements!.annulusAreaMm2!.toFixed(0)}mm²) and perimeter ({measurements!.annulusPerimeterMm!.toFixed(1)}mm).
                Recommendations follow manufacturer IFU guidelines.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ValveRecommendationCard;
