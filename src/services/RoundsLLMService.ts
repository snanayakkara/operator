import { LMStudioRequest, MODEL_CONFIG } from './LMStudioService';
import { logger } from '@/utils/Logger';
import {
  IntakeParserResult,
  RoundsPatient,
  Task,
  WardUpdateDiff
} from '@/types/rounds.types';
import { LMStudioService } from './LMStudioService';

const emptyIntakeResult: IntakeParserResult = {
  issues: [],
  investigations: [],
  tasks: []
};

const emptyWardDiff: WardUpdateDiff = {
  issuesAdded: [],
  issuesUpdated: [],
  investigationsAdded: [],
  investigationsUpdated: [],
  tasksAdded: [],
  tasksUpdated: [],
  tasksCompletedById: [],
  tasksCompletedByText: []
};

const extractJson = (raw: string): string => {
  const match = raw.match(/\{[\s\S]*\}/);
  return match ? match[0] : raw;
};

const parseJsonSafe = <T>(raw: string, fallback: T): T => {
  try {
    return JSON.parse(extractJson(raw)) as T;
  } catch (error) {
    logger.warn('RoundsLLMService: failed to parse JSON response', {
      error: error instanceof Error ? error.message : error,
      raw: raw?.slice(0, 500)
    });
    return fallback;
  }
};

export class RoundsLLMService {
  private static instance: RoundsLLMService | null = null;
  private lmStudio = LMStudioService.getInstance();

  public static getInstance(): RoundsLLMService {
    if (!RoundsLLMService.instance) {
      RoundsLLMService.instance = new RoundsLLMService();
    }
    return RoundsLLMService.instance;
  }

  public async parseIntake(scratchpad: string, patient?: RoundsPatient): Promise<IntakeParserResult> {
    const request: LMStudioRequest = {
      model: MODEL_CONFIG.QUICK_MODEL,
      temperature: 0.2,
      max_tokens: 1200,
      messages: [
        {
          role: 'system',
          content: [
            'You are a clinician assistant that converts rough intake notes into structured ward data.',
            'Return ONLY JSON with keys "issues", "investigations", "tasks".',
            'Issue shape: { id?, title, status ("open"|"resolved"), subpoints: [{ id?, timestamp, text }], pinToHud? }',
            'Investigation shape: { id?, type: "lab"|"imaging"|"procedure"|"other", name, lastUpdatedAt, labSeries?, summary?, pinToHud? }',
            'Task shape: { id?, text, status ("open"|"done"), createdAt, completedAt?, category?, pinToHud? }',
            'Use timestamps if provided; otherwise leave generation to the client (do not invent dates).',
            'Do not invent labs or imaging not present in the intake. Prefer concise, clinical wording.'
          ].join(' ')
        },
        {
          role: 'user',
          content: [
            `Intake scratchpad:\n${scratchpad}`,
            patient ? `Current patient snapshot (for context, do not repeat fields):\n${JSON.stringify(patient)}` : ''
          ].join('\n')
        }
      ]
    };

    const raw = await this.lmStudio.makeRequest(request, undefined, 'rounds-intake');
    return parseJsonSafe<IntakeParserResult>(raw, emptyIntakeResult);
  }

  public async parseWardUpdate(transcript: string, patient: RoundsPatient): Promise<WardUpdateDiff> {
    const request: LMStudioRequest = {
      model: MODEL_CONFIG.QUICK_MODEL,
      temperature: 0.2,
      max_tokens: 1600,
      messages: [
        {
          role: 'system',
          content: [
            'You are updating an inpatient ward list based on a natural language ward round dictation.',
            'Return ONLY JSON for WardUpdateDiff with keys: issuesAdded, issuesUpdated, investigationsAdded, investigationsUpdated, tasksAdded, tasksUpdated, tasksCompletedById, tasksCompletedByText.',
            'Prefer matching existing issues/investigations/tasks by similarity instead of creating duplicates.',
            'For labs, append new LabValue entries with numbers you hear. For imaging/procedure, summarise briefly.',
            'Only mark tasks done if clearly completed. Do not hallucinate values or procedures.',
            'Use concise subpoints and summaries.'
          ].join(' ')
        },
        {
          role: 'user',
          content: [
            'Current patient state (for matching):',
            JSON.stringify({
              id: patient.id,
              name: patient.name,
              mrn: patient.mrn,
              bed: patient.bed,
              issues: patient.issues,
              investigations: patient.investigations,
              tasks: patient.tasks
            }),
            '\nWard dictation:',
            transcript
          ].join('\n')
        }
      ]
    };

    const raw = await this.lmStudio.makeRequest(request, undefined, 'rounds-ward-update');
    return parseJsonSafe<WardUpdateDiff>(raw, emptyWardDiff);
  }

  public async generateGpLetter(patient: RoundsPatient): Promise<string> {
    const followUpTasks = patient.tasks.filter((t: Task) => t.status === 'open');
    const request: LMStudioRequest = {
      model: MODEL_CONFIG.REASONING_MODEL,
      temperature: 0.25,
      max_tokens: 1200,
      messages: [
        {
          role: 'system',
          content: [
            'You are generating a GP-facing discharge letter in the same concise, clinically useful tone as existing Operator GP letters.',
            'Be concise, avoid fluff, focus on: reason for admission, hospital course, key investigations (labs/imaging), medication changes if mentioned, and GP follow-up actions inferred from open tasks.',
            'Return a clean letter in plain text, no JSON, no markdown headings.'
          ].join(' ')
        },
        {
          role: 'user',
          content: [
            `Patient: ${patient.name}${patient.mrn ? ` (MRN ${patient.mrn})` : ''}`,
            `Bed: ${patient.bed || 'n/a'}`,
            `One-liner: ${patient.oneLiner || 'not provided'}`,
            'Issues:',
            JSON.stringify(patient.issues),
            'Investigations:',
            JSON.stringify(patient.investigations),
            'Ward entries (hospital course):',
            JSON.stringify(patient.wardEntries.slice(-8)), // recent context
            'Open tasks (for follow-up):',
            JSON.stringify(followUpTasks)
          ].join('\n')
        }
      ]
    };

    const raw = await this.lmStudio.makeRequest(request, undefined, 'rounds-gp-letter');
    return typeof raw === 'string' ? raw.trim() : '';
  }
}
