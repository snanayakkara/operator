/**
 * StorageManagementSection - Browser storage management for session persistence
 * 
 * Provides visibility and control over local storage usage:
 * - Display current storage usage with visual indicators
 * - Bulk deletion options for old sessions
 * - Storage optimization recommendations
 * - Clear storage history
 * - Server-side storage breakdown (recordings, corrections, etc.)
 */

import React, { useState, useEffect } from 'react';
import { HardDrive, Trash2, AlertTriangle, CheckCircle, Info, Mic, FileText, Database, Server } from 'lucide-react';
import { SessionPersistenceService } from '@/services/SessionPersistenceService';
import { OptimizationService, type ServerStorageStats } from '@/services/OptimizationService';
import type { StorageStats } from '@/types/persistence.types';

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const StorageManagementSection: React.FC = () => {
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [serverStats, setServerStats] = useState<ServerStorageStats | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const loadStorageStats = async () => {
    try {
      const persistenceService = SessionPersistenceService.getInstance();
      const stats = await persistenceService.getStorageStats();
      setStorageStats(stats);
    } catch (error) {
      console.error('Failed to load storage stats:', error);
    }
  };

  const loadServerStats = async () => {
    try {
      const optimizationService = OptimizationService.getInstance();
      const stats = await optimizationService.getServerStorageStats();
      setServerStats(stats);
    } catch (error) {
      console.error('Failed to load server storage stats:', error);
    }
  };

  useEffect(() => {
    loadStorageStats();
    loadServerStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(() => {
      loadStorageStats();
      loadServerStats();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDeleteOldSessions = async (daysOld: number) => {
    if (!confirm(`Delete all sessions older than ${daysOld} days? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const persistenceService = SessionPersistenceService.getInstance();
      const result = await persistenceService.deleteOldSessions(daysOld);
      
      setLastAction(`Deleted ${result.deletedCount} session${result.deletedCount !== 1 ? 's' : ''} older than ${daysOld} days (freed ${formatBytes(result.freedBytes)})`);
      await loadStorageStats();
    } catch (error) {
      console.error('Failed to delete old sessions:', error);
      setLastAction('Failed to delete sessions');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearAllStorage = async () => {
    if (!confirm('Clear ALL stored sessions? This will permanently delete all session history and cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const persistenceService = SessionPersistenceService.getInstance();
      
      // Delete all sessions by deleting those older than 0 days
      const result = await persistenceService.deleteOldSessions(0);
      
      setLastAction(`All sessions cleared from storage (${result.deletedCount} session${result.deletedCount !== 1 ? 's' : ''}, freed ${formatBytes(result.freedBytes)})`);
      await loadStorageStats();
    } catch (error) {
      console.error('Failed to clear storage:', error);
      setLastAction('Failed to clear storage');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearServerCategory = async (category: 'pendingAudio' | 'trainingAudio' | 'corrections' | 'jobs') => {
    const labels: Record<string, string> = {
      pendingAudio: 'pending transcriptions',
      trainingAudio: 'training audio',
      corrections: 'ASR corrections',
      jobs: 'background job data'
    };
    
    if (!confirm(`Clear all ${labels[category]}? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const optimizationService = OptimizationService.getInstance();
      const result = await optimizationService.clearStorageCategory(category);
      
      if (result) {
        setLastAction(`Cleared ${labels[category]} (${result.deletedCount} file${result.deletedCount !== 1 ? 's' : ''}, freed ${formatBytes(result.deletedBytes)})`);
        await loadServerStats();
      } else {
        setLastAction(`Failed to clear ${labels[category]}`);
      }
    } catch (error) {
      console.error('Failed to clear server storage:', error);
      setLastAction(`Failed to clear ${labels[category]}`);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!storageStats) {
    return (
      <div className="bg-surface-secondary border-2 border-line-primary rounded-xl p-6">
        <div className="flex items-center space-x-3">
          <HardDrive className="w-5 h-5 text-ink-secondary" />
          <span className="font-medium text-ink-primary">Storage Management</span>
        </div>
        <div className="mt-4 text-sm text-ink-secondary">Loading storage information...</div>
      </div>
    );
  }

  const usagePercentage = storageStats.usedPercentage;
  const isHighUsage = usagePercentage >= 80;
  const isCriticalUsage = usagePercentage >= 90;

  return (
    <div className="bg-surface-secondary border-2 border-line-primary rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <HardDrive className="w-5 h-5 text-blue-600" />
          <div>
            <div className="font-medium text-ink-primary">Storage Management</div>
            <div className="text-xs text-ink-secondary">Browser local storage for session history</div>
          </div>
        </div>
        {isCriticalUsage && (
          <AlertTriangle className="w-5 h-5 text-red-600" />
        )}
      </div>

      {/* Storage Usage Visualization */}
      <div className="space-y-3">
        {/* Usage Bar */}
        <div>
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-ink-secondary">Storage Used</span>
            <span className={`font-semibold ${
              isCriticalUsage ? 'text-red-600' :
              isHighUsage ? 'text-amber-600' :
              'text-emerald-600'
            }`}>
              {formatBytes(storageStats.usedBytes)} / {formatBytes(storageStats.totalBytes)}
            </span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isCriticalUsage ? 'bg-gradient-to-r from-red-500 to-red-600' :
                isHighUsage ? 'bg-gradient-to-r from-amber-500 to-amber-600' :
                'bg-gradient-to-r from-emerald-500 to-emerald-600'
              }`}
              style={{ width: `${Math.min(100, usagePercentage)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1 text-xs text-ink-secondary">
            <span>{storageStats.sessionCount} session{storageStats.sessionCount !== 1 ? 's' : ''} stored</span>
            <span>{usagePercentage.toFixed(1)}% used</span>
          </div>
        </div>

        {/* Status Message */}
        {isCriticalUsage ? (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-red-700">
              <div className="font-semibold mb-1">Critical: Storage Nearly Full</div>
              <div>Delete old sessions to free up space. New sessions may not be saved if storage is full.</div>
            </div>
          </div>
        ) : isHighUsage ? (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-700">
              <div className="font-semibold mb-1">High Storage Usage</div>
              <div>Consider deleting old sessions to optimize performance and free up space.</div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-700">
              <div className="font-semibold mb-1">Storage Healthy</div>
              <div>You have plenty of space available for session history.</div>
            </div>
          </div>
        )}

        {/* Last Action Feedback */}
        {lastAction && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-xs text-blue-700 font-medium">
              {lastAction}
            </div>
          </div>
        )}

        {/* Bulk Deletion Actions */}
        {storageStats.sessionCount > 0 && (
          <div className="space-y-2 pt-3 border-t border-line-primary">
            <div className="text-sm font-medium text-ink-primary mb-2">Quick Actions</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => handleDeleteOldSessions(7)}
                disabled={isDeleting}
                className="mono-button-secondary text-xs py-2 px-3 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete &gt;7 days old
              </button>
              <button
                onClick={() => handleDeleteOldSessions(30)}
                disabled={isDeleting}
                className="mono-button-secondary text-xs py-2 px-3 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete &gt;30 days old
              </button>
              <button
                onClick={() => handleDeleteOldSessions(90)}
                disabled={isDeleting}
                className="mono-button-secondary text-xs py-2 px-3 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete &gt;90 days old
              </button>
              <button
                onClick={handleClearAllStorage}
                disabled={isDeleting}
                className="text-xs py-2 px-3 flex items-center justify-center gap-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg border-2 border-red-200 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All Storage
              </button>
            </div>
          </div>
        )}

        {/* Server Storage Breakdown */}
        {serverStats && (
          <div className="pt-4 border-t border-line-primary">
            <div className="flex items-center gap-2 mb-3">
              <Server className="w-4 h-4 text-blue-600" />
              <div className="text-sm font-medium text-ink-primary">Server Storage</div>
              <span className="text-xs text-ink-secondary">({formatBytes(serverStats.total.bytes)} total)</span>
            </div>
            
            {/* Storage breakdown visualization */}
            <div className="space-y-2">
              {/* Pending Audio (recordings awaiting retry) */}
              {serverStats.pendingAudio.bytes > 0 && (
                <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2">
                    <Mic className="w-3.5 h-3.5 text-amber-600" />
                    <div>
                      <div className="text-xs font-medium text-amber-800">Pending Transcriptions</div>
                      <div className="text-[10px] text-amber-600">{serverStats.pendingAudio.fileCount} file{serverStats.pendingAudio.fileCount !== 1 ? 's' : ''} • {formatBytes(serverStats.pendingAudio.bytes)}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleClearServerCategory('pendingAudio')}
                    disabled={isDeleting}
                    className="text-[10px] px-2 py-1 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded border border-amber-300 disabled:opacity-50"
                  >
                    Clear
                  </button>
                </div>
              )}
              
              {/* Training Audio */}
              {serverStats.trainingAudio.bytes > 0 && (
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <Mic className="w-3.5 h-3.5 text-blue-600" />
                    <div>
                      <div className="text-xs font-medium text-blue-800">Training Audio</div>
                      <div className="text-[10px] text-blue-600">{serverStats.trainingAudio.fileCount} file{serverStats.trainingAudio.fileCount !== 1 ? 's' : ''} • {formatBytes(serverStats.trainingAudio.bytes)}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleClearServerCategory('trainingAudio')}
                    disabled={isDeleting}
                    className="text-[10px] px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded border border-blue-300 disabled:opacity-50"
                  >
                    Clear
                  </button>
                </div>
              )}
              
              {/* ASR Corrections */}
              {serverStats.corrections.bytes > 0 && (
                <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-purple-600" />
                    <div>
                      <div className="text-xs font-medium text-purple-800">ASR Corrections</div>
                      <div className="text-[10px] text-purple-600">{serverStats.corrections.fileCount} file{serverStats.corrections.fileCount !== 1 ? 's' : ''} • {formatBytes(serverStats.corrections.bytes)}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleClearServerCategory('corrections')}
                    disabled={isDeleting}
                    className="text-[10px] px-2 py-1 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded border border-purple-300 disabled:opacity-50"
                  >
                    Clear
                  </button>
                </div>
              )}
              
              {/* Background Jobs */}
              {serverStats.jobs.bytes > 0 && (
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-gray-600" />
                    <div>
                      <div className="text-xs font-medium text-gray-800">Background Jobs</div>
                      <div className="text-[10px] text-gray-600">{serverStats.jobs.fileCount} file{serverStats.jobs.fileCount !== 1 ? 's' : ''} • {formatBytes(serverStats.jobs.bytes)}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleClearServerCategory('jobs')}
                    disabled={isDeleting}
                    className="text-[10px] px-2 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded border border-gray-300 disabled:opacity-50"
                  >
                    Clear
                  </button>
                </div>
              )}
              
              {/* GEPA/Optimization data (read-only) */}
              {serverStats.gepa.bytes > 0 && (
                <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-emerald-600" />
                    <div>
                      <div className="text-xs font-medium text-emerald-800">Optimization Data</div>
                      <div className="text-[10px] text-emerald-600">{serverStats.gepa.fileCount} file{serverStats.gepa.fileCount !== 1 ? 's' : ''} • {formatBytes(serverStats.gepa.bytes)}</div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Empty state */}
              {serverStats.total.bytes === 0 && (
                <div className="text-xs text-ink-secondary text-center py-2">
                  No server-side data stored yet
                </div>
              )}
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="pt-3 border-t border-line-primary">
          <div className="text-xs text-ink-secondary space-y-1">
            <div className="font-medium text-ink-primary mb-1">About Session Storage</div>
            <div>• Sessions are stored locally in your browser</div>
            <div>• Unchecked sessions expire after 7 days</div>
            <div>• Checked sessions expire after 24 hours</div>
            <div>• Audio is excluded from storage to save space</div>
            <div>• Clearing storage does not affect current session</div>
          </div>
        </div>
      </div>
    </div>
  );
};
