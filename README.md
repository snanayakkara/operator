# Operator

 [![Version](https://img.shields.io/badge/version-3.37.0-blue.svg)]()
[![Chrome Extension](https://img.shields.io/badge/chrome-extension-green.svg)]()
[![TypeScript](https://img.shields.io/badge/typescript-5.9.2-blue.svg)]()
[![React](https://img.shields.io/badge/react-18.2.0-blue.svg)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg)]()

A sophisticated **local-first medical AI dictation and EMR integration** Chrome extension that combines high-performance transcription with specialized medical agents for healthcare professionals.

> **Latest:** v3.37.0 adds image-to-investigation summaries with a vision OCR pipeline, Shortcut/mobile dictation intake with auto-triage, Rounds GP letter + Go To patient actions, streamlined quick actions (Dictate / Type / Image), and safer LM Studio vision defaults with richer progress telemetry.

## 🏥 Overview

Operator transforms medical documentation through **Advanced Intelligence** featuring:

- **🔒 Privacy-First Local AI** - Complete data privacy with MLX Whisper + LM Studio (no cloud calls)
- **🧠 14+ Specialized Medical Agents** - Interventional cardiology, diagnostics, documentation, and patient care
- **⚡ Intelligent Audio Processing Queue** - Priority-based concurrent processing with smart resource management
- **💾 Session Persistence** - Local storage with category-based organization and intelligent expiry management
- **🚀 Real-time Streaming** - Live token generation with progress tracking
- **🎯 Few-shot Learning** - DSPy/GEPA optimized prompts with clinical exemplars
- **🧩 DSPy by Default** - Auto-enables DSPy routing when the local optimizer is healthy, with seamless LM Studio fallback
- **📝 Smart ASR Corrections** - User phrasebook with medical terminology auto-correction
- **🏗️ Cross-agent Intelligence** - Shared patient context and clinical insights
- **⚙️ EMR Integration** - Seamless Xestro, Epic, and Cerner field detection
- **🖼️ Vision Intake** - Investigation Summary now ingests photos/screenshots via Qwen3-VL OCR with clinical extraction prompts
- **📱 Mobile + Shortcut Intake** - iOS Shortcuts/mac-daemon sidecar metadata triage routes mobile dictations into side panel workflows
- **🏥 Rounds Command Center** - Ward list, Quick Add intake parser, ward update diffing, GP letters, and HUD exports for handover

## 🎯 Key Features

### 🎤 Advanced Audio Processing
- **Intelligent Processing Queue** - Priority order: Quick Letter → TAVI/PCI → Consultation → Investigation Summary → Background
- **WebM/Opus Recording** with MediaRecorder API and voice activity detection
- **MLX Whisper Integration** - `whisper-large-v3-turbo` with ~50× real-time speed
- **Real-time Visualizer** - Live frequency analysis with voice activity indication
- **Smart Resource Management** - Configurable concurrency (default: 2 concurrent jobs)

### 🤖 Medical AI Agents (Enhanced)

#### Core Procedures
| Agent | Specialty | Features |
|-------|-----------|----------|
| **TAVI** | Interventional Cardiology | JSON-first structured output, Zod validation, sizing calculations |
| **Angiogram/PCI** | Interventional Cardiology | Vessel assessment, TIMI flow, stent deployment |
| **mTEER** | Structural Cardiology | MitraClip/PASCAL procedures, mitral valve repair |
| **PFO Closure** | Structural Cardiology | Device selection, deployment protocols |
| **Right Heart Cath** | Invasive Cardiology | Pulmonary hypertension evaluation, haemodynamics |
| **Pre-Op Plan** | Cath Lab Workflow | A5-ready pre-procedure cards plus structured JSON metadata for angiogram, RHC, TAVI, mTEER |

#### Documentation & Review
| Agent | Specialty | Features |
|-------|-----------|----------|
| **Quick Letter** | General | Few-shot learning with clinical exemplars, GEPA optimization |
| **Consultation** | General | Comprehensive patient assessments with structured reporting |
| **Investigation Summary** | Diagnostics | Echo/CT/MRI/stress test summarization |

#### Specialized Services
| Agent | Purpose | Features |
|-------|---------|----------|
| **Aus Medical Review** | Quality Assurance | Australian guideline compliance checking |
| **Background** | Patient History | Comprehensive medical history compilation |
| **Medication** | Pharmacy | Drug interactions, dosing, contraindications |
| **Bloods** | Laboratory | Lab result analysis with trend detection |
| **Lipid Profile Importer** | Laboratory | EMR capture with LDL/TChol charts, guideline overlays, clinical insights |
| **Imaging** | Radiology | Structured radiology report generation |
| **Patient Education** | Patient Care | Readable educational materials |
| **Batch Patient Review** | Population Health | Multi-patient analysis and insights |

### 🚀 Advanced Intelligence Features

#### Smart AI Processing
- **LazyAgentLoader** - Dynamic agent chunks (7-38KB), 0ms cached loads
- **CrossAgentIntelligence** - Patient profile building, drug interactions, clinical correlations
- **SmartRecommendationEngine** - Complexity assessment with agent suggestions and ETA
- **ProcessingIndicator** - Multi-phase progress with quality hints

#### Advanced Optimization
- **DSPy/GEPA Integration** - Genetic prompt advancement with 30-point medical rubric
- **Few-shot Learning** - Clinical exemplar integration for improved accuracy
- **Streaming Generation** - Real-time token display with cancellation support
- **ASR Corrections Pipeline** - Automatic medical terminology corrections

### 🏗️ Technical Architecture
- **Audio Processing Queue** - Intelligent job prioritization with retry logic
- **Session Isolation** - Concurrent recording support with race condition prevention
- **SystemPrompts Architecture** - Dedicated medical knowledge files per agent
- **Local-First Processing** - Zero cloud dependencies, complete privacy
- **Chrome Manifest V3** - Modern extension architecture with CSP compliance
- **React + TypeScript** - Type-safe UI development with performance optimization

## 🚀 Quick Start

### Prerequisites

- **Apple Silicon Mac** (M1/M2/M3/M4) recommended for MLX Whisper performance
- **16GB+ RAM** for optimal multi-model operation
- **Chrome Browser** with Developer mode enabled
- **Node.js 18+** and **Python 3.9+**

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd operator

# 2. Install Node.js dependencies
npm install

# 3. Set up MLX Whisper transcription server
pip install -r requirements-whisper.txt

# 4. Start the Whisper server (localhost:8001)
./start-whisper-server.sh

# 5. Set up LM Studio (localhost:1234)
# Download and install LM Studio
# Load MedGemma-27B (complex tasks) + Gemma-3n-e4b (simple tasks)
# Start server on localhost:1234

# 6. Optional: Start DSPy optimization server (localhost:8002)
npm run dspy:server:start

# 7. Build the extension
npm run build

# 8. Load extension in Chrome
# Navigate to chrome://extensions/
# Enable Developer mode
# Click "Load unpacked" and select the dist/ folder
```

### Verification

```bash
# Check MLX Whisper server
curl http://localhost:8001/v1/health

# Check LM Studio server
curl http://localhost:1234/v1/models

# Check DSPy server (optional)
curl http://localhost:8002/health

# Verify extension loading
# Look for "Operator" in Chrome extensions with active side panel
```

## 📖 Usage Guide

### Basic Workflow

1. **Open Side Panel** - Click extension icon or use keyboard shortcut
2. **Select Medical Workflow** - Choose from 14+ specialized agents
3. **Start Recording** - Voice activity detection begins automatically
4. **Natural Dictation** - Speak in clinical language, pauses handled intelligently
5. **Real-time Processing** - Watch live transcription and token generation
6. **Review & Insert** - Copy to clipboard or auto-insert into EMR fields

### Advanced Features

#### Intelligent Audio Queue
- **Priority Processing** - Critical procedures (TAVI, PCI) processed first
- **Concurrent Jobs** - Default 2 concurrent, configurable based on system resources
- **Queue Monitoring** - Real-time status with `QueueStatusDisplay` component
- **Smart Retry Logic** - Automatic retry with exponential backoff on failures

#### Few-Shot Learning (Quick Letter)
- **Clinical Exemplars** - Bundled real-world examples for context
- **GEPA Optimization** - Genetic prompt advancement with human feedback
- **Performance Tracking** - Baseline scores with continuous improvement

#### ASR Corrections Pipeline
- **Medical Phrasebook** - User-customizable medical terminology corrections
- **Auto-application** - Corrections applied automatically during transcription
- **Confidence Scoring** - Quality metrics for correction reliability

#### Cross-Agent Intelligence
- **Patient Profiling** - Shared clinical context across all agents
- **Drug Interactions** - Medication conflict detection across sessions
- **Clinical Correlations** - Pattern recognition across multiple encounters

#### Session Persistence & Organization
- **Local Storage** - Sessions automatically persist to `chrome.storage.local` when completed
- **Smart Expiry** - 7-day retention for unchecked sessions, 24-hour for checked sessions
- **Category-Based Organization** - Visual color coding by agent type:
  - **Letters** (Blue) - Quick Letter, Consultation, Patient Education
  - **Clinical Data** (Emerald) - Background, Investigation Summary, Medication, Bloods, Imaging
  - **Procedures** (Purple) - TAVI, PCI, mTEER, RHC, PFO, procedural reports
  - **AI Review** (Amber) - AI Medical Review, Batch Review, Australian Review
- **Storage Management** - Color-coded usage indicator with bulk delete operations
- **Hard Drive Icon** - Visual indicator for locally-stored sessions
- **Background Cleanup** - Hourly auto-deletion of expired sessions
- **Auto-Pruning** - Intelligent quota management at 90% storage usage

### Keyboard Shortcuts
- `Cmd+Shift+R` (Mac) / `Ctrl+Shift+R` (Win): Toggle recording
- `Cmd+Shift+M` (Mac) / `Ctrl+Shift+M` (Win): Open side panel
- `Cmd+Shift+T` (Mac) / `Ctrl+Shift+T` (Win): Quick transcription

## 🏗️ Architecture Deep Dive

### Service Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Chrome        │    │   MLX Whisper    │    │   LM Studio     │    │   DSPy Server   │
│   Extension     │◄──►│   Server         │    │   MedGemma-27B  │    │   GEPA Optim    │
│   (React UI)    │    │   :8001          │    │   :1234         │    │   :8002         │
└─────────────────┘    └──────────────────┘    └─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐
│   EMR Systems   │
│   Xestro/Epic   │
└─────────────────┘
```

### Processing Pipeline

```
Audio Recording → Intelligent Queue → MLX Whisper → Agent Selection → Model Processing → Report Generation
     ↓               ↓                   ↓              ↓               ↓                 ↓
   WebM/Opus      Priority-based      Transcription   Direct User    LM Studio        Formatted Output
   MediaRecorder   Concurrency=2      (50x RT)       Selection      MedGemma-27B     Australian English
                   Smart Retries       Medical ASR    LazyLoading    Streaming        JSON Validation
```

### Advanced Intelligence Components

```typescript
// Lazy Agent Loading
const agent = await LazyAgentLoader.loadAgent('tavi');  // 0ms if cached, ~2s first load

// Cross-Agent Intelligence
const insights = await CrossAgentIntelligence.getPatientInsights(patientId);

// Smart Recommendations
const recommendation = SmartRecommendationEngine.suggestAgent(transcription);
// Returns: { agent: 'quick-letter', confidence: 0.89, estimatedTime: '3-5s' }

// DSPy Optimization
await DSPyService.optimizePrompt('quick-letter', feedbackData);
```

## 🧪 Testing & Quality Assurance

### Comprehensive Test Coverage

```bash
# Full E2E test suite (14 test files)
npm run test:e2e

# Specific feature testing
npm run test:e2e -- tests/e2e/14-phrasebook-integration.spec.ts
npm run test:e2e -- tests/e2e/15-quick-letter-exemplars.spec.ts
npm run test:e2e -- tests/e2e/16-tavi-json-validation.spec.ts

# DSPy optimization testing
npm run eval:quick-letter     # Evaluate Quick Letter performance
npm run optim:quick-letter    # Optimize prompts with GEPA
```

### Test Categories
- **Extension Loading & Permissions** - Manifest validation, service worker
- **Audio Processing Queue** - Priority handling, concurrency, error recovery
- **Transcription Integration** - MLX Whisper server, medical terminology
- **Agent Processing** - All 14+ agents with clinical accuracy validation
- **UI Components** - React component testing, state management
- **Performance Benchmarks** - Processing times, memory usage, queue efficiency
- **Integration Testing** - Full workflows with EMR field detection

### Quality Metrics (DSPy Baseline Scores)
- Investigation Summary: **90/100** (100% success rate)
- Consultation: **86/100** (100% success rate)
- Quick Letter: **66.7/100** (33% success rate → optimization target)
- Angiogram-PCI: **58/100** (0% success rate → needs structure)
- TAVI: **5/100** (0% success rate → requires JSON validation)

## 🎯 Medical Agents Deep Dive

### TAVI Agent (Enhanced v3.3.0)
**Features**: JSON-first structured output with Zod validation
```typescript
interface TAVIReportData {
  ctAnnulus: {
    area_mm2: number | null;
    perimeter_mm: number | null;
    min_d_mm: number | null;
    max_d_mm: number | null;
  };
  procedure: {
    approach: 'transfemoral' | 'transapical' | 'other' | null;
    valve_type: string | null;
    valve_size: number | null;
  };
  // ... complete medical data structure
  missingFields: string[];  // Validation tracking
}
```

### Quick Letter Agent (Few-shot Enhanced)
**Features**: Clinical exemplar integration with GEPA optimization
```typescript
// Bundled exemplars for Chrome extension compatibility
const exemplars = [
  {
    input: "Patient referred for palpitations...",
    target: "Thank you for referring John...",
    tags: ["palpitations", "cardiology", "investigation"]
  }
  // ... 3 complete clinical exemplars
];
```

### Investigation Summary Agent
**Features**: Multi-modal test result processing
- Echo/CT/MRI/stress test analysis
- Structured reporting with clinical correlations
- Australian guideline compliance
- Integration with radiology systems

## 🔧 Configuration & Customization

### AI Models Configuration

#### Recommended Setup
```bash
# Transcription (Required)
MLX Whisper: whisper-large-v3-turbo  # ~/.cache/lm-studio/models/mlx-community/

# Generation Models (LM Studio localhost:1234)
Complex Tasks: MedGemma-27B-MLX        # TAVI, PCI, Consultation, Investigation Summary
Simple Tasks: Gemma-3n-e4b            # Background, Medication, Quick responses
Vision/OCR: qwen3-vl-8b-instruct-mlx  # Investigation photos, BP diary images

# Optional: DSPy Optimization
DSPy Server: localhost:8002           # Prompt optimization and evaluation
```

#### Performance Tuning (Apple Silicon)
- **Transcription**: ~50× real-time (warm), 30-60s cold load
- **Generation**: 1-3s simple / 3-8s complex
- **Memory Usage**: ~200MB extension + ~8GB models
- **Queue Concurrency**: 2 default (configurable)

### User Customization

#### Phrasebook Settings (ASR Corrections)
```typescript
// Access via Options page
interface PhrasebookEntry {
  original: string;      // "amyladine"
  corrected: string;     // "amlodipine"
  confidence: number;    // 0.95
  category: MedicalCategory;
}
```

#### Queue Configuration
```typescript
// Configurable via settings
interface QueueSettings {
  maxConcurrent: number;    // Default: 2
  maxQueueSize: number;     // Default: 10
  retryAttempts: number;    // Default: 3
  priorityOrder: AgentType[]; // Quick Letter → TAVI → PCI → ...
}
```

## 🏥 EMR Integration

### Supported Systems
- **Xestro**: Full integration with native field detection and auto-insertion
- **Epic**: Basic support with common field patterns and clipboard integration
- **Cerner**: Basic support with documentation areas and quick actions
- **Allscripts**: Basic support with note fields and task creation

### EMR Features
- **Auto-field Detection** - Intelligent recognition of active EMR fields
- **One-click Insertion** - Direct report insertion with formatting preservation
- **Clipboard Integration** - Universal copy/paste for any EMR system
- **Field Navigation** - Quick access to common documentation sections
- **Content Validation** - Medical content verification before insertion

### Field Automation Support
```typescript
interface EMRFieldMapping {
  // Investigation fields
  echoFindings: string;
  ctResults: string;
  labResults: string;

  // Documentation
  clinicalNotes: string;
  procedures: string;
  medications: string;

  // Administrative
  quickLetters: string;
  appointments: string;
  tasks: string;
}
```

## 🛠 Development

### Project Structure
```
operator/
├── src/
│   ├── agents/                    # Medical AI agents
│   │   ├── base/                 # Base agent framework
│   │   ├── specialized/          # 14+ medical agents + SystemPrompts
│   │   └── router/              # Agent selection and routing
│   ├── services/                 # Core services
│   │   ├── AudioProcessingQueueService.ts  # Intelligent job queue
│   │   ├── LazyAgentLoader.ts              # Dynamic agent loading
│   │   ├── CrossAgentIntelligence.ts       # Patient context sharing
│   │   ├── LMStudioService.ts              # AI model integration
│   │   └── TranscriptionService.ts         # MLX Whisper integration
│   ├── sidepanel/               # Main UI components
│   │   ├── components/          # React components + results panels
│   │   └── OptimizedApp.tsx     # Main app with session management
│   ├── hooks/                   # React hooks
│   │   ├── useAppState.ts       # Centralized state management
│   │   ├── useRecorder.ts       # Audio recording logic
│   │   └── useAIProcessing.ts   # AI processing workflows
│   ├── content/                 # EMR integration
│   │   └── content-script.ts    # Field detection and insertion
│   ├── background/              # Service worker
│   └── types/                   # TypeScript definitions
├── llm/                         # DSPy optimization
│   ├── prompts/                 # Structured prompts by agent
│   ├── evaluate.py              # Performance evaluation
│   └── optim_gepa.py           # Genetic prompt advancement
├── tests/e2e/                   # Playwright E2E tests (14 files)
├── whisper-server.py            # MLX Whisper transcription server
└── dist/                        # Built extension
```

### Development Commands

```bash
# Development workflow
npm run dev                      # Development build with hot reload
npm run build                    # Production build
npm run build-with-types         # Build with comprehensive type checking
npm run validate:production      # Production validation suite
npm run validate:full            # Complete validation (slow)

# Type checking and linting
npm run type-check              # TypeScript validation
npm run lint                    # ESLint code quality
npm run test:e2e                # Playwright E2E tests

# MLX Whisper server
pip install -r requirements-whisper.txt
./start-whisper-server.sh       # Start transcription server
python3 whisper-server.py      # Direct server start

# DSPy/GEPA optimization
npm run dspy:server:start       # Start optimization server
npm run dspy:server:health      # Check server status
npm run eval:quick-letter       # Evaluate agent performance
npm run optim:quick-letter      # Optimize prompts with GEPA
```

### Adding New Medical Agents

#### 1. Create Agent Class
```typescript
// src/agents/specialized/NewAgent.ts
import { MedicalAgent } from '../base/MedicalAgent';
import { NewSystemPrompts } from './NewSystemPrompts';

export class NewAgent extends MedicalAgent {
  constructor() {
    super(
      'New Agent',
      'Medical Specialty',
      'Specific use case',
      'new-agent',
      NewSystemPrompts.primaryPrompt
    );
  }

  protected async process(input: string): Promise<MedicalReport> {
    // Implementation specific to your medical specialty
  }
}
```

#### 2. Create SystemPrompts File
```typescript
// src/agents/specialized/NewSystemPrompts.ts
export const NewSystemPrompts = {
  primaryPrompt: `You are a specialist in...`,
  medicalKnowledge: `Clinical guidelines and evidence...`,
  validationPatterns: [...],
  templateStructure: `Report format...`,
  qaRules: [...]
};
```

#### 3. Register in AgentFactory
```typescript
// src/services/AgentFactory.ts
case 'new-agent':
  const { NewAgent } = await import('@/agents/specialized/NewAgent');
  return new NewAgent();
```

#### 4. Update Types
```typescript
// src/types/medical.types.ts
export type AgentType =
  | 'tavi'
  | 'angiogram-pci'
  | 'new-agent'  // Add your new agent
  | ...
```

### EMR Integration Development

#### Add New EMR System Support
```typescript
// src/content/content-script.ts
interface EMRConfig {
  name: string;
  fieldSelectors: {
    clinicalNotes: string;
    procedures: string;
    // ... field mappings
  };
  navigationPatterns: {
    tabSelectors: string[];
    sectionHeaders: string[];
  };
  insertionMethods: ('direct' | 'clipboard' | 'keystrokes')[];
}

const emrConfigs: EMRConfig[] = [
  {
    name: 'NewEMRSystem',
    fieldSelectors: {
      clinicalNotes: 'textarea[data-field="clinical-notes"]',
      // ... system-specific selectors
    },
    // ... configuration
  }
];
```

## 📊 Performance & Monitoring

### System Performance (Apple Silicon M-Series)

#### Processing Times
- **Audio Recording**: Real-time with MediaRecorder WebM/Opus
- **Transcription**: ~50× real-time (MLX Whisper warm), 30-60s cold start
- **AI Generation**: 1-3s (simple agents) / 3-8s (complex procedures)
- **Queue Processing**: 2 concurrent jobs default, priority-based scheduling
- **Agent Loading**: 0ms cached / ~2s first load per agent

#### Memory Usage
- **Extension Runtime**: ~200MB
- **MLX Whisper**: ~2GB VRAM
- **LM Studio Models**: ~6-8GB VRAM (MedGemma-27B + Gemma-3n-e4b)
- **Total System**: 16GB RAM recommended for optimal performance

#### Batch Processing Capabilities
- **Patient Volume**: 5-15 patients/minute (data complexity dependent)
- **Queue Throughput**: Configurable concurrency with smart resource management
- **Error Recovery**: Automatic retry with exponential backoff

### Quality Metrics

#### DSPy/GEPA Evaluation Scores
```bash
# Current baseline performance (30-point medical rubric)
Investigation Summary: 90/100 (100% success)  # Production ready
Consultation: 86/100 (100% success)          # Production ready
Quick Letter: 66.7/100 (33% success)         # Optimization target
Angiogram-PCI: 58/100 (0% success)          # Needs structure improvement
TAVI: 5/100 (0% success)                    # Requires JSON validation
```

#### Performance Monitoring
```typescript
interface PerformanceMetrics {
  processingTime: number;      // End-to-end latency
  transcriptionAccuracy: number; // ASR quality score
  medicalTerminologyScore: number; // Clinical accuracy
  userSatisfactionRating: number; // Feedback score
  systemResourceUsage: ResourceUsage;
}
```

## 🔒 Security & Privacy

### Local-First Architecture
- **Zero Cloud Calls** - All AI processing on localhost (ports 1234, 8001, 8002)
- **No Data Transmission** - Audio and medical content never leave your machine
- **CSP Compliance** - Strict Content Security Policy with minimal external connections
- **Audit Trails** - Complete logging of all data processing operations

### Medical Data Protection
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; connect-src 'self' http://localhost:1234 http://localhost:8001 http://localhost:8002;"
  }
}
```

### Data Hygiene
- **Temporary Storage** - Audio files cleaned up after processing
- **Session Isolation** - Patient data segregated by session ID
- **Memory Management** - Automatic cleanup of processed transcriptions
- **Local Encryption** - Chrome storage.local with encryption at rest

## 🚀 Recent Updates

### v3.37.0 (November 2025) — Vision Intake & Mobile Triage
- **Image → Investigation Summary**: Drag-and-drop modal for investigation photos/screenshots (TTE/CTCA/ECG/etc.) with Qwen3-VL OCR, date/type metadata, and clinician-voice extraction prompts.
- **Quick Actions overhaul**: Dictate / Type / Image paths for Investigation Summary, collapsible 5-column grid, full-panel Appointment Wrap-Up builder, new PipelineStrip/Tag/MicroMeter UI primitives, and simplified monochrome visualizer.
- **Mobile + Shortcut ingestion**: macOS daemon now ingests Shortcut sidecars (workflow codes, geolocation, timestamps), runs triage pipelines, and surfaces jobs in a grouped modal with previews, confidence chips, keyboard shortcuts, and agent recommendations.
- **Rounds upgrades**: Go To patient from rounds, one-click GP discharge letter generation from ward data, selective handover compilation, undoable ward updates, and discharge/reopen toggles.
- **Model safety & telemetry**: LM Studio service exposes default OCR model helper, vision diagnostics, better Whisper timeout messaging, formatting progress state, and refreshed ASR correction seeds.

### v3.36.0 (November 2025) — Rounds Launch
- Local ward list with issues/investigations/tasks, Quick Add intake parser, ward dictation-to-diff pipeline with undo, global task board, handover generator, GP discharge letters, and HUD JSON export.
- Ward update dictation now uses shared recorder + Whisper pipeline with diff preview and undo before applying.

### v3.35.0 (November 2025) — Mobile Dictation UX
- Fixed mobile Quick Letter dual-card display and summary population, redesigned mobile dictation modal (collapsible transcript, metadata row, category grouping, smart defaults, keyboard shortcuts), and added accessibility + iconography polish.

### v3.34.0 (November 2025) — Unified Status Badges
- Centralized status badge system and color mappings across patient headers, transcription status, warnings, and server indicators with shared `stateColors.ts` and consolidated badge components.

## 🤝 Contributing

### Development Guidelines
1. **Fork and branch** - Create feature branches from main
2. **Medical accuracy first** - All clinical content must be evidence-based
3. **Privacy by design** - Ensure all processing remains local-first
4. **Comprehensive testing** - Add E2E tests for new features
5. **Documentation** - Update README and CLAUDE.md for significant changes

### Medical Content Standards
- **Australian Spelling** - Consistent use of Australian English medical terminology
- **SystemPrompts Architecture** - All agents must use dedicated SystemPrompts files
- **Clinical Validation** - Test with real medical scenarios and validate against standards
- **Evidence-based Content** - Reference current medical guidelines and literature

### Code Quality Requirements
```bash
# Before submitting PR
npm run lint                    # Code quality checks
npm run type-check             # TypeScript validation
npm run test:e2e               # Full E2E test suite
npm run validate:production    # Production readiness check
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **MLX Community** - High-performance Apple Silicon transcription models
- **LM Studio** - Local AI model serving platform with medical model support
- **DSPy Framework** - Advanced prompt optimization and evaluation
- **Chrome Extension APIs** - Manifest V3 framework and side panel integration
- **React & TypeScript** - Modern web development stack with type safety
- **Medical AI Community** - Clinical validation and evidence-based development

---

**Version**: 3.37.0 | **Updated**: November 2025 | **Architecture**: Advanced Intelligence with Local-First Medical AI + Vision Intake

For detailed development information, see [CLAUDE.md](CLAUDE.md)

## ⚠️ Medical Disclaimer

This software is designed to assist healthcare professionals with medical documentation and should not be used as a substitute for professional medical judgment. All AI-generated content must be reviewed for accuracy before use in patient care. The software is provided "as is" without warranty of any kind.

Users are responsible for ensuring compliance with local healthcare regulations, patient privacy laws (HIPAA, GDPR, etc.), and institutional policies regarding AI-assisted documentation.

---

Built with ❤️ for healthcare professionals | **Privacy-First • Local-Only • Evidence-Based**
