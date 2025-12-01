import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import { LayoutDefinition, VisionModelRequest, VisionModelResult, WardRoundModelConfig } from './types';

export interface VisionModelClient {
  parseCard(request: VisionModelRequest): Promise<VisionModelResult>;
}

const visionResponseSchema = z.object({
  patient_id_from_card: z.string().optional().default(''),
  round_id_from_card: z.string().optional().default(''),
  regions: z.record(z.string(), z.string()),
  confidence: z.record(z.string(), z.number().min(0).max(1)).default({}),
  warnings: z.array(z.string()).default([])
});

const buildRegionPrompt = (layout: LayoutDefinition): string => {
  const parts = Object.entries(layout.regions).map(([key, rect]) => {
    return `${key}: x=${rect.x}, y=${rect.y}, width=${rect.width}, height=${rect.height}`;
  });
  return [
    'You will receive an image of a ward round card with handwritten notes inside boxed regions.',
    'Use the region coordinates to read handwriting and ignore printed labels or borders.',
    'Regions:',
    parts.join('\n')
  ].join('\n');
};

const systemPrompt = [
  'You are a medical vision model reading a ward round card with fixed boxes.',
  'Return ONLY JSON with patient_id_from_card, round_id_from_card, regions, confidence, warnings.'
].join(' ');

const buildUserPrompt = (request: VisionModelRequest): string => {
  const regionPrompt = buildRegionPrompt(request.layout);
  const metaPrompt = [
    request.patientId ? `Expected patient_id: ${request.patientId}` : '',
    request.roundId ? `Expected round_id: ${request.roundId}` : '',
    request.templateId ? `Template id: ${request.templateId}` : ''
  ].filter(Boolean).join('\n');

  return [
    'Read handwriting inside each region box and return text.',
    'Keep empty strings for blank regions.',
    regionPrompt,
    metaPrompt
  ].filter(Boolean).join('\n\n');
};

export class QwenVisionModelClient implements VisionModelClient {
  constructor(private model: WardRoundModelConfig) {}

  public async parseCard(request: VisionModelRequest): Promise<VisionModelResult> {
    const imageBuffer = await fs.readFile(request.imagePath);
    const b64 = imageBuffer.toString('base64');
    const body = {
      model: this.model.name || 'qwen-vl-8b',
      max_tokens: 800,
      temperature: 0,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: buildUserPrompt(request) },
            { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } }
          ]
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'ward_round_card_parse',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              patient_id_from_card: { type: 'string' },
              round_id_from_card: { type: 'string' },
              regions: { type: 'object' },
              confidence: { type: 'object' },
              warnings: { type: 'array' }
            },
            required: ['regions']
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
      throw new Error(`Vision model HTTP ${response.status}: ${text}`);
    }
    const raw = await response.json();
    // Some servers return {choices: [{message: {content: '...'}}]}
    const content = raw?.choices?.[0]?.message?.content || raw;
    const parsed = typeof content === 'string' ? JSON.parse(extractJson(content)) : content;
    const validated = visionResponseSchema.parse(parsed);
    return { ...validated, raw };
  }
}

export class MockVisionModelClient implements VisionModelClient {
  constructor(private mockDir: string) {}

  public async parseCard(request: VisionModelRequest): Promise<VisionModelResult> {
    const filename = `${path.basename(request.imagePath, path.extname(request.imagePath))}.json`;
    const target = path.join(this.mockDir, filename);
    const raw = await fs.readFile(target, 'utf-8');
    const parsed = JSON.parse(raw);
    const validated = visionResponseSchema.parse(parsed);
    return { ...validated, raw: parsed };
  }
}

const extractJson = (raw: string): string => {
  const match = raw.match(/\{[\s\S]*\}/);
  return match ? match[0] : raw;
};
