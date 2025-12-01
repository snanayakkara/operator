import { promises as fs } from 'fs';
import path from 'path';
import { WardRoundPathHelper } from './config';
import { WardRoundLayoutService } from './layout';
import { ClinicalLLMClient } from './clinicalClient';
import { VisionModelClient } from './visionClient';
import { FileSystemWardRoundStateStore, WardRoundStateStore } from './patientState';
import {
  PatientImportOutcome,
  RoundMetadata,
  WardRoundConfidenceConfig,
  WardRoundImportResult
} from './types';
import { planPatientUpdate, applyPlannedUpdate } from './updatePlanner';
import { isoNow } from '../src/utils/rounds';

interface ImportWatcherOptions {
  stateStore?: WardRoundStateStore;
}

const ANNOTATED_SUFFIX = '_annotated';

const parseCardFilename = (filename: string) => {
  const base = filename.replace(/\.[^.]+$/, '');
  if (!base.includes(ANNOTATED_SUFFIX)) return null;
  const withoutSuffix = base.replace(ANNOTATED_SUFFIX, '');
  const parts = withoutSuffix.split('_');
  if (parts.length < 3) return null;
  const patientId = parts[0];
  const templateId = parts.slice(-1)[0];
  const roundId = parts.slice(1, -1).join('_');
  return { patientId, roundId, templateId };
};

export class WardRoundImportWatcher {
  private stateStore: WardRoundStateStore;

  constructor(
    private paths: WardRoundPathHelper,
    private layoutService: WardRoundLayoutService,
    private vision: VisionModelClient,
    private clinical: ClinicalLLMClient,
    private thresholds: WardRoundConfidenceConfig,
    options?: ImportWatcherOptions
  ) {
    this.stateStore = options?.stateStore || new FileSystemWardRoundStateStore(path.join(this.paths.logsDir(), 'ward_round_state.json'));
  }

  public async processImports(): Promise<WardRoundImportResult[]> {
    await this.paths.ensureBaseFolders();
    const importsRoot = this.paths.imports('');
    const roundDirs = await this.listRoundDirs(importsRoot);
    const results: WardRoundImportResult[] = [];
    for (const dir of roundDirs) {
      const roundId = path.basename(dir);
      const logPath = this.paths.importLog(roundId);
      const logExists = await this.exists(logPath);
      if (logExists) {
        continue; // already processed
      }
      try {
        const result = await this.processRound(dir, roundId);
        await fs.writeFile(logPath, JSON.stringify(result, null, 2), 'utf-8');
        await this.archiveRound(dir, roundId);
        results.push(result);
      } catch (error) {
        const failure: WardRoundImportResult = {
          roundId,
          metadata: {
            round_id: roundId,
            created_at: isoNow(),
            ward: '',
            consultant: '',
            patient_count: 0,
            template_id: '',
            layout_version: 0
          },
          patients: [{
            patientId: '',
            roundId,
            imagePath: '',
            vision: {
              patient_id_from_card: '',
              round_id_from_card: '',
              regions: {},
              confidence: {},
              warnings: [],
              raw: null
            },
            clinical: null,
            status: 'failed',
            reason: error instanceof Error ? error.message : String(error)
          }],
          startedAt: isoNow(),
          finishedAt: isoNow()
        };
        await fs.writeFile(logPath, JSON.stringify(failure, null, 2), 'utf-8');
        results.push(failure);
      }
    }
    return results;
  }

  private async processRound(dir: string, roundId: string): Promise<WardRoundImportResult> {
    const startedAt = isoNow();
    const metadata = await this.readRoundMetadata(dir, roundId);
    const annotatedImages = await this.findAnnotatedImages(dir);
    const layout = await this.layoutService.loadLayout(metadata.template_id, metadata.layout_version);
    const patients: PatientImportOutcome[] = [];

    for (const imagePath of annotatedImages) {
      const parsed = parseCardFilename(path.basename(imagePath));
      if (!parsed) {
        patients.push({
          patientId: '',
          roundId,
          imagePath,
          vision: { patient_id_from_card: '', round_id_from_card: '', regions: {}, confidence: {}, warnings: [`Unparseable filename ${path.basename(imagePath)}`] },
          clinical: null,
          status: 'failed',
          reason: 'Invalid filename'
        });
        continue;
      }

      const patient = await this.stateStore.loadPatient(parsed.patientId);
      if (!patient) {
        patients.push({
          patientId: parsed.patientId,
          roundId,
          imagePath,
          vision: { patient_id_from_card: '', round_id_from_card: '', regions: {}, confidence: {}, warnings: ['Patient not found'] },
          clinical: null,
          status: 'failed',
          reason: 'Patient not found'
        });
        continue;
      }

      try {
        const vision = await this.vision.parseCard({
          imagePath,
          layout,
          patientId: parsed.patientId,
          roundId,
          templateId: parsed.templateId
        });

        const clinical = await this.clinical.proposeChanges({
          patient,
          round: metadata,
          regions: vision.regions,
          regionConfidence: vision.confidence
        });

        const planned = planPatientUpdate(
          patient,
          clinical,
          this.thresholds,
          vision.confidence,
          metadata.exported_at || metadata.created_at,
          imagePath
        );

        if (planned.status === 'apply' && planned.diff) {
          const applied = applyPlannedUpdate(patient, planned, JSON.stringify(vision.regions, null, 2));
          await this.stateStore.savePatient(applied.patient);
          patients.push({
            patientId: parsed.patientId,
            roundId,
            imagePath,
            vision,
            clinical,
            diffApplied: planned.diff,
            status: 'applied'
          });
        } else if (planned.status === 'pending' && planned.pendingUpdate) {
          await this.stateStore.savePendingUpdate(planned.pendingUpdate);
          patients.push({
            patientId: parsed.patientId,
            roundId,
            imagePath,
            vision,
            clinical,
            pendingUpdateId: planned.pendingUpdate.id,
            status: 'pending',
            reason: planned.reason
          });
        } else {
          patients.push({
            patientId: parsed.patientId,
            roundId,
            imagePath,
            vision,
            clinical,
            status: 'skipped',
            reason: planned.reason
          });
        }
      } catch (error) {
        patients.push({
          patientId: parsed.patientId,
          roundId,
          imagePath,
          vision: { patient_id_from_card: '', round_id_from_card: '', regions: {}, confidence: {}, warnings: [] },
          clinical: null,
          status: 'failed',
          reason: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return {
      roundId,
      metadata,
      patients,
      startedAt,
      finishedAt: isoNow()
    };
  }

  private async readRoundMetadata(dir: string, roundId: string): Promise<RoundMetadata> {
    const roundJson = path.join(dir, 'round.json');
    const raw = await fs.readFile(roundJson, 'utf-8');
    const parsed = JSON.parse(raw) as RoundMetadata;
    if (parsed.round_id !== roundId) {
      parsed.round_id = roundId;
    }
    return parsed;
  }

  private async listRoundDirs(importsRoot: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(importsRoot, { withFileTypes: true });
      return entries.filter(e => e.isDirectory()).map(e => path.join(importsRoot, e.name));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  private async findAnnotatedImages(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir);
    return entries
      .filter(name => name.endsWith('.png') && name.includes(ANNOTATED_SUFFIX))
      .map(name => path.join(dir, name));
  }

  private async archiveRound(sourceDir: string, roundId: string): Promise<void> {
    const targetDir = this.paths.archive(roundId);
    await fs.mkdir(targetDir, { recursive: true });
    await fs.cp(sourceDir, targetDir, { recursive: true });
    await fs.rm(sourceDir, { recursive: true, force: true });
  }

  private async exists(target: string): Promise<boolean> {
    try {
      await fs.access(target);
      return true;
    } catch {
      return false;
    }
  }
}
