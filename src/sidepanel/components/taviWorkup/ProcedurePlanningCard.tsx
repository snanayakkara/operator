/**
 * Procedure Planning Card
 *
 * Enhanced procedure planning form with intelligent dropdowns and conditional fields.
 * Features:
 * - Device (read-only, auto-populated from valve selection)
 * - Access, Wire, Pacing, Closure (comboboxes with predefined options)
 * - Conditional pacing manufacturer (when "Existing Device" selected)
 * - Pre-dilation with brand and brand-specific balloon sizes
 * - Protamine suitability with conditional reason field
 * - Free text notes
 */

import React, { useState, useCallback } from 'react';
import { ClipboardList, ChevronDown, ChevronUp, Edit2, Check, X } from 'lucide-react';
import Button from '../buttons/Button';
import Combobox from '../forms/Combobox';
import type { ProcedurePlanning } from '@/types/taviWorkup.types';
import { PROCEDURE_PLANNING_OPTIONS, DEFAULT_ACCESS } from '@/utils/taviProcedurePlan';

interface ProcedurePlanningCardProps {
  planning?: ProcedurePlanning;
  onUpdate: (planning: ProcedurePlanning) => void;
  selectedValveName?: string; // Auto-populated device field
}

export const ProcedurePlanningCard: React.FC<ProcedurePlanningCardProps> = ({
  planning,
  onUpdate,
  selectedValveName
}) => {
  const [expanded, setExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<ProcedurePlanning>(
    planning || createEmptyPlanning()
  );

  const handleStartEdit = useCallback(() => {
    setEditValues(planning || createEmptyPlanning());
    setIsEditing(true);
  }, [planning]);

  const handleSave = useCallback(() => {
    onUpdate(editValues);
    setIsEditing(false);
  }, [editValues, onUpdate]);

  const handleCancel = useCallback(() => {
    setEditValues(planning || createEmptyPlanning());
    setIsEditing(false);
  }, [planning]);

  const updateField = useCallback(<K extends keyof ProcedurePlanning>(
    field: K,
    value: ProcedurePlanning[K]
  ) => {
    setEditValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const data = isEditing ? editValues : (planning || createEmptyPlanning());
  const hasAnyData = planning && (
    planning.access ||
    planning.wire ||
    planning.pacing ||
    planning.closure ||
    planning.predilation?.planned ||
    planning.protamine ||
    planning.notes
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
          <ClipboardList className="w-4 h-4 text-purple-600" />
          <div className="text-left">
            <h3 className="text-sm font-semibold text-ink-primary">Procedure Planning</h3>
            <p className="text-xs text-ink-tertiary">
              {hasAnyData ? 'Planning details entered' : 'No planning details'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
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
        <div className="p-4 border-t border-line-primary space-y-4">
          {/* Device (read-only, from valve selection) */}
          <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
            <label className="text-sm font-medium text-gray-700">Device:</label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
              {selectedValveName || data.device || 'Not selected'}
            </div>
          </div>

          {/* Access */}
          <div className="grid grid-cols-[140px_1fr] gap-2 items-start">
            <label className="text-sm font-medium text-gray-700 pt-2">Access:</label>
            {isEditing ? (
              <Combobox
                options={[...PROCEDURE_PLANNING_OPTIONS.access]}
                value={data.access || ''}
                onChange={(value) => updateField('access', value || undefined)}
                placeholder={DEFAULT_ACCESS}
                size="sm"
              />
            ) : (
              <div className="px-3 py-2 text-sm text-gray-900">
                {data.access || '-'}
              </div>
            )}
          </div>

          {/* Wire */}
          <div className="grid grid-cols-[140px_1fr] gap-2 items-start">
            <label className="text-sm font-medium text-gray-700 pt-2">Wire:</label>
            {isEditing ? (
              <Combobox
                options={[...PROCEDURE_PLANNING_OPTIONS.wire]}
                value={data.wire || ''}
                onChange={(value) => updateField('wire', value || undefined)}
                placeholder="Select wire"
                size="sm"
              />
            ) : (
              <div className="px-3 py-2 text-sm text-gray-900">
                {data.wire || '-'}
              </div>
            )}
          </div>

          {/* Pacing */}
          <div className="grid grid-cols-[140px_1fr] gap-2 items-start">
            <label className="text-sm font-medium text-gray-700 pt-2">Pacing:</label>
            <div className="space-y-2">
              {isEditing ? (
                <>
                  <Combobox
                    options={[...PROCEDURE_PLANNING_OPTIONS.pacing]}
                    value={data.pacing || ''}
                    onChange={(value) => updateField('pacing', value || undefined)}
                    placeholder="Select pacing method"
                    size="sm"
                  />
                  {/* Conditional manufacturer dropdown */}
                  {data.pacing === 'Existing Device' && (
                    <div className="pl-4 border-l-2 border-purple-200">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Manufacturer:
                      </label>
                      <Combobox
                        options={[...PROCEDURE_PLANNING_OPTIONS.pacingManufacturers]}
                        value={data.pacingManufacturer || ''}
                        onChange={(value) => updateField('pacingManufacturer', value || undefined)}
                        placeholder="Select manufacturer"
                        size="sm"
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-1">
                  <div className="px-3 py-2 text-sm text-gray-900">
                    {data.pacing || '-'}
                  </div>
                  {data.pacing === 'Existing Device' && data.pacingManufacturer && (
                    <div className="px-3 py-1 text-xs text-gray-600 bg-gray-50 rounded">
                      Manufacturer: {data.pacingManufacturer}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Closure */}
          <div className="grid grid-cols-[140px_1fr] gap-2 items-start">
            <label className="text-sm font-medium text-gray-700 pt-2">Closure:</label>
            {isEditing ? (
              <Combobox
                options={[...PROCEDURE_PLANNING_OPTIONS.closure]}
                value={data.closure || ''}
                onChange={(value) => updateField('closure', value || undefined)}
                placeholder="Select closure device"
                size="sm"
              />
            ) : (
              <div className="px-3 py-2 text-sm text-gray-900">
                {data.closure || '-'}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-4" />

          {/* Pre-dilation Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {isEditing ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.predilation?.planned || false}
                    onChange={(e) => updateField('predilation', {
                      planned: e.target.checked,
                      brand: e.target.checked ? data.predilation?.brand : undefined,
                      size: e.target.checked ? data.predilation?.size : undefined
                    })}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Pre-dilation planned</span>
                </label>
              ) : (
                <div className="text-sm font-medium text-gray-700">
                  Pre-dilation: {data.predilation?.planned ? 'Planned' : 'Not planned'}
                </div>
              )}
            </div>

            {/* Conditional brand & size */}
            {data.predilation?.planned && (
              <div className="pl-6 space-y-3 border-l-2 border-purple-200">
                {/* Brand */}
                <div className="grid grid-cols-[100px_1fr] gap-2 items-start">
                  <label className="text-xs font-medium text-gray-600 pt-2">Brand:</label>
                  {isEditing ? (
                    <select
                      value={data.predilation.brand || ''}
                      onChange={(e) => {
                        const newBrand = (e.target.value as 'Valver' | 'True' | 'Atlas' | '') || undefined;
                        // Reset size if it's not valid for the new brand
                        const currentSize = data.predilation?.size;
                        const newSize = newBrand && currentSize
                          ? (([...PROCEDURE_PLANNING_OPTIONS.predilationSizes[newBrand]] as number[]).includes(currentSize) ? currentSize : undefined)
                          : undefined;

                        updateField('predilation', {
                          planned: data.predilation?.planned ?? false,
                          brand: newBrand,
                          size: newSize
                        });
                      }}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      aria-label="Pre-dilation balloon brand"
                    >
                      <option value="">Select brand</option>
                      {PROCEDURE_PLANNING_OPTIONS.predilationBrands.map(brand => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-3 py-1.5 text-sm text-gray-900">
                      {data.predilation.brand || '-'}
                    </div>
                  )}
                </div>

                {/* Size (brand-specific) */}
                {data.predilation.brand && (
                  <div className="grid grid-cols-[100px_1fr] gap-2 items-start">
                    <label className="text-xs font-medium text-gray-600 pt-2">Size:</label>
                    {isEditing ? (
                      <select
                        value={data.predilation.size || ''}
                        onChange={(e) => updateField('predilation', {
                          planned: data.predilation?.planned ?? false,
                          brand: data.predilation?.brand,
                          size: e.target.value ? parseInt(e.target.value) : undefined
                        })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                        aria-label="Pre-dilation balloon size"
                      >
                        <option value="">Select size</option>
                        {PROCEDURE_PLANNING_OPTIONS.predilationSizes[data.predilation.brand].map(size => (
                          <option key={size} value={size}>{size} mm</option>
                        ))}
                      </select>
                    ) : (
                      <div className="px-3 py-1.5 text-sm text-gray-900">
                        {data.predilation.size ? `${data.predilation.size} mm` : '-'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-4" />

          {/* Protamine Section */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700">Protamine:</div>

            {isEditing ? (
              <div className="pl-2 space-y-3">
                {/* Radio buttons */}
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={data.protamine?.suitable === true}
                      onChange={() => updateField('protamine', { suitable: true, reason: undefined })}
                      className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">Suitable</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={data.protamine?.suitable === false}
                      onChange={() => updateField('protamine', { suitable: false, reason: data.protamine?.reason })}
                      className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">Not Suitable</span>
                  </label>
                </div>

                {/* Conditional reason field */}
                {data.protamine?.suitable === false && (
                  <div className="pl-6 border-l-2 border-purple-200">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Reason:
                    </label>
                    <textarea
                      value={data.protamine.reason || ''}
                      onChange={(e) => updateField('protamine', {
                        suitable: data.protamine?.suitable ?? true,
                        reason: e.target.value || undefined
                      })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 min-h-[60px]"
                      placeholder="Explain why protamine is not suitable..."
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="px-3 py-2 space-y-1">
                <div className="text-sm text-gray-900">
                  {data.protamine?.suitable === true && 'Suitable'}
                  {data.protamine?.suitable === false && 'Not Suitable'}
                  {data.protamine?.suitable === undefined && '-'}
                </div>
                {data.protamine?.suitable === false && data.protamine.reason && (
                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    Reason: {data.protamine.reason}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-4" />

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes:</label>
            {isEditing ? (
              <textarea
                value={data.notes || ''}
                onChange={(e) => updateField('notes', e.target.value || undefined)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 min-h-[80px]"
                placeholder="Additional procedure planning notes..."
              />
            ) : (
              <div className="px-3 py-2 text-sm text-gray-900 whitespace-pre-wrap">
                {data.notes || '-'}
              </div>
            )}
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
    </div>
  );
};

function createEmptyPlanning(): ProcedurePlanning {
  return {
    predilation: {
      planned: false
    },
    protamine: {
      suitable: true
    }
  };
}
