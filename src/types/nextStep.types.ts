/**
 * Next-Step Engine Types
 * 
 * Type definitions for the clinical gap-detection and planning assistant.
 * The Next-Step Engine identifies optional, patient-specific next clinical steps
 * that the clinician may wish to consider.
 * 
 * @see docs/Operator_NextStep_Engine_Reference.md
 */

/**
 * Priority level for next-step suggestions.
 * Used for ordering only - not for urgency signaling.
 */
export type NextStepPriority = 'low' | 'medium' | 'high';

/**
 * Status of the Next-Step Engine processing.
 */
export type NextStepStatus = 
  | 'idle'           // Engine has not been triggered
  | 'pending'        // Engine is queued to run
  | 'processing'     // Engine is currently running
  | 'completed'      // Engine finished with results
  | 'error';         // Engine encountered an error

/**
 * A single suggestion from the Next-Step Engine.
 */
export interface NextStepSuggestion {
  /** Unique identifier for this suggestion */
  id: string;
  
  /** Short, descriptive title for the suggestion */
  title: string;
  
  /** Brief explanation of why this step is relevant and currently missing */
  reason: string;
  
  /** Suggested plan-level text suitable for insertion into the letter */
  suggestedText: string;
  
  /** Priority level for ordering (low | medium | high) */
  priority: NextStepPriority;
  
  /** Category of the suggestion for grouping (optional) */
  category?: 'investigation' | 'medication' | 'referral' | 'follow-up' | 'lifestyle' | 'monitoring' | 'other';
}

/**
 * Input context for the Next-Step Engine.
 * Derived from the final letter and patient context.
 */
export interface NextStepEngineInput {
  /** The final letter text (current version at time of execution) */
  letterText: string;
  
  /** Structured patient context */
  patientContext: NextStepPatientContext;
  
  /** Session ID for tracking */
  sessionId: string;
  
  /** The agent type that generated the letter (e.g., 'quick-letter') */
  sourceAgentType: string;
}

/**
 * Structured patient context for the Next-Step Engine.
 */
export interface NextStepPatientContext {
  /** Patient background and comorbidities */
  background?: string;
  
  /** Current medication list */
  medications?: string;
  
  /** Investigation summaries (echo, CT, angiogram, ECG, labs) */
  investigations?: string;
  
  /** Optional patient summary object */
  patientSummary?: string;
  
  /** Patient demographics */
  demographics?: {
    name?: string;
    age?: number | string;
    gender?: string;
  };
}

/**
 * Result from the Next-Step Engine.
 */
export interface NextStepEngineResult {
  /** List of suggestions (may be empty - this is valid and expected) */
  suggestions: NextStepSuggestion[];
  
  /** Processing status */
  status: NextStepStatus;
  
  /** Processing time in milliseconds */
  processingTime: number;
  
  /** Error message if status is 'error' */
  error?: string;
  
  /** Timestamp when the result was generated */
  timestamp: number;
}

/**
 * State for the Next-Step Engine UI card.
 */
export interface NextStepCardState {
  /** Current status of the engine */
  status: NextStepStatus;
  
  /** Results from the engine (may be null if not yet run) */
  result: NextStepEngineResult | null;
  
  /** Whether the card is expanded (collapsed by default when no suggestions) */
  isExpanded: boolean;
  
  /** Selected suggestion IDs for integration */
  selectedSuggestionIds: Set<string>;
  
  /** Whether integration is in progress */
  isIntegrating: boolean;
}

/**
 * Letter version for undo functionality.
 * Stored to support single-action revert.
 */
export interface LetterVersion {
  /** Version ID */
  id: string;
  
  /** The letter content */
  content: string;
  
  /** Timestamp when this version was created */
  timestamp: number;
  
  /** Description of what changed (for internal tracking) */
  changeDescription?: string;
  
  /** Suggestions that were integrated to create this version (if applicable) */
  integratedSuggestionIds?: string[];
}

/**
 * Letter version history for undo support.
 */
export interface LetterVersionHistory {
  /** Current version index */
  currentIndex: number;
  
  /** All stored versions */
  versions: LetterVersion[];
  
  /** Maximum versions to keep (rolling window) */
  maxVersions: number;
}

/**
 * Integration request for merging suggestions into the letter.
 */
export interface NextStepIntegrationRequest {
  /** Current letter content (may include manual edits) */
  currentLetter: string;
  
  /** Suggestions to integrate */
  suggestions: NextStepSuggestion[];
  
  /** Session ID for tracking */
  sessionId: string;
  
  /** Original patient context */
  patientContext: NextStepPatientContext;
}

/**
 * Result of the integration process.
 */
export interface NextStepIntegrationResult {
  /** The rewritten letter with integrated suggestions */
  rewrittenLetter: string;
  
  /** Whether the integration was successful */
  success: boolean;
  
  /** Error message if not successful */
  error?: string;
  
  /** Processing time in milliseconds */
  processingTime: number;
  
  /** IDs of suggestions that were integrated */
  integratedSuggestionIds: string[];
}
