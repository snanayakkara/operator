/**
 * Error Recovery Manager
 * 
 * Advanced error recovery system with context-aware strategies, circuit breaker
 * patterns, and intelligent retry mechanisms. Provides graceful degradation
 * and comprehensive error handling for batch processing operations.
 */

import type { 
  ErrorRecoveryStrategy,
  ErrorType,
  BackoffStrategy,
  ErrorRecoveryStrategyType,
  OperationContext,
  FailedAttempt,
  RetryInfo
} from '@/types/BatchProcessingTypes';

export interface RecoveryConfig {
  strategy: ErrorRecoveryStrategyType;
  maxTotalRetries: number;
  circuitBreakerThreshold: number;
  circuitBreakerResetTime: number;
  enableGracefulDegradation: boolean;
  userNotificationEnabled: boolean;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
  resetAttempts: number;
}

export class ErrorRecoveryManager {
  private static instance: ErrorRecoveryManager;
  private strategies: Map<ErrorType, ErrorRecoveryStrategy>;
  private circuitBreakers: Map<string, CircuitBreakerState>;
  private failureHistory: FailedAttempt[];
  private config: RecoveryConfig;
  private debugMode = false;

  private constructor() {
    this.strategies = new Map();
    this.circuitBreakers = new Map();
    this.failureHistory = [];
    this.config = this.getDefaultConfig();
    this.initializeStrategies();
  }

  public static getInstance(): ErrorRecoveryManager {
    if (!ErrorRecoveryManager.instance) {
      ErrorRecoveryManager.instance = new ErrorRecoveryManager();
    }
    return ErrorRecoveryManager.instance;
  }

  /**
   * Execute operation with comprehensive error recovery
   */
  public async executeWithRecovery<T>(
    operation: () => Promise<T>,
    context: OperationContext,
    customStrategy?: Partial<ErrorRecoveryStrategy>
  ): Promise<T> {
    const operationKey = `${context.operation}_${context.patientIndex}`;
    
    // Check circuit breaker
    if (this.isCircuitBreakerOpen(operationKey)) {
      throw new Error(`Circuit breaker is open for operation: ${context.operation}`);
    }

    let lastError: Error | null = null;
    let attemptCount = 0;
    const maxAttempts = this.getMaxAttempts(context.operation);

    while (attemptCount < maxAttempts) {
      try {
        this.log(`🔄 Executing ${context.operation} (attempt ${attemptCount + 1}/${maxAttempts})`);
        
        const result = await operation();
        
        // Success - reset circuit breaker and return
        this.resetCircuitBreaker(operationKey);
        this.log(`✅ Operation ${context.operation} succeeded on attempt ${attemptCount + 1}`);
        
        return result;

      } catch (error) {
        attemptCount++;
        lastError = error instanceof Error ? error : new Error(String(error));
        
        this.log(`❌ Attempt ${attemptCount} failed for ${context.operation}:`, lastError.message);

        // Classify error type
        const errorType = this.classifyError(lastError);
        
        // Record failure
        const failedAttempt: FailedAttempt = {
          patientIndex: context.patientIndex,
          patient: context.patient,
          operation: context.operation,
          error: lastError.message,
          timestamp: Date.now(),
          context,
          recoveryAttempted: false
        };

        // Get recovery strategy
        const strategy = this.getStrategy(errorType, customStrategy);
        
        // Check if we should retry
        if (!strategy.shouldRetry(lastError, attemptCount, context) || attemptCount >= maxAttempts) {
          this.recordCircuitBreakerFailure(operationKey);
          this.recordFailure(failedAttempt);
          break;
        }

        // Apply recovery strategy
        failedAttempt.recoveryAttempted = true;
        await this.applyRecoveryStrategy(strategy, lastError, attemptCount, context);
        
        this.recordFailure(failedAttempt);
      }
    }

    // All attempts failed
    this.recordCircuitBreakerFailure(operationKey);
    
    if (this.config.enableGracefulDegradation) {
      const degradedResult = await this.attemptGracefulDegradation<T>(context, lastError!);
      if (degradedResult !== null) {
        this.log(`🔄 Graceful degradation successful for ${context.operation}`);
        return degradedResult;
      }
    }

    throw new Error(`Operation ${context.operation} failed after ${attemptCount} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Check if an operation should be retried based on error patterns
   */
  public shouldRetryOperation(
    operation: string,
    error: Error,
    attemptCount: number
  ): boolean {
    const errorType = this.classifyError(error);
    const strategy = this.strategies.get(errorType);
    
    if (!strategy) return false;
    
    const mockContext: OperationContext = {
      operation,
      patientIndex: 0,
      patient: { name: '', dob: '', fileNumber: '', appointmentTime: '', appointmentType: '', confirmed: false, isFirstAppointment: false },
      timestamp: Date.now(),
      environmentState: { tabId: 0, currentUrl: '', contentScriptVersion: '', lastHealthCheck: 0 },
      previousAttempts: attemptCount - 1
    };

    return strategy.shouldRetry(error, attemptCount, mockContext);
  }

  /**
   * Get recommended retry delay for an error
   */
  public getRetryDelay(errorType: ErrorType, attemptCount: number): number {
    const strategy = this.strategies.get(errorType);
    if (!strategy) return 1000;

    return this.calculateBackoffDelay(strategy.backoffStrategy, attemptCount, 1000);
  }

  /**
   * Reset circuit breaker for specific operation
   */
  public resetCircuitBreaker(operationKey: string): void {
    const breaker = this.circuitBreakers.get(operationKey);
    if (breaker) {
      breaker.failures = 0;
      breaker.state = 'closed';
      breaker.resetAttempts = 0;
    }
  }

  /**
   * Get current failure statistics
   */
  public getFailureStats(): {
    totalFailures: number;
    failuresByType: Map<ErrorType, number>;
    failuresByOperation: Map<string, number>;
    recentFailures: FailedAttempt[];
    circuitBreakersOpen: string[];
  } {
    const failuresByType = new Map<ErrorType, number>();
    const failuresByOperation = new Map<string, number>();
    
    for (const failure of this.failureHistory) {
      const errorType = this.classifyError(new Error(failure.error));
      failuresByType.set(errorType, (failuresByType.get(errorType) || 0) + 1);
      failuresByOperation.set(failure.operation, (failuresByOperation.get(failure.operation) || 0) + 1);
    }

    const recentFailures = this.failureHistory
      .filter(f => Date.now() - f.timestamp < 300000) // Last 5 minutes
      .slice(-10); // Last 10 failures

    const circuitBreakersOpen = Array.from(this.circuitBreakers.entries())
      .filter(([_, breaker]) => breaker.state === 'open')
      .map(([key, _]) => key);

    return {
      totalFailures: this.failureHistory.length,
      failuresByType,
      failuresByOperation,
      recentFailures,
      circuitBreakersOpen
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private initializeStrategies(): void {
    // Network timeout strategy
    this.strategies.set('network_timeout', {
      errorType: 'network_timeout',
      maxRetries: 3,
      backoffStrategy: 'exponential',
      recoveryTimeout: 30000,
      shouldRetry: (error, attemptCount, context) => {
        return attemptCount <= 3 && !error.message.includes('permanent');
      }
    });

    // DOM not found strategy
    this.strategies.set('dom_not_found', {
      errorType: 'dom_not_found',
      maxRetries: 5,
      backoffStrategy: 'linear',
      recoveryTimeout: 20000,
      shouldRetry: (error, attemptCount, context) => {
        return attemptCount <= 5;
      },
      fallbackAction: async () => {
        // Try page refresh or alternative selectors
        return null;
      }
    });

    // Content script unresponsive strategy
    this.strategies.set('content_script_unresponsive', {
      errorType: 'content_script_unresponsive',
      maxRetries: 2,
      backoffStrategy: 'fixed',
      recoveryTimeout: 15000,
      shouldRetry: (error, attemptCount, context) => {
        return attemptCount <= 2;
      },
      fallbackAction: async () => {
        // Reinject content script
        return null;
      }
    });

    // Extraction failed strategy
    this.strategies.set('extraction_failed', {
      errorType: 'extraction_failed',
      maxRetries: 4,
      backoffStrategy: 'fibonacci',
      recoveryTimeout: 25000,
      shouldRetry: (error, attemptCount, context) => {
        return attemptCount <= 4 && !error.message.includes('no data available');
      }
    });

    // AI processing failed strategy
    this.strategies.set('ai_processing_failed', {
      errorType: 'ai_processing_failed',
      maxRetries: 2,
      backoffStrategy: 'exponential',
      recoveryTimeout: 60000,
      shouldRetry: (error, attemptCount, context) => {
        return attemptCount <= 2 && !error.message.includes('model unavailable');
      }
    });

    // Navigation failed strategy
    this.strategies.set('navigation_failed', {
      errorType: 'navigation_failed',
      maxRetries: 3,
      backoffStrategy: 'linear',
      recoveryTimeout: 20000,
      shouldRetry: (error, attemptCount, context) => {
        return attemptCount <= 3;
      }
    });

    // Permission denied strategy
    this.strategies.set('permission_denied', {
      errorType: 'permission_denied',
      maxRetries: 1,
      backoffStrategy: 'fixed',
      recoveryTimeout: 5000,
      shouldRetry: (error, attemptCount, context) => {
        return false; // Don't retry permission errors
      }
    });

    // Memory limit strategy
    this.strategies.set('memory_limit', {
      errorType: 'memory_limit',
      maxRetries: 1,
      backoffStrategy: 'fixed',
      recoveryTimeout: 10000,
      shouldRetry: (error, attemptCount, context) => {
        return attemptCount === 1; // Try once after cleanup
      },
      fallbackAction: async () => {
        // Trigger garbage collection if available
        try {
          if ((window as any).gc) {
            (window as any).gc();
          }
        } catch {
          // GC not available
        }
        return null;
      }
    });

    // Unknown error strategy
    this.strategies.set('unknown', {
      errorType: 'unknown',
      maxRetries: 2,
      backoffStrategy: 'exponential',
      recoveryTimeout: 15000,
      shouldRetry: (error, attemptCount, context) => {
        return attemptCount <= 2;
      }
    });
  }

  private classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    if (message.includes('timeout') || message.includes('timed out')) {
      return 'network_timeout';
    }
    
    if (message.includes('not found') || message.includes('element') || message.includes('selector')) {
      return 'dom_not_found';
    }
    
    if (message.includes('content script') || message.includes('script not responsive')) {
      return 'content_script_unresponsive';
    }
    
    if (message.includes('extraction') || message.includes('data') || message.includes('field')) {
      return 'extraction_failed';
    }
    
    if (message.includes('ai') || message.includes('model') || message.includes('processing')) {
      return 'ai_processing_failed';
    }
    
    if (message.includes('navigation') || message.includes('navigate') || message.includes('tab')) {
      return 'navigation_failed';
    }
    
    if (message.includes('permission') || message.includes('access denied')) {
      return 'permission_denied';
    }
    
    if (message.includes('memory') || message.includes('heap') || message.includes('out of memory')) {
      return 'memory_limit';
    }

    return 'unknown';
  }

  private getStrategy(
    errorType: ErrorType, 
    customStrategy?: Partial<ErrorRecoveryStrategy>
  ): ErrorRecoveryStrategy {
    const baseStrategy = this.strategies.get(errorType) || this.strategies.get('unknown')!;
    
    if (customStrategy) {
      return { ...baseStrategy, ...customStrategy };
    }
    
    return baseStrategy;
  }

  private async applyRecoveryStrategy(
    strategy: ErrorRecoveryStrategy,
    error: Error,
    attemptCount: number,
    context: OperationContext
  ): Promise<void> {
    // Calculate delay
    const delay = this.calculateBackoffDelay(strategy.backoffStrategy, attemptCount);
    
    this.log(`🔄 Applying recovery strategy for ${strategy.errorType}, waiting ${delay}ms`);

    // Execute fallback action if available
    if (strategy.fallbackAction) {
      try {
        await strategy.fallbackAction();
        this.log(`✅ Fallback action executed for ${strategy.errorType}`);
      } catch (fallbackError) {
        this.log(`❌ Fallback action failed for ${strategy.errorType}:`, fallbackError);
      }
    }

    // Wait for backoff delay
    await this.sleep(delay);

    // Additional context-specific recovery actions
    await this.performContextSpecificRecovery(context, strategy.errorType);
  }

  private async performContextSpecificRecovery(
    context: OperationContext,
    errorType: ErrorType
  ): Promise<void> {
    switch (errorType) {
      case 'content_script_unresponsive':
        await this.recoverContentScript(context.environmentState.tabId);
        break;
        
      case 'dom_not_found':
        await this.recoverDOMElements(context.environmentState.tabId);
        break;
        
      case 'navigation_failed':
        await this.recoverNavigation(context.environmentState.tabId);
        break;
        
      case 'memory_limit':
        await this.recoverMemory();
        break;
    }
  }

  private async recoverContentScript(tabId: number): Promise<void> {
    try {
      this.log(`🔧 Attempting to recover content script on tab ${tabId}`);
      
      // Try to inject content script
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content-script.js']
      });
      
      // Wait for initialization
      await this.sleep(2000);
      
    } catch (error) {
      this.log(`❌ Content script recovery failed:`, error);
    }
  }

  private async recoverDOMElements(tabId: number): Promise<void> {
    try {
      this.log(`🔧 Attempting to recover DOM elements on tab ${tabId}`);
      
      // Wait for DOM stability
      await this.sleep(1000);
      
      // Try to refresh the page section if possible
      await chrome.tabs.sendMessage(tabId, {
        type: 'REFRESH_PAGE_SECTION'
      });
      
    } catch (error) {
      this.log(`❌ DOM recovery failed:`, error);
    }
  }

  private async recoverNavigation(tabId: number): Promise<void> {
    try {
      this.log(`🔧 Attempting to recover navigation on tab ${tabId}`);
      
      // Check if tab is still valid
      const tab = await chrome.tabs.get(tabId);
      if (!tab) {
        throw new Error('Tab no longer exists');
      }
      
      // Wait for page to settle
      await this.sleep(3000);
      
    } catch (error) {
      this.log(`❌ Navigation recovery failed:`, error);
    }
  }

  private async recoverMemory(): Promise<void> {
    this.log(`🔧 Attempting memory recovery`);
    
    // Clear old failure history
    if (this.failureHistory.length > 100) {
      this.failureHistory = this.failureHistory.slice(-50);
    }
    
    // Reset old circuit breakers
    const now = Date.now();
    for (const [key, breaker] of this.circuitBreakers) {
      if (now - breaker.lastFailureTime > 300000) { // 5 minutes
        this.circuitBreakers.delete(key);
      }
    }
    
    // Trigger garbage collection if available
    try {
      if ((window as any).gc) {
        (window as any).gc();
      }
    } catch {
      // GC not available
    }
  }

  private calculateBackoffDelay(
    strategy: BackoffStrategy,
    attemptCount: number,
    baseDelay = 1000
  ): number {
    switch (strategy) {
      case 'exponential':
        return Math.min(baseDelay * Math.pow(2, attemptCount - 1), 30000);
        
      case 'linear':
        return Math.min(baseDelay * attemptCount, 20000);
        
      case 'fibonacci':
        return Math.min(this.fibonacci(attemptCount) * baseDelay, 25000);
        
      case 'fixed':
      default:
        return baseDelay;
    }
  }

  private fibonacci(n: number): number {
    if (n <= 1) return 1;
    if (n === 2) return 2;
    
    let a = 1, b = 2;
    for (let i = 3; i <= n; i++) {
      const temp = a + b;
      a = b;
      b = temp;
    }
    return b;
  }

  private isCircuitBreakerOpen(operationKey: string): boolean {
    const breaker = this.circuitBreakers.get(operationKey);
    if (!breaker) return false;

    if (breaker.state === 'open') {
      // Check if we should try to reset (half-open)
      const timeSinceLastFailure = Date.now() - breaker.lastFailureTime;
      if (timeSinceLastFailure > this.config.circuitBreakerResetTime) {
        breaker.state = 'half-open';
        breaker.resetAttempts++;
        return false;
      }
      return true;
    }

    return false;
  }

  private recordCircuitBreakerFailure(operationKey: string): void {
    let breaker = this.circuitBreakers.get(operationKey);
    if (!breaker) {
      breaker = {
        failures: 0,
        lastFailureTime: 0,
        state: 'closed',
        resetAttempts: 0
      };
      this.circuitBreakers.set(operationKey, breaker);
    }

    breaker.failures++;
    breaker.lastFailureTime = Date.now();

    if (breaker.failures >= this.config.circuitBreakerThreshold) {
      breaker.state = 'open';
      this.log(`🚨 Circuit breaker opened for operation: ${operationKey}`);
    }
  }

  private recordFailure(failure: FailedAttempt): void {
    this.failureHistory.push(failure);
    
    // Keep only recent failures to prevent memory issues
    if (this.failureHistory.length > 500) {
      this.failureHistory = this.failureHistory.slice(-250);
    }
  }

  private getMaxAttempts(operation: string): number {
    // Context-aware max attempts based on operation criticality
    const criticalOperations = ['extract-data', 'ai-review'];
    const normalOperations = ['navigate', 'activate-patient'];
    
    if (criticalOperations.some(op => operation.includes(op))) {
      return 5;
    } else if (normalOperations.some(op => operation.includes(op))) {
      return 3;
    }
    
    return 2;
  }

  private async attemptGracefulDegradation<T>(
    context: OperationContext,
    error: Error
  ): Promise<T | null> {
    this.log(`🔄 Attempting graceful degradation for ${context.operation}`);

    switch (context.operation) {
      case 'extract-data':
        // Return partial data or empty structure
        return {
          background: '[Data extraction failed - manual review required]',
          investigations: '[Data extraction failed]',
          medications: '[Data extraction failed]'
        } as any;
        
      case 'ai-review':
        // Return minimal review indicating manual review needed
        return {
          summary: '[AI review failed - manual review required]',
          findings: [],
          recommendations: []
        } as any;
        
      default:
        return null;
    }
  }

  private getDefaultConfig(): RecoveryConfig {
    return {
      strategy: 'conservative',
      maxTotalRetries: 10,
      circuitBreakerThreshold: 5,
      circuitBreakerResetTime: 300000, // 5 minutes
      enableGracefulDegradation: true,
      userNotificationEnabled: true
    };
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(...args: any[]): void {
    if (this.debugMode) {
      console.log('[ErrorRecoveryManager]', ...args);
    }
  }

  // ============================================================================
  // Public Configuration Methods
  // ============================================================================

  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  public updateConfig(config: Partial<RecoveryConfig>): void {
    Object.assign(this.config, config);
  }

  public getConfig(): RecoveryConfig {
    return { ...this.config };
  }

  public clearHistory(): void {
    this.failureHistory = [];
    this.circuitBreakers.clear();
  }

  public addCustomStrategy(errorType: ErrorType, strategy: ErrorRecoveryStrategy): void {
    this.strategies.set(errorType, strategy);
  }
}