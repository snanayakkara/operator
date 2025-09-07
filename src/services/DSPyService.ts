/**
 * DSPy Integration Service
 * 
 * Provides TypeScript interface to Python DSPy + GEPA optimization layer.
 * Features:
 * - Feature-flagged integration via USE_DSPY environment variable
 * - Seamless fallback to existing LMStudioService when disabled
 * - Localhost-only processing for privacy
 * - Configuration management via YAML
 */

import { logger } from '@/utils/Logger';

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
  }>;
}

export interface DSPyResult {
  success: boolean;
  result?: string;
  error?: string;
  processing_time?: number;
  cached?: boolean;
}

export class DSPyService {
  private static instance: DSPyService;
  private configCache: DSPyConfig | null = null;
  private requestIdCounter = 0;

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
      use_dspy: false, // Default to disabled - DSPy requires external setup
      cache_dir: '.cache/dspy',
      agents: {
        'angiogram-pci': {
          enabled: false, // Disabled until external DSPy server is available
          max_tokens: 8000,
          temperature: 0.3,
          timeout_ms: 480000
        },
        'quick-letter': {
          enabled: false, // Disabled until external DSPy server is available
          max_tokens: 4000,
          temperature: 0.2,
          timeout_ms: 180000
        }
      }
    };

    // Check for environment variable overrides via localStorage
    if (typeof window !== 'undefined') {
      try {
        const storedDSPyFlag = localStorage.getItem('USE_DSPY');
        if (storedDSPyFlag === 'true') {
          config.use_dspy = true;
          // Enable agents when DSPy is explicitly enabled
          Object.keys(config.agents).forEach(agentType => {
            config.agents[agentType].enabled = true;
          });
        }
      } catch (error) {
        logger.warn('Failed to check localStorage for DSPy flag', { 
          component: 'DSPyService',
          error: error instanceof Error ? error.message : 'Unknown error'
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
      return agentConfig?.enabled || false;
    }

    return true;
  }

  /**
   * Process transcript using DSPy predictor
   * Note: DSPy requires external Python environment setup
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
    
    try {
      // Check if DSPy is enabled
      if (!(await this.isDSPyEnabled(agentType))) {
        return {
          success: false,
          error: `DSPy not enabled for agent type: ${agentType}`
        };
      }

      // DSPy integration requires external setup
      logger.info('DSPy processing requested but not available in Chrome extension', { 
        component: 'DSPyService',
        agent_type: agentType,
        transcript_length: transcript.length
      });

      return {
        success: false,
        error: 'DSPy processing requires external Python environment. Chrome extensions cannot spawn Python processes directly. Please use direct LMStudio processing instead.',
        processing_time: Date.now() - startTime
      };

    } catch (error) {
      logger.error('DSPy processing setup failed', { 
        component: 'DSPyService',
        agent_type: agentType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'DSPy not available in Chrome extension environment',
        processing_time: Date.now() - startTime
      };
    }
  }

  /**
   * Run evaluation on development set
   * Note: DSPy evaluation requires external Python environment
   */
  public async runEvaluation(
    agentType: string,
    options: {
      devSetPath?: string;
      outputPath?: string;
      freshRun?: boolean;
    } = {}
  ): Promise<DSPyResult> {
    try {
      logger.info('DSPy evaluation requested but not available in Chrome extension', {
        component: 'DSPyService',
        agent_type: agentType
      });

      return {
        success: false,
        error: 'DSPy evaluation requires external Python environment. Please run evaluations using: npm run eval:angiogram'
      };

    } catch (error) {
      logger.error('DSPy evaluation setup failed', {
        component: 'DSPyService',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'DSPy evaluation not available in Chrome extension environment'
      };
    }
  }

  /**
   * Run GEPA optimization
   * Note: GEPA optimization requires external Python environment
   */
  public async runOptimization(
    agentType: string,
    options: {
      iterations?: number;
      withHuman?: boolean;
      freshRun?: boolean;
    } = {}
  ): Promise<DSPyResult> {
    try {
      logger.info('GEPA optimization requested but not available in Chrome extension', {
        component: 'DSPyService',
        agent_type: agentType,
        iterations: options.iterations,
        with_human: options.withHuman
      });

      return {
        success: false,
        error: 'GEPA optimization requires external Python environment. Please run optimization using: npm run optim:angiogram'
      };

    } catch (error) {
      logger.error('GEPA optimization setup failed', {
        component: 'DSPyService',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'GEPA optimization not available in Chrome extension environment'
      };
    }
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
   * Force refresh server status
   */
  public async refreshServerStatus(): Promise<boolean> {
    this.lastHealthCheck = 0; // Force refresh
    return await this.checkServerHealth();
  }
}

// Re-export types for convenience
export type { DSPyServerStatus, EvaluationResult, OptimizationResult };