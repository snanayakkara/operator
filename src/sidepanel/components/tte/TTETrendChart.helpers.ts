import type { TTETrendRow, TTETrendSeriesKey } from '@/types/TTETrendTypes';

export interface SeriesPoint {
  row: TTETrendRow;
  date: Date;
  value: number;
  field: TTETrendSeriesKey;
}

export interface ChartTick {
  date: Date;
  label: string;
}

export function toDate(row: TTETrendRow): Date | null {
  if (!row.dateIso) return null;
  const parsed = new Date(row.dateIso);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

export function getNumericValue(row: TTETrendRow, field: TTETrendSeriesKey): number | null {
  switch (field) {
    case 'lvef':
      return row.lvef && row.lvef.type === 'numeric' ? row.lvef.value : null;
    case 'rvsp':
      return row.rvsp && row.rvsp.type === 'numeric' ? row.rvsp.value : null;
    case 'lvedd':
      return row.lvedd && row.lvedd.type === 'numeric' ? row.lvedd.value : null;
    case 'avMpg':
      return row.avMpg && row.avMpg.type === 'numeric' ? row.avMpg.value : null;
    case 'lavi':
      return row.lavi && row.lavi.type === 'numeric' ? row.lavi.value : null;
    default:
      return null;
  }
}

export function buildSeries(rows: TTETrendRow[], field: TTETrendSeriesKey): SeriesPoint[] {
  return rows
    .map(row => {
      const date = toDate(row);
      if (!date) return null;
      const value = getNumericValue(row, field);
      if (value == null) return null;
      return { row, date, value, field };
    })
    .filter((point): point is SeriesPoint => point != null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

function getMonthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonth(date: Date): Date {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

export function buildMonthTicks(points: SeriesPoint[]): ChartTick[] {
  if (points.length === 0) return [];
  const sortedDates = points.map(point => point.date).sort((a, b) => a.getTime() - b.getTime());
  const startMonth = getMonthStart(sortedDates[0]);
  const endMonth = getMonthStart(sortedDates.at(-1)!);
  const ticks: ChartTick[] = [];
  let cursor = new Date(startMonth);
  while (cursor <= endMonth) {
    ticks.push({
      date: new Date(cursor),
      label: cursor.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
    });
    cursor = addMonth(cursor);
  }
  if (ticks.length === 0) {
    ticks.push({
      date: new Date(startMonth),
      label: startMonth.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
    });
    ticks.push({
      date: addMonth(startMonth),
      label: addMonth(startMonth).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
    });
  }
  if (ticks.length === 1) {
    ticks.push({
      date: addMonth(ticks[0].date),
      label: addMonth(ticks[0].date).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
    });
  }
  return ticks;
}

export function applyContextPadding(min: number, max: number): { min: number; max: number } {
  if (min === max) {
    return { min: min - 5, max: max + 5 };
  }
  const padding = (max - min) * 0.15;
  return { min: Math.floor(min - padding), max: Math.ceil(max + padding) };
}
