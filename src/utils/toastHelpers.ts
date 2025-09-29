import { ToastService } from '@/services/ToastService';

/**
 * Standardized toast notification helpers for consistent messaging across the application.
 * These helpers ensure consistent appearance, duration, and messaging patterns.
 */

const toastService = ToastService.getInstance();

// Standard durations for different toast types
const TOAST_DURATIONS = {
  success: 3000,    // 3 seconds for success messages
  error: 4000,      // 4 seconds for errors (slightly longer)
  warning: 4000,    // 4 seconds for warnings
  info: 3000,       // 3 seconds for info messages
  brief: 2000,      // 2 seconds for very brief confirmations
  extended: 6000    // 6 seconds for important messages that need more time
} as const;

// Recording and Processing Toasts
export const RecordingToasts = {
  recordingStarted: (agentType: string) => 
    toastService.success(
      'Recording Started',
      `${agentType} recording in progress`,
      TOAST_DURATIONS.brief
    ),

  recordingSent: (patientName: string, agentType: string) =>
    toastService.success(
      'Recording Sent for Processing',
      `${patientName}'s ${agentType} recording is being processed. Ready for next recording.`,
      TOAST_DURATIONS.success
    ),

  sessionReady: (patientName: string, agentType: string) =>
    toastService.success(
      'Session Ready for Review',
      `${patientName}'s ${agentType} results are ready. Click the notification bell to view.`,
      TOAST_DURATIONS.extended
    ),

  processingFailed: (patientName: string) =>
    toastService.error(
      'Processing Failed',
      `${patientName}'s recording failed`,
      TOAST_DURATIONS.error
    ),

  transcriptionFailed: (reason: 'no-audio' | 'too-short' | 'service-unavailable' | 'error') => {
    const messages = {
      'no-audio': 'No audio detected',
      'too-short': 'Recording too short',
      'service-unavailable': 'Transcription service unavailable',
      'error': 'Transcription service error'
    };
    
    return toastService.error(
      'Audio Transcription Failed',
      messages[reason],
      TOAST_DURATIONS.error
    );
  }
};

// File and Media Toasts
export const FileToasts = {
  imageAdded: (index: number) =>
    toastService.success(
      'Image Added',
      `Screenshot ${index + 1} loaded successfully`,
      TOAST_DURATIONS.brief
    ),

  imageRemoved: (index: number) =>
    toastService.success(
      'Screenshot Removed',
      `Slot ${index + 1} cleared`,
      TOAST_DURATIONS.brief
    ),

  imagesCombined: (count: number) =>
    toastService.success(
      'Screenshots Combined!',
      `${count} screenshots combined and copied to clipboard`,
      TOAST_DURATIONS.success
    ),

  allCleared: () =>
    toastService.success(
      'Cleared',
      'All screenshots removed',
      TOAST_DURATIONS.brief
    ),

  invalidFile: (allowedTypes: string = 'PNG, JPG, GIF') =>
    toastService.error(
      'Invalid File',
      `Please select an image file (${allowedTypes})`,
      TOAST_DURATIONS.error
    ),

  noFiles: () =>
    toastService.error(
      'No Files',
      'No files were detected in the drag operation',
      TOAST_DURATIONS.error
    ),

  combineFailed: (error?: string) =>
    toastService.error(
      'Combine Failed',
      error || 'Failed to combine screenshots',
      TOAST_DURATIONS.error
    ),

  importFailed: () =>
    toastService.error(
      'Import Failed',
      'Could not load dropped image',
      TOAST_DURATIONS.error
    ),

  noScreenshots: () =>
    toastService.error(
      'No Screenshots',
      'Please add at least one screenshot to combine',
      TOAST_DURATIONS.error
    )
};

// System and Service Toasts
export const SystemToasts = {
  serviceRefreshed: (serviceName: string) =>
    toastService.success(
      'Service Refreshed',
      `${serviceName} connection restored`,
      TOAST_DURATIONS.success
    ),

  serviceError: (serviceName: string) =>
    toastService.error(
      'Service Error',
      `${serviceName} connection failed`,
      TOAST_DURATIONS.error
    ),

  streamingFailed: () =>
    toastService.error(
      'Streaming Failed',
      'Check LM Studio connection',
      TOAST_DURATIONS.error
    ),

  settingsSaved: () =>
    toastService.success(
      'Settings Saved',
      'Your preferences have been updated',
      TOAST_DURATIONS.success
    ),

  settingsError: () =>
    toastService.error(
      'Settings Error',
      'Failed to save preferences',
      TOAST_DURATIONS.error
    )
};

// General utility toasts
export const GeneralToasts = {
  copied: (what: string = 'Content') =>
    toastService.success(
      'Copied!',
      `${what} copied to clipboard`,
      TOAST_DURATIONS.brief
    ),

  saved: (what: string = 'Data') =>
    toastService.success(
      'Saved',
      `${what} saved successfully`,
      TOAST_DURATIONS.success
    ),

  deleted: (what: string = 'Item') =>
    toastService.success(
      'Deleted',
      `${what} removed`,
      TOAST_DURATIONS.brief
    ),

  actionFailed: (action: string, reason?: string) =>
    toastService.error(
      'Action Failed',
      reason ? `${action}: ${reason}` : `Failed to ${action.toLowerCase()}`,
      TOAST_DURATIONS.error
    ),

  actionCompleted: (action: string) =>
    toastService.success(
      'Action Completed',
      action,
      TOAST_DURATIONS.success
    ),

  loading: (what: string) =>
    toastService.info(
      'Loading',
      `Loading ${what}...`,
      TOAST_DURATIONS.info
    ),

  warning: (title: string, message?: string) =>
    toastService.warning(
      title,
      message,
      TOAST_DURATIONS.warning
    ),

  info: (title: string, message?: string) =>
    toastService.info(
      title,
      message,
      TOAST_DURATIONS.info
    )
};

// Custom toast with standardized appearance
export const customToast = {
  success: (title: string, message?: string, duration?: number) =>
    toastService.success(title, message, duration || TOAST_DURATIONS.success),
    
  error: (title: string, message?: string, duration?: number) =>
    toastService.error(title, message, duration || TOAST_DURATIONS.error),
    
  warning: (title: string, message?: string, duration?: number) =>
    toastService.warning(title, message, duration || TOAST_DURATIONS.warning),
    
  info: (title: string, message?: string, duration?: number) =>
    toastService.info(title, message, duration || TOAST_DURATIONS.info)
};

/**
 * Toast positioning and appearance standards:
 * 
 * - Position: Fixed top-right, 1rem from edges
 * - Max width: 20rem (320px) with responsive fallback
 * - Animation: Slide in from right
 * - Duration: Type-specific (2-6 seconds)
 * - Style: Monochrome with semantic color accents
 * - Accessibility: ARIA live region, proper labels
 * 
 * Usage Guidelines:
 * - Use specific helper functions for common scenarios
 * - Prefer brief, action-oriented titles
 * - Include helpful details in message when needed
 * - Consider user context and urgency when choosing duration
 */