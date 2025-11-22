/**
 * Session Persistence Types
 *
 * Types for local session storage with lifecycle management.
 */

import type { PatientInfo, AgentType, SessionStatus, PreOpPlanReport, RightHeartCathReport } from './medical.types';

/**
 * Persisted session data structure
 * Optimized for storage (audio blob removed, JSON compressed)
 */
export interface PersistedSession {
  id: string;
  source?: 'live' | 'mobile' | 'paste';
  mobileJobId?: string;
  patient: PatientInfo;
  transcription: string;
  results: string;
  summary?: string;
  taviStructuredSections?: any;
  educationData?: any;
  preOpPlanData?: PreOpPlanReport['planData'];
  reviewData?: any;
  rhcReport?: RightHeartCathReport;
  agentType: AgentType;
  agentName: string;
  timestamp: number;
  status: SessionStatus;
  processingTime?: number;
  modelUsed?: string;
  audioDuration?: number; // Audio duration in seconds for ETA prediction
  completedTime?: number;
  quickActionField?: string;
  completed: boolean; // Processing completion status (not the same as markedCompleteAt)

  // Lifecycle metadata
  persistedAt: number; // When saved to storage
  lastAccessedAt: number; // Last time user viewed this session
  markedCompleteAt?: number; // When user checked the completion checkbox (triggers 24h expiry)
}

/**
 * Storage metadata for quota management
 */
export interface StorageMetadata {
  totalSessions: number;
  storageUsedBytes: number;
  oldestSessionTimestamp: number;
  lastCleanupAt: number;
  version: string; // Storage schema version for migrations
}

/**
 * Storage statistics for UI display
 */
export interface StorageStats {
  usedBytes: number;
  totalBytes: number;
  usedPercentage: number;
  sessionCount: number;
  oldestSessionAge: number; // milliseconds
  expiringCount: number; // Sessions expiring in <24h
}

/**
 * Session expiry configuration
 */
export interface ExpiryConfig {
  uncheckedExpiryMs: number; // 7 days in milliseconds
  checkedExpiryMs: number; // 24 hours in milliseconds
  cleanupIntervalMs: number; // 1 hour in milliseconds
}

/**
 * Default expiry configuration
 */
export const DEFAULT_EXPIRY_CONFIG: ExpiryConfig = {
  uncheckedExpiryMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  checkedExpiryMs: 24 * 60 * 60 * 1000, // 24 hours
  cleanupIntervalMs: 60 * 60 * 1000 // 1 hour
};

/**
 * Storage quota configuration
 */
export interface QuotaConfig {
  maxBytes: number; // Chrome storage limit (5MB default)
  warningThreshold: number; // Show warning at 80%
  criticalThreshold: number; // Force cleanup at 90%
}

/**
 * Default quota configuration
 */
export const DEFAULT_QUOTA_CONFIG: QuotaConfig = {
  maxBytes: 5 * 1024 * 1024, // 5MB (chrome.storage.local default)
  warningThreshold: 0.80, // 80%
  criticalThreshold: 0.90 // 90%
};

/**
 * Cleanup operation result
 */
export interface CleanupResult {
  deletedCount: number;
  freedBytes: number;
  errors: string[];
}

/**
 * Session persistence error types
 */
export type PersistenceErrorType =
  | 'QUOTA_EXCEEDED'
  | 'STORAGE_UNAVAILABLE'
  | 'SERIALIZATION_ERROR'
  | 'DELETION_FAILED'
  | 'CORRUPTION_DETECTED';

/**
 * Session persistence error
 */
export class PersistenceError extends Error {
  constructor(
    public type: PersistenceErrorType,
    message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'PersistenceError';
  }
}
