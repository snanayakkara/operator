import { test, expect } from '@playwright/test';

// E2E: Extension Options (Settings) page
// Validates navigation, headings, and basic interactions without requiring local services.

async function getExtensionIdFromContext(context: import('@playwright/test').BrowserContext): Promise<string> {
  // Prefer background page URL to extract the ID
  await new Promise((r) => setTimeout(r, 2000));
  const bg = context.backgroundPages();
  if (bg.length > 0) {
    const url = bg[0].url();
    const m = url.match(/chrome-extension:\/\/([a-z]{32})/);
    if (m) return m[1];
  }

  // Fallback: scan open pages
  for (const p of context.pages()) {
    const url = p.url();
    const m = url.match(/chrome-extension:\/\/([a-z]{32})/);
    if (m) return m[1];
  }

  // Fallback: inspect chrome://extensions
  const page = await context.newPage();
  try {
    await page.goto('chrome://extensions/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Enable developer mode if present
    const devModeToggle = page.locator('[role="switch"][aria-labelledby="devMode"]');
    try {
      if (await devModeToggle.isVisible({ timeout: 2000 })) {
        const isEnabled = await devModeToggle.getAttribute('aria-checked');
        if (isEnabled !== 'true') {
          await devModeToggle.click();
          await page.waitForTimeout(1000);
        }
      }
    } catch {
      // Ignore errors when trying to get extension ID
    }

    // Find the extension card by visible name
    const card = page.locator('.extension-list-item').filter({ hasText: 'Operator' });
    if (await card.isVisible({ timeout: 5000 })) {
      // Try details button to reveal id in URL
      const details = card.locator('button:has-text("Details")');
      if (await details.isVisible({ timeout: 1000 })) {
        await details.click();
        await page.waitForTimeout(500);
        const currentUrl = page.url();
        const m = currentUrl.match(/id=([a-z]{32})/);
        if (m) return m[1];
      }

      // Or parse href from card links
      const href = await card.locator('a').first().getAttribute('href');
      if (href) {
        const m2 = href.match(/chrome-extension:\/\/([a-z]{32})/);
        if (m2) return m2[1];
      }
    }
  } finally {
    if (!page.isClosed()) await page.close();
  }

  throw new Error('Could not determine extension ID');
}

async function openOptionsPage(context: import('@playwright/test').BrowserContext) {
  const page = await context.newPage();
  // Preferred: HTTP preview (stable and fast)
  const base = process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4173';
  try {
    await page.goto(`${base}/src/options/index.html`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    return page;
  } catch {
    // Fall through to extension URL fallback
  }

  // Fallback: try through the loaded extension
  try {
    const extensionId = await getExtensionIdFromContext(context);
    await page.goto(`chrome-extension://${extensionId}/src/options/index.html`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    return page;
  } catch {
    // Unable to load options page via extension URL
  }

  // Last resort: file URL (may not load assets with absolute paths)
  const path = await import('path');
  const fs = await import('fs');
  const optionsPath = path.join(process.cwd(), 'dist', 'src', 'options', 'index.html');
  if (!fs.existsSync(optionsPath)) throw new Error('Built options page not found at dist/src/options/index.html');
  const fileUrl = 'file://' + optionsPath;
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  return page;
}

test.describe('Options Settings Page', () => {
  test('loads and navigates sections', async ({ context }) => {
    const page = await openOptionsPage(context);

    // Header renders
    await expect(page.getByRole('heading', { level: 1, name: /Operator Settings/i })).toBeVisible();
    await expect(page.getByText('Configure your medical AI assistant')).toBeVisible();

    // Sidebar labels
    for (const label of ['Overview', 'Transcriptions', 'Optimization', 'AI Services', 'Performance', 'Help & Support']) {
      await expect(page.getByRole('button', { name: new RegExp(`^${label}`) })).toBeVisible();
    }

    // Default section is Overview
    await expect(page.getByRole('heading', { level: 2, name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Extension Status' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Quick Actions' })).toBeVisible();

    // Navigate to Transcriptions and validate header
    await page.getByRole('button', { name: /^Transcriptions/ }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Transcriptions' })).toBeVisible();
    // Either the empty state or the populated header should be visible
    const maybeEmpty = page.getByRole('heading', { name: 'No Corrections Found' });
    if (await maybeEmpty.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(maybeEmpty).toBeVisible();
    } else {
      await expect(page.getByRole('heading', { name: 'Transcription Corrections' })).toBeVisible();
    }

    // Navigate to Optimization and validate key section titles are present
    await page.getByRole('button', { name: /^Optimization/ }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Optimization' })).toBeVisible();
    for (const title of ['Whisper Improvements', 'Report Quality', 'Overnight Optimization', 'Morning Review']) {
      await expect(page.getByRole('button', { name: new RegExp(title) })).toBeVisible();
    }

    // Navigate to AI Services placeholder
    await page.getByRole('button', { name: /^AI Services/ }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'AI Services' })).toBeVisible();
    await expect(page.getByText('Service status and configuration coming soon.')).toBeVisible();

    // Navigate to Performance placeholder
    await page.getByRole('button', { name: /^Performance/ }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Performance' })).toBeVisible();
    await expect(page.getByText('Detailed analytics and metrics coming soon.')).toBeVisible();

    // Navigate to Help & Support
    await page.getByRole('button', { name: /^Help & Support/ }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Help & Support' })).toBeVisible();

    await page.close();
  });

  test('Close button dismisses the options page', async ({ context }) => {
    const page = await openOptionsPage(context);

    // Ensure page is open
    await expect(page.getByRole('heading', { level: 1, name: /Operator Settings/i })).toBeVisible();

    // Close behavior differs between chrome-extension:// and http preview.
    const isExtension = page.url().startsWith('chrome-extension://');
    if (isExtension) {
      const [closed] = await Promise.all([
        page.waitForEvent('close'),
        page.getByRole('button', { name: /^Close$/ }).click(),
      ]);
      expect(closed.isClosed()).toBe(true);
    } else {
      await page.getByRole('button', { name: /^Close$/ }).click();
      // Verify page still responsive and header remains
      await expect(page.getByRole('heading', { level: 1, name: /Operator Settings/i })).toBeVisible();
    }
  });
});
