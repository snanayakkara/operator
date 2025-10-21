/**
 * OvernightOptimizationCard - Combined ASR + GEPA Overnight Workflow
 * 
 * Provides unified optimization workflow that:
 * 1. Schedules combined ASR + GEPA optimization to run overnight
 * 2. Shows job status and progress tracking
 * 3. Displays morning review interface with all candidates
 * 4. Allows bulk approval/rejection of optimization suggestions
 * 
 * Features:
 * - One-click overnight scheduling
 * - Job progress monitoring with real-time updates
 * - Morning review dashboard combining ASR + GEPA results
 * - Batch approval workflow with summary statistics
 * - Schedule management and history
 */

import React, { useState, useCallback } from 'react';
import { Moon, Calendar } from 'lucide-react';
import { OvernightOptimizationError } from '@/types/optimization';
import type {
  OvernightJob,
  AgentType
} from '@/types/optimization';

interface OvernightOptimizationCardProps {
  onError: (error: OvernightOptimizationError) => void;
  onLoadingChange: (isLoading: boolean) => void;
}

export const OvernightOptimizationCard: React.FC<OvernightOptimizationCardProps> = ({
  onError,
  onLoadingChange
}) => {

  // State
  const [selectedTasks, setSelectedTasks] = useState<Set<AgentType>>(
    new Set(['quick-letter', 'angiogram-pci'])
  );
  const [iterations, setIterations] = useState(5);
  const [currentJob, _setCurrentJob] = useState<OvernightJob | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [_isPolling, _setIsPolling] = useState(false);

  const scheduleOvernight = useCallback(async () => {
    try {
      setIsScheduling(true);
      onLoadingChange(true);

      const request = {
        tasks: Array.from(selectedTasks),
        iterations,
        with_human: false, // Overnight runs without human intervention
        asr: {
          since: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
          maxTerms: 50,
          maxRules: 30
        }
      };

      // TODO: Implement actual overnight optimization scheduling
      console.log('Overnight optimization request:', request);

      // Placeholder for actual implementation
      // const job = await optimizationService.startOvernightOptimization(request);
      // setCurrentJob(job);
      // startPolling(job.job_id);

    } catch (error) {
      onError(error instanceof OvernightOptimizationError ? error : new OvernightOptimizationError(error instanceof Error ? error.message : String(error)));
    } finally {
      setIsScheduling(false);
      onLoadingChange(false);
    }
  }, [selectedTasks, iterations, onError, onLoadingChange]);

  const TASK_OPTIONS: Array<{
    id: AgentType;
    label: string;
    description: string;
  }> = [
    { id: 'angiogram-pci', label: 'Angiogram/PCI', description: 'Most commonly used' },
    { id: 'quick-letter', label: 'Quick Letter', description: 'High optimization potential' },
    { id: 'tavi', label: 'TAVI', description: 'Complex procedures' },
    { id: 'consultation', label: 'Consultation', description: 'Long-form reports' }
  ];

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

  const getNextRunTime = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0); // 2 AM
    return tomorrow.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Current Job Status */}
      {currentJob && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-blue-900">Overnight Job Status</h4>
            <span className={`px-2 py-1 text-xs rounded-full ${
              currentJob.status === 'DONE' ? 'bg-green-100 text-green-800' :
              currentJob.status === 'ERROR' ? 'bg-red-100 text-red-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {currentJob.status}
            </span>
          </div>
          
          <div className="text-sm text-blue-700">
            <div>Job ID: {currentJob.job_id}</div>
            <div>Started: {new Date(currentJob.started_at).toLocaleString()}</div>
            {currentJob.completed_at && (
              <div>Completed: {new Date(currentJob.completed_at).toLocaleString()}</div>
            )}
          </div>

          {currentJob.status === 'DONE' && currentJob.results && (
            <div className="mt-4 p-3 bg-white rounded border">
              <h5 className="font-medium text-gray-900 mb-2">Results Ready for Review</h5>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">ASR Candidates:</span>
                  <span className="ml-2 font-medium">
                    {(currentJob.results.asr_preview?.glossary_additions?.length || 0) +
                     (currentJob.results.asr_preview?.rule_candidates?.length || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">GEPA Candidates:</span>
                  <span className="ml-2 font-medium">
                    {currentJob.results.gepa_preview?.candidates?.length || 0}
                  </span>
                </div>
              </div>
              <button className="mt-3 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                Review & Apply Morning Results
              </button>
            </div>
          )}
        </div>
      )}

      {/* Scheduling Configuration */}
      {!currentJob && (
        <div className="space-y-4">
          {/* Task Selection */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Tasks to Optimize</h4>
            <div className="grid grid-cols-2 gap-3">
              {TASK_OPTIONS.map((task) => {
                const isSelected = selectedTasks.has(task.id);
                return (
                  <label
                    key={task.id}
                    className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'bg-purple-50 border-purple-200' : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleTask(task.id)}
                      className="rounded text-purple-600"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{task.label}</div>
                      <div className="text-xs text-gray-600">{task.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Optimization Intensity
              </label>
              <select
                value={iterations}
                onChange={(e) => setIterations(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
              >
                <option value={3}>Light (3 iterations)</option>
                <option value={5}>Standard (5 iterations)</option>
                <option value={8}>Intensive (8 iterations)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Runtime
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-600">
                {selectedTasks.size * iterations * 2} - {selectedTasks.size * iterations * 4} minutes
              </div>
            </div>
          </div>

          {/* Schedule Info */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <h4 className="font-medium text-purple-900">Next Scheduled Run</h4>
            </div>
            <div className="text-sm text-purple-700">
              <div>Estimated start time: {getNextRunTime()}</div>
              <div>Tasks: {Array.from(selectedTasks).join(', ')}</div>
              <div>Optimization will run automatically and prepare results for morning review</div>
            </div>
          </div>

          {/* Schedule Button */}
          <button
            onClick={scheduleOvernight}
            disabled={isScheduling || selectedTasks.size === 0}
            className="w-full flex items-center justify-center space-x-2 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Moon className="w-5 h-5" />
            <span>{isScheduling ? 'Scheduling...' : 'Schedule Tonight'}</span>
          </button>
        </div>
      )}

      {/* Coming Soon Notice */}
      <div className="text-center py-8 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
        <Moon className="w-12 h-12 text-purple-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-purple-900 mb-2">
          Overnight Optimization
        </h3>
        <p className="text-purple-700 max-w-md mx-auto">
          Set-and-forget optimization that combines ASR corrections and GEPA prompt optimization. 
          Schedule tonight, review results in the morning, and apply approved improvements.
        </p>
        <p className="text-sm text-purple-600 mt-4">
          Implementation in progress - requires job management backend
        </p>
      </div>
    </div>
  );
};
