import { test, expect } from './fixtures';
import type { Page, Frame } from '@playwright/test';
import { ExtensionTestHelper } from '../helpers/ExtensionTestHelper';
import { getDictation } from '../helpers/MedicalDictations';

test.describe('Error Scenario Tests', () => {
  let extensionId: string;
  let sidePanel: Frame | null;

  test.beforeEach(async ({ page, context }) => {
    console.log('❌ Setting up error scenario test environment...');
    
    // Get extension ID and setup
    extensionId = await ExtensionTestHelper.getExtensionId(context);
    
    // Grant necessary permissions
    await context.grantPermissions(['microphone', 'clipboard-read', 'clipboard-write']);
    
    // Inject mock audio functionality
    await ExtensionTestHelper.injectMockAudio(page, extensionId);
    
    // Open side panel
    sidePanel = await ExtensionTestHelper.openSidePanel(page, extensionId);
    expect(sidePanel).toBeTruthy();
    
    console.log('✅ Error scenario environment ready');
  });

  test('should handle empty dictation gracefully', async ({ page }) => {
    console.log('🔇 Testing empty dictation handling...');
    
    const workflowButton = await findWorkflowButton(sidePanel!, 'quick-letter');
    
    if (workflowButton) {
      // Start recording
      await workflowButton.click();
      await page.waitForTimeout(1000);
      
      // Immediately stop without any dictation
      await workflowButton.click();
      await page.waitForTimeout(3000);
      
      // Check for appropriate error handling
      const errorMessages = await getErrorMessages(sidePanel!);
      const hasContent = await hasGeneratedContent(sidePanel!);
      
      // Should either show error message or handle gracefully
      const handledGracefully = errorMessages.length > 0 || !hasContent;
      expect(handledGracefully).toBe(true);
      
      if (errorMessages.length > 0) {
        console.log('✅ Empty dictation produced appropriate error messages:', errorMessages);
      } else {
        console.log('✅ Empty dictation handled gracefully without errors');
      }
      
      // UI should remain functional
      await verifyUIFunctional(sidePanel!);
    }
  });

  test('should handle very short dictations', async ({ page }) => {
    console.log('📏 Testing very short dictation handling...');
    
    const shortDictations = [
      'Hello.',
      'Test.',
      'Patient.',
      'OK.',
      'No.'
    ];
    
    const shortDictationResults: any[] = [];
    
    for (const dictation of shortDictations) {
      console.log(`📏 Testing: "${dictation}"`);
      
      const workflowButton = await findWorkflowButton(sidePanel!, 'quick-letter');
      if (workflowButton) {
        await workflowButton.click();
        await page.waitForTimeout(500);
        
        await simulateDictation(page, sidePanel!, dictation);
        await workflowButton.click();
        await page.waitForTimeout(3000);
        
        const errorMessages = await getErrorMessages(sidePanel!);
        const hasContent = await hasGeneratedContent(sidePanel!);
        const content = await getGeneratedContent(sidePanel!);
        
        shortDictationResults.push({
          input: dictation,
          hasErrors: errorMessages.length > 0,
          hasContent,
          contentLength: content.length,
          errors: errorMessages
        });
        
        console.log(`"${dictation}" → Content: ${hasContent}, Errors: ${errorMessages.length}`);
        
        await clearSession(sidePanel!);
        await page.waitForTimeout(500);
      }
    }
    
    // Validate short dictation handling
    const handledCorrectly = shortDictationResults.filter(r => 
      r.hasContent || r.hasErrors
    );
    
    expect(handledCorrectly.length).toBe(shortDictations.length);
    console.log('📊 Short dictation results:', shortDictationResults);
  });

  test('should handle invalid medical content', async ({ page }) => {
    console.log('🚫 Testing invalid medical content handling...');
    
    const invalidInputs = [
      'This is not medical content at all, just random text about cooking recipes.',
      'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod.',
      'Random numbers 123 456 789 and special characters !@#$%^&*().',
      'The quick brown fox jumps over the lazy dog multiple times repeatedly.',
      'Technical computer programming code function main() return 0 end.'
    ];
    
    const invalidContentResults: any[] = [];
    
    for (const invalidInput of invalidInputs) {
      console.log(`🚫 Testing invalid content: "${invalidInput.substring(0, 30)}..."`);
      
      const workflowButton = await findWorkflowButton(sidePanel!, 'consultation');
      if (workflowButton) {
        await workflowButton.click();
        await page.waitForTimeout(500);
        
        await simulateDictation(page, sidePanel!, invalidInput);
        await workflowButton.click();
        await page.waitForTimeout(5000); // More time for processing
        
        const errorMessages = await getErrorMessages(sidePanel!);
        const warnings = await getWarningMessages(sidePanel!);
        const content = await getGeneratedContent(sidePanel!);
        
        invalidContentResults.push({
          input: invalidInput.substring(0, 50),
          hasErrors: errorMessages.length > 0,
          hasWarnings: warnings.length > 0,
          generatedContent: content.length > 0,
          contentLength: content.length,
          containsMedicalTerms: containsMedicalTerms(content)
        });
        
        // Should either reject or transform into medical context
        const appropriatelyHandled = 
          errorMessages.length > 0 || 
          warnings.length > 0 || 
          containsMedicalTerms(content);
        
        if (appropriatelyHandled) {
          console.log('✅ Invalid content appropriately handled');
        } else {
          console.log('⚠️ Invalid content may not have been properly recognized');
        }
        
        await clearSession(sidePanel!);
        await page.waitForTimeout(500);
      }
    }
    
    console.log('📊 Invalid content results:', invalidContentResults);
  });

  test('should handle service disconnection scenarios', async ({ page }) => {
    console.log('🔌 Testing service disconnection scenarios...');
    
    // Mock service failures by intercepting network requests
    await page.route('**/v1/chat/completions', route => {
      console.log('🔌 Simulating LMStudio service failure');
      route.abort('failed');
    });
    
    await page.route('**/v1/audio/transcriptions', route => {
      console.log('🔌 Simulating Whisper service failure');
      route.abort('failed');
    });
    
    const workflowButton = await findWorkflowButton(sidePanel!, 'quick-letter');
    if (workflowButton) {
      await workflowButton.click();
      await page.waitForTimeout(500);
      
      const dictation = getDictation('quick-letter', 'simple');
      await simulateDictation(page, sidePanel!, dictation);
      
      await workflowButton.click();
      await page.waitForTimeout(5000); // Wait for timeout/error
      
      // Check for service error messages
      const errorMessages = await getErrorMessages(sidePanel!);
      const hasServiceErrors = errorMessages.some(msg => 
        msg.toLowerCase().includes('connection') ||
        msg.toLowerCase().includes('service') ||
        msg.toLowerCase().includes('timeout') ||
        msg.toLowerCase().includes('failed')
      );
      
      if (hasServiceErrors) {
        console.log('✅ Service disconnection properly detected and reported');
        console.log('Error messages:', errorMessages);
      } else {
        console.log('⚠️ Service disconnection may not have been properly handled');
      }
      
      // UI should remain responsive
      await verifyUIFunctional(sidePanel!);
    }
    
    // Clear route interception
    await page.unroute('**/v1/chat/completions');
    await page.unroute('**/v1/audio/transcriptions');
  });

  test('should handle timeout scenarios', async ({ page }) => {
    console.log('⏰ Testing timeout scenario handling...');
    
    // Simulate slow responses
    await page.route('**/v1/chat/completions', route => {
      console.log('⏰ Simulating slow AI service response');
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            choices: [{
              message: {
                role: 'assistant',
                content: 'Delayed response after timeout simulation'
              },
              finish_reason: 'stop'
            }],
            usage: { prompt_tokens: 50, completion_tokens: 10, total_tokens: 60 }
          })
        });
      }, 30000); // 30 second delay
    });
    
    const workflowButton = await findWorkflowButton(sidePanel!, 'quick-letter');
    if (workflowButton) {
      await workflowButton.click();
      await page.waitForTimeout(500);
      
      const dictation = getDictation('quick-letter', 'simple');
      await simulateDictation(page, sidePanel!, dictation);
      
      await workflowButton.click();
      
      // Wait for timeout (should be less than 30s)
      await page.waitForTimeout(10000);
      
      const errorMessages = await getErrorMessages(sidePanel!);
      const hasTimeoutErrors = errorMessages.some(msg => 
        msg.toLowerCase().includes('timeout') ||
        msg.toLowerCase().includes('slow') ||
        msg.toLowerCase().includes('taking longer')
      );
      
      if (hasTimeoutErrors) {
        console.log('✅ Timeout properly detected and reported');
      } else {
        console.log('ℹ️ Timeout handling may be different than expected');
      }
      
      // Check for cancel/retry options
      const cancelButton = sidePanel!.locator('button:has-text("Cancel"), button:has-text("Stop")');
      const retryButton = sidePanel!.locator('button:has-text("Retry"), button:has-text("Try Again")');
      
      const hasCancelOption = await cancelButton.count() > 0;
      const hasRetryOption = await retryButton.count() > 0;
      
      if (hasCancelOption) {
        console.log('✅ Cancel option available during timeout');
        await cancelButton.first().click();
        await page.waitForTimeout(1000);
      }
      
      if (hasRetryOption) {
        console.log('✅ Retry option available after timeout');
      }
      
      await verifyUIFunctional(sidePanel!);
    }
    
    await page.unroute('**/v1/chat/completions');
  });

  test('should handle user cancellation gracefully', async ({ page }) => {
    console.log('🛑 Testing user cancellation handling...');
    
    const cancellationScenarios = [
      { name: 'Cancel during recording', cancelPoint: 'recording' },
      { name: 'Cancel during transcription', cancelPoint: 'transcription' },
      { name: 'Cancel during processing', cancelPoint: 'processing' }
    ];
    
    const cancellationResults: any[] = [];
    
    for (const scenario of cancellationScenarios) {
      console.log(`🛑 Testing: ${scenario.name}`);
      
      const workflowButton = await findWorkflowButton(sidePanel!, 'consultation');
      if (workflowButton) {
        await workflowButton.click();
        await page.waitForTimeout(500);
        
        if (scenario.cancelPoint === 'recording') {
          // Cancel during recording
          const cancelButton = sidePanel!.locator('button:has-text("Cancel"), button:has-text("Stop")');
          if (await cancelButton.count() > 0) {
            await cancelButton.first().click();
          } else {
            await workflowButton.click(); // Use workflow button as cancel
          }
        } else {
          // Let it proceed further before cancelling
          const dictation = getDictation('consultation', 'complex');
          await simulateDictation(page, sidePanel!, dictation);
          
          if (scenario.cancelPoint === 'transcription') {
            await workflowButton.click();
            await page.waitForTimeout(1000); // Cancel during transcription
          } else {
            await workflowButton.click();
            await page.waitForTimeout(2000); // Cancel during processing
          }
          
          const cancelButton = sidePanel!.locator('button:has-text("Cancel"), button:has-text("Stop")');
          if (await cancelButton.count() > 0) {
            await cancelButton.first().click();
          }
        }
        
        await page.waitForTimeout(2000);
        
        const errorMessages = await getErrorMessages(sidePanel!);
        const hasContent = await hasGeneratedContent(sidePanel!);
        const isUIFunctional = await checkUIFunctionality(sidePanel!);
        
        cancellationResults.push({
          scenario: scenario.name,
          cancelPoint: scenario.cancelPoint,
          hasErrors: errorMessages.length > 0,
          hasPartialContent: hasContent,
          uiFunctional: isUIFunctional,
          errors: errorMessages
        });
        
        console.log(`${scenario.name}: UI functional: ${isUIFunctional}, Errors: ${errorMessages.length}`);
        
        await clearSession(sidePanel!);
        await page.waitForTimeout(500);
      }
    }
    
    // All cancellation scenarios should leave UI functional
    const functionalAfterCancel = cancellationResults.filter(r => r.uiFunctional);
    expect(functionalAfterCancel.length).toBe(cancellationScenarios.length);
    
    console.log('📊 Cancellation results:', cancellationResults);
  });

  test('should handle memory pressure scenarios', async ({ page }) => {
    console.log('🧠 Testing memory pressure scenarios...');
    
    // Generate large amounts of content to stress memory
    const memoryStressTests = [
      { name: 'Very large dictation', size: 'large' },
      { name: 'Repeated long processing', size: 'repeated' },
      { name: 'Multiple concurrent workflows', size: 'concurrent' }
    ];
    
    const memoryResults: any[] = [];
    
    for (const test of memoryStressTests) {
      console.log(`🧠 Testing: ${test.name}`);
      
      const memoryBefore = await getMemoryUsage(page);
      
      try {
        if (test.size === 'large') {
          // Test with very large dictation
          const largeDictation = generateVeryLargeDictation();
          await processLargeDictation(page, sidePanel!, largeDictation);
          
        } else if (test.size === 'repeated') {
          // Repeat processing multiple times
          for (let i = 0; i < 10; i++) {
            const dictation = getDictation('consultation', 'complex');
            await quickProcess(page, sidePanel!, dictation);
            await page.waitForTimeout(200);
          }
          
        } else if (test.size === 'concurrent') {
          // Simulate concurrent workflows (rapid switching)
          const workflows = ['quick-letter', 'consultation', 'investigation-summary'];
          for (const workflow of workflows) {
            const dictation = getDictation(workflow, 'simple');
            await quickProcess(page, sidePanel!, dictation, workflow);
            await page.waitForTimeout(100);
          }
        }
        
        const memoryAfter = await getMemoryUsage(page);
        const isUIResponsive = await checkUIResponsiveness(sidePanel!);
        
        memoryResults.push({
          test: test.name,
          memoryBefore,
          memoryAfter,
          memoryIncrease: memoryAfter - memoryBefore,
          uiResponsive: isUIResponsive,
          success: true
        });
        
        console.log(`${test.name}: Memory ${memoryBefore}MB → ${memoryAfter}MB, UI responsive: ${isUIResponsive}`);
        
      } catch (error) {
        memoryResults.push({
          test: test.name,
          success: false,
          error: error.message
        });
        
        console.log(`${test.name}: Failed - ${error.message}`);
      }
      
      await clearSession(sidePanel!);
      await page.waitForTimeout(1000);
    }
    
    // Validate memory handling
    const successfulTests = memoryResults.filter(r => r.success);
    expect(successfulTests.length).toBeGreaterThanOrEqual(2);
    
    // Memory growth should be reasonable
    const avgMemoryIncrease = successfulTests.reduce((sum, r) => sum + r.memoryIncrease, 0) / successfulTests.length;
    expect(avgMemoryIncrease).toBeLessThan(200); // Less than 200MB average increase
    
    console.log('📊 Memory pressure results:', memoryResults);
  });

  test('should recover from critical errors', async ({ page }) => {
    console.log('🚨 Testing critical error recovery...');
    
    // Simulate various critical errors
    const criticalErrorTests = [
      { name: 'JavaScript error injection', type: 'javascript' },
      { name: 'Permission revocation', type: 'permission' },
      { name: 'Extension context loss', type: 'context' }
    ];
    
    const recoveryResults: any[] = [];
    
    for (const test of criticalErrorTests) {
      console.log(`🚨 Testing: ${test.name}`);
      
      try {
        if (test.type === 'javascript') {
          // Inject JavaScript error
          await sidePanel!.evaluate(() => {
            throw new Error('Simulated critical JavaScript error');
          });
          
        } else if (test.type === 'permission') {
          // This is harder to test in mock environment
          console.log('ℹ️ Permission revocation test skipped in mock environment');
          
        } else if (test.type === 'context') {
          // Simulate context issues
          await page.evaluate(() => {
            // Clear some critical objects
            (window as any).chrome = undefined;
          });
        }
        
        await page.waitForTimeout(2000);
        
        // Try to use the extension after error
        const isRecoverable = await testBasicFunctionality(page, sidePanel!);
        
        recoveryResults.push({
          test: test.name,
          recoverable: isRecoverable,
          success: true
        });
        
        console.log(`${test.name}: Recoverable: ${isRecoverable}`);
        
      } catch (error) {
        recoveryResults.push({
          test: test.name,
          recoverable: false,
          success: false,
          error: error.message
        });
        
        console.log(`${test.name}: Error during test - ${error.message}`);
      }
    }
    
    console.log('📊 Critical error recovery results:', recoveryResults);
  });

  // Helper functions
  async function findWorkflowButton(sidePanel: Frame, workflowType: string): Promise<any> {
    const workflowNameMap: Record<string, string[]> = {
      'quick-letter': ['Quick Letter', 'quick letter'],
      'consultation': ['Consultation'],
      'investigation-summary': ['Investigation'],
      'tavi': ['TAVI'],
      'angiogram-pci': ['Angiogram', 'PCI']
    };
    
    const searchTerms = workflowNameMap[workflowType] || [workflowType];
    
    for (const term of searchTerms) {
      const button = sidePanel.locator(`button:has-text("${term}")`);
      if (await button.count() > 0 && await button.first().isVisible()) {
        return button.first();
      }
    }
    
    return null;
  }

  async function simulateDictation(page: Page, sidePanel: Frame, dictation: string): Promise<void> {
    await ExtensionTestHelper.simulateVoiceInput(page, dictation);
    
    await sidePanel.evaluate((text) => {
      const textAreas = document.querySelectorAll('textarea, input[type="text"]');
      if (textAreas.length > 0) {
        const target = textAreas[0] as HTMLTextAreaElement;
        target.value = text;
        target.dispatchEvent(new Event('input', { bubbles: true }));
      }
      (window as any).mockTranscriptionResult = text;
    }, dictation);
  }

  async function getErrorMessages(sidePanel: Frame): Promise<string[]> {
    const errorSelectors = [
      '.error-message',
      '.alert-error',
      '.text-red',
      '[data-testid="error"]',
      'text=/error/i',
      'text=/failed/i'
    ];
    
    const errors: string[] = [];
    
    for (const selector of errorSelectors) {
      const elements = await sidePanel.locator(selector).all();
      for (const element of elements) {
        const text = await element.textContent();
        if (text && text.trim().length > 0) {
          errors.push(text.trim());
        }
      }
    }
    
    return errors;
  }

  async function getWarningMessages(sidePanel: Frame): Promise<string[]> {
    const warningSelectors = [
      '.warning-message',
      '.alert-warning',
      '.text-orange',
      '[data-testid="warning"]',
      'text=/warning/i'
    ];
    
    const warnings: string[] = [];
    
    for (const selector of warningSelectors) {
      const elements = await sidePanel.locator(selector).all();
      for (const element of elements) {
        const text = await element.textContent();
        if (text && text.trim().length > 0) {
          warnings.push(text.trim());
        }
      }
    }
    
    return warnings;
  }

  async function hasGeneratedContent(sidePanel: Frame): Promise<boolean> {
    const contentSelectors = [
      'textarea:not([placeholder*="dictation"])',
      '.medical-report',
      '.report-content'
    ];
    
    for (const selector of contentSelectors) {
      const element = sidePanel.locator(selector);
      if (await element.count() > 0) {
        const content = await element.first().inputValue().catch(() => 
          element.first().textContent()
        );
        
        if (content && content.length > 20) {
          return true;
        }
      }
    }
    
    return false;
  }

  async function getGeneratedContent(sidePanel: Frame): Promise<string> {
    const contentSelectors = [
      'textarea:not([placeholder*="dictation"])',
      '.medical-report',
      '.report-content'
    ];
    
    for (const selector of contentSelectors) {
      const element = sidePanel.locator(selector);
      if (await element.count() > 0) {
        const content = await element.first().inputValue().catch(() => 
          element.first().textContent()
        );
        
        if (content) {
          return content;
        }
      }
    }
    
    return '';
  }

  function containsMedicalTerms(content: string): boolean {
    const medicalTerms = [
      'patient', 'clinical', 'medical', 'assessment', 'diagnosis',
      'treatment', 'therapy', 'medication', 'procedure', 'examination',
      'history', 'symptoms', 'condition', 'disease', 'syndrome'
    ];
    
    const lowerContent = content.toLowerCase();
    return medicalTerms.some(term => lowerContent.includes(term));
  }

  async function verifyUIFunctional(sidePanel: Frame): Promise<void> {
    // Check that basic UI elements are still present and functional
    const buttons = sidePanel.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
    
    // Try clicking a button
    if (buttonCount > 0) {
      const firstButton = buttons.first();
      if (await firstButton.isVisible()) {
        await firstButton.click();
        await page.waitForTimeout(500);
      }
    }
  }

  async function checkUIFunctionality(sidePanel: Frame): Promise<boolean> {
    try {
      const buttons = sidePanel.locator('button');
      const buttonCount = await buttons.count();
      return buttonCount > 0;
    } catch {
      return false;
    }
  }

  async function checkUIResponsiveness(sidePanel: Frame): Promise<boolean> {
    try {
      const startTime = Date.now();
      const buttons = sidePanel.locator('button');
      await buttons.count();
      const responseTime = Date.now() - startTime;
      return responseTime < 1000; // Should respond within 1 second
    } catch {
      return false;
    }
  }

  async function clearSession(sidePanel: Frame): Promise<void> {
    const clearButtons = [
      'button:has-text("Clear")',
      'button:has-text("New")',
      'button:has-text("Reset")'
    ];
    
    for (const selector of clearButtons) {
      const button = sidePanel.locator(selector);
      if (await button.count() > 0 && await button.isVisible()) {
        await button.click();
        return;
      }
    }
  }

  async function getMemoryUsage(page: Page): Promise<number> {
    return await page.evaluate(() => {
      return performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 0;
    });
  }

  async function processLargeDictation(page: Page, sidePanel: Frame, dictation: string): Promise<void> {
    const workflowButton = await findWorkflowButton(sidePanel, 'consultation');
    if (workflowButton) {
      await workflowButton.click();
      await page.waitForTimeout(500);
      
      await simulateDictation(page, sidePanel, dictation);
      await workflowButton.click();
      await page.waitForTimeout(8000); // Longer wait for large content
    }
  }

  async function quickProcess(page: Page, sidePanel: Frame, dictation: string, workflowType: string = 'quick-letter'): Promise<void> {
    const workflowButton = await findWorkflowButton(sidePanel, workflowType);
    if (workflowButton) {
      await workflowButton.click();
      await page.waitForTimeout(200);
      
      await simulateDictation(page, sidePanel, dictation);
      await workflowButton.click();
      await page.waitForTimeout(1000);
    }
  }

  async function testBasicFunctionality(page: Page, sidePanel: Frame): Promise<boolean> {
    try {
      const workflowButton = await findWorkflowButton(sidePanel, 'quick-letter');
      if (workflowButton) {
        await workflowButton.click();
        await page.waitForTimeout(500);
        await workflowButton.click();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  function generateVeryLargeDictation(): string {
    const baseDictation = getDictation('consultation', 'complex');
    // Repeat and extend the dictation to create very large content
    return (baseDictation + ' ').repeat(10) + 
      'This extended comprehensive assessment includes detailed analysis of all clinical parameters, ' +
      'extensive review of past medical history, comprehensive medication reconciliation, ' +
      'thorough physical examination findings, detailed investigation results interpretation, ' +
      'comprehensive differential diagnosis consideration, detailed management planning, ' +
      'extensive patient education requirements, comprehensive follow-up scheduling, ' +
      'detailed documentation requirements, and extensive clinical reasoning documentation.';
  }
});
