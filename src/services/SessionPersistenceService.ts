/**
 * SessionPersistenceService
 *
 * Manages session persistence with lifecycle-based cleanup:
 * - Unchecked sessions: expire after 7 days
 * - Checked sessions: expire after 24 hours
 * - Automatic cleanup on quota pressure
 */

import type { PatientSession } from '@/types/medical.types';
import type {
  PersistedSession,
  StorageMetadata,
  StorageStats,
  CleanupResult,
  ExpiryConfig,
  QuotaConfig,
  PersistenceErrorType
} from '@/types/persistence.types';
import {
  DEFAULT_EXPIRY_CONFIG,
  DEFAULT_QUOTA_CONFIG,
  PersistenceError
} from '@/types/persistence.types';

const STORAGE_VERSION = '1.0.0';
const STORAGE_KEYS = {
  SESSIONS: 'operator_sessions',
  CHECKED_IDS: 'operator_checked_ids',
  METADATA: 'operator_storage_metadata'
} as const;

export class SessionPersistenceService {
  private static instance: SessionPersistenceService | null = null;
  private expiryConfig: ExpiryConfig;
  private quotaConfig: QuotaConfig;
  private cleanupIntervalId: NodeJS.Timeout | null = null;

  private constructor(
    expiryConfig: ExpiryConfig = DEFAULT_EXPIRY_CONFIG,
    quotaConfig: QuotaConfig = DEFAULT_QUOTA_CONFIG
  ) {
    this.expiryConfig = expiryConfig;
    this.quotaConfig = quotaConfig;
  }

  public static getInstance(): SessionPersistenceService {
    if (!SessionPersistenceService.instance) {
      SessionPersistenceService.instance = new SessionPersistenceService();
    }
    return SessionPersistenceService.instance;
  }

  /**
   * Initialize persistence service and start background cleanup
   */
  public async initialize(): Promise<void> {
    console.log('📦 Initializing SessionPersistenceService');

    // Run initial cleanup
    await this.cleanupExpiredSessions();

    // Start periodic cleanup (every hour)
    this.startBackgroundCleanup();

    console.log('✅ SessionPersistenceService initialized');
  }

  /**
   * Save a session to storage
   */
  public async saveSession(session: PatientSession): Promise<void> {
    try {
      const sessions = await this.loadAllSessions();
      const existingIndex = sessions.findIndex(s => s.id === session.id);

      const persisted = this.compressSession(session);

      if (existingIndex >= 0) {
        // Update existing session
        sessions[existingIndex] = persisted;
        console.log('📝 Updated existing session in storage:', session.id);
      } else {
        // Add new session
        sessions.push(persisted);
        console.log('💾 Saved new session to storage:', session.id);
      }

      // Check quota before saving
      const estimatedSize = this.estimateTotalSize(sessions);
      if (estimatedSize > this.quotaConfig.maxBytes * this.quotaConfig.criticalThreshold) {
        console.warn('⚠️ Storage quota critical, pruning oldest sessions');
        await this.pruneOldestSessions(sessions, 5); // Remove 5 oldest
      }

      await this.saveSessions(sessions);
      await this.updateMetadata(sessions);
    } catch (error) {
      throw this.handleStorageError(error, 'SERIALIZATION_ERROR');
    }
  }

  /**
   * Load all sessions from storage
   */
  public async loadSessions(): Promise<PatientSession[]> {
    try {
      const persisted = await this.loadAllSessions();
      return persisted.map(p => this.decompressSession(p));
    } catch (error) {
      console.error('❌ Failed to load sessions:', error);
      return [];
    }
  }

  /**
   * Delete a specific session
   */
  public async deleteSession(sessionId: string): Promise<void> {
    try {
      const sessions = await this.loadAllSessions();
      const filtered = sessions.filter(s => s.id !== sessionId);

      if (filtered.length === sessions.length) {
        throw new PersistenceError(
          'DELETION_FAILED',
          `Session not found: ${sessionId}`
        );
      }

      await this.saveSessions(filtered);
      await this.updateMetadata(filtered);

      console.log('🗑️ Deleted session from storage:', sessionId);
    } catch (error) {
      throw this.handleStorageError(error, 'DELETION_FAILED');
    }
  }

  /**
   * Mark a session as complete (checked)
   */
  public async markSessionComplete(sessionId: string): Promise<void> {
    try {
      const sessions = await this.loadAllSessions();
      const session = sessions.find(s => s.id === sessionId);

      if (!session) {
        throw new PersistenceError(
          'DELETION_FAILED',
          `Session not found: ${sessionId}`
        );
      }

      session.markedCompleteAt = Date.now();

      await this.saveSessions(sessions);

      // Also update checked IDs list
      const checkedIds = await this.getCheckedSessionIds();
      checkedIds.add(sessionId);
      await chrome.storage.local.set({
        [STORAGE_KEYS.CHECKED_IDS]: Array.from(checkedIds)
      });

      console.log('✅ Marked session complete (24h deletion timer started):', sessionId);
    } catch (error) {
      throw this.handleStorageError(error, 'SERIALIZATION_ERROR');
    }
  }

  /**
   * Unmark a session as complete (unchecked)
   */
  public async unmarkSessionComplete(sessionId: string): Promise<void> {
    try {
      const sessions = await this.loadAllSessions();
      const session = sessions.find(s => s.id === sessionId);

      if (session) {
        delete session.markedCompleteAt;
        await this.saveSessions(sessions);
      }

      // Remove from checked IDs
      const checkedIds = await this.getCheckedSessionIds();
      checkedIds.delete(sessionId);
      await chrome.storage.local.set({
        [STORAGE_KEYS.CHECKED_IDS]: Array.from(checkedIds)
      });

      console.log('↩️ Unmarked session complete (7d expiry restored):', sessionId);
    } catch (error) {
      throw this.handleStorageError(error, 'SERIALIZATION_ERROR');
    }
  }

  /**
   * Clean up expired sessions
   */
  public async cleanupExpiredSessions(): Promise<CleanupResult> {
    const result: CleanupResult = {
      deletedCount: 0,
      freedBytes: 0,
      errors: []
    };

    try {
      const sessions = await this.loadAllSessions();
      const now = Date.now();

      const beforeSize = this.estimateTotalSize(sessions);

      const retained = sessions.filter(session => {
        const isExpired = this.isSessionExpired(session, now);
        if (isExpired) {
          result.deletedCount++;
          console.log('🗑️ Expired session:', session.id, {
            age: Math.round((now - session.persistedAt) / (24 * 60 * 60 * 1000)),
            markedComplete: !!session.markedCompleteAt
          });
        }
        return !isExpired;
      });

      if (result.deletedCount > 0) {
        await this.saveSessions(retained);
        await this.updateMetadata(retained);

        const afterSize = this.estimateTotalSize(retained);
        result.freedBytes = beforeSize - afterSize;

        console.log(`🧹 Cleanup complete: ${result.deletedCount} sessions deleted, ${this.formatBytes(result.freedBytes)} freed`);
      }
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
      console.error('❌ Cleanup failed:', error);
    }

    return result;
  }

  /**
   * Get storage statistics
   */
  public async getStorageStats(): Promise<StorageStats> {
    const sessions = await this.loadAllSessions();
    const metadata = await this.getMetadata();
    const now = Date.now();

    const expiringCount = sessions.filter(session => {
      const timeRemaining = this.getTimeUntilExpiry(session, now);
      return timeRemaining < 24 * 60 * 60 * 1000; // Expiring in <24h
    }).length;

    const oldestSession = sessions.reduce<PersistedSession | null>((oldest, s) => {
      if (!oldest || s.persistedAt < oldest.persistedAt) return s;
      return oldest;
    }, null);

    const oldestAge = oldestSession ? now - oldestSession.persistedAt : 0;

    return {
      usedBytes: metadata.storageUsedBytes,
      totalBytes: this.quotaConfig.maxBytes,
      usedPercentage: (metadata.storageUsedBytes / this.quotaConfig.maxBytes) * 100,
      sessionCount: sessions.length,
      oldestSessionAge: oldestAge,
      expiringCount
    };
  }

  /**
   * Get checked session IDs
   */
  public async getCheckedSessionIds(): Promise<Set<string>> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.CHECKED_IDS);
      const ids = result[STORAGE_KEYS.CHECKED_IDS] || [];
      return new Set(ids);
    } catch (error) {
      console.error('❌ Failed to load checked session IDs:', error);
      return new Set();
    }
  }

  /**
   * Delete all checked sessions (manual cleanup)
   */
  public async deleteAllCheckedSessions(): Promise<CleanupResult> {
    const result: CleanupResult = {
      deletedCount: 0,
      freedBytes: 0,
      errors: []
    };

    try {
      const sessions = await this.loadAllSessions();
      const beforeSize = this.estimateTotalSize(sessions);

      const retained = sessions.filter(session => {
        const isChecked = !!session.markedCompleteAt;
        if (isChecked) result.deletedCount++;
        return !isChecked;
      });

      await this.saveSessions(retained);
      await this.updateMetadata(retained);

      // Clear checked IDs
      await chrome.storage.local.set({ [STORAGE_KEYS.CHECKED_IDS]: [] });

      const afterSize = this.estimateTotalSize(retained);
      result.freedBytes = beforeSize - afterSize;

      console.log(`🗑️ Deleted all checked sessions: ${result.deletedCount} removed`);
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    return result;
  }

  /**
   * Delete sessions older than N days
   */
  public async deleteOldSessions(daysOld: number): Promise<CleanupResult> {
    const result: CleanupResult = {
      deletedCount: 0,
      freedBytes: 0,
      errors: []
    };

    try {
      const sessions = await this.loadAllSessions();
      const beforeSize = this.estimateTotalSize(sessions);
      const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

      const retained = sessions.filter(session => {
        const isOld = session.persistedAt < cutoff;
        if (isOld) result.deletedCount++;
        return !isOld;
      });

      await this.saveSessions(retained);
      await this.updateMetadata(retained);

      const afterSize = this.estimateTotalSize(retained);
      result.freedBytes = beforeSize - afterSize;

      console.log(`🗑️ Deleted sessions older than ${daysOld} days: ${result.deletedCount} removed`);
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    return result;
  }

  /**
   * Shutdown cleanup interval
   */
  public shutdown(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
      console.log('🛑 SessionPersistenceService cleanup stopped');
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async loadAllSessions(): Promise<PersistedSession[]> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.SESSIONS);
      return result[STORAGE_KEYS.SESSIONS] || [];
    } catch (error) {
      console.error('❌ Failed to load sessions from storage:', error);
      return [];
    }
  }

  private async saveSessions(sessions: PersistedSession[]): Promise<void> {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.SESSIONS]: sessions
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('QUOTA')) {
        throw new PersistenceError('QUOTA_EXCEEDED', 'Storage quota exceeded', error);
      }
      throw error;
    }
  }

  private async getMetadata(): Promise<StorageMetadata> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.METADATA);
      return result[STORAGE_KEYS.METADATA] || {
        totalSessions: 0,
        storageUsedBytes: 0,
        oldestSessionTimestamp: Date.now(),
        lastCleanupAt: Date.now(),
        version: STORAGE_VERSION
      };
    } catch (error) {
      console.error('❌ Failed to load metadata:', error);
      return {
        totalSessions: 0,
        storageUsedBytes: 0,
        oldestSessionTimestamp: Date.now(),
        lastCleanupAt: Date.now(),
        version: STORAGE_VERSION
      };
    }
  }

  private async updateMetadata(sessions: PersistedSession[]): Promise<void> {
    const oldestSession = sessions.reduce<PersistedSession | null>((oldest, s) => {
      if (!oldest || s.persistedAt < oldest.persistedAt) return s;
      return oldest;
    }, null);

    const metadata: StorageMetadata = {
      totalSessions: sessions.length,
      storageUsedBytes: this.estimateTotalSize(sessions),
      oldestSessionTimestamp: oldestSession?.persistedAt || Date.now(),
      lastCleanupAt: Date.now(),
      version: STORAGE_VERSION
    };

    await chrome.storage.local.set({
      [STORAGE_KEYS.METADATA]: metadata
    });
  }

  private compressSession(session: PatientSession): PersistedSession {
    const now = Date.now();

    return {
      id: session.id,
      patient: session.patient,
      transcription: session.transcription,
      results: session.results,
      summary: session.summary,
      taviStructuredSections: session.taviStructuredSections,
      educationData: session.educationData,
      preOpPlanData: session.preOpPlanData,
      reviewData: session.reviewData,
      agentType: session.agentType,
      agentName: session.agentName,
      timestamp: session.timestamp,
      status: session.status,
      processingTime: session.processingTime,
      modelUsed: session.modelUsed,
      completedTime: session.completedTime,
      quickActionField: session.quickActionField,
      persistedAt: now,
      lastAccessedAt: now,
      markedCompleteAt: session.completed ? now : undefined
      // Note: audioBlob intentionally excluded to save space
    };
  }

  private decompressSession(persisted: PersistedSession): PatientSession {
    return {
      id: persisted.id,
      patient: persisted.patient,
      transcription: persisted.transcription,
      results: persisted.results,
      summary: persisted.summary,
      taviStructuredSections: persisted.taviStructuredSections,
      educationData: persisted.educationData,
      preOpPlanData: persisted.preOpPlanData,
      reviewData: persisted.reviewData,
      agentType: persisted.agentType,
      agentName: persisted.agentName,
      timestamp: persisted.timestamp,
      status: persisted.status,
      processingTime: persisted.processingTime,
      modelUsed: persisted.modelUsed,
      completedTime: persisted.completedTime,
      quickActionField: persisted.quickActionField,
      completed: !!persisted.markedCompleteAt
      // audioBlob not restored (was not persisted)
    };
  }

  private isSessionExpired(session: PersistedSession, now: number): boolean {
    if (session.markedCompleteAt) {
      // Checked sessions expire after 24 hours
      const age = now - session.markedCompleteAt;
      return age > this.expiryConfig.checkedExpiryMs;
    } else {
      // Unchecked sessions expire after 7 days
      const age = now - session.persistedAt;
      return age > this.expiryConfig.uncheckedExpiryMs;
    }
  }

  private getTimeUntilExpiry(session: PersistedSession, now: number): number {
    if (session.markedCompleteAt) {
      const expiryTime = session.markedCompleteAt + this.expiryConfig.checkedExpiryMs;
      return Math.max(0, expiryTime - now);
    } else {
      const expiryTime = session.persistedAt + this.expiryConfig.uncheckedExpiryMs;
      return Math.max(0, expiryTime - now);
    }
  }

  private estimateTotalSize(sessions: PersistedSession[]): number {
    const json = JSON.stringify(sessions);
    return new Blob([json]).size;
  }

  private async pruneOldestSessions(
    sessions: PersistedSession[],
    count: number
  ): Promise<void> {
    // Sort by persistedAt (oldest first)
    const sorted = [...sessions].sort((a, b) => a.persistedAt - b.persistedAt);

    // Remove oldest N sessions
    const retained = sorted.slice(count);

    console.log(`✂️ Pruned ${count} oldest sessions to free space`);

    await this.saveSessions(retained);
    await this.updateMetadata(retained);
  }

  private startBackgroundCleanup(): void {
    // Run cleanup every hour
    this.cleanupIntervalId = setInterval(async () => {
      console.log('🧹 Running background cleanup...');
      await this.cleanupExpiredSessions();
    }, this.expiryConfig.cleanupIntervalMs);
  }

  private handleStorageError(error: any, type: PersistenceErrorType): PersistenceError {
    if (error instanceof PersistenceError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    return new PersistenceError(type, message, error);
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
