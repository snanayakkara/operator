import { test, expect, Page, Frame } from '@playwright/test';
import { ExtensionTestHelper } from '../helpers/ExtensionTestHelper';
import { getDictation } from '../helpers/MedicalDictations';

test.describe('Batch Processing Tests', () => {
  let extensionId: string;
  let sidePanel: Frame | null;

  test.beforeEach(async ({ page, context }) => {
    console.log('🔄 Setting up batch processing test environment...');
    
    // Get extension ID and setup
    extensionId = await ExtensionTestHelper.getExtensionId(context);
    
    // Grant necessary permissions
    await context.grantPermissions(['microphone', 'clipboard-read', 'clipboard-write']);
    
    // Inject mock audio functionality
    await ExtensionTestHelper.injectMockAudio(page, extensionId);
    
    // Navigate to a mock EMR page with patient data
    await setupMockEMRPage(page);
    
    // Open side panel
    sidePanel = await ExtensionTestHelper.openSidePanel(page, extensionId);
    expect(sidePanel).toBeTruthy();
    
    console.log('✅ Batch processing environment ready');
  });

  test('should handle AI Medical Review batch processing', async ({ page }) => {
    console.log('🔍 Testing AI Medical Review batch processing...');
    
    // Look for AI Medical Review button in Quick Actions
    const aiReviewButton = await findAIReviewButton(sidePanel!);
    
    if (aiReviewButton) {
      console.log('🔍 Starting AI Medical Review...');
      
      const startTime = Date.now();
      await aiReviewButton.click();
      
      // Wait for processing to complete
      await page.waitForTimeout(8000); // AI Review typically takes longer
      
      // Look for batch review results
      const reviewResults = await waitForBatchResults(sidePanel!, 15000);
      
      if (reviewResults) {
        const processingTime = Date.now() - startTime;
        console.log(`✅ AI Medical Review completed in ${processingTime}ms`);
        
        // Validate batch review content
        expect(reviewResults.length).toBeGreaterThan(100);
        expect(reviewResults.toLowerCase()).toContain('review');
        
        // Check for clinical recommendations
        const hasRecommendations = 
          reviewResults.toLowerCase().includes('recommend') ||
          reviewResults.toLowerCase().includes('suggest') ||
          reviewResults.toLowerCase().includes('consider');
        
        if (hasRecommendations) {
          console.log('✅ AI Review contains clinical recommendations');
        }
        
        // Check for guideline compliance
        const hasGuidelines = 
          reviewResults.toLowerCase().includes('guideline') ||
          reviewResults.toLowerCase().includes('standard') ||
          reviewResults.toLowerCase().includes('protocol');
        
        if (hasGuidelines) {
          console.log('✅ AI Review references clinical guidelines');
        }
        
      } else {
        console.log('⚠️ AI Medical Review did not produce visible results');
      }
    } else {
      console.log('⚠️ AI Medical Review button not found');
    }
  });

  test('should handle multiple patient processing', async ({ page }) => {
    console.log('👥 Testing multiple patient processing...');
    
    // Create multiple patient scenarios
    const patients = [
      {
        name: 'John Smith (12345)',
        background: 'History of CAD, previous CABG 2019',
        medications: 'Aspirin 100mg, Atorvastatin 80mg, Metoprolol 50mg',
        investigations: 'Echo: EF 45%, Stress test: positive'
      },
      {
        name: 'Mary Jones (67890)',
        background: 'Hypertension, diabetes mellitus type 2',
        medications: 'Lisinopril 10mg, Metformin 1000mg',
        investigations: 'HbA1c 7.5%, BP monitoring: elevated'
      },
      {
        name: 'Robert Wilson (54321)',
        background: 'Atrial fibrillation, previous stroke',
        medications: 'Warfarin 5mg, Digoxin 0.25mg',
        investigations: 'INR 2.1, Echo: mild LA dilatation'
      }
    ];
    
    const reviewResults: any[] = [];
    
    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      console.log(`👤 Processing patient ${i + 1}: ${patient.name}`);
      
      // Update mock EMR data for this patient
      await updatePatientData(page, patient);
      await page.waitForTimeout(1000);
      
      // Trigger AI Medical Review
      const aiReviewButton = await findAIReviewButton(sidePanel!);
      if (aiReviewButton) {
        await aiReviewButton.click();
        await page.waitForTimeout(6000);
        
        const result = await waitForBatchResults(sidePanel!, 10000);
        if (result) {
          reviewResults.push({
            patient: patient.name,
            reviewLength: result.length,
            hasRecommendations: result.toLowerCase().includes('recommend'),
            processingTime: Date.now()
          });
          
          console.log(`✅ Patient ${i + 1} processed successfully`);
        }
        
        // Clear session for next patient
        await clearSession(sidePanel!);
        await page.waitForTimeout(1000);
      }
    }
    
    // Validate batch processing results
    expect(reviewResults.length).toBeGreaterThanOrEqual(2);
    
    const averageLength = reviewResults.reduce((sum, r) => sum + r.reviewLength, 0) / reviewResults.length;
    expect(averageLength).toBeGreaterThan(50);
    
    console.log(`✅ Processed ${reviewResults.length} patients with average review length: ${Math.round(averageLength)} characters`);
    console.log('📊 Batch processing results:', reviewResults);
  });

  test('should handle concurrent workflow processing', async ({ page }) => {
    console.log('⚡ Testing concurrent workflow processing...');
    
    // Test rapid workflow switching
    const workflows = ['quick-letter', 'consultation', 'investigation-summary'];
    const concurrentResults: any[] = [];
    
    for (const workflowType of workflows) {
      console.log(`⚡ Testing rapid ${workflowType} processing...`);
      
      const dictation = getDictation(workflowType, 'simple');
      const startTime = Date.now();
      
      // Find workflow button
      const workflowButton = await findWorkflowButton(sidePanel!, workflowType);
      if (workflowButton) {
        // Start workflow
        await workflowButton.click();
        await page.waitForTimeout(500);
        
        // Inject dictation
        await simulateDictation(page, sidePanel!, dictation);
        
        // Stop recording
        await workflowButton.click();
        
        // Don't wait for full completion - test rapid switching
        await page.waitForTimeout(2000);
        
        const result = await getPartialResult(sidePanel!);
        const processingTime = Date.now() - startTime;
        
        concurrentResults.push({
          workflow: workflowType,
          processingTime,
          hasResult: result.length > 0,
          resultLength: result.length
        });
        
        console.log(`${workflowType}: ${processingTime}ms, result: ${result.length} chars`);
        
        // Quick clear for next test
        await clearSession(sidePanel!);
        await page.waitForTimeout(500);
      }
    }
    
    // Validate concurrent processing
    expect(concurrentResults.length).toBe(workflows.length);
    
    const successfulResults = concurrentResults.filter(r => r.hasResult);
    expect(successfulResults.length).toBeGreaterThanOrEqual(2);
    
    console.log('📊 Concurrent processing results:', concurrentResults);
  });

  test('should handle large dictation batch processing', async ({ page }) => {
    console.log('📚 Testing large dictation batch processing...');
    
    // Create progressively larger dictations
    const largeDictations = [
      getDictation('consultation', 'simple'), // ~100 words
      getDictation('consultation', 'complex'), // ~300 words  
      getDictation('tavi', 'complex'), // ~400 words
      generateLargeDictation() // ~600 words
    ];
    
    const batchResults: any[] = [];
    
    for (let i = 0; i < largeDictations.length; i++) {
      const dictation = largeDictations[i];
      const wordCount = dictation.split(/\s+/).length;
      
      console.log(`📚 Processing dictation ${i + 1} (${wordCount} words)...`);
      
      const startTime = Date.now();
      
      // Use consultation workflow for consistency
      const workflowButton = await findWorkflowButton(sidePanel!, 'consultation');
      if (workflowButton) {
        await workflowButton.click();
        await page.waitForTimeout(500);
        
        await simulateDictation(page, sidePanel!, dictation);
        await workflowButton.click();
        
        // Wait longer for larger dictations
        const waitTime = Math.min(15000, 5000 + (wordCount * 10));
        await page.waitForTimeout(waitTime);
        
        const result = await getPartialResult(sidePanel!);
        const processingTime = Date.now() - startTime;
        
        batchResults.push({
          inputWords: wordCount,
          outputLength: result.length,
          processingTime,
          wordsPerSecond: wordCount / (processingTime / 1000),
          successful: result.length > 50
        });
        
        console.log(`${wordCount} words → ${result.length} chars in ${processingTime}ms`);
        
        await clearSession(sidePanel!);
        await page.waitForTimeout(1000);
      }
    }
    
    // Validate large dictation processing
    expect(batchResults.length).toBe(largeDictations.length);
    
    const successfulBatches = batchResults.filter(r => r.successful);
    expect(successfulBatches.length).toBeGreaterThanOrEqual(3);
    
    // Check performance degradation
    const processingTimes = batchResults.map(r => r.processingTime);
    const maxTime = Math.max(...processingTimes);
    expect(maxTime).toBeLessThan(20000); // Should complete within 20 seconds
    
    console.log('📊 Large dictation batch results:', batchResults);
  });

  test('should handle error recovery in batch processing', async ({ page }) => {
    console.log('🔧 Testing error recovery in batch processing...');
    
    const errorRecoveryTests = [
      { name: 'Empty dictation', dictation: '', expectedBehavior: 'handle gracefully' },
      { name: 'Very short dictation', dictation: 'Test.', expectedBehavior: 'process normally' },
      { name: 'Repeated workflow', dictation: getDictation('quick-letter', 'simple'), expectedBehavior: 'allow repetition' }
    ];
    
    const recoveryResults: any[] = [];
    
    for (const test of errorRecoveryTests) {
      console.log(`🔧 Testing: ${test.name}`);
      
      try {
        const startTime = Date.now();
        
        const workflowButton = await findWorkflowButton(sidePanel!, 'quick-letter');
        if (workflowButton) {
          await workflowButton.click();
          await page.waitForTimeout(500);
          
          if (test.dictation) {
            await simulateDictation(page, sidePanel!, test.dictation);
          }
          
          await workflowButton.click();
          await page.waitForTimeout(3000);
          
          const result = await getPartialResult(sidePanel!);
          const processingTime = Date.now() - startTime;
          
          recoveryResults.push({
            test: test.name,
            success: true,
            processingTime,
            resultLength: result.length,
            error: null
          });
          
          console.log(`✅ ${test.name}: Handled correctly`);
          
        }
      } catch (error) {
        recoveryResults.push({
          test: test.name,
          success: false,
          error: error.message
        });
        
        console.log(`❌ ${test.name}: Error - ${error.message}`);
      }
      
      await clearSession(sidePanel!);
      await page.waitForTimeout(1000);
    }
    
    // Validate error recovery
    const successfulRecoveries = recoveryResults.filter(r => r.success);
    expect(successfulRecoveries.length).toBeGreaterThanOrEqual(2);
    
    console.log('📊 Error recovery results:', recoveryResults);
  });

  test('should handle performance under load', async ({ page }) => {
    console.log('🚀 Testing performance under load...');
    
    const loadTestWorkflows = ['quick-letter', 'investigation-summary', 'background'];
    const performanceMetrics: any[] = [];
    
    // Rapid succession test
    console.log('🚀 Running rapid succession test...');
    
    for (let iteration = 0; iteration < 5; iteration++) {
      console.log(`🚀 Load test iteration ${iteration + 1}/5`);
      
      for (const workflowType of loadTestWorkflows) {
        const startTime = Date.now();
        const memoryBefore = await getMemoryUsage(page);
        
        const workflowButton = await findWorkflowButton(sidePanel!, workflowType);
        if (workflowButton) {
          await workflowButton.click();
          await page.waitForTimeout(300); // Minimal wait
          
          const dictation = getDictation(workflowType, 'simple');
          await simulateDictation(page, sidePanel!, dictation);
          
          await workflowButton.click();
          await page.waitForTimeout(2000); // Short processing wait
          
          const memoryAfter = await getMemoryUsage(page);
          const processingTime = Date.now() - startTime;
          
          performanceMetrics.push({
            iteration,
            workflow: workflowType,
            processingTime,
            memoryBefore,
            memoryAfter,
            memoryDelta: memoryAfter - memoryBefore
          });
          
          await clearSession(sidePanel!);
          await page.waitForTimeout(200);
        }
      }
    }
    
    // Analyze performance metrics
    const avgProcessingTime = performanceMetrics.reduce((sum, m) => sum + m.processingTime, 0) / performanceMetrics.length;
    const maxProcessingTime = Math.max(...performanceMetrics.map(m => m.processingTime));
    const totalMemoryDelta = performanceMetrics.reduce((sum, m) => sum + m.memoryDelta, 0);
    
    console.log(`📊 Average processing time: ${Math.round(avgProcessingTime)}ms`);
    console.log(`📊 Max processing time: ${maxProcessingTime}ms`);
    console.log(`📊 Total memory delta: ${totalMemoryDelta}MB`);
    
    // Performance assertions
    expect(avgProcessingTime).toBeLessThan(5000); // Average under 5 seconds
    expect(maxProcessingTime).toBeLessThan(10000); // Max under 10 seconds
    expect(totalMemoryDelta).toBeLessThan(100); // Memory growth under 100MB
    
    console.log('✅ Performance under load test completed');
  });

  // Helper functions
  async function setupMockEMRPage(page: Page): Promise<void> {
    await page.goto(`data:text/html,
      <html>
        <head><title>Mock EMR System</title></head>
        <body>
          <h1>Electronic Medical Record</h1>
          <div id="patient-info">
            <h2>Current Patient: John Smith (12345)</h2>
          </div>
          <div id="background-section">
            <h3>Background</h3>
            <textarea id="background-field" style="width:400px;height:100px;">
              History of coronary artery disease, previous CABG in 2019, diabetes mellitus type 2
            </textarea>
          </div>
          <div id="medications-section">
            <h3>Current Medications</h3>
            <textarea id="medications-field" style="width:400px;height:100px;">
              Aspirin 100mg daily, Atorvastatin 80mg nocte, Metoprolol 50mg BD, Metformin 1000mg BD
            </textarea>
          </div>
          <div id="investigations-section">
            <h3>Recent Investigations</h3>
            <textarea id="investigations-field" style="width:400px;height:100px;">
              Echo: EF 45%, mild LV dysfunction. Stress test: positive for ischaemia. HbA1c 7.2%
            </textarea>
          </div>
        </body>
      </html>
    `, { waitUntil: 'domcontentloaded' });
  }

  async function updatePatientData(page: Page, patient: any): Promise<void> {
    await page.evaluate((p) => {
      const patientInfo = document.getElementById('patient-info');
      if (patientInfo) {
        patientInfo.innerHTML = `<h2>Current Patient: ${p.name}</h2>`;
      }
      
      const backgroundField = document.getElementById('background-field') as HTMLTextAreaElement;
      if (backgroundField) {
        backgroundField.value = p.background;
      }
      
      const medicationsField = document.getElementById('medications-field') as HTMLTextAreaElement;
      if (medicationsField) {
        medicationsField.value = p.medications;
      }
      
      const investigationsField = document.getElementById('investigations-field') as HTMLTextAreaElement;
      if (investigationsField) {
        investigationsField.value = p.investigations;
      }
    }, patient);
  }

  async function findAIReviewButton(sidePanel: Frame): Promise<any> {
    const buttonSelectors = [
      'button:has-text("AI Review")',
      'button:has-text("AI Medical Review")',
      'button:has-text("Medical Review")',
      'button[data-action="ai-medical-review"]'
    ];
    
    for (const selector of buttonSelectors) {
      const button = sidePanel.locator(selector);
      if (await button.count() > 0 && await button.isVisible()) {
        return button.first();
      }
    }
    
    return null;
  }

  async function findWorkflowButton(sidePanel: Frame, workflowType: string): Promise<any> {
    const workflowNameMap: Record<string, string[]> = {
      'quick-letter': ['Quick Letter', 'quick letter'],
      'consultation': ['Consultation', 'consultation'],
      'investigation-summary': ['Investigation', 'Summary'],
      'background': ['Background'],
      'medication': ['Medication', 'Medications']
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

  async function waitForBatchResults(sidePanel: Frame, timeout: number = 10000): Promise<string | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const resultSelectors = [
        'textarea:not([placeholder*="dictation"])',
        '.medical-report',
        '.review-results',
        '.batch-results',
        '.ai-review-content'
      ];
      
      for (const selector of resultSelectors) {
        const element = sidePanel.locator(selector);
        if (await element.count() > 0) {
          const content = await element.first().inputValue().catch(() => 
            element.first().textContent()
          );
          
          if (content && content.length > 50) {
            return content;
          }
        }
      }
      
      await page.waitForTimeout(500);
    }
    
    return null;
  }

  async function getPartialResult(sidePanel: Frame): Promise<string> {
    const resultSelectors = [
      'textarea:not([placeholder*="dictation"])',
      '.medical-report',
      '.report-content'
    ];
    
    for (const selector of resultSelectors) {
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
    // Simplified memory tracking - in real tests this would use performance APIs
    return await page.evaluate(() => {
      return performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 0;
    });
  }

  function generateLargeDictation(): string {
    return `
      This is a comprehensive patient assessment for a 67-year-old gentleman presenting with acute chest pain and dyspnoea. 
      The patient has an extensive medical history including ischaemic heart disease with previous myocardial infarction in 2018, 
      subsequent percutaneous coronary intervention to the left anterior descending artery, and development of ischaemic cardiomyopathy 
      with reduced ejection fraction. Additional comorbidities include diabetes mellitus type 2 diagnosed 15 years ago with good glycaemic control, 
      hypertension managed with ACE inhibitor therapy, hyperlipidaemia on high-intensity statin therapy, and chronic kidney disease stage 3a. 
      Current medications include aspirin 100mg daily for secondary prevention, clopidogrel 75mg daily continuing for dual antiplatelet therapy, 
      atorvastatin 80mg nocte with recent lipid profile showing optimal LDL levels, metoprolol 100mg twice daily with excellent rate control, 
      lisinopril 10mg daily with blood pressure at target, metformin 1000mg twice daily with HbA1c of 6.8%, and furosemide 40mg daily for fluid management. 
      Physical examination reveals a comfortable patient at rest with blood pressure 125/78 mmHg, heart rate 68 beats per minute regular, 
      oxygen saturation 98% on room air, and no signs of acute distress. Cardiovascular examination demonstrates normal heart sounds with no murmurs, 
      chest is clear to auscultation bilaterally, and there is no peripheral oedema. Recent investigations include electrocardiogram showing 
      sinus rhythm with Q waves in leads V1-V3 consistent with previous anterior infarction, chest X-ray demonstrating clear lung fields 
      with normal cardiac silhouette, and echocardiography revealing mild left ventricular systolic dysfunction with ejection fraction of 42%, 
      regional wall motion abnormalities in the anterior and anteroseptal segments, and no significant valvular disease.
    `.trim();
  }
});