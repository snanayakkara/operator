import { RoundsPatient, WardUpdateDiff } from '../src/types/rounds.types';

export interface WardRoundPathsConfig {
  icloudRoot: string;
  wardRoundRoot: string;
}

export interface WardRoundModelConfig {
  name?: string;
  endpoint: string;
}

export interface WardRoundConfidenceConfig {
  minRegionConfidence: number;
  minOverallConfidence: number;
}

export interface WardRoundRuntimeConfig {
  paths: WardRoundPathsConfig;
  models: {
    vision: WardRoundModelConfig;
    clinicalLLM: WardRoundModelConfig;
  };
  confidence: WardRoundConfidenceConfig;
  mocks?: {
    visionDir?: string;
    clinicalDir?: string;
  };
}

export interface RoundMetadata {
  round_id: string;
  created_at: string;
  ward: string;
  consultant: string;
  patient_count: number;
  template_id: string;
  layout_version: number;
  exported_at?: string;
}

export interface LayoutRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutDefinition {
  template_id: string;
  layout_version: number;
  image_width: number;
  image_height: number;
  regions: Record<string, LayoutRegion>;
}

export interface VisionModelRequest {
  imagePath: string;
  layout: LayoutDefinition;
  patientId?: string;
  roundId?: string;
  templateId?: string;
}

export interface VisionModelResult {
  patient_id_from_card: string;
  round_id_from_card: string;
  regions: Record<string, string>;
  confidence: Record<string, number>;
  warnings: string[];
  raw?: unknown;
}

export interface IssueSubpointProposal {
  date?: string;
  text: string;
  source?: string;
  confidence?: number;
}

export interface ProposedIssueChange {
  issue_id: string;
  action: 'append_subpoint' | 'create_issue';
  issue_label?: string;
  subpoint?: IssueSubpointProposal;
  initial_subpoint?: IssueSubpointProposal;
}

export interface ProposedInvestigationChange {
  action: 'add_result';
  investigation_type: 'bloods' | 'imaging' | 'procedure' | 'other';
  detail: string;
  date?: string;
  confidence?: number;
}

export interface ProposedTaskChange {
  action: 'add_task';
  task: string;
  due?: string;
  priority?: 'low' | 'normal' | 'high';
  confidence?: number;
}

export interface ProposedChanges {
  issues: ProposedIssueChange[];
  investigations: ProposedInvestigationChange[];
  tasks: ProposedTaskChange[];
}

export interface ClinicalLLMResult {
  patient_id: string;
  round_id: string;
  proposed_changes: ProposedChanges;
  llm_notes: string;
  overall_confidence: number;
  raw?: unknown;
}

export type PatientUpdateReason = 'conflict' | 'low_confidence' | 'ok';

export interface PendingWardRoundUpdate {
  id: string;
  patientId: string;
  roundId: string;
  createdAt: string;
  proposedChanges: ProposedChanges;
  reason: PatientUpdateReason;
  llmNotes?: string;
  confidence?: number;
  sourceImage?: string;
}

export interface PatientImportOutcome {
  patientId: string;
  roundId: string;
  imagePath: string;
  vision: VisionModelResult;
  clinical: ClinicalLLMResult | null;
  diffApplied?: WardUpdateDiff;
  pendingUpdateId?: string;
  status: 'applied' | 'pending' | 'skipped' | 'failed';
  reason?: string;
}

export interface WardRoundImportResult {
  roundId: string;
  metadata: RoundMetadata;
  patients: PatientImportOutcome[];
  startedAt: string;
  finishedAt: string;
}
