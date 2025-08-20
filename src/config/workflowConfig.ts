/**
 * Workflow Configuration for Direct-Select Medical Assistant
 * 
 * This configuration drives the workflow button UI in the side panel.
 * Adding new workflows is as simple as adding entries to this array.
 */

import type { AgentType } from '@/types/medical.types';

export interface WorkflowConfig {
  id: AgentType;
  label: string;
  description: string;
  agent: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind color class
  category: 'procedure' | 'documentation' | 'investigation' | 'batch' | 'advanced';
  estimatedTime: string;
  complexity: 'low' | 'medium' | 'high';
}

export const WORKFLOWS: readonly WorkflowConfig[] = [
  // Documentation workflows - lighter processing, some using optimized models
  {
    id: 'quick-letter',
    label: 'Quick Letter',
    description: 'Medical correspondence and consultation letters',
    agent: 'QuickLetterAgent',
    icon: 'FileText',
    color: 'green',
    category: 'documentation',
    estimatedTime: '1-3 min',
    complexity: 'low'
  },
  {
    id: 'consultation',
    label: 'Consultation',
    description: 'Comprehensive patient assessments',
    agent: 'ConsultationAgent',
    icon: 'Stethoscope',
    color: 'blue',
    category: 'documentation',
    estimatedTime: '2-4 min',
    complexity: 'medium'
  },

  // Complex procedure workflows - detailed medical reports using full MedGemma-27b
  {
    id: 'angiogram-pci',
    label: 'Angiogram/PCI',
    description: 'Cardiac catheterization and coronary interventions',
    agent: 'AngiogramPCIAgent',
    icon: 'Heart',
    color: 'red',
    category: 'procedure',
    estimatedTime: '8-15 min',
    complexity: 'high'
  },
  {
    id: 'tavi',
    label: 'TAVI Report',
    description: 'Transcatheter aortic valve implantation',
    agent: 'TAVIAgent',
    icon: 'CircleDot',
    color: 'red',
    category: 'procedure',
    estimatedTime: '8-12 min',
    complexity: 'high'
  },
  {
    id: 'mteer',
    label: 'mTEER Report',
    description: 'Mitral transcatheter edge-to-edge repair',
    agent: 'MTEERAgent',
    icon: 'Zap',
    color: 'purple',
    category: 'procedure',
    estimatedTime: '7-10 min',
    complexity: 'high'
  },
  {
    id: 'pfo-closure',
    label: 'PFO Closure',
    description: 'Patent foramen ovale closure',
    agent: 'PFOClosureAgent',
    icon: 'Shield',
    color: 'green',
    category: 'procedure',
    estimatedTime: '5-8 min',
    complexity: 'medium'
  },
  {
    id: 'right-heart-cath',
    label: 'Right Heart Cath',
    description: 'Right heart catheterisation with haemodynamic assessment',
    agent: 'RightHeartCathAgent',
    icon: 'Activity',
    color: 'orange',
    category: 'procedure',
    estimatedTime: '6-10 min',
    complexity: 'medium'
  }

] as const;

/**
 * Get workflow configuration by ID
 */
export function getWorkflowById(id: AgentType): WorkflowConfig | undefined {
  return WORKFLOWS.find(workflow => workflow.id === id);
}

/**
 * Get all available workflow IDs
 */
export function getWorkflowIds(): AgentType[] {
  return WORKFLOWS.map(workflow => workflow.id);
}

/**
 * Check if a workflow ID is valid
 */
export function isValidWorkflowId(id: string): id is AgentType {
  return WORKFLOWS.some(workflow => workflow.id === id);
}