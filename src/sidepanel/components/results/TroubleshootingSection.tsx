/**
 * Troubleshooting Section Component
 * 
 * Focused component for audio troubleshooting:
 * - Failed recording management
 * - Audio playback and analysis
 * - Error details and suggestions
 * - Memoized for performance
 */

import React, { memo, useState } from 'react';
import {
  Volume2Icon,
  AlertCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '../icons/OptimizedIcons';
import { Trash2 } from 'lucide-react';
import { AudioPlayback } from '../AudioPlayback';
import Button, { IconButton } from '../buttons/Button';
import type { FailedAudioRecording } from '@/types/medical.types';

interface TroubleshootingSectionProps {
  failedAudioRecordings: FailedAudioRecording[];
  errors: string[];
  onClearFailedRecordings?: () => void;
  className?: string;
}

const TroubleshootingSection: React.FC<TroubleshootingSectionProps> = memo(({
  failedAudioRecordings,
  errors,
  onClearFailedRecordings,
  className = ''
}) => {
  const [troubleshootingExpanded, setTroubleshootingExpanded] = useState(false);
  const [selectedFailedRecording, setSelectedFailedRecording] = useState<FailedAudioRecording | null>(null);

  // Only show if there are failed recordings and parsing errors
  const shouldShow = failedAudioRecordings.length > 0 && errors.length > 0 && errors.some(error => 
    error.includes('could not be parsed coherently') || 
    error.includes('Investigation dictation could not be parsed')
  );

  if (!shouldShow) {
    return null;
  }

  return (
    <div className={`border-t border-red-200/50 bg-red-50/30 ${className}`}>
      <Button
        onClick={() => setTroubleshootingExpanded(!troubleshootingExpanded)}
        variant="ghost"
        className="w-full p-4 text-left hover:bg-red-50/50 rounded-none justify-between"
      >
        <div className="flex items-center space-x-2">
          <Volume2Icon className="w-4 h-4 text-red-600" />
          <span className="text-red-900 font-medium text-sm">🔊 Troubleshoot Audio Recording</span>
          <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
            {failedAudioRecordings.length} recording{failedAudioRecordings.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {onClearFailedRecordings && (
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                onClearFailedRecordings();
              }}
              icon={<Trash2 />}
              variant="ghost"
              size="sm"
              aria-label="Clear all failed recordings"
              title="Clear all failed recordings"
              className="hover:bg-red-100"
            />
          )}
          {troubleshootingExpanded ? (
            <ChevronUpIcon className="w-4 h-4 text-red-400" />
          ) : (
            <ChevronDownIcon className="w-4 h-4 text-red-400" />
          )}
        </div>
      </Button>

      {troubleshootingExpanded && (
        <div className="px-4 pb-4">
          <div className="space-y-3">
            <div className="text-sm text-red-700 bg-red-100/50 p-3 rounded-lg border border-red-200">
              <div className="flex items-start space-x-2">
                <AlertCircleIcon className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Investigation parsing failed</p>
                  <p className="text-red-600 mt-1 text-xs">
                    The recording could not be processed into a structured investigation summary. 
                    Use the audio playback below to identify potential issues:
                  </p>
                  <ul className="mt-2 text-xs text-red-600 space-y-1">
                    <li>• Check if audio is too quiet or contains too much silence</li>
                    <li>• Verify medical terminology is clearly spoken</li>
                    <li>• Ensure recording duration is adequate (≥2 seconds)</li>
                    <li>• Look for background noise or audio quality issues</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Failed Recording Selection */}
            {failedAudioRecordings.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-red-700 mb-2">
                  Select recording to troubleshoot:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {failedAudioRecordings.map((recording, index) => (
                    <Button
                      key={recording.id}
                      onClick={() => setSelectedFailedRecording(recording)}
                      variant="ghost"
                      className={`p-3 rounded-lg border text-left justify-start ${
                        selectedFailedRecording?.id === recording.id
                          ? 'bg-red-100 border-red-300 text-red-800'
                          : 'bg-white border-red-200 hover:bg-red-50 text-red-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div>
                          <div className="font-medium text-sm">
                            Recording #{failedAudioRecordings.length - index}
                          </div>
                          <div className="text-xs opacity-75 mt-1">
                            {new Date(recording.timestamp).toLocaleString()} •
                            {recording.metadata.recordingTime}s •
                            {(recording.metadata.fileSize / 1024).toFixed(1)}KB
                          </div>
                        </div>
                        {selectedFailedRecording?.id === recording.id && (
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Audio Playback */}
            {(selectedFailedRecording || failedAudioRecordings.length === 1) && (
              <div>
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-red-700 mb-1">Audio Playback & Analysis</h4>
                  <p className="text-xs text-red-600">
                    Listen to the recording and check the audio quality metrics below:
                  </p>
                </div>
                <AudioPlayback
                  audioBlob={(selectedFailedRecording || failedAudioRecordings[0]).audioBlob}
                  fileName={`investigation-failed-${(selectedFailedRecording || failedAudioRecordings[0]).agentType}`}
                  className="border-red-200"
                />
                
                {/* Show transcription if available */}
                {(selectedFailedRecording || failedAudioRecordings[0]).transcriptionAttempt && (
                  <div className="mt-3">
                    <h5 className="text-sm font-medium text-red-700 mb-2">Transcription Result:</h5>
                    <div className="bg-white p-3 rounded-lg border border-red-200 text-sm text-gray-800">
                      <p className="whitespace-pre-wrap">
                        {(selectedFailedRecording || failedAudioRecordings[0]).transcriptionAttempt}
                      </p>
                    </div>
                    <p className="text-xs text-red-600 mt-2">
                      The transcription above was successful, but could not be parsed into a structured investigation summary.
                    </p>
                  </div>
                )}
                
                {/* Error Details */}
                <div className="mt-3">
                  <h5 className="text-sm font-medium text-red-700 mb-2">Error Details:</h5>
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <p className="text-sm text-red-800 font-mono">
                      {(selectedFailedRecording || failedAudioRecordings[0]).errorMessage}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

TroubleshootingSection.displayName = 'TroubleshootingSection';

export { TroubleshootingSection };