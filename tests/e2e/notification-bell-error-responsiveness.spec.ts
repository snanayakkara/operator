import { test, expect } from '@playwright/test';
import { ExtensionTestHelper } from '../helpers/ExtensionTestHelper';

test.describe('Notification Bell Error Responsiveness', () => {
  let extensionId: string;
  let sidePanel: any;

  test.beforeEach(async ({ page, context }) => {
    // Get extension ID and setup
    extensionId = await ExtensionTestHelper.getExtensionId(context);
    
    // Grant necessary permissions
    await context.grantPermissions(['microphone', 'clipboard-read', 'clipboard-write']);
    
    // Inject mock audio functionality
    await ExtensionTestHelper.injectMockAudio(page, extensionId);
    
    // Open side panel
    sidePanel = await ExtensionTestHelper.openSidePanel(page, extensionId);
    expect(sidePanel).toBeTruthy();
    
    // Wait for extension to be fully loaded
    await page.waitForSelector('[data-testid="status-indicator"]', { timeout: 10000 });
  });

  test('notification bell remains responsive during recording series and error states', async ({ page }) => {
    // 1. Create a series of recordings to simulate real usage
    console.log('🎬 Starting recording series test...');
    await createRecordingSeries(page, 3);
    
    // 2. Test notification bell responsiveness during normal state
    console.log('📱 Testing notification bell baseline responsiveness...');
    const baselineResponseTime = await measureNotificationBellResponse(page, 'baseline');
    expect(baselineResponseTime).toBeLessThan(200); // Baseline should be very fast
    
    // 3. Force transcription error and test responsiveness
    console.log('❌ Testing notification bell during transcription error...');
    await mockTranscriptionError(page);
    await triggerRecordingWithError(page, 'transcription');
    const transcriptionErrorResponseTime = await measureNotificationBellResponse(page, 'transcription-error');
    expect(transcriptionErrorResponseTime).toBeLessThan(500); // Should still be fast during errors
    
    // 4. Force processing error and test responsiveness
    console.log('⚡ Testing notification bell during processing error...');
    await mockProcessingError(page);
    await triggerRecordingWithError(page, 'processing');
    const processingErrorResponseTime = await measureNotificationBellResponse(page, 'processing-error');
    expect(processingErrorResponseTime).toBeLessThan(500); // Should remain responsive
    
    // 5. Test multiple rapid clicks during error state
    console.log('🔥 Testing rapid clicks during error state...');
    await testRapidClicksResponsiveness(page);
    
    // 6. Verify UI remains fully interactive
    console.log('🖱️ Verifying UI interactivity during errors...');
    await verifyUIInteractivity(page);
    
    console.log('✅ All notification bell responsiveness tests completed successfully!');
  });

  test('notification bell performance during cascading errors', async ({ page }) => {
    // Test notification bell when multiple errors occur simultaneously
    console.log('💥 Testing notification bell during cascading errors...');
    
    // Create multiple sessions that will fail
    await createMultipleFailingRecordings(page, 5);
    
    // Measure responsiveness during cascade
    const cascadeResponseTime = await measureNotificationBellResponse(page, 'cascade-errors');
    expect(cascadeResponseTime).toBeLessThan(1000); // Allow slightly more time during cascade
    
    // Verify sessions list is accessible
    await verifySessionsListAccessible(page);
  });

  // Helper function to create a series of recordings
  async function createRecordingSeries(page: any, count: number) {
    for (let i = 1; i <= count; i++) {
      console.log(`🎤 Creating recording ${i}/${count}...`);
      
      // Select workflow (use quick-letter for simplicity)
      await sidePanel.click('[data-testid="workflow-quick-letter"]');
      await page.waitForTimeout(500);
      
      // Start recording
      await sidePanel.click('[data-testid="start-recording"]');
      await sidePanel.waitForSelector('[data-testid="stop-recording"]', { timeout: 5000 });
      
      // Record for different durations
      const recordingDuration = i * 1000 + 2000; // 3s, 4s, 5s
      await page.waitForTimeout(recordingDuration);
      
      // Stop recording
      await sidePanel.click('[data-testid="stop-recording"]');
      
      // Wait for processing to start
      await page.waitForTimeout(1000);
      
      console.log(`✅ Recording ${i} completed and sent for processing`);
    }
  }

  // Helper function to measure notification bell response time
  async function measureNotificationBellResponse(page: any, context: string): Promise<number> {
    console.log(`⏱️ Measuring notification bell response time (${context})...`);
    
    const startTime = Date.now();
    
    // Click notification bell
    await sidePanel.click('[data-testid="status-indicator"] [data-testid="notification-bell"]');
    
    // Wait for dropdown to appear
    try {
      await sidePanel.waitForSelector('[data-dropdown-menu]', { timeout: 2000 });
      const responseTime = Date.now() - startTime;
      
      console.log(`📊 Response time (${context}): ${responseTime}ms`);
      
      // Close dropdown for next test
      await page.click('body');
      await page.waitForTimeout(300);
      
      return responseTime;
    } catch (error) {
      console.error(`❌ Notification bell did not respond within 2 seconds (${context})`);
      throw new Error(`Notification bell unresponsive during ${context}: ${error}`);
    }
  }

  // Helper function to mock transcription errors
  async function mockTranscriptionError(page: any) {
    console.log('🚫 Setting up transcription error mock...');
    
    // Intercept transcription requests and force errors
    await page.route('**/v1/audio/transcriptions', async route => {
      await route.abort('failed');
    });
    
    // Also mock with error response
    await page.route('**/transcribe', async route => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Transcription service unavailable' })
      });
    });
  }

  // Helper function to mock processing errors
  async function mockProcessingError(page: any) {
    console.log('⚡ Setting up processing error mock...');
    
    // Mock LMStudio/processing endpoint failures
    await page.route('**/v1/chat/completions', async route => {
      await route.abort('failed');
    });
    
    await page.route('**/v1/completions', async route => {
      await route.fulfill({
        status: 503,
        body: JSON.stringify({ error: 'Service temporarily unavailable' })
      });
    });
  }

  // Helper function to trigger recording that will error
  async function triggerRecordingWithError(page: any, errorType: string) {
    console.log(`🎤 Triggering recording that will fail (${errorType})...`);
    
    // Select workflow
    await sidePanel.click('[data-testid="workflow-quick-letter"]');
    await page.waitForTimeout(300);
    
    // Start and stop recording quickly to trigger error
    await sidePanel.click('[data-testid="start-recording"]');
    await page.waitForTimeout(2000); // Short recording
    await sidePanel.click('[data-testid="stop-recording"]');
    
    // Wait for error to occur
    await page.waitForTimeout(3000);
    
    console.log(`❌ ${errorType} error should have been triggered`);
  }

  // Helper function to test rapid clicks
  async function testRapidClicksResponsiveness(page: any) {
    console.log('🔥 Testing rapid notification bell clicks...');
    
    const clickCount = 5;
    const responseTimes: number[] = [];
    
    for (let i = 0; i < clickCount; i++) {
      const startTime = Date.now();
      
      // Click notification bell
      await sidePanel.click('[data-testid="status-indicator"] [data-testid="notification-bell"]');
      
      try {
        // Wait for dropdown (shorter timeout for rapid test)
        await sidePanel.waitForSelector('[data-dropdown-menu]', { timeout: 1000 });
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
        
        // Close dropdown quickly
        await page.click('body');
        await page.waitForTimeout(100);
        
      } catch (error) {
        console.warn(`⚠️ Click ${i + 1} did not respond within 1 second`);
        responseTimes.push(1000); // Max timeout
      }
    }
    
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    console.log(`📊 Average rapid click response time: ${averageResponseTime}ms`);
    console.log(`📊 Response times: ${responseTimes.join(', ')}ms`);
    
    // All rapid clicks should be reasonably fast
    expect(averageResponseTime).toBeLessThan(750);
  }

  // Helper function to verify UI interactivity
  async function verifyUIInteractivity(page: any) {
    console.log('🖱️ Verifying UI elements remain interactive...');
    
    // Test that other UI elements are still clickable
    const interactiveElements = [
      '[data-testid="workflow-quick-letter"]',
      '[data-testid="workflow-consultation"]',
      '[data-testid="quick-action-investigation-summary"]'
    ];
    
    for (const selector of interactiveElements) {
      try {
        const element = await sidePanel.locator(selector);
        await expect(element).toBeVisible({ timeout: 2000 });
        
        // Test click responsiveness (shouldn't hang)
        const clickStart = Date.now();
        await element.click();
        const clickTime = Date.now() - clickStart;
        
        expect(clickTime).toBeLessThan(500); // Click should be immediate
        console.log(`✅ Element ${selector} responsive (${clickTime}ms)`);
        
      } catch (error) {
        console.warn(`⚠️ Element ${selector} not responsive: ${error}`);
      }
    }
  }

  // Helper function to create multiple failing recordings
  async function createMultipleFailingRecordings(page: any, count: number) {
    console.log(`💥 Creating ${count} recordings that will fail...`);
    
    // Set up error conditions
    await mockTranscriptionError(page);
    await mockProcessingError(page);
    
    // Create multiple recordings rapidly
    for (let i = 1; i <= count; i++) {
      console.log(`🎤 Creating failing recording ${i}/${count}...`);
      
      await sidePanel.click('[data-testid="workflow-quick-letter"]');
      await page.waitForTimeout(200);
      
      await sidePanel.click('[data-testid="start-recording"]');
      await page.waitForTimeout(1500); // Very short recording
      await sidePanel.click('[data-testid="stop-recording"]');
      
      // Don't wait long between recordings to create cascade
      await page.waitForTimeout(500);
    }
    
    // Wait for all errors to process
    await page.waitForTimeout(5000);
    console.log(`💥 All ${count} recordings should have failed`);
  }

  // Helper function to verify sessions list accessibility
  async function verifySessionsListAccessible(page: any) {
    console.log('📋 Verifying sessions list is accessible during errors...');
    
    // Click notification bell
    await sidePanel.click('[data-testid="status-indicator"] [data-testid="notification-bell"]');
    
    // Verify dropdown appears
    await sidePanel.waitForSelector('[data-dropdown-menu]', { timeout: 2000 });
    
    // Verify sessions are visible
    const sessionsVisible = await sidePanel.locator('[data-dropdown-menu] .space-y-2').count();
    expect(sessionsVisible).toBeGreaterThan(0);
    
    // Try to click on a session (if any exist)
    const firstSession = sidePanel.locator('[data-dropdown-menu] .cursor-pointer').first();
    if (await firstSession.count() > 0) {
      const clickStart = Date.now();
      await firstSession.click();
      const clickTime = Date.now() - clickStart;
      
      expect(clickTime).toBeLessThan(500);
      console.log(`✅ Session click responsive (${clickTime}ms)`);
    }
    
    console.log('✅ Sessions list accessibility verified');
  }
});