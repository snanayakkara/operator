import React, { useMemo } from 'react';
import type { TTETrendRow, TTEFieldValue } from '@/types/TTETrendTypes';
import { Info } from 'lucide-react';

export type EditableField = 'lvef' | 'rvsp' | 'lvedd' | 'avMpg' | 'tapse' | 'gls' | 'lavi' | 'di' | 'ava' | 'svi';

interface TTEResultsTableProps {
  rows: TTETrendRow[];
  onMetricUpdate: (rowId: string, field: EditableField, value: string) => void;
}

function formatDate(row: TTETrendRow): string {
  if (!row.dateIso) {
    return row.label;
  }
  const date = new Date(row.dateIso);
  const options: Intl.DateTimeFormatOptions =
    row.datePrecision === 'month'
      ? { month: 'short', year: 'numeric' }
      : { day: 'numeric', month: 'short', year: 'numeric' };
  return date.toLocaleDateString(undefined, options);
}

function numericPlaceholder(field: EditableField): string {
  switch (field) {
    case 'lvef':
      return '%';
    case 'rvsp':
      return 'mmHg';
    case 'lvedd':
      return 'mm';
    case 'avMpg':
      return 'mmHg';
    case 'tapse':
      return 'mm';
    case 'gls':
      return '%';
    case 'lavi':
      return 'mL/m²';
    case 'di':
      return 'ratio';
    case 'ava':
      return 'cm²';
    case 'svi':
      return 'mL/m²';
    default:
      return '';
  }
}

export const TTEResultsTable: React.FC<TTEResultsTableProps> = ({ rows, onMetricUpdate }) => {
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (a.dateIso && b.dateIso) {
        return a.dateIso.localeCompare(b.dateIso);
      }
      if (a.dateIso) return -1;
      if (b.dateIso) return 1;
      return a.label.localeCompare(b.label);
    });
  }, [rows]);

  const renderEditableCell = (row: TTETrendRow, field: EditableField, value?: TTEFieldValue) => {
    const inputValue =
      value && value.type === 'numeric' ? value.value.toString() : value && value.type === 'text' ? value.text : '';
    const placeholder = numericPlaceholder(field);
    const title = value?.sourceText ? `Source: ${value.sourceText}` : undefined;
    const isNumeric = value?.type === 'numeric';

    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-800"
          value={inputValue}
          placeholder={placeholder}
          title={title}
          onChange={event => onMetricUpdate(row.id, field, event.target.value)}
        />
        {value?.sourceText && (
          <span className="inline-flex" title={value.sourceText}>
            <Info className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          </span>
        )}
        {!inputValue && !isNumeric && placeholder && (
          <span className="text-[10px] text-slate-400">{placeholder}</span>
        )}
      </div>
    );
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-xs">
        <thead className="bg-slate-50 text-left uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2 font-semibold">Date</th>
            <th className="px-3 py-2 font-semibold">Site</th>
            <th className="px-3 py-2 font-semibold">LVEF / EF</th>
            <th className="px-3 py-2 font-semibold">RVSP / PASP</th>
            <th className="px-3 py-2 font-semibold">LVEDD</th>
            <th className="px-3 py-2 font-semibold">AV MPG</th>
            <th className="px-3 py-2 font-semibold">TAPSE</th>
            <th className="px-3 py-2 font-semibold">GLS</th>
            <th className="px-3 py-2 font-semibold">LAVI</th>
            <th className="px-3 py-2 font-semibold">DI</th>
            <th className="px-3 py-2 font-semibold">AVA</th>
            <th className="px-3 py-2 font-semibold">Valves</th>
            <th className="px-3 py-2 font-semibold">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sortedRows.map(row => (
            <tr key={row.id} className="hover:bg-slate-50/60">
              <td className="px-3 py-2 font-medium text-slate-800">{formatDate(row)}</td>
              <td className="px-3 py-2 text-slate-600">{row.site ?? '—'}</td>
              <td className="px-3 py-2">{renderEditableCell(row, 'lvef', row.lvef ?? row.lvefCategory)}</td>
              <td className="px-3 py-2">{renderEditableCell(row, 'rvsp', row.rvsp ?? row.pasp ?? row.trGradient)}</td>
              <td className="px-3 py-2">{renderEditableCell(row, 'lvedd', row.lvedd)}</td>
              <td className="px-3 py-2">{renderEditableCell(row, 'avMpg', row.avMpg)}</td>
              <td className="px-3 py-2">{renderEditableCell(row, 'tapse', row.tapse)}</td>
              <td className="px-3 py-2">{renderEditableCell(row, 'gls', row.gls)}</td>
              <td className="px-3 py-2">{renderEditableCell(row, 'lavi', row.lavi)}</td>
              <td className="px-3 py-2">{renderEditableCell(row, 'di', row.di)}</td>
              <td className="px-3 py-2">{renderEditableCell(row, 'ava', row.ava)}</td>
              <td className="px-3 py-2 text-slate-600">
                {['ar', 'mr', 'tr']
                  .map(valve => row.valveGrades[valve as 'ar' | 'mr' | 'tr'])
                  .filter((grade): grade is NonNullable<typeof grade> => Boolean(grade))
                  .map(grade => (
                    <span
                      key={grade.id}
                      className="mr-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700"
                      title={grade.sourceText}
                    >
                      {grade.valve.toUpperCase()} {grade.severity}
                    </span>
                  ))}
                {(!row.valveGrades.ar && !row.valveGrades.mr && !row.valveGrades.tr) && <span>—</span>}
              </td>
              <td className="px-3 py-2 text-slate-600">
                {row.notes.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {row.notes.map(note => (
                      <span key={note.id} className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700" title={note.sourceText}>
                        {note.label}: {note.description}
                      </span>
                    ))}
                  </div>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {sortedRows.length === 0 && (
        <div className="p-6 text-center text-sm text-slate-500">Import TTE entries from the EMR to populate this table.</div>
      )}
    </div>
  );
};
