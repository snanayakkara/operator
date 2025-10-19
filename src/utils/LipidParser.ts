import type {
  LipidParseResult,
  LipidResult,
  LipidSeriesMetadata,
  TherapyPhase
} from '@/types/LipidTypes';

const BLOODS_LINE_REGEX = /bloods?\s*\(([^)]+)\)\s*:\s*(.+)$/i;
const ANALYTE_REGEX = /(ldl\-?c?|total\s+chol(?:esterol)?|tchol|tc|hdl|tg|trig(?:lycerides)?|apob|apo\s*b|non[\-\s]*hdl)/i;
const VALUE_REGEX = /([-+]?\d+(?:\.\d+)?)/;
const THERAPY_NOTE_REGEX = /\(([^)]+)\)\s*$/;

const PRE_THERAPY_KEYWORDS = /(off\s+statin|pre[-\s]?therapy|baseline|statin\s*naive|no\s+statin|untreated)/i;

const DATE_FORMATS = [
  'D MMM YYYY',
  'DD MMM YYYY',
  'D MMM YY',
  'DD MMM YY',
  'D MMMM YYYY',
  'DD MMMM YYYY'
];

/**
 * Lightweight day-first date parsing without bringing moment.js.
 */
function parseDateToISO(dateText: string): string | null {
  const cleaned = dateText.trim().replace(/\./g, '').replace(/st|nd|rd|th/gi, '');
  const parts = cleaned.split(/\s+/);

  if (parts.length < 3) {
    return null;
  }

  const [first, second, third] = parts;
  const day = parseInt(first, 10);
  if (Number.isNaN(day)) return null;

  const monthName = second.toLowerCase();
  const yearNum = parseInt(third, 10);
  if (Number.isNaN(yearNum)) return null;

  const monthMap: Record<string, number> = {
    jan: 0,
    january: 0,
    feb: 1,
    february: 1,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    aug: 7,
    august: 7,
    sep: 8,
    sept: 8,
    september: 8,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11
  };

  const monthIndex = monthMap[monthName];
  if (monthIndex === undefined) return null;

  const paddedDay = String(day).padStart(2, '0');
  const year = yearNum < 100 ? 2000 + yearNum : yearNum;

  const date = new Date(Date.UTC(year, monthIndex, day));
  if (Number.isNaN(date.valueOf())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function normaliseAnalyteToken(token: string): keyof Pick<LipidResult, 'ldl' | 'tchol' | 'hdl' | 'tg' | 'apob' | 'nonHDL'> | null {
  const value = token.toLowerCase();
  if (/^ldl/.test(value)) return 'ldl';
  if (/(total\s+chol|tchol|^tc$)/.test(value)) return 'tchol';
  if (/^hdl/.test(value)) return 'hdl';
  if (/^(tg|trig)/.test(value)) return 'tg';
  if (/apo\s*b|apob/.test(value)) return 'apob';
  if (/non[\-\s]*hdl/.test(value)) return 'nonHDL';
  return null;
}

function extractAnalytes(segment: string, result: LipidResult): void {
  const parts = segment
    .split(/[,;·]/)
    .map(part => part.trim())
    .filter(Boolean);

  for (const part of parts) {
    const analyteMatch = part.match(ANALYTE_REGEX);
    const valueMatch = part.match(VALUE_REGEX);
    if (!analyteMatch || !valueMatch) continue;

    const analyte = normaliseAnalyteToken(analyteMatch[0]);
    if (!analyte) continue;

    const value = parseFloat(valueMatch[0]);
    if (Number.isNaN(value)) continue;

    result[analyte] = value;
  }
}

function deriveNonHDL(result: LipidResult): void {
  if (result.nonHDL != null) return;
  if (result.tchol != null && result.hdl != null) {
    const derived = parseFloat((result.tchol - result.hdl).toFixed(2));
    result.nonHDL = Number.isFinite(derived) ? derived : undefined;
  }
}

function flagPreTherapy(note?: string | null): boolean {
  if (!note) return false;
  return PRE_THERAPY_KEYWORDS.test(note);
}

export function buildTherapyPhases(readings: LipidResult[]): TherapyPhase[] {
  const phases: TherapyPhase[] = [];
  let current: TherapyPhase | null = null;

  for (const reading of readings) {
    if (!reading.therapyNote) {
      if (current) {
        current.endDate = reading.date;
        phases.push(current);
        current = null;
      }
      continue;
    }

    if (current && current.note === reading.therapyNote) {
      current.endDate = reading.date;
    } else {
      if (current) {
        phases.push(current);
      }
      current = {
        label: reading.therapyNote,
        startDate: reading.date,
        note: reading.therapyNote
      };
    }
  }

  if (current) {
    phases.push(current);
  }

  return phases;
}

export function calculateBaseline(readings: LipidResult[]): { value?: number; date?: string } {
  const withLDL = readings.filter(r => typeof r.ldl === 'number') as Array<LipidResult & { ldl: number }>;
  if (withLDL.length === 0) {
    return {};
  }

  const preTherapy = withLDL.filter(r => r.isPreTherapy);
  const targetSet = preTherapy.length > 0 ? preTherapy.slice(0, 3) : withLDL.slice(0, 1);

  const ldlValues = targetSet.map(r => r.ldl).sort((a, b) => a - b);
  const medianIndex = Math.floor(ldlValues.length / 2);
  const median =
    ldlValues.length % 2 === 0
      ? (ldlValues[medianIndex - 1] + ldlValues[medianIndex]) / 2
      : ldlValues[medianIndex];

  return {
    value: Number.isFinite(median) ? parseFloat(median.toFixed(2)) : undefined,
    date: targetSet[0]?.date
  };
}

export function parseLipidProfile(text: string): LipidParseResult {
  const warnings: string[] = [];
  const readings: LipidResult[] = [];

  if (!text || !text.trim()) {
    return {
      readings: [],
      warnings: ['No Investigation Summary content detected.'],
      metadata: { therapyPhases: [] }
    };
  }

  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const match = line.match(BLOODS_LINE_REGEX);
    if (!match) continue;

    const [, rawDate, remainder] = match;
    const isoDate = parseDateToISO(rawDate);
    if (!isoDate) {
      warnings.push(`Could not parse date "${rawDate}"`);
      continue;
    }

    let workingSegment = remainder.trim();
    let therapyNote: string | null = null;
    const therapyMatch = workingSegment.match(THERAPY_NOTE_REGEX);
    if (therapyMatch) {
      therapyNote = therapyMatch[1].trim();
      workingSegment = workingSegment.replace(THERAPY_NOTE_REGEX, '').trim();
    }

    const reading: LipidResult = {
      id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `lipid-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      date: isoDate,
      source: line,
      therapyNote,
      isPreTherapy: flagPreTherapy(therapyNote)
    };

    extractAnalytes(workingSegment, reading);
    deriveNonHDL(reading);

    if (
      reading.ldl == null &&
      reading.tchol == null &&
      reading.hdl == null &&
      reading.tg == null &&
      reading.apob == null &&
      reading.nonHDL == null
    ) {
      warnings.push(`No lipid values recognised for "${line}"`);
      continue;
    }

    readings.push(reading);
  }

  readings.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const metadata = buildLipidMetadata(readings);

  return {
    readings,
    warnings,
    metadata
  };
}

export function buildLipidMetadata(readings: LipidResult[]): LipidSeriesMetadata {
  const sorted = [...readings].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const phases = buildTherapyPhases(sorted);
  const { value: baselineLDL, date: baselineDate } = calculateBaseline(sorted);
  const latest = sorted.at(-1);

  return {
    baselineLDL,
    baselineSourceDate: baselineDate,
    latestDate: latest?.date,
    latestLDL: latest?.ldl,
    latestTotalChol: latest?.tchol,
    therapyPhases: phases
  };
}
