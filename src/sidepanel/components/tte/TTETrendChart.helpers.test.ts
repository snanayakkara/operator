import { describe, it, expect } from 'vitest';
import type { TTETrendRow } from '@/types/TTETrendTypes';
import { buildSeries, buildMonthTicks, applyContextPadding } from './TTETrendChart.helpers';

const createRow = (id: string, dateIso: string, value: number): TTETrendRow => ({
  id,
  modality: 'tte',
  label: `TTE ${dateIso}`,
  dateIso,
  datePrecision: 'day',
  site: 'Test Lab',
  capturedAt: Date.now(),
  lvef: {
    id: `${id}-lvef`,
    type: 'numeric',
    value,
    unit: '%',
    display: `${value}%`,
    sourceText: 'Manual',
    rawText: 'Manual'
  },
  valveGrades: {},
  structuralFindings: [],
  notes: [],
  rawSource: 'Manual row'
});

describe('TTETrendChart helpers', () => {
  it('buildSeries sorts points by date', () => {
    const rows: TTETrendRow[] = [
      createRow('b', '2025-02-15', 52),
      createRow('a', '2025-01-15', 48),
      createRow('c', '2025-04-01', 55)
    ];
    const series = buildSeries(rows, 'lvef');
    expect(series.map(point => point.row.id)).toEqual(['a', 'b', 'c']);
  });

  it('buildMonthTicks spans start to end month with fixed increments', () => {
    const rows: TTETrendRow[] = [
      createRow('a', '2025-01-15', 48),
      createRow('b', '2025-02-15', 52),
      createRow('c', '2025-04-01', 55)
    ];
    const series = buildSeries(rows, 'lvef');
    const ticks = buildMonthTicks(series);
    expect(ticks[0].date.toISOString().slice(0, 7)).toBe('2025-01');
    expect(ticks.at(-1)?.date.toISOString().slice(0, 7)).toBe('2025-04');
    expect(ticks).toHaveLength(4);
  });

  it('applyContextPadding expands ranges to avoid flat scales', () => {
    const range = applyContextPadding(45, 55);
    expect(range.min).toBeLessThanOrEqual(45);
    expect(range.max).toBeGreaterThanOrEqual(55);
  });
});

