import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react';
import { useAudioDevices } from '@/hooks/useAudioDevices';
import { IconButton } from './buttons/Button';

interface AudioPlaybackComponentProps {
  audioBlob: Blob;
  isTranscribing?: boolean;
  onPlaybackError?: (error: string) => void;
  className?: string;
}

interface AudioStats {
  duration: number;
  fileSize: number;
  mimeType: string;
  isValid: boolean;
}

export const AudioPlaybackComponent: React.FC<AudioPlaybackComponentProps> = ({
  audioBlob,
  isTranscribing = false,
  onPlaybackError,
  className = ""
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [audioStats, setAudioStats] = useState<AudioStats | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { selectedSpeakerId, getCurrentSpeakerLabel } = useAudioDevices();

  // Create audio URL and analyze blob
  useEffect(() => {
    if (!audioBlob) return;

    const url = URL.createObjectURL(audioBlob);
    setAudioUrl(url);

    // Analyze audio blob
    const stats: AudioStats = {
      duration: 0, // Will be set when audio loads
      fileSize: audioBlob.size,
      mimeType: audioBlob.type,
      isValid: audioBlob.size > 1000 // Basic validation - audio should be at least 1KB
    };

    setAudioStats(stats);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [audioBlob]);

  // Set up audio element and event listeners
  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    // Set output device if supported
    if ('setSinkId' in audio && selectedSpeakerId && selectedSpeakerId !== 'default') {
      (audio as any).setSinkId(selectedSpeakerId)
        .then(() => {
          console.log('🔊 Audio output set to:', getCurrentSpeakerLabel());
        })
        .catch((error: Error) => {
          console.warn('⚠️ Failed to set audio output device:', error);
          onPlaybackError?.(`Failed to use selected speaker: ${error.message}`);
        });
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setLoadError(null);
      
      // Update audio stats with actual duration
      setAudioStats(prev => prev ? {
        ...prev,
        duration: audio.duration,
        isValid: audio.duration > 0.1 // At least 0.1 seconds
      } : null);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = (event: Event) => {
      const error = (event.target as HTMLAudioElement)?.error;
      const errorMsg = error ? `Audio load error (${error.code}): ${error.message}` : 'Failed to load audio';
      setLoadError(errorMsg);
      onPlaybackError?.(errorMsg);
      console.error('🔊 Audio playback error:', error);
    };

    const handleCanPlay = () => {
      console.log('🔊 Audio ready for playback:', {
        duration: audio.duration,
        fileSize: audioBlob.size,
        mimeType: audioBlob.type
      });
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    // Load audio
    audio.load();

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.pause();
    };
  }, [audioUrl, selectedSpeakerId, audioBlob.size, audioBlob.type, getCurrentSpeakerLabel, onPlaybackError]);

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current || loadError) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((error) => {
          console.error('🔊 Playback failed:', error);
          onPlaybackError?.(error.message);
        });
    }
  }, [isPlaying, loadError, onPlaybackError]);

  const handleSeek = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current || !duration) return;

    const newTime = (parseFloat(event.target.value) / 100) * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  const handleVolumeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.target.value) / 100;
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  }, []);

  const handleMuteToggle = useCallback(() => {
    if (!audioRef.current) return;

    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const handleRestart = useCallback(() => {
    if (!audioRef.current) return;
    
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getValidationStatus = (): { status: 'valid' | 'warning' | 'error', message: string } => {
    if (loadError) {
      return { status: 'error', message: 'Audio file cannot be played' };
    }
    
    if (!audioStats) {
      return { status: 'warning', message: 'Analyzing audio...' };
    }

    if (!audioStats.isValid) {
      return { status: 'warning', message: 'Audio may be too short or corrupted' };
    }

    if (audioStats.duration < 1) {
      return { status: 'warning', message: 'Very short recording (< 1 second)' };
    }

    return { status: 'valid', message: 'Audio ready for transcription' };
  };

  const validationStatus = getValidationStatus();

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-gray-700">
            {isTranscribing ? 'Transcribing Audio...' : 'Audio Recorded'}
          </span>
        </div>
        
        {/* Validation Status */}
        <div className="flex items-center space-x-1 text-xs">
          {validationStatus.status === 'valid' && (
            <CheckCircle className="w-4 h-4 text-green-500" />
          )}
          {validationStatus.status === 'warning' && (
            <AlertCircle className="w-4 h-4 text-yellow-500" />
          )}
          {validationStatus.status === 'error' && (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
          <span className={`
            ${validationStatus.status === 'valid' ? 'text-green-600' : ''}
            ${validationStatus.status === 'warning' ? 'text-yellow-600' : ''}
            ${validationStatus.status === 'error' ? 'text-red-600' : ''}
          `}>
            {validationStatus.message}
          </span>
        </div>
      </div>

      {/* Audio Stats */}
      {audioStats && (
        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <span>Size: {formatFileSize(audioStats.fileSize)}</span>
          <span>Duration: {audioStats.duration > 0 ? formatTime(audioStats.duration) : 'Loading...'}</span>
          <span>Format: {audioStats.mimeType.split(';')[0].split('/')[1].toUpperCase()}</span>
        </div>
      )}

      {/* Playback Controls */}
      <div className="space-y-3">
        {/* Main Controls */}
        <div className="flex items-center space-x-3">
          <IconButton
            onClick={handlePlayPause}
            disabled={!audioStats?.isValid || loadError !== null}
            icon={isPlaying ? <Pause /> : <Play className="ml-0.5" />}
            variant="primary"
            size="lg"
            className="rounded-full"
            title={isPlaying ? 'Pause' : 'Play'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          />

          <IconButton
            onClick={handleRestart}
            disabled={!audioStats?.isValid || loadError !== null}
            icon={<RotateCcw />}
            variant="ghost"
            size="md"
            title="Restart"
            aria-label="Restart"
          />

          {/* Time Display */}
          <div className="flex-1 text-center">
            <div className="text-sm font-mono text-gray-600">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          {/* Volume Controls */}
          <div className="flex items-center space-x-2">
            <IconButton
              onClick={handleMuteToggle}
              icon={isMuted || volume === 0 ? <VolumeX /> : <Volume2 />}
              variant="ghost"
              size="sm"
              title={isMuted ? 'Unmute' : 'Mute'}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            />
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume * 100}
              onChange={handleVolumeChange}
              className="w-16 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              title="Volume"
            />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full">
          <input
            type="range"
            min="0"
            max="100"
            value={duration > 0 ? (currentTime / duration) * 100 : 0}
            onChange={handleSeek}
            disabled={!audioStats?.isValid || loadError !== null}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Seek"
          />
        </div>

        {/* Output Device Info */}
        {selectedSpeakerId && (
          <div className="text-xs text-gray-500 text-center">
            Playing via: {getCurrentSpeakerLabel()}
          </div>
        )}

        {/* Error Display */}
        {loadError && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded border">
            {loadError}
          </div>
        )}
      </div>
    </div>
  );
};