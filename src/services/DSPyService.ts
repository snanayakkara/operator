/**
 * DSPy Integration Service
 * 
 * Provides TypeScript interface to Python DSPy + GEPA optimization layer.
 * Features:
 * - Auto-enables when the local DSPy server is healthy (overridable via USE_DSPY)
 * - Seamless fallback to existing LMStudioService when disabled or unavailable
 * - Localhost-only processing for privacy
 * - Configuration management via YAML
 * - E15: Key Facts proof mode support for confirmed facts
 * - B7: Controlled stage vocabulary for progress tracking
 */

import { logger } from '@/utils/Logger';
import { toError } from '@/utils/errorHelpers';
import type { StageName } from '@/types/progress.types';

/**
 * E15: KeyFacts schema for proof mode
 * Generic schema that works across agents, with agent-specific extensions possible
 */
export interface KeyFacts {
  patient?: {
    name?: string;
    dob?: string;
    age?: number;
    sex?: string;
    filingCode?: string;
  };
  context?: {
    indication?: string;
    procedure?: string;
  };
  medications?: string[];
  problems?: string[];
  investigations?: Record<string, string>;
  freeform?: Record<string, string>;
}

/**
 * E15: Versioned envelope for KeyFacts
 */
export interface KeyFactsEnvelope {
  version: 1;
  facts: KeyFacts;
}

export interface DSPyConfig {
  api_base: string;
  api_key: string;
  model_name: string;
  use_dspy: boolean;
  cache_dir: string;
  agents: Record<string, {
    enabled: boolean;
    model_override?: string;
    max_tokens: number;
    temperature: number;
    timeout_ms?: number;
  }>;
}

export interface DSPyResult {
  success: boolean;
  result?: string;
  error?: string;
  processing_time?: number;
  cached?: boolean;
}

export type DSPyServerStatus = 'unknown' | 'healthy' | 'unhealthy';

export interface EvaluationResult {
  task: string;
  score: number;
  metrics: Record<string, any>;
  timestamp: string;
}

export interface OptimizationResult {
  task: string;
  iterations: number;
  improvements: Record<string, any>;
  timestamp: string;
}

export class DSPyService {
  private static instance: DSPyService;
  private configCache: DSPyConfig | null = null;
  private requestIdCounter = 0;
  private serverStatus: DSPyServerStatus = 'unknown';
  private lastHealthCheck = 0;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

  private constructor() {
    logger.info('DSPyService initialized (browser context)', { 
      component: 'DSPyService'
    });
  }

  public static getInstance(): DSPyService {
    if (!DSPyService.instance) {
      DSPyService.instance = new DSPyService();
    }
    return DSPyService.instance;
  }

  private generateRequestId(): string {
    return `dspy-${Date.now()}-${++this.requestIdCounter}`;
  }

  /**
   * Load DSPy configuration (browser-compatible)
   */
  public async loadConfig(): Promise<DSPyConfig> {
    if (this.configCache) {
      return this.configCache;
    }

    // Embedded configuration for Chrome extension compatibility
    const config: DSPyConfig = {
      api_base: 'http://localhost:1234/v1',
      api_key: 'local',
      model_name: 'local-model',
      use_dspy: false, // Auto-enabled when server is healthy or explicitly requested
      cache_dir: '.cache/dspy',
      agents: {
        'angiogram-pci': {
          enabled: false, // Enabled automatically when DSPy is available
          max_tokens: 8000,
          temperature: 0.3,
          timeout_ms: 480000
        },
        'quick-letter': {
          enabled: false, // Enabled automatically when DSPy is available
          max_tokens: 4000,
          temperature: 0.2,
          timeout_ms: 180000
        }
      }
    };

    let storedDSPyFlag: string | null = null;

    // Check for environment variable overrides via localStorage
    if (typeof window !== 'undefined') {
      try {
        storedDSPyFlag = localStorage.getItem('USE_DSPY');
        if (storedDSPyFlag === 'true') {
          config.use_dspy = true;
          // Enable agents when DSPy is explicitly enabled
          Object.keys(config.agents).forEach(agentType => {
            config.agents[agentType].enabled = true;
          });
        }
      } catch (error) {
        const err = toError(error);
        logger.warn('Failed to check localStorage for DSPy flag', { 
          component: 'DSPyService',
          error: err.message
        });
      }
    }

    // Auto-enable when server is healthy and not explicitly disabled
    if (!config.use_dspy && storedDSPyFlag !== 'false') {
      const healthy = await this.checkServerHealth();
      if (healthy) {
        config.use_dspy = true;
        Object.keys(config.agents).forEach(agentType => {
          config.agents[agentType].enabled = true;
        });

        logger.info('DSPy auto-enabled (server healthy)', {
          component: 'DSPyService',
          mode: 'auto',
          api_base: config.api_base
        });
      }
    }

    this.configCache = config;
    logger.info('DSPy configuration loaded (Chrome extension mode)', { 
      component: 'DSPyService',
      use_dspy: config.use_dspy,
      api_base: config.api_base,
      mode: 'embedded_config'
    });

    return config;
  }

  /**
   * Check if DSPy is enabled for given agent type
   */
  public async isDSPyEnabled(agentType?: string): Promise<boolean> {
    const config = await this.loadConfig();
    
    if (!config.use_dspy) {
      return false;
    }

    if (agentType) {
      const agentConfig = config.agents[agentType];
      if (agentConfig) {
        return agentConfig.enabled;
      }
      // Default to enabled for agents without explicit config when DSPy is on
      return true;
    }

    return true;
  }

  /**
   * Process transcript using DSPy predictor via external server
   */
  public async processWithDSPy(
    agentType: string,
    transcript: string,
    options: {
      timeout?: number;
      signal?: AbortSignal;
    } = {}
  ): Promise<DSPyResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // Check if DSPy is enabled
      if (!(await this.isDSPyEnabled(agentType))) {
        return {
          success: false,
          error: `DSPy not enabled for agent type: ${agentType}`
        };
      }

      logger.info('Processing with external DSPy server', {
        component: 'DSPyService',
        agent_type: agentType,
        transcript_length: transcript.length,
        request_id: requestId
      });

      // Check server health first
      const isHealthy = await this.checkServerHealth();
      if (!isHealthy) {
        return {
          success: false,
          error: 'DSPy server is not available at localhost:8002. Please ensure the server is running.',
          processing_time: Date.now() - startTime
        };
      }

      // Prepare request payload
      const payload = {
        agent_type: agentType,
        transcript: transcript,
        request_id: requestId,
        options: {
          timeout: options.timeout || 60000,
          ...options
        }
      };

      // Make HTTP request to external DSPy server
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout || 60000);

      if (options.signal) {
        options.signal.addEventListener('abort', () => controller.abort());
      }

      try {
        const response = await fetch('http://localhost:8002/v1/dspy/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        logger.info('DSPy processing completed', {
          component: 'DSPyService',
          agent_type: agentType,
          request_id: requestId,
          processing_time: Date.now() - startTime,
          cached: result.cached || false
        });

        return {
          success: true,
          result: result.result,
          processing_time: Date.now() - startTime,
          cached: result.cached || false
        };

      } finally {
        clearTimeout(timeoutId);
      }

    } catch (error) {
      const err = toError(error);
      logger.error('DSPy processing failed', err, {
        component: 'DSPyService',
        agent_type: agentType,
        request_id: requestId
      });

      if (err.name === 'AbortError') {
        return {
          success: false,
          error: 'DSPy processing was cancelled',
          processing_time: Date.now() - startTime
        };
      }

      return {
        success: false,
        error: err.message,
        processing_time: Date.now() - startTime
      };
    }
  }

  /**
   * Process transcript using DSPy predictor with SDK streaming
   *
   * Provides real-time progress updates during prompt processing and token generation.
   * 
   * @param agentType - The agent type to process with
   * @param transcript - The transcript text to process
   * @param options - Processing options including callbacks
   * @param options.onProgress - Callback for stage progress (stage, percent, detail)
   * @param options.onToken - Callback for streaming tokens
   * @param options.facts - E15: Confirmed key facts from proof mode
   * @param options.signal - AbortSignal for cancellation
   */
  public async processWithDSpyStreaming(
    agentType: string,
    transcript: string,
    options: {
      onProgress?: (stage: string, percent: number, detail?: string) => void;
      onToken?: (delta: string, fullText: string) => void;
      facts?: KeyFactsEnvelope;
      signal?: AbortSignal;
    } = {}
  ): Promise<DSPyResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // Check if DSPy is enabled
      if (!(await this.isDSPyEnabled(agentType))) {
        return {
          success: false,
          error: `DSPy not enabled for agent type: ${agentType}`
        };
      }

      logger.info('Processing with DSPy SDK streaming', {
        component: 'DSPyService',
        agent_type: agentType,
        transcript_length: transcript.length,
        has_facts: !!options.facts,
        request_id: requestId
      });

      // Check server health first
      const isHealthy = await this.checkServerHealth();
      if (!isHealthy) {
        return {
          success: false,
          error: 'DSPy server is not available at localhost:8002. Please ensure the server is running.',
          processing_time: Date.now() - startTime
        };
      }

      // Prepare request payload with optional facts (E15)
      const payload: Record<string, unknown> = {
        agent_type: agentType,
        transcript: transcript,
        request_id: requestId,
        options: {}
      };
      
      // E15: Include confirmed key facts if provided
      if (options.facts) {
        payload.facts = options.facts;
        logger.info('Including confirmed key facts in DSPy request', {
          component: 'DSPyService',
          facts_version: options.facts.version
        });
      }

      // Make streaming request to DSPy server
      const controller = new AbortController();
      if (options.signal) {
        options.signal.addEventListener('abort', () => controller.abort());
      }

      const response = await fetch('http://localhost:8002/v1/dspy/process/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      // Parse SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult = '';

      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) {
          streamDone = true;
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          const [eventLine, dataLine] = line.split('\n');
          if (!eventLine || !dataLine) continue;

          const event = eventLine.replace('event: ', '').trim();
          const dataStr = dataLine.replace('data: ', '').trim();

          let data;
          try {
            data = JSON.parse(dataStr);
          } catch (e) {
            logger.warn('Failed to parse SSE data', {
              component: 'DSPyService',
              data: dataStr
            });
            continue;
          }

          switch (event) {
            case 'progress':
              // B7: Support both new (stage/percent/detail) and legacy (phase/progress/details) formats
              const stage = data.stage || data.phase || 'reasoning';
              const percent = data.percent ?? data.progress ?? 0;
              const detail = data.detail || data.details;
              options.onProgress?.(stage, percent, detail);
              break;

            case 'token':
              options.onToken?.(data.delta, data.fullText);
              finalResult = data.fullText;
              break;

            case 'complete':
              logger.info('DSPy SDK streaming completed', {
                component: 'DSPyService',
                agent_type: agentType,
                request_id: requestId,
                processing_time: data.processing_time
              });

              return {
                success: true,
                result: data.result,
                processing_time: data.processing_time
              };

            case 'error':
              throw new Error(data.error);
          }
        }
      }

      // If we exit the loop without a complete event, use last accumulated result
      return {
        success: true,
        result: finalResult,
        processing_time: Date.now() - startTime
      };

    } catch (error) {
      const err = toError(error);
      logger.error('DSPy SDK streaming failed', err, {
        component: 'DSPyService',
        agent_type: agentType,
        request_id: requestId
      });

      if (err.name === 'AbortError') {
        return {
          success: false,
          error: 'DSPy streaming was cancelled',
          processing_time: Date.now() - startTime
        };
      }

      return {
        success: false,
        error: err.message,
        processing_time: Date.now() - startTime
      };
    }
  }

  /**
   * Run evaluation on development set via external server
   */
  public async runEvaluation(
    agentType: string,
    options: {
      devSetPath?: string;
      outputPath?: string;
      freshRun?: boolean;
      runEvaluationOnNewExample?: boolean;
    } = {}
  ): Promise<DSPyResult> {
    const startTime = Date.now();

    try {
      logger.info('Running DSPy evaluation via external server', {
        component: 'DSPyService',
        agent_type: agentType,
        options
      });

      // Check server health first
      const isHealthy = await this.checkServerHealth();
      if (!isHealthy) {
        return {
          success: false,
          error: 'DSPy server is not available at localhost:8002. Please ensure the server is running.',
          processing_time: Date.now() - startTime
        };
      }

      const payload = {
        agent_type: agentType,
        dev_set_path: options.devSetPath,
        output_path: options.outputPath,
        fresh_run: options.freshRun || false
      };

      const response = await fetch('http://localhost:8002/v1/dspy/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      logger.info('DSPy evaluation completed', {
        component: 'DSPyService',
        agent_type: agentType,
        processing_time: Date.now() - startTime,
        score: result.score
      });

      if (options.runEvaluationOnNewExample) {
        this.runGEPAPreview(agentType).catch((error) => {
          const err = toError(error);
          logger.warn('GEPA preview trigger failed after saving golden pair', {
            component: 'DSPyService',
            agent_type: agentType,
            error: err.message
          });
        });
      }

      return {
        success: true,
        result: JSON.stringify(result),
        processing_time: Date.now() - startTime
      };

    } catch (error) {
      const err = toError(error);
      logger.error('DSPy evaluation failed', err, {
        component: 'DSPyService',
        agent_type: agentType
      });

      return {
        success: false,
        error: err.message,
        processing_time: Date.now() - startTime
      };
    }
  }

  /**
   * Run GEPA optimization via external server
   */
  public async runOptimization(
    agentType: string,
    options: {
      iterations?: number;
      withHuman?: boolean;
      freshRun?: boolean;
    } = {}
  ): Promise<DSPyResult> {
    const startTime = Date.now();

    try {
      logger.info('Running GEPA optimization via external server', {
        component: 'DSPyService',
        agent_type: agentType,
        options
      });

      // Check server health first
      const isHealthy = await this.checkServerHealth();
      if (!isHealthy) {
        return {
          success: false,
          error: 'DSPy server is not available at localhost:8002. Please ensure the server is running.',
          processing_time: Date.now() - startTime
        };
      }

      const payload = {
        agent_type: agentType,
        iterations: options.iterations || 5,
        with_human: options.withHuman || false,
        fresh_run: options.freshRun || false
      };

      const response = await fetch('http://localhost:8002/v1/dspy/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      logger.info('GEPA optimization completed', {
        component: 'DSPyService',
        agent_type: agentType,
        processing_time: Date.now() - startTime,
        iterations: result.iterations
      });

      return {
        success: true,
        result: JSON.stringify(result),
        processing_time: Date.now() - startTime
      };

    } catch (error) {
      const err = toError(error);
      logger.error('GEPA optimization failed', err, {
        component: 'DSPyService',
        agent_type: agentType
      });

      return {
        success: false,
        error: err.message,
        processing_time: Date.now() - startTime
      };
    }
  }

  private async runGEPAPreview(agentType: string): Promise<void> {
    const isHealthy = await this.checkServerHealth();
    if (!isHealthy) {
      throw new Error('DSPy server unavailable for GEPA preview');
    }

    const payload = {
      tasks: [agentType],
      iterations: 3,
      with_human: false
    };

    const response = await fetch('http://localhost:8002/v1/dspy/optimize/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`GEPA preview failed: HTTP ${response.status}`);
    }

    await response.json();

    logger.info('GEPA preview triggered after golden pair save', {
      component: 'DSPyService',
      agent_type: agentType,
      iterations: payload.iterations
    });
  }

  /**
   * Verify DSPy environment is properly set up
   * Note: DSPy requires external Python environment setup
   */
  public async verifyEnvironment(): Promise<{
    ready: boolean;
    python_available: boolean;
    dspy_installed: boolean;
    config_valid: boolean;
    issues: string[];
  }> {
    logger.info('DSPy environment verification in Chrome extension mode', {
      component: 'DSPyService'
    });

    const issues: string[] = [
      'DSPy requires external Python environment setup',
      'Chrome extensions cannot spawn Python processes directly',
      'Use npm scripts for DSPy functionality: npm run eval:angiogram, npm run optim:angiogram',
      'DSPy layer is available as an external optimization tool only'
    ];

    const status = {
      ready: false, // Not ready in Chrome extension environment
      python_available: false, // Not available in browser context
      dspy_installed: false, // Not accessible from browser
      config_valid: true, // Configuration is embedded and valid
      issues
    };

    logger.info('DSPy environment verification completed (Chrome extension mode)', { 
      component: 'DSPyService',
      ready: status.ready,
      mode: 'chrome_extension',
      external_tools_available: true
    });

    return status;
  }

  /**
   * Cancel a running DSPy process
   * Note: HTTP requests can be aborted via AbortController
   */
  public async cancelProcess(requestId: string): Promise<boolean> {
    logger.info('DSPy process cancellation requested', {
      component: 'DSPyService',
      request_id: requestId
    });

    // HTTP requests are handled via AbortController in the processWithDSPy method
    // Individual request cancellation would require request tracking
    // For now, return false as we don't track individual requests
    return false;
  }

  /**
   * Get current server connection status
   */
  public getConnectionStatus(): 'unknown' | 'healthy' | 'unhealthy' {
    return this.serverStatus;
  }

  /**
   * Check DSPy server health
   */
  public async checkServerHealth(): Promise<boolean> {
    const now = Date.now();

    // Use cached result if recent
    if (now - this.lastHealthCheck < this.HEALTH_CHECK_INTERVAL) {
      return this.serverStatus === 'healthy';
    }

    try {
      logger.debug('Checking DSPy server health', { component: 'DSPyService' });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch('http://localhost:8002/v1/health', {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const health = await response.json();
        this.serverStatus = health.status === 'healthy' ? 'healthy' : 'unhealthy';
        this.lastHealthCheck = now;

        logger.debug('DSPy server health check completed', {
          component: 'DSPyService',
          status: this.serverStatus,
          details: health
        });

        return this.serverStatus === 'healthy';
      } else {
        this.serverStatus = 'unhealthy';
        this.lastHealthCheck = now;
        return false;
      }

    } catch (error) {
      const err = toError(error);
      this.serverStatus = 'unhealthy';
      this.lastHealthCheck = now;

      logger.debug('DSPy server health check failed', {
        component: 'DSPyService',
        error: err.message
      });

      return false;
    }
  }

  /**
   * Force refresh server status
   */
  public async refreshServerStatus(): Promise<boolean> {
    this.lastHealthCheck = 0; // Force refresh
    return await this.checkServerHealth();
  }
}
