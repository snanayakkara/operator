/**
 * PhrasebookPanel - User phrasebook management interface
 *
 * Professional data table for managing user-defined medical terminology
 * preferences with search, filtering, import/export, and bulk operations.
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Download,
  Upload,
  Edit,
  Trash2,
  Filter as _Filter,
  Check,
  X,
  FileText,
  Volume2,
  Tag
} from 'lucide-react';
import { PhrasebookService, type PhrasebookEntry } from '@/services/PhrasebookService';

interface PhrasebookPanelProps {
  className?: string;
}

export const PhrasebookPanel: React.FC<PhrasebookPanelProps> = ({ className = '' }) => {
  const [entries, setEntries] = useState<PhrasebookEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<PhrasebookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'asr' | 'gen'>('all');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PhrasebookEntry | null>(null);
  const [_showImportModal, _setShowImportModal] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    term: '',
    preferred: '',
    type: 'asr' as 'asr' | 'gen',
    tags: '',
    notes: ''
  });

  const phrasebookService = PhrasebookService.getInstance();

  // Load entries on mount
  useEffect(() => {
    loadEntries();
  }, []);

  // Filter entries when search or filter changes
  useEffect(() => {
    let filtered = entries;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.term.toLowerCase().includes(query) ||
        entry.preferred.toLowerCase().includes(query) ||
        entry.tags?.some(tag => tag.toLowerCase().includes(query)) ||
        entry.notes?.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(entry => entry.type === typeFilter);
    }

    setFilteredEntries(filtered);
  }, [entries, searchQuery, typeFilter]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const loadedEntries = await phrasebookService.getAll();
      setEntries(loadedEntries);
      setError(null);
    } catch (err) {
      setError('Failed to load phrasebook entries');
      console.error('Error loading phrasebook:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async () => {
    try {
      const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(Boolean);

      await phrasebookService.save({
        term: formData.term,
        preferred: formData.preferred,
        type: formData.type,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        notes: formData.notes || undefined
      });

      await loadEntries();
      resetForm();
      setShowAddModal(false);
    } catch (err) {
      setError('Failed to add entry');
      console.error('Error adding entry:', err);
    }
  };

  const handleEditEntry = async () => {
    if (!editingEntry) return;

    try {
      const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(Boolean);

      await phrasebookService.update(editingEntry.id, {
        term: formData.term,
        preferred: formData.preferred,
        type: formData.type,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        notes: formData.notes || undefined
      });

      await loadEntries();
      resetForm();
      setEditingEntry(null);
    } catch (err) {
      setError('Failed to update entry');
      console.error('Error updating entry:', err);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) {
      return;
    }

    try {
      await phrasebookService.remove(id);
      await loadEntries();
    } catch (err) {
      setError('Failed to delete entry');
      console.error('Error deleting entry:', err);
    }
  };

  const handleExport = async () => {
    try {
      const exportData = await phrasebookService.export();
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `phrasebook-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export phrasebook');
      console.error('Error exporting:', err);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const result = await phrasebookService.import(content, true); // Merge with existing

      if (result.errors.length > 0) {
        setError(`Import completed with ${result.errors.length} errors. Check console for details.`);
        console.warn('Import errors:', result.errors);
      }

      await loadEntries();
      event.target.value = ''; // Reset file input
    } catch (err) {
      setError('Failed to import phrasebook');
      console.error('Error importing:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      term: '',
      preferred: '',
      type: 'asr',
      tags: '',
      notes: ''
    });
  };

  const startEdit = (entry: PhrasebookEntry) => {
    setFormData({
      term: entry.term,
      preferred: entry.preferred,
      type: entry.type,
      tags: entry.tags?.join(', ') || '',
      notes: entry.notes || ''
    });
    setEditingEntry(entry);
  };

  const cancelEdit = () => {
    setEditingEntry(null);
    resetForm();
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-ink-secondary">Loading phrasebook...</div>
      </div>
    );
  }

  return (
    <div className={`phrasebook-panel ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="mono-heading-lg mb-2">User Phrasebook</h2>
        <p className="mono-body-md text-ink-secondary">
          Manage custom terminology preferences for ASR corrections and generation bias.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 mono-body-md">
          {error}
        </div>
      )}

      {/* Actions Bar */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
            <input
              type="text"
              placeholder="Search terms, preferences, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 border border-line-secondary rounded-lg mono-body-md w-64"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | 'asr' | 'gen')}
            className="px-3 py-2 border border-line-secondary rounded-lg mono-body-md"
          >
            <option value="all">All Types</option>
            <option value="asr">ASR Corrections</option>
            <option value="gen">Generation Bias</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Import */}
          <label className="mono-button-secondary cursor-pointer">
            <Upload className="w-4 h-4 mr-2" />
            Import
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>

          {/* Export */}
          <button
            onClick={handleExport}
            className="mono-button-secondary"
            disabled={entries.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>

          {/* Add Entry */}
          <button
            onClick={() => setShowAddModal(true)}
            className="mono-button-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Entry
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="mb-4 flex gap-4 text-mono-body-sm text-ink-secondary">
        <span>Total: {entries.length}</span>
        <span>ASR: {entries.filter(e => e.type === 'asr').length}</span>
        <span>Generation: {entries.filter(e => e.type === 'gen').length}</span>
        <span>Showing: {filteredEntries.length}</span>
      </div>

      {/* Entries Table */}
      <div className="mono-content-card">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-8 text-ink-secondary">
            {entries.length === 0
              ? 'No phrasebook entries yet. Add your first entry above.'
              : 'No entries match your search criteria.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line-primary">
                  <th className="text-left py-3 px-4 mono-label">Type</th>
                  <th className="text-left py-3 px-4 mono-label">Term</th>
                  <th className="text-left py-3 px-4 mono-label">Preferred</th>
                  <th className="text-left py-3 px-4 mono-label">Tags</th>
                  <th className="text-left py-3 px-4 mono-label">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-line-secondary hover:bg-surface-secondary">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {entry.type === 'asr' ? (
                          <Volume2 className="w-4 h-4 text-accent-info" />
                        ) : (
                          <FileText className="w-4 h-4 text-accent-success" />
                        )}
                        <span className="mono-label">{entry.type.toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 mono-body-md font-medium">{entry.term}</td>
                    <td className="py-3 px-4 mono-body-md">{entry.preferred}</td>
                    <td className="py-3 px-4">
                      {entry.tags && entry.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {entry.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-surface-tertiary text-ink-secondary mono-body-sm rounded"
                            >
                              <Tag className="w-3 h-3" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-ink-tertiary mono-body-sm">No tags</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(entry)}
                          className="mono-button-icon"
                          title="Edit entry"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="mono-button-icon text-accent-error"
                          title="Delete entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="mono-heading-md mb-4">Add Phrasebook Entry</h3>

            <div className="space-y-4">
              <div>
                <label className="block mono-label mb-2">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'asr' | 'gen' }))}
                  className="w-full px-3 py-2 border border-line-secondary rounded-lg"
                >
                  <option value="asr">ASR Correction</option>
                  <option value="gen">Generation Bias</option>
                </select>
              </div>

              <div>
                <label className="block mono-label mb-2">Original Term</label>
                <input
                  type="text"
                  value={formData.term}
                  onChange={(e) => setFormData(prev => ({ ...prev, term: e.target.value }))}
                  className="w-full px-3 py-2 border border-line-secondary rounded-lg"
                  placeholder="e.g., ejection fraction"
                />
              </div>

              <div>
                <label className="block mono-label mb-2">Preferred Form</label>
                <input
                  type="text"
                  value={formData.preferred}
                  onChange={(e) => setFormData(prev => ({ ...prev, preferred: e.target.value }))}
                  className="w-full px-3 py-2 border border-line-secondary rounded-lg"
                  placeholder="e.g., EF"
                />
              </div>

              <div>
                <label className="block mono-label mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full px-3 py-2 border border-line-secondary rounded-lg"
                  placeholder="e.g., cardiology, abbreviation"
                />
              </div>

              <div>
                <label className="block mono-label mb-2">Notes (optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-line-secondary rounded-lg"
                  rows={3}
                  placeholder="Additional notes about this term..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="mono-button-secondary"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
              <button
                onClick={handleAddEntry}
                disabled={!formData.term || !formData.preferred}
                className="mono-button-primary disabled:opacity-50"
              >
                <Check className="w-4 h-4 mr-2" />
                Add Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Entry Modal */}
      {editingEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="mono-heading-md mb-4">Edit Phrasebook Entry</h3>

            <div className="space-y-4">
              <div>
                <label className="block mono-label mb-2">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'asr' | 'gen' }))}
                  className="w-full px-3 py-2 border border-line-secondary rounded-lg"
                >
                  <option value="asr">ASR Correction</option>
                  <option value="gen">Generation Bias</option>
                </select>
              </div>

              <div>
                <label className="block mono-label mb-2">Original Term</label>
                <input
                  type="text"
                  value={formData.term}
                  onChange={(e) => setFormData(prev => ({ ...prev, term: e.target.value }))}
                  className="w-full px-3 py-2 border border-line-secondary rounded-lg"
                />
              </div>

              <div>
                <label className="block mono-label mb-2">Preferred Form</label>
                <input
                  type="text"
                  value={formData.preferred}
                  onChange={(e) => setFormData(prev => ({ ...prev, preferred: e.target.value }))}
                  className="w-full px-3 py-2 border border-line-secondary rounded-lg"
                />
              </div>

              <div>
                <label className="block mono-label mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full px-3 py-2 border border-line-secondary rounded-lg"
                />
              </div>

              <div>
                <label className="block mono-label mb-2">Notes (optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-line-secondary rounded-lg"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={cancelEdit}
                className="mono-button-secondary"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
              <button
                onClick={handleEditEntry}
                disabled={!formData.term || !formData.preferred}
                className="mono-button-primary disabled:opacity-50"
              >
                <Check className="w-4 h-4 mr-2" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};