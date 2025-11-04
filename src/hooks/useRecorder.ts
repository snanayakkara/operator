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
    // With fftSize=512, we have 256 frequency bins (fftSize/2)
    const numBars = 64; // 64 bars for smoother waveform visualization
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

  // Start recording
  const startRecording = useCallback(async () => {
    console.log('🎤 useRecorder.startRecording() called');

    setState(prev => ({ ...prev, isRequestingPermission: true }));

    try {
      // Get the current microphone ID from either prop or function
      const currentMicrophoneId = getMicrophoneId?.() || selectedMicrophoneId;

      // Detect if this is a Bluetooth device (requires special handling)
      const isBluetoothDevice = async (deviceId: string | null): Promise<boolean> => {
        if (!deviceId) return false;
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const device = devices.find(d => d.deviceId === deviceId);
          return device?.label?.toLowerCase().includes('airpods') ||
                 device?.label?.toLowerCase().includes('bluetooth') || false;
        } catch {
          return false;
        }
      };

      const isBluetooth = await isBluetoothDevice(currentMicrophoneId || null);

      // Phase 3: Add initialization delay for Bluetooth devices
      if (isBluetooth && currentMicrophoneId) {
        console.log('🎧 Bluetooth device detected, adding initialization delay...');
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Phase 1: Use EXACT device constraint to prevent silent fallback
      // This ensures Chrome will fail with an error instead of silently using wrong device
      const constraints = {
        audio: currentMicrophoneId ? {
          deviceId: { exact: currentMicrophoneId }, // EXACT constraint - no silent fallback
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      console.log('🎤 Requesting media stream with constraints:', {
        deviceId: currentMicrophoneId,
        exact: true,
        isBluetooth
      });

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      streamRef.current = stream;

      // Validate audio track health
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio tracks available in the media stream');
      }

      const primaryTrack = audioTracks[0];

      // Basic track validation
      if (primaryTrack.readyState !== 'live') {
        console.warn('⚠️ Audio track is not live:', primaryTrack.readyState);
      }

      if (!primaryTrack.enabled) {
        primaryTrack.enabled = true;
      }

      // Handle muted track with automatic recovery
      if (primaryTrack.muted) {
        console.warn('⚠️ Microphone appears muted, attempting recovery...');

        // Toggle enabled state to attempt unmute
        primaryTrack.enabled = false;
        await new Promise(resolve => setTimeout(resolve, 100));
        primaryTrack.enabled = true;
        await new Promise(resolve => setTimeout(resolve, 100));

        if (primaryTrack.muted) {
          console.error('❌ Microphone is muted. Please check System Settings → Sound → Input');
          throw new Error('Microphone is muted at system level. Please restart your computer or check Sound settings.');
        }
      }

      // Phase 2: Strict device validation - ensure we got the requested device
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

        activeDeviceInfo = {
          label: track.label || 'Unknown Microphone',
          deviceId: settings.deviceId || 'unknown',
          isWorking: false, // Will be updated by voice activity detection
          hasMismatch: false
        };

        // Phase 2: Device mismatch validation - stop stream and throw error if wrong device
        if (currentMicrophoneId && settings.deviceId !== currentMicrophoneId) {
          console.error('❌ DEVICE MISMATCH DETECTED', {
            requested: currentMicrophoneId,
            received: settings.deviceId,
            receivedLabel: track.label
          });

          // Clean up the stream immediately
          stream.getTracks().forEach(track => track.stop());

          // Get device names for better error message
          const devices = await navigator.mediaDevices.enumerateDevices();
          const requestedDevice = devices.find(d => d.deviceId === currentMicrophoneId);
          const receivedDevice = devices.find(d => d.deviceId === settings.deviceId);

          const errorMessage = `Failed to access selected microphone "${requestedDevice?.label || 'unknown'}". ` +
            `System used "${receivedDevice?.label || track.label || 'unknown'}" instead. ` +
            `\n\nPossible fixes:\n` +
            `• Ensure AirPods are connected and selected as input device in macOS Sound settings\n` +
            `• Try disconnecting and reconnecting your AirPods\n` +
            `• Restart Chrome to refresh device permissions\n` +
            `• Check System Settings → Privacy & Security → Microphone`;

          throw new Error(errorMessage);
        }

        console.log('✅ Device validation passed:', {
          requested: currentMicrophoneId,
          received: settings.deviceId,
          label: track.label,
          match: true
        });
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

      // Ensure audio context is running immediately
      if (context.state === 'suspended') {
        console.log('🎤 Resuming suspended audio context...');
        await context.resume();
      }

      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();

      // Use larger FFT size for better frequency resolution
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.7;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;

      source.connect(analyser);

      // Verify AudioContext state
      if (context.state !== 'running') {
        console.error('❌ AudioContext failed to start:', context.state);
        throw new Error(`AudioContext is in ${context.state} state, expected "running"`);
      }

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

      recorder.onerror = (event: Event) => {
        console.error('❌ MediaRecorder error:', event);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });

        if (audioBlob.size === 0) {
          console.error('❌ No audio data captured');
        }

        onRecordingComplete(audioBlob);
        cleanup();
      };

      recorder.start(100); // Collect data every 100ms
      mediaRecorderRef.current = recorder;
      
      startTimer();

      // Start voice activity detection
      setTimeout(async () => {
        await detectVoiceActivity();
      }, 100);
      
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
