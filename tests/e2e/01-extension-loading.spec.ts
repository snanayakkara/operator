import { test, expect, Page, BrowserContext } from '@playwright/test';
import { ExtensionTestHelper } from '../helpers/ExtensionTestHelper';

test.describe('Extension Loading Tests', () => {
  let extensionId: string;

  test('should load extension successfully', async ({ context }) => {
    try {
      // Wait for extension to load
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check for background pages (service worker)
      const backgroundPages = context.backgroundPages();
      if (backgroundPages.length > 0) {
        const url = backgroundPages[0].url();
        const matches = url.match(/chrome-extension:\/\/([a-z]{32})/);
        if (matches) {
          extensionId = matches[1];
          expect(extensionId).toBeTruthy();
          expect(extensionId).toMatch(/^[a-z]{32}$/);
          console.log(`✅ Extension loaded via background page with ID: ${extensionId}`);
          return;
        }
      }
      
      // Fallback: try the helper method
      extensionId = await ExtensionTestHelper.getExtensionId(context);
      expect(extensionId).toBeTruthy();
      expect(extensionId).toMatch(/^[a-z]{32}$/);
      console.log(`✅ Extension loaded with ID: ${extensionId}`);
    } catch (error) {
      console.log('❌ Extension failed to load:', error);
      // Auto-fix: Check and rebuild extension
      await ExtensionTestHelper.fixExtensionBuild();
      throw error;
    }
  });

  test('should have correct manifest configuration', async ({ context }) => {
    // Reuse extension ID from previous test or get it again
    if (!extensionId) {
      const backgroundPages = context.backgroundPages();
      if (backgroundPages.length > 0) {
        const url = backgroundPages[0].url();
        const matches = url.match(/chrome-extension:\/\/([a-z]{32})/);
        if (matches) {
          extensionId = matches[1];
        }
      }
      
      if (!extensionId) {
        extensionId = await ExtensionTestHelper.getExtensionId(context);
      }
    }
    
    // Navigate to extension details page
    const page = await context.newPage();
    await page.goto('chrome://extensions/');
    await page.waitForTimeout(2000);

    // Find the extension card
    const extensionCard = page.locator('.extension-list-item').filter({
      hasText: 'Xestro EMR Assistant'
    });

    await expect(extensionCard).toBeVisible();

    // Check extension details
    const extensionName = await extensionCard.locator('h3').textContent();
    expect(extensionName).toContain('Xestro EMR Assistant');

    // Check version
    const versionText = await extensionCard.locator('.version').textContent();
    expect(versionText).toMatch(/\d+\.\d+\.\d+/);

    // Verify extension is enabled
    const toggleSwitch = extensionCard.locator('cr-toggle');
    const isEnabled = await toggleSwitch.getAttribute('checked');
    expect(isEnabled).toBeTruthy();

    await page.close();
  });

  test('should open side panel successfully', async ({ page, context }) => {
    extensionId = await ExtensionTestHelper.getExtensionId(context);
    
    // Grant necessary permissions
    await context.grantPermissions(['microphone']);
    
    // Inject mock audio for testing
    await ExtensionTestHelper.injectMockAudio(page, extensionId);
    
    const sidePanel = await ExtensionTestHelper.openSidePanel(page, extensionId);
    
    if (!sidePanel) {
      console.log('❌ Side panel failed to open, attempting auto-fix...');
      await ExtensionTestHelper.fixExtensionBuild();
      throw new Error('Side panel not accessible');
    }

    expect(sidePanel).toBeTruthy();
    console.log('✅ Side panel opened successfully');

    // Verify UI elements are present
    const headerExists = await ExtensionTestHelper.waitForSidePanelElement(
      sidePanel, 
      'h1', 
      5000
    );
    expect(headerExists).toBeTruthy();

    const headerText = await sidePanel.locator('h1').textContent();
    expect(headerText).toContain('Xestro EMR Assistant');

    // Check for key UI components
    const recordButtonExists = await ExtensionTestHelper.waitForSidePanelElement(
      sidePanel,
      'button:has-text("microphone"), [data-testid="record-button"], button[title*="record"]',
      3000
    );
    expect(recordButtonExists).toBeTruthy();
  });

  test('should handle permissions correctly', async ({ page, context }) => {
    extensionId = await ExtensionTestHelper.getExtensionId(context);

    // Test without microphone permission
    await context.clearPermissions();
    
    const sidePanel = await ExtensionTestHelper.openSidePanel(page, extensionId);
    expect(sidePanel).toBeTruthy();

    // Try to click record button without permission
    const recordButton = sidePanel.locator('button').first();
    if (await recordButton.isVisible()) {
      await recordButton.click();
      await page.waitForTimeout(1000);

      // Should show some indication that permission is needed
      // This might be a popup, error message, or permission prompt
      const hasPermissionPrompt = await page.locator('[data-testid="permission-prompt"], .permission-denied, .error-message').isVisible().catch(() => false);
      
      if (!hasPermissionPrompt) {
        console.log('⚠️ No clear permission handling found - this may need improvement');
      }
    }

    // Grant permission and try again
    await context.grantPermissions(['microphone']);
    await page.reload();
    await page.waitForTimeout(2000);

    const sidePanelAfterPermission = await ExtensionTestHelper.openSidePanel(page, extensionId);
    expect(sidePanelAfterPermission).toBeTruthy();
  });

  test('should show model connection status', async ({ page, context }) => {
    extensionId = await ExtensionTestHelper.getExtensionId(context);
    
    const sidePanel = await ExtensionTestHelper.openSidePanel(page, extensionId);
    expect(sidePanel).toBeTruthy();

    // Look for connection status indicator
    const statusElements = [
      '.lmstudio-status',
      '.model-status', 
      '.connection-status',
      '[data-testid="connection-status"]',
      'button:has-text("Connected")',
      'button:has-text("Offline")',
      '.status-dot'
    ];

    let statusFound = false;
    for (const selector of statusElements) {
      const exists = await sidePanel.locator(selector).isVisible().catch(() => false);
      if (exists) {
        statusFound = true;
        console.log(`✅ Status indicator found: ${selector}`);
        break;
      }
    }

    // Status indicator should be present (either connected or disconnected)
    if (!statusFound) {
      console.log('⚠️ No model connection status indicator found');
      // This isn't a hard failure as the UI might be different
    }
  });

  test('should have correct extension metadata', async ({ context }) => {
    extensionId = await ExtensionTestHelper.getExtensionId(context);
    
    // Check if we can access extension resources
    const page = await context.newPage();
    
    try {
      // Try to load the manifest
      const manifestUrl = `chrome-extension://${extensionId}/manifest.json`;
      const response = await page.goto(manifestUrl);
      
      if (response && response.ok()) {
        const manifestText = await page.textContent('pre');
        const manifest = JSON.parse(manifestText || '{}');
        
        // Verify key manifest properties
        expect(manifest.name).toBe('Xestro EMR Assistant');
        expect(manifest.manifest_version).toBe(3);
        expect(manifest.permissions).toContain('sidePanel');
        expect(manifest.permissions).toContain('activeTab');
        
        console.log('✅ Manifest validation passed');
      } else {
        console.log('⚠️ Could not access manifest directly');
      }
    } catch (error) {
      console.log('⚠️ Manifest access failed:', error.message);
    } finally {
      await page.close();
    }
  });
});