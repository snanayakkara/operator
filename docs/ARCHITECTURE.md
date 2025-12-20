# Operator Architecture

> High-level architectural documentation for the Operator Chrome Extension.
> Last updated: Auto-generated from codebase analysis.

---

## Executive Overview

**Operator** is a Chrome Extension (Manifest V3) that augments clinical workflows within hospital EMR systems (primarily Xestro). It provides:

- **Voice-to-text dictation** via local MLX Whisper server
- **AI-assisted report generation** using DSPy prompt pipelines and local LLM (LM Studio)
- **Ward round support** with patient list management and mobile job ingest
- **EMR automation** for inserting, extracting, and navigating patient records

The extension runs entirely on localhost with no cloud PHI transmission. All AI inference occurs on-device via LM Studio. The architecture prioritises latency (streaming responses) and privacy (clinical data stays in `chrome.storage.local`, never sync).

---

## Runtime Lanes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER CONTEXT                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐     MV3 Message      ┌──────────────────────────────┐    │
│   │  SidePanel  │◄───────────────────►│     Background Service       │    │
│   │   (React)   │                      │     (service-worker.ts)      │    │
│   └──────┬──────┘                      └──────────────┬───────────────┘    │
│          │                                            │                     │
│          │ state                                      │ chrome.tabs API     │
│          │                                            ▼                     │
│   ┌──────▼──────┐                      ┌──────────────────────────────┐    │
│   │   Chrome    │                      │      Content Script          │    │
│   │   Storage   │                      │   (content-script.ts)        │    │
│   │  (local)    │                      │   [injected into EMR]        │    │
│   └─────────────┘                      └──────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
              ┌─────────────────────────┼─────────────────────────┐
              │                         │                         │
              ▼                         ▼                         ▼
    ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
    │   LM Studio     │     │  Whisper Server │     │   DSPy Server   │
    │   :1234         │     │   :8001         │     │   :8002         │
    │  (OpenAI API)   │     │  (MLX Whisper)  │     │  (Flask + SSE)  │
    └─────────────────┘     └─────────────────┘     └─────────────────┘
                                                              │
                                                              ▼
                                                    ┌─────────────────┐
                                                    │   Mac Daemon    │
                                                    │   :5858         │
                                                    │  (Job Ingest)   │
                                                    └─────────────────┘
```

### Lane Descriptions

| Lane | Purpose | Entry Points |
|------|---------|--------------|
| **SidePanel** | Primary React UI for dictation, ward rounds, patient cards | `src/pages/SidePanel.tsx` |
| **Background** | MV3 service worker; message hub, tab management, offline wake | `src/background/service-worker.ts` |
| **Content Script** | Injected into EMR pages; DOM manipulation, field insertion | `src/content/content-script.ts` |
| **LM Studio** | Local LLM inference (OpenAI-compatible API) | `http://localhost:1234/v1/chat/completions` |
| **Whisper Server** | ASR and TTS via MLX Whisper | `http://localhost:8001/v1/audio/transcriptions` |
| **DSPy Server** | Prompt optimisation, streaming generation, GEPA workflow | `http://localhost:8002/v1/dspy/process/stream` |
| **Mac Daemon** | Mobile job ingest, patient list persistence | `http://127.0.0.1:5858/rounds/patients` |

---

## Key Entrypoints

| File | Purpose | Hot Paths |
|------|---------|-----------|
| [src/background/service-worker.ts](../src/background/service-worker.ts) | MV3 background service; message dispatcher | `handleMessage()`, `handleTabUpdate()` |
| [src/content/content-script.ts](../src/content/content-script.ts) | EMR DOM automation; field injection | `handleMessage()`, `executeAction()`, `extractPatientData()` |
| [src/pages/SidePanel.tsx](../src/pages/SidePanel.tsx) | Main React app shell | Component tree root |
| [src/services/LMStudioService.ts](../src/services/LMStudioService.ts) | LLM client; streaming chat completions | `processWithAgent()`, `streamChatCompletion()` |
| [src/services/DSPyService.ts](../src/services/DSPyService.ts) | DSPy server client; SSE streaming | `processWithDSpyStreaming()` |
| [src/services/WhisperServerService.ts](../src/services/WhisperServerService.ts) | ASR health checks; server status | `checkServerHealth()` |
| [src/storage/clinicalStorage.ts](../src/storage/clinicalStorage.ts) | PHI-safe storage guards | `installClinicalSyncWriteGuard()` |
| [dspy-server.py](../dspy-server.py) | Flask app for DSPy processing | `/v1/dspy/process/stream` |
| [whisper-server.py](../whisper-server.py) | Flask app for ASR/TTS | `/v1/audio/transcriptions` |
| [mac_daemon/api_server.py](../mac_daemon/api_server.py) | Flask app for job ingest | `/rounds/patients` |

---

## End-to-End Flows

### Flow 1: Voice Dictation → Report Generation

**Scenario:** Clinician dictates procedure notes via microphone.

```
1. User clicks microphone button in SidePanel
   └─► src/components/audio/RecordingControls.tsx: startRecording()

2. Audio captured via MediaRecorder, sent to Whisper Server
   └─► POST http://localhost:8001/v1/audio/transcriptions
   └─► whisper-server.py: /v1/audio/transcriptions handler

3. Transcript returned, displayed in dictation panel
   └─► src/components/dictation/TranscriptDisplay.tsx

4. User clicks "Generate Report" 
   └─► src/services/DSPyService.ts: processWithDSpyStreaming()

5. SSE stream opened to DSPy server
   └─► POST http://localhost:8002/v1/dspy/process/stream
   └─► EventSource parses `token` events for live preview

6. LM Studio called by DSPy server for inference
   └─► dspy-server.py → LM Studio SDK → Llama model

7. Completed report displayed, user clicks "Insert into EMR"
   └─► Background sends EXECUTE_ACTION message to content script
   └─► content-script.ts: executeAction('insertText', ...)
```

### Flow 2: Ward Round Patient Card Rendering

**Scenario:** User opens Ward Rounds view to see patient list.

```
1. SidePanel mounts WardRoundsView component
   └─► src/pages/WardRoundsView.tsx

2. Patient list fetched from chrome.storage.local
   └─► src/storage/clinicalStorage.ts: getClinicalPatients()
   └─► Key: "operator_rounds_patients_v1"

3. For each patient, Issues/Tasks/Investigations rendered
   └─► src/components/rounds/PatientCard.tsx
   └─► src/types/rounds.types.ts: RoundsPatient interface

4. User edits an Issue, update written to storage
   └─► clinicalStorage.ts: setClinicalPatients()
   └─► Storage guard ensures write goes to local, not sync
```

### Flow 3: Mobile Job Ingest via Mac Daemon

**Scenario:** Clinician uses Shortcuts app on iPhone to queue a job.

```
1. Shortcut sends POST to Mac Daemon via local network
   └─► POST http://192.168.x.x:5858/rounds/patients/quick_add
   └─► mac_daemon/api_server.py: quick_add_patient()

2. Job written to data/jobs/*.json
   └─► mac_daemon/jobs.py: JobManager.create_job()

3. Extension polls for new jobs (or user refreshes)
   └─► src/services/RoundsBackendService.ts: fetchPatients()

4. New patient card appears in Ward Rounds view
   └─► Merged with existing chrome.storage.local data
```

### Flow 4: EMR Data Extraction for AI Review

**Scenario:** User clicks "Extract for AI Review" on patient in EMR.

```
1. Background service receives EXTRACT_EMR_DATA_AI_REVIEW message
   └─► src/background/service-worker.ts: case 'EXTRACT_EMR_DATA_AI_REVIEW'

2. Message forwarded to content script on active EMR tab
   └─► chrome.tabs.sendMessage(tabId, {...})

3. Content script extracts structured data from Xestro DOM
   └─► content-script.ts: extractPatientDataForAIReview()
   └─► Parses: demographics, investigations, medications, problem list

4. Extracted data returned to SidePanel via response
   └─► Displayed in AI Review panel for LLM processing
```

---

## State & Storage Model

### Chrome Storage Layout

| Key | Storage | Type | Description |
|-----|---------|------|-------------|
| `operator_rounds_patients_v1` | local | `RoundsPatient[]` | Full patient list with issues/tasks |
| `operator_rounds_clinicians_v1` | local | `Clinician[]` | Clinician team members |
| `rounds_hud_state` | local | `HudPatientState` | HUD overlay state |
| `operator_settings` | sync | `OperatorSettings` | Non-PHI user preferences |
| `agent_memory_*` | local | `AgentMemory` | Per-agent conversation memory |

### PHI Guard

Clinical data is blocked from `chrome.storage.sync` via a write guard:

```typescript
// src/storage/clinicalStorage.ts: installClinicalSyncWriteGuard()
const CLINICAL_KEYS = [
  'operator_rounds_patients_v1',
  'operator_rounds_clinicians_v1', 
  'rounds_hud_state'
];
// Intercepts chrome.storage.sync.set() and throws if clinical key detected
```

One-time migration moves legacy data from sync → local on extension load.

### React State Management

- **TanStack Query** for server state (DSPy, Whisper health checks)
- **Zustand** for UI state (active panel, recording state)
- **Local component state** for ephemeral UI (modals, form inputs)

---

## Safety & Privacy Boundaries

| Boundary | Enforcement | Code Location |
|----------|-------------|---------------|
| No cloud PHI | All inference localhost-only | `LMStudioService.ts`, `DSPyService.ts` |
| Storage isolation | Sync write guard | `clinicalStorage.ts: installClinicalSyncWriteGuard()` |
| CORS | Flask servers allow localhost origins | `dspy-server.py`, `whisper-server.py` |
| CSP | MV3 default CSP; no remote script execution | `manifest.json` |
| Host permissions | Scoped to EMR domains + localhost | `manifest.json: host_permissions` |

### Permissions Model (manifest.json)

```json
"permissions": ["storage", "activeTab", "sidePanel", "tabs", "clipboardRead"],
"host_permissions": [
  "http://localhost:*/*",
  "http://127.0.0.1:*/*",
  "https://*.xestro.com.au/*"
]
```

---

## Build & Packaging

### Build System

| Tool | Purpose | Config |
|------|---------|--------|
| **Vite** | Multi-entry bundler | `vite.config.ts` |
| **@crxjs/vite-plugin** | MV3 manifest handling | Integrated in Vite |
| **React SWC** | Fast JSX compilation | `@vitejs/plugin-react-swc` |
| **Tailwind CSS** | Utility-first styling | `tailwind.config.js` |
| **TypeScript** | Type checking | `tsconfig.json` |

### Build Outputs

```
dist/
├── manifest.json          # MV3 manifest (generated)
├── service-worker.js      # Background script
├── content-script.js      # Injected script
├── sidepanel.html         # SidePanel entry
├── options.html           # Options page
├── canvas.html            # 3D canvas page
└── assets/                # React chunks, CSS
```

### Commands

```bash
npm run dev        # Vite dev server with HMR
npm run build      # Production build to dist/
npm run preview    # Preview production build
```

---

## Known Sharp Edges

| Issue | Impact | Mitigation |
|-------|--------|------------|
| Service worker idle timeout | MV3 workers sleep after 30s; long operations may fail | Background uses alarms; critical ops complete in content script |
| LM Studio SDK connection | SDK connection can hang if LM Studio not running | `WhisperServerService` polls health; UI shows server status |
| Content script reload | Page navigation requires re-injection | `PAGE_DROP_GUARD_INSTALLED` handshake confirms script ready |
| DSPy cold start | First request can take 10-20s | UI shows loading spinner; timeout configurable |
| Xestro DOM changes | EMR vendor may change selectors | Selectors abstracted in `content-script.ts` action handlers |

---

## Extension Points

### Adding a New Agent Type

1. Define agent in `src/types/medical.types.ts`:
   ```typescript
   export type MedicalAgent = 'angiogram-pci' | 'tavi-workup' | 'new-agent';
   ```

2. Add predictor class in `dspy-server.py`:
   ```python
   PREDICTOR_CLASSES['new-agent'] = NewAgentPredictor
   ```

3. Configure model/timeout in `LMStudioService.ts`:
   ```typescript
   agentModels: { 'new-agent': 'reasoning' },
   agentTimeouts: { 'new-agent': 180000 }
   ```

### Adding a New Message Type

1. Add type to background handler switch in `service-worker.ts`:
   ```typescript
   case 'NEW_MESSAGE_TYPE':
     return this.handleNewMessage(message, sender);
   ```

2. Send from SidePanel or content script:
   ```typescript
   chrome.runtime.sendMessage({ type: 'NEW_MESSAGE_TYPE', payload: {...} });
   ```

### Adding a New HTTP Endpoint

1. Add route in relevant Python server (`dspy-server.py`, etc.):
   ```python
   @app.route('/v1/new/endpoint', methods=['POST'])
   def new_endpoint():
       ...
   ```

2. Add client method in TypeScript service:
   ```typescript
   async callNewEndpoint(data: T): Promise<R> {
     const response = await fetch(`${this.baseUrl}/v1/new/endpoint`, {...});
   }
   ```

---

## See Also

- [REPO_MAP.md](./REPO_MAP.md) – Folder structure and file locations
- [PROTOCOL.md](./PROTOCOL.md) – Message protocol contracts and API tables
- [RHC_CALCULATION_REFERENCE.md](../RHC_CALCULATION_REFERENCE.md) – Domain-specific calculations
