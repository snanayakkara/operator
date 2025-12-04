/**
 * AudioScrubber Component
 *
 * Compact waveform-style slider for audio playback with time display.
 * Shows a visual waveform representation of the audio.
 * Only used in Transcription section.
 */

import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Volume2, VolumeX, Play, Pause } from 'lucide-react';

interface AudioScrubberProps {
  /** Audio blob for waveform generation */
  audioBlob?: Blob;
  /** Current time in seconds */
  currentTime?: number;
  /** Total duration in seconds */
  duration?: number;
  /** Is audio playing */
  isPlaying?: boolean;
  /** Is audio muted */
  isMuted?: boolean;
  /** Seek callback */
  onSeek?: (time: number) => void;
  /** Play/pause callback */
  onPlayPause?: () => void;
  /** Mute toggle callback */
  onMuteToggle?: () => void;
  className?: string;
}

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const AudioScrubber: React.FC<AudioScrubberProps> = memo(({
  audioBlob,
  currentTime = 0,
  duration = 0,
  isPlaying = false,
  isMuted = false,
  onSeek,
  onPlayPause,
  onMuteToggle,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const sliderRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate waveform data from audio blob
  useEffect(() => {
    if (!audioBlob) {
      setWaveformData([]);
      return;
    }

    const generateWaveform = async () => {
      try {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const channelData = audioBuffer.getChannelData(0);
        const waveformPoints = 80; // Number of bars in the waveform
        const blockSize = Math.floor(channelData.length / waveformPoints);
        const waveform: number[] = [];
        
        for (let i = 0; i < waveformPoints; i++) {
          let blockSum = 0;
          const start = i * blockSize;
          const end = Math.min(start + blockSize, channelData.length);
          
          for (let j = start; j < end; j++) {
            blockSum += Math.abs(channelData[j]);
          }
          
          waveform.push(blockSum / (end - start));
        }
        
        setWaveformData(waveform);
        await audioContext.close();
      } catch (error) {
        console.error('Waveform generation failed:', error);
        setWaveformData([]);
      }
    };

    generateWaveform();
  }, [audioBlob]);

  // Draw waveform on canvas
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Set canvas size with device pixel ratio for sharp rendering
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    // Calculate progress directly using current props for accurate tracking
    const progressPercent = duration > 0 ? currentTime / duration : 0;

    ctx.clearRect(0, 0, width, height);

    if (waveformData.length === 0) {
      // Draw a simple progress bar if no waveform data
      const barY = height / 2 - 2;
      const barHeight = 4;
      
      // Background track
      ctx.fillStyle = '#e5e7eb';
      ctx.beginPath();
      ctx.roundRect(0, barY, width, barHeight, 2);
      ctx.fill();
      
      // Progress fill
      ctx.fillStyle = '#6b7280';
      ctx.beginPath();
      ctx.roundRect(0, barY, width * progressPercent, barHeight, 2);
      ctx.fill();
      
      return;
    }

    // Draw waveform bars
    const barWidth = width / waveformData.length;
    const gap = 1;
    const maxAmplitude = Math.max(...waveformData);
    const minBarHeight = 3;
    
    waveformData.forEach((amplitude, i) => {
      const normalizedHeight = maxAmplitude > 0 ? amplitude / maxAmplitude : 0;
      const barHeight = Math.max(minBarHeight, normalizedHeight * height * 0.85);
      const x = i * barWidth;
      const y = (height - barHeight) / 2;
      
      // Color based on progress
      const barProgress = (i + 0.5) / waveformData.length;
      if (barProgress <= progressPercent) {
        ctx.fillStyle = isDragging ? '#3b82f6' : '#6b7280'; // Blue when dragging, gray otherwise
      } else {
        ctx.fillStyle = '#d1d5db'; // Light gray for unplayed
      }
      
      // Draw rounded bar
      const actualBarWidth = Math.max(2, barWidth - gap);
      ctx.beginPath();
      ctx.roundRect(x, y, actualBarWidth, barHeight, 1);
      ctx.fill();
    });

    // Draw playhead line
    const playheadX = progressPercent * width;
    ctx.strokeStyle = isDragging ? '#ef4444' : '#4b5563';
    ctx.lineWidth = isDragging ? 2 : 1.5;
    ctx.beginPath();
    ctx.moveTo(playheadX, 2);
    ctx.lineTo(playheadX, height - 2);
    ctx.stroke();
  }, [waveformData, currentTime, duration, isDragging]);

  // Redraw waveform when dependencies change - use requestAnimationFrame for smooth updates
  useEffect(() => {
    // Immediate draw for responsiveness
    drawWaveform();
  }, [drawWaveform]);

  // Animation loop for smooth playhead updates during playback
  useEffect(() => {
    if (!isPlaying) return;
    
    let animationId: number;
    const animate = () => {
      drawWaveform();
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
    
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, drawWaveform]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => drawWaveform();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawWaveform]);

  const calculateTimeFromEvent = (clientX: number): number => {
    if (!sliderRef.current || !duration) return 0;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    return percentage * duration;
  };

  const handleSliderClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration || !onSeek) return;
    const newTime = calculateTimeFromEvent(e.clientX);
    onSeek(newTime);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    handleSliderClick(e);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!duration || !onSeek) return;
      const newTime = calculateTimeFromEvent(e.clientX);
      onSeek(newTime);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, duration, onSeek]);

  // Handle touch events for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    if (e.touches[0] && duration && onSeek) {
      const newTime = calculateTimeFromEvent(e.touches[0].clientX);
      onSeek(newTime);
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (!duration || !onSeek || !e.touches[0]) return;
      e.preventDefault();
      const newTime = calculateTimeFromEvent(e.touches[0].clientX);
      onSeek(newTime);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, duration, onSeek]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Play/Pause button */}
      {onPlayPause && (
        <button
          onClick={onPlayPause}
          className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </button>
      )}

      {/* Time display */}
      <span className="text-xs text-gray-600 tabular-nums w-9 flex-shrink-0">
        {formatTime(currentTime)}
      </span>

      {/* Waveform/Slider area */}
      <div
        ref={sliderRef}
        className="flex-1 h-8 relative select-none"
        style={{ cursor: isDragging ? 'grabbing' : 'pointer' }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        role="slider"
        aria-valuenow={currentTime}
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-label="Audio position"
        tabIndex={0}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: 'block' }}
        />
      </div>

      {/* Duration */}
      <span className="text-xs text-gray-500 tabular-nums w-9 text-right flex-shrink-0">
        {formatTime(duration)}
      </span>

      {/* Mute button */}
      {onMuteToggle && (
        <button
          onClick={onMuteToggle}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <VolumeX className="w-3.5 h-3.5" />
          ) : (
            <Volume2 className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </div>
  );
});

AudioScrubber.displayName = 'AudioScrubber';

export default AudioScrubber;
