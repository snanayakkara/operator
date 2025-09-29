// Web Worker for audio processing to prevent main thread blocking
// This worker handles voice activity detection and audio analysis

interface AudioProcessingMessage {
  type: 'PROCESS_AUDIO' | 'ANALYZE_VOICE_ACTIVITY' | 'INIT';
  data: {
    audioData?: Float32Array;
    sampleRate?: number;
    bufferSize?: number;
  };
}

interface AudioProcessingResponse {
  type: 'VOICE_ACTIVITY' | 'AUDIO_PROCESSED' | 'ERROR';
  data: {
    level?: number;
    frequencyData?: number[];
    isVoiceDetected?: boolean;
    error?: string;
  };
}

const _audioContext: AudioContext | null = null;
const _analyser: AnalyserNode | null = null;
const _dataArray: Uint8Array | null = null;

// Initialize audio processing in worker
function initializeAudioProcessing(sampleRate: number, bufferSize: number) {
  try {
    // Note: AudioContext is not available in Web Worker
    // We'll use mathematical analysis instead
    console.log('Initializing audio processing worker', { sampleRate, bufferSize });
    
    self.postMessage({
      type: 'AUDIO_PROCESSED',
      data: { isInitialized: true }
    } as AudioProcessingResponse);
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    } as AudioProcessingResponse);
  }
}

// Process audio data for voice activity detection
function processAudioData(audioData: Float32Array) {
  try {
    // Calculate RMS (Root Mean Square) for volume level
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    const rms = Math.sqrt(sum / audioData.length);
    const level = Math.min(1, rms * 10); // Normalize and amplify
    
    // Simple voice activity detection based on amplitude and frequency characteristics
    const isVoiceDetected = level > 0.01; // Threshold for voice detection
    
    // Generate frequency data simulation (in real implementation, use FFT)
    const frequencyData = new Array(64).fill(0).map((_, i) => {
      const frequency = (i / 64) * 1000; // 0-1000 Hz range
      const amplitude = level * Math.exp(-frequency / 300); // Voice-like frequency response
      return Math.floor(amplitude * 255);
    });
    
    self.postMessage({
      type: 'VOICE_ACTIVITY',
      data: {
        level,
        frequencyData,
        isVoiceDetected
      }
    } as AudioProcessingResponse);
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      data: { error: error instanceof Error ? error.message : 'Processing error' }
    } as AudioProcessingResponse);
  }
}

// Main message handler
self.onmessage = (event: MessageEvent<AudioProcessingMessage>) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'INIT':
      if (data.sampleRate && data.bufferSize) {
        initializeAudioProcessing(data.sampleRate, data.bufferSize);
      }
      break;
      
    case 'PROCESS_AUDIO':
      if (data.audioData) {
        processAudioData(data.audioData);
      }
      break;
      
    case 'ANALYZE_VOICE_ACTIVITY':
      if (data.audioData) {
        processAudioData(data.audioData);
      }
      break;
      
    default:
      self.postMessage({
        type: 'ERROR',
        data: { error: `Unknown message type: ${type}` }
      } as AudioProcessingResponse);
  }
};

// Export types for TypeScript support
export type { AudioProcessingMessage, AudioProcessingResponse };