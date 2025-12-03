/**
 * UnifiedOptimizationWorkflow - Main container for single-page optimization workflow
 *
 * Replaces the 5-tab navigation with a single scrollable page showing all
 * optimization steps in pipeline order. Each step displays status, time estimates,
 * prerequisites, and expandable content.
 */

import React, { useState, useCallback } from 'react';
import { PipelineStatusHeader } from './workflow/PipelineStatusHeader';
import { OptimizationStepCard } from './workflow/OptimizationStepCard';
import { DevSetManagerSection } from '../../components/settings/DevSetManagerSection';
import { EvaluationDashboard } from '../../components/settings/EvaluationDashboard';
import { GEPAOptimizationSection } from '../../components/settings/GEPAOptimizationSection';
import { WhisperTrainingPanel } from './WhisperTrainingPanel';
import { ASROptimizationSection } from '../../components/settings/ASROptimizationSection';

export const UnifiedOptimizationWorkflow: React.FC = () => {
  // Error and loading state management
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleError = useCallback((err: Error) => {
    setError(err);
    console.error('[UnifiedOptimizationWorkflow] Error:', err);
  }, []);

  const handleLoadingChange = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  // Pipeline status summary
  const pipelineSteps = [
    { number: 1, title: 'Transcription', status: 'Last run 3 days ago (97% accuracy)' },
    { number: 2, title: 'Training Data', status: 'Quick Letter ✓ | Angio ⚠️ | TAVI ✗' },
    { number: 3, title: 'Baseline', status: 'Quick Letter 68% | Angio 62% | TAVI not tested' },
    { number: 4, title: 'Optimized', status: 'Quick Letter 76% (+8%) | Angio not optimized' },
    { number: 5, title: 'Validated', status: 'Quick Letter ✓' }
  ];

  return (
    <div className="space-y-6">
      {/* Global Error Display */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900">Error</h3>
              <p className="text-sm text-red-800 mt-1">{error.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="flex-shrink-0 text-red-600 hover:text-red-800"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Global Loading Indicator */}
      {isLoading && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="animate-spin w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <div className="text-sm font-medium text-blue-900">Processing...</div>
          </div>
        </div>
      )}

      {/* Status Header */}
      <PipelineStatusHeader steps={pipelineSteps} />

      {/* Step 1: Transcription Optimization */}
      <OptimizationStepCard
        stepNumber={1}
        title="TRANSCRIPTION OPTIMIZATION"
        timeEstimate="Immediate (corrections) or 8-12h (training)"
        status="ready"
        accentColor="slate"
        plainEnglish="Improve transcription accuracy through real-time corrections and overnight Whisper fine-tuning. Reduces transcription errors before AI processing."
        technical="Two-tier approach: (A) Immediate ASR corrections via glossary/rules, (B) Deep Whisper fine-tuning via LoRA (Low-Rank Adaptation) on MLX."
        statusInfo={
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-ink-primary">📊 Status:</span>{' '}
              <span className="text-emerald-600 font-medium">Ready ✓</span>
            </div>
            <div>
              <span className="font-medium text-ink-primary">Prerequisites:</span>{' '}
              <span className="text-ink-secondary">None for ASR; 50+ audio corrections for training</span>
            </div>
            <div>
              <span className="font-medium text-ink-primary">📅 Last training:</span>{' '}
              <span className="text-ink-secondary">3 days ago</span>{' '}
              <span className="text-emerald-600">Accuracy: 94% → 97% (+3%)</span>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Section Overview */}
          <div className="bg-surface-secondary border-2 border-line-primary rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-line-primary rounded-lg p-4">
                <h4 className="font-semibold text-ink-primary mb-2 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm">
                    A
                  </span>
                  ASR Corrections (Immediate)
                </h4>
                <p className="text-sm text-ink-secondary mb-3">
                  Apply glossary & rules instantly during transcription
                </p>
                <div className="space-y-2 text-xs text-ink-secondary">
                  <div>• No training required</div>
                  <div>• Takes effect immediately</div>
                  <div>• Good for common medical terms</div>
                </div>
              </div>
              <div className="bg-white border border-line-primary rounded-lg p-4">
                <h4 className="font-semibold text-ink-primary mb-2 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-700 font-bold text-sm">
                    B
                  </span>
                  Whisper Fine-tune (Overnight)
                </h4>
                <p className="text-sm text-ink-secondary mb-3">
                  Deep training improves Whisper model itself
                </p>
                <div className="space-y-2 text-xs text-ink-secondary">
                  <div>• Requires audio + corrections</div>
                  <div>• Runs 8-12h overnight</div>
                  <div>• Improves model fundamentally</div>
                </div>
              </div>
            </div>
          </div>

          {/* ASR Corrections Info (Section A) */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-5">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-900 mb-1">ASR Corrections (Section A)</h4>
                <p className="text-sm text-blue-800 mb-2">
                  ASR corrections are collected automatically as you use the extension. As you correct transcriptions in the main UI,
                  they're saved and can be batch-applied via glossary/rules. These corrections also feed into the Whisper training dataset (Section B).
                </p>
                <div className="mt-3 text-xs text-blue-700 bg-blue-100 rounded px-3 py-2">
                  <strong>To manage corrections:</strong> Go to Settings → Optimization → ASR Corrections tab to view, edit, and export your corrections.
                </div>
              </div>
            </div>
          </div>

          {/* ASR Corrections Manager */}
          <div className="bg-white border-2 border-line-primary rounded-xl p-6">
            <div className="mb-4 pb-4 border-b border-line-primary">
              <h4 className="font-semibold text-ink-primary text-lg">ASR Corrections Manager</h4>
              <p className="text-sm text-ink-secondary mt-1">
                Review, batch-apply, and upload corrections collected from day-to-day usage. This replaces the old tabbed
                interface so the full ASR workflow stays inside Step 1.
              </p>
            </div>
            <ASROptimizationSection onError={handleError} onLoadingChange={handleLoadingChange} />
          </div>

          {/* Whisper Training Panel (Section B) */}
          <div className="bg-white border-2 border-line-primary rounded-xl p-6">
            <WhisperTrainingPanel />
          </div>
        </div>
      </OptimizationStepCard>

      {/* Step 2: Create Agent Training Examples */}
      <OptimizationStepCard
        stepNumber={2}
        title="CREATE AGENT TRAINING EXAMPLES"
        timeEstimate="5-10 min per agent"
        status="ready"
        accentColor="emerald"
        plainEnglish="Show AI agents what perfect output looks like for your dictations."
        technical="Golden examples for DSPy dev set - transcript/output pairs for evaluation."
        statusInfo={
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-ink-primary">Status by Agent:</span>
            </div>
            <ul className="space-y-1 ml-4 text-ink-secondary">
              <li>• Quick Letter: 7 examples <span className="text-emerald-600">✓ Ready</span></li>
              <li>• Angiogram/PCI: 3 examples <span className="text-yellow-600">⚠️ Need 2 more</span></li>
              <li>• TAVI: 0 examples <span className="text-red-600">✗ Not started</span></li>
            </ul>
          </div>
        }
      >
        <DevSetManagerSection onError={handleError} onLoadingChange={handleLoadingChange} />
      </OptimizationStepCard>

      {/* Step 3: Measure Agent Performance */}
      <OptimizationStepCard
        stepNumber={3}
        title="MEASURE AGENT PERFORMANCE"
        timeEstimate="~1 min per agent"
        status="ready"
        accentColor="blue"
        plainEnglish="Test how well agents perform on your training examples right now."
        technical="DSPy evaluation - runs examples through agent, scores with medical rubric."
        statusInfo={
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-ink-primary">Last Results:</span>
            </div>
            <ul className="space-y-1 ml-4 text-ink-secondary">
              <li>• Quick Letter: 68% <span className="text-yellow-600">(Good foundation)</span></li>
              <li>• Angio/PCI: 62% <span className="text-yellow-600">(Needs optimization)</span></li>
              <li>• TAVI: Not tested</li>
            </ul>
          </div>
        }
      >
        <EvaluationDashboard onError={handleError} onLoadingChange={handleLoadingChange} />
      </OptimizationStepCard>

      {/* Step 4: Auto-Improve Agent Instructions */}
      <OptimizationStepCard
        stepNumber={4}
        title="AUTO-IMPROVE AGENT INSTRUCTIONS"
        timeEstimate="2-3 min per agent"
        status="ready"
        accentColor="purple"
        plainEnglish="Let AI test different instruction variations to find what works best."
        technical="GEPA (Generalized Evolutionary Prompt Augmentation) via DSPy MIPRO."
        statusInfo={
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-ink-primary">Prerequisites:</span>{' '}
              <span className="text-ink-secondary">Baseline score from Step 3</span>
            </div>
            <div>
              <span className="font-medium text-ink-primary">Last Results:</span>
            </div>
            <ul className="space-y-1 ml-4 text-ink-secondary">
              <li>• Quick Letter: 68% → 76% <span className="text-emerald-600">(+8%)</span></li>
              <li>• Angio/PCI: Not optimized</li>
            </ul>
          </div>
        }
      >
        <GEPAOptimizationSection onError={handleError} onLoadingChange={handleLoadingChange} />
      </OptimizationStepCard>

      {/* Step 5: Validate Improvement */}
      <OptimizationStepCard
        stepNumber={5}
        title="VALIDATE IMPROVEMENT"
        timeEstimate="~1 min per agent"
        status="ready"
        accentColor="teal"
        plainEnglish="Re-test to confirm optimization worked as expected."
        technical="Re-run evaluation with optimized prompts, compare to baseline."
        statusInfo={
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-ink-primary">Prerequisites:</span>{' '}
              <span className="text-ink-secondary">Completed optimization from Step 4</span>
            </div>
            <div>
              <span className="font-medium text-ink-primary">Last Validation:</span>{' '}
              <span className="text-emerald-600">Quick Letter ✓</span>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Info Banner */}
          <div className="bg-teal-50 border-2 border-teal-200 rounded-lg p-5">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-teal-900 mb-1">How Validation Works</h4>
                <p className="text-sm text-teal-800 mb-2">
                  After applying optimizations in Step 4, re-run the evaluation (same as Step 3) to confirm improvements.
                  Compare the new scores against your baseline from Step 3.
                </p>
                <div className="mt-3 space-y-1 text-xs text-teal-700">
                  <div><strong>Good improvement:</strong> +5% or higher compared to baseline</div>
                  <div><strong>Marginal improvement:</strong> +1-4% (consider re-optimizing with more examples)</div>
                  <div><strong>No change or worse:</strong> Rollback and adjust dev set examples</div>
                </div>
              </div>
            </div>
          </div>

          {/* Re-use Evaluation Dashboard */}
          <div className="bg-white border-2 border-line-primary rounded-xl p-6">
            <div className="mb-4 pb-4 border-b border-line-primary">
              <h4 className="font-semibold text-ink-primary text-lg">Re-Run Evaluation</h4>
              <p className="text-sm text-ink-secondary mt-1">
                Test optimized agents to validate improvements. Same evaluation as Step 3, but with optimized prompts.
              </p>
            </div>
            <EvaluationDashboard onError={handleError} onLoadingChange={handleLoadingChange} />
          </div>
        </div>
      </OptimizationStepCard>
    </div>
  );
};
