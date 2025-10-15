/**
 * Device Name Utilities
 *
 * Provides consistent device name shortening for UI display.
 * Removes common prefixes and keeps essential brand/model information.
 */

/**
 * Shortens device names for compact display in header.
 * Removes "Default - " prefix and keeps first meaningful token.
 *
 * Examples:
 * - "Default - MacBook Pro Microphone" → "MacBook Pro"
 * - "External Microphone" → "External Microphone"
 * - "AirPods Pro" → "AirPods Pro"
 *
 * @param name Full device name
 * @param maxTokens Maximum number of tokens to keep (default: 2)
 * @returns Shortened device name
 */
export function shortDeviceName(name: string, maxTokens: number = 2): string {
  if (!name) return 'Unknown';

  // Remove "Default - " prefix (common in macOS)
  let cleaned = name.replace(/^Default\s*-\s*/i, '');

  // Remove trailing descriptors like "Microphone", "Speaker", "Camera"
  cleaned = cleaned.replace(/\s+(Microphone|Speaker|Camera|Input|Output)$/i, '');

  // Split into tokens and keep first N meaningful ones
  const tokens = cleaned.trim().split(/\s+/);

  if (tokens.length <= maxTokens) {
    return cleaned.trim();
  }

  return tokens.slice(0, maxTokens).join(' ');
}

/**
 * Gets a very short device name for ultra-compact displays (e.g., "MacBook")
 */
export function veryShortDeviceName(name: string): string {
  return shortDeviceName(name, 1);
}

/**
 * Formats device summary line for header display.
 * Format: "Mic: {shortName} • Out: {shortName}"
 *
 * @param micName Microphone device name
 * @param speakerName Speaker device name
 * @returns Formatted summary string
 */
export function formatDeviceSummary(micName: string, speakerName: string): string {
  const mic = shortDeviceName(micName);
  const speaker = shortDeviceName(speakerName);
  return `Mic: ${mic} • Out: ${speaker}`;
}
