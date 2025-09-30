/**
 * Unit tests for formatting utilities
 */

import { describe, it, expect } from 'vitest';
import {
  formatElapsedTime,
  formatAbsoluteTime,
  formatRelativeTime,
  calculateWordCount,
  calculateReadTime,
  formatReadTime
} from '../../src/utils/formatting';

describe('formatElapsedTime', () => {
  it('should format seconds correctly', () => {
    expect(formatElapsedTime(0)).toBe('0s');
    expect(formatElapsedTime(5000)).toBe('5s');
    expect(formatElapsedTime(59000)).toBe('59s');
  });

  it('should format minutes and seconds', () => {
    expect(formatElapsedTime(60000)).toBe('1m');
    expect(formatElapsedTime(133000)).toBe('2m 13s');
    expect(formatElapsedTime(3599000)).toBe('59m 59s');
  });

  it('should format hours and minutes', () => {
    expect(formatElapsedTime(3600000)).toBe('1h');
    expect(formatElapsedTime(5400000)).toBe('1h 30m');
    expect(formatElapsedTime(7200000)).toBe('2h');
  });

  it('should handle null/undefined gracefully', () => {
    expect(formatElapsedTime(null)).toBe('0s');
    expect(formatElapsedTime(undefined)).toBe('0s');
  });

  it('should handle negative values', () => {
    expect(formatElapsedTime(-1000)).toBe('0s');
  });

  it('should clamp absurdly large values', () => {
    // Value > 24 hours should be clamped
    const result = formatElapsedTime(999999999999);
    expect(result).toBe('24h'); // Clamped to 24h
  });
});

describe('formatAbsoluteTime', () => {
  it('should format valid timestamps', () => {
    const timestamp = new Date('2025-01-01T14:23:00').getTime();
    const result = formatAbsoluteTime(timestamp);
    // Result depends on locale, but should contain time
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it('should handle null/undefined', () => {
    expect(formatAbsoluteTime(null)).toBe('—');
    expect(formatAbsoluteTime(undefined)).toBe('—');
  });

  it('should handle zero/negative timestamps', () => {
    expect(formatAbsoluteTime(0)).toBe('—');
    expect(formatAbsoluteTime(-1)).toBe('—');
  });
});

describe('formatRelativeTime', () => {
  it('should show "just now" for recent times', () => {
    const now = Date.now();
    expect(formatRelativeTime(now)).toBe('just now');
    expect(formatRelativeTime(now - 5000)).toBe('just now');
  });

  it('should format seconds ago', () => {
    const timestamp = Date.now() - 30000; // 30s ago
    expect(formatRelativeTime(timestamp)).toBe('30s ago');
  });

  it('should format minutes ago', () => {
    const timestamp = Date.now() - 300000; // 5m ago
    expect(formatRelativeTime(timestamp)).toBe('5m ago');
  });

  it('should format hours ago', () => {
    const timestamp = Date.now() - 7200000; // 2h ago
    expect(formatRelativeTime(timestamp)).toBe('2h ago');
  });

  it('should format days ago', () => {
    const timestamp = Date.now() - 172800000; // 2d ago
    expect(formatRelativeTime(timestamp)).toBe('2d ago');
  });

  it('should handle null/undefined', () => {
    expect(formatRelativeTime(null)).toBe('just now');
    expect(formatRelativeTime(undefined)).toBe('just now');
  });

  it('should handle future timestamps', () => {
    const future = Date.now() + 100000;
    expect(formatRelativeTime(future)).toBe('just now');
  });
});

describe('calculateWordCount', () => {
  it('should count words correctly', () => {
    expect(calculateWordCount('Hello world')).toBe(2);
    expect(calculateWordCount('The quick brown fox')).toBe(4);
  });

  it('should handle multiple spaces', () => {
    expect(calculateWordCount('Hello   world')).toBe(2);
    expect(calculateWordCount('  Hello   world  ')).toBe(2);
  });

  it('should handle newlines and tabs', () => {
    expect(calculateWordCount('Hello\nworld\ttest')).toBe(3);
  });

  it('should handle empty/whitespace strings', () => {
    expect(calculateWordCount('')).toBe(0);
    expect(calculateWordCount('   ')).toBe(0);
    expect(calculateWordCount('\n\n\t')).toBe(0);
  });

  it('should handle null/undefined', () => {
    expect(calculateWordCount(null)).toBe(0);
    expect(calculateWordCount(undefined)).toBe(0);
  });

  it('should handle unicode characters', () => {
    expect(calculateWordCount('Hello 世界 test')).toBe(3);
  });
});

describe('calculateReadTime', () => {
  it('should calculate read time for sufficient words', () => {
    expect(calculateReadTime(200)).toBe(1); // 200 words = 1 min
    expect(calculateReadTime(250)).toBe(2); // Ceil to 2 min
    expect(calculateReadTime(800)).toBe(4);
  });

  it('should return null for short texts (below threshold)', () => {
    expect(calculateReadTime(50)).toBeNull();
    expect(calculateReadTime(79)).toBeNull();
  });

  it('should respect custom threshold', () => {
    expect(calculateReadTime(50, 40)).toBe(1); // 50 words with 40-word threshold
    expect(calculateReadTime(50, 60)).toBeNull(); // Below 60-word threshold
  });

  it('should handle edge cases', () => {
    expect(calculateReadTime(0)).toBeNull();
    expect(calculateReadTime(80)).toBe(1); // Exactly at threshold
  });
});

describe('formatReadTime', () => {
  it('should format read time correctly', () => {
    expect(formatReadTime(1)).toBe('1 min read');
    expect(formatReadTime(5)).toBe('5 min read');
  });

  it('should return empty string for null', () => {
    expect(formatReadTime(null)).toBe('');
  });
});
