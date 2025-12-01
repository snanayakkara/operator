import { WardUpdateDiff, RoundsPatient } from '@/types/rounds.types';
import { isoNow } from '@/utils/rounds';

export interface PendingWardRoundUpdate {
  id: string;
  patientId: string;
  roundId: string;
  createdAt: string;
  proposedChanges: {
    issues: any[];
    investigations: any[];
    tasks: any[];
  };
  reason: string;
  llmNotes?: string;
  confidence?: number;
  sourceImage?: string;
}

const API_BASE = 'http://127.0.0.1:5859';

export class WardRoundImportService {
  public static async listPending(): Promise<PendingWardRoundUpdate[]> {
    const res = await fetch(`${API_BASE}/wardround/pending`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.pending || [];
  }

  public static async resolvePending(id: string): Promise<void> {
    await fetch(`${API_BASE}/wardround/pending/${id}`, {
      method: 'POST'
    });
  }
}

const mapProposedToDiff = (proposed: PendingWardRoundUpdate['proposedChanges'], patient: RoundsPatient): WardUpdateDiff => {
  const diff: WardUpdateDiff = {
    issuesAdded: [],
    issuesUpdated: [],
    investigationsAdded: [],
    investigationsUpdated: [],
    tasksAdded: [],
    tasksUpdated: [],
    tasksCompletedById: [],
    tasksCompletedByText: []
  };

  proposed.issues?.forEach((issueChange: any) => {
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

  proposed.investigations?.forEach((inv: any) => {
    const name = inv.investigation_type === 'bloods' ? 'Bloods' : inv.investigation_type;
    diff.investigationsAdded.push({
      id: '',
      type: inv.investigation_type === 'bloods' ? 'lab' : inv.investigation_type === 'imaging' ? 'imaging' : 'other',
      name,
      lastUpdatedAt: inv.date || isoNow(),
      summary: inv.detail
    });
  });

  proposed.tasks?.forEach((task: any) => {
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

export const applyPendingUpdateToPatient = (pending: PendingWardRoundUpdate, patient: RoundsPatient) => {
  const diff = mapProposedToDiff(pending.proposedChanges, patient);
  return diff;
};
