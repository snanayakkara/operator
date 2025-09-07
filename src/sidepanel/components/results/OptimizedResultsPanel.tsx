/**
 * Optimized Results Panel Component
 * 
 * Streamlined composition of focused subcomponents:
 * - Uses React.memo for all expensive components
 * - Minimal re-renders through component isolation
 * - Clean separation of concerns
 * - Better performance through focused updates
 */

import React, { memo, useState, useMemo, useCallback, useEffect } from 'react';
import { FileTextIcon, AlertCircleIcon, CheckIcon, SquareIcon } from '../icons/OptimizedIcons';
import { EyeOff, Eye, Download, Users } from 'lucide-react';
import AnimatedCopyIcon from '../../components/AnimatedCopyIcon';
import { ProcessingTimeDisplay } from '../ProcessingTimeDisplay';
import { MetricsService } from '@/services/MetricsService';
import {
  ReportDisplay,
  TranscriptionSection,
  AIReviewCards,
  ActionButtons,
  WarningsPanel,
  TroubleshootingSection
} from './index';
import type { AgentType, FailedAudioRecording } from '@/types/medical.types';
import { MissingInfoPanel } from './MissingInfoPanel';

interface OptimizedResultsPanelProps {
  results: string;
  resultsSummary?: string;
  agentType: AgentType | null;
  onCopy: (text: string) => void;
  onInsertToEMR: (text: string) => void;
  warnings?: string[];
  onDismissWarnings?: () => void;
  // Session viewing indicators
  selectedSessionId?: string | null;
  selectedPatientName?: string;
  originalTranscription?: string;
  onTranscriptionCopy?: (text: string) => void;
  onTranscriptionInsert?: (text: string) => void;
  onTranscriptionEdit?: (text: string) => void;
  currentAgent?: AgentType | null;
  onAgentReprocess?: (agentType: AgentType) => void;
  // Missing info interactive completion
  missingInfo?: any | null;
  onReprocessWithAnswers?: (answers: Record<string, string>) => void;
  onDismissMissingInfo?: () => void;
  isProcessing?: boolean;
  failedAudioRecordings?: FailedAudioRecording[];
  onClearFailedRecordings?: () => void;
  errors?: string[];
  reviewData?: any;
  audioBlob?: Blob | null;
  // Performance metrics data
  transcriptionTime?: number | null;
  agentProcessingTime?: number | null;
  totalProcessingTime?: number | null;
  processingStatus?: string;
  currentAgentName?: string | null;
  // Patient version generation
  patientVersion?: string | null;
  isGeneratingPatientVersion?: boolean;
  onGeneratePatientVersion?: () => void;
}

const OptimizedResultsPanel: React.FC<OptimizedResultsPanelProps> = memo(({
  results,
  resultsSummary = '',
  agentType,
  onCopy,
  onInsertToEMR,
  warnings = [],
  onDismissWarnings,
  selectedSessionId = null,
  selectedPatientName = '',
  originalTranscription,
  onTranscriptionCopy,
  onTranscriptionInsert,
  onTranscriptionEdit,
  currentAgent,
  onAgentReprocess,
  missingInfo,
  onReprocessWithAnswers,
  onDismissMissingInfo,
  isProcessing = false,
  failedAudioRecordings = [],
  onClearFailedRecordings,
  errors = [],
  reviewData,
  audioBlob,
  // Performance metrics data
  transcriptionTime = null,
  agentProcessingTime = null,
  totalProcessingTime = null,
  processingStatus = 'idle',
  currentAgentName = null,
  // Patient version generation
  patientVersion = null,
  isGeneratingPatientVersion = false,
  onGeneratePatientVersion
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Store metrics when processing completes
  useEffect(() => {
    const storeMetrics = async () => {
      if (
        processingStatus === 'complete' && 
        totalProcessingTime && 
        transcriptionTime && 
        agentProcessingTime && 
        agentType
      ) {
        const metricsService = MetricsService.getInstance();
        await metricsService.storeMetric({
          agentType,
          transcriptionTime,
          processingTime: agentProcessingTime,
          totalDuration: totalProcessingTime,
          modelUsed: currentAgentName || 'Unknown',
          success: true
        });
      }
    };

    storeMetrics().catch(error => {
      console.error('Failed to store metrics:', error);
    });
  }, [processingStatus, totalProcessingTime, transcriptionTime, agentProcessingTime, agentType, currentAgentName]);

  // Memoized calculations for performance
  const reportMetrics = useMemo(() => {
    const wordCount = results.split(/\s+/).filter(word => word.length > 0).length;
    const readingTime = Math.ceil(wordCount / 200);
    return { wordCount, readingTime };
  }, [results]);

  // State for button feedback
  const [summaryButtonStates, setSummaryButtonStates] = useState({
    copied: false,
    inserted: false
  });
  const [letterButtonStates, setLetterButtonStates] = useState({
    copied: false,
    inserted: false
  });
  const [patientVersionButtonStates, setPatientVersionButtonStates] = useState({
    copied: false,
    inserted: false
  });

  // Button action handlers with feedback
  const handleSummaryCopy = useCallback(async () => {
    const summaryToCopy = resultsSummary || 'No summary available';
    await onCopy(summaryToCopy);
    setSummaryButtonStates(prev => ({ ...prev, copied: true }));
    setTimeout(() => setSummaryButtonStates(prev => ({ ...prev, copied: false })), 2000);
  }, [onCopy, resultsSummary]);

  const handleSummaryInsert = useCallback(async () => {
    const summaryToInsert = resultsSummary || 'No summary available';
    await onInsertToEMR(summaryToInsert);
    setSummaryButtonStates(prev => ({ ...prev, inserted: true }));
    setTimeout(() => setSummaryButtonStates(prev => ({ ...prev, inserted: false })), 2000);
  }, [onInsertToEMR, resultsSummary]);

  const handleLetterCopy = useCallback(async () => {
    await onCopy(results);
    setLetterButtonStates(prev => ({ ...prev, copied: true }));
    setTimeout(() => setLetterButtonStates(prev => ({ ...prev, copied: false })), 2000);
  }, [onCopy, results]);

  const handleLetterInsert = useCallback(async () => {
    await onInsertToEMR(results);
    setLetterButtonStates(prev => ({ ...prev, inserted: true }));
    setTimeout(() => setLetterButtonStates(prev => ({ ...prev, inserted: false })), 2000);
  }, [onInsertToEMR, results]);

  const handleSummaryDownload = useCallback(() => {
    const blob = new Blob([resultsSummary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medical-summary-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [resultsSummary]);

  const handleLetterDownload = useCallback(() => {
    const blob = new Blob([results], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medical-letter-${agentType || 'report'}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [results, agentType]);

  // Patient version handlers
  const handlePatientVersionCopy = useCallback(async () => {
    if (patientVersion) {
      await onCopy(patientVersion);
      setPatientVersionButtonStates(prev => ({ ...prev, copied: true }));
      setTimeout(() => setPatientVersionButtonStates(prev => ({ ...prev, copied: false })), 2000);
    }
  }, [onCopy, patientVersion]);

  const handlePatientVersionInsert = useCallback(async () => {
    if (patientVersion) {
      await onInsertToEMR(patientVersion);
      setPatientVersionButtonStates(prev => ({ ...prev, inserted: true }));
      setTimeout(() => setPatientVersionButtonStates(prev => ({ ...prev, inserted: false })), 2000);
    }
  }, [onInsertToEMR, patientVersion]);

  const handlePatientVersionDownload = useCallback(() => {
    if (patientVersion) {
      const blob = new Blob([patientVersion], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `patient-version-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [patientVersion]);

  // Check if this is an AI Review result
  const isAIReview = agentType === 'ai-medical-review' && reviewData;
  
  // Debug AI Review detection
  console.log('🔍 RESULTS PANEL: AI Review detection:', {
    agentType,
    isAIReview,
    hasReviewData: !!reviewData,
    reviewDataType: typeof reviewData,
    reviewDataKeys: reviewData ? Object.keys(reviewData) : null,
    findingsArray: reviewData?.findings,
    findingsLength: reviewData?.findings?.length || 0
  });
  
  // Check if this is a Quick Letter with dual cards
  // Always use dual cards for QuickLetter, even with empty/short summary
  const isQuickLetterDualCards = agentType === 'quick-letter' && results;
  
  // Debug the display logic decision
  console.log('🖼️ DISPLAY LOGIC: OptimizedResultsPanel display decision', {
    agentType,
    isQuickLetterDualCards,
    hasResultsSummary: !!resultsSummary,
    resultsSummaryLength: resultsSummary?.length || 0,
    resultsSummaryPreview: resultsSummary?.substring(0, 100) + '...',
    resultsLength: results?.length || 0,
    resultsPreview: results?.substring(0, 100) + '...',
    willUseDualCards: isQuickLetterDualCards
  });
  
  // Determine readiness of final results for auto-collapse behavior
  const quickLetterReady = agentType === 'quick-letter' && !!results && !!resultsSummary;
  const genericReady = agentType !== 'quick-letter' && !!results;
  const resultsReady = quickLetterReady || genericReady;
  
  // Transcription display logic optimized for performance
  
  // Display logic calculations (debug logging removed for performance)

  const renderHeader = () => (
    <div className="p-4 border-b border-emerald-200/50">
      {/* Selected Session Indicator */}
      {selectedSessionId && selectedPatientName && (
        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Eye className="w-3 h-3 text-blue-600" />
            <span className="text-blue-800 text-xs font-medium">
              Viewing session for: {selectedPatientName}
            </span>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isAIReview ? (
            <>
              <AlertCircleIcon className="w-4 h-4 text-blue-600" />
              <div>
                <h3 className="text-gray-900 font-medium text-sm">
                  {reviewData.isBatchReview ? 'Batch AI Medical Review' : 'AI Medical Review'}
                </h3>
                <p className="text-blue-700 text-xs">
                  {reviewData.isBatchReview 
                    ? 'Multi-patient clinical oversight recommendations' 
                    : 'Australian clinical oversight recommendations'}
                </p>
              </div>
            </>
          ) : (
            <>
              <FileTextIcon className="w-4 h-4 text-emerald-600" />
              <div>
                <h3 className="text-gray-900 font-medium text-sm">Final Proof</h3>
                <p className="text-emerald-700 text-xs">
                  {selectedSessionId ? 'Viewing previous session' : 'Processed output ready for review'}
                </p>
              </div>
            </>
          )}
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="bg-white/60 border border-emerald-200 p-2 rounded-lg hover:bg-emerald-50/60 transition-colors"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? (
            <EyeOff className="w-4 h-4 text-emerald-600" />
          ) : (
            <Eye className="w-4 h-4 text-emerald-600" />
          )}
        </button>
      </div>
      
      {/* Stats */}
      <div className="flex items-center space-x-4 mt-2 text-xs">
        {isAIReview ? (
          <div className="text-blue-600 flex items-center space-x-2">
            <span>{reviewData.findings.length} clinical findings</span>
            <span>•</span>
            <span>{reviewData.findings.filter((f: any) => f.urgency === 'Immediate').length} immediate</span>
            {reviewData.isBatchReview && reviewData.batchSummary && (
              <>
                <span>•</span>
                <span>{reviewData.batchSummary.totalPatients} patients</span>
              </>
            )}
            <span>•</span>
            <span>{new Date().toLocaleTimeString()}</span>
            {warnings.length > 0 && <span>•</span>}
          </div>
        ) : (
          <div className="text-emerald-600 flex items-center space-x-2">
            <span>{reportMetrics.wordCount} words</span>
            <span>•</span>
            <span>{reportMetrics.readingTime} min read</span>
            <span>•</span>
            <span>{new Date().toLocaleTimeString()}</span>
            {warnings.length > 0 && <span>•</span>}
          </div>
        )}
        
        {/* Warning Badge */}
        {warnings.length > 0 && (
          <WarningsPanel 
            warnings={warnings} 
            onDismissWarnings={onDismissWarnings} 
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="letter-card rounded-2xl overflow-hidden shadow-lg border">
      {renderHeader()}
      
      {/* Original Transcription Section */}
      {originalTranscription && (
        <TranscriptionSection
          originalTranscription={originalTranscription}
          onTranscriptionCopy={onTranscriptionCopy}
          onTranscriptionInsert={onTranscriptionInsert}
          onAgentReprocess={onAgentReprocess}
          currentAgent={currentAgent}
          isProcessing={isProcessing}
          audioBlob={audioBlob}
          defaultExpanded={!resultsReady}
          collapseWhen={resultsReady}
        />
      )}

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {/* Missing Information Panel for interactive completion */}
          {missingInfo && (
            missingInfo.missing_diagnostic?.length > 0 || 
            missingInfo.missing_intervention?.length > 0 ||
            missingInfo.missing_purpose?.length > 0 ||
            missingInfo.missing_clinical?.length > 0 ||
            missingInfo.missing_recommendations?.length > 0
          ) && (
            <div className="mb-4">
              <MissingInfoPanel
                missingInfo={missingInfo}
                onSubmit={(answers) => onReprocessWithAnswers && onReprocessWithAnswers(answers)}
                onDismiss={onDismissMissingInfo}
              />
            </div>
          )}

          {isAIReview ? (
            <>
              {console.log('🖼️ RESULTS PANEL: Rendering AIReviewCards with data:', reviewData)}
              <AIReviewCards reviewData={reviewData} />
            </>
          ) : agentType === 'quick-letter' && results ? (
            // Quick Letter dual cards display
            (() => {
              console.log('✅ DISPLAY: Using QuickLetter dual-card display');
              return null; // This will be replaced by the actual content
            })(),
            <div className="space-y-4">
              {/* Summary Card */}
              <div className="letter-card rounded-lg border border-emerald-200 bg-emerald-50">
                <div className="p-3 border-b border-emerald-200 bg-emerald-100">
                  <h4 className="text-emerald-800 font-semibold text-sm">Summary</h4>
                </div>
                <div className="p-3 max-h-48 overflow-y-auto">
                  <div className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap">
                    {resultsSummary || (
                      <div className="text-gray-500 italic">
                        Summary not available - displaying full letter content below
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-3 border-t border-emerald-200 bg-emerald-50">
                  <div className="grid grid-cols-3 gap-2">
                    {/* Copy Summary Button */}
                    <button
                      onClick={handleSummaryCopy}
                      className={`
                        p-3 rounded-lg flex flex-col items-center space-y-1 transition-all border btn-micro-press btn-micro-hover
                        ${summaryButtonStates.copied 
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-700 btn-success-animation completion-celebration' 
                          : 'bg-white/60 border-emerald-200 hover:bg-emerald-50/60 text-gray-700'
                        }
                      `}
                    >
                      {summaryButtonStates.copied ? (
                        <CheckIcon className="w-4 h-4 text-emerald-600 checkmark-appear" />
                      ) : (
                        <AnimatedCopyIcon className="w-4 h-4" title="Copy" />
                      )}
                      <span className={`text-xs ${summaryButtonStates.copied ? 'text-emerald-700' : 'text-gray-700'}`}>
                        {summaryButtonStates.copied ? 'Copied!' : 'Copy'}
                      </span>
                    </button>

                    {/* Insert Summary Button */}
                    <button
                      onClick={handleSummaryInsert}
                      className={`
                        p-3 rounded-lg flex flex-col items-center space-y-1 transition-all border btn-micro-press btn-micro-hover
                        ${summaryButtonStates.inserted 
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-700 btn-success-animation completion-celebration' 
                          : 'bg-white/60 border-emerald-200 hover:bg-emerald-50/60 text-gray-700'
                        }
                      `}
                    >
                      {summaryButtonStates.inserted ? (
                        <CheckIcon className="w-4 h-4 text-emerald-600 checkmark-appear" />
                      ) : (
                        <SquareIcon className="w-4 h-4" />
                      )}
                      <span className={`text-xs ${summaryButtonStates.inserted ? 'text-emerald-700' : 'text-gray-700'}`}>
                        {summaryButtonStates.inserted ? 'Inserted!' : 'Insert'}
                      </span>
                    </button>

                    {/* Download Summary Button */}
                    <button
                      onClick={handleSummaryDownload}
                      className="bg-white/60 border border-emerald-200 p-3 rounded-lg flex flex-col items-center space-y-1 hover:bg-emerald-50/60 transition-colors btn-micro-press btn-micro-hover"
                    >
                      <Download className="w-4 h-4 text-gray-700" />
                      <span className="text-xs text-gray-700">Download</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Letter Card */}
              <div className="letter-card rounded-lg border border-blue-200 bg-blue-50">
                <div className="p-3 border-b border-blue-200 bg-blue-100">
                  <h4 className="text-blue-800 font-semibold text-sm">Letter</h4>
                </div>
                <div className="p-3 max-h-96 overflow-y-auto">
                  <div className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap">
                    {results}
                  </div>
                </div>
                <div className="p-3 border-t border-blue-200 bg-blue-50">
                  <div className="grid grid-cols-3 gap-2">
                    {/* Copy Letter Button */}
                    <button
                      onClick={handleLetterCopy}
                      className={`
                        p-3 rounded-lg flex flex-col items-center space-y-1 transition-all border btn-micro-press btn-micro-hover
                        ${letterButtonStates.copied 
                          ? 'bg-blue-500/20 border-blue-400 text-blue-700 btn-success-animation completion-celebration' 
                          : 'bg-white/60 border-blue-200 hover:bg-blue-50/60 text-gray-700'
                        }
                      `}
                    >
                      {letterButtonStates.copied ? (
                        <CheckIcon className="w-4 h-4 text-blue-600 checkmark-appear" />
                      ) : (
                        <AnimatedCopyIcon className="w-4 h-4" title="Copy" />
                      )}
                      <span className={`text-xs ${letterButtonStates.copied ? 'text-blue-700' : 'text-gray-700'}`}>
                        {letterButtonStates.copied ? 'Copied!' : 'Copy'}
                      </span>
                    </button>

                    {/* Insert Letter Button */}
                    <button
                      onClick={handleLetterInsert}
                      className={`
                        p-3 rounded-lg flex flex-col items-center space-y-1 transition-all border btn-micro-press btn-micro-hover
                        ${letterButtonStates.inserted 
                          ? 'bg-blue-500/20 border-blue-400 text-blue-700 btn-success-animation completion-celebration' 
                          : 'bg-white/60 border-blue-200 hover:bg-blue-50/60 text-gray-700'
                        }
                      `}
                    >
                      {letterButtonStates.inserted ? (
                        <CheckIcon className="w-4 h-4 text-blue-600 checkmark-appear" />
                      ) : (
                        <SquareIcon className="w-4 h-4" />
                      )}
                      <span className={`text-xs ${letterButtonStates.inserted ? 'text-blue-700' : 'text-gray-700'}`}>
                        {letterButtonStates.inserted ? 'Inserted!' : 'Insert'}
                      </span>
                    </button>

                    {/* Generate Patient Version Button */}
                    <button
                      onClick={onGeneratePatientVersion}
                      disabled={isGeneratingPatientVersion}
                      className={`
                        p-3 rounded-lg flex flex-col items-center space-y-1 transition-all border btn-micro-press btn-micro-hover
                        ${isGeneratingPatientVersion 
                          ? 'bg-blue-100/60 border-blue-300 text-blue-500 cursor-not-allowed' 
                          : 'bg-white/60 border-blue-200 hover:bg-blue-50/60 text-gray-700'
                        }
                      `}
                    >
                      {isGeneratingPatientVersion ? (
                        <>
                          <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-xs text-blue-500">Generating</span>
                        </>
                      ) : (
                        <>
                          <Users className="w-4 h-4 text-gray-700" />
                          <span className="text-xs text-gray-700">Patient Version</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Patient Version Card */}
              {patientVersion && (
                <div className="letter-card rounded-lg border border-purple-200 bg-purple-50">
                  <div className="p-3 border-b border-purple-200 bg-purple-100">
                    <h4 className="text-purple-800 font-semibold text-sm">Patient-Friendly Version</h4>
                  </div>
                  <div className="p-3 max-h-96 overflow-y-auto">
                    <div className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap">
                      {patientVersion}
                    </div>
                  </div>
                  <div className="p-3 border-t border-purple-200 bg-purple-50">
                    <div className="grid grid-cols-3 gap-2">
                      {/* Copy Patient Version Button */}
                      <button
                        onClick={handlePatientVersionCopy}
                        className={`
                          p-3 rounded-lg flex flex-col items-center space-y-1 transition-all border btn-micro-press btn-micro-hover
                          ${patientVersionButtonStates.copied 
                            ? 'bg-purple-500/20 border-purple-400 text-purple-700 btn-success-animation completion-celebration' 
                            : 'bg-white/60 border-purple-200 hover:bg-purple-50/60 text-gray-700'
                          }
                        `}
                      >
                        {patientVersionButtonStates.copied ? (
                          <CheckIcon className="w-4 h-4 text-purple-600 checkmark-appear" />
                        ) : (
                          <AnimatedCopyIcon className="w-4 h-4" title="Copy" />
                        )}
                        <span className={`text-xs ${patientVersionButtonStates.copied ? 'text-purple-700' : 'text-gray-700'}`}>
                          {patientVersionButtonStates.copied ? 'Copied!' : 'Copy'}
                        </span>
                      </button>

                      {/* Insert Patient Version Button */}
                      <button
                        onClick={handlePatientVersionInsert}
                        className={`
                          p-3 rounded-lg flex flex-col items-center space-y-1 transition-all border btn-micro-press btn-micro-hover
                          ${patientVersionButtonStates.inserted 
                            ? 'bg-purple-500/20 border-purple-400 text-purple-700 btn-success-animation completion-celebration' 
                            : 'bg-white/60 border-purple-200 hover:bg-purple-50/60 text-gray-700'
                          }
                        `}
                      >
                        {patientVersionButtonStates.inserted ? (
                          <CheckIcon className="w-4 h-4 text-purple-600 checkmark-appear" />
                        ) : (
                          <SquareIcon className="w-4 h-4" />
                        )}
                        <span className={`text-xs ${patientVersionButtonStates.inserted ? 'text-purple-700' : 'text-gray-700'}`}>
                          {patientVersionButtonStates.inserted ? 'Inserted!' : 'Insert'}
                        </span>
                      </button>

                      {/* Download Patient Version Button */}
                      <button
                        onClick={handlePatientVersionDownload}
                        className="bg-white/60 border border-purple-200 p-3 rounded-lg flex flex-col items-center space-y-1 hover:bg-purple-50/60 transition-colors btn-micro-press btn-micro-hover"
                      >
                        <Download className="w-4 h-4 text-gray-700" />
                        <span className="text-xs text-gray-700">Download</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Fallback to ReportDisplay for other agents or QuickLetter without summary
            (() => {
              console.log('⚠️ DISPLAY: Falling back to ReportDisplay component', {
                reason: agentType === 'quick-letter' ? 'QuickLetter missing summary' : 'Not QuickLetter agent',
                agentType,
                hasResultsSummary: !!resultsSummary,
                resultsSummaryLength: resultsSummary?.length || 0
              });
              return null;
            })(),
            <ReportDisplay 
              results={results} 
              agentType={agentType} 
            />
          )}
        </div>
      )}

      {/* Actions - Only for regular reports, not AI Review or Quick Letter dual cards */}
      {!isAIReview && !isQuickLetterDualCards && (
        <ActionButtons
          results={results}
          agentType={agentType}
          onCopy={onCopy}
          onInsertToEMR={onInsertToEMR}
        />
      )}

      {/* Processing Time Display - at bottom for metrics visibility */}
      {(totalProcessingTime || processingStatus !== 'idle') && (
        <div className="px-4 pb-4">
          <ProcessingTimeDisplay
            appState={{
              processingStatus: processingStatus as any,
              totalProcessingTime,
              transcriptionTime,
              agentProcessingTime,
              currentAgent: agentType,
              currentAgentName,
              processingStartTime: null // We don't need live timing here since it's completed
            } as any}
            isRecording={false}
            recordingTime={0}
            transcriptionLength={originalTranscription ? originalTranscription.length : 0}
          />
        </div>
      )}

      {/* Troubleshooting Section */}
      <TroubleshootingSection
        failedAudioRecordings={failedAudioRecordings}
        errors={errors}
        onClearFailedRecordings={onClearFailedRecordings}
      />

    </div>
  );
});

OptimizedResultsPanel.displayName = 'OptimizedResultsPanel';

export { OptimizedResultsPanel };
