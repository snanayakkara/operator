import type { PipelineProgress } from '@/types/medical.types';

export type LipidAnalyte = 'ldl' | 'tchol' | 'hdl' | 'tg' | 'apob' | 'nonHDL';

export interface LipidResult {
  id: string;
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  /** Original text snippet for provenance */
  source: string;
  /** mmols per litre */
  ldl?: number;
  tchol?: number;
  hdl?: number;
  tg?: number;
  apob?: number;
  nonHDL?: number;
  /** Therapy annotation extracted from parentheses e.g. "off statin" */
  therapyNote?: string | null;
  /** Whether this reading precedes initiation/escalation of lipid therapy */
  isPreTherapy?: boolean;
  /** Manual edits flag for UI */
  isEdited?: boolean;
}

export interface LipidSeriesMetadata {
  baselineLDL?: number;
  baselineSourceDate?: string;
  latestDate?: string;
  latestLDL?: number;
  latestTotalChol?: number;
  therapyPhases: TherapyPhase[];
}

export interface TherapyPhase {
  label: string;
  startDate: string;
  endDate?: string;
  note?: string;
}

export interface LipidParseResult {
  readings: LipidResult[];
  warnings: string[];
  metadata: LipidSeriesMetadata;
}

export type LipidOverlayFramework = 'au-practice' | 'esc-eas';

export interface RiskOverlayBand {
  id: string;
  label: string;
  /** Upper limit (inclusive) in mmol/L */
  threshold: number;
  /** Optional percent reduction requirement vs baseline */
  percentReduction?: number;
  description?: string;
}

export interface LipidOverlayConfig {
  id: LipidOverlayFramework;
  name: string;
  description: string;
  bands: RiskOverlayBand[];
  /**
   * Whether clinician can set custom LDL target (used for AU practice primary prevention)
   */
  allowCustomPrimaryTarget?: boolean;
}

export type LipidTimeFilter = '3m' | '6m' | '12m' | 'all';

export interface LipidChartSettings {
  framework: LipidOverlayFramework;
  selectedBandId: string;
  customPrimaryTarget?: number;
  selectedAnalytes: LipidAnalyte[];
  timeFilter: LipidTimeFilter;
  ldlOnlyView: boolean;
  showTherapyBands: boolean;
}

export interface LipidProfileSession {
  id: string;
  capturedAt: number;
  source: 'emr' | 'paste';
  sourceRawText: string;
  readings: LipidResult[];
  settings: LipidChartSettings;
  metadata: LipidSeriesMetadata;
  pipelineProgress?: PipelineProgress;
}

export interface LipidInsightsSummary {
  latestSummary: string;
  priorComparison: string;
  baselineComparison: string;
  trajectory: string;
  timeInTarget: string;
  therapyResponse?: string;
  nadirAndRise?: string;
  riskContext?: string;
  whyItMatters: string;
}

export interface LipidInsightsContext {
  baselineLDL?: number;
  baselineDate?: string;
  latestLDL?: number;
  latestTotal?: number;
  deltaSinceBaseline?: number;
  percentReduction?: number;
  deltaSincePrevious?: number;
  percentDeltaSincePrevious?: number;
  monthlySlope?: number;
  slopeClassification: 'rising' | 'stable' | 'falling' | 'insufficient-data';
  timeInTarget: {
    timeframe: LipidTimeFilter;
    percentage: number;
    lastAtGoalDate?: string;
  };
  bestNadir?: {
    date: string;
    value: number;
    therapyNote?: string | null;
  };
  largestRise?: {
    startDate: string;
    endDate: string;
    delta: number;
  };
  therapyResponseNote?: string;
  strictOverlayRecommended?: boolean;
  riskContext?: string;
  latestDate?: string;
  previousDate?: string;
}
