import React, { useState, useRef, useCallback } from 'react';

export interface RecorderState {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  voiceActivityLevel: number;
  frequencyData: number[];
  hasPermission: boolean | null;
  isRequestingPermission: boolean;
}

export interface RecorderOptions {
  onRecordingComplete: (audioBlob: Blob) => void;
  onVoiceActivityUpdate?: (level: number, frequencies: number[]) => void;
  onRecordingTimeUpdate?: (time: number) => void;
  onError?: (error: Error) => void;
  selectedMicrophoneId?: string;
}

/**
 * Shared audio recording hook with voice activity detection
 * Handles all recording state and provides a clean interface for components
 */
export function useRecorder(options: RecorderOptions) {
  const {
    onRecordingComplete,
    onVoiceActivityUpdate,
    onRecordingTimeUpdate,
    onError,
    selectedMicrophoneId
  } = options;

  const [state, setState] = useState<RecorderState>({
    isRecording: false,
    isPaused: false,
    recordingTime: 0,
    voiceActivityLevel: 0,
    frequencyData: [],
    hasPermission: null,
    isRequestingPermission: false
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number>();
  const intervalRef = useRef<number>();

  // Voice activity detection
  const detectVoiceActivity = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser || !state.isRecording) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    analyser.getByteFrequencyData(dataArray);
    
    // Calculate average volume for overall level
    const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
    const normalizedLevel = Math.min(average / 128, 1);
    
    // Create frequency spectrum bars by grouping frequency bins
    const numBars = 10;
    const frequencies: number[] = [];
    const binSize = Math.floor(bufferLength / numBars);
    
    for (let i = 0; i < numBars; i++) {
      let sum = 0;
      const start = i * binSize;
      const end = Math.min(start + binSize, bufferLength);
      
      for (let j = start; j < end; j++) {
        sum += dataArray[j];
      }
      
      // Normalize to 0-1 range and apply some scaling for better visualization
      const barValue = Math.min((sum / (end - start)) / 128, 1);
      frequencies.push(Math.pow(barValue, 0.7)); // Apply curve for better visual range
    }
    
    setState(prev => ({
      ...prev,
      voiceActivityLevel: normalizedLevel,
      frequencyData: frequencies
    }));
    
    onVoiceActivityUpdate?.(normalizedLevel, frequencies);
    
    if (state.isRecording) {
      animationFrameRef.current = requestAnimationFrame(detectVoiceActivity);
    }
  }, [state.isRecording, onVoiceActivityUpdate]);

  // Start recording timer
  const startTimer = useCallback(() => {
    setState(prev => ({ ...prev, recordingTime: 0 }));
    intervalRef.current = setInterval(() => {
      setState(prev => {
        const newTime = prev.recordingTime + 1;
        onRecordingTimeUpdate?.(newTime);
        return { ...prev, recordingTime: newTime };
      });
    }, 1000);
  }, [onRecordingTimeUpdate]);

  // Stop recording timer
  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  }, []);

  // Check microphone permissions
  const checkPermission = useCallback(async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setState(prev => ({ ...prev, hasPermission: result.state === 'granted' }));
      
      result.addEventListener('change', () => {
        setState(prev => ({ ...prev, hasPermission: result.state === 'granted' }));
      });
    } catch (error) {
      // Permission API not supported, fallback to direct check
      setState(prev => ({ ...prev, hasPermission: null }));
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    console.log('🎤 useRecorder.startRecording() called');
    
    setState(prev => ({ ...prev, isRequestingPermission: true }));
    
    try {
      const constraints = {
        audio: selectedMicrophoneId ? {
          deviceId: selectedMicrophoneId,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } : {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      setState(prev => ({ 
        ...prev, 
        hasPermission: true, 
        isRequestingPermission: false,
        isRecording: true,
        voiceActivityLevel: 0,
        frequencyData: []
      }));

      // Log the actual microphone being used
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        const track = audioTracks[0];
        const settings = track.getSettings();
        console.log('🎤 Using microphone:', {
          label: track.label,
          deviceId: settings.deviceId,
          sampleRate: settings.sampleRate,
          channelCount: settings.channelCount
        });
      }

      // Set up audio context for voice activity detection
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      
      audioContextRef.current = context;
      analyserRef.current = analyser;

      // Set up media recorder
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        
        console.log('🎤 Audio recording completed:', {
          size: audioBlob.size,
          type: audioBlob.type,
          chunks: audioChunksRef.current.length,
          recordingTime: state.recordingTime
        });
        
        onRecordingComplete(audioBlob);
        
        // Clean up
        cleanup();
      };
      
      recorder.start(100); // Collect data every 100ms
      mediaRecorderRef.current = recorder;
      
      startTimer();
      detectVoiceActivity();
      
    } catch (error) {
      console.error('🎤 Recording start failed:', error);
      setState(prev => ({ 
        ...prev, 
        hasPermission: false, 
        isRequestingPermission: false 
      }));
      onError?.(error as Error);
    }
  }, [selectedMicrophoneId, onRecordingComplete, onError, detectVoiceActivity, startTimer, state.recordingTime]);

  // Stop recording
  const stopRecording = useCallback(() => {
    console.log('🛑 useRecorder.stopRecording() called');
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    setState(prev => ({ ...prev, isRecording: false }));
    stopTimer();
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [stopTimer]);

  // Cleanup function
  const cleanup = useCallback(() => {
    stopTimer();
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setState(prev => ({
      ...prev,
      isRecording: false,
      voiceActivityLevel: 0,
      frequencyData: []
    }));
  }, [stopTimer]);

  // Initialize on mount
  React.useEffect(() => {
    checkPermission();
    return cleanup;
  }, [checkPermission, cleanup]);

  return {
    ...state,
    startRecording,
    stopRecording,
    cleanup
  };
}