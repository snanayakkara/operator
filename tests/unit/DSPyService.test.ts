/**
 * Unit tests for DSPyService
 * Tests the TypeScript interface to Python DSPy layer
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DSPyService, DSPyConfig } from '../../src/services/DSPyService';
import { promises as fs } from 'fs';
import * as yaml from 'js-yaml';
import { spawn } from 'child_process';

// Mock dependencies
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn()
  }
}));

vi.mock('js-yaml', () => ({
  load: vi.fn()
}));

vi.mock('child_process', () => ({
  spawn: vi.fn()
}));

// Mock logger
vi.mock('../../src/utils/Logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('DSPyService', () => {
  let dspyService: DSPyService;
  let mockConfig: DSPyConfig;

  beforeEach(() => {
    // Reset the singleton
    (DSPyService as any).instance = null;
    
    mockConfig = {
      api_base: 'http://localhost:1234/v1',
      api_key: 'local',
      model_name: 'local-model',
      use_dspy: false,
      cache_dir: '.cache/dspy',
      agents: {
        'angiogram-pci': {
          enabled: true,
          max_tokens: 8000,
          temperature: 0.3
        },
        'quick-letter': {
          enabled: false,
          max_tokens: 4000,
          temperature: 0.2
        }
      }
    };

    // Mock environment variables
    process.env.USE_DSPY = 'false';
    delete process.env.DSPY_CONFIG_PATH;
    delete process.env.OPENAI_API_BASE;
    delete process.env.DSPY_CACHE_DIR;

    dspyService = DSPyService.getInstance();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = DSPyService.getInstance();
      const instance2 = DSPyService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('loadConfig', () => {
    it('should load configuration from YAML file', async () => {
      const mockYamlContent = 'api_base: http://localhost:1234/v1\nuse_dspy: false';
      
      (fs.readFile as any).mockResolvedValue(mockYamlContent);
      (yaml.load as any).mockReturnValue(mockConfig);

      const config = await dspyService.loadConfig();

      expect(fs.readFile).toHaveBeenCalledWith('config/llm.yaml', 'utf8');
      expect(yaml.load).toHaveBeenCalledWith(mockYamlContent);
      expect(config).toEqual(mockConfig);
    });

    it('should override config with environment variables', async () => {
      process.env.USE_DSPY = 'true';
      process.env.OPENAI_API_BASE = 'http://localhost:1235/v1';
      process.env.DSPY_CACHE_DIR = '.cache/custom';

      (fs.readFile as any).mockResolvedValue('{}');
      (yaml.load as any).mockReturnValue(mockConfig);

      const config = await dspyService.loadConfig();

      expect(config.use_dspy).toBe(true);
      expect(config.api_base).toBe('http://localhost:1235/v1');
      expect(config.cache_dir).toBe('.cache/custom');
    });

    it('should return fallback configuration on file read error', async () => {
      (fs.readFile as any).mockRejectedValue(new Error('File not found'));

      const config = await dspyService.loadConfig();

      expect(config.api_base).toBe('http://localhost:1234/v1');
      expect(config.api_key).toBe('local');
      expect(config.model_name).toBe('local-model');
      expect(config.use_dspy).toBe(false);
    });

    it('should respect USE_DSPY environment variable in fallback', async () => {
      process.env.USE_DSPY = 'true';
      (fs.readFile as any).mockRejectedValue(new Error('File not found'));

      const config = await dspyService.loadConfig();

      expect(config.use_dspy).toBe(true);
    });
  });

  describe('isDSPyEnabled', () => {
    beforeEach(async () => {
      (fs.readFile as any).mockResolvedValue('{}');
      (yaml.load as any).mockReturnValue(mockConfig);
    });

    it('should return false when use_dspy is disabled globally', async () => {
      mockConfig.use_dspy = false;
      
      const enabled = await dspyService.isDSPyEnabled('angiogram-pci');
      
      expect(enabled).toBe(false);
    });

    it('should return agent-specific enabled status when DSPy is enabled globally', async () => {
      mockConfig.use_dspy = true;
      
      const enabledForAngiogram = await dspyService.isDSPyEnabled('angiogram-pci');
      const enabledForQuickLetter = await dspyService.isDSPyEnabled('quick-letter');
      
      expect(enabledForAngiogram).toBe(true);
      expect(enabledForQuickLetter).toBe(false);
    });

    it('should return true for global check when use_dspy is enabled', async () => {
      mockConfig.use_dspy = true;
      
      const enabled = await dspyService.isDSPyEnabled();
      
      expect(enabled).toBe(true);
    });

    it('should return false for unknown agent types', async () => {
      mockConfig.use_dspy = true;
      
      const enabled = await dspyService.isDSPyEnabled('unknown-agent');
      
      expect(enabled).toBe(false);
    });
  });

  describe('processWithDSPy', () => {
    let mockChildProcess: any;

    beforeEach(() => {
      mockChildProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn()
      };

      (spawn as any).mockReturnValue(mockChildProcess);
      (fs.readFile as any).mockResolvedValue('{}');
      (yaml.load as any).mockReturnValue({
        ...mockConfig,
        use_dspy: true,
        agents: {
          'angiogram-pci': { enabled: true, max_tokens: 8000, temperature: 0.3 }
        }
      });
    });

    it('should return error when DSPy is not enabled for agent', async () => {
      const result = await dspyService.processWithDSPy('quick-letter', 'test transcript');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('DSPy not enabled for agent type: quick-letter');
    });

    it('should spawn Python process with correct arguments', async () => {
      // Mock successful Python process
      setTimeout(() => {
        mockChildProcess.on.mock.calls[0][1](0); // 'close' event with code 0
      }, 10);

      setTimeout(() => {
        mockChildProcess.stdout.on.mock.calls[0][1]('{"output": "Generated report"}');
      }, 5);

      const result = await dspyService.processWithDSPy('angiogram-pci', 'test transcript');

      expect(spawn).toHaveBeenCalledWith(
        'python3',
        [
          '-m', 'llm.predictors',
          '--agent-type', 'angiogram-pci',
          '--transcript', 'test transcript',
          '--output-json'
        ],
        expect.objectContaining({
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: process.cwd(),
          env: expect.objectContaining({
            PYTHONPATH: process.cwd()
          })
        })
      );
    });

    it('should parse JSON response correctly', async () => {
      const mockOutput = '{"output": "Generated medical report", "cached": true}';
      
      setTimeout(() => {
        mockChildProcess.stdout.on.mock.calls[0][1](mockOutput);
      }, 5);

      setTimeout(() => {
        mockChildProcess.on.mock.calls[0][1](0); // 'close' event with code 0
      }, 10);

      const result = await dspyService.processWithDSPy('angiogram-pci', 'test transcript');

      expect(result.success).toBe(true);
      expect(result.result).toBe('Generated medical report');
      expect(result.cached).toBe(true);
      expect(result.processing_time).toBeGreaterThan(0);
    });

    it('should handle non-JSON response as plain text', async () => {
      const mockOutput = 'Plain text medical report';
      
      setTimeout(() => {
        mockChildProcess.stdout.on.mock.calls[0][1](mockOutput);
      }, 5);

      setTimeout(() => {
        mockChildProcess.on.mock.calls[0][1](0); // 'close' event with code 0
      }, 10);

      const result = await dspyService.processWithDSPy('angiogram-pci', 'test transcript');

      expect(result.success).toBe(true);
      expect(result.result).toBe('Plain text medical report');
      expect(result.processing_time).toBeGreaterThan(0);
    });

    it('should handle Python process errors', async () => {
      setTimeout(() => {
        mockChildProcess.on.mock.calls[0][1](1); // 'close' event with code 1
      }, 10);

      setTimeout(() => {
        mockChildProcess.stderr.on.mock.calls[0][1]('Python error message');
      }, 5);

      const result = await dspyService.processWithDSPy('angiogram-pci', 'test transcript');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Python script failed with code 1');
      expect(result.error).toContain('Python error message');
    });

    it('should handle timeout', async () => {
      const result = await dspyService.processWithDSPy(
        'angiogram-pci', 
        'test transcript',
        { timeout: 1 } // 1ms timeout
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out after 1ms');
    });

    it('should handle abort signal', async () => {
      const controller = new AbortController();
      
      // Abort immediately
      setTimeout(() => controller.abort(), 1);

      const result = await dspyService.processWithDSPy(
        'angiogram-pci',
        'test transcript',
        { signal: controller.signal }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Process aborted by user');
    });

    it('should add fresh-run flag when environment variable is set', async () => {
      process.env.DSPY_FRESH_RUN = 'true';

      setTimeout(() => {
        mockChildProcess.on.mock.calls[0][1](0);
      }, 10);

      await dspyService.processWithDSPy('angiogram-pci', 'test transcript');

      expect(spawn).toHaveBeenCalledWith(
        'python3',
        expect.arrayContaining(['--fresh-run']),
        expect.any(Object)
      );

      delete process.env.DSPY_FRESH_RUN;
    });
  });

  describe('verifyEnvironment', () => {
    let mockChildProcess: any;

    beforeEach(() => {
      mockChildProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn()
      };

      (spawn as any).mockReturnValue(mockChildProcess);
    });

    it('should verify complete environment setup', async () => {
      // Mock Python version check
      const pythonCheck = new Promise<void>((resolve) => {
        setTimeout(() => {
          mockChildProcess.stdout.on.mock.calls[0][1]('Python 3.11.0');
          mockChildProcess.on.mock.calls[0][1](0);
          resolve();
        }, 5);
      });

      // Mock DSPy check
      const dspyCheck = new Promise<void>((resolve) => {
        setTimeout(() => {
          mockChildProcess.stdout.on.mock.calls[1][1]('DSPy available');
          mockChildProcess.on.mock.calls[1][1](0);
          resolve();
        }, 10);
      });

      // Mock config loading
      (fs.readFile as any).mockResolvedValue('{}');
      (yaml.load as any).mockReturnValue(mockConfig);

      const result = await dspyService.verifyEnvironment();

      expect(result.ready).toBe(true);
      expect(result.python_available).toBe(true);
      expect(result.dspy_installed).toBe(true);
      expect(result.config_valid).toBe(true);
      expect(result.issues).toEqual([]);
    });

    it('should identify Python availability issues', async () => {
      setTimeout(() => {
        mockChildProcess.on.mock.calls[0][1](1); // 'close' event with code 1
      }, 5);

      const result = await dspyService.verifyEnvironment();

      expect(result.ready).toBe(false);
      expect(result.python_available).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toContain('Python not available');
    });
  });
});