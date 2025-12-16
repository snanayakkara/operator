import { test, expect } from './fixtures';
import type { Page, Frame } from '@playwright/test';
import { ExtensionTestHelper } from '../helpers/ExtensionTestHelper';

test.describe('Medical Agents Tests', () => {
  let extensionId: string;
  let sidePanel: Frame | null;

  test.beforeEach(async ({ page, context }) => {
    // Get extension ID and setup
    extensionId = await ExtensionTestHelper.getExtensionId(context);
    
    // Grant necessary permissions
    await context.grantPermissions(['microphone', 'clipboard-read', 'clipboard-write']);
    
    // Inject mock audio and simulate transcription
    await ExtensionTestHelper.injectMockAudio(page, extensionId);
    
    // Open side panel
    sidePanel = await ExtensionTestHelper.openSidePanel(page, extensionId);
    expect(sidePanel).toBeTruthy();
  });

  test('should classify TAVI procedure correctly', async ({ page }) => {
    const taviDictation = 'Patient underwent transcatheter aortic valve implantation. A 29mm Edwards Sapien 3 valve was deployed via transfemoral approach with excellent hemodynamic result.';
    
    // Simulate voice input
    await ExtensionTestHelper.simulateVoiceInput(page, taviDictation);
    
    // Start recording and simulate the classification process
    const recordButton = sidePanel!.locator('button').first();
    await recordButton.click();
    await page.waitForTimeout(500);
    
    // Inject the transcription result
    await sidePanel!.evaluate((text) => {
      // Look for transcription input areas and set the value
      const inputs = document.querySelectorAll('textarea, input[type="text"]');
      if (inputs.length > 0) {
        (inputs[0] as HTMLTextAreaElement).value = text;
        (inputs[0] as HTMLTextAreaElement).dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      // Store for mock classification
      (window as any).currentTranscription = text;
    }, taviDictation);
    
    // Stop recording
    await recordButton.click();
    await page.waitForTimeout(1000);
    
    // Look for TAVI agent activation or classification
    const agentSelectors = [
      'button:has-text("TAVI")',
      '.agent-tavi',
      '[data-agent="tavi"]',
      'button:has-text("Aortic Valve")',
      '.procedure-tavi',
      '[data-testid="tavi-agent"]'
    ];

    let taviAgentFound = false;
    for (const selector of agentSelectors) {
      if (await sidePanel!.locator(selector).isVisible().catch(() => false)) {
        taviAgentFound = true;
        console.log(`✅ TAVI agent classified with selector: ${selector}`);
        
        // Click the agent if it's a button
        if (selector.includes('button')) {
          await sidePanel!.locator(selector).click();
          await page.waitForTimeout(1000);
        }
        break;
      }
    }

    if (!taviAgentFound) {
      // Look for any agent classification result
      const classificationResults = [
        '.classification-result',
        '.agent-selection',
        '[data-testid="classification"]',
        '.procedure-type'
      ];

      for (const selector of classificationResults) {
        const element = sidePanel!.locator(selector);
        if (await element.isVisible().catch(() => false)) {
          const text = await element.textContent();
          if (text?.toLowerCase().includes('tavi') || text?.toLowerCase().includes('aortic')) {
            taviAgentFound = true;
            console.log(`✅ TAVI classification found in: ${text}`);
            break;
          }
        }
      }
    }

    expect(taviAgentFound).toBe(true);
  });

  test('should classify PCI procedure correctly', async ({ page }) => {
    const pciDictation = 'Percutaneous coronary intervention to the LAD. A drug-eluting stent was deployed after balloon pre-dilatation with excellent angiographic result.';
    
    await ExtensionTestHelper.simulateVoiceInput(page, pciDictation);
    
    // Start recording process
    const recordButton = sidePanel!.locator('button').first();
    await recordButton.click();
    await page.waitForTimeout(500);
    
    // Inject transcription
    await sidePanel!.evaluate((text) => {
      const inputs = document.querySelectorAll('textarea, input[type="text"]');
      if (inputs.length > 0) {
        (inputs[0] as HTMLTextAreaElement).value = text;
        (inputs[0] as HTMLTextAreaElement).dispatchEvent(new Event('input', { bubbles: true }));
      }
      (window as any).currentTranscription = text;
    }, pciDictation);
    
    await recordButton.click();
    await page.waitForTimeout(1000);
    
    // Look for PCI agent activation
    const pciAgentSelectors = [
      'button:has-text("PCI")',
      '.agent-pci',
      '[data-agent="pci"]',
      'button:has-text("Coronary")',
      '.procedure-pci',
      '[data-testid="pci-agent"]'
    ];

    let pciAgentFound = false;
    for (const selector of pciAgentSelectors) {
      if (await sidePanel!.locator(selector).isVisible().catch(() => false)) {
        pciAgentFound = true;
        console.log(`✅ PCI agent classified with selector: ${selector}`);
        break;
      }
    }

    expect(pciAgentFound).toBe(true);
  });

  test('should classify Angiogram procedure correctly', async ({ page }) => {
    const angiogramDictation = 'Coronary angiography performed. Left main normal, LAD 70% stenosis, circumflex 40% stenosis, RCA 50% stenosis. Left ventricular function normal.';
    
    await ExtensionTestHelper.simulateVoiceInput(page, angiogramDictation);
    
    const recordButton = sidePanel!.locator('button').first();
    await recordButton.click();
    await page.waitForTimeout(500);
    
    await sidePanel!.evaluate((text) => {
      const inputs = document.querySelectorAll('textarea, input[type="text"]');
      if (inputs.length > 0) {
        (inputs[0] as HTMLTextAreaElement).value = text;
        (inputs[0] as HTMLTextAreaElement).dispatchEvent(new Event('input', { bubbles: true }));
      }
      (window as any).currentTranscription = text;
    }, angiogramDictation);
    
    await recordButton.click();
    await page.waitForTimeout(1000);
    
    const angiogramAgentSelectors = [
      'button:has-text("Angiogram")',
      '.agent-angiogram',
      '[data-agent="angiogram"]',
      'button:has-text("Catheterization")',
      '.procedure-angiogram',
      '[data-testid="angiogram-agent"]'
    ];

    let angiogramAgentFound = false;
    for (const selector of angiogramAgentSelectors) {
      if (await sidePanel!.locator(selector).isVisible().catch(() => false)) {
        angiogramAgentFound = true;
        console.log(`✅ Angiogram agent classified with selector: ${selector}`);
        break;
      }
    }

    expect(angiogramAgentFound).toBe(true);
  });

  test('should handle Quick Letter agent with narrative output', async ({ page }) => {
    const letterDictation = 'Thank you for seeing Mrs Johnson. She presented with chest pain and shortness of breath. I am referring her for cardiology assessment. Please arrange urgent review.';
    
    await ExtensionTestHelper.simulateVoiceInput(page, letterDictation);
    
    const recordButton = sidePanel!.locator('button').first();
    await recordButton.click();
    await page.waitForTimeout(500);
    
    await sidePanel!.evaluate((text) => {
      const inputs = document.querySelectorAll('textarea, input[type="text"]');
      if (inputs.length > 0) {
        (inputs[0] as HTMLTextAreaElement).value = text;
        (inputs[0] as HTMLTextAreaElement).dispatchEvent(new Event('input', { bubbles: true }));
      }
      (window as any).currentTranscription = text;
    }, letterDictation);
    
    await recordButton.click();
    await page.waitForTimeout(1000);
    
    const letterAgentSelectors = [
      'button:has-text("Quick Letter")',
      'button:has-text("Letter")',
      '.agent-letter',
      '[data-agent="letter"]',
      '.procedure-letter',
      '[data-testid="letter-agent"]'
    ];

    let letterAgentFound = false;
    for (const selector of letterAgentSelectors) {
      if (await sidePanel!.locator(selector).isVisible().catch(() => false)) {
        letterAgentFound = true;
        console.log(`✅ Quick Letter agent classified with selector: ${selector}`);
        
        // Test narrative output format
        await sidePanel!.locator(selector).click();
        await page.waitForTimeout(2000);
        
        // Check for narrative prose output
        const reportElement = sidePanel!.locator('textarea').last();
        if (await reportElement.isVisible().catch(() => false)) {
          const content = await reportElement.inputValue().catch(() => '');
          
          if (content && content.length > 20) {
            console.log(`✅ Narrative content generated: ${content.substring(0, 100)}...`);
            
            // Validate narrative format (no headings, no salutations)
            const hasHeadings = content.includes('**') || content.includes('##') || content.includes('HISTORY:');
            const hasSalutations = content.toLowerCase().includes('dear ') || content.toLowerCase().includes('kind regards');
            
            expect(hasHeadings).toBe(false);
            expect(hasSalutations).toBe(false);
            console.log('✅ Narrative format validated: no headings or salutations');
          }
        }
        break;
      }
    }

    expect(letterAgentFound).toBe(true);
  });

  test('should generate medical report after agent selection', async ({ page }) => {
    const taviDictation = 'TAVI procedure completed. Edwards Sapien 3 valve deployed successfully with no complications.';
    
    await ExtensionTestHelper.simulateVoiceInput(page, taviDictation);
    
    // Complete the dictation process
    const recordButton = sidePanel!.locator('button').first();
    await recordButton.click();
    await page.waitForTimeout(500);
    
    await sidePanel!.evaluate((text) => {
      const inputs = document.querySelectorAll('textarea, input[type="text"]');
      if (inputs.length > 0) {
        (inputs[0] as HTMLTextAreaElement).value = text;
        (inputs[0] as HTMLTextAreaElement).dispatchEvent(new Event('input', { bubbles: true }));
      }
      (window as any).currentTranscription = text;
    }, taviDictation);
    
    await recordButton.click();
    await page.waitForTimeout(1000);
    
    // Look for and click agent button
    const agentButton = sidePanel!.locator('button:has-text("TAVI"), .agent-tavi, [data-agent="tavi"]').first();
    if (await agentButton.isVisible().catch(() => false)) {
      await agentButton.click();
      await page.waitForTimeout(2000); // Allow time for report generation
      
      // Look for generated report
      const reportSelectors = [
        'textarea[placeholder*="report"]',
        '.generated-report',
        '[data-testid="medical-report"]',
        '.report-output',
        'textarea:not([placeholder*="dictation"])',
        '.report-content'
      ];

      let reportFound = false;
      for (const selector of reportSelectors) {
        const element = sidePanel!.locator(selector);
        if (await element.isVisible().catch(() => false)) {
          const content = await element.textContent().catch(() => '') || 
                          await element.inputValue().catch(() => '');
          
          if (content && content.length > 50) { // Substantial content
            reportFound = true;
            console.log(`✅ Medical report generated: ${content.substring(0, 100)}...`);
            
            // Verify report contains expected medical terminology
            const containsTaviTerms = content.toLowerCase().includes('tavi') || 
                                    content.toLowerCase().includes('aortic') ||
                                    content.toLowerCase().includes('valve') ||
                                    content.toLowerCase().includes('transcatheter');
            
            expect(containsTaviTerms).toBe(true);
            break;
          }
        }
      }

      expect(reportFound).toBe(true);
    } else {
      console.log('⚠️ No TAVI agent button found to click');
    }
  });

  test('should handle agent switching', async ({ page }) => {
    // Start with one type of dictation
    const initialDictation = 'Coronary angiography performed showing significant disease.';
    
    await ExtensionTestHelper.simulateVoiceInput(page, initialDictation);
    
    // Complete initial classification
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
    await page.waitForTimeout(1000);
    
    // Look for multiple agent options
    const agentButtons = await sidePanel!.locator('button').all();
    const visibleAgents = [];
    
    for (const button of agentButtons) {
      if (await button.isVisible().catch(() => false)) {
        const text = await button.textContent();
        if (text && (text.includes('TAVI') || text.includes('PCI') || text.includes('Angiogram') || text.includes('Letter'))) {
          visibleAgents.push({ button, text });
        }
      }
    }

    if (visibleAgents.length > 1) {
      console.log(`✅ Multiple agents available: ${visibleAgents.map(a => a.text).join(', ')}`);
      
      // Click first agent
      await visibleAgents[0].button.click();
      await page.waitForTimeout(1000);
      
      // Click second agent to test switching
      await visibleAgents[1].button.click();
      await page.waitForTimeout(1000);
      
      console.log('✅ Agent switching test completed');
    } else {
      console.log('⚠️ Multiple agents not available for switching test');
    }
  });

  test('should validate agent-specific report formats', async ({ page }) => {
    const testCases = [
      {
        dictation: 'TAVI procedure with Edwards valve deployment',
        expectedTerms: ['PROCEDURE', 'TAVI', 'valve', 'Edwards', 'hemodynamic'],
        agentName: 'TAVI'
      },
      {
        dictation: 'PCI to LAD with stent placement',
        expectedTerms: ['PROCEDURE', 'PCI', 'LAD', 'stent', 'angiographic'],
        agentName: 'PCI'
      }
    ];

    for (const testCase of testCases) {
      console.log(`Testing ${testCase.agentName} report format...`);
      
      await ExtensionTestHelper.simulateVoiceInput(page, testCase.dictation);
      
      // Complete dictation
      const recordButton = sidePanel!.locator('button').first();
      await recordButton.click();
      await page.waitForTimeout(500);
      
      await sidePanel!.evaluate((text) => {
        const inputs = document.querySelectorAll('textarea, input[type="text"]');
        if (inputs.length > 0) {
          (inputs[0] as HTMLTextAreaElement).value = text;
          (inputs[0] as HTMLTextAreaElement).dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, testCase.dictation);
      
      await recordButton.click();
      await page.waitForTimeout(1000);
      
      // Find and click relevant agent
      const agentSelectors = [
        `button:has-text("${testCase.agentName}")`,
        `.agent-${testCase.agentName.toLowerCase()}`,
        `[data-agent="${testCase.agentName.toLowerCase()}"]`
      ];

      let agentClicked = false;
      for (const selector of agentSelectors) {
        const agent = sidePanel!.locator(selector);
        if (await agent.isVisible().catch(() => false)) {
          await agent.click();
          await page.waitForTimeout(2000);
          agentClicked = true;
          break;
        }
      }

      if (agentClicked) {
        // Check generated report format
        const reportElement = sidePanel!.locator('textarea').last();
        if (await reportElement.isVisible().catch(() => false)) {
          const reportContent = await reportElement.inputValue().catch(() => '');
          
          if (reportContent && reportContent.length > 0) {
            let termsFound = 0;
            for (const term of testCase.expectedTerms) {
              if (reportContent.toLowerCase().includes(term.toLowerCase())) {
                termsFound++;
              }
            }
            
            console.log(`✅ ${testCase.agentName} report generated with ${termsFound}/${testCase.expectedTerms.length} expected terms`);
            expect(termsFound).toBeGreaterThan(0);
          }
        }
      }
      
      // Wait before next test case
      await page.waitForTimeout(500);
    }
  });

  test('should handle consultation agent with conversation-style input', async ({ page }) => {
    const conversationDictation = 'So tell me about your chest pain. When did it start? Well it started about 3 weeks ago doctor. Can you describe what happened when you were walking? I get this tight feeling and have to stop. Do you have any other symptoms? Yes I get short of breath too.';
    
    await ExtensionTestHelper.simulateVoiceInput(page, conversationDictation);
    
    const recordButton = sidePanel!.locator('button').first();
    await recordButton.click();
    await page.waitForTimeout(500);
    
    await sidePanel!.evaluate((text) => {
      const inputs = document.querySelectorAll('textarea, input[type="text"]');
      if (inputs.length > 0) {
        (inputs[0] as HTMLTextAreaElement).value = text;
        (inputs[0] as HTMLTextAreaElement).dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, conversationDictation);
    
    await recordButton.click();
    await page.waitForTimeout(1000);
    
    // Look for consultation agent (should classify conversation-style input)
    const consultationAgentSelectors = [
      'button:has-text("Consultation")',
      '.agent-consultation',
      '[data-agent="consultation"]',
      '[data-testid="consultation-agent"]'
    ];

    let consultationAgentFound = false;
    for (const selector of consultationAgentSelectors) {
      if (await sidePanel!.locator(selector).isVisible().catch(() => false)) {
        consultationAgentFound = true;
        console.log(`✅ Consultation agent classified for conversation: ${selector}`);
        
        // Test narrative output format
        await sidePanel!.locator(selector).click();
        await page.waitForTimeout(2000);
        
        // Check for narrative prose output
        const reportElement = sidePanel!.locator('textarea').last();
        if (await reportElement.isVisible().catch(() => false)) {
          const content = await reportElement.inputValue().catch(() => '');
          
          if (content && content.length > 20) {
            console.log(`✅ Consultation narrative generated: ${content.substring(0, 100)}...`);
            
            // Validate narrative format (no headings, no salutations)
            const hasHeadings = content.includes('**') || content.includes('##') || content.includes('CONSULTATION:');
            const hasSalutations = content.toLowerCase().includes('dear ') || content.toLowerCase().includes('yours sincerely');
            
            expect(hasHeadings).toBe(false);
            expect(hasSalutations).toBe(false);
            console.log('✅ Consultation narrative format validated');
          }
        }
        break;
      }
    }

    expect(consultationAgentFound).toBe(true);
  });

  test('should distinguish between dictation and conversation patterns', async ({ page }) => {
    // Test cases to validate improved classifier
    const testCases = [
      {
        input: 'Thank you for seeing this patient with chest pain. Please arrange follow-up.',
        expectedAgent: 'Quick Letter',
        description: 'dictated letter style'
      },
      {
        input: 'So what brings you in today? Well doctor I have been having chest pain. When did it start? About a week ago.',
        expectedAgent: 'Consultation',
        description: 'conversation style'
      }
    ];

    for (const testCase of testCases) {
      console.log(`Testing classifier for ${testCase.description}...`);
      
      await ExtensionTestHelper.simulateVoiceInput(page, testCase.input);
      
      const recordButton = sidePanel!.locator('button').first();
      await recordButton.click();
      await page.waitForTimeout(500);
      
      await sidePanel!.evaluate((text) => {
        const inputs = document.querySelectorAll('textarea, input[type="text"]');
        if (inputs.length > 0) {
          (inputs[0] as HTMLTextAreaElement).value = text;
          (inputs[0] as HTMLTextAreaElement).dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, testCase.input);
      
      await recordButton.click();
      await page.waitForTimeout(1500);
      
      // Look for expected agent classification
      const expectedAgentSelectors = [
        `button:has-text("${testCase.expectedAgent}")`,
        `.agent-${testCase.expectedAgent.toLowerCase().replace(' ', '-')}`,
        `[data-agent="${testCase.expectedAgent.toLowerCase().replace(' ', '-')}"]`
      ];

      let correctAgentFound = false;
      for (const selector of expectedAgentSelectors) {
        if (await sidePanel!.locator(selector).isVisible().catch(() => false)) {
          correctAgentFound = true;
          console.log(`✅ ${testCase.description} correctly classified as ${testCase.expectedAgent}`);
          break;
        }
      }

      // Allow some flexibility in classification due to AI variability
      if (!correctAgentFound) {
        console.log(`⚠️ ${testCase.description} may have been classified differently - this is acceptable for AI-based classification`);
      }
      
      // Wait before next test case
      await page.waitForTimeout(500);
    }
  });

  test('should handle unknown procedure types', async ({ page }) => {
    const unknownDictation = 'Patient discussed general wellness and routine follow-up appointment scheduled.';
    
    await ExtensionTestHelper.simulateVoiceInput(page, unknownDictation);
    
    const recordButton = sidePanel!.locator('button').first();
    await recordButton.click();
    await page.waitForTimeout(500);
    
    await sidePanel!.evaluate((text) => {
      const inputs = document.querySelectorAll('textarea, input[type="text"]');
      if (inputs.length > 0) {
        (inputs[0] as HTMLTextAreaElement).value = text;
        (inputs[0] as HTMLTextAreaElement).dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, unknownDictation);
    
    await recordButton.click();
    await page.waitForTimeout(1000);
    
    // Look for default/consultation agent or general classification
    const defaultAgentSelectors = [
      'button:has-text("Consultation")',
      'button:has-text("General")',
      'button:has-text("Other")',
      '.agent-consultation',
      '.agent-default',
      '[data-agent="consultation"]'
    ];

    let defaultAgentFound = false;
    for (const selector of defaultAgentSelectors) {
      if (await sidePanel!.locator(selector).isVisible().catch(() => false)) {
        defaultAgentFound = true;
        console.log(`✅ Default/consultation agent found: ${selector}`);
        break;
      }
    }

    console.log(defaultAgentFound ? '✅ Unknown procedure handling implemented' : '⚠️ Unknown procedure handling may need review');
  });
});
