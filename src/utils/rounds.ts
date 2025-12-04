import {
  HudInvestigation,
  HudIssue,
  HudPatientState,
  HudTask,
  Investigation,
  LabValue,
  MessageTimeWindow,
  RoundsPatient,
  IssueSubpoint,
  Task
} from '@/types/rounds.types';

export const generateRoundsId = (prefix = 'rnd'): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

export const isoNow = (): string => new Date().toISOString();

export const computeLabTrendString = (labSeries: LabValue[] = [], maxValues = 4): string => {
  if (!labSeries.length) return '';
  const sorted = [...labSeries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const tail = sorted.slice(-maxValues);
  return tail.map(lab => {
    const value = Number.isFinite(lab.value) ? lab.value.toString() : '';
    return lab.units ? `${value} ${lab.units}` : value;
  }).join(' → ');
};

const pickPinnedOrOpen = <T extends { pinToHud?: boolean }>(
  items: T[],
  predicate?: (item: T) => boolean
): T[] => {
  if (!items.length) return [];
  const pinned = items.filter(item => item.pinToHud);
  if (pinned.length) return pinned;
  if (predicate) {
    const filtered = items.filter(predicate);
    if (filtered.length) return filtered;
  }
  return items;
};

const buildHudInvestigations = (investigations: Investigation[]): HudInvestigation[] => {
  const selected = pickPinnedOrOpen<Investigation>(investigations);
  return selected.map((inv) => ({
    id: inv.id,
    type: inv.type,
    name: inv.name,
    trendString: inv.type === 'lab' && inv.labSeries ? computeLabTrendString(inv.labSeries) : undefined,
    summary: inv.type !== 'lab' ? inv.summary : undefined
  }));
};

const buildHudIssues = (patient: RoundsPatient): HudIssue[] => {
  const chosen = pickPinnedOrOpen(patient.issues, issue => issue.status === 'open');
  return chosen.map(issue => ({
    id: issue.id,
    title: issue.title,
    status: issue.status,
    latestSubpoint: getSubpointDisplay(issue.subpoints?.slice(-1)[0])
  }));
};

const buildHudTasks = (tasks: Task[]): HudTask[] => {
  const chosen = pickPinnedOrOpen(tasks, task => task.status === 'open');
  return chosen.map(task => ({
    id: task.id,
    text: task.text,
    status: task.status
  }));
};

export const computeDayCount = (date: string): number | null => {
  if (!date) return null;
  const target = new Date(date);
  if (Number.isNaN(target.getTime())) return null;
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diffDays = Math.floor((startOfToday - startOfTarget) / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const getSubpointDisplay = (subpoint?: IssueSubpoint): string | undefined => {
  if (!subpoint) return undefined;
  if (subpoint.type === 'procedure') {
    return subpoint.procedure?.name || subpoint.text;
  }
  return subpoint.text;
};

export const buildHudPatientState = (patient: RoundsPatient | null | undefined): HudPatientState | null => {
  if (!patient || patient.hudEnabled === false) {
    return null;
  }

  return {
    patientId: patient.id,
    name: patient.name,
    bed: patient.bed,
    oneLiner: patient.oneLiner,
    issues: buildHudIssues(patient),
    investigations: buildHudInvestigations(patient.investigations),
    tasks: buildHudTasks(patient.tasks)
  };
};

// Message update utilities
export interface RecentPatientEvent {
  type: string;
  text: string;
  timestamp: string;
}

export const collectRecentPatientEvents = (
  patient: RoundsPatient,
  sinceIso: string
): RecentPatientEvent[] => {
  const events: RecentPatientEvent[] = [];
  const sinceMs = new Date(sinceIso).getTime();

  // 1. Ward entries (bed/ward changes)
  patient.wardEntries?.forEach(entry => {
    if (new Date(entry.timestamp).getTime() >= sinceMs) {
      events.push({
        type: 'ward',
        text: `Ward/bed updated: ${patient.site} ${patient.bed}`,
        timestamp: entry.timestamp
      });
    }
  });

  // 2. Issues updates
  patient.issues?.forEach(issue => {
    if (issue.lastUpdatedAt && new Date(issue.lastUpdatedAt).getTime() >= sinceMs) {
      events.push({
        type: 'issue',
        text: `Issue "${issue.title}" updated (${issue.status})`,
        timestamp: issue.lastUpdatedAt
      });
    }

    // Issue subpoints (procedures)
    issue.subpoints?.forEach(sub => {
      if (sub.type === 'procedure' && sub.procedure) {
        const procDate = sub.procedure.date;
        if (procDate && new Date(procDate).getTime() >= sinceMs) {
          events.push({
            type: 'procedure',
            text: `Procedure: ${sub.procedure.name} on ${procDate}`,
            timestamp: procDate
          });
        }
      }
    });
  });

  // 3. Investigations
  patient.investigations?.forEach(inv => {
    if (inv.lastUpdatedAt && new Date(inv.lastUpdatedAt).getTime() >= sinceMs) {
      events.push({
        type: 'investigation',
        text: `Investigation "${inv.name}" updated`,
        timestamp: inv.lastUpdatedAt
      });
    }
  });

  // 4. Tasks
  patient.tasks?.forEach(task => {
    if (new Date(task.createdAt).getTime() >= sinceMs) {
      events.push({
        type: 'task_created',
        text: `New task: ${task.text}`,
        timestamp: task.createdAt
      });
    }
    if (task.completedAt && new Date(task.completedAt).getTime() >= sinceMs) {
      events.push({
        type: 'task_completed',
        text: `Task completed: ${task.text}`,
        timestamp: task.completedAt
      });
    }
  });

  // 5. Intake notes
  patient.intakeNotes?.forEach(note => {
    if (new Date(note.timestamp).getTime() >= sinceMs) {
      events.push({
        type: 'intake',
        text: 'New intake note added',
        timestamp: note.timestamp
      });
    }
  });

  // Sort by timestamp (newest first)
  return events.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
};

export const computeMessageWindowIso = (window: MessageTimeWindow, patient?: RoundsPatient): string => {
  const now = new Date();

  switch (window) {
    case '6h':
      return new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
    case '12h':
      return new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    case '48h':
      return new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    case 'today6am': {
      const today6am = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0);
      // If current time is before 6am, use yesterday 6am
      if (now.getHours() < 6) {
        today6am.setDate(today6am.getDate() - 1);
      }
      return today6am.toISOString();
    }
    case 'lastRound': {
      // Use last ward entry timestamp, or fall back to 24h
      const lastEntry = patient?.wardEntries?.[patient.wardEntries.length - 1];
      return lastEntry?.timestamp || new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    }
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  }
};

// Backward compatibility
export const iso24HoursAgo = (): string => computeMessageWindowIso('24h');
