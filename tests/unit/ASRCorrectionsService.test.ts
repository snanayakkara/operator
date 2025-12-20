/**
 * Unit tests for ASR Teaching (E16)
 * Tests the ASR corrections persistence and application
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ASRCorrection } from '@/sidepanel/components/ASRTeachingPopover';

// Mock logger
vi.mock('@/utils/Logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// We need to reset the module between tests to reset the singleton
let ASRCorrectionsService: typeof import('@/services/ASRCorrectionsService').default;
let asrCorrectionsService: typeof import('@/services/ASRCorrectionsService').asrCorrectionsService;

describe('ASRCorrectionsService (E16)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  
  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup fetch mock
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    
    // Reset module to get fresh singleton
    vi.resetModules();
    const module = await import('@/services/ASRCorrectionsService');
    asrCorrectionsService = module.asrCorrectionsService;
    asrCorrectionsService.clearCache();
  });

  const makeOkResponse = (json: unknown) => ({
    ok: true,
    status: 200,
    json: async () => json,
  });

  const makeCorrection = (rawText: string, correctedText: string): ASRCorrection => ({
    id: `test-${Date.now()}`,
    rawText,
    correctedText,
    timestamp: Date.now(),
  });

  describe('loadCorrections', () => {
    it('returns empty array when server returns empty', async () => {
      fetchMock.mockResolvedValueOnce(makeOkResponse({
        success: true,
        data: { corrections: [] }
      }));

      const corrections = await asrCorrectionsService.loadCorrections();
      expect(corrections).toEqual([]);
    });

    it('returns corrections from server', async () => {
      const serverCorrections = [
        makeCorrection('potasium', 'potassium'),
        makeCorrection('bicep', 'BiPAP'),
      ];
      
      fetchMock.mockResolvedValueOnce(makeOkResponse({
        success: true,
        data: { corrections: serverCorrections }
      }));

      const corrections = await asrCorrectionsService.loadCorrections();
      expect(corrections).toHaveLength(2);
      expect(corrections[0].rawText).toBe('potasium');
      expect(corrections[1].rawText).toBe('bicep');
    });

    it('caches corrections after first load', async () => {
      fetchMock.mockResolvedValueOnce(makeOkResponse({
        success: true,
        data: { corrections: [makeCorrection('test', 'Test')] }
      }));

      await asrCorrectionsService.loadCorrections();
      await asrCorrectionsService.loadCorrections();

      // Should only call fetch once due to caching
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('handles server errors gracefully', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      const corrections = await asrCorrectionsService.loadCorrections();
      expect(corrections).toEqual([]);
    });
  });

  describe('persistCorrection', () => {
    it('saves a new correction to server', async () => {
      // Mock initial load
      fetchMock.mockResolvedValueOnce(makeOkResponse({
        success: true,
        data: { corrections: [] }
      }));
      
      // Mock save
      fetchMock.mockResolvedValueOnce(makeOkResponse({ success: true }));

      const correction = makeCorrection('potasium', 'potassium');
      const result = await asrCorrectionsService.persistCorrection(correction);

      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8002/v1/asr/corrections',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        })
      );
    });

    it('adds correction to local cache', async () => {
      // Mock initial load
      fetchMock.mockResolvedValueOnce(makeOkResponse({
        success: true,
        data: { corrections: [] }
      }));
      
      // Mock save
      fetchMock.mockResolvedValueOnce(makeOkResponse({ success: true }));

      const correction = makeCorrection('test', 'Test');
      await asrCorrectionsService.persistCorrection(correction);

      const cached = asrCorrectionsService.getCorrections();
      expect(cached).toContainEqual(correction);
    });

    it('returns false on server error', async () => {
      // Mock failed save (no initial load needed as service adds to cache first)
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      const correction = makeCorrection('test', 'Test');
      const result = await asrCorrectionsService.persistCorrection(correction);

      expect(result).toBe(false);
    });
  });

  describe('applyCorrections', () => {
    beforeEach(async () => {
      // Pre-load some corrections
      fetchMock.mockResolvedValueOnce(makeOkResponse({
        success: true,
        data: {
          corrections: [
            makeCorrection('potasium', 'potassium'),
            makeCorrection('bicep', 'BiPAP'),
          ]
        }
      }));
      await asrCorrectionsService.loadCorrections();
    });

    it('applies all matching corrections to text', () => {
      const input = 'Check potasium and start bicep therapy';
      const result = asrCorrectionsService.applyCorrections(input);
      expect(result.text).toBe('Check potassium and start BiPAP therapy');
      expect(result.appliedCount).toBe(2);
    });

    it('handles case-insensitive matching', () => {
      const input = 'POTASIUM levels are normal';
      const result = asrCorrectionsService.applyCorrections(input);
      expect(result.text).toBe('potassium levels are normal');
    });

    it('returns original text when no corrections match', () => {
      const input = 'No matching words here';
      const result = asrCorrectionsService.applyCorrections(input);
      expect(result.text).toBe('No matching words here');
      expect(result.appliedCount).toBe(0);
    });

    it('handles empty input', () => {
      const result = asrCorrectionsService.applyCorrections('');
      expect(result.text).toBe('');
      expect(result.appliedCount).toBe(0);
    });

    it('is idempotent - applying twice gives same result', () => {
      const input = 'Check potasium levels';
      const result1 = asrCorrectionsService.applyCorrections(input);
      const result2 = asrCorrectionsService.applyCorrections(result1.text);
      expect(result2.text).toBe(result1.text);
    });

    it('handles multiple occurrences of same error', () => {
      const input = 'potasium high, recheck potasium tomorrow';
      const result = asrCorrectionsService.applyCorrections(input);
      expect(result.text).toBe('potassium high, recheck potassium tomorrow');
      // Note: counts as 1 correction applied (since it's the same correction rule)
      expect(result.appliedCount).toBe(1);
    });
  });

  describe('applySingleCorrection', () => {
    it('applies a single correction to text', () => {
      const result = asrCorrectionsService.applySingleCorrection(
        'Check potasium levels',
        'potasium',
        'potassium'
      );
      expect(result).toBe('Check potassium levels');
    });

    it('replaces all occurrences', () => {
      const result = asrCorrectionsService.applySingleCorrection(
        'potasium and potasium',
        'potasium',
        'potassium'
      );
      expect(result).toBe('potassium and potassium');
    });

    it('handles regex special characters in original', () => {
      const result = asrCorrectionsService.applySingleCorrection(
        'run test (1) now',
        'test (1)',
        'test (one)'
      );
      expect(result).toBe('run test (one) now');
    });

    it('handles empty input', () => {
      const result = asrCorrectionsService.applySingleCorrection('', 'test', 'Test');
      expect(result).toBe('');
    });
  });

  describe('clearCache', () => {
    it('clears cached corrections', async () => {
      fetchMock.mockResolvedValueOnce(makeOkResponse({
        success: true,
        data: { corrections: [makeCorrection('test', 'Test')] }
      }));

      await asrCorrectionsService.loadCorrections();
      asrCorrectionsService.clearCache();

      const cached = asrCorrectionsService.getCorrections();
      expect(cached).toEqual([]);
    });

    it('allows reloading after clear', async () => {
      fetchMock.mockResolvedValueOnce(makeOkResponse({
        success: true,
        data: { corrections: [makeCorrection('first', 'First')] }
      }));

      await asrCorrectionsService.loadCorrections();
      asrCorrectionsService.clearCache();

      fetchMock.mockResolvedValueOnce(makeOkResponse({
        success: true,
        data: { corrections: [makeCorrection('second', 'Second')] }
      }));

      const corrections = await asrCorrectionsService.loadCorrections();
      expect(corrections).toHaveLength(1);
      expect(corrections[0].rawText).toBe('second');
    });
  });
});
