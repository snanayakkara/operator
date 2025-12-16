import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { ExtensionTestHelper } from '../helpers/ExtensionTestHelper';

test.describe('Command Bar Flows', () => {
  let pageUnderTest: Page;

  const getCommandInput = () => pageUnderTest.locator('input[aria-label="Search actions"]');
  const getDropdown = () => pageUnderTest.locator('#command-bar-dropdown');

  const lastChromeMessage = async () => {
    return pageUnderTest.evaluate(() => {
      const w = window as any;
      const messages: any[] = Array.isArray(w.__chromeMessages) ? w.__chromeMessages : [];
      return messages.length ? messages[messages.length - 1] : null;
    });
  };

  const openCommandBar = async () => {
    await getCommandInput().click();
    await expect(getDropdown()).toBeVisible({ timeout: 10_000 });
    await expect(getCommandInput()).toBeFocused();
  };

  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['microphone', 'clipboard-read', 'clipboard-write']);
    await ExtensionTestHelper.injectMockAudio(page);

    pageUnderTest = page;

    await pageUnderTest.addInitScript(() => {
      const w = window as any;
      w.__chromeMessages = [];

      const makeEvent = () => ({
        addListener: () => {},
        removeListener: () => {}
      });

      Object.assign(globalThis, {
        chrome: {
          runtime: {
            getURL: (path: string) => path,
            sendMessage: (message: any) => {
              w.__chromeMessages.push(message);
              return Promise.resolve({ success: true, data: {} });
            },
            onMessage: makeEvent(),
            onConnect: makeEvent(),
            onInstalled: makeEvent()
          },
          storage: {
            local: {
              get: () => Promise.resolve({}),
              set: () => Promise.resolve()
            },
            onChanged: makeEvent()
          },
          tabs: {
            query: () => Promise.resolve([]),
            create: () => Promise.resolve({}),
            sendMessage: () => Promise.resolve({}),
            onUpdated: makeEvent()
          },
          permissions: {
            contains: () => Promise.resolve(true),
            request: () => Promise.resolve(true)
          }
        }
      });
    });

    const baseUrl = process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4173';
    await pageUnderTest.goto(`${baseUrl}/src/sidepanel/index.html`, { waitUntil: 'domcontentloaded' });

    await expect(getCommandInput()).toBeVisible({ timeout: 15_000 });
  });

  test('opens on focus and closes with Esc', async ({ page }) => {
    await openCommandBar();
    await page.keyboard.press('Escape');
    await expect(getDropdown()).toHaveCount(0);
  });

  test('opens with / shortcut', async ({ page }) => {
    // Ensure focus is not in the input, otherwise "/" would type into it.
    await pageUnderTest.locator('text=Operator').first().click();
    await page.keyboard.press('/');
    await expect(getDropdown()).toBeVisible({ timeout: 10_000 });
    await expect(getCommandInput()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(getDropdown()).toHaveCount(0);
  });

  test('single-key shortcut triggers clarification flow (P)', async ({ page }) => {
    await openCommandBar();

    // Ensure query is empty so single-key shortcuts are active
    await expect(getCommandInput()).toHaveValue('');
    await page.keyboard.press('P');

    const clarification = pageUnderTest.locator('[aria-label="Clarification required"]');
    await expect(clarification).toBeVisible({ timeout: 10_000 });
    await expect(clarification.locator('text=Please specify the procedure details')).toBeVisible();

    const procedureSelect = clarification.locator('select[aria-label="Procedure Type"]');
    await expect(procedureSelect).toBeVisible();

    // Enter without selection should validate required field
    await page.keyboard.press('Enter');
    await expect(clarification.locator('text=Procedure Type is required')).toBeVisible();

    await procedureSelect.selectOption('pci');
    await page.keyboard.press('Enter');
    await expect(clarification).toHaveCount(0);
  });

  test('hover mode selector dispatches Type for Background (opens EMR field)', async ({ page }) => {
    await openCommandBar();

    await getCommandInput().fill('Background');
    await expect(getDropdown()).toBeVisible();

    const row = getDropdown()
      .locator('div[tabindex="0"]')
      .filter({ hasText: 'Background' })
      .first();

    await row.hover();
    await row.locator('button[title="Type"]').click();

    const msg = await lastChromeMessage();
    expect(msg).toMatchObject({
      type: 'EXECUTE_ACTION',
      action: 'background'
    });
  });

  test('hover mode selector dispatches Vision for Investigations (opens scan modal)', async ({ page }) => {
    await openCommandBar();

    await getCommandInput().fill('Invest');
    await expect(getDropdown()).toBeVisible();

    const row = getDropdown()
      .locator('div[tabindex="0"]')
      .filter({ hasText: 'Investigations' })
      .first();

    await row.hover();
    await row.locator('button[title^="Vision"]').click();

    await expect(pageUnderTest.locator('text=Scan Investigation Report')).toBeVisible({ timeout: 10_000 });
  });

  test('keyboard navigation + Enter triggers errors in command bar (coming soon)', async ({ page }) => {
    await openCommandBar();

    await getCommandInput().fill('ohif');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    const alert = pageUnderTest.locator('[role="alert"]');
    await expect(alert).toBeVisible({ timeout: 10_000 });
    await expect(alert).toContainText('coming soon');

    // Next action clears the error (ActionExecutor clears on execute)
    await openCommandBar();
    await page.keyboard.press('P');
    await expect(alert).toHaveCount(0, { timeout: 10_000 });
  });
});
