/**
 * Centralized Formatting Utilities
 *
 * Provides canonical formatters for time, word count, and read time
 * to ensure consistency across the application and prevent display bugs.
 */

/**
 * Format elapsed time with overflow protection
 *
 * @param ms - Milliseconds elapsed
 * @returns Formatted string: "5s" or "2m 13s" or "1h 23m"
 *
 * @example
 * formatElapsedTime(5000) // "5s"
 * formatElapsedTime(133000) // "2m 13s"
 * formatElapsedTime(5400000) // "1h 30m"
 */
export function formatElapsedTime(ms: number | null | undefined): string {
  if (ms == null || ms < 0) return '0s';

  // Protect against absurdly large values (> 24 hours = likely bug)
  if (ms > 86400000) {
    console.warn(`formatElapsedTime: Suspiciously large value ${ms}ms, clamping to 24h`);
    ms = 86400000;
  }

  const totalSeconds = Math.floor(ms / 1000);

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const totalMinutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (totalMinutes < 60) {
    return seconds === 0 ? `${totalMinutes}m` : `${totalMinutes}m ${seconds.toString().padStart(2, '0')}s`;
  }

  // Hours display
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

/**
 * Format absolute time (clock time)
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted string: "14:23" or "—" if invalid
 *
 * @example
 * formatAbsoluteTime(1704067380000) // "14:23"
 * formatAbsoluteTime(null) // "—"
 */
export function formatAbsoluteTime(timestamp: number | null | undefined): string {
  if (timestamp == null || timestamp <= 0) return '—';

  try {
    const date = new Date(timestamp);
    // Basic validation
    if (isNaN(date.getTime())) return '—';

    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    console.warn('formatAbsoluteTime: Invalid timestamp', timestamp);
    return '—';
  }
}

/**
 * Format relative time ("2m ago")
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted string: "just now", "2m ago", "3h ago", "2d ago"
 *
 * @example
 * formatRelativeTime(Date.now() - 5000) // "just now"
 * formatRelativeTime(Date.now() - 300000) // "5m ago"
 * formatRelativeTime(Date.now() - 7200000) // "2h ago"
 */
export function formatRelativeTime(timestamp: number | null | undefined): string {
  if (timestamp == null || timestamp <= 0) return 'just now';

  const diff = Date.now() - timestamp;

  // Handle future timestamps or invalid
  if (diff < 0) return 'just now';
  if (diff < 10000) return 'just now'; // < 10s

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Calculate word count from text
 *
 * Properly handles:
 * - Empty/whitespace-only strings
 * - Multiple spaces
 * - Unicode characters
 * - Newlines and tabs
 *
 * @param text - Input text
 * @returns Word count (0 for invalid input)
 *
 * @example
 * calculateWordCount("Hello world") // 2
 * calculateWordCount("  ") // 0
 * calculateWordCount("") // 0
 * calculateWordCount("Hello   world  \n  test") // 3
 */
export function calculateWordCount(text: string | null | undefined): number {
  if (!text || typeof text !== 'string') return 0;

  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;

  // Split on whitespace and filter empty strings
  const words = trimmed.split(/\s+/).filter(word => word.length > 0);
  return words.length;
}

/**
 * Calculate estimated reading time
 *
 * Returns null for very short texts (< threshold) to avoid
 * showing misleading "1 min read" for 18-word snippets.
 *
 * Uses 200 words/minute average reading speed.
 *
 * @param wordCount - Number of words
 * @param minWordThreshold - Minimum words to show read time (default: 80)
 * @returns Minutes to read, or null if below threshold
 *
 * @example
 * calculateReadTime(250) // 2 (minutes)
 * calculateReadTime(50) // null (too short)
 * calculateReadTime(800) // 4 (minutes)
 */
export function calculateReadTime(wordCount: number, minWordThreshold = 80): number | null {
  if (wordCount < minWordThreshold) return null;

  const WORDS_PER_MINUTE = 200;
  return Math.ceil(wordCount / WORDS_PER_MINUTE);
}

/**
 * Format read time for display
 *
 * @param readTimeMinutes - Minutes to read (or null)
 * @returns Formatted string: "2 min read" or empty string if null
 *
 * @example
 * formatReadTime(3) // "3 min read"
 * formatReadTime(null) // ""
 */
export function formatReadTime(readTimeMinutes: number | null): string {
  if (readTimeMinutes == null) return '';
  return `${readTimeMinutes} min read`;
}
