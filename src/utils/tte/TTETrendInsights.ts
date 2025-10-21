import type {
  TTEInsightsMetricSnapshot,
  TTEInsightsSummary,
  TTETrendRow,
  TTEFieldValue,
  TTETrendNote
} from '@/types/TTETrendTypes';

const MS_PER_DAY = 86400000;
const MONTH_IN_MS = MS_PER_DAY * 30.4375;

function toDate(row: TTETrendRow): Date | null {
  if (!row.dateIso) return null;
  const parsed = new Date(row.dateIso);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

function numericValue(value?: TTEFieldValue): number | null {
  if (!value || value.type !== 'numeric') return null;
  return typeof value.value === 'number' ? value.value : null;
}

function textValue(value?: TTEFieldValue): string | undefined {
  if (!value) return undefined;
  if (value.type === 'text') return value.text;
  if (value.type === 'numeric') {
    return value.display ?? `${value.value}${value.unit ? ` ${value.unit}` : ''}`;
  }
  return undefined;
}

function monthsBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / MONTH_IN_MS;
}

function computeSlope(points: Array<{ date: Date; value: number }>): number | null {
  if (points.length < 2) return null;
  const xs = points.map(p => monthsBetween(points[0].date, p.date));
  const ys = points.map(p => p.value);
  const n = points.length;
  const sumX = xs.reduce((acc, val) => acc + val, 0);
  const sumY = ys.reduce((acc, val) => acc + val, 0);
  const sumXY = xs.reduce((acc, val, idx) => acc + val * ys[idx], 0);
  const sumXX = xs.reduce((acc, val) => acc + val * val, 0);
  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return null;
  return (n * sumXY - sumX * sumY) / denominator;
}

function classifySlope(slope: number | null): 'rising' | 'falling' | 'stable' | 'insufficient-data' {
  if (slope == null) return 'insufficient-data';
  if (slope > 0.25) return 'rising';
  if (slope < -0.25) return 'falling';
  return 'stable';
}

function formatDelta(current: number | null, previous: number | null, unit = '', precision = 1): string | undefined {
  if (current == null || previous == null) return undefined;
  const delta = current - previous;
  if (Math.abs(delta) < 0.01) return undefined;
  const formatted = delta > 0 ? `+${delta.toFixed(precision)}` : delta.toFixed(precision);
  return `${formatted}${unit ? ` ${unit}` : ''}`;
}

function formatPercentageDelta(current: number | null, baseline: number | null): string | undefined {
  if (current == null || baseline == null || baseline === 0) return undefined;
  const deltaPercent = ((current - baseline) / baseline) * 100;
  if (!Number.isFinite(deltaPercent) || Math.abs(deltaPercent) < 1) return undefined;
  return `${deltaPercent > 0 ? '+' : ''}${deltaPercent.toFixed(0)}% vs baseline`;
}

function latestRowWithValue(rows: TTETrendRow[], selector: (row: TTETrendRow) => TTEFieldValue | undefined): {
  row?: TTETrendRow;
  value?: TTEFieldValue;
} {
  const sorted = [...rows].sort((a, b) => {
    if (a.dateIso && b.dateIso) return a.dateIso.localeCompare(b.dateIso);
    if (a.dateIso) return 1;
    if (b.dateIso) return -1;
    return 0;
  });
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const value = selector(sorted[i]);
    if (value) {
      return { row: sorted[i], value };
    }
  }
  return {};
}

function collectMetricSnapshots(rows: TTETrendRow[]): TTEInsightsMetricSnapshot[] {
  const chronological = [...rows]
    .filter(row => toDate(row) !== null)
    .sort((a, b) => (a.dateIso && b.dateIso ? a.dateIso.localeCompare(b.dateIso) : 0));

  const lvefPoints = chronological
    .map(row => {
      const value = numericValue(row.lvef);
      return value != null ? { row, date: toDate(row)!, value } : null;
    })
    .filter((pt): pt is { row: TTETrendRow; date: Date; value: number } => pt != null);

  const rvspPoints = chronological
    .map(row => {
      const value = numericValue(row.rvsp);
      return value != null ? { row, date: toDate(row)!, value } : null;
    })
    .filter((pt): pt is { row: TTETrendRow; date: Date; value: number } => pt != null);

  const avMpgPoints = chronological
    .map(row => {
      const value = numericValue(row.avMpg);
      return value != null ? { row, date: toDate(row)!, value } : null;
    })
    .filter((pt): pt is { row: TTETrendRow; date: Date; value: number } => pt != null);

  const lveddPoints = chronological
    .map(row => {
      const value = numericValue(row.lvedd);
      return value != null ? { row, date: toDate(row)!, value } : null;
    })
    .filter((pt): pt is { row: TTETrendRow; date: Date; value: number } => pt != null);

  const laviPoints = chronological
    .map(row => {
      const value = numericValue(row.lavi);
      return value != null ? { row, date: toDate(row)!, value } : null;
    })
    .filter((pt): pt is { row: TTETrendRow; date: Date; value: number } => pt != null);

  const snapshots: TTEInsightsMetricSnapshot[] = [];

  if (lvefPoints.length > 0) {
    const latest = lvefPoints.at(-1)!;
    const previous = lvefPoints.length > 1 ? lvefPoints.at(-2)! : undefined;
    const baseline = lvefPoints[0];
    const slope = computeSlope(lvefPoints.map(p => ({ date: p.date, value: p.value })));
    const previousValue = previous ? previous.value : null;
    const baselineValue = baseline ? baseline.value : null;
    snapshots.push({
      field: 'lvef',
      label: 'LVEF / EF',
      current: latest.row.lvef,
      previous: previous?.row.lvef,
      baseline: baseline?.row.lvef,
      deltaFromPrevious: formatDelta(latest.value, previousValue, '%', 0),
      deltaFromBaseline: formatPercentageDelta(latest.value, baselineValue),
      slopeValue: slope,
      trajectory: classifySlope(slope),
      thresholdCrossings: []
    });
  } else {
    const qualitative = latestRowWithValue(rows, row => row.lvefCategory);
    if (qualitative.value) {
      snapshots.push({
        field: 'lvef',
        label: 'LVEF',
        current: qualitative.value,
        previous: undefined,
        baseline: undefined,
        deltaFromBaseline: undefined,
        deltaFromPrevious: undefined,
        slopeValue: null,
        trajectory: 'insufficient-data',
        thresholdCrossings: []
      });
    }
  }

  if (rvspPoints.length > 0) {
    const latest = rvspPoints.at(-1)!;
    const previous = rvspPoints.length > 1 ? rvspPoints.at(-2)! : undefined;
    const baseline = rvspPoints[0];
    const slope = computeSlope(rvspPoints.map(p => ({ date: p.date, value: p.value })));
    const previousValue = previous ? previous.value : null;
    const baselineValue = baseline ? baseline.value : null;
    snapshots.push({
      field: 'rvsp',
      label: 'RVSP',
      current: latest.row.rvsp,
      previous: previous?.row.rvsp,
      baseline: baseline?.row.rvsp,
      deltaFromPrevious: formatDelta(latest.value, previousValue, 'mmHg', 0),
      deltaFromBaseline: formatDelta(latest.value, baselineValue, 'mmHg', 0),
      slopeValue: slope,
      trajectory: classifySlope(slope),
      thresholdCrossings: []
    });
  }

  if (lveddPoints.length > 0) {
    const latest = lveddPoints.at(-1)!;
    const previous = lveddPoints.length > 1 ? lveddPoints.at(-2)! : undefined;
    const baseline = lveddPoints[0];
    const slope = computeSlope(lveddPoints.map(p => ({ date: p.date, value: p.value })));
    const previousValue = previous ? previous.value : null;
    const baselineValue = baseline ? baseline.value : null;
    snapshots.push({
      field: 'lvedd',
      label: 'LVEDD',
      current: latest.row.lvedd,
      previous: previous?.row.lvedd,
      baseline: baseline?.row.lvedd,
      deltaFromPrevious: formatDelta(latest.value, previousValue, 'mm', 0),
      deltaFromBaseline: formatDelta(latest.value, baselineValue, 'mm', 0),
      slopeValue: slope,
      trajectory: classifySlope(slope),
      thresholdCrossings: []
    });
  }

  if (avMpgPoints.length > 0) {
    const latest = avMpgPoints.at(-1)!;
    const previous = avMpgPoints.length > 1 ? avMpgPoints.at(-2)! : undefined;
    const baseline = avMpgPoints[0];
    const slope = computeSlope(avMpgPoints.map(p => ({ date: p.date, value: p.value })));
    const previousValue = previous ? previous.value : null;
    const baselineValue = baseline ? baseline.value : null;
    snapshots.push({
      field: 'avMpg',
      label: 'AV mean gradient',
      current: latest.row.avMpg,
      previous: previous?.row.avMpg,
      baseline: baseline?.row.avMpg,
      deltaFromPrevious: formatDelta(latest.value, previousValue, 'mmHg', 0),
      deltaFromBaseline: formatDelta(latest.value, baselineValue, 'mmHg', 0),
      slopeValue: slope,
      trajectory: classifySlope(slope),
      thresholdCrossings: []
    });
  }

  if (laviPoints.length > 0) {
    const latest = laviPoints.at(-1)!;
    const previous = laviPoints.length > 1 ? laviPoints.at(-2)! : undefined;
    const baseline = laviPoints[0];
    const slope = computeSlope(laviPoints.map(p => ({ date: p.date, value: p.value })));
    const previousValue = previous ? previous.value : null;
    const baselineValue = baseline ? baseline.value : null;
    snapshots.push({
      field: 'lavi',
      label: 'LAVI',
      current: latest.row.lavi,
      previous: previous?.row.lavi,
      baseline: baseline?.row.lavi,
      deltaFromPrevious: formatDelta(latest.value, previousValue, 'mL/m²', 0),
      deltaFromBaseline: formatDelta(latest.value, baselineValue, 'mL/m²', 0),
      slopeValue: slope,
      trajectory: classifySlope(slope),
      thresholdCrossings: []
    });
  }

  return snapshots;
}

function hasThresholdCrossing(snapshots: TTEInsightsMetricSnapshot[], rows: TTETrendRow[]): string[] {
  const messages: string[] = [];

  const lvef = snapshots.find(s => s.field === 'lvef');
  if (lvef) {
    const currentValue = numericValue(lvef.current);
    const previousValue = numericValue(lvef.previous);
    const baselineValue = numericValue(lvef.baseline);
    const checkCrossing = (threshold: number, label: string) => {
      if (currentValue == null) return;
      const candidates = [previousValue, baselineValue].filter((value): value is number => value != null);
      if (candidates.length === 0) return;
      const crossed = candidates.some(from =>
        (from >= threshold && currentValue < threshold) || (from < threshold && currentValue >= threshold)
      );
      if (crossed) {
        messages.push(`LVEF crossed ${threshold}% (${label})`);
      }
    };
    checkCrossing(50, 'HFpEF boundary');
    checkCrossing(40, 'HFrEF boundary');
  }

  const rvsp = snapshots.find(s => s.field === 'rvsp');
  if (rvsp) {
    const currentValue = numericValue(rvsp.current);
    if (currentValue != null) {
      if (currentValue >= 50) {
        messages.push('RVSP ≥50 mmHg – high probability of pulmonary hypertension');
      } else if (currentValue >= 40) {
        messages.push('RVSP ≥40 mmHg – intermediate probability of pulmonary hypertension');
      }
    }
  }

  const avMpg = snapshots.find(s => s.field === 'avMpg');
  if (avMpg) {
    const currentValue = numericValue(avMpg.current);
    if (currentValue != null && currentValue >= 40) {
      messages.push('AV mean gradient ≥40 mmHg – severe AS range');
    }
    const latestDI = [...rows]
      .filter(row => row.di && row.di.type === 'numeric')
      .sort((a, b) => (a.dateIso && b.dateIso ? a.dateIso.localeCompare(b.dateIso) : 0))
      .at(-1);
    if (latestDI && latestDI.di && latestDI.di.type === 'numeric' && latestDI.di.value <= 0.25) {
      messages.push('DI ≤0.25 – supportive of severe AS');
    }
  }

  const latestTapse = [...rows]
    .filter(row => row.tapse && row.tapse.type === 'numeric')
    .sort((a, b) => (a.dateIso && b.dateIso ? a.dateIso.localeCompare(b.dateIso) : 0))
    .at(-1);
  if (latestTapse && latestTapse.tapse && latestTapse.tapse.type === 'numeric' && latestTapse.tapse.value < 17) {
    messages.push('TAPSE <17 mm – reduced RV longitudinal function');
  }

  return messages;
}

function summarizeNotes(notes: TTETrendNote[], predicate: (note: TTETrendNote) => boolean): string[] {
  const filtered = notes.filter(predicate);
  return filtered.map(note => note.description || note.label);
}

function collectDataQuality(rows: TTETrendRow[]): { missingMetrics: string[]; ambiguousFindings: string[]; interLabChanges: string[] } {
  const missing: string[] = [];
  const ambiguous: string[] = [];

  if (!rows.some(row => row.lvef && row.lvef.type === 'numeric')) {
    missing.push('Numeric EF absent');
  }
  if (!rows.some(row => row.avMpg && row.avMpg.type === 'numeric')) {
    missing.push('AV mean gradient absent');
  }
  if (!rows.some(row => row.rvsp)) {
    missing.push('RVSP missing');
  }
  if (!rows.some(row => row.lvedd)) {
    missing.push('LVEDD missing');
  }
  if (!rows.some(row => row.lavi)) {
    missing.push('LAVI missing');
  }

  rows.forEach(row => {
    if (row.pasp?.type === 'text' && row.pasp.flags?.includes('rap-unknown')) {
      ambiguous.push(`PASP ${row.pasp.text} – RA pressure not specified`);
    }
  });

  const uniqueSites = Array.from(
    new Set(
      rows
        .map(row => row.site)
        .filter((site): site is string => Boolean(site))
    )
  );
  const interLabChanges = uniqueSites.length > 1 ? ['Site variability noted'] : [];

  return {
    missingMetrics: missing,
    ambiguousFindings: ambiguous,
    interLabChanges
  };
}

function buildHeadline(snapshots: TTEInsightsMetricSnapshot[], rows: TTETrendRow[]): string {
  if (snapshots.length === 0) {
    return 'No numeric TTE metrics available';
  }
  const lvef = snapshots.find(s => s.field === 'lvef');
  if (!lvef) {
    return 'Qualitative EF only – numeric metrics not captured';
  }
  const current = numericValue(lvef.current);
  if (current != null) {
    const latestRow = rows
      .filter(row => row.lvef && row.lvef === lvef.current)
      .sort((a, b) => (a.dateIso && b.dateIso ? a.dateIso.localeCompare(b.dateIso) : 0))
      .at(-1);
    const dateLabel = latestRow?.dateIso ? new Date(latestRow.dateIso).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '';
    return `Latest EF ${current.toFixed(0)}%${dateLabel ? ` (${dateLabel})` : ''}`;
  }
  return `Latest EF: ${textValue(lvef.current) ?? 'qualitative only'}`;
}

function buildNarrative(
  snapshots: TTEInsightsMetricSnapshot[],
  thresholds: string[],
  rightHeart: string[],
  valveContext: string[],
  dataQuality: { missingMetrics: string[]; ambiguousFindings: string[] }
): string {
  const clauses: string[] = [];
  const lvef = snapshots.find(s => s.field === 'lvef');
  if (lvef && lvef.current) {
    const current = textValue(lvef.current);
    const delta = lvef.deltaFromBaseline ?? lvef.deltaFromPrevious;
    const trajectory = lvef.trajectory && lvef.trajectory !== 'insufficient-data' ? lvef.trajectory : undefined;
    clauses.push(`EF ${current ?? 'unavailable'}${delta ? ` (${delta})` : ''}${trajectory ? `, ${trajectory}` : ''}`);
  }

  const rvsp = snapshots.find(s => s.field === 'rvsp');
  if (rvsp && rvsp.current) {
    const current = textValue(rvsp.current);
    const delta = rvsp.deltaFromPrevious;
    clauses.push(`RVSP ${current ?? 'n/a'}${delta ? ` (${delta})` : ''}`);
  }

  const avMpg = snapshots.find(s => s.field === 'avMpg');
  if (avMpg && avMpg.current) {
    const current = textValue(avMpg.current);
    clauses.push(`AV MPG ${current ?? 'n/a'}`);
  }

  const lavi = snapshots.find(s => s.field === 'lavi');
  if (lavi && lavi.current) {
    const current = textValue(lavi.current);
    clauses.push(`LAVI ${current ?? 'n/a'}`);
  }

  const pieces: string[] = [];
  if (clauses.length > 0) {
    pieces.push(clauses.join(' · '));
  }
  if (thresholds.length > 0) {
    pieces.push(thresholds.join('; '));
  }
  if (rightHeart.length > 0) {
    pieces.push(`Right heart: ${rightHeart.join('; ')}`);
  }
  if (valveContext.length > 0) {
    pieces.push(`Valves: ${valveContext.join('; ')}`);
  }
  if (dataQuality.ambiguousFindings.length > 0) {
    pieces.push(`Ambiguities: ${dataQuality.ambiguousFindings.join('; ')}`);
  }
  if (dataQuality.missingMetrics.length > 0) {
    pieces.push(`Missing: ${dataQuality.missingMetrics.join(', ')}`);
  }

  return pieces.join('. ');
}

export function buildTTEInsightsSummary(rows: TTETrendRow[]): TTEInsightsSummary {
  const chartableRows = rows.filter(row => row.modality !== 'stress-echo');
  const snapshots = collectMetricSnapshots(chartableRows);
  const thresholds = hasThresholdCrossing(snapshots, chartableRows);
  const rightHeart = summarizeNotes(
    rows.flatMap(row => row.structuralFindings),
    note => note.category === 'rv' || note.category === 'tr'
  );
  const valveContext = summarizeNotes(
    rows.flatMap(row => row.structuralFindings),
    note => note.category === 'ar' || note.category === 'mr'
  );
  const structuralHighlights = summarizeNotes(
    rows.flatMap(row => row.structuralFindings),
    note => note.category === 'other' || note.category === 'context'
  );
  const dataQuality = collectDataQuality(chartableRows);

  const narrative = buildNarrative(snapshots, thresholds, rightHeart, valveContext, dataQuality);

  return {
    headline: buildHeadline(snapshots, chartableRows),
    narrative,
    metrics: snapshots,
    thresholds,
    rightHeartContext: rightHeart,
    valveContext,
    structuralHighlights,
    dataQuality,
    patientFriendly: snapshots.length > 0 ? 'Your heart ultrasound trend has been summarised for your clinician.' : undefined
  };
}
