import base from './playwright.config';
import { defineConfig } from '@playwright/test';

// Override to disable webServer for ad-hoc runs where we pre-build separately.
export default defineConfig({
  ...base,
  webServer: [],
});

