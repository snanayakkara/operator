import { WARD_CONVERSATION_CHECKLIST_BANK } from '@/config/wardConversationChecklists';
import { LMStudioService, MODEL_CONFIG } from '@/services/LMStudioService';
import { logger } from '@/utils/Logger';
import { generateRoundsId, isoNow } from '@/utils/rounds';
import {
  WardConversationContext,
  WardConversationLLMResponse,
  WardConversationMode,
  WardConversationSession,
  WardConversationTurnResult
} from '@/types/wardConversation.types';
import { ChatMessage } from '@/types/medical.types';
import {
  AdmissionChecklistSkip,
  IssueUpdate,
  InvestigationUpdate,
  RoundsPatient,
  TaskUpdate,
  WardUpdateDiff
} from '@/types/rounds.types';
import { applyWardUpdateDiff } from './RoundsPatientService';

const normalizeText = (text: string): string => text.trim().toLowerCase();

const EMPTY_DIFF: WardUpdateDiff = {
  issuesAdded: [],
  issuesUpdated: [],
  investigationsAdded: [],
  investigationsUpdated: [],
  tasksAdded: [],
  tasksUpdated: [],
  tasksCompletedById: [],
  tasksCompletedByText: [],
  checklistSkips: []
};

const extractJson = (raw: string): string => {
  const match = raw.match(/\{[\s\S]*\}/);
  return match ? match[0] : raw;
};

const normalizeDiff = (diff?: Partial<WardUpdateDiff>): WardUpdateDiff => {
  const safe = diff || {};
  return {
    ...EMPTY_DIFF,
    ...safe,
    issuesAdded: safe.issuesAdded ? [...safe.issuesAdded] : [],
    issuesUpdated: safe.issuesUpdated ? [...safe.issuesUpdated] : [],
    investigationsAdded: safe.investigationsAdded ? [...safe.investigationsAdded] : [],
    investigationsUpdated: safe.investigationsUpdated ? [...safe.investigationsUpdated] : [],
    tasksAdded: safe.tasksAdded ? [...safe.tasksAdded] : [],
    tasksUpdated: safe.tasksUpdated ? [...safe.tasksUpdated] : [],
    tasksCompletedById: safe.tasksCompletedById ? [...safe.tasksCompletedById] : [],
    tasksCompletedByText: safe.tasksCompletedByText ? [...safe.tasksCompletedByText] : [],
    checklistSkips: safe.checklistSkips ? [...safe.checklistSkips] : []
  };
};

const mergeIssueUpdates = (existing: IssueUpdate[], incoming: IssueUpdate[]): IssueUpdate[] => {
  const map = new Map<string, IssueUpdate>();
  existing.forEach(update => {
    map.set(update.issueId, {
      ...update,
      newSubpoints: update.newSubpoints ? [...update.newSubpoints] : undefined
    });
  });

  incoming.forEach(update => {
    const prev = map.get(update.issueId);
    if (!prev) {
      map.set(update.issueId, {
        ...update,
        newSubpoints: update.newSubpoints ? [...update.newSubpoints] : undefined
      });
      return;
    }

    const mergedSubpoints = [
      ...(prev.newSubpoints || []),
      ...(update.newSubpoints || [])
    ];

    map.set(update.issueId, {
      issueId: update.issueId,
      newStatus: update.newStatus ?? prev.newStatus,
      newSubpoints: mergedSubpoints.length ? mergedSubpoints : undefined
    });
  });

  return Array.from(map.values());
};

const mergeInvestigationUpdates = (
  existing: InvestigationUpdate[],
  incoming: InvestigationUpdate[]
): InvestigationUpdate[] => {
  const map = new Map<string, InvestigationUpdate>();
  existing.forEach(update => {
    map.set(update.investigationId, {
      ...update,
      newLabValues: update.newLabValues ? [...update.newLabValues] : undefined
    });
  });

  incoming.forEach(update => {
    const prev = map.get(update.investigationId);
    if (!prev) {
      map.set(update.investigationId, {
        ...update,
        newLabValues: update.newLabValues ? [...update.newLabValues] : undefined
      });
      return;
    }

    const mergedLabValues = [
      ...(prev.newLabValues || []),
      ...(update.newLabValues || [])
    ];

    map.set(update.investigationId, {
      investigationId: update.investigationId,
      newLabValues: mergedLabValues.length ? mergedLabValues : undefined,
      newSummaryText: update.newSummaryText ?? prev.newSummaryText
    });
  });

  return Array.from(map.values());
};

const mergeTaskUpdates = (existing: TaskUpdate[], incoming: TaskUpdate[]): TaskUpdate[] => {
  const map = new Map<string, TaskUpdate>();
  existing.forEach(update => map.set(update.taskId, { ...update }));
  incoming.forEach(update => {
    const prev = map.get(update.taskId);
    if (!prev) {
      map.set(update.taskId, { ...update });
      return;
    }
    map.set(update.taskId, {
      taskId: update.taskId,
      newStatus: update.newStatus ?? prev.newStatus,
      newText: update.newText ?? prev.newText
    });
  });
  return Array.from(map.values());
};

const dedupeByKey = <T>(items: T[], getKey: (item: T) => string): T[] => {
  const map = new Map<string, T>();
  items.forEach(item => {
    map.set(getKey(item), item);
  });
  return Array.from(map.values());
};

const mergeChecklistSkips = (
  existing: AdmissionChecklistSkip[] = [],
  incoming: AdmissionChecklistSkip[] = []
): AdmissionChecklistSkip[] => {
  const merged = [...existing, ...incoming];
  return dedupeByKey(merged, (item) => `${item.condition || 'base'}::${item.itemId}`);
};

const mergeWardDiffs = (base: WardUpdateDiff, incoming: WardUpdateDiff): WardUpdateDiff => {
  const normalizedBase = normalizeDiff(base);
  const normalizedIncoming = normalizeDiff(incoming);

  const issuesAdded = dedupeByKey(
    [...normalizedBase.issuesAdded, ...normalizedIncoming.issuesAdded],
    issue => issue.id || normalizeText(issue.title)
  );

  const investigationsAdded = dedupeByKey(
    [...normalizedBase.investigationsAdded, ...normalizedIncoming.investigationsAdded],
    inv => inv.id || normalizeText(inv.name)
  );

  const tasksAdded = dedupeByKey(
    [...normalizedBase.tasksAdded, ...normalizedIncoming.tasksAdded],
    task => task.id || normalizeText(task.text)
  );

  const tasksCompletedById = Array.from(new Set([
    ...normalizedBase.tasksCompletedById,
    ...normalizedIncoming.tasksCompletedById
  ]));

  const tasksCompletedByText = Array.from(new Set([
    ...(normalizedBase.tasksCompletedByText || []).map(normalizeText),
    ...(normalizedIncoming.tasksCompletedByText || []).map(normalizeText)
  ]));

  return {
    ...normalizedBase,
    issuesAdded,
    issuesUpdated: mergeIssueUpdates(normalizedBase.issuesUpdated, normalizedIncoming.issuesUpdated),
    investigationsAdded,
    investigationsUpdated: mergeInvestigationUpdates(normalizedBase.investigationsUpdated, normalizedIncoming.investigationsUpdated),
    tasksAdded,
    tasksUpdated: mergeTaskUpdates(normalizedBase.tasksUpdated, normalizedIncoming.tasksUpdated),
    tasksCompletedById,
    tasksCompletedByText,
    eddUpdate: normalizedIncoming.eddUpdate ?? normalizedBase.eddUpdate,
    admissionFlags: {
      ...(normalizedBase.admissionFlags || {}),
      ...(normalizedIncoming.admissionFlags || {})
    },
    checklistSkips: mergeChecklistSkips(normalizedBase.checklistSkips, normalizedIncoming.checklistSkips),
    patientId: normalizedIncoming.patientId ?? normalizedBase.patientId,
    admissionId: normalizedIncoming.admissionId ?? normalizedBase.admissionId
  };
};

const isDiffEmpty = (diff: WardUpdateDiff): boolean => {
  const normalized = normalizeDiff(diff);
  const hasArrays = [
    normalized.issuesAdded.length,
    normalized.issuesUpdated.length,
    normalized.investigationsAdded.length,
    normalized.investigationsUpdated.length,
    normalized.tasksAdded.length,
    normalized.tasksUpdated.length,
    normalized.tasksCompletedById.length,
    (normalized.tasksCompletedByText || []).length,
    (normalized.checklistSkips || []).length
  ].some(count => count > 0);
  const hasFlags = Boolean(normalized.eddUpdate?.newDate || normalized.admissionFlags);
  return !hasArrays && !hasFlags;
};

class WardConversationEngine {
  private lmStudio: LMStudioService;

  constructor() {
    this.lmStudio = LMStudioService.getInstance();
  }

  private buildPatientSnapshot(patient: RoundsPatient) {
    const latestIssueNote = (issue: { subpoints?: { text?: string; type?: string }[] }) =>
      issue.subpoints?.slice(-1)[0];

    return {
      id: patient.id,
      admissionId: patient.admissionId || patient.id,
      name: patient.name,
      mrn: patient.mrn,
      bed: patient.bed,
      oneLiner: patient.oneLiner,
      expectedDischargeDate: patient.expectedDischargeDate,
      admissionFlags: patient.admissionFlags,
      checklistSkips: patient.checklistSkips || [],
      issues: patient.issues.map(issue => ({
        id: issue.id,
        title: issue.title,
        status: issue.status,
        lastUpdatedAt: issue.lastUpdatedAt,
        latestNote: latestIssueNote(issue)?.text,
        pinToHud: issue.pinToHud
      })),
      investigations: patient.investigations.map(inv => ({
        id: inv.id,
        type: inv.type,
        name: inv.name,
        lastUpdatedAt: inv.lastUpdatedAt,
        summary: inv.summary,
        labSeries: inv.labSeries ? inv.labSeries.slice(-2) : undefined
      })),
      tasks: patient.tasks.map(task => ({
        id: task.id,
        text: task.text,
        status: task.status,
        category: task.category,
        createdAt: task.createdAt,
        completedAt: task.completedAt
      }))
    };
  }

  private buildMessages(context: WardConversationContext, priorSummary: string[]): ChatMessage[] {
    const bank = context.checklistBank || WARD_CONVERSATION_CHECKLIST_BANK;
    const systemContent = [
      'You are a cardiology ward registrar running a structured ward round conversation.',
      'Work one patient and one question at a time. Keep replies concise (1-2 short sentences).',
      'Base checklist order: issues -> new results -> plan/tasks -> EDD.',
      'Once-per-admission items: ask until flagged as done, then stop.',
      'Infer likely conditions from issue text using provided hints, propose relevant condition-specific checklist items.',
      'For each checklist item, accept short responses (yes/no/skip/not now).',
      'Never change data directly; return a structured diff only. Use existing IDs when updating items.',
      'Use Australian clinical wording.',
      'If input is ambiguous, ask a clarifying question before making changes.',
      'Always return JSON with: assistant_message, human_summary, diff, and optional follow_up_questions/clarifications.',
      'diff fields: issuesAdded, issuesUpdated, investigationsAdded, investigationsUpdated, tasksAdded, tasksUpdated, tasksCompletedById, tasksCompletedByText (strings), eddUpdate { oldDate?, newDate? }, admissionFlags { dvtProphylaxisConsidered?, followupArranged? }, checklistSkips [{ condition?, itemId, reason? }], patientId, admissionId.'
    ].join(' ');

    const patientSnapshot = this.buildPatientSnapshot(context.patient);
    const sessionSummary = priorSummary?.length ? priorSummary : [];
    const quickResponses = bank.quickResponses || [];

    const userContent = [
      `Mode: ${context.mode}`,
      'Checklist bank JSON:',
      JSON.stringify(bank),
      'Patient snapshot:',
      JSON.stringify(patientSnapshot),
      sessionSummary.length ? `Session summary so far:\n${sessionSummary.join('\n')}` : 'Session summary so far: none',
      context.userInput ? `Clinician input this turn:\n${context.userInput}` : 'No clinician input provided; start the checklist with an intro question.',
      quickResponses.length ? `Short responses to interpret: ${quickResponses.join(', ')}` : '',
      'Respond with the next assistant_message plus updated diff/human_summary for this session.'
    ].filter(Boolean).join('\n');

    const history = context.session?.history || [];
    const trimmedHistory = history.length > 8 ? history.slice(-8) : history;

    return [
      { role: 'system', content: systemContent },
      ...trimmedHistory,
      { role: 'user', content: userContent }
    ];
  }

  private parseResponse(raw: string): WardConversationLLMResponse {
    try {
      const parsed = JSON.parse(extractJson(raw)) as WardConversationLLMResponse;
      return parsed;
    } catch (error) {
      logger.warn('WardConversationEngine: failed to parse JSON response, falling back to text-only', {
        error: error instanceof Error ? error.message : error,
        raw: raw?.slice(0, 400)
      });
      return {
        assistant_message: raw || 'Could you clarify?',
        human_summary: [],
        diff: EMPTY_DIFF
      };
    }
  }

  public async runTurn(context: WardConversationContext): Promise<WardConversationTurnResult> {
    await this.lmStudio.ensureModelLoaded(MODEL_CONFIG.REASONING_MODEL);
    const messages = this.buildMessages(context, context.session?.humanSummary || []);

    const request = {
      model: MODEL_CONFIG.REASONING_MODEL,
      temperature: 0.25,
      max_tokens: 900,
      context_length: 8000,
      messages,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'ward_conversation_response',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              assistant_message: { type: 'string' },
              human_summary: { type: ['array', 'string'], items: { type: 'string' } },
              diff: {
                type: 'object',
                properties: {
                  issuesAdded: { type: 'array' },
                  issuesUpdated: { type: 'array' },
                  investigationsAdded: { type: 'array' },
                  investigationsUpdated: { type: 'array' },
                  tasksAdded: { type: 'array' },
                  tasksUpdated: { type: 'array' },
                  tasksCompletedById: { type: 'array' },
                  tasksCompletedByText: { type: ['array', 'null'] },
                  eddUpdate: { type: 'object' },
                  admissionFlags: { type: 'object' },
                  checklistSkips: { type: 'array' },
                  patientId: { type: 'string' },
                  admissionId: { type: 'string' }
                },
                required: ['issuesAdded', 'issuesUpdated', 'investigationsAdded', 'investigationsUpdated', 'tasksAdded', 'tasksUpdated', 'tasksCompletedById']
              },
              follow_up_questions: { type: 'array', items: { type: 'string' } },
              clarifications: { type: 'array', items: { type: 'string' } }
            },
            required: ['assistant_message', 'diff']
          }
        }
      }
    };

    const raw = await this.lmStudio.makeRequest(request, undefined, 'ward-conversation');
    const parsed = this.parseResponse(raw);
    const humanSummary = Array.isArray(parsed.human_summary)
      ? parsed.human_summary
      : parsed.human_summary
        ? [parsed.human_summary]
        : [];

    const diff = normalizeDiff(parsed.diff);

    return {
      assistantMessage: (parsed.assistant_message || '').trim(),
      humanSummary,
      diff,
      followUpQuestions: parsed.follow_up_questions,
      clarifications: parsed.clarifications,
      raw
    };
  }
}

export class WardConversationService {
  private static instance: WardConversationService | null = null;
  private sessions = new Map<string, WardConversationSession>();
  private engine = new WardConversationEngine();

  public static getInstance(): WardConversationService {
    if (!WardConversationService.instance) {
      WardConversationService.instance = new WardConversationService();
    }
    return WardConversationService.instance;
  }

  public getSession(sessionId: string): WardConversationSession | undefined {
    return this.sessions.get(sessionId);
  }

  public listSessions(): WardConversationSession[] {
    return Array.from(this.sessions.values());
  }

  private updateHistory(session: WardConversationSession, userInput: string | null, assistantMessage: string) {
    const history = [...session.history];
    history.push({
      role: 'user',
      content: userInput || 'Start ward conversation'
    });
    history.push({
      role: 'assistant',
      content: assistantMessage
    });
    const trimmed = history.length > 10 ? history.slice(-10) : history;
    session.history = trimmed;
  }

  private buildSession(patient: RoundsPatient, mode: WardConversationMode): WardConversationSession {
    const now = isoNow();
    return {
      id: generateRoundsId('ward-session'),
      patientId: patient.id,
      admissionId: patient.admissionId || patient.id,
      mode,
      createdAt: now,
      updatedAt: now,
      history: [],
      pendingDiff: normalizeDiff(),
      humanSummary: [],
      checklistSkips: patient.checklistSkips || []
    };
  }

  private mergeAndPersist(
    session: WardConversationSession,
    turn: WardConversationTurnResult,
    userInput: string | null
  ): WardConversationTurnResult {
    const mergedDiff = mergeWardDiffs(session.pendingDiff, turn.diff);
    const mergedSummary = Array.from(new Set([...session.humanSummary, ...turn.humanSummary]));

    session.pendingDiff = mergedDiff;
    session.humanSummary = mergedSummary;
    session.lastAssistantMessage = turn.assistantMessage;
    session.updatedAt = isoNow();
    this.updateHistory(session, userInput, turn.assistantMessage);
    session.checklistSkips = mergeChecklistSkips(session.checklistSkips, mergedDiff.checklistSkips);

    this.sessions.set(session.id, session);

    return {
      ...turn,
      diff: mergedDiff,
      humanSummary: mergedSummary
    };
  }

  /**
   * Start a new ward conversation session for a patient.
   * Returns the initial assistant message and a session identifier to use for subsequent turns.
   */
  public async startSession(
    patient: RoundsPatient,
    mode: WardConversationMode = 'ward_round',
    userInput?: string | null
  ): Promise<{ session: WardConversationSession; turn: WardConversationTurnResult }> {
    const session = this.buildSession(patient, mode);
    this.sessions.set(session.id, session);

    const turn = await this.engine.runTurn({
      patient,
      mode,
      session,
      userInput: userInput ?? null,
      checklistBank: WARD_CONVERSATION_CHECKLIST_BANK
    });

    const merged = this.mergeAndPersist(session, turn, userInput ?? null);
    return { session, turn: merged };
  }

  /**
   * Continue an existing session with new clinician input (text or parsed dictation).
   */
  public async continueSession(
    sessionId: string,
    patient: RoundsPatient,
    userInput: string
  ): Promise<WardConversationTurnResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`No ward conversation session found for id ${sessionId}`);
    }

    const turn = await this.engine.runTurn({
      patient,
      mode: session.mode,
      session,
      userInput,
      checklistBank: WARD_CONVERSATION_CHECKLIST_BANK
    });

    return this.mergeAndPersist(session, turn, userInput);
  }

  /**
   * Convenience helper for a one-off dictation input.
   * Starts a dictation session if needed, otherwise continues the existing one.
   */
  public async runDictation(
    patient: RoundsPatient,
    userInput: string,
    sessionId?: string
  ): Promise<{ session: WardConversationSession; turn: WardConversationTurnResult }> {
    if (!sessionId) {
      return this.startSession(patient, 'dictation', userInput);
    }
    const turn = await this.continueSession(sessionId, patient, userInput);
    const session = this.sessions.get(sessionId)!;
    return { session, turn };
  }

  /**
   * Apply the pending diff for a session to the patient record.
   * Returns the updated patient state. If the diff is empty, no changes are applied.
   */
  public applyPendingDiff(
    sessionId: string,
    patient: RoundsPatient,
    transcript?: string
  ): { patient: RoundsPatient; wardEntry: { id: string; timestamp: string; transcript: string; diff: WardUpdateDiff } } | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`No ward conversation session found for id ${sessionId}`);
    }

    if (isDiffEmpty(session.pendingDiff)) {
      return null;
    }

    const applied = applyWardUpdateDiff(
      patient,
      session.pendingDiff,
      transcript || session.humanSummary.join(' | ') || session.lastAssistantMessage || 'Ward conversation update'
    );
    return applied;
  }

  /**
   * Discard a session and any pending diffs without applying them.
   */
  public discardSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}

export const wardConversationService = WardConversationService.getInstance();
