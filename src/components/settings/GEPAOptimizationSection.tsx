/**
 * GEPAOptimizationSection - GEPA Prompt Optimization UI
 * 
 * Handles GEPA (Generative Expert Prompt Adaptation) optimization workflow:
 * 1. Select medical tasks/agents to optimize
 * 2. Run GEPA optimization with preview candidates
 * 3. Show before/after prompt comparisons with metrics
 * 4. Apply approved optimizations and save state
 * 
 * Features:
 * - Multi-select medical tasks (angiogram, quick-letter, etc.)
 * - Iteration count and human feedback settings
 * - Diff view for prompt changes
 * - Metrics comparison (accuracy, completeness, etc.)
 * - Optimization history with rollback capability
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Play, Download, History, Settings, TrendingUp } from 'lucide-react';
import { OptimizationService } from '@/services/OptimizationService';
import { GEPAOptimizationError } from '@/types/optimization';
import type { 
  GEPAPreview,
  AgentType 
} from '@/types/optimization';

interface GEPAOptimizationSectionProps {
  onError: (error: GEPAOptimizationError) => void;
  onLoadingChange: (isLoading: boolean) => void;
}

const AVAILABLE_TASKS: Array<{
  id: AgentType;
  label: string;
  description: string;
}> = [
  { id: 'angiogram-pci', label: 'Angiogram/PCI', description: 'Cardiac catheterization and PCI procedures' },
  { id: 'quick-letter', label: 'Quick Letter', description: 'Brief medical correspondence' },
  { id: 'tavi', label: 'TAVI', description: 'Transcatheter aortic valve procedures' },
  { id: 'consultation', label: 'Consultation', description: 'Comprehensive patient assessments' },
  { id: 'investigation-summary', label: 'Investigation Summary', description: 'Diagnostic test summaries' }
];

export const GEPAOptimizationSection: React.FC<GEPAOptimizationSectionProps> = ({
  onError,
  onLoadingChange
}) => {
  // Service
  const optimizationService = useMemo(() => OptimizationService.getInstance(), []);

  // State
  const [selectedTasks, setSelectedTasks] = useState<Set<AgentType>>(new Set(['quick-letter']));
  const [iterations, setIterations] = useState(5);
  const [withHuman, setWithHuman] = useState(false);
  const [preview, setPreview] = useState<GEPAPreview | null>(null);

  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const toggleTask = useCallback((taskId: AgentType) => {
    setSelectedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const generatePreview = useCallback(async () => {
    try {
      setIsGeneratingPreview(true);
      onLoadingChange(true);

      const request = {
        tasks: Array.from(selectedTasks),
        iterations,
        with_human: withHuman
      };

      // This would call the GEPA optimization service
      // For now, we'll show a placeholder
      console.log('GEPA preview request:', request);

      // TODO: Implement actual GEPA preview call
      // const previewData = await optimizationService.previewGEPAOptimization(request);
      // setPreview(previewData);

    } catch (error) {
      onError(error instanceof GEPAOptimizationError ? error : new GEPAOptimizationError(error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGeneratingPreview(false);
      onLoadingChange(false);
    }
  }, [selectedTasks, iterations, withHuman, optimizationService, onError, onLoadingChange]);

  return (
    <div className="space-y-6">
      {/* Task Selection */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Select Medical Tasks to Optimize</h4>
        <div className="grid grid-cols-1 gap-3">
          {AVAILABLE_TASKS.map((task) => {
            const isSelected = selectedTasks.has(task.id);
            return (
              <label
                key={task.id}
                className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleTask(task.id)}
                    className="rounded text-blue-600"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{task.label}</div>
                    <div className="text-sm text-gray-600">{task.description}</div>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Optimization Settings */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Iterations
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={iterations}
            onChange={(e) => setIterations(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Number of GEPA optimization iterations</p>
        </div>
        
        <div>
          <label className="flex items-center space-x-2 mt-6">
            <input
              type="checkbox"
              checked={withHuman}
              onChange={(e) => setWithHuman(e.target.checked)}
              className="rounded text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">Include human feedback</span>
          </label>
          <p className="text-xs text-gray-500 mt-1">Enable interactive optimization with human input</p>
        </div>
      </div>

      {/* Generate Preview */}
      <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
        <div>
          <h4 className="font-medium text-gray-900">GEPA Optimization Preview</h4>
          <p className="text-sm text-gray-600">
            Run optimization analysis to preview prompt improvements
          </p>
        </div>
        <button
          onClick={generatePreview}
          disabled={isGeneratingPreview || selectedTasks.size === 0}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="w-4 h-4" />
          <span>{isGeneratingPreview ? 'Optimizing...' : 'Preview Candidates'}</span>
        </button>
      </div>

      {/* Coming Soon Notice */}
      <div className="text-center py-8 bg-blue-50 border border-blue-200 rounded-lg">
        <TrendingUp className="w-12 h-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-blue-900 mb-2">
          GEPA Optimization
        </h3>
        <p className="text-blue-700 max-w-md mx-auto">
          Advanced prompt optimization using Generative Expert Prompt Adaptation. 
          This feature will analyze your selected medical tasks and suggest optimized prompts 
          based on performance metrics and evaluation results.
        </p>
        <p className="text-sm text-blue-600 mt-4">
          Implementation in progress - backend GEPA endpoints required
        </p>
      </div>
    </div>
  );
};
