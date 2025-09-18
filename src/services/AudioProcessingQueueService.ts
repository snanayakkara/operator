/**
 * AudioProcessingQueueService - Intelligent Queuing for Audio Processing
 * 
 * Manages a queue of audio processing jobs to prevent overwhelming the MLX Whisper
 * transcription server with too many concurrent requests. Provides intelligent
 * concurrency control, priority handling, and graceful degradation.
 * 
 * Features:
 * - Configurable concurrency limits (default: 2 concurrent jobs)
 * - Priority-based job ordering (urgent procedures first)
 * - Real-time status tracking and updates
 * - Automatic retry logic with exponential backoff
 * - Memory management and job cleanup
 */

import { AgentType } from '@/types/medical.types';
import { logger } from '@/utils/Logger';

export type JobPriority = 'urgent' | 'high' | 'normal' | 'low';
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface ProcessingJob {
  id: string;
  sessionId: string;
  audioBlob: Blob;
  workflowId: AgentType;
  priority: JobPriority;
  status: JobStatus;
  queuedAt: number;
  startedAt?: number;
  completedAt?: number;
  retryCount: number;
  maxRetries: number;
  error?: string;
  onProgress?: (status: JobStatus, error?: string) => void;
  onComplete?: (result: string) => void;
  onError?: (error: string) => void;
}

export interface QueueStats {
  totalJobs: number;
  queuedJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  currentConcurrency: number;
  maxConcurrency: number;
}

/**
 * Priority mapping for different workflow types
 * Quick Letter has highest priority as it's the most commonly used workflow
 */
const WORKFLOW_PRIORITIES: Record<AgentType, JobPriority> = {
  'quick-letter': 'urgent',   // Most common workflow - highest priority
  'tavi': 'urgent',           // Critical cardiac procedure
  'angiogram-pci': 'urgent',  // Critical cardiac procedure
  'consultation': 'high',     // Common consultation workflow
  'mteer': 'high',            // Important cardiac procedure
  'pfo-closure': 'high',      // Important cardiac procedure
  'right-heart-cath': 'high', // Important diagnostic procedure
  'investigation-summary': 'normal', // Standard summary
  'bloods': 'normal',         // Lab results
  'aus-medical-review': 'normal', // Medical review
  'background': 'low',        // Background information
  'medication': 'low',        // Medication review
};

export class AudioProcessingQueueService {
  private static instance: AudioProcessingQueueService;
  private queue: ProcessingJob[] = [];
  private activeJobs = new Map<string, ProcessingJob>();
  private completedJobs: ProcessingJob[] = [];
  private isProcessing = false;
  
  // Configuration
  private maxConcurrentJobs = 2;
  private maxQueueSize = 10;
  private maxRetries = 3;
  private retryDelayMs = 1000;
  private jobTimeoutMs = 300000; // 5 minutes
  
  // Performance tracking
  private processingTimes: number[] = [];
  private lastCleanup = Date.now();
  private cleanupIntervalMs = 300000; // 5 minutes

  private constructor() {
    this.startPeriodicCleanup();
  }

  public static getInstance(): AudioProcessingQueueService {
    if (!AudioProcessingQueueService.instance) {
      AudioProcessingQueueService.instance = new AudioProcessingQueueService();
    }
    return AudioProcessingQueueService.instance;
  }

  /**
   * Add a new job to the processing queue
   */
  public async addJob(
    sessionId: string,
    audioBlob: Blob,
    workflowId: AgentType,
    callbacks?: {
      onProgress?: (status: JobStatus, error?: string) => void;
      onComplete?: (result: string) => void;
      onError?: (error: string) => void;
    }
  ): Promise<string> {
    // Check queue size limit
    if (this.queue.length >= this.maxQueueSize) {
      const error = `Queue is full (${this.maxQueueSize} jobs). Please try again later.`;
      logger.warn('Audio processing queue is full', {
        component: 'AudioProcessingQueueService',
        queueSize: this.queue.length,
        maxQueueSize: this.maxQueueSize
      });
      
      if (callbacks?.onError) {
        callbacks.onError(error);
      }
      throw new Error(error);
    }

    const job: ProcessingJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      audioBlob,
      workflowId,
      priority: WORKFLOW_PRIORITIES[workflowId] || 'normal',
      status: 'queued',
      queuedAt: Date.now(),
      retryCount: 0,
      maxRetries: this.maxRetries,
      onProgress: callbacks?.onProgress,
      onComplete: callbacks?.onComplete,
      onError: callbacks?.onError
    };

    // Insert job in priority order
    this.insertJobByPriority(job);

    logger.info('Audio processing job queued', {
      component: 'AudioProcessingQueueService',
      jobId: job.id,
      sessionId,
      workflowId,
      priority: job.priority,
      queuePosition: this.getJobPosition(job.id),
      totalQueued: this.queue.length,
      processing: this.activeJobs.size
    });

    // Notify job status
    if (job.onProgress) {
      job.onProgress('queued');
    }

    // Start processing if not already running
    this.processQueue();

    return job.id;
  }

  /**
   * Cancel a queued or processing job
   */
  public cancelJob(jobId: string): boolean {
    // Check if job is in queue
    const queueIndex = this.queue.findIndex(job => job.id === jobId);
    if (queueIndex !== -1) {
      const job = this.queue[queueIndex];
      job.status = 'cancelled';
      this.queue.splice(queueIndex, 1);
      
      if (job.onProgress) {
        job.onProgress('cancelled');
      }
      
      logger.info('Audio processing job cancelled from queue', {
        component: 'AudioProcessingQueueService',
        jobId,
        sessionId: job.sessionId
      });
      
      return true;
    }

    // Check if job is currently processing
    const activeJob = this.activeJobs.get(jobId);
    if (activeJob) {
      activeJob.status = 'cancelled';
      
      if (activeJob.onProgress) {
        activeJob.onProgress('cancelled');
      }
      
      logger.info('Audio processing job cancelled while processing', {
        component: 'AudioProcessingQueueService',
        jobId,
        sessionId: activeJob.sessionId
      });
      
      return true;
    }

    return false;
  }

  /**
   * Get current queue statistics
   */
  public getQueueStats(): QueueStats {
    const totalJobs = this.queue.length + this.activeJobs.size + this.completedJobs.length;
    const averageProcessingTime = this.processingTimes.length > 0
      ? this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length
      : 0;

    return {
      totalJobs,
      queuedJobs: this.queue.length,
      processingJobs: this.activeJobs.size,
      completedJobs: this.completedJobs.filter(job => job.status === 'completed').length,
      failedJobs: this.completedJobs.filter(job => job.status === 'failed').length,
      averageProcessingTime,
      currentConcurrency: this.activeJobs.size,
      maxConcurrency: this.maxConcurrentJobs
    };
  }

  /**
   * Get position of a job in the queue
   */
  public getJobPosition(jobId: string): number {
    const index = this.queue.findIndex(job => job.id === jobId);
    return index === -1 ? -1 : index + 1; // 1-based position
  }

  /**
   * Get status of a specific job
   */
  public getJobStatus(jobId: string): JobStatus | null {
    // Check queue
    const queuedJob = this.queue.find(job => job.id === jobId);
    if (queuedJob) return queuedJob.status;

    // Check active jobs
    const activeJob = this.activeJobs.get(jobId);
    if (activeJob) return activeJob.status;

    // Check completed jobs
    const completedJob = this.completedJobs.find(job => job.id === jobId);
    if (completedJob) return completedJob.status;

    return null;
  }

  /**
   * Update concurrency settings
   */
  public updateConcurrencySettings(maxConcurrent: number, maxQueueSize?: number): void {
    this.maxConcurrentJobs = Math.max(1, Math.min(maxConcurrent, 5)); // Limit between 1-5
    
    if (maxQueueSize !== undefined) {
      this.maxQueueSize = Math.max(5, Math.min(maxQueueSize, 20)); // Limit between 5-20
    }

    logger.info('Audio processing queue settings updated', {
      component: 'AudioProcessingQueueService',
      maxConcurrentJobs: this.maxConcurrentJobs,
      maxQueueSize: this.maxQueueSize
    });

    // Resume processing if we increased concurrency
    this.processQueue();
  }

  /**
   * Clear all completed jobs from memory
   */
  public clearCompletedJobs(): void {
    const clearedCount = this.completedJobs.length;
    this.completedJobs = [];
    this.processingTimes = [];

    logger.info('Cleared completed audio processing jobs', {
      component: 'AudioProcessingQueueService',
      clearedCount
    });
  }

  // Private methods

  private insertJobByPriority(job: ProcessingJob): void {
    const priorityOrder: JobPriority[] = ['urgent', 'high', 'normal', 'low'];
    const jobPriorityIndex = priorityOrder.indexOf(job.priority);

    let insertIndex = this.queue.length; // Default to end of queue
    
    for (let i = 0; i < this.queue.length; i++) {
      const existingJobPriorityIndex = priorityOrder.indexOf(this.queue[i].priority);
      if (jobPriorityIndex < existingJobPriorityIndex) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, job);
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return; // Already processing
    }

    this.isProcessing = true;

    try {
      while (this.queue.length > 0 && this.activeJobs.size < this.maxConcurrentJobs) {
        const job = this.queue.shift();
        if (!job || job.status === 'cancelled') {
          continue;
        }

        // Start processing this job
        this.activeJobs.set(job.id, job);
        job.status = 'processing';
        job.startedAt = Date.now();

        if (job.onProgress) {
          job.onProgress('processing');
        }

        // Process job asynchronously
        this.processJobAsync(job);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processJobAsync(job: ProcessingJob): Promise<void> {
    try {
      logger.info('Starting audio processing job', {
        component: 'AudioProcessingQueueService',
        jobId: job.id,
        sessionId: job.sessionId,
        workflowId: job.workflowId,
        priority: job.priority,
        retryCount: job.retryCount
      });

      // Import LMStudioService dynamically to avoid circular dependencies
      const { LMStudioService } = await import('@/services/LMStudioService');
      const lmStudioService = LMStudioService.getInstance();

      // Create timeout for job
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Job timeout')), this.jobTimeoutMs);
      });

      // Process the audio with timeout
      const transcriptionPromise = lmStudioService.transcribeAudio(
        job.audioBlob,
        undefined, // AbortController signal - could be enhanced
        job.workflowId
      );

      const result = await Promise.race([transcriptionPromise, timeoutPromise]);

      // Job completed successfully
      job.status = 'completed';
      job.completedAt = Date.now();
      
      const processingTime = job.completedAt - (job.startedAt || job.queuedAt);
      this.processingTimes.push(processingTime);

      // Keep only last 50 processing times for average calculation
      if (this.processingTimes.length > 50) {
        this.processingTimes = this.processingTimes.slice(-50);
      }

      logger.info('Audio processing job completed', {
        component: 'AudioProcessingQueueService',
        jobId: job.id,
        sessionId: job.sessionId,
        processingTime,
        resultLength: result.length
      });

      if (job.onComplete) {
        job.onComplete(result);
      }

      if (job.onProgress) {
        job.onProgress('completed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Audio processing job failed', {
        component: 'AudioProcessingQueueService',
        jobId: job.id,
        sessionId: job.sessionId,
        error: errorMessage,
        retryCount: job.retryCount,
        maxRetries: job.maxRetries
      });

      // Handle retry logic
      if (job.retryCount < job.maxRetries && job.status !== 'cancelled') {
        job.retryCount++;
        
        // Exponential backoff for retries
        const retryDelay = this.retryDelayMs * Math.pow(2, job.retryCount - 1);
        
        logger.info('Retrying audio processing job', {
          component: 'AudioProcessingQueueService',
          jobId: job.id,
          retryCount: job.retryCount,
          retryDelay
        });

        setTimeout(() => {
          if (job.status !== 'cancelled') {
            // Reset job status and requeue
            job.status = 'queued';
            this.insertJobByPriority(job);
            this.processQueue();
          }
        }, retryDelay);

      } else {
        // Max retries exceeded or job cancelled
        job.status = 'failed';
        job.completedAt = Date.now();
        job.error = errorMessage;

        if (job.onError) {
          job.onError(errorMessage);
        }

        if (job.onProgress) {
          job.onProgress('failed', errorMessage);
        }
      }
    } finally {
      // Remove from active jobs and move to completed
      this.activeJobs.delete(job.id);
      if (job.status === 'completed' || job.status === 'failed') {
        this.completedJobs.push(job);
      }

      // Continue processing queue
      setTimeout(() => this.processQueue(), 100);
    }
  }

  private startPeriodicCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      
      // Remove old completed jobs (older than 1 hour)
      const oneHourAgo = now - 3600000;
      const beforeCount = this.completedJobs.length;
      
      this.completedJobs = this.completedJobs.filter(job => 
        (job.completedAt || job.queuedAt) > oneHourAgo
      );

      if (this.completedJobs.length < beforeCount) {
        logger.info('Cleaned up old completed audio processing jobs', {
          component: 'AudioProcessingQueueService',
          removedCount: beforeCount - this.completedJobs.length,
          remainingCount: this.completedJobs.length
        });
      }

      this.lastCleanup = now;
    }, this.cleanupIntervalMs);
  }
}