import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { ExtensionTestHelper } from '../helpers/ExtensionTestHelper';

test.describe('Favourites Row Flows', () => {
  let pageUnderTest: Page;

  const chromeMessages = async () => {
    return pageUnderTest.evaluate(() => {
      const w = window as any;
      return Array.isArray(w.__chromeMessages) ? w.__chromeMessages : [];
    });
  };

  const lastChromeMessage = async () => {
    const messages = await chromeMessages();
    return messages.length ? messages[messages.length - 1] : null;
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

    await expect(pageUnderTest.locator('text=Operator').first()).toBeVisible({ timeout: 15_000 });
    await expect(pageUnderTest.locator('[data-action-id="quick-letter"]')).toBeVisible({ timeout: 15_000 });
    await expect(pageUnderTest.locator('[data-action-id="background"]')).toBeVisible({ timeout: 15_000 });
    await expect(pageUnderTest.locator('[data-action-id="investigation-summary"]')).toBeVisible({ timeout: 15_000 });
    await expect(pageUnderTest.locator('[data-action-id="appointment-wrap-up"]')).toBeVisible({ timeout: 15_000 });
  });

  test('Quick Letter Type opens Paste Notes (not EMR dialog)', async () => {
    await pageUnderTest.locator('[data-action-id="quick-letter"]').hover();
    await pageUnderTest.locator('button[aria-label="Type Quick Letter manually"]').click();
    await expect(pageUnderTest.locator('#paste-notes-title')).toHaveText('Paste Clinical Notes');
  });

  test('Background Type dispatches EMR Background dialog (not Paste Notes)', async () => {
    const before = (await chromeMessages()).length;

    await pageUnderTest.locator('[data-action-id="background"]').hover();
    await pageUnderTest.locator('button[aria-label="Type Background manually"]').click();

    const after = (await chromeMessages()).length;
    expect(after).toBe(before + 1);

    const msg = await lastChromeMessage();
    expect(msg).toMatchObject({
      type: 'EXECUTE_ACTION',
      action: 'background'
    });

    await expect(pageUnderTest.locator('#paste-notes-title')).toHaveCount(0);
  });

  test('Background Type click target does not misfire as Quick Letter', async () => {
    const before = (await chromeMessages()).length;

    const tile = pageUnderTest.locator('[data-action-id="background"]');
    await tile.hover();

    const box = await tile.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // Click the right-side split area (Type) by position, mirroring real user behaviour.
    await pageUnderTest.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.55);

    const after = (await chromeMessages()).length;
    expect(after).toBe(before + 1);

    const msg = await lastChromeMessage();
    expect(msg).toMatchObject({
      type: 'EXECUTE_ACTION',
      action: 'background'
    });

    await expect(pageUnderTest.locator('#paste-notes-title')).toHaveCount(0);
  });

  test('Investigations Type dispatches EMR Investigation Summary dialog', async () => {
    const before = (await chromeMessages()).length;

    await pageUnderTest.locator('[data-action-id="investigation-summary"]').hover();
    await pageUnderTest.locator('button[aria-label="Type Investigations manually"]').click();

    const after = (await chromeMessages()).length;
    expect(after).toBe(before + 1);

    const msg = await lastChromeMessage();
    expect(msg).toMatchObject({
      type: 'EXECUTE_ACTION',
      action: 'investigation-summary'
    });
  });

  test('Investigations Vision opens scan modal', async () => {
    await pageUnderTest.locator('[data-action-id="investigation-summary"]').hover();
    await pageUnderTest.locator('button[aria-label^="Scan Investigations"]').click();
    await expect(pageUnderTest.locator('text=Scan Investigation Report')).toBeVisible({ timeout: 10_000 });
  });

  test('Wrap Up opens Appointment Wrap Up builder', async () => {
    await pageUnderTest.locator('[data-action-id="appointment-wrap-up"]').click();
    await expect(pageUnderTest.locator('text=Appointment Wrap Up')).toBeVisible({ timeout: 10_000 });
  });
});
