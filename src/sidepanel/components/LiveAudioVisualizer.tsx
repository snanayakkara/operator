import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StopCircle, Mic, MicOff } from 'lucide-react';
import {
  recordingVariants as _recordingVariants,
  voiceActivityVariants as _voiceActivityVariants,
  cardVariants as _cardVariants,
  withReducedMotion,
  ANIMATION_DURATIONS as _ANIMATION_DURATIONS
} from '@/utils/animations';

const VISUALIZER_THEME = {
  accentPrimary: '#22d3ee',
  accentSecondary: '#a855f7',
  accentGlow: 'rgba(34, 211, 238, 0.45)'
} as const;

const STATUS_STYLES = {
  idle: { dot: 'bg-slate-300', text: 'text-slate-600' },
  initializing: { dot: 'bg-sky-400', text: 'text-sky-600' },
  active: { dot: 'bg-cyan-500', text: 'text-cyan-600' },
  low: { dot: 'bg-amber-400', text: 'text-amber-600' },
  silent: { dot: 'bg-rose-500', text: 'text-rose-600' }
} as const;

type AudioStatusKey = keyof typeof STATUS_STYLES;

const getStatusTheme = (status: string) => {
  if ((status as AudioStatusKey) in STATUS_STYLES) {
    return STATUS_STYLES[status as AudioStatusKey];
  }

  return STATUS_STYLES.idle;
};

const WARNING_HINTS = [
  'Check mute switch',
  'Confirm connection',
  'Raise your voice slightly',
  'Try another microphone'
] as const;

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return null;

  const bigint = parseInt(normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
};

const mixHexColors = (a: string, b: string, amount: number) => {
  const colorA = hexToRgb(a);
  const colorB = hexToRgb(b);

  if (!colorA || !colorB) return a;

  const clampAmount = Math.min(Math.max(amount, 0), 1);
  const r = Math.round(colorA.r + (colorB.r - colorA.r) * clampAmount);
  const g = Math.round(colorA.g + (colorB.g - colorA.g) * clampAmount);
  const bChannel = Math.round(colorA.b + (colorB.b - colorA.b) * clampAmount);

  return `rgb(${r}, ${g}, ${bChannel})`;
};

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
  const gradientId = React.useId();
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
  const getImmediateAudioStatus = React.useCallback(() => {
    if (!isRecording) return { status: 'idle', color: 'gray', message: 'Not recording' };
    if (audioLevelHistory.length < 5) return { status: 'initializing', color: 'blue', message: 'Initializing...' };
    if (hasRecentActivity) return { status: 'active', color: 'green', message: 'Audio detected' };
    if (voiceActivityLevel > 0.01) return { status: 'low', color: 'yellow', message: 'Low audio' };
    return { status: 'silent', color: 'red', message: 'No audio detected' };
  }, [audioLevelHistory.length, hasRecentActivity, isRecording, voiceActivityLevel]);

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
  }, [getImmediateAudioStatus, audioLevelHistory.length]);

  const audioStatus = debouncedAudioStatus;
  const statusTheme = React.useMemo(() => getStatusTheme(audioStatus.status), [audioStatus.status]);

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

    // Light temporal smoothing (75% current, 25% previous) for responsive feel
    const temporalSmoothed = currentFrame.map((value, i) =>
      value * 0.75 + previousFrameRef.current[i] * 0.25
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
      className={`relative flex-1 w-full max-w-xl overflow-hidden rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_25px_80px_-50px_rgba(15,23,42,0.45)] ${className}`}
      variants={withReducedMotion(_cardVariants)}
      initial="hidden"
      animate="visible"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-200/25 via-transparent to-purple-200/20" />
        <div className="absolute -top-24 right-[-120px] h-72 w-72 rounded-full bg-cyan-300/35 blur-3xl" />
        <div className="absolute bottom-[-120px] left-[-100px] h-72 w-72 rounded-full bg-purple-300/30 blur-3xl" />
      </div>

      {/* Status cluster */}
      <motion.div
        className="relative flex flex-col items-center gap-6 text-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', damping: 20, stiffness: 300 }}
      >
        <motion.h3
          className="text-lg font-semibold tracking-tight text-slate-900"
          animate={{ color: isRecording ? VISUALIZER_THEME.accentPrimary : '#0f172a' }}
          transition={{ duration: 0.4 }}
        >
          {isRecording ? 'Recording in progress' : 'Ready to record'}
        </motion.h3>

        <motion.div
          layout
          className="flex flex-wrap items-center justify-center gap-2"
        >
          <motion.div
            layout
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600 shadow-[0_18px_35px_-24px_rgba(15,23,42,0.4)]"
            animate={{
              borderColor: audioStatus.status === 'active' ? 'rgba(14,165,233,0.45)' : 'rgba(226,232,240,1)',
              backgroundColor: audioStatus.status === 'active' ? 'rgba(224,242,254,0.95)' : 'rgba(248,250,252,0.95)'
            }}
            transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <motion.span
              className={`h-2.5 w-2.5 rounded-full shadow-[0_0_0px_rgba(148,163,184,0.35)] ${statusTheme.dot}`}
              animate={{
                scale: audioStatus.status === 'active' ? [1, 1.35, 1] : 1,
                boxShadow: audioStatus.status === 'active'
                  ? `0 0 14px ${VISUALIZER_THEME.accentGlow}`
                  : '0 0 6px rgba(148,163,184,0.25)'
              }}
              transition={{
                duration: 1.8,
                repeat: audioStatus.status === 'active' ? Infinity : 0,
                ease: 'easeInOut'
              }}
            />
            <motion.span
              className={`text-sm font-medium ${statusTheme.text}`}
              animate={{ opacity: 1 }}
            >
              {audioStatus.message}
            </motion.span>
          </motion.div>

          <AnimatePresence initial={false}>
            {activeDeviceInfo && (
              <motion.div
                key="device-chip"
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ type: 'spring', damping: 20, stiffness: 320 }}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.35)]"
              >
                <div className="icon-compact">
                  {activeDeviceInfo.isWorking ? (
                    <Mic className="h-3.5 w-3.5 text-slate-500" />
                  ) : (
                    <MicOff className="h-3.5 w-3.5 text-rose-500" />
                  )}
                </div>
                <span className="max-w-[200px] truncate">
                  {activeDeviceInfo.label}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {isRecording && (
              <motion.div
                key="recording-timer"
                layout
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 font-mono text-sm font-semibold text-slate-800 shadow-[0_22px_45px_-28px_rgba(14,165,233,0.45)]"
                initial={{ opacity: 0, scale: 0.82, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: -12 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
                {formatTime(recordingTime)}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Enhanced Audio Spectrum Visualization - Now Primary Display */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            className="relative mt-8 w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 22, stiffness: 320, delay: 0.12 }}
          >
            <motion.div
              className="mb-5 text-center text-xs uppercase tracking-[0.35em] text-slate-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.4 }}
            >
              Live Spectrum
            </motion.div>
            <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-[24px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 px-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_35px_90px_-70px_rgba(14,165,233,0.45)]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_65%)]" />
              {symmetricalFrequencyData.length > 0 ? (
                <svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 600 160"
                  preserveAspectRatio="none"
                  className="relative z-[1] h-full w-full"
                >
                  <defs>
                    <linearGradient id={`${gradientId}-stroke`} x1="0%" x2="100%" y1="0%" y2="0%">
                      <stop offset="0%" stopColor={VISUALIZER_THEME.accentSecondary} />
                      <stop offset="100%" stopColor={VISUALIZER_THEME.accentPrimary} />
                    </linearGradient>
                    <linearGradient id={`${gradientId}-fill`} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={VISUALIZER_THEME.accentPrimary} stopOpacity="0.45" />
                      <stop offset="100%" stopColor={VISUALIZER_THEME.accentSecondary} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Render smooth waveform */}
                  {(() => {
                    // Calculate overall audio activity
                    const avgFreq = symmetricalFrequencyData.reduce((sum, f) => sum + f, 0) / symmetricalFrequencyData.length;
                    const isActive = avgFreq > 0.05; // Threshold for "active" audio

                    // Convert frequency data to heights with sine envelope (rope effect)
                    const heights = symmetricalFrequencyData.map((freq, i) => {
                      if (!isActive) return 0; // Completely flat when no audio

                      // Apply sine wave envelope to force edges to center (rope physics)
                      const normalizedPos = i / (symmetricalFrequencyData.length - 1); // 0 to 1
                      const sineEnvelope = Math.sin(normalizedPos * Math.PI); // 0 at edges, 1 at center

                      // Scale frequency data and apply envelope
                      const scaled = freq * 120 * sineEnvelope;
                      return Math.max(3, Math.min(100, scaled));
                    });

                    // Calculate average for color
                    const avgHeight = heights.reduce((sum, h) => sum + h, 0) / heights.length;
                    const dynamicStroke = mixHexColors(VISUALIZER_THEME.accentSecondary, VISUALIZER_THEME.accentPrimary, Math.min(1, avgHeight / 70));
                    const glowStrength = Math.min(1, avgHeight / 80);
                    const fillOpacity = 0.18 + glowStrength * 0.22;

                    // Create smooth path using Catmull-Rom splines
                    const createSmoothPath = (heights: number[], isBottom: boolean) => {
                      const centerY = 80;

                      // Guard against empty or invalid arrays
                      if (!heights || heights.length === 0) {
                        return `M 0,${centerY} L 600,${centerY}`;
                      }

                      const spacing = 600 / Math.max(1, heights.length - 1);

                      // Generate points
                      const points = heights.map((height, i) => ({
                        x: i * spacing,
                        y: isBottom ? centerY + (height / 2) * 0.8 : centerY - (height / 2) * 0.8
                      }));

                      if (points.length < 2) {
                        return `M 0,${centerY} L 600,${centerY}`;
                      }

                      // Start path - ensure coordinates are valid numbers
                      const startX = isFinite(points[0].x) ? points[0].x : 0;
                      const startY = isFinite(points[0].y) ? points[0].y : centerY;
                      let path = `M ${startX},${startY}`;

                      // Use Catmull-Rom spline for smooth curves
                      for (let i = 0; i < points.length - 1; i++) {
                        const p0 = points[Math.max(0, i - 1)];
                        const p1 = points[i];
                        const p2 = points[i + 1];
                        const p3 = points[Math.min(points.length - 1, i + 2)];

                        // Calculate control points for cubic Bézier with safety checks
                        const cp1x = isFinite(p1.x + (p2.x - p0.x) / 6) ? p1.x + (p2.x - p0.x) / 6 : p1.x;
                        const cp1y = isFinite(p1.y + (p2.y - p0.y) / 6) ? p1.y + (p2.y - p0.y) / 6 : p1.y;
                        const cp2x = isFinite(p2.x - (p3.x - p1.x) / 6) ? p2.x - (p3.x - p1.x) / 6 : p2.x;
                        const cp2y = isFinite(p2.y - (p3.y - p1.y) / 6) ? p2.y - (p3.y - p1.y) / 6 : p2.y;

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
                          stroke={dynamicStroke}
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          animate={{ d: topPath }}
                          transition={{ duration: 0.35, ease: 'easeOut' }}
                          style={{ filter: `drop-shadow(0 0 ${20 * glowStrength + 6}px rgba(34, 211, 238, ${0.45 + glowStrength * 0.25}))` }}
                        />
                        {/* Bottom waveform */}
                        <motion.path
                          d={bottomPath}
                          fill="none"
                          stroke={dynamicStroke}
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          animate={{ d: bottomPath }}
                          transition={{ duration: 0.35, ease: 'easeOut' }}
                          style={{ filter: `drop-shadow(0 0 ${16 * glowStrength + 4}px rgba(168, 85, 247, ${0.4 + glowStrength * 0.2}))` }}
                        />
                        {/* Fill for depth */}
                        <motion.path
                          d={`${topPath} L 600,80 L 0,80 Z`}
                          fill={`url(#${gradientId}-fill)`}
                          fillOpacity={fillOpacity}
                          animate={{ d: `${topPath} L 600,80 L 0,80 Z` }}
                          transition={{ duration: 0.35, ease: 'easeOut' }}
                        />
                        <motion.path
                          d={`${bottomPath} L 600,80 L 0,80 Z`}
                          fill={`url(#${gradientId}-fill)`}
                          fillOpacity={fillOpacity}
                          animate={{ d: `${bottomPath} L 600,80 L 0,80 Z` }}
                          transition={{ duration: 0.35, ease: 'easeOut' }}
                        />
                      </>
                    );
                  })()}
                </svg>
              ) : (
                <div className="relative z-[1] flex flex-col items-center gap-4 text-slate-500">
                  <div className="relative flex h-16 w-16 items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-cyan-400/15 blur-xl" />
                    <motion.div
                      className="absolute inset-0 rounded-full border border-cyan-300/30"
                      animate={{ scale: [1, 1.18, 1], opacity: [0.55, 0.1, 0.55] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-full border border-cyan-200/25"
                      animate={{ scale: [1, 1.35, 1], opacity: [0.35, 0, 0.35] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                    />
                    <div className="icon-compact relative z-[1] flex items-center justify-center rounded-full border border-white/10 bg-white/10 p-3 text-slate-100">
                      <Mic className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-slate-700">Waiting for audio</div>
                    <div className="mt-1 text-xs text-slate-500/80">Speak into your microphone to wake the spectrum</div>
                  </div>
                </div>
              )}
            </div>
            
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stop Recording Button with enhanced animations */}
      <AnimatePresence>
        {isRecording && (
          <motion.button
            onClick={onStop}
            className="relative mx-auto mt-9 flex items-center gap-3 rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-400 px-7 py-3 text-sm font-semibold text-white shadow-[0_35px_80px_-35px_rgba(14,165,233,0.85)]"
            initial={{ opacity: 0, scale: 0.88, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: -18 }}
            whileHover={{
              scale: 1.04,
              translateY: -4,
              boxShadow: '0 28px 60px -32px rgba(14,165,233,0.85)'
            }}
            whileTap={{ scale: 0.96 }}
            transition={{
              type: 'spring',
              damping: 20,
              stiffness: 320,
              delay: 0.4
            }}
          >
            <div className="flex items-center justify-center rounded-full bg-white/15 p-2 text-white">
              <StopCircle className="h-5 w-5" />
            </div>
            <span>Stop recording</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Fixed Layout Troubleshooting Hints - Always reserves space to prevent UI jumping */}
      <div className="relative mt-8 w-full">
        <AnimatePresence mode="wait">
          {isRecording && showPersistentWarning && (
            <motion.div
              key="warning"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="relative w-full overflow-hidden rounded-[20px] border border-rose-200 bg-rose-50 p-4 shadow-[0_30px_80px_-70px_rgba(244,63,94,0.6)]"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(244,63,94,0.12),_transparent_65%)]" />
              <div className="relative z-[1] flex flex-col gap-3">
                <div className="flex items-start gap-3 text-rose-700">
                  <div className="icon-compact mt-1 flex items-center justify-center rounded-full border border-rose-200 bg-rose-100 p-2 text-rose-600">
                    <MicOff className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold tracking-tight">{audioStatus.message}</div>
                    <div className="mt-1 text-xs text-rose-600/80">We’re not hearing anything from this mic right now.</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] text-rose-600/80">
                  {WARNING_HINTS.map(hint => (
                    <span
                      key={hint}
                      className="rounded-full border border-rose-200 bg-white/80 px-3 py-1"
                    >
                      {hint}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
