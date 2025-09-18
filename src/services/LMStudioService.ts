import type {
  LMStudioRequest,
  LMStudioResponse,
  ChatMessage,
  ModelStatus
} from '@/types/medical.types';
import { WhisperServerService } from './WhisperServerService';
import { AudioOptimizationService } from './AudioOptimizationService';
import { DSPyService } from './DSPyService';
import { ASRCorrectionEngine } from '@/utils/asr/ASRCorrectionEngine';
import { logger } from '@/utils/Logger';
import { GemmaPromptFormatter } from '@/utils/GemmaPromptFormatter';
import { StreamingParser } from '@/utils/StreamingParser';

/**
 * Centralized Model Configuration
 * 
 * Change these model names to easily switch between different models in LMStudio:
 * - REASONING_MODEL: Used for complex medical analysis (TAVI, PCI, AI Review, etc.)
 * - QUICK_MODEL: Used for simple formatting tasks (investigation-summary, quick-letter, etc.)
 */
export const MODEL_CONFIG = {
  REASONING_MODEL: 'lmstudio-community/medgemma-27b-text-it-MLX-4bit',
  QUICK_MODEL: 'google/gemma-3n-e4b'
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
        'angiogram-pci': 8000,
        'mteer': 7000,
        'pfo-closure': 7000,
        'right-heart-cath': 7000,
        
        // Standard agents
        'consultation': 6000,
        'quick-letter': 5000,
        
        // Simple formatting tasks
        'investigation-summary': 2000,
        'medication': 3000, // Medication lists can be longer than investigation summaries
        
        // Default for unlisted agents
        'default': 4000
      },
      
      agentTimeouts: {
        // AI Medical Review needs extended time for comprehensive analysis
        'ai-medical-review': 600000, // 10 minutes
        
        // Complex procedure agents need extended processing time
        'tavi': 480000,              // 8 minutes
        'angiogram-pci': 480000,     // 8 minutes  
        'mteer': 420000,             // 7 minutes
        'pfo-closure': 360000,       // 6 minutes
        'right-heart-cath': 360000,  // 6 minutes
        
        // Standard agents
        'consultation': 240000,      // 4 minutes
        'quick-letter': 180000,      // 3 minutes
        
        // Simple formatting tasks
        'investigation-summary': 60000, // 1 minute
        'medication': 90000, // 1.5 minutes (medication lists can be complex)
        
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

  public static getInstance(config?: Partial<LMStudioConfig>): LMStudioService {
    if (!LMStudioService.instance) {
      LMStudioService.instance = new LMStudioService(config);
    }
    return LMStudioService.instance;
  }


  public async transcribeAudio(audioBlob: Blob, signal?: AbortSignal, agentType?: string): Promise<string> {
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

      // Audio optimization for better performance
      let processedAudioBlob = audioBlob;
      const audioOptimizer = AudioOptimizationService.getInstance();
      
      // Check if compression would be beneficial
      if (audioOptimizer.shouldCompress(audioBlob)) {
        logger.info('Compressing audio for better transcription performance', {
          component: 'lm-studio',
          operation: 'audio-compression-start'
        });
        try {
          const compressionResult = await audioOptimizer.compressAudio(audioBlob);
          processedAudioBlob = compressionResult.compressedBlob;
          
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
      
      // Combine user signal with timeout signal for robust cancellation
      const timeoutSignal = AbortSignal.timeout(this.config.timeout);
      const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        body: formData,
        signal: combinedSignal
      });
      
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

  public async processWithAgent(
    agentPrompt: string, 
    userInput: string,
    agentType?: string,
    signal?: AbortSignal
  ): Promise<string> {
    // DSPy integration with feature flag
    if (agentType) {
      const dspyService = DSPyService.getInstance();
      
      try {
        const isDSPyEnabled = await dspyService.isDSPyEnabled(agentType);
        
        if (isDSPyEnabled) {
          logger.info('Routing through DSPy layer', { 
            component: 'LMStudioService',
            agent_type: agentType,
            fallback_available: true
          });

          const dspyResult = await dspyService.processWithDSPy(agentType, userInput, { signal });
          
          if (dspyResult.success && dspyResult.result) {
            logger.info('DSPy processing successful', { 
              component: 'LMStudioService',
              agent_type: agentType,
              processing_time: dspyResult.processing_time,
              cached: dspyResult.cached
            });
            return dspyResult.result;
          } else {
            logger.warn('DSPy processing failed, falling back to direct LLM', { 
              component: 'LMStudioService',
              agent_type: agentType,
              error: dspyResult.error
            });
            // Continue to fallback processing below
          }
        }
      } catch (error) {
        logger.warn('DSPy integration error, falling back to direct LLM', { 
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
    const modelToUse = (agentType && this.config.agentModels?.[agentType]) 
      ? this.config.agentModels[agentType]
      : this.config.processorModel;

    // Determine agent-specific token limit
    const tokenLimit = (agentType && this.config.agentTokenLimits?.[agentType])
      ? this.config.agentTokenLimits[agentType]
      : this.config.agentTokenLimits?.['default'] || 4000;

    console.log(`🤖 Using model: ${modelToUse} for agent: ${agentType || 'default'}`);
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
        body: JSON.stringify(request),
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

    try {
      const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
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
          body: JSON.stringify(request),
          signal: combinedSignal
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: LMStudioResponse = await response.json();
        
        // Debug logging for LMStudio response
        console.log('🤖 LMStudio Response Details:', {
          status: response.status,
          model: (data as any).model, // Model field may vary by implementation
          choices: data.choices?.length,
          finishReason: data.choices?.[0]?.finish_reason,
          usage: data.usage,
          contentLength: data.choices?.[0]?.message?.content?.length || 0,
          contentPreview: data.choices?.[0]?.message?.content?.substring(0, 100) + '...'
        });
        
        const content = data.choices?.[0]?.message?.content;

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
      const dspyStatus = await dspyService.getServerStatus();
      
      if (dspyStatus) {
        this.modelStatus.dspyServer = {
          running: dspyStatus.status === 'healthy',
          ready: dspyStatus.dspy?.ready || false,
          port: dspyStatus.server?.port || 8002,
          lastChecked: Date.now(),
          version: dspyStatus.server?.version,
          uptime: dspyStatus.server?.uptime_seconds,
          stats: dspyStatus.stats ? {
            requests_processed: dspyStatus.stats.requests_processed,
            errors_encountered: dspyStatus.stats.errors_encountered,
            active_optimizations: dspyStatus.stats.active_optimizations
          } : undefined,
          dspy: dspyStatus.dspy ? {
            config_loaded: dspyStatus.dspy.config_loaded,
            available_agents: dspyStatus.dspy.available_agents,
            enabled_agents: dspyStatus.dspy.enabled_agents
          } : undefined
        };
      } else {
        this.modelStatus.dspyServer = {
          running: false,
          ready: false,
          port: 8002,
          lastChecked: Date.now(),
          error: 'DSPy server not responding'
        };
      }
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

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
