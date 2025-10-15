/**
 * TypeScript interfaces for Quick Letter Paste Notes feature
 *
 * These types define the structure for pasted clinical notes parsing,
 * medication extraction, and envelope generation for the paste-to-letter pipeline.
 */

/**
 * Represents a single medication entry parsed from notes or EMR
 */
export interface MedEntry {
  drug: string;
  dose?: string;
  unit?: string;
  route?: string; // po, sc, iv, etc.
  freq?: string;  // bd, od, tds, qid, prn, etc.
  notes?: string;
  formulation?: string; // CR, XR, IR, etc.
}

/**
 * Represents a medication change delta (verb-driven)
 */
export interface MedDelta {
  action: 'start' | 'stop' | 'hold' | 'increase' | 'decrease' | 'switch' | 'replace';
  drug: string;
  from?: {
    dose?: string;
    unit?: string;
    freq?: string;
    formulation?: string;
  };
  to?: {
    dose?: string;
    unit?: string;
    freq?: string;
    formulation?: string;
  };
  reason?: string;
}

/**
 * Result of parsing pasted clinical notes
 */
export interface ParsedNotes {
  // Raw input
  raw: string;

  // Medication parsing results
  contains_meds_header: boolean;
  meds_snapshot: MedEntry[];
  deltas: MedDelta[];
  confidence: number; // 0-1, confidence in medication parsing

  // Extracted sections (if present in notes)
  sections: {
    background?: string;
    investigation_summary?: string;
    plan?: string;
    [key: string]: string | undefined;
  };

  // Detected patient info (for identity mismatch check)
  detected_patient?: {
    name?: string;
    mrn?: string;
  };

  // Placeholders and ambiguities
  placeholders: string[]; // e.g., ["?dose", "TBC", "confirm with cardiology"]
}

/**
 * EMR context pulled from the current patient record
 */
export interface EMRContext {
  demographics: {
    name?: string;
    age?: string | number;
    dob?: string;
    gender?: string;
    mrn?: string;
  };
  gp?: string;
  allergies: string[];
  background: string;
  investigation_summary: string;
  medications_emr: MedEntry[];
}

/**
 * Sparsity check result (run before LLM call)
 */
export interface SparsityCheckResult {
  sparse: boolean;
  missing: string[];
}

/**
 * Complete paste envelope for LLM input
 */
export interface PasteEnvelope {
  mode: 'paste';
  timestamp_local: string; // ISO8601 with Australia/Melbourne offset
  emr_context: EMRContext;
  notes: ParsedNotes;
  policy: {
    emr_is_baseline: boolean;
    typed_notes_modify_on_top: boolean;
    meds_strategy: 'hybrid_keyword_first_with_heuristic_fallback';
    review_triggers: 'conditional';
  };
  flags: {
    identity_mismatch: boolean;
    patient_friendly_requested: boolean;
  };
}

/**
 * Review trigger types (two-stage gating)
 */
export type PreflightTrigger =
  | 'meds_snapshot_detected'
  | 'meds_snapshot_drops_multiple'
  | 'meds_low_confidence_snapshot'
  | 'emr_notes_conflict_meds'
  | 'emr_notes_conflict_allergies'
  | 'emr_notes_conflict_gp'
  | 'placeholders_detected'
  | 'identity_mismatch';

export type PostGenTrigger =
  | 'model_confidence_low'
  | 'parser_fallback_used'
  | 'completeness_low'
  | 'high_impact_anticoagulation'
  | 'high_impact_antiplatelets'
  | 'high_impact_beta_blocker'
  | 'high_impact_acei_arb'
  | 'urgent_red_flags';

export interface ReviewTriggerResult {
  // Preflight triggers (before LLM)
  preflight: {
    triggered: boolean;
    triggers: PreflightTrigger[];
    details: Record<string, string | number>;
  };

  // Post-gen triggers (after LLM, gate actions)
  postGen: {
    triggered: boolean;
    triggers: PostGenTrigger[];
    details: Record<string, string | number>;
  };
}

/**
 * Paste letter event log entry (PHI-free)
 */
export interface PasteLetterEvent {
  timestamp: number;
  mode: 'paste';
  success: boolean;
  had_snapshot: boolean;
  review_trigger_conflict: boolean;
  identity_mismatch: boolean;
  used_stepper: boolean;
  model_confidence?: number;
  error_type?: string; // e.g., 'timeout', 'format_error', 'user_cancelled'
}

/**
 * Configuration for paste letter generation
 */
export interface PasteLetterConfig {
  includePatientFriendly: boolean;
  enableReviewPanel: boolean; // Can be disabled for testing
  enableIdentityCheck: boolean; // Can be disabled for testing
  timeout: number; // LM Studio timeout in milliseconds (default 30000)
}

/**
 * Stepper question for sparse notes
 */
export interface StepperQuestion {
  id: string;
  question: string;
  type: 'select' | 'text' | 'textarea';
  options?: Array<{ value: string; label: string }>;
  prefill?: string;
  required: boolean;
}

/**
 * Stepper completion result
 */
export interface StepperResult {
  purpose: string;
  diagnosis: string;
  plan: string;
  medications: string;
}
