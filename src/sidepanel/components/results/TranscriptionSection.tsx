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
import { RefreshCw } from 'lucide-react';
import { AudioPlayback } from '../AudioPlayback';
import type { AgentType } from '@/types/medical.types';

interface TranscriptionSectionProps {
  originalTranscription: string;
  onTranscriptionCopy?: (text: string) => void;
  onTranscriptionInsert?: (text: string) => void;
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
}

const TranscriptionSection: React.FC<TranscriptionSectionProps> = memo(({
  originalTranscription,
  onTranscriptionCopy,
  onTranscriptionInsert,
  onAgentReprocess,
  currentAgent,
  isProcessing = false,
  className = '',
  audioBlob,
  defaultExpanded = false,
  collapseWhen
}) => {
  const [transcriptionExpanded, setTranscriptionExpanded] = useState(!!defaultExpanded);
  const [transcriptionCopied, setTranscriptionCopied] = useState(false);
  const [transcriptionInserted, setTranscriptionInserted] = useState(false);

  // Component renders optimally when memoized properly

  // Auto-collapse when signaled (e.g., once results are ready)
  React.useEffect(() => {
    if (collapseWhen && transcriptionExpanded) {
      setTranscriptionExpanded(false);
    }
  }, [collapseWhen]);

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
        await onTranscriptionCopy(originalTranscription);
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
        await onTranscriptionInsert(originalTranscription);
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
        <div className="flex items-center space-x-2">
          <FileTextIcon className={`w-4 h-4 ${isProcessing ? 'text-blue-600' : 'text-gray-600'}`} />
          <span className={`font-medium text-sm ${isProcessing ? 'text-blue-900' : 'text-gray-900'}`}>
            Original Transcription
          </span>
          {isProcessing && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
              Processing...
            </span>
          )}
          <span className="text-xs text-gray-500">
            {originalTranscription.split(' ').length} words
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Transcription Actions - Enhanced during processing */}
          {onTranscriptionCopy && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleTranscriptionCopy();
              }}
              className={`px-2 py-1.5 rounded transition-all duration-200 flex items-center space-x-1 ${
                isProcessing 
                  ? 'bg-blue-50 border border-blue-200 hover:bg-blue-100 shadow-sm' 
                  : 'p-1.5 hover:bg-gray-100'
              }`}
              title={isProcessing ? "Copy raw transcription" : "Copy transcription"}
            >
              {transcriptionCopied ? (
                <CheckIcon className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <AnimatedCopyIcon className="w-3.5 h-3.5 text-blue-600" title="Copy transcription" />
              )}
              {isProcessing && (
                <span className="text-xs text-blue-700 font-medium">Copy Raw</span>
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
          <div className="bg-gray-50/80 rounded-lg p-3 border border-gray-200/50">
            <p className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap">
              {originalTranscription}
            </p>
          </div>

          {/* Audio Playback Component */}
          {audioBlob && (
            <div className="mt-3">
              <AudioPlayback 
                audioBlob={audioBlob}
                fileName={`transcription-${currentAgent || 'recording'}`}
                className="bg-white border-gray-200"
              />
            </div>
          )}
          
          {/* Reprocess agents */}
          {onAgentReprocess && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-600 mb-2">Reprocess with different agent:</p>
              <div className="flex flex-wrap gap-2">
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
            </div>
          )}
        </div>
      )}
    </div>
  );
});

TranscriptionSection.displayName = 'TranscriptionSection';

export { TranscriptionSection };
