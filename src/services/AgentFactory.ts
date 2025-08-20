/**
 * Agent Factory Service
 * 
 * Optimized factory with lazy loading for dramatic bundle size reduction.
 * Agents are loaded on-demand instead of all being bundled upfront.
 */

import type { AgentType } from '@/types/medical.types';
import { LazyAgentFactory } from './LazyAgentFactory';

export class AgentFactory {
  private static lazyFactory = LazyAgentFactory.getInstance();

  /**
   * Process input with the specified agent (lazy-loaded)
   */
  public static async processWithAgent(
    workflowId: AgentType, 
    input: string, 
    context?: any,
    _signal?: AbortSignal
  ): Promise<{ content: string; summary?: string; warnings?: string[]; errors?: string[]; processingTime: number; agentName: string; reviewData?: any }> {
    const startTime = Date.now();
    
    try {
      // Use lazy loading for dramatic bundle size reduction
      const report = await this.lazyFactory.processWithAgent(workflowId, input, context);
      
      const totalTime = Date.now() - startTime;
      
      // Log which agent was used and processing time
      console.info(`Workflow: ${workflowId.toUpperCase()}`);
      console.log(`⏱️ Total processing time (including load): ${totalTime}ms`);
      console.log(`⏱️ Agent processing time: ${report.metadata.processingTime}ms`);
      
      // Check if this is an AusMedicalReviewAgent with structured data
      const ausMedicalReviewData = (report as any).reviewData;
      if (workflowId === 'ai-medical-review' && ausMedicalReviewData) {
        console.log(`🔍 AI Review found ${ausMedicalReviewData.findings?.length || 0} findings`);
      }
      
      // Return structured response with separate warnings/errors, timing data, and optional summary
      return {
        content: report.content,
        summary: report.summary,
        warnings: report.warnings,
        errors: report.errors,
        processingTime: report.metadata.processingTime,
        agentName: report.agentName,
        reviewData: ausMedicalReviewData // Include structured data for AI Review
      };
      
    } catch (error) {
      console.error(`❌ Agent processing failed for ${workflowId}:`, error);
      throw error;
    }
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
}