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
import { EyeOff, Eye, Download, Sparkles, Loader2, X, Tag, GitBranch, Volume2 } from 'lucide-react';
import Button, { IconButton } from '../buttons/Button';
import { calculateWordCount, calculateReadTime, formatAbsoluteTime } from '@/utils/formatting';
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
import { FieldValidationPrompt } from './FieldValidationPrompt';
import { ProcessingTimeDisplay } from '../ProcessingTimeDisplay';
import { ActionSegmentedControl } from '../ui/SegmentedControl';
import {
  ReportDisplay,
  TranscriptionSection,
  AIReviewCards,
  ActionButtons,
  WarningsPanel,
  TroubleshootingSection,
  TAVIWorkupDisplay,
  RightHeartCathDisplay,
  NextStepSuggestionsCard,
  KeyFactsProofDialog
} from './index';
import { PatientEducationOutputCard } from '../PatientEducationOutputCard';
import { PreOpPlanDisplay } from './PreOpPlanDisplay';
import type { AgentType, FailedAudioRecording, PipelineProgress, PreOpPlanReport, ValidationResult, KeyFact, KeyFactsProofResult, ProofModeConfig } from '@/types/medical.types';
import type { NextStepStatus, NextStepEngineResult, NextStepSuggestion } from '@/types/nextStep.types';
import { MissingInfoPanel } from './MissingInfoPanel';
import { UnifiedPipelineProgress } from '../UnifiedPipelineProgress';
import type { TranscriptionApprovalState, TranscriptionApprovalStatus } from '@/types/optimization';
import { useValidationCheckpoint } from '@/hooks/useValidationCheckpoint';
import { getValidationConfig } from '@/config/validationFieldConfig';
import { useResultsKeyboardShortcuts } from '@/hooks/useResultsKeyboardShortcuts';

// Use centralized validation configurations
const { fieldConfig: ANGIO_VALIDATION_FIELD_CONFIG, copy: ANGIO_VALIDATION_COPY } = getValidationConfig('angio-pci');
const { fieldConfig: MTEER_VALIDATION_FIELD_CONFIG, copy: MTEER_VALIDATION_COPY } = getValidationConfig('mteer');

/**
 * Parse Pre-Op Plan JSON from results string (for legacy sessions without preOpPlanData)
 * This function attempts to extract structured JSON from the LLM response
 */
function parsePreOpPlanFromResults(results: string): PreOpPlanReport['planData'] | null {
  if (!results) return null;
  
  try {
    // Try to extract JSON section from response
    const jsonMatch = results.match(/JSON:\s*\n```json\s*\n([\s\S]*?)\n```/i) ||
                     results.match(/JSON:\s*\n([\s\S]+?)(?=\n\s*$)/i) ||
                     results.match(/```json\s*\n([\s\S]*?)\n```/i);
    
    if (jsonMatch) {
      const jsonString = jsonMatch[1].trim();
      const jsonData = JSON.parse(jsonString);
      
      // Extract card markdown (everything before JSON section)
      const cardMatch = results.match(/CARD:\s*\n([\s\S]*?)(?=\n\s*JSON:|$)/i);
      let cardMarkdown = '';
      if (cardMatch) {
        cardMarkdown = cardMatch[1].trim();
      } else if (results.indexOf('JSON:') > 0) {
        const beforeJson = results.substring(0, results.indexOf('JSON:')).trim();
        cardMarkdown = beforeJson.replace(/^CARD:\s*/i, '').trim();
      }
      
      const procedureType = jsonData.procedure_type || 'ANGIOGRAM_OR_PCI';
      const fields = jsonData.fields || {};
      
      console.log('🔧 Parsed Pre-Op Plan from results (JSON found):', {
        procedureType,
        fieldsCount: Object.keys(fields).length,
        hasCardMarkdown: !!cardMarkdown
      });
      
      return {
        procedureType,
        cardMarkdown: cardMarkdown || results,
        jsonData: {
          procedure_type: procedureType,
          fields
        },
        completenessScore: `${Object.keys(fields).length} fields extracted`
      };
    }
    
    // FALLBACK: No JSON found, extract fields from markdown card itself
    console.log('🔧 No JSON in results, extracting fields from card markdown');
    
    // Get card content (strip CARD: prefix if present)
    const cardMarkdown = results.replace(/^CARD:\s*/i, '').trim();
    
    // Extract fields from markdown using **Label** — Value pattern
    const fields: Record<string, string> = {};
    const labelToFieldMap: Record<string, string> = {
      'indication': 'indication',
      'procedure': 'procedure',
      'allergies': 'allergies',
      'nok': 'nok_name',
      'next of kin': 'nok_name',
      'access': 'primary_access',
      'primary access': 'primary_access',
      'secondary access': 'secondary_access',
      'sheath': 'sheath_size_fr',
      'catheters': 'catheters',
      'catheter': 'catheters',
      'wire': 'wire',
      'closure': 'closure_plan',
      'valve': 'valve_type_size',
      'pacing': 'pacing_wire_access',
      'protamine': 'protamine',
      'goals': 'goals_of_care',
      'weight': 'weight',
      'egfr': 'egfr',
      'lm': 'lm_findings',
      'lad': 'lad_findings',
      'lcx': 'lcx_findings',
      'rca': 'rca_findings',
      'plan': 'plan',
      // Additional fields
      'antiplatelets': 'antiplatelets',
      'antiplatelet': 'antiplatelets',
      'sedation': 'sedation',
      'labs': 'labs',
      'bloods': 'labs',
      'follow-up': 'follow_up',
      'follow up': 'follow_up',
      'site prep': 'site_prep',
      'hemoglobin': 'hemoglobin',
      'hb': 'hemoglobin',
      'creatinine': 'creatinine'
    };
    
    // Detect procedure type
    const lowerCard = cardMarkdown.toLowerCase();
    let procedureType: PreOpPlanReport['planData']['procedureType'] = 'ANGIOGRAM_OR_PCI';
    if (lowerCard.includes('tavi') || lowerCard.includes('transcatheter aortic')) {
      procedureType = 'TAVI';
    } else if (lowerCard.includes('right heart') || lowerCard.includes('rhc')) {
      procedureType = 'RIGHT_HEART_CATH';
    } else if (lowerCard.includes('mitral') || lowerCard.includes('teer')) {
      procedureType = 'MITRAL_TEER';
    }
    
    // Extract **Label** — Value patterns (handles multiple per line)
    const fieldPattern = /\*\*([^*]+)\*\*\s*[—\-:]\s*([^*\n]+?)(?=\s*[•·]\s*\*\*|\s*\*\*|$|\n)/g;
    let match;
    while ((match = fieldPattern.exec(cardMarkdown)) !== null) {
      const label = match[1].trim().toLowerCase();
      const value = match[2].trim().replace(/\s*[•·]\s*$/, '').trim();
      
      if (!value || value.toLowerCase() === 'not specified') continue;
      
      let matched = false;
      for (const [pattern, fieldKey] of Object.entries(labelToFieldMap)) {
        if (label === pattern || label.includes(pattern) || pattern.includes(label)) {
          fields[fieldKey] = value;
          matched = true;
          break;
        }
      }
      // Store with normalized label as fallback
      if (!matched) {
        const normalizedLabel = label.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        if (normalizedLabel.length > 0) {
          fields[normalizedLabel] = value;
        }
      }
    }
    
    // Also try bullet format
    const bulletPattern = /[•-]\s*([^:]+):\s*([^\n]+)/g;
    while ((match = bulletPattern.exec(cardMarkdown)) !== null) {
      const label = match[1].trim().toLowerCase();
      const value = match[2].trim();
      
      if (!value || value.toLowerCase() === 'not specified') continue;
      
      for (const [pattern, fieldKey] of Object.entries(labelToFieldMap)) {
        if (label.includes(pattern) || pattern.includes(label)) {
          if (!fields[fieldKey]) fields[fieldKey] = value;
          break;
        }
      }
    }
    
    console.log('🔧 Extracted Pre-Op fields from markdown:', {
      procedureType,
      fieldsCount: Object.keys(fields).length,
      fields: Object.keys(fields)
    });
    
    if (Object.keys(fields).length > 0) {
      return {
        procedureType,
        cardMarkdown,
        jsonData: {
          procedure_type: procedureType,
          fields
        },
        completenessScore: `${Object.keys(fields).length} fields extracted from card`
      };
    }
  } catch (error) {
    console.warn('Failed to parse Pre-Op Plan from results:', error);
  }
  
  return null;
}

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
  /**
   * Retry transcription from stored audio when Transcription server was unavailable.
   */
  onRetryTranscription?: () => void;
  /**
   * Whether transcription retry is currently in progress
   */
  isRetryingTranscription?: boolean;
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
  pendingAudio?: {
    saved: boolean;
    audioPath?: string;
    savedAt?: number;
    failureReason?: string;
  };
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
  taviValidationResult?: ValidationResult | null;
  taviValidationStatus?: 'complete' | 'awaiting_validation';
  onTAVIReprocessWithValidation?: (fields: Record<string, any>) => void;
  // TAVI Proof Mode
  taviProofModeData?: {
    facts: KeyFact[];
    onComplete: (result: KeyFactsProofResult) => void;
    onCancel: () => void;
  } | null;
  // Angio/PCI Proof Mode
  angioProofModeData?: {
    facts: KeyFact[];
    onComplete: (result: KeyFactsProofResult) => void;
    onCancel: () => void;
    lesionTree?: import('@/types/medical.types').LesionTree;
    lesionExtractionMethod?: 'regex' | 'quick-model';
  } | null;
  angiogramValidationResult?: ValidationResult | null;
  angiogramValidationStatus?: 'complete' | 'awaiting_validation';
  onAngioReprocessWithValidation?: (fields: Record<string, any>) => void;
  mteerValidationResult?: ValidationResult | null;
  mteerValidationStatus?: 'complete' | 'awaiting_validation';
  onMTEERReprocessWithValidation?: (fields: Record<string, any>) => void;
  // Patient Education structured data
  educationData?: any; // Patient Education JSON metadata and letter content
  // Pre-Op Plan structured data
  preOpPlanData?: PreOpPlanReport['planData']; // Pre-Op Plan card and JSON metadata
  // Right Heart Cath structured data
  rhcReport?: any; // RightHeartCathReport with haemodynamic calculations
  onUpdateRhcReport?: (rhcReport: any) => void; // Callback to persist edited RHC report to session
  onRHCReprocessWithValidation?: (userFields: Record<string, any>) => void; // Callback for RHC validation reprocessing
  onOpenLesionReview?: () => void;
  // Pipeline progress for unified progress bar
  pipelineProgress?: PipelineProgress | null;
  processingStartTime?: number | null;
  sessionSource?: 'recording' | 'live' | 'mobile' | 'paste'; // Session source for progress filtering
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
  isViewingSession?: boolean;
  // OCR explanation from vision model (for image-based investigation summary)
  ocrExplanation?: string | null;
  // Next-Step Engine props
  nextStepStatus?: import('@/types/nextStep.types').NextStepStatus;
  nextStepResult?: import('@/types/nextStep.types').NextStepEngineResult | null;
  onNextStepIntegrate?: (suggestions: import('@/types/nextStep.types').NextStepSuggestion[]) => Promise<void>;
  onNextStepUndo?: () => void;
  canNextStepUndo?: boolean;
  isNextStepIntegrating?: boolean;
  nextStepIntegrationError?: string | null;
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
  onRetryTranscription,
  isRetryingTranscription = false,
  missingInfo,
  onReprocessWithAnswers,
  onDismissMissingInfo,
  isProcessing = false,
  failedAudioRecordings = [],
  onClearFailedRecordings,
  errors = [],
  reviewData,
  audioBlob,
  pendingAudio,
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
  taviValidationResult = null,
  taviValidationStatus,
  onTAVIReprocessWithValidation,
  // TAVI Proof Mode
  taviProofModeData = null,
  // Angio/PCI Proof Mode
  angioProofModeData = null,
  angiogramValidationResult = null,
  angiogramValidationStatus,
  onAngioReprocessWithValidation,
  mteerValidationResult = null,
  mteerValidationStatus,
  onMTEERReprocessWithValidation,
  // Patient Education structured data
  educationData,
  // Pre-Op Plan structured data
  preOpPlanData,
  // Right Heart Cath structured data
  rhcReport,
  onUpdateRhcReport,
  onRHCReprocessWithValidation,
  onOpenLesionReview,
  // Pipeline progress
  pipelineProgress,
  processingStartTime,
  sessionSource = 'recording', // Default to recording if not specified
  revisionPanel,
  revisionContext,
  onRevisionToggle,
  onRevisionChange,
  onRevisionSave,
  onRevisionDiscard,
  onRevisionMarkGoldenPair,
  isSavingRevision = false,
  isSavingGoldenPair = false,
  isViewingSession = false,
  ocrExplanation = null,
  // Next-Step Engine props
  nextStepStatus,
  nextStepResult,
  onNextStepIntegrate,
  onNextStepUndo,
  canNextStepUndo = false,
  isNextStepIntegrating = false,
  nextStepIntegrationError = null
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const angioValidation = useValidationCheckpoint<ValidationResult>({ agentType: 'angiogram-pci' });
  const mteerValidation = useValidationCheckpoint<ValidationResult>({ agentType: 'mteer' });

  // TAVI Proof Mode state
  const [showProofMode, setShowProofMode] = useState(false);
  const [proofFacts, setProofFacts] = useState<KeyFact[]>([]);
  const [proofConfig, setProofConfig] = useState<Partial<ProofModeConfig>>({ mode: 'visual' });
  const isTaviProofAgent = agentType === 'tavi' || agentType === 'tavi-workup';
  const proofModeFacts = useMemo(() => {
    if (isTaviProofAgent && taviProofModeData) {
      return taviProofModeData.facts;
    }
    if (agentType === 'angiogram-pci' && angioProofModeData) {
      return angioProofModeData.facts;
    }
    return [];
  }, [agentType, isTaviProofAgent, taviProofModeData, angioProofModeData]);
  const hasProofModeFacts = proofModeFacts.length > 0;

  const handleReviewWithAudio = useCallback(() => {
    if (!hasProofModeFacts) return;
    setProofFacts(proofModeFacts);
    setProofConfig(prev => ({ ...prev, mode: 'audio' }));
    setShowProofMode(true);
  }, [hasProofModeFacts, proofModeFacts]);

  const {
    showValidationModal: showAngioValidation,
    validationResult: activeAngioValidation,
    handleValidationRequired: handleAngioValidationRequired,
    handleValidationContinue: handleAngioValidationContinue,
    handleValidationCancel: handleAngioValidationCancel,
    handleValidationSkip: handleAngioValidationSkip,
    clearValidationState: clearAngioValidationState
  } = angioValidation;

  const {
    showValidationModal: showMTEERValidation,
    validationResult: activeMTEERValidation,
    handleValidationRequired: handleMTEERValidationRequired,
    handleValidationContinue: handleMTEERValidationContinue,
    handleValidationCancel: handleMTEERValidationCancel,
    handleValidationSkip: handleMTEERValidationSkip,
    clearValidationState: clearMTEERValidationState
  } = mteerValidation;

  useEffect(() => {
    if (agentType === 'angiogram-pci') {
      if (angiogramValidationStatus === 'awaiting_validation' && angiogramValidationResult) {
        handleAngioValidationRequired(angiogramValidationResult);
      } else if (angiogramValidationStatus && angiogramValidationStatus !== 'awaiting_validation') {
        clearAngioValidationState();
      }
    } else {
      clearAngioValidationState();
    }
  }, [
    agentType,
    angiogramValidationStatus,
    angiogramValidationResult,
    handleAngioValidationRequired,
    clearAngioValidationState
  ]);

  useEffect(() => {
    if (agentType === 'mteer') {
      if (mteerValidationStatus === 'awaiting_validation' && mteerValidationResult) {
        handleMTEERValidationRequired(mteerValidationResult);
      } else if (mteerValidationStatus && mteerValidationStatus !== 'awaiting_validation') {
        clearMTEERValidationState();
      }
    } else {
      clearMTEERValidationState();
    }
  }, [
    agentType,
    mteerValidationStatus,
    mteerValidationResult,
    handleMTEERValidationRequired,
    clearMTEERValidationState
  ]);

  // Proof Mode effect (TAVI and Angio/PCI)
  useEffect(() => {
    if (isTaviProofAgent && taviProofModeData) {
      setProofFacts(taviProofModeData.facts);
      setProofConfig(prev => ({ ...prev, mode: 'visual' }));
      setShowProofMode(true);
    } else if (agentType === 'angiogram-pci' && angioProofModeData) {
      setProofFacts(angioProofModeData.facts);
      setProofConfig(prev => ({ ...prev, mode: 'visual' }));
      setShowProofMode(true);
    } else {
      setShowProofMode(false);
    }
  }, [agentType, angioProofModeData, isTaviProofAgent, taviProofModeData]);

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
  // State for simple card (investigation-summary, background, medication) button feedback
  const [simpleCardButtonStates, setSimpleCardButtonStates] = useState({
    copied: false,
    inserted: false
  });
  const letterContentForActions = revisionPanel?.isEditing ? revisionPanel.edited : results;
  const hasTranscription = Boolean(originalTranscription && originalTranscription.trim().length > 0);
  const isRevisionOpen = !!(revisionPanel?.isEditing);
  const canEditAndTrain = Boolean(onRevisionToggle);
  const canReprocessQuickLetter = agentType === 'quick-letter' && !!onAgentReprocess && !!originalTranscription?.trim();
  const showProofFirstBadge = processingStatus !== 'complete' &&
    (agentType === 'angiogram-pci' || agentType === 'tavi-workup');
  const proofFirstLabel = agentType === 'angiogram-pci' ? 'Angio/PCI' : 'TAVI Workup';
  const actionRowCustomActions = useMemo(() => [
    ...(agentType === 'angiogram-pci' && onOpenLesionReview ? [{
      id: 'review-lesions',
      label: 'Lesions',
      icon: ({ className }: { className?: string }) => <GitBranch className={className} />,
      onClick: onOpenLesionReview,
      variant: 'secondary' as const
    }] : []),
    ...(hasProofModeFacts ? [{
      id: 'review-audio',
      label: 'Review Audio',
      icon: ({ className }: { className?: string }) => <Volume2 className={className} />,
      onClick: handleReviewWithAudio,
      variant: 'secondary' as const
    }] : []),
    ...(agentType === 'angiogram-pci' && onGeneratePatientVersion ? [{
      id: 'generate-patient-version',
      label: isGeneratingPatientVersion ? 'Generating...' : 'Patient Version',
      icon: ({ className }: { className?: string }) => (
        isGeneratingPatientVersion ? (
          <div className={`border-2 border-blue-300 border-t-transparent rounded-full animate-spin ${className}`}></div>
        ) : (
          <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        )
      ),
      onClick: onGeneratePatientVersion,
      disabled: isGeneratingPatientVersion,
      variant: 'secondary' as const
    }] : [])
  ], [
    agentType,
    handleReviewWithAudio,
    hasProofModeFacts,
    isGeneratingPatientVersion,
    onGeneratePatientVersion,
    onOpenLesionReview
  ]);

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
    await onCopy(letterContentForActions);
    setLetterButtonStates(prev => ({ ...prev, copied: true }));
    setTimeout(() => setLetterButtonStates(prev => ({ ...prev, copied: false })), 2000);
  }, [letterContentForActions, onCopy]);

  const handleLetterInsert = useCallback(async () => {
    await onInsertToEMR(letterContentForActions);
    setLetterButtonStates(prev => ({ ...prev, inserted: true }));
    setTimeout(() => setLetterButtonStates(prev => ({ ...prev, inserted: false })), 2000);
  }, [letterContentForActions, onInsertToEMR]);

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

  const handleQuickLetterReprocess = useCallback(() => {
    if (!onAgentReprocess || isProcessing || !canReprocessQuickLetter) {
      return;
    }
    onAgentReprocess('quick-letter');
  }, [canReprocessQuickLetter, isProcessing, onAgentReprocess]);

  // Simple card handlers (Investigation Summary, Background, Medication)
  const handleSimpleCardCopy = useCallback(async (text: string) => {
    await onCopy(text);
    setSimpleCardButtonStates(prev => ({ ...prev, copied: true }));
    setTimeout(() => setSimpleCardButtonStates(prev => ({ ...prev, copied: false })), 2000);
  }, [onCopy]);

  const handleSimpleCardInsert = useCallback(async (text: string) => {
    await onInsertToEMR(text);
    setSimpleCardButtonStates(prev => ({ ...prev, inserted: true }));
    setTimeout(() => setSimpleCardButtonStates(prev => ({ ...prev, inserted: false })), 2000);
  }, [onInsertToEMR]);

  // Keyboard shortcuts for simple card agents (Investigation Summary, Background, Medication)
  const isSimpleCardAgent = agentType === 'investigation-summary' || agentType === 'background' || agentType === 'medication';
  const resultsAvailable = !!results && !streaming && !isProcessing;
  
  useResultsKeyboardShortcuts({
    onCopy: isSimpleCardAgent && resultsAvailable ? () => handleSimpleCardCopy(results) : undefined,
    onInsert: isSimpleCardAgent && resultsAvailable ? () => handleSimpleCardInsert(results) : undefined,
    enabled: isSimpleCardAgent && resultsAvailable
  });

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

  // Debug Quick Letter display detection
  if (agentType === 'quick-letter' || results?.includes('I had the pleasure')) {
    console.log('🔍 Quick Letter Display Debug:', {
      agentType,
      hasResults: !!results,
      resultsLength: results?.length || 0,
      resultsPreview: results?.substring(0, 100),
      hasResultsSummary: !!resultsSummary,
      summaryLength: resultsSummary?.length || 0,
      summaryPreview: resultsSummary?.substring(0, 100),
      isQuickLetterDualCards,
      sessionSource: sessionSource || 'unknown',
      isViewingSession
    });
  }

  // Check if this is a TAVI Workup with structured display
  const isTAVIWorkup = agentType === 'tavi-workup' && results;

  // Check if this is a Right Heart Cath with structured display
  // Include sessions awaiting validation (no results yet, but need to show modal)
  const isRightHeartCath = agentType === 'right-heart-cath' && (results || rhcReport);

  // Check if this is a Patient Education with structured display
  const isPatientEducation = agentType === 'patient-education' && results;

  // Check if this is a Pre-Op Plan with structured display
  const isPreOpPlan = agentType === 'pre-op-plan' && results;

  // Debug Pre-Op Plan detection
  if (agentType === 'pre-op-plan') {
    console.log('🔍 Pre-Op Plan Detection Debug:', {
      agentType,
      hasResults: !!results,
      resultsLength: results?.length,
      isPreOpPlan,
      hasPreOpPlanData: !!preOpPlanData,
      preOpPlanDataKeys: preOpPlanData ? Object.keys(preOpPlanData) : null,
      procedureType: preOpPlanData?.procedureType,
      hasJsonData: !!preOpPlanData?.jsonData,
      fieldsCount: preOpPlanData?.jsonData?.fields ? Object.keys(preOpPlanData.jsonData.fields).length : 0,
      fieldsKeys: preOpPlanData?.jsonData?.fields ? Object.keys(preOpPlanData.jsonData.fields) : null
    });
  }

  // Determine which agent types have their own integrated transcription sections
  // These agents handle transcription display themselves, so we don't show the primary section
  const hasIntegratedTranscription = isTAVIWorkup || isRightHeartCath || isPatientEducation || isPreOpPlan;

  const showPrimaryTranscriptionSection =
    !streaming &&
    !hasIntegratedTranscription &&
    agentType !== 'investigation-summary' &&
    (hasTranscription || isViewingSession); // Show transcription section for viewed sessions even if empty (shows "not available" message)

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
      {/* Selected Session Indicator - Removed: Patient info now shown in green PatientContextHeader */}

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
                <h3 className="text-gray-900 font-medium text-sm">
                  {agentType === 'investigation-summary'
                    ? 'Investigation Summary'
                    : agentType === 'background'
                      ? 'Background'
                      : agentType === 'medication'
                        ? 'Medications'
                        : 'Final Proof'}
                </h3>
                <p className="text-emerald-700 text-xs">
                  {selectedSessionId ? 'Viewing previous session' : 'Processed output ready for review'}
                </p>
              </div>
            </>
          )}
        </div>
        
        <IconButton
          onClick={() => setIsExpanded(!isExpanded)}
          icon={isExpanded ? <EyeOff /> : <Eye />}
          variant="outline"
          size="sm"
          className="bg-white/60 border-emerald-200 hover:bg-emerald-50/60 text-emerald-600"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          title={isExpanded ? 'Collapse' : 'Expand'}
        />
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
                {/* Confidence indicator - show for investigation-summary, background, medication */}
                {(agentType === 'investigation-summary' || agentType === 'background' || agentType === 'medication') && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1" title="AI confidence">
                      <span>95%</span>
                      <CheckIcon className="w-3 h-3" />
                    </span>
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

      {showProofFirstBadge && (
        <div className="px-4 pt-3">
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            <span className="font-semibold">{proofFirstLabel} proof-first</span>
            <span className="text-amber-700">Review key facts before report generation.</span>
          </div>
        </div>
      )}

      {/* TAVI Workup Progress - Uses unified progress for consistency */}
      <AnimatePresence>
        {agentType === 'tavi-workup' && pipelineProgress && processingStatus !== 'complete' && (
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
              skipStages={sessionSource === 'mobile' ? ['audio-processing', 'transcribing'] : []}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unified Pipeline Progress for all agents during processing */}
      <AnimatePresence>
        {pipelineProgress && agentType !== 'tavi-workup' && processingStatus !== 'complete' && (
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
              skipStages={sessionSource === 'mobile' ? ['audio-processing', 'transcribing'] : []}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Original Transcription Section - Hide during streaming, show when complete */}
      {/* For investigation-summary, show transcription AFTER results (handled in content section) */}
      {/* TranscriptionSection handles its own empty state when transcription is not available */}
      <AnimatePresence>
        {showPrimaryTranscriptionSection && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: ANIMATION_DURATIONS.normal }}
          >
            <TranscriptionSection
              originalTranscription={originalTranscription ?? ''}
              sessionId={selectedSessionId}
              sessionSource={sessionSource}
              sessionErrors={errors}
              pendingAudio={pendingAudio}
              onTranscriptionCopy={onTranscriptionCopy}
              onTranscriptionInsert={onTranscriptionInsert}
              onTranscriptionEdit={onTranscriptionEdit}
              transcriptionSaveStatus={transcriptionSaveStatus}
              onAgentReprocess={onAgentReprocess}
              onRetryTranscription={onRetryTranscription}
              isRetryingTranscription={isRetryingTranscription}
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
                  originalTranscription={originalTranscription ?? ''}
                  sessionId={selectedSessionId}
                  sessionSource={sessionSource}
                  sessionErrors={errors}
                  pendingAudio={pendingAudio}
                  onTranscriptionCopy={onTranscriptionCopy}
                  onTranscriptionInsert={onTranscriptionInsert}
                  onTranscriptionEdit={onTranscriptionEdit}
                  transcriptionSaveStatus={transcriptionSaveStatus}
                  onAgentReprocess={onAgentReprocess}
                  onRetryTranscription={onRetryTranscription}
                  isRetryingTranscription={isRetryingTranscription}
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
                  <Button
                    onClick={onStopStreaming}
                    variant="danger"
                    size="sm"
                    className="text-xs px-2 py-1"
                  >
                    Stop
                  </Button>
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
                  <Button
                    onClick={onCancelStreaming}
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-800"
                    aria-label="Cancel streaming"
                  >
                    Cancel
                  </Button>
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
                hasTranscription,
                transcriptionLength: originalTranscription?.length || 0,
                hasAudioBlob: !!audioBlob,
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
                className="letter-card rounded-lg border border-emerald-200 bg-emerald-50 overflow-hidden"
                variants={withReducedMotion(cardVariants)}
              >
                {/* Header with title and actions */}
                <div className="px-4 py-3 border-b border-emerald-200 bg-emerald-100">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-emerald-800 font-semibold text-sm">Summary</h4>
                    <ActionSegmentedControl
                      onCopy={handleSummaryCopy}
                      onInsert={handleSummaryInsert}
                      copiedRecently={summaryButtonStates.copied}
                      insertedRecently={summaryButtonStates.inserted}
                      actions={['copy', 'insert']}
                    />
                  </div>
                </div>
                {/* Body content */}
                <div className="p-4 max-h-48 overflow-y-auto">
                  <div className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap">
                    {resultsSummary || (
                      <div className="text-gray-500 italic">
                        Summary not available - displaying full letter content below
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Letter Card */}
              <motion.div 
                className={`letter-card rounded-lg border overflow-hidden ${canNextStepUndo ? 'border-indigo-300 bg-indigo-50' : 'border-blue-200 bg-blue-50'}`}
                variants={withReducedMotion(cardVariants)}
              >
                {/* Header with title and actions */}
                <div className={`px-4 py-3 border-b ${canNextStepUndo ? 'border-indigo-200 bg-indigo-100' : 'border-blue-200 bg-blue-100'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h4 className={`font-semibold text-sm ${canNextStepUndo ? 'text-indigo-800' : 'text-blue-800'}`}>
                        {isRevisionOpen ? 'Letter (Editing)' : 'Letter'}
                      </h4>
                      {canNextStepUndo && (
                        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 bg-indigo-200 rounded">
                          Modified
                        </span>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <ActionSegmentedControl
                        onCopy={handleLetterCopy}
                        onInsert={handleLetterInsert}
                        onTrain={canEditAndTrain ? () => onRevisionToggle?.(!isRevisionOpen) : undefined}
                        onReprocess={canReprocessQuickLetter && !isProcessing ? handleQuickLetterReprocess : undefined}
                        onPatient={!isGeneratingPatientVersion ? onGeneratePatientVersion : undefined}
                        copiedRecently={letterButtonStates.copied}
                        insertedRecently={letterButtonStates.inserted}
                        actions={[
                          'copy',
                          'insert',
                          ...(canEditAndTrain ? ['train' as const] : []),
                          ...(canReprocessQuickLetter ? ['reprocess' as const] : []),
                          'patient' as const
                        ]}
                      />
                    </div>
                  </div>
                </div>
                {/* Body content */}
                <div className="p-4 max-h-96 overflow-y-auto">
                  {isRevisionOpen && revisionPanel ? (
                    <textarea
                      value={revisionPanel.edited}
                      onChange={handleRevisionTextChange}
                      className="w-full min-h-[220px] max-h-[360px] resize-y border border-blue-200 rounded-lg px-3 py-2 text-sm leading-relaxed bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="Update the letter content before saving a golden example..."
                      aria-label="Quick letter editable content"
                    />
                  ) : (
                    <div className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap">
                      {letterContentForActions}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Patient Version Card */}
              <AnimatePresence>
                {patientVersion && (
                  <motion.div 
                    className="letter-card rounded-lg border border-purple-200 bg-purple-50 overflow-hidden"
                    variants={withReducedMotion(cardVariants)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: 0.2 }}
                  >
                  {/* Header with title and actions */}
                  <div className="px-4 py-3 border-b border-purple-200 bg-purple-100">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-purple-800 font-semibold text-sm">Patient-Friendly Version</h4>
                      <ActionSegmentedControl
                        onCopy={handlePatientVersionCopy}
                        onInsert={handlePatientVersionInsert}
                        copiedRecently={patientVersionButtonStates.copied}
                        insertedRecently={patientVersionButtonStates.inserted}
                        actions={['copy', 'insert']}
                      />
                    </div>
                  </div>
                  {/* Body content */}
                  <div className="p-4 max-h-96 overflow-y-auto">
                    <div className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap">
                      {patientVersion}
                    </div>
                  </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Next-Step Suggestions Card - only show for quick-letter agent */}
              {agentType === 'quick-letter' && (nextStepStatus || nextStepResult) && (
                <NextStepSuggestionsCard
                  status={nextStepStatus || 'idle'}
                  result={nextStepResult || null}
                  onIntegrate={onNextStepIntegrate || (async () => {})}
                  onUndo={onNextStepUndo || (() => {})}
                  canUndo={canNextStepUndo}
                  isIntegrating={isNextStepIntegrating}
                  integrationError={nextStepIntegrationError || null}
                />
              )}

              {/* Transcription section now shown at the top with showPrimaryTranscriptionSection - no duplicate needed here */}
            </motion.div>
          ) : isTAVIWorkup ? (
            // TAVI Workup with transcription section + structured display
            <div className="space-y-6">
              {/* Transcription Section for TAVI */}
              <TranscriptionSection
                originalTranscription={originalTranscription || ''}
                sessionId={selectedSessionId}
                sessionSource={sessionSource}
                sessionErrors={errors}
                pendingAudio={pendingAudio}
                onTranscriptionCopy={onTranscriptionCopy}
                onTranscriptionInsert={onTranscriptionInsert}
                onTranscriptionEdit={onTranscriptionEdit}
                transcriptionSaveStatus={transcriptionSaveStatus}
                onAgentReprocess={onAgentReprocess}
                onRetryTranscription={onRetryTranscription}
                isRetryingTranscription={isRetryingTranscription}
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
                validationResult={taviValidationResult}
                validationStatus={taviValidationStatus}
                onReprocessWithValidation={onTAVIReprocessWithValidation}
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
            // Patient Education with transcription section + structured JSON metadata + letter display
            <div className="space-y-6">
              {/* Transcription Section for Patient Education */}
              <TranscriptionSection
                originalTranscription={originalTranscription || ''}
                sessionId={selectedSessionId}
                sessionSource={sessionSource}
                sessionErrors={errors}
                pendingAudio={pendingAudio}
                onTranscriptionCopy={onTranscriptionCopy}
                onTranscriptionInsert={onTranscriptionInsert}
                onTranscriptionEdit={onTranscriptionEdit}
                transcriptionSaveStatus={transcriptionSaveStatus}
                onAgentReprocess={onAgentReprocess}
                onRetryTranscription={onRetryTranscription}
                isRetryingTranscription={isRetryingTranscription}
                currentAgent={currentAgent}
                isProcessing={isProcessing}
                audioBlob={audioBlob}
                defaultExpanded={!resultsReady}
                collapseWhen={resultsReady}
                approvalState={approvalState}
                onTranscriptionApprove={onTranscriptionApprove}
              />
              
              {/* Patient Education Output Card */}
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
            </div>
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
                preOpPlanData: preOpPlanData || parsePreOpPlanFromResults(results) || {
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
            <div className="space-y-4">
              <ReportDisplay
                results={results}
                agentType={agentType}
                onCopy={handleSimpleCardCopy}
                onInsert={handleSimpleCardInsert}
                copiedRecently={simpleCardButtonStates.copied}
                insertedRecently={simpleCardButtonStates.inserted}
              />

              {/* OCR Explanation - collapsible, read-only for user insight (image-based investigation summary) */}
              {agentType === 'investigation-summary' && ocrExplanation && !streaming && (
                <div className="mt-4 mx-4">
                  <details className="group">
                    <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1.5 py-2">
                      <svg
                        className="w-3 h-3 transition-transform group-open:rotate-90"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="font-medium">AI Vision Interpretation</span>
                      <span className="text-gray-400">(what the AI extracted from the image)</span>
                    </summary>
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-[10px] text-gray-400 mb-2 italic">
                        This shows the raw extraction from the vision model - for your reference only, not copied with results
                      </p>
                      <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap select-none">
                        {ocrExplanation}
                      </div>
                    </div>
                  </details>
                </div>
              )}

              {/* Show transcription AFTER results for investigation-summary */}
              {(agentType === 'investigation-summary' && !streaming && (hasTranscription || isViewingSession)) && (
                <TranscriptionSection
                  originalTranscription={originalTranscription ?? ''}
                  sessionId={selectedSessionId}
                  sessionSource={sessionSource}
                  sessionErrors={errors}
                  pendingAudio={pendingAudio}
                  onTranscriptionCopy={onTranscriptionCopy}
                  onTranscriptionInsert={onTranscriptionInsert}
                  onTranscriptionEdit={onTranscriptionEdit}
                  transcriptionSaveStatus={transcriptionSaveStatus}
                  onAgentReprocess={onAgentReprocess}
                  onRetryTranscription={onRetryTranscription}
                  isRetryingTranscription={isRetryingTranscription}
                  currentAgent={currentAgent}
                  isProcessing={isProcessing}
                  audioBlob={audioBlob}
                  defaultExpanded={!resultsReady}
                  collapseWhen={resultsReady}
                  approvalState={approvalState}
                  onTranscriptionApprove={onTranscriptionApprove}
                  className="mt-4 pt-3 border-t border-gray-200"
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
                  <Button
                    onClick={handlePatientVersionCopy}
                    variant={patientVersionButtonStates.copied ? 'success' : 'outline'}
                    size="md"
                    icon={patientVersionButtonStates.copied ? <CheckIcon className="w-4 h-4 text-blue-600 checkmark-appear" /> : <AnimatedCopyIcon className="w-4 h-4" title="Copy" />}
                    isSuccess={patientVersionButtonStates.copied}
                    className={`p-3 flex flex-col items-center space-y-1 ${
                      patientVersionButtonStates.copied
                        ? 'bg-blue-500/20 border-blue-400 text-blue-700 completion-celebration'
                        : 'bg-white/60 border-blue-200 hover:bg-blue-50/60 text-gray-700'
                    }`}
                  >
                    <span className={`text-xs ${patientVersionButtonStates.copied ? 'text-blue-700' : 'text-gray-700'}`}>
                      {patientVersionButtonStates.copied ? 'Copied!' : 'Copy'}
                    </span>
                  </Button>

                  {/* Insert Patient Version Button */}
                  <Button
                    onClick={handlePatientVersionInsert}
                    variant={patientVersionButtonStates.inserted ? 'success' : 'outline'}
                    size="md"
                    icon={patientVersionButtonStates.inserted ? <CheckIcon className="w-4 h-4 text-blue-600 checkmark-appear" /> : <SquareIcon className="w-4 h-4" />}
                    isSuccess={patientVersionButtonStates.inserted}
                    className={`p-3 flex flex-col items-center space-y-1 ${
                      patientVersionButtonStates.inserted
                        ? 'bg-blue-500/20 border-blue-400 text-blue-700 completion-celebration'
                        : 'bg-white/60 border-blue-200 hover:bg-blue-50/60 text-gray-700'
                    }`}
                  >
                    <span className={`text-xs ${patientVersionButtonStates.inserted ? 'text-blue-700' : 'text-gray-700'}`}>
                      {patientVersionButtonStates.inserted ? 'Inserted!' : 'Insert'}
                    </span>
                  </Button>

                  {/* Download Patient Version Button */}
                  <Button
                    onClick={handlePatientVersionDownload}
                    variant="outline"
                    size="md"
                    icon={<Download className="w-4 h-4" />}
                    className="bg-white/60 border-blue-200 p-3 flex flex-col items-center space-y-1 hover:bg-blue-50/60 text-gray-700"
                  >
                    <span className="text-xs text-gray-700">Download</span>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions - Only for regular reports, not AI Review, Quick Letter dual cards, TAVI workup, RHC, or simple cards, and NOT while processing */}
      <AnimatePresence>
        {!isProcessing && !isAIReview && !isQuickLetterDualCards && !isTAVIWorkup && !isRightHeartCath && 
         agentType !== 'investigation-summary' && agentType !== 'background' && agentType !== 'medication' && (
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
              customActions={actionRowCustomActions}
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
                <Button
                  type="button"
                  onClick={() => onRevisionToggle?.(false)}
                  variant="ghost"
                  size="sm"
                  startIcon={<X className="w-3 h-3" />}
                  className="text-xs text-blue-700 hover:text-blue-900"
                >
                  Close
                </Button>
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
                <Button
                  type="button"
                  onClick={onRevisionDiscard}
                  disabled={!revisionPanel.hasUnsavedChanges || isSavingRevision}
                  variant="outline"
                  size="md"
                  className={revisionPanel.hasUnsavedChanges && !isSavingRevision
                    ? 'border-blue-300 text-blue-700 hover:bg-blue-100'
                    : 'border-blue-100 text-blue-400'}
                >
                  Reset
                </Button>
                <Button
                  data-testid="save-revision-btn"
                  type="button"
                  onClick={onRevisionSave}
                  disabled={isRevisionSaveDisabled}
                  variant="primary"
                  size="md"
                  isLoading={isSavingRevision}
                  startIcon={isSavingRevision ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
                  className={isRevisionSaveDisabled
                    ? 'bg-blue-200 border-blue-200 text-white'
                    : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'}
                >
                  Save Revision
                </Button>
                <Button
                  data-testid="mark-golden-pair-btn"
                  type="button"
                  onClick={onRevisionMarkGoldenPair}
                  disabled={isGoldenPairDisabled}
                  variant="success"
                  size="md"
                  isLoading={isSavingGoldenPair}
                  startIcon={isSavingGoldenPair ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  className={isGoldenPairDisabled
                    ? 'bg-emerald-200 border-emerald-200 text-white'
                    : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'}
                >
                  Mark as Golden Pair
                </Button>
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

      {agentType === 'angiogram-pci' && showAngioValidation && activeAngioValidation && (
        <FieldValidationPrompt
          agentLabel="Angiogram/PCI"
          validation={activeAngioValidation}
          fieldConfig={ANGIO_VALIDATION_FIELD_CONFIG}
          copy={ANGIO_VALIDATION_COPY}
          onCancel={() => {
            console.log('🚫 Angio Display: Validation cancelled');
            handleAngioValidationCancel();
          }}
          onSkip={() => {
            console.log('⏭️ Angio Display: Validation skipped');
            handleAngioValidationSkip();
            // TODO: Force generation with incomplete data
          }}
          onContinue={(userFields) => {
            console.log('✅ Angio Display: Validation complete, user fields:', userFields);
            handleAngioValidationContinue(userFields);
            if (onAngioReprocessWithValidation) {
              onAngioReprocessWithValidation(userFields);
            }
          }}
        />
      )}

      {agentType === 'mteer' && showMTEERValidation && activeMTEERValidation && (
        <FieldValidationPrompt
          agentLabel="mTEER Procedure"
          validation={activeMTEERValidation}
          fieldConfig={MTEER_VALIDATION_FIELD_CONFIG}
          copy={MTEER_VALIDATION_COPY}
          onCancel={() => {
            console.log('🚫 mTEER Display: Validation cancelled');
            handleMTEERValidationCancel();
          }}
          onSkip={() => {
            console.log('⏭️ mTEER Display: Validation skipped');
            handleMTEERValidationSkip();
            // TODO: Force generation with incomplete data
          }}
          onContinue={(userFields) => {
            console.log('✅ mTEER Display: Validation complete, user fields:', userFields);
            handleMTEERValidationContinue(userFields);
            if (onMTEERReprocessWithValidation) {
              onMTEERReprocessWithValidation(userFields);
            }
          }}
        />
      )}

      {/* Proof Mode Dialog (TAVI or Angio/PCI) */}
      {((isTaviProofAgent && taviProofModeData) ||
        (agentType === 'angiogram-pci' && angioProofModeData)) &&
        showProofMode && proofFacts.length > 0 && (
        <KeyFactsProofDialog
          facts={proofFacts}
          agentLabel={isTaviProofAgent ? 'TAVI Procedure' : 'Angiogram/PCI'}
          onComplete={(result) => {
            console.log(`✅ ${agentType} Proof Mode: Facts confirmed`, result);
            setShowProofMode(false);
            if (isTaviProofAgent && taviProofModeData) {
              taviProofModeData.onComplete(result);
            } else if (agentType === 'angiogram-pci' && angioProofModeData) {
              angioProofModeData.onComplete(result);
            }
          }}
          onCancel={() => {
            console.log(`🚫 ${agentType} Proof Mode: Cancelled`);
            setShowProofMode(false);
            if (isTaviProofAgent && taviProofModeData) {
              taviProofModeData.onCancel();
            } else if (agentType === 'angiogram-pci' && angioProofModeData) {
              angioProofModeData.onCancel();
            }
          }}
          isOpen={showProofMode}
          initialConfig={proofConfig}
          lesionTree={agentType === 'angiogram-pci' ? angioProofModeData?.lesionTree : undefined}
          lesionExtractionMethod={agentType === 'angiogram-pci' ? angioProofModeData?.lesionExtractionMethod : undefined}
        />
      )}

    </motion.div>
  );
});

OptimizedResultsPanel.displayName = 'OptimizedResultsPanel';

export { OptimizedResultsPanel };
