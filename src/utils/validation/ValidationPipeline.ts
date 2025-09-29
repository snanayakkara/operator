/**
 * Phase 3 Migration Validation Pipeline
 * 
 * Orchestrates comprehensive validation and rollback procedures across all Phase 3 migrations.
 * Provides automated testing, safety monitoring, and deployment coordination.
 */

import { MigrationValidator, ValidationResult, MigrationValidationConfig, DEFAULT_VALIDATION_CONFIGS } from './MigrationValidator';
import { AgentType } from '@/types/medical.types';
import { QuickLetterAgent as _QuickLetterAgent } from '@/agents/specialized/QuickLetterAgent';
import { InvestigationSummaryAgent as _InvestigationSummaryAgent } from '@/agents/specialized/InvestigationSummaryAgent';

export interface ValidationPipelineConfig {
  enableParallelValidation: boolean;
  maxConcurrentValidations: number;
  enableAutomaticRollback: boolean;
  rollbackThreshold: number; // 0-1, minimum score to avoid rollback
  notificationConfig: {
    enableSlack: boolean;
    enableEmail: boolean;
    criticalIssuesOnly: boolean;
  };
  validationSchedule: {
    preDeployment: boolean;
    postDeployment: boolean;
    intervalMinutes?: number; // For continuous monitoring
  };
}

export interface PipelineResult {
  success: boolean;
  totalValidations: number;
  passedValidations: number;
  failedValidations: number;
  rollbacksExecuted: number;
  validationResults: Map<AgentType, ValidationResult>;
  overallScore: number;
  recommendations: string[];
  nextActions: string[];
}

export interface ValidationJob {
  agentType: AgentType;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'rolled_back';
  startTime?: number;
  endTime?: number;
  result?: ValidationResult;
  error?: string;
}

/**
 * Comprehensive validation pipeline for Phase 3 agent migrations
 */
export class ValidationPipeline {
  private static instance: ValidationPipeline;
  private migrationValidator: MigrationValidator;
  private activeJobs: Map<AgentType, ValidationJob> = new Map();
  private pipelineConfig: ValidationPipelineConfig;

  constructor(config: ValidationPipelineConfig) {
    this.migrationValidator = MigrationValidator.getInstance();
    this.pipelineConfig = config;
  }

  static getInstance(config?: ValidationPipelineConfig): ValidationPipeline {
    if (!ValidationPipeline.instance) {
      ValidationPipeline.instance = new ValidationPipeline(
        config || ValidationPipeline.getDefaultConfig()
      );
    }
    return ValidationPipeline.instance;
  }

  /**
   * Execute comprehensive validation pipeline for all migrated agents
   */
  async runFullPipeline(): Promise<PipelineResult> {
    console.log('🚀 Starting comprehensive Phase 3 validation pipeline');
    
    const startTime = Date.now();
    const migratedAgents: AgentType[] = ['quick-letter', 'investigation-summary'];
    
    const pipelineResult: PipelineResult = {
      success: true,
      totalValidations: migratedAgents.length,
      passedValidations: 0,
      failedValidations: 0,
      rollbacksExecuted: 0,
      validationResults: new Map(),
      overallScore: 0,
      recommendations: [],
      nextActions: []
    };

    try {
      // Initialize validation jobs
      this.initializeJobs(migratedAgents);

      // Execute validations (parallel or sequential based on config)
      if (this.pipelineConfig.enableParallelValidation) {
        await this.runParallelValidations(migratedAgents, pipelineResult);
      } else {
        await this.runSequentialValidations(migratedAgents, pipelineResult);
      }

      // Process results and determine next actions
      this.processResults(pipelineResult);
      
      const totalTime = Date.now() - startTime;
      console.log(`✅ Validation pipeline completed in ${totalTime}ms`);
      console.log(`📊 Results: ${pipelineResult.passedValidations}/${pipelineResult.totalValidations} passed, ${pipelineResult.rollbacksExecuted} rollbacks`);

      return pipelineResult;

    } catch (error) {
      console.error('❌ Validation pipeline failed:', error);
      pipelineResult.success = false;
      pipelineResult.nextActions.push('Investigate pipeline failure and retry');
      return pipelineResult;
    }
  }

  /**
   * Validate specific agent migration
   */
  async validateAgent(agentType: AgentType): Promise<ValidationResult> {
    console.log(`🔬 Validating ${agentType} agent migration`);
    
    const job: ValidationJob = {
      agentType,
      status: 'running',
      startTime: Date.now()
    };
    
    this.activeJobs.set(agentType, job);

    try {
      const { enhancedAgent, legacyAgent } = await this.getAgentPair(agentType);
      const config = this.getValidationConfig(agentType);
      
      const result = await this.migrationValidator.validateMigration(
        agentType,
        enhancedAgent,
        legacyAgent,
        config
      );

      job.result = result;
      job.status = 'completed';
      job.endTime = Date.now();

      // Execute automatic rollback if required
      if (result.rollbackRequired && this.pipelineConfig.enableAutomaticRollback) {
        await this.executeRollback(agentType, 'Automatic rollback due to validation failure');
        job.status = 'rolled_back';
      }

      return result;

    } catch (error) {
      job.error = error instanceof Error ? error.message : 'Unknown validation error';
      job.status = 'failed';
      job.endTime = Date.now();
      
      console.error(`❌ Validation failed for ${agentType}:`, error);
      throw error;
    }
  }

  /**
   * Execute rollback for specific agent
   */
  async executeRollback(agentType: AgentType, reason: string): Promise<boolean> {
    console.log(`🔄 Executing rollback for ${agentType}: ${reason}`);
    
    try {
      const success = await this.migrationValidator.executeRollback(
        agentType,
        reason,
        'validation'
      );

      if (success) {
        // Update job status
        const job = this.activeJobs.get(agentType);
        if (job) {
          job.status = 'rolled_back';
        }

        // Send notifications
        await this.sendNotification(
          'rollback',
          `Agent ${agentType} has been rolled back: ${reason}`,
          'critical'
        );
      }

      return success;

    } catch (error) {
      console.error(`❌ Rollback failed for ${agentType}:`, error);
      return false;
    }
  }

  /**
   * Start continuous monitoring of deployed agents
   */
  async startContinuousMonitoring(): Promise<void> {
    if (!this.pipelineConfig.validationSchedule.intervalMinutes) {
      console.log('📊 Continuous monitoring disabled - no interval configured');
      return;
    }

    const intervalMs = this.pipelineConfig.validationSchedule.intervalMinutes * 60 * 1000;
    
    console.log(`📊 Starting continuous validation monitoring (${this.pipelineConfig.validationSchedule.intervalMinutes}min intervals)`);
    
    setInterval(async () => {
      try {
        console.log('🔄 Running scheduled validation check');
        await this.runHealthCheck();
      } catch (error) {
        console.error('❌ Scheduled validation check failed:', error);
      }
    }, intervalMs);
  }

  /**
   * Run health check on deployed Phase 3 agents
   */
  private async runHealthCheck(): Promise<void> {
    const deployedAgents: AgentType[] = ['quick-letter', 'investigation-summary'];
    
    for (const agentType of deployedAgents) {
      try {
        const quickResult = await this.runQuickValidation(agentType);
        
        if (!quickResult.isValid && quickResult.score < this.pipelineConfig.rollbackThreshold) {
          console.warn(`⚠️ Health check failed for ${agentType} - considering rollback`);
          
          if (this.pipelineConfig.enableAutomaticRollback) {
            await this.executeRollback(agentType, `Health check failure - score: ${quickResult.score}`);
          } else {
            await this.sendNotification(
              'health_check_failure',
              `Agent ${agentType} failing health checks - manual review required`,
              'warning'
            );
          }
        }
        
      } catch (error) {
        console.error(`❌ Health check failed for ${agentType}:`, error);
      }
    }
  }

  /**
   * Quick validation for continuous monitoring
   */
  private async runQuickValidation(agentType: AgentType): Promise<ValidationResult> {
    const { enhancedAgent } = await this.getAgentPair(agentType);
    const testInput = 'Quick health check validation input for continuous monitoring';
    
    const startTime = Date.now();
    
    try {
      const result = await enhancedAgent.process(testInput);
      const processingTime = Date.now() - startTime;
      
      // Simplified validation result
      return {
        isValid: !result.errors || result.errors.length === 0,
        score: result.metadata?.confidence || 0.5,
        enhancedPerformance: {
          processingTime,
          qualityScore: result.metadata?.confidence || 0.5,
          confidenceScore: result.metadata?.confidence || 0.5,
          contentLength: result.content?.length || 0,
          medicalAccuracy: 0.8, // Simplified
          formatCompliance: 0.8,
          terminologyPreservation: 0.8,
          errors: result.errors || [],
          warnings: []
        },
        legacyPerformance: {} as any, // Not needed for health check
        comparison: {
          processingTimeImprovement: 0,
          qualityScoreChange: 0,
          confidenceScoreChange: 0,
          contentLengthChange: 0,
          medicalAccuracyChange: 0,
          overallImprovement: 0
        },
        recommendations: [],
        issues: [],
        rollbackRequired: false
      };
      
    } catch (error) {
      return {
        isValid: false,
        score: 0,
        enhancedPerformance: {} as any,
        legacyPerformance: {} as any,
        comparison: {} as any,
        recommendations: ['Agent health check failed - investigate immediately'],
        issues: [{
          severity: 'critical',
          category: 'performance',
          description: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          enhancedValue: null,
          legacyValue: null,
          impact: 'Agent may be unavailable',
          recommendation: 'Investigate error and consider rollback'
        }],
        rollbackRequired: true
      };
    }
  }

  /**
   * Initialize validation jobs for tracking
   */
  private initializeJobs(agentTypes: AgentType[]): void {
    agentTypes.forEach(agentType => {
      this.activeJobs.set(agentType, {
        agentType,
        status: 'queued'
      });
    });
  }

  /**
   * Run validations in parallel
   */
  private async runParallelValidations(
    agentTypes: AgentType[],
    pipelineResult: PipelineResult
  ): Promise<void> {
    const maxConcurrent = Math.min(
      this.pipelineConfig.maxConcurrentValidations,
      agentTypes.length
    );
    
    console.log(`🔀 Running parallel validations (max ${maxConcurrent} concurrent)`);
    
    // Create chunks for concurrent processing
    const chunks: AgentType[][] = [];
    for (let i = 0; i < agentTypes.length; i += maxConcurrent) {
      chunks.push(agentTypes.slice(i, i + maxConcurrent));
    }

    for (const chunk of chunks) {
      const promises = chunk.map(async (agentType) => {
        try {
          const result = await this.validateAgent(agentType);
          pipelineResult.validationResults.set(agentType, result);
          
          if (result.isValid) {
            pipelineResult.passedValidations++;
          } else {
            pipelineResult.failedValidations++;
          }

          if (result.rollbackRequired) {
            pipelineResult.rollbacksExecuted++;
          }
          
        } catch (error) {
          pipelineResult.failedValidations++;
          console.error(`❌ Validation failed for ${agentType}:`, error);
        }
      });

      await Promise.all(promises);
    }
  }

  /**
   * Run validations sequentially
   */
  private async runSequentialValidations(
    agentTypes: AgentType[],
    pipelineResult: PipelineResult
  ): Promise<void> {
    console.log('🔄 Running sequential validations');
    
    for (const agentType of agentTypes) {
      try {
        const result = await this.validateAgent(agentType);
        pipelineResult.validationResults.set(agentType, result);
        
        if (result.isValid) {
          pipelineResult.passedValidations++;
        } else {
          pipelineResult.failedValidations++;
        }

        if (result.rollbackRequired) {
          pipelineResult.rollbacksExecuted++;
        }
        
      } catch (error) {
        pipelineResult.failedValidations++;
        console.error(`❌ Validation failed for ${agentType}:`, error);
      }
    }
  }

  /**
   * Process pipeline results and determine next actions
   */
  private processResults(pipelineResult: PipelineResult): void {
    // Calculate overall score
    let totalScore = 0;
    let validResultsCount = 0;
    
    pipelineResult.validationResults.forEach(result => {
      totalScore += result.score;
      validResultsCount++;
      
      // Collect recommendations
      result.recommendations.forEach(rec => {
        if (!pipelineResult.recommendations.includes(rec)) {
          pipelineResult.recommendations.push(rec);
        }
      });
    });
    
    pipelineResult.overallScore = validResultsCount > 0 ? totalScore / validResultsCount : 0;

    // Determine pipeline success
    pipelineResult.success = (
      pipelineResult.passedValidations >= pipelineResult.totalValidations * 0.8 &&
      pipelineResult.overallScore >= this.pipelineConfig.rollbackThreshold
    );

    // Generate next actions
    if (!pipelineResult.success) {
      pipelineResult.nextActions.push('Review failed validations and improve Phase 3 implementations');
    }
    
    if (pipelineResult.rollbacksExecuted > 0) {
      pipelineResult.nextActions.push('Investigate rollback causes and address underlying issues');
    }
    
    if (pipelineResult.overallScore < 0.7) {
      pipelineResult.nextActions.push('Conduct comprehensive review of Phase 3 migration quality');
    }
    
    if (pipelineResult.recommendations.length > 5) {
      pipelineResult.nextActions.push('Prioritize and address most critical recommendations');
    }
  }

  /**
   * Get agent pair (Phase 3 and Legacy) for validation
   */
  private async getAgentPair(agentType: AgentType): Promise<{ enhancedAgent: any; legacyAgent: any }> {
    switch (agentType) {
      case 'quick-letter': {
        // Dynamically import Phase 3 agent
        const { QuickLetterAgent } = await import('@/agents/specialized/QuickLetterAgent');
        return {
          enhancedAgent: new QuickLetterAgent(),
          legacyAgent: new QuickLetterAgent() // Using consolidated agent
        };
      }
        
      case 'investigation-summary': {
        const { InvestigationSummaryAgent } = await import('@/agents/specialized/InvestigationSummaryAgent');
        return {
          enhancedAgent: new InvestigationSummaryAgent(),
          legacyAgent: new InvestigationSummaryAgent() // Using consolidated agent
        };
      }
        
      default:
        throw new Error(`Agent type ${agentType} not supported for validation`);
    }
  }

  /**
   * Get validation configuration for agent type
   */
  private getValidationConfig(agentType: AgentType): MigrationValidationConfig {
    const defaultConfig = DEFAULT_VALIDATION_CONFIGS[agentType] || {};
    
    return {
      agentType,
      validationLevel: 'comprehensive',
      enableRollback: this.pipelineConfig.enableAutomaticRollback,
      benchmarkThresholds: {
        processingTime: 5000,
        qualityScore: 0.7,
        confidenceScore: 0.6,
        contentLength: 100
      },
      comparisonSamples: 3,
      ...defaultConfig
    } as MigrationValidationConfig;
  }

  /**
   * Send notification about validation events
   */
  private async sendNotification(
    type: 'validation_complete' | 'rollback' | 'health_check_failure',
    message: string,
    severity: 'info' | 'warning' | 'critical'
  ): Promise<void> {
    // Skip non-critical notifications if configured
    if (severity !== 'critical' && this.pipelineConfig.notificationConfig.criticalIssuesOnly) {
      return;
    }

    console.log(`📧 Notification [${severity.toUpperCase()}]: ${message}`);
    
    // In a production system, this would integrate with:
    // - Slack notifications
    // - Email alerts  
    // - PagerDuty/incident management
    // - Logging systems
  }

  /**
   * Get default pipeline configuration
   */
  static getDefaultConfig(): ValidationPipelineConfig {
    return {
      enableParallelValidation: true,
      maxConcurrentValidations: 2,
      enableAutomaticRollback: true,
      rollbackThreshold: 0.6,
      notificationConfig: {
        enableSlack: false,
        enableEmail: false,
        criticalIssuesOnly: true
      },
      validationSchedule: {
        preDeployment: true,
        postDeployment: true,
        intervalMinutes: 60 // Monitor every hour
      }
    };
  }

  /**
   * Get current pipeline status
   */
  getPipelineStatus(): Map<AgentType, ValidationJob> {
    return new Map(this.activeJobs);
  }

  /**
   * Get validation history for agent
   */
  getValidationHistory(agentType: AgentType): ValidationJob[] {
    // In a production system, this would query a persistent store
    const job = this.activeJobs.get(agentType);
    return job ? [job] : [];
  }
}