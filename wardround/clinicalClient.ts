import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import { RoundsPatient } from '../src/types/rounds.types';
import {
  ClinicalLLMResult,
  ProposedChanges,
  RoundMetadata,
  WardRoundModelConfig
} from './types';

export interface ClinicalLLMRequest {
  patient: RoundsPatient;
  round: RoundMetadata;
  regions: Record<string, string>;
  regionConfidence: Record<string, number>;
}

export interface ClinicalLLMClient {
  proposeChanges(request: ClinicalLLMRequest): Promise<ClinicalLLMResult>;
}

const proposedChangesSchema = z.object({
  issues: z.array(z.any()).default([]),
  investigations: z.array(z.any()).default([]),
  tasks: z.array(z.any()).default([])
});

const clinicalResponseSchema = z.object({
  patient_id: z.string(),
  round_id: z.string(),
  proposed_changes: proposedChangesSchema,
  llm_notes: z.string().default(''),
  overall_confidence: z.number().min(0).max(1).default(0)
});

const buildSystemPrompt = (): string => {
  return [
    'You are a clinical assistant ingesting ward round card text.',
    'Return ONLY JSON with patient_id, round_id, proposed_changes, llm_notes, overall_confidence.',
    'Map obs/bloods/imaging/meds/plan text into concise structured updates.',
    'Keep proposed changes minimal: append subpoints to existing issues or add new issues when clearly new.',
    'Do not fabricate data; prefer concise clinical language.'
  ].join(' ');
};

const buildUserPrompt = (patient: RoundsPatient, round: RoundMetadata, regions: Record<string, string>, regionConfidence: Record<string, number>): string => {
  return [
    `Ward round metadata: ${JSON.stringify(round)}`,
    `Region confidence: ${JSON.stringify(regionConfidence)}`,
    'Region text:',
    JSON.stringify(regions, null, 2),
    'Current patient snapshot (for matching, do not rewrite unchanged fields):',
    JSON.stringify({
      id: patient.id,
      name: patient.name,
      mrn: patient.mrn,
      bed: patient.bed,
      issues: patient.issues,
      investigations: patient.investigations,
      tasks: patient.tasks
    })
  ].join('\n\n');
};

export class MedGemmaClinicalLLMClient implements ClinicalLLMClient {
  constructor(private model: WardRoundModelConfig) {}

  public async proposeChanges(request: ClinicalLLMRequest): Promise<ClinicalLLMResult> {
    const body = {
      model: this.model.name || 'medgemma-27b',
      max_tokens: 1600,
      temperature: 0.2,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        {
          role: 'user',
          content: buildUserPrompt(request.patient, request.round, request.regions, request.regionConfidence)
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'ward_round_proposed_changes',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              patient_id: { type: 'string' },
              round_id: { type: 'string' },
              proposed_changes: { type: 'object' },
              llm_notes: { type: 'string' },
              overall_confidence: { type: 'number' }
            },
            required: ['patient_id', 'round_id', 'proposed_changes']
          }
        }
      }
    };

    const response = await fetch(this.model.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Clinical LLM HTTP ${response.status}: ${text}`);
    }
    const raw = await response.json();
    const content = raw?.choices?.[0]?.message?.content || raw;
    const parsed = typeof content === 'string' ? JSON.parse(extractJson(content)) : content;
    const validated = clinicalResponseSchema.parse(parsed);
    return { ...validated, raw };
  }
}

export class MockClinicalLLMClient implements ClinicalLLMClient {
  constructor(private mockDir: string) {}

  public async proposeChanges(request: ClinicalLLMRequest): Promise<ClinicalLLMResult> {
    const filenames = [
      `${request.patient.id}_${request.round.round_id}.json`,
      `${request.patient.id}.json`
    ];
    let target: string | null = null;
    for (const name of filenames) {
      const candidate = path.join(this.mockDir, name);
      try {
        await fs.access(candidate);
        target = candidate;
        break;
      } catch {
        // continue
      }
    }
    if (!target) {
      throw new Error(`No mock clinical response found for ${request.patient.id}`);
    }
    const raw = await fs.readFile(target, 'utf-8');
    const parsed = JSON.parse(raw);
    const validated = clinicalResponseSchema.parse(parsed);
    return { ...validated, raw: parsed };
  }
}

const extractJson = (raw: string): string => {
  const match = raw.match(/\{[\s\S]*\}/);
  return match ? match[0] : raw;
};
