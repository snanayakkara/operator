import React from 'react';
import { StopCircle, Mic, MicOff } from 'lucide-react';

interface LiveAudioVisualizerProps {
  isRecording: boolean;
  voiceActivityLevel: number;
  frequencyData: number[];
  audioLevelHistory: number[];
  recordingTime: number;
  activeDeviceInfo: {
    label: string;
    deviceId: string;
    isWorking: boolean;
  } | null;
  onStop: () => void;
  className?: string;
}

export const LiveAudioVisualizer: React.FC<LiveAudioVisualizerProps> = ({
  isRecording,
  voiceActivityLevel,
  frequencyData,
  audioLevelHistory,
  recordingTime,
  activeDeviceInfo,
  onStop,
  className = ""
}) => {
  // Debounced audio status state
  const [debouncedAudioStatus, setDebouncedAudioStatus] = React.useState({ 
    status: 'idle', 
    color: 'gray', 
    message: 'Not recording' 
  });
  const [showPersistentWarning, setShowPersistentWarning] = React.useState(false);
  const statusDebounceRef = React.useRef<ReturnType<typeof setTimeout>>();

  // Debug logging for received frequency data
  React.useEffect(() => {
    if (isRecording && frequencyData.length > 0 && voiceActivityLevel > 0.05 && Math.random() < 0.05) {
      console.log('📊 Visualizer Debug:', {
        isRecording,
        frequencyDataLength: frequencyData.length,
        voiceLevel: Math.round(voiceActivityLevel * 100) + '%',
        freqAvg: Math.round((frequencyData.reduce((sum, f) => sum + f, 0) / frequencyData.length) * 100) + '%'
      });
    }
  }, [isRecording, frequencyData, voiceActivityLevel]);

  const hasRecentActivity = audioLevelHistory.slice(-10).some(level => level > 0.05);
  
  // Determine immediate audio status (for internal calculations)
  const getImmediateAudioStatus = () => {
    if (!isRecording) return { status: 'idle', color: 'gray', message: 'Not recording' };
    if (audioLevelHistory.length < 5) return { status: 'initializing', color: 'blue', message: 'Initializing...' };
    if (hasRecentActivity) return { status: 'active', color: 'green', message: 'Audio detected' };
    if (voiceActivityLevel > 0.01) return { status: 'low', color: 'yellow', message: 'Low audio' };
    return { status: 'silent', color: 'red', message: 'No audio detected' };
  };

  // Debounce audio status changes to prevent flashing
  React.useEffect(() => {
    const immediateStatus = getImmediateAudioStatus();
    
    // Clear existing timeout
    if (statusDebounceRef.current) {
      clearTimeout(statusDebounceRef.current);
    }
    
    // For immediate feedback on good states, update right away
    if (immediateStatus.status === 'active' || immediateStatus.status === 'initializing') {
      setDebouncedAudioStatus(immediateStatus);
      setShowPersistentWarning(false);
      return;
    }
    
    // For problem states (silent, low), debounce for 2.5 seconds
    if (immediateStatus.status === 'silent' || immediateStatus.status === 'low') {
      statusDebounceRef.current = setTimeout(() => {
        setDebouncedAudioStatus(immediateStatus);
        // Show persistent warning only after extended silence (10+ seconds)
        if (immediateStatus.status === 'silent' && audioLevelHistory.length > 50) {
          setShowPersistentWarning(true);
        }
      }, 2500);
    } else {
      // For idle or other states, update immediately
      setDebouncedAudioStatus(immediateStatus);
      setShowPersistentWarning(false);
    }
    
    return () => {
      if (statusDebounceRef.current) {
        clearTimeout(statusDebounceRef.current);
      }
    };
  }, [isRecording, hasRecentActivity, voiceActivityLevel, audioLevelHistory.length]);

  const audioStatus = debouncedAudioStatus;

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate VU meter angle (0 to 180 degrees)
  const vuAngle = Math.min(voiceActivityLevel * 180, 180);

  // Create symmetrical frequency data for center-out visualization
  const createSymmetricalFrequencyData = (data: number[]) => {
    if (data.length === 0) return [];
    
    // Create a mirrored array - center-out pattern
    const mirrored = [...data].reverse();
    return [...mirrored, ...data];
  };

  // Get symmetrical frequency data
  const symmetricalFrequencyData = createSymmetricalFrequencyData(frequencyData);

  return (
    <div className={`flex-1 flex flex-col items-center justify-center p-4 space-y-4 ${className}`}>
      {/* Large Circular VU Meter - Slightly smaller for vertical layout */}
      <div className="relative">
        {/* Background circle */}
        <div className="w-24 h-24 rounded-full border-6 border-line-primary relative overflow-hidden">
          {/* VU meter arc background */}
          <div className="absolute inset-1.5 rounded-full border-3 border-line-secondary"></div>
          
          {/* VU meter fill - minimal accent color */}
          <div 
            className="absolute inset-1.5 rounded-full border-3 transition-all duration-100"
            style={{
              borderColor: audioStatus.color === 'green' ? 'var(--accent-emerald)' :
                          audioStatus.color === 'yellow' ? 'var(--accent-amber)' :
                          audioStatus.color === 'red' ? 'var(--accent-red)' :
                          audioStatus.color === 'blue' ? 'var(--accent-violet)' :
                          'var(--line-primary)',
              clipPath: `polygon(50% 50%, 50% 0%, ${50 + Math.sin((vuAngle * Math.PI) / 180) * 50}% ${50 - Math.cos((vuAngle * Math.PI) / 180) * 50}%, 50% 50%)`
            }}
          ></div>
          
          {/* Center microphone icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            {audioStatus.status === 'active' ? (
              <Mic className="w-6 h-6" style={{color: 'var(--accent-emerald)'}} />
            ) : audioStatus.status === 'silent' ? (
              <MicOff className="w-6 h-6" style={{color: 'var(--accent-red)'}} />
            ) : (
              <Mic className="w-6 h-6 text-ink-secondary" />
            )}
          </div>
          
          {/* Level percentage */}
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
            <span className="text-xs font-semibold text-ink-secondary">
              {Math.round(voiceActivityLevel * 100)}%
            </span>
          </div>
        </div>

        {/* Recording pulse indicator - small accent dot */}
        {isRecording && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full animate-pulse flex items-center justify-center" style={{backgroundColor: 'var(--accent-red)'}}>
            <div className="w-2 h-2 bg-surface-primary rounded-full"></div>
          </div>
        )}
      </div>

      {/* Status and Device Info */}
      <div className="text-center space-y-1">
        <h3 className="text-base font-semibold text-ink-primary">
          {isRecording ? 'Recording in progress' : 'Ready to record'}
        </h3>
        
        <div className="flex items-center justify-center space-x-2 text-sm text-ink-secondary">
          <div 
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: audioStatus.color === 'green' ? 'var(--accent-emerald)' :
                              audioStatus.color === 'yellow' ? 'var(--accent-amber)' :
                              audioStatus.color === 'red' ? 'var(--accent-red)' :
                              audioStatus.color === 'blue' ? 'var(--accent-violet)' :
                              'var(--ink-tertiary)'
            }}
          />
          <span>{audioStatus.message}</span>
        </div>

        {/* Device info - More compact */}
        {activeDeviceInfo && (
          <div className="text-xs text-ink-tertiary truncate max-w-xs">
            {activeDeviceInfo.label}
          </div>
        )}

        {/* Recording timer - Clean monochrome */}
        {isRecording && (
          <div className="text-lg font-mono font-semibold text-ink-primary bg-surface-tertiary rounded-full px-3 py-1">
            {formatTime(recordingTime)}
          </div>
        )}
      </div>

      {/* Real-time Audio Waveform Visualization */}
      {isRecording && (
        <div className="w-full max-w-sm">
          <div className="text-xs text-ink-tertiary text-center mb-2">Live audio spectrum</div>
          <div className="h-16 bg-surface-tertiary rounded-2xl border border-line-primary flex items-center justify-center px-2 overflow-hidden">
            {symmetricalFrequencyData.length > 0 ? (
              <div className="flex items-center justify-center space-x-0.5 h-full w-full">
                {symmetricalFrequencyData.map((freq, index) => {
                  // Calculate distance from center for animation delay
                  const centerIndex = Math.floor(symmetricalFrequencyData.length / 2);
                  const distanceFromCenter = Math.abs(index - centerIndex);
                  
                  return (
                    <div
                      key={index}
                      className="flex-1 max-w-1 rounded-full transition-all duration-100"
                      style={{ 
                        backgroundColor: freq > 0.7 ? 'var(--accent-emerald)' :
                                        freq > 0.4 ? 'var(--accent-emerald)' :
                                        freq > 0.2 ? 'var(--accent-violet)' :
                                        freq > 0.1 ? 'var(--accent-violet)' :
                                        freq > 0.05 ? 'var(--ink-tertiary)' :
                                        'var(--line-primary)',
                        height: `${Math.max(freq * 90, 2)}%`,
                        minHeight: '2px',
                        // Center-out animation: center bars have no delay, outer bars have increasing delay
                        animationDelay: `${distanceFromCenter * 5}ms`
                      }}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-gray-400">
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                <span className="text-xs">Waiting for audio...</span>
              </div>
            )}
          </div>
          
          {/* Audio Level Indicator */}
          <div className="mt-2 flex items-center justify-between text-xs text-ink-tertiary">
            <span>Audio level:</span>
            <span className="font-semibold text-ink-secondary">
              {Math.round(voiceActivityLevel * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Stop Recording Button - Large black pill */}
      {isRecording && (
        <button
          onClick={onStop}
          className="flex items-center space-x-2 bg-ink-primary hover:bg-ink-secondary text-surface-primary px-6 py-3 rounded-full transition-all duration-160 shadow-sm micro-lift"
        >
          <StopCircle className="w-5 h-5" />
          <span className="font-medium">Stop recording</span>
        </button>
      )}

      {/* Fixed Layout Troubleshooting Hints - Always reserves space to prevent UI jumping */}
      <div className="w-full max-w-sm min-h-[60px] flex items-center justify-center">
        {isRecording && showPersistentWarning && (
          <div className="w-full bg-surface-tertiary border border-line-primary rounded-2xl p-3 transition-all duration-300">
            <div className="text-xs text-ink-primary font-medium mb-1 flex items-center space-x-1">
              <div 
                className="w-1 h-1 rounded-full transition-colors duration-300" 
                style={{backgroundColor: audioStatus.color === 'red' ? 'var(--accent-red)' : 'var(--accent-amber)'}} 
              />
              <span>{audioStatus.message}</span>
            </div>
            <div className="text-xs text-ink-secondary">
              • Check if microphone is muted<br/>
              • Ensure device is connected<br/>
              • Try speaking louder<br/>
              • Switch microphones if available
            </div>
          </div>
        )}
        {isRecording && !showPersistentWarning && (
          <div className="text-xs text-ink-tertiary text-center opacity-60">
            Audio monitoring active
          </div>
        )}
      </div>
    </div>
  );
};