/**
 * Rounds data model (local-only)
 * Patient ward list, issues, investigations, tasks, and ward dictation diffs.
 */

export type PatientStatus = 'active' | 'discharged';

export interface IntakeNote {
  id: string;
  timestamp: string; // ISO datetime
  text: string; // raw scratchpad, never altered
}

export type IssueStatus = 'open' | 'resolved';

export type IssueSubpointType = 'note' | 'procedure' | 'antibiotic';

export interface ProcedureDetails {
  name: string;
  date: string; // ISO date
  notes?: string;
  showDayCounter?: boolean;
  checklistKey?: 'post-cardiac-surgery';
}

export interface AntibioticDetails {
  name: string;
  startDate: string; // ISO date - Day 1 of antibiotic course
  stopDate?: string; // ISO date - optional planned end date
  notes?: string;
}

export interface IssueSubpointBase {
  id: string;
  timestamp: string; // ISO datetime
  type?: IssueSubpointType; // legacy subpoints may omit type
}

export interface IssueSubpointNote extends IssueSubpointBase {
  type?: 'note';
  text: string;
}

export interface IssueSubpointProcedure extends IssueSubpointBase {
  type: 'procedure';
  procedure: ProcedureDetails;
  text?: string; // optional legacy/compat text
}

export interface IssueSubpointAntibiotic extends IssueSubpointBase {
  type: 'antibiotic';
  antibiotic: AntibioticDetails;
  text?: string; // optional legacy/compat text
}

export type IssueSubpoint = IssueSubpointNote | IssueSubpointProcedure | IssueSubpointAntibiotic;

export interface Issue {
  id: string;
  title: string;
  status: IssueStatus;
  subpoints: IssueSubpoint[];
  pinToHud?: boolean;
  lastUpdatedAt?: string;
}

export type InvestigationType = 'lab' | 'imaging' | 'procedure' | 'other';

export interface LabValue {
  date: string; // ISO date or datetime
  value: number;
  units?: string;
}

export interface Investigation {
  id: string;
  type: InvestigationType;
  name: string;
  lastUpdatedAt: string;
  labSeries?: LabValue[];
  summary?: string;
  pinToHud?: boolean;
}

export type TaskStatus = 'open' | 'done';

export type TaskOrigin = 'manual' | 'procedure-checklist';

export interface Task {
  id: string;
  text: string;
  status: TaskStatus;
  createdAt: string;
  completedAt?: string;
  category?: 'imaging' | 'lab' | 'discharge' | 'followup' | 'other';
  pinToHud?: boolean;
  origin?: TaskOrigin;
  procedureId?: string;
  scheduledDayOffset?: number; // Days from procedure date (0-based) when task should appear
  linkedIssueId?: string;
}

export interface IssueUpdate {
  issueId: string;
  newStatus?: IssueStatus;
  newSubpoints?: IssueSubpoint[];
}

export interface InvestigationUpdate {
  investigationId: string;
  newLabValues?: LabValue[];
  newSummaryText?: string;
}

export interface TaskUpdate {
  taskId: string;
  newStatus?: TaskStatus;
  newText?: string;
}

export interface WardUpdateDiff {
  issuesAdded: Issue[];
  issuesUpdated: IssueUpdate[];
  investigationsAdded: Investigation[];
  investigationsUpdated: InvestigationUpdate[];
  tasksAdded: Task[];
  tasksUpdated: TaskUpdate[];
  tasksCompletedById: string[];
  tasksCompletedByText?: string[];
  eddUpdate?: {
    oldDate?: string | null;
    newDate?: string | null;
  };
  admissionFlags?: WardAdmissionFlagsUpdate;
  checklistSkips?: AdmissionChecklistSkip[];
  patientId?: string;
  admissionId?: string;
}

export interface WardEntry {
  id: string;
  timestamp: string;
  transcript: string;
  diff: WardUpdateDiff;
}

export interface NextOfKin {
  name: string;
  relation: string;
  phone: string;
}

export interface WardAdmissionFlags {
  dvtProphylaxisConsidered?: boolean;
  followupArranged?: boolean;
  lastUpdatedAt?: string;
}

export interface WardAdmissionFlagsUpdate {
  dvtProphylaxisConsidered?: boolean;
  followupArranged?: boolean;
}

export interface AdmissionChecklistSkip {
  condition?: string;
  itemId: string;
  reason?: string;
}

export interface Clinician {
  id: string;
  name: string;
  role?: string; // e.g., "Cardiologist", "HF nurse", "Surgeon"
  service?: string; // Optional team/service label
  contact?: string; // Optional phone/email
  color?: string; // Optional tag color for UI
  createdAt: string; // ISO timestamp
  lastUpdatedAt: string; // ISO timestamp
}

export interface RoundsPatient {
  id: string;
  name: string;
  mrn: string;
  bed: string;
  oneLiner: string;
  status: PatientStatus;
  site?: string;
  admissionId?: string;
  createdAt: string;
  lastUpdatedAt: string;
  roundOrder?: number;
  hudEnabled?: boolean;
  markedForTeaching?: boolean;
  tags?: string[];
  nextOfKin?: NextOfKin;
  clinicianIds?: string[]; // References to Clinician.id
  intakeNotes: IntakeNote[];
  issues: Issue[];
  investigations: Investigation[];
  tasks: Task[];
  wardEntries: WardEntry[];
  expectedDischargeDate?: string;
  admissionFlags?: WardAdmissionFlags;
  checklistSkips?: AdmissionChecklistSkip[];
  roundCompletedDate?: string;
  
  // Billing entries for this patient
  billingEntries?: BillingEntry[];
  
  // Unified admission/discharge checklist (replaces separate admissionFlags for new patients)
  checklist?: AdmissionDischargeChecklist;
}

// HUD projection types for future smart-glasses integration
export interface HudIssue {
  id: string;
  title: string;
  status: IssueStatus;
  latestSubpoint?: string;
}

export interface HudInvestigation {
  id: string;
  type: InvestigationType;
  name: string;
  trendString?: string;
  summary?: string;
}

export interface HudTask {
  id: string;
  text: string;
  status: TaskStatus;
}

export interface HudPatientState {
  patientId: string;
  name: string;
  bed: string;
  oneLiner: string;
  issues: HudIssue[];
  investigations: HudInvestigation[];
  tasks: HudTask[];
}

// Intake parser output shape
export interface IntakeParserResult {
  issues: Issue[];
  investigations: Investigation[];
  tasks: Task[];
}

// Message update time window options
export type MessageTimeWindow = '6h' | '12h' | '24h' | '48h' | 'today6am' | 'lastRound';

// ============================================================================
// Billing Types
// ============================================================================

export type BillingStatus = 'pending' | 'entered' | 'rejected';

export interface MBSCode {
  code: string;
  description: string;
  fee?: number;
  category?: 'consult' | 'procedure' | 'inpatient' | 'other';
  common?: number; // ranking for common codes (lower = more common)
}

export interface BillingEntry {
  id: string;
  mbsCode: string;
  description: string;
  fee?: number;
  serviceDate: string; // ISO date
  notes?: string;
  status: BillingStatus;
  notionId?: string; // Notion page ID when synced
  notionLastSyncedAt?: string;
  notionSyncError?: string;
  patientId?: string;
  createdAt: string;
  updatedAt?: string;
}

// ============================================================================
// Unified Admission/Discharge Checklist
// ============================================================================

export interface AdmissionDischargeChecklist {
  // Admission flags
  dischargePlanning?: boolean; // true when patient is marked for discharge planning
  familyMeeting?: boolean;
  socialWork?: boolean;
  palliativeCare?: boolean;
  
  // Discharge checklist items
  medicationReconciliation?: boolean;
  dischargeInstructions?: boolean;
  followupScheduled?: boolean;
  transportArranged?: boolean;
  gpLetterSent?: boolean;
  
  // Metadata
  lastUpdatedAt?: string;
}

// ============================================================================
// Analytics Types
// ============================================================================

export type AnalyticsTimeRange = '7d' | '30d' | '90d' | '1y' | 'ytd';

export interface AnalyticsSummary {
  patientCount: number;
  admissionCount: number;
  dischargeCount: number;
  avgLengthOfStay: number; // in days
  billingTotal: number;
  billingEntryCount: number;
  billedTotal: number;
  pendingTotal: number;
}
