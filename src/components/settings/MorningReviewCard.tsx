/**
 * MorningReviewCard - UI Component for Reviewing Overnight Optimization Results
 * 
 * Displays completed overnight optimization jobs with preview/apply workflow
 * for both ASR corrections and GEPA optimization candidates.
 * 
 * Features:
 * - Job status and summary display
 * - ASR corrections preview with approval interface
 * - GEPA optimization candidates with metrics comparison
 * - Rollback functionality for failed optimizations
 * - Batch approval workflows
 */

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, Eye, ThumbsUp, RotateCcw, Clock } from 'lucide-react';
import { OptimizationService } from '@/services/OptimizationService';
import { logger } from '@/utils/Logger';
import type { 
  OvernightJob,
  ASRPreview,
  GEPAPreview,
  GEPACandidate,
  AgentType 
} from '@/types/optimization';

interface MorningReviewCardProps {
  job: OvernightJob;
  onJobUpdate: (jobId: string, status: string) => void;
  onClose?: () => void;
}

type ReviewSection = 'summary' | 'asr' | 'gepa';

export const MorningReviewCard: React.FC<MorningReviewCardProps> = ({
  job,
  onJobUpdate,
  onClose
}) => {
  const optimizationService = OptimizationService.getInstance();
  
  // UI state
  const [activeSection, setActiveSection] = useState<ReviewSection>('summary');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  
  // ASR state
  const [selectedGlossaryTerms, setSelectedGlossaryTerms] = useState<Set<string>>(new Set());
  const [selectedRules, setSelectedRules] = useState<Set<string>>(new Set());
  const [asrApplied, setAsrApplied] = useState(false);
  
  // GEPA state
  const [selectedCandidates, setSelectedCandidates] = useState<Map<AgentType, string>>(new Map());
  const [gepaApplied, setGepaApplied] = useState(false);

  const asrPreview = job.results?.asr_preview as ASRPreview | undefined;
  const gepaPreview = job.results?.gepa_preview as GEPAPreview | undefined;

  // Auto-select high-value items on mount
  useEffect(() => {
    if (asrPreview && !asrApplied) {
      // Auto-select glossary terms with count >= 5
      const highValueTerms = asrPreview.glossary_additions
        .filter(term => term.count >= 5)
        .map(term => term.term);
      setSelectedGlossaryTerms(new Set(highValueTerms));
      
      // Auto-select rules with count >= 3
      const highValueRules = asrPreview.rule_candidates
        .filter(rule => rule.count >= 3)
        .map(rule => `${rule.raw}→${rule.fix}`);
      setSelectedRules(new Set(highValueRules));
    }
  }, [asrPreview, asrApplied]);

  const handleAsrApproval = useCallback(async () => {
    if (!asrPreview) return;
    
    setIsProcessing(true);
    setLastError(null);
    
    try {
      const approvedGlossary = Array.from(selectedGlossaryTerms);
      const approvedRules = Array.from(selectedRules).map(ruleKey => {
        const [raw, fix] = ruleKey.split('→');
        return { raw, fix };
      });

      await optimizationService.applyASRCorrections({
        approve_glossary: approvedGlossary,
        approve_rules: approvedRules
      });

      setAsrApplied(true);
      onJobUpdate(job.job_id, 'ASR corrections applied');
      
      logger.info('ASR corrections applied from morning review', {
        component: 'MorningReviewCard',
        jobId: job.job_id,
        glossaryCount: approvedGlossary.length,
        rulesCount: approvedRules.length
      });
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to apply ASR corrections';
      setLastError(errorMsg);
      logger.error('ASR application failed in morning review', new Error(errorMsg), {
        component: 'MorningReviewCard',
        jobId: job.job_id
      });
    } finally {
      setIsProcessing(false);
    }
  }, [asrPreview, selectedGlossaryTerms, selectedRules, job.job_id, onJobUpdate, optimizationService]);

  const handleGepaApproval = useCallback(async () => {
    if (!gepaPreview || selectedCandidates.size === 0) return;
    
    setIsProcessing(true);
    setLastError(null);
    
    try {
      const accepted = Array.from(selectedCandidates.entries()).map(([task, candidateId]) => ({
        task,
        candidate_id: candidateId
      }));

      await optimizationService.applyGEPAOptimization({ accepted });

      setGepaApplied(true);
      onJobUpdate(job.job_id, 'GEPA optimizations applied');
      
      logger.info('GEPA optimizations applied from morning review', {
        component: 'MorningReviewCard',
        jobId: job.job_id,
        candidatesCount: accepted.length
      });
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to apply GEPA optimizations';
      setLastError(errorMsg);
      logger.error('GEPA application failed in morning review', new Error(errorMsg), {
        component: 'MorningReviewCard',
        jobId: job.job_id
      });
    } finally {
      setIsProcessing(false);
    }
  }, [gepaPreview, selectedCandidates, job.job_id, onJobUpdate, optimizationService]);

  const toggleGlossaryTerm = (term: string) => {
    const newSet = new Set(selectedGlossaryTerms);
    if (newSet.has(term)) {
      newSet.delete(term);
    } else {
      newSet.add(term);
    }
    setSelectedGlossaryTerms(newSet);
  };

  const toggleRule = (raw: string, fix: string) => {
    const ruleKey = `${raw}→${fix}`;
    const newSet = new Set(selectedRules);
    if (newSet.has(ruleKey)) {
      newSet.delete(ruleKey);
    } else {
      newSet.add(ruleKey);
    }
    setSelectedRules(newSet);
  };

  const toggleCandidate = (candidate: GEPACandidate) => {
    const newMap = new Map(selectedCandidates);
    if (newMap.has(candidate.task)) {
      newMap.delete(candidate.task);
    } else {
      newMap.set(candidate.task, candidate.id);
    }
    setSelectedCandidates(newMap);
  };

  const getJobStatusIcon = (status: string) => {
    switch (status) {
      case 'DONE':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'ERROR':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'RUNNING':
        return <Clock className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    }
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    return `${diffMinutes}m`;
  };

  return (
    <div className="glass rounded-2xl p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          {getJobStatusIcon(job.status)}
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Overnight Optimization Results
            </h2>
            <p className="text-sm text-gray-600">
              Job {job.job_id} • {formatDuration(job.started_at, job.completed_at)}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="bg-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all duration-200 ease-out rounded-lg p-2"
          >
            <XCircle className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* Error Display */}
      {lastError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{lastError}</p>
        </div>
      )}

      {/* Section Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
        {[
          { id: 'summary', label: 'Summary', icon: Eye },
          { id: 'asr', label: `ASR Corrections (${asrPreview?.glossary_additions.length || 0})`, icon: ThumbsUp },
          { id: 'gepa', label: `GEPA Candidates (${gepaPreview?.candidates.length || 0})`, icon: RotateCcw }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id as ReviewSection)}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeSection === id
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Summary Section */}
      {activeSection === 'summary' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Job Summary</h3>
              <p className="text-blue-800 text-sm">{job.summary || 'No summary available'}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-900 mb-2">Processing Time</h3>
              <p className="text-green-800 text-sm">
                Started: {new Date(job.started_at).toLocaleString()}
                {job.completed_at && (
                  <>
                    <br />
                    Completed: {new Date(job.completed_at).toLocaleString()}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Results Overview</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• ASR Corrections: {asrPreview?.glossary_additions.length || 0} glossary terms, {asrPreview?.rule_candidates.length || 0} correction rules</li>
              <li>• GEPA Optimization: {gepaPreview?.candidates.length || 0} prompt optimization candidates</li>
              <li>• Status: {asrApplied && gepaApplied ? 'All optimizations applied' : 'Ready for review'}</li>
            </ul>
          </div>
        </div>
      )}

      {/* ASR Section */}
      {activeSection === 'asr' && asrPreview && (
        <div className="space-y-6">
          {!asrApplied ? (
            <>
              {/* Glossary Terms */}
              {asrPreview.glossary_additions.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">
                    Glossary Terms ({asrPreview.glossary_additions.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {asrPreview.glossary_additions.map((term) => (
                      <label
                        key={term.term}
                        className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                          selectedGlossaryTerms.has(term.term)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedGlossaryTerms.has(term.term)}
                          onChange={() => toggleGlossaryTerm(term.term)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">
                          {term.term}
                          <span className="text-gray-500 ml-1">({term.count})</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Correction Rules */}
              {asrPreview.rule_candidates.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">
                    Correction Rules ({asrPreview.rule_candidates.length})
                  </h3>
                  <div className="space-y-2">
                    {asrPreview.rule_candidates.map((rule) => (
                      <label
                        key={`${rule.raw}-${rule.fix}`}
                        className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedRules.has(`${rule.raw}→${rule.fix}`)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedRules.has(`${rule.raw}→${rule.fix}`)}
                          onChange={() => toggleRule(rule.raw, rule.fix)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="text-sm">
                            <span className="text-red-600 line-through">{rule.raw}</span>
                            <span className="mx-2">→</span>
                            <span className="text-green-600">{rule.fix}</span>
                            <span className="text-gray-500 ml-2">({rule.count} corrections)</span>
                          </div>
                          {rule.examples.length > 0 && (
                            <div className="mt-1 text-xs text-gray-600">
                              Example: "{rule.examples[0]}"
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Apply Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleAsrApproval}
                  disabled={isProcessing || (selectedGlossaryTerms.size === 0 && selectedRules.size === 0)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>
                    {isProcessing 
                      ? 'Applying...' 
                      : `Apply ${selectedGlossaryTerms.size + selectedRules.size} Corrections`
                    }
                  </span>
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">ASR Corrections Applied</h3>
              <p className="text-gray-600">
                {selectedGlossaryTerms.size} glossary terms and {selectedRules.size} correction rules have been applied.
              </p>
            </div>
          )}
        </div>
      )}

      {/* GEPA Section */}
      {activeSection === 'gepa' && gepaPreview && (
        <div className="space-y-6">
          {!gepaApplied ? (
            <>
              {gepaPreview.candidates.length > 0 ? (
                <div className="space-y-4">
                  {gepaPreview.candidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        selectedCandidates.has(candidate.task)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900 capitalize">
                            {candidate.task.replace('-', ' ')} Agent
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Improvement: {(candidate.metrics.improvement ?? 0) > 0 ? '+' : ''}{(candidate.metrics.improvement ?? 0).toFixed(1)}%
                          </p>
                        </div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedCandidates.has(candidate.task)}
                            onChange={() => toggleCandidate(candidate)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm">Apply</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-4 gap-3 text-sm">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-blue-600">
                            {candidate.metrics.accuracy?.toFixed(1) || '—'}%
                          </div>
                          <div className="text-gray-600">Accuracy</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-green-600">
                            {candidate.metrics.completeness?.toFixed(1) || '—'}%
                          </div>
                          <div className="text-gray-600">Completeness</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-purple-600">
                            {candidate.metrics.clinical_appropriateness?.toFixed(1) || '—'}%
                          </div>
                          <div className="text-gray-600">Clinical</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-900">
                            {candidate.metrics.overall_score?.toFixed(1) || '—'}%
                          </div>
                          <div className="text-gray-600">Overall</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No GEPA optimization candidates generated.
                </div>
              )}

              {/* Apply Button */}
              {gepaPreview.candidates.length > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={handleGepaApproval}
                    disabled={isProcessing || selectedCandidates.size === 0}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>
                      {isProcessing 
                        ? 'Applying...' 
                        : `Apply ${selectedCandidates.size} Optimizations`
                      }
                    </span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">GEPA Optimizations Applied</h3>
              <p className="text-gray-600">
                {selectedCandidates.size} agent optimizations have been applied successfully.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
