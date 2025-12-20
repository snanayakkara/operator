# Operator Protocol Reference

> Protocol contracts, message schemas, and API documentation for the Operator Chrome Extension.
> Last updated: Auto-generated from codebase analysis.

---

## Protocol Summary

Operator uses three protocol layers:

| Layer | Transport | Direction | Purpose |
|-------|-----------|-----------|---------|
| **MV3 Messages** | `chrome.runtime.sendMessage` | SidePanel ↔ Background ↔ Content | Internal extension messaging |
| **Content Actions** | MV3 Messages (subset) | Background → Content | EMR DOM automation |
| **HTTP APIs** | REST + SSE | Extension → localhost Python | AI inference, ASR, job management |

All protocols are localhost-only. No external network calls contain PHI.

---

## MV3 Message Protocol

Messages are exchanged via `chrome.runtime.sendMessage()` and `chrome.runtime.onMessage`.

### Message Shape

```typescript
interface ExtensionMessage {
  type: string;           // UPPER_SNAKE_CASE identifier
  payload?: unknown;      // Type-specific data
  tabId?: number;         // Target tab (optional)
}
```

### Background Service Handler

Location: [src/background/service-worker.ts](../src/background/service-worker.ts) – `BackgroundService.handleMessage()`

| Message Type | Direction | Payload | Response | Purpose |
|--------------|-----------|---------|----------|---------|
| `EXECUTE_ACTION` | Panel → BG → Content | `{ action: string, ...params }` | `{ success: boolean }` | Generic action dispatch |
| `EXECUTE_ACTION_ACTIVE_EMR` | Panel → BG → Content | `{ action: string, ...params }` | `{ success: boolean }` | Action on tracked EMR tab |
| `PAGE_DROP_GUARD_INSTALLED` | Content → BG | `{ tabId: number }` | – | Confirms content script ready |
| `SET_DROP_HINT` | Panel → BG → Content | `{ hint: string }` | – | Update file drop overlay text |
| `SIDE_PANEL_ACTION` | Panel → BG | `{ action: string }` | varies | Side panel control actions |
| `GET_TAB_INFO` | Panel → BG | – | `{ tabId, url, title }` | Query active tab metadata |
| `UPDATE_AGENT_MEMORY` | Panel → BG | `{ agentType: string, memory: object }` | – | Persist agent conversation |
| `GET_SETTINGS` | Panel → BG | – | `OperatorSettings` | Retrieve user settings |
| `UPDATE_SETTINGS` | Panel → BG | `Partial<OperatorSettings>` | – | Update user settings |
| `CLIPBOARD_MONITORING_RESULT` | Content → BG | `{ text: string }` | – | Report clipboard content |
| `EXTRACT_EMR_DATA_AI_REVIEW` | Panel → BG → Content | – | `EmrExtractedData` | Extract patient data for AI |
| `SET_FILE_DROP_GUARD` | Panel → BG → Content | `{ enabled: boolean }` | – | Toggle file drop overlay |
| `NAVIGATE_TO_PATIENT` | Panel → BG → Content | `{ filingCode: string }` | `{ success: boolean }` | Navigate EMR to patient |

### Message Flow Example

```
┌──────────┐   {type:'EXECUTE_ACTION',action:'insertText'}   ┌────────────┐
│ SidePanel│ ─────────────────────────────────────────────► │ Background │
└──────────┘                                                 └─────┬──────┘
                                                                   │
                                                                   │ chrome.tabs.sendMessage()
                                                                   ▼
                                                             ┌────────────┐
                                                             │  Content   │
                                                             │  Script    │
                                                             └────────────┘
```

---

## Content Script Action Protocol

Location: [src/content/content-script.ts](../src/content/content-script.ts) – `ContentScriptHandler.executeAction()`

Actions are dispatched via the `EXECUTE_ACTION` message type with an `action` field.

### Action Table

| Action | Parameters | DOM Target | Purpose |
|--------|------------|------------|---------|
| `insertText` | `{ text: string, field?: string }` | Active textarea/input | Insert text at cursor |
| `openField` | `{ fieldType: string }` | Xestro field buttons | Click to open EMR field editor |
| `background` | – | Background section | Navigate to patient background |
| `medications` | – | Medications tab | Navigate to medications list |
| `bloods` | – | Bloods section | Navigate to blood results |
| `imaging` | – | Imaging section | Navigate to imaging results |
| `save` | – | Save button | Click EMR save button |
| `GO_TO_PATIENT_BY_FILING` | `{ filingCode: string }` | Patient search | Navigate to specific patient |

### Keyboard Shortcuts (Content Script)

When content script has focus, single-key shortcuts trigger actions:

| Key | Action | Target |
|-----|--------|--------|
| `i` | Navigate to investigations | Investigations section |
| `b` | Navigate to bloods | Blood results |
| `m` | Navigate to medications | Medications tab |
| `s` | Save current record | Save button |
| `l` | Open lab results | Lab section |
| `t` | Toggle view | View toggle |

---

## Localhost HTTP APIs

### LM Studio (Port 1234)

Base URL: `http://localhost:1234`

OpenAI-compatible API for local LLM inference.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/chat/completions` | POST | Streaming chat completion |
| `/v1/models` | GET | List loaded models |

#### Chat Completion Request

```typescript
{
  model: string;              // e.g. "qwen2.5-32b-instruct"
  messages: ChatMessage[];    // [{ role, content }]
  temperature?: number;       // 0.0 - 2.0
  max_tokens?: number;        // Max response tokens
  stream?: boolean;           // Enable SSE streaming
}
```

#### Streaming Response

When `stream: true`, response is `text/event-stream`:

```
data: {"id":"...","choices":[{"delta":{"content":"Hello"}}]}

data: {"id":"...","choices":[{"delta":{"content":" world"}}]}

data: [DONE]
```

---

### Whisper Server (Port 8001)

Base URL: `http://localhost:8001`

Location: [whisper-server.py](../whisper-server.py)

| Endpoint | Method | Content-Type | Purpose |
|----------|--------|--------------|---------|
| `/v1/audio/transcriptions` | POST | `multipart/form-data` | Speech-to-text |
| `/v1/audio/transcriptions/bloods` | POST | `multipart/form-data` | Blood test dictation |
| `/v1/audio/synthesis` | POST | `application/json` | Text-to-speech |
| `/v1/health` | GET | – | Health check |
| `/v1/models` | GET | – | List available models |

#### Transcription Request

```typescript
// FormData fields:
file: Blob;           // Audio file (wav, mp3, webm)
model?: string;       // Model name (default: "mlx-community/whisper-large-v3-mlx")
language?: string;    // Language code (default: "en")
```

#### Transcription Response

```typescript
{
  text: string;           // Transcribed text
  language?: string;      // Detected language
  duration?: number;      // Audio duration (seconds)
}
```

#### Health Check Response

```typescript
{
  status: "healthy" | "unhealthy";
  model_loaded: boolean;
  available_memory_gb: number;
}
```

---

### DSPy Server (Port 8002)

Base URL: `http://localhost:8002`

Location: [dspy-server.py](../dspy-server.py)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/health` | GET | Server health and stats |
| `/v1/dspy/process` | POST | Non-streaming DSPy processing |
| `/v1/dspy/process/stream` | POST | SSE streaming processing |
| `/v1/dspy/evaluate` | POST | Run evaluation on agent |
| `/v1/dspy/optimize` | POST | Optimise agent prompts |
| `/v1/dspy/optimize/preview` | POST | Preview optimisation |
| `/v1/dspy/agents` | GET | List available agents |
| `/v1/dspy/devset/<agent_type>` | GET | Get development set |
| `/v1/dspy/devset/<agent_type>` | POST | Update development set |
| `/v1/asr/corrections` | GET | Get ASR corrections |
| `/v1/asr/corrections` | POST | Add ASR correction |
| `/v1/storage/<key>` | GET | Read server-side storage |
| `/v1/storage/<key>` | PUT | Write server-side storage |
| `/v1/jobs` | GET | List background jobs |

#### Process Request

```typescript
{
  agent_type: string;     // e.g. "angiogram-pci", "tavi-workup"
  transcript: string;     // Raw dictation text
  facts?: KeyFactsEnvelope; // E15: Optional confirmed key facts from proof mode
  options?: {
    timeout?: number;     // Milliseconds
    fresh_run?: boolean;  // Skip cache
  }
}
```

#### KeyFactsEnvelope Schema (E15)

When `facts` is provided, the server treats them as ground truth constraints
and incorporates them into the prompt before the transcript.

```typescript
interface KeyFactsEnvelope {
  version: 1;
  facts: {
    patient?: { name?: string; dob?: string; age?: number; sex?: string; };
    context?: { indication?: string; procedure?: string; };
    medications?: string[];
    problems?: string[];
    investigations?: Record<string, string>;
    freeform?: Record<string, string>;
  };
}
```

#### Process Response (Non-Streaming)

```typescript
{
  success: boolean;
  result: string;           // Generated report
  processing_time: number;  // Milliseconds
  cached: boolean;
  agent_type: string;
  used_facts?: boolean;     // E15: Whether confirmed facts were used
}
```

#### Streaming Response (SSE)

Endpoint: `/v1/dspy/process/stream`

**Note:** Uses POST with fetch + ReadableStream (NOT EventSource which is GET-only).

Events sent in SSE format:

| Event | Data | Purpose |
|-------|------|---------|
| `progress` | `{ stage: StageName, percent: number, detail?: string }` | Processing progress (B7) |
| `token` | `{ delta: string, fullText: string }` | Incremental token output |
| `complete` | `{ result: string, processing_time: number, used_facts?: boolean }` | Final result |
| `error` | `{ error: string }` | Error occurred |

#### Stage Taxonomy (B7)

The `stage` field uses a controlled vocabulary:

| Stage | Description | Typical % |
|-------|-------------|-----------|
| `collecting` | Gathering inputs (transcript, EMR data) | 0-5% |
| `transcribing` | Audio to text conversion | 5-35% |
| `extracting` | Key facts extraction | 35-45% |
| `reasoning` | AI analysis and decision making | 45-85% |
| `formatting` | Structuring the output | 85-95% |
| `validating` | Verification and checks | 95-98% |
| `inserting` | Writing to EMR | 98-100% |
| `complete` | Finished | 100% |

**Client Parsing (TypeScript):**

```typescript
// src/services/DSPyService.ts: processWithDSpyStreaming()
// Uses fetch + ReadableStream to parse SSE format
const response = await fetch(url, { method: 'POST', body, headers });
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value, { stream: true });
  // Parse SSE format: "event: progress\ndata: {...}\n\n"
  const lines = chunk.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      if (data.stage) {
        onProgress({ stage: data.stage, percent: data.percent, detail: data.detail });
      } else if (data.token) {
        onToken(data.token);
      } else if (data.result) {
        onComplete(data.result);
      }
    }
  }
}
```

#### Health Check Response

```typescript
{
  status: "healthy" | "unhealthy";
  timestamp: string;               // ISO 8601
  server: {
    version: string;
    uptime_seconds: number;
    port: number;
  };
  dspy: {
    ready: boolean;
    config_loaded: boolean;
    available_agents: string[];
    enabled_agents: string[];
  };
  lmstudio_sdk: {
    enabled: boolean;
    connected: boolean;
    streaming_available: boolean;
  };
  endpoints: {
    process: string;
    process_stream: string;
    evaluate: string;
    optimize: string;
    health: string;
  };
}
```

---

### Mac Daemon (Port 5858)

Base URL: `http://127.0.0.1:5858`

Location: [mac_daemon/api_server.py](../mac_daemon/api_server.py)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/jobs` | GET | List all jobs |
| `/jobs/<id>` | GET | Get job by ID |
| `/jobs/<id>/attach` | POST | Attach job to session |
| `/jobs/<id>` | DELETE | Delete job |
| `/rounds/patients` | GET | Get patient list |
| `/rounds/patients` | POST | Save patient list |
| `/rounds/patients/quick_add` | POST | Quick add patient |

#### Quick Add Patient Request

```typescript
{
  filing_code: string;
  name?: string;
  location?: string;
  consultant?: string;
}
```

#### Patients Response

```typescript
{
  success: boolean;
  patients: RoundsPatient[];
  timestamp: string;
}
```

---

## Storage Contracts

Location: [src/storage/clinicalStorage.ts](../src/storage/clinicalStorage.ts)

### Chrome Storage Keys

| Key | Storage | Schema | Purpose |
|-----|---------|--------|---------|
| `operator_rounds_patients_v1` | local | `RoundsPatient[]` | Patient list with issues/tasks |
| `operator_rounds_clinicians_v1` | local | `Clinician[]` | Team members |
| `rounds_hud_state` | local | `HudPatientState` | HUD overlay state |
| `operator_settings` | sync | `OperatorSettings` | Non-PHI preferences |
| `agent_memory_<agentType>` | local | `AgentMemory` | Conversation history |

### RoundsPatient Schema

```typescript
// src/types/rounds.types.ts
interface RoundsPatient {
  id: string;
  filingCode: string;
  name: string;
  age?: number;
  sex?: 'M' | 'F' | 'O';
  location?: string;
  consultant?: string;
  admissionDate?: string;
  diagnosis?: string;
  
  issues: Issue[];
  tasks: Task[];
  investigations: Investigation[];
  
  createdAt: string;
  updatedAt: string;
}

interface Issue {
  id: string;
  text: string;
  priority: 'low' | 'medium' | 'high';
  resolved: boolean;
}

interface Task {
  id: string;
  text: string;
  assignee?: string;
  dueDate?: string;
  completed: boolean;
}

interface Investigation {
  id: string;
  type: 'bloods' | 'imaging' | 'other';
  name: string;
  result?: string;
  date?: string;
}
```

### PHI Write Guard

Clinical keys are blocked from `chrome.storage.sync`:

```typescript
// installClinicalSyncWriteGuard()
const originalSet = chrome.storage.sync.set;
chrome.storage.sync.set = function(items, callback) {
  const keys = Object.keys(items);
  const clinicalKeys = keys.filter(k => CLINICAL_KEYS.includes(k));
  if (clinicalKeys.length > 0) {
    throw new Error(`Blocked clinical data write to sync: ${clinicalKeys.join(', ')}`);
  }
  return originalSet.call(this, items, callback);
};
```

---

## Error Model

### HTTP Error Response

All Python servers return errors in this shape:

```typescript
{
  success: false;
  error: string;          // Human-readable message
  code?: string;          // Error code (optional)
  timestamp?: string;     // ISO 8601
}
```

### HTTP Status Codes

| Code | Meaning | Recovery |
|------|---------|----------|
| 200 | Success | – |
| 400 | Bad request (validation) | Check request body |
| 404 | Endpoint not found | Check URL |
| 500 | Server error | Check server logs |
| 502 | LM Studio unavailable | Start LM Studio |

### MV3 Message Errors

Messages may reject with:

```typescript
{
  success: false;
  error: string;
}
```

Common error patterns:

| Error | Cause | Recovery |
|-------|-------|----------|
| "No active EMR tab" | Content script not injected | Navigate to EMR page |
| "Tab not found" | Tab closed during operation | Retry operation |
| "Action failed" | DOM element not found | EMR layout changed; update selectors |

### DSPy Streaming Errors

SSE error event:

```typescript
{
  event: "error",
  data: {
    message: string;
    code: "TIMEOUT" | "LLM_ERROR" | "PARSE_ERROR" | "UNKNOWN";
  }
}
```

---

## Protocol Gaps

| Gap | Impact | Workaround |
|-----|--------|------------|
| No message schema validation | Type mismatches fail silently | TypeScript interfaces; manual validation |
| No retry logic for MV3 messages | Lost messages on service worker restart | UI shows error; user retries |
| SSE reconnection not automatic | Stream interruption loses progress | Client must reinitiate request |
| No versioning for storage keys | Schema changes break existing data | Migration functions in clinicalStorage.ts |
| No authentication on localhost APIs | Any local process can call | Acceptable for localhost-only |
| HTTP/2 not supported | No multiplexing | Acceptable for low-volume requests |

---

## See Also

- [ARCHITECTURE.md](./ARCHITECTURE.md) – High-level system architecture
- [REPO_MAP.md](./REPO_MAP.md) – Folder structure and file locations
- [OPERATOR_UI_INTENT.md](./OPERATOR_UI_INTENT.md) – UI design principles
