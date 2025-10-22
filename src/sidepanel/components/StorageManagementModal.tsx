/**
 * StorageManagementModal Component
 *
 * Modal for managing persisted sessions with storage visualization and bulk operations.
 */

import React, { memo, useState, useMemo } from 'react';
import { X, HardDrive, Trash2, Clock, AlertCircle } from 'lucide-react';
import type { PatientSession } from '@/types/medical.types';
import type { StorageStats } from '@/types/persistence.types';
import { getAgentColors, getAgentCategoryIcon } from '@/utils/agentCategories';

interface StorageManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: PatientSession[];
  persistedSessionIds: Set<string>;
  storageStats: StorageStats | null;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onDeleteAllChecked: () => Promise<void>;
  onDeleteOldSessions: (daysOld: number) => Promise<void>;
}

export const StorageManagementModal: React.FC<StorageManagementModalProps> = memo(({
  isOpen,
  onClose,
  sessions,
  persistedSessionIds,
  storageStats,
  onDeleteSession,
  onDeleteAllChecked,
  onDeleteOldSessions
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter only persisted sessions
  const persistedSessions = useMemo(() => {
    return sessions.filter(s => persistedSessionIds.has(s.id));
  }, [sessions, persistedSessionIds]);

  // Sort by timestamp (newest first)
  const sortedSessions = useMemo(() => {
    return [...persistedSessions].sort((a, b) => b.timestamp - a.timestamp);
  }, [persistedSessions]);

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatAge = (timestamp: number): string => {
    const ageMs = Date.now() - timestamp;
    const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
    const ageHours = Math.floor(ageMs / (60 * 60 * 1000));

    if (ageDays > 0) {
      return `${ageDays}d ago`;
    } else if (ageHours > 0) {
      return `${ageHours}h ago`;
    } else {
      const ageMinutes = Math.floor(ageMs / (60 * 1000));
      return `${ageMinutes}m ago`;
    }
  };

  const estimateSessionSize = (session: PatientSession): number => {
    // Rough estimate: JSON size of session data
    const json = JSON.stringify({
      transcription: session.transcription,
      results: session.results,
      summary: session.summary,
      metadata: session
    });
    return new Blob([json]).size;
  };

  const handleDeleteSession = async (sessionId: string) => {
    setIsDeleting(true);
    try {
      await onDeleteSession(sessionId);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAllChecked = async () => {
    if (!confirm('Delete all checked sessions? This cannot be undone.')) {
      return;
    }
    setIsDeleting(true);
    try {
      await onDeleteAllChecked();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteOldSessions = async (days: number) => {
    if (!confirm(`Delete all sessions older than ${days} days? This cannot be undone.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await onDeleteOldSessions(days);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  // Calculate storage usage percentage
  const usagePercentage = storageStats ? storageStats.usedPercentage : 0;
  const isNearQuota = usagePercentage >= 80;
  const isCritical = usagePercentage >= 90;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Storage Management</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Storage stats */}
        {storageStats && (
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Storage Usage</span>
              <span className={`text-sm font-bold ${isCritical ? 'text-red-600' : isNearQuota ? 'text-amber-600' : 'text-emerald-600'}`}>
                {formatBytes(storageStats.usedBytes)} / {formatBytes(storageStats.totalBytes)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full transition-all duration-300 ${
                  isCritical ? 'bg-red-500' : isNearQuota ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, usagePercentage)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>{storageStats.sessionCount} sessions stored</span>
              <span>{usagePercentage.toFixed(1)}% used</span>
            </div>

            {/* Warning message */}
            {isNearQuota && (
              <div className={`mt-3 flex items-start gap-2 p-2 rounded-lg ${isCritical ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
                <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isCritical ? 'text-red-600' : 'text-amber-600'}`} />
                <p className={`text-xs ${isCritical ? 'text-red-700' : 'text-amber-700'}`}>
                  {isCritical
                    ? 'Storage critically full! Delete old sessions to free space.'
                    : 'Storage filling up. Consider deleting old sessions.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Bulk actions */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <p className="text-xs font-medium text-gray-700 mb-2">Bulk Actions</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleDeleteAllChecked}
              disabled={isDeleting}
              className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete All Checked
            </button>
            <button
              onClick={() => handleDeleteOldSessions(7)}
              disabled={isDeleting}
              className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete &gt;7 Days Old
            </button>
            <button
              onClick={() => handleDeleteOldSessions(3)}
              disabled={isDeleting}
              className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete &gt;3 Days Old
            </button>
          </div>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto p-4">
          {sortedSessions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <HardDrive className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No sessions stored locally</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedSessions.map(session => {
                const categoryColors = getAgentColors(session.agentType);
                const categoryIcon = getAgentCategoryIcon(session.agentType);
                const sessionSize = estimateSessionSize(session);
                const age = formatAge(session.timestamp);

                return (
                  <div
                    key={session.id}
                    className={`p-3 rounded-lg border-l-4 ${categoryColors.bg} ${categoryColors.border} hover:shadow-md transition-all`}
                    style={{ borderLeftColor: `var(--${categoryColors.indicator.replace('bg-', '')})` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm">{categoryIcon}</span>
                          <p className="font-medium text-sm text-gray-900 truncate">
                            {session.patient?.name || 'Unnamed patient'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span className={`px-1.5 py-0.5 rounded ${categoryColors.badgeBg} ${categoryColors.badgeText} font-medium`}>
                            {session.agentName || session.agentType}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {age}
                          </span>
                          <span className="font-mono">
                            {formatBytes(sessionSize)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        disabled={isDeleting}
                        className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
});

StorageManagementModal.displayName = 'StorageManagementModal';
