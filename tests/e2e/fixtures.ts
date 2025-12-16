import { test as base, expect, chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Fixtures = {
  context: BrowserContext;
  page: Page;
};

// Playwright extensions require a persistent context. Most of the e2e suite assumes the
// Operator MV3 extension is loaded (service worker + side panel).
export const test = base.extend<Fixtures>({
  context: async ({}, use, testInfo) => {
    const extensionPath = path.join(__dirname, '../../dist');
    const userDataDir = testInfo.outputPath('chromium-user-data');

    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: process.env.HEADLESS === 'true',
      viewport: { width: 1280, height: 720 },
      permissions: ['microphone', 'clipboard-read', 'clipboard-write'],
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-field-trial-config',
        '--disable-component-extensions-with-background-pages',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection'
      ],
    });

    await use(context);
    await context.close();
  },

  page: async ({ context }, use) => {
    const page = await context.newPage();
    await use(page);
    await page.close();
  }
});

export { expect };
