# CLAUDE.md — Development Context (Concise)

**Operator (Chrome side‑panel extension)** is a local‑first medical dictation + EMR helper.

- 17 specialty **agents**: Procedures (TAVI, TAVI Workup, Angio/PCI, mTEER, PFO, RHC, Pre-Op Plan); Documentation (Quick Letter, Consultation, Investigation Summary); Review (Unified AI Medical Review, Background, Medication, Bloods, Imaging, Patient Education, Batch Review); Post-processing (Next Step Inference)
- **ActionExecutor + command bar**: single registry drives command bar, favourites, and global `Shift+Letter` shortcuts; command bar now surfaces background errors and inline clarification forms before running actions.
- **Ranked action search**: command bar search scores and ranks matches across label/alias/description/shortcut with lightweight fuzzy matching.
- **TAVI Workup Presentation**: Landscape-first bento board layout for clinical meeting review with keyboard navigation, expandable tiles, and pinnable procedure plan
- **Transcription**: MLX Whisper (`whisper-large-v3-turbo`) at `http://localhost:8001`
- **Generation**: LM Studio at `http://localhost:1234` (MedGemma‑27B for complex; Gemma‑3n‑e4b for simple)
- **DSPy/GEPA** optimisation server at `http://localhost:8002`
- **Intelligent Features**: lazy agent loading, cross‑agent knowledge sharing, smart recommendations, real‑time progress tracking
- **Quick Letter guardrails**: summaries capped at 150 chars and cross-checked so CAD/plaque content never yields “zero calcium/no CAD” hallucinations; reuses detected calcium scores.
- **Rounds/Handover**: Compact header with keyboard patient selector + icon quick actions (Go To, ward update, GP letter + refine, handover/quick add/discharge/undo/delete), Quick Add intake parser, ward update diffing, procedure subpoint day counters + checklists that auto-schedule tasks, global task board, HUD JSON export, NOK save now exports a Shortcuts-friendly `nok_calls.json`
- **Xestro dark mode**: content-script can apply a scoped, Material-inspired dark palette to Xestro without invert filters; includes iframe refresh handling.
- **Vision Intake**: Investigation Summary can OCR investigation photos/screenshots via Qwen3‑VL (type/date metadata + extraction prompts)
- **Mobile/Shortcut Ingest**: macOS daemon ingests Shortcut sidecars (workflow codes, timestamps, geolocation), runs triage, and surfaces jobs in a grouped attachment modal
- Australian spelling & guideline framing; privacy‑first (no cloud calls)

---

## 1) Architecture Overview

### 1.1 Audio → Queue → Transcribe → Generate
- **Recording**: WebM/Opus via MediaRecorder
- **Intelligent Queue** (AudioProcessingQueueService): priority **Quick Letter → TAVI/PCI → Consultation → Investigation Summary → Background**; default concurrency **2**; retries + cleanup; queue UI (`QueueStatusDisplay`)
- **Transcription**: local MLX Whisper (Python server) → text
- **Agent Processing**: AgentFactory routes to selected agent; SystemPrompts per agent; outputs render in Results Panel

```ts
// Queue essentials
addJob(sessionId, audioBlob, agentType, { onProgress, onComplete, onError })
getQueueStats() // queued, processing, completed, failed
updateConcurrencySettings(maxConcurrent, maxQueueSize?)
```

### 1.2 AI Stack & UX
- **LM Studio**: MedGemma‑27B MLX (complex) + Gemma‑3n‑e4b (simple); `ChatMessage.content` now supports multimodal arrays (text + `image_url`) with helper normalization in `LMStudioService`
- **DSPy + GEPA**: prompt optimisation with 30‑point medical rubric (local eval; versioning; audit trails)
- **Side panel UX**: LiveAudioVisualizer + compact RecordingPromptCard; Sessions timeline is a chronological queue with state-themed cards, inline progress chips, and quick actions; OptimizedResultsPanel shows progress & results; Options page for management
- **Unified Pipeline Progress**: Single segmented progress bar (`UnifiedPipelineProgress`) showing live updates through 4 pipeline stages: Audio Processing (0-10%) → Transcribing (10-40%) → AI Analysis (40-90%) → Generation (90-100%); replaces old fragmented overlays with real-time progress tracking, elapsed time, ETA, and model identification
- **Consistent UI/UX**: Shared state color system (`stateColors.ts`) ensures visual consistency across progress bars, session timeline, and status indicators; `ResultsContainer` provides standardized layout with agent-specific content slots; `ActionButtons` with extensible custom actions support
- **Quick actions refresh**: Collapsible 5-column grid with Dictate/Type/Image paths for Investigation Summary, full-panel Appointment Wrap-Up builder, PipelineStrip/Tag/MicroMeter/AudioScrubber primitives, and simplified monochrome LiveAudioVisualizer.

### 1.3 Vision Intake, Mobile/Shortcut Ingest, Rounds
- **Vision intake**: `InvestigationImageExtractor` validates <=10MB data URLs and calls `LMStudioService.processWithVisionAgent` (Qwen3‑VL default) to turn investigation report photos into dictated text; `ImageInvestigationModal` (drag/drop, type/date metadata) is reachable from the Investigation Summary quick action.
- **Mobile/Shortcut ingest**: macOS daemon watcher parses Shortcut sidecars (`workflow_code`, timestamps, lat/lon) and stages them with audio; triage infers dictation type; side panel attachment modal groups recommended agents with keyboard shortcuts, header + preview, confidence chip, and explicit workflow_code mapping.
- **Rounds**: Ward list with Quick Add intake parser, ward update dictation → `RoundsLLMService.parseWardUpdate`, undoable diffs, global task board, HUD export, content-script “Go To” navigation, compact header with keyboard patient selector + icon quick actions, GP discharge letter generation + refine modal, and procedure subpoints with day counters/checklists that auto-schedule tasks.

---

## 2) Agents (17 total; DSPy‑optimised when available)

**Procedures**: TAVI, TAVI Workup, Angiogram/PCI, mTEER, PFO Closure, Right Heart Cath, Pre-Op Plan
**Documentation**: Quick Letter, Consultation, Investigation Summary
**Review & Education**: Unified AI Medical Review (PRIMARY + SECONDARY prevention), Background, Medication, Bloods, Imaging, Patient Education, Batch Patient Review
**Post-processing**: Next Step Inference (clinical suggestions after letter generation)

### 2.1 Unified AI Medical Review (Intelligent PRIMARY + SECONDARY Prevention)

**Single button, intelligent classification system** that automatically detects patient context and applies appropriate frameworks:

**Classification Categories:**
- **PRIMARY PREVENTION**: No prior CABG/PCI, no HFrEF (EF >50%), no severe valve disease
  - Focus: Insulin resistance phenotypes, lipid thresholds, BP patterns (ABPM), subclinical atherosclerosis (CTCA), anthropometrics, end-organ damage
  - Thresholds: TG/HDL ≥1.5, HOMA-IR >2.0, TyG ≥8.8, waist ≥102/88cm, Non-HDL ≥3.4, ACR >2.5/>3.5
  - Output: Findings + MISSING/NEXT TESTS + THERAPY TARGETS + CLINICAL NOTES

- **SECONDARY PREVENTION (CAD)**: Prior CABG, PCI, stent, or MI
  - Focus: Post-ACS management (DAPT, high-intensity statin, beta-blocker, ACE/ARB), aggressive lipid targets (LDL <1.8), cardiac rehab

- **SECONDARY PREVENTION (HFrEF)**: EF ≤40% or documented HFrEF
  - Focus: GDMT pillar gaps (ARNI, beta-blocker, MRA, SGLT2i), iron deficiency, device therapy (ICD/CRT), vaccination

- **SECONDARY PREVENTION (VALVULAR)**: Severe/moderate valve disease or prior valve intervention
  - Focus: Intervention timing (severe AS symptoms, severe MR with LVESD ≥45mm/EF <60%), NT-proBNP stratification

- **MIXED**: Multiple categories apply (e.g., prior PCI + metabolic syndrome)
  - Applies ALL relevant frameworks; prioritizes life-threatening → high-yield prevention → safety

**How it works:**
1. Analyzes BACKGROUND, INVESTIGATIONS, MEDICATIONS
2. Detects keywords: CABG/PCI → CAD; EF ≤40% → HFrEF; severe valve disease → VALVULAR; absence → PRIMARY
3. Assigns classification with rationale and review focus
4. Applies appropriate framework(s) with explicit thresholds (PRIMARY) or Australian guidelines (SECONDARY)
5. Generates 5 prioritized findings with classification tags
6. For PRIMARY: includes MISSING TESTS and THERAPY TARGETS sections

**Output format**: Classification header → Findings with evidence/threshold/mechanism/action/priority → Missing tests → Therapy targets

### 2.2 Interactive Validation Workflow (RHC, TAVI, AngioPCI, mTEER)

**Intelligent validation workflow** prevents wasted reasoning model runs by validating extracted data before expensive report generation. **Now deployed across 4 procedural agents.**

**Workflow**: Whisper → ASR corrections → Regex extraction → Quick model validation (qwen3-4b, ~10-30s) → Auto-apply high-confidence corrections (≥0.8) → Interactive checkpoint for missing/low-confidence fields → Reasoning model (MedGemma-27B, ~3-15min)

**Validation modal** shows: Critical missing (red), Low-confidence suggestions (yellow), Optional fields (blue). User fills/approves → reprocesses with `context.userProvidedFields`.

**Agent-specific critical fields** defined in `validationFieldConfig.ts`:
- **RHC**: Fick inputs (height, weight, Hb, SaO2, SvO2), pressures (RA, RV, PA, PCWP)
- **TAVI**: Annulus sizing, coronary heights, access assessment
- **AngioPCI**: Stent details, TIMI flow, lesion characteristics
- **mTEER**: MR grades, clip details, transmitral gradient

All agents use `FieldValidationPrompt` component; SystemPrompts include `dataValidationPrompt` with Australian terminology.

---

## 3) Intelligent Features
- **Dynamic Agent Loading**: agent chunks (~7–38 KB) loaded on demand; 0 ms cached, ~2 s first load; preloads popular agents for instant access
- **Cross-Agent Intelligence**: builds patient profile across sessions; shares insights (drug interactions, clinical correlations) between agents
- **Smart Recommendations**: complexity assessment with agent suggestions including confidence scores and estimated completion times
- **Real-Time Progress**: single segmented progress bar with live pipeline tracking (Audio → Transcription → AI → Generation); shows elapsed time, ETA with adaptive adjustment, and model identification

---

## 4) DSPy + GEPA (production‑ready)
- Local‑only evaluation; rubric‑based scoring; versioned prompts; human‑in‑the‑loop forms in `eval/feedback/`
- **Baseline scores** (illustrative): Investigation‑Summary 90 (100%); Consultation 86 (100%); Quick‑Letter 66.7 (33%); Angio‑PCI 58 (0%); TAVI 5 (0%)

**Key commands**
```bash
npm run dspy:server:start   # start localhost:8002
npm run dspy:server:health
npm run dspy:server:logs
npm run eval:quick-letter
npm run optim:quick-letter
```

---

## 5) EMR Integration
- **Target**: Xestro (deep) with basic Epic/Cerner fallbacks
- **Content script**: field detection, section navigation, quick actions; auto‑insert & clipboard helpers
- **Quick Action Field Tracking**: Each Quick Action (Background, Investigations, Medications) stores its target EMR field ID (`quickActionField`) in the session when workflow starts, enabling "Insert to EMR" button to open the correct field dialog and append content (instead of generic paste)
- Planned: **Field‑Mapper GUI** to bind selectors per site profile

---

## 6) Testing & Quality
- **Playwright E2E**: extension load, recording, model integration, workflows, performance, errors
- **Helpers**: LMStudioMock, ExtensionTestHelper, MedicalReportValidator
- **DSPy evals**: golden datasets; recommended nightly/regression runs

---

## 7) Monitoring & Resilience
- **ServiceMonitor**: LM Studio/Whisper health; latency; optional auto‑restart scripts (Whisper)
- **PerformanceMonitoringService**: per‑agent SLOs & trends (dashboard planned)
- Clear user guidance for common failures (timeouts/ports)

---

## 8) Performance (Apple Silicon, indicative)
- **Transcription**: ~50× real‑time (warm); 30–60 s cold load
- **Queue**: concurrency=2; priority‑aware
- **Generation**: 1–3 s simple; 3–8 s complex
- **Lazy loads**: 0 ms cached; ~2 s first load
- **Batch**: 5–15 patients/min (data‑dependent)
- **Memory**: ~200 MB extension + ~8 GB models

---

## 9) Security & Privacy
- **Local‑first**: `1234` (LM Studio), `8001` (Whisper), `8002` (DSPy); no cloud
- **Audit trails** for prompt changes; human review required for clinical deltas
- **Data hygiene**: temp storage & cleanup; strict CSP

```json
"content_security_policy": {
  "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; connect-src 'self' http://localhost:1234 http://localhost:8001 http://localhost:8002;"
}
```

---

## 10) UI Design & Consistency

### 10.1 Visual Language (Monochrome + State Colors)
- **Base**: Clean, clinical, minimal; colour reserved for success/warn/error/active
- **State Colors**: Unified color system in `utils/stateColors.ts` ensures consistent visual language across all components
  - 🔴 Red gradients: Recording/active states
  - 🔵 Blue gradients: Transcription states
  - 🟣 Purple gradients: AI processing/intelligence
  - 🟢 Emerald gradients: Generation/success
  - 🔴 Rose gradients: Error/warning
  - 🟦 Teal gradients: Completed states
- **Typography**: Clear hierarchy; motion kept subtle (`animate-complete-pop` for completion, honors `prefers-reduced-motion`)

### 10.2 Component Consistency
- **Progress Indicators**: Single `UnifiedPipelineProgress` component used by ALL agents (TAVI, QuickLetter, AI Review, etc.)
  - Segmented bar with 4 stages: Audio (0-10%) → Transcribing (10-40%) → AI Analysis (40-90%) → Generation (90-100%)
  - Live elapsed time, adaptive ETA, model identification
  - Consistent colors derived from shared state definitions
- **Results Display**: `ResultsContainer` wrapper provides standardized layout:
  - Header (title, metadata, status) - consistent across all agents
  - Transcription section (always visible when available)
  - Agent-specific content area (flexible slot for specialized displays)
  - Action buttons footer (Copy, Insert, Download + optional custom actions)
- **Action Buttons**: Standardized `ActionButtons` component with extensible custom actions
  - Core actions: Copy, Insert to EMR, Download
  - Optional: AI Reasoning viewer (when artifacts available)
  - Agent-specific custom actions (e.g., "Generate Patient Version" for QuickLetter)
  - Consistent visual feedback (checkmark animation, success states)
- **Session Timeline**: State-themed cards with gradient backgrounds and accent edges using shared colors
- **Transcription Section**: Identical appearance and behavior across all agents
  - Expandable/collapsible with audio playback
  - Copy/Insert/Edit actions
  - Transcription approval controls (Perfect/Edit/Skip) for training data quality

### 10.3 Design Principle
**"Same task = Same UI"** - If two agents perform the same underlying action (progress tracking, copying text, displaying results), they use the **same component** with the **same visual design**. Agent-specific complexity lives in designated content areas, not in chrome/buttons/status displays.

---

## 11) Project Structure (high‑signal)
```
src/
  agents/ (base/, specialized/, router/) - 17 agents + SystemPrompts
  background/ (service-worker.ts)
  canvas/ (annotation feature)
  config/ (12 files: workflowConfig, validationFieldConfig, unifiedActionsConfig, etc.)
  content/ (content-script.ts - EMR integration)
  contexts/ (TAVIWorkupContext, RoundsContext, AudioDeviceContext)
  hooks/ (useRecorder, useModelStatus, useAIProcessing, useAppState, useNextStepEngine)
  options/ (OptionsApp + settings components)
  orchestrators/ (BatchAIReview, CheckpointManager, MetricsCollector)
  presentation/ (TAVI bento board: PresentationPage, BentoTile, PatientStrip, etc.)
  services/ (~50 services: LMStudio, AgentFactory, AudioProcessingQueue, etc.)
  sidepanel/
    OptimizedApp.tsx
    components/ (results/, taviWorkup/, rounds/, forms/, etc.)
  storage/ (clinicalStorage.ts)
  types/ (medical.types.ts, taviWorkup.types.ts, optimization.ts, etc.)
  utils/ (~47 files: stateColors.ts, formatting.ts, coronaryAnatomy.ts, etc.)
  workers/ (audioProcessor.worker.ts)
llm/; eval/; tests/e2e/*; whisper-server.py
```

---

## 12) Commands (essentials)
```bash
# Build & dev
npm run dev
npm run build
npm run build-with-types
npm run validate:production
npm run validate:full
npm run lint
npm run type-check

# Whisper
pip install -r requirements-whisper.txt
./start-whisper-server.sh
curl http://localhost:8001/v1/health

# LM Studio
curl http://localhost:1234/v1/models

# DSPy/GEPA
npm run dspy:server:start
npm run dspy:server:health
npm run eval:quick-letter
npm run optim:quick-letter
```

---

## 13) Deployment
1) Install deps; start Whisper (8001) & LM Studio (1234); optional DSPy (8002)
2) `npm run build`; load `dist/` as unpacked extension
3) Validate: `npm run validate:production` + a quick E2E smoke

---

## 14) Versioning
- Patch = fixes/tweaks; Minor = new features/UX; Major = breaking/architecture
- **Update both** `package.json` and `manifest.json` for significant changes

**Current Version**: **4.3.0**
**Last Updated**: December 2025

---

## 15) Recent Major Updates (highlights)

**v4.2.0 (Dec 2025)**
- **TAVI Workup Presentation System**: Landscape-first bento board layout for clinical meeting review
  - Three-column grid with patient context, clinical data tiles, and pinnable procedure plan
  - Keyboard navigation (arrows, Enter/Space, Escape, number keys for pages, P to toggle plan)
  - Professional Avenir-like typography with CSS custom properties theming
  - Responsive breakpoints for desktop, tablet, and mobile layouts
  - Focus states with purple glow and dimming of non-focused tiles
- **Presentation Components**: PatientStrip, PageTabBar, BentoTile, PlanCommandCard, ImagingGrid
- **CSS-only Design System**: 8px grid, shadow tokens, transitions respecting reduced motion

**v3.42.0 (Dec 2025)**
- **Ward Conversation Engine**: Multi-turn conversational ward rounds with structured checklist flow (issues → results → plan → EDD) and condition-specific items (ADHF, aortic stenosis, HFpEF, AF).
  - `WardConversationService` manages sessions with incremental diff merging; once-per-admission flags (DVT prophylaxis, follow-up arranged) and checklist skips tracked per admission.
  - Ward update modal now shows assistant messages and accumulated human summary; apply/discard actions persist or discard session state.
- **Keyboard Shortcuts for Results**: `Shift+C` to copy and `Shift+I` to insert for Investigation Summary, Background, and Medication agents; hints shown inline in action buttons.
- **Transcription Retry Banner**: When Whisper fails (server offline), a retry banner appears in transcription section allowing re-transcription once server is available.
- **Storage Management Options Panel**: New settings section showing browser and server storage usage; bulk delete by age (7/30/90 days) and per-category server cleanup (pending audio, training audio, corrections, jobs).
- **Extension Dark Mode**: CSS utility classes for `operator-extension-dark` toggle; results container and header surfaces adapt to dark palette.
- **Design System Refresh (Sera UI-inspired)**: New CSS tokens for primary violet accent, standardized shadows (`shadow-card`, `shadow-modal`), and border radii (`rounded-card`, `rounded-modal`); Button, Modal, Dropdown, and SegmentedControl components updated with violet focus rings and consistent elevation.
- **Rounds Types Extended**: `RoundsPatient` gains `expectedDischargeDate`, `admissionFlags`, `checklistSkips`; `WardUpdateDiff` supports `eddUpdate`, `admissionFlags`, `checklistSkips`; `Task` type adds optional `linkedIssueId`.
- **No-dock Python Wrapper**: `no-dock-python.py` hides Python processes from macOS dock; Whisper and DSPy startup scripts now use it automatically.

**v3.41.0 (Dec 2025)**
- **Clinician Rosters + Assignments**: Persist clinician directory, quick-add/assign per patient, and manage clinician chips inline on the patient card.
- **LLM Ward Updates**: Generate 280-character ward updates from recent events (issues, labs, tasks, ward entries) with selectable time windows and copy action.
- **Rounds Sync Safety**: Backend polling merges local vs remote patients by `lastUpdatedAt` to avoid overwriting recent edits; prev/next navigation helper for active patients.
- **RHC Safety Hardening**: Pre-applies ASR corrections, filters validation checkpoints to ignore auto-corrected fields, and uses a stricter plain-text prompt that bans markdown/tables and reinforces anti-hallucination rules.
- **Validation UX Polish**: Validation modal clarifies suggestions vs corrections; haemodynamics display gains empty-state guidance.

**v3.40.0 (Dec 2025)**
- **Single-Page Optimization Workflow**: Replaces 5 tabs with guided step cards + status header covering ASR corrections, Whisper LoRA training commands, DevSet creation, evaluation, GEPA optimization, and validation retests; ASR corrections manager embedded in Step 1.
- **Pre-Op Plan Validation Checkpoint**: Regex extraction + quick-model validation with missing-field gate, user-provided merge, completeness scoring, and upgraded card layout/export so pre-op runs don’t proceed with critical gaps.
- **Rounds Backend + Phone Notes**: Local HTTP API + storage service syncing rounds patients across extension/daemon; macOS daemon ingests Shortcut phone-call notes into rounds (quick-add) with tests; rounds storage service polls backend and avoids double-adds on quick add.
- **Canvas & Media Polish**: Screenshot annotation canvas now boots via React entry; audio scrubber renders waveform/progress with drag handling; results/validation UI refreshed.

**v3.39.0 (Dec 2025)**
- **Rounds Ward Grouping**: Patients grouped by ward with divider headers; drag-and-drop reordering within each ward section
- **Done Today Checkbox**: Per-patient completion tracking with `roundCompletedDate`; completed patients show dimmed styling
- **Next of Kin Fields**: Name, relation, and phone fields in patient demographics; phone shows click-to-call button
- **Delete Issue/Investigation**: Expand menu with delete action and confirmation dialog; deleting issue removes linked procedure tasks
- **Ward Round Export**: Export active patients to PNG cards + `round.json` via `WardRoundCardExporter`; configurable round ID/ward/consultant
- **Pending Updates Review**: Sidebar section to refresh and review pending ward round updates; apply or reject individually
- **Idle State Cleanup**: Removed instruction text and background status from idle screen; lanyard centered vertically
- **EMR Insertion Robustness**: Try/catch around content script calls for timeout handling; `insertionInFlightRef` prevents duplicate insertions

**Earlier versions (v3.38 and below)**
- v3.38: Rounds UI/UX overhaul (tab badges, sticky actions, color-coded bars)
- v3.32: Quick Letter first-name extraction, RHC anti-hallucination, progress tracking
- v3.29: Universal validation workflow deployed to 4 agents, centralized config
- v3.28: RHC interactive validation checkpoint
- v3.21: 3D lanyard component (Three.js + Rapier physics)
- v3.19: Circular countdown timer, intelligent ETA prediction
- v3.9: Recording latency optimizations (50ms vs 2-8s)
- v3.6: Unified pipeline progress bar, zero ESLint errors
- v3.2: Intelligent features (dynamic loading, cross-agent intelligence, DSPy)

---

## 16) Base Agent Pattern (essentials)
```ts
abstract class MedicalAgent {
  process(input: string, ctx?: MedicalContext): Promise<MedicalReport>
  protected buildMessages(input: string, ctx?: MedicalContext): ChatMessage[]
  protected parseResponse(response: string): ReportSection[]
  protected extractMedicalTerms(text: string): string[] // preserve grades, TIMI, units, EF
}
```

**Focus**: local‑first medical AI with intelligent queuing, dynamic agent loading, DSPy‑optimised prompts, human‑in‑the‑loop QA, cross‑agent intelligence, and real-time progress tracking.
