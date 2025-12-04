import { MODEL_CONFIG, LMStudioService } from './LMStudioService';
import { logger } from '@/utils/Logger';
import {
  IntakeParserResult,
  RoundsPatient,
  Task,
  WardUpdateDiff
} from '@/types/rounds.types';
import type { LMStudioRequest } from '@/types/medical.types';
import type { RecentPatientEvent } from '@/utils/rounds';

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
      context_length: 6000,
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
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'intake_result',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              issues: { type: 'array' },
              investigations: { type: 'array' },
              tasks: { type: 'array' }
            },
            required: ['issues', 'investigations', 'tasks']
          }
        }
      }
    };

    const raw = await this.lmStudio.makeRequest(request, undefined, 'rounds-intake');
    return parseJsonSafe<IntakeParserResult>(raw, emptyIntakeResult);
  }

  public async parseWardUpdate(transcript: string, patient: RoundsPatient): Promise<WardUpdateDiff> {
    const request: LMStudioRequest = {
      model: MODEL_CONFIG.QUICK_MODEL,
      temperature: 0.2,
      max_tokens: 1600,
      context_length: 6000,
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
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'ward_update_diff',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              issuesAdded: { type: 'array' },
              issuesUpdated: { type: 'array' },
              investigationsAdded: { type: 'array' },
              investigationsUpdated: { type: 'array' },
              tasksAdded: { type: 'array' },
              tasksUpdated: { type: 'array' },
              tasksCompletedById: { type: 'array' },
              tasksCompletedByText: { type: ['array', 'null'] }
            },
            required: ['issuesAdded', 'issuesUpdated', 'investigationsAdded', 'investigationsUpdated', 'tasksAdded', 'tasksUpdated', 'tasksCompletedById']
          }
        }
      }
    };

    const raw = await this.lmStudio.makeRequest(request, undefined, 'rounds-ward-update');
    return parseJsonSafe<WardUpdateDiff>(raw, emptyWardDiff);
  }

  public async generateGpLetter(patient: RoundsPatient): Promise<string> {
    const followUpTasks = patient.tasks.filter((t: Task) => t.status === 'open');
    await this.lmStudio.ensureModelLoaded(MODEL_CONFIG.REASONING_MODEL);
    const request: LMStudioRequest = {
      model: MODEL_CONFIG.REASONING_MODEL,
      temperature: 0.25,
      max_tokens: 1200,
      context_length: 8000,
      messages: [
        {
          role: 'system',
          content: [
            'You are writing a GP-facing discharge letter in the same style as Operator Quick Letter: polished, clinical, and narrative with short, well-structured paragraphs (no bullet lists).',
            'Include: reason for admission, succinct hospital course, key investigations (labs/imaging) that matter long term, any medication changes if present, and clear GP follow-up actions inferred from open tasks, and completed tasks mentioned in the summary.',
            'Keep it concise, professional, and readable; return plain text only (no JSON, no headings).'
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

  public async refineGpLetter(patient: RoundsPatient, currentLetter: string, instruction: string): Promise<string> {
    await this.lmStudio.ensureModelLoaded(MODEL_CONFIG.REASONING_MODEL);
    const request: LMStudioRequest = {
      model: MODEL_CONFIG.REASONING_MODEL,
      temperature: 0.2,
      max_tokens: 900,
      context_length: 8000,
      messages: [
        {
          role: 'system',
          content: [
            'You are revising a GP-facing discharge letter. Make concise edits only; keep structure and tone.',
            'Return the full revised letter.'
          ].join(' ')
        },
        {
          role: 'user',
          content: [
            'Current letter:',
            currentLetter,
            '',
            'Patient context (for consistency, do not restate all):',
            JSON.stringify({
              name: patient.name,
              mrn: patient.mrn,
              bed: patient.bed,
              site: patient.site,
              oneLiner: patient.oneLiner
            }),
            '',
            'Edit request:',
            instruction
          ].join('\n')
        }
      ]
    };

    const raw = await this.lmStudio.makeRequest(request, undefined, 'rounds-gp-letter');
    return typeof raw === 'string' ? raw.trim() : '';
  }

  public async generatePatientUpdateMessage(
    patient: RoundsPatient,
    events: RecentPatientEvent[]
  ): Promise<string> {
    // Early return if no events
    if (events.length === 0) {
      return 'No significant changes.';
    }

    // Build prompt
    const eventsList = events.map(e => `- ${e.text}`).join('\n');

    const request: LMStudioRequest = {
      model: MODEL_CONFIG.QUICK_MODEL,
      temperature: 0.3,
      max_tokens: 150,
      context_length: 2000,
      messages: [
        {
          role: 'system',
          content: [
            'You are a clinical assistant.',
            'You will receive a list of changes for a ward patient over the last 24 hours.',
            'Produce a single concise message, maximum 280 characters.',
            'The audience is another clinician who already knows the patient.',
            'Use plain English, no bullet points, no headings.',
            'Do NOT explicitly mention "in the last 24 hours"; just describe what changed.',
            'If there are no meaningful changes, respond exactly with "No significant changes."',
            'Use Australian spelling.'
          ].join(' ')
        },
        {
          role: 'user',
          content: `Patient: ${patient.name}\nWard: ${patient.site || 'Unknown'}\nBed: ${patient.bed}\n\nRecent changes:\n${eventsList}\n\nGenerate a concise update message (≤280 chars):`
        }
      ]
    };

    try {
      const raw = await this.lmStudio.makeRequest(request, undefined, 'rounds-message-update');
      const trimmed = raw.trim();

      // Truncate if over 280 chars (safety)
      return trimmed.length > 280 ? trimmed.substring(0, 277) + '...' : trimmed;
    } catch (error) {
      logger.error('[RoundsLLMService] generatePatientUpdateMessage error', {
        error: error instanceof Error ? error.message : error
      });
      return 'Could not generate update.';
    }
  }
}
