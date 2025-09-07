/**
 * EMR Field Insertion Configuration
 * 
 * Maps agent types to their corresponding EMR fields for smart insertion.
 * Enables field-specific insertion with modal opening and content appending.
 */

import type { AgentType } from '@/types/medical.types';

/**
 * Maps agent types to their target EMR field actions
 */
export const AGENT_TO_FIELD_MAPPING: Record<AgentType, string | null> = {
  // Agents that target specific EMR fields
  'background': 'background',
  'investigation-summary': 'investigation-summary',
  'medication': 'medications',
  'bloods': null,
  'imaging': null,
  
  // Procedural agents - fallback to generic insertion
  'tavi': null,
  'angiogram-pci': null,
  'mteer': null,
  'tteer': null,
  'pfo-closure': null,
  'asd-closure': null,
  'pvl-plug': null,
  'bypass-graft': null,
  'right-heart-cath': null,
  'tavi-workup': null,
  
  // Documentation agents - fallback to generic insertion  
  'quick-letter': null,
  'consultation': null,
  
  // Analysis agents - fallback to generic insertion
  'ai-medical-review': null,
  'batch-ai-review': null,
  'patient-education': null,
  'enhancement': null,
  'transcription': null,
  'generation': null
};

/**
 * Display names for EMR fields (used in content script)
 */
export const FIELD_DISPLAY_NAMES: Record<string, string> = {
  'background': 'Background',
  'investigation-summary': 'Investigation Summary',
  'medications': 'Medications (Problem List for Phil)',
  'social-history': 'Social & Family History'
};

/**
 * Determines the target EMR field for an agent type
 */
export function getTargetField(agentType: AgentType | null): string | null {
  if (!agentType) return null;
  return AGENT_TO_FIELD_MAPPING[agentType] || null;
}

/**
 * Gets the display name for a field
 */
export function getFieldDisplayName(fieldId: string): string {
  return FIELD_DISPLAY_NAMES[fieldId] || fieldId;
}

/**
 * Checks if an agent type supports field-specific insertion
 */
export function supportsFieldSpecificInsertion(agentType: AgentType | null): boolean {
  return agentType !== null && getTargetField(agentType) !== null;
}