/**
 * CT Measurements Card - Phase 7/8
 *
 * Displays and allows editing of structured CT measurement fields.
 * Shows annulus sizing, coronary heights, access vessels, LVOT, and calcium scores.
 *
 * Phase 8.5: Added "Dictate CT" button with audio parsing integration.
 */

import React, { useState, useCallback } from 'react';
import { Activity, ChevronDown, ChevronUp, Edit2, Check, X, Mic, Loader2 } from 'lucide-react';
import Button from '../buttons/Button';
import { DictateCTModal } from './DictateCTModal';
import type { TAVIWorkupCTMeasurements } from '@/types/medical.types';

interface CTMeasurementsCardProps {
  measurements?: TAVIWorkupCTMeasurements;
  onUpdate: (measurements: TAVIWorkupCTMeasurements) => void;
}

interface MeasurementFieldProps {
  label: string;
  value?: number;
  unit: string;
  onChange: (value: number | undefined) => void;
  isEditing: boolean;
}

const MeasurementField: React.FC<MeasurementFieldProps> = ({
  label,
  value,
  unit,
  onChange,
  isEditing
}) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-xs text-ink-secondary">{label}</span>
    {isEditing ? (
      <div className="flex items-center gap-1">
        <input
          type="number"
          step="0.1"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
          className="w-16 px-2 py-0.5 text-xs text-right border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 focus:border-transparent"
          placeholder="-"
        />
        <span className="text-xs text-ink-tertiary w-8">{unit}</span>
      </div>
    ) : (
      <span className={`text-xs font-medium ${value !== undefined ? 'text-ink-primary' : 'text-ink-tertiary'}`}>
        {value !== undefined ? `${value} ${unit}` : '-'}
      </span>
    )}
  </div>
);

export const CTMeasurementsCard: React.FC<CTMeasurementsCardProps> = ({
  measurements,
  onUpdate
}) => {
  const [expanded, setExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [editValues, setEditValues] = useState<TAVIWorkupCTMeasurements>(
    measurements || createEmptyMeasurements()
  );

  const handleStartEdit = useCallback(() => {
    setEditValues(measurements || createEmptyMeasurements());
    setIsEditing(true);
  }, [measurements]);

  // Handle dictated CT measurements merge
  const handleDictatedMeasurements = useCallback((newMeasurements: Partial<TAVIWorkupCTMeasurements>, narrative?: string) => {
    // Merge new measurements into existing, keeping existing values where new is undefined
    const merged: TAVIWorkupCTMeasurements = {
      ...measurements,
      ...newMeasurements,
      // Deep merge nested objects
      coronaryHeights: {
        ...measurements?.coronaryHeights,
        ...newMeasurements.coronaryHeights
      },
      accessVessels: {
        ...measurements?.accessVessels,
        ...newMeasurements.accessVessels
      },
      sinusOfValsalva: {
        ...measurements?.sinusOfValsalva,
        ...newMeasurements.sinusOfValsalva
      },
      coplanarAngles: newMeasurements.coplanarAngles || measurements?.coplanarAngles || [],
      // Append narrative if provided
      narrative: narrative
        ? (measurements?.narrative ? `${measurements.narrative}\n\n${narrative}` : narrative)
        : measurements?.narrative
    };

    onUpdate(merged);
    setIsDictating(false);
  }, [measurements, onUpdate]);

  const handleSave = useCallback(() => {
    onUpdate(editValues);
    setIsEditing(false);
  }, [editValues, onUpdate]);

  const handleCancel = useCallback(() => {
    setEditValues(measurements || createEmptyMeasurements());
    setIsEditing(false);
  }, [measurements]);

  const updateField = useCallback((path: string, value: number | string | undefined) => {
    setEditValues(prev => {
      const newValues = { ...prev };
      const parts = path.split('.');

      if (parts.length === 1) {
        (newValues as any)[parts[0]] = value;
      } else if (parts.length === 2) {
        (newValues as any)[parts[0]] = {
          ...(newValues as any)[parts[0]],
          [parts[1]]: value
        };
      }

      return newValues;
    });
  }, []);

  const data = isEditing ? editValues : (measurements || createEmptyMeasurements());
  const hasAnyData = measurements && (
    measurements.annulusAreaMm2 !== undefined ||
    measurements.annulusPerimeterMm !== undefined ||
    measurements.coronaryHeights?.leftMainMm !== undefined ||
    measurements.coronaryHeights?.rightCoronaryMm !== undefined
  );

  return (
    <div className="bg-white rounded-lg border border-line-primary overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors ${
          hasAnyData ? 'bg-purple-50 border-l-4 border-l-purple-500' : 'bg-gray-50 border-l-4 border-l-gray-300'
        }`}
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-600" />
          <div className="text-left">
            <h3 className="text-sm font-semibold text-ink-primary">CT Measurements</h3>
            <p className="text-xs text-ink-tertiary">
              {hasAnyData ? 'Valve sizing data available' : 'No measurements entered'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDictating(true);
                }}
                icon={<Mic className="w-3 h-3" />}
              >
                Dictate
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartEdit();
                }}
                icon={<Edit2 className="w-3 h-3" />}
              >
                Edit
              </Button>
            </>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-ink-tertiary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-ink-tertiary" />
          )}
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="p-3 border-t border-line-primary space-y-4">
          {/* Narrative Summary */}
          {(data.narrative || isEditing) && (
            <div>
              <h4 className="text-xs font-semibold text-ink-primary mb-2">Summary</h4>
              {isEditing ? (
                <textarea
                  value={data.narrative || ''}
                  onChange={(e) => updateField('narrative', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 focus:border-transparent min-h-[60px]"
                  placeholder="Descriptive summary of CT findings..."
                />
              ) : (
                <p className="text-xs text-ink-primary whitespace-pre-wrap">{data.narrative}</p>
              )}
            </div>
          )}

          {/* Annulus Measurements */}
          <div>
            <h4 className="text-xs font-semibold text-ink-primary mb-2">Annulus</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <MeasurementField
                label="Area"
                value={data.annulusAreaMm2}
                unit="mm²"
                onChange={(v) => updateField('annulusAreaMm2', v)}
                isEditing={isEditing}
              />
              <MeasurementField
                label="Perimeter"
                value={data.annulusPerimeterMm}
                unit="mm"
                onChange={(v) => updateField('annulusPerimeterMm', v)}
                isEditing={isEditing}
              />
              <MeasurementField
                label="Min Diameter"
                value={data.annulusMinDiameterMm}
                unit="mm"
                onChange={(v) => updateField('annulusMinDiameterMm', v)}
                isEditing={isEditing}
              />
              <MeasurementField
                label="Max Diameter"
                value={data.annulusMaxDiameterMm}
                unit="mm"
                onChange={(v) => updateField('annulusMaxDiameterMm', v)}
                isEditing={isEditing}
              />
            </div>
          </div>

          {/* Coronary Heights */}
          <div>
            <h4 className="text-xs font-semibold text-ink-primary mb-2">Coronary Heights</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <MeasurementField
                label="Left Main"
                value={data.coronaryHeights?.leftMainMm}
                unit="mm"
                onChange={(v) => updateField('coronaryHeights.leftMainMm', v)}
                isEditing={isEditing}
              />
              <MeasurementField
                label="Right Coronary"
                value={data.coronaryHeights?.rightCoronaryMm}
                unit="mm"
                onChange={(v) => updateField('coronaryHeights.rightCoronaryMm', v)}
                isEditing={isEditing}
              />
            </div>
          </div>

          {/* LVOT & STJ */}
          <div>
            <h4 className="text-xs font-semibold text-ink-primary mb-2">LVOT & STJ</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <MeasurementField
                label="LVOT Area"
                value={data.lvotAreaMm2}
                unit="mm²"
                onChange={(v) => updateField('lvotAreaMm2', v)}
                isEditing={isEditing}
              />
              <MeasurementField
                label="LVOT Perimeter"
                value={data.lvotPerimeterMm}
                unit="mm"
                onChange={(v) => updateField('lvotPerimeterMm', v)}
                isEditing={isEditing}
              />
              <MeasurementField
                label="STJ Diameter"
                value={data.stjDiameterMm}
                unit="mm"
                onChange={(v) => updateField('stjDiameterMm', v)}
                isEditing={isEditing}
              />
              <MeasurementField
                label="STJ Height"
                value={data.stjHeightMm}
                unit="mm"
                onChange={(v) => updateField('stjHeightMm', v)}
                isEditing={isEditing}
              />
            </div>
          </div>

          {/* Access Vessels */}
          <div>
            <h4 className="text-xs font-semibold text-ink-primary mb-2">Access Vessels</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <MeasurementField
                label="R. Common Iliac"
                value={data.accessVessels?.rightCIAmm}
                unit="mm"
                onChange={(v) => updateField('accessVessels.rightCIAmm', v)}
                isEditing={isEditing}
              />
              <MeasurementField
                label="L. Common Iliac"
                value={data.accessVessels?.leftCIAmm}
                unit="mm"
                onChange={(v) => updateField('accessVessels.leftCIAmm', v)}
                isEditing={isEditing}
              />
              <MeasurementField
                label="R. External Iliac"
                value={data.accessVessels?.rightEIAmm}
                unit="mm"
                onChange={(v) => updateField('accessVessels.rightEIAmm', v)}
                isEditing={isEditing}
              />
              <MeasurementField
                label="L. External Iliac"
                value={data.accessVessels?.leftEIAmm}
                unit="mm"
                onChange={(v) => updateField('accessVessels.leftEIAmm', v)}
                isEditing={isEditing}
              />
              <MeasurementField
                label="R. Common Femoral"
                value={data.accessVessels?.rightCFAmm}
                unit="mm"
                onChange={(v) => updateField('accessVessels.rightCFAmm', v)}
                isEditing={isEditing}
              />
              <MeasurementField
                label="L. Common Femoral"
                value={data.accessVessels?.leftCFAmm}
                unit="mm"
                onChange={(v) => updateField('accessVessels.leftCFAmm', v)}
                isEditing={isEditing}
              />
            </div>
          </div>

          {/* Calcium Scores */}
          <div>
            <h4 className="text-xs font-semibold text-ink-primary mb-2">Calcium Scores</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <MeasurementField
                label="AV Calcium"
                value={data.calciumScore}
                unit="AU"
                onChange={(v) => updateField('calciumScore', v)}
                isEditing={isEditing}
              />
              <MeasurementField
                label="LVOT Calcium"
                value={data.lvotCalciumScore}
                unit="AU"
                onChange={(v) => updateField('lvotCalciumScore', v)}
                isEditing={isEditing}
              />
            </div>
          </div>

          {/* Edit Actions */}
          {isEditing && (
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line-primary">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                icon={<X className="w-3 h-3" />}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                icon={<Check className="w-3 h-3" />}
              >
                Save
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Dictate CT Modal */}
      {isDictating && (
        <DictateCTModal
          onClose={() => setIsDictating(false)}
          onMerge={handleDictatedMeasurements}
        />
      )}
    </div>
  );
};

function createEmptyMeasurements(): TAVIWorkupCTMeasurements {
  return {
    coronaryHeights: {},
    sinusOfValsalva: {},
    coplanarAngles: [],
    accessVessels: {}
  };
}
