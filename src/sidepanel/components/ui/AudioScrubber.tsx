/**
 * AudioScrubber Component
 *
 * Thin slider for audio playback with time display.
 * Only used in Transcription section.
 */

import React, { memo, useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Play, Pause } from 'lucide-react';

interface AudioScrubberProps {
  /** Audio blob or URL */
  audioSrc?: string | Blob;
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
  const sliderRef = useRef<HTMLDivElement>(null);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSliderClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!sliderRef.current || !duration || !onSeek) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    onSeek(Math.max(0, Math.min(duration, newTime)));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleSliderClick(e);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!sliderRef.current || !duration || !onSeek) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      const newTime = percentage * duration;
      onSeek(Math.max(0, Math.min(duration, newTime)));
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

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Play/Pause button */}
      {onPlayPause && (
        <button
          onClick={onPlayPause}
          className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
        </button>
      )}

      {/* Time display */}
      <span className="text-[10px] text-gray-500 tabular-nums w-8">
        {formatTime(currentTime)}
      </span>

      {/* Slider track */}
      <div
        ref={sliderRef}
        className="flex-1 h-1 bg-gray-200 rounded-full cursor-pointer relative group"
        onMouseDown={handleMouseDown}
        role="slider"
        aria-valuenow={currentTime}
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-label="Audio position"
        tabIndex={0}
      >
        {/* Progress fill */}
        <div
          className="absolute left-0 top-0 h-full bg-gray-500 rounded-full transition-all duration-75"
          style={{ width: `${progress}%` }}
        />
        {/* Handle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-gray-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
          style={{ left: `calc(${progress}% - 5px)` }}
        />
      </div>

      {/* Duration */}
      <span className="text-[10px] text-gray-400 tabular-nums w-8 text-right">
        {formatTime(duration)}
      </span>

      {/* Mute button */}
      {onMuteToggle && (
        <button
          onClick={onMuteToggle}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <VolumeX className="w-3 h-3" />
          ) : (
            <Volume2 className="w-3 h-3" />
          )}
        </button>
      )}
    </div>
  );
});

AudioScrubber.displayName = 'AudioScrubber';

export default AudioScrubber;
