/**
 * Centralized System Prompt Loader Service
 *
 * Provides dynamic loading of system prompts from consolidated SystemPrompts files.
 * Replaces hard-coded prompt strings with centralized, cached prompt management.
 *
 * Features:
 * - Dynamic import for code splitting and performance
 * - Caching for frequently accessed prompts
 * - Type-safe prompt keys and agent type mapping
 * - Validation and fallback handling
 * - Support for prompt variants and contexts
 */

import type { AgentType } from '@/types/medical.types';
import { logger } from '@/utils/Logger';
import { toError } from '@/utils/errorHelpers';

// System prompt cache to avoid repeated imports
const promptCache = new Map<string, any>();

// Agent type to SystemPrompts file mapping
const SYSTEM_PROMPT_FILES: Partial<Record<AgentType, string>> = {
  'quick-letter': 'QuickLetterSystemPrompts',
  'tavi': 'TAVISystemPrompts',
  'angiogram-pci': 'AngiogramPCISystemPrompts',
  'mteer': 'MTEERSystemPrompts',
  'tteer': 'MTEERSystemPrompts',
  'pfo-closure': 'PFOClosureSystemPrompts',
  'asd-closure': 'PFOClosureSystemPrompts',
  'pvl-plug': 'PFOClosureSystemPrompts',
  'bypass-graft': 'TAVISystemPrompts',
  'right-heart-cath': 'RightHeartCathSystemPrompts',
  'consultation': 'ConsultationSystemPrompts',
  'investigation-summary': 'InvestigationSummarySystemPrompts',
  'aus-medical-review': 'AusReviewSystemPrompts',
  'background': 'BackgroundSystemPrompts',
  'medication': 'MedicationSystemPrompts',
  'bloods': 'BloodsSystemPrompts',
  'imaging': 'ImagingSystemPrompts',
  'ohif-viewer': 'ImagingSystemPrompts',
  'patient-education': 'PatientEducationSystemPrompts',
  'pre-op-plan': 'PreOpPlanSystemPrompt',
  'ai-medical-review': 'BatchPatientReviewSystemPrompts',
  'batch-ai-review': 'BatchPatientReviewSystemPrompts',
  'tavi-workup': 'TAVIWorkupSystemPrompts',
  'enhancement': 'QuickLetterSystemPrompts',
  'transcription': 'QuickLetterSystemPrompts',
  'generation': 'QuickLetterSystemPrompts'
};

// Standard prompt keys that most agents support
export type SystemPromptKey =
  | 'primary'
  | 'systemPrompt'
  | 'medicalKnowledge'
  | 'validationPatterns'
  | 'templates'
  | 'qaRules'
  | string; // Allow custom keys for agent-specific prompts

// Prompt context for specialized behavior
export interface PromptContext {
  variant?: 'simple' | 'complex' | 'streaming' | 'reprocessing';
  includeContext?: boolean;
  patientAge?: number;
  clinicalSeverity?: 'low' | 'moderate' | 'high';
}

export class SystemPromptLoader {
  private static instance: SystemPromptLoader;
  private loadingPromises = new Map<string, Promise<any>>();

  static getInstance(): SystemPromptLoader {
    if (!SystemPromptLoader.instance) {
      SystemPromptLoader.instance = new SystemPromptLoader();
    }
    return SystemPromptLoader.instance;
  }

  /**
   * Load system prompt for a specific agent and key
   */
  async loadSystemPrompt(
    agentType: AgentType,
    promptKey: SystemPromptKey = 'primary',
    context?: PromptContext
  ): Promise<string> {
    try {
      const cacheKey = `${agentType}:${promptKey}:${JSON.stringify(context || {})}`;

      // Check cache first
      if (promptCache.has(cacheKey)) {
        return promptCache.get(cacheKey);
      }

      // Load the SystemPrompts file for this agent
      const systemPrompts = await this.loadSystemPromptsFile(agentType);

      // Extract the specific prompt
      const prompt = this.extractPrompt(systemPrompts, promptKey, context);

      if (!prompt) {
        throw new Error(`Prompt key '${promptKey}' not found for agent '${agentType}'`);
      }

      // Cache the result
      promptCache.set(cacheKey, prompt);

      logger.debug('System prompt loaded', {
        agentType,
        promptKey,
        context,
        promptLength: prompt.length
      });

      return prompt;
    } catch (error) {
      logger.error('Failed to load system prompt', { agentType, promptKey, error });

      // Return fallback prompt to prevent system failure
      const fallbackPrompt = this.getFallbackPrompt(agentType);
      logger.warn('Using fallback prompt', { agentType, fallback: true });

      return fallbackPrompt;
    }
  }

  /**
   * Load all available prompts for an agent
   */
  async loadAllPromptsForAgent(agentType: AgentType): Promise<Record<string, string>> {
    try {
      const systemPrompts = await this.loadSystemPromptsFile(agentType);
      const allPrompts: Record<string, string> = {};

      // Extract all string prompts from the loaded object
      this.extractAllStringPrompts(systemPrompts, allPrompts);

      logger.debug('All prompts loaded for agent', {
        agentType,
        promptCount: Object.keys(allPrompts).length
      });

      return allPrompts;
    } catch (error) {
      logger.error('Failed to load all prompts for agent', { agentType, error });
      return {};
    }
  }

  /**
   * Validate that a prompt exists for an agent
   */
  async validatePrompt(agentType: AgentType, promptKey: SystemPromptKey): Promise<boolean> {
    try {
      const systemPrompts = await this.loadSystemPromptsFile(agentType);
      return this.hasPromptKey(systemPrompts, promptKey);
    } catch (error) {
      logger.error('Failed to validate prompt', { agentType, promptKey, error });
      return false;
    }
  }

  /**
   * Get available prompt keys for an agent
   */
  async getAvailablePromptKeys(agentType: AgentType): Promise<string[]> {
    try {
      const systemPrompts = await this.loadSystemPromptsFile(agentType);
      return this.extractPromptKeys(systemPrompts);
    } catch (error) {
      logger.error('Failed to get available prompt keys', { agentType, error });
      return [];
    }
  }

  /**
   * Clear prompt cache (useful for development/testing)
   */
  clearCache(): void {
    promptCache.clear();
    this.loadingPromises.clear();
    logger.debug('System prompt cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: promptCache.size,
      keys: Array.from(promptCache.keys())
    };
  }

  // Private methods

  private async loadSystemPromptsFile(agentType: AgentType): Promise<any> {
    const fileName = SYSTEM_PROMPT_FILES[agentType] ?? SYSTEM_PROMPT_FILES['quick-letter'];
    if (!fileName) {
      throw new Error(`No SystemPrompts file configured for agent type: ${agentType}`);
    }

    if (!SYSTEM_PROMPT_FILES[agentType]) {
      logger.warn('Using fallback system prompts mapping', { agentType, fallbackFile: fileName });
    }

    const cacheKey = `file:${fileName}`;

    // Check if we're already loading this file
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    // Check cache
    if (promptCache.has(cacheKey)) {
      return promptCache.get(cacheKey);
    }

    // Create loading promise
    const loadingPromise = this.dynamicImportSystemPrompts(fileName);
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const result = await loadingPromise;
      promptCache.set(cacheKey, result);
      this.loadingPromises.delete(cacheKey);
      return result;
    } catch (error) {
      this.loadingPromises.delete(cacheKey);
      throw error;
    }
  }

  private async dynamicImportSystemPrompts(fileName: string): Promise<any> {
    try {
      // Dynamic import for code splitting
      // Note: Vite requires file extension in static part of import path
      const module = await import(`@/agents/specialized/${fileName}.ts`);

      // Handle different export patterns
      if (module.default) {
        return module.default;
      }

      // Look for the main export (usually the capitalized constant)
      // Priority: exact matches for known patterns
      const knownPatterns = [
        'QUICK_LETTER_SYSTEM_PROMPTS',
        'TAVISystemPrompts',
        `${fileName.replace('SystemPrompts', '').toUpperCase()}_SYSTEM_PROMPTS`,
        fileName.replace('SystemPrompts', '') + 'SystemPrompts'
      ];

      for (const pattern of knownPatterns) {
        if (module[pattern]) {
          return module[pattern];
        }
      }

      // Fallback: Look for any key containing 'PROMPT' or 'SYSTEM'
      const mainExportKey = Object.keys(module).find(key =>
        key.toUpperCase().includes('PROMPT') ||
        key.toUpperCase().includes('SYSTEM')
      );

      if (mainExportKey && module[mainExportKey]) {
        return module[mainExportKey];
      }

      // Last resort: first export
      const firstKey = Object.keys(module)[0];
      if (firstKey && module[firstKey]) {
        return module[firstKey];
      }

      throw new Error(`No valid exports found in ${fileName}. Available exports: ${Object.keys(module).join(', ')}`);
    } catch (error) {
      const err = toError(error);
      throw new Error(`Failed to import ${fileName}: ${err.message}`);
    }
  }

  private extractPrompt(systemPrompts: any, promptKey: string, _context?: PromptContext): string | null {
    if (!systemPrompts || typeof systemPrompts !== 'object') {
      return null;
    }

    // Direct key access
    if (typeof systemPrompts[promptKey] === 'string') {
      return systemPrompts[promptKey];
    }

    // Nested object access (e.g., systemPrompts.primary.systemPrompt)
    if (systemPrompts[promptKey] && typeof systemPrompts[promptKey] === 'object') {
      const nestedPrompt = systemPrompts[promptKey];

      // Look for common nested keys
      const commonKeys = ['systemPrompt', 'prompt', 'text', 'content'];
      for (const key of commonKeys) {
        if (typeof nestedPrompt[key] === 'string') {
          return nestedPrompt[key];
        }
      }
    }

    // Search recursively for prompt strings
    return this.findPromptRecursively(systemPrompts, promptKey);
  }

  private findPromptRecursively(obj: any, targetKey: string): string | null {
    if (!obj || typeof obj !== 'object') {
      return null;
    }

    for (const [key, value] of Object.entries(obj)) {
      if (key === targetKey && typeof value === 'string') {
        return value;
      }

      if (typeof value === 'object') {
        const result = this.findPromptRecursively(value, targetKey);
        if (result) {
          return result;
        }
      }
    }

    return null;
  }

  private hasPromptKey(systemPrompts: any, promptKey: string): boolean {
    return this.extractPrompt(systemPrompts, promptKey) !== null;
  }

  private extractPromptKeys(systemPrompts: any): string[] {
    const keys: string[] = [];

    const extractKeysRecursively = (obj: any, prefix = '') => {
      if (!obj || typeof obj !== 'object') return;

      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (typeof value === 'string') {
          keys.push(fullKey);
        } else if (typeof value === 'object') {
          extractKeysRecursively(value, fullKey);
        }
      }
    };

    extractKeysRecursively(systemPrompts);
    return keys;
  }

  private extractAllStringPrompts(obj: any, result: Record<string, string>, prefix = ''): void {
    if (!obj || typeof obj !== 'object') return;

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'string') {
        result[fullKey] = value;
      } else if (typeof value === 'object') {
        this.extractAllStringPrompts(value, result, fullKey);
      }
    }
  }

  private getFallbackPrompt(agentType: AgentType): string {
    const fallbacks: Record<AgentType, string> = {
      'quick-letter': 'You are a medical professional creating clinical correspondence. Format the dictated content as professional medical prose.',
      'tavi': 'You are a specialist interventional cardiologist creating TAVI procedure reports with accurate medical terminology.',
      'angiogram-pci': 'You are a specialist interventional cardiologist creating cardiac catheterization reports.',
      'mteer': 'You are a specialist interventional cardiologist creating mitral TEER procedure reports.',
      'pfo-closure': 'You are a specialist interventional cardiologist creating PFO closure procedure reports.',
      'right-heart-cath': 'You are a specialist cardiologist creating right heart catheterization reports.',
      'consultation': 'You are a specialist physician creating comprehensive consultation reports.',
      'investigation-summary': 'You are a medical professional summarizing investigation results.',
      'aus-medical-review': 'You are a medical professional reviewing content for Australian medical guidelines compliance.',
      'background': 'You are a medical professional documenting patient background and medical history.',
      'medication': 'You are a medical professional reviewing and documenting medication information.',
      'bloods': 'You are a medical professional interpreting and documenting blood test results.',
      'imaging': 'You are a medical professional interpreting and documenting imaging study results.',
      'patient-education': 'You are a medical professional creating patient education materials.',
      'pre-op-plan': 'You are a cath lab procedural planner creating concise pre-operative summary cards.',
      'ai-medical-review': 'You are a medical professional conducting comprehensive AI-assisted medical reviews.',
      'tteer': 'You are a specialist interventional cardiologist creating transcatheter tricuspid edge-to-edge repair procedure reports.',
      'asd-closure': 'You are a specialist interventional cardiologist creating atrial septal defect closure procedure reports.',
      'pvl-plug': 'You are a specialist interventional cardiologist creating paravalvular leak closure procedure reports.',
      'bypass-graft': 'You are a specialist cardiac surgeon creating coronary artery bypass graft procedure reports.',
      'tavi-workup': 'You are a specialist interventional cardiologist creating comprehensive TAVI workup assessments.',
      'batch-ai-review': 'You are a medical professional conducting batch AI-assisted medical reviews.',
      'ohif-viewer': 'You are a medical professional working with OHIF medical imaging viewer system.',
      'enhancement': 'You are a medical professional enhancing existing clinical documentation.',
      'transcription': 'You are a medical professional transcribing clinical dictation.',
      'generation': 'You are a medical professional generating clinical documentation.'
    };

    return fallbacks[agentType] || 'You are a medical professional assisting with clinical documentation.';
  }
}

// Singleton instance for easy access
export const systemPromptLoader = SystemPromptLoader.getInstance();
