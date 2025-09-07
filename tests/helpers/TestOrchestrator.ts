import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AutoFixOrchestrator } from './AutoFixOrchestrator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface TestResult {
  testFile: string;
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  autoFixApplied?: boolean;
}

export interface TestSuiteResult {
  suiteName: string;
  results: TestResult[];
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  autoFixesApplied: number;
}

export interface OverallTestReport {
  suites: TestSuiteResult[];
  summary: {
    totalSuites: number;
    totalTests: number;
    totalPassed: number;
    totalFailed: number;
    totalSkipped: number;
    totalDuration: number;
    successRate: number;
    autoFixSuccessRate: number;
  };
  autoFixReport: string;
}

export class TestOrchestrator {
  private autoFixOrchestrator: AutoFixOrchestrator;
  private testResults: TestSuiteResult[] = [];
  private outputDir: string;

  constructor(outputDir: string = './test-results') {
    this.autoFixOrchestrator = new AutoFixOrchestrator();
    this.outputDir = outputDir;
  }

  async runAllTests(): Promise<OverallTestReport> {
    console.log('🚀 Starting Autonomous E2E Test Suite...');
    console.log('=' .repeat(60));

    // Ensure output directory exists
    await fs.mkdir(this.outputDir, { recursive: true });

    const testSuites = [
      { name: 'Extension Loading', file: '01-extension-loading.spec.ts' },
      { name: 'Voice Recording', file: '02-voice-recording.spec.ts' },
      { name: 'Medical Agents', file: '03-medical-agents.spec.ts' },
      { name: 'LMStudio Integration', file: '04-lmstudio-integration.spec.ts' },
      { name: 'Full Workflow', file: '05-full-workflow.spec.ts' },
      { name: 'Performance', file: '06-performance.spec.ts' }
    ];

    const startTime = Date.now();

    for (const suite of testSuites) {
      console.log(`\n📋 Running ${suite.name} Tests...`);
      const suiteResult = await this.runTestSuite(suite.file, suite.name);
      this.testResults.push(suiteResult);
      
      console.log(`✅ ${suite.name}: ${suiteResult.passed}/${suiteResult.totalTests} passed (${suiteResult.duration}ms)`);
      if (suiteResult.autoFixesApplied > 0) {
        console.log(`🔧 Auto-fixes applied: ${suiteResult.autoFixesApplied}`);
      }
    }

    const totalDuration = Date.now() - startTime;

    // Generate comprehensive report
    const report = this.generateOverallReport(totalDuration);
    
    // Save reports to files
    await this.saveReports(report);
    
    // Display summary
    this.displaySummary(report);

    // Cleanup
    await this.autoFixOrchestrator.cleanup();

    return report;
  }

  private async runTestSuite(testFile: string, suiteName: string): Promise<TestSuiteResult> {
    const testPath = path.join(__dirname, '../e2e', testFile);
    const startTime = Date.now();
    
    const suiteResult: TestSuiteResult = {
      suiteName,
      results: [],
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      autoFixesApplied: 0
    };

    try {
      // Run playwright test with JSON reporter
      const result = await this.executePlaywrightTest(testPath);
      
      // Parse results
      suiteResult.results = result.tests;
      suiteResult.totalTests = result.tests.length;
      suiteResult.passed = result.tests.filter(t => t.status === 'passed').length;
      suiteResult.failed = result.tests.filter(t => t.status === 'failed').length;
      suiteResult.skipped = result.tests.filter(t => t.status === 'skipped').length;
      suiteResult.autoFixesApplied = result.tests.filter(t => t.autoFixApplied).length;
      
    } catch (error) {
      console.log(`❌ Test suite ${suiteName} failed to execute: ${error.message}`);
      suiteResult.results.push({
        testFile,
        testName: 'Suite Execution',
        status: 'failed',
        duration: 0,
        error: error.message
      });
      suiteResult.totalTests = 1;
      suiteResult.failed = 1;
    }

    suiteResult.duration = Date.now() - startTime;
    return suiteResult;
  }

  private async executePlaywrightTest(testPath: string): Promise<{ tests: TestResult[] }> {
    return new Promise((resolve, reject) => {
      const results: TestResult[] = [];
      let output = '';

      const playwrightProcess = spawn('npx', ['playwright', 'test', testPath, '--reporter=json'], {
        cwd: path.join(__dirname, '../..'),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      playwrightProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      playwrightProcess.stderr.on('data', (data) => {
        console.log(`Test stderr: ${data}`);
      });

      playwrightProcess.on('close', (code) => {
        try {
          // Parse JSON output from Playwright
          const lines = output.split('\n');
          let jsonLine = '';
          
          for (const line of lines) {
            if (line.trim().startsWith('{') && line.includes('"suites"')) {
              jsonLine = line.trim();
              break;
            }
          }

          if (jsonLine) {
            const playwrightResults = JSON.parse(jsonLine);
            
            // Convert Playwright results to our format
            if (playwrightResults.suites) {
              for (const suite of playwrightResults.suites) {
                for (const spec of suite.specs || []) {
                  for (const test of spec.tests || []) {
                    results.push({
                      testFile: path.basename(testPath),
                      testName: test.title,
                      status: test.outcome === 'expected' ? 'passed' : 
                              test.outcome === 'skipped' ? 'skipped' : 'failed',
                      duration: test.results?.[0]?.duration || 0,
                      error: test.results?.[0]?.error?.message,
                      autoFixApplied: false // Will be updated by auto-fix logic
                    });
                  }
                }
              }
            }
          }

          resolve({ tests: results });
        } catch (parseError) {
          // Fallback: create a basic result based on exit code
          results.push({
            testFile: path.basename(testPath),
            testName: 'Test Execution',
            status: code === 0 ? 'passed' : 'failed',
            duration: 0,
            error: code !== 0 ? `Process exited with code ${code}` : undefined
          });
          
          resolve({ tests: results });
        }
      });

      playwrightProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  private generateOverallReport(totalDuration: number): OverallTestReport {
    const totalTests = this.testResults.reduce((sum, suite) => sum + suite.totalTests, 0);
    const totalPassed = this.testResults.reduce((sum, suite) => sum + suite.passed, 0);
    const totalFailed = this.testResults.reduce((sum, suite) => sum + suite.failed, 0);
    const totalSkipped = this.testResults.reduce((sum, suite) => sum + suite.skipped, 0);
    const totalAutoFixes = this.testResults.reduce((sum, suite) => sum + suite.autoFixesApplied, 0);

    return {
      suites: this.testResults,
      summary: {
        totalSuites: this.testResults.length,
        totalTests,
        totalPassed,
        totalFailed,
        totalSkipped,
        totalDuration,
        successRate: totalTests > 0 ? (totalPassed / totalTests) * 100 : 0,
        autoFixSuccessRate: totalAutoFixes > 0 ? (totalAutoFixes / totalFailed) * 100 : 0
      },
      autoFixReport: this.autoFixOrchestrator.generateFixReport()
    };
  }

  private async saveReports(report: OverallTestReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Save detailed JSON report
    const jsonReport = path.join(this.outputDir, `test-report-${timestamp}.json`);
    await fs.writeFile(jsonReport, JSON.stringify(report, null, 2));
    
    // Save human-readable HTML report
    const htmlReport = path.join(this.outputDir, `test-report-${timestamp}.html`);
    await fs.writeFile(htmlReport, this.generateHTMLReport(report));
    
    // Save CSV summary for data analysis
    const csvReport = path.join(this.outputDir, `test-summary-${timestamp}.csv`);
    await fs.writeFile(csvReport, this.generateCSVReport(report));
    
    console.log(`📊 Reports saved to ${this.outputDir}/`);
  }

  private generateHTMLReport(report: OverallTestReport): string {
    const timestamp = new Date().toISOString();
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Operator Chrome Extension E2E Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #2196F3; color: white; padding: 20px; border-radius: 5px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; }
        .metric.success { background: #e8f5e8; }
        .metric.warning { background: #fff3cd; }
        .metric.error { background: #f8d7da; }
        .suite { border: 1px solid #ddd; margin: 10px 0; border-radius: 5px; }
        .suite-header { background: #f8f9fa; padding: 10px; border-bottom: 1px solid #ddd; }
        .test-result { padding: 10px; border-bottom: 1px solid #eee; }
        .test-result:last-child { border-bottom: none; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #6c757d; }
        .auto-fix { background: #fff3cd; padding: 20px; margin: 20px 0; border-radius: 5px; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏥 Operator Chrome Extension E2E Test Report</h1>
        <p>Generated: ${timestamp}</p>
    </div>

    <div class="summary">
        <div class="metric ${report.summary.successRate >= 90 ? 'success' : report.summary.successRate >= 70 ? 'warning' : 'error'}">
            <h3>Success Rate</h3>
            <div style="font-size: 2em; font-weight: bold;">${report.summary.successRate.toFixed(1)}%</div>
            <div>${report.summary.totalPassed}/${report.summary.totalTests} tests passed</div>
        </div>
        
        <div class="metric">
            <h3>Test Suites</h3>
            <div style="font-size: 2em; font-weight: bold;">${report.summary.totalSuites}</div>
            <div>Complete test suites</div>
        </div>
        
        <div class="metric">
            <h3>Duration</h3>
            <div style="font-size: 2em; font-weight: bold;">${(report.summary.totalDuration / 1000).toFixed(1)}s</div>
            <div>Total execution time</div>
        </div>
        
        <div class="metric ${report.summary.autoFixSuccessRate > 0 ? 'success' : ''}">
            <h3>Auto-Fixes</h3>
            <div style="font-size: 2em; font-weight: bold;">${report.summary.autoFixSuccessRate.toFixed(1)}%</div>
            <div>Auto-fix success rate</div>
        </div>
    </div>

    <h2>📋 Test Suite Results</h2>
    ${report.suites.map(suite => `
    <div class="suite">
        <div class="suite-header">
            <h3>${suite.suiteName}</h3>
            <div>
                <span class="passed">✅ ${suite.passed} passed</span> | 
                <span class="failed">❌ ${suite.failed} failed</span> | 
                <span class="skipped">⏭️ ${suite.skipped} skipped</span> | 
                Duration: ${(suite.duration / 1000).toFixed(1)}s
                ${suite.autoFixesApplied > 0 ? `| 🔧 ${suite.autoFixesApplied} auto-fixes` : ''}
            </div>
        </div>
        ${suite.results.map(test => `
        <div class="test-result">
            <div class="${test.status}">
                ${test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⏭️'} 
                ${test.testName} (${test.duration}ms)
                ${test.autoFixApplied ? ' 🔧' : ''}
            </div>
            ${test.error ? `<div style="color: #dc3545; font-size: 0.9em; margin-top: 5px;">${test.error}</div>` : ''}
        </div>
        `).join('')}
    </div>
    `).join('')}

    ${report.autoFixReport ? `
    <div class="auto-fix">
        <h2>🔧 Auto-Fix Report</h2>
        <pre>${report.autoFixReport}</pre>
    </div>
    ` : ''}
</body>
</html>
    `.trim();
  }

  private generateCSVReport(report: OverallTestReport): string {
    const headers = ['Suite,Test,Status,Duration,AutoFix,Error'];
    const rows = report.suites.flatMap(suite => 
      suite.results.map(test => 
        `"${suite.suiteName}","${test.testName}","${test.status}",${test.duration},${test.autoFixApplied || false},"${test.error || ''}"`
      )
    );
    
    return [headers, ...rows].join('\n');
  }

  private displaySummary(report: OverallTestReport): void {
    console.log('\n' + '=' .repeat(60));
    console.log('🏁 TEST EXECUTION COMPLETE');
    console.log('=' .repeat(60));
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total Suites: ${report.summary.totalSuites}`);
    console.log(`   Total Tests: ${report.summary.totalTests}`);
    console.log(`   Passed: ${report.summary.totalPassed} (${report.summary.successRate.toFixed(1)}%)`);
    console.log(`   Failed: ${report.summary.totalFailed}`);
    console.log(`   Skipped: ${report.summary.totalSkipped}`);
    console.log(`   Duration: ${(report.summary.totalDuration / 1000).toFixed(1)}s`);
    
    if (report.summary.autoFixSuccessRate > 0) {
      console.log(`   Auto-fix Success: ${report.summary.autoFixSuccessRate.toFixed(1)}%`);
    }
    
    console.log(`\n📋 SUITE BREAKDOWN:`);
    report.suites.forEach(suite => {
      const successRate = suite.totalTests > 0 ? (suite.passed / suite.totalTests) * 100 : 0;
      const status = successRate >= 90 ? '✅' : successRate >= 70 ? '⚠️' : '❌';
      console.log(`   ${status} ${suite.suiteName}: ${suite.passed}/${suite.totalTests} (${successRate.toFixed(1)}%)`);
    });
    
    if (report.summary.totalFailed > 0) {
      console.log(`\n❌ FAILED TESTS:`);
      report.suites.forEach(suite => {
        const failedTests = suite.results.filter(t => t.status === 'failed');
        if (failedTests.length > 0) {
          console.log(`   ${suite.suiteName}:`);
          failedTests.forEach(test => {
            console.log(`     • ${test.testName}`);
            if (test.error) {
              console.log(`       Error: ${test.error.substring(0, 100)}...`);
            }
          });
        }
      });
    }
    
    const overallStatus = report.summary.successRate >= 90 ? 'EXCELLENT' : 
                         report.summary.successRate >= 70 ? 'GOOD' : 'NEEDS IMPROVEMENT';
    console.log(`\n🎯 OVERALL STATUS: ${overallStatus}`);
  }
}

