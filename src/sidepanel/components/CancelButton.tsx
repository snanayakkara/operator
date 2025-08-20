import React from 'react';
import { X, Square, Trash2 } from 'lucide-react';
import type { ProcessingStatus } from '@/types/medical.types';

interface CancelButtonProps {
  processingStatus: ProcessingStatus;
  isRecording: boolean;
  onCancel: () => void;
  className?: string;
}

/**
 * Universal cancel button that appears during recording, transcribing, or processing
 * Provides immediate cancellation of any ongoing workflow
 */
export function CancelButton({ 
  processingStatus, 
  isRecording, 
  onCancel, 
  className = '' 
}: CancelButtonProps) {
  // Show cancel button during active operations
  const shouldShow = isRecording || 
    processingStatus === 'recording' || 
    processingStatus === 'transcribing' || 
    processingStatus === 'processing';

  if (!shouldShow) {
    return null;
  }

  // Determine button text and icon based on current state
  const getButtonContent = () => {
    if (isRecording || processingStatus === 'recording') {
      return {
        icon: <Trash2 className="w-4 h-4" />,
        text: 'Cancel & Discard',
        bgColor: 'bg-red-500 hover:bg-red-600',
        description: 'Stop recording and discard audio without processing'
      };
    } else if (processingStatus === 'transcribing') {
      return {
        icon: <X className="w-4 h-4" />,
        text: 'Cancel Transcription',
        bgColor: 'bg-orange-500 hover:bg-orange-600',
        description: 'Cancel audio transcription and discard'
      };
    } else if (processingStatus === 'processing') {
      return {
        icon: <X className="w-4 h-4" />,
        text: 'Cancel Processing',
        bgColor: 'bg-orange-500 hover:bg-orange-600',
        description: 'Cancel AI report generation and discard'
      };
    } else {
      return {
        icon: <X className="w-4 h-4" />,
        text: 'Cancel',
        bgColor: 'bg-red-500 hover:bg-red-600',
        description: 'Cancel current operation'
      };
    }
  };

  const { icon, text, bgColor, description } = getButtonContent();

  return (
    <div className={`flex justify-center ${className}`}>
      <button
        onClick={onCancel}
        title={description}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 
          ${bgColor} text-white text-xs font-medium 
          rounded-lg transition-all duration-200 
          hover:scale-105 active:scale-95
          shadow-md hover:shadow-lg
          border border-red-600
        `}
      >
        {icon}
        <span>{text}</span>
      </button>
    </div>
  );
}