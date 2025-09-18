/**
 * Phase 2 Text Normalization
 * 
 * Compatibility layer for Phase 3 agents that references Phase 2 normalization.
 * Provides medical text normalization using existing MedicalTextNormalizer.
 */

import { medicalTextNormalizer } from './MedicalTextNormalizer';

/**
 * Phase 2 text normalization function for backward compatibility
 */
export function preNormalizeMedicalText(input: string): string {
  // Use synchronous pre-normalization optimized for investigation/medical text
  return medicalTextNormalizer.preNormalizeInvestigationTextSync(input);
}
