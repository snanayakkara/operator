# CLAUDE.md — Development Context (Concise)

**Operator (Chrome side‑panel extension)** is a local‑first medical dictation + EMR helper.

- 14+ specialty **agents** (TAVI, Angio/PCI, mTEER, PFO, RHC, Quick Letter, Consultation, Investigation Summary, Aus Review, Background, Medication, Bloods, Imaging, Patient Education, Batch Review)
- **Transcription**: MLX Whisper (`whisper-large-v3-turbo`) at `http://localhost:8001`
- **Generation**: LM Studio at `http://localhost:1234` (MedGemma‑27B for complex; Gemma‑3n‑e4b for simple)
- **DSPy/GEPA** optimisation server at `http://localhost:8002`
- **Intelligent Features**: lazy agent loading, cross‑agent knowledge sharing, smart recommendations, real‑time progress tracking
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

---

## 2) Agents (Enhanced; DSPy‑optimised when available)

**Core procedures**: TAVI; Angiogram/PCI; mTEER; PFO Closure; Right Heart Cath
**Documentation & review**: Quick Letter; Consultation; Investigation Summary
**Specialised**: Aus Medical Review; Background; Medication; Bloods; Imaging; Patient Education; Batch Patient Review

Each agent has dedicated SystemPrompts, validation patterns, template structure, QA rules; Australian terminology.

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

### 10.3 Theme System
- **Light & Dark Modes**: Full theme support with system preference detection
- **Theme Manager** (`utils/themeSystem.ts`): Centralized theme management with CSS variable injection
- **Modes**: Light, Dark, System (auto-detects OS preference)
- **Persistence**: User preference saved to localStorage
- **ThemeToggle**: Compact toggle in header (Sun/Moon/Monitor icons)
- **Clinical Dark Mode**: Optimized for low-light environments while maintaining medical clarity

**Theme Colors**:
- All colors defined as CSS variables (e.g., `--color-bg-primary`, `--color-text-primary`)
- Tailwind classes use `var()` references for automatic theme switching
- State colors adapt across themes while maintaining visual hierarchy

### 10.4 Design Principle
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
    themeSystem.ts (light/dark theme manager with CSS variables)
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

**Current Version**: **3.6.6**
**Last Updated**: January 2025

---

## 15) Recent Major Updates (highlights)

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
