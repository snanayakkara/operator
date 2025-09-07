import { useState, useEffect, useCallback } from 'react';
import { useAudioDeviceContext } from '@/contexts/AudioDeviceContext';

export interface AudioDevice {
  deviceId: string;
  label: string;
  groupId: string;
  kind: 'audioinput' | 'audiooutput';
}

export interface AudioDevicesState {
  microphones: AudioDevice[];
  speakers: AudioDevice[];
  selectedMicrophoneId: string | null;
  selectedSpeakerId: string | null;
  isLoading: boolean;
  hasPermission: boolean;
}

export interface UseAudioDevicesReturn extends AudioDevicesState {
  setSelectedMicrophone: (deviceId: string) => void;
  setSelectedSpeaker: (deviceId: string) => void;
  requestPermission: () => Promise<void>;
  refreshDevices: () => Promise<void>;
  getCurrentMicrophoneLabel: () => string;
  getCurrentSpeakerLabel: () => string;
}

/**
 * Smart microphone selection prioritizing system defaults and built-in devices
 */
const selectBestMicrophone = (microphones: AudioDevice[]): AudioDevice => {
  // Priority 1: System default device (respects macOS preferences)
  const defaultDevice = microphones.find(d => d.deviceId === 'default');
  if (defaultDevice) {
    return defaultDevice;
  }
  
  // Priority 2: Built-in MacBook microphones
  const builtInDevice = microphones.find(d => 
    d.label.toLowerCase().includes('built-in') ||
    d.label.toLowerCase().includes('internal') ||
    d.label.toLowerCase().includes('macbook')
  );
  if (builtInDevice) {
    return builtInDevice;
  }
  
  // Priority 3: Any device that's not likely to be external/mobile
  const preferredDevice = microphones.find(d => 
    d.deviceId !== 'default' && 
    d.label && 
    !d.label.includes('Microphone ') &&
    !isExternalMobileDevice(d.label)
  );
  if (preferredDevice) {
    return preferredDevice;
  }
  
  // Priority 4: Any non-default device
  const nonDefaultDevice = microphones.find(d => d.deviceId !== 'default');
  if (nonDefaultDevice) {
    return nonDefaultDevice;
  }
  
  // Fallback: First available device
  return microphones[0];
};

/**
 * Smart speaker selection prioritizing system defaults and built-in devices
 */
const selectBestSpeaker = (speakers: AudioDevice[]): AudioDevice => {
  // Priority 1: System default device (respects macOS preferences)
  const defaultDevice = speakers.find(d => d.deviceId === 'default');
  if (defaultDevice) {
    return defaultDevice;
  }
  
  // Priority 2: Built-in MacBook speakers
  const builtInDevice = speakers.find(d => 
    d.label.toLowerCase().includes('built-in') ||
    d.label.toLowerCase().includes('internal') ||
    d.label.toLowerCase().includes('macbook')
  );
  if (builtInDevice) {
    return builtInDevice;
  }
  
  // Priority 3: Any device that's not likely to be external/mobile
  const preferredDevice = speakers.find(d => 
    d.deviceId !== 'default' && 
    d.label && 
    !d.label.includes('Speaker ') &&
    !isExternalMobileDevice(d.label)
  );
  if (preferredDevice) {
    return preferredDevice;
  }
  
  // Priority 4: Any non-default device
  const nonDefaultDevice = speakers.find(d => d.deviceId !== 'default');
  if (nonDefaultDevice) {
    return nonDefaultDevice;
  }
  
  // Fallback: First available device
  return speakers[0];
};

/**
 * Detects if a device label suggests it's an external/mobile device
 */
const isExternalMobileDevice = (label: string): boolean => {
  const lowerLabel = label.toLowerCase();
  const externalKeywords = [
    'iphone', 'ipad', 'airpods', 'bluetooth', 'wireless',
    'headphones', 'headset', 'earbuds', 'watch'
  ];
  
  return externalKeywords.some(keyword => lowerLabel.includes(keyword));
};

/**
 * Provides human-readable reason for device selection (for debugging)
 */
const getDeviceSelectionReason = (
  selectedDevice: AudioDevice, 
  _allDevices: AudioDevice[], 
  _deviceType: 'microphone' | 'speaker'
): string => {
  if (selectedDevice.deviceId === 'default') {
    return 'system default device';
  }
  
  const lowerLabel = selectedDevice.label.toLowerCase();
  if (lowerLabel.includes('built-in') || lowerLabel.includes('internal') || lowerLabel.includes('macbook')) {
    return 'built-in device';
  }
  
  if (!isExternalMobileDevice(selectedDevice.label)) {
    return 'preferred non-mobile device';
  }
  
  if (selectedDevice.deviceId !== 'default') {
    return 'non-default device fallback';
  }
  
  return 'first available device';
};

export const useAudioDevices = (): UseAudioDevicesReturn => {
  const [microphones, setMicrophones] = useState<AudioDevice[]>([]);
  const [speakers, setSpeakers] = useState<AudioDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);

  // Use the context for global device selection state
  const {
    selectedMicrophoneId,
    selectedSpeakerId,
    microphoneSelectionType,
    speakerSelectionType,
    setSelectedMicrophoneId: setContextMicrophoneId,
    setSelectedSpeakerId: setContextSpeakerId
  } = useAudioDeviceContext();

  const enumerateDevices = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Check microphone permission
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
          groupId: device.groupId,
          kind: 'audioinput' as const
        }));

      const audioOutputs = deviceList
        .filter(device => device.kind === 'audiooutput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Speaker ${device.deviceId.slice(0, 8)}`,
          groupId: device.groupId,
          kind: 'audiooutput' as const
        }));

      setMicrophones(audioInputs);
      setSpeakers(audioOutputs);
      
      // Auto-select best available device if none selected or if current selection is unavailable
      if (audioInputs.length > 0 && (!selectedMicrophoneId || microphoneSelectionType === 'auto')) {
        // Check for saved user preference first
        let preferredMic: AudioDevice | null = null;
        
        if (microphoneSelectionType === 'auto') {
          try {
            const savedMicrophoneId = localStorage.getItem('xestro-preferred-microphone');
            if (savedMicrophoneId) {
              preferredMic = audioInputs.find(d => d.deviceId === savedMicrophoneId) || null;
              if (preferredMic) {
                console.log('🎤 Using saved microphone preference:', preferredMic.label);
              }
            }
          } catch (error) {
            console.warn('Failed to read microphone preference:', error);
          }
        }
        
        // If no saved preference or saved device unavailable, auto-select best
        if (!preferredMic) {
          preferredMic = selectBestMicrophone(audioInputs);
          console.log('🎤 Auto-selected microphone:', {
            deviceId: preferredMic.deviceId,
            label: preferredMic.label,
            selectionReason: getDeviceSelectionReason(preferredMic, audioInputs, 'microphone')
          });
        }
        
        setContextMicrophoneId(preferredMic.deviceId, false); // false = auto-selected
      }
      
      if (audioOutputs.length > 0 && (!selectedSpeakerId || speakerSelectionType === 'auto')) {
        // Check for saved user preference first
        let preferredSpeaker: AudioDevice | null = null;
        
        if (speakerSelectionType === 'auto') {
          try {
            const savedSpeakerId = localStorage.getItem('xestro-preferred-speaker');
            if (savedSpeakerId) {
              preferredSpeaker = audioOutputs.find(d => d.deviceId === savedSpeakerId) || null;
              if (preferredSpeaker) {
                console.log('🔊 Using saved speaker preference:', preferredSpeaker.label);
              }
            }
          } catch (error) {
            console.warn('Failed to read speaker preference:', error);
          }
        }
        
        // If no saved preference or saved device unavailable, auto-select best
        if (!preferredSpeaker) {
          preferredSpeaker = selectBestSpeaker(audioOutputs);
          console.log('🔊 Auto-selected speaker:', {
            deviceId: preferredSpeaker.deviceId,
            label: preferredSpeaker.label,
            selectionReason: getDeviceSelectionReason(preferredSpeaker, audioOutputs, 'speaker')
          });
        }
        
        setContextSpeakerId(preferredSpeaker.deviceId, false); // false = auto-selected
      }
      
      console.log('🎤 Audio devices enumerated:', {
        microphones: audioInputs.length,
        speakers: audioOutputs.length
      });
    } catch (error) {
      console.error('🎤 Failed to enumerate audio devices:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMicrophoneId, selectedSpeakerId, microphoneSelectionType, speakerSelectionType]);

  const requestPermission = useCallback(async () => {
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
  }, [enumerateDevices]);

  const setSelectedMicrophone = useCallback((deviceId: string) => {
    console.log('🎤 Manually selecting microphone:', deviceId);
    setContextMicrophoneId(deviceId, true); // true = manually selected
  }, [setContextMicrophoneId]);

  const setSelectedSpeaker = useCallback((deviceId: string) => {
    console.log('🔊 Manually selecting speaker:', deviceId);
    setContextSpeakerId(deviceId, true); // true = manually selected  
  }, [setContextSpeakerId]);

  const getCurrentMicrophoneLabel = useCallback((): string => {
    if (!selectedMicrophoneId) return 'No microphone';
    
    const device = microphones.find(d => d.deviceId === selectedMicrophoneId);
    if (device) {
      return device.label;
    }
    
    return selectedMicrophoneId === 'default' ? 'Default microphone' : 'Unknown microphone';
  }, [selectedMicrophoneId, microphones]);

  const getCurrentSpeakerLabel = useCallback((): string => {
    if (!selectedSpeakerId) return 'No speaker';
    
    const device = speakers.find(d => d.deviceId === selectedSpeakerId);
    if (device) {
      return device.label;
    }
    
    return selectedSpeakerId === 'default' ? 'Default speaker' : 'Unknown speaker';
  }, [selectedSpeakerId, speakers]);

  const refreshDevices = useCallback(async () => {
    await enumerateDevices();
  }, [enumerateDevices]);

  useEffect(() => {
    enumerateDevices();
    
    // Listen for device changes
    const handleDeviceChange = () => {
      console.log('🎤 Audio devices changed, re-enumerating...');
      enumerateDevices();
    };
    
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [enumerateDevices]);

  return {
    microphones,
    speakers,
    selectedMicrophoneId,
    selectedSpeakerId,
    isLoading,
    hasPermission,
    setSelectedMicrophone,
    setSelectedSpeaker,
    requestPermission,
    refreshDevices,
    getCurrentMicrophoneLabel,
    getCurrentSpeakerLabel
  };
};