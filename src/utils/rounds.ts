import {
  HudInvestigation,
  HudIssue,
  HudPatientState,
  HudTask,
  Investigation,
  LabValue,
  RoundsPatient,
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
    latestSubpoint: issue.subpoints?.slice(-1)[0]?.text
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
