/**
 * Integration tests for LMStudioService ↔ DSPyService routing.
 *
 * LMStudioService should route through DSPy SDK streaming only when:
 * - `agentType` is provided, AND
 * - `context` is provided (to supply progress/stream callbacks), AND
 * - DSPyService reports the agent is enabled.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockDSPy = {
  isDSPyEnabled: vi.fn<Parameters<any>, any>(),
  processWithDSpyStreaming: vi.fn<Parameters<any>, any>(),
};

vi.mock('../../src/services/DSPyService', () => ({
  DSPyService: {
    getInstance: vi.fn(() => mockDSPy),
  },
}));

vi.mock('../../src/utils/Logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Keep these lightweight for Node tests.
vi.mock('../../src/services/WhisperServerService', () => ({
  WhisperServerService: {
    getInstance: vi.fn(() => ({
      ensureServerRunning: vi.fn().mockResolvedValue({ running: true }),
    })),
  },
}));

vi.mock('../../src/services/AudioOptimizationService', () => ({
  AudioOptimizationService: {
    getInstance: vi.fn(() => ({
      shouldCompress: vi.fn().mockReturnValue(false),
    })),
  },
}));

describe('DSPy routing in LMStudioService', () => {
  const originalFetch = (globalThis as any).fetch;

  const installFetchMock = (options: { chatContent?: string } = {}) => {
    const chatContent = options.chatContent ?? 'Direct LMStudio response';
    (globalThis as any).fetch = vi.fn(async (input: any) => {
      const url = typeof input === 'string' ? input : (input?.url ?? String(input));

      // LMStudioService health-checks models before calling chat completions.
      if (url.includes('/v1/models')) {
        return {
          ok: true,
          json: async () => ({ data: [] }),
        } as any;
      }

      if (url.includes('/v1/chat/completions')) {
        return {
          ok: true,
          json: async () => ({ choices: [{ message: { content: chatContent } }] }),
        } as any;
      }

      throw new Error(`Unhandled fetch URL in test mock: ${url}`);
    });
  };

  const didCallChatCompletions = (fetchMock: any) =>
    fetchMock.mock.calls.some(([input]: any[]) => {
      const url = typeof input === 'string' ? input : (input?.url ?? String(input));
      return url.includes('/v1/chat/completions');
    });

  beforeEach(async () => {
    vi.resetModules();
    mockDSPy.isDSPyEnabled.mockReset();
    mockDSPy.processWithDSpyStreaming.mockReset();
  });

  afterEach(() => {
    (globalThis as any).fetch = originalFetch;
  });

  it('uses direct LMStudio processing when no context is provided', async () => {
    installFetchMock({ chatContent: 'Direct LMStudio response' });
    const fetchMock = vi.mocked(globalThis.fetch as any);

    const { LMStudioService } = await import('../../src/services/LMStudioService');
    (LMStudioService as any).instance = null;
    const lmStudioService = LMStudioService.getInstance();

    const result = await lmStudioService.processWithAgent(
      'System prompt for angiogram',
      'Patient underwent coronary angiography...',
      'angiogram-pci'
    );

    expect(result).toBe('Direct LMStudio response');
    expect(didCallChatCompletions(fetchMock)).toBe(true);
    expect(mockDSPy.isDSPyEnabled).not.toHaveBeenCalled();
    expect(mockDSPy.processWithDSpyStreaming).not.toHaveBeenCalled();
  });

  it('routes through DSPy streaming when enabled and context is provided', async () => {
    mockDSPy.isDSPyEnabled.mockResolvedValue(true);
    mockDSPy.processWithDSpyStreaming.mockResolvedValue({
      success: true,
      result: 'DSPy streaming result',
      processing_time: 123,
    });

    installFetchMock({ chatContent: 'SHOULD_NOT_BE_USED' });
    const fetchMock = vi.mocked(globalThis.fetch as any);

    const { LMStudioService } = await import('../../src/services/LMStudioService');
    (LMStudioService as any).instance = null;
    const lmStudioService = LMStudioService.getInstance();

    const context = { onProgress: vi.fn(), onStream: vi.fn() } as any;

    const result = await lmStudioService.processWithAgent(
      'System prompt for angiogram',
      'Patient underwent coronary angiography...',
      'angiogram-pci',
      undefined,
      undefined,
      context
    );

    expect(result).toBe('DSPy streaming result');
    expect(mockDSPy.isDSPyEnabled).toHaveBeenCalledWith('angiogram-pci');
    expect(mockDSPy.processWithDSpyStreaming).toHaveBeenCalledWith(
      'angiogram-pci',
      'Patient underwent coronary angiography...',
      expect.objectContaining({
        onProgress: context.onProgress,
        onToken: context.onStream,
      })
    );
    expect(didCallChatCompletions(fetchMock)).toBe(false);
  });

  it('falls back to direct LMStudio when DSPy streaming fails', async () => {
    mockDSPy.isDSPyEnabled.mockResolvedValue(true);
    mockDSPy.processWithDSpyStreaming.mockResolvedValue({
      success: false,
      error: 'DSPy failure',
    });

    installFetchMock({ chatContent: 'Fallback LMStudio response' });
    const fetchMock = vi.mocked(globalThis.fetch as any);

    const { LMStudioService } = await import('../../src/services/LMStudioService');
    (LMStudioService as any).instance = null;
    const lmStudioService = LMStudioService.getInstance();

    const context = { onProgress: vi.fn(), onStream: vi.fn() } as any;

    const result = await lmStudioService.processWithAgent(
      'System prompt',
      'Input',
      'angiogram-pci',
      undefined,
      undefined,
      context
    );

    expect(result).toBe('Fallback LMStudio response');
    expect(mockDSPy.processWithDSpyStreaming).toHaveBeenCalled();
    expect(didCallChatCompletions(fetchMock)).toBe(true);
  });

  it('skips DSPy when isDSPyEnabled returns false', async () => {
    mockDSPy.isDSPyEnabled.mockResolvedValue(false);

    installFetchMock({ chatContent: 'Direct LMStudio response' });
    const fetchMock = vi.mocked(globalThis.fetch as any);

    const { LMStudioService } = await import('../../src/services/LMStudioService');
    (LMStudioService as any).instance = null;
    const lmStudioService = LMStudioService.getInstance();

    const context = { onProgress: vi.fn(), onStream: vi.fn() } as any;

    const result = await lmStudioService.processWithAgent(
      'System prompt',
      'Input',
      'angiogram-pci',
      undefined,
      undefined,
      context
    );

    expect(result).toBe('Direct LMStudio response');
    expect(mockDSPy.isDSPyEnabled).toHaveBeenCalled();
    expect(mockDSPy.processWithDSpyStreaming).not.toHaveBeenCalled();
    expect(didCallChatCompletions(fetchMock)).toBe(true);
  });
});
