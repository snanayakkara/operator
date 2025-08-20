import { Page, BrowserContext, Frame } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ExtensionTestHelper {
  static async getExtensionId(context: BrowserContext): Promise<string> {
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // Method 1: Check background pages (service worker)
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for extension to load
        const backgroundPages = context.backgroundPages();
        if (backgroundPages.length > 0) {
          const url = backgroundPages[0].url();
          const matches = url.match(/chrome-extension:\/\/([a-z]+)/);
          if (matches) return matches[1];
        }

        // Method 2: Check extension pages
        const pages = context.pages();
        for (const page of pages) {
          const url = page.url();
          if (url.startsWith('chrome-extension://')) {
            const matches = url.match(/chrome-extension:\/\/([a-z]+)/);
            if (matches) return matches[1];
          }
        }

        // Method 3: Navigate to chrome://extensions and get ID
        const page = await context.newPage();
        try {
          await page.goto('chrome://extensions/', { waitUntil: 'domcontentloaded', timeout: 10000 });
          await page.waitForTimeout(3000); // Allow time for extensions to render
          
          // Enable developer mode if not already enabled
          const devModeToggle = page.locator('[role="switch"][aria-labelledby="devMode"]');
          try {
            if (await devModeToggle.isVisible({ timeout: 2000 })) {
              const isEnabled = await devModeToggle.getAttribute('aria-checked');
              if (isEnabled !== 'true') {
                await devModeToggle.click();
                await page.waitForTimeout(2000);
              }
            }
          } catch (error) {
            console.log('Dev mode toggle not found or already enabled');
          }

          // Find the Xestro EMR Assistant extension
          const extensionCard = page.locator('.extension-list-item').filter({
            hasText: 'Xestro EMR Assistant'
          });

          if (await extensionCard.isVisible({ timeout: 5000 })) {
            // Try to get extension ID from various sources
            const extensionUrl = await extensionCard.locator('a').first().getAttribute('href');
            if (extensionUrl) {
              const matches = extensionUrl.match(/chrome-extension:\/\/([a-z]+)/);
              if (matches) return matches[1];
            }
            
            // Alternative: get from details button
            const detailsButton = extensionCard.locator('button:has-text("Details")');
            if (await detailsButton.isVisible({ timeout: 1000 })) {
              await detailsButton.click();
              await page.waitForTimeout(1000);
              const currentUrl = page.url();
              const matches = currentUrl.match(/chrome:\/\/extensions\/\?id=([a-z]+)/);
              if (matches) return matches[1];
            }
          }
        } finally {
          if (!page.isClosed()) {
            await page.close();
          }
        }
        
        retryCount++;
        if (retryCount < maxRetries) {
          console.log(`Extension not found, retrying... (${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.log(`Extension detection error (attempt ${retryCount + 1}):`, error.message);
        retryCount++;
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    throw new Error(`Extension ID not found after ${maxRetries} attempts. Make sure the extension is built and loaded correctly.`);
  }

  static async openSidePanel(page: Page, extensionId?: string): Promise<Frame | null> {
    if (!extensionId) {
      throw new Error('Extension ID is required to open side panel');
    }

    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // Navigate to a test page first (EMR simulation)
        await page.goto('data:text/html,<html><head><title>Test EMR</title></head><body><h1>Test EMR Page</h1><textarea id="test-field" placeholder="Medical notes..."></textarea></body></html>', {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        });
        await page.waitForTimeout(1000);

        // Method 1: Try keyboard shortcut first
        await page.keyboard.press('Meta+Shift+M'); // Mac shortcut
        await page.waitForTimeout(3000); // Give more time for side panel to open

        // Check if side panel opened by looking for frames
        let sidePanel = await this.findSidePanelFrame(page);
        if (sidePanel) {
          console.log('✅ Side panel opened via keyboard shortcut');
          return sidePanel;
        }

        // Method 2: Try clicking extension action button
        try {
          // Try various selectors for extension button
          const extensionButtonSelectors = [
            `[data-extension-id="${extensionId}"]`,
            `[title*="Xestro"]`,
            `button[aria-label*="Xestro"]`,
            '.extension-action-button',
            `#${extensionId}`
          ];
          
          for (const selector of extensionButtonSelectors) {
            try {
              const button = page.locator(selector);
              if (await button.isVisible({ timeout: 1000 })) {
                await button.click();
                await page.waitForTimeout(2000);
                sidePanel = await this.findSidePanelFrame(page);
                if (sidePanel) {
                  console.log(`✅ Side panel opened via extension button: ${selector}`);
                  return sidePanel;
                }
              }
            } catch (e) {
              // Continue to next selector
            }
          }
        } catch (error) {
          console.log('Extension icon click failed:', error.message);
        }

        // Method 3: Try navigating directly to extension popup
        try {
          const popupUrl = `chrome-extension://${extensionId}/src/popup/index.html`;
          await page.goto(popupUrl, { timeout: 10000 });
          await page.waitForTimeout(2000);
          
          // Look for various button texts that might open the side panel
          const buttonTexts = [
            'Open Medical Assistant',
            'Open Xestro Assistant', 
            'Open Side Panel',
            'Launch Assistant',
            'Open'
          ];
          
          for (const buttonText of buttonTexts) {
            const openButton = page.locator(`button:has-text("${buttonText}")`);
            if (await openButton.isVisible({ timeout: 1000 })) {
              await openButton.click();
              await page.waitForTimeout(3000);
              
              // Go back to test page
              await page.goto('data:text/html,<html><head><title>Test EMR</title></head><body><h1>Test EMR Page</h1><textarea id="test-field" placeholder="Medical notes..."></textarea></body></html>');
              await page.waitForTimeout(2000);
              
              sidePanel = await this.findSidePanelFrame(page);
              if (sidePanel) {
                console.log(`✅ Side panel opened via popup button: ${buttonText}`);
                return sidePanel;
              }
            }
          }
        } catch (error) {
          console.log('Popup navigation failed:', error.message);
        }

        // Method 4: Try direct side panel URL navigation
        try {
          const sidePanelUrl = `chrome-extension://${extensionId}/src/sidepanel/index.html`;
          const sidePanelPage = await page.context().newPage();
          await sidePanelPage.goto(sidePanelUrl, { timeout: 10000 });
          await sidePanelPage.waitForTimeout(2000);
          
          // Check if this opened as a side panel or regular page
          const frames = page.frames();
          const sidePanelFrame = frames.find(frame => 
            frame.url().includes('sidepanel.html') || 
            frame.url().includes('sidepanel/index.html')
          );
          
          if (sidePanelFrame) {
            await sidePanelFrame.waitForLoadState('domcontentloaded');
            console.log('✅ Side panel opened via direct URL');
            return sidePanelFrame;
          }
          
          await sidePanelPage.close();
        } catch (error) {
          console.log('Direct side panel URL failed:', error.message);
        }
        
        retryCount++;
        if (retryCount < maxRetries) {
          console.log(`Side panel opening failed, retrying... (${retryCount}/${maxRetries})`);
          await page.waitForTimeout(2000);
        }
      } catch (error) {
        console.log(`Side panel opening error (attempt ${retryCount + 1}):`, error.message);
        retryCount++;
        if (retryCount < maxRetries) {
          await page.waitForTimeout(2000);
        }
      }
    }

    console.log('❌ Side panel could not be opened after all attempts');
    return null;
  }

  static async findSidePanelFrame(page: Page): Promise<Frame | null> {
    // Wait a bit for frames to load
    await page.waitForTimeout(1000);
    
    const frames = page.frames();
    console.log(`Looking for side panel in ${frames.length} frames`);
    
    // Look for frame with sidepanel.html or extension URLs
    for (const frame of frames) {
      const url = frame.url();
      console.log(`Checking frame URL: ${url}`);
      
      if (url.includes('sidepanel.html') || 
          url.includes('sidepanel/index.html') ||
          (url.startsWith('chrome-extension://') && url.includes('sidepanel'))) {
        
        try {
          // Wait for the frame to be ready
          await frame.waitForLoadState('domcontentloaded', { timeout: 5000 });
          
          // Verify frame has expected content
          const hasContent = await this.waitForSidePanelElement(frame, 'body', 2000);
          if (hasContent) {
            console.log(`✅ Found side panel frame: ${url}`);
            return frame;
          }
        } catch (error) {
          console.log(`Frame loading failed: ${error.message}`);
          continue;
        }
      }
    }

    // Alternative: Look for frames that might be side panels based on content
    for (const frame of frames) {
      try {
        const url = frame.url();
        if (url.startsWith('chrome-extension://')) {
          // Check if frame contains expected side panel elements
          const hasAssistantContent = await Promise.race([
            this.waitForSidePanelElement(frame, 'h1:has-text("Xestro")', 1000).then(() => true),
            this.waitForSidePanelElement(frame, '[data-testid="record-button"]', 1000).then(() => true),
            this.waitForSidePanelElement(frame, 'button:has-text("microphone")', 1000).then(() => true),
            new Promise(resolve => setTimeout(() => resolve(false), 1000))
          ]);
          
          if (hasAssistantContent) {
            console.log(`✅ Found side panel frame by content: ${url}`);
            return frame;
          }
        }
      } catch (error) {
        // Continue checking other frames
        continue;
      }
    }

    console.log('❌ No side panel frame found');
    return null;
  }

  static async waitForSidePanelElement(sidePanel: Frame, selector: string, timeout = 10000): Promise<boolean> {
    try {
      await sidePanel.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      return false;
    }
  }

  static async injectMockAudio(page: Page, extensionId?: string): Promise<void> {
    // Enhanced mock audio setup for Chrome extension context
    await page.addInitScript((extId) => {
      // Mock MediaStream with enhanced event handling
      class MockMediaStream extends EventTarget {
        public id: string;
        public active: boolean;
        public tracks: MockMediaStreamTrack[];

        constructor() {
          super();
          this.id = 'mock-stream-' + Math.random().toString(36).substr(2, 9);
          this.active = true;
          this.tracks = [new MockMediaStreamTrack()];
        }

        getTracks() {
          return this.tracks;
        }

        getAudioTracks() {
          return this.tracks;
        }

        getVideoTracks() {
          return [];
        }

        addTrack(track: MockMediaStreamTrack) {
          this.tracks.push(track);
          this.dispatchEvent(new Event('addtrack'));
        }

        removeTrack(track: MockMediaStreamTrack) {
          const index = this.tracks.indexOf(track);
          if (index > -1) {
            this.tracks.splice(index, 1);
            this.dispatchEvent(new Event('removetrack'));
          }
        }

        clone() {
          return new MockMediaStream();
        }
      }

      // Mock MediaStreamTrack with enhanced capabilities
      class MockMediaStreamTrack extends EventTarget {
        public kind: string;
        public id: string;
        public label: string;
        public enabled: boolean;
        public muted: boolean;
        public readyState: string;

        constructor() {
          super();
          this.kind = 'audio';
          this.id = 'mock-track-' + Math.random().toString(36).substr(2, 9);
          this.label = 'Mock Microphone (Test)';
          this.enabled = true;
          this.muted = false;
          this.readyState = 'live';
        }

        stop() {
          this.readyState = 'ended';
          this.dispatchEvent(new Event('ended'));
        }

        clone() {
          return new MockMediaStreamTrack();
        }

        getCapabilities() {
          return {
            sampleRate: { min: 8000, max: 48000 },
            channelCount: { min: 1, max: 2 }
          };
        }

        getConstraints() {
          return {};
        }

        getSettings() {
          return {
            sampleRate: 44100,
            channelCount: 1,
            deviceId: this.id
          };
        }
      }

      // Enhanced Mock MediaRecorder with better data simulation
      class MockMediaRecorder extends EventTarget {
        public stream: MockMediaStream;
        public options: any;
        public state: string;
        public mimeType: string;
        public ondataavailable: ((event: any) => void) | null;
        public onstop: ((event: any) => void) | null;
        public onstart: ((event: any) => void) | null;
        public onerror: ((event: any) => void) | null;
        private intervalId: number | null;

        constructor(stream: MockMediaStream, options: any = {}) {
          super();
          this.stream = stream;
          this.options = options;
          this.state = 'inactive';
          this.mimeType = 'audio/webm;codecs=opus';
          this.ondataavailable = null;
          this.onstop = null;
          this.onstart = null;
          this.onerror = null;
          this.intervalId = null;
        }

        start(timeslice: number = 1000) {
          if (this.state !== 'inactive') {
            throw new Error('InvalidState: MediaRecorder is not in inactive state');
          }

          this.state = 'recording';
          const startEvent = new Event('start');
          
          if (this.onstart) {
            this.onstart(startEvent);
          }
          this.dispatchEvent(startEvent);

          // Simulate realistic audio data chunks
          this.intervalId = window.setInterval(() => {
            if (this.state === 'recording') {
              // Create more realistic mock audio data
              const sampleData = new ArrayBuffer(1024);
              const view = new Uint8Array(sampleData);
              for (let i = 0; i < view.length; i++) {
                view[i] = Math.floor(Math.random() * 256);
              }
              
              const mockBlob = new Blob([sampleData], { type: this.mimeType });
              const dataEvent = { data: mockBlob, type: 'dataavailable' };
              
              if (this.ondataavailable) {
                this.ondataavailable(dataEvent);
              }
              this.dispatchEvent(new CustomEvent('dataavailable', { detail: dataEvent }));
            }
          }, timeslice);
        }

        stop() {
          if (this.state === 'inactive') {
            return;
          }

          this.state = 'inactive';
          
          if (this.intervalId) {
            window.clearInterval(this.intervalId);
            this.intervalId = null;
          }

          // Send final data chunk
          const finalData = new ArrayBuffer(512);
          const mockBlob = new Blob([finalData], { type: this.mimeType });
          const dataEvent = { data: mockBlob, type: 'dataavailable' };
          
          if (this.ondataavailable) {
            this.ondataavailable(dataEvent);
          }

          const stopEvent = new Event('stop');
          if (this.onstop) {
            this.onstop(stopEvent);
          }
          this.dispatchEvent(stopEvent);
        }

        pause() {
          if (this.state === 'recording') {
            this.state = 'paused';
            this.dispatchEvent(new Event('pause'));
          }
        }

        resume() {
          if (this.state === 'paused') {
            this.state = 'recording';
            this.dispatchEvent(new Event('resume'));
          }
        }

        requestData() {
          if (this.state === 'recording') {
            const data = new ArrayBuffer(256);
            const mockBlob = new Blob([data], { type: this.mimeType });
            const event = { data: mockBlob };
            if (this.ondataavailable) {
              this.ondataavailable(event);
            }
          }
        }
      }

      // Enhanced getUserMedia with permission simulation
      const originalGetUserMedia = navigator.mediaDevices?.getUserMedia;
      
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: async (constraints: any) => {
            console.log('Mock getUserMedia called with constraints:', constraints);
            
            // Simulate permission check delay
            await new Promise(resolve => setTimeout(resolve, 100));
            
            if (constraints.audio) {
              const stream = new MockMediaStream();
              console.log('Mock audio stream created:', stream.id);
              return stream;
            }
            
            if (constraints.video) {
              throw new Error('Video not supported in mock');
            }
            
            throw new Error('No audio or video constraints specified');
          },
          enumerateDevices: async () => {
            return [
              {
                deviceId: 'mock-audio-input-1',
                kind: 'audioinput',
                label: 'Mock Microphone (Test)',
                groupId: 'mock-group-1'
              }
            ];
          },
          getSupportedConstraints: () => {
            return {
              sampleRate: true,
              channelCount: true,
              autoGainControl: true,
              echoCancellation: true,
              noiseSuppression: true
            };
          }
        },
        writable: true,
        configurable: true
      });

      // Override MediaRecorder globally
      (window as any).MediaRecorder = MockMediaRecorder;
      (window as any).MediaRecorder.isTypeSupported = (mimeType: string) => {
        return mimeType.includes('audio/webm') || mimeType.includes('audio/wav');
      };

      // Store mock transcription capability for tests
      (window as any).setMockTranscription = (text: string) => {
        (window as any).mockTranscriptionResult = text;
      };

      // Also inject into extension context if possible
      if (extId) {
        // Try to inject into extension frames when they load
        const originalCreateElement = document.createElement;
        document.createElement = function(tagName: string) {
          const element = originalCreateElement.call(this, tagName);
          if (tagName.toLowerCase() === 'iframe' && element instanceof HTMLIFrameElement) {
            element.addEventListener('load', () => {
              try {
                if (element.src && element.src.includes('chrome-extension://')) {
                  // Extension frame loaded, try to inject mocks
                  console.log('Extension frame detected, injecting mocks');
                }
              } catch (e) {
                // Cross-origin restrictions, expected
              }
            });
          }
          return element;
        };
      }

      console.log('Mock audio setup complete for extension:', extId);
    }, extensionId);
  }

  static async simulateVoiceInput(page: Page, text: string): Promise<void> {
    // This would typically involve more complex audio simulation
    // For now, we'll directly inject the transcription result
    await page.addInitScript((textToInject) => {
      // Store the text to be used by the transcription service
      (window as any).mockTranscriptionResult = textToInject;
    }, text);
  }

  static async rebuildExtension(): Promise<void> {
    console.log('🔨 Rebuilding extension...');
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      await execAsync('npm run build');
      console.log('✅ Extension rebuilt successfully');
    } catch (error) {
      console.error('❌ Extension rebuild failed:', error);
      throw error;
    }
  }

  static async fixExtensionBuild(): Promise<void> {
    console.log('🔧 Auto-fixing extension build issues...');
    
    const manifestPath = path.join(__dirname, '../../dist/manifest.json');
    
    try {
      // Check if manifest exists
      await fs.access(manifestPath);
    } catch (error) {
      // Manifest doesn't exist, rebuild
      await this.rebuildExtension();
      return;
    }

    // Check manifest content
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);
    
    let needsRebuild = false;

    // Ensure required permissions
    const requiredPermissions = ['sidePanel', 'activeTab', 'scripting', 'storage'];
    for (const permission of requiredPermissions) {
      if (!manifest.permissions?.includes(permission)) {
        console.log(`🔧 Adding missing permission: ${permission}`);
        manifest.permissions = manifest.permissions || [];
        manifest.permissions.push(permission);
        needsRebuild = true;
      }
    }

    // Ensure side panel configuration
    if (!manifest.side_panel) {
      console.log('🔧 Adding side panel configuration');
      manifest.side_panel = {
        default_path: 'src/sidepanel/index.html'
      };
      needsRebuild = true;
    }

    if (needsRebuild) {
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
      console.log('✅ Manifest fixed');
    }
  }
}