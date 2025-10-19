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
import { Play, TrendingUp, CheckCircle, XCircle, Info, FileText, Sparkles } from 'lucide-react';
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
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());

  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Progress state
  const [previewProgressText, setPreviewProgressText] = useState<string>('');
  const [applyProgressText, setApplyProgressText] = useState<string>('');

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

  const toggleCandidate = useCallback((candidateId: string) => {
    setSelectedCandidates(prev => {
      const next = new Set(prev);
      if (next.has(candidateId)) {
        next.delete(candidateId);
      } else {
        next.add(candidateId);
      }
      return next;
    });
  }, []);

  const applySelectedCandidates = useCallback(async () => {
    if (!preview || selectedCandidates.size === 0) return;

    try {
      setIsApplying(true);
      onLoadingChange(true);

      const accepted = preview.candidates
        .filter(c => selectedCandidates.has(c.id))
        .map(c => ({ task: c.task, candidate_id: c.id }));

      setApplyProgressText(`Applying ${accepted.length} optimization(s) to agent prompts...`);

      const result = await optimizationService.applyGEPAOptimization({ accepted });

      if (result.errors.length > 0) {
        setApplyProgressText(`⚠ Applied ${result.applied.length} optimizations with ${result.errors.length} error(s)`);
      } else {
        setApplyProgressText(`✓ Successfully applied ${result.applied.length} optimization(s)!`);
      }

      // Clear preview after successful apply
      setPreview(null);
      setSelectedCandidates(new Set());

      // Clear success message after 3 seconds
      setTimeout(() => setApplyProgressText(''), 3000);

    } catch (error) {
      setApplyProgressText('');
      onError(error instanceof GEPAOptimizationError ? error : new GEPAOptimizationError(error instanceof Error ? error.message : String(error)));
    } finally {
      setIsApplying(false);
      onLoadingChange(false);
    }
  }, [preview, selectedCandidates, optimizationService, onError, onLoadingChange]);

  const generatePreview = useCallback(async () => {
    try {
      console.log('[GEPAOptimization] Starting preview generation...', {
        tasks: Array.from(selectedTasks),
        iterations,
        withHuman
      });

      setIsGeneratingPreview(true);
      onLoadingChange(true);

      const taskCount = selectedTasks.size;
      setPreviewProgressText(`Starting GEPA optimization for ${taskCount} agent(s) with ${iterations} iterations...`);

      const request = {
        tasks: Array.from(selectedTasks),
        iterations,
        with_human: withHuman
      };

      // Call the GEPA optimization service
      console.log('[GEPAOptimization] Calling previewGEPAOptimization...');
      setPreviewProgressText(`Running ${iterations} optimization iterations (this may take 1-3 minutes)...`);

      const previewData = await optimizationService.previewGEPAOptimization(request);
      console.log('[GEPAOptimization] Preview data received:', previewData);

      setPreviewProgressText('Analyzing results...');

      setPreview(previewData);

      // Auto-select all candidates that show improvement
      const improvedCandidates = previewData.candidates
        .filter(c => (c.metrics.improvement || 0) > 0)
        .map(c => c.id);
      setSelectedCandidates(new Set(improvedCandidates));

      const totalCandidates = previewData.candidates.length;
      const improvedCount = improvedCandidates.length;

      if (totalCandidates === 0) {
        setPreviewProgressText('⚠ No improvement candidates found');
      } else {
        setPreviewProgressText(`✓ Found ${totalCandidates} candidate(s) - ${improvedCount} showing improvement!`);
      }

      console.log('[GEPAOptimization] Preview generation complete!', {
        candidateCount: totalCandidates,
        improvedCount
      });

      // Clear success message after 5 seconds
      setTimeout(() => setPreviewProgressText(''), 5000);

    } catch (error) {
      console.error('[GEPAOptimization] Error during preview generation:', error);
      setPreviewProgressText('');
      onError(error instanceof GEPAOptimizationError ? error : new GEPAOptimizationError(error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGeneratingPreview(false);
      onLoadingChange(false);
    }
  }, [selectedTasks, iterations, withHuman, optimizationService, onError, onLoadingChange]);

  return (
    <div className="space-y-6">
      {/* Educational Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-900 space-y-3">
            <div>
              <p className="font-semibold text-base mb-2">How GEPA Optimization Works</p>
              <p className="leading-relaxed">
                GEPA (Generalized Evolutionary Prompt Augmentation) automatically improves your AI agents by testing prompt variations against golden examples. The system evaluates each agent using a medical rubric and evolves better prompts through iterative optimization.
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-medium">Three-Step Workflow:</p>
              <ol className="list-decimal list-inside space-y-1.5 ml-2">
                <li><strong>Select & Configure:</strong> Choose which agents to optimize (Quick Letter, Angiogram, TAVI, etc.) and set iteration count (5-10 recommended)</li>
                <li><strong>Generate Preview:</strong> Click "Preview Candidates" to run optimization - GEPA tests variations against your dev set examples and shows before/after metrics</li>
                <li><strong>Review & Apply:</strong> Select candidates with positive improvements (auto-selected for you) and click "Apply Selected" to deploy the optimized prompts</li>
              </ol>
            </div>
            <div className="bg-blue-100 rounded p-3 mt-3">
              <p className="font-medium mb-1">💡 Pro Tip: Add Golden Examples First</p>
              <p className="text-xs leading-relaxed">
                GEPA quality depends on your dev set examples in <code className="bg-blue-200 px-1 rounded">eval/devset/</code>. Add 5-10 high-quality transcript + expected output pairs per agent. Run <code className="bg-blue-200 px-1 rounded">npm run eval:quick-letter</code> first to see baseline scores before optimizing.
              </p>
            </div>
          </div>
        </div>
      </div>

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
      <div className="space-y-2">
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
            <Play className={`w-4 h-4 ${isGeneratingPreview ? 'animate-pulse' : ''}`} />
            <span>{isGeneratingPreview ? 'Optimizing...' : 'Preview Candidates'}</span>
          </button>
        </div>
        {previewProgressText && (
          <div className={`px-4 py-2 rounded-lg text-sm ${
            previewProgressText.startsWith('✓')
              ? 'bg-green-50 text-green-700 border border-green-200'
              : previewProgressText.startsWith('⚠')
              ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {previewProgressText}
          </div>
        )}
      </div>

      {/* Results Display */}
      {preview && preview.candidates.length > 0 ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Optimization Results ({preview.candidates.length} candidate{preview.candidates.length !== 1 ? 's' : ''})
              </h4>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setPreview(null); setSelectedCandidates(new Set()); }}
                  className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Clear Results
                </button>
                <button
                  onClick={applySelectedCandidates}
                  disabled={isApplying || selectedCandidates.size === 0}
                  className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className={`w-4 h-4 ${isApplying ? 'animate-pulse' : ''}`} />
                  <span>{isApplying ? 'Applying...' : `Apply Selected (${selectedCandidates.size})`}</span>
                </button>
              </div>
            </div>
            {applyProgressText && (
              <div className={`px-4 py-2 rounded-lg text-sm ${
                applyProgressText.startsWith('✓')
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : applyProgressText.startsWith('⚠')
                  ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {applyProgressText}
              </div>
            )}
          </div>

          {/* Candidate Cards */}
          <div className="space-y-4">
            {preview.candidates.map((candidate) => {
              const isSelected = selectedCandidates.has(candidate.id);
              const improvement = candidate.metrics.improvement || 0;
              const isImprovement = improvement > 0;
              const taskLabel = AVAILABLE_TASKS.find(t => t.id === candidate.task)?.label || candidate.task;

              return (
                <div
                  key={candidate.id}
                  className={`border-2 rounded-xl overflow-hidden transition-all ${
                    isSelected
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleCandidate(candidate.id)}
                            className="rounded text-emerald-600 w-5 h-5"
                          />
                        </label>
                        <div>
                          <h5 className="font-semibold text-gray-900">{taskLabel}</h5>
                          <p className="text-xs text-gray-600 mt-0.5">Candidate ID: {candidate.id.slice(0, 8)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        {/* Metrics */}
                        {isImprovement ? (
                          <div className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-100 border border-emerald-300 rounded-lg">
                            <TrendingUp className="w-4 h-4 text-emerald-700" />
                            <span className="text-sm font-semibold text-emerald-900">
                              +{improvement.toFixed(1)}% improvement
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 px-3 py-1.5 bg-red-100 border border-red-300 rounded-lg">
                            <XCircle className="w-4 h-4 text-red-700" />
                            <span className="text-sm font-semibold text-red-900">
                              {improvement.toFixed(1)}% change
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <div className="grid grid-cols-4 gap-4 text-center">
                      {candidate.metrics.accuracy !== undefined && (
                        <div>
                          <div className="text-xs text-gray-600">Accuracy</div>
                          <div className="text-lg font-semibold text-gray-900">{candidate.metrics.accuracy.toFixed(1)}%</div>
                        </div>
                      )}
                      {candidate.metrics.completeness !== undefined && (
                        <div>
                          <div className="text-xs text-gray-600">Completeness</div>
                          <div className="text-lg font-semibold text-gray-900">{candidate.metrics.completeness.toFixed(1)}%</div>
                        </div>
                      )}
                      {candidate.metrics.clinical_appropriateness !== undefined && (
                        <div>
                          <div className="text-xs text-gray-600">Clinical</div>
                          <div className="text-lg font-semibold text-gray-900">{candidate.metrics.clinical_appropriateness.toFixed(1)}%</div>
                        </div>
                      )}
                      {candidate.metrics.overall_score !== undefined && (
                        <div>
                          <div className="text-xs text-gray-600">Overall</div>
                          <div className="text-lg font-semibold text-gray-900">{candidate.metrics.overall_score.toFixed(1)}%</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Prompt Comparison */}
                  <div className="p-4">
                    <details className="group">
                      <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900 flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4" />
                        View Prompt Changes
                      </summary>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        {/* Before */}
                        <div>
                          <div className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-red-500" />
                            BEFORE
                          </div>
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-64 overflow-y-auto">
                            <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">{candidate.before}</pre>
                          </div>
                        </div>
                        {/* After */}
                        <div>
                          <div className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                            AFTER (Optimized)
                          </div>
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 max-h-64 overflow-y-auto">
                            <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">{candidate.after}</pre>
                          </div>
                        </div>
                      </div>
                    </details>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : preview && preview.candidates.length === 0 ? (
        <div className="text-center py-8 bg-yellow-50 border border-yellow-200 rounded-lg">
          <Info className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-yellow-900 mb-2">
            No Improvements Found
          </h3>
          <p className="text-yellow-700 max-w-md mx-auto">
            GEPA optimization completed but found no candidates that improve upon current prompts.
            Your agents may already be well-optimized, or you may need more diverse dev set examples.
          </p>
        </div>
      ) : null}
    </div>
  );
};
