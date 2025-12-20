/**
 * TTSService.ts
 *
 * Text-to-Speech service for Key Facts Proof Mode.
 * Calls MLX-Audio TTS endpoint on whisper-server.py (port 8001).
 * Handles audio synthesis, playback, and lifecycle management.
 */

const WHISPER_SERVER_URL = 'http://localhost:8001';
const TTS_ENDPOINT = `${WHISPER_SERVER_URL}/v1/audio/synthesis`;

export interface TTSSynthesisOptions {
  text: string;
  speed?: number; // 0.5 - 2.0, default 1.0
}

export interface TTSHealthStatus {
  ttsEnabled: boolean;
  model?: string;
  status: 'loaded' | 'not_loaded' | 'error';
}

/**
 * TTSService handles text-to-speech synthesis and playback
 * for the Key Facts Proof Mode feature.
 */
class TTSService {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private isPlaying: boolean = false;

  /**
   * Check if TTS is available on the whisper server
   */
  async checkTTSAvailability(): Promise<TTSHealthStatus> {
    try {
      const response = await fetch(`${WHISPER_SERVER_URL}/v1/health`);
      if (!response.ok) {
        return { ttsEnabled: false, status: 'error' };
      }

      const health = await response.json();
      return {
        ttsEnabled: health.features?.tts_enabled || false,
        model: health.tts_model || undefined,
        status: health.tts_status || 'not_loaded'
      };
    } catch (error) {
      console.error('[TTSService] Health check failed:', error);
      return { ttsEnabled: false, status: 'error' };
    }
  }

  /**
   * Synthesize speech from text using MLX-Audio
   * Returns WAV audio blob
   */
  async synthesize(options: TTSSynthesisOptions): Promise<Blob> {
    const { text, speed = 1.0 } = options;

    // Validate speed range
    const clampedSpeed = Math.max(0.5, Math.min(2.0, speed));

    console.log(`[TTSService] Synthesizing: "${text.substring(0, 50)}..." (speed: ${clampedSpeed}x)`);

    try {
      const response = await fetch(TTS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          speed: clampedSpeed
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `TTS synthesis failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      console.log(`[TTSService] Synthesis complete: ${audioBlob.size} bytes`);
      return audioBlob;

    } catch (error) {
      console.error('[TTSService] Synthesis error:', error);
      throw error;
    }
  }

  /**
   * Play audio from a WAV blob
   * Uses Web Audio API for precise control
   */
  async play(audioBlob: Blob, onEnded?: () => void): Promise<void> {
    // Stop any currently playing audio
    this.stop();

    try {
      // Initialize AudioContext if needed
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      // Resume AudioContext if suspended (browser autoplay policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Convert blob to ArrayBuffer
      const arrayBuffer = await audioBlob.arrayBuffer();

      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      // Create source node
      this.currentSource = this.audioContext.createBufferSource();
      this.currentSource.buffer = audioBuffer;
      this.currentSource.connect(this.audioContext.destination);

      // Set up ended callback
      this.currentSource.onended = () => {
        this.isPlaying = false;
        this.currentSource = null;
        console.log('[TTSService] Playback ended');
        if (onEnded) onEnded();
      };

      // Start playback
      this.currentSource.start(0);
      this.isPlaying = true;
      console.log('[TTSService] Playback started');

    } catch (error) {
      console.error('[TTSService] Playback error:', error);
      this.isPlaying = false;
      this.currentSource = null;
      throw error;
    }
  }

  /**
   * Stop currently playing audio
   */
  stop(): void {
    if (this.currentSource && this.isPlaying) {
      try {
        this.currentSource.stop();
      } catch (error) {
        // Source may already be stopped
        console.warn('[TTSService] Stop warning:', error);
      }
      this.currentSource = null;
      this.isPlaying = false;
      console.log('[TTSService] Playback stopped');
    }
  }

  /**
   * Get current playback state
   */
  getPlaybackState(): { isPlaying: boolean } {
    return { isPlaying: this.isPlaying };
  }

  /**
   * Cleanup resources
   * Call this when component unmounts
   */
  dispose(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    console.log('[TTSService] Disposed');
  }

  /**
   * Convenience method: synthesize and play in one call
   */
  async synthesizeAndPlay(
    options: TTSSynthesisOptions,
    onEnded?: () => void
  ): Promise<void> {
    const audioBlob = await this.synthesize(options);
    await this.play(audioBlob, onEnded);
  }
}

// Export singleton instance
export const ttsService = new TTSService();
export default ttsService;
