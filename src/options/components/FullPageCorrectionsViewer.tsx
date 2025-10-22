/**
 * FullPageCorrectionsViewer - Full-page interface for viewing and managing ASR corrections
 * 
 * Enhanced version of LocalCorrectionsViewer designed for full-page layout with:
 * - Expanded viewport utilization for comfortable transcription editing
 * - Advanced filtering and search capabilities
 * - Bulk operations for managing multiple corrections
 * - Enhanced edit experience with syntax highlighting
 * - Professional data table with sorting and pagination
 * - Export/import functionality with detailed options
 * 
 * This addresses the user's need for more space to view and edit transcriptions
 * by providing a full-screen interface instead of the cramped modal experience.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Edit3,
  Trash2,
  Download,
  Calendar,
  User,
  Save,
  X,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  FileText,
  Clock
} from 'lucide-react';
import { ASRCorrectionsLog } from '@/services/ASRCorrectionsLog';
import { logger } from '@/utils/Logger';
import type { ASRCorrectionsEntry, AgentType } from '@/types/optimization';

interface FullPageCorrectionsViewerProps {
  onError?: (error: Error) => void;
  onLoadingChange?: (isLoading: boolean) => void;
}

type SortField = 'timestamp' | 'agentType' | 'original' | 'corrected' | 'confidence';
type SortDirection = 'asc' | 'desc';

interface FilterState {
  searchTerm: string;
  selectedAgent: AgentType | 'all';
  dateRange: 'all' | 'today' | 'week' | 'month' | 'custom';
  customDateStart?: string;
  customDateEnd?: string;
  confidenceRange: [number, number];
}

const ITEMS_PER_PAGE = 25;
const DEFAULT_FILTERS: FilterState = {
  searchTerm: '',
  selectedAgent: 'all',
  dateRange: 'all',
  confidenceRange: [0, 1]
};

export const FullPageCorrectionsViewer: React.FC<FullPageCorrectionsViewerProps> = ({
  onError = () => {},
  onLoadingChange = () => {}
}) => {
  // Services
  const asrLog = useMemo(() => ASRCorrectionsLog.getInstance(), []);

  // State
  const [corrections, setCorrections] = useState<ASRCorrectionsEntry[]>([]);
  const [filteredCorrections, setFilteredCorrections] = useState<ASRCorrectionsEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState('');
  const [selectedCorrections, setSelectedCorrections] = useState<Set<string>>(new Set());
  
  // Filtering and sorting
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredCorrections.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredCorrections.length);
  const currentItems = filteredCorrections.slice(startIndex, endIndex);

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [_viewMode, _setViewMode] = useState<'table' | 'cards'>('table');

  const loadCorrections = useCallback(async () => {
    try {
      setIsLoading(true);
      onLoadingChange(true);

      const allCorrections = await asrLog.getCorrections({ limit: 1000 });
      setCorrections(allCorrections);

      logger.info('Full-page corrections loaded', {
        component: 'FullPageCorrectionsViewer',
        count: allCorrections.length
      });

    } catch (error) {
      logger.error('Failed to load full-page corrections', error instanceof Error ? error : new Error(String(error)), {
        component: 'FullPageCorrectionsViewer'
      });
      onError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsLoading(false);
      onLoadingChange(false);
    }
  }, [asrLog, onError, onLoadingChange]);

  // Load corrections on mount
  useEffect(() => {
    loadCorrections();
  }, [loadCorrections]);

  const applyFiltersAndSort = useCallback(() => {
    let filtered = [...corrections];

    // Search term filter
    if (filters.searchTerm.trim()) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(correction => 
        correction.rawText.toLowerCase().includes(searchLower) ||
        correction.correctedText.toLowerCase().includes(searchLower) ||
        correction.agentType?.toLowerCase().includes(searchLower)
      );
    }

    // Agent filter
    if (filters.selectedAgent !== 'all') {
      filtered = filtered.filter(correction => correction.agentType === filters.selectedAgent);
    }

    // Date filter
    const now = Date.now();
    switch (filters.dateRange) {
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
      case 'custom':
        if (filters.customDateStart) {
          const startTime = new Date(filters.customDateStart).getTime();
          filtered = filtered.filter(correction => correction.timestamp >= startTime);
        }
        if (filters.customDateEnd) {
          const endTime = new Date(filters.customDateEnd).setHours(23, 59, 59, 999);
          filtered = filtered.filter(correction => correction.timestamp <= endTime);
        }
        break;
    }

    // Confidence filter
    // Confidence not tracked; keep all entries

    // Sort
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'timestamp':
          aValue = a.timestamp;
          bValue = b.timestamp;
          break;
        case 'agentType':
          aValue = a.agentType || '';
          bValue = b.agentType || '';
          break;
        case 'original':
          aValue = a.rawText.toLowerCase();
          bValue = b.rawText.toLowerCase();
          break;
      case 'corrected':
        aValue = a.correctedText.toLowerCase();
        bValue = b.correctedText.toLowerCase();
        break;
      case 'confidence':
        aValue = a.confidence ?? -1;
        bValue = b.confidence ?? -1;
        break;
      default:
        aValue = a.timestamp;
        bValue = b.timestamp;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredCorrections(filtered);
  }, [corrections, filters, sortField, sortDirection]);

  // Apply filters and sorting when dependencies change
  useEffect(() => {
    applyFiltersAndSort();
    setCurrentPage(1); // Reset to first page when filters change
  }, [corrections, filters, sortField, sortDirection, applyFiltersAndSort]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField]);

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
        timestamp: Date.now()
      };

      const updatedCorrections = [...corrections];
      updatedCorrections[correctionIndex] = updatedCorrection;
      setCorrections(updatedCorrections);

      logger.info('Correction updated in full-page viewer', {
        component: 'FullPageCorrectionsViewer',
        id: id,
        newText: editedText.trim()
      });

      setEditingId(null);
      setEditedText('');

    } catch (error) {
      logger.error('Failed to save correction edit', error instanceof Error ? error : new Error(String(error)), {
        component: 'FullPageCorrectionsViewer'
      });
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }, [corrections, editedText, onError]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditedText('');
  }, []);

  const deleteCorrection = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this correction? This action cannot be undone.')) {
      return;
    }

    try {
      const updatedCorrections = corrections.filter(c => c.id !== id);
      setCorrections(updatedCorrections);
      setSelectedCorrections(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      logger.info('Correction deleted from full-page viewer', {
        component: 'FullPageCorrectionsViewer',
        id: id
      });

    } catch (error) {
      logger.error('Failed to delete correction', error instanceof Error ? error : new Error(String(error)), {
        component: 'FullPageCorrectionsViewer'
      });
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }, [corrections, onError]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedCorrections.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedCorrections.size} corrections? This action cannot be undone.`)) {
      return;
    }

    try {
      const updatedCorrections = corrections.filter(c => !selectedCorrections.has(c.id));
      setCorrections(updatedCorrections);
      setSelectedCorrections(new Set());

      logger.info('Bulk corrections deleted', {
        component: 'FullPageCorrectionsViewer',
        count: selectedCorrections.size
      });

    } catch (error) {
      logger.error('Failed to bulk delete corrections', error instanceof Error ? error : new Error(String(error)), {
        component: 'FullPageCorrectionsViewer'
      });
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }, [corrections, selectedCorrections, onError]);

  const exportCorrections = useCallback(() => {
    try {
      const dataToExport = selectedCorrections.size > 0 
        ? filteredCorrections.filter(c => selectedCorrections.has(c.id))
        : filteredCorrections;

      const exportData = {
        exported: new Date().toISOString(),
        count: dataToExport.length,
        filters: filters,
        corrections: dataToExport.map(correction => ({
          id: correction.id,
          date: new Date(correction.timestamp).toISOString(),
          agent: correction.agentType,
          original: correction.rawText,
          corrected: correction.correctedText,
          sessionId: correction.sessionId
        }))
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `operator-transcription-corrections-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      logger.info('Corrections exported from full-page viewer', {
        component: 'FullPageCorrectionsViewer',
        count: dataToExport.length,
        hasSelection: selectedCorrections.size > 0
      });

    } catch (error) {
      logger.error('Failed to export corrections', error instanceof Error ? error : new Error(String(error)), {
        component: 'FullPageCorrectionsViewer'
      });
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }, [filteredCorrections, selectedCorrections, filters, onError]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedCorrections(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedCorrections.size === currentItems.length) {
      setSelectedCorrections(new Set());
    } else {
      setSelectedCorrections(new Set(currentItems.map(item => item.id)));
    }
  }, [currentItems, selectedCorrections.size]);

  const getUniqueAgents = useMemo(() => {
    const agents = new Set<AgentType>();
    corrections.forEach(correction => {
      if (correction.agentType) {
        agents.add(correction.agentType);
      }
    });
    return Array.from(agents).sort();
  }, [corrections]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getAgentDisplayName = (agentType: string) => {
    return agentType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-info mb-4"></div>
        <div className="text-ink-secondary">Loading transcription corrections...</div>
      </div>
    );
  }

  // Empty state
  if (corrections.length === 0) {
    return (
      <div className="text-center py-16">
        <FileText className="w-16 h-16 text-ink-tertiary mx-auto mb-6" />
        <h3 className="text-xl font-medium text-ink-primary mb-4">No Corrections Found</h3>
        <p className="text-ink-secondary max-w-2xl mx-auto mb-6">
          ASR corrections are automatically saved when you edit transcriptions during your medical dictation sessions. 
          Once you start using the Operator extension and making corrections, they will appear here.
        </p>
        <button
          onClick={loadCorrections}
          className="mono-button-primary flex items-center space-x-2 mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div>
            <h2 className="text-xl font-semibold text-ink-primary">Transcription Corrections</h2>
            <p className="text-sm text-ink-secondary mt-1">
              {filteredCorrections.length} of {corrections.length} corrections
              {selectedCorrections.size > 0 && ` • ${selectedCorrections.size} selected`}
            </p>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-ink-secondary">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>Last updated: {corrections.length > 0 ? formatDate(Math.max(...corrections.map(c => c.timestamp))) : 'Never'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {selectedCorrections.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete {selectedCorrections.size}</span>
            </button>
          )}
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              showFilters 
                ? 'bg-accent-info text-white' 
                : 'bg-surface-secondary text-ink-primary border border-line-secondary hover:bg-surface-tertiary'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
          
          <button
            onClick={exportCorrections}
            className="mono-button-primary flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          
          <button
            onClick={loadCorrections}
            className="mono-button-secondary flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-surface-secondary border-2 border-line-primary rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-ink-primary mb-2">Search</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-tertiary" />
                <input
                  type="text"
                  value={filters.searchTerm}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                  placeholder="Search original or corrected text..."
                  className="w-full pl-10 pr-4 py-2 border border-line-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-info focus:border-transparent"
                />
              </div>
            </div>

            {/* Agent Filter */}
            <div>
              <label className="block text-sm font-medium text-ink-primary mb-2">Agent</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-tertiary" />
                <select
                  value={filters.selectedAgent}
                  onChange={(e) => setFilters(prev => ({ ...prev, selectedAgent: e.target.value as AgentType | 'all' }))}
                  className="w-full pl-10 pr-8 py-2 border border-line-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-info focus:border-transparent appearance-none"
                >
                  <option value="all">All Agents</option>
                  {getUniqueAgents.map(agent => (
                    <option key={agent} value={agent}>
                      {getAgentDisplayName(agent)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-ink-primary mb-2">Date Range</label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-tertiary" />
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as FilterState['dateRange'] }))}
                  className="w-full pl-10 pr-8 py-2 border border-line-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-info focus:border-transparent appearance-none"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
            </div>

            {/* Reset Filters */}
            <div className="flex items-end">
              <button
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="w-full mono-button-secondary flex items-center justify-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Custom Date Range */}
          {filters.dateRange === 'custom' && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-ink-primary mb-2">From</label>
                <input
                  type="date"
                  value={filters.customDateStart || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, customDateStart: e.target.value }))}
                  className="w-full px-4 py-2 border border-line-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-info focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-primary mb-2">To</label>
                <input
                  type="date"
                  value={filters.customDateEnd || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, customDateEnd: e.target.value }))}
                  className="w-full px-4 py-2 border border-line-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-info focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results Summary */}
      {filteredCorrections.length !== corrections.length && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-800">
              Showing {filteredCorrections.length} of {corrections.length} corrections with current filters
            </span>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-surface-primary border-2 border-line-primary rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="bg-surface-secondary border-b-2 border-line-primary p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedCorrections.size === currentItems.length && currentItems.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-line-secondary focus:ring-accent-info"
                />
                <span className="text-sm text-ink-secondary">Select all on page</span>
              </label>
            </div>
            
            <div className="text-sm text-ink-secondary">
              Showing {startIndex + 1}-{endIndex} of {filteredCorrections.length}
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-tertiary border-b border-line-primary">
              <tr>
                <th className="w-12 px-4 py-3 text-left">
                  <span className="sr-only">Select</span>
                </th>
                <th 
                  onClick={() => handleSort('timestamp')}
                  className="px-4 py-3 text-left text-sm font-medium text-ink-primary cursor-pointer hover:bg-surface-secondary transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <span>Date</span>
                    {getSortIcon('timestamp')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('agentType')}
                  className="px-4 py-3 text-left text-sm font-medium text-ink-primary cursor-pointer hover:bg-surface-secondary transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <span>Agent</span>
                    {getSortIcon('agentType')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('original')}
                  className="px-4 py-3 text-left text-sm font-medium text-ink-primary cursor-pointer hover:bg-surface-secondary transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <span>Original</span>
                    {getSortIcon('original')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('corrected')}
                  className="px-4 py-3 text-left text-sm font-medium text-ink-primary cursor-pointer hover:bg-surface-secondary transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <span>Corrected</span>
                    {getSortIcon('corrected')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('confidence')}
                  className="px-4 py-3 text-left text-sm font-medium text-ink-primary cursor-pointer hover:bg-surface-secondary transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <span>Confidence</span>
                    {getSortIcon('confidence')}
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-ink-primary">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-primary">
              {currentItems.map((correction) => {
                const isEditing = editingId === correction.id;
                const isSelected = selectedCorrections.has(correction.id);
                const confidenceValue = typeof correction.confidence === 'number' ? correction.confidence : 0;
                const confidenceWidth = Math.max(0, Math.min(100, Math.round(confidenceValue * 100)));
                const confidenceLabel = correction.confidence != null ? `${confidenceWidth}%` : 'N/A';
                
                return (
                  <tr 
                    key={correction.id} 
                    className={`hover:bg-surface-secondary transition-colors ${
                      isSelected ? 'bg-blue-50 border-l-4 border-l-accent-info' : ''
                    }`}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelection(correction.id)}
                        className="rounded border-line-secondary focus:ring-accent-info"
                      />
                    </td>
                    
                    <td className="px-4 py-4 text-sm text-ink-secondary">
                      <div className="font-mono">
                        {formatDate(correction.timestamp)}
                      </div>
                    </td>
                    
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {getAgentDisplayName(correction.agentType || 'unknown')}
                      </span>
                    </td>
                    
                    <td className="px-4 py-4 w-1/3">
                      <div className="text-sm text-red-800 bg-red-50 p-3 rounded border border-red-200 max-h-32 overflow-y-auto">
                        <div className="whitespace-pre-wrap break-words">
                          {correction.original || correction.rawText || '—'}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 w-1/3">
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="text-xs text-ink-secondary mb-1 flex items-start space-x-2">
                            <div className="flex-1 bg-red-50 p-2 rounded border border-red-200 max-h-24 overflow-y-auto">
                              <strong className="block mb-1">Original:</strong>
                              <div className="text-red-800 whitespace-pre-wrap break-words">
                                {correction.original || correction.rawText}
                              </div>
                            </div>
                          </div>
                          <textarea
                            value={editedText}
                            onChange={(e) => setEditedText(e.target.value)}
                            className="w-full p-3 text-sm border border-line-secondary rounded focus:outline-none focus:ring-2 focus:ring-accent-info focus:border-transparent resize-y font-mono"
                            rows={6}
                            placeholder="Enter corrected text..."
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={() => saveEdit(correction.id)}
                              className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                            >
                              <Save className="w-4 h-4" />
                              <span>Save</span>
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="flex items-center space-x-1 px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                            >
                              <X className="w-4 h-4" />
                              <span>Cancel</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-green-800 bg-green-50 p-3 rounded border border-green-200 max-h-32 overflow-y-auto">
                          <div className="whitespace-pre-wrap break-words">
                            {correction.corrected || correction.correctedText || '—'}
                          </div>
                        </div>
                      )}
                    </td>
                    
                    <td className="px-4 py-4 text-sm text-ink-secondary">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${confidenceWidth}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs">
                          {confidenceLabel}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {!isEditing && (
                          <button
                            onClick={() => startEditing(correction)}
                            className="p-1 text-ink-tertiary hover:text-accent-info transition-colors"
                            title="Edit correction"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => deleteCorrection(correction.id)}
                          className="p-1 text-ink-tertiary hover:text-red-600 transition-colors"
                          title="Delete correction"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-surface-secondary border-t-2 border-line-primary p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-ink-secondary">
                Page {currentPage} of {totalPages}
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center space-x-1 px-3 py-2 text-sm border border-line-secondary rounded hover:bg-surface-tertiary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 text-sm rounded transition-colors ${
                          currentPage === pageNum
                            ? 'bg-accent-info text-white'
                            : 'text-ink-secondary hover:bg-surface-tertiary'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center space-x-1 px-3 py-2 text-sm border border-line-secondary rounded hover:bg-surface-tertiary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* No Results */}
      {filteredCorrections.length === 0 && corrections.length > 0 && (
        <div className="text-center py-12">
          <Search className="w-16 h-16 text-ink-tertiary mx-auto mb-6" />
          <h3 className="text-lg font-medium text-ink-primary mb-2">No corrections match your filters</h3>
          <p className="text-ink-secondary mb-6">
            Try adjusting your search criteria or filters to find the corrections you're looking for.
          </p>
          <button
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="mono-button-primary"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
};
