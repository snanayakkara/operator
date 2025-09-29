/**
 * Checkpoint Manager
 * 
 * Comprehensive checkpoint and resume system for batch processing operations.
 * Provides state persistence, integrity validation, and intelligent resume
 * capabilities with configuration change handling.
 */

import type {
  BatchCheckpoint,
  ResumeData,
  EnvironmentState,
  BatchConfiguration,
  PerformanceMetrics,
  PatientRetryInfo,
  FailedAttempt,
  ValidationResult
} from '@/types/BatchProcessingTypes';

import type {
  PatientReviewResult,
  PatientAppointment as _PatientAppointment,
  BatchAIReviewInput
} from '@/types/medical.types';

export interface CheckpointConfig {
  autoSaveInterval: number; // Save checkpoint every N patients
  maxCheckpoints: number;   // Maximum number of checkpoints to keep
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  integrityChecking: boolean;
  backupEnabled: boolean;
}

export interface ResumeOptions {
  skipFailedPatients: boolean;
  retryFailedPatients: boolean;
  validateEnvironment: boolean;
  allowConfigChanges: boolean;
  resumeFromLastSuccessful: boolean;
}

export class CheckpointManager {
  private static instance: CheckpointManager;
  private config: CheckpointConfig;
  private storagePrefix = 'batch_checkpoint_';
  private backupPrefix = 'backup_checkpoint_';
  private debugMode = false;

  private constructor() {
    this.config = this.getDefaultConfig();
  }

  public static getInstance(): CheckpointManager {
    if (!CheckpointManager.instance) {
      CheckpointManager.instance = new CheckpointManager();
    }
    return CheckpointManager.instance;
  }

  /**
   * Save a checkpoint for the current batch processing state
   */
  public async saveCheckpoint(
    batchId: string,
    input: BatchAIReviewInput,
    completedPatients: PatientReviewResult[],
    currentPatientIndex: number,
    failedAttempts: FailedAttempt[],
    configuration: BatchConfiguration,
    performanceMetrics: PerformanceMetrics,
    environmentState: EnvironmentState
  ): Promise<string> {
    const checkpointId = this.generateCheckpointId(batchId);
    const timestamp = Date.now();

    this.log(`💾 Saving checkpoint: ${checkpointId}`);

    // Create resume data
    const resumeData: ResumeData = {
      lastSuccessfulOperation: this.getLastSuccessfulOperation(completedPatients),
      skippedPatients: this.getSkippedPatients(completedPatients),
      retryQueue: this.buildRetryQueue(failedAttempts),
      environmentState
    };

    // Create checkpoint object
    const checkpoint: BatchCheckpoint = {
      id: checkpointId,
      batchId,
      timestamp,
      version: '1.0.0',
      totalPatients: input.selectedPatients.length,
      completedPatients,
      currentPatientIndex,
      failedAttempts,
      configuration,
      performanceMetrics,
      resumeData,
      integrityHash: ''
    };

    // Calculate integrity hash
    checkpoint.integrityHash = await this.calculateIntegrityHash(checkpoint);

    try {
      // Compress if enabled
      const serializedData = this.config.compressionEnabled
        ? await this.compressData(checkpoint)
        : JSON.stringify(checkpoint);

      // Encrypt if enabled
      const finalData = this.config.encryptionEnabled
        ? await this.encryptData(serializedData)
        : serializedData;

      // Save to storage
      const storageKey = this.storagePrefix + checkpointId;
      await this.saveToStorage(storageKey, finalData);

      // Create backup if enabled
      if (this.config.backupEnabled) {
        const backupKey = this.backupPrefix + checkpointId;
        await this.saveToStorage(backupKey, finalData);
      }

      this.log(`✅ Checkpoint saved successfully: ${checkpointId}`);

      // Cleanup old checkpoints
      await this.cleanupOldCheckpoints(batchId);

      return checkpointId;

    } catch (error) {
      this.log(`❌ Failed to save checkpoint:`, error);
      throw new Error(`Checkpoint save failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Load a checkpoint and validate its integrity
   */
  public async loadCheckpoint(checkpointId: string): Promise<BatchCheckpoint> {
    this.log(`📂 Loading checkpoint: ${checkpointId}`);

    try {
      // Try to load from primary storage
      let data = await this.loadFromStorage(this.storagePrefix + checkpointId);
      
      // If primary fails and backup is enabled, try backup
      if (!data && this.config.backupEnabled) {
        this.log(`⚠️ Primary checkpoint not found, trying backup`);
        data = await this.loadFromStorage(this.backupPrefix + checkpointId);
      }

      if (!data) {
        throw new Error(`Checkpoint not found: ${checkpointId}`);
      }

      // Decrypt if enabled
      const decryptedData = this.config.encryptionEnabled
        ? await this.decryptData(data)
        : data;

      // Decompress if enabled
      const checkpoint: BatchCheckpoint = this.config.compressionEnabled
        ? await this.decompressData(decryptedData)
        : JSON.parse(decryptedData);

      // Validate integrity if enabled
      if (this.config.integrityChecking) {
        const isValid = await this.validateIntegrity(checkpoint);
        if (!isValid) {
          throw new Error('Checkpoint integrity validation failed');
        }
      }

      // Validate checkpoint structure
      const validation = this.validateCheckpointStructure(checkpoint);
      if (!validation.isValid) {
        throw new Error(`Invalid checkpoint structure: ${validation.errors.join(', ')}`);
      }

      this.log(`✅ Checkpoint loaded successfully: ${checkpointId}`);
      return checkpoint;

    } catch (error) {
      this.log(`❌ Failed to load checkpoint:`, error);
      throw new Error(`Checkpoint load failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Resume batch processing from a checkpoint
   */
  public async resumeFromCheckpoint(
    checkpointId: string,
    newConfiguration?: Partial<BatchConfiguration>,
    options: Partial<ResumeOptions> = {}
  ): Promise<{
    checkpoint: BatchCheckpoint;
    resumeStrategy: ResumeStrategy;
    warnings: string[];
  }> {
    this.log(`🔄 Resuming from checkpoint: ${checkpointId}`);

    const checkpoint = await this.loadCheckpoint(checkpointId);
    const resumeOptions: ResumeOptions = {
      skipFailedPatients: false,
      retryFailedPatients: true,
      validateEnvironment: true,
      allowConfigChanges: true,
      resumeFromLastSuccessful: true,
      ...options
    };

    const warnings: string[] = [];
    
    // Validate environment if requested
    if (resumeOptions.validateEnvironment) {
      const envValidation = await this.validateEnvironment(checkpoint.resumeData.environmentState);
      if (!envValidation.isValid) {
        warnings.push(`Environment validation warnings: ${envValidation.warnings.join(', ')}`);
        if (envValidation.errors.length > 0) {
          throw new Error(`Environment validation failed: ${envValidation.errors.join(', ')}`);
        }
      }
    }

    // Handle configuration changes
    if (newConfiguration) {
      if (!resumeOptions.allowConfigChanges) {
        throw new Error('Configuration changes not allowed during resume');
      }
      
      const configDiff = this.compareConfigurations(checkpoint.configuration, newConfiguration);
      if (configDiff.hasSignificantChanges) {
        warnings.push(`Significant configuration changes detected: ${configDiff.changes.join(', ')}`);
      }
      
      // Merge configurations
      checkpoint.configuration = { ...checkpoint.configuration, ...newConfiguration };
    }

    // Determine resume strategy
    const resumeStrategy = this.determineResumeStrategy(checkpoint, resumeOptions);

    // Update checkpoint with resume information
    checkpoint.resumeData.lastSuccessfulOperation = `resumed_from_checkpoint_${Date.now()}`;

    this.log(`✅ Resume strategy determined:`, resumeStrategy);
    
    return {
      checkpoint,
      resumeStrategy,
      warnings
    };
  }

  /**
   * List available checkpoints for a batch
   */
  public async listCheckpoints(batchId?: string): Promise<CheckpointInfo[]> {
    try {
      const storage = chrome.storage.local;
      const allItems = await storage.get(null);
      const checkpoints: CheckpointInfo[] = [];

      for (const [key, value] of Object.entries(allItems)) {
        if (key.startsWith(this.storagePrefix)) {
          try {
            // Extract basic info without full load
            const info = await this.extractCheckpointInfo(key, value);
            if (!batchId || info.batchId === batchId) {
              checkpoints.push(info);
            }
          } catch (error) {
            this.log(`⚠️ Error reading checkpoint ${key}:`, error);
          }
        }
      }

      // Sort by timestamp, newest first
      checkpoints.sort((a, b) => b.timestamp - a.timestamp);

      return checkpoints;

    } catch (error) {
      this.log(`❌ Failed to list checkpoints:`, error);
      return [];
    }
  }

  /**
   * Delete a specific checkpoint
   */
  public async deleteCheckpoint(checkpointId: string): Promise<void> {
    try {
      const storage = chrome.storage.local;
      const keys = [
        this.storagePrefix + checkpointId,
        this.backupPrefix + checkpointId
      ];

      await storage.remove(keys);
      this.log(`🗑️ Checkpoint deleted: ${checkpointId}`);

    } catch (error) {
      this.log(`❌ Failed to delete checkpoint:`, error);
      throw new Error(`Checkpoint deletion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clean up old checkpoints based on configuration
   */
  public async cleanupOldCheckpoints(batchId?: string): Promise<number> {
    try {
      const checkpoints = await this.listCheckpoints(batchId);
      
      if (checkpoints.length <= this.config.maxCheckpoints) {
        return 0;
      }

      // Keep the most recent checkpoints, delete the rest
      const toDelete = checkpoints.slice(this.config.maxCheckpoints);
      let deletedCount = 0;

      for (const checkpoint of toDelete) {
        try {
          await this.deleteCheckpoint(checkpoint.id);
          deletedCount++;
        } catch (error) {
          this.log(`⚠️ Failed to delete old checkpoint ${checkpoint.id}:`, error);
        }
      }

      this.log(`🧹 Cleaned up ${deletedCount} old checkpoints`);
      return deletedCount;

    } catch (error) {
      this.log(`❌ Cleanup failed:`, error);
      return 0;
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private generateCheckpointId(batchId: string): string {
    return `${batchId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async calculateIntegrityHash(checkpoint: BatchCheckpoint): Promise<string> {
    // Create a copy without the hash field for calculation
    const dataToHash = { ...checkpoint };
    delete (dataToHash as any).integrityHash;
    
    const dataString = JSON.stringify(dataToHash);
    const encoder = new TextEncoder();
    const data = encoder.encode(dataString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async validateIntegrity(checkpoint: BatchCheckpoint): Promise<boolean> {
    const expectedHash = checkpoint.integrityHash;
    const actualHash = await this.calculateIntegrityHash(checkpoint);
    return expectedHash === actualHash;
  }

  private validateCheckpointStructure(checkpoint: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    const requiredFields = ['id', 'batchId', 'timestamp', 'version', 'totalPatients', 'completedPatients', 'currentPatientIndex'];
    for (const field of requiredFields) {
      if (checkpoint[field] === undefined || checkpoint[field] === null) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Type validations
    if (typeof checkpoint.currentPatientIndex !== 'number') {
      errors.push('currentPatientIndex must be a number');
    }

    if (!Array.isArray(checkpoint.completedPatients)) {
      errors.push('completedPatients must be an array');
    }

    if (checkpoint.currentPatientIndex < 0 || checkpoint.currentPatientIndex > checkpoint.totalPatients) {
      warnings.push('currentPatientIndex seems out of bounds');
    }

    // Version compatibility
    if (checkpoint.version !== '1.0.0') {
      warnings.push(`Checkpoint version ${checkpoint.version} may not be fully compatible`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? 1.0 : 0.0
    };
  }

  private async validateEnvironment(environmentState: EnvironmentState): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if tab still exists
      if (environmentState.tabId) {
        try {
          await chrome.tabs.get(environmentState.tabId);
        } catch {
          warnings.push('Original tab no longer exists');
        }
      }

      // Check if URL is still accessible
      if (environmentState.currentUrl) {
        // Basic URL validation
        try {
          new URL(environmentState.currentUrl);
        } catch {
          warnings.push('Current URL appears invalid');
        }
      }

      // Check content script version compatibility
      if (environmentState.contentScriptVersion) {
        // This would need to be compared with current version
        warnings.push('Content script version compatibility not verified');
      }

      // Check if environment is too old
      const timeSinceLastCheck = Date.now() - environmentState.lastHealthCheck;
      if (timeSinceLastCheck > 3600000) { // 1 hour
        warnings.push('Environment state is quite old (>1 hour)');
      }

    } catch (error) {
      errors.push(`Environment validation error: ${error}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? 1.0 : 0.0
    };
  }

  private compareConfigurations(
    original: BatchConfiguration,
    updated: Partial<BatchConfiguration>
  ): { hasSignificantChanges: boolean; changes: string[] } {
    const changes: string[] = [];
    const significantFields = ['maxRetries', 'timeoutMs', 'errorRecoveryStrategy'];

    for (const [key, newValue] of Object.entries(updated)) {
      const originalValue = original[key as keyof BatchConfiguration];
      if (originalValue !== newValue) {
        changes.push(`${key}: ${originalValue} → ${newValue}`);
      }
    }

    const hasSignificantChanges = changes.some(change => 
      significantFields.some(field => change.startsWith(field))
    );

    return { hasSignificantChanges, changes };
  }

  private determineResumeStrategy(
    checkpoint: BatchCheckpoint,
    options: ResumeOptions
  ): ResumeStrategy {
    const strategy: ResumeStrategy = {
      startIndex: checkpoint.currentPatientIndex,
      skipPatients: [],
      retryPatients: [],
      forceReprocessPatients: [],
      resumeMode: 'continue'
    };

    // Determine starting point
    if (options.resumeFromLastSuccessful) {
      const lastSuccessfulIndex = this.findLastSuccessfulPatientIndex(checkpoint.completedPatients);
      strategy.startIndex = Math.max(lastSuccessfulIndex + 1, checkpoint.currentPatientIndex);
    }

    // Handle failed patients
    if (options.skipFailedPatients) {
      strategy.skipPatients = checkpoint.failedAttempts.map(f => f.patientIndex);
    } else if (options.retryFailedPatients) {
      strategy.retryPatients = checkpoint.failedAttempts.map(f => f.patientIndex);
    }

    // Determine resume mode
    if (strategy.retryPatients.length > 0) {
      strategy.resumeMode = 'retry_failed';
    } else if (strategy.skipPatients.length > 0) {
      strategy.resumeMode = 'skip_failed';
    } else {
      strategy.resumeMode = 'continue';
    }

    return strategy;
  }

  private getLastSuccessfulOperation(completedPatients: PatientReviewResult[]): string {
    const successful = completedPatients.filter(p => p.success);
    if (successful.length === 0) {
      return 'batch_start';
    }
    
    const lastPatient = successful[successful.length - 1];
    return `patient_completed_${lastPatient.patient.fileNumber}`;
  }

  private getSkippedPatients(completedPatients: PatientReviewResult[]): number[] {
    // Find gaps in patient processing (skipped indices)
    const processedIndices = new Set(completedPatients.map((_, index) => index));
    const skipped: number[] = [];
    
    for (let i = 0; i < completedPatients.length; i++) {
      if (!processedIndices.has(i)) {
        skipped.push(i);
      }
    }
    
    return skipped;
  }

  private buildRetryQueue(failedAttempts: FailedAttempt[]): PatientRetryInfo[] {
    const retryQueue: PatientRetryInfo[] = [];
    const patientFailures = new Map<number, FailedAttempt[]>();

    // Group failures by patient
    for (const failure of failedAttempts) {
      const existing = patientFailures.get(failure.patientIndex) || [];
      existing.push(failure);
      patientFailures.set(failure.patientIndex, existing);
    }

    // Create retry info for each failed patient
    for (const [patientIndex, failures] of patientFailures) {
      const lastFailure = failures[failures.length - 1];
      
      retryQueue.push({
        patientIndex,
        patient: lastFailure.patient,
        lastError: lastFailure.error,
        retryCount: failures.length,
        nextRetryTime: Date.now() + (failures.length * 60000) // Escalating delays
      });
    }

    return retryQueue;
  }

  private findLastSuccessfulPatientIndex(completedPatients: PatientReviewResult[]): number {
    for (let i = completedPatients.length - 1; i >= 0; i--) {
      if (completedPatients[i].success) {
        return i;
      }
    }
    return -1;
  }

  private async extractCheckpointInfo(key: string, data: any): Promise<CheckpointInfo> {
    // Extract minimal info without full deserialization
    try {
      const checkpointId = key.replace(this.storagePrefix, '');
      
      // Basic parsing to get metadata
      let parsedData;
      if (this.config.encryptionEnabled) {
        // For encrypted data, we can't easily extract info without decryption
        parsedData = { id: checkpointId, timestamp: 0, batchId: 'encrypted' };
      } else if (this.config.compressionEnabled) {
        // For compressed data, we need to decompress
        parsedData = await this.decompressData(data);
      } else {
        parsedData = JSON.parse(data);
      }

      return {
        id: parsedData.id || checkpointId,
        batchId: parsedData.batchId || 'unknown',
        timestamp: parsedData.timestamp || 0,
        totalPatients: parsedData.totalPatients || 0,
        completedPatients: parsedData.completedPatients?.length || 0,
        currentIndex: parsedData.currentPatientIndex || 0,
        hasFailures: (parsedData.failedAttempts?.length || 0) > 0
      };

    } catch (error) {
      throw new Error(`Failed to extract checkpoint info: ${error}`);
    }
  }

  // ============================================================================
  // Storage Operations
  // ============================================================================

  private async saveToStorage(key: string, data: string): Promise<void> {
    const storage = chrome.storage.local;
    await storage.set({ [key]: data });
  }

  private async loadFromStorage(key: string): Promise<string | null> {
    const storage = chrome.storage.local;
    const result = await storage.get(key);
    return result[key] || null;
  }

  // ============================================================================
  // Compression/Encryption (Basic implementations)
  // ============================================================================

  private async compressData(data: BatchCheckpoint): Promise<string> {
    // Basic compression using JSON stringify
    // In a real implementation, you might use LZ-string or similar
    const jsonString = JSON.stringify(data);
    
    // Simple compression by removing whitespace and using shorter keys
    const compressed = jsonString
      .replace(/\s+/g, '')
      .replace(/"completedPatients"/g, '"cp"')
      .replace(/"currentPatientIndex"/g, '"ci"')
      .replace(/"failedAttempts"/g, '"fa"')
      .replace(/"timestamp"/g, '"ts"');
    
    return compressed;
  }

  private async decompressData(data: string): Promise<BatchCheckpoint> {
    // Reverse the compression
    const decompressed = data
      .replace(/"cp"/g, '"completedPatients"')
      .replace(/"ci"/g, '"currentPatientIndex"')
      .replace(/"fa"/g, '"failedAttempts"')
      .replace(/"ts"/g, '"timestamp"');
    
    return JSON.parse(decompressed);
  }

  private async encryptData(data: string): Promise<string> {
    // Basic encryption (in production, use proper encryption)
    // This is just a simple base64 encoding for demonstration
    return btoa(data);
  }

  private async decryptData(data: string): Promise<string> {
    // Basic decryption
    return atob(data);
  }

  private getDefaultConfig(): CheckpointConfig {
    return {
      autoSaveInterval: 5, // Save every 5 patients
      maxCheckpoints: 10,
      compressionEnabled: true,
      encryptionEnabled: false, // Disabled for now due to complexity
      integrityChecking: true,
      backupEnabled: true
    };
  }

  private log(...args: any[]): void {
    if (this.debugMode) {
      console.log('[CheckpointManager]', ...args);
    }
  }

  // ============================================================================
  // Public Configuration Methods
  // ============================================================================

  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  public updateConfig(config: Partial<CheckpointConfig>): void {
    Object.assign(this.config, config);
  }

  public getConfig(): CheckpointConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Supporting Interfaces
// ============================================================================

interface CheckpointInfo {
  id: string;
  batchId: string;
  timestamp: number;
  totalPatients: number;
  completedPatients: number;
  currentIndex: number;
  hasFailures: boolean;
}

interface ResumeStrategy {
  startIndex: number;
  skipPatients: number[];
  retryPatients: number[];
  forceReprocessPatients: number[];
  resumeMode: 'continue' | 'retry_failed' | 'skip_failed' | 'restart';
}