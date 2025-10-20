import type { AgentType } from '@/types/medical.types';

export type TTETrendModality = 'tte' | 'echo' | 'stress-echo';

export type TTETrendSeriesKey = 'lvef' | 'rvsp' | 'lvedd' | 'avMpg' | 'lavi';

export type TTETrendTimeFilter = '6m' | '12m' | '24m' | 'all';

export interface TTEValueBase {
  id: string;
  sourceText: string;
  rawText?: string;
  flags?: string[];
  highlight?: string;
}

export interface TTENumericValue extends TTEValueBase {
  type: 'numeric';
  value: number;
  unit?: string;
  display?: string;
  precision?: 'measured' | 'derived' | 'approximate';
  qualitativeLabel?: string;
}

export interface TTETextValue extends TTEValueBase {
  type: 'text';
  text: string;
}

export type TTEFieldValue = TTENumericValue | TTETextValue;

export interface TTEValveGrade extends TTEValueBase {
  valve: 'ar' | 'mr' | 'tr';
  severity: string;
  qualifiers?: string[];
}

export interface TTETrendNote {
  id: string;
  label: string;
  description: string;
  sourceText: string;
  category:
    | 'ar'
    | 'mr'
    | 'tr'
    | 'rv'
    | 'lv'
    | 'as'
    | 'context'
    | 'data-quality'
    | 'stress-echo'
    | 'other';
}

export interface TTETrendRow {
  id: string;
  modality: TTETrendModality;
  label: string;
  dateIso?: string;
  datePrecision: 'day' | 'month' | 'unknown';
  site?: string;
  capturedAt?: number;
  lvef?: TTEFieldValue;
  lvefCategory?: TTETextValue;
  rvsp?: TTEFieldValue;
  pasp?: TTEFieldValue;
  trGradient?: TTEFieldValue;
  lvedd?: TTEFieldValue;
  avMpg?: TTEFieldValue;
  tapse?: TTEFieldValue;
  gls?: TTEFieldValue;
  lavi?: TTEFieldValue;
  di?: TTEFieldValue;
  ava?: TTEFieldValue;
  svi?: TTEFieldValue;
  valveGrades: {
    ar?: TTEValveGrade;
    mr?: TTEValveGrade;
    tr?: TTEValveGrade;
  };
  structuralFindings: TTETrendNote[];
  notes: TTETrendNote[];
  rawSource: string;
  stressEchoDetails?: string;
}

export interface TTETrendEvent {
  id: string;
  dateIso?: string;
  label: string;
  description: string;
  modality: TTETrendModality;
  datePrecision: 'day' | 'month' | 'unknown';
}

export interface TTESeriesPoint {
  id: string;
  rowId: string;
  field: TTETrendSeriesKey;
  dateIso: string;
  value: number;
  unit?: string;
  sourceId?: string;
  datePrecision: 'day' | 'month';
  site?: string;
}

export interface TTETrendSeries {
  key: TTETrendSeriesKey;
  points: TTESeriesPoint[];
}

export interface TTETrendSettings {
  timeFilter: TTETrendTimeFilter;
  showLVEFOnly: boolean;
  enabledSeries: Record<TTETrendSeriesKey, boolean>;
  contextBands: {
    lvef: boolean;
    rvsp: boolean;
    lvedd: boolean;
    avMpg: boolean;
    tapse: boolean;
    lavi: boolean;
  };
}

export interface TTETrendSession {
  id: string;
  timestamp: number;
  sourceType: 'emr' | 'paste';
  rawText: string;
  rows: TTETrendRow[];
  notes: TTETrendNote[];
  settings: TTETrendSettings;
  latestInsights?: TTEInsightsSummary;
}

export interface TTETrendParseResult {
  rows: TTETrendRow[];
  events: TTETrendEvent[];
  warnings: string[];
  notes: TTETrendNote[];
}

export interface TTETrendParserOptions {
  agentType?: AgentType;
}

export interface TTEInsightsMetricSnapshot {
  field: TTETrendSeriesKey;
  label: string;
  current?: TTENumericValue | TTETextValue;
  previous?: TTENumericValue | TTETextValue;
  baseline?: TTENumericValue | TTETextValue;
  deltaFromPrevious?: string;
  deltaFromBaseline?: string;
  trajectory?: 'rising' | 'falling' | 'stable' | 'insufficient-data';
  slopeValue?: number | null;
  thresholdCrossings: string[];
}

export interface TTEInsightsDataQuality {
  missingMetrics: string[];
  ambiguousFindings: string[];
  interLabChanges: string[];
}

export interface TTEInsightsSummary {
  headline: string;
  narrative: string;
  metrics: TTEInsightsMetricSnapshot[];
  thresholds: string[];
  rightHeartContext: string[];
  valveContext: string[];
  structuralHighlights: string[];
  dataQuality: TTEInsightsDataQuality;
  patientFriendly?: string;
}
