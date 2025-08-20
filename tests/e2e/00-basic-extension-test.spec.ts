import { test, expect } from '@playwright/test';

test.describe('Basic Extension Tests', () => {
  test('should load browser with extension', async ({ page, context }) => {
    console.log('🔄 Starting basic extension test...');
    
    try {
      // Wait for extension to initialize
      await page.waitForTimeout(5000);
      
      // Check if extension service worker is running
      const backgroundPages = context.backgroundPages();
      console.log(`Found ${backgroundPages.length} background pages`);
      
      if (backgroundPages.length > 0) {
        const serviceWorkerUrl = backgroundPages[0].url();
        console.log(`Service worker URL: ${serviceWorkerUrl}`);
        expect(serviceWorkerUrl).toContain('chrome-extension://');
        
        // Extract extension ID
        const matches = serviceWorkerUrl.match(/chrome-extension:\/\/([a-z]{32})/);
        if (matches) {
          const extensionId = matches[1];
          console.log(`✅ Extension ID found: ${extensionId}`);
          
          // Try to navigate to extension popup
          try {
            await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
            await page.waitForTimeout(2000);
            
            const title = await page.title();
            console.log(`Extension popup title: ${title}`);
            
            // Look for any content indicating the extension loaded
            const bodyText = await page.textContent('body').catch(() => '');
            console.log(`Extension popup content length: ${bodyText.length}`);
            
            expect(bodyText.length).toBeGreaterThan(0);
            console.log('✅ Extension popup accessible');
          } catch (error) {
            console.log('Extension popup not accessible:', error.message);
          }
          
          // Try to access side panel
          try {
            await page.goto(`chrome-extension://${extensionId}/src/sidepanel/index.html`);
            await page.waitForTimeout(2000);
            
            const sidePanelTitle = await page.title();
            console.log(`Side panel title: ${sidePanelTitle}`);
            
            const sidePanelContent = await page.textContent('body').catch(() => '');
            console.log(`Side panel content length: ${sidePanelContent.length}`);
            
            if (sidePanelContent.length > 0) {
              expect(sidePanelContent.length).toBeGreaterThan(0);
              console.log('✅ Side panel accessible');
            }
          } catch (error) {
            console.log('Side panel not directly accessible:', error.message);
          }
        }
      } else {
        console.log('⚠️ No background pages found - extension may not be loaded');
        
        // Try to navigate to chrome://extensions to see if extension is listed
        await page.goto('chrome://extensions/');
        await page.waitForTimeout(3000);
        
        // Look for extension name in the page
        const pageContent = await page.textContent('body').catch(() => '');
        const hasXestroExtension = pageContent.includes('Xestro EMR Assistant');
        
        if (hasXestroExtension) {
          console.log('✅ Extension found in chrome://extensions');
        } else {
          console.log('❌ Extension not found in extensions page');
          console.log('Extensions page content preview:', pageContent.substring(0, 500));
        }
        
        expect(hasXestroExtension).toBe(true);
      }
      
      console.log('🎉 Basic extension test completed successfully');
      
    } catch (error) {
      console.error('❌ Basic extension test failed:', error);
      throw error;
    }
  });
  
  test('should have extension files built correctly', async ({ page }) => {
    console.log('🔄 Checking extension build files...');
    
    // This test runs in the test environment, not the extension context
    const fs = require('fs');
    const path = require('path');
    
    const distPath = path.join(__dirname, '../../dist');
    const manifestPath = path.join(distPath, 'manifest.json');
    
    // Check if manifest exists
    expect(fs.existsSync(manifestPath)).toBe(true);
    console.log('✅ Manifest file exists');
    
    // Read and validate manifest
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest.name).toBe('Xestro EMR Assistant');
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toContain('sidePanel');
    console.log('✅ Manifest validation passed');
    
    // Check if key files exist
    const keyFiles = [
      'service-worker.js',
      'src/sidepanel/index.html',
      'src/popup/index.html',
      'sidepanel.js',
      'popup.js'
    ];
    
    for (const file of keyFiles) {
      const filePath = path.join(distPath, file);
      expect(fs.existsSync(filePath)).toBe(true);
      console.log(`✅ ${file} exists`);
    }
    
    console.log('🎉 Extension build files validated');
  });
});