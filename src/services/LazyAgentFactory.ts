/**
 * Lazy Loading Agent Factory
 * 
 * Dramatically reduces bundle size by loading medical agents on-demand
 * instead of including all agents in the initial bundle.
 */

import type { AgentType, MedicalAgent, MedicalContext, MedicalReport } from '@/types/medical.types';

// Type definitions for lazy-loaded agents
type AgentConstructor = new () => MedicalAgent;
type AgentModule = { [key: string]: AgentConstructor };

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
      console.log(`♻️ Using cached ${agentType} agent`);
      return agentCache.get(agentType)!;
    }

    console.log(`🔄 Lazy loading ${agentType} agent...`);
    
    try {
      let AgentClass: AgentConstructor;
      
      switch (agentType) {
        case 'tavi':
          const taviModule = await import('@/agents/specialized/TAVIAgent');
          AgentClass = taviModule.TAVIAgent;
          break;
          
        case 'angiogram-pci':
          const angiogramModule = await import('@/agents/specialized/AngiogramPCIAgent');
          AgentClass = angiogramModule.AngiogramPCIAgent;
          break;
          
        case 'quick-letter':
          const quickLetterModule = await import('@/agents/specialized/QuickLetterAgent');
          AgentClass = quickLetterModule.QuickLetterAgent;
          break;
          
        case 'consultation':
          const consultationModule = await import('@/agents/specialized/ConsultationAgent');
          AgentClass = consultationModule.ConsultationAgent;
          break;
          
        case 'investigation-summary':
          const investigationModule = await import('@/agents/specialized/InvestigationSummaryAgent');
          AgentClass = investigationModule.InvestigationSummaryAgent;
          break;
          
        case 'background':
          const backgroundModule = await import('@/agents/specialized/BackgroundAgent');
          AgentClass = backgroundModule.BackgroundAgent;
          break;
          
        case 'medication':
          const medicationModule = await import('@/agents/specialized/MedicationAgent');
          AgentClass = medicationModule.MedicationAgent;
          break;
          
        case 'mteer':
          const mteerModule = await import('@/agents/specialized/MTEERAgent');
          AgentClass = mteerModule.MTEERAgent;
          break;
          
        case 'pfo-closure':
          const pfoModule = await import('@/agents/specialized/PFOClosureAgent');
          AgentClass = pfoModule.PFOClosureAgent;
          break;
          
        case 'right-heart-cath':
          const rhcModule = await import('@/agents/specialized/RightHeartCathAgent');
          AgentClass = rhcModule.RightHeartCathAgent;
          break;
          
        case 'ai-medical-review':
          const aiReviewModule = await import('@/agents/specialized/AusMedicalReviewAgent');
          AgentClass = aiReviewModule.AusMedicalReviewAgent;
          break;
          
        default:
          throw new Error(`Unknown agent type: ${agentType}`);
      }
      
      const agent = new AgentClass();
      agentCache.set(agentType, agent);
      
      console.log(`✅ Successfully loaded ${agentType} agent`);
      return agent;
      
    } catch (error) {
      console.error(`❌ Failed to load ${agentType} agent:`, error);
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
      
      console.log(`⚡ Agent loaded in ${loadTime}ms, processing...`);
      
      const result = await agent.process(input, context);
      const totalTime = Date.now() - startTime;
      
      console.log(`✅ ${agentType} processing completed in ${totalTime}ms`);
      return result;
      
    } catch (error) {
      console.error(`❌ Agent processing failed for ${agentType}:`, error);
      throw error;
    }
  }

  /**
   * Preload agents that are likely to be used
   */
  async preloadCommonAgents(): Promise<void> {
    const commonAgents: AgentType[] = [
      'quick-letter',
      'investigation-summary',
      'background'
    ];
    
    console.log('🔄 Preloading common agents...');
    
    const preloadPromises = commonAgents.map(async (agentType) => {
      try {
        await this.loadAgent(agentType);
        console.log(`✅ Preloaded ${agentType}`);
      } catch (error) {
        console.warn(`⚠️ Failed to preload ${agentType}:`, error);
      }
    });
    
    await Promise.allSettled(preloadPromises);
    console.log('✅ Common agents preloading completed');
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
   * Get cache statistics
   */
  getCacheStats(): { size: number; loadedAgents: AgentType[] } {
    return {
      size: agentCache.size,
      loadedAgents: Array.from(agentCache.keys())
    };
  }
}