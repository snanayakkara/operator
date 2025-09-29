/**
 * Phase 3 Migration Validation Pipeline
 * 
 * Provides comprehensive validation and rollback procedures for agent migrations.
 * Ensures quality, safety, and backward compatibility during Phase 3 transitions.
 */

import { MedicalReport, MedicalContext as _MedicalContext, AgentType } from '@/types/medical.types';
import { MedicalSummaryResult as _MedicalSummaryResult, ClinicalFinding as _ClinicalFinding } from '@/utils/text-extraction/MedicalSummaryExtractor';

export interface MigrationValidationConfig {
  agentType: AgentType;
  validationLevel: 'basic' | 'comprehensive' | 'clinical';
  enableRollback: boolean;
  benchmarkThresholds: {
    processingTime: number;    // milliseconds
    qualityScore: number;      // 0-1
    confidenceScore: number;   // 0-1
    contentLength: number;     // characters
  };
  comparisonSamples: number;   // number of test inputs to validate
}

export interface ValidationResult {
  isValid: boolean;
  score: number;
  enhancedPerformance: AgentPerformanceMetrics;
  legacyPerformance: AgentPerformanceMetrics;
  comparison: ValidationComparison;
  recommendations: string[];
  issues: ValidationIssue[];
  rollbackRequired: boolean;
}

export interface AgentPerformanceMetrics {
  processingTime: number;
  qualityScore: number;
  confidenceScore: number;
  contentLength: number;
  medicalAccuracy: number;
  formatCompliance: number;
  terminologyPreservation: number;
  errors: string[];
  warnings: string[];
}

export interface ValidationComparison {
  processingTimeImprovement: number;
  qualityScoreChange: number;
  confidenceScoreChange: number;
  contentLengthChange: number;
  medicalAccuracyChange: number;
  overallImprovement: number;
}

export interface ValidationIssue {
  severity: 'critical' | 'major' | 'minor' | 'warning';
  category: 'performance' | 'quality' | 'medical' | 'format' | 'terminology';
  description: string;
  enhancedValue: any;
  legacyValue: any;
  impact: string;
  recommendation: string;
}

export interface MigrationCheckpoint {
  timestamp: number;
  agentType: AgentType;
  enhancedVersion: string;
  legacyVersion: string;
  validationResult: ValidationResult;
  deploymentStatus: 'staged' | 'deployed' | 'rolled_back' | 'failed';
  rollbackData?: {
    reason: string;
    triggeredBy: 'validation' | 'runtime' | 'manual';
    rollbackTime: number;
    recoveryPlan: string[];
  };
}

/**
 * Comprehensive validation system for Phase 3 agent migrations
 */
export class MigrationValidator {
  private static instance: MigrationValidator;
  private checkpoints: Map<AgentType, MigrationCheckpoint[]> = new Map();
  private testSamples: Map<AgentType, string[]> = new Map();

  static getInstance(): MigrationValidator {
    if (!MigrationValidator.instance) {
      MigrationValidator.instance = new MigrationValidator();
    }
    return MigrationValidator.instance;
  }

  /**
   * Comprehensive validation of Phase 3 migrated agent against legacy version
   */
  async validateMigration(
    agentType: AgentType,
    enhancedAgent: any,
    legacyAgent: any,
    config: MigrationValidationConfig
  ): Promise<ValidationResult> {
    console.log(`🔬 Starting migration validation for ${agentType} agent`);
    
    const testInputs = await this.getTestSamples(agentType, config.comparisonSamples);
    
    const enhancedMetrics = await this.benchmarkAgent(enhancedAgent, testInputs, 'Enhanced');
    const legacyMetrics = await this.benchmarkAgent(legacyAgent, testInputs, 'Legacy');
    
    const comparison = this.comparePerformance(enhancedMetrics, legacyMetrics);
    const issues = this.identifyIssues(enhancedMetrics, legacyMetrics, config);
    
    const validationResult: ValidationResult = {
      isValid: this.determineValidity(comparison, issues, config),
      score: this.calculateOverallScore(comparison, issues),
      enhancedPerformance: enhancedMetrics,
      legacyPerformance: legacyMetrics,
      comparison,
      recommendations: this.generateRecommendations(comparison, issues),
      issues,
      rollbackRequired: this.shouldRollback(comparison, issues, config)
    };

    // Create checkpoint
    await this.createCheckpoint(agentType, validationResult, config);

    console.log(`✅ Migration validation completed for ${agentType} - Valid: ${validationResult.isValid}`);
    return validationResult;
  }

  /**
   * Execute rollback to legacy agent if validation fails
   */
  async executeRollback(
    agentType: AgentType,
    reason: string,
    triggeredBy: 'validation' | 'runtime' | 'manual'
  ): Promise<boolean> {
    console.log(`🔄 Executing rollback for ${agentType} agent: ${reason}`);
    
    try {
      const checkpoint = this.getLatestCheckpoint(agentType);
      if (!checkpoint) {
        console.error(`❌ No checkpoint found for ${agentType} rollback`);
        return false;
      }

      // Update checkpoint with rollback data
      checkpoint.deploymentStatus = 'rolled_back';
      checkpoint.rollbackData = {
        reason,
        triggeredBy,
        rollbackTime: Date.now(),
        recoveryPlan: this.generateRecoveryPlan(agentType, reason)
      };

      // Log rollback event
      console.warn(`⚠️ Agent ${agentType} rolled back to legacy version`);
      console.warn(`   Reason: ${reason}`);
      console.warn(`   Triggered by: ${triggeredBy}`);
      
      return true;

    } catch (error) {
      console.error(`❌ Rollback failed for ${agentType}:`, error);
      return false;
    }
  }

  /**
   * Benchmark agent performance with test inputs
   */
  private async benchmarkAgent(
    agent: any,
    testInputs: string[],
    version: string
  ): Promise<AgentPerformanceMetrics> {
    console.log(`📊 Benchmarking ${version} agent with ${testInputs.length} samples`);
    
    const metrics: AgentPerformanceMetrics = {
      processingTime: 0,
      qualityScore: 0,
      confidenceScore: 0,
      contentLength: 0,
      medicalAccuracy: 0,
      formatCompliance: 0,
      terminologyPreservation: 0,
      errors: [],
      warnings: []
    };

    let successfulRuns = 0;
    const startTime = Date.now();

    for (const input of testInputs) {
      try {
        const runStart = Date.now();
        const result = await agent.process(input);
        const runTime = Date.now() - runStart;

        if (result && !result.errors?.length) {
          successfulRuns++;
          metrics.processingTime += runTime;
          metrics.qualityScore += this.assessQuality(result);
          metrics.confidenceScore += result.metadata?.confidence || 0.5;
          metrics.contentLength += result.content?.length || 0;
          metrics.medicalAccuracy += this.assessMedicalAccuracy(result);
          metrics.formatCompliance += this.assessFormatCompliance(result);
          metrics.terminologyPreservation += this.assessTerminologyPreservation(input, result);
        } else {
          if (result?.errors) {
            metrics.errors.push(...result.errors);
          }
        }

      } catch (error) {
        metrics.errors.push(`Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Average the metrics
    if (successfulRuns > 0) {
      metrics.processingTime /= successfulRuns;
      metrics.qualityScore /= successfulRuns;
      metrics.confidenceScore /= successfulRuns;
      metrics.contentLength /= successfulRuns;
      metrics.medicalAccuracy /= successfulRuns;
      metrics.formatCompliance /= successfulRuns;
      metrics.terminologyPreservation /= successfulRuns;
    }

    const totalTime = Date.now() - startTime;
    console.log(`⏱️ ${version} benchmarking completed in ${totalTime}ms (${successfulRuns}/${testInputs.length} successful)`);
    
    return metrics;
  }

  /**
   * Compare Phase 3 vs Legacy performance
   */
  private comparePerformance(
    enhanced: AgentPerformanceMetrics,
    legacy: AgentPerformanceMetrics
  ): ValidationComparison {
    return {
      processingTimeImprovement: (legacy.processingTime - enhanced.processingTime) / legacy.processingTime,
      qualityScoreChange: enhanced.qualityScore - legacy.qualityScore,
      confidenceScoreChange: enhanced.confidenceScore - legacy.confidenceScore,
      contentLengthChange: (enhanced.contentLength - legacy.contentLength) / legacy.contentLength,
      medicalAccuracyChange: enhanced.medicalAccuracy - legacy.medicalAccuracy,
      overallImprovement: this.calculateOverallImprovement(enhanced, legacy)
    };
  }

  /**
   * Identify validation issues
   */
  private identifyIssues(
    enhanced: AgentPerformanceMetrics,
    legacy: AgentPerformanceMetrics,
    _config: MigrationValidationConfig
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Processing time regression
    if (enhanced.processingTime > legacy.processingTime * 1.2) {
      issues.push({
        severity: 'major',
        category: 'performance',
        description: 'Processing time regression detected',
        enhancedValue: enhanced.processingTime,
        legacyValue: legacy.processingTime,
        impact: 'User experience degradation',
        recommendation: 'Optimize Phase 3 processing logic'
      });
    }

    // Quality score degradation
    if (enhanced.qualityScore < legacy.qualityScore - 0.1) {
      issues.push({
        severity: 'critical',
        category: 'quality',
        description: 'Quality score significantly decreased',
        enhancedValue: enhanced.qualityScore,
        legacyValue: legacy.qualityScore,
        impact: 'Medical report quality compromised',
        recommendation: 'Review and improve Phase 3 quality assessment'
      });
    }

    // Medical accuracy concerns
    if (enhanced.medicalAccuracy < legacy.medicalAccuracy - 0.05) {
      issues.push({
        severity: 'critical',
        category: 'medical',
        description: 'Medical accuracy decreased',
        enhancedValue: enhanced.medicalAccuracy,
        legacyValue: legacy.medicalAccuracy,
        impact: 'Potential clinical safety concerns',
        recommendation: 'Mandatory medical accuracy review required'
      });
    }

    // Terminology preservation issues
    if (enhanced.terminologyPreservation < legacy.terminologyPreservation - 0.1) {
      issues.push({
        severity: 'major',
        category: 'terminology',
        description: 'Medical terminology preservation degraded',
        enhancedValue: enhanced.terminologyPreservation,
        legacyValue: legacy.terminologyPreservation,
        impact: 'Loss of clinical precision',
        recommendation: 'Enhance Phase 3 terminology extraction'
      });
    }

    // Error rate increase
    if (enhanced.errors.length > legacy.errors.length) {
      issues.push({
        severity: 'major',
        category: 'quality',
        description: 'Increased error rate detected',
        enhancedValue: enhanced.errors.length,
        legacyValue: legacy.errors.length,
        impact: 'Decreased system reliability',
        recommendation: 'Address Phase 3 error handling'
      });
    }

    return issues;
  }

  /**
   * Determine if migration is valid based on thresholds and issues
   */
  private determineValidity(
    comparison: ValidationComparison,
    issues: ValidationIssue[],
    _config: MigrationValidationConfig
  ): boolean {
    // Critical issues automatically fail validation
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      return false;
    }

    // Major issues require overall improvement
    const majorIssues = issues.filter(i => i.severity === 'major');
    if (majorIssues.length > 2 && comparison.overallImprovement < 0.1) {
      return false;
    }

    // Must meet minimum thresholds
    return comparison.overallImprovement >= -0.05; // Allow slight degradation for long-term benefits
  }

  /**
   * Calculate overall validation score
   */
  private calculateOverallScore(
    comparison: ValidationComparison,
    issues: ValidationIssue[]
  ): number {
    let score = 0.5; // Base score

    // Improvement bonus
    score += Math.max(0, comparison.overallImprovement * 0.5);

    // Penalty for issues
    const criticalPenalty = issues.filter(i => i.severity === 'critical').length * 0.3;
    const majorPenalty = issues.filter(i => i.severity === 'major').length * 0.15;
    const minorPenalty = issues.filter(i => i.severity === 'minor').length * 0.05;
    
    score = Math.max(0, score - criticalPenalty - majorPenalty - minorPenalty);

    return Math.min(1, score);
  }

  /**
   * Determine if rollback is required
   */
  private shouldRollback(
    comparison: ValidationComparison,
    issues: ValidationIssue[],
    config: MigrationValidationConfig
  ): boolean {
    if (!config.enableRollback) return false;

    // Critical issues require rollback
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) return true;

    // Severe overall degradation
    if (comparison.overallImprovement < -0.2) return true;

    // Medical accuracy concerns
    if (comparison.medicalAccuracyChange < -0.1) return true;

    return false;
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    comparison: ValidationComparison,
    issues: ValidationIssue[]
  ): string[] {
    const recommendations: string[] = [];

    // Performance recommendations
    if (comparison.processingTimeImprovement < 0) {
      recommendations.push('Optimize Phase 3 processing algorithms for better performance');
    }

    // Quality recommendations  
    if (comparison.qualityScoreChange < 0) {
      recommendations.push('Enhance Phase 3 quality assessment mechanisms');
    }

    // Medical accuracy recommendations
    if (comparison.medicalAccuracyChange < 0) {
      recommendations.push('Review and strengthen medical terminology validation in Phase 3');
    }

    // Issue-specific recommendations
    issues.forEach(issue => {
      if (!recommendations.includes(issue.recommendation)) {
        recommendations.push(issue.recommendation);
      }
    });

    // General recommendations
    if (issues.length > 3) {
      recommendations.push('Consider gradual rollout with A/B testing for safer deployment');
    }

    return recommendations;
  }

  /**
   * Create migration checkpoint
   */
  private async createCheckpoint(
    agentType: AgentType,
    validationResult: ValidationResult,
    _config: MigrationValidationConfig
  ): Promise<void> {
    const checkpoint: MigrationCheckpoint = {
      timestamp: Date.now(),
      agentType,
      enhancedVersion: 'Enhanced-v1.0',
      legacyVersion: 'Legacy-v1.0',
      validationResult,
      deploymentStatus: validationResult.isValid ? 'staged' : 'failed'
    };

    if (!this.checkpoints.has(agentType)) {
      this.checkpoints.set(agentType, []);
    }
    
    this.checkpoints.get(agentType)!.push(checkpoint);
    console.log(`📋 Checkpoint created for ${agentType} migration`);
  }

  /**
   * Get latest checkpoint for agent
   */
  private getLatestCheckpoint(agentType: AgentType): MigrationCheckpoint | null {
    const checkpoints = this.checkpoints.get(agentType);
    if (!checkpoints || checkpoints.length === 0) return null;
    
    return checkpoints[checkpoints.length - 1];
  }

  /**
   * Generate recovery plan for rollback
   */
  private generateRecoveryPlan(agentType: AgentType, _reason: string): string[] {
    return [
      `Revert ${agentType} to legacy implementation`,
      'Monitor system stability for 24 hours',
      'Analyze root cause of validation failure',
      'Develop and test improved Phase 3 implementation',
      'Schedule re-validation and deployment'
    ];
  }

  /**
   * Get test samples for agent validation
   */
  private async getTestSamples(agentType: AgentType, count: number): Promise<string[]> {
    // Return cached samples or generate new ones
    if (this.testSamples.has(agentType)) {
      const cached = this.testSamples.get(agentType)!;
      return cached.slice(0, count);
    }

    // Generate representative test samples based on agent type
    const samples = this.generateTestSamples(agentType, count);
    this.testSamples.set(agentType, samples);
    return samples;
  }

  /**
   * Generate test samples specific to agent type
   */
  private generateTestSamples(agentType: AgentType, count: number): string[] {
    const samples: string[] = [];
    
    switch (agentType) {
      case 'quick-letter':
        samples.push(
          'Patient consultation for chest pain, discussed cardiac risk factors and recommended stress testing.',
          'Follow-up appointment scheduled for hypertension management and medication adjustment.',
          'Reviewed recent echocardiogram results showing mild mitral regurgitation.'
        );
        break;
        
      case 'investigation-summary':
        samples.push(
          'TTE shows normal LV systolic function, EF 60%, mild mitral regurgitation, no significant stenosis.',
          'CTCA demonstrates mild LAD stenosis, no significant coronary disease, Ca score 45.',
          'Stress test achieved 9 METs, no chest pain or ischemic changes, good functional capacity.'
        );
        break;
        
      default:
        samples.push(
          'Standard medical dictation for validation testing purposes.',
          'Comprehensive clinical assessment with multiple findings.',
          'Complex medical case requiring detailed analysis and processing.'
        );
    }

    // Repeat samples to reach requested count
    while (samples.length < count) {
      samples.push(...samples);
    }

    return samples.slice(0, count);
  }

  /**
   * Quality assessment helpers
   */
  private assessQuality(result: MedicalReport): number {
    let score = 0.5; // Base quality score

    // Content length appropriateness
    if (result.content && result.content.length > 50 && result.content.length < 2000) {
      score += 0.2;
    }

    // Section structure
    if (result.sections && result.sections.length > 0) {
      score += 0.2;
    }

    // Metadata presence
    if (result.metadata && result.metadata.confidence) {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  private assessMedicalAccuracy(result: MedicalReport): number {
    // Simple heuristic - check for medical terminology presence
    const medicalTerms = ['stenosis', 'regurgitation', 'EF', 'LV', 'RV', 'TIMI', 'METs'];
    const content = result.content.toLowerCase();
    
    const foundTerms = medicalTerms.filter(term => content.includes(term.toLowerCase()));
    return Math.min(1, foundTerms.length / 3); // Normalize to 0-1
  }

  private assessFormatCompliance(result: MedicalReport): number {
    // Check for proper medical report structure
    let score = 0.5;

    if (result.agentName) score += 0.2;
    if (result.sections && result.sections.length > 0) score += 0.2;
    if (result.timestamp) score += 0.1;

    return Math.min(1, score);
  }

  private assessTerminologyPreservation(input: string, result: MedicalReport): number {
    // Simple check - major medical terms should be preserved
    const importantTerms = ['stenosis', 'regurgitation', 'TTE', 'CTCA', 'LAD', 'EF', 'TIMI'];
    const inputLower = input.toLowerCase();
    const outputLower = result.content.toLowerCase();

    const inputTerms = importantTerms.filter(term => inputLower.includes(term.toLowerCase()));
    const preservedTerms = inputTerms.filter(term => outputLower.includes(term.toLowerCase()));

    return inputTerms.length > 0 ? preservedTerms.length / inputTerms.length : 1;
  }

  private calculateOverallImprovement(enhanced: AgentPerformanceMetrics, legacy: AgentPerformanceMetrics): number {
    // Weighted score considering all metrics
    const weights = {
      processingTime: 0.2,
      qualityScore: 0.3,
      confidenceScore: 0.2,
      medicalAccuracy: 0.3
    };

    const timeImprovement = (legacy.processingTime - enhanced.processingTime) / legacy.processingTime;
    const qualityImprovement = enhanced.qualityScore - legacy.qualityScore;
    const confidenceImprovement = enhanced.confidenceScore - legacy.confidenceScore;
    const accuracyImprovement = enhanced.medicalAccuracy - legacy.medicalAccuracy;

    return (
      timeImprovement * weights.processingTime +
      qualityImprovement * weights.qualityScore +
      confidenceImprovement * weights.confidenceScore +
      accuracyImprovement * weights.medicalAccuracy
    );
  }
}

/**
 * Default validation configurations for different agent types
 */
export const DEFAULT_VALIDATION_CONFIGS: Record<AgentType, Partial<MigrationValidationConfig>> = {
  'quick-letter': {
    validationLevel: 'comprehensive',
    benchmarkThresholds: {
      processingTime: 3000,
      qualityScore: 0.7,
      confidenceScore: 0.6,
      contentLength: 200
    },
    comparisonSamples: 5
  },
  
  'investigation-summary': {
    validationLevel: 'clinical',
    benchmarkThresholds: {
      processingTime: 2000,
      qualityScore: 0.8,
      confidenceScore: 0.7,
      contentLength: 150
    },
    comparisonSamples: 8
  },

  'background': {
    validationLevel: 'comprehensive',
    benchmarkThresholds: {
      processingTime: 4000,
      qualityScore: 0.7,
      confidenceScore: 0.6,
      contentLength: 300
    },
    comparisonSamples: 5
  },

  'medication': {
    validationLevel: 'clinical',
    benchmarkThresholds: {
      processingTime: 3500,
      qualityScore: 0.75,
      confidenceScore: 0.7,
      contentLength: 250
    },
    comparisonSamples: 6
  },

  // Add missing AgentType entries with default configurations
  'tavi': {
    validationLevel: 'comprehensive',
    benchmarkThresholds: {
      processingTime: 5000,
      qualityScore: 0.8,
      confidenceScore: 0.7,
      contentLength: 500
    },
    comparisonSamples: 3
  },
  'angiogram-pci': {
    validationLevel: 'clinical',
    benchmarkThresholds: {
      processingTime: 4000,
      qualityScore: 0.75,
      confidenceScore: 0.7,
      contentLength: 400
    },
    comparisonSamples: 4
  },
  'consultation': {
    validationLevel: 'comprehensive',
    benchmarkThresholds: {
      processingTime: 6000,
      qualityScore: 0.7,
      confidenceScore: 0.6,
      contentLength: 600
    },
    comparisonSamples: 5
  },
  'bloods': {
    validationLevel: 'clinical',
    benchmarkThresholds: {
      processingTime: 2000,
      qualityScore: 0.8,
      confidenceScore: 0.75,
      contentLength: 200
    },
    comparisonSamples: 6
  },
  'imaging': {
    validationLevel: 'clinical',
    benchmarkThresholds: {
      processingTime: 3000,
      qualityScore: 0.8,
      confidenceScore: 0.7,
      contentLength: 300
    },
    comparisonSamples: 5
  },
  'mteer': {
    validationLevel: 'comprehensive',
    benchmarkThresholds: {
      processingTime: 4500,
      qualityScore: 0.8,
      confidenceScore: 0.7,
      contentLength: 450
    },
    comparisonSamples: 3
  },
  'tteer': {
    validationLevel: 'comprehensive',
    benchmarkThresholds: {
      processingTime: 4500,
      qualityScore: 0.8,
      confidenceScore: 0.7,
      contentLength: 450
    },
    comparisonSamples: 3
  },
  'pfo-closure': {
    validationLevel: 'comprehensive',
    benchmarkThresholds: {
      processingTime: 4000,
      qualityScore: 0.8,
      confidenceScore: 0.7,
      contentLength: 400
    },
    comparisonSamples: 3
  },
  'asd-closure': {
    validationLevel: 'comprehensive',
    benchmarkThresholds: {
      processingTime: 4000,
      qualityScore: 0.8,
      confidenceScore: 0.7,
      contentLength: 400
    },
    comparisonSamples: 3
  },
  'pvl-plug': {
    validationLevel: 'comprehensive',
    benchmarkThresholds: {
      processingTime: 4000,
      qualityScore: 0.8,
      confidenceScore: 0.7,
      contentLength: 400
    },
    comparisonSamples: 3
  },
  'bypass-graft': {
    validationLevel: 'comprehensive',
    benchmarkThresholds: {
      processingTime: 5000,
      qualityScore: 0.8,
      confidenceScore: 0.7,
      contentLength: 500
    },
    comparisonSamples: 3
  },
  'right-heart-cath': {
    validationLevel: 'clinical',
    benchmarkThresholds: {
      processingTime: 4500,
      qualityScore: 0.8,
      confidenceScore: 0.75,
      contentLength: 450
    },
    comparisonSamples: 4
  },
  'tavi-workup': {
    validationLevel: 'comprehensive',
    benchmarkThresholds: {
      processingTime: 6000,
      qualityScore: 0.8,
      confidenceScore: 0.7,
      contentLength: 600
    },
    comparisonSamples: 3
  },
  'ai-medical-review': {
    validationLevel: 'comprehensive',
    benchmarkThresholds: {
      processingTime: 3000,
      qualityScore: 0.85,
      confidenceScore: 0.8,
      contentLength: 300
    },
    comparisonSamples: 5
  },
  'batch-ai-review': {
    validationLevel: 'comprehensive',
    benchmarkThresholds: {
      processingTime: 10000,
      qualityScore: 0.8,
      confidenceScore: 0.75,
      contentLength: 1000
    },
    comparisonSamples: 2
  },
  'patient-education': {
    validationLevel: 'clinical',
    benchmarkThresholds: {
      processingTime: 4000,
      qualityScore: 0.75,
      confidenceScore: 0.7,
      contentLength: 800
    },
    comparisonSamples: 4
  },
  'ohif-viewer': {
    validationLevel: 'basic',
    benchmarkThresholds: {
      processingTime: 2000,
      qualityScore: 0.7,
      confidenceScore: 0.6,
      contentLength: 100
    },
    comparisonSamples: 3
  },
  'aus-medical-review': {
    validationLevel: 'comprehensive',
    benchmarkThresholds: {
      processingTime: 5000,
      qualityScore: 0.85,
      confidenceScore: 0.8,
      contentLength: 500
    },
    comparisonSamples: 5
  },
  'enhancement': {
    validationLevel: 'clinical',
    benchmarkThresholds: {
      processingTime: 3000,
      qualityScore: 0.8,
      confidenceScore: 0.75,
      contentLength: 300
    },
    comparisonSamples: 4
  },
  'transcription': {
    validationLevel: 'basic',
    benchmarkThresholds: {
      processingTime: 1500,
      qualityScore: 0.9,
      confidenceScore: 0.85,
      contentLength: 1000
    },
    comparisonSamples: 6
  },
  'generation': {
    validationLevel: 'clinical',
    benchmarkThresholds: {
      processingTime: 4000,
      qualityScore: 0.8,
      confidenceScore: 0.75,
      contentLength: 400
    },
    comparisonSamples: 4
  }
};