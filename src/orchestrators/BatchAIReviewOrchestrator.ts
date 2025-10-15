/**
 * Enhanced Batch AI Review Orchestrator
 * 
 * Production-ready batch processing system with intelligent waiting, error recovery,
 * checkpointing, performance monitoring, and comprehensive diagnostics.
 * 
 * Version: 3.0.0 - Complete architectural refactor with advanced capabilities
 */

import type { 
  PatientAppointment, 
  PatientReviewResult, 
  BatchAIReviewReport, 
  BatchAIReviewInput,
  BatchPatientReviewReport 
} from '@/types/medical.types';

import type {
  BatchProcessingProgress,
  BatchConfiguration,
  OperationContext,
  ExtractedData,
  PerformanceIndicators,
  EnvironmentState
} from '@/types/BatchProcessingTypes';

import { DynamicWaitUtils } from '@/utils/DynamicWaitUtils';
import { DataValidation } from '@/utils/DataValidation';
import { ErrorRecoveryManager } from '@/utils/ErrorRecoveryManager';
import { CacheManager } from '@/utils/CacheManager';
import { CheckpointManager } from './CheckpointManager';
import { MetricsCollector } from './MetricsCollector';
import { NotificationService } from '@/services/NotificationService';

export type ProgressCallback = (progress: BatchProcessingProgress) => void;

export interface OrchestrationConfig {
  enableCheckpoints: boolean;
  checkpointInterval: number;
  enableCaching: boolean;
  enableMetrics: boolean;
  enableAdvancedDiagnostics: boolean;
  parallelProcessing: boolean;
  maxConcurrentOperations: number;
  timeoutMs: number;
  retryAttempts: number;
}

export class BatchAIReviewOrchestrator {
  private batchPatientReviewAgent: any;
  private dynamicWait: DynamicWaitUtils;
  private dataValidation: DataValidation;
  private errorRecovery: ErrorRecoveryManager;
  private cacheManager: CacheManager;
  private checkpointManager: CheckpointManager;
  private metricsCollector: MetricsCollector;

  private isProcessing = false;
  private abortController: AbortController | null = null;
  private currentBatchId: string | null = null;
  private config: OrchestrationConfig;
  private currentProcessingContext: { patient: PatientAppointment } | null = null;

  constructor(config: Partial<OrchestrationConfig> = {}) {
    // Initialize AI agent (will be loaded dynamically)
    this.batchPatientReviewAgent = null;

    // Initialize utility classes
    this.dynamicWait = DynamicWaitUtils.getInstance();
    this.dataValidation = DataValidation.getInstance();
    this.errorRecovery = ErrorRecoveryManager.getInstance();
    this.cacheManager = CacheManager.getInstance();
    this.checkpointManager = CheckpointManager.getInstance();
    this.metricsCollector = MetricsCollector.getInstance();

    // Configure
    this.config = this.getDefaultConfig();
    this.updateConfig(config);

    this.log('🚀 Enhanced Batch AI Review Orchestrator initialized');
  }

  /**
   * Load the BatchPatientReviewAgent dynamically
   */
  private async loadAgent() {
    if (!this.batchPatientReviewAgent) {
      const { BatchPatientReviewAgent } = await import('@/agents/specialized/BatchPatientReviewAgent');
      this.batchPatientReviewAgent = new BatchPatientReviewAgent();
    }
  }

  /**
   * Process a batch of patients with advanced capabilities
   */
  public async processBatch(
    input: BatchAIReviewInput,
    onProgress?: ProgressCallback
  ): Promise<BatchAIReviewReport> {
    if (this.isProcessing) {
      throw new Error('Batch processing already in progress');
    }

    // Initialize processing state
    this.isProcessing = true;
    this.abortController = new AbortController();
    this.currentBatchId = this.generateBatchId(input);
    
    const startTime = Date.now();
    const patientResults: PatientReviewResult[] = [];
    const errors: string[] = [];

    this.log(`🔄 Starting enhanced batch AI review for ${input.selectedPatients.length} patients`);

    // Ensure we're on the appointment book page before starting
    try {
      const tabId = await this.getCurrentTabId();
      this.log(`📅 Ensuring we're on the appointment book page...`);

      const navResponse = await this.sendMessageWithTimeout(tabId, {
        type: 'EXECUTE_ACTION',
        action: 'navigate-to-appointment-book',
        data: {}
      }, 10000);

      if (!navResponse?.success) {
        this.log(`⚠️ Warning: Could not ensure appointment book state: ${navResponse?.error || 'Unknown error'}`);
      } else {
        this.log(`✅ Confirmed on appointment book page`);
      }

      // Wait a moment for the page to stabilize
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      this.log(`⚠️ Warning: Failed to navigate to appointment book:`, error);
      // Continue anyway - the validation will catch issues
    }

    // Start metrics collection
    if (this.config.enableMetrics) {
      this.metricsCollector.startSession(this.currentBatchId);
    }

    // Warm up cache if enabled
    if (this.config.enableCaching) {
      await this.cacheManager.warmup(input.selectedPatients);
    }

    try {
      // Check for resumable checkpoint
      const resumeOption = await this.checkForResumableCheckpoint(this.currentBatchId);
      let startIndex = 0;
      
      if (resumeOption) {
        const shouldResume = await this.handleResumeOption(resumeOption, onProgress);
        if (shouldResume) {
          patientResults.push(...resumeOption.completedPatients);
          startIndex = resumeOption.currentPatientIndex;
          this.log(`📂 Resuming from checkpoint at patient ${startIndex}`);
        }
      }

      // Process patients with either parallel or sequential approach
      const patientsToProcess = input.selectedPatients.slice(startIndex);
      
      if (this.config.parallelProcessing && patientsToProcess.length > 1) {
        this.log(`🚀 Using PARALLEL processing for ${patientsToProcess.length} patients (max ${this.config.maxConcurrentOperations} concurrent)`);
        
        const parallelResults = await this.processPatientsBatchParallel(
          patientsToProcess,
          startIndex,
          onProgress,
          startTime
        );
        
        patientResults.push(...parallelResults.results);
        errors.push(...parallelResults.errors);
        
      } else {
        this.log(`🔄 Using SEQUENTIAL processing for ${patientsToProcess.length} patients`);
        
        for (let i = 0; i < patientsToProcess.length; i++) {
          const patient = patientsToProcess[i];
          const globalIndex = startIndex + i;
          
          // Check for cancellation
          if (this.abortController?.signal.aborted) {
            this.log('🛑 Batch processing was cancelled by user');
            throw new Error('Batch processing was cancelled');
          }

          // Validate we're in the correct appointment book state before processing each patient
          await this.validateAppointmentBookState(patient, globalIndex);

          // Update progress with enhanced information
          const progress = this.createEnhancedProgress(
            globalIndex, 
            input.selectedPatients.length, 
            patient, 
            patientResults, 
            errors,
            startTime
          );
          
          onProgress?.(progress);

          try {
            this.log(`🧭 Processing patient ${globalIndex + 1}/${input.selectedPatients.length}: ${patient.name}`);
            
            // Process individual patient with advanced error recovery
            const result = await this.processIndividualPatientEnhanced(
              patient, 
              globalIndex,
              (phase, subPhase) => {
                progress.phase = phase as any;
                progress.subPhase = subPhase;
                onProgress?.(progress);
              }
            );
            
            patientResults.push(result);
            this.log(`✅ Completed patient ${globalIndex + 1}: ${patient.name}`);

            // Save checkpoint if enabled and interval reached
            if (this.config.enableCheckpoints && 
                (globalIndex + 1) % this.config.checkpointInterval === 0) {
              await this.saveProgressCheckpoint(
                input, 
                patientResults, 
                globalIndex + 1, 
                errors, 
                startTime
              );
            }
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.log(`❌ Failed to process patient ${patient.name}:`, errorMessage);
            
            // Record error in metrics
            if (this.config.enableMetrics) {
              this.metricsCollector.recordError('patient-processing', errorMessage, globalIndex);
            }
            
            // Add failed result
            patientResults.push({
              patient,
              reviewReport: null,
              extractedData: { background: '', investigations: '', medications: '' },
              processingTime: 0,
              success: false,
              error: errorMessage
            });
            
            errors.push(`${patient.name}: ${errorMessage}`);

            // Check if we should stop processing due to high error rate
            const errorRate = errors.length / (globalIndex + 1);
            if (errorRate > 0.5 && errors.length > 3) {
              this.log(`🚨 High error rate detected (${Math.round(errorRate * 100)}%), stopping batch`);
              throw new Error(`Batch stopped due to high error rate: ${Math.round(errorRate * 100)}%`);
            }
          }
        }
      }

      // Final progress update
      const finalProgress = this.createEnhancedProgress(
        input.selectedPatients.length,
        input.selectedPatients.length,
        null,
        patientResults,
        errors,
        startTime
      );
      finalProgress.phase = 'completed' as const;
      onProgress?.(finalProgress);

      // Generate comprehensive batch report
      const batchReport = await this.generateEnhancedBatchReport(
        input,
        patientResults,
        startTime,
        Date.now()
      );

      this.log(`🎉 Batch processing completed: ${patientResults.filter(r => r.success).length}/${input.selectedPatients.length} successful`);
      
      // Send batch completion notification
      try {
        const batchProcessingTime = Date.now() - startTime;
        const successfulCount = patientResults.filter(r => r.success).length;
        const totalCount = input.selectedPatients.length;
        const extraInfo = `${successfulCount}/${totalCount} patients processed successfully`;
        
        await NotificationService.showCompletionNotification(
          'batch-ai-review',
          batchProcessingTime,
          extraInfo
        );
        console.log(`🔔 Batch completion notification sent: ${successfulCount}/${totalCount} patients (${batchProcessingTime}ms)`);
      } catch (notificationError) {
        console.warn('Failed to send batch completion notification:', notificationError);
      }
      
      return batchReport;

    } catch (error) {
      this.log('❌ Batch processing failed:', error);
      
      // Update progress with error state
      const errorProgress = this.createEnhancedProgress(
        0,
        input.selectedPatients.length,
        null,
        patientResults,
        [...errors, error instanceof Error ? error.message : 'Unknown error'],
        startTime
      );
      errorProgress.phase = 'error' as const;
      onProgress?.(errorProgress);
      
      throw error;
    } finally {
      // Cleanup and finalization
      await this.finalizeProcessing();
    }
  }

  /**
   * Resume processing from a specific checkpoint
   */
  public async resumeFromCheckpoint(
    checkpointId: string,
    onProgress?: ProgressCallback
  ): Promise<BatchAIReviewReport> {
    this.log(`🔄 Resuming batch processing from checkpoint: ${checkpointId}`);

    const { checkpoint, resumeStrategy: _resumeStrategy, warnings } = await this.checkpointManager.resumeFromCheckpoint(checkpointId);
    
    // Log warnings
    for (const warning of warnings) {
      this.log(`⚠️ Resume warning: ${warning}`);
    }

    // Reconstruct input from checkpoint
    const input: BatchAIReviewInput = {
      selectedPatients: [], // Would need to reconstruct from checkpoint data
      appointmentDate: new Date().toISOString(),
      calendarUrl: checkpoint.resumeData.environmentState?.currentUrl || ''
    };

    // Continue processing with resume strategy
    return this.processBatch(input, onProgress);
  }

  /**
   * Cancel ongoing batch processing
   */
  public cancelProcessing(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.log('🛑 Batch processing cancelled by user');
    }
  }

  /**
   * Check if batch processing is currently running
   */
  public isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Get current processing statistics
   */
  public getProcessingStats(): {
    isProcessing: boolean;
    currentBatchId: string | null;
    performanceIndicators: PerformanceIndicators | null;
    cacheStats: any;
    errorStats: any;
  } {
    return {
      isProcessing: this.isProcessing,
      currentBatchId: this.currentBatchId,
      performanceIndicators: this.config.enableMetrics 
        ? this.metricsCollector.getPerformanceIndicators() 
        : null,
      cacheStats: this.config.enableCaching 
        ? this.cacheManager.getStats() 
        : null,
      errorStats: this.errorRecovery.getFailureStats()
    };
  }

  // ============================================================================
  // Parallel Patient Processing
  // ============================================================================

  /**
   * Process patients in parallel using two-phase approach:
   * Phase 1: Collect all patient data rapidly
   * Phase 2: Process AI reviews in parallel
   */
  private async processPatientsBatchParallel(
    patients: PatientAppointment[],
    startIndex: number,
    onProgress?: ProgressCallback,
    _batchStartTime?: number
  ): Promise<{ results: PatientReviewResult[], errors: string[] }> {
    const results: PatientReviewResult[] = [];
    const errors: string[] = [];
    
    this.log(`🚀 Starting parallel batch processing for ${patients.length} patients`);
    
    // Phase 1: Rapid data collection for all patients
    this.log(`📊 PHASE 1: Collecting data from all ${patients.length} patients...`);
    const extractedDataBatch: Array<{
      patient: PatientAppointment;
      extractedData: ExtractedData;
      patientIndex: number;
      success: boolean;
      error?: string;
    }> = [];
    
    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      const globalIndex = startIndex + i;
      
      // Check for cancellation
      if (this.abortController?.signal.aborted) {
        throw new Error('Batch processing was cancelled');
      }
      
      // Update progress for data collection phase
      onProgress?.({
        currentPatientIndex: globalIndex,
        totalPatients: patients.length,
        currentPatient: patient,
        phase: 'extracting' as const,
        subPhase: `collecting-data-${i + 1}/${patients.length}`,
        completedPatients: [],
        errors: [],
        percentComplete: (i / patients.length) * 50, // First 50% for data collection
        estimatedTimeRemaining: 0,
        currentOperationDetails: `Collecting data from ${patient.name}`,
        performanceIndicators: {
          averageTimePerPatient: 0,
          successRate: 1,
          currentSpeed: 'normal' as const,
          errorRate: 0,
          memoryUsage: 0
        }
      });
      
      try {
        // Validate appointment book state
        await this.validateAppointmentBookState(patient, globalIndex);
        
        // Extract data rapidly using optimized method
        const tabId = await this.getCurrentTabId();
        const extractedData = await this.extractPatientDataEnhanced(tabId, patient);
        
        extractedDataBatch.push({
          patient,
          extractedData,
          patientIndex: globalIndex,
          success: true
        });
        
        this.log(`✅ Phase 1: Collected data for ${patient.name} (${i + 1}/${patients.length})`);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.log(`❌ Phase 1: Failed to collect data for ${patient.name}: ${errorMessage}`);
        
        extractedDataBatch.push({
          patient,
          extractedData: { background: '', investigations: '', medications: '', extractionTimestamp: Date.now(), extractionAttempts: 1, qualityScore: 0 },
          patientIndex: globalIndex,
          success: false,
          error: errorMessage
        });
        
        errors.push(`${patient.name}: ${errorMessage}`);
      }
    }
    
    this.log(`📊 PHASE 1 COMPLETE: Collected data from ${extractedDataBatch.length} patients`);
    
    // Phase 2: Parallel AI processing
    this.log(`🤖 PHASE 2: Processing AI reviews in parallel (max ${this.config.maxConcurrentOperations} concurrent)...`);
    
    // Process AI reviews in batches to respect maxConcurrentOperations
    const successfulExtractions = extractedDataBatch.filter(item => item.success);
    const _aiReviewPromises: Promise<PatientReviewResult>[] = [];
    
    // Create chunks for parallel processing
    const chunks = this.chunkArray(successfulExtractions, this.config.maxConcurrentOperations);
    
    for (const chunk of chunks) {
      // Process each chunk in parallel
      const chunkPromises = chunk.map(async (item, _chunkIndex) => {
        try {
          // Update progress for AI processing phase
          const progressPercent = 50 + ((results.length / patients.length) * 50); // Second 50% for AI processing
          onProgress?.({
            currentPatientIndex: item.patientIndex,
            totalPatients: patients.length,
            currentPatient: item.patient,
            phase: 'reviewing' as const,
            subPhase: `ai-processing-parallel`,
            completedPatients: results,
            errors: [],
            percentComplete: progressPercent,
            estimatedTimeRemaining: 0,
            currentOperationDetails: `AI review: ${item.patient.name} (parallel)`,
            performanceIndicators: {
              averageTimePerPatient: 0,
              successRate: 1,
              currentSpeed: 'normal' as const,
              errorRate: 0,
              memoryUsage: 0
            }
          });
          
          this.log(`🤖 Processing AI review for ${item.patient.name} (parallel batch)`);
          
          // Run AI review
          const reviewReport = await this.performAIReviewWithCaching(item.extractedData, item.patient);
          
          const result: PatientReviewResult = {
            patient: item.patient,
            reviewReport,
            extractedData: item.extractedData,
            processingTime: 0, // Will be calculated later
            success: true
          };
          
          this.log(`✅ Completed AI review for ${item.patient.name}`);
          return result;
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.log(`❌ AI review failed for ${item.patient.name}: ${errorMessage}`);
          
          const failedResult: PatientReviewResult = {
            patient: item.patient,
            reviewReport: null,
            extractedData: item.extractedData,
            processingTime: 0,
            success: false,
            error: errorMessage
          };
          
          errors.push(`${item.patient.name}: ${errorMessage}`);
          return failedResult;
        }
      });
      
      // Wait for this chunk to complete before starting the next
      const chunkResults = await Promise.allSettled(chunkPromises);
      
      // Process results from this chunk
      for (const result of chunkResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      }
      
      this.log(`✅ Completed AI processing chunk: ${results.filter(r => r.success).length}/${results.length} successful`);
    }
    
    // Add failed extractions as failed results
    for (const failedItem of extractedDataBatch.filter(item => !item.success)) {
      results.push({
        patient: failedItem.patient,
        reviewReport: null,
        extractedData: failedItem.extractedData,
        processingTime: 0,
        success: false,
        error: failedItem.error
      });
    }
    
    this.log(`🎉 PARALLEL PROCESSING COMPLETE: ${results.filter(r => r.success).length}/${results.length} patients successful`);
    
    return { results, errors };
  }
  
  /**
   * Split array into chunks for parallel processing
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // ============================================================================
  // Enhanced Patient Processing
  // ============================================================================

  private async processIndividualPatientEnhanced(
    patient: PatientAppointment,
    patientIndex: number,
    onPhaseChange?: (phase: string, subPhase?: string) => void
  ): Promise<PatientReviewResult> {
    const processingStartTime = Date.now();
    
    // Set current processing context for patient activation
    this.currentProcessingContext = { patient };
    
    const operationContext: OperationContext = {
      operation: 'process-patient',
      patientIndex,
      patient,
      timestamp: processingStartTime,
      environmentState: await this.getCurrentEnvironmentState(),
      previousAttempts: 0
    };

    try {
      // Start metrics timing
      const metricsId = `patient-${patientIndex}`;
      if (this.config.enableMetrics) {
        this.metricsCollector.startOperation(metricsId, 'patient-processing', patientIndex);
      }

      // Phase 1: Patient Activation with intelligent waiting
      onPhaseChange?.('navigating', 'activating-patient');
      this.log(`🖱️ Activating patient ${patientIndex}: ${patient.name} (${patient.fileNumber})`);
      
      await this.errorRecovery.executeWithRecovery(
        () => this.activatePatientWithIntelligentWaiting(patientIndex),
        { ...operationContext, operation: 'patient-activation' }
      );

      // Phase 2: Wait for patient data to load
      onPhaseChange?.('waiting-for-load', 'patient-data-loading');
      const tabId = await this.getCurrentTabId();
      
      const waitResult = await this.dynamicWait.waitForPatientDataLoad(tabId, patient.name);
      if (!waitResult.success) {
        throw new Error(`Patient data failed to load: ${waitResult.error}`);
      }

      // Phase 3: Enhanced data extraction with validation
      onPhaseChange?.('extracting', 'clinical-data-extraction');
      this.log(`📋 Extracting clinical data for: ${patient.name}`);
      
      const extractedData = await this.errorRecovery.executeWithRecovery(
        () => this.extractPatientDataEnhanced(tabId, patient),
        { ...operationContext, operation: 'data-extraction' }
      );

      // Phase 4: AI Review with caching (all patients processed, including those with incomplete data)
      onPhaseChange?.('reviewing', 'ai-medical-review');
      
      if (extractedData.dataCompleteness && !extractedData.dataCompleteness.hasRealData) {
        this.log(`🤖 Running AI review for ${patient.name} (incomplete data - ${extractedData.dataCompleteness.emptyFieldCount}/${extractedData.dataCompleteness.totalFields} fields empty)`);
      } else {
        this.log(`🤖 Running AI review for: ${patient.name}`);
      }
      
      const reviewReport = await this.errorRecovery.executeWithRecovery(
        () => this.performAIReviewWithCaching(extractedData, patient),
        { ...operationContext, operation: 'ai-review' }
      );

      const processingTime = Date.now() - processingStartTime;

      // End metrics timing
      if (this.config.enableMetrics) {
        this.metricsCollector.endOperation(
          metricsId, 
          'patient-processing', 
          true, 
          patientIndex,
          { processingTime, dataQuality: extractedData.qualityScore }
        );
      }

      return {
        patient,
        reviewReport,
        extractedData,
        processingTime,
        success: true
      };
      
    } catch (error) {
      const processingTime = Date.now() - processingStartTime;
      this.log(`❌ Failed to process patient ${patient.name}:`, error);
      
      // End metrics timing with failure
      if (this.config.enableMetrics) {
        this.metricsCollector.endOperation(
          `patient-${patientIndex}`, 
          'patient-processing', 
          false, 
          patientIndex,
          { processingTime, error: error instanceof Error ? error.message : String(error) }
        );
      }
      
      throw error;
    } finally {
      // Clear processing context
      this.currentProcessingContext = null;
    }
  }

  private async activatePatientWithIntelligentWaiting(_patientIndex: number): Promise<void> {
    const tabId = await this.getCurrentTabId();
    
    // Get the patient data from the current processing context
    const context = this.getCurrentProcessingContext();
    if (!context?.patient) {
      throw new Error('No patient context available for activation');
    }
    
    const patient = context.patient;
    
    // SPA Workflow: Double-click patient → Navigate to Patient Record → Extract data → Return to Appointment Book
    try {
      this.log(`👆 SPA Workflow: Starting patient processing for ${patient.name} (${patient.fileNumber})`);
      
      // Step 1: Double-click patient name in appointment book
      this.log(`👆 Step 1: Double-clicking patient ${patient.name}`);
      const doubleClickResponse = await this.sendMessageWithTimeout(tabId, {
        type: 'EXECUTE_ACTION',
        action: 'double-click-patient',
        data: {
          patientName: patient.name,
          patientId: patient.fileNumber
        }
      }, 10000);
      
      if (!doubleClickResponse?.success) {
        throw new Error(`Double-click patient failed: ${doubleClickResponse?.error || 'Unknown error'}`);
      }
      
      // Step 2: Navigate to Patient Record view
      this.log(`🏥 Step 2: Navigating to Patient Record view`);
      const patientRecordResponse = await this.sendMessageWithTimeout(tabId, {
        type: 'EXECUTE_ACTION',
        action: 'navigate-to-patient-record',
        data: {}
      }, 15000);
      
      if (!patientRecordResponse?.success) {
        throw new Error(`Navigate to patient record failed: ${patientRecordResponse?.error || 'Unknown error'}`);
      }
      
      // Wait for patient data to load in Patient Record view
      await this.waitForPatientDataReady(tabId, patient.name);
      
      this.log(`✅ SPA Workflow: Patient ${patient.name} activated and Patient Record view ready`);
      
    } catch (error) {
      this.log(`❌ SPA Workflow activation failed:`, error);
      throw new Error(`SPA patient activation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private getCurrentProcessingContext(): { patient: PatientAppointment } | null {
    // This would be set during patient processing - for now we'll get it from the current operation
    // In a full implementation, this would be tracked in the processing state
    return this.currentProcessingContext || null;
  }
  
  private async waitForPatientDataReady(tabId: number, patientName: string): Promise<void> {
    // Wait for SPA patient data to load after clicking patient row
    const maxAttempts = 30; // 15 seconds total
    const delay = 500; // 500ms between checks
    
    this.log(`⏳ Waiting for patient data to load for: ${patientName}`);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Check if XestroBoxes are present (patient data loaded)
        const response = await this.sendMessageWithTimeout(tabId, {
          type: 'CHECK_XESTRO_BOXES'
        }, 3000); // 3 second timeout per message
        
        if (response?.found && response.count > 0) {
          this.log(`✅ Patient data ready after ${(attempt + 1) * delay}ms (${response.count} XestroBoxes found)`);
          // Additional brief wait to ensure all data is populated
          await this.sleep(1000);
          return;
        }
        
        if (attempt % 5 === 0) { // Log every 2.5 seconds
          this.log(`⏳ Still waiting for patient data... (attempt ${attempt + 1}/${maxAttempts}, ${response?.count || 0} XestroBoxes)`);
        }
        
        await this.sleep(delay);
        
      } catch (error) {
        this.log(`❌ Error checking patient data readiness (attempt ${attempt + 1}):`, error);
        
        // If we're getting message channel errors, the content script may be unresponsive
        if (error instanceof Error && error.message.includes('message channel')) {
          this.log(`🔧 Message channel error detected, waiting longer before retry...`);
          await this.sleep(delay * 2); // Wait longer for message channel issues
        } else {
          await this.sleep(delay);
        }
        
        // Only throw on final attempt
        if (attempt === maxAttempts - 1) {
          throw new Error(`Patient data failed to load after ${maxAttempts * delay}ms: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
    
    throw new Error(`Patient data did not load within ${maxAttempts * delay}ms for patient: ${patientName}`);
  }
  
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private async sendMessageWithTimeout(tabId: number, message: any, timeoutMs: number = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Message timeout after ${timeoutMs}ms`));
      }, timeoutMs);
      
      try {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          clearTimeout(timeout);
          
          if (chrome.runtime.lastError) {
            reject(new Error(`Message failed: ${chrome.runtime.lastError.message}`));
            return;
          }
          
          resolve(response);
        });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  private async extractPatientDataEnhanced(
    tabId: number, 
    patient: PatientAppointment
  ): Promise<ExtractedData> {
    // Check cache first
    if (this.config.enableCaching) {
      const cacheKey = { patientId: patient.fileNumber, dataType: 'extracted_data' as const };
      const cachedResult = await this.cacheManager.get<ExtractedData>(cacheKey);
      
      if (cachedResult.hit && cachedResult.data) {
        this.log(`💾 Using cached data for patient: ${patient.name}`);
        // Still need to navigate back to appointment book even with cached data
        await this.navigateBackToAppointmentBook(tabId);
        return cachedResult.data;
      }
    }

    // SPA Workflow: Extract patient fields from Patient Record view
    try {
      this.log(`📋 Step 3: Extracting patient fields for ${patient.name}`);
      const extractResponse = await this.sendMessageWithTimeout(tabId, {
        type: 'EXECUTE_ACTION',
        action: 'extract-patient-fields',
        data: {}
      }, 30000); // 30 second timeout for extraction
      
      if (!extractResponse?.success || !extractResponse?.data) {
        throw new Error(`Patient fields extraction failed: ${extractResponse?.error || 'No data returned'}`);
      }
      
      // Process field data and mark empty fields with clear indicators
      const extractionData = extractResponse.data;
      const hasAnyData = extractionData.hasAnyData;
      
      this.log(`📊 Data completeness check for ${patient.name}:`, {
        hasAnyData,
        backgroundLength: extractionData.background?.length || 0,
        investigationsLength: extractionData.investigations?.length || 0,
        medicationsLength: extractionData.medications?.length || 0
      });
      
      // Process fields and mark empty ones with clear "No data available" indicators
      const processedBackground = extractionData.background?.trim() 
        ? extractionData.background 
        : 'No data available in Background section';
      
      const processedInvestigations = extractionData.investigations?.trim()
        ? extractionData.investigations
        : 'No data available in Investigations section';
        
      const processedMedications = extractionData.medications?.trim()
        ? extractionData.medications
        : 'No data available in Medications section';
      
      this.log(`📝 Processed field data for ${patient.name}:`, {
        backgroundMarked: !extractionData.background?.trim(),
        investigationsMarked: !extractionData.investigations?.trim(),
        medicationsMarked: !extractionData.medications?.trim(),
        hasAnyRealData: hasAnyData
      });
      
      // Convert extracted data to expected format with processed fields
      const extractedData: ExtractedData = {
        background: processedBackground,
        investigations: processedInvestigations,
        medications: processedMedications,
        extractionTimestamp: extractionData.extractionTimestamp || Date.now(),
        extractionAttempts: 1,
        qualityScore: this.calculateDataQuality(extractionData),
        dataCompleteness: {
          hasRealData: hasAnyData,
          emptyFieldCount: [
            !extractionData.background?.trim(),
            !extractionData.investigations?.trim(),
            !extractionData.medications?.trim()
          ].filter(Boolean).length,
          totalFields: 3
        }
      };

      // Step 4: Navigate back to Appointment Book
      await this.navigateBackToAppointmentBook(tabId);

      // Cache the extracted data if enabled
      if (this.config.enableCaching) {
        const cacheKey = { patientId: patient.fileNumber, dataType: 'extracted_data' as const };
        const quality = this.dataValidation.assessDataQuality(extractedData);
        await this.cacheManager.set(cacheKey, extractedData, quality);
      }

      this.log(`✅ SPA Workflow: Patient ${patient.name} data extraction completed and returned to appointment book`);
      return extractedData;
      
    } catch (error) {
      this.log(`❌ SPA Workflow extraction failed:`, error);
      // Attempt to navigate back to appointment book even on failure
      try {
        await this.navigateBackToAppointmentBook(tabId);
      } catch (navError) {
        this.log(`❌ Failed to navigate back to appointment book:`, navError);
      }
      throw new Error(`SPA data extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Navigate back to Appointment Book for SPA workflow
   */
  private async navigateBackToAppointmentBook(tabId: number): Promise<void> {
    this.log(`📅 Step 4: Navigating back to Appointment Book`);
    const appointmentBookResponse = await this.sendMessageWithTimeout(tabId, {
      type: 'EXECUTE_ACTION',
      action: 'navigate-to-appointment-book',
      data: {}
    }, 15000);
    
    if (!appointmentBookResponse?.success) {
      throw new Error(`Navigate to appointment book failed: ${appointmentBookResponse?.error || 'Unknown error'}`);
    }
  }
  
  /**
   * Calculate data quality score for extracted data
   */
  private calculateDataQuality(data: any): number {
    let score = 0;
    let totalFields = 0;
    
    const fields = ['background', 'investigations', 'medications'];
    fields.forEach(field => {
      totalFields++;
      const content = data[field] || '';
      if (content.trim().length > 0) {
        score += 1;
        // Bonus for substantial content
        if (content.trim().length > 50) {
          score += 0.5;
        }
      }
    });
    
    return Math.min(score / (totalFields * 1.5), 1.0); // Normalize to 0-1
  }

  private async performAIReviewWithCaching(
    extractedData: ExtractedData,
    patient: PatientAppointment
  ): Promise<BatchPatientReviewReport> {
    // Check cache for AI review
    if (this.config.enableCaching) {
      const cacheKey = { patientId: patient.fileNumber, dataType: 'ai_review' as const };
      const cachedResult = await this.cacheManager.get<BatchPatientReviewReport>(cacheKey);
      
      if (cachedResult.hit && cachedResult.data) {
        // Verify that the cached review matches current data
        const dataChanged = await this.cacheManager.hasChanged(
          { patientId: patient.fileNumber, dataType: 'extracted_data' as const },
          extractedData
        );
        
        if (!dataChanged) {
          this.log(`💾 Using cached AI review for patient: ${patient.name}`);
          return cachedResult.data;
        }
      }
    }

    // Format input for AI review
    const reviewInput = this.formatReviewInput(extractedData, patient);
    
    // Ensure agent is loaded
    await this.loadAgent();
    
    // Run AI review using existing BatchPatientReviewAgent
    const reviewReport = await this.batchPatientReviewAgent.process(reviewInput);

    // Cache the AI review result
    if (this.config.enableCaching) {
      const cacheKey = { patientId: patient.fileNumber, dataType: 'ai_review' as const };
      await this.cacheManager.set(cacheKey, reviewReport);
    }
    
    return reviewReport as BatchPatientReviewReport;
  }

  // ============================================================================
  // Enhanced Progress and Reporting
  // ============================================================================

  private createEnhancedProgress(
    currentIndex: number,
    totalPatients: number,
    currentPatient: PatientAppointment | null,
    completedPatients: PatientReviewResult[],
    errors: string[],
    startTime: number
  ): BatchProcessingProgress {
    const now = Date.now();
    const elapsedTime = now - startTime;
    const successfulPatients = completedPatients.filter(p => p.success).length;
    
    // Calculate ETA
    const averageTimePerPatient = currentIndex > 0 ? elapsedTime / currentIndex : 0;
    const remainingPatients = totalPatients - currentIndex;
    const estimatedTimeRemaining = remainingPatients * averageTimePerPatient;

    // Calculate percentage complete
    const percentComplete = totalPatients > 0 ? (currentIndex / totalPatients) * 100 : 0;

    // Get performance indicators
    const performanceIndicators = this.config.enableMetrics 
      ? this.metricsCollector.getPerformanceIndicators()
      : {
          averageTimePerPatient,
          successRate: currentIndex > 0 ? successfulPatients / currentIndex : 1,
          currentSpeed: 'normal' as const,
          errorRate: currentIndex > 0 ? errors.length / currentIndex : 0,
          memoryUsage: 0
        };

    return {
      currentPatientIndex: currentIndex,
      totalPatients,
      currentPatient,
      phase: 'navigating' as const, // Will be updated by caller
      completedPatients,
      errors,
      percentComplete,
      estimatedTimeRemaining,
      currentOperationDetails: currentPatient 
        ? `Processing ${currentPatient.name} (${currentPatient.fileNumber})`
        : 'Initializing...',
      performanceIndicators
    };
  }

  private async generateEnhancedBatchReport(
    input: BatchAIReviewInput,
    patientResults: PatientReviewResult[],
    startTime: number,
    endTime: number
  ): Promise<BatchAIReviewReport> {
    const successfulReviews = patientResults.filter(r => r.success);
    const failedReviews = patientResults.filter(r => !r.success);
    
    // Generate comprehensive metrics report
    let metricsReport = null;
    if (this.config.enableMetrics) {
      metricsReport = this.metricsCollector.endSession();
    }

    // Aggregate findings across all successful reviews
    let totalFindings = 0;
    let immediateFindings = 0;
    let medicationSafetyIssues = 0;
    const commonFindings: string[] = [];
    
    successfulReviews.forEach(result => {
      if (result.reviewReport?.reviewData) {
        const reviewData = result.reviewReport.reviewData;
        totalFindings += reviewData.findings?.length || 0;
        immediateFindings += reviewData.findings?.filter((f: any) => f.urgency === 'Immediate').length || 0;
        medicationSafetyIssues += reviewData.medicationSafetyIssues || 0;
        
        // Collect common findings
        reviewData.findings?.forEach((finding: any) => {
          if (finding.finding && !commonFindings.includes(finding.finding)) {
            commonFindings.push(finding.finding);
          }
        });
      }
    });

    // Create enhanced batch report
    const batchReport: BatchAIReviewReport = {
      id: `batch-${Date.now()}`,
      agentName: 'Enhanced Batch AI Review Orchestrator v3.0',
      content: `Enhanced batch AI medical review completed for ${input.selectedPatients.length} patients on ${input.appointmentDate}`,
      sections: [], // Will be populated with individual patient sections
      metadata: {
        confidence: successfulReviews.length / input.selectedPatients.length,
        processingTime: endTime - startTime,
        modelUsed: 'BatchPatientReviewAgent',
        enhancedFeatures: {
          intelligentWaiting: true,
          dataValidation: true,
          errorRecovery: true,
          caching: this.config.enableCaching,
          checkpointing: this.config.enableCheckpoints,
          metrics: this.config.enableMetrics
        }
      },
      timestamp: endTime,
      warnings: failedReviews.map(r => `Failed to process ${r.patient.name}: ${r.error}`),
      errors: failedReviews.map(r => r.error || 'Unknown error'),
      batchData: {
        appointmentDate: input.appointmentDate,
        totalPatients: input.selectedPatients.length,
        successfulReviews: successfulReviews.length,
        failedReviews: failedReviews.length,
        processingStartTime: startTime,
        processingEndTime: endTime,
        patientResults,
        summary: {
          totalFindings,
          immediateFindings,
          medicationSafetyIssues,
          commonFindings: commonFindings.slice(0, 10) // Top 10 common findings
        },
        enhancedMetrics: metricsReport
      }
    };

    return batchReport;
  }

  // ============================================================================
  // Checkpoint Management
  // ============================================================================

  private async checkForResumableCheckpoint(batchId: string): Promise<any | null> {
    if (!this.config.enableCheckpoints) return null;

    try {
      const checkpoints = await this.checkpointManager.listCheckpoints(batchId);
      if (checkpoints.length > 0) {
        const latest = checkpoints[0]; // Most recent
        this.log(`📂 Found resumable checkpoint: ${latest.id}`);
        return await this.checkpointManager.loadCheckpoint(latest.id);
      }
    } catch (error) {
      this.log(`❌ Error checking for resumable checkpoint:`, error);
    }

    return null;
  }

  private async handleResumeOption(checkpoint: any, _onProgress?: ProgressCallback): Promise<boolean> {
    // For now, automatically resume. In a full implementation, this could prompt the user
    this.log(`🔄 Auto-resuming from checkpoint with ${checkpoint.completedPatients.length} completed patients`);
    return true;
  }

  private async saveProgressCheckpoint(
    input: BatchAIReviewInput,
    completedPatients: PatientReviewResult[],
    currentIndex: number,
    _errors: string[],
    _startTime: number
  ): Promise<void> {
    if (!this.config.enableCheckpoints || !this.currentBatchId) return;

    try {
      const environmentState = await this.getCurrentEnvironmentState();
      const performanceMetrics = this.config.enableMetrics 
        ? this.metricsCollector.getMetrics()
        : this.createEmptyMetrics();

      const checkpointId = await this.checkpointManager.saveCheckpoint(
        this.currentBatchId,
        input,
        completedPatients,
        currentIndex,
        [], // Failed attempts would be tracked separately
        this.getBatchConfiguration(),
        performanceMetrics,
        environmentState
      );

      this.log(`💾 Saved checkpoint: ${checkpointId} (${completedPatients.length} patients completed)`);
    } catch (error) {
      this.log(`❌ Failed to save checkpoint:`, error);
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async getCurrentTabId(): Promise<number> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]?.id) {
      throw new Error('No active tab found');
    }
    return tabs[0].id;
  }

  private async getCurrentEnvironmentState(): Promise<EnvironmentState> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return {
      tabId: tabs[0]?.id || 0,
      currentUrl: tabs[0]?.url || '',
      contentScriptVersion: '2.6.0', // Would get from content script
      lastHealthCheck: Date.now()
    };
  }

  private formatReviewInput(
    extractedData: ExtractedData,
    patient: PatientAppointment
  ): string {
    // Add data completeness context for the AI model
    let completenessNote = '';
    if (extractedData.dataCompleteness) {
      const { hasRealData, emptyFieldCount, totalFields } = extractedData.dataCompleteness;
      if (!hasRealData) {
        completenessNote = `\n\nDATA COMPLETENESS ALERT: This patient record has ${emptyFieldCount}/${totalFields} empty clinical sections. Please assess if missing data represents a clinical oversight or if additional data collection is needed.`;
      } else if (emptyFieldCount > 0) {
        completenessNote = `\n\nDATA COMPLETENESS NOTE: ${emptyFieldCount}/${totalFields} clinical sections are incomplete. Consider if missing information is clinically significant.`;
      }
    }

    return `Patient: ${patient.name} (DOB: ${patient.dob}, File: ${patient.fileNumber})

Background: ${extractedData.background}

Investigations: ${extractedData.investigations}

Medications: ${extractedData.medications}${completenessNote}`;
  }

  private generateBatchId(input: BatchAIReviewInput): string {
    return `batch-${input.appointmentDate}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getBatchConfiguration(): BatchConfiguration {
    return {
      maxRetries: this.config.retryAttempts,
      timeoutMs: this.config.timeoutMs,
      parallelProcessing: this.config.parallelProcessing,
      cacheEnabled: this.config.enableCaching,
      diagnosticsEnabled: this.config.enableAdvancedDiagnostics,
      checkpointInterval: this.config.checkpointInterval,
      errorRecoveryStrategy: 'conservative'
    };
  }

  private createEmptyMetrics(): any {
    return {
      sessionId: this.currentBatchId || '',
      batchStartTime: Date.now(),
      patientActivationTimes: [],
      dataExtractionTimes: [],
      aiReviewTimes: [],
      contentScriptResponseTimes: [],
      totalProcessingTime: 0,
      retryCount: new Map(),
      errorFrequency: new Map(),
      memoryUsageHistory: [],
      operationTimings: []
    };
  }

  private async finalizeProcessing(): Promise<void> {
    this.isProcessing = false;
    this.abortController = null;
    this.currentBatchId = null;

    // Apply cache invalidation rules
    if (this.config.enableCaching) {
      await this.cacheManager.applyInvalidationRules();
    }

    this.log('🏁 Batch processing finalized');
  }

  // ============================================================================
  // Configuration Management
  // ============================================================================

  private getDefaultConfig(): OrchestrationConfig {
    return {
      enableCheckpoints: true,
      checkpointInterval: 5, // Every 5 patients
      enableCaching: true,
      enableMetrics: true,
      enableAdvancedDiagnostics: false,
      parallelProcessing: true, // Enable parallel processing for improved performance
      maxConcurrentOperations: 3, // Process up to 3 AI reviews concurrently
      timeoutMs: 300000, // 5 minutes
      retryAttempts: 3
    };
  }

  public updateConfig(config: Partial<OrchestrationConfig>): void {
    Object.assign(this.config, config);
    
    // Update utility configurations
    this.dynamicWait.setDebugMode(config.enableAdvancedDiagnostics || false);
    this.dataValidation.setDebugMode(config.enableAdvancedDiagnostics || false);
    this.errorRecovery.setDebugMode(config.enableAdvancedDiagnostics || false);
    this.cacheManager.setDebugMode(config.enableAdvancedDiagnostics || false);
    this.checkpointManager.setDebugMode(config.enableAdvancedDiagnostics || false);
    this.metricsCollector.setDebugMode(config.enableAdvancedDiagnostics || false);
  }

  public getConfig(): OrchestrationConfig {
    return { ...this.config };
  }

  /**
   * Validate that we're in the correct appointment book state before processing each patient
   */
  private async validateAppointmentBookState(expectedPatient: PatientAppointment, patientIndex: number): Promise<void> {
    const tabId = await this.getCurrentTabId();
    
    this.log(`🔍 Validating appointment book state for patient ${patientIndex}: ${expectedPatient.name}`);
    
    try {
      // Get current patient list from the appointment book
      const currentPatientsResponse = await this.sendMessageWithTimeout(tabId, {
        type: 'EXECUTE_ACTION',
        action: 'extract-calendar-patients',
        data: {}
      }, 10000);
      
      if (!currentPatientsResponse?.success || !currentPatientsResponse?.data?.patients) {
        this.log(`⚠️ WARNING: Could not validate current patient list`);
        return;
      }
      
      const currentPatients = currentPatientsResponse.data.patients;
      this.log(`🔍 Current appointment book has ${currentPatients.length} patients`);
      
      // Log all current patients for debugging
      this.log(`🔍 Current patient list:`, currentPatients.map((p: any, index: number) => ({
        index,
        name: p.name,
        fileNumber: p.fileNumber,
        dob: p.dob
      })));
      
      // Check if our expected patient is in the current list at the expected position
      if (patientIndex < currentPatients.length) {
        const currentPatientAtIndex = currentPatients[patientIndex];
        
        this.log(`🔍 Expected patient at index ${patientIndex}:`, {
          name: expectedPatient.name,
          fileNumber: expectedPatient.fileNumber,
          dob: expectedPatient.dob
        });
        
        this.log(`🔍 Actual patient at index ${patientIndex}:`, {
          name: currentPatientAtIndex.name,
          fileNumber: currentPatientAtIndex.fileNumber,
          dob: currentPatientAtIndex.dob
        });
        
        // Check if it's the same patient (by file number which should be unique)
        if (currentPatientAtIndex.fileNumber !== expectedPatient.fileNumber) {
          this.log(`🚨 CRITICAL ERROR: Patient mismatch detected!`);
          this.log(`🚨 Expected: ${expectedPatient.name} (${expectedPatient.fileNumber})`);
          this.log(`🚨 Found: ${currentPatientAtIndex.name} (${currentPatientAtIndex.fileNumber})`);
          throw new Error(`Patient list state corrupted. Expected ${expectedPatient.name} but found ${currentPatientAtIndex.name} at index ${patientIndex}`);
        }
        
        this.log(`✅ Patient validation successful: ${expectedPatient.name} is at correct position ${patientIndex}`);
      } else {
        this.log(`🚨 CRITICAL ERROR: Patient index ${patientIndex} is out of bounds (current list has ${currentPatients.length} patients)`);
        throw new Error(`Patient index ${patientIndex} is out of bounds for current appointment book`);
      }
      
    } catch (error) {
      this.log(`❌ Patient validation failed:`, error);
      throw new Error(`Patient validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private log(...args: any[]): void {
    console.log('[Enhanced BatchAIReviewOrchestrator]', ...args);
  }

  // ============================================================================
  // Public API for Advanced Features
  // ============================================================================

  /**
   * Get available checkpoints for management
   */
  public async getAvailableCheckpoints(): Promise<any[]> {
    return this.checkpointManager.listCheckpoints();
  }

  /**
   * Delete a specific checkpoint
   */
  public async deleteCheckpoint(checkpointId: string): Promise<void> {
    return this.checkpointManager.deleteCheckpoint(checkpointId);
  }

  /**
   * Export comprehensive metrics
   */
  public async exportMetrics(): Promise<string> {
    if (!this.config.enableMetrics) {
      throw new Error('Metrics collection is disabled');
    }
    
    const report = this.metricsCollector.generateReport();
    return this.metricsCollector.exportMetrics(report);
  }

  /**
   * Clear all caches
   */
  public async clearCaches(): Promise<void> {
    return this.cacheManager.clear();
  }

  /**
   * Get detailed processing statistics
   */
  public getDetailedStats(): any {
    return {
      processing: this.getProcessingStats(),
      cache: this.config.enableCaching ? this.cacheManager.getCacheInfo() : null,
      errors: this.errorRecovery.getFailureStats(),
      metrics: this.config.enableMetrics ? this.metricsCollector.getMetrics() : null
    };
  }
}