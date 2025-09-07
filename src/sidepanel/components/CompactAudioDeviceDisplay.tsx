import React, { useState } from 'react';
import { Mic, Speaker, ChevronDown } from 'lucide-react';
import { useAudioDevices, type AudioDevice } from '@/hooks/useAudioDevices';

interface CompactAudioDeviceDisplayProps {
  disabled?: boolean;
}

export const CompactAudioDeviceDisplay: React.FC<CompactAudioDeviceDisplayProps> = ({
  disabled = false
}) => {
  const {
    microphones,
    speakers,
    selectedMicrophoneId,
    selectedSpeakerId,
    setSelectedMicrophone,
    setSelectedSpeaker,
    getCurrentMicrophoneLabel,
    getCurrentSpeakerLabel,
    isLoading,
    hasPermission,
    requestPermission
  } = useAudioDevices();

  const [micDropdownOpen, setMicDropdownOpen] = useState(false);
  const [speakerDropdownOpen, setSpeakerDropdownOpen] = useState(false);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-audio-dropdown]')) {
        setMicDropdownOpen(false);
        setSpeakerDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDeviceSelect = (device: AudioDevice) => {
    if (device.kind === 'audioinput') {
      setSelectedMicrophone(device.deviceId);
      setMicDropdownOpen(false);
    } else {
      setSelectedSpeaker(device.deviceId);
      setSpeakerDropdownOpen(false);
    }
  };

  const truncateDeviceName = (name: string, maxLength: number = 15) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 1) + '…';
  };

  if (isLoading) {
    return (
      <div className="text-gray-500 text-[10px]">
        Loading devices...
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <button
        onClick={requestPermission}
        className="text-gray-500 hover:text-gray-700 text-[10px] transition-colors"
        disabled={disabled}
      >
        Enable audio access
      </button>
    );
  }

  return (
    <div className="flex items-center space-x-2 text-[10px]" data-audio-dropdown>
      {/* Microphone Dropdown */}
      <div className="relative">
        <button
          onClick={() => !disabled && setMicDropdownOpen(!micDropdownOpen)}
          disabled={disabled}
          className={`
            flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          title={`Current microphone: ${getCurrentMicrophoneLabel()}`}
        >
          <span>🎤</span>
          <span className="max-w-[80px] truncate">
            {truncateDeviceName(getCurrentMicrophoneLabel(), 20)}
          </span>
          <ChevronDown 
            className={`w-2 h-2 transition-transform ${
              micDropdownOpen ? 'transform rotate-180' : ''
            }`} 
          />
        </button>

        {/* Microphone Dropdown Menu */}
        {micDropdownOpen && !disabled && microphones.length > 0 && (
          <div className="absolute top-full left-0 mt-1 z-[9998] bg-white border border-gray-200 rounded-md shadow-lg min-w-[200px] max-w-[250px]">
            <div className="py-1">
              {microphones.map((device) => (
                <button
                  key={device.deviceId}
                  onClick={() => handleDeviceSelect(device)}
                  className={`
                    w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 
                    transition-colors flex items-center space-x-2
                    ${selectedMicrophoneId === device.deviceId 
                      ? 'bg-blue-50 text-blue-900' 
                      : 'text-gray-800'
                    }
                  `}
                >
                  <Mic 
                    className={`w-3 h-3 ${
                      selectedMicrophoneId === device.deviceId 
                        ? 'text-blue-600' 
                        : 'text-gray-400'
                    }`} 
                  />
                  <span className="truncate">{device.label}</span>
                  {selectedMicrophoneId === device.deviceId && (
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full ml-auto flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Separator */}
      <span className="text-gray-400">•</span>

      {/* Speaker Dropdown */}
      <div className="relative">
        <button
          onClick={() => !disabled && setSpeakerDropdownOpen(!speakerDropdownOpen)}
          disabled={disabled}
          className={`
            flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          title={`Current speaker: ${getCurrentSpeakerLabel()}`}
        >
          <span>🔊</span>
          <span className="max-w-[80px] truncate">
            {truncateDeviceName(getCurrentSpeakerLabel(), 20)}
          </span>
          <ChevronDown 
            className={`w-2 h-2 transition-transform ${
              speakerDropdownOpen ? 'transform rotate-180' : ''
            }`} 
          />
        </button>

        {/* Speaker Dropdown Menu */}
        {speakerDropdownOpen && !disabled && speakers.length > 0 && (
          <div className="absolute top-full left-0 mt-1 z-[9998] bg-white border border-gray-200 rounded-md shadow-lg min-w-[200px] max-w-[250px]">
            <div className="py-1">
              {speakers.map((device) => (
                <button
                  key={device.deviceId}
                  onClick={() => handleDeviceSelect(device)}
                  className={`
                    w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 
                    transition-colors flex items-center space-x-2
                    ${selectedSpeakerId === device.deviceId 
                      ? 'bg-blue-50 text-blue-900' 
                      : 'text-gray-800'
                    }
                  `}
                >
                  <Speaker 
                    className={`w-3 h-3 ${
                      selectedSpeakerId === device.deviceId 
                        ? 'text-blue-600' 
                        : 'text-gray-400'
                    }`} 
                  />
                  <span className="truncate">{device.label}</span>
                  {selectedSpeakerId === device.deviceId && (
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full ml-auto flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};