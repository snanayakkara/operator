import type { 
  VoiceRecording, 
  TranscriptionResult, 
  TranscriptionSegment 
} from '@/types/medical.types';
import { LMStudioService } from './LMStudioService';

export interface TranscriptionConfig {
  language: string;
  chunkLength: number;
  returnSegments: boolean;
  medicalTerminology: boolean;
}

export class TranscriptionService {
  private static instance: TranscriptionService;
  private lmStudioService: LMStudioService;
  private isInitializing = false;
  private isInitialized = false;
  private config: TranscriptionConfig;
  private medicalTermsCorrections: Map<string, string>;

  private constructor(config?: Partial<TranscriptionConfig>) {
    this.config = {
      language: 'en',
      chunkLength: 30,
      returnSegments: true,
      medicalTerminology: true,
      ...config
    };

    this.lmStudioService = LMStudioService.getInstance();

    this.medicalTermsCorrections = new Map([
      // Cardiology terms
      ['taxi', 'TAVI'],
      ['tavern', 'TAVI'],
      ['taffy', 'TAVI'],
      ['p c i', 'PCI'],
      ['p.c.i.', 'PCI'],
      ['pci', 'PCI'],
      ['angiogram', 'angiogram'],
      ['angio gram', 'angiogram'],
      ['catheterization', 'catheterisation'],
      ['catheter', 'catheter'],
      ['stent', 'stent'],
      ['balloon', 'balloon'],
      
      // Valve terms
      ['mitral', 'mitral'],
      ['aortic', 'aortic'],
      ['tricuspid', 'tricuspid'],
      ['pulmonary', 'pulmonary'],
      ['stenosis', 'stenosis'],
      ['regurgitation', 'regurgitation'],
      ['insufficiency', 'insufficiency'],
      
      // Investigation types
      ['t t e', 'TTE'],
      ['tte', 'TTE'],
      ['stress t t e', 'Stress TTE'],
      ['stress tte', 'Stress TTE'],
      ['c t c a', 'CTCA'],
      ['ctca', 'CTCA'],
      ['ct coronary angiogram', 'CT Coronary Angiogram'],
      ['coronary angiogram', 'Coronary Angiogram'],
      ['heart bug', 'HeartBug'],
      ['ct cow', 'CT COW'],
      ['ct thoracic aorta', 'CT Thoracic Aorta'],
      ['ct calcium score', 'CT Calcium Score'],
      ['c p e t', 'CPET'],
      ['cpet', 'CPET'],
      ['bloods', 'Bloods'],
      
      // Cardiology anatomy
      ['l v', 'LV'],
      ['lv', 'LV'],
      ['r v', 'RV'],
      ['rv', 'RV'],
      ['l a d', 'LAD'],
      ['lad', 'LAD'],
      ['l cx', 'LCx'],
      ['lcx', 'LCx'],
      ['r c a', 'RCA'],
      ['rca', 'RCA'],
      ['o m one', 'OM1'],
      ['om one', 'OM1'],
      ['om1', 'OM1'],
      ['o m two', 'OM2'],
      ['om two', 'OM2'],
      ['om2', 'OM2'],
      ['d one', 'D1'],
      ['d1', 'D1'],
      ['d two', 'D2'],
      ['d2', 'D2'],
      
      // Medical values and measurements
      ['ca score', 'Ca score'],
      ['calcium score', 'Ca score'],
      ['h b', 'Hb'],
      ['hb', 'Hb'],
      ['haemoglobin', 'Hb'],
      ['t chol', 'TChol'],
      ['total cholesterol', 'TChol'],
      ['l d l', 'LDL'],
      ['ldl', 'LDL'],
      ['e g f r', 'eGFR'],
      ['egfr', 'eGFR'],
      ['estimated gfr', 'eGFR'],
      ['hb a one c', 'HbA1c'],
      ['hba1c', 'HbA1c'],
      ['glycated haemoglobin', 'HbA1c'],
      ['r v s p', 'RVSP'],
      ['rvsp', 'RVSP'],
      ['m p g', 'MPG'],
      ['mpg', 'MPG'],
      ['mean pressure gradient', 'MPG'],
      ['mets', 'METs'],
      ['metabolic equivalents', 'METs'],
      
      // Pathology terms
      ['scad', 'SCAD'],
      ['s c a d', 'SCAD'],
      ['spontaneous coronary artery dissection', 'SCAD'],
      ['type one', 'type 1'],
      ['type two', 'type 2'],
      ['type three', 'type 3'],
      
      // Medical measurements
      ['millimeters', 'millimetres'],
      ['millimeter', 'millimetre'],
      ['mm hg', 'mmHg'],
      ['mmhg', 'mmHg'],
      ['b p m', 'bpm'],
      ['bpm', 'bpm'],
      ['ejection fraction', 'ejection fraction'],
      ['e f', 'EF'],
      ['ef', 'EF'],
      
      // Medications
      ['aspirin', 'aspirin'],
      ['clopidogrel', 'clopidogrel'],
      ['warfarin', 'warfarin'],
      ['heparin', 'heparin'],
      ['atorvastatin', 'atorvastatin'],
      ['metoprolol', 'metoprolol'],
      ['lisinopril', 'lisinopril'],
      
      // Common medical words
      ['patient', 'patient'],
      ['procedure', 'procedure'],
      ['diagnosis', 'diagnosis'],
      ['treatment', 'treatment'],
      ['medication', 'medication'],
      ['history', 'history'],
      ['examination', 'examination'],
      ['assessment', 'assessment'],
      ['recommendation', 'recommendation']
    ]);
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

  public async transcribeAudio(recording: VoiceRecording): Promise<TranscriptionResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const startTime = Date.now();
      console.log('🎙️ Transcribing audio with MLX Whisper Large v3 Turbo...');

      // Call MLX Whisper transcription service via LMStudioService
      const rawText = await this.lmStudioService.transcribeAudio(recording.audioData);
      
      // Apply medical terminology corrections if enabled
      const transcriptionText = this.config.medicalTerminology ? 
        this.correctMedicalTerminology(rawText) : rawText;

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

  private correctMedicalTerminology(text: string): string {
    let correctedText = text;

    // Apply medical term corrections
    for (const [incorrect, correct] of this.medicalTermsCorrections) {
      const regex = new RegExp(`\\b${incorrect}\\b`, 'gi');
      correctedText = correctedText.replace(regex, correct);
    }

    // Specific medical formatting corrections
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
    let count = 0;
    const lowerText = text.toLowerCase();
    
    for (const [term] of this.medicalTermsCorrections) {
      if (lowerText.includes(term.toLowerCase())) {
        count++;
      }
    }
    
    return count;
  }

}