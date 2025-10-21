import React, { useState, useRef, useCallback } from 'react';

export interface RecorderState {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  voiceActivityLevel: number;
  frequencyData: number[];
  hasPermission: boolean | null;
  isRequestingPermission: boolean;
  activeDeviceInfo: {
    label: string;
    deviceId: string;
    isWorking: boolean;
    hasMismatch?: boolean;
    requestedDeviceId?: string;
  } | null;
  audioLevelHistory: number[];
}

export interface RecorderOptions {
  onRecordingComplete: (audioBlob: Blob) => void;
  onVoiceActivityUpdate?: (level: number, frequencies: number[]) => void;
  onRecordingTimeUpdate?: (time: number) => void;
  onError?: (error: Error) => void;
  selectedMicrophoneId?: string;
  getMicrophoneId?: () => string | null;
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
    selectedMicrophoneId,
    getMicrophoneId
  } = options;

  const [state, setState] = useState<RecorderState>({
    isRecording: false,
    isPaused: false,
    recordingTime: 0,
    voiceActivityLevel: 0,
    frequencyData: [],
    hasPermission: null,
    isRequestingPermission: false,
    activeDeviceInfo: null,
    audioLevelHistory: []
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number>();
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>();
  const isRecordingRef = useRef<boolean>(false);

  // Voice activity detection with device validation
  const detectVoiceActivity = useCallback(async () => {
    try {
      const analyser = analyserRef.current;
      const audioContext = audioContextRef.current;
      
      // Enhanced debug logging
      if (!analyser) {
        console.log('🔇 detectVoiceActivity: analyser is null');
        return;
      }
      
      if (!isRecordingRef.current) {
        console.log('🔇 detectVoiceActivity: not recording (ref check)');
        return;
      }
      
      if (!audioContext) {
        console.log('🔇 detectVoiceActivity: audio context is null');
        return;
      }
      
      if (audioContext.state !== 'running') {
        console.log('🔇 detectVoiceActivity: audio context state is', audioContext.state);
        // Try to resume audio context if suspended
        if (audioContext.state === 'suspended') {
          console.log('🎤 Attempting to resume suspended audio context...');
          try {
            await audioContext.resume();
            console.log('✅ Audio context resumed successfully');
          } catch (resumeError) {
            console.error('❌ Failed to resume audio context:', resumeError);
            return;
          }
        } else {
          return;
        }
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      analyser.getByteFrequencyData(dataArray);
      
      // Enhanced debug logging for data flow verification
      const maxValue = Math.max(...dataArray);
      const hasAudioData = maxValue > 0;
      
      
      // More frequent logging if no audio data is detected
      if (!hasAudioData && Math.random() < 0.05) {
        console.warn('⚠️ No audio data detected in frequency analysis:', {
          contextState: audioContext.state,
          analyserFftSize: analyser.fftSize,
          bufferLength,
          isRecording: isRecordingRef.current
        });
      }
    
    // Calculate average volume for overall level
    const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
    const normalizedLevel = Math.min(average / 128, 1);
    
    // Create frequency spectrum bars by grouping frequency bins
    const numBars = 64; // Increased from 10 to 64 for smoother waveform visualization
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
    
    setState(prev => {
      // Update audio level history (keep last 30 samples for ~1 second at 30fps)
      const newHistory = [...prev.audioLevelHistory, normalizedLevel].slice(-30);
      
      // Check if device is working based on recent audio levels
      const recentAverageLevel = newHistory.length > 10 ? 
        newHistory.slice(-10).reduce((sum, level) => sum + level, 0) / 10 : 0;
      
      const deviceIsWorking = recentAverageLevel > 0.01 || normalizedLevel > 0.05; // Working if recent activity
      
      // Debug logging for frequency data (minimal logging to avoid console spam)
      if (normalizedLevel > 0.1 && Math.random() < 0.001) {
        console.log('🎤 Audio Debug:', {
          level: Math.round(normalizedLevel * 100) + '%',
          frequencyBars: frequencies.length,
          avgFreq: Math.round((frequencies.reduce((sum, f) => sum + f, 0) / frequencies.length) * 100) + '%',
          maxFreq: Math.round(Math.max(...frequencies) * 100) + '%'
        });
      }
      
      return {
        ...prev,
        voiceActivityLevel: normalizedLevel,
        frequencyData: frequencies,
        audioLevelHistory: newHistory,
        activeDeviceInfo: prev.activeDeviceInfo ? {
          ...prev.activeDeviceInfo,
          isWorking: deviceIsWorking
        } : null
      };
    });
    
    onVoiceActivityUpdate?.(normalizedLevel, frequencies);
    
      if (isRecordingRef.current) {
        animationFrameRef.current = requestAnimationFrame(() => detectVoiceActivity());
      }
    } catch (error) {
      console.error('🔇 detectVoiceActivity error:', error);
      // Continue with animation frame even on error to avoid stopping completely
      if (isRecordingRef.current) {
        animationFrameRef.current = requestAnimationFrame(() => detectVoiceActivity());
      }
    }
  }, [onVoiceActivityUpdate]);

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
      // Get the current microphone ID from either prop or function
      const currentMicrophoneId = getMicrophoneId?.() || selectedMicrophoneId;
      
      const constraints = {
        audio: currentMicrophoneId ? {
          deviceId: { exact: currentMicrophoneId }, // Force exact device match
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
      
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (exactConstraintError: any) {
        if (currentMicrophoneId) {
          console.warn('⚠️ Exact device constraint failed, attempting fallback:', {
            requestedDevice: currentMicrophoneId,
            error: exactConstraintError?.message || 'Unknown error'
          });
          
          // Fallback to non-exact constraint
          const fallbackConstraints = {
            audio: {
              deviceId: currentMicrophoneId, // Non-exact fallback
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 16000
            }
          };
          
          try {
            stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
            console.log('✅ Fallback constraint succeeded');
          } catch (fallbackError) {
            console.error('❌ Both exact and fallback constraints failed:', fallbackError);
            throw fallbackError;
          }
        } else {
          throw exactConstraintError;
        }
      }
      
      streamRef.current = stream;
      
      // Get actual device info from the stream
      const audioTracks = stream.getAudioTracks();
      let activeDeviceInfo: {
        label: string;
        deviceId: string;
        isWorking: boolean;
        hasMismatch?: boolean;
        requestedDeviceId?: string;
      } | null = null;
      
      if (audioTracks.length > 0) {
        const track = audioTracks[0];
        const settings = track.getSettings();
        const constraints = track.getConstraints();
        
        activeDeviceInfo = {
          label: track.label || 'Unknown Microphone',
          deviceId: settings.deviceId || 'unknown',
          isWorking: false, // Will be updated by voice activity detection
          hasMismatch: false
        };
        
        console.log('🎤 Audio device details:', {
          label: track.label,
          deviceId: settings.deviceId,
          requestedDeviceId: currentMicrophoneId,
          sampleRate: settings.sampleRate,
          channelCount: settings.channelCount,
          constraints: constraints,
          deviceMatch: settings.deviceId === currentMicrophoneId
        });
        
        // Enhanced device verification and error handling
        if (currentMicrophoneId && settings.deviceId !== currentMicrophoneId) {
          const deviceMismatchWarning = {
            requested: currentMicrophoneId,
            actual: settings.deviceId,
            actualLabel: track.label,
            isExactConstraint: constraints.deviceId && typeof constraints.deviceId === 'object' && 'exact' in constraints.deviceId,
            isDefaultDevice: settings.deviceId === 'default' || !settings.deviceId
          };
          
          console.warn('⚠️ Device mismatch detected:', deviceMismatchWarning);
          
          // More specific warnings based on the type of mismatch
          if (deviceMismatchWarning.isDefaultDevice) {
            console.warn('💡 Falling back to system default microphone');
            console.warn('   - AirPods may not be properly connected or available');
            console.warn('   - Check Bluetooth connection and system audio settings');
          } else {
            console.warn('💡 Using different device than requested:');
            console.warn(`   - Requested: ${currentMicrophoneId}`);
            console.warn(`   - Actually using: "${track.label}" (${settings.deviceId})`);
            console.warn('   - This may indicate device availability issues');
          }
          
          // Store device mismatch info for user notification
          if (activeDeviceInfo) {
            activeDeviceInfo.hasMismatch = true;
            activeDeviceInfo.requestedDeviceId = currentMicrophoneId;
          }
        } else if (currentMicrophoneId) {
          console.log('✅ Device match confirmed:', {
            requested: currentMicrophoneId,
            actual: settings.deviceId,
            label: track.label
          });
          if (activeDeviceInfo) {
            activeDeviceInfo.hasMismatch = false;
          }
        }
      }

      // Update the ref before setting state to ensure detectVoiceActivity has correct value
      isRecordingRef.current = true;
      
      setState(prev => ({ 
        ...prev, 
        hasPermission: true, 
        isRequestingPermission: false,
        isRecording: true,
        voiceActivityLevel: 0,
        frequencyData: [],
        activeDeviceInfo,
        audioLevelHistory: []
      }));

      // Set up audio context for voice activity detection
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      
      console.log('🎤 Web Audio API setup:', {
        contextState: context.state,
        analyserFFTSize: analyser.fftSize,
        frequencyBinCount: analyser.frequencyBinCount,
        sampleRate: context.sampleRate
      });
      
      audioContextRef.current = context;
      analyserRef.current = analyser;
      
      // Ensure audio context is running
      if (context.state === 'suspended') {
        console.log('🎤 Resuming suspended audio context...');
        await context.resume();
      }

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
      
      // Delay voice activity detection to ensure Web Audio API is ready
      setTimeout(async () => {
        console.log('🎤 Starting voice activity detection...');
        await detectVoiceActivity();
      }, 100); // 100ms delay to ensure initialization
      
    } catch (error) {
      console.error('🎤 Recording start failed:', error);
      isRecordingRef.current = false; // Reset ref on error
      setState(prev => ({ 
        ...prev, 
        hasPermission: false, 
        isRequestingPermission: false 
      }));
      onError?.(error as Error);
    }
  }, [selectedMicrophoneId, onRecordingComplete, onError, detectVoiceActivity, startTimer, state.recordingTime, cleanup, getMicrophoneId]);

  // Stop recording
  const stopRecording = useCallback(() => {
    console.log('🛑 useRecorder.stopRecording() called');
    
    // Stop the ref first to prevent further animation frames
    isRecordingRef.current = false;
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    setState(prev => ({ ...prev, isRecording: false }));
    stopTimer();
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
  }, [stopTimer]);

  // Cleanup function
  const cleanup = useCallback(() => {
    isRecordingRef.current = false; // Ensure ref is reset
    stopTimer();
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
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
      frequencyData: [],
      activeDeviceInfo: null,
      audioLevelHistory: []
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
