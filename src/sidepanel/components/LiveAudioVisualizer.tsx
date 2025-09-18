import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StopCircle, Mic, MicOff } from 'lucide-react';
import { 
  recordingVariants,
  voiceActivityVariants,
  cardVariants,
  withReducedMotion,
  ANIMATION_DURATIONS
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

  // Debug logging for frequency data
  React.useEffect(() => {
    if (isRecording && frequencyData.length > 0 && Math.random() < 0.1) {
      const maxFreq = Math.max(...frequencyData);
      const avgFreq = frequencyData.reduce((sum, f) => sum + f, 0) / frequencyData.length;
      console.log('📊 LiveAudioVisualizer Debug:', {
        originalFreqData: frequencyData.length,
        symmetricalLength: symmetricalFrequencyData.length,
        maxOriginal: maxFreq.toFixed(3),
        avgOriginal: avgFreq.toFixed(3),
        voiceLevel: Math.round(voiceActivityLevel * 100) + '%',
        firstFew: frequencyData.slice(0, 3).map(f => f.toFixed(3))
      });
    }
  }, [isRecording, frequencyData, symmetricalFrequencyData, voiceActivityLevel]);

  return (
    <motion.div 
      className={`flex-1 flex flex-col items-center justify-center p-4 space-y-4 ${className}`}
      variants={withReducedMotion(cardVariants)}
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
            <div className="h-40 bg-gray-100 rounded-3xl border border-gray-200 flex items-center justify-center px-6 overflow-hidden shadow-sm">
              {symmetricalFrequencyData.length > 0 ? (
                <div className="flex items-end justify-center gap-0.5 h-full w-full px-2">
                  {symmetricalFrequencyData.map((freq, index) => {
                    // Calculate distance from center for animation delay
                    const centerIndex = Math.floor(symmetricalFrequencyData.length / 2);
                    const distanceFromCenter = Math.abs(index - centerIndex);

                    // Enhanced scaling for better visibility - amplify small values significantly
                    const amplifiedFreq = Math.pow(freq * 3, 0.6); // Amplify by 3x then apply curve
                    const barHeight = Math.max(amplifiedFreq * 90, 8); // Minimum 8px, max 90% of container

                    // Color based on frequency intensity with lower thresholds
                    const getBarColor = (intensity: number) => {
                      if (intensity > 0.3) return '#10b981'; // emerald-500 - lower threshold
                      if (intensity > 0.2) return '#059669'; // emerald-600 - lower threshold
                      if (intensity > 0.15) return '#3b82f6'; // blue-500 - lower threshold
                      if (intensity > 0.1) return '#6366f1'; // indigo-500 - lower threshold
                      if (intensity > 0.05) return '#f59e0b'; // amber-500 - lower threshold
                      if (intensity > 0.02) return '#9ca3af'; // gray-400 - much lower threshold
                      return '#d1d5db'; // gray-300
                    };

                    // Debug logging for first few bars
                    if (index < 5 && Math.random() < 0.1) {
                      console.log(`Bar ${index}: freq=${freq.toFixed(3)}, amplified=${amplifiedFreq.toFixed(3)}, height=${barHeight}px`);
                    }

                    return (
                      <motion.div
                        key={index}
                        className="flex-1 min-w-[2px] max-w-[4px] rounded-full"
                        style={{
                          backgroundColor: getBarColor(amplifiedFreq),
                          height: `${Math.min(barHeight, 95)}%`,
                          minHeight: '8px'
                        }}
                        initial={{ height: '8px' }}
                        animate={{
                          height: `${Math.min(barHeight, 95)}%`,
                        }}
                        transition={{
                          type: "spring",
                          damping: 20,
                          stiffness: 400,
                          mass: 0.2,
                          delay: distanceFromCenter * 0.003
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