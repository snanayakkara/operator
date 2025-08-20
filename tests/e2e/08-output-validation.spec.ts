import { test, expect, Page, Frame } from '@playwright/test';
import { ExtensionTestHelper } from '../helpers/ExtensionTestHelper';
import { MedicalReportValidator, ValidationResult } from '../helpers/MedicalReportValidator';
import { MEDICAL_DICTATIONS, getDictation, getExpectedOutputs } from '../helpers/MedicalDictations';

test.describe('Medical Report Output Validation', () => {
  let extensionId: string;
  let sidePanel: Frame | null;
  let validator: MedicalReportValidator;

  test.beforeEach(async ({ page, context }) => {
    console.log('🔍 Setting up output validation test environment...');
    
    // Initialize validator
    validator = new MedicalReportValidator();
    
    // Get extension ID and setup
    extensionId = await ExtensionTestHelper.getExtensionId(context);
    
    // Grant necessary permissions
    await context.grantPermissions(['microphone', 'clipboard-read', 'clipboard-write']);
    
    // Inject mock audio functionality
    await ExtensionTestHelper.injectMockAudio(page, extensionId);
    
    // Open side panel
    sidePanel = await ExtensionTestHelper.openSidePanel(page, extensionId);
    expect(sidePanel).toBeTruthy();
    
    console.log('✅ Validation environment ready');
  });

  test('should validate report structure for all workflow types', async ({ page }) => {
    console.log('📋 Testing report structure validation...');
    
    const structureResults: Record<string, any> = {};
    const testWorkflows = ['quick-letter', 'consultation', 'tavi', 'angiogram-pci'];
    
    for (const workflowType of testWorkflows) {
      console.log(`📋 Validating ${workflowType} report structure...`);
      
      const report = await generateReport(page, sidePanel!, workflowType, 'simple');
      const validation = validator.validateStructure(report, workflowType);
      
      structureResults[workflowType] = {
        score: validation.score,
        passed: validation.passed,
        issueCount: validation.issues.length,
        issues: validation.issues.map(i => i.message)
      };
      
      // Assertions
      expect(validation.score).toBeGreaterThanOrEqual(60); // Minimum acceptable score
      expect(validation.issues.filter(i => i.type === 'error')).toHaveLength(0); // No errors
      
      console.log(`${workflowType} structure score: ${validation.score}/100`);
      
      if (validation.issues.length > 0) {
        console.log(`Issues found:`, validation.issues.map(i => i.message));
      }
      
      await clearSession(sidePanel!);
      await page.waitForTimeout(1000);
    }
    
    console.log('📊 Structure validation summary:', structureResults);
  });

  test('should validate medical terminology accuracy', async ({ page }) => {
    console.log('🩺 Testing medical terminology validation...');
    
    const terminologyResults: Record<string, any> = {};
    const medicalWorkflows = ['tavi', 'angiogram-pci', 'mteer', 'consultation'];
    
    for (const workflowType of medicalWorkflows) {
      console.log(`🩺 Validating ${workflowType} medical terminology...`);
      
      const report = await generateReport(page, sidePanel!, workflowType, 'complex');
      const validation = validator.validateTerminology(report);
      
      terminologyResults[workflowType] = {
        score: validation.score,
        passed: validation.passed,
        errorCount: validation.issues.filter(i => i.type === 'error').length,
        warningCount: validation.issues.filter(i => i.type === 'warning').length,
        criticalIssues: validation.issues.filter(i => i.severity === 'high').map(i => i.message)
      };
      
      // Assertions
      expect(validation.score).toBeGreaterThanOrEqual(70); // Higher standard for terminology
      expect(validation.issues.filter(i => i.type === 'error')).toHaveLength(0); // No terminology errors
      
      console.log(`${workflowType} terminology score: ${validation.score}/100`);
      
      // Log specific terminology issues
      const terminologyIssues = validation.issues.filter(i => i.category === 'terminology');
      if (terminologyIssues.length > 0) {
        console.log(`Terminology issues:`, terminologyIssues.map(i => i.message));
      }
      
      await clearSession(sidePanel!);
      await page.waitForTimeout(1000);
    }
    
    console.log('📊 Terminology validation summary:', terminologyResults);
  });

  test('should validate Australian spelling compliance', async ({ page }) => {
    console.log('🇦🇺 Testing Australian spelling compliance...');
    
    const spellingResults: Record<string, any> = {};
    const testWorkflows = ['consultation', 'quick-letter', 'tavi'];
    
    for (const workflowType of testWorkflows) {
      console.log(`🇦🇺 Validating ${workflowType} Australian spelling...`);
      
      const report = await generateReport(page, sidePanel!, workflowType, 'simple');
      const validation = validator.validateAustralianSpelling(report);
      
      spellingResults[workflowType] = {
        score: validation.score,
        passed: validation.passed,
        spellingIssues: validation.issues.map(i => i.message),
        americanVariants: validation.issues.filter(i => i.message.includes('American')).length
      };
      
      // Assertions
      expect(validation.score).toBeGreaterThanOrEqual(80); // High standard for spelling
      
      console.log(`${workflowType} spelling score: ${validation.score}/100`);
      
      if (validation.issues.length > 0) {
        console.log(`Spelling issues:`, validation.issues.map(i => i.message));
      }
      
      await clearSession(sidePanel!);
      await page.waitForTimeout(1000);
    }
    
    console.log('📊 Spelling validation summary:', spellingResults);
  });

  test('should validate measurement formatting', async ({ page }) => {
    console.log('📏 Testing measurement validation...');
    
    const measurementResults: Record<string, any> = {};
    const procedureWorkflows = ['tavi', 'angiogram-pci', 'right-heart-cath'];
    
    for (const workflowType of procedureWorkflows) {
      console.log(`📏 Validating ${workflowType} measurements...`);
      
      const report = await generateReport(page, sidePanel!, workflowType, 'complex');
      const validation = validator.validateMeasurements(report);
      
      measurementResults[workflowType] = {
        score: validation.score,
        passed: validation.passed,
        measurementIssues: validation.issues.filter(i => i.category === 'measurement').map(i => i.message),
        hasMetricUnits: !validation.issues.some(i => i.message.includes('imperial'))
      };
      
      // Assertions
      expect(validation.score).toBeGreaterThanOrEqual(75);
      expect(validation.issues.filter(i => i.message.includes('imperial'))).toHaveLength(0); // No imperial units
      
      console.log(`${workflowType} measurement score: ${validation.score}/100`);
      
      await clearSession(sidePanel!);
      await page.waitForTimeout(1000);
    }
    
    console.log('📊 Measurement validation summary:', measurementResults);
  });

  test('should validate clinical content appropriateness', async ({ page }) => {
    console.log('🏥 Testing clinical content validation...');
    
    const clinicalResults: Record<string, any> = {};
    const clinicalWorkflows = ['consultation', 'tavi', 'angiogram-pci', 'ai-medical-review'];
    
    for (const workflowType of clinicalWorkflows) {
      console.log(`🏥 Validating ${workflowType} clinical content...`);
      
      const report = await generateReport(page, sidePanel!, workflowType, 'complex');
      const validation = validator.validateClinicalContent(report, workflowType);
      
      clinicalResults[workflowType] = {
        score: validation.score,
        passed: validation.passed,
        clinicalIssues: validation.issues.filter(i => i.category === 'clinical').map(i => i.message),
        hasClinicalReasoning: !validation.issues.some(i => i.message.includes('reasoning'))
      };
      
      // Assertions
      expect(validation.score).toBeGreaterThanOrEqual(70);
      
      console.log(`${workflowType} clinical score: ${validation.score}/100`);
      
      // Special checks for consultation reports
      if (workflowType === 'consultation') {
        const hasReasoning = !validation.issues.some(i => i.message.includes('clinical reasoning'));
        expect(hasReasoning).toBe(true);
      }
      
      await clearSession(sidePanel!);
      await page.waitForTimeout(1000);
    }
    
    console.log('📊 Clinical validation summary:', clinicalResults);
  });

  test('should perform comprehensive report validation', async ({ page }) => {
    console.log('🔍 Testing comprehensive report validation...');
    
    const comprehensiveResults: Record<string, ValidationResult> = {};
    const testWorkflows = ['tavi', 'consultation', 'quick-letter'];
    
    for (const workflowType of testWorkflows) {
      console.log(`🔍 Comprehensive validation of ${workflowType}...`);
      
      const report = await generateReport(page, sidePanel!, workflowType, 'complex');
      const validation = validator.validateReport(report, workflowType);
      
      comprehensiveResults[workflowType] = validation;
      
      // Comprehensive assertions
      expect(validation.score).toBeGreaterThanOrEqual(75); // Overall quality threshold
      expect(validation.passed).toBe(true); // Must pass validation
      expect(validation.issues.filter(i => i.type === 'error')).toHaveLength(0); // No errors allowed
      
      console.log(`${workflowType} comprehensive score: ${validation.score}/100`);
      console.log(`Passed: ${validation.passed}`);
      console.log(`Issues: ${validation.issues.length}`);
      console.log(`Suggestions: ${validation.suggestions.length}`);
      
      // Log detailed results
      if (validation.issues.length > 0) {
        console.log('Issues by category:');
        ['error', 'warning', 'info'].forEach(type => {
          const issuesOfType = validation.issues.filter(i => i.type === type);
          if (issuesOfType.length > 0) {
            console.log(`  ${type.toUpperCase()}: ${issuesOfType.length}`);
            issuesOfType.forEach(issue => {
              console.log(`    - ${issue.message}`);
            });
          }
        });
      }
      
      if (validation.suggestions.length > 0) {
        console.log('Suggestions:');
        validation.suggestions.forEach(suggestion => {
          console.log(`  - ${suggestion}`);
        });
      }
      
      await clearSession(sidePanel!);
      await page.waitForTimeout(1000);
    }
    
    console.log('📊 Comprehensive validation summary:', 
      Object.fromEntries(
        Object.entries(comprehensiveResults).map(([k, v]) => [
          k, 
          { score: v.score, passed: v.passed, issues: v.issues.length }
        ])
      )
    );
  });

  test('should validate reports with complications', async ({ page }) => {
    console.log('⚠️ Testing validation of reports with complications...');
    
    const complicationResults: Record<string, any> = {};
    const complicationWorkflows = ['tavi', 'angiogram-pci', 'mteer'];
    
    for (const workflowType of complicationWorkflows) {
      console.log(`⚠️ Validating ${workflowType} with complications...`);
      
      const report = await generateReport(page, sidePanel!, workflowType, 'withComplications');
      const validation = validator.validateReport(report, workflowType);
      
      complicationResults[workflowType] = {
        score: validation.score,
        passed: validation.passed,
        hasComplications: report.toLowerCase().includes('complication') || 
                         report.toLowerCase().includes('difficult') ||
                         report.toLowerCase().includes('challenging'),
        errorCount: validation.issues.filter(i => i.type === 'error').length
      };
      
      // Assertions - complications may result in lower scores but should still be valid
      expect(validation.score).toBeGreaterThanOrEqual(65); // Slightly lower threshold for complications
      expect(validation.issues.filter(i => i.type === 'error')).toHaveLength(0);
      
      console.log(`${workflowType} complications score: ${validation.score}/100`);
      
      await clearSession(sidePanel!);
      await page.waitForTimeout(1000);
    }
    
    console.log('📊 Complications validation summary:', complicationResults);
  });

  test('should validate specific workflow terminology', async ({ page }) => {
    console.log('🏷️ Testing workflow-specific terminology validation...');
    
    const workflowTerminologyTests = [
      {
        workflow: 'tavi',
        requiredTerms: ['valve', 'aortic', 'gradient', 'hemodynamic'],
        expectedSections: ['procedure', 'results']
      },
      {
        workflow: 'angiogram-pci',
        requiredTerms: ['coronary', 'stenosis', 'stent', 'TIMI'],
        expectedSections: ['angiographic', 'intervention']
      },
      {
        workflow: 'mteer',
        requiredTerms: ['mitral', 'regurgitation', 'clip', 'leaflet'],
        expectedSections: ['procedure', 'results']
      }
    ];
    
    for (const test of workflowTerminologyTests) {
      console.log(`🏷️ Testing ${test.workflow} specific terminology...`);
      
      const report = await generateReport(page, sidePanel!, test.workflow, 'complex');
      
      // Check for required terms
      const missingTerms = test.requiredTerms.filter(term => 
        !report.toLowerCase().includes(term.toLowerCase())
      );
      
      expect(missingTerms).toHaveLength(0);
      console.log(`✅ ${test.workflow}: All required terms present`);
      
      // Check for workflow-appropriate length
      const wordCount = report.split(/\s+/).length;
      expect(wordCount).toBeGreaterThan(100); // Minimum meaningful content
      
      // Check for professional medical language
      const professionalTerms = ['patient', 'procedure', 'clinical', 'assessment'];
      const hasProfessionalLanguage = professionalTerms.some(term =>
        report.toLowerCase().includes(term)
      );
      expect(hasProfessionalLanguage).toBe(true);
      
      await clearSession(sidePanel!);
      await page.waitForTimeout(1000);
    }
  });

  // Helper functions
  async function generateReport(page: Page, sidePanel: Frame, workflowType: string, complexity: 'simple' | 'complex' | 'withComplications'): Promise<string> {
    const dictation = getDictation(workflowType, complexity);
    
    // Find and click workflow button
    const workflowButton = await findWorkflowButton(sidePanel, workflowType);
    await workflowButton.click();
    await page.waitForTimeout(1000);
    
    // Simulate dictation
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
    
    // Stop recording
    await workflowButton.click();
    await page.waitForTimeout(5000); // Wait for processing
    
    // Get report
    const report = await waitForReport(sidePanel, 20000);
    return report;
  }

  async function findWorkflowButton(sidePanel: Frame, workflowType: string): Promise<any> {
    const workflowNameMap: Record<string, string[]> = {
      'quick-letter': ['Quick Letter', 'quick letter', 'letter'],
      'angiogram-pci': ['Angiogram', 'PCI', 'Angiogram/PCI'],
      'investigation-summary': ['Investigation', 'Summary', 'Investigations'],
      'ai-medical-review': ['AI Review', 'Medical Review'],
      'tavi': ['TAVI', 'Tavi', 'TAVI Report'],
      'mteer': ['mTEER', 'MTEER'],
      'pfo-closure': ['PFO', 'PFO Closure'],
      'right-heart-cath': ['Right Heart', 'RHC']
    };
    
    const searchTerms = workflowNameMap[workflowType] || [workflowType];
    
    for (const term of searchTerms) {
      const button = sidePanel.locator(`button:has-text("${term}")`);
      if (await button.count() > 0 && await button.first().isVisible()) {
        return button.first();
      }
    }
    
    throw new Error(`Workflow button not found for: ${workflowType}`);
  }

  async function waitForReport(sidePanel: Frame, timeout: number = 15000): Promise<string> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const reportSelectors = [
        'textarea:not([placeholder*="dictation"])',
        '.medical-report',
        '.report-content',
        '.results-panel textarea'
      ];
      
      for (const selector of reportSelectors) {
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
      
      await page.waitForTimeout(1000);
    }
    
    throw new Error(`Report not generated within ${timeout}ms`);
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
        await page.waitForTimeout(500);
        return;
      }
    }
  }
});