import { logger } from '@/utils/Logger';
import type {
  TTETrendParseResult,
  TTETrendParserOptions,
  TTETrendRow,
  TTETrendNote,
  TTETrendEvent,
  TTENumericValue,
  TTETextValue,
  TTEValveGrade
} from '@/types/TTETrendTypes';

const MONTH_MAP: Record<string, number> = {
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

const SEVERITY_TERMS = [
  'trace',
  'trivial',
  'mild',
  'mildly',
  'moderate',
  'moderately',
  'mod',
  'severe',
  'severely'
];

interface DateParseResult {
  iso?: string;
  precision: 'day' | 'month' | 'unknown';
  warnings: string[];
  label?: string;
}

interface RawEntry {
  modality: 'tte' | 'echo' | 'stress-echo';
  header: string;
  body: string[];
  sourceLines: string[];
}

const SAFE_ID = (): string => {
  const globalCrypto: Crypto | undefined = typeof globalThis !== 'undefined' ? (globalThis.crypto as Crypto | undefined) : undefined;
  if (globalCrypto && typeof globalCrypto.randomUUID === 'function') {
    return globalCrypto.randomUUID();
  }
  return `tte-${Math.random().toString(36).slice(2, 11)}`;
};

function normalizeOrdinal(input: string): string {
  return input.replace(/(\d+)(st|nd|rd|th)/gi, '$1');
}

function toISODate(year: number, month: number, day: number): string {
  const utc = new Date(Date.UTC(year, month, day));
  return utc.toISOString().slice(0, 10);
}

function parseDateToken(token: string): DateParseResult {
  const warnings: string[] = [];
  if (!token) {
    return { precision: 'unknown', warnings: [] };
  }

  const cleaned = normalizeOrdinal(token.replace(/[.,]/g, ' ')).replace(/\s+/g, ' ').trim();

  // Pattern: DD Month YYYY (AU day-first)
  const fullMatch = cleaned.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (fullMatch) {
    const [, dayStr, monthStr, yearStr] = fullMatch;
    const day = Number(dayStr);
    const monthIdx = MONTH_MAP[monthStr.toLowerCase()];
    const year = Number(yearStr);
    if (Number.isInteger(day) && monthIdx != null && Number.isInteger(year)) {
      return {
        iso: toISODate(year, monthIdx, day),
        precision: 'day',
        warnings: [],
        label: `${dayStr.padStart(2, '0')} ${monthStr.slice(0, 3)} ${year}`
      };
    }
  }

  // Pattern: Month YYYY
  const monthMatch = cleaned.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (monthMatch) {
    const [, monthStr, yearStr] = monthMatch;
    const monthIdx = MONTH_MAP[monthStr.toLowerCase()];
    const year = Number(yearStr);
    if (monthIdx != null && Number.isInteger(year)) {
      return {
        iso: toISODate(year, monthIdx, 1),
        precision: 'month',
        warnings: [],
        label: `${monthStr.slice(0, 3)} ${year}`
      };
    }
  }

  // Pattern: DD/MM/YYYY (day-first)
  const slashMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const [, dayStr, monthStr, yearStr] = slashMatch;
    const day = Number(dayStr);
    const monthIdx = Number(monthStr) - 1;
    let year = Number(yearStr);
    if (yearStr.length === 2) {
      year += year >= 70 ? 1900 : 2000;
    }
    if (day >= 1 && day <= 31 && monthIdx >= 0 && monthIdx <= 11) {
      return {
        iso: toISODate(year, monthIdx, day),
        precision: 'day',
        warnings: [],
        label: `${dayStr.padStart(2, '0')}/${monthStr.padStart(2, '0')}/${year}`
      };
    }
  }

  // Pattern: YYYY
  const yearMatch = cleaned.match(/^(\d{4})$/);
  if (yearMatch) {
    const year = Number(yearMatch[1]);
    return {
      iso: toISODate(year, 0, 1),
      precision: 'month',
      warnings: [`Only year provided (${year}); assuming January baseline.`],
      label: String(year)
    };
  }

  if (cleaned.length > 0) {
    warnings.push(`Unable to parse date token "${token}"`);
  }

  return {
    precision: 'unknown',
    warnings,
    label: cleaned || undefined
  };
}

function isEntryStart(line: string): boolean {
  return /^(?:stress\s+)?echo\b/i.test(line) || /^tte\b/i.test(line);
}

function isTTEHeading(line: string): boolean {
  return /^tte[s]?:?$/i.test(line.replace(/\s+/g, ''));
}

function extractModality(line: string): 'tte' | 'echo' | 'stress-echo' {
  if (/^stress\s+echo/i.test(line)) return 'stress-echo';
  if (/^echo/i.test(line)) return 'echo';
  return 'tte';
}

function splitParenthetical(line: string): { inner: string | null; remainder: string } {
  const match = line.match(/\(([^)]+)\)/);
  if (match) {
    return {
      inner: match[1],
      remainder: line.replace(match[0], '').trim()
    };
  }
  return { inner: null, remainder: line.trim() };
}

function createNumericValue(
  match: RegExpMatchArray,
  base: Partial<TTENumericValue> & { value: number; unit?: string }
): TTENumericValue {
  return {
    id: SAFE_ID(),
    type: 'numeric',
    value: base.value,
    unit: base.unit,
    display:
      base.display ??
      (base.unit ? `${base.value}${base.unit.startsWith('%') ? '%' : ` ${base.unit}`}` : String(base.value)),
    sourceText: match[0].trim(),
    rawText: match.input?.trim(),
    flags: base.flags,
    qualitativeLabel: base.qualitativeLabel,
    precision: base.precision ?? 'measured',
    highlight: base.highlight
  };
}

function createTextValue(match: RegExpMatchArray, text: string, flags?: string[]): TTETextValue {
  return {
    id: SAFE_ID(),
    type: 'text',
    text,
    sourceText: match[0].trim(),
    rawText: match.input?.trim(),
    flags
  };
}

function pushUnique<T>(array: T[], value: T): void {
  if (!array.includes(value)) {
    array.push(value);
  }
}

function buildValveGrade(
  valve: 'ar' | 'mr' | 'tr',
  match: RegExpMatchArray,
  severity: string,
  qualifiers?: string[]
): TTEValveGrade {
  return {
    id: SAFE_ID(),
    valve,
    severity,
    qualifiers,
    sourceText: match[0].trim(),
    rawText: match.input?.trim()
  };
}

function aggregateLines(lines: string[]): string {
  return lines
    .map(line => line.trim())
    .filter(Boolean)
    .join(' ');
}

function parseEntries(text: string): RawEntry[] {
  const entries: RawEntry[] = [];
  const lines = text.split(/\r?\n/);
  let current: RawEntry | null = null;
  let insideTTEList = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      if (current) {
        current.body.push('');
      }
      continue;
    }

    const normalized = trimmed.replace(/^[•·▪◦•\-]\s*/, '');

    if (isTTEHeading(normalized)) {
      insideTTEList = true;
      continue;
    }

    if (insideTTEList && /^[•·▪◦\-]/.test(rawLine.trim())) {
      if (current) {
        entries.push(current);
      }
      current = {
        modality: 'tte',
        header: normalized,
        body: [],
        sourceLines: [rawLine]
      };
      continue;
    }

    if (isEntryStart(normalized)) {
      if (current) {
        entries.push(current);
      }
      current = {
        modality: extractModality(normalized),
        header: normalized,
        body: [],
        sourceLines: [rawLine]
      };
      insideTTEList = false;
      continue;
    }

    if (current) {
      current.body.push(normalized);
      current.sourceLines.push(rawLine);
    }
  }

  if (current) {
    entries.push(current);
  }

  return entries;
}

function parseHeaderForDateAndSite(header: string): {
  date?: string;
  datePrecision: 'day' | 'month' | 'unknown';
  site?: string;
  warnings: string[];
  label?: string;
} {
  let working = header;
  const { inner, remainder } = splitParenthetical(header);
  let site: string | undefined;
  let dateResult: DateParseResult = { precision: 'unknown', warnings: [] };

  if (inner) {
    const parts = inner.split(/,\s*/).filter(Boolean);
    for (const part of parts) {
      const result = parseDateToken(part);
      if (result.iso) {
        dateResult = result;
      } else if (!site) {
        site = part.trim();
      }
    }
  }

  if (!dateResult.iso) {
    const remainderParts = remainder.split(':')[0].split(',');
    for (const part of remainderParts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const result = parseDateToken(trimmed);
      if (result.iso) {
        dateResult = result;
      } else if (!site && trimmed.length > 0 && trimmed.split(' ').length <= 3) {
        if (!/^(?:TTE|Echo|Stress Echo)/i.test(trimmed)) {
          site = trimmed;
        }
      }
    }
  }

  working = remainder;

  return {
    date: dateResult.iso,
    datePrecision: dateResult.precision,
    site,
    warnings: dateResult.warnings,
    label: dateResult.label
  };
}

function detectQualitativeEF(text: string): string | null {
  const lower = text.toLowerCase();
  if (/normal\s+lv\s+(function|size\s+and\s+function|systolic\s+function)/.test(lower)) return 'normal LV function';
  if (/(mildly?\s+reduced|mild\s+lv\s+dysfunction|mild\s+systolic\s+dysfunction)/.test(lower)) return 'mild LV dysfunction';
  if (/(moderately?\s+reduced|mod(erate)?\s+lv\s+dysfunction|mod\s+dysfunction)/.test(lower)) return 'moderate LV dysfunction';
  if (/(severely?\s+reduced|severe\s+lv\s+dysfunction|severe\s+systolic\s+dysfunction)/.test(lower)) return 'severe LV dysfunction';
  if (/hyperdynamic/.test(lower)) return 'hyperdynamic LV function';
  if (/low\s+normal/.test(lower)) return 'low-normal LV function';
  return null;
}

function detectSiteFromBody(text: string): string | undefined {
  const match = text.match(/\b(?:at|performed\s+at)\s+([A-Za-z\s]+(?:Hospital|Heart|Centre|Center|Clinic))\b/i);
  if (match) {
    return match[1].trim();
  }
  return undefined;
}

function parseEntry(entry: RawEntry): { row: TTETrendRow; event?: TTETrendEvent; rowWarnings: string[] } {
  const combined = aggregateLines([entry.header, ...entry.body]);
  const headerParse = parseHeaderForDateAndSite(entry.header);
  const rowWarnings: string[] = [...headerParse.warnings];

  let site = headerParse.site;
  if (!site) {
    site = detectSiteFromBody(combined);
  }

  const row: TTETrendRow = {
    id: SAFE_ID(),
    modality: entry.modality,
    label: entry.header.split(':')[0].trim(),
    dateIso: headerParse.date,
    datePrecision: headerParse.datePrecision,
    site,
    capturedAt: Date.now(),
    valveGrades: {},
    structuralFindings: [],
    notes: [],
    rawSource: entry.sourceLines.join('\n')
  };

  const lower = combined.toLowerCase();
  const event: TTETrendEvent | undefined =
    entry.modality === 'stress-echo'
      ? {
          id: SAFE_ID(),
          modality: 'stress-echo',
          label: row.label,
          description: combined,
          dateIso: row.dateIso,
          datePrecision: row.datePrecision
        }
      : undefined;

  const seenFields = new Set<string>();

  // LVEF numeric
  const efRegex = /\b(?:lvef|ef)\s*(?:[:=]?\s*)?(\d{1,3}(?:\.\d+)?)\s*(%|percent)?/gi;
  const efMatches = combined.matchAll(efRegex);
  for (const match of efMatches) {
    const value = Number(match[1]);
    if (!Number.isFinite(value)) continue;
    if (!row.lvef || value !== (row.lvef as TTENumericValue)?.value) {
      row.lvef = createNumericValue(match, {
        value,
        unit: '%',
        display: `${value}%`
      });
      seenFields.add('lvef');
    }
  }

  // Qualitative EF
  if (!row.lvef || (row.lvef && (row.lvef as TTENumericValue).value == null)) {
    const qualitative = detectQualitativeEF(lower);
    if (qualitative) {
      const match = combined.match(new RegExp(qualitative, 'i'));
      if (match) {
        row.lvefCategory = createTextValue(match, qualitative);
        seenFields.add('lvefCategory');
      }
    }
  }

  // GLS
  const glsRegex = /\bgls\s*(?:[:=]\s*)?(-?\d{1,2}(?:\.\d+)?)\b/gi;
  for (const match of combined.matchAll(glsRegex)) {
    const value = Number(match[1]);
    if (!Number.isFinite(value)) continue;
    row.gls = createNumericValue(match, {
      value,
      unit: '%',
      display: `${value}%`
    });
  }

  // LVEDD
  const lveddRegex = /\blvedd\s*[:=]?\s*(\d{2,3}(?:\.\d+)?)\s*(mm)?/gi;
  for (const match of combined.matchAll(lveddRegex)) {
    const value = Number(match[1]);
    if (!Number.isFinite(value)) continue;
    row.lvedd = createNumericValue(match, {
      value,
      unit: 'mm'
    });
  }

  // LAVI
  const laviRegex = /\blavi\s*[:=]?\s*(\d{2,3}(?:\.\d+)?)\s*(?:ml\/m2|ml\/m²|mlm2|ml)?/gi;
  for (const match of combined.matchAll(laviRegex)) {
    const value = Number(match[1]);
    if (!Number.isFinite(value)) continue;
    row.lavi = createNumericValue(match, {
      value,
      unit: 'mL/m²'
    });
  }

  // TAPSE
  const tapseRegex = /\btapse\s*[:=]?\s*(\d{1,2}(?:\.\d+)?)\s*(?:mm)?/gi;
  for (const match of combined.matchAll(tapseRegex)) {
    const value = Number(match[1]);
    if (!Number.isFinite(value)) continue;
    row.tapse = createNumericValue(match, {
      value,
      unit: 'mm'
    });
  }

  // AV MPG / mean gradient
  const avMpgRegex = /\b(?:av\s*)?(?:mean\s*gradient|mpg)\s*[:=]?\s*(\d{1,2}(?:\.\d+)?)\s*(?:mm\s*hg|mmhg|mm)?/gi;
  for (const match of combined.matchAll(avMpgRegex)) {
    const value = Number(match[1]);
    if (!Number.isFinite(value)) continue;
    row.avMpg = createNumericValue(match, {
      value,
      unit: 'mmHg',
      display: `${value} mmHg`
    });
  }

  // DI
  const diRegex = /\bdi\s*[:=]?\s*(0\.\d{1,2}|\d(?:\.\d{1,2})?)\b/gi;
  for (const match of combined.matchAll(diRegex)) {
    const value = Number(match[1]);
    if (!Number.isFinite(value)) continue;
    row.di = createNumericValue(match, { value, display: value.toFixed(2) });
  }

  // AVA
  const avaRegex = /\bava\s*[:=]?\s*(\d(?:\.\d+)?)\s*(?:cm2|cm²|cm\^2|cm\*cm)?/gi;
  for (const match of combined.matchAll(avaRegex)) {
    const value = Number(match[1]);
    if (!Number.isFinite(value)) continue;
    row.ava = createNumericValue(match, {
      value,
      unit: 'cm²',
      display: `${value.toFixed(2)} cm²`
    });
  }

  // SVI
  const sviRegex = /\bsvi\s*[:=]?\s*(\d{2,3}(?:\.\d+)?)\s*(?:ml\/m2|ml\/m²|ml)?/gi;
  for (const match of combined.matchAll(sviRegex)) {
    const value = Number(match[1]);
    if (!Number.isFinite(value)) continue;
    row.svi = createNumericValue(match, {
      value,
      unit: 'mL/m²'
    });
  }

  // RVSP/PASP/TR gradient
  const rvspRegex =
    /\b(RVSP|PASP|TR\s*(?:gradient|∆|delta|grad))\s*[:=]?\s*(\d{1,3}(?:\.\d+)?)\s*(?:mm\s*hg|mmhg|mm)?(\s*\+\s*RA)?/gi;
  for (const match of combined.matchAll(rvspRegex)) {
    const label = match[1].toUpperCase();
    const value = Number(match[2]);
    const hasPlusRA = Boolean(match[3]);
    if (!Number.isFinite(value)) continue;
    if (hasPlusRA || /TR/.test(label)) {
      row.trGradient = createNumericValue(match, {
        value,
        unit: 'mmHg',
        flags: ['requires-rap'],
        highlight: '+RA',
        display: `${value} mmHg`
      });
      row.pasp = createTextValue(match, `${label} ${value}+RA`, ['rap-unknown']);
      pushUnique(rowWarnings, `Detected ${label} ${value}+RA – RAP not provided.`);
    } else if (label === 'PASP') {
      row.pasp = createNumericValue(match, {
        value,
        unit: 'mmHg',
        display: `${value} mmHg`
      });
    } else {
      row.rvsp = createNumericValue(match, {
        value,
        unit: 'mmHg',
        display: `${value} mmHg`
      });
    }
  }

  // Valve severity (short forms like mod-sev AR)
  const valveRegex = new RegExp(
    `\\b((?:${SEVERITY_TERMS.join('|')})(?:[-/\\s](?:${SEVERITY_TERMS.join('|')}))?)\\s+(AR|MR|TR|aortic regurg(?:itation)?|mitral regurg(?:itation)?|tricuspid regurg(?:itation)?)`,
    'gi'
  );
  for (const match of combined.matchAll(valveRegex)) {
    const severityRaw = match[1].replace(/\s+/g, ' ').toLowerCase();
    const target = match[2].toLowerCase();
    let valve: 'ar' | 'mr' | 'tr' | null = null;
    if (target.startsWith('aortic') || target === 'ar') valve = 'ar';
    if (target.startsWith('mitral') || target === 'mr') valve = 'mr';
    if (target.startsWith('tricuspid') || target === 'tr') valve = 'tr';
    if (!valve) continue;
    const severity = severityRaw.replace(/moderately/g, 'mod').replace(/mildly/g, 'mild');
    const qualifiers: string[] = [];
    if (severity.includes('mod') && severity.includes('severe')) qualifiers.push('mixed-severity');
    if (severity.includes('mild') && severity.includes('mod')) qualifiers.push('mild-mod');
    row.valveGrades[valve] = buildValveGrade(valve, match, severity, qualifiers.length ? qualifiers : undefined);
  }

  // Notes for AR specifics: holodiastolic flow reversal, PHT
  const notes: TTETrendNote[] = [];
  const holoRegex = /\bholodiastolic\s+flow\s+reversal\b[^.]*?(ascending|descending|upper\s+desc(?:ending)?)?\s*aorta?/gi;
  for (const match of combined.matchAll(holoRegex)) {
    notes.push({
      id: SAFE_ID(),
      label: 'Holodiastolic flow reversal',
      description: match[0].trim(),
      sourceText: match[0].trim(),
      category: 'ar'
    });
  }

  const phtRegex = /\bPHT\s*[:=]?\s*(\d{2,4})\b/gi;
  for (const match of combined.matchAll(phtRegex)) {
    notes.push({
      id: SAFE_ID(),
      label: 'AR pressure half-time',
      description: `PHT ${match[1]} ms`,
      sourceText: match[0].trim(),
      category: 'ar'
    });
  }

  const rvDilationRegex = /\b(rv|right ventricle)\s+(?:mildly\s+|moderately\s+|severely\s+)?(?:dilated|enlarged)\b/gi;
  for (const match of combined.matchAll(rvDilationRegex)) {
    notes.push({
      id: SAFE_ID(),
      label: 'RV dilation',
      description: match[0].trim(),
      sourceText: match[0].trim(),
      category: 'rv'
    });
  }

  const raEnlargementRegex = /\b(right atrium|RA)\s+(?:mildly\s+|moderately\s+|severely\s+)?(?:enlarged|dilated)\b/gi;
  for (const match of combined.matchAll(raEnlargementRegex)) {
    notes.push({
      id: SAFE_ID(),
      label: 'RA enlargement',
      description: match[0].trim(),
      sourceText: match[0].trim(),
      category: 'rv'
    });
  }

  const rvFunctionRegex = /\bRV\s+(?:function|systolic\s+function)\s+(?:normal|reduced|depressed|impaired)\b/gi;
  for (const match of combined.matchAll(rvFunctionRegex)) {
    notes.push({
      id: SAFE_ID(),
      label: 'RV function',
      description: match[0].trim(),
      sourceText: match[0].trim(),
      category: 'rv'
    });
  }

  if (entry.modality === 'stress-echo') {
    row.stressEchoDetails = combined;
  }

  row.structuralFindings = notes;
  row.notes = [...notes];

  if (!row.dateIso) {
    rowWarnings.push(`No reliable date identified for "${row.label}".`);
  }

  if (!seenFields.has('lvef') && !row.lvefCategory) {
    rowWarnings.push(`No EF value detected for "${row.label}".`);
  }

  return { row, event, rowWarnings };
}

export function parseTTETrends(text: string, options?: TTETrendParserOptions): TTETrendParseResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      rows: [],
      events: [],
      warnings: ['No input text provided.'],
      notes: []
    };
  }

  const rawEntries = parseEntries(trimmed);
  const rows: TTETrendRow[] = [];
  const events: TTETrendEvent[] = [];
  const warnings: string[] = [];
  const notes: TTETrendNote[] = [];

  rawEntries.forEach(entry => {
    const { row, event, rowWarnings } = parseEntry(entry);
    rows.push(row);
    if (event) {
      events.push(event);
    }
    if (rowWarnings.length > 0) {
      warnings.push(...rowWarnings);
    }
    notes.push(...row.structuralFindings);
  });

  rows.sort((a, b) => {
    if (a.dateIso && b.dateIso) {
      return a.dateIso.localeCompare(b.dateIso);
    }
    if (a.dateIso) return -1;
    if (b.dateIso) return 1;
    return a.label.localeCompare(b.label);
  });

  logger.info('Parsed TTE trend entries', {
    agent: options?.agentType ?? 'tte-trend',
    rows: rows.length,
    events: events.length,
    warnings: warnings.length
  });

  return {
    rows,
    events,
    warnings,
    notes
  };
}
