/**
 * Optimized Results Panel Component
 * 
 * Streamlined composition of focused subcomponents:
 * - Uses React.memo for all expensive components
 * - Minimal re-renders through component isolation
 * - Clean separation of concerns
 * - Better performance through focused updates
 */

import React, { memo, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileTextIcon, AlertCircleIcon, CheckIcon, SquareIcon } from '../icons/OptimizedIcons';
import { EyeOff, Eye, Download, Users, Sparkles, Loader2, X, Tag } from 'lucide-react';
import { calculateWordCount, calculateReadTime, formatReadTime, formatAbsoluteTime } from '@/utils/formatting';
import { 
  staggerContainer, 
  cardVariants, 
  listItemVariants,
  textVariants,
  statusVariants as _statusVariants,
  withReducedMotion,
  STAGGER_CONFIGS,
  ANIMATION_DURATIONS
} from '@/utils/animations';
import AnimatedCopyIcon from '../../components/AnimatedCopyIcon';
import { ProcessingTimeDisplay } from '../ProcessingTimeDisplay';
import {
  ReportDisplay,
  TranscriptionSection,
  AIReviewCards,
  ActionButtons,
  WarningsPanel,
  TroubleshootingSection,
  TAVIWorkupDisplay,
  RightHeartCathDisplay
} from './index';
import { PatientEducationOutputCard } from '../PatientEducationOutputCard';
import { PreOpPlanDisplay } from './PreOpPlanDisplay';
import type { AgentType, FailedAudioRecording, PipelineProgress, PreOpPlanReport } from '@/types/medical.types';
import { MissingInfoPanel } from './MissingInfoPanel';
import { UnifiedPipelineProgress } from '../UnifiedPipelineProgress';
import type { TranscriptionApprovalState, TranscriptionApprovalStatus } from '@/types/optimization';

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
  audioDuration?: number; // Audio duration in seconds for ETA prediction
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
  modelUsed?: string | null;
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
  // TAVI Workup structured data
  taviStructuredSections?: any; // TAVIWorkupStructuredSections but avoiding import issues
  // Patient Education structured data
  educationData?: any; // Patient Education JSON metadata and letter content
  // Pre-Op Plan structured data
  preOpPlanData?: PreOpPlanReport['planData']; // Pre-Op Plan card and JSON metadata
  // Right Heart Cath structured data
  rhcReport?: any; // RightHeartCathReport with haemodynamic calculations
  onUpdateRhcReport?: (rhcReport: any) => void; // Callback to persist edited RHC report to session
  onRHCReprocessWithValidation?: (userFields: Record<string, any>) => void; // Callback for RHC validation reprocessing
  // Pipeline progress for unified progress bar
  pipelineProgress?: PipelineProgress | null;
  processingStartTime?: number | null;
  revisionPanel?: {
    key: string;
    original: string;
    edited: string;
    savedText: string;
    notes: string;
    tags: string[];
    runEvaluationOnSave: boolean;
    hasUnsavedChanges: boolean;
    lastSavedAt?: number;
    isEditing: boolean;
  };
  revisionContext?: {
    workflowId?: string | null;
    agentLabel?: string | null;
  };
  onRevisionToggle?: (open: boolean) => void;
  onRevisionChange?: (updates: Partial<{ edited: string; notes: string; tags: string[]; runEvaluationOnSave: boolean }>) => void;
  onRevisionSave?: () => void | Promise<void>;
  onRevisionDiscard?: () => void;
  onRevisionMarkGoldenPair?: () => void | Promise<void>;
  isSavingRevision?: boolean;
  isSavingGoldenPair?: boolean;
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
  audioDuration,
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
  modelUsed = null,
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
  onCancelStreaming,
  // TAVI structured data
  taviStructuredSections,
  // Patient Education structured data
  educationData,
  // Pre-Op Plan structured data
  preOpPlanData,
  // Right Heart Cath structured data
  rhcReport,
  onUpdateRhcReport,
  onRHCReprocessWithValidation,
  // Pipeline progress
  pipelineProgress,
  processingStartTime,
  revisionPanel,
  revisionContext,
  onRevisionToggle,
  onRevisionChange,
  onRevisionSave,
  onRevisionDiscard,
  onRevisionMarkGoldenPair,
  isSavingRevision = false,
  isSavingGoldenPair = false
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Memoized calculations for performance
  const reportMetrics = useMemo(() => {
    const wordCount = calculateWordCount(results);
    const readingTime = calculateReadTime(wordCount);
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

  const _handleLetterDownload = useCallback(() => {
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

  const isRevisionOpen = !!(revisionPanel?.isEditing);
  const canEditAndTrain = Boolean(onRevisionToggle);

  const revisionTags = useMemo(() => {
    if (!revisionPanel) {
      return [];
    }
    const baseTags: string[] = [];
    if (agentType) {
      baseTags.push(agentType);
    }
    if (revisionContext?.workflowId) {
      baseTags.push(revisionContext.workflowId);
    }
    if (revisionContext?.agentLabel) {
      baseTags.push(revisionContext.agentLabel);
    }
    const userTags = revisionPanel.tags?.filter(Boolean) ?? [];
    return Array.from(new Set([...baseTags, ...userTags]));
  }, [revisionPanel, agentType, revisionContext?.workflowId]);

  const revisionDiffStats = useMemo(() => {
    if (!revisionPanel) {
      return null;
    }
    const originalLength = revisionPanel.original?.length || 0;
    const editedLength = revisionPanel.edited?.length || 0;
    const deltaChars = editedLength - originalLength;
    const originalWords = revisionPanel.original ? revisionPanel.original.trim().split(/\s+/).filter(Boolean).length : 0;
    const editedWords = revisionPanel.edited ? revisionPanel.edited.trim().split(/\s+/).filter(Boolean).length : 0;
    const deltaWords = editedWords - originalWords;
    return {
      originalLength,
      editedLength,
      deltaChars,
      originalWords,
      editedWords,
      deltaWords
    };
  }, [revisionPanel]);

  const revisionTagString = useMemo(() => {
    if (!revisionPanel) {
      return '';
    }
    return revisionPanel.tags?.join(', ') || '';
  }, [revisionPanel]);

  const formattedRevisionSavedAt = useMemo(() => {
    if (!revisionPanel?.lastSavedAt) {
      return null;
    }
    try {
      return formatAbsoluteTime(revisionPanel.lastSavedAt);
    } catch (error) {
      console.warn('Failed to format revision saved timestamp', error);
      return null;
    }
  }, [revisionPanel?.lastSavedAt]);

  const isRevisionSaveDisabled = !revisionPanel?.hasUnsavedChanges || isSavingRevision;
  const isGoldenPairDisabled = !revisionPanel?.notes?.trim() || isSavingGoldenPair;

  const handleRevisionTextChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onRevisionChange?.({ edited: event.target.value });
  }, [onRevisionChange]);

  const handleRevisionNotesChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onRevisionChange?.({ notes: event.target.value });
  }, [onRevisionChange]);

  const handleRevisionTagsChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const tags = event.target.value
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);
    onRevisionChange?.({ tags });
  }, [onRevisionChange]);

  const handleRevisionEvaluationToggle = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    onRevisionChange?.({ runEvaluationOnSave: event.target.checked });
  }, [onRevisionChange]);

  // Check if this is an AI Review result
  const isAIReview = agentType === 'ai-medical-review' && reviewData;
  
  // Check if this is a Quick Letter with dual cards
  // Always use dual cards for QuickLetter, even with empty/short summary
  const isQuickLetterDualCards = agentType === 'quick-letter' && results;

  // Check if this is a TAVI Workup with structured display
  const isTAVIWorkup = agentType === 'tavi-workup' && results;

  // Check if this is a Right Heart Cath with structured display
  const isRightHeartCath = agentType === 'right-heart-cath' && results;

  // Check if this is a Patient Education with structured display
  const isPatientEducation = agentType === 'patient-education' && results;

  // Check if this is a Pre-Op Plan with structured display
  const isPreOpPlan = agentType === 'pre-op-plan' && results;

  // Debug TAVI detection
  if (agentType === 'tavi-workup') {
    console.log('🔍 TAVI Detection Debug:', {
      agentType,
      hasResults: !!results,
      resultsLength: results?.length,
      isTAVIWorkup,
      resultsPreview: results?.substring(0, 100),
      hasStructuredSections: !!taviStructuredSections,
      structuredSectionsKeys: taviStructuredSections ? Object.keys(taviStructuredSections) : null,
      patientContentExists: taviStructuredSections?.patient?.content ? 'Yes' : 'No'
    });
  }

  // Determine readiness of final results for auto-collapse behavior
  const quickLetterReady = agentType === 'quick-letter' && !!results && !!resultsSummary;
  const taviReady = agentType === 'tavi-workup' && !!results;
  const rhcReady = agentType === 'right-heart-cath' && !!results;
  const genericReady = agentType !== 'quick-letter' && agentType !== 'tavi-workup' && agentType !== 'right-heart-cath' && !!results;
  const resultsReady = quickLetterReady || taviReady || rhcReady || genericReady;
  
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
          ) : isProcessing ? (
            <>
              <FileTextIcon className="w-4 h-4 text-blue-600 animate-pulse" />
              <div>
                <h3 className="text-gray-900 font-medium text-sm">Processing</h3>
                <p className="text-blue-700 text-xs">
                  {pipelineProgress?.details || 'Processing medical information...'}
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
            {reportMetrics.wordCount > 0 && (
              <>
                <span>{reportMetrics.wordCount} words</span>
                {reportMetrics.readingTime && (
                  <>
                    <span>•</span>
                    <span>{formatReadTime(reportMetrics.readingTime)}</span>
                  </>
                )}
                <span>•</span>
              </>
            )}
            <span title={`Generated at ${formatAbsoluteTime(Date.now())}`}>
              {new Date().toLocaleTimeString()}
            </span>
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
      className="letter-card rounded-lg overflow-hidden border-2 border-emerald-200"
      initial="hidden"
      animate="visible"
      variants={withReducedMotion(cardVariants)}
    >
      {renderHeader()}

      {/* TAVI Workup Progress - Uses unified progress for consistency */}
      <AnimatePresence>
        {agentType === 'tavi-workup' && pipelineProgress && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: ANIMATION_DURATIONS.normal }}
            className="p-4 border-b border-gray-200"
          >
            <UnifiedPipelineProgress
              progress={pipelineProgress}
              startTime={processingStartTime || undefined}
              agentType={agentType}
              audioDuration={audioDuration}
              showTimeEstimate={true}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unified Pipeline Progress for all agents during processing */}
      <AnimatePresence>
        {pipelineProgress && agentType !== 'tavi-workup' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: ANIMATION_DURATIONS.normal }}
            className="p-4 border-b border-gray-200"
          >
            <UnifiedPipelineProgress
              progress={pipelineProgress}
              startTime={processingStartTime || undefined}
              agentType={agentType || undefined}
              transcriptionLength={originalTranscription?.length}
              audioDuration={audioDuration}
              showTimeEstimate={true}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Original Transcription Section - Hide during streaming, show when complete */}
      {/* For investigation-summary, show transcription AFTER results (handled in content section) */}
      <AnimatePresence>
        {originalTranscription && !streaming && !isTAVIWorkup && !isRightHeartCath && agentType !== 'investigation-summary' && (
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
              {/* Consistent transcription UI during streaming */}
              {originalTranscription && (
                <TranscriptionSection
                  originalTranscription={originalTranscription}
                  onTranscriptionCopy={onTranscriptionCopy}
                  onTranscriptionInsert={onTranscriptionInsert}
                  onTranscriptionEdit={onTranscriptionEdit}
                  transcriptionSaveStatus={transcriptionSaveStatus}
                  onAgentReprocess={onAgentReprocess}
                  currentAgent={currentAgent}
                  isProcessing={true}
                  audioBlob={audioBlob}
                  defaultExpanded={true}
                  collapseWhen={false}
                  approvalState={approvalState}
                  onTranscriptionApprove={onTranscriptionApprove}
                />
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
              missingInfo.missing_recommendations?.length > 0 ||
              missingInfo.missing_structured?.length > 0
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
                  agentType={agentType}
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
              <AIReviewCards reviewData={reviewData} storageKey="ui_preferences_card_theme" />
            </>
          ) : agentType === 'quick-letter' && results && !streaming ? (
            // Quick Letter dual cards display - only show when not streaming and results are ready
            (() => {
              console.log('✅ RESULTS PANEL: Using QuickLetter dual-card display', {
                hasResults: !!results,
                resultsLength: results?.length || 0,
                hasSummary: !!resultsSummary,
                summaryLength: resultsSummary?.length || 0,
                agentType,
                streaming
              });
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
                  <div className={`grid gap-2 ${canEditAndTrain ? 'grid-cols-4' : 'grid-cols-3'}`}>
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

                    {/* Edit & Train Button */}
                    {canEditAndTrain && (
                      <button
                        onClick={() => onRevisionToggle?.(!isRevisionOpen)}
                        className={`
                          p-3 rounded-lg flex flex-col items-center space-y-1 transition-all border btn-micro-press btn-micro-hover
                          ${isRevisionOpen
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                            : 'bg-white/60 border-blue-200 hover:bg-blue-50/80 text-blue-700'
                          }
                        `}
                        title="Revise output and capture training example"
                      >
                        <Sparkles className={`w-4 h-4 ${isRevisionOpen ? 'text-white' : 'text-blue-700'}`} />
                        <span className={`text-xs ${isRevisionOpen ? 'text-white font-semibold' : 'text-blue-700'}`}>
                          {isRevisionOpen ? 'Editing…' : 'Edit & Train'}
                        </span>
                      </button>
                    )}

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
          ) : isTAVIWorkup ? (
            // TAVI Workup with transcription section + structured display
            <div className="space-y-6">
              {/* Transcription Section for TAVI */}
              <TranscriptionSection
                originalTranscription={originalTranscription || ''}
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

              {/* TAVI Structured Display */}
              <TAVIWorkupDisplay
                structuredSections={taviStructuredSections}
                results={results} // Fallback for existing sessions without structured sections
                missingInfo={missingInfo?.missing_structured || []}
                onCopy={onCopy}
                onInsertToEMR={onInsertToEMR}
                onReprocessWithAnswers={onReprocessWithAnswers}
              />
            </div>
          ) : isRightHeartCath ? (
            // Right Heart Cath with transcription section + structured display
            <RightHeartCathDisplay
              rhcReport={rhcReport}
              results={results}
              onCopy={onCopy}
              onInsertToEMR={onInsertToEMR}
              onUpdateRhcReport={onUpdateRhcReport}
              onReprocessWithValidation={onRHCReprocessWithValidation}
              originalTranscription={originalTranscription}
              onTranscriptionCopy={onTranscriptionCopy}
              onTranscriptionInsert={onTranscriptionInsert}
              onTranscriptionEdit={onTranscriptionEdit}
              transcriptionSaveStatus={transcriptionSaveStatus}
              onAgentReprocess={onAgentReprocess}
              currentAgent={currentAgent}
              isProcessing={isProcessing}
              audioBlob={audioBlob}
              defaultTranscriptionExpanded={!resultsReady}
              collapseTranscriptionWhen={resultsReady}
              approvalState={approvalState}
              onTranscriptionApprove={onTranscriptionApprove}
              selectedPatientName={selectedPatientName}
              onReprocessWithAnswers={onReprocessWithAnswers}
              onDismissMissingInfo={onDismissMissingInfo}
            />
          ) : isPatientEducation ? (
            // Patient Education with structured JSON metadata + letter display
            <PatientEducationOutputCard
              report={{
                id: `report-${Date.now()}`,
                timestamp: Date.now(),
                content: results,
                agentName: currentAgentName || 'Patient Education & Lifestyle Medicine',
                metadata: {
                  processingTime: totalProcessingTime || 0,
                  confidence: 0.9,
                  modelUsed: 'medgemma-27b'
                },
                sections: [],
                warnings: warnings || [],
                errors: errors || [],
                educationData: educationData || {
                  priority: 'medium',
                  modules: [],
                  australianGuidelines: [],
                  patientResources: [],
                  jsonMetadata: null,
                  letterContent: results
                }
              }}
              onCopy={async (text: string) => { await Promise.resolve(onCopy(text)); }}
              onInsert={async (text: string) => { await Promise.resolve(onInsertToEMR(text)); }}
              isVisible={true}
            />
          ) : isPreOpPlan ? (
            // Pre-Op Plan with A5 card + JSON metadata display
            <PreOpPlanDisplay
              session={{
                id: selectedSessionId || `session-${Date.now()}`,
                patient: { name: selectedPatientName || 'Unknown', id: '', dob: '', age: '', extractedAt: Date.now() },
                transcription: originalTranscription || '',
                results,
                agentType: 'pre-op-plan',
                agentName: currentAgentName || 'Pre-Op Plan',
                timestamp: Date.now(),
                status: 'completed',
                completed: true,
                processingTime: totalProcessingTime || undefined,
                modelUsed: modelUsed || undefined,
                warnings: warnings || undefined,
                errors: errors || undefined,
                completedTime: Date.now(),
                preOpPlanData: preOpPlanData || {
                  procedureType: 'ANGIOGRAM_OR_PCI',
                  cardMarkdown: results,
                  jsonData: { procedure_type: 'ANGIOGRAM_OR_PCI', fields: {} }
                },
                audioBlob: audioBlob || undefined
              }}
              onCopy={onCopy}
              onInsertToEMR={onInsertToEMR}
              onTranscriptionCopy={onTranscriptionCopy}
              onTranscriptionInsert={onTranscriptionInsert}
              onTranscriptionEdit={onTranscriptionEdit}
              onTranscriptionApprove={onTranscriptionApprove}
              transcriptionApprovalState={approvalState}
              onAgentReprocess={currentAgent ? () => onAgentReprocess?.(currentAgent) : undefined}
              isProcessing={isProcessing}
            />
          ) : (
            // Fallback to ReportDisplay for other agents or QuickLetter without summary
            (() => {
              // Debug log when Quick Letter falls through to generic display
              if (agentType === 'quick-letter') {
                console.warn('⚠️ RESULTS PANEL: Quick Letter falling through to generic ReportDisplay', {
                  hasResults: !!results,
                  resultsLength: results?.length || 0,
                  hasSummary: !!resultsSummary,
                  summaryLength: resultsSummary?.length || 0,
                  streaming,
                  reason: !results ? 'No results' : streaming ? 'Still streaming' : 'Unknown'
                });
              }
              return null;
            })(),
            <div className="space-y-0">
              <ReportDisplay
                results={results}
                agentType={agentType}
              />

              {/* Show transcription AFTER results for investigation-summary */}
              {agentType === 'investigation-summary' && originalTranscription && !streaming && (
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
              )}
            </div>
          )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Patient Version Card for Angiogram/PCI */}
      <AnimatePresence>
        {agentType === 'angiogram-pci' && patientVersion && !isProcessing && (
          <motion.div
            className="space-y-4 px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.2 }}
          >
            <div className="letter-card rounded-lg border border-blue-200 bg-blue-50">
              <div className="p-3 border-b border-blue-200 bg-blue-100">
                <h4 className="text-blue-800 font-semibold text-sm">Patient-Friendly Explanation</h4>
              </div>
              <div className="p-3 max-h-96 overflow-y-auto">
                <div className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap">
                  {patientVersion}
                </div>
              </div>
              <div className="p-3 border-t border-blue-200 bg-blue-50">
                <div className="grid grid-cols-3 gap-2">
                  {/* Copy Patient Version Button */}
                  <button
                    onClick={handlePatientVersionCopy}
                    className={`
                      p-3 rounded-lg flex flex-col items-center space-y-1 transition-all border btn-micro-press btn-micro-hover
                      ${patientVersionButtonStates.copied
                        ? 'bg-blue-500/20 border-blue-400 text-blue-700 btn-success-animation completion-celebration'
                        : 'bg-white/60 border-blue-200 hover:bg-blue-50/60 text-gray-700'
                      }
                    `}
                  >
                    {patientVersionButtonStates.copied ? (
                      <CheckIcon className="w-4 h-4 text-blue-600 checkmark-appear" />
                    ) : (
                      <AnimatedCopyIcon className="w-4 h-4" title="Copy" />
                    )}
                    <span className={`text-xs ${patientVersionButtonStates.copied ? 'text-blue-700' : 'text-gray-700'}`}>
                      {patientVersionButtonStates.copied ? 'Copied!' : 'Copy'}
                    </span>
                  </button>

                  {/* Insert Patient Version Button */}
                  <button
                    onClick={handlePatientVersionInsert}
                    className={`
                      p-3 rounded-lg flex flex-col items-center space-y-1 transition-all border btn-micro-press btn-micro-hover
                      ${patientVersionButtonStates.inserted
                        ? 'bg-blue-500/20 border-blue-400 text-blue-700 btn-success-animation completion-celebration'
                        : 'bg-white/60 border-blue-200 hover:bg-blue-50/60 text-gray-700'
                      }
                    `}
                  >
                    {patientVersionButtonStates.inserted ? (
                      <CheckIcon className="w-4 h-4 text-blue-600 checkmark-appear" />
                    ) : (
                      <SquareIcon className="w-4 h-4" />
                    )}
                    <span className={`text-xs ${patientVersionButtonStates.inserted ? 'text-blue-700' : 'text-gray-700'}`}>
                      {patientVersionButtonStates.inserted ? 'Inserted!' : 'Insert'}
                    </span>
                  </button>

                  {/* Download Patient Version Button */}
                  <button
                    onClick={handlePatientVersionDownload}
                    className="bg-white/60 border border-blue-200 p-3 rounded-lg flex flex-col items-center space-y-1 hover:bg-blue-50/60 transition-colors btn-micro-press btn-micro-hover"
                  >
                    <Download className="w-4 h-4 text-gray-700" />
                    <span className="text-xs text-gray-700">Download</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions - Only for regular reports, not AI Review, Quick Letter dual cards, or TAVI workup, and NOT while processing */}
      <AnimatePresence>
        {!isProcessing && !isAIReview && !isQuickLetterDualCards && !isTAVIWorkup && !isRightHeartCath && (
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
              onEditAndTrain={onRevisionToggle ? () => onRevisionToggle(!isRevisionOpen) : undefined}
              editAndTrainActive={isRevisionOpen}
              disableEditAndTrain={isProcessing || !results}
              customActions={agentType === 'angiogram-pci' ? [
                {
                  id: 'generate-patient-version',
                  label: isGeneratingPatientVersion ? 'Generating...' : 'Patient Version',
                  icon: ({ className }: { className?: string }) => (
                    isGeneratingPatientVersion ? (
                      <div className={`border-2 border-blue-300 border-t-transparent rounded-full animate-spin ${className}`}></div>
                    ) : (
                      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    )
                  ),
                  onClick: onGeneratePatientVersion || (() => {}),
                  variant: 'secondary' as const
                }
              ] : []}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isRevisionOpen && revisionPanel && (
          <motion.div
            className="px-4 pb-2"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
          >
            <div
              data-testid="result-revision-panel"
              className="border border-blue-200 bg-blue-50/70 rounded-xl shadow-sm p-4 sm:p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {revisionTags.length === 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                      <Tag className="w-3 h-3" />
                      Training Capture
                    </span>
                  ) : (
                    revisionTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium"
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRevisionToggle?.(false)}
                  className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900"
                >
                  <X className="w-3 h-3" />
                  Close
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide">Original Output</p>
                  <div className="p-3 bg-white border border-blue-100 rounded-lg max-h-64 overflow-auto text-sm whitespace-pre-wrap text-slate-700">
                    {revisionPanel.original || 'No original output available.'}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide">Edited Revision</p>
                    {revisionPanel.hasUnsavedChanges ? (
                      <span className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                        <AlertCircleIcon className="w-3 h-3" />
                        Unsaved changes
                      </span>
                    ) : formattedRevisionSavedAt ? (
                      <span className="text-[11px] text-emerald-600 flex items-center gap-1">
                        <CheckIcon className="w-3 h-3" />
                        Saved {formattedRevisionSavedAt}
                      </span>
                    ) : null}
                  </div>
                  <textarea
                    data-testid="revision-editor"
                    value={revisionPanel.edited}
                    onChange={handleRevisionTextChange}
                    className="w-full min-h-[200px] max-h-[320px] resize-y border border-blue-200 rounded-lg px-3 py-2 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="Make clinician revisions here..."
                  />
                </div>
              </div>

              {revisionDiffStats && (
                <div className="flex flex-wrap gap-4 text-xs text-blue-900">
                  <span>
                    Characters: {revisionDiffStats.editedLength}
                    {' '}
                    ({revisionDiffStats.deltaChars >= 0 ? '+' : ''}{revisionDiffStats.deltaChars})
                  </span>
                  <span>
                    Words: {revisionDiffStats.editedWords}
                    {' '}
                    ({revisionDiffStats.deltaWords >= 0 ? '+' : ''}{revisionDiffStats.deltaWords})
                  </span>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
                    Scenario Summary <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    data-testid="revision-notes"
                    value={revisionPanel.notes}
                    onChange={handleRevisionNotesChange}
                    placeholder="Example: Normalize measurement spacing, abbreviations, ensure parentheses"
                    className="w-full h-24 resize-y border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  <p className="text-[11px] text-blue-700">
                    Describe why this revision is a gold standard example for future optimization.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-blue-900 uppercase tracking-wide">Tags</label>
                    <input
                      type="text"
                      value={revisionTagString}
                      onChange={handleRevisionTagsChange}
                      placeholder="heart-failure, formatting, urgent"
                      className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                    <p className="text-[11px] text-blue-700">Comma-separated tags help cluster similar training examples.</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-blue-900">
                    <input
                      type="checkbox"
                      className="rounded border-blue-300 text-blue-600 focus:ring-blue-400"
                      checked={revisionPanel.runEvaluationOnSave}
                      onChange={handleRevisionEvaluationToggle}
                    />
                    Run GEPA preview after saving golden pair
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={onRevisionDiscard}
                  disabled={!revisionPanel.hasUnsavedChanges || isSavingRevision}
                  className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors
                    ${revisionPanel.hasUnsavedChanges && !isSavingRevision
                      ? 'border-blue-300 text-blue-700 hover:bg-blue-100'
                      : 'border-blue-100 text-blue-400 cursor-not-allowed'}`}
                >
                  Reset
                </button>
                <button
                  data-testid="save-revision-btn"
                  type="button"
                  onClick={onRevisionSave}
                  disabled={isRevisionSaveDisabled}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors
                    ${isRevisionSaveDisabled
                      ? 'bg-blue-200 border-blue-200 text-white cursor-not-allowed'
                      : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'}`}
                >
                  {isSavingRevision && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Revision
                </button>
                <button
                  data-testid="mark-golden-pair-btn"
                  type="button"
                  onClick={onRevisionMarkGoldenPair}
                  disabled={isGoldenPairDisabled}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold transition-colors
                    ${isGoldenPairDisabled
                      ? 'bg-emerald-200 border-emerald-200 text-white cursor-not-allowed'
                      : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'}`}
                >
                  {isSavingGoldenPair ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Mark as Golden Pair
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Processing Time Display - only show after completion (not during processing since UnifiedPipelineProgress shows live updates) */}
      <AnimatePresence>
        {processingStatus === 'complete' && totalProcessingTime && (
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
              modelUsed={modelUsed}
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
