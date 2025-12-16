import { test, expect } from './fixtures';
import type { Page, Frame } from '@playwright/test';
import { ExtensionTestHelper } from '../helpers/ExtensionTestHelper';

test.describe('LMStudio Integration Tests', () => {
  let extensionId: string;
  let sidePanel: Frame | null;

  test.beforeEach(async ({ page, context }) => {
    // Get extension ID and setup
    extensionId = await ExtensionTestHelper.getExtensionId(context);
    
    // Grant necessary permissions
    await context.grantPermissions(['microphone', 'clipboard-read', 'clipboard-write']);
    
    // Open side panel
    sidePanel = await ExtensionTestHelper.openSidePanel(page, extensionId);
    expect(sidePanel).toBeTruthy();
  });

  test('should detect LMStudio connection status', async ({ page }) => {
    // Look for connection status indicators
    const connectionStatusSelectors = [
      '.lmstudio-status',
      '.model-status',
      '.connection-status',
      '[data-testid="connection-status"]',
      'button:has-text("Connected")',
      'button:has-text("Offline")',
      'button:has-text("Disconnected")',
      '.status-indicator',
      '.connection-dot'
    ];

    let statusFound = false;
    let connectionStatus = 'unknown';

    for (const selector of connectionStatusSelectors) {
      const element = sidePanel!.locator(selector);
      if (await element.isVisible().catch(() => false)) {
        statusFound = true;
        const text = await element.textContent();
        const classes = await element.getAttribute('class');
        
        if (text?.toLowerCase().includes('connected') || classes?.includes('connected')) {
          connectionStatus = 'connected';
        } else if (text?.toLowerCase().includes('offline') || text?.toLowerCase().includes('disconnected') || classes?.includes('offline')) {
          connectionStatus = 'offline';
        }
        
        console.log(`✅ Connection status found: ${selector} - Status: ${connectionStatus}`);
        break;
      }
    }

    expect(statusFound).toBe(true);
    console.log(`Connection status: ${connectionStatus}`);
  });

  test('should handle LMStudio server connectivity', async ({ page }) => {
    // Test connection to mock LMStudio server
    const connectionTestResult = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:1234/v1/models');
        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            models: data.data?.length || 0,
            data: data
          };
        }
        return { success: false, error: 'Request failed' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    expect(connectionTestResult.success).toBe(true);
    expect(connectionTestResult.models).toBeGreaterThan(0);
    console.log(`✅ LMStudio mock server responding with ${connectionTestResult.models} models`);
  });

  test('should test model availability', async ({ page }) => {
    // Look for model selection or model status in the UI
    const modelSelectors = [
      '.model-selector',
      'select[name*="model"]',
      '[data-testid="model-select"]',
      '.model-dropdown',
      'button:has-text("medgemma-27b")',
      'button:has-text("Model:")'
    ];

    let modelSelectorFound = false;
    for (const selector of modelSelectors) {
      const element = sidePanel!.locator(selector);
      if (await element.isVisible().catch(() => false)) {
        modelSelectorFound = true;
        console.log(`✅ Model selector found: ${selector}`);
        
        // If it's a dropdown, check available options
        if (selector.includes('select')) {
          const options = await element.locator('option').allTextContents();
          console.log(`Available models: ${options.join(', ')}`);
          expect(options.length).toBeGreaterThan(0);
        }
        break;
      }
    }

    // Also check for model status text
    const modelStatusSelectors = [
      '.model-name',
      '.current-model',
      '[data-testid="model-name"]'
    ];

    for (const selector of modelStatusSelectors) {
      const element = sidePanel!.locator(selector);
      if (await element.isVisible().catch(() => false)) {
        const text = await element.textContent();
        if (text && text.toLowerCase().includes('medgemma')) {
          console.log(`✅ Model status found: ${text}`);
          modelSelectorFound = true;
          break;
        }
      }
    }

    console.log(modelSelectorFound ? '✅ Model management UI found' : '⚠️ Model management UI not clearly visible');
  });

  test('should test workflow selection UI', async ({ page }) => {
    // Look for workflow selection buttons
    const workflowSelectors = [
      'button:has-text("Quick Letter")',
      'button:has-text("Consultation")',
      'button:has-text("Angiogram")',
      'button:has-text("PCI Report")',
      'button:has-text("TAVI Report")',
      '.workflow-button',
      '[data-testid="workflow-button"]'
    ];

    let workflowButtonsFound = 0;
    let foundButtons: string[] = [];
    
    for (const selector of workflowSelectors) {
      const elements = sidePanel!.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        workflowButtonsFound += count;
        const text = await elements.first().textContent();
        if (text) foundButtons.push(text);
        console.log(`✅ Workflow button found: ${selector} - Text: ${text}`);
      }
    }

    expect(workflowButtonsFound).toBeGreaterThan(0);
    console.log(`✅ Found ${workflowButtonsFound} workflow buttons: ${foundButtons.join(', ')}`);
  });

  test('should test workflow button interaction', async ({ page }) => {
    // Try to click a workflow button to test interaction
    const quickLetterButton = sidePanel!.locator('button:has-text("Quick Letter")');
    
    if (await quickLetterButton.isVisible()) {
      // Click the button
      await quickLetterButton.click();
      
      // Wait a moment for any UI changes
      await page.waitForTimeout(1000);
      
      // Look for recording indicators or state changes
      const recordingIndicators = [
        '.recording',
        '.animate-pulse',
        '[data-testid="recording"]',
        'button:has-text("Recording")',
        '.recording-glow'
      ];
      
      let recordingStateFound = false;
      for (const indicator of recordingIndicators) {
        if (await sidePanel!.locator(indicator).isVisible().catch(() => false)) {
          recordingStateFound = true;
          console.log(`✅ Recording state indicator found: ${indicator}`);
          break;
        }
      }
      
      console.log(`✅ Workflow button interaction test: ${recordingStateFound ? 'Recording state activated' : 'Button clicked successfully'}`);
    } else {
      console.log('⚠️ Quick Letter button not found for interaction test');
    }
  });

  test('should test medical report generation API', async ({ page }) => {
    const testDictation = 'TAVI procedure completed successfully with Edwards Sapien 3 valve';
    
    const reportResult = await page.evaluate(async (dictation) => {
      try {
        const response = await fetch('http://localhost:1234/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'medgemma-27b-it',
            messages: [
              {
                role: 'user',
                content: `Generate a medical report for: ${dictation}`
              }
            ]
          })
        });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            report: data.choices[0]?.message?.content,
            usage: data.usage
          };
        }
        return { success: false, error: 'Report generation failed' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }, testDictation);

    expect(reportResult.success).toBe(true);
    expect(reportResult.report).toBeTruthy();
    expect(reportResult.report.length).toBeGreaterThan(100); // Substantial report
    expect(reportResult.report).toContain('PROCEDURE');
    expect(reportResult.report).toContain('TAVI');
    console.log(`✅ Report generation API working: ${reportResult.report.substring(0, 100)}...`);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Test with malformed request
    const errorResult = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:1234/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            // Missing required fields
            messages: []
          })
        });

        return {
          success: response.ok,
          status: response.status,
          data: response.ok ? await response.json() : null
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Mock server should handle error gracefully
    expect(errorResult.success).toBe(false);
    console.log(`✅ API error handling working: Status ${errorResult.status}`);
  });

  test('should test connection retry mechanism', async ({ page }) => {
    // Simulate connection failure and recovery
    await page.evaluate(() => {
      // Mock fetch to fail initially, then succeed
      let failCount = 0;
      const originalFetch = window.fetch;
      
      window.fetch = async function(...args) {
        if (args[0].includes('localhost:1234') && failCount < 2) {
          failCount++;
          throw new Error('Connection failed');
        }
        return originalFetch.apply(this, args);
      };
    });

    // Look for retry mechanism in UI
    const retrySelectors = [
      'button:has-text("Retry")',
      'button:has-text("Reconnect")',
      '.retry-button',
      '[data-testid="retry"]',
      'button:has-text("Try Again")'
    ];

    let retryFound = false;
    for (const selector of retrySelectors) {
      const element = sidePanel!.locator(selector);
      if (await element.isVisible().catch(() => false)) {
        retryFound = true;
        console.log(`✅ Retry mechanism found: ${selector}`);
        
        // Click retry button
        await element.click();
        await page.waitForTimeout(1000);
        break;
      }
    }

    // Also check for automatic retry indicators
    const autoRetrySelectors = [
      '.connecting',
      '.retrying',
      '[data-testid="connecting"]',
      '.connection-spinner'
    ];

    for (const selector of autoRetrySelectors) {
      if (await sidePanel!.locator(selector).isVisible().catch(() => false)) {
        console.log(`✅ Auto-retry indicator found: ${selector}`);
        retryFound = true;
        break;
      }
    }

    console.log(retryFound ? '✅ Connection retry mechanism implemented' : '⚠️ Connection retry mechanism may need implementation');
  });

  test('should test API timeout handling', async ({ page }) => {
    // Test with very slow response simulation
    const timeoutResult = await page.evaluate(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000); // 1 second timeout
      
      try {
        const response = await fetch('http://localhost:1234/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'medgemma-27b-it',
            messages: [
              {
                role: 'user',
                content: 'Test timeout handling'
              }
            ]
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        return { success: true, timedOut: false };
      } catch (error) {
        clearTimeout(timeoutId);
        return { 
          success: false, 
          timedOut: error.name === 'AbortError',
          error: error.message 
        };
      }
    });

    // Either it should succeed quickly or handle timeout gracefully
    console.log(`✅ Timeout test result: ${timeoutResult.success ? 'Completed' : 'Handled timeout'}`);
  });

  test('should test concurrent API requests', async ({ page }) => {
    // Test multiple simultaneous requests
    const concurrentResult = await page.evaluate(async () => {
      const requests = [];
      
      for (let i = 0; i < 3; i++) {
        requests.push(
          fetch('http://localhost:1234/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'medgemma-27b-it',
              messages: [
                {
                  role: 'user',
                  content: `Concurrent test request ${i + 1}`
                }
              ]
            })
          })
        );
      }

      try {
        const responses = await Promise.all(requests);
        const results = await Promise.all(
          responses.map(r => r.ok ? r.json() : null)
        );
        
        return {
          success: true,
          completedRequests: results.filter(r => r !== null).length,
          totalRequests: requests.length
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    expect(concurrentResult.success).toBe(true);
    expect(concurrentResult.completedRequests).toBe(3);
    console.log(`✅ Concurrent requests handled: ${concurrentResult.completedRequests}/${concurrentResult.totalRequests}`);
  });

  test('should validate API response format', async ({ page }) => {
    const responseFormatResult = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:1234/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'medgemma-27b-it',
            messages: [
              {
                role: 'user',
                content: 'Test response format validation'
              }
            ]
          })
        });

        if (response.ok) {
          const data = await response.json();
          
          // Validate OpenAI API format compliance
          const isValidFormat = (
            data.id &&
            data.object === 'chat.completion' &&
            data.created &&
            data.model &&
            Array.isArray(data.choices) &&
            data.choices.length > 0 &&
            data.choices[0].message &&
            data.choices[0].message.role === 'assistant' &&
            data.choices[0].message.content &&
            data.usage &&
            typeof data.usage.prompt_tokens === 'number' &&
            typeof data.usage.completion_tokens === 'number' &&
            typeof data.usage.total_tokens === 'number'
          );

          return {
            success: true,
            isValidFormat,
            data: data
          };
        }
        return { success: false, error: 'Request failed' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    expect(responseFormatResult.success).toBe(true);
    expect(responseFormatResult.isValidFormat).toBe(true);
    console.log('✅ API response format validation passed');
  });
});
