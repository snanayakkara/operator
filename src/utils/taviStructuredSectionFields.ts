export const STRUCTURED_SECTION_KEYS = [
  'echocardiography',
  'laboratory',
  'ecg',
  'investigations'
] as const;

export type StructuredSectionKey = (typeof STRUCTURED_SECTION_KEYS)[number];

export type StructuredFieldType = 'text' | 'number' | 'textarea';

export interface StructuredFieldConfig {
  key: string;
  label: string;
  type: StructuredFieldType;
  placeholder?: string;
  options?: string[];
  aliases?: string[];
  step?: string;
  inputMode?: 'decimal' | 'numeric';
}

export interface StructuredSectionConfig {
  fields: StructuredFieldConfig[];
  catchAllFieldKey?: string;
  extraLabel?: string;
}

const EF_OPTIONS = ['Normal', 'Low normal', 'Mild', 'Moderate', 'Severe'];

export const STRUCTURED_SECTION_CONFIGS: Record<StructuredSectionKey, StructuredSectionConfig> = {
  echocardiography: {
    catchAllFieldKey: 'comments',
    fields: [
      {
        key: 'ef',
        label: 'EF',
        type: 'text',
        options: EF_OPTIONS,
        placeholder: 'e.g. 55 or Normal',
        aliases: ['ef', 'lvef', 'ejection fraction', 'systolic function']
      },
      {
        key: 'mpg',
        label: 'MPG',
        type: 'number',
        step: '0.1',
        inputMode: 'decimal',
        placeholder: 'Mean gradient',
        aliases: ['mpg', 'mean gradient', 'mean pressure gradient']
      },
      {
        key: 'ava',
        label: 'AVA',
        type: 'number',
        step: '0.01',
        inputMode: 'decimal',
        placeholder: 'Valve area',
        aliases: ['ava', 'aortic valve area']
      },
      {
        key: 'di',
        label: 'DI',
        type: 'number',
        step: '0.01',
        inputMode: 'decimal',
        placeholder: 'Dimensionless index',
        aliases: ['di', 'dimensionless index']
      },
      {
        key: 'svi',
        label: 'SVi',
        type: 'number',
        step: '0.1',
        inputMode: 'decimal',
        placeholder: 'Stroke volume index',
        aliases: ['svi', 'stroke volume index']
      },
      {
        key: 'rvsp',
        label: 'RVSP',
        type: 'number',
        step: '0.1',
        inputMode: 'decimal',
        placeholder: 'RV systolic pressure',
        aliases: ['rvsp', 'right ventricular systolic pressure']
      },
      {
        key: 'mr',
        label: 'MR',
        type: 'text',
        placeholder: 'Grade',
        aliases: ['mr', 'mitral regurgitation']
      },
      {
        key: 'comments',
        label: 'Comments',
        type: 'textarea',
        placeholder: 'Free text comments',
        aliases: ['comments', 'comment', 'notes']
      }
    ]
  },
  laboratory: {
    extraLabel: 'Notes',
    fields: [
      {
        key: 'hb',
        label: 'Hb (g/L)',
        type: 'number',
        step: '1',
        inputMode: 'numeric',
        placeholder: 'Haemoglobin',
        aliases: ['hb', 'haemoglobin', 'hemoglobin']
      },
      {
        key: 'cr',
        label: 'Cr (umol/L)',
        type: 'number',
        step: '1',
        inputMode: 'numeric',
        placeholder: 'Creatinine',
        aliases: ['cr', 'creatinine']
      },
      {
        key: 'egfr',
        label: 'eGFR (mL/min/1.73m2)',
        type: 'number',
        step: '1',
        inputMode: 'numeric',
        placeholder: 'eGFR',
        aliases: ['egfr', 'e-gfr']
      },
      {
        key: 'albumin',
        label: 'Albumin (g/L)',
        type: 'number',
        step: '1',
        inputMode: 'numeric',
        placeholder: 'Albumin',
        aliases: ['albumin']
      }
    ]
  },
  ecg: {
    extraLabel: 'Notes',
    fields: [
      {
        key: 'rate',
        label: 'Rate (bpm)',
        type: 'number',
        step: '1',
        inputMode: 'numeric',
        placeholder: 'Heart rate',
        aliases: ['rate', 'heart rate', 'hr']
      },
      {
        key: 'rhythm',
        label: 'Rhythm',
        type: 'text',
        placeholder: 'e.g. sinus rhythm',
        aliases: ['rhythm']
      },
      {
        key: 'morphology',
        label: 'Morphology',
        type: 'text',
        placeholder: 'e.g. LBBB',
        aliases: ['morphology', 'qrs morphology']
      },
      {
        key: 'qrs_width',
        label: 'QRS width (ms)',
        type: 'number',
        step: '1',
        inputMode: 'numeric',
        placeholder: 'QRS duration',
        aliases: ['qrs width', 'qrs duration']
      },
      {
        key: 'pr_interval',
        label: 'PR interval (ms)',
        type: 'number',
        step: '1',
        inputMode: 'numeric',
        placeholder: 'PR interval',
        aliases: ['pr interval', 'pr']
      }
    ]
  },
  investigations: {
    catchAllFieldKey: 'findings',
    fields: [
      {
        key: 'approach',
        label: 'Approach',
        type: 'text',
        placeholder: 'e.g. radial',
        aliases: ['approach', 'access']
      },
      {
        key: 'findings',
        label: 'Findings',
        type: 'textarea',
        placeholder: 'Summary findings',
        aliases: ['findings', 'results', 'result']
      }
    ]
  }
};

export interface ParsedStructuredSection {
  values: Record<string, string>;
  extra: string;
}

const MISSING_CONTENT = new Set([
  '',
  'not provided',
  'none',
  'no data available',
  'no data',
  'not available'
]);

const normalizeLabel = (label: string): string =>
  label
    .toLowerCase()
    .replace(/[*_]+/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const labelPattern = /^\s*(?:[-*]\s*)?(?:\*\*|__)?([^:*]+?)(?:\*\*|__)?\s*[:\-]\s*(.+)$/;

const buildAliasMap = (config: StructuredSectionConfig): Map<string, string> => {
  const map = new Map<string, string>();
  config.fields.forEach(field => {
    map.set(normalizeLabel(field.label), field.key);
    field.aliases?.forEach(alias => map.set(normalizeLabel(alias), field.key));
  });
  return map;
};

const buildAliasList = (map: Map<string, string>): string[] =>
  Array.from(map.keys()).sort((a, b) => b.length - a.length);

const STRUCTURED_ALIAS_MAPS = STRUCTURED_SECTION_KEYS.reduce((acc, key) => {
  const config = STRUCTURED_SECTION_CONFIGS[key];
  const map = buildAliasMap(config);
  acc[key] = {
    map,
    aliases: buildAliasList(map)
  };
  return acc;
}, {} as Record<StructuredSectionKey, { map: Map<string, string>; aliases: string[] }>);

/**
 * Regex patterns for extracting inline lab values
 * Handles comma-separated format: "Hb 140, Cr 89, eGFR >90"
 */
const LAB_VALUE_PATTERNS = [
  // Hemoglobin: "Hb 140", "Hemoglobin 140 g/L", "Haemoglobin: 140"
  {
    key: 'hb',
    pattern: /\b(?:hb|h[ae]moglobin)\s*:?\s*(\d+(?:\.\d+)?)\s*(?:g\/l|g\/dl)?\b/gi,
    fieldName: 'Hb'
  },

  // Creatinine: "Cr 89", "Creatinine 89 umol/L", "Creatinine: 89"
  {
    key: 'cr',
    pattern: /\b(?:cr|creatinine)\s*:?\s*(\d+(?:\.\d+)?)\s*(?:umol\/l|μmol\/l|micromol\/l)?\b/gi,
    fieldName: 'Cr'
  },

  // eGFR: "eGFR >90", "eGFR 72", "GFR: 65 ml/min", "e-GFR >90"
  // Handles comparison operators: >, <, ≥, ≤
  {
    key: 'egfr',
    pattern: /\b(?:egfr|e-gfr|gfr)\s*:?\s*([<>≥≤]?\s*\d+(?:\.\d+)?)\s*(?:ml\/min(?:\/1\.73m[²2])?)?/gi,
    fieldName: 'eGFR',
    stripComparison: true // Strip >, <, etc. for numeric value
  },

  // Albumin: "Albumin 38", "Alb 40 g/L", "Albumin: 38"
  {
    key: 'albumin',
    pattern: /\b(?:albumin|alb)\s*:?\s*(\d+(?:\.\d+)?)\s*(?:g\/l)?\b/gi,
    fieldName: 'Albumin'
  }
];

export const isStructuredSectionKey = (key: string): key is StructuredSectionKey =>
  STRUCTURED_SECTION_KEYS.includes(key as StructuredSectionKey);

export const createEmptyStructuredSectionValues = (
  sectionKey: StructuredSectionKey
): Record<string, string> =>
  STRUCTURED_SECTION_CONFIGS[sectionKey].fields.reduce((acc, field) => {
    acc[field.key] = '';
    return acc;
  }, {} as Record<string, string>);

const appendValue = (values: Record<string, string>, key: string, value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return;
  if (values[key]) {
    values[key] = `${values[key]}\n${trimmed}`;
  } else {
    values[key] = trimmed;
  }
};

const extractPrefixMatch = (
  aliases: string[],
  aliasMap: Map<string, string>,
  line: string
): { key: string; value: string } | null => {
  const lowered = line.toLowerCase();
  for (const alias of aliases) {
    if (lowered.startsWith(`${alias} `) || lowered.startsWith(`${alias}:`) || lowered.startsWith(`${alias}-`)) {
      const value = line.slice(alias.length).replace(/^[:\-\s]+/, '').trim();
      if (value) {
        const key = aliasMap.get(alias);
        if (key) return { key, value };
      }
    }
  }
  return null;
};

export const parseStructuredSectionContent = (
  sectionKey: StructuredSectionKey,
  content: string
): ParsedStructuredSection => {
  const trimmed = content.trim();
  const config = STRUCTURED_SECTION_CONFIGS[sectionKey];
  const values = createEmptyStructuredSectionValues(sectionKey);
  const extraLines: string[] = [];

  if (!trimmed || MISSING_CONTENT.has(trimmed.toLowerCase())) {
    return { values, extra: '' };
  }

  // NEW: Extract inline lab values for laboratory section
  let contentToParse = trimmed;
  if (sectionKey === 'laboratory') {
    const { values: inlineValues, remaining } = extractInlineLabValues(trimmed);

    // Pre-fill values from inline extraction
    Object.assign(values, inlineValues);

    // Continue parsing remaining text with existing logic
    contentToParse = remaining || trimmed; // Fallback to original if no extraction
  }

  const { map: aliasMap, aliases } = STRUCTURED_ALIAS_MAPS[sectionKey];
  const extraLabel = config.extraLabel ? normalizeLabel(config.extraLabel) : '';
  let currentFieldKey: string | null = null;

  contentToParse.split(/\r?\n/).forEach(line => {
    const rawLine = line.trimEnd();
    const lineTrimmed = rawLine.trim();
    if (!lineTrimmed) return;

    const match = rawLine.match(labelPattern);
    if (match) {
      const label = match[1].trim();
      const value = match[2].trim();
      const normalizedLabel = normalizeLabel(label);

      if (extraLabel && normalizedLabel === extraLabel) {
        extraLines.push(value);
        currentFieldKey = null;
        return;
      }

      const fieldKey = aliasMap.get(normalizedLabel);
      if (fieldKey) {
        appendValue(values, fieldKey, value);
        currentFieldKey = fieldKey;
        return;
      }

      if (config.catchAllFieldKey) {
        appendValue(values, config.catchAllFieldKey, `${label}: ${value}`);
        currentFieldKey = config.catchAllFieldKey;
        return;
      }

      extraLines.push(`${label}: ${value}`);
      currentFieldKey = null;
      return;
    }

    const prefixMatch = extractPrefixMatch(aliases, aliasMap, lineTrimmed);
    if (prefixMatch) {
      appendValue(values, prefixMatch.key, prefixMatch.value);
      currentFieldKey = prefixMatch.key;
      return;
    }

    const isContinuation = /^\s/.test(rawLine) || /^[\-*]/.test(lineTrimmed);
    if (currentFieldKey && isContinuation) {
      appendValue(values, currentFieldKey, lineTrimmed.replace(/^[-*]\s*/, ''));
      return;
    }

    if (config.catchAllFieldKey) {
      appendValue(values, config.catchAllFieldKey, lineTrimmed);
      currentFieldKey = config.catchAllFieldKey;
      return;
    }

    extraLines.push(lineTrimmed);
    currentFieldKey = null;
  });

  return { values, extra: extraLines.join('\n').trim() };
};

/**
 * Extract inline lab values from comma-separated text
 * Example: "Hb 140, ESR 14, eGFR >90, CaCorr 1.74"
 * Returns: { values: { hb: '140', egfr: '90' }, remaining: "ESR 14, CaCorr 1.74" }
 */
export const extractInlineLabValues = (content: string): {
  values: Record<string, string>;
  remaining: string;
} => {
  const extractedValues: Record<string, string> = {};
  const matchedSubstrings: Array<{ start: number; end: number }> = [];

  // Extract values for each pattern
  LAB_VALUE_PATTERNS.forEach(({ key, pattern, stripComparison }) => {
    const regex = new RegExp(pattern.source, pattern.flags);
    const matches = Array.from(content.matchAll(regex));

    matches.forEach(match => {
      if (match.index !== undefined) {
        let value = match[1].trim();

        // Strip comparison operators for eGFR (">90" → "90")
        if (stripComparison) {
          value = value.replace(/^[<>≥≤]\s*/, '');
        }

        extractedValues[key] = value;

        // Track matched substring position for removal
        matchedSubstrings.push({
          start: match.index,
          end: match.index + match[0].length
        });
      }
    });
  });

  // Remove matched values from content
  let remaining = content;

  // Sort by position descending to avoid index shifting
  matchedSubstrings.sort((a, b) => b.start - a.start);

  matchedSubstrings.forEach(({ start, end }) => {
    remaining = remaining.slice(0, start) + remaining.slice(end);
  });

  // Clean up extra commas and whitespace
  remaining = remaining
    .replace(/,\s*,/g, ',')        // Remove double commas
    .replace(/^[,\s]+|[,\s]+$/g, '') // Trim leading/trailing commas
    .replace(/\s+/g, ' ')           // Normalize whitespace
    .trim();

  return {
    values: extractedValues,
    remaining
  };
};

const buildLines = (label: string, value: string): string[] => {
  const trimmed = value.trim();
  if (!trimmed) return [];
  const lines = trimmed.split(/\r?\n/);
  return [ `${label}: ${lines[0]}`, ...lines.slice(1).map(line => `  ${line}`) ];
};

export const serializeStructuredSectionContent = (
  sectionKey: StructuredSectionKey,
  values: Record<string, string>,
  extra: string
): string => {
  const config = STRUCTURED_SECTION_CONFIGS[sectionKey];
  const lines: string[] = [];

  config.fields.forEach(field => {
    const value = values[field.key] || '';
    lines.push(...buildLines(field.label, value));
  });

  const extraTrimmed = extra.trim();
  if (extraTrimmed) {
    lines.push(...buildLines(config.extraLabel || 'Notes', extraTrimmed));
  }

  return lines.join('\n').trim();
};
