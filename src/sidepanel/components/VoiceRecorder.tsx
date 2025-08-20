import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Square } from 'lucide-react';
import { MicrophoneSelector } from './MicrophoneSelector';

interface VoiceRecorderProps {
  isRecording: boolean;
  voiceActivityLevel: number;
  frequencyData: number[];
  onRecordingStart: () => void;
  onRecordingStop: (audioBlob: Blob) => void;
  onVoiceActivityUpdate: (level: number, frequencies: number[]) => void;
  disabled?: boolean;
  isCompact?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  isRecording,
  voiceActivityLevel,
  frequencyData,
  onRecordingStart,
  onRecordingStop,
  onVoiceActivityUpdate,
  disabled = false,
  isCompact = false
}) => {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState<string | null>(null);
  
  const audioChunks = useRef<Blob[]>([]);
  const animationFrame = useRef<number>();
  const intervalRef = useRef<number>();

  useEffect(() => {
    // Check for microphone permission on mount
    checkMicrophonePermission();
    
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      startRecordingTimer();
      startVoiceActivityDetection();
    } else {
      stopRecordingTimer();
      stopVoiceActivityDetection();
    }
  }, [isRecording]);

  const checkMicrophonePermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      console.log('🎤 Permission query result:', result.state);
      setHasPermission(result.state === 'granted');
      
      result.addEventListener('change', () => {
        console.log('🎤 Permission changed to:', result.state);
        setHasPermission(result.state === 'granted');
      });
    } catch (error) {
      console.log('🎤 Permission API not supported, fallback to direct check');
      // Permission API not supported, fallback to direct check
      setHasPermission(null);
    }
  };

  const testAudioLevels = async (stream: MediaStream): Promise<void> => {
    return new Promise((resolve) => {
      console.log('🔍 Testing audio levels for external microphone...');
      
      const testContext = new AudioContext();
      const testSource = testContext.createMediaStreamSource(stream);
      const testAnalyser = testContext.createAnalyser();
      
      testAnalyser.fftSize = 256;
      testAnalyser.smoothingTimeConstant = 0.3;
      testSource.connect(testAnalyser);
      
      const dataArray = new Uint8Array(testAnalyser.frequencyBinCount);
      let maxLevel = 0;
      let samplesChecked = 0;
      const maxSamples = 30; // Check for 1 second (30 * ~33ms)
      
      const checkLevel = () => {
        testAnalyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        const normalizedLevel = average / 128;
        
        if (normalizedLevel > maxLevel) {
          maxLevel = normalizedLevel;
        }
        
        samplesChecked++;
        
        if (samplesChecked >= maxSamples) {
          testContext.close();
          
          if (maxLevel < 0.01) {
            console.warn('⚠️ Very low audio levels detected (max:', maxLevel.toFixed(3), ') - microphone may be muted or positioned incorrectly');
          } else if (maxLevel < 0.05) {
            console.warn('⚠️ Low audio levels detected (max:', maxLevel.toFixed(3), ') - consider speaking louder or moving closer to microphone');
          } else {
            console.log('✅ Good audio levels detected (max:', maxLevel.toFixed(3), ')');
          }
          
          resolve();
        } else {
          requestAnimationFrame(checkLevel);
        }
      };
      
      checkLevel();
    });
  };

  const startRecordingTimer = () => {
    setRecordingTime(0);
    intervalRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopRecordingTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const startVoiceActivityDetection = () => {
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Number of frequency bars to display
    const numBars = 10;

    const detectVoiceActivity = () => {
      if (!analyser) return;
      
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume for overall level
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      const normalizedLevel = Math.min(average / 128, 1);
      
      // Create frequency spectrum bars by grouping frequency bins
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
      
      onVoiceActivityUpdate(normalizedLevel, frequencies);
      
      if (isRecording) {
        animationFrame.current = requestAnimationFrame(detectVoiceActivity);
      }
    };

    detectVoiceActivity();
  };

  const stopVoiceActivityDetection = () => {
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }
    onVoiceActivityUpdate(0, []);
  };

  const startRecording = async () => {
    console.log('🎤 VoiceRecorder.startRecording() called', { selectedMicrophoneId });
    setIsRequestingPermission(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: selectedMicrophoneId ? {
          deviceId: { exact: selectedMicrophoneId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: { ideal: 16000, min: 8000, max: 48000 },
          channelCount: { ideal: 1 },
          volume: { min: 0.1, max: 1.0 },
          latency: { ideal: 0.01 }
        } : {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: { ideal: 16000, min: 8000, max: 48000 },
          channelCount: { ideal: 1 },
          volume: { min: 0.1, max: 1.0 },
          latency: { ideal: 0.01 }
        }
      });
      
      setHasPermission(true);
      setIsRequestingPermission(false);

      // Log the actual microphone being used
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        const track = audioTracks[0];
        const settings = track.getSettings();
        console.log('🎤 Using microphone:', {
          label: track.label,
          deviceId: settings.deviceId,
          groupId: settings.groupId,
          sampleRate: settings.sampleRate,
          channelCount: settings.channelCount,
          echoCancellation: settings.echoCancellation,
          noiseSuppression: settings.noiseSuppression,
          autoGainControl: settings.autoGainControl
        });
        
        // Additional audio stream validation
        if (!settings.sampleRate) {
          console.warn('⚠️ Sample rate not set - may cause transcription issues');
        }
        if (settings.sampleRate !== 16000) {
          console.log('ℹ️ Sample rate is', settings.sampleRate, 'Hz (expected 16000 Hz)');
        }
        
        // Pre-recording audio level test for external microphones
        await testAudioLevels(stream);
      }

      // Set up audio context for voice activity detection
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyserNode = context.createAnalyser();
      
      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.8;
      source.connect(analyserNode);
      
      setAudioContext(context);
      setAnalyser(analyserNode);

      // Set up media recorder
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunks.current = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };
      
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm;codecs=opus' });
        
        // Debug logging for audio blob details
        console.log('🎤 Audio recording completed:', {
          size: audioBlob.size,
          type: audioBlob.type,
          chunks: audioChunks.current.length,
          recordingTime: recordingTime,
          estimatedDuration: recordingTime + 's',
          sizeInKB: (audioBlob.size / 1024).toFixed(2) + 'KB'
        });
        
        // Validate minimum recording duration
        if (recordingTime < 2) {
          console.warn('⚠️ Recording too short:', recordingTime + 's - minimum 2 seconds recommended for reliable transcription');
        }
        
        // Validate audio blob size
        if (audioBlob.size < 1000) { // Less than 1KB
          console.warn('⚠️ Audio blob very small:', audioBlob.size + ' bytes - may be silent or corrupted');
        }
        
        // Calculate expected size based on duration for quality check
        // WebM/Opus typically ~8-16 KB per second for speech
        const expectedMinSize = recordingTime * 4000; // ~4KB/second minimum
        const expectedMaxSize = recordingTime * 20000; // ~20KB/second maximum
        
        if (audioBlob.size < expectedMinSize) {
          console.warn(`⚠️ Audio smaller than expected: ${audioBlob.size} bytes for ${recordingTime}s (expected >${expectedMinSize} bytes) - may be very quiet or silent`);
        } else if (audioBlob.size > expectedMaxSize) {
          console.log(`ℹ️ Audio larger than typical: ${audioBlob.size} bytes for ${recordingTime}s - may be high quality or noisy`);
        } else {
          console.log(`✅ Audio size within expected range for ${recordingTime}s recording`);
        }
        
        onRecordingStop(audioBlob);
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
        context.close();
      };
      
      recorder.start(100); // Collect data every 100ms
      setMediaRecorder(recorder);
      onRecordingStart();
      
    } catch (error) {
      console.error('🎤 Recording start failed:', error);
      
      // Recording start failed
      setHasPermission(false);
      setIsRequestingPermission(false);
      
      // Show user-friendly error message
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          console.log('🎤 Microphone permission denied by user');
        } else if (error.name === 'NotFoundError') {
          console.log('🎤 No microphone found');
        } else {
          console.log('🎤 Microphone access error:', error.name, error.message);
        }
      }
    }
  };

  const stopRecording = () => {
    console.log('🛑 VoiceRecorder.stopRecording() called');
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setMediaRecorder(null);
    }
  };

  const cleanup = () => {
    stopRecordingTimer();
    stopVoiceActivityDetection();
    
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    
    if (audioContext) {
      audioContext.close();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderVoiceActivityBars = () => {
    // Use frequency data if available, otherwise fall back to simple bars
    const dataToUse = frequencyData.length > 0 ? frequencyData : Array(10).fill(voiceActivityLevel);
    
    const bars = dataToUse.map((value, i) => {
      // Calculate height based on frequency data (2-32px range)
      const height = Math.max(2, value * 30);
      const opacity = value > 0.05 ? 0.8 + (value * 0.2) : 0.3;
      
      // Create a color gradient from bass (red) to treble (blue)
      const hue = 240 - (i / dataToUse.length) * 120; // Blue to red spectrum
      const saturation = 70 + (value * 30); // More vibrant when active
      const lightness = 45 + (value * 25); // Brighter when active
      
      const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      
      return (
        <div
          key={i}
          className="rounded-full transition-all duration-75 ease-out"
          style={{
            width: '4px',
            height: `${height}px`,
            backgroundColor: color,
            opacity,
            boxShadow: value > 0.3 ? `0 0 8px ${color}40` : 'none',
            transform: `scaleY(${Math.max(0.3, value + 0.3)})`
          }}
        />
      );
    });
    
    return (
      <div className="flex items-end justify-center space-x-1 h-8">
        {bars}
      </div>
    );
  };

  if (hasPermission === false) {
    return (
      <div className="text-center space-y-4">
        <div className="text-gray-600">
          <MicOff className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Microphone access required</p>
        </div>
        <button
          onClick={() => {
            console.log('🎤 Grant Permission button clicked');
            if (!isRequestingPermission) {
              setHasPermission(null); // Reset to loading state
              startRecording();
            }
          }}
          disabled={isRequestingPermission}
          className={`glass-button px-4 py-2 rounded-lg text-gray-900 text-sm font-medium transition-opacity ${
            isRequestingPermission ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isRequestingPermission ? 'Requesting...' : 'Grant Permission'}
        </button>
      </div>
    );
  }

  if (hasPermission === null || isRequestingPermission) {
    return (
      <div className="text-center space-y-4">
        <div className="text-gray-600">
          <Mic className="w-12 h-12 mx-auto mb-2 opacity-50 animate-pulse" />
          <p className="text-sm">
            {isRequestingPermission ? 'Please allow microphone access...' : 'Requesting microphone access...'}
          </p>
        </div>
      </div>
    );
  }

  // Compact mode for after recording is completed
  if (isCompact && !isRecording) {
    return (
      <div className="text-center">
        <div className="flex items-center justify-center space-x-3">
          {/* Small recording button */}
          <button
            onClick={(e) => {
              console.log('🖱️ VoiceRecorder button clicked!', { isRecording, disabled });
              e.preventDefault();
              e.stopPropagation();
              startRecording();
            }}
            disabled={disabled}
            className={`
              relative w-12 h-12 rounded-full border-2 transition-all duration-300 
              glass-button border-gray-300 hover:border-blue-400
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <Mic className="w-5 h-5 mx-auto text-blue-600" />
          </button>
          
          {/* Compact status */}
          <div className="text-left">
            <p className="text-gray-900 text-sm font-medium">Recording Complete</p>
            <p className="text-gray-600 text-xs">Tap to record again</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4">
      {/* Microphone Selector - only show when not compact */}
      {!isCompact && (
        <div className="flex justify-center mb-4">
          <MicrophoneSelector
            selectedDeviceId={selectedMicrophoneId}
            onDeviceChange={setSelectedMicrophoneId}
            disabled={isRecording}
          />
        </div>
      )}

      {/* Recording Button */}
      <div className="relative">
        <button
          onClick={(e) => {
            console.log('🖱️ VoiceRecorder button clicked!', { isRecording, disabled });
            e.preventDefault();
            e.stopPropagation();
            if (isRecording) {
              stopRecording();
            } else {
              startRecording();
            }
          }}
          disabled={disabled}
          className={`
            relative w-20 h-20 rounded-full border-4 transition-all duration-300 
            ${isRecording 
              ? 'bg-red-50 border-red-300 recording-glow' 
              : 'glass-button border-gray-300 hover:border-blue-400'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {isRecording ? (
            <Square className="w-8 h-8 mx-auto text-red-400" />
          ) : (
            <Mic className="w-8 h-8 mx-auto text-blue-600" />
          )}
          
          {/* Recording indicator pulse */}
          {isRecording && (
            <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
          )}
        </button>
        
        {/* Recording time */}
        {isRecording && (
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
            <span className="text-gray-600 text-sm font-mono">
              {formatTime(recordingTime)}
            </span>
          </div>
        )}
      </div>

      {/* Voice Activity Indicator */}
      {isRecording && (
        <div className="flex flex-col items-center space-y-2">
          {renderVoiceActivityBars()}
          <p className="text-gray-600 text-xs">
            {voiceActivityLevel > 0.1 ? 'Listening...' : 'Speak now'}
          </p>
        </div>
      )}

      {/* Instructions */}
      {!isRecording && (
        <div className="text-gray-600 text-sm space-y-1">
          <p>Tap to start recording</p>
          <p className="text-xs opacity-75">
            Alt+R to toggle recording
          </p>
        </div>
      )}

      {/* Recording Status */}
      {isRecording && (
        <div className="glass rounded-lg p-3">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-gray-900 text-sm font-medium">Recording</span>
          </div>
          <p className="text-gray-600 text-xs mt-1">
            Tap stop when finished speaking
          </p>
        </div>
      )}
    </div>
  );
};