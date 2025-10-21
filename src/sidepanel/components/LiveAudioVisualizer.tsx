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

  // Apply Gaussian smoothing for ultra-smooth waveforms (like professional audio software)
  const applySmoothingAndPeakHold = (currentFrame: number[]) => {
    // Initialize arrays if needed
    if (previousFrameRef.current.length !== currentFrame.length) {
      previousFrameRef.current = new Array(currentFrame.length).fill(0);
      peakHoldsRef.current = new Array(currentFrame.length).fill(0);
    }

    // Temporal smoothing (60% previous, 40% current) for balanced smooth + responsive
    const temporalSmoothed = currentFrame.map((value, i) =>
      value * 0.4 + previousFrameRef.current[i] * 0.6
    );

    // Gaussian kernel for spatial smoothing (sigma = 1.0, 7-tap)
    const gaussianKernel = [0.06, 0.09, 0.12, 0.15, 0.12, 0.09, 0.06];
    const radius = Math.floor(gaussianKernel.length / 2);

    const gaussianSmoothed: number[] = [];
    for (let i = 0; i < temporalSmoothed.length; i++) {
      let sum = 0;
      let weightSum = 0;

      for (let j = -radius; j <= radius; j++) {
        const idx = i + j;
        if (idx >= 0 && idx < temporalSmoothed.length) {
          const weight = gaussianKernel[j + radius];
          sum += temporalSmoothed[idx] * weight;
          weightSum += weight;
        }
      }

      gaussianSmoothed.push(sum / weightSum);
    }

    // Update previous frame
    previousFrameRef.current = gaussianSmoothed;

    return { smoothed: gaussianSmoothed, peaks: [] };
  };

  // Interpolate between data points for smoother curves
  const interpolateData = (data: number[], targetLength: number): number[] => {
    if (data.length === 0) return [];
    if (data.length >= targetLength) return data;

    const result: number[] = [];
    const ratio = (data.length - 1) / (targetLength - 1);

    for (let i = 0; i < targetLength; i++) {
      const position = i * ratio;
      const index = Math.floor(position);
      const fraction = position - index;

      if (index >= data.length - 1) {
        result.push(data[data.length - 1]);
      } else {
        // Cubic interpolation for smooth curves
        const p0 = data[Math.max(0, index - 1)];
        const p1 = data[index];
        const p2 = data[index + 1];
        const p3 = data[Math.min(data.length - 1, index + 2)];

        // Catmull-Rom spline interpolation
        const t = fraction;
        const t2 = t * t;
        const t3 = t2 * t;

        const v = 0.5 * (
          (2 * p1) +
          (-p0 + p2) * t +
          (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
          (-p0 + 3 * p1 - 3 * p2 + p3) * t3
        );

        result.push(Math.max(0, Math.min(1, v)));
      }
    }

    return result;
  };

  // Create symmetrical frequency data for center-out visualization
  const createSymmetricalFrequencyData = (data: number[]) => {
    if (data.length === 0) return [];

    // Apply smoothing
    const { smoothed } = applySmoothingAndPeakHold(data);

    // Interpolate to create MANY more points for ultra-smooth curves
    const interpolated = interpolateData(smoothed, 150);

    // Create a mirrored array - center-out pattern
    const mirrored = [...interpolated].reverse();
    return [...mirrored, ...interpolated];
  };

  // Get symmetrical frequency data
  const symmetricalFrequencyData = createSymmetricalFrequencyData(frequencyData);

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
                <svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 600 160"
                  preserveAspectRatio="none"
                  className="w-full h-full"
                >
                  {/* Render smooth waveform */}
                  {(() => {
                    // Convert frequency data to heights with sine envelope (rope effect)
                    const heights = symmetricalFrequencyData.map((freq, i) => {
                      // Apply sine wave envelope to force edges to center (rope physics)
                      const normalizedPos = i / (symmetricalFrequencyData.length - 1); // 0 to 1
                      const sineEnvelope = Math.sin(normalizedPos * Math.PI); // 0 at edges, 1 at center

                      // Scale frequency data and apply envelope
                      const scaled = freq * 100 * sineEnvelope; // Constrained by sine curve
                      return Math.max(2, Math.min(90, scaled)); // Clamp between 2-90%
                    });

                    // Calculate average for color
                    const avgHeight = heights.reduce((sum, h) => sum + h, 0) / heights.length;
                    const color = avgHeight > 50 ? '#3b82f6' : avgHeight > 25 ? '#6366f1' : '#8b5cf6';

                    // Create smooth path using Catmull-Rom splines
                    const createSmoothPath = (heights: number[], isBottom: boolean) => {
                      const centerY = 80;
                      const spacing = 600 / Math.max(1, heights.length - 1);

                      // Generate points
                      const points = heights.map((height, i) => ({
                        x: i * spacing,
                        y: isBottom ? centerY + (height / 2) * 0.8 : centerY - (height / 2) * 0.8
                      }));

                      if (points.length < 2) return `M 0 ${centerY}`;

                      // Start path
                      let path = `M ${points[0].x},${points[0].y}`;

                      // Use Catmull-Rom spline for smooth curves
                      for (let i = 0; i < points.length - 1; i++) {
                        const p0 = points[Math.max(0, i - 1)];
                        const p1 = points[i];
                        const p2 = points[i + 1];
                        const p3 = points[Math.min(points.length - 1, i + 2)];

                        // Calculate control points for cubic Bézier
                        const cp1x = p1.x + (p2.x - p0.x) / 6;
                        const cp1y = p1.y + (p2.y - p0.y) / 6;
                        const cp2x = p2.x - (p3.x - p1.x) / 6;
                        const cp2y = p2.y - (p3.y - p1.y) / 6;

                        path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
                      }

                      return path;
                    };

                    // Generate paths
                    const topPath = createSmoothPath(heights, false);
                    const bottomPath = createSmoothPath(heights, true);

                    return (
                      <>
                        {/* Top waveform */}
                        <motion.path
                          d={topPath}
                          fill="none"
                          stroke={color}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          animate={{ d: topPath }}
                          transition={{ type: "spring", damping: 25, stiffness: 200, mass: 0.08 }}
                        />
                        {/* Bottom waveform */}
                        <motion.path
                          d={bottomPath}
                          fill="none"
                          stroke={color}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          animate={{ d: bottomPath }}
                          transition={{ type: "spring", damping: 25, stiffness: 200, mass: 0.08 }}
                        />
                        {/* Fill for depth */}
                        <motion.path
                          d={`${topPath} L 600,80 L 0,80 Z`}
                          fill={`${color}15`}
                          animate={{ d: `${topPath} L 600,80 L 0,80 Z` }}
                          transition={{ type: "spring", damping: 25, stiffness: 200, mass: 0.08 }}
                        />
                        <motion.path
                          d={`${bottomPath} L 600,80 L 0,80 Z`}
                          fill={`${color}15`}
                          animate={{ d: `${bottomPath} L 600,80 L 0,80 Z` }}
                          transition={{ type: "spring", damping: 25, stiffness: 200, mass: 0.08 }}
                        />
                      </>
                    );
                  })()}
                </svg>
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