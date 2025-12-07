/**
 * Quick Actions Configuration
 *
 * Defines all quick actions with grouping (core vs secondary),
 * aliases for long labels, categorization, and expandable actions.
 */

import {
  FileText,
  User,
  Pill,
  CheckSquare,
  Calendar,
  Search,
  Mic as _Mic,
  Camera,
  Bot,
  UserCheck,
  Users,
  Combine,
  GraduationCap,
  TestTube,
  Scan,
  Activity,
  Droplet,
  ClipboardList,
  Moon,
  type LucideIcon
} from 'lucide-react';

export interface QuickActionConfig {
  id: string;
  label: string;
  alias?: string; // Short form for long labels
  icon: LucideIcon;
  description: string;
  group: 'core' | 'secondary'; // Core actions = primary EMR/workflow, Secondary = tools/utilities
  category: 'emr' | 'documentation' | 'workflow' | 'analysis';
  shortcut?: string;
  // Expandable actions (hover reveals Dictate vs Type)
  isExpandable?: boolean;
  workflowId?: 'investigation-summary' | 'background' | 'medication' | 'bloods' | 'imaging';
  // Color theme for functional grouping
  colorTheme?: 'blue' | 'cyan' | 'purple' | 'emerald' | 'violet';
}

/**
 * Core Actions (Group 1)
 * Primary EMR data entry and common workflows
 */
export const CORE_ACTIONS: QuickActionConfig[] = [
  {
    id: 'background',
    label: 'Background',
    icon: User,
    description: 'Access patient background notes',
    group: 'core',
    category: 'emr',
    isExpandable: true,
    workflowId: 'background'
  },
  {
    id: 'investigation-summary',
    label: 'Investigations',
    alias: 'Invests',
    icon: Search,
    description: 'Open investigation summary field',
    group: 'core',
    category: 'emr',
    isExpandable: true,
    workflowId: 'investigation-summary'
  },
  {
    id: 'medications',
    label: 'Medications',
    alias: 'Meds',
    icon: Pill,
    description: 'View/edit medication list',
    group: 'core',
    category: 'emr',
    isExpandable: true,
    workflowId: 'medication'
  },
  {
    id: 'social-history',
    label: 'Social History',
    alias: 'Social',
    icon: UserCheck,
    description: 'Access social & family history section',
    group: 'core',
    category: 'emr',
    isExpandable: true,
    workflowId: 'background' // Uses background workflow
  },
  {
    id: 'bloods',
    label: 'Bloods',
    icon: TestTube,
    description: 'Blood test results and analysis',
    group: 'core',
    category: 'emr',
    isExpandable: true,
    workflowId: 'bloods'
  },
  {
    id: 'imaging',
    label: 'Imaging',
    icon: Scan,
    description: 'Medical imaging reports and analysis',
    group: 'core',
    category: 'emr',
    isExpandable: true,
    workflowId: 'imaging'
  },
  {
    id: 'quick-letter',
    label: 'Quick Letter',
    alias: 'Letter',
    icon: FileText,
    description: 'Generate quick medical letter (dictation)',
    group: 'core',
    category: 'documentation'
  },
  {
    id: 'appointment-wrap-up',
    label: 'Wrap Up',
    icon: Calendar,
    description: 'Complete appointment workflow',
    group: 'core',
    category: 'workflow'
  }
];

/**
 * Secondary Actions (Group 2)
 * Tools, utilities, and advanced features
 */
export const SECONDARY_ACTIONS: QuickActionConfig[] = [
  {
    id: 'patient-education',
    label: 'Patient Education',
    alias: 'Pt Ed',
    icon: GraduationCap,
    description: 'Generate lifestyle advice and education',
    group: 'secondary',
    category: 'documentation',
    colorTheme: 'blue' // Documentation (matches core)
  },
  {
    id: 'pre-op-plan',
    label: 'Pre-Op Plan',
    alias: 'Pre-Op',
    icon: ClipboardList,
    description: 'Generate A5 pre-procedure summary card for cath lab',
    group: 'secondary',
    category: 'documentation',
    colorTheme: 'blue' // Documentation (matches core)
  },
  {
    id: 'annotate-screenshots',
    label: 'Canvas',
    icon: Combine,
    description: 'Capture, annotate, and combine multiple screenshots',
    group: 'secondary',
    category: 'emr',
    colorTheme: 'cyan' // Media/Visual tools
  },
  {
    id: 'profile-photo',
    label: 'Photo',
    icon: Camera,
    description: 'Capture screenshot for patient profile',
    group: 'secondary',
    category: 'emr',
    colorTheme: 'cyan' // Media/Visual tools
  },
  {
    id: 'xestro-dark-mode',
    label: 'Dark Mode',
    alias: 'Dark',
    icon: Moon,
    description: 'Toggle a darker Xestro workspace',
    group: 'secondary',
    category: 'emr',
    colorTheme: 'cyan' // Visual tools
  },
  {
    id: 'bp-diary-importer',
    label: 'BP Diary',
    icon: Activity,
    description: 'Import and analyze blood pressure diary images',
    group: 'secondary',
    category: 'analysis',
    colorTheme: 'purple' // Analysis/Data import
  },
  {
    id: 'lipid-profile-importer',
    label: 'Lipid Profile',
    alias: 'Lipids',
    icon: Droplet,
    description: 'Import lipid profiles from Investigation Summary and generate insights',
    group: 'secondary',
    category: 'analysis',
    colorTheme: 'purple' // Analysis/Data import
  },
  {
    id: 'tte-trend-importer',
    label: 'Echo (TTE) Trends',
    alias: 'TTE',
    icon: Scan,
    description: 'Import echo reports, trend LVEF/RVSP/LVEDD, and generate clinical insights',
    group: 'secondary',
    category: 'analysis',
    colorTheme: 'purple' // Analysis/Data import
  },
  {
    id: 'create-task',
    label: 'Create Task',
    alias: 'Task',
    icon: CheckSquare,
    description: 'Add new task to workflow',
    group: 'secondary',
    category: 'workflow',
    colorTheme: 'emerald' // Workflow/Tasks
  },
  {
    id: 'ai-medical-review',
    label: 'AI Medical Review',
    alias: 'AI Review',
    icon: Bot,
    description: 'Australian clinical oversight and guidelines review',
    group: 'secondary',
    category: 'analysis',
    colorTheme: 'violet' // AI Intelligence
  },
  {
    id: 'batch-ai-review',
    label: 'Batch AI Review',
    alias: 'Batch AI',
    icon: Users,
    description: 'AI review for multiple patients from appointment book',
    group: 'secondary',
    category: 'analysis',
    colorTheme: 'violet' // AI Intelligence
  }
];

/**
 * All actions combined
 */
export const ALL_QUICK_ACTIONS = [...CORE_ACTIONS, ...SECONDARY_ACTIONS];

/**
 * Get actions by group
 */
export function getActionsByGroup(group: 'core' | 'secondary'): QuickActionConfig[] {
  return ALL_QUICK_ACTIONS.filter(action => action.group === group);
}

/**
 * Get action by ID
 */
export function getActionById(id: string): QuickActionConfig | undefined {
  return ALL_QUICK_ACTIONS.find(action => action.id === id);
}
