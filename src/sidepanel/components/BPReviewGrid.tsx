/**
 * BP Review Grid Component
 *
 * Editable table for reviewing and correcting BP readings.
 * Adapts patterns from TAVIGridView with inline editing capability.
 */

import React, { useState, useCallback } from 'react';
import { AlertCircle, Info, AlertTriangle, Plus, Trash2, X, Check } from 'lucide-react';
import type { BPReading, BPWarning } from '@/types/BPTypes';
import Button from './buttons/Button';
import { IconButton } from './buttons/Button';

interface BPReviewGridProps {
  readings: BPReading[];
  onReadingsChange: (readings: BPReading[]) => void;
  editable?: boolean;
}

interface NewReadingForm {
  date: string;
  time: string;
  sbp: string;
  dbp: string;
  hr: string;
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

  const [showAddForm, setShowAddForm] = useState(false);
  const [newReading, setNewReading] = useState<NewReadingForm>({
    date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD
    time: '07:00',
    sbp: '',
    dbp: '',
    hr: ''
  });

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

  const handleAddReading = useCallback(() => {
    // Validate inputs
    const sbp = parseInt(newReading.sbp, 10);
    const dbp = parseInt(newReading.dbp, 10);
    const hr = parseInt(newReading.hr, 10);

    if (isNaN(sbp) || isNaN(dbp) || isNaN(hr)) {
      alert('Please enter valid numbers for SBP, DBP, and HR');
      return;
    }

    if (sbp < 60 || sbp > 250 || dbp < 40 || dbp > 150 || hr < 30 || hr > 200) {
      if (!confirm('Values seem unusual. Are you sure you want to add this reading?')) {
        return;
      }
    }

    // Determine time of day
    const hours = parseInt(newReading.time.split(':')[0], 10);
    const timeOfDay = hours < 12 ? 'morning' as const : 'evening' as const;

    // Create new reading
    const reading: BPReading = {
      id: `bp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      date: newReading.date,
      time: newReading.time,
      timeOfDay,
      sbp,
      dbp,
      hr,
      confidence: 1.0, // Manually entered = 100% confidence
      warnings: []
    };

    // Add to readings and sort by date/time
    const updatedReadings = [...readings, reading].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });

    onReadingsChange(updatedReadings);

    // Reset form
    setNewReading({
      date: new Date().toISOString().split('T')[0],
      time: '07:00',
      sbp: '',
      dbp: '',
      hr: ''
    });
    setShowAddForm(false);
  }, [newReading, readings, onReadingsChange]);

  const handleDeleteReading = useCallback((readingId: string) => {
    if (!confirm('Delete this reading? This action cannot be undone.')) {
      return;
    }

    const updatedReadings = readings.filter(r => r.id !== readingId);
    onReadingsChange(updatedReadings);
  }, [readings, onReadingsChange]);

  const handleCancelAdd = useCallback(() => {
    setShowAddForm(false);
    setNewReading({
      date: new Date().toISOString().split('T')[0],
      time: '07:00',
      sbp: '',
      dbp: '',
      hr: ''
    });
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
      {/* Add Reading Button */}
      {editable && !showAddForm && (
        <Button
          onClick={() => setShowAddForm(true)}
          variant="outline"
          size="sm"
          startIcon={<Plus />}
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
        >
          Add New Reading
        </Button>
      )}

      {/* Add Reading Form */}
      {editable && showAddForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-blue-900">Add New Reading</h4>
            <IconButton
              onClick={handleCancelAdd}
              icon={<X />}
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:text-blue-800"
              aria-label="Cancel add reading"
            />
          </div>

          <div className="grid grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={newReading.date}
                onChange={(e) => setNewReading({ ...newReading, date: e.target.value })}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Time</label>
              <input
                type="time"
                value={newReading.time}
                onChange={(e) => setNewReading({ ...newReading, time: e.target.value })}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">SBP (mmHg)</label>
              <input
                type="number"
                value={newReading.sbp}
                onChange={(e) => setNewReading({ ...newReading, sbp: e.target.value })}
                placeholder="120"
                min="60"
                max="250"
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">DBP (mmHg)</label>
              <input
                type="number"
                value={newReading.dbp}
                onChange={(e) => setNewReading({ ...newReading, dbp: e.target.value })}
                placeholder="80"
                min="40"
                max="150"
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">HR (bpm)</label>
              <input
                type="number"
                value={newReading.hr}
                onChange={(e) => setNewReading({ ...newReading, hr: e.target.value })}
                placeholder="70"
                min="30"
                max="200"
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleAddReading}
              variant="secondary"
              size="sm"
              startIcon={<Check />}
            >
              Add Reading
            </Button>
            <Button
              onClick={handleCancelAdd}
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-800"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

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
              <th className="px-2 py-2 text-left font-semibold text-gray-700 w-[12%]">Date</th>
              <th className="px-2 py-2 text-left font-semibold text-gray-700 w-[14%]">Time</th>
              <th className="px-2 py-2 text-center font-semibold text-gray-700 w-[19%]">
                <div>SBP</div>
                <div className="font-normal text-[10px] text-gray-500">(mmHg)</div>
              </th>
              <th className="px-2 py-2 text-center font-semibold text-gray-700 w-[19%]">
                <div>DBP</div>
                <div className="font-normal text-[10px] text-gray-500">(mmHg)</div>
              </th>
              <th className="px-2 py-2 text-center font-semibold text-gray-700 w-[20%]">
                <div>HR</div>
                <div className="font-normal text-[10px] text-gray-500">(bpm)</div>
              </th>
              {editable && (
                <th className="px-2 py-2 text-center font-semibold text-gray-700 w-[16%]">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {readings.map((reading) => {
              // Determine row styling based on confidence
              const confidence = reading.confidence || 1.0;
              const isLowConfidence = confidence < 0.8;
              const isVeryLowConfidence = confidence < 0.65;

              let rowClassName = 'hover:bg-gray-50 transition-colors';
              if (isVeryLowConfidence) {
                rowClassName = 'bg-red-50 hover:bg-red-100 transition-colors border-l-4 border-red-400';
              } else if (isLowConfidence) {
                rowClassName = 'bg-yellow-50 hover:bg-yellow-100 transition-colors border-l-4 border-yellow-400';
              }

              return (
                <tr key={reading.id} className={rowClassName}>
                  <td className="px-2 py-2 text-gray-900">
                    <div className="flex items-center gap-2">
                      {formatDate(reading.date)}
                      {isLowConfidence && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            isVeryLowConfidence
                              ? 'bg-red-200 text-red-800'
                              : 'bg-yellow-200 text-yellow-800'
                          }`}
                          title={`Confidence: ${Math.round(confidence * 100)}%`}
                        >
                          {Math.round(confidence * 100)}%
                        </span>
                      )}
                    </div>
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
                  {editable && (
                    <td className="px-2 py-2 text-center">
                      <IconButton
                        onClick={() => handleDeleteReading(reading.id)}
                        icon={<Trash2 />}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        aria-label="Delete this reading"
                      />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Confidence Legend & Edit hint */}
      {editable && (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-50 border-l-2 border-yellow-400 rounded"></div>
              <span className="text-gray-600">Low confidence (&lt;80%) - verify these first</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-50 border-l-2 border-red-400 rounded"></div>
              <span className="text-gray-600">Very low confidence (&lt;65%) - likely incorrect</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center">
            Click any value to edit • Press Enter to save, Esc to cancel • Use trash icon to delete readings
          </p>
        </div>
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