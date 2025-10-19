/**
 * BP Diary Types
 * Type definitions for Blood Pressure Diary Importer feature
 */

export interface BPReading {
  id: string;
  date: string; // YYYY-MM-DD format
  time: string; // HH:MM format (24-hour)
  timeOfDay?: 'morning' | 'evening'; // Derived field for backward compatibility
  sbp: number; // Systolic BP (mmHg)
  dbp: number; // Diastolic BP (mmHg)
  hr: number; // Heart rate (bpm)
  confidence?: number; // 0-1, model confidence
  warnings?: BPWarning[];
}

export interface BPWarning {
  type: 'range' | 'relational' | 'ambiguous' | 'swapped' | 'missing';
  field: 'sbp' | 'dbp' | 'hr' | 'date' | 'time';
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface BPExtractionResult {
  success: boolean;
  readings: BPReading[];
  insights?: BPInsights;
  rawResponse?: string;
  error?: string;
  processingTime: number;
}

export interface BPInsights {
  controlSummary: string; // e.g., "Suboptimal control - 67% of readings above target"
  diurnalPattern: string; // e.g., "Higher in morning (avg 145/85) vs evening (avg 132/78)"
  variabilityConcern: string; // e.g., "High variability (SBP range 129-170 mmHg)"
  keyRecommendations: string[]; // e.g., ["Consider uptitrating antihypertensive", "Assess medication timing"]
  peakTimes?: string; // e.g., "Highest readings typically 06:00-08:00"
  lowestTimes?: string; // e.g., "Best control 18:00-20:00"
}

export interface BPValidationResult {
  valid: boolean;
  reading: BPReading;
  warnings: BPWarning[];
  modified: boolean; // true if validation changed values (e.g., swapped SBP/DBP)
}

export interface BPDiarySession {
  id: string;
  timestamp: number;
  imageDataUrl: string;
  readings: BPReading[];
  settings: BPDiarySettings;
}

export interface BPDiarySettings {
  showReferenceLines: boolean;
  referenceSBP: number; // Default 135
  referenceDBP: number; // Default 85
  dateFormat: 'dd/MM' | 'MM/dd';
  assumeCurrentYear: boolean;
  // Control targets
  sbpControlTarget: number; // Default 130 - target for control calculation
  sbpControlGoal: number; // Default 90 - percentage of time below target (e.g., 90%)
}

export const DEFAULT_BP_SETTINGS: BPDiarySettings = {
  showReferenceLines: true,
  referenceSBP: 135,
  referenceDBP: 85,
  dateFormat: 'dd/MM',
  assumeCurrentYear: true,
  sbpControlTarget: 130,
  sbpControlGoal: 90
};

// Validation ranges (Australian guidelines)
export const BP_RANGES = {
  sbp: { min: 70, max: 260 },
  dbp: { min: 40, max: 160 },
  hr: { min: 30, max: 200 }
} as const;