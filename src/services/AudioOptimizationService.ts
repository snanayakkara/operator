/**
 * Audio Optimization Service
 * 
 * Optimizes audio for better performance during transcription
 * Reduces file size and improves processing speed
 */

export interface AudioCompressionOptions {
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  format?: 'webm' | 'wav';
}

export interface AudioCompressionResult {
  compressedBlob: Blob;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  processingTime: number;
}

export class AudioOptimizationService {
  private static instance: AudioOptimizationService;

  private constructor() {}

  public static getInstance(): AudioOptimizationService {
    if (!AudioOptimizationService.instance) {
      AudioOptimizationService.instance = new AudioOptimizationService();
    }
    return AudioOptimizationService.instance;
  }

  /**
   * Compress audio blob for faster transcription
   */
  async compressAudio(
    audioBlob: Blob,
    options: AudioCompressionOptions = {}
  ): Promise<AudioCompressionResult> {
    const startTime = Date.now();
    const originalSize = audioBlob.size;

    try {
      // Default compression settings optimized for MLX Whisper
      const {
        bitrate = 64000,      // 64kbps - good balance of quality/size for voice
        sampleRate = 16000,   // 16kHz - sufficient for speech recognition
        channels = 1,         // Mono - reduces size by ~50%
        format = 'webm'
      } = options;

      console.log('🎵 Starting audio compression:', {
        originalSize: Math.round(originalSize / 1024),
        targetBitrate: bitrate,
        targetSampleRate: sampleRate,
        channels
      });

      // Create audio context for processing
      const audioContext = new AudioContext({
        sampleRate: sampleRate
      });

      try {
        // Convert blob to audio buffer
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        console.log('🔊 Original audio properties:', {
          duration: audioBuffer.duration,
          sampleRate: audioBuffer.sampleRate,
          channels: audioBuffer.numberOfChannels,
          length: audioBuffer.length
        });

        // Create offline audio context for compression
        const offlineContext = new OfflineAudioContext(
          channels, // Mono output
          Math.ceil(audioBuffer.duration * sampleRate),
          sampleRate
        );

        // Create buffer source
        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;

        // Apply compression and filtering
        const compressor = offlineContext.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-12, offlineContext.currentTime);
        compressor.knee.setValueAtTime(6, offlineContext.currentTime);
        compressor.ratio.setValueAtTime(8, offlineContext.currentTime);
        compressor.attack.setValueAtTime(0.003, offlineContext.currentTime);
        compressor.release.setValueAtTime(0.1, offlineContext.currentTime);

        // High-pass filter to remove low-frequency noise
        const highpassFilter = offlineContext.createBiquadFilter();
        highpassFilter.type = 'highpass';
        highpassFilter.frequency.setValueAtTime(80, offlineContext.currentTime);

        // Connect audio nodes
        source.connect(highpassFilter);
        highpassFilter.connect(compressor);
        compressor.connect(offlineContext.destination);

        // Start processing
        source.start();

        // Render compressed audio
        const compressedBuffer = await offlineContext.startRendering();

        // Convert back to blob
        const compressedBlob = await this.audioBufferToBlob(
          compressedBuffer, 
          format,
          bitrate
        );

        const processingTime = Date.now() - startTime;
        const compressedSize = compressedBlob.size;
        const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

        console.log('✅ Audio compression completed:', {
          originalSizeKB: Math.round(originalSize / 1024),
          compressedSizeKB: Math.round(compressedSize / 1024),
          compressionRatio: `${compressionRatio.toFixed(1)}%`,
          processingTime: `${processingTime}ms`
        });

        return {
          compressedBlob,
          originalSize,
          compressedSize,
          compressionRatio,
          processingTime
        };

      } finally {
        // Clean up audio context
        await audioContext.close();
      }

    } catch (error) {
      console.warn('⚠️ Audio compression failed, using original blob:', error);
      
      // Return original blob if compression fails
      return {
        compressedBlob: audioBlob,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 0,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Convert AudioBuffer to Blob
   */
  private async audioBufferToBlob(
    buffer: AudioBuffer, 
    format: string = 'webm',
    bitrate: number = 64000
  ): Promise<Blob> {
    // Create MediaRecorder for efficient encoding
    const sampleRate = buffer.sampleRate;
    const channels = buffer.numberOfChannels;
    
    // Convert AudioBuffer to PCM data
    const length = buffer.length;
    const pcmData = new Float32Array(length * channels);
    
    for (let channel = 0; channel < channels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        pcmData[i * channels + channel] = channelData[i];
      }
    }

    // Create WAV blob (simpler fallback)
    if (format === 'wav') {
      return this.createWavBlob(pcmData, sampleRate, channels);
    }

    // For WebM, we need to use MediaRecorder with optimized settings
    return this.createOptimizedWebmBlob(buffer, bitrate);
  }

  /**
   * Create optimized WebM blob using MediaRecorder
   */
  private async createOptimizedWebmBlob(
    buffer: AudioBuffer, 
    bitrate: number
  ): Promise<Blob> {
    // Create audio context and source
    const audioContext = new AudioContext({ sampleRate: buffer.sampleRate });
    const source = audioContext.createBufferSource();
    source.buffer = buffer;

    // Create MediaStreamDestination
    const destination = audioContext.createMediaStreamDestination();
    source.connect(destination);

    // Set up MediaRecorder with optimized options
    const mediaRecorder = new MediaRecorder(destination.stream, {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: bitrate
    });

    return new Promise((resolve, reject) => {
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        audioContext.close();
        resolve(blob);
      };

      mediaRecorder.onerror = (event) => {
        audioContext.close();
        reject(new Error(`MediaRecorder error: ${event}`));
      };

      // Start recording and playback
      mediaRecorder.start();
      source.start();

      // Stop after buffer duration
      setTimeout(() => {
        mediaRecorder.stop();
      }, (buffer.duration * 1000) + 100);
    });
  }

  /**
   * Create WAV blob (fallback method)
   */
  private createWavBlob(
    pcmData: Float32Array, 
    sampleRate: number, 
    channels: number
  ): Blob {
    const length = pcmData.length;
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * 2, true);
    view.setUint16(32, channels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, pcmData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  }

  /**
   * Check if audio compression is beneficial for the given blob
   */
  shouldCompress(audioBlob: Blob): boolean {
    const sizeThresholdMB = 2; // Compress files larger than 2MB
    const sizeMB = audioBlob.size / (1024 * 1024);
    return sizeMB > sizeThresholdMB;
  }

  /**
   * Get compression recommendations based on audio size and duration
   */
  getCompressionRecommendations(audioBlob: Blob, durationSeconds: number): AudioCompressionOptions {
    const sizeMB = audioBlob.size / (1024 * 1024);
    
    if (sizeMB > 10) {
      // Large files - aggressive compression
      return {
        bitrate: 32000,    // 32kbps
        sampleRate: 16000, // 16kHz
        channels: 1,       // Mono
        format: 'webm'
      };
    } else if (sizeMB > 5) {
      // Medium files - balanced compression
      return {
        bitrate: 48000,    // 48kbps
        sampleRate: 16000, // 16kHz
        channels: 1,       // Mono
        format: 'webm'
      };
    } else {
      // Small files - light compression
      return {
        bitrate: 64000,    // 64kbps
        sampleRate: 22050, // 22kHz
        channels: 1,       // Mono
        format: 'webm'
      };
    }
  }
}