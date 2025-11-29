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

export type IssueSubpointType = 'note' | 'procedure';

export interface ProcedureDetails {
  name: string;
  date: string; // ISO date
  notes?: string;
  showDayCounter?: boolean;
  checklistKey?: 'post-cardiac-surgery';
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

export type IssueSubpoint = IssueSubpointNote | IssueSubpointProcedure;

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
}

export interface WardEntry {
  id: string;
  timestamp: string;
  transcript: string;
  diff: WardUpdateDiff;
}

export interface RoundsPatient {
  id: string;
  name: string;
  mrn: string;
  bed: string;
  oneLiner: string;
  status: PatientStatus;
  site?: string;
  createdAt: string;
  lastUpdatedAt: string;
  roundOrder?: number;
  hudEnabled?: boolean;
  markedForTeaching?: boolean;
  tags?: string[];
  intakeNotes: IntakeNote[];
  issues: Issue[];
  investigations: Investigation[];
  tasks: Task[];
  wardEntries: WardEntry[];
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
