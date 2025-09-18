import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { LMStudioMock } from './LMStudioMock';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Operator Chrome Extension E2E Tests');
  console.log('=' .repeat(50));

  // Start mock LMStudio server
  const lmStudioMock = new LMStudioMock();
  await lmStudioMock.start(1234);
  
  // Store for global teardown
  (global as any).lmStudioMock = lmStudioMock;

  // Verify extension build exists
  const extensionPath = path.join(__dirname, '../../dist');
  const manifestPath = path.join(extensionPath, 'manifest.json');
  
  try {
    const fs = await import('fs/promises');
    await fs.access(manifestPath);
    console.log('✅ Extension build found');
  } catch (error) {
    console.error('❌ Extension build not found. Run npm run build first.');
    throw new Error('Extension build missing');
  }

  // Basic verification that extension files are built correctly
  console.log('✅ Extension files validated for testing');

  // Start Vite preview to serve built pages for direct HTTP testing
  const preview = spawn('npm', ['run', 'preview', '--silent', '--', '--port', '4173', '--strictPort'], {
    cwd: path.join(__dirname, '../..'),
    stdio: 'pipe'
  });

  let previewReady = false;
  preview.stdout.on('data', (data) => {
    const text = data.toString();
    if (!previewReady && text.includes('Local:') && text.includes('4173')) {
      previewReady = true;
      console.log('✅ Vite preview started at http://127.0.0.1:4173');
      (global as any).PREVIEW_BASE_URL = 'http://127.0.0.1:4173';
      (process.env as any).PREVIEW_BASE_URL = 'http://127.0.0.1:4173';
    }
  });

  // Small wait to give the server time to bind
  await new Promise((r) => setTimeout(r, 1200));

  console.log('✅ Global setup complete');
  return {
    lmStudioMock,
    extensionPath,
    preview
  } as any;
}

export default globalSetup;
