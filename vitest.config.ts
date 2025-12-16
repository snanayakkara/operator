import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

// Vitest is used for unit/integration tests. Playwright specs live under `tests/e2e`
// and `tests/*.spec.ts` and should be run via `npx playwright test`.
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/agents': resolve(__dirname, 'src/agents'),
      '@/services': resolve(__dirname, 'src/services'),
      '@/components': resolve(__dirname, 'src/sidepanel/components'),
      '@/types': resolve(__dirname, 'src/types')
    }
  },
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'tests/e2e/**',
      'tests/**/*.spec.ts'
    ]
  }
});
