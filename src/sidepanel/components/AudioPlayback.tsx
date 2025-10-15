import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Download, RotateCcw, Volume2, ChevronDown, ChevronUp } from 'lucide-react';

interface AudioPlaybackProps {
  audioBlob: Blob;
  fileName?: string;
  className?: string;
  onAnalysisUpdate?: (analysis: AudioAnalysis) => void;
  showQualityBar?: boolean; // Whether to show the quality summary bar inside this component
  defaultExpanded?: boolean; // Whether playback controls are expanded by default
}

interface AudioAnalysis {
  duration: number;
  fileSize: number;
  quality: 'good' | 'fair' | 'poor';
  avgVolume: number;
  silenceDuration: number;
  estimatedSNR: number;
}

export const AudioPlayback: React.FC<AudioPlaybackProps> = ({
  audioBlob,
  fileName = 'investigation-audio',
  className = '',
  onAnalysisUpdate,
  showQualityBar = true,
  defaultExpanded = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [analysis, setAnalysis] = useState<AudioAnalysis | null>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [playbackExpanded, setPlaybackExpanded] = useState(defaultExpanded);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number>();
  const seekTimeoutRef = useRef<number>();

  // Create audio URL when component mounts
  useEffect(() => {
    const url = URL.createObjectURL(audioBlob);
    setAudioUrl(url);
    
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [audioBlob]);

  // Audio analysis function
  const analyzeAudio = useCallback(async () => {
    if (!audioBlob) return;

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const channelData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      const duration = audioBuffer.duration;
      
      // Calculate average volume
      let sum = 0;
      let silenceSamples = 0;
      const silenceThreshold = 0.01;
      
      for (let i = 0; i < channelData.length; i++) {
        const abs = Math.abs(channelData[i]);
        sum += abs;
        if (abs < silenceThreshold) {
          silenceSamples++;
        }
      }
      
      const avgVolume = sum / channelData.length;
      const silenceDuration = (silenceSamples / sampleRate);
      
      // Simple SNR estimation (ratio of signal to estimated noise floor)
      const sortedSamples = [...channelData].map(Math.abs).sort((a, b) => a - b);
      const noiseFloor = sortedSamples[Math.floor(sortedSamples.length * 0.1)];
      const signalLevel = sortedSamples[Math.floor(sortedSamples.length * 0.9)];
      const estimatedSNR = signalLevel > 0 ? 20 * Math.log10(signalLevel / (noiseFloor + 0.001)) : 0;
      
      // Quality assessment
      let quality: 'good' | 'fair' | 'poor' = 'good';
      if (avgVolume < 0.005 || silenceDuration > duration * 0.8 || estimatedSNR < 10) {
        quality = 'poor';
      } else if (avgVolume < 0.02 || silenceDuration > duration * 0.5 || estimatedSNR < 20) {
        quality = 'fair';
      }
      
      // Generate waveform data (downsample for visualization)
      const waveformPoints = 200;
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
      
      const analysisResult: AudioAnalysis = {
        duration,
        fileSize: audioBlob.size,
        quality,
        avgVolume,
        silenceDuration,
        estimatedSNR
      };
      
      setWaveformData(waveform);
      setAnalysis(analysisResult);
      onAnalysisUpdate?.(analysisResult);
      
      await audioContext.close();
    } catch (error) {
      console.error('Audio analysis failed:', error);
    }
  }, [audioBlob, onAnalysisUpdate]);

  // Initialize analysis when audio loads
  useEffect(() => {
    if (audioUrl) {
      analyzeAudio();
    }
  }, [audioUrl, analyzeAudio]);

  // Draw waveform
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData.length || !duration) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const progress = currentTime / duration;

    ctx.clearRect(0, 0, width, height);
    
    // Draw waveform bars
    const barWidth = width / waveformData.length;
    const maxAmplitude = Math.max(...waveformData);
    
    waveformData.forEach((amplitude, i) => {
      const barHeight = Math.max(2, (amplitude / maxAmplitude) * height * 0.8);
      const x = i * barWidth;
      const y = (height - barHeight) / 2;
      
      // Color based on progress with improved contrast
      const barProgress = i / waveformData.length;
      if (barProgress <= progress) {
        ctx.fillStyle = isSeeking ? '#1d4ed8' : '#3b82f6'; // Darker blue when seeking
      } else {
        ctx.fillStyle = '#d1d5db'; // Lighter gray for unplayed
      }
      
      ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
    });
    
    // Draw progress line with enhanced visibility
    const progressX = progress * width;
    ctx.strokeStyle = isSeeking ? '#dc2626' : '#ef4444'; // Darker red when seeking
    ctx.lineWidth = isSeeking ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(progressX, 0);
    ctx.lineTo(progressX, height);
    ctx.stroke();
    
    // Add seeking indicator
    if (isSeeking) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.fillRect(progressX - 2, 0, 4, height);
    }
  }, [waveformData, currentTime, duration, isSeeking]);

  // Update waveform on time changes
  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  // Audio event handlers
  const handleTimeUpdate = () => {
    if (audioRef.current && !isSeeking && !isUserInteracting) {
      const audioCurrentTime = audioRef.current.currentTime;
      // Validate current time before setting
      if (isFinite(audioCurrentTime) && audioCurrentTime >= 0) {
        setCurrentTime(audioCurrentTime);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const audioDuration = audioRef.current.duration;
      // Validate duration before setting
      if (isFinite(audioDuration) && audioDuration > 0) {
        setDuration(audioDuration);
      } else {
        // Duration may be Infinity or NaN while metadata is still loading - this is normal
        // Only set to 0 as fallback, no need to warn
        setDuration(0);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    stopProgressAnimation();
  };

  const handleSeeked = useCallback(() => {
    if (seekTimeoutRef.current) {
      window.clearTimeout(seekTimeoutRef.current);
      seekTimeoutRef.current = undefined;
    }
    setIsSeeking(false);
    // Sync current time with actual audio time after seeking
    if (audioRef.current && isFinite(audioRef.current.currentTime)) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleSeekError = useCallback(() => {
    if (seekTimeoutRef.current) {
      window.clearTimeout(seekTimeoutRef.current);
      seekTimeoutRef.current = undefined;
    }
    setIsSeeking(false);
    // Reset to current audio time on error
    if (audioRef.current && isFinite(audioRef.current.currentTime)) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const startProgressAnimation = useCallback(() => {
    if (!isPlaying || !audioRef.current || isSeeking || isUserInteracting) return;
    
    const updateProgress = () => {
      if (audioRef.current && isPlaying && !isSeeking && !isUserInteracting) {
        setCurrentTime(audioRef.current.currentTime);
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(updateProgress);
  }, [isPlaying, isSeeking, isUserInteracting]);

  const stopProgressAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
  }, []);

  const togglePlayback = useCallback(() => {
    if (!audioRef.current || isSeeking) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      stopProgressAnimation();
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        if (!isUserInteracting && !isSeeking) {
          startProgressAnimation();
        }
      }).catch(error => {
        console.error('Audio playback failed:', error);
        setIsPlaying(false);
      });
    }
  }, [isPlaying, isSeeking, isUserInteracting, startProgressAnimation, stopProgressAnimation]);

  const seekTo = useCallback((percentage: number) => {
    // Validate inputs with detailed logging
    if (!audioRef.current || !duration || !isFinite(duration) || duration <= 0) {
      console.log('❌ seekTo validation failed:', {
        hasAudioRef: !!audioRef.current,
        duration,
        isFiniteDuration: isFinite(duration || 0),
        durationValid: (duration || 0) > 0
      });
      return;
    }
    
    if (!isFinite(percentage) || percentage < 0 || percentage > 100) {
      console.error('❌ Invalid percentage in seekTo:', {
        percentage,
        isFinite: isFinite(percentage),
        inRange: percentage >= 0 && percentage <= 100
      });
      return;
    }
    
    // Don't start new seek if one is already in progress
    if (isSeeking) return;
    
    setIsSeeking(true);
    
    const rawNewTime = (percentage / 100) * duration;
    const newTime = Math.max(0, Math.min(duration, rawNewTime));
    
    // Final validation of calculated time
    if (!isFinite(newTime)) {
      console.error('❌ Calculated newTime is non-finite:', {
        percentage,
        duration,
        rawNewTime,
        newTime
      });
      setIsSeeking(false);
      return;
    }
    
    console.log('🎯 Seeking to:', { 
      percentage: percentage.toFixed(2), 
      newTime: newTime.toFixed(2),
      duration: duration.toFixed(2)
    });
    
    // Clear any existing seek timeout
    if (seekTimeoutRef.current) {
      window.clearTimeout(seekTimeoutRef.current);
      seekTimeoutRef.current = undefined;
    }
    
    // Update current time immediately for visual feedback
    setCurrentTime(newTime);
    
    try {
      // Set audio element time with final validation
      if (isFinite(newTime) && newTime >= 0 && newTime <= duration) {
        audioRef.current.currentTime = newTime;
        
        // Simplified timeout fallback
        seekTimeoutRef.current = window.setTimeout(() => {
          setIsSeeking(false);
          // Sync current time with actual audio time
          if (audioRef.current && isFinite(audioRef.current.currentTime)) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }, 200);
      } else {
        console.error('❌ Final validation failed for currentTime:', { newTime, duration });
        setIsSeeking(false);
      }
      
    } catch (error) {
      console.error('❌ Seek failed:', error);
      setIsSeeking(false);
      if (seekTimeoutRef.current) {
        window.clearTimeout(seekTimeoutRef.current);
        seekTimeoutRef.current = undefined;
      }
    }
  }, [duration, isSeeking]);

  const handleWaveformClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    const canvas = canvasRef.current;
    if (!canvas || !duration || !isFinite(duration) || duration <= 0) {
      console.log('❌ Cannot seek: canvas or duration not available', { 
        canvas: !!canvas, 
        duration,
        isFiniteDuration: isFinite(duration || 0)
      });
      return;
    }

    if (isSeeking) {
      console.log('⏭️ Seek already in progress, ignoring click');
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const rawPercentage = (x / rect.width) * 100;
    const percentage = Math.max(0, Math.min(100, rawPercentage));
    
    // Validate percentage before proceeding
    if (!isFinite(percentage)) {
      console.error('❌ Invalid percentage calculated:', { x, width: rect.width, rawPercentage, percentage });
      return;
    }
    
    console.log('🎯 Waveform clicked:', { 
      x: x.toFixed(2), 
      width: rect.width.toFixed(2), 
      percentage: percentage.toFixed(2) 
    });
    
    try {
      seekTo(percentage);
    } catch (error) {
      console.error('❌ Waveform seek failed:', error);
    }
  }, [duration, isSeeking, seekTo]);

  const resetPlayback = useCallback(() => {
    stopProgressAnimation();
    setIsPlaying(false);
    setIsUserInteracting(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    seekTo(0);
  }, [seekTo, stopProgressAnimation]);

  const downloadAudio = () => {
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTime = (time: number): string => {
    // Handle invalid time values
    if (!isFinite(time) || isNaN(time) || time < 0) {
      return '0:00';
    }
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getQualityColor = (quality: 'good' | 'fair' | 'poor'): string => {
    switch (quality) {
      case 'good': return 'text-green-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getQualityIcon = (quality: 'good' | 'fair' | 'poor'): string => {
    switch (quality) {
      case 'good': return '✅';
      case 'fair': return '⚠️';
      case 'poor': return '❌';
      default: return '❓';
    }
  };

  // Clean up animation frame when playback state changes
  useEffect(() => {
    if (!isPlaying) {
      stopProgressAnimation();
    }
  }, [isPlaying, stopProgressAnimation]);
  
  // Handle seeking state cleanup
  useEffect(() => {
    return () => {
      if (seekTimeoutRef.current) {
        window.clearTimeout(seekTimeoutRef.current);
      }
    };
  }, []);
  
  // Final cleanup on component unmount
  useEffect(() => {
    return () => {
      stopProgressAnimation();
      if (seekTimeoutRef.current) {
        window.clearTimeout(seekTimeoutRef.current);
      }
    };
  }, [stopProgressAnimation]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onSeeked={handleSeeked}
        onError={handleSeekError}
        onRateChange={() => setPlaybackRate(audioRef.current?.playbackRate || 1)}
        preload="metadata"
      />

      {/* Audio Quality Summary Bar - Collapsible (optional, controlled by parent) */}
      {showQualityBar && analysis && (
        <button
          onClick={() => setPlaybackExpanded(!playbackExpanded)}
          className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3 text-sm">
            <span className="text-gray-600">Quality:</span>
            <span className={`font-medium ${getQualityColor(analysis.quality)}`}>
              {getQualityIcon(analysis.quality)} {analysis.quality.toUpperCase()}
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600">Duration:</span>
            <span className="text-gray-900">{formatTime(analysis.duration)}</span>
          </div>
          {playbackExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
      )}

      {/* Expandable Waveform and Playback Controls */}
      {playbackExpanded && analysis && (
        <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          {/* Detailed Metrics */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Quality:</span>
                <span className={`font-medium ${getQualityColor(analysis.quality)}`}>
                  {getQualityIcon(analysis.quality)} {analysis.quality.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="text-gray-900">{formatTime(analysis.duration)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">File Size:</span>
                <span className="text-gray-900">{(analysis.fileSize / 1024).toFixed(1)}KB</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Avg Volume:</span>
                <span className="text-gray-900">{(analysis.avgVolume * 100).toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Silence:</span>
                <span className="text-gray-900">{formatTime(analysis.silenceDuration)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Est. SNR:</span>
                <span className="text-gray-900">{analysis.estimatedSNR.toFixed(1)}dB</span>
              </div>
            </div>
          </div>

          {/* Waveform Display */}
          <div className="space-y-2">
            <canvas
              ref={canvasRef}
              width={400}
              height={80}
              className={`w-full h-20 bg-white rounded border transition-all duration-200 ${
                isSeeking
                  ? 'cursor-grabbing border-blue-400 shadow-md'
                  : 'cursor-pointer hover:bg-gray-50 hover:border-gray-300'
              }`}
              onClick={handleWaveformClick}
              onMouseMove={(e) => {
                const canvas = canvasRef.current;
                if (canvas && duration && isFinite(duration) && duration > 0 && !isSeeking) {
                  const rect = canvas.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
                  const seekTime = (percentage / 100) * duration;
                  canvas.title = `Click to seek to ${formatTime(seekTime)}`;
                } else if (canvas && isSeeking) {
                  canvas.title = 'Seeking...';
                }
              }}
              style={{ touchAction: 'none' }}
            />
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{formatTime(currentTime)}</span>
              <span className={isSeeking ? 'text-blue-600 font-medium' : ''}>
                {isSeeking ? 'Seeking...' : 'Click waveform to seek'}
              </span>
              <span>{formatTime(duration)}</span>
            </div>

            {/* Alternative: Progress/Seek Slider */}
            <div className="space-y-1">
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={duration && isFinite(duration) && duration > 0 ? (currentTime / duration) * 100 : 0}
                onMouseDown={() => {
                  setIsUserInteracting(true);
                  stopProgressAnimation();
                }}
                onMouseUp={() => {
                  setIsUserInteracting(false);
                  if (isPlaying && !isSeeking) {
                    startProgressAnimation();
                  }
                }}
                onTouchStart={() => {
                  setIsUserInteracting(true);
                  stopProgressAnimation();
                }}
                onTouchEnd={() => {
                  setIsUserInteracting(false);
                  if (isPlaying && !isSeeking) {
                    startProgressAnimation();
                  }
                }}
                onInput={(e) => {
                  if (isUserInteracting) {
                    const percentage = parseFloat((e.target as HTMLInputElement).value);
                    if (isFinite(percentage)) {
                      seekTo(percentage);
                    }
                  }
                }}
                onChange={() => {
                  // Prevent onChange feedback loops - all seeking handled by onInput
                }}
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                disabled={!duration || !isFinite(duration) || duration <= 0}
                title="Seek audio position"
              />
              <div className="text-xs text-gray-400 text-center">
                Alternative: Use slider above to seek
              </div>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={togglePlayback}
                className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
                disabled={!audioUrl}
                title={isPlaying ? "Pause audio" : "Play audio"}
                type="button"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
              </button>

              <button
                onClick={resetPlayback}
                className="flex items-center justify-center w-8 h-8 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-full transition-colors"
                disabled={!audioUrl}
                title="Reset to beginning"
                type="button"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4 text-gray-600" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => {
                    const newVolume = parseFloat(e.target.value);
                    setVolume(newVolume);
                    if (audioRef.current) {
                      audioRef.current.volume = newVolume;
                    }
                  }}
                  className="w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  title="Adjust volume"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Playback Speed Control */}
              <select
                value={playbackRate}
                onChange={(e) => {
                  const rate = parseFloat(e.target.value);
                  setPlaybackRate(rate);
                  if (audioRef.current) {
                    audioRef.current.playbackRate = rate;
                  }
                }}
                className="text-xs bg-white border border-gray-300 rounded px-2 py-1"
                title="Playback speed"
              >
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1.0x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2.0x</option>
              </select>

              {/* Download Button - More subtle, inside panel */}
              <button
                onClick={downloadAudio}
                className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 transition-colors"
                title="Download audio file"
                type="button"
              >
                <Download className="w-3 h-3" />
                <span>Save</span>
              </button>
            </div>
          </div>

          {/* Quality Warnings */}
          {analysis.quality !== 'good' && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
              <div className="flex items-start">
                <div className="ml-3">
                  <p className="text-sm text-yellow-700 font-medium">
                    Audio Quality Issues Detected
                  </p>
                  <div className="mt-1 text-xs text-yellow-600 space-y-1">
                    {analysis.avgVolume < 0.005 && <p>• Recording is very quiet - check microphone levels</p>}
                    {analysis.silenceDuration > analysis.duration * 0.5 && <p>• Recording contains significant silence</p>}
                    {analysis.estimatedSNR < 15 && <p>• High background noise detected</p>}
                    {analysis.duration < 2 && <p>• Recording is very short - may affect transcription accuracy</p>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};