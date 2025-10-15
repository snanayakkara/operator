/**
 * Phase 4: Lazy Agent Loading System
 * 
 * Optimizes bundle size and startup performance by loading agents on-demand.
 * Implements intelligent caching and preloading for frequently used agents.
 */

import type { AgentType } from '@/types/medical.types';
import { MedicalAgent } from '@/agents/base/MedicalAgent';

interface AgentLoadResult {
  agent: MedicalAgent;
  loadTime: number;
  fromCache: boolean;
}

interface AgentUsageStats {
  agentType: AgentType;
  loadCount: number;
  averageLoadTime: number;
  lastUsed: number;
  successRate: number;
}

interface PreloadStrategy {
  enabled: boolean;
  popularAgentThreshold: number; // Load count threshold for preloading
  preloadDelay: number; // Delay before preloading in ms
  maxConcurrentPreloads: number;
}

/**
 * Lazy loading system for medical agents with intelligent caching and preloading
 */
export class LazyAgentLoader {
  private static instance: LazyAgentLoader;
  private agentCache: Map<AgentType, MedicalAgent> = new Map();
  private loadingPromises: Map<AgentType, Promise<MedicalAgent>> = new Map();
  private usageStats: Map<AgentType, AgentUsageStats> = new Map();
  private preloadStrategy: PreloadStrategy;
  private preloadingInProgress: Set<AgentType> = new Set();

  constructor() {
    this.preloadStrategy = {
      enabled: true,
      popularAgentThreshold: 3,
      preloadDelay: 2000,
      maxConcurrentPreloads: 2
    };
    
    this.initializeUsageTracking();
    this.schedulePopularAgentPreloading();
  }

  static getInstance(): LazyAgentLoader {
    if (!LazyAgentLoader.instance) {
      LazyAgentLoader.instance = new LazyAgentLoader();
    }
    return LazyAgentLoader.instance;
  }

  /**
   * Load agent with caching and performance tracking
   */
  async loadAgent(agentType: AgentType, preferEnhanced: boolean = true): Promise<AgentLoadResult> {
    const startTime = Date.now();
    
    // Check cache first
    if (this.agentCache.has(agentType)) {
      const agent = this.agentCache.get(agentType)!;
      this.updateUsageStats(agentType, 0, true);
      
      return {
        agent,
        loadTime: 0,
        fromCache: true
      };
    }

    // Check if already loading
    if (this.loadingPromises.has(agentType)) {
      const agent = await this.loadingPromises.get(agentType)!;
      const loadTime = Date.now() - startTime;
      
      return {
        agent,
        loadTime,
        fromCache: false
      };
    }

    // Create loading promise
    const loadingPromise = this.createLoadingPromise(agentType, preferEnhanced);
    this.loadingPromises.set(agentType, loadingPromise);

    try {
      const agent = await loadingPromise;
      const loadTime = Date.now() - startTime;

      // Cache the loaded agent
      this.agentCache.set(agentType, agent);
      this.loadingPromises.delete(agentType);
      this.updateUsageStats(agentType, loadTime, true);

      console.log(`📦 Loaded ${agentType} agent in ${loadTime}ms (Enhanced: ${preferEnhanced})`);

      return {
        agent,
        loadTime,
        fromCache: false
      };

    } catch (error) {
      this.loadingPromises.delete(agentType);
      this.updateUsageStats(agentType, Date.now() - startTime, false);
      
      console.error(`❌ Failed to load ${agentType} agent:`, error);
      throw error;
    }
  }

  /**
   * Preload popular agents in background
   */
  async preloadPopularAgents(): Promise<void> {
    if (!this.preloadStrategy.enabled) return;

    const popularAgents = this.getPopularAgents();
    const concurrentPreloads: Promise<void>[] = [];

    for (const agentType of popularAgents) {
      if (this.agentCache.has(agentType) || this.preloadingInProgress.has(agentType)) {
        continue;
      }

      if (concurrentPreloads.length >= this.preloadStrategy.maxConcurrentPreloads) {
        break;
      }

      const preloadPromise = this.preloadAgent(agentType);
      concurrentPreloads.push(preloadPromise);
    }

    if (concurrentPreloads.length > 0) {
      console.log(`🚀 Preloading ${concurrentPreloads.length} popular agents`);
      await Promise.allSettled(concurrentPreloads);
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    cacheSize: number;
    cacheHitRate: number;
    averageLoadTime: number;
    usageStats: AgentUsageStats[];
  } {
    const stats = Array.from(this.usageStats.values());
    const totalLoads = stats.reduce((sum, stat) => sum + stat.loadCount, 0);
    const totalLoadTime = stats.reduce((sum, stat) => sum + (stat.averageLoadTime * stat.loadCount), 0);

    return {
      cacheSize: this.agentCache.size,
      cacheHitRate: this.calculateCacheHitRate(),
      averageLoadTime: totalLoads > 0 ? totalLoadTime / totalLoads : 0,
      usageStats: stats.sort((a, b) => b.loadCount - a.loadCount)
    };
  }

  /**
   * Clear cache and reset statistics
   */
  clearCache(): void {
    this.agentCache.clear();
    this.loadingPromises.clear();
    this.usageStats.clear();
    this.preloadingInProgress.clear();
    console.log('🧹 Agent cache cleared');
  }

  /**
   * Create loading promise for specific agent type
   */
  private async createLoadingPromise(agentType: AgentType, preferEnhanced: boolean): Promise<MedicalAgent> {
    try {
      // Try loading enhanced version first if preferred
      if (preferEnhanced) {
        const enhancedAgent = await this.loadEnhancedAgent(agentType);
        if (enhancedAgent) {
          return enhancedAgent;
        }
      }

      // Fallback to legacy agent
      return await this.loadLegacyAgent(agentType);

    } catch (error) {
      console.error(`Failed to load ${agentType} agent:`, error);
      throw new Error(`Unable to load ${agentType} agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load enhanced agent with dynamic import
   */
  private async loadEnhancedAgent(agentType: AgentType): Promise<MedicalAgent | null> {
    try {
      switch (agentType) {
        case 'quick-letter': {
          const { QuickLetterAgent } = await import('@/agents/specialized/QuickLetterAgent');
          return new QuickLetterAgent();
        }
          
        case 'investigation-summary': {
          const { InvestigationSummaryAgent } = await import('@/agents/specialized/InvestigationSummaryAgent');
          return new InvestigationSummaryAgent();
        }
          
        case 'background': {
          const { BackgroundAgent } = await import('@/agents/specialized/BackgroundAgent');
          return new BackgroundAgent();
        }
          
        case 'medication': {
          const { MedicationAgent } = await import('@/agents/specialized/MedicationAgent');
          return new MedicationAgent();
        }
          
        default:
          // Enhanced version not available for this agent type
          return null;
      }
    } catch (error) {
      console.warn(`Enhanced agent not available for ${agentType}, falling back to legacy`);
      return null;
    }
  }

  /**
   * Load legacy agent with dynamic import
   */
  private async loadLegacyAgent(agentType: AgentType): Promise<MedicalAgent> {
    switch (agentType) {
      case 'tavi': {
        const { TAVIAgent } = await import('@/agents/specialized/TAVIAgent');
        return new TAVIAgent();
      }
        
      case 'angiogram-pci': {
        const { AngiogramPCIAgent } = await import('@/agents/specialized/AngiogramPCIAgent');
        return new AngiogramPCIAgent();
      }

      case 'tavi-workup': {
        const { TAVIWorkupAgent } = await import('@/agents/specialized/TAVIWorkupAgent');
        return new TAVIWorkupAgent();
      }

      case 'mteer': {
        const { MTEERAgent } = await import('@/agents/specialized/MTEERAgent');
        return new MTEERAgent();
      }
        
      case 'pfo-closure': {
        const { PFOClosureAgent } = await import('@/agents/specialized/PFOClosureAgent');
        return new PFOClosureAgent();
      }
        
      case 'right-heart-cath': {
        const { RightHeartCathAgent } = await import('@/agents/specialized/RightHeartCathAgent');
        return new RightHeartCathAgent();
      }
        
      case 'quick-letter': {
        const { QuickLetterAgent } = await import('@/agents/specialized/QuickLetterAgent');
        return new QuickLetterAgent();
      }
        
      case 'consultation': {
        const { ConsultationAgent } = await import('@/agents/specialized/ConsultationAgent');
        return new ConsultationAgent();
      }
        
      case 'investigation-summary': {
        const { InvestigationSummaryAgent } = await import('@/agents/specialized/InvestigationSummaryAgent');
        return new InvestigationSummaryAgent();
      }
        
      case 'aus-medical-review':
      case 'ai-medical-review': {
        const { BatchPatientReviewAgent } = await import('@/agents/specialized/BatchPatientReviewAgent');
        return new BatchPatientReviewAgent();
      }

      case 'background': {
        const { BackgroundAgent } = await import('@/agents/specialized/BackgroundAgent');
        return new BackgroundAgent();
      }
        
      case 'medication': {
        const { MedicationAgent } = await import('@/agents/specialized/MedicationAgent');
        return new MedicationAgent();
      }
        
      default:
        throw new Error(`Unknown agent type: ${agentType}`);
    }
  }

  /**
   * Preload single agent in background
   */
  private async preloadAgent(agentType: AgentType): Promise<void> {
    if (this.preloadingInProgress.has(agentType)) return;
    
    this.preloadingInProgress.add(agentType);
    
    try {
      await this.loadAgent(agentType, true);
      console.log(`✅ Preloaded ${agentType} agent`);
    } catch (error) {
      console.warn(`⚠️ Failed to preload ${agentType} agent:`, error);
    } finally {
      this.preloadingInProgress.delete(agentType);
    }
  }

  /**
   * Get popular agents based on usage statistics
   */
  private getPopularAgents(): AgentType[] {
    return Array.from(this.usageStats.values())
      .filter(stat => stat.loadCount >= this.preloadStrategy.popularAgentThreshold)
      .sort((a, b) => b.loadCount - a.loadCount)
      .map(stat => stat.agentType);
  }

  /**
   * Update usage statistics for agent
   */
  private updateUsageStats(agentType: AgentType, loadTime: number, success: boolean): void {
    const existing = this.usageStats.get(agentType);
    
    if (existing) {
      const totalTime = existing.averageLoadTime * existing.loadCount + loadTime;
      existing.loadCount++;
      existing.averageLoadTime = totalTime / existing.loadCount;
      existing.lastUsed = Date.now();
      existing.successRate = ((existing.successRate * (existing.loadCount - 1)) + (success ? 1 : 0)) / existing.loadCount;
    } else {
      this.usageStats.set(agentType, {
        agentType,
        loadCount: 1,
        averageLoadTime: loadTime,
        lastUsed: Date.now(),
        successRate: success ? 1 : 0
      });
    }
  }

  /**
   * Calculate cache hit rate
   */
  private calculateCacheHitRate(): number {
    const stats = Array.from(this.usageStats.values());
    if (stats.length === 0) return 0;

    // Approximate cache hit rate based on load patterns
    const totalLoads = stats.reduce((sum, stat) => sum + stat.loadCount, 0);
    const uniqueAgents = stats.length;
    
    return totalLoads > uniqueAgents ? (totalLoads - uniqueAgents) / totalLoads : 0;
  }

  /**
   * Initialize usage tracking from localStorage if available
   */
  private initializeUsageTracking(): void {
    try {
      const stored = localStorage.getItem('agent-usage-stats');
      if (stored) {
        const stats = JSON.parse(stored);
        Object.entries(stats).forEach(([agentType, data]) => {
          this.usageStats.set(agentType as AgentType, data as AgentUsageStats);
        });
        console.log(`📊 Loaded usage stats for ${this.usageStats.size} agents`);
      }
    } catch (error) {
      console.warn('Failed to load usage statistics:', error);
    }

    // Save stats periodically
    setInterval(() => this.saveUsageStats(), 30000); // Every 30 seconds
  }

  /**
   * Save usage statistics to localStorage
   */
  private saveUsageStats(): void {
    try {
      const statsObject = Object.fromEntries(this.usageStats);
      localStorage.setItem('agent-usage-stats', JSON.stringify(statsObject));
    } catch (error) {
      console.warn('Failed to save usage statistics:', error);
    }
  }

  /**
   * Schedule popular agent preloading
   */
  private schedulePopularAgentPreloading(): void {
    if (!this.preloadStrategy.enabled) return;

    setTimeout(() => {
      this.preloadPopularAgents();
    }, this.preloadStrategy.preloadDelay);

    // Schedule periodic preloading
    setInterval(() => {
      this.preloadPopularAgents();
    }, 60000); // Every minute
  }
}
