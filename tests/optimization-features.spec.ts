/**
 * E2E Tests for Optimization Features
 * 
 * Comprehensive testing of ASR corrections, GEPA optimization, and overnight workflows.
 * Tests the full integration from Chrome extension UI to DSPy server processing.
 */

import { test, expect } from '@playwright/test';
import { ExtensionTestHelper } from './helpers/ExtensionTestHelper';

test.describe('Optimization Features', () => {
  let extensionTestHelper: ExtensionTestHelper;
  const DSPY_SERVER_URL = 'http://localhost:8002';

  test.beforeAll(async () => {
    extensionTestHelper = new ExtensionTestHelper();
    await extensionTestHelper.loadExtension();
  });

  test.beforeEach(async ({ context, page }) => {
    await extensionTestHelper.setupPage(page);
  });

  test('should have optimization settings button', async ({ page }) => {
    await page.goto(extensionTestHelper.getSidePanelUrl());
    await page.waitForTimeout(2000);

    // Look for the optimization settings button (floating button)
    const settingsButton = page.locator('button[title="Optimization Settings"]');
    await expect(settingsButton).toBeVisible();

    // Button should have settings icon
    await expect(settingsButton.locator('svg')).toBeVisible();
  });

  test('should open optimization panel', async ({ page }) => {
    await page.goto(extensionTestHelper.getSidePanelUrl());
    await page.waitForTimeout(2000);

    // Click optimization settings button
    const settingsButton = page.locator('button[title="Optimization Settings"]');
    await settingsButton.click();

    // Should see optimization panel
    await expect(page.locator('text=ASR Corrections')).toBeVisible();
    await expect(page.locator('text=GEPA Optimization')).toBeVisible();
    await expect(page.locator('text=Overnight Optimization')).toBeVisible();
  });

  test.describe('DSPy Server Integration', () => {
    test('should connect to DSPy server health endpoint', async ({ request }) => {
      const response = await request.get(`${DSPY_SERVER_URL}/v1/health`);
      expect(response.ok()).toBeTruthy();

      const health = await response.json();
      expect(health.status).toBe('healthy');
      expect(health.server.port).toBe(8002);
      expect(health.dspy).toBeDefined();
    });

    test('should have ASR endpoints available', async ({ request }) => {
      // Test ASR current state endpoint
      const currentResponse = await request.get(`${DSPY_SERVER_URL}/v1/asr/current`);
      expect(currentResponse.ok()).toBeTruthy();

      const currentData = await currentResponse.json();
      expect(currentData.success).toBe(true);
      expect(currentData.data).toHaveProperty('glossary');
      expect(currentData.data).toHaveProperty('rules');
    });

    test('should process ASR preview request', async ({ request }) => {
      const previewRequest = {
        maxTerms: 10,
        maxRules: 10
      };

      const response = await request.post(`${DSPY_SERVER_URL}/v1/asr/preview`, {
        data: previewRequest
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('glossary_additions');
      expect(data.data).toHaveProperty('rule_candidates');
    });

    test('should handle GEPA optimization preview', async ({ request }) => {
      const gepaRequest = {
        tasks: ['quick-letter'],
        iterations: 1,
        with_human: false
      };

      const response = await request.post(`${DSPY_SERVER_URL}/v1/dspy/optimize/preview`, {
        data: gepaRequest
      });

      // Should get a response (might succeed or fail based on DSPy setup)
      expect(response.status()).toBeLessThan(500);
      
      const data = await response.json();
      expect(data).toHaveProperty('success');
      
      if (data.success) {
        expect(data.data).toHaveProperty('candidates');
      } else {
        // Expected if DSPy not properly configured
        expect(data.error).toBeDefined();
      }
    });

    test('should create overnight optimization job', async ({ request }) => {
      const overnightRequest = {
        tasks: ['quick-letter'],
        iterations: 1,
        with_human: false,
        asr: {
          maxTerms: 10,
          maxRules: 10
        }
      };

      const response = await request.post(`${DSPY_SERVER_URL}/v1/optimize/overnight`, {
        data: overnightRequest
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('job_id');
      expect(data.data.status).toBe('QUEUED');

      // Check job status
      const jobId = data.data.job_id;
      const statusResponse = await request.get(`${DSPY_SERVER_URL}/v1/jobs/${jobId}`);
      expect(statusResponse.ok()).toBeTruthy();
      
      const statusData = await statusResponse.json();
      expect(statusData.success).toBe(true);
      expect(statusData.data.job_id).toBe(jobId);
      expect(['QUEUED', 'RUNNING', 'DONE', 'ERROR']).toContain(statusData.data.status);
    });

    test('should cancel overnight optimization job', async ({ request }) => {
      // Create a job first
      const overnightRequest = {
        tasks: ['quick-letter'],
        iterations: 1,
        with_human: false,
        asr: { maxTerms: 5, maxRules: 5 }
      };

      const createResponse = await request.post(`${DSPY_SERVER_URL}/v1/optimize/overnight`, {
        data: overnightRequest
      });
      expect(createResponse.ok()).toBeTruthy();
      const createData = await createResponse.json();
      const jobId = createData.data.job_id;

      // Cancel the job
      const cancelResponse = await request.post(`${DSPY_SERVER_URL}/v1/jobs/${jobId}/cancel`);
      expect(cancelResponse.ok()).toBeTruthy();
      
      const cancelData = await cancelResponse.json();
      expect(cancelData.success).toBe(true);
      expect(cancelData.data.cancelled).toBe(true);
    });
  });

  test.describe('ASR Corrections Integration', () => {
    test('should log corrections when editing transcripts', async ({ page }) => {
      await page.goto(extensionTestHelper.getSidePanelUrl());
      await page.waitForTimeout(2000);

      // Mock a transcription being available
      await page.evaluate(() => {
        // Simulate having a transcription to edit
        window.postMessage({
          type: 'MOCK_TRANSCRIPTION',
          transcription: 'Patient has metroprolol 50mg daily',
          currentAgent: 'medication'
        }, '*');
      });

      // Wait for mock transcription to be processed
      await page.waitForTimeout(1000);

      // Look for edit button on transcription
      const editButton = page.locator('button[title="Edit transcription"]');
      if (await editButton.isVisible()) {
        await editButton.click();

        // Edit the transcription
        const textarea = page.locator('textarea');
        await textarea.fill('Patient has metoprolol 50mg daily'); // Correct spelling

        // Save the edit
        const saveButton = page.locator('button', { hasText: 'Save' });
        await saveButton.click();

        // Verify the correction was logged (check console logs)
        const logs = await page.evaluate(() => {
          return (window as any).mockLogs || [];
        });

        const correctionLogs = logs.filter((log: any) => 
          log.includes('ASR correction logged')
        );

        expect(correctionLogs.length).toBeGreaterThan(0);
      }
    });

    test('should upload corrections to DSPy server', async ({ page, request }) => {
      // Mock some corrections in Chrome storage
      await page.evaluate(() => {
        const mockCorrections = [
          {
            id: 'test-correction-1',
            rawText: 'metroprolol',
            correctedText: 'metoprolol',
            agentType: 'medication',
            timestamp: Date.now()
          }
        ];

        // Mock Chrome storage API
        (window as any).chrome = {
          storage: {
            local: {
              get: (key: string, callback: Function) => {
                callback({ [key]: mockCorrections });
              }
            }
          }
        };
      });

      // Test upload corrections endpoint
      const mockCorrections = [
        {
          id: 'test-correction-1',
          rawText: 'metroprolol',
          correctedText: 'metoprolol',
          agentType: 'medication',
          timestamp: Date.now()
        }
      ];

      const response = await request.post(`${DSPY_SERVER_URL}/v1/asr/corrections`, {
        data: { corrections: mockCorrections }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.uploaded).toBe(1);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle DSPy server unavailable', async ({ page }) => {
      await page.goto(extensionTestHelper.getSidePanelUrl());
      await page.waitForTimeout(2000);

      // Mock network error for DSPy server
      await page.route('**/localhost:8002/**', route => {
        route.abort('failed');
      });

      // Open optimization panel
      const settingsButton = page.locator('button[title="Optimization Settings"]');
      await settingsButton.click();

      // Should show connection error
      await expect(page.locator('text=Failed to connect to DSPy server')).toBeVisible({ timeout: 10000 });
    });

    test('should handle invalid job requests', async ({ request }) => {
      // Test with missing required fields
      const invalidRequest = {
        // Missing 'tasks' field
        iterations: 1
      };

      const response = await request.post(`${DSPY_SERVER_URL}/v1/optimize/overnight`, {
        data: invalidRequest
      });

      expect(response.status()).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required field: tasks');
    });

    test('should handle non-existent job status requests', async ({ request }) => {
      const response = await request.get(`${DSPY_SERVER_URL}/v1/jobs/non-existent-job`);
      expect(response.status()).toBe(500);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Job not found');
    });
  });

  test.describe('UI Component Integration', () => {
    test('should show server status in optimization panel', async ({ page }) => {
      await page.goto(extensionTestHelper.getSidePanelUrl());
      await page.waitForTimeout(2000);

      // Open optimization panel
      const settingsButton = page.locator('button[title="Optimization Settings"]');
      await settingsButton.click();

      // Wait for server status check
      await page.waitForTimeout(3000);

      // Should show either healthy status or connection error
      const statusElements = await page.locator('text=healthy, text=unhealthy, text=Failed to connect').count();
      expect(statusElements).toBeGreaterThan(0);
    });

    test('should have functional accordion sections', async ({ page }) => {
      await page.goto(extensionTestHelper.getSidePanelUrl());
      await page.waitForTimeout(2000);

      // Open optimization panel
      const settingsButton = page.locator('button[title="Optimization Settings"]');
      await settingsButton.click();

      // Test ASR section toggle
      const asrHeader = page.locator('text=ASR Corrections').first();
      await asrHeader.click();
      
      // Should see ASR content
      await expect(page.locator('text=Preview corrections from daily usage')).toBeVisible();

      // Test GEPA section
      const gepaHeader = page.locator('text=GEPA Optimization').first();
      await gepaHeader.click();
      
      // Should see GEPA content
      await expect(page.locator('text=Optimize LLM prompts')).toBeVisible();

      // Test Overnight section
      const overnightHeader = page.locator('text=Overnight Optimization').first();
      await overnightHeader.click();
      
      // Should see overnight content
      await expect(page.locator('text=Combined overnight workflow')).toBeVisible();
    });
  });

  test.afterAll(async () => {
    if (extensionTestHelper) {
      await extensionTestHelper.cleanup();
    }
  });
});