# CLAUDE.md — Development Context (Concise)

**Operator (Chrome side‑panel extension)** is a local‑first medical dictation + EMR helper.

- 14+ specialty **agents** (TAVI, Angio/PCI, mTEER, PFO, RHC, Quick Letter, Consultation, Investigation Summary, Aus Review, Background, Medication, Bloods, Imaging, Patient Education, Batch Review)
- **Transcription**: MLX Whisper (`whisper-large-v3-turbo`) at `http://localhost:8001`
- **Generation**: LM Studio at `http://localhost:1234` (MedGemma‑27B for complex; Gemma‑3n‑e4b for simple)
- **DSPy/GEPA** optimisation server at `http://localhost:8002`
- **Intelligent Features**: lazy agent loading, cross‑agent knowledge sharing, smart recommendations, real‑time progress tracking
- **Rounds/Handover**: Compact header with keyboard patient selector + icon quick actions (Go To, ward update, GP letter + refine, handover/quick add/discharge/undo/delete), Quick Add intake parser, ward update diffing, procedure subpoint day counters + checklists that auto-schedule tasks, global task board, HUD JSON export
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

## 2) Agents (Enhanced; DSPy‑optimised when available)

**Core procedures**: TAVI; Angiogram/PCI; mTEER; PFO Closure; Right Heart Cath
**Documentation & review**: Quick Letter; Consultation; Investigation Summary
**Specialised**: Unified AI Medical Review (PRIMARY + SECONDARY prevention); Background; Medication; Bloods; Imaging; Patient Education; Batch Patient Review

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

**Example Output:**
```
**PATIENT CLASSIFICATION:**
- Category: PRIMARY
- Rationale: No prior CABG, PCI, HFrEF, or severe valve disease. Presents with metabolic syndrome.
- Review Focus: Insulin resistance phenotype, BP phenotyping (ABPM), subclinical atherosclerosis

**CLASSIFICATION TAG:** [PRIMARY]
**FINDING:** Insulin-resistant dyslipidaemia (TG/HDL high)
**EVIDENCE:** TG 1.9 mmol/L, HDL-C 0.9 mmol/L (TG/HDL 2.11) on 2025-09-28
**THRESHOLD/STATUS:** ≥1.5 (mmol/L) → crossed
**MECHANISM:** Hepatic IR ↑ VLDL, low HDL, small-dense LDL → atherogenic milieu
**RECOMMENDED ACTION:** Start statin if 5-yr risk ≥10% (LDL <2.0; Non-HDL <2.6); check ApoB, fasting insulin
**PRIORITY:** high | **URGENCY:** Soon

**MISSING / NEXT TESTS:**
• Waist circumference (assess central obesity)
• Fasting insulin (calculate HOMA-IR for insulin resistance quantification)
• ABPM (assess nocturnal BP pattern)
• ApoB (better marker than LDL-C)

**THERAPY TARGETS:**
• BP: <130/80 mmHg
• LDL-C: <2.0 mmol/L
• Non-HDL-C: <2.6 mmol/L
• HbA1c: <7%
```

### 2.2 Interactive Validation Workflow (RHC, TAVI, AngioPCI, mTEER)

**Intelligent validation workflow** prevents wasted reasoning model runs by validating extracted data before expensive report generation. **Now deployed across 4 procedural agents.**

**Universal Workflow Pattern:**
1. **Whisper Transcription** → ASR corrections for common errors (agent-specific patterns)
2. **Regex Extraction** → Extract procedure-specific critical fields (valve sizing, stent details, clip deployment, haemodynamics)
3. **Quick Model Validation** (qwen/qwen3-4b-2507, ~10-30s) → Validate extraction, detect gaps, suggest corrections with confidence scores
4. **Auto-Apply High-Confidence** → Corrections ≥0.8 confidence applied automatically without user intervention
5. **Interactive Checkpoint** → If critical fields missing or low-confidence corrections (<0.8):
   - Pause workflow with `status: 'awaiting_validation'`
   - Show validation modal with agent-specific field configurations:
     - **Critical missing fields** (red) - REQUIRED for complete report/calculations
     - **Low-confidence suggestions** (yellow) - User accepts/rejects proposed corrections
     - **Optional fields** (blue) - Improves documentation quality but not essential
   - User fills/approves fields → reprocess with `context.userProvidedFields`
6. **Reasoning Model** → Generate report (MedGemma-27B, ~3-15min) ONLY after validation passes

**Agent-Specific Critical Fields:**

**RHC (Right Heart Cath):**
- **For Fick Calculations**: Height, Weight, Hemoglobin, SaO2, SvO2 (ensures accurate CO/CI/PVR/SVR)
- **Pressures**: RA, RV systolic/diastolic, PA systolic/diastolic/mean, PCWP
- **Resources**: Fluoroscopy time, contrast volume (safety documentation)

**TAVI (Valve Sizing & Safety):**
- **Valve Sizing**: Annulus diameter/perimeter/area from CT (CRITICAL for prosthesis selection)
- **Coronary Heights**: Left/right coronary ostium heights (CRITICAL for coronary occlusion risk)
- **Access Assessment**: Site, iliofemoral dimensions
- **Aortic Valve**: Peak/mean gradient, AV area
- **LV Assessment**: EF, LVIDD, LVIDS

**Angiogram/PCI (Registry Reporting):**
- **Intervention Details**: Stent type/diameter/length (REQUIRED for device tracking & registry)
- **Lesion Characteristics**: Target vessel, location, stenosis %
- **TIMI Flow**: Pre/post-intervention grades (REQUIRED for success assessment)
- **Resources**: Contrast volume, fluoroscopy time (safety documentation)

**mTEER (Procedural Success):**
- **MR Grading**: Pre/post-procedure MR grade (KEY measure of procedural success)
- **Clip Details**: Type (MitraClip/PASCAL), size, number deployed (REQUIRED for device tracking)
- **Anatomical Location**: A2-P2, A1-P1, etc. (precise documentation)
- **Transmitral Gradient**: Post-procedure gradient (CRITICAL for assessing mitral stenosis risk)

**Benefits:**
- **Saves time**: No wasted 3-15min reasoning model runs with incomplete data; quick model validation takes only 10-30s
- **Improves accuracy**: User sees missing fields immediately before generation; model corrections reduce transcription errors (e.g., "three point five" → 3.5)
- **Efficient resource usage**: Lightweight quick model validates before resource-intensive reasoning model runs
- **Consistent UX**: All 4 agents use same generic `FieldValidationPrompt` component with agent-specific field configurations in `validationFieldConfig.ts`

Each agent has dedicated SystemPrompts with `dataValidationPrompt`, validation patterns, critical field lists, confidence thresholds; Australian terminology.

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
  agents/ (base/, specialized/, router/)
  options/ (OptionsApp + components)
  orchestrators/ (BatchAIReview, CheckpointManager, MetricsCollector)
  services/ (LMStudio, Transcription, WhisperServer, AgentFactory, LazyAgentLoader,
             CrossAgentIntelligence, AudioProcessingQueue, DSPy, PerformanceMonitoring,
             Metrics, ProcessingTimePredictor, AudioOptimization, ASRCorrectionsLog,
             ScreenshotCombiner, Notification, Toast)
  content/ (content-script.ts)
  sidepanel/
    OptimizedApp.tsx (main app)
    components/
      UnifiedPipelineProgress.tsx (single progress bar for all agents)
      SessionDropdown.tsx (state-themed timeline)
      results/
        ResultsContainer.tsx (standardized layout wrapper)
        ActionButtons.tsx (extensible actions)
        TranscriptionSection.tsx (consistent transcription UI)
        ReportDisplay.tsx, TAVIWorkupDisplay.tsx, RightHeartCathDisplay.tsx, etc.
  hooks/ (useRecorder, useModelStatus, useAIProcessing, useAppState)
  config/ (workflowConfig, appointmentPresets, recordingPrompts)
  utils/
    stateColors.ts (shared color definitions for consistency)
    formatting.ts, animations.ts, etc.
  types/ (medical.types.ts, optimization.ts, BatchProcessingTypes.ts)
llm/ (DSPy server + prompts); eval/ (datasets + feedback); tests/e2e/*; whisper-server.py
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

**Current Version**: **3.42.0**
**Last Updated**: December 2025

---

## 15) Recent Major Updates (highlights)

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

**v3.38.0 (Nov 2025)**
- **Rounds UI/UX Overhaul**: Comprehensive redesign of Rounds feature layout and interactions
  - **Tab badges with counts**: `Patients (5)` | `Tasks (12)` for quick orientation
  - **Handover button badge**: Shows active patient count `Handover (5)`
  - **Patient selection indicator**: Shows selected patient name with icon in amber action bar
  - **Sticky patient actions**: Amber bar stays visible when scrolling
  - **GP letter loading spinner**: Uses `isLoading` prop for proper spinner animation
  - **Toast notifications**: Success/info toasts for all actions (copy, discharge, undo, delete)
  - **Delete confirmation modal**: ConfirmModal with danger variant prevents accidental deletions
  - **Enhanced empty state**: Styled card with icon, description, and CTA button
  - **Layout fixes**: Header flex improvements, button `flex-shrink-0` prevents squishing, reduced gap in action bar
  - **Removed duplicates**: Eliminated duplicate Quick Add button from PatientsView
  - **Color-coded action bars**: Indigo for global actions, amber for patient-specific actions

**v3.32.0 (Nov 2025)**
- **Quick Letter - Intelligent First Name Extraction**: Parses full patient names (strips titles) to extract first name only; prevents awkward title-heavy greetings ("I saw Bruce today" not "I saw Mr Bruce Taylor today"); system prompts enhanced with explicit first-name-only instructions
- **RHC - Anti-Hallucination Post-Processing**: Comprehensive pipeline to detect and remove example text leaked from system prompts; pattern matching for placeholder brackets `[Age]`, `[gender]`, `[stated diagnosis]`; console warnings for suspicious content; preserves legitimate bracketed content like `[site not specified]`
- **Enhanced Progress Tracking**: Time-based interpolation during prompt processing (50% → 68%); character-based tracking during streaming (70% → 98%); throttled updates every 500ms; proper cleanup of progress intervals
- **Session Management Improvements**: Added `processingStartTime` for accurate ETA; patient context header now shows for both active and displayed sessions; audio duration tracking with fallback logic; auto-check fixes via `selectedSessionId` setting
- **EMR Integration Timeout Protection**: 3-second timeout wrapper prevents hanging when content script doesn't respond; graceful error handling with workflow continuation

**v3.29.1 (Nov 2025)** - Critical Bugfix Release
- **Fixed validation checkpoint logic bug** affecting all 4 procedural agents (RHC, TAVI, AngioPCI, mTEER)
  - **Issue**: Agents incorrectly triggered validation modal even when all critical fields were present
  - **Root cause**: Checkpoint checked `missingCritical.length > 0` without filtering by `critical: true` property
  - **Fix**: Now filters with `.some(field => field.critical === true)` before triggering checkpoint
  - **Impact**: Agents correctly distinguish between "field present but flagged by model" vs "field truly missing and critical"
- **Enhanced quick model validation prompt** (RHC)
  - Added explicit "CRITICAL DECISION LOGIC" section with clear rules for when to mark fields as critical
  - Guidance: Only add to `missingCritical` if BOTH (a) field not in regex extraction AND (b) field required for calculations
  - Prevents model confusion about when to set `critical: true` vs `critical: false`
- **Migrated RHC to centralized validation config**
  - RHC now uses `getValidationConfig('rhc')` instead of local field definitions
  - Ensures consistency with TAVI, AngioPCI, mTEER agents (v3.29.0 pattern)
- **Improved console logging**: Shows accurate critical field counts ("X critical fields missing, Y low-confidence corrections")
- **Files modified**: 4 agents (checkpoint logic), 1 system prompt (validation guidance), 1 display component (centralized config)

**v3.29.0 (Nov 2025)**
- **Universal Validation Workflow Extension**: Interactive validation now deployed across 4 procedural agents (RHC → TAVI, AngioPCI, mTEER)
  - All agents follow identical pattern: Whisper → Regex → Quick Model → Auto-Correct → Checkpoint → Reasoning Model
  - Agent-specific critical fields:
    - **TAVI**: Valve sizing (annulus diameter/perimeter/area), coronary heights (safety), access assessment
    - **AngioPCI**: Stent details (type/diameter/length for registry), TIMI flow (success assessment), lesion characteristics
    - **mTEER**: Pre/post MR grades (procedural success), clip details (device tracking), transmitral gradient (stenosis risk)
  - **Centralized validation configuration** (`validationFieldConfig.ts`): Single source of truth for field labels, placeholders, helper text across all agents
  - **Generic FieldValidationPrompt component**: Reusable validation modal with agent-specific configs; eliminates code duplication
  - **Type-safe validation system**: `ValidationResult`, `FieldCorrection`, `MissingField` types with agent-specific extracted data interfaces (`TAVIExtractedData`, `AngioPCIExtractedData`, `MTEERExtractedData`)
  - **Auto-apply high-confidence corrections** (≥0.8 threshold) across all agents; consistent UX for low-confidence suggestions
  - **Saves time & improves accuracy**: Prevents wasted 3-15min reasoning model runs; quick model validation (~10-30s) catches missing fields before generation
- **Comprehensive SystemPrompts updates**: Added `dataValidationPrompt` for TAVI, AngioPCI, mTEER with agent-specific critical field lists and confidence scoring guidance
- **Phase-based implementation**: Type definitions (Phase 1) → Agent methods (Phase 2) → Centralized config (Phase 3) → Integration (Phase 4)

**v3.28.0 (Nov 2025)**
- **RHC Interactive Validation Workflow**: Intelligent validation checkpoint prevents wasted reasoning model runs
  - Quick model (qwen/qwen3-4b-2507, ~10-30s) validates extracted data before expensive report generation
  - Auto-applies high-confidence corrections (≥0.8); shows modal for missing critical fields or low-confidence suggestions
  - User fills missing fields (height, weight, Hb, SaO2, SvO2) → reprocesses with validated data
  - Saves 3-15min wasted runs; efficient resource usage with lightweight validation before intensive generation
  - Three-section modal: Critical Missing (red), Low-Confidence Corrections (yellow), Optional Fields (blue)
- **Session Status Enhancements**: Added `'awaiting_validation'` and `'failed'` status types for better workflow state management
- **Lint Fixes**: Cleaned up unused imports and invalid ESLint disable comments

**v3.21.0 (Oct 2025)**
- **3D Interactive Lanyard Component**: Physics-based 3D lanyard replaces static "Ready to Record" screen
  - Built with Three.js, React Three Fiber, and Rapier physics engine
  - Interactive draggable ID card with realistic rope physics simulation
  - Lazy-loaded only when in idle state (~1MB gzipped, code-split into vendor-3d chunk)
  - Graceful fallbacks for missing 3D assets (placeholder geometry)
  - WebGL-accelerated 60fps rendering with full CSP compliance
- **Dot Grid Background Pattern**: Professional, subtle dot grid background for idle state (4 CSS variants)
- **Build System Enhancements**: Added .glb file support, automatic asset copying, TypeScript declarations for 3D assets

**v3.19.0 (Oct 2025)**
- **Circular Countdown Timer**: Large visual countdown timer with real-time ETA prediction
  - Custom lightweight SVG implementation (~2 kB) with pipeline stage color matching
  - Shows countdown time + current stage (e.g., "23.4s AI Analysis")
  - Responsive sizing: 240px desktop, 208px tablet, 160px mobile
  - Smooth 60fps animations with 500ms update interval
- **Intelligent ETA Prediction System**: Machine learning-based processing time estimation
  - Audio duration tracking: Calculates duration from recording blob using Web Audio API
  - ProcessingTimePredictor enhancements with audio duration as primary input factor
  - Records actual processing times after every completion (learning loop closed)
  - Adaptive velocity-based countdown blending initial prediction with real-time velocity
  - Precise decimal countdown with no rounding (e.g., "23.4s left", "2m 34.2s left")
  - Predictions improve over time: ±40% accuracy after 5 sessions, ±20% after 20+ sessions
- **RHC Major Enhancements**: Missing calculation fields identification, enhanced data extraction (fluoroscopy time/dose, contrast volume), comprehensive logging, post-processing pipeline
- **Pre-Op Plan Export System**: A5 card export with copy to clipboard and download functionality
- **New Components**: PatientContextHeader, UIPreferencesSection, CircularCountdownTimer, countdownCalculations utility
- **RecordPanel State Management**: Fixed hover state persistence bugs with defensive checks for stale refs

**v3.18.0 (Oct 2025)**
- **Bright Card Design System**: High-contrast card design inspired by macOS Big Sur
- **RHC Calculation Service**: Comprehensive haemodynamic calculations with reference ranges
- **Patient Education Improvements**: Enhanced system prompts and action plan generation
- **Session Management UI**: Storage management with visual indicators

**v3.9.2 (Feb 2025)**
- **Repository Cleanup**: Removed Synology Drive sync conflict files to maintain clean repository state

**v3.9.0 (Feb 2025)**
- **Recording Start Latency Optimizations**: Reduced recording start time from 2-8 seconds to 50-200ms (10-160x faster)
- **Background Patient Data Caching**: New `PatientDataCacheService` proactively extracts patient data in background with 60s TTL; <5ms cache lookup vs 1-7+ second blocking extraction
- **Audio Pipeline Pre-Warming**: `useRecorder` now requests microphone permission on load and keeps MediaStream/AudioContext alive (muted) between recordings for instant reuse
- **Performance Impact**: First recording ~200ms (vs 2-8s), subsequent recordings ~50ms; cache hit rate >90% in active sessions
- **Full Documentation**: See `RECORDING_LATENCY_OPTIMIZATIONS.md` for technical details and architecture

**v3.8.0 (Jan 2025)**
- **Beautiful PDF Export**: Replaced raw JSON PDF export with color-coded HTML cards categorized by topic (Exercise=Blue, Diet=Green, Alcohol=Purple, Weight=Orange, Smoking=Red, Mental Health=Teal) with numbered action items, reasons, and habit cues - matching inline display
- **Category Legend**: PDF includes visual legend for easy scanning of different recommendation types
- **Print-Optimized**: Page-break-aware styling ensures cards don't split across pages

**v3.7.1 (Jan 2025)**
- **Fixed "our" vs "or" Typo**: Added post-processing regex to fix common LLM error where "our" is used instead of "or" in conjunctions (e.g., "Monday our Thursday" → "Monday or Thursday")

**v3.7.0 (Jan 2025)**
- **Visual Action Plan Display**: Replaced unreadable raw JSON with beautiful color-coded priority cards showing numbered action items with impact levels (high=emerald, medium=blue), reasons, next actions, and habit cues
- **Fixed Processing Time Display**: Added `displayProcessingTime` to session state so "Generated in Xs" shows actual time instead of 0s for viewed sessions
- **Collapsible Raw JSON**: Moved technical JSON data behind expandable `<details>` section for developers while showing human-friendly UI by default

**v3.6.9 (Jan 2025)**
- **Fixed Elapsed Timer**: Added `setProcessingStartTime()` call when Patient Education starts so elapsed time counter runs properly instead of staying at 0s
- **Dynamic Progress Text**: Processing header now shows live pipeline progress details (e.g., "Generating education plan") instead of generic "Extracting patient data from EMR..." text
- **Realistic Progress Mapping**: Adjusted progress percentages (5% → 10% → 20% → 80% → 90% → 98% → 100%) to better reflect that LLM generation takes ~80% of total time, reducing perceived "stuck" time at 53%

**v3.6.8 (Jan 2025)**
- **Patient Education Live Progress Tracking**: Added simulated progress updates throughout agent processing (5%, 15%, 25%, 75%, 85%, 95%, 100%) with descriptive phase messages
- **ETA Calculation**: Added `agentType` and `transcriptionLength` props to UnifiedPipelineProgress for accurate time estimates based on historical performance data
- **Progress Bar Now Updates**: Fixed stuck 0% progress by implementing onProgress callbacks in PatientEducationAgent that report progress at key processing stages

**v3.6.7 (Jan 2025)**
- **Patient Education JSON Output Fix**: Fixed missing JSON metadata card in Patient Education results by adding `educationData` field to `AppState` interface and proper state management in useAppState/OptimizedApp
- **Two-Part Display**: Patient Education now correctly displays both the patient letter AND the structured JSON metadata with Export PDF functionality
- **State Flow**: `educationData` now properly flows from agent → AgentFactory → session → state → display, ensuring JSON box renders consistently

**v3.6.6 (Jan 2025)**
- **Session Timeline Progress Fix**: Updated SessionDropdown to use new `pipelineProgress` instead of old `processingProgress` system, eliminating redundant/misleading progress text in session timeline cards

**v3.6.5 (Jan 2025)**
- **Patient Education Unified Progress**: Added UnifiedPipelineProgress bar to Patient Education agent for consistent live progress tracking through AI Analysis → Generation phases
- **Fixed Redundant Progress Displays**: Removed misleading "Extracting patient data from EMR..." text during processing (EMR extraction happens before config modal)
- **Progress Callbacks**: Added onProgress callback to Patient Education agent processing for real-time pipeline updates

**v3.6.4 (Jan 2025)**
- **Investigation Summary Formatting Improvements**: Enhanced system prompts, ASR corrections, and post-processing to ensure precise medical formatting
  - Fixed measurement spacing: `LVEDD 59` not `LVEDD-59`, `EF 43` not `EF43`, `GLS -16` not `GLS-16`
  - Added severity abbreviations: `moderate` → `mod`, `moderately dilated` → `mod dil`
  - Improved parentheses placement: `dilated LV (LVEDD 59)` for measurements quantifying findings
  - Enhanced LLM instruction to preserve abbreviations (TTE, TOE, CTCA) without expansion
  - Added golden standard training example (ex002_tte_format.json) for DSPy optimization

**v3.6.3 (Jan 2025)**
- **Patient Education Session Tracking**: Patient Education generations now create proper sessions in the timeline, enabling review, history tracking, and consistent UX with all other agents

**v3.6.2 (Jan 2025)**
- **Patient Education JSON Parsing**: Fixed two-part response parsing to properly strip markdown code fences and separate JSON metadata from patient letter content

**v3.6.1 (Jan 2025)**
- (Previous patch release)

**v3.6.0 (Jan 2025)**
- **Unified Pipeline Progress**: Single segmented progress bar showing live updates through Audio Processing → Transcribing → AI Analysis → Generation; replaces `FieldIngestionOverlay` and `ProcessingPhaseIndicator` with real-time tracking, no more 0% stuck screens
- **Code Quality Excellence**: Achieved ZERO ESLint errors (479 errors eliminated across 141 files)
- **Developer Experience**: Enhanced ./dev script with real-time model loading feedback and Whisper server diagnostics
- **TAVI Workup Stability**: Fixed multiple display bugs including persistent "Processing Report" and "Loading Session" issues
- **Session Management**: Resolved race conditions and state management bugs affecting session display
- **UI Consistency**: Implemented consistent transcription UI across all processing states

**v3.5.0 (Sep 2025)**
- **TAVI Workup Critical Fixes**: Resolved HTTP 400 LM Studio errors, fixed Gemma prompt formatting
- **Enhanced TAVI Display**: Structured UI with interactive transcription controls (Skip/Accept/Edit)
- **Performance Optimizations**: Reduced console debug spam, improved error handling
- **Data Safety**: Added anti-hallucination guardrails and input validation for clinical accuracy

**v3.2.1 (Sep 2025)**
- **AudioProcessingQueueService** (priority, concurrency 2, retries, cleanup, metrics)
- **Full‑page Settings** (transcription management; expanded optimisation panel)
- **Design system**: monochrome, responsive

**v3.2.0 (Sep 2025)**
- **Intelligent Features**: Dynamic agent loading, cross-agent intelligence, smart recommendations, real-time progress, bundle splitting
- **DSPy/GEPA**: production‑ready, rubric, versioning, audit trails

**Earlier highlights**
- **11→14+ agents**, batch review, EMR enhancements, cancellation system, improved letter intelligence, SystemPrompts extraction, MLX Whisper integration

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
