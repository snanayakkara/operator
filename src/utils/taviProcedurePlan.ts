export const PROCEDURE_PLAN_FIELDS = [
  {
    key: 'device',
    label: 'Device',
    aliases: ['device', 'valve', 'valve size', 'valve model', 'valve selection', 'devices planned']
  },
  {
    key: 'access',
    label: 'Access',
    aliases: ['access', 'primary access', 'secondary access', 'access route', 'access routes']
  },
  {
    key: 'wire',
    label: 'Wire',
    aliases: ['wire']
  },
  {
    key: 'pacing',
    label: 'Pacing',
    aliases: ['pacing']
  },
  {
    key: 'closure',
    label: 'Closure',
    aliases: ['closure']
  },
  {
    key: 'notes',
    label: 'Notes',
    aliases: [
      'notes',
      'rationale',
      'goals',
      'case note',
      'case notes',
      'strategy',
      'bav',
      'protamine',
      'anticoagulation',
      'contrast',
      'pre dilatation',
      'post dilatation',
      'predilatation',
      'postdilatation'
    ]
  }
] as const;

export type ProcedurePlanFieldKey = (typeof PROCEDURE_PLAN_FIELDS)[number]['key'];

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

const labelPattern = /^\s*(?:\*\*|__)?([^:*]+?)(?:\*\*|__)?\s*[:\-]\s*(.+)$/;

const fieldLabelByKey = PROCEDURE_PLAN_FIELDS.reduce((acc, field) => {
  acc[field.key] = field.label;
  return acc;
}, {} as Record<ProcedurePlanFieldKey, string>);

const aliasMap = PROCEDURE_PLAN_FIELDS.reduce((acc, field) => {
  const canonical = normalizeLabel(field.label);
  acc.set(canonical, field.key);
  field.aliases.forEach(alias => {
    acc.set(normalizeLabel(alias), field.key);
  });
  return acc;
}, new Map<string, ProcedurePlanFieldKey>());

export const createEmptyProcedurePlanFields = (): Record<ProcedurePlanFieldKey, string> =>
  PROCEDURE_PLAN_FIELDS.reduce((acc, field) => {
    acc[field.key] = '';
    return acc;
  }, {} as Record<ProcedurePlanFieldKey, string>);

export const parseProcedurePlanContent = (content: string): Record<ProcedurePlanFieldKey, string> => {
  const trimmed = content.trim();
  if (!trimmed || MISSING_CONTENT.has(trimmed.toLowerCase())) {
    return createEmptyProcedurePlanFields();
  }

  const values = createEmptyProcedurePlanFields();
  const bucketed: Record<ProcedurePlanFieldKey, string[]> = {
    device: [],
    access: [],
    wire: [],
    pacing: [],
    closure: [],
    notes: []
  };

  const lines = trimmed.split(/\r?\n/);
  let currentField: ProcedurePlanFieldKey | null = null;

  lines.forEach((line) => {
    const rawLine = line.trimEnd();
    const lineTrimmed = rawLine.trim();
    if (!lineTrimmed) {
      return;
    }

    const match = rawLine.match(labelPattern);
    if (match) {
      const label = match[1].trim();
      const value = match[2].trim();
      const normalizedLabel = normalizeLabel(label);
      const mappedField = aliasMap.get(normalizedLabel);

      if (mappedField) {
        const canonicalLabel = normalizeLabel(fieldLabelByKey[mappedField]);
        const prefix = normalizedLabel === canonicalLabel ? '' : `${label}: `;
        bucketed[mappedField].push(`${prefix}${value}`);
        currentField = mappedField;
      } else {
        bucketed.notes.push(`${label}: ${value}`);
        currentField = 'notes';
      }
      return;
    }

    const isContinuation = /^\s/.test(rawLine) || /^[\-*]/.test(lineTrimmed);
    if (currentField && (currentField === 'notes' || isContinuation)) {
      bucketed[currentField].push(lineTrimmed);
      return;
    }

    bucketed.notes.push(lineTrimmed);
    currentField = 'notes';
  });

  (Object.keys(bucketed) as ProcedurePlanFieldKey[]).forEach((key) => {
    values[key] = bucketed[key].join('\n').trim();
  });

  return values;
};

export const serializeProcedurePlanContent = (
  fields: Record<ProcedurePlanFieldKey, string>
): string => {
  const buildLines = (label: string, value: string): string[] => {
    const trimmed = value.trim();
    if (!trimmed) return [];
    const lines = trimmed.split(/\r?\n/);
    const output = [`${label}: ${lines[0]}`];
    for (const line of lines.slice(1)) {
      output.push(`  ${line}`);
    }
    return output;
  };

  const structuredLines = [
    ...buildLines(fieldLabelByKey.device, fields.device),
    ...buildLines(fieldLabelByKey.access, fields.access),
    ...buildLines(fieldLabelByKey.wire, fields.wire),
    ...buildLines(fieldLabelByKey.pacing, fields.pacing),
    ...buildLines(fieldLabelByKey.closure, fields.closure)
  ];

  const notes = fields.notes.trim();
  if (notes) {
    if (structuredLines.length === 0) {
      return notes;
    }
    structuredLines.push(...buildLines(fieldLabelByKey.notes, notes));
  }

  return structuredLines.join('\n');
};

/**
 * Dropdown options for enhanced Procedure Planning fields
 * Used by ProcedurePlanningCard component
 */
export const PROCEDURE_PLANNING_OPTIONS = {
  access: [
    'Right Femoral',
    'Left Femoral',
    'Right Subclavian',
    'Left Subclavian',
    'Right Carotid',
    'Left Carotid'
  ],
  wire: [
    'Confida',
    'Safari',
    'Innowi',
    'Lunderquist'
  ],
  pacing: [
    'Transfemoral',
    'Existing Device'
  ],
  pacingManufacturers: [
    'Medtronic',
    'Boston Scientific',
    'Abbott',
    'Biotronik'
  ],
  closure: [
    'ProStyle x1 + AngioSeal',
    'ProStyle x2'
  ],
  predilationBrands: [
    'Valver',
    'True',
    'Atlas'
  ] as const,
  predilationSizes: {
    Valver: [16, 18, 20, 23, 25, 28, 30],
    True: [18, 20, 21, 22, 23, 24, 25, 26, 28],
    Atlas: [22, 24, 26]
  }
} as const;

/**
 * Default value for access route
 */
export const DEFAULT_ACCESS = 'Right Femoral';
