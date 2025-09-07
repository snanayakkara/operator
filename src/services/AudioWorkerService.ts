// Service for managing audio processing Web Worker
import type { AudioProcessingMessage, AudioProcessingResponse } from '@/workers/audioProcessor.worker';

export class AudioWorkerService {
  private worker: Worker | null = null;
  private isInitialized = false;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  constructor() {
    this.initializeWorker();
  }

  private initializeWorker() {
    try {
      // Create worker from the TypeScript file (Vite will handle compilation)
      this.worker = new Worker(
        new URL('../workers/audioProcessor.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (event: MessageEvent<AudioProcessingResponse>) => {
        const { type, data } = event.data;
        
        switch (type) {
          case 'VOICE_ACTIVITY':
            this.messageHandlers.get('voiceActivity')?.(data);
            break;
            
          case 'AUDIO_PROCESSED':
            if ((data as any).isInitialized) {
              this.isInitialized = true;
            }
            this.messageHandlers.get('audioProcessed')?.(data);
            break;
            
          case 'ERROR':
            console.error('Audio Worker Error:', data.error);
            this.messageHandlers.get('error')?.(data);
            break;
        }
      };

      this.worker.onerror = (error) => {
        console.error('Audio Worker Error:', error);
        this.messageHandlers.get('error')?.(error);
      };

      // Initialize the worker
      this.postMessage({
        type: 'INIT',
        data: {
          sampleRate: 44100,
          bufferSize: 4096
        }
      });

    } catch (error) {
      console.error('Failed to initialize Audio Worker:', error);
    }
  }

  private postMessage(message: AudioProcessingMessage) {
    if (this.worker) {
      this.worker.postMessage(message);
    }
  }

  // Process audio data for voice activity detection
  processAudioData(audioData: Float32Array) {
    if (!this.worker) {
      console.warn('Audio worker not available');
      return;
    }

    this.postMessage({
      type: 'PROCESS_AUDIO',
      data: { audioData }
    });
  }

  // Register event handlers
  onVoiceActivity(handler: (data: { level: number; frequencyData: number[]; isVoiceDetected: boolean }) => void) {
    this.messageHandlers.set('voiceActivity', handler);
  }

  onError(handler: (error: any) => void) {
    this.messageHandlers.set('error', handler);
  }

  // Clean up worker
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      this.messageHandlers.clear();
    }
  }

  get initialized() {
    return this.isInitialized;
  }
}