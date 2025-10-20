import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StopCircle, Mic as _Mic, MicOff as _MicOff } from 'lucide-react';
import {
  recordingVariants as _recordingVariants,
  voiceActivityVariants as _voiceActivityVariants,
  cardVariants as _cardVariants,
  withReducedMotion,
  ANIMATION_DURATIONS as _ANIMATION_DURATIONS
} from '@/utils/animations';

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

  // Frame smoothing for inertia effect
  const previousFrameRef = React.useRef<number[]>([]);
  const peakHoldsRef = React.useRef<number[]>([]);

  // Minimal error logging (removed excessive debug output)
  React.useEffect(() => {
    // Only log critical issues - removed debug noise for queue debugging
    if (isRecording && !activeDeviceInfo?.isWorking && Math.random() < 0.01) {
      console.warn('⚠️ Audio device may not be working properly');
    }
  }, [isRecording, activeDeviceInfo]);

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
  const _vuAngle = Math.min(voiceActivityLevel * 180, 180);

  // Apply smoothing with frame averaging for organic motion
  const applySmoothingAndPeakHold = (currentFrame: number[]) => {
    const smoothed: number[] = [];
    const peaks: number[] = [];

    // Initialize arrays if needed
    if (previousFrameRef.current.length !== currentFrame.length) {
      previousFrameRef.current = new Array(currentFrame.length).fill(0);
      peakHoldsRef.current = new Array(currentFrame.length).fill(0);
    }

    for (let i = 0; i < currentFrame.length; i++) {
      // Blend current frame with previous frames (60% current, 40% previous)
      const blended = currentFrame[i] * 0.6 + previousFrameRef.current[i] * 0.4;
      smoothed.push(blended);

      // Peak hold with decay
      if (blended > peakHoldsRef.current[i]) {
        peakHoldsRef.current[i] = blended;
      } else {
        // Slow decay (0.95 multiplier per frame)
        peakHoldsRef.current[i] *= 0.95;
      }
      peaks.push(peakHoldsRef.current[i]);
    }

    // Update previous frame
    previousFrameRef.current = smoothed;

    return { smoothed, peaks };
  };

  // Create symmetrical frequency data for center-out visualization
  const createSymmetricalFrequencyData = (data: number[]) => {
    if (data.length === 0) return [];

    // Apply smoothing first
    const { smoothed } = applySmoothingAndPeakHold(data);

    // Create a mirrored array - center-out pattern
    const mirrored = [...smoothed].reverse();
    return [...mirrored, ...smoothed];
  };

  // Get symmetrical frequency data
  const symmetricalFrequencyData = createSymmetricalFrequencyData(frequencyData);

  // Debug logging (remove after testing)
  React.useEffect(() => {
    if (isRecording && symmetricalFrequencyData.length > 0 && Math.random() < 0.02) {
      const avg = symmetricalFrequencyData.reduce((sum, v) => sum + v, 0) / symmetricalFrequencyData.length;
      const max = Math.max(...symmetricalFrequencyData);
      console.log('📊 Visualizer Debug:', {
        voiceLevel: Math.round(voiceActivityLevel * 100) + '%',
        avgFreq: Math.round(avg * 100) + '%',
        maxFreq: Math.round(max * 100) + '%',
        barCount: symmetricalFrequencyData.length
      });
    }
  }, [isRecording, symmetricalFrequencyData, voiceActivityLevel]);

  return (
    <motion.div 
      className={`flex-1 flex flex-col items-center justify-center p-4 space-y-4 ${className}`}
      variants={withReducedMotion(_cardVariants)}
      initial="hidden"
      animate="visible"
    >

      {/* Status and Device Info with animations */}
      <motion.div 
        className="text-center space-y-1"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: "spring", damping: 20, stiffness: 300 }}
      >
        <motion.h3
          className="text-base font-semibold text-gray-900"
          animate={{
            color: isRecording ? '#3b82f6' : '#1f2937'
          }}
          transition={{ duration: 300 }}
        >
          {isRecording ? 'Recording in progress' : 'Ready to record'}
        </motion.h3>
        
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: audioStatus.color === 'green' ? '#10b981' :
                              audioStatus.color === 'yellow' ? '#f59e0b' :
                              audioStatus.color === 'red' ? '#ef4444' :
                              audioStatus.color === 'blue' ? '#3b82f6' :
                              '#9ca3af'
            }}
            animate={{
              scale: audioStatus.status === 'active' ? [1, 1.3, 1] : 1
            }}
            transition={{
              duration: 2,
              repeat: audioStatus.status === 'active' ? Infinity : 0,
              ease: "easeInOut"
            }}
          />
          <motion.span
            animate={{
              color: audioStatus.status === 'active' ? '#10b981' : '#6b7280'
            }}
            transition={{ duration: 300 }}
          >
            {audioStatus.message}
          </motion.span>
        </div>

        {/* Device info with fade-in */}
        <AnimatePresence>
          {activeDeviceInfo && (
            <motion.div
              className="text-xs text-gray-500 truncate max-w-xs"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
            >
              {activeDeviceInfo.label}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recording timer with slide-in animation */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              className="text-lg font-mono font-semibold text-gray-900 bg-gray-100 rounded-full px-3 py-1"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
            >
              {formatTime(recordingTime)}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Enhanced Audio Spectrum Visualization - Now Primary Display */}
      <AnimatePresence>
        {isRecording && (
          <motion.div 
            className="w-full max-w-lg"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 20, stiffness: 300, delay: 0.1 }}
          >
            <motion.div 
              className="text-sm text-ink-secondary text-center mb-4 font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Live Audio Spectrum
            </motion.div>
            <div className="h-40 bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl border border-gray-200 flex items-center justify-center px-6 overflow-hidden shadow-sm">
              {symmetricalFrequencyData.length > 0 ? (
                <div className="flex items-end justify-center gap-[1px] h-full w-full px-2">
                  {symmetricalFrequencyData.map((freq, index) => {
                    // Calculate distance from center for animation delay
                    const centerIndex = Math.floor(symmetricalFrequencyData.length / 2);
                    const distanceFromCenter = Math.abs(index - centerIndex);

                    // NOTE: freq is already normalized 0-1 from useRecorder (line 143-144)
                    // It's been divided by 128 and curved with Math.pow(x, 0.7)

                    // Counter the 0.7 curve and apply more linear response
                    // Math.pow(x, 1.43) ≈ inverse of Math.pow(x, 0.7)
                    const linearized = Math.pow(freq, 1.43);

                    // Apply gentle compression curve for better visual range
                    // This ensures 50% input ≈ 50% output, but compresses extremes
                    const shaped = linearized < 0.6
                      ? linearized * 0.95  // Slightly reduce low/mid values
                      : 0.57 + (linearized - 0.6) * 0.7; // Compress high values (60-100% → 57-85%)

                    // Scale to percentage (3% min, 85% max)
                    const barHeightPercent = Math.max(3, Math.min(85, 3 + shaped * 82));

                    // Dynamic color based on height (not raw intensity)
                    const getBarColor = (heightPercent: number) => {
                      if (heightPercent > 70) return '#10b981'; // emerald-500 - very loud
                      if (heightPercent > 55) return '#14b8a6'; // teal-500 - loud
                      if (heightPercent > 40) return '#3b82f6'; // blue-500 - moderate
                      if (heightPercent > 25) return '#6366f1'; // indigo-500 - quiet
                      if (heightPercent > 15) return '#8b5cf6'; // violet-500 - very quiet
                      if (heightPercent > 8) return '#a78bfa'; // violet-400 - barely audible
                      return '#d1d5db'; // gray-300 - silence
                    };

                    // Variable border radius based on height (taller = more rounded)
                    const borderRadius = barHeightPercent > 50 ? 'rounded-full' :
                                        barHeightPercent > 30 ? 'rounded-lg' :
                                        'rounded-md';

                    // Glow effect for active bars
                    const glowIntensity = Math.max(0, (barHeightPercent - 40) / 45); // 0-1 for bars > 40%
                    const boxShadow = glowIntensity > 0
                      ? `0 0 ${4 + glowIntensity * 8}px ${glowIntensity * 4}px ${getBarColor(barHeightPercent)}40`
                      : 'none';

                    return (
                      <motion.div
                        key={index}
                        className={`flex-1 min-w-[2px] max-w-[4px] ${borderRadius}`}
                        style={{
                          backgroundColor: getBarColor(barHeightPercent),
                          height: `${barHeightPercent}%`,
                          minHeight: '2px',
                          boxShadow,
                          willChange: 'height, box-shadow'
                        }}
                        initial={{ height: '2px' }}
                        animate={{
                          height: `${barHeightPercent}%`,
                        }}
                        transition={{
                          type: "spring",
                          damping: 25,
                          stiffness: 350,
                          mass: 0.15,
                          delay: distanceFromCenter * 0.002
                        }}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center space-x-4 text-gray-400">
                  <div className="flex items-center space-x-2">
                    <motion.div
                      className="w-4 h-4 bg-blue-400 rounded-full"
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.6, 1, 0.6]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                    <motion.div
                      className="w-4 h-4 bg-blue-500 rounded-full"
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.6, 1, 0.6]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.2
                      }}
                    />
                    <motion.div
                      className="w-4 h-4 bg-blue-600 rounded-full"
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.6, 1, 0.6]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.4
                      }}
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-600">Waiting for audio...</div>
                    <div className="text-xs text-gray-500 mt-1">Speak into your microphone to see the waveform</div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Enhanced Audio Level Indicator */}
            <motion.div
              className="mt-4 flex items-center justify-between text-sm bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <span className="text-gray-600 font-medium">Audio Level:</span>
              <motion.span
                className="font-bold text-lg"
                animate={{
                  color: voiceActivityLevel > 0.3 ? '#10b981' :
                         voiceActivityLevel > 0.1 ? '#3b82f6' :
                         '#6b7280',
                  scale: voiceActivityLevel > 0.5 ? 1.1 : 1
                }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              >
                {Math.round(voiceActivityLevel * 100)}%
              </motion.span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stop Recording Button with enhanced animations */}
      <AnimatePresence>
        {isRecording && (
          <motion.button
            onClick={onStop}
            className="flex items-center space-x-2 bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-full shadow-sm"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            whileHover={{
              scale: 1.05,
              y: -2,
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.15)"
            }}
            whileTap={{ scale: 0.95 }}
            transition={{
              type: "spring",
              damping: 20,
              stiffness: 300,
              delay: 0.4
            }}
          >
            <StopCircle className="w-5 h-5" />
            <span className="font-medium">Stop recording</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Fixed Layout Troubleshooting Hints - Always reserves space to prevent UI jumping */}
      <div className="w-full max-w-sm min-h-[60px] flex items-center justify-center">
        {isRecording && showPersistentWarning && (
          <div className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 transition-all duration-300">
            <div className="text-xs text-gray-900 font-medium mb-1 flex items-center space-x-1">
              <div
                className="w-1 h-1 rounded-full transition-colors duration-300"
                style={{backgroundColor: audioStatus.color === 'red' ? '#ef4444' : '#f59e0b'}}
              />
              <span>{audioStatus.message}</span>
            </div>
            <div className="text-xs text-gray-600">
              • Check if microphone is muted<br/>
              • Ensure device is connected<br/>
              • Try speaking louder<br/>
              • Switch microphones if available
            </div>
          </div>
        )}
        {isRecording && !showPersistentWarning && (
          <div className="text-xs text-gray-500 text-center opacity-60">
            Audio monitoring active
          </div>
        )}
      </div>
    </motion.div>
  );
};