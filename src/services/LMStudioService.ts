import type { 
  LMStudioRequest, 
  LMStudioResponse, 
  ChatMessage, 
  ModelStatus 
} from '@/types/medical.types';
import { WhisperServerService } from './WhisperServerService';

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
   * - Complex medical reports (TAVI, PCI, etc.): Use full MedGemma-27b for detailed analysis
   * - Simple formatting tasks (investigation-summary): Use lighter google/gemma-3n-e4b for speed
   * - AI medical review: Use full MedGemma-27b for comprehensive clinical analysis
   * 
   * This directly impacts processing times:
   * - MedGemma-27b: 3-15+ minutes for complex tasks
   * - google/gemma-3n-e4b: 10-30 seconds for simple formatting
   */
  agentModels?: Record<string, string>;
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
      processorModel: 'unsloth/medgemma27b/medgemma-27b-it-q4_k_m.gguf',
      transcriptionModel: 'whisper-large-v3-turbo',
      transcriptionUrl: 'http://localhost:8001', // Separate MLX Whisper server
      timeout: 300000, // 5 minutes for local LLM medical report generation
      retryAttempts: 3,
      agentModels: {
        // OPTIMIZED MODELS FOR SPECIFIC TASKS:
        
        // Fast formatting tasks - Use lightweight model for 10-30s processing
        'investigation-summary': 'google/gemma-3n-e4b', // Simple investigation result formatting
        
        // All other agents use default MedGemma-27b for comprehensive medical analysis:
        // - 'ai-medical-review': Uses default MedGemma-27b (3-4min processing)
        // - 'tavi', 'angiogram-pci', 'mteer': Use default MedGemma-27b (8-15min processing)
        // - 'quick-letter', 'consultation': Use default MedGemma-27b (30s-4min processing)
        
        // This configuration ensures optimal speed for simple tasks while maintaining
        // medical accuracy for complex clinical analysis and detailed procedure reports
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


  public async transcribeAudio(audioBlob: Blob, signal?: AbortSignal): Promise<string> {
    const startTime = Date.now();
    
    console.log('🎙️ LMStudioService.transcribeAudio() called:', {
      blobSize: audioBlob.size,
      blobType: audioBlob.type,
      transcriptionUrl: this.config.transcriptionUrl,
      model: this.config.transcriptionModel,
      timestamp: new Date().toISOString()
    });
    
    try {
      // Ensure Whisper server is running before attempting transcription
      const serverStatus = await this.whisperServerService.ensureServerRunning();
      if (!serverStatus.running) {
        console.warn('⚠️ MLX Whisper server is not running');
        console.warn('💡 To start the server manually, run: ./start-whisper-server.sh');
        console.warn('💡 Or run: source venv-whisper/bin/activate && python whisper-server.py');
        
        return `[MLX Whisper server not running. ${serverStatus.error || 'Please start the server manually.'}]`;
      }
      // First, try the OpenAI-compatible transcription endpoint
      // eslint-disable-next-line no-undef
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', this.config.transcriptionModel);
      formData.append('response_format', 'text');

      // Use separate transcription URL if configured, otherwise use base LMStudio URL
      const transcriptionUrl = this.config.transcriptionUrl || this.config.baseUrl;
      const fullUrl = `${transcriptionUrl}/v1/audio/transcriptions`;
      
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
          const placeholderText = `[MLX Whisper transcription failed (${response.status}): ${errorText}. Please check if the whisper-server.py is running on port 8001.]`;
          
          console.error('❌ MLX Whisper server error:', response.status, errorText);
          console.warn('💡 To fix this:');
          console.warn('   1. Check server status: curl http://localhost:8001/v1/health');
          console.warn('   2. Start server: ./start-whisper-server.sh');
          console.warn('   3. Or manually: source venv-whisper/bin/activate && python whisper-server.py');
          console.warn('   4. Check that port 8001 is available');
          
          return placeholderText;
        } else {
          // Generic transcription service error
          const placeholderText = '[Audio transcription service unavailable. Please configure a transcription provider.]';
          
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
        const timeoutMessage = `[MLX Whisper transcription timed out after ${this.config.timeout/1000}s. The model may be loading for the first time.]`;
        
        console.error('❌ MLX Whisper timeout:', error.message);
        console.warn('💡 This is normal for the first transcription. The model is loading...');
        console.warn('   - Subsequent transcriptions should be much faster');
        console.warn('   - You can check server logs for progress');
        console.warn('   - Server status: curl http://localhost:8001/v1/health');
        
        return timeoutMessage;
      }
      
      // Provide helpful error message for other errors
      const errorMessage = `[Audio transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please check MLX Whisper server.]`;
      
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
    const messages: ChatMessage[] = [
      { role: 'system', content: agentPrompt },
      { role: 'user', content: userInput }
    ];

    // Determine which model to use based on agent type
    const modelToUse = (agentType && this.config.agentModels?.[agentType]) 
      ? this.config.agentModels[agentType]
      : this.config.processorModel;

    console.log(`🤖 Using model: ${modelToUse} for agent: ${agentType || 'default'}`);

    return this.makeRequest({
      model: modelToUse,
      messages,
      temperature: 0.3,
      max_tokens: 4000  // Increased for longer medical reports
    }, signal);
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

    try {
      const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelToUse,
          messages,
          temperature: 0.3,
          max_tokens: 4000,
          stream: true
        }),
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

  public async makeRequest(request: LMStudioRequest, signal?: AbortSignal): Promise<string> {
    const startTime = Date.now();
    let lastError: Error | null = null;
    
    console.log('🚀 Starting LMStudio request with 5-minute timeout...');
    
    // Set up timeout warning at 2 minutes
    const warningTimeout = setTimeout(() => {
      console.warn('⏰ LMStudio request taking longer than 2 minutes - this is normal for complex medical reports');
    }, 120000);

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        if (attempt > 0) {
          await this.sleep(this.retryDelays[Math.min(attempt - 1, this.retryDelays.length - 1)]);
        }

        // Combine user signal with timeout signal for robust cancellation
        const timeoutSignal = AbortSignal.timeout(this.config.timeout);
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
        signal: AbortSignal.timeout(5000)
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

  public async checkConnection(): Promise<ModelStatus> {
    try {
      const startTime = Date.now();
      
      // Check LMStudio connection
      const response = await fetch(`${this.config.baseUrl}/v1/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
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

    // Always check Whisper server status
    try {
      const whisperStatus = await this.whisperServerService.checkServerStatus();
      this.modelStatus.whisperServer = {
        running: whisperStatus.running,
        model: whisperStatus.model || this.config.transcriptionModel,
        lastChecked: whisperStatus.lastChecked,
        error: whisperStatus.error
      };
    } catch (error) {
      console.warn('Failed to check Whisper server status:', error);
      this.modelStatus.whisperServer = {
        running: false,
        model: this.config.transcriptionModel,
        lastChecked: Date.now(),
        error: 'Failed to check server status'
      };
    }

    return { ...this.modelStatus };
  }

  public async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/v1/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const data = await response.json();
        return data.data?.map((model: { id: string }) => model.id) || [];
      }
    } catch (error) {
      // Failed to fetch available models
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
    // Reduced frequency: Check connection every 5 minutes instead of 30 seconds
    setInterval(async () => {
      await this.checkConnection();
    }, 300000); // 5 minutes = 300,000ms

    // Initial connection check
    this.checkConnection();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

}