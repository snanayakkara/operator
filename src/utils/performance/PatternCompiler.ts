/**
 * Pattern Compiler - Shared Regex Pool Optimization
 * Optimizes pattern compilation with pre-compiled shared pools for medical text processing
 * 
 * Features:
 * - Shared regex pools across all text processing engines
 * - Pre-compilation of frequently used medical patterns
 * - Memory-efficient pattern caching with LRU eviction
 * - Pattern performance analytics and optimization recommendations
 */

import { logger } from '@/utils/Logger';
import { CacheManager } from '@/utils/CacheManager';
import { PerformanceMonitor } from '@/utils/performance/PerformanceMonitor';

export interface CompiledPattern {
  key: string;
  regex: RegExp;
  usage: number;
  lastUsed: number;
  compileTime: number;
  category: PatternCategory;
  medicalDomain?: string;
}

export type PatternCategory = 
  | 'medical_terms' 
  | 'asr_corrections' 
  | 'text_cleaning' 
  | 'stenosis_grading' 
  | 'medication_patterns' 
  | 'hemodynamic_measurements' 
  | 'vessel_anatomy' 
  | 'australian_spelling';

export interface PatternPoolStats {
  totalPatterns: number;
  compiledPatterns: number;
  memoryUsage: number;
  cacheHitRate: number;
  averageCompileTime: number;
  mostUsedCategory: PatternCategory;
  poolEfficiency: number;
  recommendedOptimizations: string[];
}

export interface PatternRequest {
  source: string;
  flags: string;
  category: PatternCategory;
  medicalDomain?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export class PatternCompiler {
  private static instance: PatternCompiler;
  private cacheManager: CacheManager;
  private performanceMonitor: PerformanceMonitor;
  
  // Shared pattern pools
  private patternPool: Map<string, CompiledPattern> = new Map();
  private categoryIndex: Map<PatternCategory, Set<string>> = new Map();
  private domainIndex: Map<string, Set<string>> = new Map();
  
  // Performance tracking
  private compileStats: {
    totalCompiles: number;
    totalCompileTime: number;
    cacheHits: number;
    cacheMisses: number;
  } = {
    totalCompiles: 0,
    totalCompileTime: 0,
    cacheHits: 0,
    cacheMisses: 0
  };
  
  // Configuration
  private readonly MAX_POOL_SIZE = 1000; // Maximum compiled patterns in memory
  private readonly COMPILE_TIMEOUT = 5000; // 5 second timeout for complex patterns
  private readonly CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hour TTL for compiled patterns
  
  private constructor() {
    this.cacheManager = CacheManager.getInstance();
    this.performanceMonitor = PerformanceMonitor.getInstance();
    
    this.initializeCategoryIndices();
    this.precompileMedicalPatterns();
    
    logger.info('PatternCompiler initialized with shared regex pool optimization');
  }
  
  public static getInstance(): PatternCompiler {
    if (!PatternCompiler.instance) {
      PatternCompiler.instance = new PatternCompiler();
    }
    return PatternCompiler.instance;
  }
  
  /**
   * Compile pattern with shared pool optimization
   * Returns cached pattern if available, otherwise compiles and caches
   */
  async compilePattern(request: PatternRequest): Promise<RegExp> {
    const patternKey = this.generatePatternKey(request.source, request.flags, request.category);
    
    // Check pool first
    const cachedPattern = this.patternPool.get(patternKey);
    if (cachedPattern) {
      cachedPattern.usage++;
      cachedPattern.lastUsed = Date.now();
      this.compileStats.cacheHits++;
      logger.debug(`Pattern pool hit: ${patternKey}`);
      return cachedPattern.regex;
    }
    
    // Check persistent cache
    const cacheKey = `pattern_${patternKey}` as any; // Type assertion for CacheKey
    const persistentCache = await this.cacheManager.get(cacheKey);
    if (persistentCache && typeof persistentCache === 'object' && 'source' in persistentCache) {
      try {
        const regex = new RegExp(persistentCache.source as string, request.flags);
        await this.storeInPool(patternKey, regex, request);
        this.compileStats.cacheHits++;
        logger.debug(`Pattern persistent cache hit: ${patternKey}`);
        return regex;
      } catch (error) {
        logger.warn('Failed to restore pattern from persistent cache', { 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    // Compile new pattern with performance monitoring
    this.compileStats.cacheMisses++;
    const compileStart = Date.now();
    
    try {
      const regex = await this.safeCompilePattern(request.source, request.flags);
      const compileTime = Date.now() - compileStart;
      
      // Store in both pool and persistent cache
      await this.storeInPool(patternKey, regex, request, compileTime);
      const persistentCacheKey = `pattern_${patternKey}` as any; // Type assertion for CacheKey
      await this.cacheManager.set(persistentCacheKey, {
        source: request.source,
        flags: request.flags,
        category: request.category,
        compiledAt: Date.now()
      }, this.CACHE_TTL);
      
      this.compileStats.totalCompiles++;
      this.compileStats.totalCompileTime += compileTime;
      
      logger.debug(`Pattern compiled and cached: ${patternKey}`, {
        compileTime,
        category: request.category,
        poolSize: this.patternPool.size
      });
      
      return regex;
      
    } catch (error) {
      logger.error('Pattern compilation failed', error instanceof Error ? error : new Error(String(error)), {
        patternKey,
        source: request.source
      });
      throw error;
    }
  }
  
  /**
   * Get all patterns for a specific category
   */
  getPatternsByCategory(category: PatternCategory): CompiledPattern[] {
    const categoryKeys = this.categoryIndex.get(category) || new Set();
    const patterns: CompiledPattern[] = [];
    
    for (const key of Array.from(categoryKeys)) {
      const pattern = this.patternPool.get(key);
      if (pattern) {
        patterns.push(pattern);
      }
    }
    
    return patterns.sort((a, b) => b.usage - a.usage); // Sort by usage frequency
  }
  
  /**
   * Get all patterns for a specific medical domain
   */
  getPatternsByDomain(domain: string): CompiledPattern[] {
    const domainKeys = this.domainIndex.get(domain) || new Set();
    const patterns: CompiledPattern[] = [];
    
    for (const key of Array.from(domainKeys)) {
      const pattern = this.patternPool.get(key);
      if (pattern) {
        patterns.push(pattern);
      }
    }
    
    return patterns.sort((a, b) => b.lastUsed - a.lastUsed); // Sort by recency
  }
  
  /**
   * Get comprehensive pattern pool statistics
   */
  getPatternPoolStats(): PatternPoolStats {
    const totalPatterns = this.patternPool.size;
    const compiledPatterns = Array.from(this.patternPool.values()).filter(p => p.compileTime > 0).length;
    const memoryUsage = this.estimateMemoryUsage();
    const cacheHitRate = this.compileStats.cacheHits / Math.max(1, this.compileStats.cacheHits + this.compileStats.cacheMisses);
    const averageCompileTime = this.compileStats.totalCompileTime / Math.max(1, this.compileStats.totalCompiles);
    
    // Find most used category
    const categoryUsage = new Map<PatternCategory, number>();
    for (const pattern of Array.from(this.patternPool.values())) {
      const current = categoryUsage.get(pattern.category) || 0;
      categoryUsage.set(pattern.category, current + pattern.usage);
    }
    
    const mostUsedCategory = Array.from(categoryUsage.entries())
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'medical_terms';
    
    const poolEfficiency = cacheHitRate * 100; // Percentage
    
    // Generate optimization recommendations
    const recommendedOptimizations = this.generateOptimizationRecommendations(
      totalPatterns, cacheHitRate, averageCompileTime, memoryUsage
    );
    
    return {
      totalPatterns,
      compiledPatterns,
      memoryUsage,
      cacheHitRate,
      averageCompileTime,
      mostUsedCategory,
      poolEfficiency,
      recommendedOptimizations
    };
  }
  
  /**
   * Optimize pattern pool by removing least used patterns
   */
  async optimizePool(): Promise<{ removedPatterns: number; memoryFreed: number }> {
    const beforeSize = this.patternPool.size;
    const beforeMemory = this.estimateMemoryUsage();
    
    if (beforeSize <= this.MAX_POOL_SIZE * 0.8) {
      logger.debug('Pattern pool optimization skipped - under threshold');
      return { removedPatterns: 0, memoryFreed: 0 };
    }
    
    // Get patterns sorted by usage and recency (LRU)
    const patterns = Array.from(this.patternPool.entries())
      .map(([key, pattern]) => ({ key, pattern }))
      .sort((a, b) => {
        // Sort by usage frequency first, then by last used time
        const usageScore = a.pattern.usage - b.pattern.usage;
        if (usageScore !== 0) return usageScore;
        return a.pattern.lastUsed - b.pattern.lastUsed;
      });
    
    // Remove least used patterns (bottom 20%)
    const removeCount = Math.floor(patterns.length * 0.2);
    const patternsToRemove = patterns.slice(0, removeCount);
    
    for (const { key, pattern } of patternsToRemove) {
      this.patternPool.delete(key);
      
      // Update indices
      const categoryKeys = this.categoryIndex.get(pattern.category);
      if (categoryKeys) {
        categoryKeys.delete(key);
      }
      
      if (pattern.medicalDomain) {
        const domainKeys = this.domainIndex.get(pattern.medicalDomain);
        if (domainKeys) {
          domainKeys.delete(key);
        }
      }
    }
    
    const afterMemory = this.estimateMemoryUsage();
    const memoryFreed = beforeMemory - afterMemory;
    
    logger.info('Pattern pool optimized', {
      removedPatterns: removeCount,
      remainingPatterns: this.patternPool.size,
      memoryFreed
    });
    
    return { removedPatterns: removeCount, memoryFreed };
  }
  
  /**
   * Pre-warm the pattern pool with commonly used medical patterns
   */
  async preWarmPool(category: PatternCategory): Promise<number> {
    const commonPatterns = this.getCommonPatternsForCategory(category);
    let preWarmedCount = 0;
    
    for (const patternRequest of commonPatterns) {
      try {
        await this.compilePattern(patternRequest);
        preWarmedCount++;
      } catch (error) {
        logger.warn('Failed to pre-warm pattern', { pattern: patternRequest.source, error });
      }
    }
    
    logger.info(`Pre-warmed pattern pool for category: ${category}`, {
      preWarmedCount,
      totalPoolSize: this.patternPool.size
    });
    
    return preWarmedCount;
  }
  
  // Private helper methods
  
  private generatePatternKey(source: string, flags: string, category: PatternCategory): string {
    return `${category}_${btoa(source + flags).substring(0, 20)}`;
  }
  
  private async safeCompilePattern(source: string, flags: string): Promise<RegExp> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Pattern compilation timeout'));
      }, this.COMPILE_TIMEOUT);
      
      try {
        const regex = new RegExp(source, flags);
        clearTimeout(timeout);
        resolve(regex);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }
  
  private async storeInPool(
    key: string, 
    regex: RegExp, 
    request: PatternRequest, 
    compileTime: number = 0
  ): Promise<void> {
    const compiledPattern: CompiledPattern = {
      key,
      regex,
      usage: 1,
      lastUsed: Date.now(),
      compileTime,
      category: request.category,
      medicalDomain: request.medicalDomain
    };
    
    this.patternPool.set(key, compiledPattern);
    
    // Update category index
    if (!this.categoryIndex.has(request.category)) {
      this.categoryIndex.set(request.category, new Set());
    }
    this.categoryIndex.get(request.category)!.add(key);
    
    // Update domain index if applicable
    if (request.medicalDomain) {
      if (!this.domainIndex.has(request.medicalDomain)) {
        this.domainIndex.set(request.medicalDomain, new Set());
      }
      this.domainIndex.get(request.medicalDomain)!.add(key);
    }
    
    // Trigger optimization if pool is getting too large
    if (this.patternPool.size > this.MAX_POOL_SIZE) {
      await this.optimizePool();
    }
  }
  
  private estimateMemoryUsage(): number {
    let totalMemory = 0;
    
    for (const pattern of Array.from(this.patternPool.values())) {
      // Estimate memory usage: regex object + metadata
      totalMemory += pattern.regex.source.length * 2; // Unicode characters
      totalMemory += 200; // Object overhead and metadata
    }
    
    return totalMemory; // Bytes
  }
  
  private generateOptimizationRecommendations(
    totalPatterns: number,
    cacheHitRate: number,
    averageCompileTime: number,
    memoryUsage: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (cacheHitRate < 0.7) {
      recommendations.push('Low cache hit rate - consider pre-warming frequently used patterns');
    }
    
    if (averageCompileTime > 10) {
      recommendations.push('High average compile time - optimize complex regex patterns');
    }
    
    if (memoryUsage > 10 * 1024 * 1024) { // 10MB
      recommendations.push('High memory usage - enable automatic pool optimization');
    }
    
    if (totalPatterns > this.MAX_POOL_SIZE * 0.9) {
      recommendations.push('Pattern pool near capacity - increase pool size or optimize patterns');
    }
    
    if (totalPatterns < 50) {
      recommendations.push('Small pattern pool - consider pre-compiling more common patterns');
    }
    
    return recommendations;
  }
  
  private initializeCategoryIndices(): void {
    const categories: PatternCategory[] = [
      'medical_terms', 'asr_corrections', 'text_cleaning', 'stenosis_grading',
      'medication_patterns', 'hemodynamic_measurements', 'vessel_anatomy', 'australian_spelling'
    ];
    
    for (const category of categories) {
      this.categoryIndex.set(category, new Set());
    }
  }
  
  private async precompileMedicalPatterns(): Promise<void> {
    const criticalPatterns = [
      // TIMI flow patterns
      { 
        source: '\\b(timi|TIMI)\\s+(flow\\s+)?(zero|0|one|1|two|2|three|3)\\b', 
        flags: 'gi', 
        category: 'medical_terms' as PatternCategory,
        medicalDomain: 'cardiology'
      },
      // Stenosis grading
      { 
        source: '\\b(mild|moderate|severe)\\s+(stenosis|regurgitation)\\b', 
        flags: 'gi', 
        category: 'stenosis_grading' as PatternCategory,
        medicalDomain: 'cardiology'
      },
      // Vessel references
      { 
        source: '\\b(LAD|RCA|LCX|OM|D1|D2|PDA|PLV)\\b', 
        flags: 'gi', 
        category: 'vessel_anatomy' as PatternCategory,
        medicalDomain: 'cardiology'
      },
      // Medication dosing
      { 
        source: '\\b(\\w+)\\s+(\\d+(?:\\.\\d+)?)\\s*(mg|mcg|units?)\\b', 
        flags: 'gi', 
        category: 'medication_patterns' as PatternCategory
      },
      // Blood pressure readings
      { 
        source: '\\b(\\d{2,3})\\s*(?:over|on|\\/)\\s*(\\d{2,3})\\s*(?:mmhg)?\\b', 
        flags: 'gi', 
        category: 'hemodynamic_measurements' as PatternCategory,
        medicalDomain: 'cardiology'
      },
      // Australian spelling
      { 
        source: '\\b(color|colors)\\b', 
        flags: 'gi', 
        category: 'australian_spelling' as PatternCategory
      }
    ];
    
    let precompiledCount = 0;
    for (const pattern of criticalPatterns) {
      try {
        await this.compilePattern(pattern);
        precompiledCount++;
      } catch (error) {
        logger.warn('Failed to precompile critical pattern', { pattern: pattern.source, error });
      }
    }
    
    logger.info('Precompiled critical medical patterns', { 
      precompiledCount, 
      totalPatterns: criticalPatterns.length 
    });
  }
  
  private getCommonPatternsForCategory(category: PatternCategory): PatternRequest[] {
    const patterns: { [key in PatternCategory]: PatternRequest[] } = {
      medical_terms: [
        { source: '\\b(stenosis|regurgitation|insufficiency)\\b', flags: 'gi', category },
        { source: '\\b(systolic|diastolic|pulse pressure)\\b', flags: 'gi', category },
        { source: '\\b(ejection fraction|EF)\\s*(?:of\\s*)?(\\d{1,3})%?\\b', flags: 'gi', category },
      ],
      asr_corrections: [
        { source: '\\btimi\\b', flags: 'gi', category },
        { source: '\\bcoronary\\b', flags: 'gi', category },
        { source: '\\bpercutaneous\\b', flags: 'gi', category },
      ],
      text_cleaning: [
        { source: '\\s+', flags: 'g', category },
        { source: '([.!?])\\s*([A-Z])', flags: 'g', category },
      ],
      stenosis_grading: [
        { source: '\\b(mild|moderate|severe|critical)\\s+(stenosis|regurgitation)\\b', flags: 'gi', category },
      ],
      medication_patterns: [
        { source: '\\b(\\w+)\\s+(\\d+(?:\\.\\d+)?)\\s*(mg|mcg|g|ml|units?)\\b', flags: 'gi', category },
        { source: '\\b(daily|twice daily|bd|od|tds|qid)\\b', flags: 'gi', category },
      ],
      hemodynamic_measurements: [
        { source: '\\b(\\d{2,3})\\/(\\d{2,3})\\s*(?:mmhg)?\\b', flags: 'gi', category },
        { source: '\\b(\\d+(?:\\.\\d+)?)\\s*(?:l\\/min|lpm)\\b', flags: 'gi', category },
      ],
      vessel_anatomy: [
        { source: '\\b(LAD|RCA|LCX|OM|D1|D2|PDA|PLV|LMCA)\\b', flags: 'gi', category },
        { source: '\\b(proximal|mid|distal)\\s+(LAD|RCA|LCX)\\b', flags: 'gi', category },
      ],
      australian_spelling: [
        { source: '\\b(color|colors)\\b', flags: 'gi', category },
        { source: '\\b(center|centers)\\b', flags: 'gi', category },
        { source: '\\bfurosemide\\b', flags: 'gi', category },
      ]
    };
    
    return patterns[category] || [];
  }
}

// Convenience functions for easy integration
export async function compileRegexPattern(
  source: string, 
  flags: string, 
  category: PatternCategory,
  medicalDomain?: string
): Promise<RegExp> {
  return PatternCompiler.getInstance().compilePattern({
    source,
    flags,
    category,
    medicalDomain
  });
}

export function getPatternPoolStats(): PatternPoolStats {
  return PatternCompiler.getInstance().getPatternPoolStats();
}

export async function optimizePatternPool(): Promise<{ removedPatterns: number; memoryFreed: number }> {
  return PatternCompiler.getInstance().optimizePool();
}
