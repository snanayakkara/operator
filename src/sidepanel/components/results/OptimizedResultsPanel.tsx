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
import { motion, AnimatePresence } from 'framer-motion';
import { FileTextIcon, AlertCircleIcon, CheckIcon, SquareIcon } from '../icons/OptimizedIcons';
import { EyeOff, Eye, Download, Users } from 'lucide-react';
import { 
  staggerContainer, 
  cardVariants, 
  listItemVariants,
  textVariants,
  statusVariants,
  withReducedMotion,
  STAGGER_CONFIGS,
  ANIMATION_DURATIONS
} from '@/utils/animations';
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
import type { TranscriptionApprovalState, TranscriptionApprovalStatus } from '@/types/medical.types';

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
  transcriptionSaveStatus?: {
    status: 'idle' | 'saving' | 'saved' | 'error';
    message: string;
    timestamp?: Date;
  };
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
  // Streaming display
  streaming?: boolean;
  streamBuffer?: string;
  ttftMs?: number | null;
  onStopStreaming?: () => void;
  // Transcription approval
  approvalState?: TranscriptionApprovalState;
  onTranscriptionApprove?: (status: TranscriptionApprovalStatus) => void;
  // Streaming support
  isStreaming?: boolean;
  streamingTokens?: string;
  onCancelStreaming?: () => void;
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
  transcriptionSaveStatus,
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
  ,
  // Streaming props
  streaming = false,
  streamBuffer = '',
  ttftMs = null,
  onStopStreaming,
  // Transcription approval props
  approvalState,
  onTranscriptionApprove,
  // New streaming props
  isStreaming = false,
  streamingTokens = '',
  onCancelStreaming
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  // Local state for streaming transcription editing
  const [streamingTranscriptionEdit, setStreamingTranscriptionEdit] = useState(originalTranscription || '');
  
  // Sync streaming transcription state when original changes
  useEffect(() => {
    if (originalTranscription) {
      setStreamingTranscriptionEdit(originalTranscription);
    }
  }, [originalTranscription]);

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
    if (!results || results.trim().length === 0) {
      return { wordCount: 0, readingTime: 0 };
    }
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
  
  // Check if this is a Quick Letter with dual cards
  // Always use dual cards for QuickLetter, even with empty/short summary
  const isQuickLetterDualCards = agentType === 'quick-letter' && results;
  
  // Determine readiness of final results for auto-collapse behavior
  const quickLetterReady = agentType === 'quick-letter' && !!results && !!resultsSummary;
  const genericReady = agentType !== 'quick-letter' && !!results;
  const resultsReady = quickLetterReady || genericReady;
  
  // Transcription display logic optimized for performance
  
  // Display logic calculations (debug logging removed for performance)

  const renderHeader = () => (
    <motion.div 
      className="p-4 border-b border-emerald-200/50"
      initial="hidden"
      animate="visible"
      variants={withReducedMotion(cardVariants)}
    >
      {/* Selected Session Indicator */}
      {selectedSessionId && selectedPatientName && (
        <motion.div 
          className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: ANIMATION_DURATIONS.quick }}
        >
          <motion.div 
            className="flex items-center space-x-2"
            variants={withReducedMotion(textVariants)}
          >
            <Eye className="w-3 h-3 text-blue-600" />
            <span className="text-blue-800 text-xs font-medium">
              Viewing session for: {selectedPatientName}
            </span>
          </motion.div>
        </motion.div>
      )}
      
      <motion.div 
        className="flex items-center justify-between"
        variants={withReducedMotion(listItemVariants)}
      >
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
      </motion.div>
      
      {/* Stats */}
      <motion.div 
        className="flex items-center space-x-4 mt-2 text-xs"
        variants={withReducedMotion(textVariants)}
        transition={{ delay: 0.1 }}
      >
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
      </motion.div>
    </motion.div>
  );

  return (
    <motion.div 
      className="letter-card rounded-2xl overflow-hidden shadow-lg border"
      initial="hidden"
      animate="visible"
      variants={withReducedMotion(cardVariants)}
    >
      {renderHeader()}
      
      {/* Original Transcription Section - Hide during streaming, show when complete */}
      <AnimatePresence>
        {originalTranscription && !streaming && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: ANIMATION_DURATIONS.normal }}
          >
            <TranscriptionSection
          originalTranscription={originalTranscription}
          onTranscriptionCopy={onTranscriptionCopy}
          onTranscriptionInsert={onTranscriptionInsert}
          onTranscriptionEdit={onTranscriptionEdit}
          transcriptionSaveStatus={transcriptionSaveStatus}
          onAgentReprocess={onAgentReprocess}
          currentAgent={currentAgent}
          isProcessing={isProcessing}
          audioBlob={audioBlob}
          defaultExpanded={!resultsReady}
              collapseWhen={resultsReady}
              approvalState={approvalState}
              onTranscriptionApprove={onTranscriptionApprove}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            className="p-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: ANIMATION_DURATIONS.normal }}
          >
          {/* Live streaming output with transcription context */}
          <AnimatePresence>
            {streaming && (
              <motion.div 
                className="space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: ANIMATION_DURATIONS.quick }}
              >
              {/* Show original transcription during streaming for context */}
              {originalTranscription && (
                <div className="rounded-lg border border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-100">
                    <div className="flex items-center space-x-2">
                      <FileTextIcon className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-sm text-gray-900">Original Transcription</span>
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                        Editable
                      </span>
                      <span className="text-xs text-gray-500">
                        {streamingTranscriptionEdit.split(' ').length} words
                        {streamingTranscriptionEdit !== originalTranscription && (
                          <span className="text-blue-600 ml-1">(edited)</span>
                        )}
                      </span>
                      {transcriptionSaveStatus && transcriptionSaveStatus.status !== 'idle' && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          transcriptionSaveStatus.status === 'saving' 
                            ? 'bg-yellow-100 text-yellow-700' 
                            : transcriptionSaveStatus.status === 'saved'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {transcriptionSaveStatus.message}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {onTranscriptionCopy && (
                        <button
                          onClick={() => onTranscriptionCopy?.(originalTranscription)}
                          className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-200 transition-colors"
                        >
                          Copy
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="p-3 max-h-32 overflow-y-auto">
                    <div className="relative">
                      <textarea
                        value={streamingTranscriptionEdit}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setStreamingTranscriptionEdit(newValue);
                          onTranscriptionEdit?.(newValue);
                        }}
                        className="w-full h-24 p-2 pb-6 text-sm text-gray-900 bg-white border border-gray-200 rounded resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 leading-relaxed"
                        placeholder="Edit transcription - your corrections train Whisper to be more accurate for medical dictation..."
                        title="Your edits are automatically saved as training data to improve future transcription accuracy"
                      />
                      <div className="absolute bottom-1 right-2 text-xs text-gray-400">
                        🧠 Training AI with your corrections
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Live streaming output */}
              <div className="rounded-lg border border-emerald-300 bg-emerald-50">
                <div className="flex items-center justify-between p-2 border-b border-emerald-200 bg-emerald-100">
                  <div className="flex items-center space-x-2">
                    <span className="text-emerald-600 text-sm">● Live Output</span>
                    {ttftMs != null && (
                      <span className="text-xs text-emerald-700">TTFT: {ttftMs} ms</span>
                    )}
                  </div>
                  <button
                    onClick={onStopStreaming}
                    className="text-xs px-2 py-1 rounded border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                  >
                    Stop
                  </button>
                </div>
                <div className="p-3 max-h-64 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-900">{streamBuffer}</pre>
                </div>
              </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Missing Information Panel for interactive completion */}
          <AnimatePresence>
            {missingInfo && (
              missingInfo.missing_diagnostic?.length > 0 || 
              missingInfo.missing_intervention?.length > 0 ||
              missingInfo.missing_purpose?.length > 0 ||
              missingInfo.missing_clinical?.length > 0 ||
              missingInfo.missing_recommendations?.length > 0
            ) && (
              <motion.div 
                className="mb-4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: ANIMATION_DURATIONS.quick }}
              >
              <MissingInfoPanel
                missingInfo={missingInfo}
                onSubmit={(answers) => onReprocessWithAnswers && onReprocessWithAnswers(answers)}
                  onDismiss={onDismissMissingInfo}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Streaming Display - show when actively streaming */}
          {isStreaming && streamingTokens ? (
            <motion.div
              className="letter-card rounded-lg border border-blue-200 bg-blue-50"
              variants={withReducedMotion(cardVariants)}
              initial="hidden"
              animate="visible"
            >
              <div className="p-3 border-b border-blue-200 bg-blue-100 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <h4 className="text-blue-800 font-semibold text-sm">Generating Response...</h4>
                </div>
                {onCancelStreaming && (
                  <button
                    onClick={onCancelStreaming}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                    aria-label="Cancel streaming"
                  >
                    Cancel
                  </button>
                )}
              </div>
              <div className="p-4">
                <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap font-mono">
                  {streamingTokens}
                  <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
                </div>
                <div className="mt-3 text-xs text-blue-600">
                  Real-time generation in progress...
                </div>
              </div>
            </motion.div>
          ) : isAIReview ? (
            <>
              {console.log('🖼️ RESULTS PANEL: Rendering AIReviewCards with data:', reviewData)}
              <AIReviewCards reviewData={reviewData} />
            </>
          ) : agentType === 'quick-letter' && results && !streaming ? (
            // Quick Letter dual cards display - only show when not streaming and results are ready
            (() => {
              console.log('✅ DISPLAY: Using QuickLetter dual-card display');
              return null; // This will be replaced by the actual content
            })(),
            <motion.div 
              className="space-y-4"
              variants={withReducedMotion(staggerContainer)}
              initial="hidden"
              animate="visible"
              transition={{
                staggerChildren: STAGGER_CONFIGS.normal,
                delayChildren: 0.1
              }}
            >
              {/* Summary Card */}
              <motion.div 
                className="letter-card rounded-lg border border-emerald-200 bg-emerald-50"
                variants={withReducedMotion(cardVariants)}
              >
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
              </motion.div>

              {/* Letter Card */}
              <motion.div 
                className="letter-card rounded-lg border border-blue-200 bg-blue-50"
                variants={withReducedMotion(cardVariants)}
              >
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
              </motion.div>

              {/* Patient Version Card */}
              <AnimatePresence>
                {patientVersion && (
                  <motion.div 
                    className="letter-card rounded-lg border border-purple-200 bg-purple-50"
                    variants={withReducedMotion(cardVariants)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: 0.2 }}
                  >
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
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            // Fallback to ReportDisplay for other agents or QuickLetter without summary
            <ReportDisplay 
              results={results} 
              agentType={agentType} 
            />
          )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions - Only for regular reports, not AI Review or Quick Letter dual cards */}
      <AnimatePresence>
        {!isAIReview && !isQuickLetterDualCards && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.3 }}
          >
            <ActionButtons
              results={results}
              agentType={agentType}
              onCopy={onCopy}
              onInsertToEMR={onInsertToEMR}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Processing Time Display - at bottom for metrics visibility */}
      <AnimatePresence>
        {(totalProcessingTime || processingStatus !== 'idle') && (
          <motion.div 
            className="px-4 pb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: 0.4 }}
          >
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Troubleshooting Section */}
      <TroubleshootingSection
        failedAudioRecordings={failedAudioRecordings}
        errors={errors}
        onClearFailedRecordings={onClearFailedRecordings}
      />

    </motion.div>
  );
});

OptimizedResultsPanel.displayName = 'OptimizedResultsPanel';

export { OptimizedResultsPanel };
