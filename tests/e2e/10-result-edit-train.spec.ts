import { test, expect } from './fixtures';
import type { Frame } from '@playwright/test';
import { ExtensionTestHelper } from '../helpers/ExtensionTestHelper';
import { promises as fs } from 'fs';
import path from 'path';

test.describe('Result Edit & Training Capture', () => {
  let extensionId: string;
  let sidePanel: Frame | null;
  let savedGoldenPath: string | null;

  test.beforeEach(async ({ page, context }) => {
    savedGoldenPath = null;

    extensionId = await ExtensionTestHelper.getExtensionId(context);
    await context.grantPermissions(['microphone', 'clipboard-read', 'clipboard-write']);
    await ExtensionTestHelper.injectMockAudio(page, extensionId);

    await page.route('http://localhost:8002/v1/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'healthy' })
      });
    });

    await page.route('http://localhost:8002/v1/dspy/evaluate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, score: 0 })
      });
    });

    await page.route('http://localhost:8002/v1/dspy/optimize/preview', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { candidates: [] } })
      });
    });

    await page.route('http://localhost:8002/v1/dspy/devset/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const agentId = url.pathname.split('/').pop() || 'unknown-agent';
      const payload = request.postDataJSON?.() as any;
      const exampleId: string = payload?.id || `example-${Date.now()}`;

      const devsetDir = path.join(process.cwd(), 'eval', 'devset', agentId);
      await fs.mkdir(devsetDir, { recursive: true });
      savedGoldenPath = path.join(devsetDir, `${exampleId}.json`);
      await fs.writeFile(savedGoldenPath, JSON.stringify(payload, null, 2), 'utf-8');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            file_path: savedGoldenPath,
            example: payload
          }
        })
      });
    });

    sidePanel = await ExtensionTestHelper.openSidePanel(page, extensionId);
    expect(sidePanel).toBeTruthy();
  });

  test.afterEach(async () => {
    if (savedGoldenPath) {
      try {
        await fs.unlink(savedGoldenPath);
      } catch (error) {
        // File may already be removed; ignore
      }
    }
  });

  test('captures clinician revision as golden pair', async ({ page }) => {
    const frame = sidePanel!;
    const consoleLogs: string[] = [];
    frame.on('console', (msg) => consoleLogs.push(msg.text()));

    const seedResults = 'Original investigation summary output requiring revision.';
    const revisedResults = 'Revised investigation summary with proper spacing and abbreviations.';
    const scenarioSummary = 'Ensure measurement spacing and keep abbreviations consistent for investigation summaries.';

    await frame.evaluate(({ seedResults }) => {
      const harness = (window as any).operatorTestHarness;
      harness.actions.setProcessing(false);
      harness.actions.setProcessingStatus('complete');
      harness.actions.setResults(seedResults);
      harness.actions.setResultsSummary('Seed summary for training test.');
      harness.actions.setCurrentAgent('investigation-summary');
      harness.actions.setCurrentAgentName('Investigation Summary Agent');
    }, { seedResults });

    const editButton = frame.locator('button:has-text("Edit & Train")');
    await expect(editButton).toBeEnabled({ timeout: 5000 });
    await editButton.click();

    const revisionPanel = frame.locator('[data-testid="result-revision-panel"]');
    await expect(revisionPanel).toBeVisible();

    await frame.locator('[data-testid="revision-editor"]').fill(revisedResults);
    await frame.locator('[data-testid="revision-notes"]').fill(scenarioSummary);

    await frame.locator('[data-testid="save-revision-btn"]').click();
    await expect(frame.locator('text=Revision saved')).toBeVisible();

    const storedResults = await frame.evaluate(() => {
      const harness = (window as any).operatorTestHarness;
      return harness.getState().results;
    });
    expect(storedResults).toBe(revisedResults);

    await frame.locator('[data-testid="mark-golden-pair-btn"]').click();
    await expect(frame.locator('text=Golden pair saved')).toBeVisible();

    expect(savedGoldenPath).not.toBeNull();
    const fileBuffer = await fs.readFile(savedGoldenPath!);
    const goldenData = JSON.parse(fileBuffer.toString());

    expect(goldenData.expected_output).toBe(revisedResults);
    expect(goldenData.transcript).toBe(seedResults);
    expect(goldenData.metadata?.scenario_summary).toBe(scenarioSummary.trim());

    expect(consoleLogs.some((log) => log.includes('Golden pair saved for optimization'))).toBeTruthy();
  });
});
