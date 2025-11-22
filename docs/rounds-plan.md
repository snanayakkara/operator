# Rounds feature – working notes

## Current architecture touchpoints
- **Side panel shell:** `src/sidepanel/OptimizedApp.tsx` drives the entire UI. Header is `SidebarHeader`; idle state shows `QuickActionsGrouped` and lanyard.
- **Patient navigation:** `PatientContextHeader` triggers a `NAVIGATE_TO_PATIENT` message with `{ fileNumber, patientName }`, handled in `background/service-worker.ts` by sending `EXECUTE_ACTION` `GO_TO_PATIENT_BY_FILING` to the Xestro tab.
- **Audio/LLM pipeline:** shared `useRecorder` hook → `AudioProcessingQueueService` → `LMStudioService.transcribeAudio` (Whisper server) → agent processing. Generic chat helpers live in `LMStudioService` and `streamChatCompletion`.
- **Persistence:** sessions persisted via `SessionPersistenceService` to `chrome.storage.local`. No existing ward list store.

## What’s implemented
- **Local-only data:** stored in `chrome.storage.local` under `operator_rounds_patients_v1` (debounced write, change listeners). HUD JSON mirrored to `rounds_hud_state`.
- **State:** `RoundsContext` manages patients, selection, intake parsing status, ward diff apply + undo, HUD projection.
- **LLM hooks:** `RoundsLLMService` handles intake parsing, ward update parsing, and GP discharge letter generation (LM Studio local).
- **UI:** Rounds overlay (Patients + Tasks tabs), Quick Add modal, patient detail CRUD, ward update modal with diff preview, handover generator, GP letter viewer.

## Ward dictation wiring
- Ward update modal uses shared `useRecorder` → `LMStudioService.transcribeAudio` (Whisper) with agent `rounds-ward-update`.
- Transcript is fed to `RoundsLLMService.parseWardUpdate` to get `WardUpdateDiff`; preview shows issues/investigations/tasks changes.
- Apply uses `RoundsContext.applyWardDiff` (snapshots for undo) → `WardEntry` appended. Undo last ward update available per patient.
- Status badges show recording/transcribing/parsing; cancel leaves data untouched.

## Using “Dictate ward update”
1. Open patient detail → **Dictate ward update**.
2. In modal, click **Dictate ward update** (start/stop). Recording → transcription → parse.
3. Review proposed diff → **Apply** to commit, or Reset/Cancel.

## Quick Add + intake parsing
- Header/overlay **Quick Add** opens Name + Scratchpad.
- Save creates active patient (site Cabrini, empty MRN/bed/one-liner), stores scratchpad as intake note, persists, and auto-parses intake in background. Card shows “parsing intake…” while running; merges parsed issues/investigations/tasks.

## HUD JSON
- `buildHudPatientState` in `src/utils/rounds.ts` produces pinned/open issues/tasks and investigations (labs with trend strings) and stores under `chrome.storage.local.rounds_hud_state` (falls back to localStorage). Respects `hudEnabled === false`.
