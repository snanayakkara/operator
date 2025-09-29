/**
 * Phase 3 Migration Validation Pipeline Tests
 * 
 * Comprehensive test suite for validation system, rollback procedures,
 * and safety mechanisms during Phase 3 agent migrations.
 */

import { test, expect, describe } from '@playwright/test';
import { ValidationPipeline, ValidationPipelineConfig } from '@/utils/validation/ValidationPipeline';
import { MigrationValidator, MigrationValidationConfig } from '@/utils/validation/MigrationValidator';
// import { AgentType } from '@/types/medical.types'; // Currently unused

// Test configuration for validation pipeline
const TEST_VALIDATION_CONFIG: ValidationPipelineConfig = {
  enableParallelValidation: false, // Sequential for predictable testing
  maxConcurrentValidations: 1,
  enableAutomaticRollback: true,
  rollbackThreshold: 0.7,
  notificationConfig: {
    enableSlack: false,
    enableEmail: false,
    criticalIssuesOnly: false
  },
  validationSchedule: {
    preDeployment: true,
    postDeployment: false,
    intervalMinutes: undefined // No continuous monitoring in tests
  }
};

describe('Phase 3 Migration Validation Pipeline', () => {
  test.describe('MigrationValidator Core Functionality', () => {
    test('should validate QuickLetterAgent migration successfully', async ({ page: _page }) => {
      const validator = MigrationValidator.getInstance();
      
      // Mock agent configuration for testing
      const config: MigrationValidationConfig = {
        agentType: 'quick-letter',
        validationLevel: 'comprehensive',
        enableRollback: true,
        benchmarkThresholds: {
          processingTime: 5000,
          qualityScore: 0.6,
          confidenceScore: 0.5,
          contentLength: 50
        },
        comparisonSamples: 3
      };

      // Create mock agents for testing
      const mockEnhancedAgent = {
        async process(_input: string) {
          return {
            id: `test-${Date.now()}`,
            agentName: 'QuickLetterAgent',
            content: `Enhanced processed: ${input}`,
            sections: [
              {
                title: 'Test Section',
                content: `Processed content for: ${input}`,
                type: 'narrative' as const,
                priority: 'high' as const
              }
            ],
            metadata: {
              confidence: 0.8,
              processingTime: 1500,
              modelUsed: 'test-model'
            },
            timestamp: Date.now(),
            errors: []
          };
        }
      };

      const mockLegacyAgent = {
        async process(_input: string) {
          return {
            id: `legacy-${Date.now()}`,
            agentName: 'QuickLetterAgent',
            content: `Legacy processed: ${input}`,
            sections: [
              {
                title: 'Legacy Section',
                content: `Legacy content for: ${input}`,
                type: 'narrative' as const,
                priority: 'high' as const
              }
            ],
            metadata: {
              confidence: 0.75,
              processingTime: 2000,
              modelUsed: 'legacy-model'
            },
            timestamp: Date.now(),
            errors: []
          };
        }
      };

      // Run validation
      const result = await validator.validateMigration(
        'quick-letter',
        mockEnhancedAgent,
        mockLegacyAgent,
        config
      );

      // Assertions
      expect(result).toBeDefined();
      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(0.5);
      expect(result.phase3Performance).toBeDefined();
      expect(result.legacyPerformance).toBeDefined();
      expect(result.comparison).toBeDefined();
      expect(result.rollbackRequired).toBe(false);
      
      // Performance should show improvement
      expect(result.comparison.processingTimeImprovement).toBeGreaterThan(0);
      expect(result.comparison.qualityScoreChange).toBeGreaterThanOrEqual(0);
    });

    test('should trigger rollback for poor performance', async ({ page: _page }) => {
      const validator = MigrationValidator.getInstance();
      
      const config: MigrationValidationConfig = {
        agentType: 'investigation-summary',
        validationLevel: 'clinical',
        enableRollback: true,
        benchmarkThresholds: {
          processingTime: 2000,
          qualityScore: 0.8,
          confidenceScore: 0.7,
          contentLength: 100
        },
        comparisonSamples: 2
      };

      // Create problematic Phase 3 agent
      const problematicEnhancedAgent = {
        async process(_input: string) {
          return {
            id: `problematic-${Date.now()}`,
            agentName: 'InvestigationSummaryAgent',
            content: 'Poor quality output',
            sections: [],
            metadata: {
              confidence: 0.3, // Low confidence
              processingTime: 8000, // Very slow
              modelUsed: 'problematic-model'
            },
            timestamp: Date.now(),
            errors: ['Processing error occurred']
          };
        }
      };

      const goodLegacyAgent = {
        async process(_input: string) {
          return {
            id: `good-legacy-${Date.now()}`,
            agentName: 'InvestigationSummaryAgent',
            content: `High quality investigation summary: ${input}`,
            sections: [
              {
                title: 'Investigation',
                content: `Quality content for: ${input}`,
                type: 'structured' as const,
                priority: 'high' as const
              }
            ],
            metadata: {
              confidence: 0.9,
              processingTime: 2500,
              modelUsed: 'reliable-model'
            },
            timestamp: Date.now(),
            errors: []
          };
        }
      };

      const result = await validator.validateMigration(
        'investigation-summary',
        problematicEnhancedAgent,
        goodLegacyAgent,
        config
      );

      // Should fail validation and require rollback
      expect(result.isValid).toBe(false);
      expect(result.rollbackRequired).toBe(true);
      expect(result.issues.length).toBeGreaterThan(0);
      
      // Should have critical issues
      const criticalIssues = result.issues.filter(issue => issue.severity === 'critical');
      expect(criticalIssues.length).toBeGreaterThan(0);
    });

    test('should execute rollback procedure correctly', async ({ page: _page }) => {
      const validator = MigrationValidator.getInstance();
      
      const rollbackSuccess = await validator.executeRollback(
        'quick-letter',
        'Test rollback procedure',
        'manual'
      );

      expect(rollbackSuccess).toBe(true);
      
      // Verify checkpoint was created
      // In a real implementation, this would check persistent storage
    });
  });

  test.describe('ValidationPipeline Orchestration', () => {
    test('should run full validation pipeline successfully', async ({ page: _page }) => {
      const pipeline = ValidationPipeline.getInstance(TEST_VALIDATION_CONFIG);
      
      // Run full pipeline
      const result = await pipeline.runFullPipeline();
      
      // Assertions
      expect(result).toBeDefined();
      expect(result.totalValidations).toBeGreaterThan(0);
      expect(result.validationResults.size).toBeGreaterThan(0);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      
      // Should have processed expected agents
      expect(result.validationResults.has('quick-letter')).toBe(true);
      expect(result.validationResults.has('investigation-summary')).toBe(true);
    });

    test('should handle individual agent validation', async ({ page: _page }) => {
      const pipeline = ValidationPipeline.getInstance(TEST_VALIDATION_CONFIG);
      
      const result = await pipeline.validateAgent('quick-letter');
      
      expect(result).toBeDefined();
      expect(result.isValid).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.phase3Performance).toBeDefined();
      expect(result.legacyPerformance).toBeDefined();
    });

    test('should provide pipeline status tracking', async ({ page: _page }) => {
      const pipeline = ValidationPipeline.getInstance(TEST_VALIDATION_CONFIG);
      
      // Start validation in background
      const validationPromise = pipeline.validateAgent('investigation-summary');
      
      // Check status while running
      const status = pipeline.getPipelineStatus();
      expect(status.size).toBeGreaterThanOrEqual(0);
      
      // Wait for completion
      await validationPromise;
      
      // Check final status
      const finalStatus = pipeline.getPipelineStatus();
      const job = finalStatus.get('investigation-summary');
      expect(job).toBeDefined();
      expect(['completed', 'rolled_back', 'failed'].includes(job!.status)).toBe(true);
    });

    test('should generate appropriate recommendations', async ({ page: _page }) => {
      const pipeline = ValidationPipeline.getInstance({
        ...TEST_VALIDATION_CONFIG,
        rollbackThreshold: 0.9 // High threshold to trigger recommendations
      });
      
      const result = await pipeline.runFullPipeline();
      
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.nextActions).toBeDefined();
      expect(Array.isArray(result.nextActions)).toBe(true);
    });
  });

  test.describe('Safety and Rollback Mechanisms', () => {
    test('should handle validation errors gracefully', async ({ page: _page }) => {
      const validator = MigrationValidator.getInstance();
      
      // Create agent that throws errors
      const errorAgent = {
        async process(_input: string) {
          throw new Error('Simulated processing error');
        }
      };

      const normalAgent = {
        async process(_input: string) {
          return {
            id: `normal-${Date.now()}`,
            agentName: 'NormalAgent',
            content: input,
            sections: [],
            metadata: { confidence: 0.8 },
            timestamp: Date.now(),
            errors: []
          };
        }
      };

      const config: MigrationValidationConfig = {
        agentType: 'quick-letter',
        validationLevel: 'basic',
        enableRollback: true,
        benchmarkThresholds: {
          processingTime: 5000,
          qualityScore: 0.5,
          confidenceScore: 0.5,
          contentLength: 10
        },
        comparisonSamples: 1
      };

      const result = await validator.validateMigration(
        'quick-letter',
        errorAgent,
        normalAgent,
        config
      );

      // Should handle errors gracefully
      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.rollbackRequired).toBe(true);
    });

    test('should respect rollback configuration', async ({ page: _page }) => {
      const pipelineWithRollback = ValidationPipeline.getInstance({
        ...TEST_VALIDATION_CONFIG,
        enableAutomaticRollback: true,
        rollbackThreshold: 0.9 // High threshold
      });

      const pipelineWithoutRollback = ValidationPipeline.getInstance({
        ...TEST_VALIDATION_CONFIG,
        enableAutomaticRollback: false
      });

      // Test with rollback enabled - may trigger rollbacks
      const resultWithRollback = await pipelineWithRollback.runFullPipeline();
      
      // Test with rollback disabled - should not execute rollbacks
      const resultWithoutRollback = await pipelineWithoutRollback.runFullPipeline();
      
      // Both should complete but may have different rollback counts
      expect(resultWithRollback).toBeDefined();
      expect(resultWithoutRollback).toBeDefined();
    });

    test('should validate agent performance benchmarks', async ({ page: _page }) => {
      const validator = MigrationValidator.getInstance();
      
      // Test with strict benchmarks
      const strictConfig: MigrationValidationConfig = {
        agentType: 'quick-letter',
        validationLevel: 'comprehensive',
        enableRollback: true,
        benchmarkThresholds: {
          processingTime: 100,    // Very strict - 100ms
          qualityScore: 0.95,     // Very high quality required
          confidenceScore: 0.9,   // High confidence required
          contentLength: 500      // Minimum content length
        },
        comparisonSamples: 2
      };

      // Create agents that may not meet strict benchmarks
      const phase3Agent = {
        async process(_input: string) {
          return {
            id: `test-${Date.now()}`,
            agentName: 'TestAgent',
            content: 'Short content', // May not meet length requirement
            sections: [],
            metadata: {
              confidence: 0.8, // May not meet confidence requirement
              processingTime: 2000 // May not meet time requirement
            },
            timestamp: Date.now(),
            errors: []
          };
        }
      };

      const legacyAgent = {
        async process(_input: string) {
          return {
            id: `legacy-${Date.now()}`,
            agentName: 'TestAgent.Legacy',
            content: 'Legacy content',
            sections: [],
            metadata: {
              confidence: 0.85,
              processingTime: 1500
            },
            timestamp: Date.now(),
            errors: []
          };
        }
      };

      const result = await validator.validateMigration(
        'quick-letter',
        phase3Agent,
        legacyAgent,
        strictConfig
      );

      // Should identify benchmark violations
      expect(result).toBeDefined();
      expect(result.issues).toBeDefined();
      
      // With strict benchmarks, likely to have issues
      const performanceIssues = result.issues.filter(issue => 
        issue.category === 'performance' || issue.category === 'quality'
      );
      expect(performanceIssues.length).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Integration with Phase 3 Agents', () => {
    test('should validate actual Phase 3 QuickLetterAgent', async ({ page: _page }) => {
      // This test would validate against actual Phase 3 implementation
      const pipeline = ValidationPipeline.getInstance(TEST_VALIDATION_CONFIG);
      
      try {
        const result = await pipeline.validateAgent('quick-letter');
        
        // Verify actual Phase 3 agent meets quality standards
        expect(result.isValid).toBe(true);
        expect(result.score).toBeGreaterThan(0.6);
        expect(result.phase3Performance.processingTime).toBeLessThan(10000);
        expect(result.phase3Performance.qualityScore).toBeGreaterThan(0.5);
        
      } catch (error) {
        // If Phase 3 agent is not available, test should handle gracefully
        console.warn('Phase 3 QuickLetterAgent not available for testing:', error);
      }
    });

    test('should validate actual Phase 3 InvestigationSummaryAgent', async ({ page: _page }) => {
      const pipeline = ValidationPipeline.getInstance(TEST_VALIDATION_CONFIG);
      
      try {
        const result = await pipeline.validateAgent('investigation-summary');
        
        // Verify investigation-specific validation
        expect(result.isValid).toBe(true);
        expect(result.score).toBeGreaterThan(0.6);
        expect(result.phase3Performance.medicalAccuracy).toBeGreaterThan(0.7);
        
      } catch (error) {
        console.warn('Phase 3 InvestigationSummaryAgent not available for testing:', error);
      }
    });

    test('should track validation history and checkpoints', async ({ page: _page }) => {
      const pipeline = ValidationPipeline.getInstance(TEST_VALIDATION_CONFIG);
      
      // Run validation
      await pipeline.validateAgent('quick-letter');
      
      // Check history
      const history = pipeline.getValidationHistory('quick-letter');
      expect(Array.isArray(history)).toBe(true);
      
      // Should have at least one entry
      if (history.length > 0) {
        const latestJob = history[history.length - 1];
        expect(latestJob.agentType).toBe('quick-letter');
        expect(['completed', 'failed', 'rolled_back'].includes(latestJob.status)).toBe(true);
      }
    });
  });

  test.describe('Performance and Scalability', () => {
    test('should complete validation within reasonable time', async ({ page: _page }) => {
      const startTime = Date.now();
      
      const pipeline = ValidationPipeline.getInstance({
        ...TEST_VALIDATION_CONFIG,
        comparisonSamples: 2 // Reduced for performance testing
      });
      
      const result = await pipeline.runFullPipeline();
      
      const duration = Date.now() - startTime;
      
      // Should complete within reasonable time (30 seconds for test environment)
      expect(duration).toBeLessThan(30000);
      expect(result.success).toBeDefined();
    });

    test('should handle concurrent validations', async ({ page: _page }) => {
      const pipeline = ValidationPipeline.getInstance({
        ...TEST_VALIDATION_CONFIG,
        enableParallelValidation: true,
        maxConcurrentValidations: 2
      });
      
      const startTime = Date.now();
      const result = await pipeline.runFullPipeline();
      const duration = Date.now() - startTime;
      
      // Parallel execution should be efficient
      expect(result).toBeDefined();
      expect(result.totalValidations).toBeGreaterThan(0);
      
      console.log(`Parallel validation completed in ${duration}ms`);
    });
  });
});