# Operator Ingest (macOS menubar daemon)

## Requirements summary
- Watch a configurable inbox folder for new audio dictations, move them into a working area, and process one at a time.
- Transcribe each audio file locally via Whisper, triage header text with a local LM Studio LLM, and optionally run downstream agent stubs.
- Emit structured job bundles (audio, transcript, metadata JSON) into a processed/jobs directory tree for the Operator Chrome extension to import later.
- Provide a menubar UI (rumps) that shows status, queued/needs-review counts, manual rescan controls, pause/resume, and preferences.
- Keep all processing offline (local Whisper + LM Studio). Logging goes to stdout and a rotating file.
- **No patient matching occurs here** — the daemon only extracts hints from transcripts; the browser extension remains the source of truth for active patients.

## Design outline
- `config.py`: dataclass-backed config loaded from `~/OperatorIngest/config.json` with sensible defaults. Handles directory creation and persistence, auto-detecting the Operator inbox under either `~/Library/Mobile Documents/com~apple~CloudDocs/Operator/Inbox` (traditional iCloud path) or `~/Library/CloudStorage/iCloud Drive/Operator/Inbox`.
- `jobs.py`: `Job` dataclass, JSON schema helpers, status enum-like constants, and utilities to save/load/list jobs across processed + jobs folders.
- `lm_client.py`: lightweight HTTP client that talks to LM Studio's OpenAI-compatible `/v1/chat/completions` endpoint with error handling.
- `whisper_client.py`: abstraction around Whisper invocation (talks to the MLX `whisper-server.py` at `localhost:8001` by default, with a CLI fallback via `whisper_command`/`WHISPER_COMMAND`).
- `pipeline.py`: orchestrates transcription, header extraction, LLM triage, determines status transitions, and optionally runs stub agent pipelines; writes transcripts + outputs.
- `watcher.py`: polling watcher that scans the inbox, moves files into working/processed folders, and processes jobs sequentially while tracking queue metrics.
- `api_server.py`: lightweight HTTP server (`http://127.0.0.1:5858`) exposing `GET /jobs`, `GET /jobs/<id>`, and `POST /jobs/<id>/attach` for the Chrome extension.
- `main.py`: rumps menubar app wiring config, watcher, API server, menu actions, preferences sheet, and Finder helpers. Exposes pause/resume/rescan, job counts, and app state.
- `requirements.txt`: lists `rumps`, `requests`, and optional utilities.
- Logging: configured via `mac_daemon/logging_utils.py` (or inside `main.py`) to log to stdout + `~/OperatorIngest/logs/operator_ingest.log` with rotation.

## Job JSON schema highlights
Each job (UUID) is stored under `processed/YYYY/MM/DD/<job_id>/` plus mirrored JSON in `jobs/<job_id>.json` with:
- `id`, `created_at`, `audio_filename`, `audio_path`, `transcript_path`, `pipeline_outputs_path`
- `status` ∈ {`pending`, `transcribed`, `triaged`, `needs_review`, `completed`, `error`}
- `dictation_type` ∈ {`clinic_letter`, `procedure_report`, `echo_report`, `task`, `note`, `unknown`}
- `confidence` (0–1), `header_text`, `triage_metadata` (patient hints, raw header)
- Optional `error_message`

## Job state machine
1. `pending` → file discovered/moved into working area.
2. `transcribed` → Whisper succeeded; transcript saved.
3. `triaged` → header analyzed; awaiting action when high confidence but auto-agents disabled.
4. `needs_review` → medium/low confidence; waiting for human or extension.
5. `completed` → (optional) downstream agent pipeline produced outputs.
6. `error` → any failure; error message recorded.

## Running the daemon
Implementation files live alongside this README inside `mac_daemon/`. Run `python3 -m mac_daemon.main` (from the repo root) to start the menubar app once dependencies are installed.

## Installation
1. Ensure Python 3.10+ is available on macOS.
2. Install dependencies (ideally inside a venv):
   ```bash
   cd operator
   python3 -m venv venv-ingest
   source venv-ingest/bin/activate
   pip install -r mac_daemon/requirements.txt
   ```
3. (Optional) Install Whisper-MLX or another Whisper CLI and expose it via the `WHISPER_COMMAND` environment variable (the daemon already targets the MLX HTTP server that `./dev` launches, but you can fall back to the CLI when running standalone).

## Running
You can launch the menubar app directly with:
```bash
python3 -m mac_daemon.main
```
(If you ran `./dev` recently it created `mac_daemon/.venv-ingest`; in that case you can run `mac_daemon/.venv-ingest/bin/python -m mac_daemon.main` to reuse the same dependencies.) The status item will appear as `OI` in the menu bar. Use the menu to trigger manual processing, pause/resume, open Finder locations, and adjust preferences.

When using the root `./dev` script, the menubar app is now launched automatically after LM Studio/Whisper/DSPy are up. Startup logs are written to `/tmp/operator-ingest-<timestamp>.log` and detailed runtime logs remain under `~/OperatorIngest/logs/`.

The daemon also starts a small HTTP server on `http://127.0.0.1:5858` so the Chrome extension can enumerate finished jobs and mark them as attached. The manifest in this repo already declares the corresponding host permission and CSP entry; if you change the port, remember to update the extension too.

## Whisper + LM configuration
- `whisper_api_url` defaults to `http://localhost:8001/v1/audio/transcriptions`, which matches the MLX Whisper server that `./dev` launches (see `start-whisper-server.sh`). Keep that process running to get VAD/repetition guards with zero config.
- For standalone runs you can point at a different server (edit `~/OperatorIngest/config.json`) or fall back to a CLI by setting `WHISPER_COMMAND`, e.g.:
  ```bash
  export WHISPER_COMMAND="/usr/local/bin/whisper_mlx --model large --file {audio}"
  ```
  `{audio}` is replaced with the absolute path at runtime. To persist the command instead of relying on the env var, populate the `whisper_command` field (third line in the Preferences dialog). Clearing both values leaves Whisper in placeholder mode for dry runs.
- LM Studio must be running locally. Configure the base URL/model via the Preferences dialog or by editing `~/OperatorIngest/config.json`. Defaults target `http://localhost:1234/v1/chat/completions`.
- `api_host`/`api_port` control the optional REST endpoint consumed by the Operator Chrome extension (defaults to `127.0.0.1:5858`). Change these only if the port conflicts with another local service, and remember to update the extension manifest host permission.

## Testing the ingest pipeline
- Place an audio file (extensions defined in `process_extensions`, default `.m4a/.wav/.mp3/.aac`) in the inbox folder configured at `~/Library/Mobile Documents/com~apple~CloudDocs/Operator/Inbox` or `~/Library/CloudStorage/iCloud Drive/Operator/Inbox` (the daemon auto-detects and stores whichever exists in `config.json`).
- The watcher running inside Operator Ingest will move the file into `~/OperatorIngest/working`, enqueue a job, and begin transcription/triage. Status updates appear in the menubar UI and in `~/OperatorIngest/jobs/<job_id>.json`.
- Review finished jobs under `~/OperatorIngest/processed/YYYY/MM/DD/<job_id>/` and monitor logs at `~/OperatorIngest/logs/operator_ingest.log` (plus `/tmp/operator-ingest-*.log` for launcher output from `./dev`).

## File layout & job bundles
- `~/OperatorIngest/working`: temporary staging for files pulled from the inbox.
- `~/OperatorIngest/processed/YYYY/MM/DD/<job_id>/`: main job bundle containing `audio.*`, `transcript.txt`, `job.json`, and optional `outputs/`.
- `~/OperatorIngest/jobs/<job_id>.json`: mirror of the metadata for quick scanning by the Operator Chrome extension.
- Logs live under `~/OperatorIngest/logs/operator_ingest.log` with rotation.

## Menubar controls
- **Status / counts**: first four menu items show current mode, queued jobs, needs-review jobs, and the last processed dictation summary.
- **Process Inbox Now**: forces a rescan of the inbox folder.
- **Pause/Resume Processing**: toggles the watcher; also available as a checkbox under Preferences.
- **Open Jobs Folder**: opens the job JSON mirror (`jobs/`) in Finder.
- **Preferences** submenu:
  - `Enable automatic processing`, `Auto-run agents on high confidence`, and `Launch at login` (state only; manually add to Login Items).
  - `Update LM Settings…` window displays folder paths + app version and lets you change LM Studio URL/model plus the Whisper command (line 3).
  - `Open config.json` opens the config file for manual editing of paths.
- The Chrome extension now shows a smartphone icon next to the bell icon; clicking it fetches job metadata from `http://127.0.0.1:5858` and lets the user attach a dictation to the currently open patient chart.

## Notes & next steps
- The daemon does not attach dictations to patients; it only surfaces extracted metadata for later reconciliation by the browser extension.
- Launch-at-login is represented in config.json but must be configured manually in macOS Settings (add a script/Automator wrapper that runs `python3 -m mac_daemon.main`).
- Agent pipeline outputs now call LM Studio with dictation-type-specific prompts (`pipeline.py`) and write artifacts (e.g. `clinic_letter.txt`, `procedure_report.txt`) under each job's `outputs/` directory. Tweak the prompt templates or add downstream post-processing as integration needs evolve.
