import { test, expect } from './fixtures';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Basic Extension Tests', () => {
  test('should load browser with extension', async ({ page, context }) => {
    console.log('🔄 Starting basic extension test...');
    
    try {
      // Wait for extension to initialize
      await page.waitForTimeout(5000);
      
      // MV3 uses a service worker (not background pages). Wait for it.
      let serviceWorkers = context.serviceWorkers();
      console.log(`Found ${serviceWorkers.length} service workers`);

      if (serviceWorkers.length === 0) {
        try {
          await context.waitForEvent('serviceworker', { timeout: 15000 });
          serviceWorkers = context.serviceWorkers();
          console.log(`Found ${serviceWorkers.length} service workers after waiting`);
        } catch {
          // Continue to assertions below
        }
      }

      const swUrl = serviceWorkers[0]?.url();
      console.log(`Service worker URL: ${swUrl || 'none'}`);
      expect(swUrl).toContain('chrome-extension://');

      const matches = swUrl.match(/chrome-extension:\/\/([a-z]{32})/);
      expect(matches).toBeTruthy();
      const extensionId = matches?.[1];
      console.log(`✅ Extension ID found: ${extensionId}`);

      // Try to navigate to extension popup (best-effort; may be blocked by Chromium policies)
      await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`, { waitUntil: 'domcontentloaded' });
      const bodyText = await page.textContent('body').catch(() => '');
      expect(bodyText.length).toBeGreaterThan(0);
      
      console.log('🎉 Basic extension test completed successfully');
      
    } catch (error) {
      console.error('❌ Basic extension test failed:', error);
      throw error;
    }
  });
  
  test('should have extension files built correctly', async ({ page }) => {
    console.log('🔄 Checking extension build files...');
    
    const distPath = path.join(__dirname, '../../dist');
    const manifestPath = path.join(distPath, 'manifest.json');
    
    // Check if manifest exists
    await expect(fs.access(manifestPath)).resolves.toBeUndefined();
    console.log('✅ Manifest file exists');
    
    // Read and validate manifest
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    expect(manifest.name).toBe('Operator');
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
      await expect(fs.access(filePath)).resolves.toBeUndefined();
      console.log(`✅ ${file} exists`);
    }
    
    console.log('🎉 Extension build files validated');
  });
});
