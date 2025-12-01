#!/usr/bin/env ts-node
import path from 'path';
import { fileURLToPath } from 'url';
import { loadWardRoundConfig, WardRoundPathHelper } from '../config';
import { WardRoundLayoutService } from '../layout';
import { QwenVisionModelClient } from '../visionClient';
import { MedGemmaClinicalLLMClient } from '../clinicalClient';
import { FileSystemWardRoundStateStore } from '../patientState';
import { WardRoundImportWatcher } from '../importWatcher';
import { WardRoundHttpServer } from '../httpServer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function startWatcher() {
  const config = await loadWardRoundConfig();
  const paths = new WardRoundPathHelper(config);
  await paths.ensureBaseFolders();

  const layoutService = new WardRoundLayoutService(paths);
  const vision = new QwenVisionModelClient(config.models.vision);
  const clinical = new MedGemmaClinicalLLMClient(config.models.clinicalLLM);
  const statePath = path.join(paths.logsDir(), 'ward_round_state.json');
  const stateStore = new FileSystemWardRoundStateStore(statePath);

  const watcher = new WardRoundImportWatcher(
    paths,
    layoutService,
    vision,
    clinical,
    config.confidence,
    { stateStore }
  );

  let inFlight = false;
  const intervalMs = 15000;

  console.log(`🔎 Ward round watcher started (poll ${intervalMs / 1000}s).`);
  console.log(`📂 Imports: ${paths.imports('')}`);

  // Run immediately once
  await watcher.processImports();

  // Start lightweight HTTP server for pending updates
  const server = new WardRoundHttpServer({
    stateStore,
    port: 5859,
    host: '127.0.0.1'
  });
  server.start();

  // Poll loop
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (!inFlight) {
      inFlight = true;
      watcher.processImports().catch(err => {
        console.error('Ward round watcher error', err);
      }).finally(() => {
        inFlight = false;
      });
    }
    await delay(intervalMs);
  }
}

startWatcher().catch(err => {
  console.error('Ward round watcher failed to start', err);
  process.exit(1);
});
