import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { WardUpdateDiff } from '../../src/types/rounds.types';

const mockLmStudio = vi.hoisted(() => ({
  ensureModelLoaded: vi.fn(),
  makeRequest: vi.fn()
}));

vi.mock('../../src/services/LMStudioService', () => ({
  LMStudioService: {
    getInstance: () => mockLmStudio
  },
  MODEL_CONFIG: {
    REASONING_MODEL: 'mock-model'
  }
}));

import { WardConversationService } from '../../src/services/WardConversationService';
import { createEmptyPatient, applyWardUpdateDiff } from '../../src/services/RoundsPatientService';

describe('WardConversationService', () => {
  beforeEach(() => {
    mockLmStudio.makeRequest.mockReset();
    mockLmStudio.ensureModelLoaded.mockReset();
    (WardConversationService as any).instance = null;
  });

  it('merges diffs across conversation turns and keeps human summary', async () => {
    const service = WardConversationService.getInstance();
    const patient = createEmptyPatient('Test Patient');
    patient.issues = [{
      id: 'i1',
      title: 'HFpEF',
      status: 'open',
      subpoints: [],
      lastUpdatedAt: new Date().toISOString()
    }];

    mockLmStudio.makeRequest
      .mockResolvedValueOnce(JSON.stringify({
        assistant_message: 'Initial summary',
        human_summary: ['Captured HF note'],
        diff: {
          issuesAdded: [],
          issuesUpdated: [{ issueId: 'i1', newSubpoints: [{ id: 's1', timestamp: '2024-01-01T00:00:00Z', text: 'note 1' }] }],
          investigationsAdded: [],
          investigationsUpdated: [],
          tasksAdded: [],
          tasksUpdated: [],
          tasksCompletedById: [],
          tasksCompletedByText: [],
          eddUpdate: { newDate: '2024-09-01' },
          admissionFlags: { dvtProphylaxisConsidered: true },
          checklistSkips: [{ condition: 'hfpef', itemId: 'hfpef_sleep' }]
        }
      }))
      .mockResolvedValueOnce(JSON.stringify({
        assistant_message: 'Follow-up question',
        human_summary: ['Added CT task'],
        diff: {
          issuesAdded: [],
          issuesUpdated: [{ issueId: 'i1', newSubpoints: [{ id: 's2', timestamp: '2024-01-02T00:00:00Z', text: 'note 2' }] }],
          investigationsAdded: [],
          investigationsUpdated: [],
          tasksAdded: [{ id: '', text: 'Arrange CT TAVI', status: 'open', createdAt: '2024-01-02T00:00:00Z' }],
          tasksUpdated: [],
          tasksCompletedById: [],
          tasksCompletedByText: [],
          checklistSkips: [{ condition: 'hfpef', itemId: 'hfpef_amyloid' }]
        }
      }));

    const { session, turn } = await service.startSession(patient, 'dictation', 'start dictation');
    expect(turn.humanSummary).toContain('Captured HF note');
    expect(session.pendingDiff.issuesUpdated[0].newSubpoints?.length).toBe(1);
    expect(session.pendingDiff.eddUpdate?.newDate).toBe('2024-09-01');

    const turn2 = await service.continueSession(session.id, patient, 'continue');
    expect(turn2.humanSummary).toEqual(expect.arrayContaining(['Captured HF note', 'Added CT task']));
    expect(turn2.diff.issuesUpdated[0].newSubpoints?.length).toBe(2);
    expect(turn2.diff.tasksAdded.length).toBe(1);
    expect(turn2.diff.checklistSkips?.length).toBe(2);

    const mergedSession = service.getSession(session.id);
    expect(mergedSession?.pendingDiff.tasksAdded.length).toBe(1);
    expect(mergedSession?.pendingDiff.checklistSkips?.length).toBe(2);
  });

  it('applies admission-level fields in ward diffs', () => {
    const patient = createEmptyPatient('Patient with flags');
    const diff: WardUpdateDiff = {
      issuesAdded: [],
      issuesUpdated: [],
      investigationsAdded: [],
      investigationsUpdated: [],
      tasksAdded: [],
      tasksUpdated: [],
      tasksCompletedById: [],
      tasksCompletedByText: [],
      eddUpdate: { newDate: '2025-01-02' },
      admissionFlags: { dvtProphylaxisConsidered: true, followupArranged: true },
      checklistSkips: [{ condition: 'hfpef', itemId: 'hfpef_sleep', reason: 'not relevant' }]
    };

    const result = applyWardUpdateDiff(patient, diff, 'test transcript');
    expect(result.patient.expectedDischargeDate).toBe('2025-01-02');
    expect(result.patient.admissionFlags?.dvtProphylaxisConsidered).toBe(true);
    expect(result.patient.admissionFlags?.followupArranged).toBe(true);
    expect(result.patient.checklistSkips?.length).toBe(1);
    expect(result.wardEntry.diff.eddUpdate?.newDate).toBe('2025-01-02');
  });
});
