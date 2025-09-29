/**
 * Medical Text Processing Migration Validation Framework
 * 
 * Provides comprehensive validation and rollback capabilities for Phase 1 consolidation.
 * Ensures that consolidated implementations preserve exact behavior of legacy functions.
 */

import { logger } from '@/utils/Logger';
import { PerformanceMonitor } from '@/utils/performance/PerformanceMonitor';

export interface ValidationResult {
  isValid: boolean;
  testsPassed: number;
  testsTotal: number;
  failures: ValidationFailure[];
  performanceMetrics: PerformanceMetrics;
  confidence: number;
}

export interface ValidationFailure {
  testCase: string;
  expected: string;
  actual: string;
  errorType: 'behavior_mismatch' | 'performance_degradation' | 'exception';
  severity: 'critical' | 'major' | 'minor';
  description: string;
}

export interface PerformanceMetrics {
  legacyAverageTime: number;
  consolidatedAverageTime: number;
  performanceImprovement: number;
  memoryUsageDelta: number;
}

export interface ValidationTestCase {
  name: string;
  input: string;
  expectedOutput: string;
  performanceThreshold?: number; // Max allowed time in ms
  severity: 'critical' | 'major' | 'minor';
}

export interface ConsolidationValidationConfig {
  performanceTolerance: number; // Percentage tolerance for performance changes
  behaviorToleranceLevel: 'strict' | 'moderate' | 'lenient';
  enablePerformanceValidation: boolean;
  enableBehaviorValidation: boolean;
  enableRollbackOnFailure: boolean;
  maxCriticalFailures: number;
  maxMajorFailures: number;
}

export class ConsolidationValidationFramework {
  private static instance: ConsolidationValidationFramework;
  private performanceMonitor: PerformanceMonitor;
  private validationResults: Map<string, ValidationResult> = new Map();

  private constructor() {
    this.performanceMonitor = PerformanceMonitor.getInstance();
  }

  public static getInstance(): ConsolidationValidationFramework {
    if (!ConsolidationValidationFramework.instance) {
      ConsolidationValidationFramework.instance = new ConsolidationValidationFramework();
    }
    return ConsolidationValidationFramework.instance;
  }

  /**
   * Validate consolidation by comparing legacy vs consolidated implementations
   */
  async validateConsolidation<T>(
    validationName: string,
    testCases: ValidationTestCase[],
    legacyFunction: (input: string) => T,
    consolidatedFunction: (input: string) => T | Promise<T>,
    config: ConsolidationValidationConfig = this.getDefaultConfig()
  ): Promise<ValidationResult> {
    const operationId = `validation_${validationName}`;
    const measurement = this.performanceMonitor.startMeasurement(operationId, 'ValidationFramework');

    logger.info(`Starting consolidation validation: ${validationName}`, {
      testCasesCount: testCases.length,
      config
    });

    try {
      const failures: ValidationFailure[] = [];
      let testsPassed = 0;
      const performanceMetrics = {
        legacyAverageTime: 0,
        consolidatedAverageTime: 0,
        performanceImprovement: 0,
        memoryUsageDelta: 0
      };

      // Track performance for both implementations
      const legacyTimes: number[] = [];
      const consolidatedTimes: number[] = [];

      // Run validation tests
      for (const testCase of testCases) {
        try {
          // Test legacy implementation performance
          const legacyStart = performance.now();
          const legacyResult = legacyFunction(testCase.input);
          const legacyEnd = performance.now();
          legacyTimes.push(legacyEnd - legacyStart);

          // Test consolidated implementation performance
          const consolidatedStart = performance.now();
          const consolidatedResult = await Promise.resolve(consolidatedFunction(testCase.input));
          const consolidatedEnd = performance.now();
          consolidatedTimes.push(consolidatedEnd - consolidatedStart);

          // Validate behavior preservation
          if (config.enableBehaviorValidation) {
            const behaviorValid = this.validateBehavior(
              testCase, 
              legacyResult, 
              consolidatedResult, 
              config.behaviorToleranceLevel
            );

            if (!behaviorValid.isValid && behaviorValid.failure) {
              failures.push(behaviorValid.failure);
            } else {
              testsPassed++;
            }
          }

          // Validate performance preservation
          if (config.enablePerformanceValidation) {
            const performanceValid = this.validatePerformance(
              testCase,
              legacyEnd - legacyStart,
              consolidatedEnd - consolidatedStart,
              config.performanceTolerance
            );

            if (!performanceValid.isValid && performanceValid.failure) {
              failures.push(performanceValid.failure);
            }
          }

        } catch (error) {
          failures.push({
            testCase: testCase.name,
            expected: 'No exception',
            actual: error instanceof Error ? error.message : String(error),
            errorType: 'exception',
            severity: testCase.severity,
            description: `Exception during test execution: ${error}`
          });
        }
      }

      // Calculate performance metrics
      performanceMetrics.legacyAverageTime = legacyTimes.reduce((sum, time) => sum + time, 0) / legacyTimes.length;
      performanceMetrics.consolidatedAverageTime = consolidatedTimes.reduce((sum, time) => sum + time, 0) / consolidatedTimes.length;
      performanceMetrics.performanceImprovement = 
        ((performanceMetrics.legacyAverageTime - performanceMetrics.consolidatedAverageTime) / performanceMetrics.legacyAverageTime) * 100;

      // Determine overall validation result
      const criticalFailures = failures.filter(f => f.severity === 'critical').length;
      const majorFailures = failures.filter(f => f.severity === 'major').length;
      
      const isValid = criticalFailures <= config.maxCriticalFailures && 
                     majorFailures <= config.maxMajorFailures;

      const confidence = this.calculateConfidence(testsPassed, testCases.length, failures);

      const result: ValidationResult = {
        isValid,
        testsPassed,
        testsTotal: testCases.length,
        failures,
        performanceMetrics,
        confidence
      };

      // Store validation result for rollback capability
      this.validationResults.set(validationName, result);

      measurement.end(testCases.length);

      logger.info(`Consolidation validation completed: ${validationName}`, {
        isValid,
        testsPassed,
        testsTotal: testCases.length,
        failuresCount: failures.length,
        confidence: confidence.toFixed(2),
        performanceImprovement: performanceMetrics.performanceImprovement.toFixed(1) + '%'
      });

      // Trigger rollback if validation fails and rollback is enabled
      if (!isValid && config.enableRollbackOnFailure) {
        await this.triggerRollback(validationName, result);
      }

      return result;

    } catch (error) {
      measurement.end(0);
      logger.error(`Consolidation validation failed: ${validationName}`, { error });
      throw error;
    }
  }

  /**
   * Validate behavior preservation between legacy and consolidated implementations
   */
  private validateBehavior<T>(
    testCase: ValidationTestCase,
    legacyResult: T,
    consolidatedResult: T,
    toleranceLevel: 'strict' | 'moderate' | 'lenient'
  ): { isValid: boolean; failure?: ValidationFailure } {
    
    const legacyStr = String(legacyResult);
    const consolidatedStr = String(consolidatedResult);

    // Strict comparison - exact match required
    if (toleranceLevel === 'strict') {
      if (legacyStr === consolidatedStr) {
        return { isValid: true };
      }
    }

    // Moderate comparison - allow minor whitespace differences
    if (toleranceLevel === 'moderate') {
      const normalizedLegacy = legacyStr.replace(/\s+/g, ' ').trim();
      const normalizedConsolidated = consolidatedStr.replace(/\s+/g, ' ').trim();
      
      if (normalizedLegacy === normalizedConsolidated) {
        return { isValid: true };
      }
    }

    // Lenient comparison - allow semantic equivalence
    if (toleranceLevel === 'lenient') {
      const semanticMatch = this.checkSemanticEquivalence(legacyStr, consolidatedStr);
      if (semanticMatch) {
        return { isValid: true };
      }
    }

    return {
      isValid: false,
      failure: {
        testCase: testCase.name,
        expected: legacyStr,
        actual: consolidatedStr,
        errorType: 'behavior_mismatch',
        severity: testCase.severity,
        description: `Behavior mismatch: expected "${legacyStr}", got "${consolidatedStr}"`
      }
    };
  }

  /**
   * Validate performance preservation
   */
  private validatePerformance(
    testCase: ValidationTestCase,
    legacyTime: number,
    consolidatedTime: number,
    performanceTolerance: number
  ): { isValid: boolean; failure?: ValidationFailure } {
    
    const performanceChange = ((consolidatedTime - legacyTime) / legacyTime) * 100;
    
    // Check if performance degradation exceeds tolerance
    if (performanceChange > performanceTolerance) {
      return {
        isValid: false,
        failure: {
          testCase: testCase.name,
          expected: `≤${performanceTolerance}% performance change`,
          actual: `${performanceChange.toFixed(1)}% performance change`,
          errorType: 'performance_degradation',
          severity: 'major',
          description: `Performance degraded by ${performanceChange.toFixed(1)}%, exceeding ${performanceTolerance}% tolerance`
        }
      };
    }

    return { isValid: true };
  }

  /**
   * Check semantic equivalence for lenient validation
   */
  private checkSemanticEquivalence(text1: string, text2: string): boolean {
    // Remove punctuation and normalize for medical terms
    const normalize = (text: string) => text
      .toLowerCase()
      .replace(/[^\w\s%]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return normalize(text1) === normalize(text2);
  }

  /**
   * Calculate confidence score based on validation results
   */
  private calculateConfidence(
    testsPassed: number,
    testsTotal: number,
    failures: ValidationFailure[]
  ): number {
    if (testsTotal === 0) return 0;

    const baseConfidence = (testsPassed / testsTotal) * 100;
    
    // Reduce confidence based on failure severity
    const criticalFailures = failures.filter(f => f.severity === 'critical').length;
    const majorFailures = failures.filter(f => f.severity === 'major').length;
    const minorFailures = failures.filter(f => f.severity === 'minor').length;

    const severityPenalty = (criticalFailures * 20) + (majorFailures * 10) + (minorFailures * 5);
    
    return Math.max(0, baseConfidence - severityPenalty);
  }

  /**
   * Trigger rollback if validation fails
   */
  private async triggerRollback(validationName: string, result: ValidationResult): Promise<void> {
    logger.warn(`Triggering rollback for failed validation: ${validationName}`, {
      confidence: result.confidence,
      criticalFailures: result.failures.filter(f => f.severity === 'critical').length,
      majorFailures: result.failures.filter(f => f.severity === 'major').length
    });

    // In a real implementation, this would:
    // 1. Revert code changes
    // 2. Restore legacy implementations
    // 3. Update deployment configurations
    // 4. Notify development team

    // For now, log the rollback action
    console.error('🔄 ROLLBACK TRIGGERED:', {
      validationName,
      reason: 'Consolidation validation failed',
      failures: result.failures.length,
      confidence: result.confidence
    });
  }

  /**
   * Get default validation configuration
   */
  private getDefaultConfig(): ConsolidationValidationConfig {
    return {
      performanceTolerance: 20, // 20% performance degradation tolerance
      behaviorToleranceLevel: 'moderate',
      enablePerformanceValidation: true,
      enableBehaviorValidation: true,
      enableRollbackOnFailure: false, // Disabled by default for safety
      maxCriticalFailures: 0,
      maxMajorFailures: 2
    };
  }

  /**
   * Get validation results for analysis
   */
  getValidationResults(validationName?: string): Map<string, ValidationResult> | ValidationResult | undefined {
    if (validationName) {
      return this.validationResults.get(validationName);
    }
    return this.validationResults;
  }

  /**
   * Generate validation report
   */
  generateValidationReport(validationName: string): string {
    const result = this.validationResults.get(validationName);
    if (!result) {
      return `No validation results found for: ${validationName}`;
    }

    const report = [
      `# Consolidation Validation Report: ${validationName}`,
      ``,
      `## Summary`,
      `- **Status**: ${result.isValid ? '✅ PASSED' : '❌ FAILED'}`,
      `- **Confidence**: ${result.confidence.toFixed(1)}%`,
      `- **Tests Passed**: ${result.testsPassed}/${result.testsTotal}`,
      `- **Performance Improvement**: ${result.performanceMetrics.performanceImprovement.toFixed(1)}%`,
      ``,
      `## Performance Metrics`,
      `- **Legacy Average Time**: ${result.performanceMetrics.legacyAverageTime.toFixed(2)}ms`,
      `- **Consolidated Average Time**: ${result.performanceMetrics.consolidatedAverageTime.toFixed(2)}ms`,
      ``,
      `## Failures (${result.failures.length})`,
      ...result.failures.map(failure => 
        `- **${failure.severity.toUpperCase()}**: ${failure.testCase} - ${failure.description}`
      )
    ];

    return report.join('\n');
  }
}

// Convenience functions for common validation patterns
export async function validateTextCleaningConsolidation(
  testCases: ValidationTestCase[],
  legacyFunction: (input: string) => string,
  consolidatedFunction: (input: string) => string
): Promise<ValidationResult> {
  const framework = ConsolidationValidationFramework.getInstance();
  
  return await framework.validateConsolidation(
    'text_cleaning',
    testCases,
    legacyFunction,
    consolidatedFunction,
    {
      performanceTolerance: 10, // Stricter for text cleaning
      behaviorToleranceLevel: 'strict', // Exact match required
      enablePerformanceValidation: true,
      enableBehaviorValidation: true,
      enableRollbackOnFailure: false,
      maxCriticalFailures: 0,
      maxMajorFailures: 0
    }
  );
}

export async function validateASRCorrectionConsolidation(
  testCases: ValidationTestCase[],
  legacyFunction: (input: string) => string,
  consolidatedFunction: (input: string) => string | Promise<string>
): Promise<ValidationResult> {
  const framework = ConsolidationValidationFramework.getInstance();
  
  return await framework.validateConsolidation(
    'asr_correction',
    testCases,
    legacyFunction,
    consolidatedFunction,
    {
      performanceTolerance: 25, // More tolerance for complex ASR processing
      behaviorToleranceLevel: 'moderate', // Allow minor whitespace differences
      enablePerformanceValidation: true,
      enableBehaviorValidation: true,
      enableRollbackOnFailure: false,
      maxCriticalFailures: 0,
      maxMajorFailures: 1
    }
  );
}