/**
 * Envelope Builder for Quick Letter Paste Feature
 *
 * Builds the JSON envelope + raw notes payload for LLM processing.
 * Ensures timestamp uses Australia/Melbourne offset and raw notes are appended verbatim.
 */

import type { PasteEnvelope, ParsedNotes, EMRContext } from '@/types/pasteNotes.types';

/**
 * Build paste envelope for LLM input
 */
export function buildPasteEnvelope(
  parsedNotes: ParsedNotes,
  emrContext: EMRContext,
  flags: {
    identity_mismatch: boolean;
    patient_friendly_requested: boolean;
  }
): string {
  // Get timestamp with Australia/Melbourne offset
  const timestamp_local = getAustraliaMelbourneTimestamp();

  // Build structured envelope
  const envelope: PasteEnvelope = {
    mode: 'paste',
    timestamp_local,
    emr_context: emrContext,
    notes: parsedNotes,
    policy: {
      emr_is_baseline: true,
      typed_notes_modify_on_top: true,
      meds_strategy: 'hybrid_keyword_first_with_heuristic_fallback',
      review_triggers: 'conditional'
    },
    flags
  };

  // Convert to JSON
  const jsonEnvelope = JSON.stringify(envelope, null, 2);

  // Append raw notes verbatim (preserve nuance)
  const fullPayload = `${jsonEnvelope}\n\n--- RAW NOTES (VERBATIM) ---\n${parsedNotes.raw}`;

  return fullPayload;
}

/**
 * Get current timestamp with Australia/Melbourne timezone offset
 * Format: ISO8601 with offset (e.g., "2025-02-10T14:30:00+11:00")
 */
function getAustraliaMelbourneTimestamp(): string {
  const now = new Date();

  // Australia/Melbourne offset (AEDT: UTC+11, AEST: UTC+10)
  // This is a simplified approach - in production, use a proper timezone library
  const melbourneOffsetMinutes = getMelbourneOffsetMinutes(now);
  const offsetHours = Math.floor(Math.abs(melbourneOffsetMinutes) / 60);
  const offsetMinutes = Math.abs(melbourneOffsetMinutes) % 60;
  const offsetSign = melbourneOffsetMinutes >= 0 ? '+' : '-';
  const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;

  // Adjust time to Melbourne timezone
  const melbourneTime = new Date(now.getTime() + melbourneOffsetMinutes * 60 * 1000);

  // Format as ISO8601 with offset
  const year = melbourneTime.getUTCFullYear();
  const month = String(melbourneTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(melbourneTime.getUTCDate()).padStart(2, '0');
  const hours = String(melbourneTime.getUTCHours()).padStart(2, '0');
  const minutes = String(melbourneTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(melbourneTime.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetString}`;
}

/**
 * Get Melbourne timezone offset in minutes
 * Simplified implementation - handles DST transitions
 */
function getMelbourneOffsetMinutes(date: Date): number {
  // Melbourne observes DST: AEDT (UTC+11) from first Sunday in October to first Sunday in April
  // Otherwise AEST (UTC+10)
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed

  // DST starts: First Sunday in October (month 9)
  // DST ends: First Sunday in April (month 3)
  let isDST = false;

  if (month > 9 || month < 3) {
    // November, December, January, February (definitely DST)
    isDST = true;
  } else if (month > 3 && month < 9) {
    // May, June, July, August, September (definitely standard time)
    isDST = false;
  } else if (month === 9) {
    // October - need to check if we're past first Sunday
    const firstSunday = getFirstSunday(year, 9);
    isDST = date.getDate() >= firstSunday;
  } else if (month === 3) {
    // April - need to check if we're before first Sunday
    const firstSunday = getFirstSunday(year, 3);
    isDST = date.getDate() < firstSunday;
  }

  // AEDT: UTC+11 (660 minutes), AEST: UTC+10 (600 minutes)
  return isDST ? 660 : 600;
}

/**
 * Get the date of the first Sunday in a given month
 */
function getFirstSunday(year: number, month: number): number {
  const firstDay = new Date(year, month, 1);
  const dayOfWeek = firstDay.getDay();
  // If first day is Sunday (0), return 1; otherwise calculate days until Sunday
  return dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
}

/**
 * Validate envelope structure
 */
export function validateEnvelope(envelope: string): { valid: boolean; error?: string } {
  try {
    // Check that envelope contains JSON
    if (!envelope.includes('{') || !envelope.includes('}')) {
      return { valid: false, error: 'Envelope does not contain JSON structure' };
    }

    // Check that envelope contains raw notes section
    if (!envelope.includes('--- RAW NOTES (VERBATIM) ---')) {
      return { valid: false, error: 'Envelope does not contain raw notes section' };
    }

    // Extract JSON portion
    const jsonStart = envelope.indexOf('{');
    const jsonEnd = envelope.lastIndexOf('}', envelope.indexOf('--- RAW NOTES')) + 1;
    const jsonString = envelope.substring(jsonStart, jsonEnd);

    // Validate JSON can be parsed
    const parsed = JSON.parse(jsonString) as PasteEnvelope;

    // Validate required fields
    if (parsed.mode !== 'paste') {
      return { valid: false, error: 'Invalid mode (must be "paste")' };
    }

    if (!parsed.timestamp_local || !parsed.timestamp_local.includes('+')) {
      return { valid: false, error: 'Invalid or missing timestamp with timezone offset' };
    }

    if (!parsed.emr_context || !parsed.notes) {
      return { valid: false, error: 'Missing emr_context or notes' };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Envelope validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Extract raw notes from envelope (for testing/debugging)
 */
export function extractRawNotesFromEnvelope(envelope: string): string | null {
  const marker = '--- RAW NOTES (VERBATIM) ---';
  const markerIndex = envelope.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  return envelope.substring(markerIndex + marker.length).trim();
}
