/**
 * Agent Factory Service - Phase 4 Enhanced
 * 
 * Optimized factory with Phase 4 enhancements:
 * - LazyAgentLoader for dynamic loading and caching
 * - CrossAgentIntelligence for shared insights
 * - Smart recommendations and context enhancement
 */

import type { AgentType, MedicalContext } from '@/types/medical.types';
import { LazyAgentFactory } from './LazyAgentFactory';
import { LazyAgentLoader } from './LazyAgentLoader';
import { CrossAgentIntelligence } from './CrossAgentIntelligence';
import { PhrasebookService } from './PhrasebookService';
import { NotificationService } from './NotificationService';
import { logger } from '@/utils/Logger';
import { toError } from '@/utils/errorHelpers';

export class AgentFactory {
  private static lazyFactory = LazyAgentFactory.getInstance();
  private static agentLoader = LazyAgentLoader.getInstance();
  private static crossAgentIntelligence = CrossAgentIntelligence.getInstance();

  /**
   * Process input with Phase 4 enhanced agent loading and intelligence
   */
  public static async processWithAgent(
    workflowId: AgentType,
    input: string,
    context?: any,
    _signal?: AbortSignal,
    options?: {
      patientName?: string;
      skipNotification?: boolean;
      sessionId?: string;
      usePhase4Enhancement?: boolean;
      onProgress?: (phase: string, progress: number, details?: string) => void;
    }
  ): Promise<{ content: string; summary?: string; warnings?: string[]; errors?: string[]; processingTime: number; agentName: string; reviewData?: any; missingInfo?: any; taviStructuredSections?: any; educationData?: any }> {
    const startTime = Date.now();
    
    try {
      // Phase 4 Enhancement: Enable by default for agents that benefit from cross-agent intelligence
      const usePhase4 = options?.usePhase4Enhancement ?? this.shouldUsePhase4Enhancement(workflowId, context);
      if (usePhase4) {
        return await this.processWithPhase4Enhancement(workflowId, input, context, options);
      }

      // Enhance context with user phrasebook terminology preferences
      const enhancedContext = await this.enhanceWithPhrasebook(context, workflowId);

      // Merge onProgress callback into context for agent progress reporting
      const contextWithProgress = options?.onProgress
        ? { ...enhancedContext, onProgress: options.onProgress }
        : enhancedContext;

      // Use lazy loading for dramatic bundle size reduction
      const report = await this.lazyFactory.processWithAgent(workflowId, input, contextWithProgress);
      
      const totalTime = Date.now() - startTime;
      
      // Log which agent was used and processing time
      logger.info(`Workflow: ${workflowId.toUpperCase()}`, {
        component: 'agent-factory',
        operation: 'process',
        workflow: workflowId,
        totalTime,
        agentTime: report.metadata.processingTime
      });
      
      // Check if this is a BatchPatientReviewAgent with structured data
      const batchPatientReviewData = (report as any).reviewData;
      if (workflowId === 'ai-medical-review' && batchPatientReviewData) {
        logger.info(`Batch Patient Review found ${batchPatientReviewData.findings?.length || 0} findings`, {
          component: 'agent-factory',
          operation: 'batch-review',
          findings: batchPatientReviewData.findings?.length || 0
        });
      }

      // Check if this is a TAVIWorkupAgent with structured sections
      const taviStructuredSections = (report as any).structuredSections;
      if (workflowId === 'tavi-workup' && taviStructuredSections) {
        logger.info(`TAVI Workup found structured sections`, {
          component: 'agent-factory',
          operation: 'tavi-workup',
          sectionsFound: Object.keys(taviStructuredSections).length
        });
      }

      // Check if this is a PatientEducationAgent with education data
      const educationData = (report as any).educationData;
      if (workflowId === 'patient-education' && educationData) {
        logger.info(`Patient Education found structured data`, {
          component: 'agent-factory',
          operation: 'patient-education',
          modules: educationData.modules?.length || 0,
          hasJsonMetadata: !!educationData.jsonMetadata
        });
      }
      
      // Send completion notification (will check if user is focused automatically)
      if (!options?.skipNotification) {
        try {
          const extraInfo = workflowId === 'ai-medical-review' && batchPatientReviewData 
            ? `${batchPatientReviewData.findings?.length || 0} findings identified`
            : undefined;
            
          await NotificationService.showCompletionNotification(
            workflowId, 
            report.metadata.processingTime,
            extraInfo,
            options?.patientName
          );
          logger.info(`Notification sent for ${workflowId} (${report.metadata.processingTime}ms)`, {
            component: 'agent-factory',
            operation: 'notification',
            workflow: workflowId,
            processingTime: report.metadata.processingTime
          });
        } catch (notificationError) {
          logger.warn('Failed to send completion notification', {
            component: 'agent-factory',
            operation: 'notification',
            error: notificationError instanceof Error ? notificationError.message : String(notificationError)
          });
        }
      }
      
      // Return structured response with separate warnings/errors, timing data, and optional summary
      return {
        content: report.content,
        summary: report.summary,
        warnings: report.warnings,
        errors: report.errors,
        processingTime: report.metadata.processingTime,
        agentName: report.agentName,
        reviewData: batchPatientReviewData, // Include structured data for Batch Patient Review
        missingInfo: report.metadata?.missingInformation,
        taviStructuredSections: taviStructuredSections, // Include structured data for TAVI Workup
        educationData: educationData // Include structured data for Patient Education
      };
      
    } catch (error) {
      const err = toError(error);
      logger.error(`Agent processing failed for ${workflowId}`, err, {
        component: 'agent-factory',
        operation: 'process',
        workflow: workflowId
      });
      throw err;
    }
  }

  /**
   * Determine if Phase 4 Enhancement should be used for this agent
   */
  private static shouldUsePhase4Enhancement(workflowId: AgentType, _context?: any): boolean {
    // Enable Phase 4 for agents that benefit from cross-agent intelligence
    const phase4Agents: AgentType[] = [
      'investigation-summary',
      'background',
      'medication',
      'quick-letter',
      'consultation',
      'tavi-workup',
      'ai-medical-review'
    ];

    return phase4Agents.includes(workflowId);
  }

  /**
   * Phase 4 Enhanced processing with cross-agent intelligence and optimization
   */
  private static async processWithPhase4Enhancement(
    workflowId: AgentType,
    input: string,
    context?: any,
    options?: {
      sessionId?: string;
      patientName?: string;
      skipNotification?: boolean;
      onProgress?: (phase: string, progress: number, details?: string) => void;
    }
  ) {
    const startTime = Date.now();
    logger.info('Phase 4 Enhanced processing initiated', {
      component: 'agent-factory',
      operation: 'phase4-start'
    });

    try {
      // Step 1: Load agent with intelligent caching
      const { agent, loadTime, fromCache } = await this.agentLoader.loadAgent(workflowId, true);
      logger.info(`Agent loaded in ${loadTime}ms (cached: ${fromCache})`, {
        component: 'agent-factory',
        operation: 'agent-load',
        loadTime,
        fromCache
      });

      // Step 2: Get enhanced context from cross-agent intelligence and phrasebook
      let enhancedContext: MedicalContext = await this.enhanceWithPhrasebook(context || {}, workflowId);

      if (options?.sessionId) {
        const contextEnhancement = this.crossAgentIntelligence.getEnhancedContext(
          options.sessionId,
          workflowId
        );

        const recommendationSummaries = contextEnhancement.recommendations
          ? contextEnhancement.recommendations.map(rec => rec.title ?? rec.description)
          : [];

        enhancedContext = {
          ...enhancedContext,
          enhancedProcessing: true,
          sharedInsights: contextEnhancement.sharedInsights,
          riskAssessment: contextEnhancement.riskAssessment,
          drugInteractions: contextEnhancement.drugInteractions,
          clinicalCorrelations: contextEnhancement.clinicalCorrelations,
          recommendations: recommendationSummaries
        };

        logger.info(`Enhanced context with ${contextEnhancement.sharedInsights.length} shared insights`, {
          component: 'agent-factory',
          operation: 'context-enhancement',
          insights: contextEnhancement.sharedInsights.length
        });
      }

      // Step 3: Process with enhanced agent
      let report;
      if (workflowId === 'tavi-workup' && options?.onProgress) {
        // TAVI workup with progress tracking
        const taviContext = {
          ...enhancedContext,
          onProgress: options.onProgress
        };
        report = await agent.process(input, taviContext);
      } else {
        // Standard processing
        report = await agent.process(input, enhancedContext);
      }
      
      // Step 4: Register insights with cross-agent intelligence
      if (options?.sessionId && report.metadata?.enhancedProcessing) {
        const enhancedMetadata = report.metadata.enhancedProcessing as { clinicalFindings?: number } | undefined;
        const clinicalFindingsCount = enhancedMetadata?.clinicalFindings ?? 0;
        const extractedFindings = clinicalFindingsCount > 0
          ? Array.from({ length: clinicalFindingsCount }, (_, i) => ({
              finding: `Clinical finding ${i + 1}`,
              confidence: 0.8,
              category: 'medical_history'
            }))
          : [];

        const insights = this.crossAgentIntelligence.registerInsights(
          options.sessionId,
          workflowId,
          report,
          extractedFindings
        );

        logger.info(`Registered ${insights.length} insights for cross-agent learning`, {
          component: 'agent-factory',
          operation: 'insights-registration',
          insights: insights.length
        });
      }

      const totalTime = Date.now() - startTime;
      
      // Step 5: Enhanced performance logging
      logger.info(`Phase 4 Enhanced processing completed in ${totalTime}ms`, {
        component: 'agent-factory',
        operation: 'phase4-complete',
        totalTime,
        loadTime,
        fromCache,
        processingTime: report.metadata?.processingTime || 0
      });
      
      // Send completion notification
      if (!options?.skipNotification) {
        await NotificationService.showCompletionNotification(
          workflowId,
          totalTime,
          undefined,
          options?.patientName
        );
      }

      return {
        content: report.content,
        summary: report.summary,
        warnings: report.warnings,
        errors: report.errors,
        processingTime: totalTime,
        agentName: report.agentName,
        reviewData: (report as any).reviewData,
        missingInfo: report.metadata?.missingInformation,
        phase4Metadata: {
          enhancedProcessing: true,
          agentLoadTime: loadTime,
          fromCache,
          crossAgentInsights: options?.sessionId ? true : false,
          totalPhase4Time: totalTime
        }
      };

    } catch (error) {
      const err = toError(error);
      logger.error(`Phase 4 Enhanced processing failed for ${workflowId}`, err, {
        component: 'agent-factory',
        operation: 'phase4-error',
        workflow: workflowId
      });
      
      // Fallback to standard processing
      logger.info('Falling back to standard processing', {
        component: 'agent-factory',
        operation: 'fallback'
      });
      return await this.processWithAgent(workflowId, input, context, undefined, {
        ...options,
        usePhase4Enhancement: false
      });
    }
  }

  /**
   * Get performance statistics from Phase 4 systems
   */
  public static getPhase4PerformanceStats() {
    return {
      agentLoader: this.agentLoader.getPerformanceStats(),
      crossAgentIntelligence: {
        // Add cross-agent intelligence stats if available
        activeProfiles: 'N/A', // Would implement if needed
        globalInsights: 'N/A'
      }
    };
  }

  /**
   * Preload popular agents for performance
   */
  public static async preloadPopularAgents(): Promise<void> {
    await this.agentLoader.preloadPopularAgents();
  }

  /**
   * Clear the agent cache (useful for testing or memory management)
   */
  public static clearCache(): void {
    this.lazyFactory.clearCache();
  }

  /**
   * Get all supported workflow IDs
   */
  public static getSupportedWorkflows(): AgentType[] {
    return this.lazyFactory.getAvailableAgentTypes();
  }

  /**
   * Check if a workflow is supported
   */
  public static isSupported(workflowId: string): workflowId is AgentType {
    return this.getSupportedWorkflows().includes(workflowId as AgentType);
  }

  /**
   * Preload common agents for better performance
   */
  public static async preloadCommonAgents(): Promise<void> {
    await this.lazyFactory.preloadCommonAgents();
  }

  /**
   * Preload critical agents for immediate use
   */
  public static async preloadCriticalAgents(): Promise<void> {
    await this.lazyFactory.preloadCriticalAgents();
  }

  /**
   * Optimize cache memory usage
   */
  public static optimizeCache(): void {
    this.lazyFactory.optimizeCache();
  }

  /**
   * Get memory usage estimation
   */
  public static getMemoryEstimate(): { totalAgents: number; estimatedMemoryMB: number } {
    return this.lazyFactory.getMemoryEstimate();
  }

  /**
   * Check if an agent is already loaded
   */
  public static isAgentLoaded(agentType: AgentType): boolean {
    return this.lazyFactory.isAgentLoaded(agentType);
  }

  /**
   * Get cache statistics for monitoring
   */
  public static getCacheStats(): { size: number; loadedAgents: AgentType[] } {
    return this.lazyFactory.getCacheStats();
  }

  /**
   * Enhance medical context with user phrasebook terminology preferences
   */
  private static async enhanceWithPhrasebook(
    context: MedicalContext = { sessionId: 'default', timestamp: Date.now() },
    agentType: AgentType
  ): Promise<MedicalContext> {
    try {
      const phrasebookService = PhrasebookService.getInstance();
      const terminologyBias = await phrasebookService.compileForSystemPrompt();

      if (terminologyBias.trim().length > 0) {
        const enhancedContext: MedicalContext = {
          ...context,
          enhancedProcessing: true,
          terminologyPreferences: terminologyBias
        };

        logger.info(`Enhanced context with phrasebook terminology for ${agentType}`, {
          component: 'agent-factory',
          operation: 'phrasebook-enhancement',
          agentType
        });
        return enhancedContext;
      }

      return context;
    } catch (error) {
      const err = toError(error);
      logger.warn('Failed to enhance context with phrasebook', {
        component: 'agent-factory',
        operation: 'phrasebook-enhancement',
        error: err.message
      });
      return context;
    }
  }
}
