import {
  ClinicalLLMResult,
  PendingWardRoundUpdate,
  ProposedChanges,
  WardRoundConfidenceConfig
} from './types';
import { RoundsPatient, WardUpdateDiff } from '../src/types/rounds.types';
import { applyWardUpdateDiff } from '../src/services/RoundsPatientService';
import { isoNow } from '../src/utils/rounds';

export interface PlannedUpdate {
  status: 'apply' | 'pending' | 'skip';
  diff?: WardUpdateDiff;
  pendingUpdate?: PendingWardRoundUpdate;
  reason?: string;
}

const emptyDiff: WardUpdateDiff = {
  issuesAdded: [],
  issuesUpdated: [],
  investigationsAdded: [],
  investigationsUpdated: [],
  tasksAdded: [],
  tasksUpdated: [],
  tasksCompletedById: [],
  tasksCompletedByText: []
};

const toWardUpdateDiff = (proposed: ProposedChanges, patient: RoundsPatient): WardUpdateDiff => {
  const diff: WardUpdateDiff = JSON.parse(JSON.stringify(emptyDiff));

  proposed.issues?.forEach(issueChange => {
    if (issueChange.action === 'create_issue' && issueChange.issue_label && issueChange.initial_subpoint) {
      diff.issuesAdded.push({
        id: '',
        title: issueChange.issue_label,
        status: 'open',
        subpoints: [
          {
            id: '',
            timestamp: issueChange.initial_subpoint.date || isoNow(),
            text: issueChange.initial_subpoint.text,
            type: 'note'
          }
        ]
      });
      return;
    }

    if (issueChange.action === 'append_subpoint') {
      const targetIssue = patient.issues.find(issue => issue.id === issueChange.issue_id || issue.title === issueChange.issue_label);
      if (targetIssue && issueChange.subpoint) {
        diff.issuesUpdated.push({
          issueId: targetIssue.id,
          newSubpoints: [
            {
              id: '',
              timestamp: issueChange.subpoint.date || isoNow(),
              text: issueChange.subpoint.text,
              type: 'note'
            }
          ]
        });
      } else if (issueChange.issue_label && issueChange.subpoint) {
        // Fall back to creating a new issue when append target is missing
        diff.issuesAdded.push({
          id: '',
          title: issueChange.issue_label,
          status: 'open',
          subpoints: [
            {
              id: '',
              timestamp: issueChange.subpoint.date || isoNow(),
              text: issueChange.subpoint.text,
              type: 'note'
            }
          ]
        });
      }
    }
  });

  proposed.investigations?.forEach(inv => {
    const name = inv.investigation_type === 'bloods' ? 'Bloods' : inv.investigation_type;
    diff.investigationsAdded.push({
      id: '',
      type: inv.investigation_type === 'bloods' ? 'lab' : inv.investigation_type === 'imaging' ? 'imaging' : 'other',
      name,
      lastUpdatedAt: inv.date || isoNow(),
      summary: inv.detail
    });
  });

  proposed.tasks?.forEach(task => {
    if (task.action === 'add_task') {
      diff.tasksAdded.push({
        id: '',
        text: task.task,
        status: 'open',
        createdAt: isoNow(),
        category: task.priority === 'high' ? 'imaging' : 'other'
      });
    }
  });

  return diff;
};

const hasConflict = (patient: RoundsPatient, exportedAt?: string): boolean => {
  if (!exportedAt) return false;
  const patientUpdated = new Date(patient.lastUpdatedAt || 0).getTime();
  const exported = new Date(exportedAt).getTime();
  return patientUpdated > exported;
};

const lowConfidence = (result: ClinicalLLMResult, thresholds: WardRoundConfidenceConfig, criticalRegions: Record<string, number>): boolean => {
  if (result.overall_confidence < thresholds.minOverallConfidence) {
    return true;
  }
  const criticalBelow = Object.values(criticalRegions).some(score => score < thresholds.minRegionConfidence);
  return criticalBelow;
};

export const planPatientUpdate = (
  patient: RoundsPatient,
  clinical: ClinicalLLMResult,
  thresholds: WardRoundConfidenceConfig,
  criticalRegions: Record<string, number>,
  exportedAt?: string,
  sourceImage?: string
): PlannedUpdate => {
  const conflict = hasConflict(patient, exportedAt);
  const confidenceFlag = lowConfidence(clinical, thresholds, criticalRegions);
  const diff = toWardUpdateDiff(clinical.proposed_changes, patient);

  if (conflict || confidenceFlag) {
    const reason = conflict ? 'conflict' : 'low_confidence';
    const pending: PendingWardRoundUpdate = {
      id: '',
      patientId: patient.id,
      roundId: clinical.round_id,
      createdAt: isoNow(),
      proposedChanges: clinical.proposed_changes,
      reason,
      llmNotes: clinical.llm_notes,
      confidence: clinical.overall_confidence,
      sourceImage
    };
    return { status: 'pending', pendingUpdate: pending, reason };
  }

  return { status: 'apply', diff };
};

export const applyPlannedUpdate = (patient: RoundsPatient, planned: PlannedUpdate, transcript: string) => {
  if (planned.status !== 'apply' || !planned.diff) {
    return { patient, wardEntry: null as any };
  }
  return applyWardUpdateDiff(patient, planned.diff, transcript);
};
