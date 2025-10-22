/**
 * Agent Categories Configuration
 *
 * Defines agent categories with associated color schemes for UI consistency.
 * Categories:
 * - Letters: Correspondence and communications
 * - Clinical Data: Background, investigations, medications
 * - Procedures: Interventional procedures
 * - AI Review: AI-powered clinical reviews
 */

import type { AgentType } from '@/types/medical.types';

export interface CategoryColorScheme {
  // Background colors
  bg: string;
  bgHover: string;
  bgGradient: string;

  // Border colors
  border: string;
  borderHover: string;

  // Text colors
  text: string;
  textMuted: string;

  // Indicator/dot colors
  indicator: string;

  // Badge colors
  badgeBg: string;
  badgeText: string;
}

export interface AgentCategory {
  id: string;
  label: string;
  icon: string;
  agents: AgentType[];
  colors: CategoryColorScheme;
  description: string;
}

/**
 * Agent category definitions with color schemes
 */
export const AGENT_CATEGORIES: Record<string, AgentCategory> = {
  letters: {
    id: 'letters',
    label: 'Letters & Correspondence',
    icon: '✉️',
    agents: ['quick-letter', 'consultation', 'patient-education'],
    colors: {
      bg: 'bg-blue-50',
      bgHover: 'bg-blue-100',
      bgGradient: 'bg-gradient-to-br from-blue-50 to-blue-100',
      border: 'border-blue-200',
      borderHover: 'border-blue-300',
      text: 'text-blue-700',
      textMuted: 'text-blue-600',
      indicator: 'bg-blue-500',
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-700'
    },
    description: 'Clinical letters, consultations, and patient communications'
  },

  clinical_data: {
    id: 'clinical_data',
    label: 'Clinical Data',
    icon: '📋',
    agents: [
      'background',
      'investigation-summary',
      'medication',
      'bloods',
      'imaging'
    ],
    colors: {
      bg: 'bg-emerald-50',
      bgHover: 'bg-emerald-100',
      bgGradient: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
      border: 'border-emerald-200',
      borderHover: 'border-emerald-300',
      text: 'text-emerald-700',
      textMuted: 'text-emerald-600',
      indicator: 'bg-emerald-500',
      badgeBg: 'bg-emerald-100',
      badgeText: 'text-emerald-700'
    },
    description: 'Patient background, investigations, and clinical summaries'
  },

  procedures: {
    id: 'procedures',
    label: 'Procedures',
    icon: '🔬',
    agents: [
      'tavi',
      'tavi-workup',
      'angiogram-pci',
      'mteer',
      'tteer',
      'pfo-closure',
      'asd-closure',
      'pvl-plug',
      'bypass-graft',
      'right-heart-cath'
    ],
    colors: {
      bg: 'bg-purple-50',
      bgHover: 'bg-purple-100',
      bgGradient: 'bg-gradient-to-br from-purple-50 to-purple-100',
      border: 'border-purple-200',
      borderHover: 'border-purple-300',
      text: 'text-purple-700',
      textMuted: 'text-purple-600',
      indicator: 'bg-purple-500',
      badgeBg: 'bg-purple-100',
      badgeText: 'text-purple-700'
    },
    description: 'Interventional cardiac procedures and reports'
  },

  ai_review: {
    id: 'ai_review',
    label: 'AI Review',
    icon: '🧠',
    agents: [
      'ai-medical-review',
      'batch-ai-review',
      'aus-medical-review'
    ],
    colors: {
      bg: 'bg-amber-50',
      bgHover: 'bg-amber-100',
      bgGradient: 'bg-gradient-to-br from-amber-50 to-amber-100',
      border: 'border-amber-200',
      borderHover: 'border-amber-300',
      text: 'text-amber-700',
      textMuted: 'text-amber-600',
      indicator: 'bg-amber-500',
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-700'
    },
    description: 'AI-powered clinical reviews and recommendations'
  }
};

/**
 * Get category for a specific agent type
 */
export function getAgentCategory(agentType: AgentType): AgentCategory {
  for (const category of Object.values(AGENT_CATEGORIES)) {
    if (category.agents.includes(agentType)) {
      return category;
    }
  }

  // Default to clinical_data for unknown agents
  return AGENT_CATEGORIES.clinical_data;
}

/**
 * Get color scheme for a specific agent type
 */
export function getAgentColors(agentType: AgentType): CategoryColorScheme {
  const category = getAgentCategory(agentType);
  return category.colors;
}

/**
 * Get category icon for a specific agent type
 */
export function getAgentCategoryIcon(agentType: AgentType): string {
  const category = getAgentCategory(agentType);
  return category.icon;
}

/**
 * Get category label for a specific agent type
 */
export function getAgentCategoryLabel(agentType: AgentType): string {
  const category = getAgentCategory(agentType);
  return category.label;
}

/**
 * Get all category IDs
 */
export function getAllCategoryIds(): string[] {
  return Object.keys(AGENT_CATEGORIES);
}

/**
 * Get agents by category
 */
export function getAgentsByCategory(categoryId: string): AgentType[] {
  const category = AGENT_CATEGORIES[categoryId];
  return category ? category.agents : [];
}
