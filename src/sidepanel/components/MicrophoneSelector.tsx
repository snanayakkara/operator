import React, { useState, useEffect } from 'react';
import { Mic, ChevronDown, Settings } from 'lucide-react';

interface MicrophoneDevice {
  deviceId: string;
  label: string;
  groupId: string;
}

interface MicrophoneSelectorProps {
  selectedDeviceId: string | null;
  onDeviceChange: (deviceId: string) => void;
  disabled?: boolean;
}

export const MicrophoneSelector: React.FC<MicrophoneSelectorProps> = ({
  selectedDeviceId,
  onDeviceChange,
  disabled = false
}) => {
  const [devices, setDevices] = useState<MicrophoneDevice[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    enumerateDevices();
    
    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices);
    };
  }, []);

  const enumerateDevices = async () => {
    try {
      setIsLoading(true);
      
      // First check if we have permission
      const permissionResult = await navigator.permissions.query({ 
        name: 'microphone' as PermissionName 
      });
      
      const hasAccess = permissionResult.state === 'granted';
      setHasPermission(hasAccess);

      // Get device list
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = deviceList
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
          groupId: device.groupId
        }));

      setDevices(audioInputs);
      
      // Auto-select default device if none selected
      if (audioInputs.length > 0 && !selectedDeviceId) {
        const defaultDevice = audioInputs.find(d => d.deviceId === 'default') || audioInputs[0];
        onDeviceChange(defaultDevice.deviceId);
      }
      
      console.log('🎤 Microphones enumerated:', audioInputs);
    } catch (error) {
      console.error('🎤 Failed to enumerate devices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestPermissionAndEnumerate = async () => {
    try {
      // Request microphone permission to get device labels
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop immediately
      
      setHasPermission(true);
      await enumerateDevices();
    } catch (error) {
      console.error('🎤 Failed to get microphone permission:', error);
      setHasPermission(false);
    }
  };

  const getCurrentDeviceLabel = (): string => {
    if (!selectedDeviceId) return 'No microphone selected';
    
    const device = devices.find(d => d.deviceId === selectedDeviceId);
    if (device) {
      return device.label;
    }
    
    return selectedDeviceId === 'default' ? 'Default microphone' : 'Unknown microphone';
  };

  const handleDeviceSelect = (deviceId: string) => {
    console.log('🎤 Selecting microphone:', deviceId);
    onDeviceChange(deviceId);
    setIsOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-gray-500 text-sm">
        <Mic className="w-4 h-4 animate-pulse" />
        <span>Loading microphones...</span>
      </div>
    );
  }

  if (!hasPermission && devices.length === 0) {
    return (
      <div className="flex items-center space-x-2">
        <button
          onClick={requestPermissionAndEnumerate}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 text-sm transition-colors"
          disabled={disabled}
        >
          <Settings className="w-4 h-4" />
          <span>Enable microphone access</span>
        </button>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="flex items-center space-x-2 text-gray-500 text-sm">
        <Mic className="w-4 h-4" />
        <span>No microphones found</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center justify-between space-x-2 px-3 py-2 bg-white/50 
          border border-gray-200 rounded-lg text-sm transition-colors min-w-48
          ${disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:bg-white/70 cursor-pointer'
          }
        `}
      >
        <div className="flex items-center space-x-2 truncate">
          <Mic className="w-4 h-4 text-gray-600 flex-shrink-0" />
          <span className="truncate text-gray-800">
            {getCurrentDeviceLabel()}
          </span>
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
          <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              {devices.map((device) => (
                <button
                  key={device.deviceId}
                  onClick={() => handleDeviceSelect(device.deviceId)}
                  className={`
                    w-full px-3 py-2 text-left text-sm hover:bg-gray-50 
                    transition-colors flex items-center space-x-2
                    ${selectedDeviceId === device.deviceId 
                      ? 'bg-blue-50 text-blue-900' 
                      : 'text-gray-800'
                    }
                  `}
                >
                  <Mic 
                    className={`w-4 h-4 ${
                      selectedDeviceId === device.deviceId 
                        ? 'text-blue-600' 
                        : 'text-gray-400'
                    }`} 
                  />
                  <span className="truncate">{device.label}</span>
                  {selectedDeviceId === device.deviceId && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full ml-auto flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
            
            {devices.length > 0 && (
              <div className="border-t border-gray-100 px-3 py-2 bg-gray-50">
                <p className="text-xs text-gray-500">
                  {devices.length} microphone{devices.length === 1 ? '' : 's'} available
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};