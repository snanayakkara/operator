/**
 * OptimizationDashboard - Comprehensive optimization interface
 *
 * Combines transcription corrections management with DSPy/GEPA optimization features:
 * - View and edit ASR transcription corrections
 * - Trigger Whisper fine-tuning via DSPy server
 * - GEPA prompt optimization
 * - Overnight optimization jobs
 */

import React, { useState } from 'react';
import { FileEdit, Sparkles, Zap, Info, FolderOpen, BarChart3 } from 'lucide-react';
import { FullPageCorrectionsViewer } from './FullPageCorrectionsViewer';
import { FullPageOptimizationPanel } from './FullPageOptimizationPanel';
import { DevSetManagerSection } from '../../components/settings/DevSetManagerSection';
import { EvaluationDashboard } from '../../components/settings/EvaluationDashboard';

type OptimizationView = 'corrections' | 'dspy' | 'devset' | 'evaluation';

export const OptimizationDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<OptimizationView>('corrections');

  return (
    <div className="space-y-6">
      {/* Header with View Selector */}
      <div className="bg-surface-secondary border-2 border-line-primary rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-ink-primary">Optimization Center</h2>
            <p className="text-sm text-ink-secondary mt-1">
              Manage transcription corrections and trigger AI optimization
            </p>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveView('devset')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeView === 'devset'
                ? 'bg-white shadow-sm text-ink-primary border-2 border-line-primary'
                : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-tertiary'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span className="font-medium">Dev Set Manager</span>
          </button>

          <button
            onClick={() => setActiveView('evaluation')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeView === 'evaluation'
                ? 'bg-white shadow-sm text-ink-primary border-2 border-line-primary'
                : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-tertiary'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="font-medium">Evaluation</span>
          </button>

          <button
            onClick={() => setActiveView('dspy')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeView === 'dspy'
                ? 'bg-white shadow-sm text-ink-primary border-2 border-line-primary'
                : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-tertiary'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span className="font-medium">GEPA Optimization</span>
          </button>

          <button
            onClick={() => setActiveView('corrections')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeView === 'corrections'
                ? 'bg-white shadow-sm text-ink-primary border-2 border-line-primary'
                : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-tertiary'
            }`}
          >
            <FileEdit className="w-4 h-4" />
            <span className="font-medium">ASR Corrections</span>
          </button>
        </div>

        {/* Info Banners */}
        {activeView === 'devset' && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-emerald-800 space-y-1">
                <p className="font-medium">Golden Examples for Optimization</p>
                <p>
                  Add high-quality transcript + expected output pairs for each agent. These examples are used by GEPA to evaluate and improve agent performance.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeView === 'evaluation' && (
          <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-purple-800 space-y-1">
                <p className="font-medium">Test Agent Performance</p>
                <p>
                  Run evaluations to see how your agents perform against golden examples. Use this to establish baseline scores before optimization and validate improvements after.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeView === 'dspy' && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 space-y-1">
                <p className="font-medium">DSPy Server Required</p>
                <p>
                  Start the DSPy server at <code className="px-1.5 py-0.5 bg-blue-100 rounded font-mono">localhost:8002</code> to use GEPA optimization features.
                </p>
                <code className="block mt-2 px-3 py-2 bg-blue-100 rounded font-mono text-xs">
                  npm run dspy:server:start
                </code>
              </div>
            </div>
          </div>
        )}

        {activeView === 'corrections' && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Zap className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-emerald-800 space-y-1">
                <p className="font-medium">How to collect corrections</p>
                <p>
                  After each recording, use the <strong>Perfect</strong>, <strong>Edit</strong>, or <strong>Skip</strong> buttons on the transcription to mark quality. Edited transcriptions appear here and can be used to improve Whisper's accuracy.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="min-h-[600px]">
        {/* Conditionally render only the active view to prevent multiple simultaneous initializations */}
        {activeView === 'devset' && (
          <DevSetManagerSection
            onError={(error) => console.error('DevSet error:', error)}
            onLoadingChange={(loading) => console.log('DevSet loading:', loading)}
          />
        )}
        {activeView === 'evaluation' && (
          <EvaluationDashboard
            onError={(error) => console.error('Evaluation error:', error)}
            onLoadingChange={(loading) => console.log('Evaluation loading:', loading)}
          />
        )}
        {activeView === 'dspy' && (
          <FullPageOptimizationPanel />
        )}
        {activeView === 'corrections' && (
          <FullPageCorrectionsViewer />
        )}
      </div>
    </div>
  );
};
