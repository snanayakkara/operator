import type {
  LMStudioRequest,
  LMStudioResponse,
  ChatMessage,
  ChatMessageContentBlock,
  ModelStatus,
  MedicalContext
} from '@/types/medical.types';
import { WhisperServerService } from './WhisperServerService';
import { AudioOptimizationService } from './AudioOptimizationService';
import { DSPyService } from './DSPyService';
import { ASRCorrectionEngine } from '@/utils/asr/ASRCorrectionEngine';
import { logger } from '@/utils/Logger';
import { GemmaPromptFormatter } from '@/utils/GemmaPromptFormatter';
import { StreamingParser } from '@/utils/StreamingParser';
import { ModelLoadingError } from '@/types/errors.types';

/**
 * Centralized Model Configuration
 * 
 * Change these model names to easily switch between different models in LMStudio:
 * - REASONING_MODEL: Used for complex medical analysis (TAVI, PCI, AI Review, etc.)
 * - QUICK_MODEL: Used for simple formatting tasks (investigation-summary, quick-letter, etc.)
 * - OCR_MODEL: Vision/OCR defaults (Qwen3-VL 8B Instruct for BP diary extraction)
 */
export const MODEL_CONFIG = {
  REASONING_MODEL: 'medgemma-27b-text-it-mlx',
  QUICK_MODEL: 'qwen/qwen3-4b-2507',
  OCR_MODEL: 'qwen3-vl-8b-instruct-mlx'
} as const;

export interface LMStudioConfig {
  baseUrl: string;
  processorModel: string;
  transcriptionModel: string;
  transcriptionUrl?: string; // Optional separate transcription service URL
  timeout: number;
  retryAttempts: number;
  /**
   * Agent-specific model overrides for optimized performance
   * 
   * Different medical tasks require different model capabilities:
   * - Complex medical reports (TAVI, PCI, etc.): Use REASONING_MODEL for detailed analysis
   * - Simple formatting tasks (investigation-summary): Use QUICK_MODEL for speed
   * - AI medical review: Use REASONING_MODEL for comprehensive clinical analysis
   * 
   * This directly impacts processing times:
   * - REASONING_MODEL: 3-15+ minutes for complex tasks
   * - QUICK_MODEL: 10-30 seconds for simple formatting
   */
  agentModels?: Record<string, string>;
  
  /**
   * Agent-specific token limits for different complexity levels
   * 
   * Token requirements vary by medical task:
   * - AI Medical Review: 8000+ tokens for comprehensive clinical analysis
   * - Complex procedures (TAVI, PCI): 6000+ tokens for detailed reports
   * - Simple formatting: 2000-4000 tokens sufficient
   */
  agentTokenLimits?: Record<string, number>;
  
  /**
   * Agent-specific timeout overrides for different processing requirements
   * 
   * Timeout requirements vary by complexity:
   * - AI Medical Review: 10 minutes (600000ms) for comprehensive analysis
   * - Complex procedures: 8 minutes (480000ms) for detailed processing
   * - Simple tasks: 2 minutes (120000ms) for quick formatting
   */
  agentTimeouts?: Record<string, number>;
}

export class LMStudioService {
  private static instance: LMStudioService;
  private static readonly QWEN_MODEL_PATTERN = /qwen/i;
  private static readonly QUICK_AGENT_TYPES = new Set<string>([
    'investigation-summary',
    'medication',
    'background',
    'bloods'
  ]);
  private config: LMStudioConfig;
  private modelStatus: ModelStatus;
  private retryDelays = [1000, 2000, 4000]; // Exponential backoff
  private whisperServerService: WhisperServerService;

  private constructor(config?: Partial<LMStudioConfig>) {
    this.config = {
      baseUrl: 'http://localhost:1234',
      processorModel: MODEL_CONFIG.REASONING_MODEL,
      transcriptionModel: 'whisper-large-v3-turbo',
      transcriptionUrl: 'http://localhost:8001', // Separate MLX Whisper server
      timeout: 300000, // 5 minutes for local LLM medical report generation
      retryAttempts: 3,
      agentModels: {
        // OPTIMIZED MODELS FOR SPECIFIC TASKS:

        // Fast formatting tasks - Use lightweight model for 3-8s processing
        'investigation-summary': MODEL_CONFIG.QUICK_MODEL, // Simple investigation result formatting
        'medication': MODEL_CONFIG.QUICK_MODEL, // Simple medication list formatting
        'background': MODEL_CONFIG.QUICK_MODEL, // Simple medical background/history formatting with ↪ arrows
        'bloods': MODEL_CONFIG.QUICK_MODEL, // Simple pathology/blood test ordering formatting
        'pre-op-plan': MODEL_CONFIG.REASONING_MODEL, // Structured pre-operative planning card generation

        // Vision tasks - Use dedicated OCR/vision-capable model
        'bp-diary-extraction': MODEL_CONFIG.OCR_MODEL, // BP diary image OCR/extraction via Qwen3-VL
        'bp-diary-insights': MODEL_CONFIG.REASONING_MODEL, // Stage 2 clinical reasoning for BP diary

        // All workflow buttons use default REASONING_MODEL for comprehensive medical analysis:
        // - 'quick-letter': Uses REASONING_MODEL for proper medical dictation processing
        // - 'ai-medical-review': Uses REASONING_MODEL (3-4min processing)
        // - 'tavi', 'angiogram-pci', 'mteer': Use REASONING_MODEL (8-15min processing)
        // - 'consultation': Uses REASONING_MODEL (30s-4min processing)

        // This configuration ensures optimal speed for simple tasks while maintaining
        // medical accuracy for complex clinical analysis and detailed procedure reports
      },
      
      agentTokenLimits: {
        // AI Medical Review requires extensive output for comprehensive clinical analysis
        'ai-medical-review': 10000, // Increased to 10k tokens to prevent truncation

        // Complex procedure agents need detailed reports
        'tavi': 8000,
        'tavi-workup': 6000,
        'angiogram-pci': 8000,
        'mteer': 7000,
        'pfo-closure': 7000,
        'right-heart-cath': 7000,

        // Standard agents
        'consultation': 6000,
        'quick-letter': 5000,
        'pre-op-plan': 5000,

        // Simple formatting tasks
        'investigation-summary': 2000,
        'medication': 3000, // Medication lists can be longer than investigation summaries

        // Vision tasks
        'bp-diary-extraction': 4000, // Increased to 4k tokens to handle large BP diaries (30+ readings)
        'bp-diary-insights': 5000, // MedGemma 27B reasoning output with clinician + patient paragraphs

        // Default for unlisted agents
        'default': 4000
      },
      
      agentTimeouts: {
        // AI Medical Review needs extended time for comprehensive analysis
        'ai-medical-review': 600000, // 10 minutes

        // Complex procedure agents need extended processing time
        'tavi': 480000,              // 8 minutes
        'tavi-workup': 360000,
        'angiogram-pci': 480000,     // 8 minutes
        'mteer': 420000,             // 7 minutes
        'pfo-closure': 360000,       // 6 minutes
        'right-heart-cath': 360000,  // 6 minutes

        // Standard agents
        'consultation': 240000,      // 4 minutes
        'quick-letter': 180000,      // 3 minutes
        'pre-op-plan': 240000,       // 4 minutes for structured planning output

        // Simple formatting tasks
        'investigation-summary': 60000, // 1 minute
        'medication': 90000, // 1.5 minutes (medication lists can be complex)

        // Vision tasks - may take longer due to image processing
        'bp-diary-extraction': 120000, // 2 minutes for vision processing
        'bp-diary-insights': 180000, // 3 minutes for reasoning stage

        // Default for unlisted agents
        'default': 300000           // 5 minutes (existing default)
      },
      ...config
    };

    this.modelStatus = {
      isConnected: false,
      classifierModel: '', // No longer used
      processorModel: this.config.processorModel,
      lastPing: 0,
      latency: 0
    };

    this.whisperServerService = WhisperServerService.getInstance();
    this.startHealthCheck();
  }

  private normalizeMessageContent(content?: ChatMessage['content']): string {
    if (!content) {
      return '';
    }

    if (typeof content === 'string') {
      return content;
    }

    return content
      .map(part => {
        if (part.type === 'text') {
          return part.text;
        }
        return `[image:${part.image_url.url}]`;
      })
      .join('\n');
  }

  public static getInstance(config?: Partial<LMStudioConfig>): LMStudioService {
    if (!LMStudioService.instance) {
      LMStudioService.instance = new LMStudioService(config);
    }
    return LMStudioService.instance;
  }

  /**
   * Default OCR/vision model for handwriting/table extraction tasks.
   */
  public getDefaultOCRModel(): string {
    return MODEL_CONFIG.OCR_MODEL;
  }

  /**
   * Default clinical reasoning model for text-only analysis tasks.
   */
  public getDefaultClinicalReasoningModel(): string {
    return this.config.processorModel || MODEL_CONFIG.REASONING_MODEL;
  }


  public async transcribeAudio(
    audioBlob: Blob,
    signal?: AbortSignal,
    agentType?: string,
    onProgress?: (progress: number, details?: string) => void
  ): Promise<string> {
    const startTime = Date.now();
    
    logger.info('LMStudioService.transcribeAudio() called', {
      component: 'lm-studio',
      operation: 'transcribe-start',
      blobSize: audioBlob.size,
      blobType: audioBlob.type,
      transcriptionUrl: this.config.transcriptionUrl,
      model: this.config.transcriptionModel
    });
    
    try {
      // Progress callback helper
      const reportProgress = (progress: number, details?: string) => {
        if (onProgress) {
          onProgress(progress, details);
        }
      };

      // Estimate processing time based on audio duration for progress calculation
      const audioDurationMs = audioBlob.size / 16; // Rough estimate: 16 bytes per ms of audio
      const estimatedTranscriptionTime = Math.min(Math.max(audioDurationMs / 50, 3000), 120000); // 50x realtime, min 3s, max 2min

      reportProgress(5, 'Checking MLX Whisper server status');

      // Ensure Whisper server is running before attempting transcription
      const serverStatus = await this.whisperServerService.ensureServerRunning();
      if (!serverStatus.running) {
        logger.warn('MLX Whisper server is not running', {
          component: 'lm-studio',
          operation: 'transcribe-whisper-check',
          instructions: ['./start-whisper-server.sh', 'source venv-whisper/bin/activate && python whisper-server.py']
        });

        return `[MLX Whisper server not running. ${serverStatus.error || 'Please start the server manually.'}]`;
      }

      reportProgress(10, 'MLX Whisper server ready');

      // Audio optimization for better performance
      reportProgress(15, 'Optimizing audio for transcription');
      let processedAudioBlob = audioBlob;
      const audioOptimizer = AudioOptimizationService.getInstance();

      // Check if compression would be beneficial
      if (audioOptimizer.shouldCompress(audioBlob)) {
        reportProgress(20, 'Compressing audio for better performance');
        logger.info('Compressing audio for better transcription performance', {
          component: 'lm-studio',
          operation: 'audio-compression-start'
        });
        try {
          const compressionResult = await audioOptimizer.compressAudio(audioBlob);
          processedAudioBlob = compressionResult.compressedBlob;
          
          reportProgress(25, `Audio compressed: ${Math.round(compressionResult.compressedSize / 1024)}KB`);
          logger.info('Audio compression completed', {
            component: 'lm-studio',
            operation: 'audio-compression-success',
            originalSize: Math.round(compressionResult.originalSize / 1024) + 'KB',
            compressedSize: Math.round(compressionResult.compressedSize / 1024) + 'KB',
            compressionRatio: compressionResult.compressionRatio.toFixed(1) + '%',
            processingTime: compressionResult.processingTime + 'ms'
          });
        } catch (compressionError) {
          logger.warn('Audio compression failed, using original audio', {
            component: 'lm-studio',
            operation: 'audio-compression-error',
            error: compressionError instanceof Error ? compressionError.message : String(compressionError)
          });
          // Continue with original audio blob
        }
      } else {
        logger.info('Audio file is small enough, skipping compression', {
          component: 'lm-studio',
          operation: 'audio-compression-skip',
          size: audioBlob.size
        });
      }
      // Get glossary terms for Whisper prompt seeding
      reportProgress(30, 'Loading medical glossary terms');
      let glossaryPrompt = '';
      try {
        const asrEngine = ASRCorrectionEngine.getInstance();
        const glossaryTerms = await asrEngine.getGlossaryTerms(30); // Limit to 30 terms to stay within token limit
        if (glossaryTerms.length > 0) {
          glossaryPrompt = glossaryTerms.join(', ');
          logger.info('Using medical glossary prompt', {
            component: 'lm-studio',
            operation: 'glossary-load',
            promptPreview: glossaryPrompt.substring(0, 100) + '...'
          });
        }
      } catch (error) {
        logger.warn('Failed to load glossary terms for Whisper prompt', {
          component: 'lm-studio',
          operation: 'glossary-load-error',
          error: error instanceof Error ? error.message : String(error)
        });
      }
      
      // First, try the OpenAI-compatible transcription endpoint
      // eslint-disable-next-line no-undef
      const formData = new FormData();
      formData.append('file', processedAudioBlob, 'audio.webm');
      formData.append('model', this.config.transcriptionModel);
      formData.append('response_format', 'text');
      
      // Add medical glossary as prompt if available
      if (glossaryPrompt) {
        formData.append('prompt', glossaryPrompt);
      }

      // Use separate transcription URL if configured, otherwise use base LMStudio URL
      const transcriptionUrl = this.config.transcriptionUrl || this.config.baseUrl;
      
      // Use optimized bloods endpoint for bloods agent (faster processing, no VAD)
      const endpoint = agentType === 'bloods' ? '/v1/audio/transcriptions/bloods' : '/v1/audio/transcriptions';
      const fullUrl = `${transcriptionUrl}${endpoint}`;
      
      if (agentType === 'bloods') {
        console.log('🩸 Using optimized bloods transcription endpoint (no VAD, fast parameters)');
      }
      
      console.log('🌐 Sending transcription request:', {
        url: fullUrl,
        formDataEntries: Array.from(formData.entries()).map(([key, value]) => [
          key, 
          value instanceof File ? `File(${value.name}, ${value.size} bytes)` : value
        ]),
        timeout: this.config.timeout
      });
      
      reportProgress(35, 'Sending audio to MLX Whisper for transcription');

      // Combine user signal with timeout signal for robust cancellation
      const timeoutSignal = AbortSignal.timeout(this.config.timeout);
      const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

      // Start progress simulation for long transcriptions
      const progressSimulation = this.startTranscriptionProgressSimulation(
        estimatedTranscriptionTime,
        35, // starting progress
        85, // ending progress
        reportProgress
      );

      try {
        const response = await fetch(fullUrl, {
          method: 'POST',
          body: formData,
          signal: combinedSignal
        });

        // Clear progress simulation
        clearInterval(progressSimulation);
        reportProgress(90, 'Processing transcription response');
      
      console.log('📡 Transcription response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        ok: response.ok,
        url: response.url
      });

      if (response.ok) {
        const text = await response.text();
        const processingTime = Date.now() - startTime;
        reportProgress(100, `Transcription complete (${processingTime}ms)`);
        
        console.log('✅ Transcription successful:', {
          responseLength: text.length,
          processingTime: processingTime + 'ms',
          responsePreview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          fullResponse: text // Log full response to help debug
        });
        
        // Check for suspicious responses
        if (text.trim().toLowerCase() === 'thank you') {
          console.warn('🚨 SUSPICIOUS TRANSCRIPTION: Got "thank you" response');
          console.warn('📊 Audio blob details:', {
            size: audioBlob.size,
            type: audioBlob.type
          });
          console.warn('💡 This typically indicates:');
          console.warn('   - Audio too short or quiet');
          console.warn('   - Server processing issue');
          console.warn('   - Model defaulting to common phrase');
        }
        
        // Update model status on success
        this.modelStatus.isConnected = true;
        this.modelStatus.lastPing = Date.now();
        this.modelStatus.latency = processingTime;

        return text.trim();
      } else {
        // Log the error but don't throw yet - try fallback
        console.warn(`Transcription endpoint returned ${response.status}: ${response.statusText}`);
        
        // Check if this is the MLX Whisper server
        if (this.config.transcriptionUrl && this.config.transcriptionUrl.includes('8001')) {
          const errorText = await response.text().catch(() => 'Unknown error');
          const placeholderText = `[MLX Whisper server unavailable (HTTP ${response.status}). To resolve: 1) Run './start-whisper-server.sh' or 2) Check server logs for errors. The audio was recorded successfully and can be reprocessed once the server is running.]`;
          
          console.error('❌ MLX Whisper server error:', response.status, errorText);
          console.warn('💡 To fix this:');
          console.warn('   1. Check server status: curl http://localhost:8001/v1/health');
          console.warn('   2. Start server: ./start-whisper-server.sh');
          console.warn('   3. Or manually: source venv-whisper/bin/activate && python whisper-server.py');
          console.warn('   4. Check that port 8001 is available');
          
          return placeholderText;
        } else {
          // Generic transcription service error
          const placeholderText = '[Audio transcription unavailable. Set up MLX Whisper server by running "./start-whisper-server.sh" or configure an alternative transcription service. Your audio recording is saved and ready for processing.]';
          
          console.warn('⚠️ Transcription service not available. Returning placeholder text.');
          console.warn('💡 To fix this:');
          console.warn('   1. Set up MLX Whisper server (recommended)');
          console.warn('   2. Use OpenAI Whisper API');
          console.warn('   3. Configure alternative transcription provider');
          
          return placeholderText;
        }
      }

      } catch (fetchError) {
        // Clear progress simulation on fetch error
        clearInterval(progressSimulation);
        throw fetchError;
      }

    } catch (error) {
      this.modelStatus.isConnected = false;
      
      // Check if this is a timeout error
      if (error instanceof Error && error.name === 'TimeoutError') {
        const timeoutMessage = `[MLX Whisper server timeout after ${this.config.timeout/1000}s. First-time model loading can take 2-5 minutes. Your audio is saved - try reprocessing after the server finishes loading.]`;
        
        console.error('❌ MLX Whisper timeout:', error.message);
        console.warn('💡 This is normal for the first transcription. The model is loading...');
        console.warn('   - Subsequent transcriptions should be much faster');
        console.warn('   - You can check server logs for progress');
        console.warn('   - Server status: curl http://localhost:8001/v1/health');
        
        return timeoutMessage;
      }
      
      // Provide helpful error message for other errors
      const errorMessage = `[Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}. Check if MLX Whisper server is running with './start-whisper-server.sh'. Audio is saved for later processing.]`;
      
      console.error('❌ Transcription error:', error);
      console.warn('💡 To fix this:');
      console.warn('   1. Check if MLX Whisper server is running: curl http://localhost:8001/v1/health');
      console.warn('   2. Start server: source venv-whisper/bin/activate && python whisper-server.py');
      console.warn('   3. Check server logs for errors');
      
      return errorMessage;
    }
  }

  /**
   * Process with vision-enabled agent that can accept both text and images
   * Uses OpenAI-compatible vision API format (system + user text + inline image block).
   * Pass an explicit model name to override agent-specific or global defaults.
   */
  public async processWithVisionAgent(
    systemPrompt: string,
    textPrompt: string,
    imageDataUrl: string,
    agentType?: string,
    signal?: AbortSignal,
    modelOverride?: string
  ): Promise<string> {
    const startTime = Date.now();

    logger.info('Processing with vision agent', {
      component: 'lm-studio',
      operation: 'vision-agent-start',
      agentType,
      imageSize: imageDataUrl.length,
      modelOverride: modelOverride || 'none'
    });

    // Determine which model to use: override > agent-specific > default
    const modelToUse = modelOverride
      || (agentType && this.config.agentModels?.[agentType])
      || this.config.processorModel;

    // Determine agent-specific token limit
    const tokenLimit = (agentType && this.config.agentTokenLimits?.[agentType])
      ? this.config.agentTokenLimits[agentType]
      : this.config.agentTokenLimits?.['default'] || 4000;

    console.log(`🤖 Using vision model: ${modelToUse} for agent: ${agentType || 'default'}`);
    console.log(`🎯 Token limit: ${tokenLimit} tokens for optimal response length`);

    // Analyze image data URL for diagnostics
    const imagePrefix = imageDataUrl.substring(0, 50);
    const imageSizeKB = (imageDataUrl.length / 1024).toFixed(2);
    const imageSizeMB = (imageDataUrl.length / (1024 * 1024)).toFixed(2);
    const imageType = imageDataUrl.substring(5, imageDataUrl.indexOf(';'));
    const isBase64 = imageDataUrl.includes(';base64,');

    console.log('📊 VISION DIAGNOSTICS:');
    console.log(`   Image Type: ${imageType}`);
    console.log(`   Image Size: ${imageSizeKB} KB (${imageSizeMB} MB)`);
    console.log(`   Base64 Encoded: ${isBase64 ? 'Yes' : 'No'}`);
    console.log(`   Image Prefix: ${imagePrefix}...`);
    console.log(`   System Prompt Length: ${systemPrompt.length} chars`);
    console.log(`   Text Prompt Length: ${textPrompt.length} chars`);

    // Build OpenAI-compatible vision request
    // Format: https://platform.openai.com/docs/guides/vision
    const request: LMStudioRequest = {
      model: modelToUse,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: textPrompt
            },
            {
              type: 'image_url',
              image_url: {
                url: imageDataUrl // Should be in format: data:image/jpeg;base64,...
              }
            }
          ]
        }
      ],
      temperature: 0.5, // Higher temperature for vision models to improve image interpretation
      max_tokens: tokenLimit
    };

    console.log('🖼️ Vision request prepared with:');
    console.log(`   - System message (${systemPrompt.length} chars)`);
    console.log(`   - User message with 2 content blocks:`);
    console.log(`     1. Text block (${textPrompt.length} chars)`);
    console.log(`     2. Image block (${imageDataUrl.length} chars)`);
    console.log(`   - Temperature: ${request.temperature}`);
    console.log(`   - Max tokens: ${request.max_tokens}`);

    const result = await this.makeRequest(request, signal, agentType);

    const processingTime = Date.now() - startTime;
    logger.info('Vision agent processing complete', {
      component: 'lm-studio',
      operation: 'vision-agent-complete',
      agentType,
      processingTime
    });

    return result;
  }

  /**
   * Process a text-only agent (system + user messages) with optional model override.
   * Defaults to the configured clinical reasoning model when no override is supplied.
   */
  public async processWithAgent(
    agentPrompt: string,
    userInput: string,
    agentType?: string,
    signal?: AbortSignal,
    modelOverride?: string,
    context?: MedicalContext
  ): Promise<string> {
    // DSPy SDK streaming integration (enabled by default)
    if (agentType && context) {
      const dspyService = DSPyService.getInstance();

      try {
        const isDSPyEnabled = await dspyService.isDSPyEnabled(agentType);

        if (isDSPyEnabled) {
          logger.info('Routing through DSPy SDK streaming layer', {
            component: 'LMStudioService',
            agent_type: agentType,
            sdk_streaming: true,
            fallback_available: true
          });

          // Use SDK streaming endpoint with progress callbacks
          const dspyResult = await dspyService.processWithDSpyStreaming(
            agentType,
            userInput,
            {
              signal,
              onProgress: context.onProgress,  // Pass through progress callback
              onToken: context.onStream  // Pass through streaming token callback
            }
          );

          if (dspyResult.success && dspyResult.result) {
            logger.info('DSPy SDK streaming successful', {
              component: 'LMStudioService',
              agent_type: agentType,
              processing_time: dspyResult.processing_time
            });
            return dspyResult.result;
          } else {
            logger.warn('DSPy SDK streaming failed, falling back to direct LLM', {
              component: 'LMStudioService',
              agent_type: agentType,
              error: dspyResult.error
            });
            // Continue to fallback processing below
          }
        }
      } catch (error) {
        logger.warn('DSPy SDK integration error, falling back to direct LLM', {
          component: 'LMStudioService',
          agent_type: agentType,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Continue to fallback processing below
      }
    }

    // Fallback to original LMStudio processing (always available)
    const messages: ChatMessage[] = [
      { role: 'system', content: agentPrompt },
      { role: 'user', content: userInput }
    ];

    // Determine which model to use based on agent type
    const modelToUse = modelOverride
      || ((agentType && this.config.agentModels?.[agentType])
        ? this.config.agentModels[agentType]
        : this.config.processorModel);

    // Determine agent-specific token limit
    const tokenLimit = (agentType && this.config.agentTokenLimits?.[agentType])
      ? this.config.agentTokenLimits[agentType]
      : this.config.agentTokenLimits?.['default'] || 4000;

    const modelSource = modelOverride ? 'override' : (agentType && this.config.agentModels?.[agentType]) ? 'agent-config' : 'default';
    console.log(`🤖 Using model: ${modelToUse} for agent: ${agentType || 'default'} (${modelSource})`);
    console.log(`🎯 Token limit: ${tokenLimit} tokens for optimal response length`);

    // Create request using Gemma-aware formatting
    const request = GemmaPromptFormatter.createGemmaRequest(messages, modelToUse, {
      temperature: 0.3,
      max_tokens: tokenLimit
    });

    // Log format being used for debugging
    if (GemmaPromptFormatter.isGemmaModel(modelToUse)) {
      console.log('🔧 Using Gemma prompt format with control tokens');
    } else {
      console.log('📝 Using standard OpenAI message format');
    }

    return this.makeRequest(request, signal, agentType);
  }

  /**
   * Generate streaming response with real-time token delivery
   * Compatible with OpenAI streaming API format
   */
  public async generateStream(
    messages: ChatMessage[],
    onToken: (delta: string) => void,
    signal?: AbortSignal,
    modelOverride?: string
  ): Promise<string> {
    const startTime = Date.now();

    // Determine which model to use
    const modelToUse = modelOverride || this.config.processorModel;

    console.log(`🚀 Starting streaming request with model: ${modelToUse}`);

    // Create request using Gemma-aware formatting
    const request = GemmaPromptFormatter.createGemmaRequest(messages, modelToUse, {
      temperature: 0.3,
      max_tokens: 4000,
      stream: true
    });

    const preparedRequest = this.enforceModelSafety(request);
    const guardApplied = preparedRequest !== request;

    if (guardApplied) {
      console.log('🛡️ Applied Qwen no_think guard with non-thinking sampling preset (streaming)');
    }

    // Log format being used for debugging
    if (GemmaPromptFormatter.isGemmaModel(modelToUse)) {
      console.log('🔧 Using Gemma prompt format with control tokens for streaming');
    } else {
      console.log('📝 Using standard OpenAI message format for streaming');
    }

    // Combine user signal with timeout signal for robust cancellation
    const timeoutSignal = AbortSignal.timeout(this.config.timeout);
    const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

    try {
      const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preparedRequest),
        signal: combinedSignal
      });

      if (!response.ok) {
        throw new Error(`LMStudio streaming API error: ${response.status} ${response.statusText}`);
      }

      // Process streaming response using StreamingParser
      return new Promise<string>((resolve, reject) => {
        let fullText = '';

        StreamingParser.processStreamResponse(
          response,
          (delta: string) => {
            fullText += delta;
            onToken(delta);
          },
          (finalText: string, usage?: any) => {
            console.log(`⏱️ Streaming request completed in ${Date.now() - startTime}ms`);

            // Update model status on success
            this.modelStatus.isConnected = true;
            this.modelStatus.lastPing = Date.now();
            this.modelStatus.latency = Date.now() - startTime;

            if (usage) {
              console.log('📊 Token usage:', usage);
            }

            resolve(finalText || fullText);
          },
          (error: Error) => {
            console.error('❌ Streaming error:', error);
            this.modelStatus.isConnected = false;
            reject(error);
          }
        );
      });

    } catch (error) {
      this.modelStatus.isConnected = false;

      if (error instanceof Error && error.name === 'AbortError') {
        console.log('🛑 Streaming request cancelled by user');
        throw new Error('Streaming request cancelled');
      }

      console.error('❌ Streaming request failed:', error);
      throw new Error(`Streaming request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async streamResponse(
    agentPrompt: string,
    userInput: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullResponse: string) => void,
    onError: (error: Error) => void,
    agentType?: string,
    signal?: AbortSignal
  ): Promise<void> {
    const messages: ChatMessage[] = [
      { role: 'system', content: agentPrompt },
      { role: 'user', content: userInput }
    ];

    // Determine which model to use based on agent type
    const modelToUse = (agentType && this.config.agentModels?.[agentType]) 
      ? this.config.agentModels[agentType]
      : this.config.processorModel;

    // Create request using Gemma-aware formatting
    const request = GemmaPromptFormatter.createGemmaRequest(messages, modelToUse, {
      temperature: 0.3,
      max_tokens: 4000,
      stream: true
    });

    const preparedRequest = this.enforceModelSafety(request, agentType);
    const guardApplied = preparedRequest !== request;

    if (guardApplied) {
      console.log('🛡️ Applied Qwen no_think guard with non-thinking sampling preset (stream response)');
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preparedRequest),
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(this.config.timeout)]) : AbortSignal.timeout(this.config.timeout)
      });

      if (!response.ok) {
        throw new Error(`LMStudio API error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      let fullResponse = '';
      const decoder = new TextDecoder();

      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullResponse += content;
                  onChunk(content);
                }
              } catch (parseError) {
                // Silently ignore parse errors in production
              }
            }
          }
        }

        onComplete(fullResponse);
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      onError(error as Error);
    }
  }

  public async makeRequest(request: LMStudioRequest, signal?: AbortSignal, agentType?: string): Promise<string> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    // Determine agent-specific timeout
    const agentTimeout = (agentType && this.config.agentTimeouts?.[agentType])
      ? this.config.agentTimeouts[agentType]
      : this.config.agentTimeouts?.['default'] || this.config.timeout;

    const timeoutMinutes = Math.round(agentTimeout / 60000);
    console.log(`🚀 Starting LMStudio request for agent: ${agentType || 'default'}`);
    console.log(`⏰ Timeout: ${timeoutMinutes} minutes (${agentTimeout}ms) for this agent type`);

    const preparedRequest = this.enforceModelSafety(request, agentType);
    const guardApplied = preparedRequest !== request;

    // Create request body string once for reuse
    const requestBody = JSON.stringify(preparedRequest);

    if (guardApplied) {
      console.log('🛡️ Applied Qwen no_think guard with non-thinking sampling preset');
    }

    // TEMP DEBUG: Log TAVI requests to identify Gemma formatting issue
    if (agentType === 'tavi-workup') {
      const firstMessageContent = preparedRequest.messages?.[0]?.content;
      const firstMessageText = this.normalizeMessageContent(firstMessageContent);

      console.log('🔍 TAVI REQUEST DEBUG:', {
        model: preparedRequest.model,
        messagesCount: preparedRequest.messages?.length,
        firstMessageRole: preparedRequest.messages?.[0]?.role,
        firstMessageContentLength: firstMessageText.length,
        firstMessagePreview: firstMessageText.substring(0, 200) + '...',
        requestBodyLength: requestBody.length,
        hasGemmaTokens: firstMessageText.includes('<start_of_turn>')
      });
    }


    // Set up timeout warning at 2 minutes or 1/3 of timeout, whichever is shorter
    const warningTime = Math.min(120000, agentTimeout / 3);
    const warningTimeout = setTimeout(() => {
      console.warn(`⏰ LMStudio request taking longer than ${Math.round(warningTime/60000)} minutes - this is normal for ${agentType || 'default'} agent`);
      if (agentType === 'ai-medical-review') {
        console.warn('   AI Medical Review typically takes 3-5 minutes for comprehensive analysis');
      }
    }, warningTime);

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        if (attempt > 0) {
          await this.sleep(this.retryDelays[Math.min(attempt - 1, this.retryDelays.length - 1)]);
        }

        // Combine user signal with agent-specific timeout signal for robust cancellation
        const timeoutSignal = AbortSignal.timeout(agentTimeout);
        const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

        const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: requestBody,
          signal: combinedSignal
        });

        if (!response.ok) {
          // Enhanced error logging for debugging vision API issues
          let errorDetails = '';
          try {
            const errorBody = await response.text();
            errorDetails = errorBody;
            console.error('❌ LM Studio HTTP Error Details:', {
              status: response.status,
              statusText: response.statusText,
              errorBody: errorBody,
              agentType: agentType,
              model: preparedRequest.model,
              isVisionRequest: preparedRequest.messages?.some(m =>
                Array.isArray(m.content) && m.content.some((c: any) => c.type === 'image_url')
              )
            });

            // Check if this is a model loading error due to insufficient memory
            const modelLoadingError = await this.parseModelLoadingError(
              errorBody,
              response.status,
              preparedRequest.model || this.config.processorModel
            );

            if (modelLoadingError) {
              console.error('💾 Model loading failed due to insufficient memory');
              throw modelLoadingError; // Throw specialized error for UI to handle
            }

          } catch (e) {
            // If parseModelLoadingError threw a ModelLoadingError, re-throw it
            if (e instanceof ModelLoadingError) {
              throw e;
            }
            errorDetails = response.statusText;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorDetails}`);
        }

        const data: LMStudioResponse = await response.json();

        // Check if this was a vision request
        const isVisionRequest = preparedRequest.messages?.some(m =>
          Array.isArray(m.content) && m.content.some((c: any) => c.type === 'image_url')
        );

        // Debug logging for LMStudio response
        const responseContent = this.normalizeMessageContent(data.choices?.[0]?.message?.content);

        console.log('🤖 LMStudio Response Details:', {
          status: response.status,
          model: (data as any).model, // Model field may vary by implementation
          choices: data.choices?.length,
          finishReason: data.choices?.[0]?.finish_reason,
          usage: data.usage,
          contentLength: responseContent.length,
          contentPreview: responseContent.substring(0, 100) + '...'
        });

        // Enhanced diagnostics for vision requests
        if (isVisionRequest) {
          console.log('🔍 VISION RESPONSE DIAGNOSTICS:');
          console.log(`   Model actually used: ${(data as any).model || 'unknown'}`);
          console.log(`   Prompt tokens: ${data.usage?.prompt_tokens || 'unknown'}`);
          console.log(`   Completion tokens: ${data.usage?.completion_tokens || 'unknown'}`);
          console.log(`   Total tokens: ${data.usage?.total_tokens || 'unknown'}`);
          console.log(`   Finish reason: ${data.choices?.[0]?.finish_reason}`);
          console.log(`   Response length: ${responseContent.length} chars`);
          console.log(`   Response is empty array: ${responseContent.trim() === '[]'}`);
          console.log(`   Response preview: "${responseContent.substring(0, 200)}"`);

          // Check for signs of vision processing
          if (data.usage?.prompt_tokens && data.usage.prompt_tokens < 100) {
            console.warn('⚠️ WARNING: Very few prompt tokens used. Image may not have been processed!');
            console.warn('   This often indicates the vision model is not properly loaded.');
          }

          if (data.usage?.completion_tokens && data.usage.completion_tokens < 5) {
            console.warn('⚠️ WARNING: Very few completion tokens generated (${data.usage.completion_tokens}).');
            console.warn('   Model may not be seeing/understanding the image.');
          }
        }

        const content = responseContent;

        if (!content) {
          console.error('❌ No content in LMStudio response:', data);
          throw new Error('No content in response');
        }

        // Check if response was truncated
        const finishReason = data.choices?.[0]?.finish_reason;
        if (finishReason === 'length') {
          console.warn('⚠️ Response truncated due to max_tokens limit');
        } else if (finishReason === 'stop') {
          console.log('ℹ️ Response completed normally');
        } else {
          console.warn('⚠️ Unexpected finish reason:', finishReason);
        }

        console.log('📄 Full response content:', content);
        
        // Clear timeout warning since request completed
        clearTimeout(warningTimeout);

        // Update model status on success
        this.modelStatus.isConnected = true;
        this.modelStatus.lastPing = Date.now();
        this.modelStatus.latency = Date.now() - startTime;

        console.log(`⏱️ LMStudio request completed in ${Date.now() - startTime}ms`);
        
        return content.trim();

      } catch (error) {
        lastError = error as Error;
        // Request attempt failed - continuing to next attempt
        
        // Update connection status
        this.modelStatus.isConnected = false;
      }
    }

    // Clear timeout warning on failure
    clearTimeout(warningTimeout);
    
    throw new Error(`LMStudio request failed after ${this.config.retryAttempts + 1} attempts: ${lastError?.message}`);
  }

  public getModelStatus(): ModelStatus {
    return { ...this.modelStatus };
  }

  public async checkTranscriptionService(): Promise<{ available: boolean; model?: string; error?: string }> {
    try {
      const transcriptionUrl = this.config.transcriptionUrl || this.config.baseUrl;
      const response = await fetch(`${transcriptionUrl}/v1/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000) // Reduced from 5000ms to 2000ms
      });

      if (response.ok) {
        const health = await response.json();
        return {
          available: true,
          model: health.model || 'Unknown'
        };
      } else {
        return {
          available: false,
          error: `Health check failed: ${response.status} ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        available: false,
        error: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Enhanced request deduplication and caching
  private lastHealthCheckTime = 0;
  private lastHealthCheckResult: ModelStatus | null = null;
  private readonly HEALTH_CHECK_CACHE_TTL = 120000; // 2 minutes cache for stable connections
  private pendingHealthCheck: Promise<ModelStatus> | null = null;
  private modelsCache: { models: string[], timestamp: number } | null = null;
  private readonly MODELS_CACHE_TTL = 300000; // 5 minutes cache for model list

  public async checkConnection(): Promise<ModelStatus> {
    const now = Date.now();
    
    // Return cached result if within TTL to prevent excessive requests
    if (this.lastHealthCheckResult && 
        now - this.lastHealthCheckTime < this.HEALTH_CHECK_CACHE_TTL) {
      // Cache hit - eliminate logging to prevent console spam
      // Only log if explicitly needed for debugging (can be enabled via dev tools)
      return { ...this.lastHealthCheckResult };
    }

    // Request deduplication: If a health check is already in progress, wait for it
    if (this.pendingHealthCheck) {
      logger.debug('Health check already in progress, waiting for result', { component: 'health-check' });
      return await this.pendingHealthCheck;
    }

    // Create a single health check promise to prevent concurrent requests
    this.pendingHealthCheck = this.performHealthCheck();
    
    try {
      const result = await this.pendingHealthCheck;
      return result;
    } finally {
      this.pendingHealthCheck = null;
    }
  }

  private async performHealthCheck(): Promise<ModelStatus> {
    try {
      const startTime = Date.now();
      
      // Check LMStudio connection with reduced timeout for faster failure detection
      const response = await fetch(`${this.config.baseUrl}/v1/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000) // Reduced from 5000ms to 2000ms
      });

      if (response.ok) {
        this.modelStatus.isConnected = true;
        this.modelStatus.lastPing = Date.now();
        this.modelStatus.latency = Date.now() - startTime;
      } else {
        this.modelStatus.isConnected = false;
        this.modelStatus.lastPing = Date.now();
        this.modelStatus.latency = 0;
      }
    } catch (error) {
      // LMStudio connection check failed
      this.modelStatus.isConnected = false;
      this.modelStatus.lastPing = Date.now();
      this.modelStatus.latency = 0;
    }

    // Check Whisper server status with caching
    try {
      const whisperStatus = await this.whisperServerService.checkServerStatus();
      this.modelStatus.whisperServer = {
        running: whisperStatus.running,
        model: whisperStatus.model || this.config.transcriptionModel,
        port: whisperStatus.port || 8001,
        lastChecked: whisperStatus.lastChecked,
        error: whisperStatus.error
      };
    } catch (error) {
      console.warn('Failed to check Whisper server status:', error);
      this.modelStatus.whisperServer = {
        running: false,
        model: this.config.transcriptionModel,
        port: 8001,
        lastChecked: Date.now(),
        error: 'Failed to check server status'
      };
    }

    // Check DSPy server status
    try {
      const dspyService = DSPyService.getInstance();
      const isHealthy = await dspyService.checkServerHealth();

      this.modelStatus.dspyServer = {
        running: isHealthy,
        ready: isHealthy,
        port: 8002,
        lastChecked: Date.now(),
        version: undefined,
        uptime: undefined,
        stats: undefined,
        dspy: undefined
      };
    } catch (error) {
      // DSPy server check failed - this is expected when not running
      this.modelStatus.dspyServer = {
        running: false,
        ready: false,
        port: 8002,
        lastChecked: Date.now(),
        error: error instanceof Error ? error.message : 'DSPy server check failed'
      };
    }

    // Cache the result
    const now = Date.now();
    this.lastHealthCheckTime = now;
    this.lastHealthCheckResult = { ...this.modelStatus };

    return { ...this.modelStatus };
  }

  public async getAvailableModels(): Promise<string[]> {
    const now = Date.now();
    
    // Return cached models if available and within TTL
    if (this.modelsCache && 
        now - this.modelsCache.timestamp < this.MODELS_CACHE_TTL) {
      console.debug('🔄 Models cache hit (5min TTL)');
      return [...this.modelsCache.models];
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/v1/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000) // Reduced from 5000ms to 2000ms
      });

      if (response.ok) {
        const data = await response.json();
        const models = data.data?.map((model: { id: string }) => model.id) || [];
        
        // Cache the result
        this.modelsCache = {
          models: [...models],
          timestamp: now
        };
        
        return models;
      }
    } catch (error) {
      console.warn('Failed to fetch available models:', error);
      // Return cached models if available, even if stale
      if (this.modelsCache) {
        console.debug('⚠️ Using stale models cache due to fetch failure');
        return [...this.modelsCache.models];
      }
    }

    return [];
  }

  public updateConfig(newConfig: Partial<LMStudioConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public async switchModel(type: 'processor', modelName: string): Promise<boolean> {
    try {
      // In a real implementation, you might need to call an API to switch models
      // For now, just update the config
      this.config.processorModel = modelName;
      this.modelStatus.processorModel = modelName;

      // Verify the model is available
      const status = await this.checkConnection();
      return status.isConnected;
    } catch (error) {
      console.error(`Failed to switch ${type} model to ${modelName}:`, error);
      return false;
    }
  }

  private startHealthCheck(): void {
    // Initial connection check only - React Query handles periodic checks
    this.checkConnection();
  }

  /**
   * Check if an error response from LM Studio indicates a model loading failure
   * due to insufficient system resources
   */
  private async parseModelLoadingError(
    errorBody: string,
    httpStatus: number,
    requestedModel: string
  ): Promise<ModelLoadingError | null> {
    // Check for memory-related error patterns
    const isMemoryError =
      errorBody.includes('insufficient system resources') ||
      errorBody.includes('model loading was stopped') ||
      errorBody.includes('overload your system') ||
      errorBody.includes('freeze');

    if (!isMemoryError) {
      return null; // Not a memory-related model loading error
    }

    // Fetch available models for user to choose from
    let availableModels: string[] = [];
    try {
      availableModels = await this.getAvailableModels();
    } catch (error) {
      console.warn('Failed to fetch available models for error dialog:', error);
    }

    // Create detailed error
    return new ModelLoadingError(
      `Failed to load model "${requestedModel}" due to insufficient system memory. ` +
      `LM Studio blocked loading to prevent system freeze.`,
      {
        requestedModel,
        isMemoryIssue: true,
        availableModels,
        httpStatus,
        rawErrorMessage: errorBody
      }
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isQwenModel(model?: string): boolean {
    return typeof model === 'string' && LMStudioService.QWEN_MODEL_PATTERN.test(model);
  }

  private appendNoThinkSuffix(text: string): string {
    if (!text) {
      return '/no_think';
    }

    const trimmed = text.trimEnd();
    if (trimmed.endsWith('/no_think')) {
      return text;
    }

    const separator = text.endsWith('\n') || text.length === 0 ? '' : '\n';
    return `${text}${separator}/no_think`;
  }

  private applyNoThinkToContent(content: ChatMessage['content']): ChatMessage['content'] {
    if (typeof content === 'string') {
      return this.appendNoThinkSuffix(content);
    }

    const cloned: ChatMessageContentBlock[] = content.map(block => {
      if (block.type === 'text') {
        return { type: 'text', text: block.text } as ChatMessageContentBlock;
      }
      return {
        type: 'image_url',
        image_url: { ...block.image_url }
      } as ChatMessageContentBlock;
    });

    let lastTextIndex = -1;
    for (let i = cloned.length - 1; i >= 0; i--) {
      if (cloned[i].type === 'text') {
        lastTextIndex = i;
        break;
      }
    }

    if (lastTextIndex >= 0) {
      const textBlock = cloned[lastTextIndex];
      if (textBlock.type === 'text') {
        const updatedText = this.appendNoThinkSuffix(textBlock.text);
        if (updatedText !== textBlock.text) {
          cloned[lastTextIndex] = { ...textBlock, text: updatedText };
        }
      }
      return cloned;
    }

    cloned.push({ type: 'text', text: '/no_think' });
    return cloned;
  }

  private enforceModelSafety(request: LMStudioRequest, agentType?: string): LMStudioRequest {
    if (!this.isQwenModel(request.model)) {
      return request;
    }

    if (!agentType || !LMStudioService.QUICK_AGENT_TYPES.has(agentType)) {
      return request;
    }

    const safeRequest: LMStudioRequest = {
      ...request,
      no_think: true,
      temperature: 0.7,
      top_p: 0.8,
      top_k: 20,
      min_p: 0
    };

    if (request.messages) {
      safeRequest.messages = request.messages.map(message => {
        if (message.role === 'user') {
          return {
            ...message,
            content: this.applyNoThinkToContent(message.content)
          };
        }
        return { ...message };
      });
    }

    if (request.prompt) {
      safeRequest.prompt = this.appendNoThinkSuffix(request.prompt);
    }

    return safeRequest;
  }

  /**
   * Starts a progress simulation for transcription operations to provide user feedback
   * during long audio processing operations.
   */
  private startTranscriptionProgressSimulation(
    estimatedTimeMs: number,
    startProgress: number,
    endProgress: number,
    onProgress: (progress: number, details?: string) => void
  ): NodeJS.Timeout {
    const progressRange = endProgress - startProgress;
    const updateIntervalMs = Math.max(Math.min(estimatedTimeMs / 10, 2000), 500); // Update every 500ms-2s
    let currentProgress = startProgress;

    return setInterval(() => {
      const increment = progressRange / (estimatedTimeMs / updateIntervalMs);
      currentProgress = Math.min(currentProgress + increment, endProgress - 1); // Stop 1% before end

      const details = currentProgress < 50
        ? 'Processing audio with MLX Whisper...'
        : 'Generating transcription...';

      onProgress(Math.round(currentProgress), details);
    }, updateIntervalMs);
  }

}

// Streaming types and helpers for SSE chat completions
export type StreamOpts = {
  model: string;
  messages: { role: 'system'|'user'|'assistant'; content: string }[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  onToken?: (t: string) => void;
  onMessage?: (json: any) => void;
  onEnd?: (finalText: string, usage?: any) => void;
  onError?: (err: Error) => void;
};

function splitSSEFrames(buf: string): string[] {
  return buf.replace(/\r\n/g, '\n').split('\n\n');
}

export async function streamChatCompletion(opts: StreamOpts): Promise<void> {
  try {
    const body: any = {
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
      stream: true,
    };

    const res = await fetch('http://localhost:1234/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: opts.signal,
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let pending = '';
    let finalText = '';

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      const frames = splitSSEFrames(pending);
      pending = frames.pop() ?? '';
      for (const frame of frames) {
        for (const line of frame.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (!data) continue;
          if (data === '[DONE]') {
            opts.onEnd?.(finalText);
            return;
          }
          try {
            const json = JSON.parse(data);
            opts.onMessage?.(json);
            const delta = json?.choices?.[0]?.delta?.content ?? '';
            if (delta) {
              finalText += delta;
              opts.onToken?.(delta);
            }
            const usage = json?.usage;
            if (usage && !delta) {
              opts.onEnd?.(finalText, usage);
              return;
            }
          } catch {
            // Ignore partial/keepalive lines
          }
        }
      }
    }
    opts.onEnd?.(finalText);
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      // Propagate abort as Error for unified handling
      opts.onError?.(err);
      return;
    }
    opts.onError?.(err instanceof Error ? err : new Error(String(err)));
  }
}
