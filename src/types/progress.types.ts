/**
 * Progress Stage Taxonomy (B7)
 *
 * Controlled vocabulary for processing stages used across:
 * - DSPy server streaming events
 * - UI progress indicators
 * - Pipeline progress tracking
 *
 * This provides consistent, user-friendly stage names that map to
 * the existing PipelineStage type but with more granular semantics.
 */

/**
 * Complete stage vocabulary for guided generation pipeline.
 * These map to user-friendly labels and can be used for progress tracking.
 */
export const STAGES = [
  'collecting',     // Gathering inputs (transcript, EMR data)
  'transcribing',   // Audio → text conversion
  'extracting',     // Key facts extraction from inputs
  'reasoning',      // AI analysis and decision making
  'formatting',     // Structuring the output
  'validating',     // Verification and checks
  'inserting',      // Writing to destination (EMR, clipboard)
  'complete'        // Successfully finished
] as const;

export type StageName = typeof STAGES[number];

/**
 * Human-readable labels for each stage (Australian English)
 */
export const STAGE_LABELS: Record<StageName, string> = {
  collecting: 'Collecting inputs',
  transcribing: 'Transcribing audio',
  extracting: 'Extracting key facts',
  reasoning: 'Analysing data',
  formatting: 'Formatting output',
  validating: 'Validating results',
  inserting: 'Inserting into EMR',
  complete: 'Complete'
};

/**
 * Short labels for compact display
 */
export const STAGE_SHORT_LABELS: Record<StageName, string> = {
  collecting: 'Collecting',
  transcribing: 'Transcribing',
  extracting: 'Extracting',
  reasoning: 'Analysing',
  formatting: 'Formatting',
  validating: 'Validating',
  inserting: 'Inserting',
  complete: 'Done'
};

/**
 * What's happening explanations for each stage (for tooltips/help)
 */
export const STAGE_DESCRIPTIONS: Record<StageName, string> = {
  collecting: 'Gathering transcript and patient data from the EMR',
  transcribing: 'Converting your voice recording to text using the transcription engine',
  extracting: 'Identifying key clinical facts from the transcript',
  reasoning: 'AI model is analysing the data and generating insights',
  formatting: 'Structuring the output into the final format',
  validating: 'Checking the output for accuracy and completeness',
  inserting: 'Writing the result to the EMR or clipboard',
  complete: 'Processing finished successfully'
};

/**
 * Icon names for each stage (Lucide icon names)
 */
export const STAGE_ICONS: Record<StageName, string> = {
  collecting: 'ClipboardList',
  transcribing: 'FileText',
  extracting: 'Search',
  reasoning: 'Brain',
  formatting: 'FileOutput',
  validating: 'CheckCircle',
  inserting: 'FileInput',
  complete: 'CheckCircle2'
};

/**
 * Progress percentage ranges for each stage (approximate)
 * These define where in the 0-100 range each stage typically occurs
 */
export const STAGE_PROGRESS_RANGES: Record<StageName, [number, number]> = {
  collecting: [0, 5],
  transcribing: [5, 35],
  extracting: [35, 45],
  reasoning: [45, 85],
  formatting: [85, 95],
  validating: [95, 98],
  inserting: [98, 100],
  complete: [100, 100]
};

/**
 * Map new StageName to existing PipelineStage for backwards compatibility
 */
export function stageToPipelineStage(stage: StageName): 'audio-processing' | 'transcribing' | 'ai-analysis' | 'generation' {
  switch (stage) {
    case 'collecting':
      return 'audio-processing';
    case 'transcribing':
      return 'transcribing';
    case 'extracting':
    case 'reasoning':
      return 'ai-analysis';
    case 'formatting':
    case 'validating':
    case 'inserting':
    case 'complete':
      return 'generation';
    default:
      return 'ai-analysis';
  }
}

/**
 * Map existing PipelineStage to closest StageName
 */
export function pipelineStageToStageName(stage: 'audio-processing' | 'transcribing' | 'ai-analysis' | 'generation'): StageName {
  switch (stage) {
    case 'audio-processing':
      return 'collecting';
    case 'transcribing':
      return 'transcribing';
    case 'ai-analysis':
      return 'reasoning';
    case 'generation':
      return 'formatting';
    default:
      return 'reasoning';
  }
}

/**
 * Validate if a string is a valid StageName
 */
export function isValidStageName(value: string): value is StageName {
  return STAGES.includes(value as StageName);
}

/**
 * Parse a server stage string to StageName, with fallback
 * Maps arbitrary server phase strings to controlled vocabulary
 */
export function parseServerStage(serverStage: string): StageName {
  const normalized = serverStage.toLowerCase().trim();

  // Direct matches
  if (isValidStageName(normalized)) {
    return normalized;
  }

  // Common aliases
  const aliases: Record<string, StageName> = {
    'audio processing': 'collecting',
    'audio-processing': 'collecting',
    'processing audio': 'collecting',
    'recording': 'collecting',
    'initializing': 'collecting',
    'initialization': 'collecting',
    'init': 'collecting',
    'setup': 'collecting',

    'transcription': 'transcribing',
    'speech to text': 'transcribing',
    'asr': 'transcribing',
    'whisper': 'transcribing',

    'extraction': 'extracting',
    'key facts': 'extracting',
    'parsing': 'extracting',

    'ai analysis': 'reasoning',
    'analysis': 'reasoning',
    'ai-analysis': 'reasoning',
    'thinking': 'reasoning',
    'processing': 'reasoning',
    'inference': 'reasoning',
    'generation': 'reasoning',
    'generating': 'reasoning',

    'format': 'formatting',
    'output': 'formatting',
    'structuring': 'formatting',

    'validation': 'validating',
    'checking': 'validating',
    'verify': 'validating',
    'finalizing': 'validating',
    'finalization': 'validating',

    'insert': 'inserting',
    'writing': 'inserting',
    'saving': 'inserting',
    'emr': 'inserting',

    'done': 'complete',
    'finished': 'complete',
    'completed': 'complete',
    'success': 'complete'
  };

  if (aliases[normalized]) {
    return aliases[normalized];
  }

  // Default to reasoning for unknown stages
  return 'reasoning';
}

/**
 * SSE Progress event from DSPy server
 */
export interface ProgressEvent {
  /** Controlled stage name */
  stage: StageName;
  /** Overall progress 0-100 */
  percent?: number;
  /** Human-readable detail message */
  detail?: string;
  /** Timestamp */
  timestamp?: number;
}

/**
 * Create a progress event with proper typing
 */
export function createProgressEvent(
  stage: StageName,
  percent?: number,
  detail?: string
): ProgressEvent {
  return {
    stage,
    percent: percent !== undefined ? Math.min(100, Math.max(0, percent)) : undefined,
    detail,
    timestamp: Date.now()
  };
}
