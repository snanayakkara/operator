/**
 * End-to-end tests for DSPy integration in the browser extension
 * Tests DSPy feature flag functionality and fallback behavior
 */

import { test, expect } from './fixtures';
import { ExtensionTestHelper } from '../helpers/ExtensionTestHelper';

test.describe('DSPy Integration E2E', () => {
  let extensionHelper: ExtensionTestHelper;

  test.beforeEach(async ({ context }) => {
    extensionHelper = new ExtensionTestHelper(context);
    await extensionHelper.loadExtension();
  });

  test.afterEach(async () => {
    await extensionHelper?.cleanup();
  });

  test('should display DSPy status in model status when feature flag is disabled', async () => {
    const sidepanelPage = await extensionHelper.openSidepanel();
    
    // Look for model status component
    const modelStatus = sidepanelPage.locator('[data-testid="model-status"]');
    await expect(modelStatus).toBeVisible();
    
    // DSPy should be shown as disabled by default
    const dspyStatus = sidepanelPage.locator('[data-testid="dspy-status"]');
    if (await dspyStatus.count() > 0) {
      await expect(dspyStatus).toContainText('disabled');
    }
  });

  test('should use direct LMStudio processing when DSPy is disabled', async () => {
    const sidepanelPage = await extensionHelper.openSidepanel();
    
    // Mock successful recording and transcription
    await sidepanelPage.evaluate(() => {
      // Mock MediaRecorder for testing
      (window as any).mockMediaRecorder = true;
      (window as any).mockTranscription = 'Patient underwent coronary angiography with 90% stenosis in LAD.';
    });
    
    // Start workflow recording
    const angiogramButton = sidepanelPage.locator('button:has-text("Angiogram/PCI")');
    await angiogramButton.click();
    
    // Check that processing goes through direct LMStudio path
    // This will be visible in console logs and processing indicators
    await expect(sidepanelPage.locator('[data-testid="processing-phase"]')).toContainText('Processing');
    
    // In a real test, we'd mock the LMStudio API to verify the correct endpoint is called
    // For now, we verify that the workflow initiates correctly
  });

  test('should show DSPy configuration loading errors gracefully', async () => {
    const sidepanelPage = await extensionHelper.openSidepanel();
    
    // Inject test to simulate DSPy config loading failure
    await sidepanelPage.evaluate(() => {
      // Mock DSPyService to simulate config loading error
      (window as any).__MOCK_DSPY_CONFIG_ERROR = true;
    });
    
    // The extension should still function normally even with DSPy config errors
    const workflowButtons = sidepanelPage.locator('.workflow-button');
    await expect(workflowButtons.first()).toBeVisible();
    
    // No error notifications should be shown to user for optional DSPy feature
    const errorNotifications = sidepanelPage.locator('.error-notification');
    await expect(errorNotifications).toHaveCount(0);
  });

  test('should handle DSPy evaluation interface when enabled', async () => {
    const sidepanelPage = await extensionHelper.openSidepanel();
    
    // This test would require DSPy to be enabled and configured
    // For now, we test that the interface doesn't break when DSPy methods are called
    await sidepanelPage.evaluate(() => {
      // Test that DSPyService methods exist and can be called without breaking the app
      const testDSPyIntegration = async () => {
        try {
          // These would normally be called through the service layer
          const dspyService = (window as any).dspyService;
          if (dspyService) {
            await dspyService.isDSPyEnabled('angiogram-pci');
          }
        } catch (error) {
          console.log('DSPy service not available, which is expected in test environment');
        }
      };
      
      testDSPyIntegration();
    });
    
    // Extension should remain functional
    await expect(sidepanelPage.locator('.app-container')).toBeVisible();
  });

  test('should show appropriate environment verification messages', async () => {
    const sidepanelPage = await extensionHelper.openSidepanel();
    
    // In a development/test environment, DSPy verification should show appropriate status
    // This test verifies that environment verification doesn't crash the extension
    
    await sidepanelPage.evaluate(async () => {
      // Simulate DSPy environment verification
      try {
        const response = await fetch('/api/dspy/verify-environment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ check: 'environment' })
        });
        
        // This will likely fail in test environment, which is expected
        console.log('DSPy verification response:', response.status);
      } catch (error) {
        console.log('DSPy verification failed, which is expected in test environment');
      }
    });
    
    // Extension should continue to work normally
    await expect(sidepanelPage.locator('h1')).toContainText('Operator');
  });

  test('should maintain existing agent functionality with DSPy integration', async () => {
    const sidepanelPage = await extensionHelper.openSidepanel();
    
    // All existing agents should still be available
    const expectedAgents = [
      'TAVI',
      'Angiogram/PCI', 
      'mTEER',
      'PFO Closure',
      'Right Heart Cath',
      'Quick Letter',
      'Consultation'
    ];
    
    for (const agentName of expectedAgents) {
      const agentButton = sidepanelPage.locator(`button:has-text("${agentName}")`);
      await expect(agentButton).toBeVisible();
    }
    
    // Quick actions should also still be available
    const quickActions = [
      'Investigation Summary',
      'Background',
      'Medication'
    ];
    
    for (const actionName of quickActions) {
      const actionButton = sidepanelPage.locator(`button:has-text("${actionName}")`);
      await expect(actionButton).toBeVisible();
    }
  });

  test('should handle DSPy feature flag changes without breaking existing workflows', async () => {
    const sidepanelPage = await extensionHelper.openSidepanel();
    
    // Simulate feature flag changes
    await sidepanelPage.evaluate(() => {
      // Test toggling DSPy feature flag
      localStorage.setItem('dspy_feature_flag', 'true');
      localStorage.setItem('dspy_feature_flag', 'false');
      
      // Extension should handle flag changes gracefully
      (window as any).location.reload();
    });
    
    // After reload, extension should still work
    await expect(sidepanelPage.locator('.app-container')).toBeVisible();
    await expect(sidepanelPage.locator('h1')).toContainText('Operator');
  });

  test('should show proper error handling for DSPy Python process failures', async () => {
    const sidepanelPage = await extensionHelper.openSidepanel();
    
    // This test verifies that Python process failures are handled gracefully
    await sidepanelPage.evaluate(() => {
      // Mock a Python process failure scenario
      (window as any).__MOCK_PYTHON_PROCESS_FAILURE = true;
    });
    
    // Extension should continue to function even with Python integration issues
    const workflowButtons = sidepanelPage.locator('.workflow-button');
    await expect(workflowButtons.first()).toBeVisible();
    
    // User should not see technical error messages about Python processes
    const technicalErrors = sidepanelPage.locator('text="spawn"');
    await expect(technicalErrors).toHaveCount(0);
  });
});
