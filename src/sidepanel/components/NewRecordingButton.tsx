import React from 'react';
import { RefreshCw } from 'lucide-react';

interface NewRecordingButtonProps {
  onClearRecording: () => void;
  disabled?: boolean;
}

export const NewRecordingButton: React.FC<NewRecordingButtonProps> = ({
  onClearRecording,
  disabled = false
}) => {
  return (
    <button
      onClick={onClearRecording}
      disabled={disabled}
      className={`
        glass-button flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
        ${disabled 
          ? 'opacity-50 cursor-not-allowed' 
          : 'hover:bg-green-50 hover:border-green-300 text-green-700'
        }
      `}
      title="Clear previous recording and start fresh"
    >
      <RefreshCw className={`w-4 h-4 ${disabled ? '' : 'text-green-600'}`} />
      <span>New Recording</span>
    </button>
  );
};