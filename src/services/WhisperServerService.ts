export interface ServerStatus {
  running: boolean;
  model?: string;
  port: number;
  error?: string;
  pid?: number;
  lastChecked: number;
}

export class WhisperServerService {
  private static instance: WhisperServerService;
  private serverProcess: number | null = null;
  private readonly port = 8001;
  private readonly healthCheckUrl = `http://localhost:${this.port}/v1/health`;
  
  // Request deduplication cache
  private lastStatusCheckTime = 0;
  private lastStatusResult: ServerStatus | null = null;
  private readonly STATUS_CACHE_TTL = 5000; // 5 seconds cache for faster updates

  private constructor() {}

  public static getInstance(): WhisperServerService {
    if (!WhisperServerService.instance) {
      WhisperServerService.instance = new WhisperServerService();
    }
    return WhisperServerService.instance;
  }

  public async checkServerStatus(skipCache = false): Promise<ServerStatus> {
    const now = Date.now();
    
    // Return cached result if within TTL to prevent excessive requests (unless explicitly skipping cache)
    if (!skipCache && this.lastStatusResult && 
        now - this.lastStatusCheckTime < this.STATUS_CACHE_TTL) {
      console.debug('🔄 Returning cached Whisper server status (within 5s TTL)');
      return { ...this.lastStatusResult };
    }

    try {
      console.debug('🔍 Checking Whisper server status at', this.healthCheckUrl);
      
      const response = await fetch(this.healthCheckUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(3000), // Increased to 3000ms for better detection
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        let model = 'whisper-large-v3-turbo';
        try {
          const healthData = await response.json();
          model = healthData.model || model;
        } catch (jsonError) {
          console.warn('⚠️ Could not parse health response JSON, using default model');
        }

        const result: ServerStatus = {
          running: true,
          model,
          port: this.port,
          lastChecked: now
        };

        console.debug('✅ Whisper server is running:', result);
        
        // Cache the successful result
        this.lastStatusCheckTime = now;
        this.lastStatusResult = result;
        
        return result;
      } else {
        const result: ServerStatus = {
          running: false,
          port: this.port,
          error: `Server responded with status ${response.status}: ${response.statusText}`,
          lastChecked: now
        };

        console.warn('⚠️ Whisper server health check failed:', result.error);
        
        // Cache failed results with shorter TTL
        this.lastStatusCheckTime = now;
        this.lastStatusResult = result;
        
        return result;
      }
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === 'TimeoutError';
      const isNetworkError = error instanceof Error && (
        error.message.includes('fetch') || 
        error.message.includes('network') ||
        error.message.includes('Failed to fetch')
      );

      let errorMessage: string;
      if (isTimeout) {
        errorMessage = 'Connection timeout - server may be starting up';
      } else if (isNetworkError) {
        errorMessage = 'Server not running on localhost:8001';
      } else {
        errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
      }

      const result: ServerStatus = {
        running: false,
        port: this.port,
        error: errorMessage,
        lastChecked: now
      };

      console.warn('❌ Whisper server connection failed:', errorMessage);
      
      // Cache failed results but allow quicker retry for manual checks
      this.lastStatusCheckTime = now;
      this.lastStatusResult = result;
      
      return result;
    }
  }

  public invalidateCache(): void {
    console.debug('🗑️ Invalidating Whisper server status cache');
    this.lastStatusCheckTime = 0;
    this.lastStatusResult = null;
  }

  public async startServer(): Promise<ServerStatus> {
    console.log('🚀 Starting MLX Whisper server...');
    
    // Invalidate cache and check if already running
    this.invalidateCache();
    const status = await this.checkServerStatus(true);
    if (status.running) {
      console.log('✅ MLX Whisper server is already running');
      return status;
    }

    try {
      // Chrome extensions cannot spawn processes directly
      // However, we can try to open a new tab with instructions
      // or provide clear guidance to the user
      
      console.log('🔧 MLX Whisper server not detected');
      console.log('💡 Starting server requires running: ./start-whisper-server.sh');
      
      // Create a helpful notification
      if (chrome.notifications) {
        try {
          await chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('assets/icons/icon-48.png'),
            title: 'MLX Whisper Server Required',
            message: 'Please start the MLX Whisper server by running: ./start-whisper-server.sh'
          });
        } catch (notificationError) {
          console.log('Notification failed:', notificationError);
        }
      }
      
      // Wait a moment and check again in case server was just starting
      setTimeout(async () => {
        await this.checkServerStatus(true);
      }, 2000);
      
      return {
        running: false,
        port: this.port,
        error: 'Server startup requires manual intervention. Please run: ./start-whisper-server.sh',
        lastChecked: Date.now()
      };

    } catch (error) {
      console.error('❌ Failed to start MLX Whisper server:', error);
      return {
        running: false,
        port: this.port,
        error: `Failed to start server: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: Date.now()
      };
    }
  }

  public async ensureServerRunning(): Promise<ServerStatus> {
    const status = await this.checkServerStatus();
    
    if (!status.running) {
      console.log('🔄 MLX Whisper server not running, attempting to start...');
      return await this.startServer();
    }
    
    return status;
  }

  public async waitForServer(maxWaitMs: number = 30000): Promise<ServerStatus> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.checkServerStatus();
      if (status.running) {
        console.log('✅ MLX Whisper server is ready');
        return status;
      }
      
      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return {
      running: false,
      port: this.port,
      error: `Server did not start within ${maxWaitMs/1000} seconds`,
      lastChecked: Date.now()
    };
  }
}
