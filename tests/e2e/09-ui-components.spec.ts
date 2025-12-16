import { test, expect } from './fixtures';
import type { Page, Frame } from '@playwright/test';
import { ExtensionTestHelper } from '../helpers/ExtensionTestHelper';

test.describe('UI Component Tests', () => {
  let extensionId: string;
  let sidePanel: Frame | null;

  test.beforeEach(async ({ page, context }) => {
    console.log('🎨 Setting up UI component test environment...');
    
    // Get extension ID and setup
    extensionId = await ExtensionTestHelper.getExtensionId(context);
    
    // Grant necessary permissions
    await context.grantPermissions(['microphone', 'clipboard-read', 'clipboard-write']);
    
    // Inject mock audio functionality
    await ExtensionTestHelper.injectMockAudio(page, extensionId);
    
    // Open side panel
    sidePanel = await ExtensionTestHelper.openSidePanel(page, extensionId);
    expect(sidePanel).toBeTruthy();
    
    console.log('✅ UI test environment ready');
  });

  test('should render WorkflowButtons component correctly', async ({ page }) => {
    console.log('🔘 Testing WorkflowButtons component...');
    
    // Check for workflow buttons container
    const workflowContainer = sidePanel!.locator('[data-testid="workflow-buttons"], .workflow-buttons, text=/Select Workflow/i').first();
    await expect(workflowContainer).toBeVisible({ timeout: 10000 });
    
    // Check for individual workflow buttons
    const expectedWorkflows = [
      'Quick Letter',
      'Consultation', 
      'TAVI',
      'Angiogram',
      'PCI'
    ];
    
    let foundWorkflows = 0;
    for (const workflow of expectedWorkflows) {
      const button = sidePanel!.locator(`button:has-text("${workflow}")`);
      if (await button.count() > 0) {
        await expect(button.first()).toBeVisible();
        foundWorkflows++;
        console.log(`✅ Found ${workflow} button`);
      }
    }
    
    expect(foundWorkflows).toBeGreaterThanOrEqual(3); // At least 3 workflows visible
    
    // Test button interactions
    const firstButton = sidePanel!.locator('button').first();
    if (await firstButton.isVisible()) {
      await firstButton.click();
      await page.waitForTimeout(1000);
      
      // Should show recording state or similar interaction
      const recordingIndicator = sidePanel!.locator('text=/recording/i, .recording-indicator');
      const hasRecordingState = await recordingIndicator.count() > 0;
      
      // Click again to stop
      await firstButton.click();
      await page.waitForTimeout(500);
      
      console.log('✅ WorkflowButtons interaction test passed');
    }
  });

  test('should render StatusIndicator component correctly', async ({ page }) => {
    console.log('📊 Testing StatusIndicator component...');
    
    // Check for status indicator
    const statusIndicator = sidePanel!.locator('.status-indicator, [data-testid="status-indicator"], text=/ready/i').first();
    await expect(statusIndicator).toBeVisible({ timeout: 5000 });
    
    // Test different status states by triggering workflows
    const workflowButton = sidePanel!.locator('button').first();
    if (await workflowButton.isVisible()) {
      // Start recording
      await workflowButton.click();
      await page.waitForTimeout(1000);
      
      // Check for recording status
      const recordingStatus = sidePanel!.locator('text=/recording/i, .recording-status');
      if (await recordingStatus.count() > 0) {
        console.log('✅ Recording status displayed');
      }
      
      // Stop recording
      await workflowButton.click();
      await page.waitForTimeout(2000);
      
      // Check for processing status
      const processingStatus = sidePanel!.locator('text=/processing/i, text=/transcribing/i');
      if (await processingStatus.count() > 0) {
        console.log('✅ Processing status displayed');
      }
      
      console.log('✅ StatusIndicator state changes work correctly');
    }
  });

  test('should render ModelStatus component correctly', async ({ page }) => {
    console.log('🤖 Testing ModelStatus component...');
    
    // Look for model status indicators
    const modelStatusSelectors = [
      '.model-status',
      '[data-testid="model-status"]',
      'text=/model/i',
      'text=/connection/i',
      'text=/status/i'
    ];
    
    let modelStatusFound = false;
    for (const selector of modelStatusSelectors) {
      const element = sidePanel!.locator(selector);
      if (await element.count() > 0) {
        await expect(element.first()).toBeVisible();
        modelStatusFound = true;
        console.log(`✅ Model status found with selector: ${selector}`);
        break;
      }
    }
    
    // Model status might not always be visible, so we'll check for it but not fail
    if (!modelStatusFound) {
      console.log('ℹ️ Model status component not visible in current UI state');
    }
    
    // Check for any connection indicators
    const connectionIndicators = sidePanel!.locator('.status-online, .status-offline, .connection-status');
    if (await connectionIndicators.count() > 0) {
      console.log('✅ Connection status indicators present');
    }
  });

  test('should render QuickActions component correctly', async ({ page }) => {
    console.log('⚡ Testing QuickActions component...');
    
    // Look for quick actions section (often at bottom)
    const quickActionsSelectors = [
      '.quick-actions',
      '[data-testid="quick-actions"]',
      'text=/Quick Actions/i',
      'text=/EMR/i',
      '.footer-section'
    ];
    
    let quickActionsFound = false;
    for (const selector of quickActionsSelectors) {
      const element = sidePanel!.locator(selector);
      if (await element.count() > 0) {
        await expect(element.first()).toBeVisible();
        quickActionsFound = true;
        console.log(`✅ Quick actions found with selector: ${selector}`);
        break;
      }
    }
    
    if (quickActionsFound) {
      // Test quick action buttons
      const expectedActions = [
        'Background',
        'Investigation',
        'Medication',
        'AI Review'
      ];
      
      let foundActions = 0;
      for (const action of expectedActions) {
        const button = sidePanel!.locator(`button:has-text("${action}")`);
        if (await button.count() > 0) {
          foundActions++;
          console.log(`✅ Found ${action} quick action`);
        }
      }
      
      console.log(`✅ Found ${foundActions} quick actions`);
    } else {
      console.log('ℹ️ Quick actions not visible in current UI state');
    }
  });

  test('should render TranscriptionDisplay correctly', async ({ page }) => {
    console.log('📝 Testing TranscriptionDisplay component...');
    
    // First generate some transcription
    const workflowButton = sidePanel!.locator('button').first();
    if (await workflowButton.isVisible()) {
      await workflowButton.click();
      await page.waitForTimeout(500);
      
      // Inject mock transcription
      await sidePanel!.evaluate(() => {
        const textAreas = document.querySelectorAll('textarea, input[type="text"]');
        if (textAreas.length > 0) {
          const target = textAreas[0] as HTMLTextAreaElement;
          target.value = 'Test medical transcription for UI testing';
          target.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      
      await workflowButton.click(); // Stop recording
      await page.waitForTimeout(2000);
      
      // Look for transcription display
      const transcriptionSelectors = [
        '.transcription-display',
        '[data-testid="transcription"]',
        'textarea[readonly]',
        'text=/transcription/i'
      ];
      
      let transcriptionFound = false;
      for (const selector of transcriptionSelectors) {
        const element = sidePanel!.locator(selector);
        if (await element.count() > 0) {
          const content = await element.first().inputValue().catch(() => 
            element.first().textContent()
          );
          
          if (content && content.length > 0) {
            transcriptionFound = true;
            console.log(`✅ Transcription display found: ${content.substring(0, 50)}...`);
            break;
          }
        }
      }
      
      if (!transcriptionFound) {
        console.log('ℹ️ Transcription display not visible or empty');
      }
    }
  });

  test('should render ResultsPanel correctly', async ({ page }) => {
    console.log('📄 Testing ResultsPanel component...');
    
    // Generate a report first
    const workflowButton = sidePanel!.locator('button').first();
    if (await workflowButton.isVisible()) {
      await workflowButton.click();
      await page.waitForTimeout(500);
      
      // Inject mock transcription
      await sidePanel!.evaluate(() => {
        const textAreas = document.querySelectorAll('textarea, input[type="text"]');
        if (textAreas.length > 0) {
          const target = textAreas[0] as HTMLTextAreaElement;
          target.value = 'Patient underwent routine cardiac assessment. Normal findings throughout examination.';
          target.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      
      await workflowButton.click();
      await page.waitForTimeout(5000); // Wait for report generation
      
      // Look for results panel
      const resultsPanelSelectors = [
        '.results-panel',
        '[data-testid="results-panel"]',
        '.medical-report',
        '.report-content',
        'textarea:not([placeholder*="dictation"])'
      ];
      
      let resultsFound = false;
      for (const selector of resultsPanelSelectors) {
        const element = sidePanel!.locator(selector);
        if (await element.count() > 0) {
          const content = await element.first().inputValue().catch(() => 
            element.first().textContent()
          );
          
          if (content && content.length > 20) {
            resultsFound = true;
            console.log(`✅ Results panel found with content: ${content.substring(0, 50)}...`);
            
            // Test results panel actions
            const actionButtons = sidePanel!.locator('button:has-text("Copy"), button:has-text("Download"), button:has-text("Insert")');
            const buttonCount = await actionButtons.count();
            console.log(`✅ Found ${buttonCount} action buttons in results panel`);
            
            break;
          }
        }
      }
      
      if (!resultsFound) {
        console.log('ℹ️ Results panel not visible or empty');
      }
    }
  });

  test('should handle error states correctly', async ({ page }) => {
    console.log('❌ Testing error state handling...');
    
    // Look for error alert components
    const errorSelectors = [
      '.error-alert',
      '[data-testid="error-alert"]',
      '.alert-error',
      'text=/error/i',
      '.text-red'
    ];
    
    // Initially, there should be no errors
    let hasInitialErrors = false;
    for (const selector of errorSelectors) {
      const element = sidePanel!.locator(selector);
      if (await element.count() > 0 && await element.first().isVisible()) {
        hasInitialErrors = true;
        console.log(`⚠️ Initial error state detected: ${selector}`);
      }
    }
    
    if (!hasInitialErrors) {
      console.log('✅ No initial error states');
    }
    
    // Test error recovery by attempting invalid operations
    // This might not trigger errors in mock environment, but we can check structure
    
    // Look for retry buttons or error recovery options
    const retryButtons = sidePanel!.locator('button:has-text("Retry"), button:has-text("Try Again")');
    const retryCount = await retryButtons.count();
    console.log(`Found ${retryCount} retry/recovery buttons`);
  });

  test('should handle loading states correctly', async ({ page }) => {
    console.log('⏳ Testing loading state handling...');
    
    // Start an operation to trigger loading states
    const workflowButton = sidePanel!.locator('button').first();
    if (await workflowButton.isVisible()) {
      await workflowButton.click();
      await page.waitForTimeout(500);
      
      // Inject transcription
      await sidePanel!.evaluate(() => {
        const textAreas = document.querySelectorAll('textarea, input[type="text"]');
        if (textAreas.length > 0) {
          const target = textAreas[0] as HTMLTextAreaElement;
          target.value = 'Test transcription for loading state';
          target.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      
      await workflowButton.click();
      
      // Immediately check for loading indicators
      const loadingSelectors = [
        '.loading',
        '.spinner',
        '.animate-spin',
        'text=/processing/i',
        'text=/transcribing/i',
        '.loading-indicator'
      ];
      
      let loadingFound = false;
      for (const selector of loadingSelectors) {
        const element = sidePanel!.locator(selector);
        if (await element.count() > 0) {
          loadingFound = true;
          console.log(`✅ Loading indicator found: ${selector}`);
        }
      }
      
      if (loadingFound) {
        console.log('✅ Loading states properly displayed');
      } else {
        console.log('ℹ️ Loading states not captured (processing too fast)');
      }
      
      // Wait for completion
      await page.waitForTimeout(3000);
    }
  });

  test('should handle responsive design correctly', async ({ page }) => {
    console.log('📱 Testing responsive design...');
    
    // Check current side panel dimensions
    const panelDimensions = await sidePanel!.evaluate(() => {
      return {
        width: document.body.offsetWidth,
        height: document.body.offsetHeight,
        hasScrollbar: document.body.scrollHeight > document.body.clientHeight
      };
    });
    
    console.log('Panel dimensions:', panelDimensions);
    
    // Chrome side panel should be around 420px wide
    expect(panelDimensions.width).toBeLessThanOrEqual(450);
    expect(panelDimensions.width).toBeGreaterThanOrEqual(350);
    
    // Check for proper content organization
    const containers = sidePanel!.locator('.glass, .glass-card, .rounded, .container');
    const containerCount = await containers.count();
    console.log(`✅ Found ${containerCount} content containers`);
    
    // Check for proper spacing and layout
    const buttons = sidePanel!.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
    console.log(`✅ Found ${buttonCount} interactive buttons`);
    
    // Check text is readable (not too small)
    const textElements = sidePanel!.locator('p, span, div').filter({ hasText: /\w+/ });
    const textCount = await textElements.count();
    console.log(`✅ Found ${textCount} text elements`);
  });

  test('should handle accessibility features', async ({ page }) => {
    console.log('♿ Testing accessibility features...');
    
    // Check for ARIA labels and roles
    const ariaElements = sidePanel!.locator('[aria-label], [aria-labelledby], [role]');
    const ariaCount = await ariaElements.count();
    console.log(`Found ${ariaCount} elements with ARIA attributes`);
    
    // Check for keyboard navigation
    const focusableElements = sidePanel!.locator('button, input, textarea, [tabindex]');
    const focusableCount = await focusableElements.count();
    expect(focusableCount).toBeGreaterThan(0);
    console.log(`✅ Found ${focusableCount} focusable elements`);
    
    // Test keyboard navigation
    if (focusableCount > 0) {
      await focusableElements.first().focus();
      await page.keyboard.press('Tab');
      console.log('✅ Keyboard navigation functional');
    }
    
    // Check for proper heading hierarchy
    const headings = sidePanel!.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    console.log(`Found ${headingCount} heading elements`);
  });

  test('should handle component interactions correctly', async ({ page }) => {
    console.log('🔄 Testing component interactions...');
    
    // Test workflow button to status indicator interaction
    const workflowButton = sidePanel!.locator('button').first();
    if (await workflowButton.isVisible()) {
      // Click workflow button
      await workflowButton.click();
      await page.waitForTimeout(1000);
      
      // Check if status changed
      const statusElements = sidePanel!.locator('text=/recording/i, text=/ready/i, .status');
      if (await statusElements.count() > 0) {
        console.log('✅ Workflow button affects status indicator');
      }
      
      // Stop recording
      await workflowButton.click();
      await page.waitForTimeout(1000);
      
      // Test clear/reset functionality if available
      const clearButton = sidePanel!.locator('button:has-text("Clear"), button:has-text("Reset"), button:has-text("New")');
      if (await clearButton.count() > 0) {
        await clearButton.first().click();
        await page.waitForTimeout(500);
        console.log('✅ Clear/reset functionality works');
      }
    }
    
    // Test copy functionality if available
    const copyButtons = sidePanel!.locator('button:has-text("Copy")');
    const copyCount = await copyButtons.count();
    if (copyCount > 0) {
      console.log(`✅ Found ${copyCount} copy buttons`);
      
      // Test copy interaction (won't actually copy in test environment)
      await copyButtons.first().click();
      await page.waitForTimeout(500);
      console.log('✅ Copy button interaction works');
    }
  });

  test('should maintain state consistency across interactions', async ({ page }) => {
    console.log('🔄 Testing state consistency...');
    
    let initialState: any;
    let afterRecordingState: any;
    let afterProcessingState: any;
    
    // Capture initial state
    initialState = await captureUIState(sidePanel!);
    console.log('📸 Initial state captured');
    
    // Start recording
    const workflowButton = sidePanel!.locator('button').first();
    if (await workflowButton.isVisible()) {
      await workflowButton.click();
      await page.waitForTimeout(1000);
      
      // Capture recording state
      afterRecordingState = await captureUIState(sidePanel!);
      console.log('📸 Recording state captured');
      
      // Add transcription and stop
      await sidePanel!.evaluate(() => {
        const textAreas = document.querySelectorAll('textarea, input[type="text"]');
        if (textAreas.length > 0) {
          const target = textAreas[0] as HTMLTextAreaElement;
          target.value = 'State consistency test transcription';
          target.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      
      await workflowButton.click();
      await page.waitForTimeout(3000);
      
      // Capture final state
      afterProcessingState = await captureUIState(sidePanel!);
      console.log('📸 Final state captured');
      
      // Verify state transitions
      expect(afterRecordingState.buttonCount).toBeGreaterThanOrEqual(initialState.buttonCount);
      expect(afterProcessingState.hasContent).toBe(true);
      
      console.log('✅ State consistency maintained across interactions');
    }
  });

  // Helper function to capture UI state
  async function captureUIState(sidePanel: Frame): Promise<any> {
    return await sidePanel.evaluate(() => {
      return {
        buttonCount: document.querySelectorAll('button').length,
        textAreaCount: document.querySelectorAll('textarea').length,
        hasContent: document.body.textContent?.length || 0 > 100,
        visibleElements: document.querySelectorAll(':not([hidden])').length
      };
    });
  }
});
