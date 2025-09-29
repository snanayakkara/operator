import React, { useState } from 'react';
import { Mic, Speaker, ChevronDown, Settings, Headphones as _Headphones } from 'lucide-react';
import { useAudioDevices, type AudioDevice } from '@/hooks/useAudioDevices';

interface AudioDeviceSelectorProps {
  disabled?: boolean;
  compact?: boolean;
  showLabels?: boolean;
}

export const AudioDeviceSelector: React.FC<AudioDeviceSelectorProps> = ({
  disabled = false,
  compact = true,
  showLabels = true
}) => {
  const audioDevices = useAudioDevices();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'microphone' | 'speaker'>('microphone');

  const {
    microphones,
    speakers,
    selectedMicrophoneId,
    selectedSpeakerId,
    isLoading,
    hasPermission,
    setSelectedMicrophone,
    setSelectedSpeaker,
    requestPermission,
    getCurrentMicrophoneLabel,
    getCurrentSpeakerLabel
  } = audioDevices;

  const handleDeviceSelect = (device: AudioDevice) => {
    if (device.kind === 'audioinput') {
      setSelectedMicrophone(device.deviceId);
    } else {
      setSelectedSpeaker(device.deviceId);
    }
    setIsOpen(false);
  };

  const getDisplayText = () => {
    const micLabel = getCurrentMicrophoneLabel();
    const speakerLabel = getCurrentSpeakerLabel();
    
    if (compact) {
      // Show shortened versions for header
      const shortMic = micLabel.replace(/^(Default\s+)?/, '').substring(0, 12);
      const shortSpeaker = speakerLabel.replace(/^(Default\s+)?/, '').substring(0, 12);
      
      return `${shortMic} • ${shortSpeaker}`;
    }
    
    return `Mic: ${micLabel} | Speaker: ${speakerLabel}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-gray-500 text-sm">
        <Mic className="w-4 h-4 animate-pulse" />
        <span>Loading devices...</span>
      </div>
    );
  }

  if (!hasPermission && microphones.length === 0) {
    return (
      <button
        onClick={requestPermission}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 text-sm transition-colors"
        disabled={disabled}
      >
        <Settings className="w-4 h-4" />
        <span>Enable audio access</span>
      </button>
    );
  }

  if (microphones.length === 0 && speakers.length === 0) {
    return (
      <div className="flex items-center space-x-2 text-gray-500 text-sm">
        <Mic className="w-4 h-4" />
        <span>No audio devices</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        data-audio-selector
        className={`
          flex items-center justify-between space-x-2 px-3 py-2 bg-white/50 
          border border-gray-200 rounded-lg text-sm transition-colors
          ${compact ? 'min-w-32' : 'min-w-48'}
          ${disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:bg-white/70 cursor-pointer'
          }
        `}
        title={`Microphone: ${getCurrentMicrophoneLabel()}\nSpeaker: ${getCurrentSpeakerLabel()}`}
      >
        <div className="flex items-center space-x-2 truncate">
          <div className="flex items-center space-x-1">
            <Mic className="w-3 h-3 text-gray-600 flex-shrink-0" />
            <Speaker className="w-3 h-3 text-gray-600 flex-shrink-0" />
          </div>
          {showLabels && (
            <span className="truncate text-gray-800 text-xs">
              {getDisplayText()}
            </span>
          )}
        </div>
        <ChevronDown 
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`} 
        />
      </button>

      {isOpen && !disabled && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden min-w-64">
            {/* Tab Headers */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('microphone')}
                className={`
                  flex-1 px-3 py-2 text-sm font-medium transition-colors
                  ${activeTab === 'microphone' 
                    ? 'bg-blue-50 text-blue-900 border-b-2 border-blue-500' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Mic className="w-4 h-4" />
                  <span>Microphones</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('speaker')}
                className={`
                  flex-1 px-3 py-2 text-sm font-medium transition-colors
                  ${activeTab === 'speaker' 
                    ? 'bg-blue-50 text-blue-900 border-b-2 border-blue-500' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Speaker className="w-4 h-4" />
                  <span>Speakers</span>
                </div>
              </button>
            </div>

            {/* Device Lists */}
            <div className="max-h-64 overflow-y-auto">
              {activeTab === 'microphone' && (
                <div>
                  {microphones.map((device) => (
                    <button
                      key={device.deviceId}
                      onClick={() => handleDeviceSelect(device)}
                      className={`
                        w-full px-3 py-2 text-left text-sm hover:bg-gray-50 
                        transition-colors flex items-center space-x-2
                        ${selectedMicrophoneId === device.deviceId 
                          ? 'bg-blue-50 text-blue-900' 
                          : 'text-gray-800'
                        }
                      `}
                    >
                      <Mic 
                        className={`w-4 h-4 ${
                          selectedMicrophoneId === device.deviceId 
                            ? 'text-blue-600' 
                            : 'text-gray-400'
                        }`} 
                      />
                      <span className="truncate">{device.label}</span>
                      {selectedMicrophoneId === device.deviceId && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full ml-auto flex-shrink-0" />
                      )}
                    </button>
                  ))}
                  {microphones.length === 0 && (
                    <div className="px-3 py-4 text-center text-gray-500 text-sm">
                      No microphones found
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'speaker' && (
                <div>
                  {speakers.map((device) => (
                    <button
                      key={device.deviceId}
                      onClick={() => handleDeviceSelect(device)}
                      className={`
                        w-full px-3 py-2 text-left text-sm hover:bg-gray-50 
                        transition-colors flex items-center space-x-2
                        ${selectedSpeakerId === device.deviceId 
                          ? 'bg-blue-50 text-blue-900' 
                          : 'text-gray-800'
                        }
                      `}
                    >
                      <Speaker 
                        className={`w-4 h-4 ${
                          selectedSpeakerId === device.deviceId 
                            ? 'text-blue-600' 
                            : 'text-gray-400'
                        }`} 
                      />
                      <span className="truncate">{device.label}</span>
                      {selectedSpeakerId === device.deviceId && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full ml-auto flex-shrink-0" />
                      )}
                    </button>
                  ))}
                  {speakers.length === 0 && (
                    <div className="px-3 py-4 text-center text-gray-500 text-sm">
                      No speakers found
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Footer Info */}
            <div className="border-t border-gray-100 px-3 py-2 bg-gray-50">
              <p className="text-xs text-gray-500">
                {microphones.length} mic{microphones.length === 1 ? '' : 's'}, {' '}
                {speakers.length} speaker{speakers.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};