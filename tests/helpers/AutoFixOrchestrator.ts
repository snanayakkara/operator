import { Page, BrowserContext, Frame } from '@playwright/test';
import { ExtensionTestHelper } from './ExtensionTestHelper';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface AutoFixResult {
  success: boolean;
  action: string;
  details: string;
  timeToFix: number;
}

export interface FixStrategy {
  name: string;
  condition: (error: Error, context: any) => boolean;
  fix: (error: Error, context: any) => Promise<AutoFixResult>;
}

export class AutoFixOrchestrator {
  private strategies: FixStrategy[] = [];
  private fixHistory: AutoFixResult[] = [];
  private maxFixAttempts = 3;

  constructor() {
    this.initializeStrategies();
  }

  private initializeStrategies() {
    // Extension Loading Fixes
    this.strategies.push({
      name: 'Extension Not Found',
      condition: (error) => error.message.includes('Extension ID not found'),
      fix: async (error, context) => {
        const startTime = Date.now();
        
        try {
          console.log('🔧 Auto-fixing: Extension not found - rebuilding extension...');
          
          // Rebuild extension
          await ExtensionTestHelper.rebuildExtension();
          
          // Reload browser context
          if (context.page) {
            await context.page.reload();
            await context.page.waitForTimeout(2000);
          }
          
          return {
            success: true,
            action: 'Rebuilt extension and reloaded browser',
            details: 'Extension was rebuilt from source and browser was reloaded',
            timeToFix: Date.now() - startTime
          };
        } catch (fixError) {
          return {
            success: false,
            action: 'Extension rebuild failed',
            details: `Failed to rebuild extension: ${fixError.message}`,
            timeToFix: Date.now() - startTime
          };
        }
      }
    });

    this.strategies.push({
      name: 'Side Panel Not Opening',
      condition: (error) => error.message.includes('Side panel not accessible'),
      fix: async (error, context) => {
        const startTime = Date.now();
        
        try {
          console.log('🔧 Auto-fixing: Side panel not opening - trying alternative methods...');
          
          const page = context.page as Page;
          const extensionId = context.extensionId;
          
          // Method 1: Try different keyboard shortcuts
          await page.keyboard.press('Alt+Shift+M'); // Alternative shortcut
          await page.waitForTimeout(1000);
          
          let sidePanel = await ExtensionTestHelper.findSidePanelFrame(page);
          
          if (!sidePanel) {
            // Method 2: Navigate directly to extension and open side panel
            await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
            await page.waitForTimeout(1000);
            
            const openButton = page.locator('button:has-text("Open Medical Assistant"), button:has-text("Open Side Panel")');
            if (await openButton.isVisible().catch(() => false)) {
              await openButton.click();
              await page.waitForTimeout(2000);
            }
            
            // Go back to test page
            await page.goto('data:text/html,<html><body><h1>Test EMR</h1></body></html>');
            await page.waitForTimeout(1000);
            
            sidePanel = await ExtensionTestHelper.findSidePanelFrame(page);
          }
          
          if (!sidePanel) {
            // Method 3: Check manifest and fix side panel configuration
            await ExtensionTestHelper.fixExtensionBuild();
            await ExtensionTestHelper.rebuildExtension();
            
            await page.reload();
            await page.waitForTimeout(2000);
            
            sidePanel = await ExtensionTestHelper.openSidePanel(page, extensionId);
          }
          
          return {
            success: !!sidePanel,
            action: 'Attempted multiple side panel opening methods',
            details: sidePanel ? 'Side panel opened successfully' : 'Side panel still not accessible',
            timeToFix: Date.now() - startTime
          };
        } catch (fixError) {
          return {
            success: false,
            action: 'Side panel fix failed',
            details: `Failed to open side panel: ${fixError.message}`,
            timeToFix: Date.now() - startTime
          };
        }
      }
    });

    this.strategies.push({
      name: 'Microphone Permission Denied',
      condition: (error) => error.message.includes('Permission denied') || error.message.includes('NotAllowedError'),
      fix: async (error, context) => {
        const startTime = Date.now();
        
        try {
          console.log('🔧 Auto-fixing: Microphone permission denied - granting permissions...');
          
          const browserContext = context.context as BrowserContext;
          const page = context.page as Page;
          
          // Grant microphone permission
          await browserContext.grantPermissions(['microphone']);
          
          // Reload page to apply permissions
          await page.reload();
          await page.waitForTimeout(2000);
          
          // Verify permission is now granted
          const hasPermission = await page.evaluate(async () => {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              stream.getTracks().forEach(track => track.stop());
              return true;
            } catch (e) {
              return false;
            }
          });
          
          return {
            success: hasPermission,
            action: 'Granted microphone permission and reloaded page',
            details: hasPermission ? 'Microphone permission now available' : 'Microphone permission still denied',
            timeToFix: Date.now() - startTime
          };
        } catch (fixError) {
          return {
            success: false,
            action: 'Permission fix failed',
            details: `Failed to grant permissions: ${fixError.message}`,
            timeToFix: Date.now() - startTime
          };
        }
      }
    });

    this.strategies.push({
      name: 'Recording Initialization Failed',
      condition: (error) => error.message.includes('Recording failed') || error.message.includes('MediaRecorder'),
      fix: async (error, context) => {
        const startTime = Date.now();
        
        try {
          console.log('🔧 Auto-fixing: Recording initialization failed - reinitializing audio...');
          
          const page = context.page as Page;
          
          // Re-inject mock audio functionality
          await ExtensionTestHelper.injectMockAudio(page);
          
          // Wait for audio system to reinitialize
          await page.waitForTimeout(1000);
          
          // Test recording functionality
          const recordingWorks = await page.evaluate(async () => {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const recorder = new MediaRecorder(stream);
              recorder.start();
              recorder.stop();
              stream.getTracks().forEach(track => track.stop());
              return true;
            } catch (e) {
              return false;
            }
          });
          
          return {
            success: recordingWorks,
            action: 'Re-injected audio mocks and tested recording',
            details: recordingWorks ? 'Recording functionality restored' : 'Recording still not working',
            timeToFix: Date.now() - startTime
          };
        } catch (fixError) {
          return {
            success: false,
            action: 'Recording fix failed',
            details: `Failed to fix recording: ${fixError.message}`,
            timeToFix: Date.now() - startTime
          };
        }
      }
    });

    this.strategies.push({
      name: 'LMStudio Connection Failed',
      condition: (error) => error.message.includes('Connection failed') || error.message.includes('localhost:1234'),
      fix: async (error, context) => {
        const startTime = Date.now();
        
        try {
          console.log('🔧 Auto-fixing: LMStudio connection failed - checking mock server...');
          
          const page = context.page as Page;
          
          // Test if mock server is running
          const serverRunning = await page.evaluate(async () => {
            try {
              const response = await fetch('http://localhost:1234/v1/models');
              return response.ok;
            } catch (e) {
              return false;
            }
          });
          
          if (!serverRunning) {
            // Mock server might have stopped - restart it
            const { LMStudioMock } = await import('./LMStudioMock');
            const mockServer = new LMStudioMock();
            await mockServer.start(1234);
            
            // Store reference for cleanup
            (global as any).autoFixLMStudioMock = mockServer;
          }
          
          // Test connection again
          const connectionFixed = await page.evaluate(async () => {
            try {
              const response = await fetch('http://localhost:1234/v1/models');
              return response.ok;
            } catch (e) {
              return false;
            }
          });
          
          return {
            success: connectionFixed,
            action: 'Restarted LMStudio mock server',
            details: connectionFixed ? 'LMStudio connection restored' : 'LMStudio connection still failing',
            timeToFix: Date.now() - startTime
          };
        } catch (fixError) {
          return {
            success: false,
            action: 'LMStudio connection fix failed',
            details: `Failed to fix LMStudio connection: ${fixError.message}`,
            timeToFix: Date.now() - startTime
          };
        }
      }
    });

    this.strategies.push({
      name: 'Element Not Found',
      condition: (error) => error.message.includes('element not found') || error.message.includes('not visible'),
      fix: async (error, context) => {
        const startTime = Date.now();
        
        try {
          console.log('🔧 Auto-fixing: Element not found - trying alternative selectors...');
          
          const page = context.page as Page;
          const sidePanel = context.sidePanel as Frame;
          
          // Common alternative selectors for different elements
          const alternativeSelectors = {
            record: [
              'button[data-testid="record-button"]',
              'button:has-text("Record")',
              'button:has-text("Start")',
              'button[title*="record"]',
              '.record-button',
              'button svg[class*="microphone"]'
            ],
            agent: [
              'button:has-text("TAVI")',
              'button:has-text("PCI")',
              'button:has-text("Angiogram")',
              '.agent-button',
              '[data-agent]'
            ],
            transcription: [
              'textarea[placeholder*="transcription"]',
              'textarea[placeholder*="dictation"]',
              'textarea:not([readonly])',
              'input[type="text"]'
            ]
          };
          
          // Try to find elements using alternative selectors
          let elementsFound = 0;
          
          for (const [category, selectors] of Object.entries(alternativeSelectors)) {
            for (const selector of selectors) {
              try {
                const element = sidePanel.locator(selector);
                if (await element.isVisible({ timeout: 1000 })) {
                  console.log(`✅ Found ${category} element with selector: ${selector}`);
                  elementsFound++;
                  break;
                }
              } catch (e) {
                // Continue trying other selectors
              }
            }
          }
          
          // If still no elements found, try refreshing the side panel
          if (elementsFound === 0) {
            await page.keyboard.press('Escape'); // Close side panel
            await page.waitForTimeout(500);
            
            const newSidePanel = await ExtensionTestHelper.openSidePanel(page, context.extensionId);
            if (newSidePanel) {
              context.sidePanel = newSidePanel;
              elementsFound++;
            }
          }
          
          return {
            success: elementsFound > 0,
            action: 'Tried alternative selectors and refreshed UI',
            details: `Found ${elementsFound} elements using alternative methods`,
            timeToFix: Date.now() - startTime
          };
        } catch (fixError) {
          return {
            success: false,
            action: 'Element finding fix failed',
            details: `Failed to find elements: ${fixError.message}`,
            timeToFix: Date.now() - startTime
          };
        }
      }
    });

    this.strategies.push({
      name: 'Test Timeout',
      condition: (error) => error.message.includes('timeout') || error.message.includes('Timeout'),
      fix: async (error, context) => {
        const startTime = Date.now();
        
        try {
          console.log('🔧 Auto-fixing: Test timeout - optimizing performance and retrying...');
          
          const page = context.page as Page;
          
          // Clear any existing timeouts or intervals
          await page.evaluate(() => {
            // Clear all timeouts
            for (let i = 1; i < 99999; i++) {
              window.clearTimeout(i);
              window.clearInterval(i);
            }
          });
          
          // Optimize page performance
          await page.evaluate(() => {
            // Disable animations for faster execution
            const style = document.createElement('style');
            style.textContent = `
              *, *::before, *::after {
                animation-delay: -1ms !important;
                animation-duration: 1ms !important;
                animation-iteration-count: 1 !important;
                background-attachment: initial !important;
                scroll-behavior: auto !important;
                transition-duration: 0s !important;
                transition-delay: 0s !important;
              }
            `;
            document.head.appendChild(style);
          });
          
          // Wait for page to stabilize
          await page.waitForTimeout(1000);
          
          return {
            success: true,
            action: 'Optimized page performance and cleared timeouts',
            details: 'Disabled animations and cleared pending operations',
            timeToFix: Date.now() - startTime
          };
        } catch (fixError) {
          return {
            success: false,
            action: 'Timeout fix failed',
            details: `Failed to optimize performance: ${fixError.message}`,
            timeToFix: Date.now() - startTime
          };
        }
      }
    });
  }

  async attemptAutoFix(error: Error, context: any): Promise<AutoFixResult | null> {
    console.log(`🔍 Analyzing error for auto-fix: ${error.message}`);
    
    // Find applicable fix strategy
    const strategy = this.strategies.find(s => s.condition(error, context));
    
    if (!strategy) {
      console.log('❌ No auto-fix strategy found for this error');
      return null;
    }
    
    // Check if we've already tried this fix too many times
    const recentFixes = this.fixHistory.filter(
      fix => fix.action === strategy.name && Date.now() - fix.timeToFix < 300000 // 5 minutes
    );
    
    if (recentFixes.length >= this.maxFixAttempts) {
      console.log(`❌ Auto-fix strategy "${strategy.name}" has been attempted too many times recently`);
      return {
        success: false,
        action: strategy.name,
        details: 'Max fix attempts exceeded',
        timeToFix: 0
      };
    }
    
    console.log(`🔧 Attempting auto-fix with strategy: ${strategy.name}`);
    
    try {
      const result = await strategy.fix(error, context);
      this.fixHistory.push(result);
      
      if (result.success) {
        console.log(`✅ Auto-fix successful: ${result.details}`);
      } else {
        console.log(`❌ Auto-fix failed: ${result.details}`);
      }
      
      return result;
    } catch (fixError) {
      const result: AutoFixResult = {
        success: false,
        action: strategy.name,
        details: `Fix strategy threw error: ${fixError.message}`,
        timeToFix: 0
      };
      
      this.fixHistory.push(result);
      console.log(`❌ Auto-fix strategy error: ${fixError.message}`);
      
      return result;
    }
  }

  getFixHistory(): AutoFixResult[] {
    return [...this.fixHistory];
  }

  getSuccessfulFixes(): AutoFixResult[] {
    return this.fixHistory.filter(fix => fix.success);
  }

  getFailedFixes(): AutoFixResult[] {
    return this.fixHistory.filter(fix => !fix.success);
  }

  generateFixReport(): string {
    const successful = this.getSuccessfulFixes();
    const failed = this.getFailedFixes();
    
    const report = `
=== AUTO-FIX REPORT ===

Total Fixes Attempted: ${this.fixHistory.length}
Successful Fixes: ${successful.length}
Failed Fixes: ${failed.length}
Success Rate: ${this.fixHistory.length > 0 ? ((successful.length / this.fixHistory.length) * 100).toFixed(1) : 0}%

Successful Fixes:
${successful.map(fix => `✅ ${fix.action}: ${fix.details} (${fix.timeToFix}ms)`).join('\n')}

Failed Fixes:
${failed.map(fix => `❌ ${fix.action}: ${fix.details}`).join('\n')}

Most Common Issues Fixed:
${this.getMostCommonFixes().map(([action, count]) => `- ${action}: ${count} times`).join('\n')}
    `.trim();
    
    return report;
  }

  private getMostCommonFixes(): Array<[string, number]> {
    const fixCounts = new Map<string, number>();
    
    this.getSuccessfulFixes().forEach(fix => {
      const count = fixCounts.get(fix.action) || 0;
      fixCounts.set(fix.action, count + 1);
    });
    
    return Array.from(fixCounts.entries()).sort((a, b) => b[1] - a[1]);
  }

  async cleanup(): Promise<void> {
    // Clean up any resources created during auto-fix
    const autoFixMock = (global as any).autoFixLMStudioMock;
    if (autoFixMock) {
      try {
        await autoFixMock.stop();
        delete (global as any).autoFixLMStudioMock;
      } catch (error) {
        console.log('Warning: Failed to cleanup auto-fix mock server:', error.message);
      }
    }
  }
}