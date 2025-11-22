import React, { useState } from 'react';
import { Mic, Speaker, ChevronDown } from 'lucide-react';
import { useAudioDevices, type AudioDevice } from '@/hooks/useAudioDevices';
import Button from './buttons/Button';

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
      <Button
        onClick={requestPermission}
        variant="ghost"
        size="sm"
        className="text-gray-500 hover:text-gray-700 text-[10px] !h-auto !px-0"
        disabled={disabled}
      >
        Enable audio access
      </Button>
    );
  }

  return (
    <div className="flex items-center space-x-2 text-[10px]" data-audio-dropdown>
      {/* Microphone Dropdown */}
      <div className="relative">
        <Button
          onClick={() => !disabled && setMicDropdownOpen(!micDropdownOpen)}
          disabled={disabled}
          variant="ghost"
          size="sm"
          className={`flex items-center space-x-1 text-gray-500 hover:text-gray-700 !h-auto !px-0 ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
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
        </Button>

        {/* Microphone Dropdown Menu */}
        {micDropdownOpen && !disabled && microphones.length > 0 && (
          <div className="absolute top-full left-0 mt-1 z-[9998] bg-white border border-gray-200 rounded-md shadow-lg min-w-[200px] max-w-[250px]">
            <div className="py-1">
              {microphones.map((device) => (
                <Button
                  key={device.deviceId}
                  onClick={() => handleDeviceSelect(device)}
                  variant="ghost"
                  size="sm"
                  startIcon={<Mic className={`w-4 h-4 ${selectedMicrophoneId === device.deviceId ? 'text-blue-600' : 'text-gray-400'}`} />}
                  className={`
                    !w-full !justify-start text-xs hover:bg-gray-50 !h-auto py-1.5
                    ${selectedMicrophoneId === device.deviceId
                      ? 'bg-blue-50 text-blue-900'
                      : 'text-gray-800'
                    }
                  `}
                >
                  <span className="truncate flex-1 text-left">{device.label}</span>
                  {selectedMicrophoneId === device.deviceId && (
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                  )}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Separator */}
      <span className="text-gray-400">•</span>

      {/* Speaker Dropdown */}
      <div className="relative">
        <Button
          onClick={() => !disabled && setSpeakerDropdownOpen(!speakerDropdownOpen)}
          disabled={disabled}
          variant="ghost"
          size="sm"
          className={`flex items-center space-x-1 text-gray-500 hover:text-gray-700 !h-auto !px-0 ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
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
        </Button>

        {/* Speaker Dropdown Menu */}
        {speakerDropdownOpen && !disabled && speakers.length > 0 && (
          <div className="absolute top-full left-0 mt-1 z-[9998] bg-white border border-gray-200 rounded-md shadow-lg min-w-[200px] max-w-[250px]">
            <div className="py-1">
              {speakers.map((device) => (
                <Button
                  key={device.deviceId}
                  onClick={() => handleDeviceSelect(device)}
                  variant="ghost"
                  size="sm"
                  startIcon={<Speaker className={`w-4 h-4 ${selectedSpeakerId === device.deviceId ? 'text-blue-600' : 'text-gray-400'}`} />}
                  className={`
                    !w-full !justify-start text-xs hover:bg-gray-50 !h-auto py-1.5
                    ${selectedSpeakerId === device.deviceId
                      ? 'bg-blue-50 text-blue-900'
                      : 'text-gray-800'
                    }
                  `}
                >
                  <span className="truncate flex-1 text-left">{device.label}</span>
                  {selectedSpeakerId === device.deviceId && (
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                  )}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};