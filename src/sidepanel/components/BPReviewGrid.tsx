/**
 * BP Review Grid Component
 *
 * Editable table for reviewing and correcting BP readings.
 * Adapts patterns from TAVIGridView with inline editing capability.
 */

import React, { useState, useCallback } from 'react';
import { AlertCircle, Info, AlertTriangle } from 'lucide-react';
import type { BPReading, BPWarning } from '@/types/BPTypes';

interface BPReviewGridProps {
  readings: BPReading[];
  onReadingsChange: (readings: BPReading[]) => void;
  editable?: boolean;
}

export const BPReviewGrid: React.FC<BPReviewGridProps> = ({
  readings,
  onReadingsChange,
  editable = true
}) => {
  const [editingCell, setEditingCell] = useState<{
    readingId: string;
    field: 'sbp' | 'dbp' | 'hr';
  } | null>(null);

  const handleCellClick = useCallback((readingId: string, field: 'sbp' | 'dbp' | 'hr') => {
    if (editable) {
      setEditingCell({ readingId, field });
    }
  }, [editable]);

  const handleCellChange = useCallback((
    readingId: string,
    field: 'sbp' | 'dbp' | 'hr',
    value: string
  ) => {
    const numericValue = parseInt(value, 10);
    if (isNaN(numericValue)) return;

    const updatedReadings = readings.map(r =>
      r.id === readingId ? { ...r, [field]: numericValue } : r
    );

    onReadingsChange(updatedReadings);
  }, [readings, onReadingsChange]);

  const handleCellBlur = useCallback(() => {
    setEditingCell(null);
  }, []);

  const getWarningIcon = (warnings: BPWarning[] = []) => {
    const hasError = warnings.some(w => w.severity === 'error');
    const hasWarning = warnings.some(w => w.severity === 'warning');

    if (hasError) {
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    } else if (hasWarning) {
      return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    } else if (warnings.length > 0) {
      return <Info className="w-4 h-4 text-blue-600" />;
    }
    return null;
  };

  const renderCell = (reading: BPReading, field: 'sbp' | 'dbp' | 'hr') => {
    const isEditing = editingCell?.readingId === reading.id && editingCell?.field === field;
    const value = reading[field];
    const fieldWarnings = reading.warnings?.filter(w => w.field === field) || [];
    const hasWarning = fieldWarnings.length > 0;

    if (isEditing) {
      return (
        <input
          type="number"
          defaultValue={value}
          autoFocus
          onBlur={(e) => {
            handleCellChange(reading.id, field, e.target.value);
            handleCellBlur();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleCellChange(reading.id, field, e.currentTarget.value);
              handleCellBlur();
            } else if (e.key === 'Escape') {
              handleCellBlur();
            }
          }}
          className="w-full px-2 py-1 border-2 border-blue-500 rounded focus:outline-none"
          style={{ minWidth: '60px' }}
        />
      );
    }

    return (
      <div
        className={`flex items-center justify-between gap-2 px-2 py-1 rounded ${
          editable ? 'cursor-pointer hover:bg-gray-100' : ''
        } ${hasWarning ? 'bg-yellow-50' : ''}`}
        onClick={() => handleCellClick(reading.id, field)}
        title={fieldWarnings.map(w => w.message).join('\n')}
      >
        <span className="font-medium">{value}</span>
        {hasWarning && getWarningIcon(fieldWarnings)}
      </div>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  };

  const getTotalWarnings = () => {
    return readings.reduce((sum, r) => sum + (r.warnings?.length || 0), 0);
  };

  if (readings.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-gray-500 text-sm">No readings to review</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
        <span>{readings.length} reading{readings.length !== 1 ? 's' : ''}</span>
        {getTotalWarnings() > 0 && (
          <span className="flex items-center gap-1 text-yellow-600">
            <AlertTriangle className="w-4 h-4" />
            {getTotalWarnings()} warning{getTotalWarnings() !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-xs table-fixed">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-2 py-2 text-left font-semibold text-gray-700 w-[15%]">Date</th>
              <th className="px-2 py-2 text-left font-semibold text-gray-700 w-[18%]">Time</th>
              <th className="px-2 py-2 text-center font-semibold text-gray-700 w-[22%]">
                <div>SBP</div>
                <div className="font-normal text-[10px] text-gray-500">(mmHg)</div>
              </th>
              <th className="px-2 py-2 text-center font-semibold text-gray-700 w-[22%]">
                <div>DBP</div>
                <div className="font-normal text-[10px] text-gray-500">(mmHg)</div>
              </th>
              <th className="px-2 py-2 text-center font-semibold text-gray-700 w-[23%]">
                <div>HR</div>
                <div className="font-normal text-[10px] text-gray-500">(bpm)</div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {readings.map((reading) => (
              <tr
                key={reading.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-2 py-2 text-gray-900">
                  {formatDate(reading.date)}
                </td>
                <td className="px-2 py-2 text-gray-700 font-mono text-xs">
                  {reading.time}
                </td>
                <td className="px-2 py-2 text-center">
                  {renderCell(reading, 'sbp')}
                </td>
                <td className="px-2 py-2 text-center">
                  {renderCell(reading, 'dbp')}
                </td>
                <td className="px-2 py-2 text-center">
                  {renderCell(reading, 'hr')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit hint */}
      {editable && (
        <p className="text-xs text-gray-500 text-center">
          Click any value to edit • Press Enter to save, Esc to cancel
        </p>
      )}

      {/* Warnings list (if any) */}
      {getTotalWarnings() > 0 && (
        <div className="mt-4 space-y-2">
          {readings.filter(r => r.warnings && r.warnings.length > 0).map(reading => (
            <div key={reading.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="text-xs font-semibold text-gray-700 mb-1">
                {formatDate(reading.date)} {reading.time}:
              </div>
              <ul className="text-xs text-gray-600 space-y-1">
                {reading.warnings?.map((warning, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    {getWarningIcon([warning])}
                    <span>{warning.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};