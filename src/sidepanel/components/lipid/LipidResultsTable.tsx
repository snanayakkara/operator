import React, { useCallback } from 'react';
import type { LipidResult, LipidAnalyte } from '@/types/LipidTypes';

interface LipidResultsTableProps {
  readings: LipidResult[];
  onChange: (next: LipidResult[]) => void;
  analyteOrder: LipidAnalyte[];
}

const ANALYTE_LABELS: Record<LipidAnalyte, string> = {
  ldl: 'LDL-C',
  tchol: 'Total Chol',
  hdl: 'HDL',
  tg: 'Triglycerides',
  apob: 'ApoB',
  nonHDL: 'Non-HDL'
};

const DECIMAL_INPUT_PROPS = {
  inputMode: 'decimal' as const,
  step: 0.1,
  min: 0
};

const dateFormatter = typeof Intl !== 'undefined'
  ? new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
  : null;

function formatDisplayDate(iso: string): string {
  try {
    if (!dateFormatter) return iso;
    return dateFormatter.format(new Date(iso));
  } catch {
    return iso;
  }
}

export const LipidResultsTable: React.FC<LipidResultsTableProps> = ({
  readings,
  onChange,
  analyteOrder
}) => {
  const handleValueChange = useCallback((id: string, field: LipidAnalyte | 'date' | 'therapyNote', value: string) => {
    onChange(
      readings.map(reading => {
        if (reading.id !== id) return reading;

        if (field === 'date') {
          return { ...reading, date: value, isEdited: true };
        }

        if (field === 'therapyNote') {
          return { ...reading, therapyNote: value || null, isEdited: true, isPreTherapy: value ? /\boff\s+statin|pre-therapy|baseline/i.test(value) : false };
        }

        const numeric = value === '' ? undefined : Number(value);
        const safeValue = numeric !== undefined && Number.isFinite(numeric) ? parseFloat(numeric.toFixed(2)) : undefined;
        const updated: LipidResult = {
          ...reading,
          [field]: safeValue,
          isEdited: true
        };

        // Recalculate derived non-HDL when total/HDL edited
        if (field === 'tchol' || field === 'hdl') {
          if (updated.tchol != null && updated.hdl != null) {
            updated.nonHDL = parseFloat((updated.tchol - updated.hdl).toFixed(2));
          } else if (field === 'tchol' && updated.hdl == null) {
            updated.nonHDL = undefined;
          } else if (field === 'hdl' && updated.tchol == null) {
            updated.nonHDL = undefined;
          }
        }

        return updated;
      })
    );
  }, [readings, onChange]);

  if (readings.length === 0) {
    return (
      <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center text-sm text-gray-500">
        No lipid results parsed yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-xs uppercase">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Date</th>
            {analyteOrder.map(analyte => (
              <th key={analyte} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">
                {ANALYTE_LABELS[analyte]} (mmol/L)
              </th>
            ))}
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Therapy note</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Provenance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {readings.map(reading => (
            <tr
              key={reading.id}
              className={reading.isEdited ? 'bg-amber-50' : undefined}
            >
              <td className="px-3 py-2 align-top">
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
                  value={reading.date}
                  onChange={(event) => handleValueChange(reading.id, 'date', event.target.value)}
                />
              </td>
              {analyteOrder.map(analyte => (
                <td key={`${reading.id}-${analyte}`} className="px-3 py-2 align-top">
                  <input
                    type="number"
                    {...DECIMAL_INPUT_PROPS}
                    className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
                    value={reading[analyte] ?? ''}
                    onChange={(event) => handleValueChange(reading.id, analyte, event.target.value)}
                    placeholder="–"
                  />
                </td>
              ))}
              <td className="px-3 py-2 align-top">
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
                  value={reading.therapyNote ?? ''}
                  onChange={(event) => handleValueChange(reading.id, 'therapyNote', event.target.value)}
                  placeholder="Optional note"
                />
              </td>
              <td className="px-3 py-2 text-right text-xs text-gray-500 align-top">
                <span title={reading.source}>{formatDisplayDate(reading.date)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
