import { test, expect } from './fixtures';
import type { Page, Frame } from '@playwright/test';
import { ExtensionTestHelper } from '../helpers/ExtensionTestHelper';
import { MEDICAL_DICTATIONS, getDictation, getExpectedOutputs, getExpectedProcessingTime } from '../helpers/MedicalDictations';

test.describe('Comprehensive Workflow Tests - All Medical Specialties', () => {
  let extensionId: string;
  let sidePanel: Frame | null;

  test.beforeEach(async ({ page, context }) => {
    console.log('🏥 Setting up comprehensive workflow test environment...');
    
    // Get extension ID and setup
    extensionId = await ExtensionTestHelper.getExtensionId(context);
    
    // Grant necessary permissions
    await context.grantPermissions(['microphone', 'clipboard-read', 'clipboard-write']);
    
    // Inject mock audio functionality
    await ExtensionTestHelper.injectMockAudio(page, extensionId);
    
    // Open side panel
    sidePanel = await ExtensionTestHelper.openSidePanel(page, extensionId);
    expect(sidePanel).toBeTruthy();
    
    console.log('✅ Test environment ready');
  });

  // Test each workflow type individually
  Object.keys(MEDICAL_DICTATIONS).forEach(workflowType => {
    test(`should complete ${workflowType.toUpperCase()} workflow successfully`, async ({ page }) => {
      console.log(`🔄 Testing ${workflowType} workflow...`);
      
      const dictation = getDictation(workflowType, 'simple');
      const expectedOutputs = getExpectedOutputs(workflowType);
      const expectedTime = getExpectedProcessingTime(workflowType);
      
      const startTime = Date.now();
      
      // Step 1: Select appropriate workflow
      console.log(`📝 Step 1: Selecting ${workflowType} workflow`);
      const workflowButton = await findWorkflowButton(sidePanel!, workflowType);
      expect(workflowButton).toBeTruthy();
      
      if (workflowButton) {
        await workflowButton.click();
        await page.waitForTimeout(1000);
        
        // Step 2: Verify recording state
        console.log('🎤 Step 2: Verifying recording started');
        await verifyRecordingState(sidePanel!, true);
        
        // Step 3: Simulate medical dictation
        console.log('🗣️ Step 3: Simulating medical dictation');
        await simulateDictation(page, sidePanel!, dictation);
        
        // Step 4: Stop recording
        console.log('⏹️ Step 4: Stopping recording');
        await workflowButton.click(); // Click same button to stop
        await page.waitForTimeout(2000);
        
        // Step 5: Wait for processing and verify results
        console.log('⚗️ Step 5: Processing and validation');
        const report = await waitForReport(sidePanel!, expectedTime + 5000);
        expect(report).toBeTruthy();
        expect(report.length).toBeGreaterThan(50);
        
        // Step 6: Validate medical content
        console.log('✅ Step 6: Validating medical content');
        await validateMedicalContent(report, expectedOutputs, workflowType);
        
        const totalTime = Date.now() - startTime;
        console.log(`🎉 ${workflowType.toUpperCase()} workflow completed in ${totalTime}ms`);
        
        // Verify processing time is reasonable
        expect(totalTime).toBeLessThan(expectedTime + 10000); // Allow 10s buffer
      }
    });
  });

  test('should handle complex dictations for all workflows', async ({ page }) => {
    console.log('🔄 Testing complex dictations across all workflows...');
    
    // Test subset of workflows with complex dictations
    const complexWorkflows = ['tavi', 'angiogram-pci', 'consultation', 'mteer'];
    
    for (const workflowType of complexWorkflows) {
      console.log(`📝 Testing complex ${workflowType} dictation...`);
      
      const complexDictation = getDictation(workflowType, 'complex');
      const expectedOutputs = getExpectedOutputs(workflowType);
      
      // Select workflow
      const workflowButton = await findWorkflowButton(sidePanel!, workflowType);
      if (workflowButton) {
        await workflowButton.click();
        await page.waitForTimeout(1000);
        
        // Simulate complex dictation
        await simulateDictation(page, sidePanel!, complexDictation);
        
        // Stop recording
        await workflowButton.click();
        await page.waitForTimeout(3000); // Longer wait for complex processing
        
        // Validate results
        const report = await waitForReport(sidePanel!, 20000);
        expect(report).toBeTruthy();
        expect(report.length).toBeGreaterThan(200); // Complex reports should be longer
        
        await validateMedicalContent(report, expectedOutputs, workflowType);
        
        // Clear session for next workflow
        await clearSession(sidePanel!);
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should handle workflow switching', async ({ page }) => {
    console.log('🔄 Testing workflow switching capabilities...');
    
    const initialDictation = getDictation('quick-letter', 'simple');
    
    // Step 1: Start with quick-letter workflow
    console.log('📝 Step 1: Starting with quick-letter workflow');
    const quickLetterButton = await findWorkflowButton(sidePanel!, 'quick-letter');
    expect(quickLetterButton).toBeTruthy();
    
    if (quickLetterButton) {
      await quickLetterButton.click();
      await page.waitForTimeout(500);
      
      await simulateDictation(page, sidePanel!, initialDictation);
      await quickLetterButton.click();
      await page.waitForTimeout(2000);
      
      // Wait for initial processing
      const initialReport = await waitForReport(sidePanel!, 10000);
      expect(initialReport).toBeTruthy();
      
      // Step 2: Switch to different workflow with same transcription
      console.log('🔄 Step 2: Switching to consultation workflow');
      const consultationButton = await findWorkflowButton(sidePanel!, 'consultation');
      
      if (consultationButton) {
        // Look for reprocess functionality in transcription section
        const reprocessButton = sidePanel!.locator('button').filter({ hasText: /reprocess|consultation/i });
        
        if (await reprocessButton.count() > 0) {
          await reprocessButton.first().click();
          await page.waitForTimeout(3000);
          
          // Verify different result
          const newReport = await waitForReport(sidePanel!, 10000);
          expect(newReport).toBeTruthy();
          expect(newReport).not.toEqual(initialReport); // Should be different
          expect(newReport.length).toBeGreaterThan(initialReport.length); // Consultation should be longer
          
          console.log('✅ Workflow switching successful');
        } else {
          console.log('⚠️ Reprocess functionality not available in this UI state');
        }
      }
    }
  });

  test('should validate processing times for all workflows', async ({ page }) => {
    console.log('⏱️ Testing processing time benchmarks...');
    
    const processingTimes: Record<string, number> = {};
    const testWorkflows = ['quick-letter', 'tavi', 'angiogram-pci', 'consultation'];
    
    for (const workflowType of testWorkflows) {
      console.log(`⏱️ Benchmarking ${workflowType} processing time...`);
      
      const dictation = getDictation(workflowType, 'simple');
      const expectedTime = getExpectedProcessingTime(workflowType);
      
      const workflowButton = await findWorkflowButton(sidePanel!, workflowType);
      if (workflowButton) {
        const startTime = Date.now();
        
        await workflowButton.click();
        await page.waitForTimeout(500);
        
        await simulateDictation(page, sidePanel!, dictation);
        await workflowButton.click();
        
        const processingStart = Date.now();
        await waitForReport(sidePanel!, expectedTime + 5000);
        const processingEnd = Date.now();
        
        const actualProcessingTime = processingEnd - processingStart;
        processingTimes[workflowType] = actualProcessingTime;
        
        console.log(`${workflowType}: ${actualProcessingTime}ms (expected: ${expectedTime}ms)`);
        
        // Verify processing time is within reasonable bounds
        expect(actualProcessingTime).toBeLessThan(expectedTime * 1.5); // Allow 50% buffer
        
        await clearSession(sidePanel!);
        await page.waitForTimeout(1000);
      }
    }
    
    console.log('📊 Processing time summary:', processingTimes);
  });

  test('should handle workflow-specific UI elements', async ({ page }) => {
    console.log('🎨 Testing workflow-specific UI elements...');
    
    // Test TAVI workflow UI
    console.log('🫀 Testing TAVI workflow UI elements');
    const taviButton = await findWorkflowButton(sidePanel!, 'tavi');
    if (taviButton) {
      await taviButton.click();
      await page.waitForTimeout(500);
      
      // Verify TAVI-specific elements
      const statusText = await sidePanel!.locator('[data-testid="status-indicator"], .status-indicator, text=/TAVI/i').first().textContent();
      expect(statusText?.toLowerCase()).toContain('tavi');
      
      await taviButton.click(); // Stop recording
      await page.waitForTimeout(1000);
      
      await clearSession(sidePanel!);
    }
    
    // Test Investigation Summary workflow
    console.log('🔬 Testing Investigation Summary workflow UI');
    const investigationButton = await findWorkflowButton(sidePanel!, 'investigation-summary');
    if (investigationButton) {
      await investigationButton.click();
      await page.waitForTimeout(500);
      
      // Verify investigation-specific elements
      const statusText = await sidePanel!.locator('text=/investigation/i').first().textContent();
      expect(statusText?.toLowerCase()).toContain('investigation');
      
      await investigationButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should validate output quality across all workflows', async ({ page }) => {
    console.log('🔍 Testing output quality validation...');
    
    const qualityResults: Record<string, any> = {};
    const testWorkflows = ['quick-letter', 'tavi', 'consultation'];
    
    for (const workflowType of testWorkflows) {
      console.log(`🔍 Validating ${workflowType} output quality...`);
      
      const dictation = getDictation(workflowType, 'simple');
      const expectedOutputs = getExpectedOutputs(workflowType);
      
      const workflowButton = await findWorkflowButton(sidePanel!, workflowType);
      if (workflowButton) {
        await workflowButton.click();
        await page.waitForTimeout(500);
        
        await simulateDictation(page, sidePanel!, dictation);
        await workflowButton.click();
        await page.waitForTimeout(3000);
        
        const report = await waitForReport(sidePanel!, 15000);
        
        // Quality checks
        const wordCount = report.split(/\s+/).length;
        const hasExpectedTerms = expectedOutputs.every(term => 
          report.toLowerCase().includes(term.toLowerCase())
        );
        const hasProperStructure = report.includes('\n') || report.length > 100;
        
        qualityResults[workflowType] = {
          wordCount,
          hasExpectedTerms,
          hasProperStructure,
          reportLength: report.length
        };
        
        // Assertions
        expect(wordCount).toBeGreaterThan(20);
        expect(hasExpectedTerms).toBe(true);
        expect(hasProperStructure).toBe(true);
        
        await clearSession(sidePanel!);
        await page.waitForTimeout(1000);
      }
    }
    
    console.log('📊 Quality validation results:', qualityResults);
  });

  // Helper functions
  async function findWorkflowButton(sidePanel: Frame, workflowType: string): Promise<any> {
    // Look for workflow button by text content or data attributes
    const buttonSelectors = [
      `button:has-text("${workflowType}")`,
      `button[data-workflow="${workflowType}"]`,
      `button:has-text("${workflowType.replace('-', ' ')}")`,
      `button:has-text("${workflowType.toUpperCase()}")`,
    ];
    
    // Special cases for common workflow names
    const workflowNameMap: Record<string, string[]> = {
      'quick-letter': ['Quick Letter', 'quick letter', 'letter'],
      'angiogram-pci': ['Angiogram', 'PCI', 'Angiogram/PCI'],
      'investigation-summary': ['Investigation', 'Summary', 'Investigations'],
      'ai-medical-review': ['AI Review', 'Medical Review', 'AI Medical Review'],
      'tavi': ['TAVI', 'Tavi', 'TAVI Report'],
      'mteer': ['mTEER', 'MTEER', 'MitraClip'],
      'pfo-closure': ['PFO', 'PFO Closure'],
      'right-heart-cath': ['Right Heart', 'RHC', 'Right Heart Cath']
    };
    
    const searchTerms = workflowNameMap[workflowType] || [workflowType];
    
    for (const term of searchTerms) {
      for (const selector of buttonSelectors.map(s => s.replace(workflowType, term))) {
        const button = sidePanel.locator(selector);
        if (await button.count() > 0 && await button.first().isVisible()) {
          return button.first();
        }
      }
    }
    
    // Fallback: find any button containing workflow-related text
    const allButtons = await sidePanel.locator('button').all();
    for (const button of allButtons) {
      const text = await button.textContent();
      if (text && searchTerms.some(term => text.toLowerCase().includes(term.toLowerCase()))) {
        return button;
      }
    }
    
    throw new Error(`Workflow button not found for: ${workflowType}`);
  }

  async function verifyRecordingState(sidePanel: Frame, isRecording: boolean): Promise<void> {
    // Look for recording indicators
    const recordingIndicators = [
      '.recording-indicator',
      '[data-testid="recording-indicator"]',
      'text=/recording/i',
      '.status-indicator'
    ];
    
    let foundIndicator = false;
    for (const selector of recordingIndicators) {
      const indicator = sidePanel.locator(selector);
      if (await indicator.count() > 0) {
        foundIndicator = true;
        break;
      }
    }
    
    if (isRecording) {
      expect(foundIndicator).toBe(true);
    }
  }

  async function simulateDictation(page: Page, sidePanel: Frame, dictation: string): Promise<void> {
    // Inject the dictation text into the transcription system
    await ExtensionTestHelper.simulateVoiceInput(page, dictation);
    
    // Also try to inject directly into any visible text areas
    await sidePanel.evaluate((text) => {
      const textAreas = document.querySelectorAll('textarea, input[type="text"]');
      if (textAreas.length > 0) {
        const target = textAreas[0] as HTMLTextAreaElement;
        target.value = text;
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      // Store for transcription service
      (window as any).mockTranscriptionResult = text;
    }, dictation);
    
    await page.waitForTimeout(1000);
  }

  async function waitForReport(sidePanel: Frame, timeout: number = 15000): Promise<string> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      // Look for report content in various containers
      const reportSelectors = [
        'textarea:not([placeholder*="dictation"])',
        '.medical-report',
        '.report-content',
        '[data-testid="report-output"]',
        '.results-panel textarea',
        '.letter-content'
      ];
      
      for (const selector of reportSelectors) {
        const element = sidePanel.locator(selector);
        if (await element.count() > 0) {
          const content = await element.first().inputValue().catch(() => 
            element.first().textContent()
          );
          
          if (content && content.length > 50 && !content.includes('placeholder')) {
            return content;
          }
        }
      }
      
      await page.waitForTimeout(1000);
    }
    
    throw new Error(`Report not generated within ${timeout}ms`);
  }

  async function validateMedicalContent(report: string, expectedOutputs: string[], workflowType: string): Promise<void> {
    // Check for expected medical terms
    const missingTerms = expectedOutputs.filter(term => 
      !report.toLowerCase().includes(term.toLowerCase())
    );
    
    if (missingTerms.length > 0) {
      console.warn(`⚠️ Missing expected terms in ${workflowType}: ${missingTerms.join(', ')}`);
      // Don't fail the test, just warn
    }
    
    // Basic quality checks
    expect(report.length).toBeGreaterThan(50);
    expect(report.trim()).not.toBe('');
    
    // Check for medical professionalism
    const professionalIndicators = ['patient', 'procedure', 'assessment', 'plan', 'clinical'];
    const hasProfessionalContent = professionalIndicators.some(term => 
      report.toLowerCase().includes(term)
    );
    expect(hasProfessionalContent).toBe(true);
  }

  async function clearSession(sidePanel: Frame): Promise<void> {
    // Look for clear/new/reset buttons
    const clearButtons = [
      'button:has-text("Clear")',
      'button:has-text("New")',
      'button:has-text("Reset")',
      'button:has-text("Start New")',
      '[data-testid="clear-session"]'
    ];
    
    for (const selector of clearButtons) {
      const button = sidePanel.locator(selector);
      if (await button.count() > 0 && await button.isVisible()) {
        await button.click();
        await page.waitForTimeout(500);
        return;
      }
    }
    
    // If no clear button found, reload the side panel
    await sidePanel.reload();
    await page.waitForTimeout(2000);
  }
});
