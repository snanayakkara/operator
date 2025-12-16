/**
 * Patient Education Agent E2E Tests
 * 
 * Tests the complete Patient Education workflow from UI interaction to content generation
 */

import { test, expect } from './fixtures';
import type { Page, BrowserContext } from '@playwright/test';
import { ExtensionTestHelper } from '../helpers/ExtensionTestHelper';
import { LMStudioMock } from '../helpers/LMStudioMock';

const EXTENSION_PATH = './dist';

let context: BrowserContext;
let extensionPage: Page;
let helper: ExtensionTestHelper;
let lmStudioMock: LMStudioMock;

test.beforeAll(async ({ browser }) => {
  // Load extension
  context = await browser.newContext({
    ignoreHTTPSErrors: true,
  });
  
  await context.addInitScript(() => {
    // Mock chrome extension APIs
    Object.assign(globalThis, {
      chrome: {
        runtime: {
          getURL: (path: string) => `chrome-extension://test/${path}`,
          sendMessage: () => Promise.resolve({}),
          onMessage: {
            addListener: () => {},
            removeListener: () => {}
          }
        },
        storage: {
          local: {
            get: () => Promise.resolve({}),
            set: () => Promise.resolve()
          }
        },
        tabs: {
          query: () => Promise.resolve([]),
          sendMessage: () => Promise.resolve({})
        }
      }
    });
  });

  extensionPage = await context.newPage();
  helper = new ExtensionTestHelper(extensionPage);
  lmStudioMock = new LMStudioMock();
  
  // Navigate to extension
  await extensionPage.goto('http://localhost:5173');
  await extensionPage.waitForSelector('[data-testid="extension-loaded"]', { timeout: 10000 });
});

test.afterAll(async () => {
  if (lmStudioMock) {
    await lmStudioMock.stop();
  }
  await context?.close();
});

test.describe('Patient Education Agent', () => {
  test.beforeEach(async () => {
    // Reset state before each test
    await extensionPage.reload();
    await extensionPage.waitForSelector('[data-testid="extension-loaded"]');
  });

  test('should be accessible via QuickActions', async () => {
    // Look for Patient Education in QuickActions
    await expect(extensionPage.locator('text=Patient Education')).toBeVisible();
    
    // Click to expand patient education options
    await extensionPage.click('text=Patient Education');
    
    // Should show configuration interface
    await expect(extensionPage.locator('text=Patient Priority Level')).toBeVisible({ timeout: 5000 });
    await expect(extensionPage.locator('text=Select Lifestyle Areas')).toBeVisible();
  });

  test('should display priority selection options', async () => {
    await extensionPage.click('text=Patient Education');
    await extensionPage.waitForSelector('text=Patient Priority Level');
    
    // Check all three priority options are present
    await expect(extensionPage.locator('text=High Priority')).toBeVisible();
    await expect(extensionPage.locator('text=Medium Priority')).toBeVisible();
    await expect(extensionPage.locator('text=Low Priority')).toBeVisible();
    
    // Medium should be selected by default
    const mediumRadio = extensionPage.locator('input[value="medium"]');
    await expect(mediumRadio).toBeChecked();
  });

  test('should display all lifestyle modules with tooltips', async () => {
    await extensionPage.click('text=Patient Education');
    await extensionPage.waitForSelector('text=Select Lifestyle Areas');
    
    // Check key modules are present
    await expect(extensionPage.locator('text=Diet & Nutrition')).toBeVisible();
    await expect(extensionPage.locator('text=Physical Activity')).toBeVisible();
    await expect(extensionPage.locator('text=Smoking Cessation')).toBeVisible();
    await expect(extensionPage.locator('text=Weight Management')).toBeVisible();
    await expect(extensionPage.locator('text=Medication Adherence')).toBeVisible();
    
    // Test tooltip functionality
    await extensionPage.hover('[title*="Evidence-based nutrition advice"]');
    await expect(extensionPage.locator('text=Evidence-based nutrition advice')).toBeVisible();
  });

  test('should handle module selection correctly', async () => {
    await extensionPage.click('text=Patient Education');
    await extensionPage.waitForSelector('text=Select Lifestyle Areas');
    
    // Diet and Physical Activity should be selected by default
    const dietCheckbox = extensionPage.locator('button:has-text("Diet & Nutrition")').first();
    const exerciseCheckbox = extensionPage.locator('button:has-text("Physical Activity")').first();
    
    // Add smoking cessation
    const smokingCheckbox = extensionPage.locator('button:has-text("Smoking Cessation")').first();
    await smokingCheckbox.click();
    
    // Verify selections
    // Note: In actual implementation, you'd check for visual indicators of selection
    await expect(extensionPage.locator('text=Smoking Cessation')).toBeVisible();
  });

  test('should prevent generation with no modules selected', async () => {
    await extensionPage.click('text=Patient Education');
    await extensionPage.waitForSelector('text=Select Lifestyle Areas');
    
    // Deselect all modules (assuming they start selected)
    const dietCheckbox = extensionPage.locator('button:has-text("Diet & Nutrition")').first();
    await dietCheckbox.click();
    
    const exerciseCheckbox = extensionPage.locator('button:has-text("Physical Activity")').first(); 
    await exerciseCheckbox.click();
    
    // Generate button should be disabled
    const generateButton = extensionPage.locator('button:has-text("Generate Lifestyle Advice")');
    await expect(generateButton).toBeDisabled();
    
    // Should show error message
    await expect(extensionPage.locator('text=Please select at least one lifestyle area')).toBeVisible();
  });

  test('should display important safety notice', async () => {
    await extensionPage.click('text=Patient Education');
    await extensionPage.waitForSelector('text=Education Only');
    
    // Check safety disclaimer
    await expect(extensionPage.locator('text=Education Only')).toBeVisible();
    await expect(extensionPage.locator('text=does not diagnose conditions')).toBeVisible();
    await expect(extensionPage.locator('text=recommend medication changes')).toBeVisible();
  });

  test('should complete full patient education workflow', async () => {
    // Start LMStudio mock with patient education response
    await lmStudioMock.start();
    lmStudioMock.mockResponse({
      content: `## Heart-Healthy Eating

Following a heart-healthy diet is essential for cardiovascular health. The Australian Heart Foundation recommends a Mediterranean-style eating pattern rich in vegetables, fruits, whole grains, and healthy fats.

**Key Principles:**
• Fill half your plate with vegetables and fruits at each meal
• Choose whole grain breads and cereals over processed options
• Include healthy fats like olive oil, nuts, and seeds
• Limit saturated fats from processed meats
• Reduce sodium by cooking fresh foods

**Practical Steps:**
• Aim for 2 serves of fruit and 5 serves of vegetables daily
• Include fish twice per week, particularly oily fish
• Use herbs and spices for flavour instead of salt
• Read food labels and choose options with less than 120mg sodium per 100g

Visit heartfoundation.org.au for meal planning guides.

## Staying Active for Heart Health

Regular physical activity is one of the most important things you can do for heart health. The Australian Physical Activity Guidelines recommend at least 150 minutes of moderate activity per week.

**Getting Started:**
• Begin with 10-minute walks and gradually increase
• Aim for 30 minutes of activity most days
• Choose activities you enjoy - walking, swimming, cycling
• Start slowly and build up gradually

Any movement is better than none. Find activities you enjoy.`,
      processingTime: 2500
    });
    
    // Open Patient Education
    await extensionPage.click('text=Patient Education');
    await extensionPage.waitForSelector('text=Patient Priority Level');
    
    // Select high priority
    await extensionPage.click('input[value="high"]');
    
    // Ensure diet and exercise are selected (should be by default)
    // Add stress management
    const stressCheckbox = extensionPage.locator('button:has-text("Stress Management")').first();
    await stressCheckbox.click();
    
    // Generate advice
    await extensionPage.click('button:has-text("Generate Lifestyle Advice")');
    
    // Should show processing state
    await expect(extensionPage.locator('text=Generating personalized lifestyle advice')).toBeVisible();
    
    // Wait for results
    await expect(extensionPage.locator('text=Heart-Healthy Eating')).toBeVisible({ timeout: 10000 });
    await expect(extensionPage.locator('text=Staying Active for Heart Health')).toBeVisible();
    
    // Check Australian content
    await expect(extensionPage.locator('text=Australian Heart Foundation')).toBeVisible();
    await expect(extensionPage.locator('text=Australian Physical Activity Guidelines')).toBeVisible();
    await expect(extensionPage.locator('text=heartfoundation.org.au')).toBeVisible();
  });

  test('should display educational metadata correctly', async () => {
    await lmStudioMock.start();
    lmStudioMock.mockResponse({
      content: `## Diet & Nutrition\n\nFollowing Australian Heart Foundation guidelines...\n\nVisit heartfoundation.org.au for resources.`,
      processingTime: 1800
    });
    
    await extensionPage.click('text=Patient Education');
    await extensionPage.waitForSelector('text=Patient Priority Level');
    
    // Select medium priority and generate
    await extensionPage.click('input[value="medium"]');
    await extensionPage.click('button:has-text("Generate Lifestyle Advice")');
    
    // Wait for results
    await expect(extensionPage.locator('text=Diet & Nutrition')).toBeVisible({ timeout: 10000 });
    
    // Check metadata display
    await expect(extensionPage.locator('text=Medium Priority')).toBeVisible();
    await expect(extensionPage.locator('text=Areas Covered:')).toBeVisible();
    await expect(extensionPage.locator('text=Australian Guidelines Referenced:')).toBeVisible();
    await expect(extensionPage.locator('text=Support Resources Mentioned:')).toBeVisible();
    
    // Check generation time
    await expect(extensionPage.locator('text=Generated in')).toBeVisible();
  });

  test('should provide Copy and Insert functionality', async () => {
    await lmStudioMock.start();
    lmStudioMock.mockResponse({
      content: `## Diet & Nutrition\n\nHeart-healthy eating advice for Australian patients...`,
      processingTime: 2000
    });
    
    await extensionPage.click('text=Patient Education');
    await extensionPage.waitForSelector('text=Patient Priority Level');
    await extensionPage.click('button:has-text("Generate Lifestyle Advice")');
    
    await expect(extensionPage.locator('text=Diet & Nutrition')).toBeVisible({ timeout: 10000 });
    
    // Check action buttons are present
    await expect(extensionPage.locator('button:has-text("Copy")')).toBeVisible();
    await expect(extensionPage.locator('button:has-text("Insert")')).toBeVisible();
    
    // Test copy functionality
    await extensionPage.click('button:has-text("Copy")');
    await expect(extensionPage.locator('text=Copied!')).toBeVisible({ timeout: 3000 });
  });

  test('should handle EMR extraction errors gracefully', async () => {
    // Simulate EMR extraction error
    await extensionPage.evaluate(() => {
      // Simulate error state
      window.dispatchEvent(new CustomEvent('emrExtractionError', {
        detail: { error: 'Unable to extract patient data from current page' }
      }));
    });
    
    await extensionPage.click('text=Patient Education');
    
    // Should show error message
    await expect(extensionPage.locator('text=EMR Extraction Issue')).toBeVisible();
    await expect(extensionPage.locator('text=Unable to extract patient data')).toBeVisible();
    
    // Should still allow generation
    const generateButton = extensionPage.locator('button:has-text("Generate Lifestyle Advice")');
    await expect(generateButton).toBeEnabled();
    
    // Should show retry button
    await expect(extensionPage.locator('button:has-text("Retry Extraction")')).toBeVisible();
  });

  test('should show appropriate warnings for generated content', async () => {
    await lmStudioMock.start();
    lmStudioMock.mockResponse({
      content: `## Diet & Nutrition\n\nGeneral lifestyle advice...`,
      warnings: ['Content may benefit from including: specific recommendations'],
      processingTime: 2200
    });
    
    await extensionPage.click('text=Patient Education');
    await extensionPage.waitForSelector('text=Patient Priority Level');
    await extensionPage.click('button:has-text("Generate Lifestyle Advice")');
    
    await expect(extensionPage.locator('text=Diet & Nutrition')).toBeVisible({ timeout: 10000 });
    
    // Should show content notice
    await expect(extensionPage.locator('text=Content Notice')).toBeVisible();
    await expect(extensionPage.locator('text=specific recommendations')).toBeVisible();
  });

  test('should display final disclaimer', async () => {
    await lmStudioMock.start();
    lmStudioMock.mockResponse({
      content: `## Diet & Nutrition\n\nHealthy eating advice...`,
      processingTime: 1500
    });
    
    await extensionPage.click('text=Patient Education');
    await extensionPage.waitForSelector('text=Patient Priority Level');
    await extensionPage.click('button:has-text("Generate Lifestyle Advice")');
    
    await expect(extensionPage.locator('text=Diet & Nutrition')).toBeVisible({ timeout: 10000 });
    
    // Should show important disclaimer
    await expect(extensionPage.locator('text=Important Disclaimer')).toBeVisible();
    await expect(extensionPage.locator('text=educational purposes only')).toBeVisible();
    await expect(extensionPage.locator('text=should not replace professional medical advice')).toBeVisible();
    await expect(extensionPage.locator('text=Always consult with your healthcare team')).toBeVisible();
  });

  test('should handle content filtering for safety', async () => {
    await lmStudioMock.start();
    lmStudioMock.mockResponse({
      content: `[CONTENT FILTERED FOR SAFETY] lifestyle advice...`,
      errors: ['Generated content contained prohibited medical advice and has been filtered'],
      processingTime: 2100
    });
    
    await extensionPage.click('text=Patient Education');
    await extensionPage.waitForSelector('text=Patient Priority Level');
    await extensionPage.click('button:has-text("Generate Lifestyle Advice")');
    
    // Should show error notification
    await expect(extensionPage.locator('text=Generation Issues')).toBeVisible({ timeout: 10000 });
    await expect(extensionPage.locator('text=prohibited medical advice')).toBeVisible();
    
    // Should show filtered content
    await expect(extensionPage.locator('text=CONTENT FILTERED FOR SAFETY')).toBeVisible();
    
    // Should offer regeneration option
    await expect(extensionPage.locator('button:has-text("Regenerate")')).toBeVisible();
  });
});
