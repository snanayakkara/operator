import type { 
  VoiceRecording, 
  TranscriptionResult, 
  TranscriptionSegment 
} from '@/types/medical.types';
import { LMStudioService } from './LMStudioService';
import { ASRCorrectionEngine } from '@/utils/asr/ASRCorrectionEngine';

export interface TranscriptionConfig {
  language: string;
  chunkLength: number;
  returnSegments: boolean;
  medicalTerminology: boolean;
}

export class TranscriptionService {
  private static instance: TranscriptionService;
  private lmStudioService: LMStudioService;
  private asrEngine: ASRCorrectionEngine;
  private isInitializing = false;
  private isInitialized = false;
  private config: TranscriptionConfig;

  private constructor(config?: Partial<TranscriptionConfig>) {
    this.config = {
      language: 'en',
      chunkLength: 30,
      returnSegments: true,
      medicalTerminology: true,
      ...config
    };

    this.lmStudioService = LMStudioService.getInstance();
    this.asrEngine = ASRCorrectionEngine.getInstance();
  }

  public static getInstance(config?: Partial<TranscriptionConfig>): TranscriptionService {
    if (!TranscriptionService.instance) {
      TranscriptionService.instance = new TranscriptionService(config);
    }
    return TranscriptionService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized || this.isInitializing) {
      return;
    }

    this.isInitializing = true;

    try {
      console.log('🎙️ Initializing transcription service with MLX Whisper...');
      
      // Check if MLX Whisper transcription service is working
      const transcriptionStatus = await this.lmStudioService.checkTranscriptionService();
      if (!transcriptionStatus.available) {
        console.warn('⚠️ MLX Whisper server not available:', transcriptionStatus.error);
        console.warn('💡 Common fixes:');
        console.warn('   1. Start server: ./start-whisper-server.sh');
        console.warn('   2. Or manually: source venv-whisper/bin/activate && python whisper-server.py');
        console.warn('   3. Check server logs for errors');
        console.warn('   4. Verify port 8001 is not in use: lsof -i :8001');
        console.warn('🔄 Transcription will use fallback mode with placeholder text');
      } else {
        console.log('✅ MLX Whisper server is available and ready');
        console.log(`🤖 Model: ${transcriptionStatus.model || 'whisper-large-v3-turbo'}`);
      }

      this.isInitialized = true;
      console.log(`✅ Transcription service initialized with MLX Whisper${transcriptionStatus.available ? '' : ' (fallback mode)'}`);

    } catch (error) {
      console.error('❌ MLX Whisper transcription service initialization failed:', error);
      throw new Error(`MLX Whisper initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.isInitializing = false;
    }
  }

  public async transcribeAudio(recording: VoiceRecording, agentType?: string): Promise<TranscriptionResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const startTime = Date.now();
      console.log('🎙️ Transcribing audio with MLX Whisper Large v3 Turbo...');

      // Call MLX Whisper transcription service via LMStudioService
      const rawText = await this.lmStudioService.transcribeAudio(recording.audioData, undefined, agentType);
      
      // Apply medical terminology corrections if enabled
      const transcriptionText = this.config.medicalTerminology ? 
        await this.correctMedicalTerminology(rawText) : rawText;

      const processingTime = Date.now() - startTime;

      // Create segments from the full transcription
      const segments: TranscriptionSegment[] = this.config.returnSegments ? 
        this.createSegmentsFromText(transcriptionText, recording.duration) : [];

      const result: TranscriptionResult = {
        id: `transcription-${Date.now()}`,
        text: transcriptionText,
        confidence: this.estimateConfidence(transcriptionText),
        segments,
        language: this.config.language,
        processingTime
      };

      console.log(`✅ MLX Whisper transcription completed in ${processingTime}ms`);
      console.log(`📝 Text length: ${result.text.length} chars, Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`🔤 Preview: ${result.text.substring(0, 100)}${result.text.length > 100 ? '...' : ''}`);
      return result;

    } catch (error) {
      console.error('❌ MLX Whisper transcription processing failed:', error);
      throw new Error(`MLX Whisper transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


  public updateConfig(newConfig: Partial<TranscriptionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  private createSegmentsFromText(text: string, duration: number): TranscriptionSegment[] {
    // Simple segmentation - split by sentences and distribute evenly across duration
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const segmentDuration = duration / sentences.length;
    
    return sentences.map((sentence, index) => ({
      start: index * segmentDuration,
      end: (index + 1) * segmentDuration,
      text: sentence.trim(),
      confidence: this.estimateConfidence(sentence.trim()),
      speaker: 'Speaker 1'
    }));
  }

  private estimateConfidence(text: string): number {
    // Estimate confidence based on text characteristics
    let confidence = 0.8; // Base confidence

    if (text && text.length > 0) {
      // Longer transcriptions tend to be more reliable
      const lengthFactor = Math.min(text.length / 100, 1);
      confidence += lengthFactor * 0.1;

      // Check for medical terms (higher confidence if medical terms detected)
      const medicalTermsCount = this.countMedicalTerms(text);
      if (medicalTermsCount > 0) {
        confidence += Math.min(medicalTermsCount * 0.02, 0.1);
      }
    }

    return Math.min(confidence, 1.0);
  }

  private async correctMedicalTerminology(text: string): Promise<string> {
    // Apply enhanced ASR corrections using consolidated engine
    let correctedText = await this.asrEngine.applyCorrections(text, {
      categories: 'all',
      enableDynamic: true,
      australianTerms: true
    });
    
    // Apply additional medical formatting corrections
    correctedText = this.applyMedicalFormatting(correctedText);
    
    return correctedText;
  }

  private applyMedicalFormatting(text: string): string {
    let formatted = text;

    // Fix common medical abbreviations
    formatted = formatted.replace(/\b(\d+)\s*mm\s*hg\b/gi, '$1mmHg');
    formatted = formatted.replace(/\b(\d+)\s*b\s*p\s*m\b/gi, '$1bpm');
    formatted = formatted.replace(/\be\s*f\s*(\d+)%?\b/gi, 'EF $1%');
    
    // Fix medication dosages
    formatted = formatted.replace(/\b(\d+)\s*mg\b/gi, '$1mg');
    formatted = formatted.replace(/\b(\d+)\s*mcg\b/gi, '$1mcg');
    formatted = formatted.replace(/\b(\d+)\s*ml\b/gi, '$1ml');
    
    // Fix medical measurements
    formatted = formatted.replace(/\b(\d+)\s*mm\b/gi, '$1mm');
    formatted = formatted.replace(/\b(\d+)\s*cm\b/gi, '$1cm');
    formatted = formatted.replace(/\b(\d+\.?\d*)\s*x\s*(\d+\.?\d*)\s*mm\b/gi, '$1 x $2mm');
    
    // Capitalise proper medical terms
    formatted = formatted.replace(/\btavi\b/gi, 'TAVI');
    formatted = formatted.replace(/\bpci\b/gi, 'PCI');
    formatted = formatted.replace(/\bef\b/gi, 'EF');
    
    return formatted;
  }


  private countMedicalTerms(text: string): number {
    // Use ASRCorrectionEngine's patterns to count medical terms
    const patterns = this.asrEngine.getCombinedPatterns('all');
    let count = 0;
    const _lowerText = text.toLowerCase();
    
    // Count occurrences of medical pattern source terms
    patterns.forEach(([pattern, _replacement]) => {
      try {
        if (pattern instanceof RegExp) {
          const matches = text.match(pattern);
          if (matches) {
            count += matches.length;
          }
        }
      } catch (error) {
        // Skip patterns that cause regex errors
      }
    });
    
    return count;
  }

}