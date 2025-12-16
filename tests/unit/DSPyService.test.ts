import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DSPyService } from '@/services/DSPyService';

vi.mock('@/utils/Logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const makeOkResponse = (json: unknown) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => json,
});

const makeErrResponse = (status = 500, statusText = 'Server Error') => ({
  ok: false,
  status,
  statusText,
  json: async () => ({}),
});

describe('DSPyService (browser/HTTP mode)', () => {
  const originalWindow = (globalThis as any).window;
  const originalLocalStorage = (globalThis as any).localStorage;
  const originalFetch = (globalThis as any).fetch;

  beforeEach(() => {
    (DSPyService as any).instance = null;
    vi.restoreAllMocks();
    (globalThis as any).fetch = vi.fn();
  });

  afterEach(() => {
    (globalThis as any).window = originalWindow;
    (globalThis as any).localStorage = originalLocalStorage;
    (globalThis as any).fetch = originalFetch;
  });

  const setUseDSPyFlag = (value: 'true' | 'false' | null) => {
    const getItem = vi.fn(() => value);
    (globalThis as any).localStorage = { getItem };
    (globalThis as any).window = { localStorage: (globalThis as any).localStorage };
    return { getItem };
  };

  it('getInstance returns a singleton', () => {
    const instance1 = DSPyService.getInstance();
    const instance2 = DSPyService.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('loadConfig auto-enables when server is healthy', async () => {
    const fetchMock = vi.mocked(globalThis.fetch as any);
    fetchMock.mockResolvedValueOnce(makeOkResponse({ status: 'healthy' })); // /v1/health

    const service = DSPyService.getInstance();
    const config = await service.loadConfig();

    expect(config.use_dspy).toBe(true);
    expect(config.agents['quick-letter']?.enabled).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8002/v1/health',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('loadConfig remains disabled when server is unhealthy', async () => {
    const fetchMock = vi.mocked(globalThis.fetch as any);
    fetchMock.mockResolvedValueOnce(makeErrResponse(503, 'Unavailable')); // /v1/health

    const service = DSPyService.getInstance();
    const config = await service.loadConfig();

    expect(config.use_dspy).toBe(false);
  });

  it('loadConfig respects localStorage USE_DSPY=false (no auto-enable)', async () => {
    setUseDSPyFlag('false');

    const fetchMock = vi.mocked(globalThis.fetch as any);

    const service = DSPyService.getInstance();
    const config = await service.loadConfig();

    expect(config.use_dspy).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('isDSPyEnabled returns false when disabled globally', async () => {
    setUseDSPyFlag('false');

    const service = DSPyService.getInstance();
    await service.loadConfig();

    expect(await service.isDSPyEnabled('quick-letter')).toBe(false);
    expect(await service.isDSPyEnabled()).toBe(false);
  });

  it('isDSPyEnabled returns true for unknown agent when enabled globally', async () => {
    setUseDSPyFlag('true');

    const fetchMock = vi.mocked(globalThis.fetch as any);
    fetchMock.mockResolvedValueOnce(makeOkResponse({ status: 'healthy' })); // /v1/health (loadConfig auto-enable)

    const service = DSPyService.getInstance();
    await service.loadConfig();

    expect(await service.isDSPyEnabled('some-new-agent')).toBe(true);
  });

  it('processWithDSPy returns an error when DSPy is disabled', async () => {
    setUseDSPyFlag('false');

    const service = DSPyService.getInstance();
    const result = await service.processWithDSPy('quick-letter', 'test transcript');
    expect(result.success).toBe(false);
    expect(result.error).toContain('DSPy not enabled for agent type: quick-letter');
  });

  it('processWithDSPy posts to /v1/dspy/process when enabled and healthy', async () => {
    setUseDSPyFlag('true');

    const fetchMock = vi.mocked(globalThis.fetch as any);
    fetchMock
      .mockResolvedValueOnce(makeOkResponse({ status: 'healthy' })) // /v1/health
      .mockResolvedValueOnce(makeOkResponse({ result: 'DSPy output', cached: false })); // /v1/dspy/process

    const service = DSPyService.getInstance();
    await service.loadConfig();

    const result = await service.processWithDSPy('quick-letter', 'test transcript', { timeout: 1234 });
    expect(result).toMatchObject({ success: true, result: 'DSPy output', cached: false });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8002/v1/dspy/process',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    );

    const body = (fetchMock.mock.calls[1][1] as any).body;
    expect(JSON.parse(body)).toMatchObject({
      agent_type: 'quick-letter',
      transcript: 'test transcript',
    });
  });

  it('processWithDSPy surfaces HTTP errors from the DSPy server', async () => {
    setUseDSPyFlag('true');

    const fetchMock = vi.mocked(globalThis.fetch as any);
    fetchMock
      .mockResolvedValueOnce(makeOkResponse({ status: 'healthy' })) // /v1/health
      .mockResolvedValueOnce(makeErrResponse(500, 'Boom')); // /v1/dspy/process

    const service = DSPyService.getInstance();
    await service.loadConfig();

    const result = await service.processWithDSPy('quick-letter', 'test transcript');
    expect(result.success).toBe(false);
    expect(result.error).toContain('HTTP 500: Boom');
  });

  it('verifyEnvironment reports Chrome extension constraints', async () => {
    const service = DSPyService.getInstance();
    const result = await service.verifyEnvironment();

    expect(result.ready).toBe(false);
    expect(result.python_available).toBe(false);
    expect(result.dspy_installed).toBe(false);
    expect(result.config_valid).toBe(true);
    expect(result.issues.join('\n')).toContain('Chrome extensions cannot spawn Python processes directly');
  });
});
