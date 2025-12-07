/**
 * Transcription Section Component
 * 
 * Focused component for displaying and managing original transcription:
 * - Expandable transcription view
 * - Copy and insert actions
 * - Reprocessing with different agents
 * - Memoized for performance
 */

import React, { memo, useState } from 'react';
import {
  FileTextIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '../icons/OptimizedIcons';
import { ThumbsUp, Edit3, SkipForward } from 'lucide-react';
import { AudioPlayback } from '../AudioPlayback';
import { AudioScrubber } from '../ui/AudioScrubber';
import { Button } from '../buttons';
import { ActionSegmentedControl } from '../ui/SegmentedControl';
import { StatusBadge } from '../status';
import type { AgentType } from '@/types/medical.types';
import type { TranscriptionApprovalStatus, TranscriptionApprovalState } from '@/types/optimization';
import type { ProcessingState } from '@/utils/stateColors';

interface TranscriptionSectionProps {
  originalTranscription: string;
  onTranscriptionCopy?: (text: string) => void;
  onTranscriptionInsert?: (text: string) => void;
  onTranscriptionEdit?: (text: string) => void;
  transcriptionSaveStatus?: {
    status: 'idle' | 'saving' | 'saved' | 'error';
    message: string;
    timestamp?: Date;
  };
  onAgentReprocess?: (agentType: AgentType) => void;
  /**
   * Retry transcription from stored audio when Whisper server was unavailable.
   * Only shown when transcription failed and audioBlob is available.
   */
  onRetryTranscription?: () => void;
  /**
   * Whether transcription retry is currently in progress
   */
  isRetryingTranscription?: boolean;
  currentAgent?: AgentType | null;
  isProcessing?: boolean;
  className?: string;
  audioBlob?: Blob | null;
  /**
   * Expand transcription by default (e.g., while waiting for results)
   */
  defaultExpanded?: boolean;
  /**
   * When this becomes true, auto-collapse the transcription view
   */
  collapseWhen?: boolean;
  // Transcription approval props
  approvalState?: TranscriptionApprovalState;
  onTranscriptionApprove?: (status: TranscriptionApprovalStatus) => void;
}

// Helper to map approval status to processing state
const mapApprovalToState = (status: TranscriptionApprovalStatus): ProcessingState => {
  switch (status) {
    case 'approved':
      return 'completed';
    case 'edited':
      return 'needs_review';
    case 'skipped':
      return 'error';
    case 'pending':
    default:
      return 'processing';
  }
};

const getApprovalLabel = (status: TranscriptionApprovalStatus): string => {
  switch (status) {
    case 'pending':
      return '⏳ Not Reviewed';
    case 'approved':
      return '✅ Approved';
    case 'edited':
      return '✏️ Edited';
    case 'skipped':
      return '⏭️ Skipped';
    default:
      return 'Unknown';
  }
};

const TranscriptionSection: React.FC<TranscriptionSectionProps> = memo(({
  originalTranscription,
  onTranscriptionCopy,
  onTranscriptionInsert,
  onTranscriptionEdit,
  transcriptionSaveStatus,
  onAgentReprocess,
  onRetryTranscription,
  isRetryingTranscription = false,
  currentAgent,
  isProcessing = false,
  className = '',
  audioBlob,
  defaultExpanded = false,
  collapseWhen,
  approvalState,
  onTranscriptionApprove
}) => {
  const [transcriptionExpanded, setTranscriptionExpanded] = useState(!!defaultExpanded);
  const [transcriptionCopied, setTranscriptionCopied] = useState(false);
  const [transcriptionInserted, setTranscriptionInserted] = useState(false);
  const [editedTranscription, setEditedTranscription] = useState(originalTranscription || '');
  const [reprocessExpanded, setReprocessExpanded] = useState(false);

  // Audio scrubber state
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Initialize audio element when blob is available
  React.useEffect(() => {
    if (!audioBlob) {
      setAudioUrl(null);
      setAudioElement(null);
      return;
    }

    const url = URL.createObjectURL(audioBlob);
    setAudioUrl(url);

    const audio = new Audio(url);
    audio.addEventListener('loadedmetadata', () => {
      setAudioDuration(audio.duration);
    });
    audio.addEventListener('timeupdate', () => {
      setAudioCurrentTime(audio.currentTime);
    });
    audio.addEventListener('ended', () => {
      setIsAudioPlaying(false);
      setAudioCurrentTime(0);
    });
    audio.addEventListener('play', () => {
      setIsAudioPlaying(true);
    });
    audio.addEventListener('pause', () => {
      setIsAudioPlaying(false);
    });
    setAudioElement(audio);

    return () => {
      audio.pause();
      URL.revokeObjectURL(url);
    };
  }, [audioBlob]);

  // Detect if transcription is an error/failure message that can be retried
  const isTranscriptionError = React.useMemo(() => {
    if (!originalTranscription) return false;
    const lowerText = originalTranscription.toLowerCase();
    const isPlaceholder = originalTranscription.startsWith('[') && originalTranscription.endsWith(']');
    const hasErrorKeywords = lowerText.includes('server not running') ||
                             lowerText.includes('transcription failed') ||
                             lowerText.includes('whisper server') ||
                             lowerText.includes('server unavailable') ||
                             lowerText.includes('timeout') ||
                             lowerText.includes('can be reprocessed');
    return isPlaceholder && hasErrorKeywords;
  }, [originalTranscription]);

  // Show retry button if: transcription failed and retry callback provided
  // Audio may be in memory (audioBlob) or persisted to disk (will be retrieved by retry handler)
  const canRetryTranscription = isTranscriptionError && !!onRetryTranscription;

  const handleAudioPlayPause = () => {
    if (!audioElement) return;
    if (isAudioPlaying) {
      audioElement.pause();
    } else {
      audioElement.play();
    }
    setIsAudioPlaying(!isAudioPlaying);
  };

  const handleAudioSeek = (time: number) => {
    if (!audioElement) return;
    audioElement.currentTime = time;
    setAudioCurrentTime(time);
  };

  const handleAudioMuteToggle = () => {
    if (!audioElement) return;
    audioElement.muted = !isAudioMuted;
    setIsAudioMuted(!isAudioMuted);
  };

  // Component renders optimally when memoized properly

  // Auto-collapse when signaled (e.g., once results are ready)
  React.useEffect(() => {
    if (collapseWhen && transcriptionExpanded) {
      setTranscriptionExpanded(false);
    }
  }, [collapseWhen]);

  // Sync edited transcription when original changes
  React.useEffect(() => {
    setEditedTranscription(originalTranscription);
  }, [originalTranscription]);

  // Handle transcription editing
  const handleTranscriptionChange = (newValue: string) => {
    setEditedTranscription(newValue);
    if (onTranscriptionEdit) {
      onTranscriptionEdit(newValue);
    }
  };

  // Available agents for reprocessing - grouped by category
  const availableAgents = [
    // Letters & Correspondence
    { id: 'quick-letter', label: 'Quick Letter', icon: '📝' },
    { id: 'consultation', label: 'Consultation', icon: '👨‍⚕️' },
    { id: 'patient-education', label: 'Patient Education', icon: '📚' },
    // Clinical Data
    { id: 'background', label: 'Background', icon: '📋' },
    { id: 'investigation-summary', label: 'Investigation', icon: '🔬' },
    { id: 'medication', label: 'Medications', icon: '💊' },
    { id: 'bloods', label: 'Bloods', icon: '🩸' },
    { id: 'imaging', label: 'Imaging', icon: '🖼️' },
    // Procedures - Structural
    { id: 'tavi', label: 'TAVI', icon: '🫀' },
    { id: 'tavi-workup', label: 'TAVI Workup', icon: '📊' },
    { id: 'mteer', label: 'mTEER', icon: '🔧' },
    { id: 'tteer', label: 'tTEER', icon: '🔩' },
    { id: 'pfo-closure', label: 'PFO Closure', icon: '🩹' },
    { id: 'asd-closure', label: 'ASD Closure', icon: '🫁' },
    { id: 'pvl-plug', label: 'PVL Plug', icon: '🔌' },
    // Procedures - Coronary
    { id: 'angiogram-pci', label: 'Angiogram/PCI', icon: '🩺' },
    { id: 'bypass-graft', label: 'Bypass Graft', icon: '🔀' },
    // Procedures - Diagnostic
    { id: 'right-heart-cath', label: 'Right Heart Cath', icon: '💓' },
    // Planning
    { id: 'pre-op-plan', label: 'Pre-Op Plan', icon: '📑' },
  ] as const;

  const handleTranscriptionCopy = async () => {
    if (onTranscriptionCopy) {
      try {
        await onTranscriptionCopy(editedTranscription);
        setTranscriptionCopied(true);
        setTimeout(() => setTranscriptionCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy transcription:', error);
      }
    }
  };

  const handleTranscriptionInsert = async () => {
    if (onTranscriptionInsert) {
      try {
        await onTranscriptionInsert(editedTranscription);
        setTranscriptionInserted(true);
        setTimeout(() => setTranscriptionInserted(false), 2000);
      } catch (error) {
        console.error('Failed to insert transcription:', error);
      }
    }
  };

  const handleReprocess = (agentType: AgentType) => {
    if (onAgentReprocess && !isProcessing) {
      onAgentReprocess(agentType);
    }
  };

  return (
    <div className={`border-b border-gray-200/50 ${className} ${
      isProcessing ? 'bg-blue-50/30 border-b-blue-200/50' : ''
    }`}>
      {/* Header row with title, chevron, and action buttons all on same line */}
      <div className={`flex items-center justify-between px-4 py-3 ${
        isProcessing ? 'hover:bg-blue-50/60' : 'hover:bg-gray-50/50'
      }`}>
        {/* Left side: clickable header with icon, title, and chevron */}
        <button
          onClick={() => setTranscriptionExpanded(!transcriptionExpanded)}
          className="flex items-center gap-2 min-w-0 text-left bg-transparent border-none cursor-pointer p-0"
        >
          <FileTextIcon className={`w-4 h-4 flex-shrink-0 ${isProcessing ? 'text-blue-600' : 'text-gray-600'}`} />
          <span className={`font-medium text-sm ${isProcessing ? 'text-blue-900' : 'text-gray-900'}`}>
            Transcription
          </span>
          {editedTranscription !== originalTranscription && (
            <span className="text-xs text-blue-600">(edited)</span>
          )}
          {transcriptionExpanded ? (
            <ChevronUpIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          )}
        </button>

        {/* Right side: action buttons */}
        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <ActionSegmentedControl
            onCopy={onTranscriptionCopy ? handleTranscriptionCopy : undefined}
            onInsert={onTranscriptionInsert ? handleTranscriptionInsert : undefined}
            onReprocess={onAgentReprocess ? () => {
              // If transcription is collapsed, expand it first then toggle reprocess
              if (!transcriptionExpanded) {
                setTranscriptionExpanded(true);
                setReprocessExpanded(true);
              } else {
                setReprocessExpanded(!reprocessExpanded);
              }
            } : undefined}
            copiedRecently={transcriptionCopied}
            insertedRecently={transcriptionInserted}
            actions={[
              ...(onTranscriptionCopy ? ['copy' as const] : []),
              ...(onTranscriptionInsert ? ['insert' as const] : []),
              ...(onAgentReprocess ? ['reprocess' as const] : [])
            ]}
          />
        </div>
      </div>

      {/* Collapsed Audio Scrubber - shows when collapsed and audio available */}
      {!transcriptionExpanded && audioBlob && audioUrl && (
        <div className="px-4 pb-3 -mt-1">
          <AudioScrubber
            audioBlob={audioBlob}
            currentTime={audioCurrentTime}
            duration={audioDuration}
            isPlaying={isAudioPlaying}
            isMuted={isAudioMuted}
            onSeek={handleAudioSeek}
            onPlayPause={handleAudioPlayPause}
            onMuteToggle={handleAudioMuteToggle}
            className="bg-gray-50/50 rounded-lg px-2 py-1.5"
          />
        </div>
      )}

      {/* Expanded Transcription Content */}
      {transcriptionExpanded && (
        <div className="px-4 pb-4">
          <div className="bg-gray-50/80 rounded-card p-2 border border-gray-200/50">
            {/* Save Status Feedback */}
            {transcriptionSaveStatus && transcriptionSaveStatus.status !== 'idle' && (
              <div className={`flex items-center space-x-2 mb-2 p-2 rounded text-xs ${
                transcriptionSaveStatus.status === 'saving' 
                  ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' 
                  : transcriptionSaveStatus.status === 'saved'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {transcriptionSaveStatus.status === 'saving' && (
                  <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                )}
                <span>{transcriptionSaveStatus.message}</span>
                {transcriptionSaveStatus.timestamp && (
                  <span className="opacity-70">
                    at {transcriptionSaveStatus.timestamp.toLocaleTimeString()}
                  </span>
                )}
              </div>
            )}

            {/* Transcription Approval Controls */}
            {approvalState && onTranscriptionApprove && (
              <div className="mb-3 p-3 bg-white border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-800">Transcription</h4>
                  <StatusBadge
                    state={mapApprovalToState(approvalState.status)}
                    size="sm"
                    label={getApprovalLabel(approvalState.status)}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    onClick={() => onTranscriptionApprove('approved')}
                    disabled={approvalState.status === 'approved'}
                    variant="outline"
                    size="md"
                    startIcon={<ThumbsUp className="w-4 h-4" />}
                    className={`${
                      approvalState.status === 'approved'
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'border-2 hover:border-green-400 hover:bg-green-50'
                    }`}
                    title="Mark this transcription as perfect for training"
                  >
                    Perfect
                  </Button>

                  <Button
                    type="button"
                    onClick={() => {
                      if (approvalState.status !== 'edited') {
                        onTranscriptionApprove('edited');
                      }
                    }}
                    variant="outline"
                    size="md"
                    startIcon={<Edit3 className="w-4 h-4" />}
                    className={`${
                      approvalState.status === 'edited'
                        ? 'bg-orange-100 text-orange-700 border-orange-200'
                        : 'border-2 hover:border-orange-400 hover:bg-orange-50'
                    }`}
                    title="Edit this transcription to improve accuracy"
                  >
                    Edit
                  </Button>

                  <Button
                    type="button"
                    onClick={() => onTranscriptionApprove('skipped')}
                    disabled={approvalState.status === 'skipped'}
                    variant="outline"
                    size="md"
                    startIcon={<SkipForward className="w-4 h-4" />}
                    className={`${
                      approvalState.status === 'skipped'
                        ? 'bg-gray-100 text-gray-700 border-gray-200'
                        : 'border-2 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                    title="Skip this transcription for training"
                  >
                    Skip
                  </Button>
                </div>

                {/* Send for Corrections button - only show when edited */}
                {approvalState.status === 'edited' && (
                  <Button
                    type="button"
                    onClick={() => {
                      // Submit edited transcription for training by marking as approved
                      console.log('✅ Submitting edited transcription for training');
                      onTranscriptionApprove('approved');
                    }}
                    variant="primary"
                    size="md"
                    fullWidth
                    className="mt-2"
                    title="Submit your corrections to improve AI training"
                  >
                    Send for Corrections
                  </Button>
                )}
              </div>
            )}
            
            <div className="relative">
              <textarea
                value={editedTranscription}
                onChange={(e) => handleTranscriptionChange(e.target.value)}
                disabled={!onTranscriptionEdit}
                className={`w-full h-32 p-2 text-sm text-gray-900 bg-white border border-gray-200 rounded resize-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 leading-relaxed ${
                  !onTranscriptionEdit ? 'opacity-60 cursor-not-allowed' : ''
                }`}
                placeholder={onTranscriptionEdit
                  ? "Edit transcription to improve accuracy - corrections will be submitted for training only with your approval..."
                  : "Transcription editing not available"
                }
                title={onTranscriptionEdit
                  ? "Edit the transcription to improve accuracy. Training data is only submitted when you explicitly approve it."
                  : "Transcription editing not available"
                }
              />
            </div>
          </div>

          {/* Retry Transcription Banner - shown when transcription failed but audio is available */}
          {canRetryTranscription && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-card">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-amber-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">
                    Transcription Failed - Audio Available
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    The Whisper server wasn't running when this was recorded. Your audio is still available and can be re-transcribed.
                  </p>
                  <Button
                    onClick={onRetryTranscription}
                    disabled={isRetryingTranscription || isProcessing}
                    variant="primary"
                    size="sm"
                    className="mt-2 bg-amber-600 hover:bg-amber-700"
                  >
                    {isRetryingTranscription ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                        Retrying Transcription...
                      </>
                    ) : (
                      <>🔄 Retry Transcription</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}


          {/* Audio Playback Component with Quality Bar */}
          {audioBlob && (
            <div className="mt-3">
              <AudioPlayback
                audioBlob={audioBlob}
                fileName={`transcription-${currentAgent || 'recording'}`}
                className=""
                showQualityBar={true}
                defaultExpanded={false}
              />
            </div>
          )}
          
          {/* Reprocess agents - Collapsible */}
          {onAgentReprocess && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <Button
                onClick={() => setReprocessExpanded(!reprocessExpanded)}
                variant="ghost"
                size="sm"
                fullWidth
                className="justify-between px-2 py-1"
                endIcon={reprocessExpanded ? <ChevronUpIcon className="w-3 h-3 text-gray-400" /> : <ChevronDownIcon className="w-3 h-3 text-gray-400" />}
              >
                <p className="text-xs text-gray-600">Reprocess ({availableAgents.length} agents)</p>
              </Button>

              {reprocessExpanded && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {availableAgents.map((agent) => (
                    <Button
                      key={agent.id}
                      onClick={() => handleReprocess(agent.id as AgentType)}
                      disabled={isProcessing}
                      variant={currentAgent === agent.id ? 'outline' : 'ghost'}
                      size="sm"
                      className={`text-xs ${
                        currentAgent === agent.id
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'bg-white border-gray-200 text-gray-700'
                      }`}
                    >
                      <span>{agent.icon}</span>
                      <span className="ml-1">{agent.label}</span>
                      {currentAgent === agent.id && (
                        <span className="ml-1 text-xs text-blue-500">•</span>
                      )}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

TranscriptionSection.displayName = 'TranscriptionSection';

export { TranscriptionSection };
