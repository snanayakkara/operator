/**
 * EvaluationDashboard - Visual interface for running evaluations
 *
 * Features:
 * - Run evaluations for any agent with one click
 * - Real-time progress tracking
 * - Visual score display with color-coded metrics
 * - Detailed results breakdown
 * - Historical score tracking
 * - Export evaluation reports
 *
 * Integrates with DSPy evaluation backend.
 */

import React, { useState, useCallback } from 'react';
import {
  Play,
  TrendingUp,
  Minus,
  CheckCircle,
  XCircle,
  Info,
  BarChart3,
  FileText,
  Clock
} from 'lucide-react';
import type { AgentType } from '@/types/optimization';
import { logger } from '@/utils/Logger';

interface EvaluationDashboardProps {
  onError: (error: Error) => void;
  onLoadingChange: (isLoading: boolean) => void;
}

interface EvaluationResult {
  file: string;
  transcript_length: number;
  output_length: number;
  checks: {
    total_score: number;
    max_score: number;
    percentage: number;
    passed: boolean;
    [key: string]: any;
  };
  transcript?: string;
  output?: string;
  expected?: string;
}

interface EvaluationSummary {
  task: string;
  total_examples: number;
  passed_examples: number;
  success_rate: number;
  avg_score: number;
  min_score: number;
  max_score: number;
  results: EvaluationResult[];
  timestamp: string;
}

const AVAILABLE_AGENTS: Array<{ id: AgentType; label: string; description: string }> = [
  { id: 'quick-letter', label: 'Quick Letter', description: 'Medical correspondence' },
  { id: 'angiogram-pci', label: 'Angiogram/PCI', description: 'Cardiac procedures' },
  { id: 'tavi', label: 'TAVI', description: 'Valve procedures' },
  { id: 'consultation', label: 'Consultation', description: 'Patient assessments' },
  { id: 'investigation-summary', label: 'Investigation Summary', description: 'Test summaries' }
];

export const EvaluationDashboard: React.FC<EvaluationDashboardProps> = ({
  onError,
  onLoadingChange
}) => {
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('quick-letter');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResults, setEvaluationResults] = useState<EvaluationSummary | null>(null);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);

  // Run evaluation
  const runEvaluation = useCallback(async () => {
    try {
      setIsEvaluating(true);
      onLoadingChange(true);
      setEvaluationResults(null);

      logger.info('Starting evaluation', {
        component: 'EvaluationDashboard',
        agentType: selectedAgent
      });

      const response = await fetch('http://localhost:8002/v1/dspy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_type: selectedAgent,
          options: {
            fresh_run: false
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Evaluation failed');
      }

      // Parse evaluation results
      const results: EvaluationResult[] = data.results || [];

      const passedCount = results.filter(r => r.checks.passed).length;
      const scores = results.map(r => r.checks.percentage);
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const minScore = scores.length > 0 ? Math.min(...scores) : 0;
      const maxScore = scores.length > 0 ? Math.max(...scores) : 0;

      const summary: EvaluationSummary = {
        task: selectedAgent,
        total_examples: results.length,
        passed_examples: passedCount,
        success_rate: results.length > 0 ? (passedCount / results.length) * 100 : 0,
        avg_score: avgScore,
        min_score: minScore,
        max_score: maxScore,
        results,
        timestamp: new Date().toISOString()
      };

      setEvaluationResults(summary);

      logger.info('Evaluation completed', {
        component: 'EvaluationDashboard',
        agentType: selectedAgent,
        avgScore: avgScore.toFixed(1),
        passRate: summary.success_rate.toFixed(1)
      });

    } catch (error) {
      logger.error('Evaluation failed', {
        component: 'EvaluationDashboard',
        error: error instanceof Error ? error.message : String(error)
      });
      onError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsEvaluating(false);
      onLoadingChange(false);
    }
  }, [selectedAgent, onError, onLoadingChange]);

  // Get score color
  const getScoreColor = useCallback((score: number): string => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }, []);

  const getScoreBgColor = useCallback((score: number): string => {
    if (score >= 80) return 'bg-emerald-100 border-emerald-300';
    if (score >= 70) return 'bg-blue-100 border-blue-300';
    if (score >= 60) return 'bg-yellow-100 border-yellow-300';
    return 'bg-red-100 border-red-300';
  }, []);

  return (
    <div className="space-y-6">
      {/* Educational Header */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-5">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-purple-900 space-y-2">
            <p className="font-semibold">Agent Evaluation</p>
            <p className="leading-relaxed">
              Run evaluations to test your agents against golden examples in the dev set.
              This shows baseline performance before optimization and validates improvements after GEPA optimization.
            </p>
            <div className="bg-purple-100 rounded p-3 mt-2">
              <p className="font-medium mb-1">📊 Scoring</p>
              <ul className="text-xs space-y-1">
                <li><strong className="text-emerald-700">≥80%:</strong> Excellent - Agent is well-optimized</li>
                <li><strong className="text-blue-700">70-79%:</strong> Good - Minor improvements possible</li>
                <li><strong className="text-yellow-700">60-69%:</strong> Fair - Optimization recommended</li>
                <li><strong className="text-red-700">&lt;60%:</strong> Poor - Needs optimization</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Selector + Run Button */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Agent to Evaluate</label>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value as AgentType)}
            disabled={isEvaluating}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          >
            {AVAILABLE_AGENTS.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.label} - {agent.description}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={runEvaluation}
            disabled={isEvaluating}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEvaluating ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                <span>Evaluating...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Run Evaluation</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results Display */}
      {evaluationResults && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            {/* Average Score */}
            <div className={`border-2 rounded-xl p-4 ${getScoreBgColor(evaluationResults.avg_score)}`}>
              <div className="text-xs font-medium text-gray-600 mb-1">Average Score</div>
              <div className={`text-3xl font-bold ${getScoreColor(evaluationResults.avg_score)}`}>
                {evaluationResults.avg_score.toFixed(1)}%
              </div>
            </div>

            {/* Success Rate */}
            <div className={`border-2 rounded-xl p-4 ${getScoreBgColor(evaluationResults.success_rate)}`}>
              <div className="text-xs font-medium text-gray-600 mb-1">Pass Rate</div>
              <div className={`text-3xl font-bold ${getScoreColor(evaluationResults.success_rate)}`}>
                {evaluationResults.success_rate.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {evaluationResults.passed_examples}/{evaluationResults.total_examples} passed
              </div>
            </div>

            {/* Score Range */}
            <div className="border-2 border-gray-200 rounded-xl p-4 bg-gray-50">
              <div className="text-xs font-medium text-gray-600 mb-1">Score Range</div>
              <div className="text-2xl font-bold text-gray-900">
                {evaluationResults.min_score.toFixed(0)}% - {evaluationResults.max_score.toFixed(0)}%
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Min to Max
              </div>
            </div>

            {/* Total Examples */}
            <div className="border-2 border-gray-200 rounded-xl p-4 bg-gray-50">
              <div className="text-xs font-medium text-gray-600 mb-1">Examples</div>
              <div className="text-3xl font-bold text-gray-900">
                {evaluationResults.total_examples}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Total tested
              </div>
            </div>
          </div>

          {/* Overall Assessment */}
          <div className={`border-2 rounded-lg p-4 ${getScoreBgColor(evaluationResults.avg_score)}`}>
            <div className="flex items-center space-x-3">
              {evaluationResults.avg_score >= 80 ? (
                <>
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                  <div>
                    <h4 className="font-semibold text-emerald-900">Excellent Performance</h4>
                    <p className="text-sm text-emerald-800">
                      Agent is performing well. Minor optimizations may still be beneficial.
                    </p>
                  </div>
                </>
              ) : evaluationResults.avg_score >= 70 ? (
                <>
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                  <div>
                    <h4 className="font-semibold text-blue-900">Good Performance</h4>
                    <p className="text-sm text-blue-800">
                      Agent is working well. Consider optimization to reach excellent performance.
                    </p>
                  </div>
                </>
              ) : evaluationResults.avg_score >= 60 ? (
                <>
                  <Minus className="w-6 h-6 text-yellow-600" />
                  <div>
                    <h4 className="font-semibold text-yellow-900">Fair Performance</h4>
                    <p className="text-sm text-yellow-800">
                      Optimization recommended. Run GEPA optimization to improve results.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-6 h-6 text-red-600" />
                  <div>
                    <h4 className="font-semibold text-red-900">Needs Improvement</h4>
                    <p className="text-sm text-red-800">
                      Agent requires optimization. Add more golden examples and run GEPA optimization.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Individual Results */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-600" />
              Individual Results ({evaluationResults.results.length})
            </h4>
            <div className="space-y-2">
              {evaluationResults.results.map((result, index) => (
                <div
                  key={index}
                  className="border-2 border-gray-200 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedResult(expandedResult === result.file ? null : result.file)}
                    className="w-full p-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {result.checks.passed ? (
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{result.file}</div>
                          <div className="text-xs text-gray-500">
                            Transcript: {result.transcript_length} chars | Output: {result.output_length} chars
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className={`text-right ${getScoreColor(result.checks.percentage)}`}>
                          <div className="text-2xl font-bold">{result.checks.percentage.toFixed(1)}%</div>
                          <div className="text-xs text-gray-600">
                            {result.checks.total_score}/{result.checks.max_score} points
                          </div>
                        </div>
                        <FileText className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {expandedResult === result.file && (
                    <div className="border-t-2 border-gray-200 p-4 bg-gray-50 space-y-3">
                      {/* Transcript */}
                      {result.transcript && (
                        <div>
                          <div className="text-xs font-semibold text-gray-700 mb-1">Transcript</div>
                          <div className="bg-white border border-gray-200 rounded p-3 max-h-32 overflow-y-auto">
                            <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
                              {result.transcript}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Generated Output */}
                      {result.output && (
                        <div>
                          <div className="text-xs font-semibold text-gray-700 mb-1">Generated Output</div>
                          <div className="bg-white border border-gray-200 rounded p-3 max-h-32 overflow-y-auto">
                            <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
                              {result.output}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Check Details */}
                      <div>
                        <div className="text-xs font-semibold text-gray-700 mb-2">Check Results</div>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(result.checks)
                            .filter(([key]) => !['total_score', 'max_score', 'percentage', 'passed'].includes(key))
                            .map(([key, value]) => (
                              <div
                                key={key}
                                className="bg-white border border-gray-200 rounded px-3 py-2 flex items-center justify-between"
                              >
                                <span className="text-xs text-gray-700">{key.replace(/_/g, ' ')}</span>
                                <span className="text-xs font-mono font-semibold text-gray-900">
                                  {typeof value === 'boolean' ? (value ? '✓' : '✗') : String(value)}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* No Results State */}
      {!evaluationResults && !isEvaluating && (
        <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-lg">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h4 className="font-medium text-gray-700 mb-2">No Evaluation Results</h4>
          <p className="text-sm text-gray-600 mb-4">
            Select an agent and click "Run Evaluation" to see performance metrics
          </p>
        </div>
      )}
    </div>
  );
};
