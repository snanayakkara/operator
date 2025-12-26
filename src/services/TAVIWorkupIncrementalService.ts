/**
 * TAVI Workup Incremental Service - Phase 4
 *
 * Handles parsing and merging incremental dictation into existing workup sections.
 * Uses lightweight model (qwen3-4b) for quick parsing without full validation workflow.
 *
 * Pattern: Simple append with separator (no complex validation)
 * Merge Strategy: Append new content with clear separator
 */

import { LMStudioService } from './LMStudioService';
import type { TAVIWorkupStructuredSections } from '@/types/medical.types';

export interface IncrementalDictationResult {
  sectionKey: keyof Omit<TAVIWorkupStructuredSections, 'missing_summary'>;
  parsedContent: string;
  confidence: number;
}

export class TAVIWorkupIncrementalService {
  private static instance: TAVIWorkupIncrementalService | null = null;
  private lmService: LMStudioService;

  private constructor() {
    this.lmService = LMStudioService.getInstance();
  }

  public static getInstance(): TAVIWorkupIncrementalService {
    if (!TAVIWorkupIncrementalService.instance) {
      TAVIWorkupIncrementalService.instance = new TAVIWorkupIncrementalService();
    }
    return TAVIWorkupIncrementalService.instance;
  }

  /**
   * Parse dictation and determine target section
   */
  public async parseDictation(
    dictation: string,
    targetSection: keyof Omit<TAVIWorkupStructuredSections, 'missing_summary'>
  ): Promise<IncrementalDictationResult> {
    const systemPrompt = `You are a medical documentation assistant helping update TAVI workup sections.

The user will provide additional dictated content to append to the "${this.getSectionTitle(targetSection)}" section.

Your task:
1. Parse and clean up the dictated content
2. Format it appropriately for medical documentation
3. Return ONLY the cleaned content, ready to append

Rules:
- Keep medical terminology precise
- Use proper abbreviations (e.g., EF, LVEDD, mod, dil)
- Format measurements correctly (e.g., "LVEDD 59" not "LVEDD-59")
- Remove filler words but preserve clinical meaning
- Return ONLY the content, no preamble or explanation`;

    const userPrompt = `Dictated content to add to ${this.getSectionTitle(targetSection)}:\n\n${dictation}`;

    try {
      const response = await this.lmService.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        {
          model: 'qwen/qwen3-4b-2507',
          maxTokens: 500,
          temperature: 0.3
        }
      );

      const parsedContent = response.choices[0].message.content.trim();

      return {
        sectionKey: targetSection,
        parsedContent,
        confidence: 0.9 // High confidence for simple parsing
      };
    } catch (error) {
      console.error('[TAVIWorkupIncrementalService] Failed to parse dictation:', error);
      throw error;
    }
  }

  /**
   * Merge parsed content into existing section content
   */
  public mergeContent(existingContent: string, newContent: string): string {
    const trimmedExisting = existingContent.trim();
    const trimmedNew = newContent.trim();

    // If no existing content, just return new content
    if (!trimmedExisting || trimmedExisting === 'Not provided') {
      return trimmedNew;
    }

    // Append with clear separator
    return `${trimmedExisting}\n\n--- Additional Information ---\n${trimmedNew}`;
  }

  /**
   * Get human-readable section title
   */
  private getSectionTitle(sectionKey: keyof Omit<TAVIWorkupStructuredSections, 'missing_summary'>): string {
    const titles: Record<keyof Omit<TAVIWorkupStructuredSections, 'missing_summary'>, string> = {
      patient: 'Patient Demographics',
      clinical: 'Clinical Assessment',
      laboratory: 'Laboratory Values',
      ecg: 'ECG Assessment',
      background: 'Background History',
      medications: 'Medications',
      social_history: 'Social History',
      investigations: 'Other Investigations',
      echocardiography: 'Echocardiography',
      // enhanced_ct REMOVED - CT data in ctMeasurements
      procedure_planning: 'Procedure Planning',
      alerts: 'Alerts & Considerations'
    };

    return titles[sectionKey];
  }
}
