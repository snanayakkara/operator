import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import { LayoutDefinition, LayoutRegion } from './types';
import { WardRoundPathHelper } from './config';

const layoutSchema = z.object({
  template_id: z.string(),
  layout_version: z.number().int(),
  image_width: z.number().positive(),
  image_height: z.number().positive(),
  regions: z.record(z.string(), z.object({
    x: z.number(),
    y: z.number(),
    width: z.number().positive(),
    height: z.number().positive()
  }))
});

export class WardRoundLayoutService {
  constructor(private paths: WardRoundPathHelper) {}

  public async loadLayout(templateId: string, layoutVersion: number): Promise<LayoutDefinition> {
    const filename = `${templateId}.json`;
    const target = path.join(this.paths.layoutsDir(), filename);
    const raw = await fs.readFile(target, 'utf-8');
    const parsed = layoutSchema.parse(JSON.parse(raw));
    if (parsed.template_id !== templateId) {
      throw new Error(`Layout template_id mismatch: expected ${templateId}, found ${parsed.template_id}`);
    }
    if (parsed.layout_version !== layoutVersion) {
      throw new Error(`Layout version mismatch for ${templateId}: expected ${layoutVersion}, found ${parsed.layout_version}`);
    }
    return parsed;
  }

  public getRegionRect(layout: LayoutDefinition, region: string): LayoutRegion | undefined {
    return layout.regions[region];
  }
}
