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
        bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ease-out
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