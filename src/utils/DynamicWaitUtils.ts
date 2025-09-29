/**
 * Dynamic Wait Utilities
 * 
 * Intelligent waiting system that replaces fixed delays with smart DOM monitoring
 * and content validation. Provides robust waiting mechanisms with early returns
 * when conditions are met.
 */

import type { 
  WaitCondition, 
  WaitResult, 
  WaitCheckResult,
  BatchProcessingMessage,
  BatchMessageType as _BatchMessageType
} from '@/types/BatchProcessingTypes';

export class DynamicWaitUtils {
  private static instance: DynamicWaitUtils;
  private defaultTimeout = 15000; // 15 seconds
  private defaultInterval = 500;   // 500ms checks
  private debugMode = false;

  private constructor() {}

  public static getInstance(): DynamicWaitUtils {
    if (!DynamicWaitUtils.instance) {
      DynamicWaitUtils.instance = new DynamicWaitUtils();
    }
    return DynamicWaitUtils.instance;
  }

  /**
   * Enable or disable debug logging
   */
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Wait for patient data to load with intelligent verification
   */
  public async waitForPatientDataLoad(
    tabId: number,
    patientName?: string,
    timeout = this.defaultTimeout
  ): Promise<WaitResult> {
    const conditions: WaitCondition[] = [
      {
        name: 'content_script_responsive',
        checker: () => this.checkContentScriptResponsive(tabId),
        description: 'Content script is responsive',
        timeout: 5000,
        interval: 200
      },
      {
        name: 'xestro_boxes_present',
        checker: () => this.checkXestroBoxesPresent(tabId),
        description: 'XestroBox elements are present',
        timeout: timeout,
        interval: this.defaultInterval
      },
      {
        name: 'patient_data_populated',
        checker: () => this.checkPatientDataPopulated(tabId, patientName),
        description: 'Patient data fields are populated',
        timeout: timeout,
        interval: this.defaultInterval
      },
      {
        name: 'clinical_sections_ready',
        checker: () => this.checkClinicalSectionsReady(tabId),
        description: 'Clinical sections have content',
        timeout: timeout,
        interval: this.defaultInterval
      }
    ];

    return this.waitForMultipleConditions(conditions, {
      requireAll: false, // At least XestroBoxes and patient data must be ready
      minConditions: 2,
      earlyReturnOnCritical: true
    });
  }

  /**
   * Wait for specific clinical section to be ready
   */
  public async waitForClinicalSection(
    tabId: number,
    sectionType: 'background' | 'investigations' | 'medications',
    timeout = this.defaultTimeout
  ): Promise<WaitResult> {
    const conditions: WaitCondition[] = [
      {
        name: `${sectionType}_section_present`,
        checker: () => this.checkSectionPresent(tabId, sectionType),
        description: `${sectionType} section is present in DOM`,
        timeout: timeout / 2,
        interval: this.defaultInterval
      },
      {
        name: `${sectionType}_content_loaded`,
        checker: () => this.checkSectionContentLoaded(tabId, sectionType),
        description: `${sectionType} section has content`,
        timeout: timeout,
        interval: this.defaultInterval
      }
    ];

    return this.waitForMultipleConditions(conditions, {
      requireAll: true,
      minConditions: 2,
      earlyReturnOnCritical: false
    });
  }

  /**
   * Wait for patient activation to complete
   */
  public async waitForPatientActivation(
    tabId: number,
    patientIndex: number,
    timeout = 10000
  ): Promise<WaitResult> {
    const conditions: WaitCondition[] = [
      {
        name: 'patient_row_highlighted',
        checker: () => this.checkPatientRowHighlighted(tabId, patientIndex),
        description: 'Patient row is highlighted/selected',
        timeout: timeout / 3,
        interval: 200
      },
      {
        name: 'patient_record_loading',
        checker: () => this.checkPatientRecordLoading(tabId),
        description: 'Patient record is loading',
        timeout: timeout / 2,
        interval: this.defaultInterval
      },
      {
        name: 'patient_record_loaded',
        checker: () => this.checkPatientRecordLoaded(tabId),
        description: 'Patient record is fully loaded',
        timeout: timeout,
        interval: this.defaultInterval
      }
    ];

    return this.waitForMultipleConditions(conditions, {
      requireAll: false,
      minConditions: 1,
      earlyReturnOnCritical: true,
      sequentialChecking: true // Check conditions in order
    });
  }

  /**
   * Wait for DOM changes to settle
   */
  public async waitForDOMStability(
    tabId: number,
    stabilityPeriodMs = 1000,
    timeout = this.defaultTimeout
  ): Promise<WaitResult> {
    const startTime = Date.now();
    const checkResults: WaitCheckResult[] = [];
    let lastChangeTime = Date.now();
    let lastDOMHash = '';

    while (Date.now() - startTime < timeout) {
      try {
        const currentDOMHash = await this.getDOMHash(tabId);
        const currentTime = Date.now();

        if (currentDOMHash !== lastDOMHash) {
          lastChangeTime = currentTime;
          lastDOMHash = currentDOMHash;
          
          checkResults.push({
            timestamp: currentTime,
            conditionName: 'dom_changed',
            passed: false,
            details: 'DOM structure changed'
          });
        } else if (currentTime - lastChangeTime >= stabilityPeriodMs) {
          checkResults.push({
            timestamp: currentTime,
            conditionName: 'dom_stable',
            passed: true,
            details: `DOM stable for ${stabilityPeriodMs}ms`
          });

          return {
            success: true,
            timeElapsed: currentTime - startTime,
            conditionMet: 'dom_stable',
            intermediateChecks: checkResults
          };
        }

        await this.sleep(200);

      } catch (error) {
        this.log('Error checking DOM stability:', error);
        await this.sleep(this.defaultInterval);
      }
    }

    return {
      success: false,
      timeElapsed: Date.now() - startTime,
      conditionMet: null,
      error: `DOM did not stabilize within ${timeout}ms`,
      intermediateChecks: checkResults
    };
  }

  /**
   * Smart wait with custom condition
   */
  public async waitForCondition(
    condition: WaitCondition,
    options: {
      earlyReturn?: boolean;
      logProgress?: boolean;
    } = {}
  ): Promise<WaitResult> {
    const startTime = Date.now();
    const checkResults: WaitCheckResult[] = [];
    const { earlyReturn: _earlyReturn = true, logProgress = this.debugMode } = options;

    this.log(`Starting wait for condition: ${condition.name} - ${condition.description}`);

    while (Date.now() - startTime < condition.timeout) {
      try {
        const passed = await condition.checker();
        const timestamp = Date.now();

        checkResults.push({
          timestamp,
          conditionName: condition.name,
          passed,
          details: passed ? 'Condition met' : 'Condition not met'
        });

        if (passed) {
          const timeElapsed = timestamp - startTime;
          this.log(`✅ Condition '${condition.name}' met in ${timeElapsed}ms`);
          
          return {
            success: true,
            timeElapsed,
            conditionMet: condition.name,
            intermediateChecks: checkResults
          };
        }

        if (logProgress && checkResults.length % 10 === 0) {
          this.log(`⏳ Still waiting for '${condition.name}' (${Date.now() - startTime}ms elapsed)`);
        }

        await this.sleep(condition.interval);

      } catch (error) {
        checkResults.push({
          timestamp: Date.now(),
          conditionName: condition.name,
          passed: false,
          details: `Error: ${error instanceof Error ? error.message : String(error)}`
        });

        this.log(`❌ Error checking condition '${condition.name}':`, error);
        await this.sleep(condition.interval);
      }
    }

    const timeElapsed = Date.now() - startTime;
    this.log(`⏰ Timeout waiting for condition '${condition.name}' after ${timeElapsed}ms`);

    return {
      success: false,
      timeElapsed,
      conditionMet: null,
      error: `Timeout waiting for condition '${condition.name}'`,
      intermediateChecks: checkResults
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async waitForMultipleConditions(
    conditions: WaitCondition[],
    options: {
      requireAll: boolean;
      minConditions: number;
      earlyReturnOnCritical: boolean;
      sequentialChecking?: boolean;
    }
  ): Promise<WaitResult> {
    const startTime = Date.now();
    const allCheckResults: WaitCheckResult[] = [];
    const conditionsMet = new Set<string>();
    const maxTimeout = Math.max(...conditions.map(c => c.timeout));

    this.log(`Starting multi-condition wait: ${conditions.length} conditions`);

    if (options.sequentialChecking) {
      // Check conditions in sequence (useful for dependent conditions)
      for (const condition of conditions) {
        const result = await this.waitForCondition(condition);
        allCheckResults.push(...result.intermediateChecks);
        
        if (result.success) {
          conditionsMet.add(condition.name);
        } else if (options.requireAll) {
          return {
            success: false,
            timeElapsed: Date.now() - startTime,
            conditionMet: null,
            error: `Sequential condition failed: ${condition.name}`,
            intermediateChecks: allCheckResults
          };
        }
      }
    } else {
      // Check conditions concurrently
      while (Date.now() - startTime < maxTimeout) {
        for (const condition of conditions) {
          if (conditionsMet.has(condition.name)) continue;

          try {
            const passed = await condition.checker();
            const timestamp = Date.now();

            allCheckResults.push({
              timestamp,
              conditionName: condition.name,
              passed,
              details: passed ? 'Condition met' : 'Condition not met'
            });

            if (passed) {
              conditionsMet.add(condition.name);
              this.log(`✅ Condition met: ${condition.name}`);
            }

          } catch (error) {
            allCheckResults.push({
              timestamp: Date.now(),
              conditionName: condition.name,
              passed: false,
              details: `Error: ${error instanceof Error ? error.message : String(error)}`
            });
          }
        }

        // Check if we can return early
        const metCount = conditionsMet.size;
        if (options.requireAll && metCount === conditions.length) {
          break;
        } else if (!options.requireAll && metCount >= options.minConditions) {
          break;
        }

        await this.sleep(Math.min(...conditions.map(c => c.interval)));
      }
    }

    const metCount = conditionsMet.size;
    const success = options.requireAll 
      ? metCount === conditions.length 
      : metCount >= options.minConditions;

    const timeElapsed = Date.now() - startTime;

    if (success) {
      this.log(`✅ Multi-condition wait successful: ${metCount}/${conditions.length} conditions met`);
    } else {
      this.log(`❌ Multi-condition wait failed: ${metCount}/${conditions.length} conditions met`);
    }

    return {
      success,
      timeElapsed,
      conditionMet: success ? Array.from(conditionsMet).join(', ') : null,
      error: success ? undefined : `Insufficient conditions met: ${metCount}/${options.minConditions}`,
      intermediateChecks: allCheckResults
    };
  }

  // ============================================================================
  // Condition Checker Methods
  // ============================================================================

  private async checkContentScriptResponsive(tabId: number): Promise<boolean> {
    try {
      const response = await this.sendMessage(tabId, { type: 'PING' }, 2000);
      return !!response;
    } catch {
      return false;
    }
  }

  private async checkXestroBoxesPresent(tabId: number): Promise<boolean> {
    try {
      const response = await this.sendMessage(tabId, { 
        type: 'CHECK_XESTRO_BOXES' 
      }, 3000);
      return response?.found === true;
    } catch {
      return false;
    }
  }

  private async checkPatientDataPopulated(tabId: number, patientName?: string): Promise<boolean> {
    try {
      const response = await this.sendMessage(tabId, { 
        type: 'CHECK_PATIENT_DATA',
        data: { expectedPatientName: patientName }
      }, 3000);
      return response?.populated === true;
    } catch {
      return false;
    }
  }

  private async checkClinicalSectionsReady(tabId: number): Promise<boolean> {
    try {
      const response = await this.sendMessage(tabId, { 
        type: 'CHECK_CLINICAL_SECTIONS' 
      }, 3000);
      return response?.sectionsReady === true;
    } catch {
      return false;
    }
  }

  private async checkSectionPresent(
    tabId: number, 
    sectionType: 'background' | 'investigations' | 'medications'
  ): Promise<boolean> {
    try {
      const response = await this.sendMessage(tabId, { 
        type: 'CHECK_SECTION_PRESENT',
        data: { sectionType }
      }, 3000);
      return response?.present === true;
    } catch {
      return false;
    }
  }

  private async checkSectionContentLoaded(
    tabId: number, 
    sectionType: 'background' | 'investigations' | 'medications'
  ): Promise<boolean> {
    try {
      const response = await this.sendMessage(tabId, { 
        type: 'CHECK_SECTION_CONTENT',
        data: { sectionType }
      }, 3000);
      return response?.hasContent === true && response?.wordCount > 0;
    } catch {
      return false;
    }
  }

  private async checkPatientRowHighlighted(tabId: number, patientIndex: number): Promise<boolean> {
    try {
      const response = await this.sendMessage(tabId, { 
        type: 'CHECK_PATIENT_ROW_HIGHLIGHTED',
        data: { patientIndex }
      }, 2000);
      return response?.highlighted === true;
    } catch {
      return false;
    }
  }

  private async checkPatientRecordLoading(tabId: number): Promise<boolean> {
    try {
      const response = await this.sendMessage(tabId, { 
        type: 'CHECK_PATIENT_RECORD_STATE'
      }, 2000);
      return response?.state === 'loading' || response?.state === 'loaded';
    } catch {
      return false;
    }
  }

  private async checkPatientRecordLoaded(tabId: number): Promise<boolean> {
    try {
      const response = await this.sendMessage(tabId, { 
        type: 'CHECK_PATIENT_RECORD_STATE'
      }, 2000);
      return response?.state === 'loaded';
    } catch {
      return false;
    }
  }

  private async getDOMHash(tabId: number): Promise<string> {
    try {
      const response = await this.sendMessage(tabId, { 
        type: 'GET_DOM_HASH' 
      }, 2000);
      return response?.hash || '';
    } catch {
      return '';
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private async sendMessage(
    tabId: number, 
    message: BatchProcessingMessage, 
    timeoutMs = 5000
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Message timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      try {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          clearTimeout(timeout);
          
          if (chrome.runtime.lastError) {
            reject(new Error(`Message failed: ${chrome.runtime.lastError.message}`));
            return;
          }

          resolve(response);
        });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(...args: any[]): void {
    if (this.debugMode) {
      console.log('[DynamicWaitUtils]', ...args);
    }
  }

  // ============================================================================
  // Public Configuration Methods
  // ============================================================================

  public setDefaultTimeout(timeout: number): void {
    this.defaultTimeout = timeout;
  }

  public setDefaultInterval(interval: number): void {
    this.defaultInterval = interval;
  }

  public getDefaultTimeout(): number {
    return this.defaultTimeout;
  }

  public getDefaultInterval(): number {
    return this.defaultInterval;
  }
}