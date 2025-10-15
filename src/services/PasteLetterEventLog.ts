/**
 * Paste Letter Event Log Service (PHI-Free)
 *
 * Logs paste letter generation events with NO patient data.
 * Only stores booleans, flags, and metadata for analytics.
 */

import type { PasteLetterEvent } from '@/types/pasteNotes.types';

const LOG_STORAGE_KEY = 'operator_paste_letter_events';
const MAX_LOG_ENTRIES = 100; // Keep only last 100 events

/**
 * Log a paste letter event (PHI-free)
 */
export function logPasteLetterEvent(event: Omit<PasteLetterEvent, 'timestamp'>): void {
  try {
    const fullEvent: PasteLetterEvent = {
      ...event,
      timestamp: Date.now()
    };

    // Get existing log
    const log = getPasteLetterLog();

    // Add new event
    log.push(fullEvent);

    // Trim to max size (FIFO)
    if (log.length > MAX_LOG_ENTRIES) {
      log.splice(0, log.length - MAX_LOG_ENTRIES);
    }

    // Save back to storage
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(log));

    console.log('📊 Paste letter event logged:', {
      mode: fullEvent.mode,
      success: fullEvent.success,
      had_snapshot: fullEvent.had_snapshot,
      review_trigger_conflict: fullEvent.review_trigger_conflict,
      identity_mismatch: fullEvent.identity_mismatch,
      used_stepper: fullEvent.used_stepper,
      error_type: fullEvent.error_type
    });
  } catch (error) {
    console.error('Failed to log paste letter event:', error);
  }
}

/**
 * Get all paste letter events from log
 */
export function getPasteLetterLog(): PasteLetterEvent[] {
  try {
    const stored = localStorage.getItem(LOG_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    return JSON.parse(stored) as PasteLetterEvent[];
  } catch (error) {
    console.error('Failed to retrieve paste letter log:', error);
    return [];
  }
}

/**
 * Get paste letter statistics
 */
export interface PasteLetterStats {
  total_attempts: number;
  successful: number;
  failed: number;
  success_rate: number;
  with_snapshot: number;
  with_review_triggers: number;
  with_identity_mismatch: number;
  with_stepper: number;
  error_types: Record<string, number>;
  avg_confidence?: number;
}

export function getPasteLetterStats(): PasteLetterStats {
  const log = getPasteLetterLog();

  if (log.length === 0) {
    return {
      total_attempts: 0,
      successful: 0,
      failed: 0,
      success_rate: 0,
      with_snapshot: 0,
      with_review_triggers: 0,
      with_identity_mismatch: 0,
      with_stepper: 0,
      error_types: {}
    };
  }

  const successful = log.filter(e => e.success).length;
  const failed = log.length - successful;
  const with_snapshot = log.filter(e => e.had_snapshot).length;
  const with_review_triggers = log.filter(e => e.review_trigger_conflict).length;
  const with_identity_mismatch = log.filter(e => e.identity_mismatch).length;
  const with_stepper = log.filter(e => e.used_stepper).length;

  // Count error types
  const error_types: Record<string, number> = {};
  log.filter(e => !e.success && e.error_type).forEach(e => {
    const errorType = e.error_type!;
    error_types[errorType] = (error_types[errorType] || 0) + 1;
  });

  // Calculate average confidence (for successful generations with confidence data)
  const confidenceValues = log
    .filter(e => e.success && e.model_confidence !== undefined)
    .map(e => e.model_confidence!);
  const avg_confidence = confidenceValues.length > 0
    ? confidenceValues.reduce((sum, val) => sum + val, 0) / confidenceValues.length
    : undefined;

  return {
    total_attempts: log.length,
    successful,
    failed,
    success_rate: (successful / log.length) * 100,
    with_snapshot,
    with_review_triggers,
    with_identity_mismatch,
    with_stepper,
    error_types,
    avg_confidence
  };
}

/**
 * Clear paste letter log
 */
export function clearPasteLetterLog(): void {
  try {
    localStorage.removeItem(LOG_STORAGE_KEY);
    console.log('📊 Paste letter log cleared');
  } catch (error) {
    console.error('Failed to clear paste letter log:', error);
  }
}

/**
 * Export paste letter log as JSON (for analysis/debugging)
 */
export function exportPasteLetterLog(): string {
  const log = getPasteLetterLog();
  const stats = getPasteLetterStats();

  return JSON.stringify(
    {
      metadata: {
        exported_at: new Date().toISOString(),
        total_events: log.length,
        stats
      },
      events: log
    },
    null,
    2
  );
}

/**
 * Get recent paste letter events (last N)
 */
export function getRecentPasteLetterEvents(count: number = 10): PasteLetterEvent[] {
  const log = getPasteLetterLog();
  return log.slice(-count).reverse(); // Most recent first
}
