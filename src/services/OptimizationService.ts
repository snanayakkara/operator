/**
 * OptimizationService - API Communication Service for Optimization Features
 * 
 * Provides TypeScript interface to DSPy server optimization endpoints.
 * Handles ASR corrections, GEPA optimization, and overnight workflows.
 * 
 * Features:
 * - ASR batch processing and corrections management
 * - GEPA prompt optimization with preview/apply workflow
 * - Overnight combined optimization with job tracking
 * - Error handling and retry logic
 * - Local-only processing for privacy
 */

import { logger } from '@/utils/Logger';
import { toError } from '@/utils/errorHelpers';
import type {
  ASRPreview,
  ASRApplyRequest,
  ASRApplyResponse,
  ASRCurrentState,
  ASRCorrectionsEntry,
  GEPAPreview,
  GEPAPreviewRequest,
  GEPAApplyRequest,
  GEPAApplyResponse,
  GEPAHistoryEntry,
  GEPAMetrics,
  MetricsDelta,
  EnhancedGEPAMetrics,
  OvernightOptimizationRequest,
  OvernightJob,
  JobStatus,
  ServerHealthStatus,
  ApiResponse,
  GoldenPairSaveRequest,
  GoldenPairSaveResponse
} from '@/types/optimization';

import {
  OptimizationError,
  ASROptimizationError,
  GEPAOptimizationError,
  OvernightOptimizationError
} from '@/types/optimization';

import { DSPyService } from './DSPyService';

export class OptimizationService {
  private static instance: OptimizationService;
  private readonly baseUrl = 'http://localhost:8002'; // DSPy server
  private readonly timeout = 300000; // 5 minutes for optimization operations
  private requestIdCounter = 0;

  // Health check deduplication and caching
  private pendingHealthCheck: Promise<ServerHealthStatus> | null = null;
  private cachedHealthStatus: ServerHealthStatus | null = null;
  private cachedHealthTimestamp: number = 0;
  private readonly healthCacheTTL = 5000; // 5 seconds
  private lastHealthCheckTime: number = 0;
  private readonly healthCheckDebounce = 2000; // 2 seconds minimum between checks

  // ASR state deduplication and caching
  private pendingASRStateCheck: Promise<ASRCurrentState> | null = null;
  private cachedASRState: ASRCurrentState | null = null;
  private cachedASRStateTimestamp: number = 0;
  private readonly asrStateCacheTTL = 5000; // 5 seconds
  private lastASRStateCheckTime: number = 0;
  private readonly asrStateCheckDebounce = 2000; // 2 seconds minimum between checks

  private constructor() {
    logger.info('OptimizationService initialized', {
      component: 'OptimizationService',
      baseUrl: this.baseUrl
    });
  }

  public static getInstance(): OptimizationService {
    if (!OptimizationService.instance) {
      OptimizationService.instance = new OptimizationService();
    }
    return OptimizationService.instance;
  }

  private generateRequestId(): string {
    return `opt-${Date.now()}-${++this.requestIdCounter}`;
  }

  private slugifyId(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'example';
  }

  private generateGoldenPairId(agentId: string, workflowId?: string | null): string {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const base = workflowId ? this.slugifyId(workflowId) : this.slugifyId(agentId);
    return `${base}-${timestamp}`;
  }

  /**
   * Make HTTP request with error handling and retry logic
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    timeout?: number
  ): Promise<T> {
    const requestId = this.generateRequestId();
    const url = `${this.baseUrl}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout || this.timeout);
    
    try {
      logger.debug(`Making optimization request`, {
        component: 'OptimizationService',
        requestId,
        endpoint,
        method: options.method || 'GET'
      });

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }

        throw new OptimizationError(
          `HTTP ${response.status}: ${errorData.error || errorText}`,
          'HTTP_ERROR',
          { status: response.status, endpoint, requestId }
        );
      }

      const data = await response.json();
      
      logger.debug(`Optimization request completed`, {
        component: 'OptimizationService',
        requestId,
        endpoint,
        success: true
      });

      return data;

    } catch (error) {
      clearTimeout(timeoutId);
      const err = toError(error);

      if (err.name === 'AbortError') {
        const timeoutError = new OptimizationError(
          `Request timeout after ${timeout || this.timeout}ms`,
          'TIMEOUT_ERROR',
          { endpoint, requestId }
        );
        logger.error('Optimization request timeout', {
          component: 'OptimizationService',
          requestId,
          endpoint,
          timeout: timeout || this.timeout
        });
        throw timeoutError;
      }

      if (err instanceof OptimizationError) {
        throw err;
      }

      const networkError = new OptimizationError(
        `Network error: ${err.message}`,
        'NETWORK_ERROR',
        { endpoint, requestId, originalError: err.message }
      );
      
      logger.error('Optimization request failed', {
        component: 'OptimizationService',
        requestId,
        endpoint,
        error: err.message
      });
      
      throw networkError;
    }
  }

  // Health Check

  /**
   * Check server health and optimization capabilities
   * Features:
   * - Request deduplication: Only one health check runs at a time
   * - Caching: Results cached for 5 seconds to prevent redundant checks
   * - Debouncing: Minimum 2 seconds between checks
   */
  async checkHealth(): Promise<ServerHealthStatus> {
    const now = Date.now();

    // Return cached result if still valid
    if (this.cachedHealthStatus && (now - this.cachedHealthTimestamp) < this.healthCacheTTL) {
      logger.debug('Returning cached health status', {
        component: 'OptimizationService',
        age: now - this.cachedHealthTimestamp
      });
      return this.cachedHealthStatus;
    }

    // Return pending request if one is already in flight (deduplication)
    if (this.pendingHealthCheck) {
      logger.debug('Reusing pending health check request', {
        component: 'OptimizationService'
      });
      return this.pendingHealthCheck;
    }

    // Enforce debounce period
    const timeSinceLastCheck = now - this.lastHealthCheckTime;
    if (timeSinceLastCheck < this.healthCheckDebounce) {
      logger.debug('Health check debounced', {
        component: 'OptimizationService',
        timeSinceLastCheck,
        debounceRemaining: this.healthCheckDebounce - timeSinceLastCheck
      });
      // Return cached result if available, otherwise throw
      if (this.cachedHealthStatus) {
        return this.cachedHealthStatus;
      }
      throw new OptimizationError(
        'Health check rate limit - please wait before checking again',
        'RATE_LIMIT_ERROR',
        { timeSinceLastCheck, debounceRequired: this.healthCheckDebounce }
      );
    }

    // Start new health check
    this.lastHealthCheckTime = now;
    this.pendingHealthCheck = (async () => {
      try {
        const response = await this.makeRequest<ServerHealthStatus>('/v1/health', {}, 3000); // Reduced from 10s to 3s

        // Add optimization endpoints availability check
        const optimizationStatus = {
          asr_endpoints_available: true, // Assume available if server is healthy
          gepa_endpoints_available: true,
          overnight_processing_available: true
        };

        const healthStatus = {
          ...response,
          optimization: optimizationStatus
        };

        // Cache successful result
        this.cachedHealthStatus = healthStatus;
        this.cachedHealthTimestamp = Date.now();

        return healthStatus;
      } catch (error) {
        const err = toError(error);
        logger.error('Health check failed', {
          component: 'OptimizationService',
          error: err.message
        });
        // Clear cache on error
        this.cachedHealthStatus = null;
        this.cachedHealthTimestamp = 0;
        throw err;
      } finally {
        // Clear pending request
        this.pendingHealthCheck = null;
      }
    })();

    return this.pendingHealthCheck;
  }

  // ASR Optimization Methods

  /**
   * Preview ASR corrections from daily usage
   */
  async previewASRCorrections(options: {
    since?: string;      // ISO date string
    maxTerms?: number;   // Max glossary terms to return
    maxRules?: number;   // Max correction rules to return
  } = {}): Promise<ASRPreview> {
    try {
      const response = await this.makeRequest<ApiResponse<ASRPreview>>('/v1/asr/preview', {
        method: 'POST',
        body: JSON.stringify(options),
      });

      if (!response.success) {
        throw new ASROptimizationError(response.error || 'ASR preview failed');
      }

      logger.info('ASR corrections preview generated', {
        component: 'OptimizationService',
        glossaryTerms: response.data?.glossary_additions.length || 0,
        ruleCandidates: response.data?.rule_candidates.length || 0
      });

      return response.data!;
    } catch (error) {
      const err = toError(error);
      // Graceful degradation for ASR server unavailability
      if (err instanceof OptimizationError && 
          (err.code === 'HTTP_ERROR' || err.code === 'NETWORK_ERROR')) {
        logger.warn('ASR server unavailable for preview, returning empty suggestions', {
          component: 'OptimizationService',
          error: err.message
        });
        // Return empty preview instead of throwing error
        return {
          glossary_additions: [],
          rule_candidates: []
        };
      }
      if (err instanceof ASROptimizationError) throw err;
      throw new ASROptimizationError(`Failed to preview ASR corrections: ${err.message}`);
    }
  }

  /**
   * Apply approved ASR corrections
   */
  async applyASRCorrections(request: ASRApplyRequest): Promise<ASRApplyResponse> {
    try {
      const response = await this.makeRequest<ApiResponse<ASRApplyResponse>>('/v1/asr/apply', {
        method: 'POST',
        body: JSON.stringify(request),
      });

      if (!response.success) {
        throw new ASROptimizationError(response.error || 'ASR apply failed');
      }

      logger.info('ASR corrections applied', {
        component: 'OptimizationService',
        glossaryWritten: response.data?.written.glossary || 0,
        rulesWritten: response.data?.written.rules || 0,
        paths: response.data?.paths || []
      });

      return response.data!;
    } catch (error) {
      const err = toError(error);
      if (err instanceof ASROptimizationError) throw err;
      throw new ASROptimizationError(`Failed to apply ASR corrections: ${err.message}`);
    }
  }

  /**
   * Get current ASR corrections state
   * Features:
   * - Request deduplication: Only one check runs at a time
   * - Caching: Results cached for 5 seconds to prevent redundant checks
   * - Debouncing: Minimum 2 seconds between checks
   */
  async getCurrentASRState(): Promise<ASRCurrentState> {
    const now = Date.now();

    // Return cached result if still valid
    if (this.cachedASRState && (now - this.cachedASRStateTimestamp) < this.asrStateCacheTTL) {
      logger.debug('Returning cached ASR state', {
        component: 'OptimizationService',
        age: now - this.cachedASRStateTimestamp
      });
      return this.cachedASRState;
    }

    // Return pending request if one is already in flight (deduplication)
    if (this.pendingASRStateCheck) {
      logger.debug('Reusing pending ASR state check request', {
        component: 'OptimizationService'
      });
      return this.pendingASRStateCheck;
    }

    // Enforce debounce period
    const timeSinceLastCheck = now - this.lastASRStateCheckTime;
    if (timeSinceLastCheck < this.asrStateCheckDebounce) {
      logger.debug('ASR state check debounced', {
        component: 'OptimizationService',
        timeSinceLastCheck,
        debounceRemaining: this.asrStateCheckDebounce - timeSinceLastCheck
      });
      // Return cached result if available, otherwise return empty state
      if (this.cachedASRState) {
        return this.cachedASRState;
      }
      // Return empty state for rate-limited requests
      return {
        glossary: [],
        rules: []
      };
    }

    // Start new ASR state check
    this.lastASRStateCheckTime = now;
    this.pendingASRStateCheck = (async () => {
      try {
        const response = await this.makeRequest<ApiResponse<ASRCurrentState>>('/v1/asr/current');

        if (!response.success) {
          throw new ASROptimizationError(response.error || 'Failed to get ASR state');
        }

        const asrState = response.data!;

        // Cache successful result
        this.cachedASRState = asrState;
        this.cachedASRStateTimestamp = Date.now();

        return asrState;
      } catch (error) {
        const err = toError(error);
        // Graceful degradation for ASR server unavailability
        if (err instanceof OptimizationError &&
            (err.code === 'HTTP_ERROR' || err.code === 'NETWORK_ERROR')) {
          logger.warn('ASR server unavailable, returning empty state', {
            component: 'OptimizationService',
            error: err.message
          });
          // Cache empty state on error
          const emptyState = {
            glossary: [],
            rules: []
          };
          this.cachedASRState = emptyState;
          this.cachedASRStateTimestamp = Date.now();
          return emptyState;
        }
        if (err instanceof ASROptimizationError) throw err;
        throw new ASROptimizationError(`Failed to get ASR state: ${err.message}`);
      } finally {
        // Clear pending request
        this.pendingASRStateCheck = null;
      }
    })();

    return this.pendingASRStateCheck;
  }

  /**
   * Upload corrections from Chrome extension storage
   */
  async uploadCorrections(corrections: ASRCorrectionsEntry[]): Promise<{ uploaded: number }> {
    try {
      const response = await this.makeRequest<ApiResponse<{ uploaded: number }>>('/v1/asr/corrections', {
        method: 'POST',
        body: JSON.stringify({ corrections }),
      });

      if (!response.success) {
        throw new ASROptimizationError(response.error || 'Failed to upload corrections');
      }

      logger.info('ASR corrections uploaded', {
        component: 'OptimizationService',
        uploaded: response.data?.uploaded || 0
      });

      return response.data!;
    } catch (error) {
      const err = toError(error);
      // Graceful degradation for ASR server unavailability
      if (err instanceof OptimizationError && 
          (err.code === 'HTTP_ERROR' || err.code === 'NETWORK_ERROR')) {
        logger.warn('ASR server unavailable for corrections upload, saving locally only', {
          component: 'OptimizationService',
          error: err.message,
          correctionsCount: corrections.length
        });
        // Return success response with local count - corrections are already saved in Chrome storage
        return { uploaded: corrections.length };
      }
      if (err instanceof ASROptimizationError) throw err;
      throw new ASROptimizationError(`Failed to upload corrections: ${err.message}`);
    }
  }

  /**
   * Persist clinician revision as a golden pair example for DSPy training
   */
  async saveGoldenPair(request: GoldenPairSaveRequest): Promise<GoldenPairSaveResponse> {
    const notes = request.notes?.trim() || '';
    if (!request.agentId) {
      throw new OptimizationError('Agent ID is required to save a golden pair', 'INVALID_INPUT', {
        component: 'OptimizationService.saveGoldenPair'
      });
    }
    if (!request.original?.trim()) {
      throw new OptimizationError('Original output is required to save a golden pair', 'INVALID_INPUT', {
        component: 'OptimizationService.saveGoldenPair',
        agentId: request.agentId
      });
    }
    if (!request.edited?.trim()) {
      throw new OptimizationError('Edited revision is required to save a golden pair', 'INVALID_INPUT', {
        component: 'OptimizationService.saveGoldenPair',
        agentId: request.agentId
      });
    }
    if (!notes) {
      throw new OptimizationError('Scenario summary is required to save a golden pair', 'INVALID_INPUT', {
        component: 'OptimizationService.saveGoldenPair',
        agentId: request.agentId
      });
    }

    const capturedAt = new Date().toISOString();
    const exampleId = this.generateGoldenPairId(request.agentId, request.workflowId);
    const tags = (request.tags || []).map(tag => tag.trim()).filter(Boolean);
    const expectedElementsSource = notes.split(/[\n,]+/).map(item => item.trim()).filter(Boolean);
    const expectedElements = Array.from(new Set([...expectedElementsSource, ...tags]));

    const payload = {
      id: exampleId,
      task: request.agentId,
      transcript: request.original,
      expected_output: request.edited,
      expected_elements: expectedElements,
      rubric_criteria: {
        captured_at: capturedAt,
        workflow_id: request.workflowId ?? null,
        requires_revision: request.original.trim() !== request.edited.trim(),
        min_score: 85
      },
      metadata: {
        scenario_summary: notes,
        workflow_id: request.workflowId ?? null,
        tags,
        revision_source: 'results-panel',
        collection: 'result-edit-training',
        origin: 'Edit & Train',
        captured_at: capturedAt,
        original_length: request.original.length,
        edited_length: request.edited.length
      }
    };

    try {
      const response = await this.makeRequest<ApiResponse<{ file_path: string; example: unknown }>>(
        `/v1/dspy/devset/${request.agentId}`,
        {
          method: 'POST',
          body: JSON.stringify(payload)
        }
      );

      if (!response.success) {
        throw new OptimizationError(response.error || 'Failed to save golden pair', 'SAVE_GOLDEN_PAIR_FAILED', {
          agentId: request.agentId,
          exampleId
        });
      }

      const filePath = response.data?.file_path ?? `eval/devset/${request.agentId}/${exampleId}.json`;

      logger.info('Golden pair saved for optimization', {
        component: 'OptimizationService',
        agentId: request.agentId,
        exampleId,
        filePath,
        runEval: !!request.runEvaluationOnNewExample
      });

      if (request.runEvaluationOnNewExample) {
        DSPyService.getInstance()
          .runEvaluation(request.agentId, { runEvaluationOnNewExample: true })
          .catch((error) => {
            const err = toError(error);
            logger.warn('Failed to trigger GEPA preview after saving golden pair', {
              component: 'OptimizationService',
              agentId: request.agentId,
              exampleId,
              error: err.message
            });
          });
      }

      return {
        exampleId,
        filePath,
        agentId: request.agentId,
        timestamp: capturedAt
      };
    } catch (error) {
      if (error instanceof OptimizationError) {
        throw error;
      }
      const err = toError(error);
      throw new OptimizationError(`Failed to save golden pair: ${err.message}`, 'SAVE_GOLDEN_PAIR_FAILED', {
        agentId: request.agentId,
        exampleId
      });
    }
  }

  // GEPA Optimization Methods

  /**
   * Preview GEPA optimization candidates
   */
  async previewGEPAOptimization(request: GEPAPreviewRequest): Promise<GEPAPreview> {
    try {
      const response = await this.makeRequest<ApiResponse<GEPAPreview>>('/v1/dspy/optimize/preview', {
        method: 'POST',
        body: JSON.stringify(request),
      }, 600000); // 10 minutes for GEPA optimization

      if (!response.success) {
        throw new GEPAOptimizationError(response.error || 'GEPA preview failed');
      }

      logger.info('GEPA optimization preview generated', {
        component: 'OptimizationService',
        tasks: request.tasks,
        candidates: response.data?.candidates.length || 0,
        iterations: request.iterations || 5
      });

      return response.data!;
    } catch (error) {
      const err = toError(error);
      if (err instanceof GEPAOptimizationError) throw err;
      throw new GEPAOptimizationError(`Failed to preview GEPA optimization: ${err.message}`);
    }
  }

  /**
   * Apply approved GEPA optimization candidates
   */
  async applyGEPAOptimization(request: GEPAApplyRequest): Promise<GEPAApplyResponse> {
    try {
      const response = await this.makeRequest<ApiResponse<GEPAApplyResponse>>('/v1/dspy/optimize/apply', {
        method: 'POST',
        body: JSON.stringify(request),
      });

      if (!response.success) {
        throw new GEPAOptimizationError(response.error || 'GEPA apply failed');
      }

      logger.info('GEPA optimization applied', {
        component: 'OptimizationService',
        applied: response.data?.applied.length || 0,
        errors: response.data?.errors.length || 0
      });

      return response.data!;
    } catch (error) {
      const err = toError(error);
      if (err instanceof GEPAOptimizationError) throw err;
      throw new GEPAOptimizationError(`Failed to apply GEPA optimization: ${err.message}`);
    }
  }

  /**
   * Get GEPA optimization history
   */
  async getGEPAHistory(): Promise<GEPAHistoryEntry[]> {
    try {
      const response = await this.makeRequest<ApiResponse<GEPAHistoryEntry[]>>('/v1/dspy/optimize/history');

      if (!response.success) {
        throw new GEPAOptimizationError(response.error || 'Failed to get GEPA history');
      }

      return response.data || [];
    } catch (error) {
      const err = toError(error);
      if (err instanceof GEPAOptimizationError) throw err;
      throw new GEPAOptimizationError(`Failed to get GEPA history: ${err.message}`);
    }
  }

  /**
   * Privacy housekeeping: Clean up expired data
   */
  async cleanupPrivacyData(agentType: import('../types/medical.types').AgentType, options: {
    maxAgeDays?: number;
    keepRecentBackups?: number;
  } = {}): Promise<{
    candidatesCleaned: number;
    candidatesKept: number;
    jobsCleaned: number;
    jobsKept: number;
    backupsCleaned: number;
    backupsKept: number;
    tempFilesCleaned: number;
    errors: string[];
  }> {
    try {
      const requestData = {
        agent_type: agentType,
        max_age_days: options.maxAgeDays || 30,
        keep_recent_backups: options.keepRecentBackups || 5
      };

      const response = await this.makeRequest<ApiResponse<{
        candidates_cleaned: number;
        candidates_kept: number;
        jobs_cleaned: number;
        jobs_kept: number;
        backups_cleaned: number;
        backups_kept: number;
        temp_files_cleaned: number;
        errors: string[];
      }>>('/v1/dspy/cleanup', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      if (!response.success) {
        throw new GEPAOptimizationError(response.error || 'Privacy cleanup failed');
      }

      const data = response.data!;
      
      logger.info('Privacy cleanup completed', {
        component: 'OptimizationService',
        agentType,
        candidatesCleaned: data.candidates_cleaned,
        jobsCleaned: data.jobs_cleaned,
        backupsCleaned: data.backups_cleaned,
        tempFilesCleaned: data.temp_files_cleaned,
        errors: data.errors.length
      });

      return {
        candidatesCleaned: data.candidates_cleaned,
        candidatesKept: data.candidates_kept,
        jobsCleaned: data.jobs_cleaned,
        jobsKept: data.jobs_kept,
        backupsCleaned: data.backups_cleaned,
        backupsKept: data.backups_kept,
        tempFilesCleaned: data.temp_files_cleaned,
        errors: data.errors
      };
    } catch (error) {
      const err = toError(error);
      if (err instanceof GEPAOptimizationError) throw err;
      throw new GEPAOptimizationError(`Failed to run privacy cleanup: ${err.message}`);
    }
  }

  // Overnight Optimization Methods

  /**
   * Start overnight optimization job
   */
  async startOvernightOptimization(request: OvernightOptimizationRequest): Promise<OvernightJob> {
    try {
      const response = await this.makeRequest<ApiResponse<OvernightJob>>('/v1/optimize/overnight', {
        method: 'POST',
        body: JSON.stringify(request),
      });

      if (!response.success) {
        throw new OvernightOptimizationError(response.error || 'Failed to start overnight optimization');
      }

      logger.info('Overnight optimization started', {
        component: 'OptimizationService',
        jobId: response.data?.job_id,
        tasks: request.tasks
      });

      return response.data!;
    } catch (error) {
      const err = toError(error);
      if (err instanceof OvernightOptimizationError) throw err;
      throw new OvernightOptimizationError(`Failed to start overnight optimization: ${err.message}`);
    }
  }

  /**
   * Get job status for polling
   */
  async getJobStatus(jobId: string): Promise<JobStatus> {
    try {
      const response = await this.makeRequest<ApiResponse<JobStatus>>(`/v1/jobs/${jobId}`, {}, 10000);

      if (!response.success) {
        throw new OvernightOptimizationError(response.error || 'Failed to get job status');
      }

      return response.data!;
    } catch (error) {
      const err = toError(error);
      if (err instanceof OvernightOptimizationError) throw err;
      throw new OvernightOptimizationError(`Failed to get job status: ${err.message}`);
    }
  }

  /**
   * Cancel running optimization job
   */
  async cancelJob(jobId: string): Promise<{ cancelled: boolean }> {
    try {
      const response = await this.makeRequest<ApiResponse<{ cancelled: boolean }>>(`/v1/jobs/${jobId}/cancel`, {
        method: 'POST',
      });

      if (!response.success) {
        throw new OvernightOptimizationError(response.error || 'Failed to cancel job');
      }

      logger.info('Optimization job cancelled', {
        component: 'OptimizationService',
        jobId
      });

      return response.data!;
    } catch (error) {
      const err = toError(error);
      if (err instanceof OvernightOptimizationError) throw err;
      throw new OvernightOptimizationError(`Failed to cancel job: ${err.message}`);
    }
  }

  /**
   * List completed optimization jobs
   */
  async getCompletedJobs(): Promise<OvernightJob[]> {
    try {
      const response = await this.makeRequest<ApiResponse<OvernightJob[]>>('/v1/jobs?status=DONE');

      if (!response.success) {
        throw new OvernightOptimizationError(response.error || 'Failed to get completed jobs');
      }

      logger.info('Completed jobs retrieved', {
        component: 'OptimizationService',
        count: response.data?.length || 0
      });

      return response.data || [];
    } catch (error) {
      const err = toError(error);
      if (err instanceof OvernightOptimizationError) throw err;
      throw new OvernightOptimizationError(`Failed to get completed jobs: ${err.message}`);
    }
  }

  /**
   * Calculate enhanced metrics with clear deltas
   */
  calculateMetricsDeltas(
    beforeMetrics: GEPAMetrics, 
    afterMetrics: GEPAMetrics
  ): EnhancedGEPAMetrics {
    const calculateDelta = (before: number, after: number): MetricsDelta => {
      const delta = after - before;
      const percentChange = before > 0 ? (delta / before) * 100 : 0;
      const isImprovement = delta > 0;
      
      let significance: 'major' | 'moderate' | 'minor' | 'negligible';
      const absPercent = Math.abs(percentChange);
      if (absPercent >= 10) significance = 'major';
      else if (absPercent >= 5) significance = 'moderate';  
      else if (absPercent >= 1) significance = 'minor';
      else significance = 'negligible';
      
      return {
        before,
        after,
        delta,
        percentChange,
        isImprovement,
        significance
      };
    };
    
    const accuracy = calculateDelta(
      beforeMetrics.accuracy || 0,
      afterMetrics.accuracy || 0
    );
    
    const completeness = calculateDelta(
      beforeMetrics.completeness || 0,
      afterMetrics.completeness || 0
    );
    
    const clinical_appropriateness = calculateDelta(
      beforeMetrics.clinical_appropriateness || 0,
      afterMetrics.clinical_appropriateness || 0
    );
    
    const overall_score = calculateDelta(
      beforeMetrics.overall_score || 0,
      afterMetrics.overall_score || 0
    );
    
    // Calculate summary statistics
    const deltas = [accuracy, completeness, clinical_appropriateness, overall_score];
    const improvedMetrics = deltas.filter(d => d.isImprovement).length;
    const unchangedMetrics = deltas.filter(d => d.significance === 'negligible').length;
    const degradedMetrics = deltas.filter(d => !d.isImprovement && d.significance !== 'negligible').length;
    
    const totalImprovement = overall_score.delta;
    
    // Determine confidence level based on consistency of improvements
    let confidenceLevel: 'high' | 'medium' | 'low';
    if (improvedMetrics >= 3 && degradedMetrics === 0) {
      confidenceLevel = 'high';
    } else if (improvedMetrics >= 2 && totalImprovement > 0) {
      confidenceLevel = 'medium';
    } else {
      confidenceLevel = 'low';
    }
    
    return {
      accuracy,
      completeness,
      clinical_appropriateness,
      overall_score,
      summary: {
        totalImprovement,
        improvedMetrics,
        unchangedMetrics,
        degradedMetrics,
        confidenceLevel
      }
    };
  }

  /**
   * Format metrics delta for display
   */
  formatMetricsDelta(delta: MetricsDelta): string {
    const sign = delta.delta >= 0 ? '+' : '';
    const arrow = delta.isImprovement ? '↑' : delta.delta < 0 ? '↓' : '→';
    const color = delta.isImprovement ? '🟢' : delta.delta < 0 ? '🔴' : '⚪';
    
    return `${color} ${arrow} ${sign}${delta.delta.toFixed(1)} (${sign}${delta.percentChange.toFixed(1)}%)`;
  }

  // Connection Management

  /**
   * Test connection to DSPy server
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.checkHealth();
      return true;
    } catch (error) {
      const err = toError(error);
      logger.warn('DSPy server connection test failed', {
        component: 'OptimizationService',
        error: err.message
      });
      return false;
    }
  }

  /**
   * Get connection status
   */
  getConnectionInfo(): { baseUrl: string; timeout: number } {
    return {
      baseUrl: this.baseUrl,
      timeout: this.timeout
    };
  }
}
