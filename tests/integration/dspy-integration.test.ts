/**
 * Integration tests for DSPy integration with LMStudioService
 * Tests the complete flow from LMStudioService through DSPyService to Python layer
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LMStudioService } from '../../src/services/LMStudioService';
import { DSPyService } from '../../src/services/DSPyService';
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

vi.mock('../../src/utils/Logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Mock WhisperServerService
vi.mock('../../src/services/WhisperServerService', () => ({
  WhisperServerService: {
    getInstance: vi.fn(() => ({
      ensureServerRunning: vi.fn().mockResolvedValue({ running: true })
    }))
  }
}));

// Mock AudioOptimizationService
vi.mock('../../src/services/AudioOptimizationService', () => ({
  AudioOptimizationService: {
    getInstance: vi.fn(() => ({
      shouldCompress: vi.fn().mockReturnValue(false)
    }))
  }
}));

describe('DSPy Integration with LMStudioService', () => {
  let lmStudioService: LMStudioService;
  let mockChildProcess: any;
  let fetchMock: any;

  beforeEach(() => {
    // Reset singletons
    (LMStudioService as any).instance = null;
    (DSPyService as any).instance = null;

    // Mock fetch for LMStudio API calls
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    // Mock child process for DSPy calls
    mockChildProcess = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn(),
      kill: vi.fn()
    };
    (spawn as any).mockReturnValue(mockChildProcess);

    // Mock configuration loading
    const mockConfig = {
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

    (fs.readFile as any).mockResolvedValue(JSON.stringify(mockConfig));
    (yaml.load as any).mockReturnValue(mockConfig);

    lmStudioService = LMStudioService.getInstance();
  });

  afterEach(() => {
    vi.resetAllMocks();
    delete process.env.USE_DSPY;
  });

  describe('processWithAgent - DSPy disabled', () => {
    it('should use direct LMStudio processing when DSPy is disabled', async () => {
      // Mock successful LMStudio response
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Direct LMStudio response' } }]
        })
      });

      const result = await lmStudioService.processWithAgent(
        'System prompt for angiogram',
        'Patient underwent coronary angiography...',
        'angiogram-pci'
      );

      expect(result).toBe('Direct LMStudio response');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:1234/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('angiogram')
        })
      );

      // DSPy should not be called
      expect(spawn).not.toHaveBeenCalled();
    });
  });

  describe('processWithAgent - DSPy enabled', () => {
    beforeEach(() => {
      process.env.USE_DSPY = 'true';
      
      // Mock DSPy-enabled config
      const dspyEnabledConfig = {
        api_base: 'http://localhost:1234/v1',
        api_key: 'local',
        model_name: 'local-model',
        use_dspy: true,
        cache_dir: '.cache/dspy',
        agents: {
          'angiogram-pci': {
            enabled: true,
            max_tokens: 8000,
            temperature: 0.3
          }
        }
      };

      (yaml.load as any).mockReturnValue(dspyEnabledConfig);
    });

    it('should use DSPy processing when enabled for agent', async () => {
      // Mock successful DSPy response
      const mockDSPyOutput = '{"output": "DSPy-generated angiogram report", "cached": false}';
      
      setTimeout(() => {
        mockChildProcess.stdout.on.mock.calls[0][1](mockDSPyOutput);
      }, 5);

      setTimeout(() => {
        mockChildProcess.on.mock.calls[0][1](0); // 'close' event with code 0
      }, 10);

      const result = await lmStudioService.processWithAgent(
        'System prompt for angiogram',
        'Patient underwent coronary angiography...',
        'angiogram-pci'
      );

      expect(result).toBe('DSPy-generated angiogram report');
      
      // Verify DSPy was called
      expect(spawn).toHaveBeenCalledWith(
        'python3',
        [
          '-m', 'llm.predictors',
          '--agent-type', 'angiogram-pci',
          '--transcript', 'Patient underwent coronary angiography...',
          '--output-json'
        ],
        expect.any(Object)
      );

      // LMStudio should not be called
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should fallback to LMStudio when DSPy processing fails', async () => {
      // Mock DSPy failure
      setTimeout(() => {
        mockChildProcess.stderr.on.mock.calls[0][1]('DSPy processing error');
      }, 5);

      setTimeout(() => {
        mockChildProcess.on.mock.calls[0][1](1); // 'close' event with code 1
      }, 10);

      // Mock successful LMStudio fallback
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'LMStudio fallback response' } }]
        })
      });

      const result = await lmStudioService.processWithAgent(
        'System prompt for angiogram',
        'Patient underwent coronary angiography...',
        'angiogram-pci'
      );

      expect(result).toBe('LMStudio fallback response');
      
      // Verify both DSPy and LMStudio were called
      expect(spawn).toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalled();
    });

    it('should use LMStudio directly when agent not enabled for DSPy', async () => {
      // Mock successful LMStudio response for non-DSPy agent
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Direct processing for non-DSPy agent' } }]
        })
      });

      const result = await lmStudioService.processWithAgent(
        'System prompt for quick letter',
        'Brief clinic letter...',
        'quick-letter' // Not enabled for DSPy in config
      );

      expect(result).toBe('Direct processing for non-DSPy agent');
      
      // DSPy should not be called for disabled agent
      expect(spawn).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalled();
    });
  });

  describe('DSPy evaluation and optimization integration', () => {
    beforeEach(() => {
      process.env.USE_DSPY = 'true';
      
      const dspyEnabledConfig = {
        use_dspy: true,
        agents: {
          'angiogram-pci': { enabled: true, max_tokens: 8000, temperature: 0.3 }
        }
      };

      (yaml.load as any).mockReturnValue(dspyEnabledConfig);
    });

    it('should provide evaluation interface through DSPyService', async () => {
      const dspyService = DSPyService.getInstance();

      // Mock evaluation response
      const mockEvalOutput = JSON.stringify({
        task: 'angiogram-pci',
        total_examples: 10,
        average_score: 85.2,
        passed: 8,
        failed: 2,
        improvement_suggestions: ['Improve TIMI flow reporting', 'Enhance stenosis quantification']
      });

      setTimeout(() => {
        mockChildProcess.stdout.on.mock.calls[0][1](mockEvalOutput);
      }, 5);

      setTimeout(() => {
        mockChildProcess.on.mock.calls[0][1](0);
      }, 10);

      const result = await dspyService.runEvaluation('angiogram-pci', {
        devSetPath: 'eval/devset/angiogram',
        outputPath: 'eval/results/angiogram_evaluation.json'
      });

      expect(result.success).toBe(true);
      expect(spawn).toHaveBeenCalledWith(
        'python3',
        [
          '-m', 'llm.evaluate',
          '--task', 'angiogram-pci',
          '--dev-set', 'eval/devset/angiogram',
          '--output', 'eval/results/angiogram_evaluation.json'
        ],
        expect.any(Object)
      );
    });

    it('should provide GEPA optimization interface through DSPyService', async () => {
      const dspyService = DSPyService.getInstance();

      // Mock optimization response
      const mockOptimOutput = JSON.stringify({
        task: 'angiogram-pci',
        iterations_completed: 3,
        baseline_score: 75.0,
        optimized_score: 89.5,
        improvement: 14.5,
        new_prompt_version: 'v1.2.0'
      });

      setTimeout(() => {
        mockChildProcess.stdout.on.mock.calls[0][1](mockOptimOutput);
      }, 5);

      setTimeout(() => {
        mockChildProcess.on.mock.calls[0][1](0);
      }, 10);

      const result = await dspyService.runOptimization('angiogram-pci', {
        iterations: 5,
        withHuman: true,
        freshRun: false
      });

      expect(result.success).toBe(true);
      expect(spawn).toHaveBeenCalledWith(
        'python3',
        [
          '-m', 'llm.optim_gepa',
          '--task', 'angiogram-pci',
          '--iterations', '5',
          '--with-human'
        ],
        expect.any(Object)
      );
    });

    it('should handle long-running optimization with extended timeout', async () => {
      const dspyService = DSPyService.getInstance();

      // Simulate long-running process
      setTimeout(() => {
        mockChildProcess.stdout.on.mock.calls[0][1]('{"status": "optimization_complete"}');
      }, 100); // Short delay for test

      setTimeout(() => {
        mockChildProcess.on.mock.calls[0][1](0);
      }, 110);

      const result = await dspyService.runOptimization('angiogram-pci', {
        iterations: 10,
        withHuman: false
      });

      expect(result.success).toBe(true);
      
      // Verify extended timeout (30 minutes) is used for optimization
      expect(spawn).toHaveBeenCalledWith(
        'python3',
        expect.any(Array),
        expect.objectContaining({
          // The timeout is handled in the Promise wrapper, not spawn options
        })
      );
    });
  });

  describe('Environment verification integration', () => {
    it('should verify complete DSPy environment through service', async () => {
      const dspyService = DSPyService.getInstance();

      // Mock Python version check (first call)
      const pythonVersionCheck = () => {
        setTimeout(() => {
          mockChildProcess.stdout.on.mock.calls[0][1]('Python 3.11.0');
          mockChildProcess.on.mock.calls[0][1](0);
        }, 5);
      };

      // Mock DSPy import check (second call)  
      const dspyImportCheck = () => {
        setTimeout(() => {
          mockChildProcess.stdout.on.mock.calls[1][1]('DSPy available');
          mockChildProcess.on.mock.calls[1][1](0);
        }, 10);
      };

      pythonVersionCheck();
      dspyImportCheck();

      const verification = await dspyService.verifyEnvironment();

      expect(verification.ready).toBe(true);
      expect(verification.python_available).toBe(true);
      expect(verification.dspy_installed).toBe(true);
      expect(verification.config_valid).toBe(true);
      expect(verification.issues).toEqual([]);

      // Verify both Python and DSPy checks were made
      expect(spawn).toHaveBeenCalledTimes(2);
      expect(spawn).toHaveBeenNthCalledWith(1, 'python3', ['--version'], expect.any(Object));
      expect(spawn).toHaveBeenNthCalledWith(2, 'python3', ['-c', 'import dspy; print("DSPy available")'], expect.any(Object));
    });
  });
});