import {
  IntakeParserResult,
  Issue,
  IssueUpdate,
  RoundsPatient,
  Task,
  WardEntry,
  WardUpdateDiff
} from '@/types/rounds.types';
import { computeLabTrendString, generateRoundsId, isoNow } from '@/utils/rounds';

const normalizeText = (text: string) => text.trim().toLowerCase();

const clonePatient = (patient: RoundsPatient): RoundsPatient => ({
  ...patient,
  intakeNotes: [...patient.intakeNotes],
  issues: patient.issues.map(issue => ({
    ...issue,
    subpoints: [...(issue.subpoints || [])]
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
  const intakeNote = options?.intakeNoteText
    ? [{
        id: generateRoundsId('intake'),
        timestamp,
        text: options.intakeNoteText
      }]
    : [];

  return {
    id: generateRoundsId('patient'),
    name,
    mrn: options?.mrn || '',
    bed: options?.bed || '',
    oneLiner: options?.oneLiner || '',
    status: 'active',
    site: options?.site || 'Cabrini',
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
    wardEntries: []
  };
};

const ensureIssueDefaults = (issue: Issue): Issue => ({
  ...issue,
  id: issue.id || generateRoundsId('issue'),
  status: issue.status || 'open',
  subpoints: issue.subpoints?.length ? issue.subpoints : [],
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
        existing.subpoints = [...existing.subpoints, ...incoming.subpoints];
      }
      existing.lastUpdatedAt = now;
    } else {
      next.issues.push(ensureIssueDefaults(incoming));
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
      ? [...(issue.subpoints || []), ...update.newSubpoints]
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
      target.summary = target.summary;
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
