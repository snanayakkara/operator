import { test, expect } from './fixtures';
import type { Page, Frame } from '@playwright/test';
import { ExtensionTestHelper } from '../helpers/ExtensionTestHelper';

test.describe('Full Workflow Tests', () => {
  let extensionId: string;
  let sidePanel: Frame | null;

  test.beforeEach(async ({ page, context }) => {
    // Get extension ID and setup
    extensionId = await ExtensionTestHelper.getExtensionId(context);
    
    // Grant necessary permissions
    await context.grantPermissions(['microphone', 'clipboard-read', 'clipboard-write']);
    
    // Inject mock audio functionality
    await ExtensionTestHelper.injectMockAudio(page, extensionId);
    
    // Open side panel
    sidePanel = await ExtensionTestHelper.openSidePanel(page, extensionId);
    expect(sidePanel).toBeTruthy();
  });

  test('should complete full TAVI workflow', async ({ page }) => {
    const taviDictation = 'Patient underwent transcatheter aortic valve implantation. A 29mm Edwards Sapien 3 valve was successfully deployed via transfemoral approach. Pre-procedure aortic valve area was 0.7 cm squared. Post-procedure gradient is mean 8 mmHg with no paravalvular leak. Left ventricular ejection fraction is 55 percent. Patient is stable post-procedure.';
    
    console.log('🔄 Starting complete TAVI workflow test...');
    
    // Step 1: Start recording
    console.log('📹 Step 1: Starting voice recording');
    const recordButton = sidePanel!.locator('button').first();
    await recordButton.click();
    await page.waitForTimeout(500);
    
    // Step 2: Simulate voice input and transcription
    console.log('🎤 Step 2: Simulating voice dictation');
    await ExtensionTestHelper.simulateVoiceInput(page, taviDictation);
    
    // Inject transcription result
    await sidePanel!.evaluate((text) => {
      const inputs = document.querySelectorAll('textarea, input[type="text"]');
      if (inputs.length > 0) {
        (inputs[0] as HTMLTextAreaElement).value = text;
        (inputs[0] as HTMLTextAreaElement).dispatchEvent(new Event('input', { bubbles: true }));
      }
      (window as any).currentTranscription = text;
    }, taviDictation);
    
    // Step 3: Stop recording
    console.log('⏹️ Step 3: Stopping recording');
    await recordButton.click();
    await page.waitForTimeout(2000); // Allow for classification
    
    // Step 4: Verify classification
    console.log('🔍 Step 4: Verifying classification');
    const agentButtons = await sidePanel!.locator('button').all();
    let taviAgentButton = null;
    
    for (const button of agentButtons) {
      if (await button.isVisible().catch(() => false)) {
        const text = await button.textContent();
        if (text && text.toLowerCase().includes('tavi')) {
          taviAgentButton = button;
          console.log('✅ TAVI agent classified correctly');
          break;
        }
      }
    }
    
    expect(taviAgentButton).toBeTruthy();
    
    // Step 5: Generate report
    console.log('📝 Step 5: Generating medical report');
    if (taviAgentButton) {
      await taviAgentButton.click();
      await page.waitForTimeout(3000); // Allow time for report generation
      
      // Step 6: Verify report generation
      console.log('✅ Step 6: Verifying report generation');
      const reportElement = sidePanel!.locator('textarea').last();
      const reportContent = await reportElement.inputValue().catch(() => '');
      
      expect(reportContent.length).toBeGreaterThan(100);
      expect(reportContent.toLowerCase()).toContain('tavi');
      expect(reportContent.toLowerCase()).toContain('procedure');
      expect(reportContent.toLowerCase()).toContain('edwards');
      expect(reportContent.toLowerCase()).toContain('valve');
      
      console.log(`✅ Generated report (${reportContent.length} chars): ${reportContent.substring(0, 100)}...`);
      
      // Step 7: Test clipboard functionality
      console.log('📋 Step 7: Testing clipboard functionality');
      const copyButtons = await sidePanel!.locator('button').all();
      let copyButton = null;
      
      for (const button of copyButtons) {
        const text = await button.textContent();
        if (text && (text.toLowerCase().includes('copy') || text.toLowerCase().includes('clipboard'))) {
          copyButton = button;
          break;
        }
      }
      
      if (copyButton && await copyButton.isVisible().catch(() => false)) {
        await copyButton.click();
        await page.waitForTimeout(500);
        console.log('✅ Copy to clipboard functionality tested');
      } else {
        console.log('⚠️ Copy button not found - testing manual selection');
        
        // Select all text in report
        await reportElement.selectText();
        await page.keyboard.press('Meta+c'); // Copy
        await page.waitForTimeout(500);
        console.log('✅ Manual copy functionality tested');
      }
    }
    
    console.log('🎉 Complete TAVI workflow test passed!');
  });

  test('should complete full PCI workflow', async ({ page }) => {
    const pciDictation = 'Percutaneous coronary intervention performed to the left anterior descending artery. Significant 90 percent stenosis was identified in the mid LAD. Drug-eluting stent was deployed after balloon pre-dilatation. Excellent angiographic result achieved with less than 10 percent residual stenosis. TIMI 3 flow restored. No complications occurred.';
    
    console.log('🔄 Starting complete PCI workflow test...');
    
    // Complete workflow steps
    const recordButton = sidePanel!.locator('button').first();
    await recordButton.click();
    await page.waitForTimeout(500);
    
    await ExtensionTestHelper.simulateVoiceInput(page, pciDictation);
    
    await sidePanel!.evaluate((text) => {
      const inputs = document.querySelectorAll('textarea, input[type="text"]');
      if (inputs.length > 0) {
        (inputs[0] as HTMLTextAreaElement).value = text;
        (inputs[0] as HTMLTextAreaElement).dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, pciDictation);
    
    await recordButton.click();
    await page.waitForTimeout(2000);
    
    // Find and click PCI agent
    const agentButtons = await sidePanel!.locator('button').all();
    let pciAgentButton = null;
    
    for (const button of agentButtons) {
      if (await button.isVisible().catch(() => false)) {
        const text = await button.textContent();
        if (text && text.toLowerCase().includes('pci')) {
          pciAgentButton = button;
          break;
        }
      }
    }
    
    expect(pciAgentButton).toBeTruthy();
    
    if (pciAgentButton) {
      await pciAgentButton.click();
      await page.waitForTimeout(3000);
      
      const reportElement = sidePanel!.locator('textarea').last();
      const reportContent = await reportElement.inputValue().catch(() => '');
      
      expect(reportContent.length).toBeGreaterThan(100);
      expect(reportContent.toLowerCase()).toContain('pci');
      expect(reportContent.toLowerCase()).toContain('lad');
      expect(reportContent.toLowerCase()).toContain('stent');
      
      console.log('✅ Complete PCI workflow test passed!');
    }
  });

  test('should handle workflow interruption and recovery', async ({ page }) => {
    const dictation = 'Patient underwent coronary angiography showing significant disease';
    
    console.log('🔄 Testing workflow interruption and recovery...');
    
    // Start workflow
    const recordButton = sidePanel!.locator('button').first();
    await recordButton.click();
    await page.waitForTimeout(500);
    
    // Simulate interruption by stopping recording early
    await recordButton.click();
    await page.waitForTimeout(500);
    
    // Start again
    await recordButton.click();
    await page.waitForTimeout(500);
    
    await ExtensionTestHelper.simulateVoiceInput(page, dictation);
    
    await sidePanel!.evaluate((text) => {
      const inputs = document.querySelectorAll('textarea, input[type="text"]');
      if (inputs.length > 0) {
        (inputs[0] as HTMLTextAreaElement).value = text;
        (inputs[0] as HTMLTextAreaElement).dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, dictation);
    
    await recordButton.click();
    await page.waitForTimeout(2000);
    
    // Verify recovery worked
    const agentButtons = await sidePanel!.locator('button').all();
    let agentFound = false;
    
    for (const button of agentButtons) {
      if (await button.isVisible().catch(() => false)) {
        const text = await button.textContent();
        if (text && (text.includes('Angiogram') || text.includes('PCI') || text.includes('TAVI'))) {
          agentFound = true;
          break;
        }
      }
    }
    
    expect(agentFound).toBe(true);
    console.log('✅ Workflow interruption and recovery test passed!');
  });

  test('should test multi-step correction workflow', async ({ page }) => {
    console.log('🔄 Testing multi-step correction workflow...');
    
    // Start with incorrect dictation
    let dictation = 'Patient had a heart procedure';
    
    const recordButton = sidePanel!.locator('button').first();
    await recordButton.click();
    await page.waitForTimeout(500);
    
    await sidePanel!.evaluate((text) => {
      const inputs = document.querySelectorAll('textarea, input[type="text"]');
      if (inputs.length > 0) {
        (inputs[0] as HTMLTextAreaElement).value = text;
        (inputs[0] as HTMLTextAreaElement).dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, dictation);
    
    await recordButton.click();
    await page.waitForTimeout(1000);
    
    // Look for transcription text area to edit
    const transcriptionArea = sidePanel!.locator('textarea').first();
    if (await transcriptionArea.isVisible().catch(() => false)) {
      // Clear and add more specific dictation
      await transcriptionArea.clear();
      const correctedDictation = 'Patient underwent TAVI procedure with Edwards Sapien 3 valve deployment via transfemoral approach with excellent hemodynamic results';
      await transcriptionArea.fill(correctedDictation);
      await page.waitForTimeout(1000);
      
      // Trigger re-classification
      const reclassifyButtons = [
        'button:has-text("Classify")',
        'button:has-text("Analyze")',
        'button:has-text("Process")',
        'button:has-text("Generate")'
      ];
      
      let reclassified = false;
      for (const selector of reclassifyButtons) {
        const button = sidePanel!.locator(selector);
        if (await button.isVisible().catch(() => false)) {
          await button.click();
          await page.waitForTimeout(2000);
          reclassified = true;
          break;
        }
      }
      
      // Check if TAVI agent now appears
      const agentButtons = await sidePanel!.locator('button').all();
      let taviFound = false;
      
      for (const button of agentButtons) {
        if (await button.isVisible().catch(() => false)) {
          const text = await button.textContent();
          if (text && text.toLowerCase().includes('tavi')) {
            taviFound = true;
            await button.click();
            await page.waitForTimeout(2000);
            break;
          }
        }
      }
      
      expect(taviFound).toBe(true);
      console.log('✅ Multi-step correction workflow test passed!');
    }
  });

  test('should test agent switching mid-workflow', async ({ page }) => {
    console.log('🔄 Testing agent switching mid-workflow...');
    
    const initialDictation = 'Coronary angiography performed showing significant LAD disease';
    
    // Complete initial workflow
    const recordButton = sidePanel!.locator('button').first();
    await recordButton.click();
    await page.waitForTimeout(500);
    
    await sidePanel!.evaluate((text) => {
      const inputs = document.querySelectorAll('textarea, input[type="text"]');
      if (inputs.length > 0) {
        (inputs[0] as HTMLTextAreaElement).value = text;
        (inputs[0] as HTMLTextAreaElement).dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, initialDictation);
    
    await recordButton.click();
    await page.waitForTimeout(2000);
    
    // Get all available agents
    const agentButtons = await sidePanel!.locator('button').all();
    const availableAgents = [];
    
    for (const button of agentButtons) {
      if (await button.isVisible().catch(() => false)) {
        const text = await button.textContent();
        if (text && (text.includes('TAVI') || text.includes('PCI') || text.includes('Angiogram'))) {
          availableAgents.push(button);
        }
      }
    }
    
    if (availableAgents.length >= 2) {
      // Click first agent
      await availableAgents[0].click();
      await page.waitForTimeout(1500);
      
      // Switch to second agent
      await availableAgents[1].click();
      await page.waitForTimeout(1500);
      
      // Verify report changed
      const reportElement = sidePanel!.locator('textarea').last();
      const finalReport = await reportElement.inputValue().catch(() => '');
      
      expect(finalReport.length).toBeGreaterThan(50);
      console.log('✅ Agent switching mid-workflow test passed!');
    } else {
      console.log('⚠️ Not enough agents available for switching test');
    }
  });

  test('should test complete workflow with clipboard integration', async ({ page }) => {
    console.log('🔄 Testing complete workflow with clipboard integration...');
    
    // Navigate to a page with a text input (simulating EMR)
    await page.goto('data:text/html,<html><body><h1>EMR System</h1><textarea id="patient-notes" placeholder="Patient notes..." style="width:400px;height:200px;"></textarea></body></html>');
    await page.waitForTimeout(1000);
    
    // Re-open side panel
    sidePanel = await ExtensionTestHelper.openSidePanel(page, extensionId);
    expect(sidePanel).toBeTruthy();
    
    const dictation = 'TAVI procedure completed successfully with 29mm Edwards Sapien 3 valve';
    
    // Complete the workflow
    const recordButton = sidePanel!.locator('button').first();
    await recordButton.click();
    await page.waitForTimeout(500);
    
    await sidePanel!.evaluate((text) => {
      const inputs = document.querySelectorAll('textarea, input[type="text"]');
      if (inputs.length > 0) {
        (inputs[0] as HTMLTextAreaElement).value = text;
        (inputs[0] as HTMLTextAreaElement).dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, dictation);
    
    await recordButton.click();
    await page.waitForTimeout(2000);
    
    // Find and click TAVI agent
    const agentButtons = await sidePanel!.locator('button').all();
    for (const button of agentButtons) {
      if (await button.isVisible().catch(() => false)) {
        const text = await button.textContent();
        if (text && text.toLowerCase().includes('tavi')) {
          await button.click();
          await page.waitForTimeout(3000);
          break;
        }
      }
    }
    
    // Copy the report
    const reportElement = sidePanel!.locator('textarea').last();
    await reportElement.selectText();
    await page.keyboard.press('Meta+c');
    await page.waitForTimeout(500);
    
    // Paste into EMR field
    await page.click('#patient-notes');
    await page.keyboard.press('Meta+v');
    await page.waitForTimeout(500);
    
    // Verify paste worked
    const pastedContent = await page.inputValue('#patient-notes');
    expect(pastedContent.length).toBeGreaterThan(100);
    expect(pastedContent.toLowerCase()).toContain('tavi');
    
    console.log('✅ Complete workflow with clipboard integration test passed!');
  });

  test('should test performance with large dictations', async ({ page }) => {
    console.log('🔄 Testing performance with large dictations...');
    
    // Create a large dictation (realistic medical report length)
    const largeDictation = `
      Patient is a 75-year-old male with severe symptomatic aortic stenosis who underwent transcatheter aortic valve implantation. 
      The procedure was performed via transfemoral approach using a 29mm Edwards Sapien 3 valve. 
      Pre-procedure evaluation showed aortic valve area of 0.7 cm squared with mean gradient of 45 mmHg. 
      Left ventricular ejection fraction was 55 percent with mild mitral regurgitation. 
      Coronary angiography showed non-obstructive coronary artery disease. 
      The procedure was performed under conscious sedation with local anesthesia. 
      Vascular access was obtained via right common femoral artery using modified Seldinger technique. 
      Pre-dilatation was performed with a 23mm balloon. 
      The valve was successfully deployed at the annular level with excellent positioning. 
      Post-deployment balloon dilatation was performed to optimize valve expansion. 
      Final angiography showed trivial paravalvular leak with excellent hemodynamics. 
      Mean gradient post-procedure was 8 mmHg with calculated valve area of 1.8 cm squared. 
      There were no procedural complications. 
      Patient remained hemodynamically stable throughout the procedure. 
      Vascular closure was achieved with ProGlide closure device. 
      Patient will be monitored overnight and discharged tomorrow if stable.
    `.trim();
    
    const startTime = Date.now();
    
    // Execute workflow
    const recordButton = sidePanel!.locator('button').first();
    await recordButton.click();
    await page.waitForTimeout(500);
    
    await sidePanel!.evaluate((text) => {
      const inputs = document.querySelectorAll('textarea, input[type="text"]');
      if (inputs.length > 0) {
        (inputs[0] as HTMLTextAreaElement).value = text;
        (inputs[0] as HTMLTextAreaElement).dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, largeDictation);
    
    await recordButton.click();
    await page.waitForTimeout(3000); // Allow more time for large dictation processing
    
    // Find and activate agent
    const agentButtons = await sidePanel!.locator('button').all();
    for (const button of agentButtons) {
      if (await button.isVisible().catch(() => false)) {
        const text = await button.textContent();
        if (text && text.toLowerCase().includes('tavi')) {
          await button.click();
          await page.waitForTimeout(5000); // Allow more time for report generation
          break;
        }
      }
    }
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    // Verify report was generated
    const reportElement = sidePanel!.locator('textarea').last();
    const reportContent = await reportElement.inputValue().catch(() => '');
    
    expect(reportContent.length).toBeGreaterThan(200);
    expect(processingTime).toBeLessThan(15000); // Should complete within 15 seconds
    
    console.log(`✅ Large dictation performance test passed! Processing time: ${processingTime}ms`);
  });
});
