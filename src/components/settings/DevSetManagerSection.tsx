/**
 * DevSetManagerSection - UI for managing development set golden examples
 *
 * Features:
 * - Browse existing dev set examples by agent
 * - Create new golden examples with form validation
 * - Edit existing examples
 * - Delete examples with confirmation
 * - Visual preview of example data
 *
 * Dev sets are used by GEPA optimization to evaluate and improve agents.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Info,
  FolderOpen
} from 'lucide-react';
import type { AgentType } from '@/types/optimization';
import { logger } from '@/utils/Logger';

interface DevSetManagerSectionProps {
  onError: (error: Error) => void;
  onLoadingChange: (isLoading: boolean) => void;
}

interface DevSetExample {
  id: string;
  file_path: string;
  file_name: string;
  data: {
    id: string;
    task: AgentType;
    transcript: string;
    expected_elements: string[];
    expected_output?: string;
    rubric_criteria: Record<string, any>;
    metadata?: Record<string, any>;
  };
}

const AVAILABLE_AGENTS: Array<{ id: AgentType; label: string }> = [
  { id: 'quick-letter', label: 'Quick Letter' },
  { id: 'angiogram-pci', label: 'Angiogram/PCI' },
  { id: 'tavi', label: 'TAVI' },
  { id: 'consultation', label: 'Consultation' },
  { id: 'investigation-summary', label: 'Investigation Summary' }
];

export const DevSetManagerSection: React.FC<DevSetManagerSectionProps> = ({
  onError,
  onLoadingChange
}) => {
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('quick-letter');
  const [examples, setExamples] = useState<DevSetExample[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingExample, setEditingExample] = useState<DevSetExample | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form state for new/editing example
  const [formData, setFormData] = useState({
    id: '',
    transcript: '',
    expected_output: '',
    expected_elements: '',
    rubric_criteria: '',
    metadata: ''
  });

  // Load examples for selected agent
  const loadExamples = useCallback(async (agentType: AgentType) => {
    try {
      setIsLoading(true);
      onLoadingChange(true);

      const response = await fetch(`http://localhost:8002/v1/dspy/devset/${agentType}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load examples');
      }

      setExamples(data.data.examples);
      logger.info('Dev set examples loaded', {
        component: 'DevSetManagerSection',
        agentType,
        count: data.data.count
      });

    } catch (error) {
      onError(error instanceof Error ? error : new Error(String(error)));
      setExamples([]);
    } finally {
      setIsLoading(false);
      onLoadingChange(false);
    }
  }, [onError, onLoadingChange]);

  // Load examples when agent changes
  useEffect(() => {
    loadExamples(selectedAgent);
  }, [selectedAgent, loadExamples]);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData({
      id: '',
      transcript: '',
      expected_output: '',
      expected_elements: '',
      rubric_criteria: '',
      metadata: ''
    });
    setEditingExample(null);
    setIsCreatingNew(false);
  }, []);

  // Start creating new example
  const startCreating = useCallback(() => {
    resetForm();
    setIsCreatingNew(true);
  }, [resetForm]);

  // Start editing example
  const startEditing = useCallback((example: DevSetExample) => {
    setFormData({
      id: example.data.id,
      transcript: example.data.transcript,
      expected_output: example.data.expected_output || '',
      expected_elements: example.data.expected_elements.join('\n'),
      rubric_criteria: JSON.stringify(example.data.rubric_criteria, null, 2),
      metadata: JSON.stringify(example.data.metadata || {}, null, 2)
    });
    setEditingExample(example);
    setIsCreatingNew(false);
  }, []);

  // Save example (create or update)
  const saveExample = useCallback(async () => {
    try {
      setIsLoading(true);
      onLoadingChange(true);

      // Parse and validate
      const expectedElements = formData.expected_elements
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      let rubricCriteria: Record<string, any> = {};
      let metadata: Record<string, any> = {};

      try {
        if (formData.rubric_criteria.trim()) {
          rubricCriteria = JSON.parse(formData.rubric_criteria);
        }
        if (formData.metadata.trim()) {
          metadata = JSON.parse(formData.metadata);
        }
      } catch (e) {
        throw new Error('Invalid JSON in rubric criteria or metadata');
      }

      const payload = {
        id: formData.id,
        transcript: formData.transcript,
        expected_output: formData.expected_output,
        expected_elements: expectedElements,
        rubric_criteria: rubricCriteria,
        metadata
      };

      let response;
      if (editingExample) {
        // Update
        response = await fetch(
          `http://localhost:8002/v1/dspy/devset/${selectedAgent}/${formData.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }
        );
      } else {
        // Create
        response = await fetch(
          `http://localhost:8002/v1/dspy/devset/${selectedAgent}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save example');
      }

      logger.info(`Dev set example ${editingExample ? 'updated' : 'created'}`, {
        component: 'DevSetManagerSection',
        id: formData.id,
        agentType: selectedAgent
      });

      // Reload examples and reset form
      await loadExamples(selectedAgent);
      resetForm();

    } catch (error) {
      onError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsLoading(false);
      onLoadingChange(false);
    }
  }, [formData, editingExample, selectedAgent, loadExamples, resetForm, onError, onLoadingChange]);

  // Delete example
  const deleteExample = useCallback(async (example: DevSetExample) => {
    if (!confirm(`Delete example "${example.id}"? This cannot be undone.`)) {
      return;
    }

    try {
      setIsLoading(true);
      onLoadingChange(true);

      const response = await fetch(
        `http://localhost:8002/v1/dspy/devset/${selectedAgent}/${example.data.id}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete example');
      }

      logger.info('Dev set example deleted', {
        component: 'DevSetManagerSection',
        id: example.data.id
      });

      // Reload examples
      await loadExamples(selectedAgent);

    } catch (error) {
      onError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsLoading(false);
      onLoadingChange(false);
    }
  }, [selectedAgent, loadExamples, onError, onLoadingChange]);

  return (
    <div className="space-y-6">
      {/* Educational Header */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-emerald-900 space-y-2">
            <p className="font-semibold">Development Set (Golden Examples)</p>
            <p className="leading-relaxed">
              Golden examples are high-quality transcript + expected output pairs that GEPA uses to evaluate and optimize your agents.
              Add 5-10 diverse examples per agent for best results.
            </p>
            <div className="bg-emerald-100 rounded p-3 mt-2">
              <p className="font-medium mb-1">💡 What Makes a Good Example</p>
              <ul className="text-xs space-y-1 list-disc list-inside ml-2">
                <li>Real transcripts from actual dictations (with PHI removed)</li>
                <li>Clear expected elements (what the output should contain)</li>
                <li>Diverse complexity levels (simple, moderate, complex)</li>
                <li>Edge cases and common failure patterns</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Agent Type</label>
        <select
          value={selectedAgent}
          onChange={(e) => setSelectedAgent(e.target.value as AgentType)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          disabled={isCreatingNew || editingExample !== null}
        >
          {AVAILABLE_AGENTS.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.label}
            </option>
          ))}
        </select>
      </div>

      {/* Example List or Editor */}
      {!isCreatingNew && !editingExample ? (
        <>
          {/* List Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-gray-600" />
              Examples ({examples.length})
            </h4>
            <button
              onClick={startCreating}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>New Example</span>
            </button>
          </div>

          {/* Example Cards */}
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading examples...</div>
          ) : examples.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-lg">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="font-medium text-gray-700 mb-2">No Examples Yet</h4>
              <p className="text-sm text-gray-600 mb-4">
                Create your first golden example to start optimizing this agent
              </p>
              <button
                onClick={startCreating}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                <span>Create Example</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {examples.map((example) => (
                <div
                  key={example.id}
                  className="border-2 border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h5 className="font-semibold text-gray-900">{example.data.id}</h5>
                      <p className="text-xs text-gray-500 mt-0.5">{example.file_name}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => startEditing(example)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteExample(example)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Transcript:</span>
                      <p className="text-gray-600 mt-1 line-clamp-2">{example.data.transcript}</p>
                    </div>
                    {example.data.expected_elements.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">Expected Elements:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {example.data.expected_elements.slice(0, 4).map((elem, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs"
                            >
                              {elem}
                            </span>
                          ))}
                          {example.data.expected_elements.length > 4 && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                              +{example.data.expected_elements.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Example Editor Form */
        <div className="border-2 border-blue-300 rounded-xl p-6 bg-blue-50">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-semibold text-gray-900 text-lg">
              {editingExample ? `Edit: ${editingExample.data.id}` : 'New Example'}
            </h4>
            <button
              onClick={resetForm}
              className="p-2 text-gray-600 hover:bg-white rounded-lg"
              title="Cancel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Example ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Example ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                placeholder="ex004_followup"
                disabled={editingExample !== null}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Unique ID for this example (e.g., ex004_complex)
              </p>
            </div>

            {/* Transcript */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transcript <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.transcript}
                onChange={(e) => setFormData({ ...formData, transcript: e.target.value })}
                placeholder="Patient seen in clinic today for..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                The input dictation text
              </p>
            </div>

            {/* Expected Output */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Output (Optional)
              </label>
              <textarea
                value={formData.expected_output}
                onChange={(e) => setFormData({ ...formData, expected_output: e.target.value })}
                placeholder="Dear Dr. Smith,\n\nI reviewed..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                The expected output text (if available)
              </p>
            </div>

            {/* Expected Elements */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Elements <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.expected_elements}
                onChange={(e) => setFormData({ ...formData, expected_elements: e.target.value })}
                placeholder="clinical assessment&#10;symptom review&#10;medication status&#10;follow-up plan"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                One element per line - what should be in the output
              </p>
            </div>

            {/* Rubric Criteria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rubric Criteria (JSON)
              </label>
              <textarea
                value={formData.rubric_criteria}
                onChange={(e) => setFormData({ ...formData, rubric_criteria: e.target.value })}
                placeholder={'{\n  "min_score": 70,\n  "has_clinical_content": true\n}'}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                JSON object with scoring criteria
              </p>
            </div>

            {/* Metadata */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Metadata (JSON, Optional)
              </label>
              <textarea
                value={formData.metadata}
                onChange={(e) => setFormData({ ...formData, metadata: e.target.value })}
                placeholder={'{\n  "complexity": "simple",\n  "source": "real-dictation"\n}'}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Additional metadata for this example
              </p>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-300">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveExample}
                disabled={isLoading || !formData.id || !formData.transcript || !formData.expected_elements}
                className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                <span>{isLoading ? 'Saving...' : 'Save Example'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
