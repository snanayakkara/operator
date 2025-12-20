# REPO_MAP — Operator Extension

> **Last updated:** December 2024

Quick orientation for navigating the Operator medical AI Chrome extension codebase.

---

## 📁 Top-Level Folder Tree

```
operator/
├── config/                     # Runtime config files
│   ├── llm.yaml               # DSPy/GEPA agent configuration
│   └── wardround.config.json  # Ward round settings
├── data/                       # Runtime data directories
│   ├── asr/                   # ASR audio/transcript cache
│   ├── gepa/                  # GEPA optimization artifacts
│   └── jobs/                  # Mobile job queue (from daemon)
├── docs/                       # Documentation
│   └── releases/              # Release notes
├── eval/                       # Evaluation datasets
│   ├── devset/                # Development test sets
│   └── feedback/              # Human feedback samples
├── llm/                        # Python DSPy module (evaluation & optimization)
│   ├── predictors.py          # DSPy predictors
│   ├── signatures.py          # DSPy signatures
│   ├── evaluate.py            # Eval harness
│   ├── optim_gepa.py          # GEPA optimizer
│   └── prompts/               # System prompts
├── mac_daemon/                 # macOS menubar ingest daemon (Python)
│   ├── main.py                # Rumps menubar app entry
│   ├── api_server.py          # HTTP API for Chrome extension
│   ├── pipeline.py            # Audio → transcript → triage pipeline
│   ├── watcher.py             # Folder watcher for new jobs
│   ├── rounds_backend.py      # Ward round data backend
│   └── tests/                 # Daemon tests
├── rules/                      # declarativeNetRequest rules
│   └── performance_rules.json
├── src/                        # Extension source (TypeScript/React)
│   ├── agents/                # Medical LLM agents
│   │   ├── base/              # BaseAgent class
│   │   ├── router/            # AgentRouter (task dispatch)
│   │   └── specialized/       # Specialized agents (TAVI, PCI, etc.)
│   ├── background/            # Chrome MV3 service worker
│   │   └── service-worker.ts  # Background script entry
│   ├── canvas/                # 3D lanyard canvas (Three.js)
│   │   ├── index.html
│   │   └── CanvasApp.tsx
│   ├── components/            # Shared UI components
│   ├── content/               # Content script (EMR injection)
│   │   └── content-script.ts
│   ├── contexts/              # React contexts
│   ├── hooks/                 # Custom React hooks
│   ├── options/               # Extension options page
│   │   ├── index.html
│   │   └── OptionsApp.tsx
│   ├── orchestrators/         # Multi-step orchestration
│   ├── providers/             # React providers
│   ├── services/              # Core services (LMStudio, Whisper, DSPy, etc.)
│   ├── sidepanel/             # Main UI (Chrome sidepanel)
│   │   ├── index.html         # Sidepanel HTML entry
│   │   ├── index.tsx          # React bootstrap
│   │   ├── OptimizedApp.tsx   # Main app component
│   │   ├── components/        # Sidepanel-specific components
│   │   │   └── rounds/        # Ward rounds UI
│   │   └── hooks/             # Sidepanel hooks
│   ├── storage/               # chrome.storage abstractions
│   │   └── clinicalStorage.ts # Clinical data (local only, no sync)
│   ├── types/                 # TypeScript types
│   ├── utils/                 # Utility functions
│   │   └── asr/               # ASR correction engine
│   ├── wardround/             # Ward round components (legacy location)
│   └── workers/               # Web Workers
│       └── audioProcessor.worker.ts
├── wardround/                  # Node.js ward round tooling
│   ├── bin/                   # CLI entry points
│   │   ├── ward_round_test.ts
│   │   └── ward_round_watch.ts
│   ├── httpServer.ts          # Ward round HTTP server
│   └── tsconfig.json          # Separate TS config
├── tests/                      # Playwright E2E tests
├── dspy-env/                   # Python venv for DSPy server
├── venv-whisper/               # Python venv for Whisper server
├── dspy-server.py              # DSPy HTTP server (port 8002)
├── whisper-server.py           # MLX Whisper HTTP server (port 8001)
├── dev                         # Unified dev startup script (bash)
├── manifest.json               # Chrome MV3 manifest
├── vite.config.ts              # Vite build config
├── tsconfig.json               # TypeScript config
├── package.json                # npm scripts & deps
└── tailwind.config.js          # Tailwind CSS config
```

---

## 🚪 Key Entrypoints

| Role | Path | Description |
|------|------|-------------|
| **Extension Manifest** | [`manifest.json`](../manifest.json) | Chrome MV3 manifest — permissions, commands, content scripts |
| **Background Worker** | [`src/background/service-worker.ts`](../src/background/service-worker.ts) | Chrome service worker — message hub, tab management, storage guards |
| **Sidepanel Root** | [`src/sidepanel/index.html`](../src/sidepanel/index.html) → [`OptimizedApp.tsx`](../src/sidepanel/OptimizedApp.tsx) | Main React UI |
| **Options Page** | [`src/options/index.html`](../src/options/index.html) → [`OptionsApp.tsx`](../src/options/OptionsApp.tsx) | Settings / config UI |
| **Content Script** | [`src/content/content-script.ts`](../src/content/content-script.ts) | Injected into EMR pages (Xestro) |
| **Canvas (3D)** | [`src/canvas/index.html`](../src/canvas/index.html) | Three.js lanyard viewer |
| **Whisper Server** | [`whisper-server.py`](../whisper-server.py) | MLX Whisper ASR (Flask, port 8001) |
| **DSPy Server** | [`dspy-server.py`](../dspy-server.py) | DSPy evaluation/optimization (Flask, port 8002) |
| **Mac Daemon** | [`mac_daemon/main.py`](../mac_daemon/main.py) | macOS menubar app (rumps) — mobile audio ingest |
| **Ward Round CLI** | [`wardround/bin/ward_round_watch.ts`](../wardround/bin/ward_round_watch.ts) | Node.js watcher for ward round data |
| **Dev Startup** | [`dev`](../dev) | Single bash script to start all services |

---

## 🔧 Build System Highlights

### Vite Configuration ([`vite.config.ts`](../vite.config.ts))

- **Plugin:** `@vitejs/plugin-react-swc` (fast SWC-based React compilation)
- **Multi-entry build:**
  - `sidepanel`, `options`, `popup`, `canvas` → HTML entries
  - `background` → `service-worker.js`
  - `content` → `content-script.js`
- **Code splitting:**
  - `vendor` (react, react-dom)
  - `vendor-ui` (framer-motion, lucide, tanstack-query)
  - `vendor-3d` (three, react-three)
  - `agents`, `services`, `settings-components` manual chunks
- **Output:** `dist/` with hidden source maps, esbuild minification
- **Static copy plugin:** Copies manifest, icons, rules, lanyard assets

### TypeScript Configs

| Config | Scope |
|--------|-------|
| [`tsconfig.json`](../tsconfig.json) | Main extension source (`src/**/*`) |
| [`tsconfig.node.json`](../tsconfig.node.json) | Vite config & build scripts |
| [`wardround/tsconfig.json`](../wardround/tsconfig.json) | Ward round Node.js tooling |

### npm Scripts (key ones)

```bash
npm run dev         # Start Vite dev server
npm run build       # Production build → dist/
npm run dev:start   # ./dev — all local services
npm run dspy:server:start|stop|logs   # DSPy server lifecycle
npm run wardround:watch               # Ward round watcher
npm run eval:*      # Run DSPy evaluations
npm run optim:*     # Run GEPA optimization
```

---

## 🛤️ Runtime Lanes

### 1. Chrome MV3 Lane

```
┌───────────────────────────────────────────────────────────────────┐
│                        Chrome Browser                              │
├───────────────────────────────────────────────────────────────────┤
│  Service Worker (background)                                       │
│  ├─ Tab management, side panel control                            │
│  ├─ chrome.runtime message hub                                    │
│  ├─ Whisper server health checks                                  │
│  └─ Storage migration/guards                                       │
├───────────────────────────────────────────────────────────────────┤
│  Side Panel (React)                                                │
│  ├─ OptimizedApp.tsx — main UI                                    │
│  ├─ Agents (AgentRouter → specialized agents)                     │
│  ├─ Services (LMStudio, Whisper, DSPy, Rounds)                    │
│  └─ Hooks (useAppState, useRecorder, useRounds)                   │
├───────────────────────────────────────────────────────────────────┤
│  Content Script (EMR pages)                                        │
│  ├─ Patient data extraction                                       │
│  ├─ Field injection / autofill                                    │
│  └─ Screenshot capture                                             │
├───────────────────────────────────────────────────────────────────┤
│  Options Page — settings UI                                        │
│  Canvas Page — 3D lanyard viewer                                   │
└───────────────────────────────────────────────────────────────────┘
```

### 2. Local Python Services

| Service | Port | Entry | Description |
|---------|------|-------|-------------|
| **LM Studio** | `1234` | External app | Local LLM serving (OpenAI-compatible) |
| **Whisper Server** | `8001` | `whisper-server.py` | MLX Whisper ASR + optional TTS |
| **DSPy Server** | `8002` | `dspy-server.py` | Prompt optimization, evaluation, GEPA |
| **Mac Daemon API** | `5858` | `mac_daemon/api_server.py` | Mobile job queue HTTP API |

### 3. Node.js Sidecars

| Component | Entry | Description |
|-----------|-------|-------------|
| **Ward Round Watcher** | `wardround/bin/ward_round_watch.ts` | Monitors ward round data changes |
| **Ward Round Test** | `wardround/bin/ward_round_test.ts` | Test runner for ward round pipeline |

---

## 💾 Where State Lives

### chrome.storage.local (device-local, clinical data)

```typescript
// Keys defined in src/storage/clinicalStorage.ts
operator_rounds_patients_v1   // RoundsPatient[]
operator_rounds_clinicians_v1 // Clinician[]
rounds_hud_state              // HudPatientState
```

> ⚠️ Clinical data NEVER goes to `chrome.storage.sync` — enforced by write guard.

### chrome.storage.sync (preferences only)

Small UI preferences (theme toggles, etc.) — no PHI.

### Filesystem (via Mac Daemon)

```
data/
├── asr/              # Audio files & transcripts (temp cache)
├── gepa/             # GEPA optimization artifacts
└── jobs/             # Mobile ingest job queue
    ├── inbox/        # New jobs awaiting processing
    ├── processed/    # Completed jobs
    └── archive/      # Old jobs
```

### LLM Services

- **LM Studio:** Model weights in `~/.lmstudio/` (external)
- **DSPy cache:** `.cache/dspy/` (prompt/response cache)

---

## 📨 Message Flow

### chrome.runtime Messaging

```
┌─────────────┐     chrome.runtime.sendMessage()     ┌─────────────────┐
│ Side Panel  │ ──────────────────────────────────▶  │ Service Worker  │
│ / Content   │ ◀──────────────────────────────────  │ (background)    │
└─────────────┘     sendResponse() / onMessage       └─────────────────┘
```

**Common message types:**
- `EXECUTE_ACTION_ACTIVE_EMR` — trigger content script actions
- `GO_TO_PATIENT` — navigate EMR to patient
- `CAPTURE_SCREENSHOT` — screenshot active tab
- `TOGGLE_RECORDING` — voice recording control

### HTTP Endpoints (localhost)

| Endpoint | Port | Protocol | Usage |
|----------|------|----------|-------|
| `/v1/chat/completions` | 1234 | OpenAI-compat | LLM inference |
| `/v1/audio/transcriptions` | 8001 | OpenAI-compat | Whisper ASR |
| `/v1/health` | 8001/8002 | GET | Health checks |
| `/v1/dspy/process` | 8002 | POST | DSPy processing |
| `/v1/dspy/process/stream` | 8002 | POST (SSE) | Streaming DSPy |
| `/v1/dspy/evaluate` | 8002 | POST | Run evaluation |
| `/v1/dspy/optimize` | 8002 | POST | GEPA optimization |
| `/jobs` | 5858 | GET | List mobile jobs |
| `/jobs/<id>` | 5858 | GET | Job details |
| `/jobs/<id>/attach` | 5858 | POST | Attach job to session |
| `/rounds/*` | 5858 | GET/POST | Ward round data API |

### Streaming / SSE

- **DSPy streaming:** `POST /v1/dspy/process/stream` → Server-Sent Events
- **LM Studio streaming:** Standard OpenAI streaming format

### No WebSockets

Current architecture uses HTTP polling + SSE; no persistent WebSocket connections.

---

## 🗺️ Quick Navigation Cheat Sheet

| I want to... | Look in... |
|--------------|------------|
| Add a new medical agent | `src/agents/specialized/` |
| Modify EMR integration | `src/content/content-script.ts` |
| Change background logic | `src/background/service-worker.ts` |
| Update sidepanel UI | `src/sidepanel/components/` |
| Add a new service | `src/services/` |
| Modify DSPy prompts | `llm/prompts/` |
| Add evaluation metrics | `llm/evaluate.py` |
| Change build config | `vite.config.ts` |
| Update extension permissions | `manifest.json` |
| Modify ward rounds | `src/sidepanel/components/rounds/` |
| Configure LLM settings | `config/llm.yaml` |
