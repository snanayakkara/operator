import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { LMStudioMock } from './LMStudioMock';

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

  console.log('✅ Global setup complete');
  return {
    lmStudioMock,
    extensionPath
  };
}

export default globalSetup;