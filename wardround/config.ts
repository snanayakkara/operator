import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import {
  DEFAULT_ICLOUD_ROOT,
  DEFAULT_WARD_ROUND_ROOT,
  getICloudRoot,
  getOperatorRoot,
  getWardArchiveRoot,
  getWardExportsRoot,
  getWardImportsRoot,
  getWardLayoutsRoot,
  getWardLogsRoot,
  getWardRoundsRoot
} from '../src/wardround/paths';
import { RoundMetadata, WardRoundPathsConfig, WardRoundRuntimeConfig } from './types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG_PATH = path.resolve(__dirname, '../config/wardround.config.json');

const runtimeConfigSchema = z.object({
  paths: z.object({
    icloudRoot: z.string(),
    wardRoundRoot: z.string()
  }),
  models: z.object({
    vision: z.object({
      endpoint: z.string(),
      name: z.string().optional()
    }),
    clinicalLLM: z.object({
      endpoint: z.string(),
      name: z.string().optional()
    })
  }),
  confidence: z.object({
    minRegionConfidence: z.number().min(0).max(1),
    minOverallConfidence: z.number().min(0).max(1)
  }),
  mocks: z.object({
    visionDir: z.string().optional(),
    clinicalDir: z.string().optional()
  }).optional()
});

export const defaultWardRoundConfig = (): WardRoundRuntimeConfig => ({
  paths: {
    icloudRoot: DEFAULT_ICLOUD_ROOT,
    // Keep existing Operator/Inbox untouched; create a dedicated Operator/WardRounds subtree.
    wardRoundRoot: DEFAULT_WARD_ROUND_ROOT
  },
  models: {
    vision: {
      name: 'Qwen-VL-8B',
      endpoint: 'http://localhost:8001/v1/vision'
    },
    clinicalLLM: {
      name: 'MedGemma-27B',
      endpoint: 'http://localhost:8002/v1/chat'
    }
  },
  confidence: {
    minRegionConfidence: 0.7,
    minOverallConfidence: 0.75
  }
});

export const loadWardRoundConfig = async (overridePath?: string): Promise<WardRoundRuntimeConfig> => {
  const target = overridePath ? path.resolve(overridePath) : CONFIG_PATH;
  try {
    const raw = await fs.readFile(target, 'utf-8');
    const parsed = JSON.parse(raw);
    const validated = runtimeConfigSchema.parse(parsed);
    return validated;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return defaultWardRoundConfig();
    }
    throw error;
  }
};

export const saveWardRoundConfig = async (config: WardRoundRuntimeConfig, targetPath?: string): Promise<void> => {
  const target = targetPath ? path.resolve(targetPath) : CONFIG_PATH;
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(config, null, 2), 'utf-8');
};

export class WardRoundPathHelper {
  private pathConfig: WardRoundPathsConfig;

  constructor(config: WardRoundRuntimeConfig) {
    this.pathConfig = config.paths;
  }

  public getICloudRoot(): string {
    return getICloudRoot(this.pathConfig);
  }

  public getOperatorRoot(): string {
    return getOperatorRoot(this.pathConfig);
  }

  public getWardRoundsRoot(): string {
    return getWardRoundsRoot(this.pathConfig);
  }

  public exports(roundId: string): string {
    return getWardExportsRoot(roundId, this.pathConfig);
  }

  public imports(roundId: string): string {
    return getWardImportsRoot(roundId, this.pathConfig);
  }

  public archive(roundId: string): string {
    return getWardArchiveRoot(roundId, this.pathConfig);
  }

  public logsDir(): string {
    return getWardLogsRoot(this.pathConfig);
  }

  public layoutsDir(): string {
    return getWardLayoutsRoot(this.pathConfig);
  }

  public roundJson(roundId: string, location: 'Exports' | 'Imports' | 'Archive' = 'Exports'): string {
    switch (location) {
      case 'Imports':
        return path.join(this.imports(roundId), 'round.json');
      case 'Archive':
        return path.join(this.archive(roundId), 'round.json');
      default:
        return path.join(this.exports(roundId), 'round.json');
    }
  }

  public importLog(roundId: string): string {
    return path.join(this.logsDir(), `${roundId}_import_log.json`);
  }

  public async ensureBaseFolders(): Promise<void> {
    const dirs = [
      this.getWardRoundsRoot(),
      this.exports(''),
      this.imports(''),
      this.archive(''),
      this.logsDir(),
      this.layoutsDir()
    ];
    await Promise.all(dirs.map(dir => fs.mkdir(dir, { recursive: true })));
  }

  public async readRoundMetadata(roundId: string, location: 'Exports' | 'Imports' | 'Archive' = 'Exports'): Promise<RoundMetadata | null> {
    const target = this.roundJson(roundId, location);
    try {
      const raw = await fs.readFile(target, 'utf-8');
      return JSON.parse(raw) as RoundMetadata;
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') return null;
      throw error;
    }
  }

  public async writeRoundMetadata(roundId: string, metadata: RoundMetadata, location: 'Exports' | 'Imports' | 'Archive' = 'Exports'): Promise<void> {
    const target = this.roundJson(roundId, location);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, JSON.stringify(metadata, null, 2), 'utf-8');
  }
}
