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

  const runBuildIfNeeded = async () => {
    const extensionPath = path.join(__dirname, '../../dist');
    const manifestPath = path.join(extensionPath, 'manifest.json');

    const shouldSkipBuild = process.env.E2E_SKIP_BUILD === 'true';
    if (shouldSkipBuild) {
      console.log('ℹ️ Skipping build (E2E_SKIP_BUILD=true)');
      return { extensionPath, manifestPath };
    }

    console.log('🏗️ Building extension for E2E...');

    await new Promise<void>((resolve, reject) => {
      const build = spawn('npm', ['run', 'build'], {
        cwd: path.join(__dirname, '../..'),
        stdio: 'inherit'
      });

      build.on('error', reject);
      build.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`npm run build exited with code ${code}`));
      });
    });

    return { extensionPath, manifestPath };
  };

  // Start mock LMStudio server
  const lmStudioMock = new LMStudioMock();
  await lmStudioMock.start(1234);
  
  // Store for global teardown
  (global as any).lmStudioMock = lmStudioMock;

  const { extensionPath, manifestPath } = await runBuildIfNeeded();

  // Verify extension build exists
  try {
    const fs = await import('fs/promises');
    await fs.access(manifestPath);
    console.log('✅ Extension build found');
  } catch (error) {
    console.error('❌ Extension build not found.');
    throw new Error('Extension build missing');
  }

  // Basic verification that extension files are built correctly
  console.log('✅ Extension files validated for testing');

  // Start Vite preview to serve built pages for direct HTTP testing
  const previewUrl = 'http://127.0.0.1:4173';
  // Reuse an existing preview server if one is already running (common after interrupted runs).
  const alreadyRunning = await (async () => {
    try {
      // `fetch` is available in Node 18+.
      const res = await fetch(previewUrl, { method: 'GET' });
      return !!res;
    } catch {
      return false;
    }
  })();

  if (alreadyRunning) {
    console.log(`✅ Reusing existing Vite preview at ${previewUrl}`);
    (global as any).PREVIEW_BASE_URL = previewUrl;
    (process.env as any).PREVIEW_BASE_URL = previewUrl;
    console.log('✅ Global setup complete');
    return {
      lmStudioMock,
      extensionPath,
      preview: null
    } as any;
  }

  const preview = spawn('npm', ['run', 'preview', '--silent', '--', '--port', '4173', '--strictPort'], {
    cwd: path.join(__dirname, '../..'),
    stdio: 'pipe'
  });
  // Store so global teardown can stop it.
  (global as any).preview = preview;

  const previewReady = await new Promise<boolean>((resolve, reject) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        reject(new Error('Vite preview did not become ready within 30s'));
      }
    }, 30_000);

    const handleOutput = (data: Buffer) => {
      const text = data.toString();
      if (!resolved && text.includes('Local:') && text.includes('4173')) {
        resolved = true;
        clearTimeout(timeout);
        resolve(true);
      }
    };

    preview.stdout.on('data', handleOutput);
    preview.stderr.on('data', (data) => {
      const text = data.toString();
      // Surface preview errors early (but don't spam normal logs)
      if (text.toLowerCase().includes('error') || text.toLowerCase().includes('failed')) {
        console.error(`[Vite preview] ${text}`.trim());
      }
    });
    preview.on('exit', (code) => {
      if (!resolved) {
        clearTimeout(timeout);
        reject(new Error(`Vite preview exited early with code ${code ?? 'unknown'}`));
      }
    });
    preview.on('error', (err) => {
      if (!resolved) {
        clearTimeout(timeout);
        reject(err);
      }
    });
  });

  if (previewReady) {
    console.log(`✅ Vite preview started at ${previewUrl}`);
    (global as any).PREVIEW_BASE_URL = previewUrl;
    (process.env as any).PREVIEW_BASE_URL = previewUrl;
  }

  console.log('✅ Global setup complete');
  return {
    lmStudioMock,
    extensionPath,
    preview
  } as any;
}

export default globalSetup;
