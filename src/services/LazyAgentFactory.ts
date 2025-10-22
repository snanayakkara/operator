/**
 * Lazy Loading Agent Factory
 * 
 * Dramatically reduces bundle size by loading medical agents on-demand
 * instead of including all agents in the initial bundle.
 */

import type { AgentType, MedicalAgent, MedicalContext, MedicalReport } from '@/types/medical.types';
import { logger } from '@/utils/Logger';
import { toError } from '@/utils/errorHelpers';

// Type definitions for lazy-loaded agents
type AgentConstructor = new () => MedicalAgent;
type _AgentModule = { [key: string]: AgentConstructor };

// Cache for loaded agents to avoid re-importing
const agentCache = new Map<AgentType, MedicalAgent>();

export class LazyAgentFactory {
  private static instance: LazyAgentFactory;
  
  public static getInstance(): LazyAgentFactory {
    if (!LazyAgentFactory.instance) {
      LazyAgentFactory.instance = new LazyAgentFactory();
    }
    return LazyAgentFactory.instance;
  }

  /**
   * Dynamically load and instantiate a medical agent
   */
  async loadAgent(agentType: AgentType): Promise<MedicalAgent> {
    // Return cached agent if available
    if (agentCache.has(agentType)) {
      logger.debug(`Using cached ${agentType} agent`, {
        component: 'lazy-agent-factory',
        operation: 'cache-hit',
        agentType
      });
      return agentCache.get(agentType)!;
    }

    logger.info(`Lazy loading ${agentType} agent`, {
      component: 'lazy-agent-factory',
      operation: 'load-start',
      agentType
    });
    
    try {
      let AgentClass: AgentConstructor;
      
      switch (agentType) {
        case 'tavi': {
          const taviModule = await import('@/agents/specialized/TAVIAgent');
          AgentClass = taviModule.TAVIAgent;
          break;
        }
          
        case 'angiogram-pci': {
          const angiogramModule = await import('@/agents/specialized/AngiogramPCIAgent');
          AgentClass = angiogramModule.AngiogramPCIAgent;
          break;
        }
        case 'tavi-workup': {
          const taviWorkupModule = await import('@/agents/specialized/TAVIWorkupAgent');
          AgentClass = taviWorkupModule.TAVIWorkupAgent;
          break;
        }
          
        case 'quick-letter': {
          const quickLetterModule = await import('@/agents/specialized/QuickLetterAgent');
          AgentClass = quickLetterModule.QuickLetterAgent;
          break;
        }
          
        case 'consultation': {
          const consultationModule = await import('@/agents/specialized/ConsultationAgent');
          AgentClass = consultationModule.ConsultationAgent;
          break;
        }
          
        case 'investigation-summary': {
          const investigationModule = await import('@/agents/specialized/InvestigationSummaryAgent');
          AgentClass = investigationModule.InvestigationSummaryAgent;
          break;
        }
          
        case 'background': {
          const backgroundModule = await import('@/agents/specialized/BackgroundAgent');
          AgentClass = backgroundModule.BackgroundAgent;
          break;
        }
          
        case 'medication': {
          const medicationModule = await import('@/agents/specialized/MedicationAgent');
          AgentClass = medicationModule.MedicationAgent;
          break;
        }
          
        case 'bloods': {
          const bloodsModule = await import('@/agents/specialized/BloodsAgent');
          AgentClass = bloodsModule.BloodsAgent;
          break;
        }
          
        case 'mteer': {
          const mteerModule = await import('@/agents/specialized/MTEERAgent');
          AgentClass = mteerModule.MTEERAgent;
          break;
        }
          
        case 'pfo-closure': {
          const pfoModule = await import('@/agents/specialized/PFOClosureAgent');
          AgentClass = pfoModule.PFOClosureAgent;
          break;
        }
          
        case 'right-heart-cath': {
          const rhcModule = await import('@/agents/specialized/RightHeartCathAgent');
          AgentClass = rhcModule.RightHeartCathAgent;
          break;
        }
          
        case 'ai-medical-review': {
          const aiReviewModule = await import('@/agents/specialized/BatchPatientReviewAgent');
          AgentClass = aiReviewModule.BatchPatientReviewAgent;
          break;
        }
          
        case 'patient-education': {
          const patientEducationModule = await import('@/agents/specialized/PatientEducationAgent');
          AgentClass = patientEducationModule.PatientEducationAgent;
          break;
        }

        case 'pre-op-plan': {
          const preOpPlanModule = await import('@/agents/specialized/PreOpPlanAgent');
          AgentClass = preOpPlanModule.PreOpPlanAgent;
          break;
        }

        default:
          throw new Error(`Unknown agent type: ${agentType}`);
      }
      
      const agent = new AgentClass();
      agentCache.set(agentType, agent);
      
      logger.info(`Successfully loaded ${agentType} agent`, {
        component: 'lazy-agent-factory',
        operation: 'load-success',
        agentType
      });
      return agent;
      
    } catch (error) {
      const err = toError(error);
      logger.error(`Failed to load ${agentType} agent`, err, {
        component: 'lazy-agent-factory',
        operation: 'load-error',
        agentType
      });
      throw new Error(`Failed to load agent: ${agentType}`);
    }
  }

  /**
   * Process input with a lazily-loaded agent
   */
  async processWithAgent(
    agentType: AgentType, 
    input: string, 
    context?: MedicalContext
  ): Promise<MedicalReport> {
    const startTime = Date.now();
    
    try {
      const agent = await this.loadAgent(agentType);
      const loadTime = Date.now() - startTime;
      
      logger.info(`Agent loaded in ${loadTime}ms, processing...`, {
        component: 'lazy-agent-factory',
        operation: 'process-start',
        agentType,
        loadTime
      });
      
      const result = await agent.process(input, context);
      const totalTime = Date.now() - startTime;
      
      logger.info(`${agentType} processing completed in ${totalTime}ms`, {
        component: 'lazy-agent-factory',
        operation: 'process-complete',
        agentType,
        totalTime
      });
      return result;
      
    } catch (error) {
      const err = toError(error);
      logger.error(`Agent processing failed for ${agentType}`, err, {
        component: 'lazy-agent-factory',
        operation: 'process-error',
        agentType
      });
      throw error;
    }
  }

  /**
   * Preload agents that are likely to be used based on usage patterns
   */
  async preloadCommonAgents(): Promise<void> {
    // Priority order: most commonly used agents first
    const commonAgents: AgentType[] = [
      'quick-letter',        // Most frequently used for simple reports
      'investigation-summary', // Commonly used for test results
      'background',          // Often needed for patient context
      'tavi',               // High-impact procedure agent
      'angiogram-pci',      // Another frequently used procedure agent
      'consultation'        // Common for general assessments
    ];
    
    logger.info('Preloading common agents for performance optimization', {
      component: 'lazy-agent-factory',
      operation: 'preload-start'
    });
    const startTime = Date.now();
    
    // Load agents sequentially to avoid overwhelming the system
    for (const agentType of commonAgents) {
      try {
        await this.loadAgent(agentType);
        logger.info(`Preloaded ${agentType} agent`, {
          component: 'lazy-agent-factory',
          operation: 'preload-success',
          agentType
        });
      } catch (error) {
        logger.warn(`Failed to preload ${agentType}`, {
          component: 'lazy-agent-factory',
          operation: 'preload-error',
          agentType,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    const loadTime = Date.now() - startTime;
    console.log(`✅ Preloaded ${commonAgents.length} common agents in ${loadTime}ms`);
  }

  /**
   * Preload specific high-priority agents (for immediate use)
   */
  async preloadCriticalAgents(): Promise<void> {
    const criticalAgents: AgentType[] = ['quick-letter', 'investigation-summary'];
    
    console.log('🚀 Preloading critical agents for immediate use...');
    const startTime = Date.now();
    
    const preloadPromises = criticalAgents.map(async (agentType) => {
      try {
        await this.loadAgent(agentType);
        console.log(`⚡ Critical agent ${agentType} preloaded`);
      } catch (error) {
        console.warn(`⚠️ Failed to preload critical agent ${agentType}:`, error);
      }
    });
    
    await Promise.allSettled(preloadPromises);
    const loadTime = Date.now() - startTime;
    console.log(`⚡ Critical agents preloaded in ${loadTime}ms`);
  }

  /**
   * Get available agent types (for UI display)
   */
  getAvailableAgentTypes(): AgentType[] {
    return [
      'tavi',
      'angiogram-pci', 
      'quick-letter',
      'consultation',
      'investigation-summary',
      'background',
      'medication',
      'bloods',
      'mteer',
      'pfo-closure',
      'right-heart-cath',
      'ai-medical-review'
    ];
  }

  /**
   * Check if an agent is already loaded (cached)
   */
  isAgentLoaded(agentType: AgentType): boolean {
    return agentCache.has(agentType);
  }

  /**
   * Clear agent cache (for memory management)
   */
  clearCache(): void {
    console.log('🗑️ Clearing agent cache');
    agentCache.clear();
  }

  /**
   * Smart cache cleanup - keep frequently used agents, clear others
   */
  optimizeCache(): void {
    const criticalAgents: AgentType[] = ['quick-letter', 'investigation-summary', 'background'];
    const currentAgents = Array.from(agentCache.keys());
    const agentsToRemove = currentAgents.filter(agent => !criticalAgents.includes(agent));
    
    console.log(`🧹 Optimizing cache: keeping ${criticalAgents.length} critical agents, removing ${agentsToRemove.length} others`);
    
    agentsToRemove.forEach(agent => {
      agentCache.delete(agent);
      console.log(`🗑️ Removed ${agent} from cache`);
    });
    
    console.log(`✅ Cache optimized: ${agentCache.size} agents remaining`);
  }

  /**
   * Get memory usage estimation for agents
   */
  getMemoryEstimate(): { totalAgents: number; estimatedMemoryMB: number } {
    const averageAgentSizeMB = 2; // Estimated size per agent in MB
    const totalAgents = agentCache.size;
    const estimatedMemoryMB = totalAgents * averageAgentSizeMB;
    
    return { totalAgents, estimatedMemoryMB };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; loadedAgents: AgentType[] } {
    return {
      size: agentCache.size,
      loadedAgents: Array.from(agentCache.keys())
    };
  }
}
