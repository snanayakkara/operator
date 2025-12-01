# Ward round card → vision → Operator pipeline (TypeScript)

This folder contains the local-first pipeline described in `docs/pipeline_spec.txt`, implemented in TypeScript so it can share types and update logic with Operator.

## Key modules (wardround/)
- `config.ts` – load/save runtime config, expand the iCloud + Operator/WardRounds roots, and build paths for Exports/Imports/Archive/Logs/Layouts.
- `layout.ts` – load and validate layout JSON (e.g., `Operator/WardRounds/Layouts/ward_round_v1.json`) and expose region accessors.
- `visionClient.ts` – `VisionModelClient` interface plus Qwen-VL HTTP client and mock reader.
- `clinicalClient.ts` – `ClinicalLLMClient` interface plus MedGemma HTTP client and mock reader.
- `updatePlanner.ts` – conflict + confidence checks, mapping proposed changes → `WardUpdateDiff`, deciding auto-apply vs. pending review.
- `patientState.ts` – simple file-backed patient/pending store for the pipeline/test harness.
- `importWatcher.ts` – scans `Operator/WardRounds/Imports/<ROUNDID>/`, runs the two-stage pipeline, logs results, archives processed folders, and records pending updates when confidence/conflicts require review.

## Layout and fixtures
- Layout: `Operator/WardRounds/Layouts/ward_round_v1.json` (matches the spec coordinates). When running against iCloud, the default root is `~/Library/Mobile Documents/com~apple~CloudDocs/Operator/WardRounds` (Operator’s existing `Inbox` remains untouched).
- Mock fixtures live under `WardRounds/Fixtures/`:
  - `mock/vision/*.json` – canned vision responses keyed by annotated filename.
  - `mock/clinical/*.json` – canned clinical responses keyed by patient id.
  - `rounds/TEST_ROUND/round.json` – sample round metadata.
  - `cards/TESTP1_SMITH_ALICE_TEST_ROUND_wr_v1_annotated.png` – placeholder annotated card.
  - `operator_state/TEST_ward_state.json` – sample patient state for the file-backed store.

## Test harness
Run the offline/mock pipeline end-to-end:
```
npm run wardround:test
```
The harness:
- Uses the repo-local `WardRounds/` directory (not your real iCloud path) by overriding the config in code.
- Copies the `TEST_ROUND` fixtures into `WardRounds/Imports/TEST_ROUND/`.
- Uses mock vision/clinical outputs.
- Writes the import log to `WardRounds/Logs/TEST_ROUND_import_log.json` and updates `WardRounds/Logs/ward_round_state.json`.

## Wiring notes
- Real endpoints and iCloud paths can be configured via `config/wardround.config.json` (auto-generated with defaults if missing).
- `WardRoundImportWatcher` can be instantiated with real clients (`QwenVisionModelClient`, `MedGemmaClinicalLLMClient`) and a custom state store that bridges into Operator storage if desired.
- `PendingWardRoundUpdate` objects capture conflicts or low-confidence outputs; they’re stored alongside patients in the file-backed store for now and can be surfaced to the UI through a thin service or HTTP shim.
