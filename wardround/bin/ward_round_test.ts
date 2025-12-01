#!/usr/bin/env ts-node
import path from 'path';
import { promises as fs } from 'fs';
import { defaultWardRoundConfig, WardRoundPathHelper } from '../config';
import { WardRoundLayoutService } from '../layout';
import { MockVisionModelClient } from '../visionClient';
import { MockClinicalLLMClient } from '../clinicalClient';
import { FileSystemWardRoundStateStore } from '../patientState';
import { WardRoundImportWatcher } from '../importWatcher';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '../..');
const wardRoot = path.join(repoRoot, 'WardRounds');

const ensureFixtureImports = async (paths: WardRoundPathHelper, roundId: string) => {
  const fixtureRound = path.join(wardRoot, 'Fixtures', 'rounds', roundId);
  const targetRound = paths.imports(roundId);
  await fs.mkdir(targetRound, { recursive: true });
  await fs.cp(fixtureRound, targetRound, { recursive: true });

  const cardSrc = path.join(wardRoot, 'Fixtures', 'cards', 'TESTP1_SMITH_ALICE_TEST_ROUND_wr_v1_annotated.png');
  const cardDest = path.join(targetRound, path.basename(cardSrc));
  await fs.copyFile(cardSrc, cardDest);
};

const ensureStateStore = async (storePath: string) => {
  const fixture = path.join(wardRoot, 'Fixtures', 'operator_state', 'TEST_ward_state.json');
  try {
    await fs.access(storePath);
  } catch {
    await fs.mkdir(path.dirname(storePath), { recursive: true });
    await fs.copyFile(fixture, storePath);
  }
};

async function main() {
  const config = defaultWardRoundConfig();
  config.paths.icloudRoot = wardRoot;
  config.paths.wardRoundRoot = '';
  config.mocks = {
    visionDir: path.join(wardRoot, 'Fixtures', 'mock', 'vision'),
    clinicalDir: path.join(wardRoot, 'Fixtures', 'mock', 'clinical')
  };

  const paths = new WardRoundPathHelper(config);
  await paths.ensureBaseFolders();

  const statePath = path.join(paths.logsDir(), 'ward_round_state.json');
  await ensureStateStore(statePath);

  await ensureFixtureImports(paths, 'TEST_ROUND');

  const layoutService = new WardRoundLayoutService(paths);
  const vision = new MockVisionModelClient(config.mocks!.visionDir!);
  const clinical = new MockClinicalLLMClient(config.mocks!.clinicalDir!);
  const stateStore = new FileSystemWardRoundStateStore(statePath);

  const watcher = new WardRoundImportWatcher(
    paths,
    layoutService,
    vision,
    clinical,
    config.confidence,
    { stateStore }
  );

  const results = await watcher.processImports();
  console.log(JSON.stringify(results, null, 2));
}

main().catch(err => {
  console.error('Ward round test harness failed', err);
  process.exit(1);
});
