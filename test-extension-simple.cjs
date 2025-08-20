const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testExtension() {
  console.log('🚀 Testing Chrome extension loading...');
  
  const extensionPath = path.join(__dirname, 'dist');
  console.log('Extension path:', extensionPath);
  
  // Verify manifest exists
  const manifestPath = path.join(extensionPath, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.log('❌ Manifest not found at:', manifestPath);
    return;
  }
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  console.log('✅ Manifest loaded:', manifest.name, 'v' + manifest.version);
  
  const browser = await chromium.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--enable-logging',
      '--log-level=0'
    ]
  });
  
  const context = await browser.newContext();
  
  // Listen for console messages from extension
  context.on('page', page => {
    page.on('console', msg => {
      if (msg.url && msg.url.startsWith('chrome-extension://')) {
        console.log('Extension console:', msg.text());
      }
    });
  });
  
  const page = await context.newPage();
  
  // Navigate to chrome://extensions first to see if extension is listed
  try {
    await page.goto('chrome://extensions/');
    await page.waitForTimeout(3000);
    
    const pageContent = await page.textContent('body');
    if (pageContent.includes('Xestro EMR Assistant')) {
      console.log('✅ Extension found in chrome://extensions');
    } else {
      console.log('❌ Extension not found in chrome://extensions');
      console.log('Page content preview:', pageContent.substring(0, 500));
    }
  } catch (error) {
    console.log('❌ Cannot access chrome://extensions:', error.message);
  }
  
  // Wait for extension to load
  console.log('Waiting for extension initialization...');
  await page.waitForTimeout(8000);
  
  // Check background pages
  const backgroundPages = context.backgroundPages();
  console.log(`Found ${backgroundPages.length} background pages`);
  
  if (backgroundPages.length > 0) {
    const url = backgroundPages[0].url();
    console.log('Background page URL:', url);
    
    const matches = url.match(/chrome-extension:\/\/([a-z]+)/);
    if (matches) {
      const extensionId = matches[1];
      console.log('✅ Extension ID found:', extensionId);
      
      // Try to open side panel
      try {
        await page.goto(`chrome-extension://${extensionId}/src/sidepanel/index.html`);
        await page.waitForTimeout(2000);
        const title = await page.title();
        console.log('✅ Side panel accessible, title:', title);
      } catch (error) {
        console.log('❌ Side panel access failed:', error.message);
      }
      
      // Try popup
      try {
        await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
        await page.waitForTimeout(2000);
        const title = await page.title();
        console.log('✅ Popup accessible, title:', title);
      } catch (error) {
        console.log('❌ Popup access failed:', error.message);
      }
      
    }
  } else {
    console.log('❌ No background pages found - extension not loaded');
    
    // Try to manually check extension resources
    await page.goto('chrome://extensions/');
    await page.waitForTimeout(2000);
  }
  
  console.log('Keeping browser open for 10 seconds for manual inspection...');
  await page.waitForTimeout(10000);
  
  await browser.close();
  console.log('🏁 Test completed');
}

testExtension().catch(console.error);