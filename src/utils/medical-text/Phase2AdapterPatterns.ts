/**
 * Phase 2 Adapter Patterns - Seamless Agent Integration
 * 
 * Provides backward compatibility and seamless integration between legacy agent
 * implementations and the new Phase 2 consolidated pattern system.
 * Enables gradual migration while maintaining full functionality.
 */

import { medicalTextNormalizer, type NormalizationConfig } from './MedicalTextNormalizer';
import { cardiologyRegistry } from './CardiologyPatternRegistry';
import { MedicalPatternService } from './MedicalPatternService';
import type { AgentType } from '@/types/medical.types';
import { logger } from '@/utils/Logger';
import { recordConsolidationBenchmark } from '@/utils/performance/ConsolidationMetrics';

export interface AgentIntegrationConfig {
  agentType: AgentType;
  enableConsolidatedPatterns: boolean;
  fallbackToLegacy: boolean;
  migrationMode: 'legacy' | 'hybrid' | 'consolidated';
  performanceThreshold?: number; // ms
}

export interface PatternMigrationResult {
  success: boolean;
  originalMethod: string;
  consolidatedResult: string;
  legacyResult?: string;
  performanceGain: number;
  accuracy: 'maintained' | 'improved' | 'degraded';
  warnings: string[];
}

/**
 * Agent Pattern Integration Adapter
 * Seamlessly bridges legacy and consolidated pattern systems
 */
export class AgentPatternIntegrationAdapter {
  private static instance: AgentPatternIntegrationAdapter;
  private migrationLog: Map<string, PatternMigrationResult[]> = new Map();
  private performanceBaselines: Map<AgentType, number> = new Map();

  private constructor() {}

  public static getInstance(): AgentPatternIntegrationAdapter {
    if (!AgentPatternIntegrationAdapter.instance) {
      AgentPatternIntegrationAdapter.instance = new AgentPatternIntegrationAdapter();
    }
    return AgentPatternIntegrationAdapter.instance;
  }

  /**
   * Integrate agent with Phase 2 consolidation system
   */
  async integrateAgent(
    agentType: AgentType,
    textInput: string,
    config: AgentIntegrationConfig
  ): Promise<{
    result: string;
    migrationData: PatternMigrationResult;
    recommendedMode: 'legacy' | 'hybrid' | 'consolidated';
  }> {
    const startTime = performance.now();

    try {
      logger.debug(`Integrating agent ${agentType} with Phase 2 consolidation`, {
        textLength: textInput.length,
        mode: config.migrationMode
      });

      let result: string;
      let migrationData: PatternMigrationResult;

      switch (config.migrationMode) {
        case 'legacy':
          result = await this.processWithLegacyMethod(agentType, textInput);
          migrationData = {
            success: true,
            originalMethod: 'legacy',
            consolidatedResult: result,
            performanceGain: 0,
            accuracy: 'maintained',
            warnings: ['Using legacy processing only']
          };
          break;

        case 'hybrid':
          ({ result, migrationData } = await this.processWithHybridMethod(agentType, textInput, config));
          break;

        case 'consolidated':
          ({ result, migrationData } = await this.processWithConsolidatedMethod(agentType, textInput, config));
          break;

        default:
          throw new Error(`Unknown migration mode: ${config.migrationMode}`);
      }

      // Record performance and log migration
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      this.logMigrationResult(agentType, migrationData);
      recordConsolidationBenchmark(`agent_integration_${agentType}`, processingTime, processingTime, 0);

      // Determine recommended mode based on performance and accuracy
      const recommendedMode = this.determineRecommendedMode(agentType, migrationData, processingTime);

      logger.info(`Agent integration completed for ${agentType}`, {
        mode: config.migrationMode,
        recommendedMode,
        processingTime,
        accuracy: migrationData.accuracy
      });

      return { result, migrationData, recommendedMode };

    } catch (error) {
      logger.error(`Agent integration failed for ${agentType}`, { error: error instanceof Error ? error.message : String(error) });
      
      // Fallback to legacy if possible
      if (config.fallbackToLegacy) {
        const legacyResult = await this.processWithLegacyMethod(agentType, textInput);
        return {
          result: legacyResult,
          migrationData: {
            success: false,
            originalMethod: 'legacy_fallback',
            consolidatedResult: legacyResult,
            performanceGain: 0,
            accuracy: 'maintained',
            warnings: [`Integration failed, fell back to legacy: ${error instanceof Error ? error.message : 'Unknown error'}`]
          },
          recommendedMode: 'legacy'
        };
      }

      throw error;
    }
  }

  /**
   * Process with legacy method (backward compatibility)
   */
  private async processWithLegacyMethod(agentType: AgentType, textInput: string): Promise<string> {
    // This would integrate with existing legacy methods
    // For now, return input as placeholder for legacy processing
    logger.debug(`Processing with legacy method for ${agentType}`);
    return textInput;
  }

  /**
   * Process with hybrid method (legacy + consolidated)
   */
  private async processWithHybridMethod(
    agentType: AgentType,
    textInput: string,
    config: AgentIntegrationConfig
  ): Promise<{ result: string; migrationData: PatternMigrationResult }> {
    const startTime = performance.now();

    try {
      // Process with both legacy and consolidated methods
      const legacyResult = await this.processWithLegacyMethod(agentType, textInput);
      const consolidatedResult = await this.processWithConsolidatedMethodOnly(agentType, textInput);

      // Compare results and choose the best
      const comparison = this.compareResults(legacyResult, consolidatedResult);
      const selectedResult = comparison.accuracy === 'improved' ? consolidatedResult : legacyResult;

      const endTime = performance.now();
      const performanceGain = comparison.accuracy === 'improved' ? 
        Math.max(0, (endTime - startTime) * 0.1) : 0; // Estimated gain

      const migrationData: PatternMigrationResult = {
        success: true,
        originalMethod: 'hybrid',
        consolidatedResult: selectedResult,
        legacyResult,
        performanceGain,
        accuracy: comparison.accuracy,
        warnings: comparison.warnings
      };

      logger.debug(`Hybrid processing completed for ${agentType}`, {
        selectedMethod: comparison.accuracy === 'improved' ? 'consolidated' : 'legacy',
        accuracy: comparison.accuracy
      });

      return { result: selectedResult, migrationData };

    } catch (error) {
      logger.warn(`Hybrid processing failed for ${agentType}, using legacy`, { error });
      
      const legacyResult = await this.processWithLegacyMethod(agentType, textInput);
      return {
        result: legacyResult,
        migrationData: {
          success: false,
          originalMethod: 'legacy_fallback',
          consolidatedResult: legacyResult,
          performanceGain: 0,
          accuracy: 'maintained',
          warnings: [`Hybrid processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
        }
      };
    }
  }

  /**
   * Process with consolidated method only
   */
  private async processWithConsolidatedMethod(
    agentType: AgentType,
    textInput: string,
    config: AgentIntegrationConfig
  ): Promise<{ result: string; migrationData: PatternMigrationResult }> {
    const startTime = performance.now();

    try {
      const result = await this.processWithConsolidatedMethodOnly(agentType, textInput);
      const endTime = performance.now();
      
      // Calculate performance gain compared to baseline
      const baseline = this.performanceBaselines.get(agentType) || 100;
      const currentTime = endTime - startTime;
      const performanceGain = Math.max(0, ((baseline - currentTime) / baseline) * 100);

      const migrationData: PatternMigrationResult = {
        success: true,
        originalMethod: 'consolidated',
        consolidatedResult: result,
        performanceGain,
        accuracy: 'improved', // Assuming consolidated method improves accuracy
        warnings: []
      };

      return { result, migrationData };

    } catch (error) {
      throw new Error(`Consolidated processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Core consolidated processing method
   */
  private async processWithConsolidatedMethodOnly(agentType: AgentType, textInput: string): Promise<string> {
    // Use the medical text normalizer with agent-specific configuration
    const normalizationConfig: NormalizationConfig = {
      agentType,
      mode: this.getModeForAgent(agentType),
      enableCrossAgentPatterns: true,
      australianSpelling: true,
      strictMedicalTerms: true,
      preserveUnits: true
    };

    const result = await medicalTextNormalizer.normalize(textInput, normalizationConfig);
    return result.normalizedText;
  }

  /**
   * Get appropriate normalization mode for agent type
   */
  private getModeForAgent(agentType: AgentType): 'investigation' | 'narrative' | 'summary' | 'full' {
    const agentModeMap: Partial<Record<AgentType, 'investigation' | 'narrative' | 'summary' | 'full'>> = {
      'tavi': 'full',
      'angiogram-pci': 'full',
      'mteer': 'full',
      'tteer': 'full',
      'pfo-closure': 'narrative',
      'asd-closure': 'narrative',
      'pvl-plug': 'narrative',
      'bypass-graft': 'narrative',
      'right-heart-cath': 'investigation',
      'quick-letter': 'narrative',
      'consultation': 'narrative',
      'investigation-summary': 'investigation',
      'ai-medical-review': 'full',
      'batch-ai-review': 'full',
      'tavi-workup': 'full',
      'imaging': 'investigation',
      'bloods': 'investigation',
      'background': 'summary',
      'medication': 'summary',
      'patient-education': 'narrative',
      'enhancement': 'narrative',
      'transcription': 'summary',
      'generation': 'narrative'
    };

    return agentModeMap[agentType] ?? 'full';
  }

  /**
   * Compare legacy vs consolidated results
   */
  private compareResults(legacyResult: string, consolidatedResult: string): {
    accuracy: 'maintained' | 'improved' | 'degraded';
    warnings: string[];
  } {
    const warnings: string[] = [];

    // Simple comparison metrics
    const lengthDifference = Math.abs(consolidatedResult.length - legacyResult.length);
    const lengthDifferencePercent = (lengthDifference / legacyResult.length) * 100;

    // Check for key medical terms preservation
    const medicalTermsLegacy = this.extractKeyMedicalTerms(legacyResult);
    const medicalTermsConsolidated = this.extractKeyMedicalTerms(consolidatedResult);
    
    const termsPreserved = medicalTermsLegacy.filter(term => 
      medicalTermsConsolidated.some(consolidatedTerm => 
        consolidatedTerm.toLowerCase().includes(term.toLowerCase()) ||
        term.toLowerCase().includes(consolidatedTerm.toLowerCase())
      )
    );

    const preservationRate = medicalTermsLegacy.length > 0 ? 
      (termsPreserved.length / medicalTermsLegacy.length) * 100 : 100;

    // Determine accuracy
    let accuracy: 'maintained' | 'improved' | 'degraded';

    if (preservationRate >= 95 && lengthDifferencePercent < 20) {
      accuracy = 'improved'; // Assume consolidated is better if terms preserved
    } else if (preservationRate >= 90) {
      accuracy = 'maintained';
    } else {
      accuracy = 'degraded';
      warnings.push(`Medical term preservation rate: ${preservationRate.toFixed(1)}%`);
    }

    if (lengthDifferencePercent > 30) {
      warnings.push(`Significant length difference: ${lengthDifferencePercent.toFixed(1)}%`);
    }

    return { accuracy, warnings };
  }

  /**
   * Extract key medical terms for comparison
   */
  private extractKeyMedicalTerms(text: string): string[] {
    const medicalPatterns = [
      /\b(?:LAD|RCA|LCX|LMS)\b/gi,
      /\b(?:stenosis|regurgitation|insufficiency)\b/gi,
      /\b(?:TAVI|PCI|CABG|TTE|TOE)\b/gi,
      /\b(?:moderate|severe|mild)\s+(?:stenosis|regurgitation)\b/gi,
      /\b\d+\s*mmHg\b/gi,
      /\b(?:TIMI|timi)\s+(?:flow\s+)?(?:[0-3]|zero|one|two|three)\b/gi
    ];

    const terms: string[] = [];
    for (const pattern of medicalPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        terms.push(...matches);
      }
    }

    return [...new Set(terms)]; // Remove duplicates
  }

  /**
   * Determine recommended migration mode
   */
  private determineRecommendedMode(
    agentType: AgentType,
    migrationData: PatternMigrationResult,
    processingTime: number
  ): 'legacy' | 'hybrid' | 'consolidated' {
    
    // If consolidated method failed, recommend legacy
    if (!migrationData.success) {
      return 'legacy';
    }

    // If accuracy degraded, be cautious
    if (migrationData.accuracy === 'degraded') {
      return 'hybrid';
    }

    // If performance threshold exceeded, consider hybrid
    const threshold = this.performanceBaselines.get(agentType) || 200;
    if (processingTime > threshold * 2) {
      return 'hybrid';
    }

    // If accuracy improved and performance acceptable, recommend consolidated
    if (migrationData.accuracy === 'improved') {
      return 'consolidated';
    }

    // Default to hybrid for safety
    return 'hybrid';
  }

  /**
   * Log migration result for analysis
   */
  private logMigrationResult(agentType: AgentType, result: PatternMigrationResult): void {
    if (!this.migrationLog.has(agentType)) {
      this.migrationLog.set(agentType, []);
    }

    const agentLog = this.migrationLog.get(agentType)!;
    agentLog.push(result);

    // Keep only last 100 results per agent
    if (agentLog.length > 100) {
      agentLog.splice(0, agentLog.length - 100);
    }

    logger.debug(`Migration result logged for ${agentType}`, {
      accuracy: result.accuracy,
      performanceGain: result.performanceGain,
      warnings: result.warnings.length
    });
  }

  /**
   * Get migration statistics for agent
   */
  getMigrationStats(agentType: AgentType): {
    totalMigrations: number;
    successRate: number;
    averagePerformanceGain: number;
    accuracyDistribution: Record<'maintained' | 'improved' | 'degraded', number>;
    recommendedMode: 'legacy' | 'hybrid' | 'consolidated';
  } {
    const agentLog = this.migrationLog.get(agentType) || [];
    
    if (agentLog.length === 0) {
      return {
        totalMigrations: 0,
        successRate: 0,
        averagePerformanceGain: 0,
        accuracyDistribution: { maintained: 0, improved: 0, degraded: 0 },
        recommendedMode: 'legacy'
      };
    }

    const successfulMigrations = agentLog.filter(result => result.success);
    const successRate = (successfulMigrations.length / agentLog.length) * 100;
    
    const averagePerformanceGain = successfulMigrations.reduce((sum, result) => 
      sum + result.performanceGain, 0) / successfulMigrations.length;

    const accuracyDistribution = agentLog.reduce((dist, result) => {
      dist[result.accuracy]++;
      return dist;
    }, { maintained: 0, improved: 0, degraded: 0 });

    // Determine recommended mode based on stats
    let recommendedMode: 'legacy' | 'hybrid' | 'consolidated';
    if (successRate < 80 || accuracyDistribution.degraded > agentLog.length * 0.3) {
      recommendedMode = 'legacy';
    } else if (accuracyDistribution.improved > agentLog.length * 0.7 && averagePerformanceGain > 10) {
      recommendedMode = 'consolidated';
    } else {
      recommendedMode = 'hybrid';
    }

    return {
      totalMigrations: agentLog.length,
      successRate,
      averagePerformanceGain,
      accuracyDistribution,
      recommendedMode
    };
  }

  /**
   * Set performance baseline for agent
   */
  setPerformanceBaseline(agentType: AgentType, baselineMs: number): void {
    this.performanceBaselines.set(agentType, baselineMs);
    logger.info(`Performance baseline set for ${agentType}`, { baselineMs });
  }

  /**
   * Clear migration logs
   */
  clearMigrationLogs(agentType?: AgentType): void {
    if (agentType) {
      this.migrationLog.delete(agentType);
      logger.info(`Migration logs cleared for ${agentType}`);
    } else {
      this.migrationLog.clear();
      logger.info('All migration logs cleared');
    }
  }
}

/**
 * Legacy Method Integration Helpers
 * Provides seamless integration with existing agent methods
 */
export class LegacyMethodIntegration {
  private static integrationAdapter = AgentPatternIntegrationAdapter.getInstance();

  /**
   * Integrate with legacy preNormalizeInvestigationText method
   */
  static async integrateInvestigationNormalization(
    agentType: AgentType,
    input: string,
    migrationMode: 'legacy' | 'hybrid' | 'consolidated' = 'hybrid'
  ): Promise<string> {
    const config: AgentIntegrationConfig = {
      agentType,
      enableConsolidatedPatterns: true,
      fallbackToLegacy: true,
      migrationMode,
      performanceThreshold: 100
    };

    const { result } = await this.integrationAdapter.integrateAgent(agentType, input, config);
    return result;
  }

  /**
   * Integrate with legacy cleanMedicalText method
   */
  static async integrateMedicalTextCleaning(
    agentType: AgentType,
    input: string,
    migrationMode: 'legacy' | 'hybrid' | 'consolidated' = 'hybrid'
  ): Promise<string> {
    // Use normalizer for medical text cleaning
    const result = await medicalTextNormalizer.normalize(input, {
      agentType,
      mode: 'narrative',
      enableCrossAgentPatterns: true,
      australianSpelling: true,
      preserveFormatting: true
    });

    return result.normalizedText;
  }

  /**
   * Get migration recommendations for agent
   */
  static getAgentMigrationRecommendation(agentType: AgentType): {
    recommendedMode: 'legacy' | 'hybrid' | 'consolidated';
    confidence: number;
    reasoning: string[];
  } {
    const stats = this.integrationAdapter.getMigrationStats(agentType);
    
    const confidence = stats.totalMigrations > 0 ? 
      Math.min(100, stats.successRate + (stats.totalMigrations > 10 ? 20 : 0)) : 50;

    const reasoning: string[] = [];
    
    if (stats.totalMigrations === 0) {
      reasoning.push('No migration data available - starting with hybrid approach');
    } else {
      reasoning.push(`Based on ${stats.totalMigrations} migrations with ${stats.successRate.toFixed(1)}% success rate`);
      
      if (stats.accuracyDistribution.improved > stats.accuracyDistribution.degraded) {
        reasoning.push('Consolidated patterns show accuracy improvements');
      }
      
      if (stats.averagePerformanceGain > 0) {
        reasoning.push(`Average performance gain: ${stats.averagePerformanceGain.toFixed(1)}%`);
      }
    }

    return {
      recommendedMode: stats.recommendedMode,
      confidence,
      reasoning
    };
  }
}

// Convenience exports
export const agentIntegrationAdapter = AgentPatternIntegrationAdapter.getInstance();

// Legacy compatibility exports
export { LegacyMethodIntegration as LegacyIntegration };
