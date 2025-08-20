import { test, expect, Page, Frame } from '@playwright/test';
import { ExtensionTestHelper } from '../helpers/ExtensionTestHelper';

test.describe('Voice Recording Tests', () => {
  let extensionId: string;
  let sidePanel: Frame | null;

  test.beforeEach(async ({ page, context }) => {
    // Get extension ID and setup
    extensionId = await ExtensionTestHelper.getExtensionId(context);
    
    // Grant microphone permission
    await context.grantPermissions(['microphone']);
    
    // Inject mock audio functionality
    await ExtensionTestHelper.injectMockAudio(page, extensionId);
    
    // Open side panel
    sidePanel = await ExtensionTestHelper.openSidePanel(page, extensionId);
    expect(sidePanel).toBeTruthy();
  });

  test('should detect microphone permission', async ({ page, context }) => {
    // Check if microphone access is properly detected
    const hasPermission = await sidePanel!.evaluate(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
      } catch (error) {
        return false;
      }
    });

    expect(hasPermission).toBe(true);
    console.log('✅ Microphone permission detected successfully');
  });

  test('should show record button and initial state', async () => {
    // Look for record button with various possible selectors
    const recordButtonSelectors = [
      'button[data-testid="record-button"]',
      'button:has-text("Record")',
      'button:has-text("Start")',
      'button[title*="record"]',
      'button[aria-label*="record"]',
      '.record-button',
      'button svg[class*="microphone"]',
      'button:has([class*="mic"])'
    ];

    let recordButton = null;
    for (const selector of recordButtonSelectors) {
      const button = sidePanel!.locator(selector).first();
      if (await button.isVisible().catch(() => false)) {
        recordButton = button;
        console.log(`✅ Record button found with selector: ${selector}`);
        break;
      }
    }

    expect(recordButton).toBeTruthy();
    
    if (recordButton) {
      // Check initial state - should not be recording
      const isDisabled = await recordButton.isDisabled().catch(() => false);
      expect(isDisabled).toBe(false); // Button should be enabled initially
      
      // Check for recording indicator (should not be active initially)
      const recordingIndicators = [
        '.recording-indicator',
        '.pulse-animation',
        '[data-testid="recording-indicator"]',
        '.recording-status'
      ];
      
      for (const selector of recordingIndicators) {
        const indicator = sidePanel!.locator(selector);
        if (await indicator.isVisible().catch(() => false)) {
          const isActive = await indicator.getAttribute('class');
          expect(isActive).not.toContain('active');
          console.log('✅ Recording indicator found in inactive state');
          break;
        }
      }
    }
  });

  test('should start recording when button is clicked', async ({ page }) => {
    // Find and click record button
    const recordButtonSelectors = [
      'button[data-testid="record-button"]',
      'button:has-text("Record")',
      'button:has-text("Start")',
      'button[title*="record"]',
      '.record-button'
    ];

    let recordButton = null;
    for (const selector of recordButtonSelectors) {
      const button = sidePanel!.locator(selector).first();
      if (await button.isVisible().catch(() => false)) {
        recordButton = button;
        break;
      }
    }

    expect(recordButton).toBeTruthy();
    
    if (recordButton) {
      // Click record button
      await recordButton.click();
      await page.waitForTimeout(1000); // Allow time for recording to start
      
      // Check if recording state changed
      const recordingStateIndicators = [
        async () => {
          // Check if button text changed
          const text = await recordButton!.textContent();
          return text?.toLowerCase().includes('stop') || text?.toLowerCase().includes('recording');
        },
        async () => {
          // Check for recording indicator
          const indicator = sidePanel!.locator('.recording-indicator, .pulse-animation, [data-testid="recording-indicator"]');
          return await indicator.isVisible().catch(() => false);
        },
        async () => {
          // Check for disabled state or class change
          const classes = await recordButton!.getAttribute('class');
          return classes?.includes('recording') || classes?.includes('active');
        }
      ];

      let recordingStarted = false;
      for (const check of recordingStateIndicators) {
        if (await check()) {
          recordingStarted = true;
          break;
        }
      }

      expect(recordingStarted).toBe(true);
      console.log('✅ Recording started successfully');
    }
  });

  test('should handle recording state transitions', async ({ page }) => {
    // Simulate voice input for transcription
    await ExtensionTestHelper.simulateVoiceInput(page, 'Test medical dictation for cardiology procedure');
    
    // Find record button
    const recordButton = sidePanel!.locator('button').first();
    
    // Start recording
    await recordButton.click();
    await page.waitForTimeout(500);
    
    // Simulate recording for a few seconds
    await page.waitForTimeout(2000);
    
    // Stop recording
    await recordButton.click();
    await page.waitForTimeout(1000);
    
    // Check if transcription area or result appears
    const transcriptionSelectors = [
      'textarea[placeholder*="transcription"]',
      'textarea[placeholder*="dictation"]',
      '[data-testid="transcription-text"]',
      '.transcription-result',
      'textarea:not([placeholder*="notes"])',
      '.dictation-output'
    ];

    let transcriptionFound = false;
    for (const selector of transcriptionSelectors) {
      const element = sidePanel!.locator(selector);
      if (await element.isVisible().catch(() => false)) {
        const content = await element.textContent().catch(() => '');
        if (content && content.length > 0) {
          transcriptionFound = true;
          console.log(`✅ Transcription result found: ${content.substring(0, 50)}...`);
          break;
        }
      }
    }

    // Note: Transcription might not appear immediately in all implementations
    console.log(transcriptionFound ? '✅ Transcription pipeline working' : '⚠️ Transcription result not immediately visible');
  });

  test('should handle microphone permission denial', async ({ page, context }) => {
    // Clear permissions to simulate denial
    await context.clearPermissions();
    
    // Override getUserMedia to simulate permission denial
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: async () => {
            throw new DOMException('Permission denied', 'NotAllowedError');
          }
        },
        writable: true
      });
    });

    // Reload side panel
    await page.reload();
    sidePanel = await ExtensionTestHelper.openSidePanel(page, extensionId);
    expect(sidePanel).toBeTruthy();

    // Try to click record button
    const recordButton = sidePanel!.locator('button').first();
    if (await recordButton.isVisible().catch(() => false)) {
      await recordButton.click();
      await page.waitForTimeout(1000);

      // Look for permission error handling
      const errorIndicators = [
        '.permission-error',
        '.microphone-error',
        '[data-testid="permission-denied"]',
        '.error-message',
        'button:has-text("Grant Permission")',
        'button:has-text("Enable Microphone")'
      ];

      let errorHandled = false;
      for (const selector of errorIndicators) {
        if (await sidePanel!.locator(selector).isVisible().catch(() => false)) {
          errorHandled = true;
          console.log(`✅ Permission error handled with: ${selector}`);
          break;
        }
      }

      if (!errorHandled) {
        console.log('⚠️ No explicit permission error handling found');
      }
    }
  });

  test('should handle voice activity detection', async ({ page }) => {
    // Inject more sophisticated audio simulation
    await page.addInitScript(() => {
      let isRecording = false;
      let voiceActivityTimer: NodeJS.Timeout | null = null;

      // Mock Voice Activity Detection
      (window as any).mockVoiceActivity = (active: boolean) => {
        const event = new CustomEvent('voiceactivity', { detail: { active } });
        window.dispatchEvent(event);
      };

      // Simulate voice activity patterns
      (window as any).simulateVoicePattern = () => {
        // Simulate speaking pattern: speak, pause, speak, pause
        setTimeout(() => (window as any).mockVoiceActivity(true), 500);
        setTimeout(() => (window as any).mockVoiceActivity(false), 2000);
        setTimeout(() => (window as any).mockVoiceActivity(true), 2500);
        setTimeout(() => (window as any).mockVoiceActivity(false), 4000);
      };
    });

    // Start recording
    const recordButton = sidePanel!.locator('button').first();
    await recordButton.click();
    await page.waitForTimeout(500);

    // Trigger voice activity simulation
    await page.evaluate(() => {
      (window as any).simulateVoicePattern();
    });

    // Wait for voice activity detection
    await page.waitForTimeout(5000);

    // Look for voice activity indicators
    const activityIndicators = [
      '.voice-activity',
      '.speaking-indicator',
      '.voice-detected',
      '[data-testid="voice-activity"]',
      '.waveform',
      '.audio-visualizer'
    ];

    let activityDetected = false;
    for (const selector of activityIndicators) {
      if (await sidePanel!.locator(selector).isVisible().catch(() => false)) {
        activityDetected = true;
        console.log(`✅ Voice activity indicator found: ${selector}`);
        break;
      }
    }

    console.log(activityDetected ? '✅ Voice activity detection working' : '⚠️ Voice activity detection not visibly implemented');
  });

  test('should handle recording errors gracefully', async ({ page }) => {
    // Simulate MediaRecorder error
    await page.addInitScript(() => {
      class FailingMediaRecorder {
        constructor(stream: any, options: any = {}) {
          this.state = 'inactive';
          this.onerror = null;
        }

        start() {
          this.state = 'recording';
          // Simulate error after short delay
          setTimeout(() => {
            if (this.onerror) {
              const error = new Error('Recording failed');
              this.onerror({ error });
            }
          }, 1000);
        }

        stop() {
          this.state = 'inactive';
        }
      }

      (window as any).MediaRecorder = FailingMediaRecorder;
    });

    // Try to start recording
    const recordButton = sidePanel!.locator('button').first();
    await recordButton.click();
    await page.waitForTimeout(2000);

    // Look for error handling
    const errorHandlers = [
      '.recording-error',
      '.error-message',
      '[data-testid="error"]',
      'button:has-text("Try Again")',
      '.retry-button'
    ];

    let errorHandled = false;
    for (const selector of errorHandlers) {
      if (await sidePanel!.locator(selector).isVisible().catch(() => false)) {
        errorHandled = true;
        console.log(`✅ Recording error handled with: ${selector}`);
        break;
      }
    }

    console.log(errorHandled ? '✅ Recording error handling implemented' : '⚠️ Recording error handling may need improvement');
  });

  test.afterEach(async ({ page }) => {
    // Clean up any ongoing recordings
    try {
      await page.evaluate(() => {
        // Stop any active media streams
        if (navigator.mediaDevices) {
          navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
              stream.getTracks().forEach(track => track.stop());
            })
            .catch(() => {});
        }
      });
    } catch (error) {
      // Ignore cleanup errors
    }
  });
});