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

  private constructor() {}

  public static getInstance(): WhisperServerService {
    if (!WhisperServerService.instance) {
      WhisperServerService.instance = new WhisperServerService();
    }
    return WhisperServerService.instance;
  }

  public async checkServerStatus(): Promise<ServerStatus> {
    try {
      const response = await fetch(this.healthCheckUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const health = await response.json();
        return {
          running: true,
          model: health.model || 'whisper-large-v3-turbo',
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
        error: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: Date.now()
      };
    }
  }

  public async startServer(): Promise<ServerStatus> {
    console.log('🚀 Starting MLX Whisper server...');
    
    // Check if already running
    const status = await this.checkServerStatus();
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
            iconUrl: 'assets/icons/icon-48.png',
            title: 'MLX Whisper Server Required',
            message: 'Please start the MLX Whisper server by running: ./start-whisper-server.sh'
          });
        } catch (notificationError) {
          console.log('Notification failed:', notificationError);
        }
      }
      
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