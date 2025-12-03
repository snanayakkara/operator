/**
 * TypeScript types and interfaces for optimization features
 * 
 * Defines data structures for ASR corrections, GEPA optimization,
 * overnight workflows, and job management.
 */

import { AgentType } from './medical.types';

// ASR Optimization Types

export interface GlossaryTerm {
  term: string;
  count: number;
}

export interface RuleCandidate {
  raw: string;        // Original transcription pattern
  fix: string;        // Corrected replacement
  count: number;      // Frequency of this correction
  examples: string[]; // Example contexts where this correction was made
}

export interface ASRPreview {
  glossary_additions: GlossaryTerm[];
  rule_candidates: RuleCandidate[];
}

export interface ASRApplyRequest {
  approve_glossary: string[];           // Approved glossary terms
  approve_rules: { raw: string; fix: string }[]; // Approved correction rules
}

export interface ASRApplyResponse {
  written: {
    glossary: number;  // Number of glossary terms written
    rules: number;     // Number of rules written
  };
  paths: string[];     // File paths that were updated
}

export interface ASRCurrentState {
  glossary: string[];           // Active glossary terms
  rules: { raw: string; fix: string }[]; // Active correction rules
}

export type TranscriptionApprovalStatus = 'pending' | 'approved' | 'edited' | 'skipped';

export interface TranscriptionApprovalState {
  status: TranscriptionApprovalStatus;
  originalText: string;
  currentText: string;
  hasBeenEdited: boolean;
  approvalTimestamp?: number;
  editTimestamp?: number;
}

export interface ASRCorrectionsEntry {
  id: string;
  audioId?: string;
  audioPath?: string;
  rawText: string;
  correctedText: string;
  agentType: AgentType;
  timestamp: number;
  sessionId?: string;
  // Approval tracking for training data quality
  approvalStatus: TranscriptionApprovalStatus;
  userExplicitlyApproved: boolean;
  editTimestamp?: number;
  approvalTimestamp?: number;
  // Additional properties used in FullPageCorrectionsViewer
  original?: string;
  corrected?: string;
  confidence?: number;
  source?: string;
  correctionType?: string;
}

// Sort field type for FullPageCorrectionsViewer
export type SortField = 'timestamp' | 'agentType' | 'approvalStatus' | 'confidence';

// GEPA Optimization Types

export interface GEPAMetrics {
  accuracy?: number;
  completeness?: number;
  clinical_appropriateness?: number;
  overall_score?: number;
  improvement?: number;
  [key: string]: number | string | undefined;
}

export interface MetricsDelta {
  before: number;
  after: number;
  delta: number;
  percentChange: number;
  isImprovement: boolean;
  significance: 'major' | 'moderate' | 'minor' | 'negligible';
}

export interface EnhancedGEPAMetrics {
  accuracy: MetricsDelta;
  completeness: MetricsDelta;
  clinical_appropriateness: MetricsDelta;
  overall_score: MetricsDelta;
  summary: {
    totalImprovement: number;
    improvedMetrics: number;
    unchangedMetrics: number;
    degradedMetrics: number;
    confidenceLevel: 'high' | 'medium' | 'low';
  };
}

export interface GEPACandidate {
  id: string;
  task: AgentType;
  before: string;     // Current prompt instruction
  after: string;      // Optimized prompt instruction
  metrics: GEPAMetrics;
}

export interface GEPAPreview {
  candidates: GEPACandidate[];
}

export interface GEPAPreviewRequest {
  tasks: AgentType[];    // Agent types to optimize
  iterations?: number;   // Number of GEPA iterations (default: 5)
  with_human?: boolean;  // Include human feedback (default: false)
}

export interface GEPAApplyRequest {
  accepted: { task: AgentType; candidate_id: string }[];
}

export interface GEPAApplyResponse {
  applied: {
    task: AgentType;
    candidate_id: string;
    metrics_before: GEPAMetrics;
    metrics_after: GEPAMetrics;
    saved_path: string;
  }[];
  errors: {
    task: AgentType;
    candidate_id: string;
    error: string;
  }[];
}

export interface GEPAHistoryEntry {
  timestamp: string;
  task: AgentType;
  metrics_before: GEPAMetrics;
  metrics_after: GEPAMetrics;
  improvement: number;
  file_paths: string[];
  notes?: string;
}

// Overnight Optimization Types

export interface OvernightOptimizationRequest {
  tasks: AgentType[];
  iterations?: number;
  with_human?: boolean;
  asr: {
    since?: string;    // ISO date string
    maxTerms?: number;
    maxRules?: number;
  };
}

export interface OvernightJob {
  job_id: string;
  status: 'QUEUED' | 'RUNNING' | 'DONE' | 'ERROR';
  summary?: string;
  started_at: string;
  completed_at?: string;
  results?: {
    asr_preview?: ASRPreview;
    gepa_preview?: GEPAPreview;
  };
  errors?: string[];
}

export interface JobStatus {
  job_id: string;
  status: 'QUEUED' | 'RUNNING' | 'DONE' | 'ERROR';
  progress?: number;
  current_phase?: string;
  estimated_completion?: string;
  summary?: string;
}

// Golden pair capture

export interface GoldenPairSaveRequest {
  agentId: AgentType;
  workflowId?: string | null;
  original: string;
  edited: string;
  notes: string;
  runEvaluationOnNewExample?: boolean;
  tags?: string[];
}

export interface GoldenPairSaveResponse {
  exampleId: string;
  filePath: string;
  agentId: AgentType;
  timestamp: string;
}

// UI State Types

export interface OptimizationState {
  // ASR section
  asrPreview: ASRPreview | null;
  asrCurrentState: ASRCurrentState | null;
  selectedGlossaryTerms: Set<string>;
  selectedRules: Set<string>;
  
  // GEPA section  
  gepaPreview: GEPAPreview | null;
  gepaHistory: GEPAHistoryEntry[];
  selectedTasks: Set<AgentType>;
  selectedCandidates: Map<AgentType, string>; // task -> candidate_id
  
  // Overnight section
  overnightJob: OvernightJob | null;
  isPollingJob: boolean;
  
  // General state
  isLoading: boolean;
  lastError: string | null;
  lastUpdated: number;
}

export interface OptimizationSettings {
  overnight_enabled: boolean;
  default_iterations: number;
  auto_apply_threshold: number;
  max_corrections_to_store: number;
  asr_collection_enabled: boolean;
}

// API Response Types

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  processing_time?: number;
}

export interface ServerHealthStatus {
  status: 'healthy' | 'unhealthy';
  server: {
    version: string;
    uptime_seconds: number;
    port: number;
  };
  dspy: {
    ready: boolean;
    config_loaded: boolean;
    available_agents: string[];
    enabled_agents: string[];
  };
  optimization: {
    asr_endpoints_available: boolean;
    gepa_endpoints_available: boolean;
    overnight_processing_available: boolean;
  };
}

// Error Types

export class OptimizationError extends Error {
  constructor(
    message: string,
    public code?: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'OptimizationError';
  }
}

export class ASROptimizationError extends OptimizationError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'ASR_ERROR', context);
    this.name = 'ASROptimizationError';
  }
}

export class GEPAOptimizationError extends OptimizationError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'GEPA_ERROR', context);
    this.name = 'GEPAOptimizationError';
  }
}

export class OvernightOptimizationError extends OptimizationError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'OVERNIGHT_ERROR', context);
    this.name = 'OvernightOptimizationError';
  }
}

// Utility Types

export type OptimizationMode = 'asr' | 'gepa' | 'overnight';

export interface OptimizationProgress {
  mode: OptimizationMode;
  phase: string;
  progress: number;
  message: string;
  eta?: number;
}

// Re-export commonly used types from medical.types for convenience
export type { AgentType } from './medical.types';
