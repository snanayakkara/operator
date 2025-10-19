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
  CheckIcon, 
  SquareIcon, 
  ChevronDownIcon, 
  ChevronUpIcon 
} from '../icons/OptimizedIcons';
import AnimatedCopyIcon from '../../components/AnimatedCopyIcon';
import { RefreshCw, ThumbsUp, Edit3, SkipForward } from 'lucide-react';
import { AudioPlayback } from '../AudioPlayback';
import type { AgentType } from '@/types/medical.types';
import type { TranscriptionApprovalStatus, TranscriptionApprovalState } from '@/types/optimization';

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

const TranscriptionSection: React.FC<TranscriptionSectionProps> = memo(({
  originalTranscription,
  onTranscriptionCopy,
  onTranscriptionInsert,
  onTranscriptionEdit,
  transcriptionSaveStatus,
  onAgentReprocess,
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

  // Available agents for reprocessing
  const availableAgents = [
    { id: 'tavi', label: 'TAVI', icon: '🫀' },
    { id: 'angiogram-pci', label: 'Angiogram/PCI', icon: '🩺' },
    { id: 'quick-letter', label: 'Quick Letter', icon: '📝' },
    { id: 'consultation', label: 'Consultation', icon: '👨‍⚕️' },
    { id: 'investigation-summary', label: 'Investigation', icon: '🔬' }
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
      <button
        onClick={() => setTranscriptionExpanded(!transcriptionExpanded)}
        className={`w-full p-4 text-left transition-colors flex items-center justify-between ${
          isProcessing
            ? 'hover:bg-blue-50/60'
            : 'hover:bg-gray-50/50'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <FileTextIcon className={`w-4 h-4 flex-shrink-0 ${isProcessing ? 'text-blue-600' : 'text-gray-600'}`} />
          <span className={`font-medium text-sm leading-none ${isProcessing ? 'text-blue-900' : 'text-gray-900'}`}>
            Original Transcription
          </span>
          {isProcessing && (
            <span className="inline-flex items-center h-6 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium leading-none">
              Processing...
            </span>
          )}
          <span className="text-xs text-gray-500 leading-none">
            {(editedTranscription || '').split(' ').filter(w => w.trim()).length} words
            {editedTranscription !== originalTranscription && (
              <span className="text-blue-600 ml-1">(edited)</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Transcription Actions - Enhanced during processing */}
          {onTranscriptionCopy && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleTranscriptionCopy();
              }}
              className={`inline-flex items-center gap-1.5 h-6 rounded transition-all duration-200 ${
                isProcessing
                  ? 'px-2 py-1 bg-blue-50 border border-blue-200 hover:bg-blue-100 shadow-sm'
                  : 'px-1.5 py-1 hover:bg-gray-100'
              }`}
              title={isProcessing ? "Copy raw transcription" : "Copy transcription"}
            >
              {transcriptionCopied ? (
                <CheckIcon className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
              ) : (
                <AnimatedCopyIcon className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" title="Copy transcription" />
              )}
              {isProcessing && (
                <span className="text-xs text-blue-700 font-medium leading-none whitespace-nowrap">Copy Raw</span>
              )}
            </button>
          )}
          
          {onTranscriptionInsert && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleTranscriptionInsert();
              }}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
              title="Insert transcription to EMR"
            >
              {transcriptionInserted ? (
                <CheckIcon className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <SquareIcon className="w-3.5 h-3.5 text-blue-500" />
              )}
            </button>
          )}

          {/* Reprocess indicator */}
          {onAgentReprocess && (
            <div className="p-1.5">
              <RefreshCw className={`w-3.5 h-3.5 text-purple-500 ${isProcessing ? 'animate-spin' : ''}`} />
            </div>
          )}
          
          {transcriptionExpanded ? (
            <ChevronUpIcon className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Transcription Content */}
      {transcriptionExpanded && (
        <div className="px-4 pb-4">
          <div className="bg-gray-50/80 rounded-lg p-2 border border-gray-200/50">
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
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    approvalState.status === 'pending' ? 'bg-gray-100 text-gray-700' :
                    approvalState.status === 'approved' ? 'bg-green-100 text-green-700' :
                    approvalState.status === 'edited' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {approvalState.status === 'pending' && '⏳ Not Reviewed'}
                    {approvalState.status === 'approved' && '✅ Approved'}
                    {approvalState.status === 'edited' && '✏️ Edited'}
                    {approvalState.status === 'skipped' && '⏭️ Skipped'}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => onTranscriptionApprove('approved')}
                    disabled={approvalState.status === 'approved'}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center space-x-2 ${
                      approvalState.status === 'approved'
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-green-400 hover:bg-green-50'
                    }`}
                    title="Mark this transcription as perfect for training"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>Perfect</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (approvalState.status !== 'edited') {
                        onTranscriptionApprove('edited');
                      }
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center space-x-2 ${
                      approvalState.status === 'edited'
                        ? 'bg-orange-100 text-orange-700 border border-orange-200'
                        : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-orange-400 hover:bg-orange-50'
                    }`}
                    title="Edit this transcription to improve accuracy"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onTranscriptionApprove('skipped')}
                    disabled={approvalState.status === 'skipped'}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center space-x-2 ${
                      approvalState.status === 'skipped'
                        ? 'bg-gray-100 text-gray-700 border border-gray-200'
                        : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                    title="Skip this transcription for training"
                  >
                    <SkipForward className="w-4 h-4" />
                    <span>Skip</span>
                  </button>
                </div>

                {/* Send for Corrections button - only show when edited */}
                {approvalState.status === 'edited' && (
                  <button
                    type="button"
                    onClick={() => {
                      // Submit edited transcription for training by marking as approved
                      console.log('✅ Submitting edited transcription for training');
                      onTranscriptionApprove('approved');
                    }}
                    className="mt-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-all bg-blue-600 hover:bg-blue-700 text-white border border-blue-700"
                    title="Submit your corrections to improve AI training"
                  >
                    Send for Corrections
                  </button>
                )}
              </div>
            )}
            
            <div className="relative">
              <textarea
                value={editedTranscription}
                onChange={(e) => handleTranscriptionChange(e.target.value)}
                disabled={!onTranscriptionEdit}
                className={`w-full h-32 p-2 text-sm text-gray-900 bg-white border border-gray-200 rounded resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 leading-relaxed ${
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
              <button
                onClick={() => setReprocessExpanded(!reprocessExpanded)}
                className="w-full flex items-center justify-between px-2 py-1 hover:bg-gray-100 rounded transition-colors"
              >
                <p className="text-xs text-gray-600">Reprocess ({availableAgents.length} agents)</p>
                {reprocessExpanded ? (
                  <ChevronUpIcon className="w-3 h-3 text-gray-400" />
                ) : (
                  <ChevronDownIcon className="w-3 h-3 text-gray-400" />
                )}
              </button>

              {reprocessExpanded && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {availableAgents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => handleReprocess(agent.id as AgentType)}
                      disabled={isProcessing}
                      className={`px-2 py-1 text-xs rounded-md border transition-colors flex items-center space-x-1 ${
                        currentAgent === agent.id
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span>{agent.icon}</span>
                      <span>{agent.label}</span>
                      {currentAgent === agent.id && (
                        <span className="text-xs text-blue-500">•</span>
                      )}
                    </button>
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
