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
  ApiResponse
} from '@/types/optimization';

import {
  OptimizationError,
  ASROptimizationError,
  GEPAOptimizationError,
  OvernightOptimizationError
} from '@/types/optimization';

export class OptimizationService {
  private static instance: OptimizationService;
  private readonly baseUrl = 'http://localhost:8002'; // DSPy server
  private readonly timeout = 300000; // 5 minutes for optimization operations
  private requestIdCounter = 0;

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
      
      if (error.name === 'AbortError') {
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

      if (error instanceof OptimizationError) {
        throw error;
      }

      const networkError = new OptimizationError(
        `Network error: ${error.message}`,
        'NETWORK_ERROR',
        { endpoint, requestId, originalError: error.message }
      );
      
      logger.error('Optimization request failed', {
        component: 'OptimizationService',
        requestId,
        endpoint,
        error: error.message
      });
      
      throw networkError;
    }
  }

  // Health Check

  /**
   * Check server health and optimization capabilities
   */
  async checkHealth(): Promise<ServerHealthStatus> {
    try {
      const response = await this.makeRequest<ServerHealthStatus>('/v1/health', {}, 10000);
      
      // Add optimization endpoints availability check
      const optimizationStatus = {
        asr_endpoints_available: true, // Assume available if server is healthy
        gepa_endpoints_available: true,
        overnight_processing_available: true
      };

      return {
        ...response,
        optimization: optimizationStatus
      };
    } catch (error) {
      logger.error('Health check failed', {
        component: 'OptimizationService',
        error: error.message
      });
      throw error;
    }
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
      // Graceful degradation for ASR server unavailability
      if (error instanceof OptimizationError && 
          (error.code === 'HTTP_ERROR' || error.code === 'NETWORK_ERROR')) {
        logger.warn('ASR server unavailable for preview, returning empty suggestions', {
          component: 'OptimizationService',
          error: error.message
        });
        // Return empty preview instead of throwing error
        return {
          glossary_additions: [],
          rule_candidates: []
        };
      }
      if (error instanceof ASROptimizationError) throw error;
      throw new ASROptimizationError(`Failed to preview ASR corrections: ${error.message}`);
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
      if (error instanceof ASROptimizationError) throw error;
      throw new ASROptimizationError(`Failed to apply ASR corrections: ${error.message}`);
    }
  }

  /**
   * Get current ASR corrections state
   */
  async getCurrentASRState(): Promise<ASRCurrentState> {
    try {
      const response = await this.makeRequest<ApiResponse<ASRCurrentState>>('/v1/asr/current');

      if (!response.success) {
        throw new ASROptimizationError(response.error || 'Failed to get ASR state');
      }

      return response.data!;
    } catch (error) {
      // Graceful degradation for ASR server unavailability
      if (error instanceof OptimizationError && 
          (error.code === 'HTTP_ERROR' || error.code === 'NETWORK_ERROR')) {
        logger.warn('ASR server unavailable, returning empty state', {
          component: 'OptimizationService',
          error: error.message
        });
        // Return empty state instead of throwing error
        return {
          glossary: [],
          rules: []
        };
      }
      if (error instanceof ASROptimizationError) throw error;
      throw new ASROptimizationError(`Failed to get ASR state: ${error.message}`);
    }
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
      // Graceful degradation for ASR server unavailability
      if (error instanceof OptimizationError && 
          (error.code === 'HTTP_ERROR' || error.code === 'NETWORK_ERROR')) {
        logger.warn('ASR server unavailable for corrections upload, saving locally only', {
          component: 'OptimizationService',
          error: error.message,
          correctionsCount: corrections.length
        });
        // Return success response with local count - corrections are already saved in Chrome storage
        return { uploaded: corrections.length };
      }
      if (error instanceof ASROptimizationError) throw error;
      throw new ASROptimizationError(`Failed to upload corrections: ${error.message}`);
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
      if (error instanceof GEPAOptimizationError) throw error;
      throw new GEPAOptimizationError(`Failed to preview GEPA optimization: ${error.message}`);
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
      if (error instanceof GEPAOptimizationError) throw error;
      throw new GEPAOptimizationError(`Failed to apply GEPA optimization: ${error.message}`);
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
      if (error instanceof GEPAOptimizationError) throw error;
      throw new GEPAOptimizationError(`Failed to get GEPA history: ${error.message}`);
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
      if (error instanceof GEPAOptimizationError) throw error;
      throw new GEPAOptimizationError(`Failed to run privacy cleanup: ${error.message}`);
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
      if (error instanceof OvernightOptimizationError) throw error;
      throw new OvernightOptimizationError(`Failed to start overnight optimization: ${error.message}`);
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
      if (error instanceof OvernightOptimizationError) throw error;
      throw new OvernightOptimizationError(`Failed to get job status: ${error.message}`);
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
      if (error instanceof OvernightOptimizationError) throw error;
      throw new OvernightOptimizationError(`Failed to cancel job: ${error.message}`);
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
      if (error instanceof OvernightOptimizationError) throw error;
      throw new OvernightOptimizationError(`Failed to get completed jobs: ${error.message}`);
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
      logger.warn('DSPy server connection test failed', {
        component: 'OptimizationService',
        error: error.message
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