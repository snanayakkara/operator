import {
  IntakeParserResult,
  Issue,
  IssueUpdate,
  IssueSubpoint,
  IssueSubpointNote,
  IssueSubpointProcedure,
  IssueSubpointAntibiotic,
  RoundsPatient,
  Task,
  WardEntry,
  WardUpdateDiff
} from '../types/rounds.types';
import { computeLabTrendString, generateRoundsId, isoNow } from '../utils/rounds';

const normalizeText = (text: string) => text.trim().toLowerCase();

const normalizeSubpoints = (subpoints: IssueSubpoint[] = []): IssueSubpoint[] =>
  subpoints.map(sub => {
    if (sub.type === 'procedure' && (sub as IssueSubpointProcedure).procedure) {
      return {
        id: sub.id,
        timestamp: sub.timestamp,
        type: 'procedure',
        text: 'text' in sub ? (sub as any).text || '' : undefined,
        procedure: (sub as IssueSubpointProcedure).procedure!
      } as IssueSubpointProcedure;
    }

    if (sub.type === 'antibiotic' && (sub as IssueSubpointAntibiotic).antibiotic) {
      return {
        id: sub.id,
        timestamp: sub.timestamp,
        type: 'antibiotic',
        text: 'text' in sub ? (sub as any).text || '' : undefined,
        antibiotic: (sub as IssueSubpointAntibiotic).antibiotic!
      } as IssueSubpointAntibiotic;
    }

    return {
      id: sub.id,
      timestamp: sub.timestamp,
      type: 'note',
      text: 'text' in sub ? (sub as any).text || '' : ''
    } as IssueSubpointNote;
  });

const clonePatient = (patient: RoundsPatient): RoundsPatient => ({
  ...patient,
  admissionFlags: patient.admissionFlags ? { ...patient.admissionFlags } : undefined,
  checklistSkips: patient.checklistSkips ? [...patient.checklistSkips] : [],
  intakeNotes: [...patient.intakeNotes],
  issues: patient.issues.map(issue => ({
    ...issue,
    subpoints: (issue.subpoints || []).map(sub => ({
      ...sub,
      type: sub.type || 'note',
      text: 'text' in sub ? (sub as any).text || '' : '',
      procedure: sub.type === 'procedure'
        ? { ...(sub as any).procedure }
        : undefined,
      antibiotic: sub.type === 'antibiotic'
        ? { ...(sub as any).antibiotic }
        : undefined
    }))
  })),
  investigations: patient.investigations.map(inv => ({
    ...inv,
    labSeries: inv.labSeries ? [...inv.labSeries] : undefined
  })),
  tasks: patient.tasks.map(task => ({ ...task })),
  wardEntries: [...patient.wardEntries]
});

export const createEmptyPatient = (name: string, options?: {
  mrn?: string;
  bed?: string;
  oneLiner?: string;
  site?: string;
  intakeNoteText?: string;
}): RoundsPatient => {
  const timestamp = isoNow();
  const patientId = generateRoundsId('patient');
  const intakeNote = options?.intakeNoteText
    ? [{
        id: generateRoundsId('intake'),
        timestamp,
        text: options.intakeNoteText
      }]
    : [];

  return {
    id: patientId,
    name,
    mrn: options?.mrn || '',
    bed: options?.bed || '',
    oneLiner: options?.oneLiner || '',
    status: 'active',
    site: options?.site || 'Cabrini',
    admissionId: patientId,
    createdAt: timestamp,
    lastUpdatedAt: timestamp,
    roundOrder: undefined,
    hudEnabled: true,
    markedForTeaching: false,
    tags: [],
    intakeNotes: intakeNote,
    issues: [],
    investigations: [],
    tasks: [],
    wardEntries: [],
    expectedDischargeDate: undefined,
    admissionFlags: {
      dvtProphylaxisConsidered: false,
      followupArranged: false,
      lastUpdatedAt: timestamp
    },
    checklistSkips: [],
    roundCompletedDate: undefined
  };
};

const ensureIssueDefaults = (issue: Issue): Issue => ({
  ...issue,
  id: issue.id || generateRoundsId('issue'),
  status: issue.status || 'open',
  subpoints: normalizeSubpoints(issue.subpoints),
  lastUpdatedAt: issue.lastUpdatedAt || isoNow()
});

const ensureTaskDefaults = (task: Task): Task => ({
  ...task,
  id: task.id || generateRoundsId('task'),
  status: task.status || 'open',
  createdAt: task.createdAt || isoNow()
});

export const mergeIntakeParserResult = (patient: RoundsPatient, parsed: IntakeParserResult): RoundsPatient => {
  const next = clonePatient(patient);
  const now = isoNow();

  // Issues
  parsed.issues?.forEach(incoming => {
    const normalizedTitle = normalizeText(incoming.title);
    const existing = next.issues.find(issue => normalizeText(issue.title) === normalizedTitle);
    if (existing) {
      if (incoming.subpoints?.length) {
        existing.subpoints = [...existing.subpoints, ...normalizeSubpoints(incoming.subpoints)];
      }
      existing.lastUpdatedAt = now;
    } else {
      next.issues.push(ensureIssueDefaults({ ...incoming, subpoints: normalizeSubpoints(incoming.subpoints) }));
    }
  });

  // Investigations
  parsed.investigations?.forEach(incoming => {
    const normalizedName = normalizeText(incoming.name);
    const existing = next.investigations.find(inv => normalizeText(inv.name) === normalizedName);
    if (existing) {
      if (incoming.type === 'lab' && incoming.labSeries?.length) {
        existing.labSeries = [...(existing.labSeries || []), ...incoming.labSeries];
        existing.lastUpdatedAt = now;
      } else if (incoming.summary) {
        existing.summary = incoming.summary;
        existing.lastUpdatedAt = now;
      }
    } else {
      next.investigations.push({
        ...incoming,
        id: incoming.id || generateRoundsId('inv'),
        lastUpdatedAt: incoming.lastUpdatedAt || now
      });
    }
  });

  // Tasks
  parsed.tasks?.forEach(incoming => {
    const normalizedText = normalizeText(incoming.text);
    const exists = next.tasks.some(task => normalizeText(task.text) === normalizedText);
    if (!exists) {
      next.tasks.push(ensureTaskDefaults(incoming));
    }
  });

  next.lastUpdatedAt = now;
  return next;
};

const applyIssueUpdates = (issues: Issue[], updates: IssueUpdate[]): Issue[] => {
  return issues.map(issue => {
    const update = updates.find(u => u.issueId === issue.id);
    if (!update) return issue;

    const mergedSubpoints = update.newSubpoints?.length
      ? [...(issue.subpoints || []), ...normalizeSubpoints(update.newSubpoints)]
      : issue.subpoints;

    return {
      ...issue,
      status: update.newStatus || issue.status,
      subpoints: mergedSubpoints,
      lastUpdatedAt: isoNow()
    };
  });
};

export const applyWardUpdateDiff = (
  patient: RoundsPatient,
  diff: WardUpdateDiff,
  transcript: string
): { patient: RoundsPatient; wardEntry: WardEntry } => {
  const next = clonePatient(patient);
  const now = isoNow();

  // Add issues
  diff.issuesAdded?.forEach(issue => {
    next.issues.push(ensureIssueDefaults(issue));
  });

  // Update issues
  if (diff.issuesUpdated?.length) {
    next.issues = applyIssueUpdates(next.issues, diff.issuesUpdated);
  }

  // Investigations added
  diff.investigationsAdded?.forEach(inv => {
    next.investigations.push({
      ...inv,
      id: inv.id || generateRoundsId('inv'),
      lastUpdatedAt: inv.lastUpdatedAt || now,
      labSeries: inv.labSeries ? [...inv.labSeries] : undefined
    });
  });

  // Investigations updated
  diff.investigationsUpdated?.forEach(update => {
    const target = next.investigations.find(inv => inv.id === update.investigationId);
    if (!target) return;

    if (update.newLabValues?.length) {
      target.labSeries = [...(target.labSeries || []), ...update.newLabValues];
    }
    if (update.newSummaryText) {
      target.summary = update.newSummaryText;
    }
    target.lastUpdatedAt = now;
  });

  // Tasks added
  diff.tasksAdded?.forEach(task => {
    next.tasks.push(ensureTaskDefaults(task));
  });

  // Tasks updated
  diff.tasksUpdated?.forEach(update => {
    const task = next.tasks.find(t => t.id === update.taskId);
    if (!task) return;
    task.text = update.newText || task.text;
    task.status = update.newStatus || task.status;
    if (task.status === 'done' && !task.completedAt) {
      task.completedAt = now;
    }
  });

  // Complete tasks by id
  diff.tasksCompletedById?.forEach(id => {
    const task = next.tasks.find(t => t.id === id);
    if (task) {
      task.status = 'done';
      task.completedAt = task.completedAt || now;
    }
  });

  // Fuzzy completion by text
  diff.tasksCompletedByText?.forEach(text => {
    const normalized = normalizeText(text);
    const task = next.tasks.find(t => normalizeText(t.text) === normalized);
    if (task) {
      task.status = 'done';
      task.completedAt = task.completedAt || now;
    }
  });

  // Expected discharge date updates
  if (diff.eddUpdate) {
    if (diff.eddUpdate.newDate !== undefined) {
      next.expectedDischargeDate = diff.eddUpdate.newDate || undefined;
    }
  }

  // Admission flags (once-per-admission items)
  if (diff.admissionFlags) {
    next.admissionFlags = {
      ...(next.admissionFlags || {}),
      ...diff.admissionFlags,
      lastUpdatedAt: now
    };
  }

  // Checklist skips for this admission
  if (diff.checklistSkips?.length) {
    const existing = next.checklistSkips || [];
    const merged = new Map<string, { condition?: string; itemId: string; reason?: string }>();
    existing.forEach(skip => {
      const key = `${skip.condition || 'base'}::${skip.itemId}`;
      merged.set(key, skip);
    });
    diff.checklistSkips.forEach(skip => {
      const key = `${skip.condition || 'base'}::${skip.itemId}`;
      merged.set(key, skip);
    });
    next.checklistSkips = Array.from(merged.values());
  }

  next.lastUpdatedAt = now;

  const wardEntry: WardEntry = {
    id: generateRoundsId('ward'),
    timestamp: now,
    transcript,
    diff
  };

  next.wardEntries = [...next.wardEntries, wardEntry];
  return { patient: next, wardEntry };
};

export const describeLabTrend = (investigation: { labSeries?: { value: number; date: string; units?: string; }[] }): string => {
  return computeLabTrendString(investigation.labSeries || []);
};
