# CLAUDE.md — Development Context (Concise)

**Operator (Chrome side‑panel extension)** is a local‑first medical dictation + EMR helper.

- 14+ specialty **agents** (TAVI, Angio/PCI, mTEER, PFO, RHC, Quick Letter, Consultation, Investigation Summary, Aus Review, Background, Medication, Bloods, Imaging, Patient Education, Batch Review)
- **Transcription**: MLX Whisper (`whisper-large-v3-turbo`) at `http://localhost:8001`
- **Generation**: LM Studio at `http://localhost:1234` (MedGemma‑27B for complex; Gemma‑3n‑e4b for simple)
- **DSPy/GEPA** optimisation server at `http://localhost:8002`
- **Phase 4 intelligence**: lazy loading, cross‑agent knowledge, smart recommendations, real‑time progress
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
- **LM Studio**: MedGemma‑27B MLX (complex) + Gemma‑3n‑e4b (simple)
- **DSPy + GEPA**: prompt optimisation with 30‑point medical rubric (local eval; versioning; audit trails)
- **Side panel UX**: LiveAudioVisualizer + compact RecordingPromptCard; OptimizedResultsPanel shows progress & results; Options page for management

---

## 2) Agents (Phase 3 enhanced; DSPy‑optimised when available)

**Core procedures**: TAVI; Angiogram/PCI; mTEER; PFO Closure; Right Heart Cath  
**Documentation & review**: Quick Letter; Consultation; Investigation Summary  
**Specialised**: Aus Medical Review; Background; Medication; Bloods; Imaging; Patient Education; Batch Patient Review

Each agent has dedicated SystemPrompts, validation patterns, template structure, QA rules; Australian terminology.

---

## 3) Phase 4 Intelligence
- **LazyAgentLoader**: dynamic agent chunks (~7–38 KB); 0 ms cached, ~2 s first load; cache stats; preloads popular agents
- **CrossAgentIntelligence**: builds patient profile; shares insights (drug interactions, correlations) between agents
- **SmartRecommendationEngine**: complexity assessment + agent suggestions (confidence & ETA)
- **Phase3ProcessingIndicator**: multi‑phase progress with quality hints

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
- **Transcription**: ~50× real‑time (warm); 30–60 s cold load
- **Queue**: concurrency=2; priority‑aware
- **Generation**: 1–3 s simple; 3–8 s complex
- **Lazy loads**: 0 ms cached; ~2 s first load
- **Batch**: 5–15 patients/min (data‑dependent)
- **Memory**: ~200 MB extension + ~8 GB models

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

## 10) UI Design (Monochrome)
- Clean, clinical, minimal; colour reserved for success/warn/error/active
- Components: primary/secondary/icon buttons; stat/content/blueprint cards; clear typography

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
  sidepanel/ (OptimizedApp + components/results/*)
  hooks/ (useRecorder, useModelStatus, useAIProcessing, useAppState)
  config/ (workflowConfig, appointmentPresets, recordingPrompts)
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

**Current Version**: **3.2.1**  
**Last Updated**: September 2025

---

## 15) Recent Major Updates (highlights)

**v3.2.1 (Sep 2025)**  
- **AudioProcessingQueueService** (priority, concurrency 2, retries, cleanup, metrics)  
- **Full‑page Settings** (transcription management; expanded optimisation panel)  
- **Design system**: monochrome, responsive

**v3.2.0 (Sep 2025)**  
- **Phase 4**: LazyAgentLoader, CrossAgentIntelligence, SmartRecommendationEngine, Phase3ProcessingIndicator, bundle splitting  
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

**Focus**: local‑first medical AI with intelligent queuing, dynamic agent loading, DSPy‑optimised prompts, human‑in‑the‑loop QA, and cross‑agent intelligence.
# CLAUDE.md — Development Context (Concise)

**Operator Chrome Extension** — a local‑first medical dictation + EMR helper for clinicians.  
- 14+ specialty **agents**, **MLX Whisper** transcription, **LM Studio** generation, **DSPy/GEPA** optimisation, and **Phase 4 intelligence** (lazy loading, cross‑agent learning, smart recommendations).  
- Australian guideline compliance, privacy‑first (localhost: 1234 = LM Studio, 8001 = Whisper, 8002 = DSPy).

---

## 1) Architecture Overview

### 1.1 Audio & Queue
- **Recording**: WebM/Opus via MediaRecorder.
- **Transcription**: local MLX Whisper `whisper-large-v3-turbo` (Py server).
- **Intelligent Queue**: priority order **Quick Letter → TAVI/PCI → Consultation → Investigation Summary → Background** with configurable concurrency (default 2), retries, and cleanup.
- **Status**: queue metrics + UI `QueueStatusDisplay`.

```ts
// AudioProcessingQueueService (essentials)
addJob(sessionId, audioBlob, agentType, { onProgress, onComplete, onError })
getQueueStats()  // queued, processing, completed, failed
updateConcurrencySettings(maxConcurrent, maxQueueSize?)
```

**Benefits**: avoids overload, keeps UI responsive, prioritises critical work.

### 1.2 AI Processing Stack
- **Transcription**: MLX Whisper (localhost:8001).  
- **Generation**: MedGemma‑27B MLX (complex) + Gemma‑3n‑e4b (simple).  
- **DSPy + GEPA**: prompt optimisation with a 30‑point rubric and human‑in‑the‑loop.  
- **SystemPrompts** per agent; Australian spelling/terminology.
- **Phase 4**: LazyAgentLoader, CrossAgentIntelligence, SmartRecommendationEngine, Phase3ProcessingIndicator.

---

## 2) Medical Agents (Phase 3 enhanced, DSPy‑optimised)

**Core procedures**  
1. **TAVI** — sizing, haemodynamics, pre/post steps.  
2. **Angiogram/PCI** — vessel assessment, TIMI, outcomes.  
3. **mTEER** — Mitral TEER (MitraClip/PASCAL).  
4. **PFO Closure** — device selection & deployment.  
5. **Right Heart Cath** — PH evaluation, outputs.

**Documentation & review**  
6. **Quick Letter** — clinical letters & summaries.  
7. **Consultation** — full assessment + plan.  
8. **Investigation Summary** — Echo/CT/MRI/stress.

**Specialised**  
9. **Aus Medical Review** — guideline compliance.  
10. **Background** — history/comorbidities.  
11. **Medication** — review & interactions.  
12. **Bloods** — labs + trends/flags.  
13. **Imaging** — structured reports.  
14. **Patient Education** — readable materials.  
15. **Batch Patient Review** — population view.

**SystemPrompts contents**: primary system prompt, medical knowledge, validation patterns, templates, QA rules.

---

## 3) Phase 4 Intelligence (high level)

- **LazyAgentLoader**: dynamic agent chunks (7–38 KB), 0 ms cached loads, ~2 s cold loads, cache metrics & preloading (Quick Letter/Consultation).  
- **CrossAgentIntelligence**: patient profile, drug interactions, clinical correlations, shared insights.  
- **SmartRecommendationEngine**: complexity assessment + agent suggestions w/ confidence & ETA.  
- **Phase3ProcessingIndicator**: multi‑phase progress with quality hints.

---

## 4) DSPy + GEPA Optimisation (production‑ready)

**Capabilities**
- Genetic prompt advancement; local eval with rubric; versioned prompts; audit trails.  
- Human feedback forms in `eval/feedback/`.  
- Secure (localhost‑only).

**Benchmarks (baseline)**  
- investigation‑summary: score 90 (100% success)  
- consultation: 86 (100%)  
- quick‑letter: 66.7 (33%) → optimisation target  
- angiogram‑pci: 58 (0%)  
- tavi: 5 (0%) → needs structure + validation

**Key commands**
```bash
npm run eval:quick-letter
npm run optim:quick-letter
npm run dspy:server:start   # localhost:8002
npm run dspy:server:logs
```

---

## 5) Unified Recording Interface (side panel)

- Consistent stacked layout: **LiveAudioVisualizer** + **RecordingPromptCard** (compact).  
- Entry points: procedure workflows (TAVI/PCI/etc.) + quick actions (Investigation Summary, Background, Medication).  
- Recording prompts per agent; narrow‑panel optimised.

---

## 6) EMR Integration

- Target: **Xestro** (deep), with basic Epic/Cerner fallbacks.  
- Content script handles field detection, section navigation, and quick actions.  
- Auto‑insert and clipboard helpers; selector resilience planned via future “Field‑Mapper GUI”.

---

## 7) Testing & Quality

- **Playwright E2E** suites cover: extension load, recording, model integration, full workflows, performance, UI, batch, and error cases.  
- **Mocks & helpers**: `LMStudioMock`, `ExtensionTestHelper`, `MedicalReportValidator`.  
- **DSPy evals**: golden datasets; nightly/regression‑style runs (recommended).

---

## 8) Error Handling & Monitoring

- **ServiceMonitor** for LM Studio/Whisper health; latency tracking; auto‑restart scripts (Whisper).  
- Clear user guidance for common failures (timeouts/ports).  
- **PerformanceMonitoringService** for agent SLOs & trends (planned dashboard).

---

## 9) Performance (Apple Silicon)

- **Transcription**: ~50× real‑time (warm); 30–60 s cold load.  
- **Queue**: 2 concurrent by default; priority‑aware.  
- **Generation**: 1–3 s (simple) / 3–8 s (complex).  
- **Lazy loads**: 0 ms cached, ~2 s first load.  
- **Batch**: 5–15 patients/min (data‑dependent).  
- **Memory**: ~200 MB extension + ~8 GB models.

---

## 10) Security & Privacy

- **Local‑first**: no cloud calls; ports 1234/8001/8002 only.  
- **Audit trails** for prompt changes; human review required for clinical prompt deltas.  
- **Data hygiene**: temp storage, cleanup, and CSP:

```json
"content_security_policy": {
  "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; connect-src 'self' http://localhost:1234 http://localhost:8001 http://localhost:8002;"
}
```

---

## 11) UI Design (monochrome)

- Clean, clinical, minimal. Colour only for **success/warn/error/active**.  
- Precise borders, subtle shadows, generous spacing.  
- Components: primary/secondary/icon buttons; stat/content/blueprint cards; clear typography scale.

---

## 12) Base Agent Pattern (essentials)

```ts
abstract class MedicalAgent {
  process(input: string, ctx?: MedicalContext): Promise<MedicalReport>
  protected buildMessages(input: string, ctx?: MedicalContext): ChatMessage[]
  protected parseResponse(response: string): ReportSection[]
  protected extractMedicalTerms(text: string): string[]  // preserves qualitative grades, TIMI, units, EF
}
```

**Direct workflow selection**: user picks agent; no classifier required.

---

## 13) Project Structure (high‑signal)

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
  sidepanel/ (OptimizedApp + components/results/*)
  hooks/ (useRecorder, useModelStatus, useAIProcessing, useAppState)
  config/ (workflowConfig, appointmentPresets, recordingPrompts)
  types/ (medical.types.ts, optimization.ts, BatchProcessingTypes.ts)
llm/ (DSPy server + prompts); eval/ (datasets + feedback); tests/e2e/*; whisper-server.py
```

---

## 14) Recent Major Updates (highlights)

**v3.2.1 (Sep 2025)**  
- **AudioProcessingQueueService** (priority, concurrency 2, retries, cleanup, metrics).  
- **Full‑page Settings**: transcription management UI; expanded optimisation panel; corrected “Open Settings”.  
- **Design system**: monochrome, responsive.

**v3.2.0 (Sep 2025)**  
- **Phase 4**: LazyAgentLoader, CrossAgentIntelligence, SmartRecommendationEngine, Phase3ProcessingIndicator, bundle splitting.  
- **DSPy/GEPA**: production‑ready, rubric, versioning, audit trails.

**Earlier highlights**  
- **11→14+ agents**, batch review, EMR enhancements, cancellation system, improved letter intelligence, SystemPrompts extraction, MLX Whisper integration.

---

## 15) Development Workflow & Commands (essentials)

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

## 16) Deployment

1) Install deps; start Whisper (8001) and LM Studio (1234); optional DSPy (8002).  
2) `npm run build`; load `dist/` as unpacked extension.  
3) Validate with `validate:production` and a quick E2E smoke.

---

## 17) Versioning

- Patch = fixes/tweaks; Minor = new features/UX; Major = breaking/architecture.  
- **Update both** `package.json` and `manifest.json` for significant changes.

**Current Version**: **3.2.1**  
**Last Updated**: September 2025

**Focus**: local‑first medical AI with intelligent queuing, dynamic agent loading, DSPy‑optimised prompts, human‑in‑the‑loop QA, and real‑time cross‑agent intelligence.
