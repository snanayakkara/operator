import type {
  LipidInsightsContext,
  LipidInsightsSummary,
  LipidOverlayConfig,
  LipidResult,
  LipidSeriesMetadata,
  LipidTimeFilter
} from '@/types/LipidTypes';

const MS_PER_DAY = 86400000;
const MONTH_IN_MS = MS_PER_DAY * 30.4375;

function parseISO(date: string | undefined): Date | null {
  if (!date) return null;
  const parsed = new Date(date);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

function monthsBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / MONTH_IN_MS;
}

function subMonths(date: Date, months: number): Date {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() - months);
  return copy;
}

function formatNumber(value: number, decimals = 1): string {
  return value.toFixed(decimals);
}

function percentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function computeLinearSlope(points: Array<{ x: number; y: number }>): number | null {
  if (points.length < 2) return null;
  const n = points.length;
  const sumX = points.reduce((acc, p) => acc + p.x, 0);
  const sumY = points.reduce((acc, p) => acc + p.y, 0);
  const sumXY = points.reduce((acc, p) => acc + p.x * p.y, 0);
  const sumXX = points.reduce((acc, p) => acc + p.x * p.x, 0);
  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denominator;
  return slope;
}

function classifySlope(slope: number | null): LipidInsightsContext['slopeClassification'] {
  if (slope == null) return 'insufficient-data';
  if (slope > 0.05) return 'rising';
  if (slope < -0.05) return 'falling';
  return 'stable';
}

function getTimeframeMonths(filter: LipidTimeFilter): number {
  switch (filter) {
    case '3m':
      return 3;
    case '6m':
      return 6;
    case '12m':
      return 12;
    default:
      return Infinity;
  }
}

function computeTimeInTarget(
  readings: LipidResult[],
  latestDate: Date | null,
  filter: LipidTimeFilter,
  bandThreshold: number,
  percentReduction?: number,
  baseline?: number
) {
  if (!latestDate) {
    return { percentage: 0, lastAtGoalDate: undefined };
  }

  const months = getTimeframeMonths(filter);
  const windowStart = months === Infinity ? null : subMonths(latestDate, months);

  const eligible = readings.filter(r => {
    if (r.ldl == null) return false;
    if (windowStart) {
      const date = parseISO(r.date);
      if (!date || date < windowStart) return false;
    }
    return true;
  });

  if (eligible.length === 0) {
    return { percentage: 0, lastAtGoalDate: undefined };
  }

  const meetsTarget = eligible.filter(r => {
    if (r.ldl == null) return false;
    let ok = r.ldl < bandThreshold + 1e-6;
    if (ok && percentReduction && baseline) {
      const reduction = baseline - r.ldl;
      const percent = (reduction / baseline) * 100;
      ok = percent >= percentReduction - 0.5;
    }
    return ok;
  });

  const lastAtGoal = meetsTarget.length > 0 ? meetsTarget.at(-1)?.date : undefined;

  return {
    percentage: meetsTarget.length / eligible.length,
    lastAtGoalDate: lastAtGoal
  };
}

function computeLargestRise(readings: LipidResult[]) {
  let largest: { startDate: string; endDate: string; delta: number } | undefined;

  for (let i = 1; i < readings.length; i += 1) {
    const prev = readings[i - 1];
    const curr = readings[i];
    if (prev.ldl == null || curr.ldl == null) continue;
    const delta = curr.ldl - prev.ldl;
    if (delta <= 0) continue;
    if (!largest || delta > largest.delta) {
      largest = {
        startDate: prev.date,
        endDate: curr.date,
        delta: parseFloat(delta.toFixed(2))
      };
    }
  }

  return largest;
}

function computeBestNadir(readings: LipidResult[]) {
  const candidates = readings.filter(r => typeof r.ldl === 'number') as Array<LipidResult & { ldl: number }>;
  if (candidates.length === 0) return undefined;
  candidates.sort((a, b) => a.ldl - b.ldl);
  const best = candidates[0];
  return {
    date: best.date,
    value: parseFloat(best.ldl.toFixed(2)),
    therapyNote: best.therapyNote ?? null
  };
}

function detectTherapyResponseNote(readings: LipidResult[], baseline?: number) {
  if (readings.length < 2 || baseline == null) return undefined;

  const transitions = readings.filter(r => r.therapyNote && !r.isPreTherapy);
  if (transitions.length === 0) return undefined;

  const firstOnTherapy = transitions[0];
  const idx = readings.findIndex(r => r.id === firstOnTherapy.id);
  const pre = readings.slice(0, idx).filter(r => typeof r.ldl === 'number') as Array<LipidResult & { ldl: number }>;
  const post = readings.slice(idx).filter(r => typeof r.ldl === 'number') as Array<LipidResult & { ldl: number }>;
  if (pre.length === 0 || post.length === 0) return undefined;

  const preMedian = pre.reduce((acc, r) => acc + r.ldl, 0) / pre.length;
  const postBest = Math.min(...post.map(r => r.ldl));
  const absoluteReduction = preMedian - postBest;
  const percentReduction = (absoluteReduction / preMedian) * 100;

  if (!Number.isFinite(percentReduction)) return undefined;

  let qualifier = 'expected';
  if (percentReduction < 30) {
    qualifier = 'sub-expected';
  } else if (percentReduction >= 50) {
    qualifier = 'excellent';
  }

  return `Therapy response ${qualifier}: ↓${absoluteReduction.toFixed(1)} mmol/L (${Math.round(percentReduction)}%) from pre-therapy median.`;
}

function detectRiskContext(rawText: string): { strictOverlayRecommended: boolean; note?: string } {
  if (!rawText) return { strictOverlayRecommended: false };

  const ctca = /ctca|coronary\s+angio/i.test(rawText);
  const plaque = /(plaque|stenosis|calcium|calcified)/i.test(rawText);

  if (ctca && plaque) {
    return {
      strictOverlayRecommended: true,
      note: 'CTCA evidence of plaque – consider secondary prevention targets.'
    };
  }

  return { strictOverlayRecommended: false };
}

export function buildLipidInsightsContext(
  readings: LipidResult[],
  metadata: LipidSeriesMetadata,
  overlay: LipidOverlayConfig,
  selectedBandId: string,
  selectedFilter: LipidTimeFilter,
  rawText: string
): LipidInsightsContext {
  if (readings.length === 0) {
    return {
      slopeClassification: 'insufficient-data',
      timeInTarget: { timeframe: selectedFilter, percentage: 0 }
    };
  }

  const latest = readings.at(-1)!;
  const previous = readings.length > 1 ? readings[readings.length - 2] : undefined;

  const latestDateObj = parseISO(latest.date);
  const baselineLDL = metadata.baselineLDL;

  const deltaSinceBaseline =
    baselineLDL != null && latest.ldl != null ? parseFloat((latest.ldl - baselineLDL).toFixed(2)) : undefined;
  const percentReduction =
    baselineLDL != null && latest.ldl != null ? ((baselineLDL - latest.ldl) / baselineLDL) * 100 : undefined;

  const deltaSincePrevious =
    previous?.ldl != null && latest.ldl != null ? parseFloat((latest.ldl - previous.ldl).toFixed(2)) : undefined;
  const percentDeltaSincePrevious =
    previous?.ldl != null && latest.ldl != null ? ((latest.ldl - previous.ldl) / previous.ldl) * 100 : undefined;

  const windowStart = latestDateObj ? subMonths(latestDateObj, 12) : null;
  const slopePoints = readings
    .filter(r => {
      if (!windowStart || !latestDateObj) return true;
      const date = parseISO(r.date);
      return date != null && date >= windowStart;
    })
    .filter(r => typeof r.ldl === 'number')
    .map(r => {
      const date = parseISO(r.date)!;
      const baselineDate = windowStart ?? parseISO(readings[0].date) ?? date;
      return {
        x: monthsBetween(baselineDate, date),
        y: r.ldl as number
      };
    });

  const slope = computeLinearSlope(slopePoints);
  const slopeClassification = classifySlope(slope);

  const selectedBand = overlay.bands.find(b => b.id === selectedBandId) ?? overlay.bands[0];
  const timeInTarget = computeTimeInTarget(
    readings,
    latestDateObj,
    selectedFilter,
    selectedBand.threshold,
    selectedBand.percentReduction,
    baselineLDL
  );

  const nadir = computeBestNadir(readings);
  const largestRise = computeLargestRise(readings);
  const therapyResponse = detectTherapyResponseNote(readings, baselineLDL);
  const riskContext = detectRiskContext(rawText);

  return {
    baselineLDL,
    baselineDate: metadata.baselineSourceDate,
    latestLDL: latest.ldl,
    latestTotal: latest.tchol,
    deltaSinceBaseline,
    percentReduction,
    deltaSincePrevious,
    percentDeltaSincePrevious,
    monthlySlope: slope == null ? undefined : parseFloat(slope.toFixed(2)),
    slopeClassification,
    timeInTarget: {
      timeframe: selectedFilter,
      percentage: timeInTarget.percentage,
      lastAtGoalDate: timeInTarget.lastAtGoalDate
    },
    bestNadir: nadir,
    largestRise,
    therapyResponseNote: therapyResponse,
    strictOverlayRecommended: riskContext.strictOverlayRecommended,
    riskContext: riskContext.note
  };
}

export function buildLipidInsightsSummary(context: LipidInsightsContext, overlay: LipidOverlayConfig): LipidInsightsSummary {
  const formatDelta = (delta?: number, percent?: number) => {
    if (delta == null || percent == null) return 'Δ n/a';
    const sign = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
    return `${sign}${Math.abs(delta).toFixed(1)} mmol/L (${percent > 0 ? '+' : ''}${Math.round(percent)}%)`;
  };

  const latestSummary = context.latestLDL != null
    ? `Latest LDL ${context.latestLDL.toFixed(1)} mmol/L${context.latestTotal != null ? `, Total Chol ${context.latestTotal.toFixed(1)} mmol/L` : ''} (${formatDelta(context.deltaSincePrevious, context.percentDeltaSincePrevious)} vs prior; ${formatDelta(context.deltaSinceBaseline, context.percentReduction)} vs baseline).`
    : 'Latest LDL not available.';

  let trajectory = 'Trend assessment unavailable.';
  switch (context.slopeClassification) {
    case 'rising':
      trajectory = `LDL is rising ≈${context.monthlySlope?.toFixed(2)} mmol/L per month over recent data.`;
      break;
    case 'falling':
      trajectory = `LDL is falling ≈${Math.abs(context.monthlySlope ?? 0).toFixed(2)} mmol/L per month.`;
      break;
    case 'stable':
      trajectory = 'LDL has remained broadly stable over the recent window.';
      break;
    default:
      break;
  }

  const timeInTargetText = `Time-in-target (${context.timeInTarget.timeframe}): ${percentage(context.timeInTarget.percentage)}${context.timeInTarget.lastAtGoalDate ? `; last at-goal ${context.timeInTarget.lastAtGoalDate}` : ''}.`;

  const nadirText = context.bestNadir
    ? `Best on-therapy nadir ${context.bestNadir.value.toFixed(1)} mmol/L (${context.bestNadir.date}${context.bestNadir.therapyNote ? ` – ${context.bestNadir.therapyNote}` : ''}).`
    : undefined;

  const riseText = context.largestRise
    ? `Largest month-to-month rise: +${context.largestRise.delta.toFixed(1)} mmol/L (${context.largestRise.startDate} → ${context.largestRise.endDate}).`
    : undefined;

  const therapyResponse = context.therapyResponseNote;
  const riskHook = context.riskContext;

  const whyItMatters = 'Every ~1 mmol/L LDL-C reduction yields ≈21–25% relative ASCVD risk reduction; align therapy with chosen overlay to capture this benefit.';

  return {
    latestSummary,
    trajectory,
    timeInTarget: timeInTargetText,
    therapyResponse,
    nadirAndRise: [nadirText, riseText].filter(Boolean).join(' ') || undefined,
    riskContext: riskHook,
    whyItMatters
  };
}
