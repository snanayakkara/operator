import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Download, RotateCcw, Volume2 } from 'lucide-react';

interface AudioPlaybackProps {
  audioBlob: Blob;
  fileName?: string;
  className?: string;
  onAnalysisUpdate?: (analysis: AudioAnalysis) => void;
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
  onAnalysisUpdate
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [analysis, setAnalysis] = useState<AudioAnalysis | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number>();

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
      const barHeight = (amplitude / maxAmplitude) * height * 0.8;
      const x = i * barWidth;
      const y = (height - barHeight) / 2;
      
      // Color based on progress
      const barProgress = i / waveformData.length;
      ctx.fillStyle = barProgress <= progress ? '#3b82f6' : '#e5e7eb';
      
      ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
    });
    
    // Draw progress line
    const progressX = progress * width;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(progressX, 0);
    ctx.lineTo(progressX, height);
    ctx.stroke();
  }, [waveformData, currentTime, duration]);

  // Update waveform on time changes
  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  // Audio event handlers
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const seekTo = (percentage: number) => {
    if (!audioRef.current || !duration) return;
    
    const newTime = (percentage / 100) * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleWaveformClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    seekTo(percentage);
  };

  const resetPlayback = () => {
    seekTo(0);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

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

  return (
    <div className={`space-y-4 p-4 bg-gray-50 rounded-lg border ${className}`}>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onRateChange={() => setPlaybackRate(audioRef.current?.playbackRate || 1)}
        preload="metadata"
      />

      {/* Audio Analysis Summary */}
      {analysis && (
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
      )}

      {/* Waveform Display */}
      <div className="space-y-2">
        <canvas
          ref={canvasRef}
          width={400}
          height={80}
          className="w-full h-20 bg-white rounded border cursor-pointer"
          onClick={handleWaveformClick}
        />
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{formatTime(currentTime)}</span>
          <span>Click waveform to seek</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={togglePlayback}
            className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
            disabled={!audioUrl}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
          </button>
          
          <button
            onClick={resetPlayback}
            className="flex items-center justify-center w-8 h-8 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-full transition-colors"
            disabled={!audioUrl}
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
            />
          </div>
        </div>

        <div className="flex items-center space-x-3">
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
          >
            <option value={0.5}>0.5x</option>
            <option value={0.75}>0.75x</option>
            <option value={1}>1.0x</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2.0x</option>
          </select>

          {/* Download Button */}
          <button
            onClick={downloadAudio}
            className="flex items-center justify-center w-8 h-8 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
            title="Download audio file"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quality Warnings */}
      {analysis && analysis.quality !== 'good' && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
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
  );
};