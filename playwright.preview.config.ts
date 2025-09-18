import base from './playwright.config';
import { defineConfig } from '@playwright/test';

// Serve the built extension with Vite preview for testing pages over HTTP.
export default defineConfig({
  ...base,
  webServer: [
    {
      command: 'npm run preview',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});

