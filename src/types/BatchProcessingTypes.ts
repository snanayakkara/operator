/**
 * Enhanced Type Definitions for Batch AI Review Processing
 * 
 * Comprehensive types for advanced batch processing capabilities including
 * checkpointing, performance monitoring, error recovery, and diagnostics.
 */

import type { PatientAppointment, PatientReviewResult } from './medical.types';

// ============================================================================
// Core Batch Processing Types
// ============================================================================

export interface BatchProcessingProgress {
  currentPatientIndex: number;
  totalPatients: number;
  currentPatient: PatientAppointment | null;
  phase: BatchProcessingPhase;
  subPhase?: string;
  completedPatients: PatientReviewResult[];
  errors: string[];
  percentComplete: number;
  estimatedTimeRemaining: number;
  currentOperationDetails: string;
  performanceIndicators: PerformanceIndicators;
}

export type BatchProcessingPhase = 
  | 'initializing'
  | 'navigating' 
  | 'waiting-for-load'
  | 'extracting' 
  | 'validating-data'
  | 'reviewing' 
  | 'saving-checkpoint'
  | 'completed' 
  | 'error'
  | 'cancelled'
  | 'resuming';

export interface PerformanceIndicators {
  averageTimePerPatient: number;
  successRate: number;
  currentSpeed: 'fast' | 'normal' | 'slow' | 'degraded';
  memoryUsage: number;
  errorRate: number;
}

// ============================================================================
// Enhanced Data Types
// ============================================================================

export interface ExtractedData {
  background: string;
  investigations: string;
  medications: string;
  extractionTimestamp: number;
  extractionAttempts: number;
  qualityScore: number;
  skipped?: boolean;
  skipReason?: string;
  dataCompleteness?: {
    hasRealData: boolean;
    emptyFieldCount: number;
    totalFields: number;
  };
}

export interface DataQualityReport {
  completenessScore: number; // 0-1, percentage of expected fields found
  contentRichness: number; // 0-1, based on word count and medical terms
  confidenceLevel: 'high' | 'medium' | 'low';
  missingFields: string[];
  extractionWarnings: string[];
  medicalTermsFound: number;
  estimatedWordCount: number;
}

export interface FieldExtractionResult {
  fieldName: string;
  content: string;
  extractionTime: number;
  success: boolean;
  errorMessage?: string;
  quality: DataQualityReport;
  fallbackUsed: boolean;
  selectorUsed: string;
}

// ============================================================================
// Checkpoint System Types
// ============================================================================

export interface BatchCheckpoint {
  id: string;
  batchId: string;
  timestamp: number;
  version: string; // For checkpoint format versioning
  totalPatients: number;
  completedPatients: PatientReviewResult[];
  currentPatientIndex: number;
  failedAttempts: FailedAttempt[];
  configuration: BatchConfiguration;
  performanceMetrics: PerformanceMetrics;
  resumeData: ResumeData;
  integrityHash: string; // For data validation
}

export interface ResumeData {
  lastSuccessfulOperation: string;
  skippedPatients: number[];
  retryQueue: PatientRetryInfo[];
  environmentState: EnvironmentState;
}

export interface PatientRetryInfo {
  patientIndex: number;
  patient: PatientAppointment;
  lastError: string;
  retryCount: number;
  nextRetryTime: number;
}

export interface EnvironmentState {
  tabId: number;
  currentUrl: string;
  contentScriptVersion: string;
  lastHealthCheck: number;
}

export interface BatchConfiguration {
  maxRetries: number;
  timeoutMs: number;
  parallelProcessing: boolean;
  cacheEnabled: boolean;
  diagnosticsEnabled: boolean;
  checkpointInterval: number; // Save checkpoint every N patients
  errorRecoveryStrategy: ErrorRecoveryStrategyType;
}

// ============================================================================
// Performance Monitoring Types
// ============================================================================

export interface PerformanceMetrics {
  sessionId: string;
  batchStartTime: number;
  patientActivationTimes: number[];
  dataExtractionTimes: number[];
  aiReviewTimes: number[];
  contentScriptResponseTimes: number[];
  totalProcessingTime: number;
  retryCount: Map<string, number>;
  errorFrequency: Map<string, number>;
  memoryUsageHistory: MemorySnapshot[];
  operationTimings: OperationTiming[];
}

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss?: number;
}

export interface OperationTiming {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  patientIndex?: number;
  metadata?: Record<string, any>;
}

// ============================================================================
// Error Recovery Types
// ============================================================================

export interface ErrorRecoveryStrategy {
  errorType: ErrorType;
  maxRetries: number;
  backoffStrategy: BackoffStrategy;
  fallbackAction?: () => Promise<any>;
  shouldRetry: (error: Error, attemptCount: number, context: OperationContext) => boolean;
  recoveryTimeout: number;
}

export type ErrorType = 
  | 'network_timeout'
  | 'dom_not_found'
  | 'content_script_unresponsive'
  | 'extraction_failed'
  | 'ai_processing_failed'
  | 'navigation_failed'
  | 'permission_denied'
  | 'memory_limit'
  | 'unknown';

export type BackoffStrategy = 'exponential' | 'linear' | 'fibonacci' | 'fixed';

export type ErrorRecoveryStrategyType = 'aggressive' | 'conservative' | 'custom';

export interface OperationContext {
  operation: string;
  patientIndex: number;
  patient: PatientAppointment;
  timestamp: number;
  environmentState: EnvironmentState;
  previousAttempts: number;
}

export interface FailedAttempt {
  patientIndex: number;
  patient: PatientAppointment;
  operation: string;
  error: string;
  timestamp: number;
  context: OperationContext;
  recoveryAttempted: boolean;
  diagnosticData?: DiagnosticData;
}

// ============================================================================
// Health Monitoring Types
// ============================================================================

export interface ContentScriptHealth {
  isResponsive: boolean;
  lastResponseTime: number;
  averageResponseTime: number;
  memoryUsage: number;
  pendingOperations: number;
  errorRate: number;
  capabilities: string[];
  lastHealthCheck: number;
  warningFlags: HealthWarning[];
}

export interface HealthWarning {
  type: 'high_memory' | 'slow_response' | 'high_error_rate' | 'missing_capability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

// ============================================================================
// Parallel Processing Types
// ============================================================================

export interface ParallelProcessingConfig {
  maxConcurrent: number;
  parallelizableOperations: ParallelOperation[];
  conflictResolution: ConflictResolution;
  rateLimitMs: number;
}

export interface ParallelOperation {
  name: string;
  canRunInParallel: boolean;
  dependencies: string[];
  maxConcurrency: number;
}

export type ConflictResolution = 'retry' | 'skip' | 'queue' | 'abort';

// ============================================================================
// Caching Types
// ============================================================================

export interface CacheEntry {
  key: string;
  patientId: string;
  extractedData: ExtractedData;
  timestamp: number;
  dataHash: string;
  quality: DataQualityReport;
  expiryTime: number;
  accessCount: number;
  lastAccessed: number;
  dataType?: string;
}

export interface CacheConfig {
  maxSizeBytes: number;
  maxEntries: number;
  defaultTtlMs: number;
  compressionEnabled: boolean;
  persistToDisk: boolean;
}

export interface CacheStats {
  hitCount: number;
  missCount: number;
  totalRequests: number;
  hitRate: number;
  totalSizeBytes: number;
  entryCount: number;
  oldestEntry: number;
  newestEntry: number;
}

// ============================================================================
// Diagnostic Types
// ============================================================================

export interface DiagnosticData {
  sessionId: string;
  timestamp: number;
  operation: string;
  errorDetails: string;
  stackTrace: string;
  screenshot?: string; // Base64 encoded
  domSnapshot?: string;
  networkLogs: NetworkLogEntry[];
  consoleMessages: ConsoleMessage[];
  performanceMarks: PerformanceMark[];
  memorySnapshot: MemorySnapshot;
  environmentInfo: EnvironmentInfo;
}

export interface NetworkLogEntry {
  timestamp: number;
  method: string;
  url: string;
  status: number;
  duration: number;
  requestSize: number;
  responseSize: number;
  error?: string;
}

export interface ConsoleMessage {
  timestamp: number;
  level: 'log' | 'warn' | 'error' | 'info' | 'debug';
  message: string;
  source: string;
}

export interface PerformanceMark {
  name: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface EnvironmentInfo {
  userAgent: string;
  platform: string;
  language: string;
  extensionVersion: string;
  contentScriptVersion: string;
  pageUrl: string;
  timestamp: number;
}

// ============================================================================
// Wait System Types
// ============================================================================

export interface WaitCondition {
  name: string;
  checker: () => Promise<boolean>;
  description: string;
  timeout: number;
  interval: number;
}

export interface WaitResult {
  success: boolean;
  timeElapsed: number;
  conditionMet: string | null;
  error?: string;
  intermediateChecks: WaitCheckResult[];
}

export interface WaitCheckResult {
  timestamp: number;
  conditionName: string;
  passed: boolean;
  details?: string;
}

// ============================================================================
// Message Types for Chrome Extension Communication
// ============================================================================

export interface BatchProcessingMessage {
  type: BatchMessageType;
  data?: any;
  timeout?: number;
  retryCount?: number;
}

export type BatchMessageType =
  | 'BATCH_START'
  | 'BATCH_PROGRESS'
  | 'BATCH_COMPLETE'
  | 'BATCH_ERROR'
  | 'BATCH_CANCELLED'
  | 'PATIENT_ACTIVATE'
  | 'PATIENT_EXTRACT_DATA'
  | 'HEALTH_CHECK'
  | 'SAVE_CHECKPOINT'
  | 'RESUME_BATCH'
  | 'CLEAR_CACHE'
  | 'GET_DIAGNOSTICS'
  | 'PING'
  | 'CHECK_XESTRO_BOXES'
  | 'CHECK_PATIENT_DATA'
  | 'CHECK_CLINICAL_SECTIONS'
  | 'CHECK_SECTION_PRESENT'
  | 'CHECK_SECTION_CONTENT'
  | 'CHECK_PATIENT_ROW_HIGHLIGHTED'
  | 'CHECK_PATIENT_RECORD_STATE'
  | 'GET_DOM_HASH'
  | 'VERIFY_PATIENT_IDENTITY'
  | 'EXTRACT_FIELD_DATA'
  | 'CHECK_PAGE_READY_FOR_EXTRACTION'
  | 'CHECK_CLINICAL_SECTIONS_EXIST'
  | 'EXTRACT_FIELD_OCR'
  | 'EXTRACT_FIELD_SEMANTIC';

// ============================================================================
// Utility Types
// ============================================================================

export interface TimingInfo {
  start: number;
  end: number;
  duration: number;
  operation: string;
}

export interface RetryInfo {
  attempt: number;
  maxAttempts: number;
  delay: number;
  strategy: BackoffStrategy;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number;
}
