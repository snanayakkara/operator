/**
 * LocalCorrectionsViewer - Display and manage stored ASR corrections from Chrome storage
 * 
 * Provides functionality to view, edit, and delete ASR corrections stored locally.
 * Works independently of server availability for local correction management.
 * 
 * Features:
 * - Display corrections in a table format with original/corrected text
 * - Edit individual corrections inline
 * - Delete corrections with confirmation
 * - Filter by agent type and date range
 * - Export corrections data
 * - Storage usage information
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Eye, EyeOff, Edit3, Trash2, Download, Calendar, User, Save, X } from 'lucide-react';
import { ASRCorrectionsLog } from '@/services/ASRCorrectionsLog';
import { logger } from '@/utils/Logger';
import type { ASRCorrectionsEntry, AgentType } from '@/types/optimization';

interface LocalCorrectionsViewerProps {
  onError: (error: Error) => void;
  onLoadingChange: (isLoading: boolean) => void;
}

export const LocalCorrectionsViewer: React.FC<LocalCorrectionsViewerProps> = ({
  onError,
  onLoadingChange
}) => {
  // Services
  const asrLog = useMemo(() => ASRCorrectionsLog.getInstance(), []);

  // State
  const [corrections, setCorrections] = useState<ASRCorrectionsEntry[]>([]);
  const [filteredCorrections, setFilteredCorrections] = useState<ASRCorrectionsEntry[]>([]);
  const [displayedCorrections, setDisplayedCorrections] = useState<ASRCorrectionsEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDetails, setShowDetails] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState('');

  // Filters
  const [selectedAgent, setSelectedAgent] = useState<AgentType | 'all'>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [isExpanded, setIsExpanded] = useState(false);

  // Progressive loading
  const [loadedChunks, setLoadedChunks] = useState(1);
  const CHUNK_SIZE = 50;

  // Load corrections on mount with debouncing to prevent blocking message handlers
  useEffect(() => {
    // Defer loading by 300ms to allow UI to render first
    const timeoutId = setTimeout(() => {
      loadCorrections();
    }, 300);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply filters when corrections or filters change
  // Use requestIdleCallback to defer expensive filter operations
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const idleId = requestIdleCallback(() => {
        applyFilters();
      });
      return () => cancelIdleCallback(idleId);
    } else {
      // Fallback for browsers without requestIdleCallback
      const timeoutId = setTimeout(() => {
        applyFilters();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corrections, selectedAgent, dateRange]);

  // Progressive display of filtered results
  useEffect(() => {
    const chunkEnd = loadedChunks * CHUNK_SIZE;
    setDisplayedCorrections(filteredCorrections.slice(0, chunkEnd));
  }, [filteredCorrections, loadedChunks, CHUNK_SIZE]);

  const loadCorrections = useCallback(async () => {
    try {
      setIsLoading(true);
      onLoadingChange(true);

      // Load only first chunk initially (50 items) for faster UI response
      const initialCorrections = await asrLog.getCorrections({ limit: CHUNK_SIZE });
      setCorrections(initialCorrections);
      setLoadedChunks(1);

      logger.info('Local corrections (initial chunk) loaded', {
        component: 'LocalCorrectionsViewer',
        count: initialCorrections.length
      });

      // Load remaining data in background after a delay
      setTimeout(async () => {
        try {
          const allCorrections = await asrLog.getCorrections({ limit: 500 });
          setCorrections(allCorrections);
          setLoadedChunks(1); // Reset chunks for full dataset

          logger.info('Local corrections (full) loaded', {
            component: 'LocalCorrectionsViewer',
            count: allCorrections.length
          });
        } catch (bgError) {
          logger.warn('Failed to load full corrections in background', {
            component: 'LocalCorrectionsViewer',
            error: bgError instanceof Error ? bgError.message : String(bgError)
          });
        }
      }, 1000);

    } catch (error) {
      logger.error('Failed to load local corrections', error instanceof Error ? error : new Error(String(error)), {
        component: 'LocalCorrectionsViewer'
      });
      onError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsLoading(false);
      onLoadingChange(false);
    }
  }, [asrLog, onError, onLoadingChange, CHUNK_SIZE]);

  const applyFilters = useCallback(() => {
    let filtered = [...corrections];

    // Agent filter
    if (selectedAgent !== 'all') {
      filtered = filtered.filter(correction => correction.agentType === selectedAgent);
    }

    // Date filter
    const now = Date.now();
    switch (dateRange) {
      case 'today': {
        const todayStart = new Date().setHours(0, 0, 0, 0);
        filtered = filtered.filter(correction => correction.timestamp >= todayStart);
        break;
      }
      case 'week': {
        const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(correction => correction.timestamp >= weekAgo);
        break;
      }
      case 'month': {
        const monthAgo = now - (30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(correction => correction.timestamp >= monthAgo);
        break;
      }
    }

    setFilteredCorrections(filtered);
  }, [corrections, selectedAgent, dateRange]);

  const toggleDetails = useCallback((id: string) => {
    setShowDetails(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const startEditing = useCallback((correction: ASRCorrectionsEntry) => {
    setEditingId(correction.id);
    setEditedText(correction.correctedText);
  }, []);

  const saveEdit = useCallback(async (id: string) => {
    try {
      if (editedText.trim() === '') {
        onError(new Error('Corrected text cannot be empty'));
        return;
      }

      const correctionIndex = corrections.findIndex(c => c.id === id);
      if (correctionIndex === -1) return;

      const updatedCorrection: ASRCorrectionsEntry = {
        ...corrections[correctionIndex],
        correctedText: editedText.trim(),
        timestamp: Date.now() // Update timestamp to reflect the edit
      };

      // Persist to Chrome storage
      await asrLog.updateCorrection(id, {
        correctedText: editedText.trim(),
        timestamp: Date.now()
      });

      // Update local state
      const updatedCorrections = [...corrections];
      updatedCorrections[correctionIndex] = updatedCorrection;
      setCorrections(updatedCorrections);

      logger.info('Correction updated and persisted', {
        component: 'LocalCorrectionsViewer',
        id: id,
        newText: editedText.trim()
      });

      setEditingId(null);
      setEditedText('');

    } catch (error) {
      logger.error('Failed to save correction edit', error instanceof Error ? error : new Error(String(error)), {
        component: 'LocalCorrectionsViewer'
      });
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }, [corrections, editedText, asrLog, onError]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditedText('');
  }, []);

  const deleteCorrection = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this correction? This action cannot be undone.')) {
      return;
    }

    try {
      // Persist deletion to Chrome storage
      await asrLog.deleteCorrection(id);

      // Remove from local state
      const updatedCorrections = corrections.filter(c => c.id !== id);
      setCorrections(updatedCorrections);

      logger.info('Correction deleted and persisted', {
        component: 'LocalCorrectionsViewer',
        id: id,
        remainingCorrections: updatedCorrections.length
      });

    } catch (error) {
      logger.error('Failed to delete correction', error instanceof Error ? error : new Error(String(error)), {
        component: 'LocalCorrectionsViewer'
      });
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }, [corrections, asrLog, onError]);

  const exportCorrections = useCallback(() => {
    try {
      const exportData = {
        exported: new Date().toISOString(),
        count: filteredCorrections.length,
          corrections: filteredCorrections.map(correction => ({
          date: new Date(correction.timestamp).toISOString(),
          agent: correction.agentType,
          rawText: correction.rawText,
          correctedText: correction.correctedText,
          sessionId: correction.sessionId,
          approvalStatus: correction.approvalStatus,
          userExplicitlyApproved: correction.userExplicitlyApproved
        }))
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `asr-corrections-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      logger.info('Corrections exported', {
        component: 'LocalCorrectionsViewer',
        count: filteredCorrections.length
      });

    } catch (error) {
      logger.error('Failed to export corrections', error instanceof Error ? error : new Error(String(error)), {
        component: 'LocalCorrectionsViewer'
      });
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }, [filteredCorrections, onError]);

  const getUniqueAgents = useMemo(() => {
    const agents = new Set<AgentType>();
    corrections.forEach(correction => {
      if (correction.agentType) {
        agents.add(correction.agentType);
      }
    });
    return Array.from(agents).sort();
  }, [corrections]);

  if (isLoading && corrections.length === 0) {
    return (
      <div className="space-y-3 p-4">
        {/* Loading skeleton */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-3 animate-pulse">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="h-3 w-24 bg-gray-200 rounded"></div>
                <div className="h-5 w-20 bg-blue-100 rounded"></div>
              </div>
              <div className="flex space-x-1">
                <div className="h-6 w-6 bg-gray-100 rounded"></div>
                <div className="h-6 w-6 bg-gray-100 rounded"></div>
                <div className="h-6 w-6 bg-gray-100 rounded"></div>
              </div>
            </div>
          </div>
        ))}
        <div className="text-center text-sm text-gray-500 mt-4">Loading corrections...</div>
      </div>
    );
  }

  if (corrections.length === 0) {
    return (
      <div className="p-4 text-center text-gray-600">
        <p className="mb-2">No ASR corrections found in local storage.</p>
        <p className="text-sm">Corrections are automatically saved when you edit transcriptions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="font-medium text-gray-900">
            Local Corrections ({filteredCorrections.length})
          </h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-600 text-sm underline hover:text-blue-800"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
        
        {filteredCorrections.length > 0 && (
          <button
            onClick={exportCorrections}
            className="flex items-center space-x-1 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            <Download className="w-3 h-3" />
            <span>Export</span>
          </button>
        )}
      </div>

      {isExpanded && (
        <>
          {/* Filters */}
          <div className="flex space-x-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-600" />
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value as AgentType | 'all')}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="all">All Agents</option>
                {getUniqueAgents.map(agent => (
                  <option key={agent} value={agent}>
                    {agent.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-600" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
              </select>
            </div>
          </div>

          {/* Corrections list */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {displayedCorrections.map((correction) => {
              const isEditing = editingId === correction.id;
              const showingDetails = showDetails.has(correction.id);

              return (
                <div key={correction.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">
                        {new Date(correction.timestamp).toLocaleDateString()} -
                      </span>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        {correction.agentType}
                      </span>
                    </div>
                    
                    <div className="flex space-x-1">
                      <button
                        onClick={() => toggleDetails(correction.id)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title={showingDetails ? 'Hide details' : 'Show details'}
                      >
                        {showingDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      
                      {!isEditing && (
                        <button
                          onClick={() => startEditing(correction)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Edit correction"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => deleteCorrection(correction.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Delete correction"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {showingDetails && (
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Original:</span>
                        <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-800">
                          {correction.rawText}
                        </div>
                      </div>
                      
                      <div>
                        <span className="font-medium text-gray-700">Corrected:</span>
                        {isEditing ? (
                          <div className="mt-1">
                            <textarea
                              value={editedText}
                              onChange={(e) => setEditedText(e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded"
                              rows={3}
                            />
                            <div className="flex space-x-2 mt-2">
                              <button
                                onClick={() => saveEdit(correction.id)}
                                className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                              >
                                <Save className="w-3 h-3" />
                                <span>Save</span>
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="flex items-center space-x-1 px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                              >
                                <X className="w-3 h-3" />
                                <span>Cancel</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-1 p-2 bg-green-50 border border-green-200 rounded text-green-800">
                            {correction.correctedText}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Load More button */}
          {displayedCorrections.length < filteredCorrections.length && (
            <div className="text-center py-4">
              <button
                onClick={() => setLoadedChunks(prev => prev + 1)}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Load More ({filteredCorrections.length - displayedCorrections.length} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
