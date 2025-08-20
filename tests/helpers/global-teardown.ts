import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('\n🧹 Cleaning up test environment...');
  
  // Stop mock LMStudio server
  const lmStudioMock = (global as any).lmStudioMock;
  if (lmStudioMock) {
    await lmStudioMock.stop();
    console.log('✅ Mock LMStudio server stopped');
  }

  console.log('✅ Global teardown complete');
}

export default globalTeardown;