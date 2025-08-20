var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const _WhisperServerService = class _WhisperServerService {
  constructor() {
    __publicField(this, "serverProcess", null);
    __publicField(this, "port", 8001);
    __publicField(this, "healthCheckUrl", `http://localhost:${this.port}/v1/health`);
  }
  static getInstance() {
    if (!_WhisperServerService.instance) {
      _WhisperServerService.instance = new _WhisperServerService();
    }
    return _WhisperServerService.instance;
  }
  async checkServerStatus() {
    try {
      const response = await fetch(this.healthCheckUrl, {
        method: "GET",
        signal: AbortSignal.timeout(5e3)
      });
      if (response.ok) {
        const health = await response.json();
        return {
          running: true,
          model: health.model || "whisper-large-v3-turbo",
          port: this.port,
          lastChecked: Date.now()
        };
      } else {
        return {
          running: false,
          port: this.port,
          error: `Health check failed: ${response.status}`,
          lastChecked: Date.now()
        };
      }
    } catch (error) {
      return {
        running: false,
        port: this.port,
        error: `Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        lastChecked: Date.now()
      };
    }
  }
  async startServer() {
    console.log("🚀 Starting MLX Whisper server...");
    const status = await this.checkServerStatus();
    if (status.running) {
      console.log("✅ MLX Whisper server is already running");
      return status;
    }
    try {
      console.log("🔧 MLX Whisper server not detected");
      console.log("💡 Starting server requires running: ./start-whisper-server.sh");
      if (chrome.notifications) {
        try {
          await chrome.notifications.create({
            type: "basic",
            iconUrl: "assets/icons/icon-48.png",
            title: "MLX Whisper Server Required",
            message: "Please start the MLX Whisper server by running: ./start-whisper-server.sh"
          });
        } catch (notificationError) {
          console.log("Notification failed:", notificationError);
        }
      }
      return {
        running: false,
        port: this.port,
        error: "Server startup requires manual intervention. Please run: ./start-whisper-server.sh",
        lastChecked: Date.now()
      };
    } catch (error) {
      console.error("❌ Failed to start MLX Whisper server:", error);
      return {
        running: false,
        port: this.port,
        error: `Failed to start server: ${error instanceof Error ? error.message : "Unknown error"}`,
        lastChecked: Date.now()
      };
    }
  }
  async ensureServerRunning() {
    const status = await this.checkServerStatus();
    if (!status.running) {
      console.log("🔄 MLX Whisper server not running, attempting to start...");
      return await this.startServer();
    }
    return status;
  }
  async waitForServer(maxWaitMs = 3e4) {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.checkServerStatus();
      if (status.running) {
        console.log("✅ MLX Whisper server is ready");
        return status;
      }
      await new Promise((resolve) => setTimeout(resolve, 1e3));
    }
    return {
      running: false,
      port: this.port,
      error: `Server did not start within ${maxWaitMs / 1e3} seconds`,
      lastChecked: Date.now()
    };
  }
};
__publicField(_WhisperServerService, "instance");
let WhisperServerService = _WhisperServerService;
const _LMStudioService = class _LMStudioService {
  constructor(config) {
    __publicField(this, "config");
    __publicField(this, "modelStatus");
    __publicField(this, "retryDelays", [1e3, 2e3, 4e3]);
    // Exponential backoff
    __publicField(this, "whisperServerService");
    this.config = {
      baseUrl: "http://localhost:1234",
      processorModel: "unsloth/medgemma27b/medgemma-27b-it-q4_k_m.gguf",
      transcriptionModel: "whisper-large-v3-turbo",
      transcriptionUrl: "http://localhost:8001",
      // Separate MLX Whisper server
      timeout: 3e5,
      // 5 minutes for local LLM medical report generation
      retryAttempts: 3,
      agentModels: {
        // OPTIMIZED MODELS FOR SPECIFIC TASKS:
        // Fast formatting tasks - Use lightweight model for 10-30s processing
        "investigation-summary": "google/gemma-3n-e4b"
        // Simple investigation result formatting
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
      classifierModel: "",
      // No longer used
      processorModel: this.config.processorModel,
      lastPing: 0,
      latency: 0
    };
    this.whisperServerService = WhisperServerService.getInstance();
    this.startHealthCheck();
  }
  static getInstance(config) {
    if (!_LMStudioService.instance) {
      _LMStudioService.instance = new _LMStudioService(config);
    }
    return _LMStudioService.instance;
  }
  async transcribeAudio(audioBlob, signal) {
    const startTime = Date.now();
    console.log("🎙️ LMStudioService.transcribeAudio() called:", {
      blobSize: audioBlob.size,
      blobType: audioBlob.type,
      transcriptionUrl: this.config.transcriptionUrl,
      model: this.config.transcriptionModel,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    try {
      const serverStatus = await this.whisperServerService.ensureServerRunning();
      if (!serverStatus.running) {
        console.warn("⚠️ MLX Whisper server is not running");
        console.warn("💡 To start the server manually, run: ./start-whisper-server.sh");
        console.warn("💡 Or run: source venv-whisper/bin/activate && python whisper-server.py");
        return `[MLX Whisper server not running. ${serverStatus.error || "Please start the server manually."}]`;
      }
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");
      formData.append("model", this.config.transcriptionModel);
      formData.append("response_format", "text");
      const transcriptionUrl = this.config.transcriptionUrl || this.config.baseUrl;
      const fullUrl = `${transcriptionUrl}/v1/audio/transcriptions`;
      console.log("🌐 Sending transcription request:", {
        url: fullUrl,
        formDataEntries: Array.from(formData.entries()).map(([key, value]) => [
          key,
          value instanceof File ? `File(${value.name}, ${value.size} bytes)` : value
        ]),
        timeout: this.config.timeout
      });
      const timeoutSignal = AbortSignal.timeout(this.config.timeout);
      const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
      const response = await fetch(fullUrl, {
        method: "POST",
        body: formData,
        signal: combinedSignal
      });
      console.log("📡 Transcription response:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        ok: response.ok,
        url: response.url
      });
      if (response.ok) {
        const text = await response.text();
        const processingTime = Date.now() - startTime;
        console.log("✅ Transcription successful:", {
          responseLength: text.length,
          processingTime: processingTime + "ms",
          responsePreview: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
          fullResponse: text
          // Log full response to help debug
        });
        if (text.trim().toLowerCase() === "thank you") {
          console.warn('🚨 SUSPICIOUS TRANSCRIPTION: Got "thank you" response');
          console.warn("📊 Audio blob details:", {
            size: audioBlob.size,
            type: audioBlob.type
          });
          console.warn("💡 This typically indicates:");
          console.warn("   - Audio too short or quiet");
          console.warn("   - Server processing issue");
          console.warn("   - Model defaulting to common phrase");
        }
        this.modelStatus.isConnected = true;
        this.modelStatus.lastPing = Date.now();
        this.modelStatus.latency = processingTime;
        return text.trim();
      } else {
        console.warn(`Transcription endpoint returned ${response.status}: ${response.statusText}`);
        if (this.config.transcriptionUrl && this.config.transcriptionUrl.includes("8001")) {
          const errorText = await response.text().catch(() => "Unknown error");
          const placeholderText = `[MLX Whisper transcription failed (${response.status}): ${errorText}. Please check if the whisper-server.py is running on port 8001.]`;
          console.error("❌ MLX Whisper server error:", response.status, errorText);
          console.warn("💡 To fix this:");
          console.warn("   1. Check server status: curl http://localhost:8001/v1/health");
          console.warn("   2. Start server: ./start-whisper-server.sh");
          console.warn("   3. Or manually: source venv-whisper/bin/activate && python whisper-server.py");
          console.warn("   4. Check that port 8001 is available");
          return placeholderText;
        } else {
          const placeholderText = "[Audio transcription service unavailable. Please configure a transcription provider.]";
          console.warn("⚠️ Transcription service not available. Returning placeholder text.");
          console.warn("💡 To fix this:");
          console.warn("   1. Set up MLX Whisper server (recommended)");
          console.warn("   2. Use OpenAI Whisper API");
          console.warn("   3. Configure alternative transcription provider");
          return placeholderText;
        }
      }
    } catch (error) {
      this.modelStatus.isConnected = false;
      if (error instanceof Error && error.name === "TimeoutError") {
        const timeoutMessage = `[MLX Whisper transcription timed out after ${this.config.timeout / 1e3}s. The model may be loading for the first time.]`;
        console.error("❌ MLX Whisper timeout:", error.message);
        console.warn("💡 This is normal for the first transcription. The model is loading...");
        console.warn("   - Subsequent transcriptions should be much faster");
        console.warn("   - You can check server logs for progress");
        console.warn("   - Server status: curl http://localhost:8001/v1/health");
        return timeoutMessage;
      }
      const errorMessage = `[Audio transcription failed: ${error instanceof Error ? error.message : "Unknown error"}. Please check MLX Whisper server.]`;
      console.error("❌ Transcription error:", error);
      console.warn("💡 To fix this:");
      console.warn("   1. Check if MLX Whisper server is running: curl http://localhost:8001/v1/health");
      console.warn("   2. Start server: source venv-whisper/bin/activate && python whisper-server.py");
      console.warn("   3. Check server logs for errors");
      return errorMessage;
    }
  }
  async processWithAgent(agentPrompt, userInput, agentType, signal) {
    const messages = [
      { role: "system", content: agentPrompt },
      { role: "user", content: userInput }
    ];
    const modelToUse = agentType && this.config.agentModels?.[agentType] ? this.config.agentModels[agentType] : this.config.processorModel;
    console.log(`🤖 Using model: ${modelToUse} for agent: ${agentType || "default"}`);
    return this.makeRequest({
      model: modelToUse,
      messages,
      temperature: 0.3,
      max_tokens: 4e3
      // Increased for longer medical reports
    }, signal);
  }
  async streamResponse(agentPrompt, userInput, onChunk, onComplete, onError, agentType, signal) {
    const messages = [
      { role: "system", content: agentPrompt },
      { role: "user", content: userInput }
    ];
    const modelToUse = agentType && this.config.agentModels?.[agentType] ? this.config.agentModels[agentType] : this.config.processorModel;
    try {
      const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: modelToUse,
          messages,
          temperature: 0.3,
          max_tokens: 4e3,
          stream: true
        }),
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(this.config.timeout)]) : AbortSignal.timeout(this.config.timeout)
      });
      if (!response.ok) {
        throw new Error(`LMStudio API error: ${response.status} ${response.statusText}`);
      }
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body reader available");
      }
      let fullResponse = "";
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((line) => line.trim());
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullResponse += content;
                  onChunk(content);
                }
              } catch (parseError) {
              }
            }
          }
        }
        onComplete(fullResponse);
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      onError(error);
    }
  }
  async makeRequest(request, signal) {
    const startTime = Date.now();
    let lastError = null;
    console.log("🚀 Starting LMStudio request with 5-minute timeout...");
    const warningTimeout = setTimeout(() => {
      console.warn("⏰ LMStudio request taking longer than 2 minutes - this is normal for complex medical reports");
    }, 12e4);
    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        if (attempt > 0) {
          await this.sleep(this.retryDelays[Math.min(attempt - 1, this.retryDelays.length - 1)]);
        }
        const timeoutSignal = AbortSignal.timeout(this.config.timeout);
        const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
        const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(request),
          signal: combinedSignal
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        console.log("🤖 LMStudio Response Details:", {
          status: response.status,
          model: data.model,
          // Model field may vary by implementation
          choices: data.choices?.length,
          finishReason: data.choices?.[0]?.finish_reason,
          usage: data.usage,
          contentLength: data.choices?.[0]?.message?.content?.length || 0,
          contentPreview: data.choices?.[0]?.message?.content?.substring(0, 100) + "..."
        });
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          console.error("❌ No content in LMStudio response:", data);
          throw new Error("No content in response");
        }
        const finishReason = data.choices?.[0]?.finish_reason;
        if (finishReason === "length") {
          console.warn("⚠️ Response truncated due to max_tokens limit");
        } else if (finishReason === "stop") {
          console.log("ℹ️ Response completed normally");
        } else {
          console.warn("⚠️ Unexpected finish reason:", finishReason);
        }
        console.log("📄 Full response content:", content);
        clearTimeout(warningTimeout);
        this.modelStatus.isConnected = true;
        this.modelStatus.lastPing = Date.now();
        this.modelStatus.latency = Date.now() - startTime;
        console.log(`⏱️ LMStudio request completed in ${Date.now() - startTime}ms`);
        return content.trim();
      } catch (error) {
        lastError = error;
        this.modelStatus.isConnected = false;
      }
    }
    clearTimeout(warningTimeout);
    throw new Error(`LMStudio request failed after ${this.config.retryAttempts + 1} attempts: ${lastError?.message}`);
  }
  getModelStatus() {
    return { ...this.modelStatus };
  }
  async checkTranscriptionService() {
    try {
      const transcriptionUrl = this.config.transcriptionUrl || this.config.baseUrl;
      const response = await fetch(`${transcriptionUrl}/v1/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5e3)
      });
      if (response.ok) {
        const health = await response.json();
        return {
          available: true,
          model: health.model || "Unknown"
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
        error: `Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }
  async checkConnection() {
    try {
      const startTime = Date.now();
      const response = await fetch(`${this.config.baseUrl}/v1/models`, {
        method: "GET",
        signal: AbortSignal.timeout(5e3)
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
      this.modelStatus.isConnected = false;
      this.modelStatus.lastPing = Date.now();
      this.modelStatus.latency = 0;
    }
    try {
      const whisperStatus = await this.whisperServerService.checkServerStatus();
      this.modelStatus.whisperServer = {
        running: whisperStatus.running,
        model: whisperStatus.model || this.config.transcriptionModel,
        lastChecked: whisperStatus.lastChecked,
        error: whisperStatus.error
      };
    } catch (error) {
      console.warn("Failed to check Whisper server status:", error);
      this.modelStatus.whisperServer = {
        running: false,
        model: this.config.transcriptionModel,
        lastChecked: Date.now(),
        error: "Failed to check server status"
      };
    }
    return { ...this.modelStatus };
  }
  async getAvailableModels() {
    try {
      const response = await fetch(`${this.config.baseUrl}/v1/models`, {
        method: "GET",
        signal: AbortSignal.timeout(5e3)
      });
      if (response.ok) {
        const data = await response.json();
        return data.data?.map((model) => model.id) || [];
      }
    } catch (error) {
    }
    return [];
  }
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
  async switchModel(type, modelName) {
    try {
      this.config.processorModel = modelName;
      this.modelStatus.processorModel = modelName;
      const status = await this.checkConnection();
      return status.isConnected;
    } catch (error) {
      console.error(`Failed to switch ${type} model to ${modelName}:`, error);
      return false;
    }
  }
  startHealthCheck() {
    setInterval(async () => {
      await this.checkConnection();
    }, 3e5);
    this.checkConnection();
  }
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
};
__publicField(_LMStudioService, "instance");
let LMStudioService = _LMStudioService;
export {
  LMStudioService as L,
  WhisperServerService as W
};
