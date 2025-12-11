/**
 * Unified Actions Configuration
 *
 * Single source of truth for all workflows and actions in Operator.
 * This registry powers:
 * - Command bar search
 * - Actions drawer
 * - Favourites row
 * - Keyboard shortcuts
 *
 * Each action has a consistent interface regardless of whether it's
 * a full dictation workflow or a quick EMR action.
 */

import type { LucideIcon } from 'lucide-react';
import {
  FileText,
  Stethoscope,
  ClipboardList,
  Heart,
  CircleDot,
  Zap,
  Shield,
  Activity,
  Monitor,
  User,
  Pill,
  UserCheck,
  TestTube,
  Scan,
  Search,
  GraduationCap,
  Bot,
  Users,
  Droplet,
  Combine,
  Camera,
  CheckSquare,
  Calendar
} from 'lucide-react';
import type { AgentType } from '@/types/medical.types';

/**
 * Action groups for visual organization in the drawer
 */
export type ActionGroup =
  | 'workflows'
  | 'patient-context'
  | 'documentation'
  | 'ai-tools'
  | 'analysis'
  | 'utilities';

/**
 * Input modes supported by an action
 */
export type InputMode = 'dictate' | 'type' | 'vision' | 'click';

/**
 * Complexity level for time estimation
 */
export type Complexity = 'low' | 'medium' | 'high';

/**
 * Unified action configuration
 */
export interface UnifiedAction {
  /** Unique identifier */
  id: string;

  /** Display label */
  label: string;

  /** Short alias for constrained spaces */
  alias?: string;

  /** Description for tooltips and search */
  description: string;

  /** Lucide icon component */
  icon: LucideIcon;

  /** Visual group in the drawer */
  group: ActionGroup;

  /** Keyboard shortcut (single key, shown in drawer) */
  shortcut?: string;

  /** Supported input modes */
  modes: InputMode[];

  /** Agent type for workflow routing (if applicable) */
  agentType?: AgentType;

  /** Quick action field ID for EMR integration */
  quickActionField?: string;

  /** Estimated time for workflows */
  estimatedTime?: string;

  /** Complexity level */
  complexity?: Complexity;

  /** Whether this action is coming soon (disabled) */
  comingSoon?: boolean;

  /** Color theme for visual distinction */
  colorTheme?: 'blue' | 'purple' | 'emerald' | 'amber' | 'red' | 'cyan' | 'violet';
}

/**
 * Group metadata for drawer sections
 */
export interface ActionGroupMeta {
  id: ActionGroup;
  label: string;
  description?: string;
  defaultExpanded?: boolean;
}

/**
 * Action group metadata
 */
export const ACTION_GROUPS: ActionGroupMeta[] = [
  {
    id: 'workflows',
    label: 'Workflows',
    description: 'Full dictation workflows for consultations and procedures',
    defaultExpanded: true
  },
  {
    id: 'patient-context',
    label: 'Patient Context',
    description: 'EMR field entry and patient data',
    defaultExpanded: true
  },
  {
    id: 'documentation',
    label: 'Documentation',
    description: 'Investigations, education, and planning',
    defaultExpanded: true
  },
  {
    id: 'ai-tools',
    label: 'AI Tools',
    description: 'AI-powered analysis and review',
    defaultExpanded: false
  },
  {
    id: 'analysis',
    label: 'Analysis',
    description: 'Data import and trending',
    defaultExpanded: false
  },
  {
    id: 'utilities',
    label: 'Utilities',
    description: 'Media capture and task management',
    defaultExpanded: false
  }
];

/**
 * All unified actions
 */
export const UNIFIED_ACTIONS: UnifiedAction[] = [
  // ============================================
  // WORKFLOWS - Full dictation workflows
  // ============================================
  {
    id: 'quick-letter',
    label: 'Quick Letter',
    alias: 'Letter',
    description: 'Medical correspondence and consultation letters',
    icon: FileText,
    group: 'workflows',
    shortcut: 'L',
    modes: ['dictate', 'type'],
    agentType: 'quick-letter',
    estimatedTime: '1-3 min',
    complexity: 'low',
    colorTheme: 'blue'
  },
  {
    id: 'consultation',
    label: 'Consultation',
    alias: 'Consult',
    description: 'Comprehensive patient assessments',
    icon: Stethoscope,
    group: 'workflows',
    shortcut: 'C',
    modes: ['dictate'],
    agentType: 'consultation',
    estimatedTime: '2-4 min',
    complexity: 'medium',
    colorTheme: 'blue'
  },
  {
    id: 'tavi-workup',
    label: 'TAVI Workup',
    description: 'Pre-procedural TAVI anatomical and clinical workup summary',
    icon: ClipboardList,
    group: 'workflows',
    modes: ['dictate'],
    agentType: 'tavi-workup',
    estimatedTime: '3-5 min',
    complexity: 'medium',
    colorTheme: 'red'
  },
  {
    id: 'angiogram-pci',
    label: 'Angiogram/PCI',
    alias: 'Angio',
    description: 'Cardiac catheterization and coronary interventions',
    icon: Heart,
    group: 'workflows',
    modes: ['dictate'],
    agentType: 'angiogram-pci',
    estimatedTime: '8-15 min',
    complexity: 'high',
    colorTheme: 'red'
  },
  {
    id: 'tavi',
    label: 'TAVI Report',
    description: 'Transcatheter aortic valve implantation',
    icon: CircleDot,
    group: 'workflows',
    shortcut: 'T',
    modes: ['dictate'],
    agentType: 'tavi',
    estimatedTime: '8-12 min',
    complexity: 'high',
    colorTheme: 'red'
  },
  {
    id: 'mteer',
    label: 'mTEER Report',
    alias: 'mTEER',
    description: 'Mitral transcatheter edge-to-edge repair',
    icon: Zap,
    group: 'workflows',
    modes: ['dictate'],
    agentType: 'mteer',
    estimatedTime: '7-10 min',
    complexity: 'high',
    colorTheme: 'purple'
  },
  {
    id: 'pfo-closure',
    label: 'PFO Closure',
    alias: 'PFO',
    description: 'Patent foramen ovale closure',
    icon: Shield,
    group: 'workflows',
    modes: ['dictate'],
    agentType: 'pfo-closure',
    estimatedTime: '5-8 min',
    complexity: 'medium',
    colorTheme: 'emerald'
  },
  {
    id: 'right-heart-cath',
    label: 'Right Heart Cath',
    alias: 'RHC',
    description: 'Right heart catheterisation with haemodynamic assessment',
    icon: Activity,
    group: 'workflows',
    shortcut: 'R',
    modes: ['dictate', 'type'],
    agentType: 'right-heart-cath',
    estimatedTime: '6-10 min',
    complexity: 'medium',
    colorTheme: 'amber'
  },
  {
    id: 'ohif-viewer',
    label: 'OHIF Viewer',
    alias: 'OHIF',
    description: 'Medical imaging viewer',
    icon: Monitor,
    group: 'workflows',
    modes: ['click'],
    agentType: 'ohif-viewer',
    comingSoon: true,
    colorTheme: 'cyan'
  },

  // ============================================
  // PATIENT CONTEXT - EMR field entry
  // ============================================
  {
    id: 'background',
    label: 'Background',
    description: 'Patient background notes and history',
    icon: User,
    group: 'patient-context',
    shortcut: 'B',
    modes: ['dictate', 'type'],
    agentType: 'background',
    quickActionField: 'background',
    colorTheme: 'blue'
  },
  {
    id: 'medications',
    label: 'Medications',
    alias: 'Meds',
    description: 'View and edit medication list',
    icon: Pill,
    group: 'patient-context',
    shortcut: 'M',
    modes: ['dictate', 'type'],
    agentType: 'medication',
    quickActionField: 'medications',
    colorTheme: 'blue'
  },
  {
    id: 'social-history',
    label: 'Social History',
    alias: 'Social',
    description: 'Social and family history section',
    icon: UserCheck,
    group: 'patient-context',
    modes: ['dictate', 'type'],
    agentType: 'background',
    quickActionField: 'social-history',
    colorTheme: 'blue'
  },
  {
    id: 'bloods',
    label: 'Bloods',
    description: 'Blood test results and analysis',
    icon: TestTube,
    group: 'patient-context',
    modes: ['dictate', 'type'],
    agentType: 'bloods',
    quickActionField: 'bloods',
    colorTheme: 'blue'
  },
  {
    id: 'imaging',
    label: 'Imaging',
    description: 'Medical imaging reports and analysis',
    icon: Scan,
    group: 'patient-context',
    modes: ['dictate', 'type'],
    agentType: 'imaging',
    quickActionField: 'imaging',
    colorTheme: 'blue'
  },

  // ============================================
  // DOCUMENTATION
  // ============================================
  {
    id: 'investigation-summary',
    label: 'Investigations',
    alias: 'Invests',
    description: 'Investigation summary with dictation, typing, or image scan',
    icon: Search,
    group: 'patient-context',
    shortcut: 'I',
    modes: ['dictate', 'type', 'vision'],
    agentType: 'investigation-summary',
    quickActionField: 'investigation-summary',
    colorTheme: 'blue'
  },
  {
    id: 'patient-education',
    label: 'Patient Education',
    alias: 'Pt Ed',
    description: 'Generate lifestyle advice and education materials',
    icon: GraduationCap,
    group: 'documentation',
    modes: ['click'],
    colorTheme: 'blue'
  },
  {
    id: 'pre-op-plan',
    label: 'Pre-Op Plan',
    alias: 'Pre-Op',
    description: 'Generate A5 pre-procedure summary card for cath lab',
    icon: ClipboardList,
    group: 'documentation',
    shortcut: 'P',
    modes: ['click'],
    colorTheme: 'blue'
  },

  // ============================================
  // AI TOOLS
  // ============================================
  {
    id: 'ai-medical-review',
    label: 'AI Medical Review',
    alias: 'AI Review',
    description: 'Australian clinical oversight and guidelines review',
    icon: Bot,
    group: 'ai-tools',
    shortcut: 'A',
    modes: ['click'],
    colorTheme: 'violet'
  },
  {
    id: 'batch-ai-review',
    label: 'Batch AI Review',
    alias: 'Batch',
    description: 'AI review for multiple patients from appointment book',
    icon: Users,
    group: 'ai-tools',
    modes: ['click'],
    colorTheme: 'violet'
  },

  // ============================================
  // ANALYSIS
  // ============================================
  {
    id: 'bp-diary-importer',
    label: 'BP Diary',
    description: 'Import and analyze blood pressure diary images',
    icon: Activity,
    group: 'analysis',
    modes: ['click'],
    colorTheme: 'purple'
  },
  {
    id: 'lipid-profile-importer',
    label: 'Lipid Profile',
    alias: 'Lipids',
    description: 'Import lipid profiles and generate insights',
    icon: Droplet,
    group: 'analysis',
    modes: ['click'],
    colorTheme: 'purple'
  },
  {
    id: 'tte-trend-importer',
    label: 'Echo (TTE) Trends',
    alias: 'TTE',
    description: 'Import echo reports, trend LVEF/RVSP/LVEDD',
    icon: Scan,
    group: 'analysis',
    modes: ['click'],
    colorTheme: 'purple'
  },

  // ============================================
  // UTILITIES
  // ============================================
  {
    id: 'annotate-screenshots',
    label: 'Canvas',
    description: 'Capture, annotate, and combine multiple screenshots',
    icon: Combine,
    group: 'utilities',
    modes: ['click'],
    colorTheme: 'cyan'
  },
  {
    id: 'profile-photo',
    label: 'Photo',
    description: 'Capture screenshot for patient profile',
    icon: Camera,
    group: 'utilities',
    modes: ['click'],
    colorTheme: 'cyan'
  },
  {
    id: 'create-task',
    label: 'Create Task',
    alias: 'Task',
    description: 'Add new task to workflow',
    icon: CheckSquare,
    group: 'utilities',
    modes: ['click'],
    colorTheme: 'emerald'
  }
];

/**
 * Default favourite action IDs (shown in header)
 */
export const DEFAULT_FAVOURITES: string[] = [
  'quick-letter',
  'background',
  'investigation-summary',
  'appointment-wrap-up'
];

/**
 * Appointment Wrap-Up is special - it's a favourite but not in the drawer
 * It opens a full-panel builder instead
 */
export const APPOINTMENT_WRAP_UP: UnifiedAction = {
  id: 'appointment-wrap-up',
  label: 'Wrap Up',
  description: 'Complete appointment workflow',
  icon: Calendar,
  group: 'utilities',
  shortcut: 'W',
  modes: ['click'],
  colorTheme: 'emerald'
};

// ============================================
// Helper functions
// ============================================

/**
 * Get action by ID
 */
export function getActionById(id: string): UnifiedAction | undefined {
  if (id === 'appointment-wrap-up') {
    return APPOINTMENT_WRAP_UP;
  }
  return UNIFIED_ACTIONS.find(action => action.id === id);
}

/**
 * Get actions by group
 */
export function getActionsByGroup(group: ActionGroup): UnifiedAction[] {
  return UNIFIED_ACTIONS.filter(action => action.group === group);
}

/**
 * Get action by shortcut key
 */
export function getActionByShortcut(key: string): UnifiedAction | undefined {
  const upperKey = key.toUpperCase();
  if (APPOINTMENT_WRAP_UP.shortcut === upperKey) {
    return APPOINTMENT_WRAP_UP;
  }
  return UNIFIED_ACTIONS.find(action => action.shortcut === upperKey);
}

/**
 * Get all actions including special ones
 */
export function getAllActions(): UnifiedAction[] {
  return [...UNIFIED_ACTIONS, APPOINTMENT_WRAP_UP];
}

/**
 * Get favourite actions
 */
export function getFavouriteActions(): UnifiedAction[] {
  return DEFAULT_FAVOURITES.map(id => getActionById(id)).filter(Boolean) as UnifiedAction[];
}

/**
 * Check if action supports a specific mode
 */
export function actionSupportsMode(action: UnifiedAction, mode: InputMode): boolean {
  return action.modes.includes(mode);
}

/**
 * Check if action is a dual-mode action (dictate + type)
 */
export function isDualMode(action: UnifiedAction): boolean {
  return action.modes.includes('dictate') && action.modes.includes('type') && !action.modes.includes('vision');
}

/**
 * Check if action is a tri-mode action (dictate + type + vision)
 */
export function isTriMode(action: UnifiedAction): boolean {
  return action.modes.includes('dictate') && action.modes.includes('type') && action.modes.includes('vision');
}

/**
 * Check if action is a simple click action
 */
export function isClickOnly(action: UnifiedAction): boolean {
  return action.modes.length === 1 && action.modes[0] === 'click';
}

/**
 * Fuzzy search actions by label, alias, or description
 */
export function searchActions(query: string): UnifiedAction[] {
  if (!query.trim()) {
    return getAllActions();
  }

  const lowerQuery = query.toLowerCase();

  return getAllActions().filter(action => {
    const searchableText = [
      action.label,
      action.alias,
      action.description,
      action.shortcut
    ].filter(Boolean).join(' ').toLowerCase();

    return searchableText.includes(lowerQuery);
  });
}

/**
 * Get group metadata by ID
 */
export function getGroupMeta(group: ActionGroup): ActionGroupMeta | undefined {
  return ACTION_GROUPS.find(g => g.id === group);
}
