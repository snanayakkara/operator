import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AudioDeviceContextType {
  selectedMicrophoneId: string | null;
  selectedSpeakerId: string | null;
  microphoneSelectionType: 'auto' | 'manual';
  speakerSelectionType: 'auto' | 'manual';
  setSelectedMicrophoneId: (deviceId: string | null, isManual?: boolean) => void;
  setSelectedSpeakerId: (deviceId: string | null, isManual?: boolean) => void;
}

const AudioDeviceContext = createContext<AudioDeviceContextType | undefined>(undefined);

export interface AudioDeviceProviderProps {
  children: ReactNode;
}

export const AudioDeviceProvider: React.FC<AudioDeviceProviderProps> = ({ children }) => {
  const [selectedMicrophoneId, setMicrophoneId] = useState<string | null>(null);
  const [selectedSpeakerId, setSpeakerId] = useState<string | null>(null);
  const [microphoneSelectionType, setMicrophoneSelectionType] = useState<'auto' | 'manual'>('auto');
  const [speakerSelectionType, setSpeakerSelectionType] = useState<'auto' | 'manual'>('auto');

  const setSelectedMicrophoneId = (deviceId: string | null, isManual: boolean = false) => {
    setMicrophoneId(deviceId);
    setMicrophoneSelectionType(isManual ? 'manual' : 'auto');
    
    if (isManual && deviceId) {
      // Persist manual selection to localStorage
      try {
        localStorage.setItem('xestro-preferred-microphone', deviceId);
      } catch (error) {
        console.warn('Failed to persist microphone preference:', error);
      }
    }
  };

  const setSelectedSpeakerId = (deviceId: string | null, isManual: boolean = false) => {
    setSpeakerId(deviceId);
    setSpeakerSelectionType(isManual ? 'manual' : 'auto');
    
    if (isManual && deviceId) {
      // Persist manual selection to localStorage
      try {
        localStorage.setItem('xestro-preferred-speaker', deviceId);
      } catch (error) {
        console.warn('Failed to persist speaker preference:', error);
      }
    }
  };

  return (
    <AudioDeviceContext.Provider value={{
      selectedMicrophoneId,
      selectedSpeakerId,
      microphoneSelectionType,
      speakerSelectionType,
      setSelectedMicrophoneId,
      setSelectedSpeakerId
    }}>
      {children}
    </AudioDeviceContext.Provider>
  );
};

export const useAudioDeviceContext = (): AudioDeviceContextType => {
  const context = useContext(AudioDeviceContext);
  if (context === undefined) {
    throw new Error('useAudioDeviceContext must be used within an AudioDeviceProvider');
  }
  return context;
};