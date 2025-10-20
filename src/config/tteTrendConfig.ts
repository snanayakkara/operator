import type { TTETrendSeriesKey, TTETrendSettings } from '@/types/TTETrendTypes';

export interface TTEContextBand {
  id: string;
  label: string;
  min?: number;
  max?: number;
  color: string;
  description: string;
  emphasis?: boolean;
}

export interface TTEThresholdMarker {
  id: string;
  label: string;
  value: number;
  color: string;
  description: string;
  dash?: number[];
}

export interface TTETrendSeriesMeta {
  key: TTETrendSeriesKey;
  label: string;
  color: string;
  unit: string;
  precision: number;
}

export const TTE_SERIES_META: Record<TTETrendSeriesKey, TTETrendSeriesMeta> = {
  lvef: {
    key: 'lvef',
    label: 'LVEF / EF (%)',
    color: '#1f2937',
    unit: '%',
    precision: 0
  },
  rvsp: {
    key: 'rvsp',
    label: 'RVSP (mmHg)',
    color: '#dc2626',
    unit: 'mmHg',
    precision: 0
  },
  lvedd: {
    key: 'lvedd',
    label: 'LVEDD (mm)',
    color: '#0369a1',
    unit: 'mm',
    precision: 0
  },
  avMpg: {
    key: 'avMpg',
    label: 'AV MPG (mmHg)',
    color: '#9a3412',
    unit: 'mmHg',
    precision: 0
  },
  lavi: {
    key: 'lavi',
    label: 'LAVI (mL/m²)',
    color: '#2563eb',
    unit: 'mL/m²',
    precision: 0
  }
};

export const LVEF_CONTEXT_BANDS: TTEContextBand[] = [
  {
    id: 'hfreF',
    label: 'HFrEF ≤40%',
    max: 40,
    color: 'rgba(220, 38, 38, 0.10)',
    description: 'Reduced EF range'
  },
  {
    id: 'hfmrEF',
    label: 'HFmrEF 41–49%',
    min: 40,
    max: 50,
    color: 'rgba(234, 179, 8, 0.12)',
    description: 'Mid-range EF'
  },
  {
    id: 'hfpEF',
    label: 'HFpEF ≥50%',
    min: 50,
    color: 'rgba(34, 197, 94, 0.10)',
    description: 'Preserved EF'
  }
];

export const RVSP_CONTEXT_BANDS: TTEContextBand[] = [
  {
    id: 'normal',
    label: '<40 mmHg',
    max: 40,
    color: 'rgba(59, 130, 246, 0.08)',
    description: 'Low probability PH'
  },
  {
    id: 'intermediate',
    label: '40–49 mmHg',
    min: 40,
    max: 50,
    color: 'rgba(234, 179, 8, 0.12)',
    description: 'Intermediate probability PH'
  },
  {
    id: 'high',
    label: '≥50 mmHg',
    min: 50,
    color: 'rgba(220, 38, 38, 0.12)',
    description: 'High probability PH'
  }
];

export const LVEDD_CONTEXT_BANDS: TTEContextBand[] = [
  {
    id: 'reference',
    label: 'Reference 35–60 mm (general)',
    min: 35,
    max: 60,
    color: 'rgba(148, 163, 184, 0.10)',
    description: 'ASE reference range (sex/BSA dependent)'
  }
];

export const AVMPG_CONTEXT_BANDS: TTEContextBand[] = [
  {
    id: 'mild',
    label: '<20 mmHg',
    max: 20,
    color: 'rgba(34, 197, 94, 0.10)',
    description: 'Mild AS'
  },
  {
    id: 'moderate',
    label: '20–39 mmHg',
    min: 20,
    max: 40,
    color: 'rgba(234, 179, 8, 0.12)',
    description: 'Moderate AS'
  },
  {
    id: 'severe',
    label: '≥40 mmHg',
    min: 40,
    color: 'rgba(220, 38, 38, 0.12)',
    description: 'Severe AS'
  }
];

export const TAPSE_THRESHOLD: TTEThresholdMarker = {
  id: 'tapse-low',
  label: 'TAPSE 17 mm',
  value: 17,
  color: '#dc2626',
  description: 'Reference for reduced RV longitudinal function',
  dash: [6, 6]
};

export const DEFAULT_TTE_TREND_SETTINGS: TTETrendSettings = {
  timeFilter: '12m',
  showLVEFOnly: false,
  enabledSeries: {
    lvef: true,
    rvsp: false,
    lvedd: false,
    avMpg: false,
    lavi: false
  },
  contextBands: {
    lvef: true,
    rvsp: true,
    lvedd: true,
    avMpg: true,
    tapse: true,
    lavi: false
  }
};

export const TIME_FILTER_OPTIONS: Array<{ value: TTETrendSettings['timeFilter']; label: string }> = [
  { value: '6m', label: 'Last 6 months' },
  { value: '12m', label: 'Last 12 months' },
  { value: '24m', label: 'Last 24 months' },
  { value: 'all', label: 'All time' }
];
