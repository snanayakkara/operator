import { ChatMessage } from './medical.types';
import {
  AdmissionChecklistSkip,
  RoundsPatient,
  WardAdmissionFlagsUpdate,
  WardUpdateDiff
} from './rounds.types';

export type WardConversationMode = 'ward_round' | 'dictation';

export type WardChecklistStageType = 'issues' | 'investigations' | 'plan' | 'edd' | 'custom';

export interface WardChecklistStageDefinition {
  id: string;
  title: string;
  type: WardChecklistStageType;
  description?: string;
}

export type WardChecklistAction = 'task' | 'issue_update' | 'investigation' | 'flag' | 'edd';

export interface WardChecklistItemDefinition {
  id: string;
  title: string;
  action: WardChecklistAction;
  description?: string;
  suggestedCategory?: string;
  allowSkipForAdmission?: boolean;
  flagKey?: keyof WardAdmissionFlagsUpdate | string;
  linkedIssueHint?: string;
}

export interface WardConditionChecklistDefinition {
  key: string;
  label: string;
  hints?: string[];
  issueExamples?: string[];
  items: WardChecklistItemDefinition[];
}

export interface WardChecklistBank {
  base: {
    daily: WardChecklistStageDefinition[];
    oncePerAdmission: WardChecklistItemDefinition[];
  };
  conditions: WardConditionChecklistDefinition[];
  quickResponses?: string[];
}

export interface WardConversationLLMResponse {
  assistant_message: string;
  human_summary?: string[] | string;
  diff: WardUpdateDiff;
  follow_up_questions?: string[];
  checklist_pointer?: {
    stage?: string;
    condition?: string;
    item_id?: string;
  };
  clarifications?: string[];
}

export interface WardConversationTurnResult {
  assistantMessage: string;
  humanSummary: string[];
  diff: WardUpdateDiff;
  followUpQuestions?: string[];
  clarifications?: string[];
  raw?: string;
}

export interface WardConversationSession {
  id: string;
  patientId: string;
  admissionId?: string;
  mode: WardConversationMode;
  createdAt: string;
  updatedAt: string;
  history: ChatMessage[];
  pendingDiff: WardUpdateDiff;
  humanSummary: string[];
  lastAssistantMessage?: string;
  checklistSkips?: AdmissionChecklistSkip[];
}

export interface WardConversationContext {
  patient: RoundsPatient;
  checklistBank: WardChecklistBank;
  session?: WardConversationSession;
  userInput: string | null;
  mode: WardConversationMode;
}
