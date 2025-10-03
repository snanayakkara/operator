/**
 * Shared State Color Definitions
 *
 * Provides consistent color theming across all processing states, progress bars,
 * session timelines, and status indicators. This ensures a unified visual language
 * where the same state always uses the same colors.
 *
 * Color Philosophy:
 * - Red gradients: Recording/active/danger states
 * - Blue gradients: Transcription/information states
 * - Purple gradients: AI processing/intelligence states
 * - Emerald gradients: Generation/success states
 * - Rose gradients: Error/warning states
 * - Teal gradients: Completed/done states
 */

export type ProcessingState =
  | 'recording'
  | 'transcribing'
  | 'ai-analysis'
  | 'generation'
  | 'completed'
  | 'error'
  | 'needs_review'
  | 'processing'; // Generic processing state

export interface StateColorScheme {
  // Gradient colors for backgrounds
  gradient: {
    from: string;
    via?: string;
    to: string;
  };
  // Border colors
  border: string;
  // Text colors
  text: string;
  // Dot/indicator colors (for timeline dots, status badges)
  indicator: string;
  // CSS class for background gradient
  bgGradient: string;
  // CSS class for progress bar gradient
  progressGradient: {
    inactive: string;
    active: string;
    complete: string;
  };
}

/**
 * Comprehensive color definitions for all processing states
 */
export const STATE_COLORS: Record<ProcessingState, StateColorScheme> = {
  recording: {
    gradient: {
      from: 'red-50',
      to: 'rose-50'
    },
    border: 'red-200',
    text: 'red-600',
    indicator: 'red-500',
    bgGradient: 'bg-gradient-to-br from-red-50/40 to-rose-50/30',
    progressGradient: {
      inactive: 'bg-gray-200',
      active: 'bg-gradient-to-r from-red-400 to-rose-500',
      complete: 'bg-gradient-to-r from-red-500 to-rose-600'
    }
  },

  transcribing: {
    gradient: {
      from: 'blue-50',
      to: 'indigo-50'
    },
    border: 'blue-200',
    text: 'blue-600',
    indicator: 'blue-500',
    bgGradient: 'bg-gradient-to-br from-blue-50/35 to-indigo-50/25',
    progressGradient: {
      inactive: 'bg-gray-200',
      active: 'bg-gradient-to-r from-blue-400 to-indigo-500',
      complete: 'bg-gradient-to-r from-blue-500 to-indigo-600'
    }
  },

  'ai-analysis': {
    gradient: {
      from: 'purple-50',
      to: 'violet-50'
    },
    border: 'purple-200',
    text: 'purple-600',
    indicator: 'purple-500',
    bgGradient: 'bg-gradient-to-br from-purple-50/45 to-violet-50/35',
    progressGradient: {
      inactive: 'bg-gray-200',
      active: 'bg-gradient-to-r from-violet-400 to-fuchsia-500',
      complete: 'bg-gradient-to-r from-violet-500 to-fuchsia-600'
    }
  },

  generation: {
    gradient: {
      from: 'emerald-50',
      to: 'teal-50'
    },
    border: 'emerald-200',
    text: 'emerald-600',
    indicator: 'emerald-500',
    bgGradient: 'bg-gradient-to-br from-emerald-50/40 to-teal-50/30',
    progressGradient: {
      inactive: 'bg-gray-200',
      active: 'bg-gradient-to-r from-emerald-400 to-teal-500',
      complete: 'bg-gradient-to-r from-emerald-500 to-teal-600'
    }
  },

  completed: {
    gradient: {
      from: 'emerald-50',
      to: 'teal-50'
    },
    border: 'emerald-200',
    text: 'emerald-600',
    indicator: 'emerald-500',
    bgGradient: 'bg-gradient-to-br from-emerald-50/50 to-teal-50/40',
    progressGradient: {
      inactive: 'bg-gray-200',
      active: 'bg-gradient-to-r from-emerald-400 to-teal-500',
      complete: 'bg-gradient-to-r from-emerald-500 to-teal-600'
    }
  },

  needs_review: {
    gradient: {
      from: 'amber-50',
      to: 'yellow-50'
    },
    border: 'amber-200',
    text: 'amber-700',
    indicator: 'amber-500',
    bgGradient: 'bg-gradient-to-br from-amber-50/40 to-yellow-50/30',
    progressGradient: {
      inactive: 'bg-gray-200',
      active: 'bg-gradient-to-r from-amber-400 to-yellow-500',
      complete: 'bg-gradient-to-r from-amber-500 to-yellow-600'
    }
  },

  error: {
    gradient: {
      from: 'rose-50',
      to: 'pink-50'
    },
    border: 'rose-200',
    text: 'rose-600',
    indicator: 'rose-500',
    bgGradient: 'bg-gradient-to-br from-rose-50/45 to-pink-50/35',
    progressGradient: {
      inactive: 'bg-gray-200',
      active: 'bg-gradient-to-r from-rose-400 to-pink-500',
      complete: 'bg-gradient-to-r from-rose-500 to-pink-600'
    }
  },

  // Generic processing state (fallback)
  processing: {
    gradient: {
      from: 'purple-50',
      to: 'violet-50'
    },
    border: 'purple-200',
    text: 'purple-600',
    indicator: 'purple-500',
    bgGradient: 'bg-gradient-to-br from-purple-50/45 to-violet-50/35',
    progressGradient: {
      inactive: 'bg-gray-200',
      active: 'bg-gradient-to-r from-purple-400 to-violet-500',
      complete: 'bg-gradient-to-r from-purple-500 to-violet-600'
    }
  }
};

/**
 * Get color scheme for a given state
 */
export function getStateColors(state: ProcessingState): StateColorScheme {
  return STATE_COLORS[state];
}

/**
 * Helper to get Tailwind class string for badge styling
 */
export function getStateBadgeClass(state: ProcessingState): string {
  const colors = getStateColors(state);
  return `bg-gradient-to-br from-${colors.gradient.from} to-${colors.gradient.to} text-${colors.text} border border-${colors.border}/70`;
}

/**
 * Helper to get Tailwind class string for card background
 */
export function getStateCardClass(state: ProcessingState): string {
  const colors = getStateColors(state);
  return `${colors.bgGradient} border-${colors.border}/60`;
}

/**
 * Helper to get Tailwind class string for dot indicator
 */
export function getStateDotClass(state: ProcessingState): string {
  const colors = getStateColors(state);
  return `bg-${colors.indicator} border-${colors.border}/60`;
}

/**
 * Helper to get Tailwind class string for text color
 */
export function getStateTextClass(state: ProcessingState): string {
  const colors = getStateColors(state);
  return `text-${colors.text}`;
}

/**
 * Map pipeline stages to processing states
 */
export function pipelineStageToState(stage: 'audio-processing' | 'transcribing' | 'ai-analysis' | 'generation'): ProcessingState {
  const mapping: Record<string, ProcessingState> = {
    'audio-processing': 'recording',
    'transcribing': 'transcribing',
    'ai-analysis': 'ai-analysis',
    'generation': 'generation'
  };
  return mapping[stage] || 'processing';
}

/**
 * Map session status to processing state
 */
export function sessionStatusToState(status: string): ProcessingState {
  const mapping: Record<string, ProcessingState> = {
    'recording': 'recording',
    'transcribing': 'transcribing',
    'processing': 'ai-analysis',
    'completed': 'completed',
    'error': 'error',
    'cancelled': 'error',
    'needs_review': 'needs_review'
  };
  return mapping[status] || 'processing';
}
