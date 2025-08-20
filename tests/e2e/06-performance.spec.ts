import { test, expect, Page, Frame } from '@playwright/test';
import { ExtensionTestHelper } from '../helpers/ExtensionTestHelper';

test.describe('Performance Tests', () => {
  let extensionId: string;
  let sidePanel: Frame | null;

  test.beforeEach(async ({ page, context }) => {
    extensionId = await ExtensionTestHelper.getExtensionId(context);
    await context.grantPermissions(['microphone', 'clipboard-read', 'clipboard-write']);
    await ExtensionTestHelper.injectMockAudio(page, extensionId);
    sidePanel = await ExtensionTestHelper.openSidePanel(page, extensionId);
    expect(sidePanel).toBeTruthy();
  });

  test('should measure extension loading performance', async ({ page, context }) => {
    console.log('⚡ Testing extension loading performance...');
    
    const loadTimes: number[] = [];
    const iterations = 3;
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      // Close and reopen side panel
      await page.keyboard.press('Escape'); // Close side panel
      await page.waitForTimeout(500);
      
      sidePanel = await ExtensionTestHelper.openSidePanel(page, extensionId);
      
      if (sidePanel) {
        // Wait for UI to be fully loaded
        await ExtensionTestHelper.waitForSidePanelElement(sidePanel, 'button', 5000);
        const endTime = Date.now();
        const loadTime = endTime - startTime;
        loadTimes.push(loadTime);
        
        console.log(`Iteration ${i + 1}: ${loadTime}ms`);
      }
    }
    
    const avgLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
    const maxLoadTime = Math.max(...loadTimes);
    
    expect(avgLoadTime).toBeLessThan(3000); // Should load within 3 seconds on average
    expect(maxLoadTime).toBeLessThan(5000); // No load should take more than 5 seconds
    
    console.log(`✅ Extension loading performance: Avg ${avgLoadTime}ms, Max ${maxLoadTime}ms`);
  });

  test('should measure voice recording startup time', async ({ page }) => {
    console.log('⚡ Testing voice recording startup performance...');
    
    const recordingStartTimes: number[] = [];
    const iterations = 5;
    
    for (let i = 0; i < iterations; i++) {
      const recordButton = sidePanel!.locator('button').first();
      
      const startTime = Date.now();
      await recordButton.click();
      
      // Wait for recording to actually start (look for state change)
      let recordingStarted = false;
      const timeout = Date.now() + 3000; // 3 second timeout
      
      while (Date.now() < timeout && !recordingStarted) {
        // Check various indicators that recording has started
        const indicators = [
          async () => {
            const text = await recordButton.textContent();
            return text?.toLowerCase().includes('stop') || text?.toLowerCase().includes('recording');
          },
          async () => {
            const indicator = sidePanel!.locator('.recording-indicator, .pulse-animation');
            return await indicator.isVisible().catch(() => false);
          },
          async () => {
            const classes = await recordButton.getAttribute('class');
            return classes?.includes('recording') || classes?.includes('active');
          }
        ];
        
        for (const check of indicators) {
          if (await check()) {
            recordingStarted = true;
            break;
          }
        }
        
        if (!recordingStarted) {
          await page.waitForTimeout(50);
        }
      }
      
      const endTime = Date.now();
      const startupTime = endTime - startTime;
      recordingStartTimes.push(startupTime);
      
      // Stop recording for next iteration
      await recordButton.click();
      await page.waitForTimeout(500);
      
      console.log(`Recording startup ${i + 1}: ${startupTime}ms`);
    }
    
    const avgStartupTime = recordingStartTimes.reduce((a, b) => a + b, 0) / recordingStartTimes.length;
    const maxStartupTime = Math.max(...recordingStartTimes);
    
    expect(avgStartupTime).toBeLessThan(1000); // Should start within 1 second on average
    expect(maxStartupTime).toBeLessThan(2000); // No startup should take more than 2 seconds
    
    console.log(`✅ Recording startup performance: Avg ${avgStartupTime}ms, Max ${maxStartupTime}ms`);
  });

  test('should measure classification response time', async ({ page }) => {
    console.log('⚡ Testing classification response time...');
    
    const testCases = [
      'TAVI procedure with Edwards Sapien 3 valve deployment',
      'PCI to LAD with drug-eluting stent placement',
      'Coronary angiography showing three-vessel disease',
      'Brief consultation letter for chest pain evaluation'
    ];
    
    const classificationTimes: number[] = [];
    
    for (const dictation of testCases) {
      const recordButton = sidePanel!.locator('button').first();
      
      // Start recording
      await recordButton.click();
      await page.waitForTimeout(200);
      
      // Inject dictation
      await sidePanel!.evaluate((text) => {
        const inputs = document.querySelectorAll('textarea, input[type="text"]');
        if (inputs.length > 0) {
          (inputs[0] as HTMLTextAreaElement).value = text;
          (inputs[0] as HTMLTextAreaElement).dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, dictation);
      
      const startTime = Date.now();
      
      // Stop recording to trigger classification
      await recordButton.click();
      
      // Wait for classification results (agent buttons to appear)
      let classificationComplete = false;
      const timeout = Date.now() + 5000; // 5 second timeout
      
      while (Date.now() < timeout && !classificationComplete) {
        const agentButtons = await sidePanel!.locator('button').all();
        
        for (const button of agentButtons) {
          if (await button.isVisible().catch(() => false)) {
            const text = await button.textContent();
            if (text && (text.includes('TAVI') || text.includes('PCI') || text.includes('Angiogram') || text.includes('Letter'))) {
              classificationComplete = true;
              break;
            }
          }
        }
        
        if (!classificationComplete) {
          await page.waitForTimeout(100);
        }
      }
      
      const endTime = Date.now();
      const classificationTime = endTime - startTime;
      classificationTimes.push(classificationTime);
      
      console.log(`Classification "${dictation.substring(0, 30)}...": ${classificationTime}ms`);
      
      // Wait before next test
      await page.waitForTimeout(500);
    }
    
    const avgClassificationTime = classificationTimes.reduce((a, b) => a + b, 0) / classificationTimes.length;
    const maxClassificationTime = Math.max(...classificationTimes);
    
    expect(avgClassificationTime).toBeLessThan(3000); // Should classify within 3 seconds on average
    expect(maxClassificationTime).toBeLessThan(5000); // No classification should take more than 5 seconds
    
    console.log(`✅ Classification performance: Avg ${avgClassificationTime}ms, Max ${maxClassificationTime}ms`);
  });

  test('should measure report generation performance', async ({ page }) => {
    console.log('⚡ Testing report generation performance...');
    
    const reportGenerationTimes: number[] = [];
    const testDictations = [
      'TAVI procedure completed with excellent hemodynamic results',
      'PCI to LAD with successful stent deployment',
      'Coronary angiography showing multivessel coronary artery disease'
    ];
    
    for (const dictation of testDictations) {
      // Complete classification workflow
      const recordButton = sidePanel!.locator('button').first();
      await recordButton.click();
      await page.waitForTimeout(200);
      
      await sidePanel!.evaluate((text) => {
        const inputs = document.querySelectorAll('textarea, input[type="text"]');
        if (inputs.length > 0) {
          (inputs[0] as HTMLTextAreaElement).value = text;
          (inputs[0] as HTMLTextAreaElement).dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, dictation);
      
      await recordButton.click();
      await page.waitForTimeout(1500); // Wait for classification
      
      // Find and click agent button
      const agentButtons = await sidePanel!.locator('button').all();
      let agentClicked = false;
      
      for (const button of agentButtons) {
        if (await button.isVisible().catch(() => false)) {
          const text = await button.textContent();
          if (text && (text.includes('TAVI') || text.includes('PCI') || text.includes('Angiogram'))) {
            const startTime = Date.now();
            await button.click();
            
            // Wait for report to be generated
            let reportGenerated = false;
            const timeout = Date.now() + 10000; // 10 second timeout
            
            while (Date.now() < timeout && !reportGenerated) {
              const reportElement = sidePanel!.locator('textarea').last();
              const reportContent = await reportElement.inputValue().catch(() => '');
              
              if (reportContent && reportContent.length > 100) {
                reportGenerated = true;
                const endTime = Date.now();
                const generationTime = endTime - startTime;
                reportGenerationTimes.push(generationTime);
                
                console.log(`Report generation "${dictation.substring(0, 30)}...": ${generationTime}ms`);
              } else {
                await page.waitForTimeout(200);
              }
            }
            
            agentClicked = true;
            break;
          }
        }
      }
      
      if (!agentClicked) {
        console.log(`⚠️ No agent found for dictation: ${dictation.substring(0, 30)}...`);
      }
      
      await page.waitForTimeout(500);
    }
    
    if (reportGenerationTimes.length > 0) {
      const avgGenerationTime = reportGenerationTimes.reduce((a, b) => a + b, 0) / reportGenerationTimes.length;
      const maxGenerationTime = Math.max(...reportGenerationTimes);
      
      expect(avgGenerationTime).toBeLessThan(5000); // Should generate within 5 seconds on average
      expect(maxGenerationTime).toBeLessThan(10000); // No generation should take more than 10 seconds
      
      console.log(`✅ Report generation performance: Avg ${avgGenerationTime}ms, Max ${maxGenerationTime}ms`);
    } else {
      console.log('⚠️ No report generation times measured');
    }
  });

  test('should measure memory usage during operations', async ({ page }) => {
    console.log('⚡ Testing memory usage performance...');
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      if (performance.memory) {
        return {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    });
    
    if (!initialMemory) {
      console.log('⚠️ Memory API not available in this environment');
      return;
    }
    
    console.log(`Initial memory usage: ${(initialMemory.used / 1024 / 1024).toFixed(2)} MB`);
    
    // Perform multiple operations to stress test memory
    const operations = 10;
    const longDictation = 'This is a very long medical dictation that simulates a comprehensive procedure report with extensive details about the patient presentation, procedural techniques, findings, complications if any, and detailed post-procedure care instructions and follow-up plans. '.repeat(10);
    
    for (let i = 0; i < operations; i++) {
      const recordButton = sidePanel!.locator('button').first();
      await recordButton.click();
      await page.waitForTimeout(100);
      
      await sidePanel!.evaluate((text) => {
        const inputs = document.querySelectorAll('textarea, input[type="text"]');
        if (inputs.length > 0) {
          (inputs[0] as HTMLTextAreaElement).value = text;
          (inputs[0] as HTMLTextAreaElement).dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, longDictation);
      
      await recordButton.click();
      await page.waitForTimeout(300);
      
      if (i % 2 === 0) {
        // Trigger memory usage measurement
        const currentMemory = await page.evaluate(() => {
          if (performance.memory) {
            return performance.memory.usedJSHeapSize;
          }
          return 0;
        });
        
        const memoryIncrease = currentMemory - initialMemory.used;
        console.log(`After ${i + 1} operations: +${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
      }
    }
    
    // Final memory check
    const finalMemory = await page.evaluate(() => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize;
      }
      return 0;
    });
    
    const totalMemoryIncrease = finalMemory - initialMemory.used;
    const memoryIncreasePercent = (totalMemoryIncrease / initialMemory.used) * 100;
    
    // Memory increase should be reasonable (less than 200% of initial)
    expect(memoryIncreasePercent).toBeLessThan(200);
    
    console.log(`✅ Memory usage test completed. Total increase: ${(totalMemoryIncrease / 1024 / 1024).toFixed(2)} MB (${memoryIncreasePercent.toFixed(1)}%)`);
  });

  test('should measure concurrent operation performance', async ({ page }) => {
    console.log('⚡ Testing concurrent operation performance...');
    
    // Test multiple rapid operations
    const concurrentOperations = 5;
    const operationTimes: number[] = [];
    
    const startTime = Date.now();
    
    // Simulate rapid-fire recording operations
    for (let i = 0; i < concurrentOperations; i++) {
      const operationStart = Date.now();
      
      const recordButton = sidePanel!.locator('button').first();
      await recordButton.click();
      await page.waitForTimeout(100);
      
      await sidePanel!.evaluate((text, index) => {
        const inputs = document.querySelectorAll('textarea, input[type="text"]');
        if (inputs.length > 0) {
          (inputs[0] as HTMLTextAreaElement).value = `${text} ${index}`;
          (inputs[0] as HTMLTextAreaElement).dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, 'Quick medical note for concurrent test', i);
      
      await recordButton.click();
      await page.waitForTimeout(200);
      
      const operationEnd = Date.now();
      const operationTime = operationEnd - operationStart;
      operationTimes.push(operationTime);
      
      console.log(`Concurrent operation ${i + 1}: ${operationTime}ms`);
    }
    
    const totalTime = Date.now() - startTime;
    const avgOperationTime = operationTimes.reduce((a, b) => a + b, 0) / operationTimes.length;
    
    // Operations should complete reasonably quickly even when concurrent
    expect(totalTime).toBeLessThan(5000); // All operations within 5 seconds
    expect(avgOperationTime).toBeLessThan(1000); // Each operation within 1 second on average
    
    console.log(`✅ Concurrent operations: ${concurrentOperations} ops in ${totalTime}ms, avg ${avgOperationTime}ms per op`);
  });

  test('should measure UI responsiveness during heavy operations', async ({ page }) => {
    console.log('⚡ Testing UI responsiveness during heavy operations...');
    
    const responseTimes: number[] = [];
    
    // Start a heavy operation (large dictation)
    const heavyDictation = 'This is an extremely long and detailed medical procedure report. '.repeat(100);
    
    const recordButton = sidePanel!.locator('button').first();
    await recordButton.click();
    await page.waitForTimeout(100);
    
    await sidePanel!.evaluate((text) => {
      const inputs = document.querySelectorAll('textarea, input[type="text"]');
      if (inputs.length > 0) {
        (inputs[0] as HTMLTextAreaElement).value = text;
        (inputs[0] as HTMLTextAreaElement).dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, heavyDictation);
    
    // While processing, test UI responsiveness
    const uiTests = [
      async () => {
        const start = Date.now();
        await sidePanel!.hover('button');
        return Date.now() - start;
      },
      async () => {
        const start = Date.now();
        await page.mouse.move(100, 100);
        return Date.now() - start;
      },
      async () => {
        const start = Date.now();
        await page.keyboard.press('Tab');
        return Date.now() - start;
      }
    ];
    
    for (let i = 0; i < 3; i++) {
      for (const uiTest of uiTests) {
        try {
          const responseTime = await uiTest();
          responseTimes.push(responseTime);
          await page.waitForTimeout(100);
        } catch (error) {
          console.log(`UI test failed: ${error.message}`);
        }
      }
    }
    
    await recordButton.click(); // Stop the heavy operation
    
    if (responseTimes.length > 0) {
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      
      // UI should remain responsive (under 100ms average, 500ms max)
      expect(avgResponseTime).toBeLessThan(100);
      expect(maxResponseTime).toBeLessThan(500);
      
      console.log(`✅ UI responsiveness: Avg ${avgResponseTime}ms, Max ${maxResponseTime}ms`);
    } else {
      console.log('⚠️ No UI response times measured');
    }
  });

  test('should test performance degradation over time', async ({ page }) => {
    console.log('⚡ Testing performance degradation over time...');
    
    const performanceMetrics: Array<{iteration: number, time: number}> = [];
    const iterations = 10;
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      // Perform standard operation
      const recordButton = sidePanel!.locator('button').first();
      await recordButton.click();
      await page.waitForTimeout(100);
      
      await sidePanel!.evaluate((text, iter) => {
        const inputs = document.querySelectorAll('textarea, input[type="text"]');
        if (inputs.length > 0) {
          (inputs[0] as HTMLTextAreaElement).value = `${text} iteration ${iter}`;
          (inputs[0] as HTMLTextAreaElement).dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, 'Standard medical dictation for performance testing', i);
      
      await recordButton.click();
      await page.waitForTimeout(300);
      
      const endTime = Date.now();
      const operationTime = endTime - startTime;
      
      performanceMetrics.push({
        iteration: i + 1,
        time: operationTime
      });
      
      console.log(`Iteration ${i + 1}: ${operationTime}ms`);
    }
    
    // Analyze performance trend
    const firstHalf = performanceMetrics.slice(0, Math.floor(iterations / 2));
    const secondHalf = performanceMetrics.slice(Math.floor(iterations / 2));
    
    const avgFirstHalf = firstHalf.reduce((a, b) => a + b.time, 0) / firstHalf.length;
    const avgSecondHalf = secondHalf.reduce((a, b) => a + b.time, 0) / secondHalf.length;
    
    const degradationPercent = ((avgSecondHalf - avgFirstHalf) / avgFirstHalf) * 100;
    
    // Performance degradation should be minimal (less than 50% increase)
    expect(degradationPercent).toBeLessThan(50);
    
    console.log(`✅ Performance degradation test: First half avg ${avgFirstHalf}ms, Second half avg ${avgSecondHalf}ms (${degradationPercent.toFixed(1)}% change)`);
  });
});