# Operator

[![Version](https://img.shields.io/badge/version-3.0.3-blue.svg)]()
[![Chrome Extension](https://img.shields.io/badge/chrome-extension-green.svg)]()
[![TypeScript](https://img.shields.io/badge/typescript-5.9.2-blue.svg)]()
[![React](https://img.shields.io/badge/react-18.2.0-blue.svg)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg)]()

A sophisticated **medical AI dictation and EMR integration** Chrome extension that combines high-performance local transcription with specialized medical agents for healthcare professionals.

## 🏥 Overview

Operator transforms medical documentation by providing:

- **Local AI Processing** - Complete privacy with MLX Whisper + agent-specific models
- **Specialized Medical Agents** - 11 medical specialty agents with clinical accuracy
- **Real-time Transcription** - ~50x real-time speed on Apple Silicon
- **EMR Integration** - Seamless Xestro field detection and auto-insertion
- **Direct Workflow Selection** - No classification delays, instant workflow activation
- **Comprehensive Cancellation** - Stop and restart workflows at any processing phase
- **Optimized UI Workflow** - Consolidated interface with embedded transcription views

## 🎯 Key Features

### 🎤 Advanced Audio Processing
- **WebM/Opus Recording** using Chrome MediaRecorder API
- **MLX Whisper Integration** with `whisper-large-v3-turbo` model
- **Voice Activity Detection** with real-time frequency visualization
- **Medical Terminology Correction** with healthcare-specific patterns

### 🤖 Medical AI Agents

| Agent | Specialty | Purpose |
|-------|-----------|---------|
| **TAVI Agent** | Interventional Cardiology | TAVI/TAVR procedures with hemodynamic analysis |
| **PCI Agent** | Interventional Cardiology | Percutaneous coronary interventions |
| **Angiogram Agent** | Cardiac Catheterization | Coronary angiography and diagnostic imaging |
| **Quick Letter Agent** | General | Medical correspondence and consultation letters |
| **Consultation Agent** | General | Comprehensive patient assessments |
| **Investigation Summary Agent** | Diagnostics | Test result summarization (Echo, CT, MRI) |

### 🔄 Advanced Workflow Features
- **Agent-Specific Models** - Investigation Summary uses lightweight google/gemma-3n-e4b, others use MedGemma-27b-it
- **Comprehensive Cancellation** - Cancel operations during recording, transcription, or processing phases
- **Smart Letter Intelligence** - Pattern-based summary generation with diagnosis and procedure detection
- **Optimized UI Space** - Consolidated reprocessing controls and embedded transcription views
- **Integrated Warnings** - Content alerts displayed within letter cards for better context

### 🏗️ Technical Architecture
- **SystemPrompts Architecture** - Dedicated medical knowledge files per agent
- **Local-First Processing** - Zero cloud dependencies
- **Chrome Manifest V3** - Modern extension architecture
- **React + TypeScript** - Type-safe UI development
- **Comprehensive Testing** - Full E2E workflow coverage

## 🚀 Quick Start

### Prerequisites

- **Apple Silicon Mac** (M1/M2/M3) recommended for MLX Whisper
- **16GB+ RAM** for optimal model performance
- **Chrome Browser** with Developer mode enabled
- **Node.js 18+** and **Python 3.9+**

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd xestro-investigation-extension

# 2. Install Node.js dependencies
npm install

# 3. Set up MLX Whisper transcription server
pip install -r requirements-whisper.txt

# 4. Start the Whisper server
./start-whisper-server.sh

# 5. Set up LMStudio
# Download and install LMStudio
# Load MedGemma-27b-it model
# Start server on localhost:1234

# 6. Build the extension
npm run build

# 7. Load extension in Chrome
# Navigate to chrome://extensions/
# Enable Developer mode
# Click "Load unpacked" and select the dist/ folder
```

### Verification

```bash
# Check MLX Whisper server
curl http://localhost:8001/v1/health

# Check LMStudio server
curl http://localhost:1234/v1/models

# Verify extension loading
# Look for "Operator" in Chrome extensions
```

## 📖 Usage Guide

### Basic Workflow

1. **Open Side Panel** - Click the extension icon or use `Cmd+Shift+M`
2. **Select Medical Workflow** - Choose from TAVI, PCI, Angiogram, etc.
3. **Start Recording** - Click the workflow button to begin dictation
4. **Speak Naturally** - Dictate your medical notes in clinical language
5. **Stop & Process** - Click again to stop recording and generate report
6. **Review & Copy** - Review the generated medical report and copy to EMR

### Advanced Features

#### Quick Actions (Footer Panel)
- **Investigation Summary** - Auto-insert diagnostic summaries
- **Appointment Management** - Schedule follow-up appointments
- **EMR Field Navigation** - Quick access to common fields

#### Transcription Editing
- **Real-time Editing** - Modify transcription before processing
- **Agent Switching** - Reprocess with different medical agents
- **Error Recovery** - Retry processing with intelligent error handling

#### EMR Integration
- **Auto-field Detection** - Automatically detects Xestro EMR fields
- **One-click Insertion** - Insert reports directly into active fields
- **Clipboard Integration** - Copy/paste functionality for all EMR systems

### Keyboard Shortcuts
- `Cmd+Shift+R`: Toggle recording
- `Cmd+Shift+M`: Open side panel
- `Cmd+Shift+T`: Quick transcription

## 🏗️ Architecture Deep Dive

### Service Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Chrome        │    │   MLX Whisper    │    │   LMStudio      │
│   Extension     │◄──►│   Server         │    │   MedGemma-27b  │
│   (React UI)    │    │   :8001          │    │   :1234         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐
│   Xestro EMR    │
│   Integration   │
└─────────────────┘
```

### Medical Agent Pipeline

```
Audio Recording → MLX Whisper → Agent Selection → MedGemma Processing → Medical Report
     ↓              ↓              ↓                ↓                    ↓
   WebM/Opus    Transcription   Direct User    SystemPrompts      Formatted Output
   Browser API   (50x RT)      Selection      Medical Knowledge   Australian English
```

### SystemPrompts Architecture

Each medical agent uses dedicated SystemPrompts files:

```typescript
// Example: TAVIAgent.ts + TAVISystemPrompts.ts
import { TAVISystemPrompts } from './TAVISystemPrompts';

export class TAVIAgent extends MedicalAgent {
  constructor() {
    super('TAVI Specialist', 'Interventional Cardiology', 
          'TAVI/TAVR procedures', 'tavi',
          TAVISystemPrompts.taviProcedureAgent.systemPrompt);
  }
}
```

## 🧪 Testing

### Running Tests

```bash
# Full test suite
npm run test:e2e

# Verbose testing with detailed output
npm run test:e2e:verbose

# Specific test file
npx playwright test tests/e2e/05-full-workflow.spec.ts
```

### Test Coverage

- **Extension Loading** - Manifest validation and permission checks
- **Audio Recording** - MediaRecorder API and voice activity detection
- **Transcription Service** - MLX Whisper server integration
- **Medical Agents** - All 6 agents with clinical accuracy testing
- **Full Workflows** - Complete TAVI, PCI, and Angiogram workflows
- **Error Recovery** - Service failure and reconnection scenarios
- **Performance** - Large dictation processing benchmarks

## 🎯 Usage

### Getting Started
1. **Navigate to your EMR** (Xestro, Epic, Cerner, etc.)
2. **Open the side panel** (Ctrl+Shift+M or click extension icon)
3. **Start recording** (Click microphone or Ctrl+Shift+R)
4. **Speak your dictation** (AI will auto-detect procedure type)
5. **Review and insert** into EMR fields

### Keyboard Shortcuts
- `Ctrl+Shift+R` (Mac: `Cmd+Shift+R`): Toggle recording
- `Ctrl+Shift+M` (Mac: `Cmd+Shift+M`): Open side panel
- `Ctrl+Shift+T` (Mac: `Cmd+Shift+T`): Quick transcription
- `Ctrl+Shift+I`: Investigation Summary
- `Ctrl+Shift+B`: Background
- `Ctrl+Shift+L`: Quick Letter

### Medical Agents

#### TAVI Agent
Handles transcatheter aortic valve procedures:
- Pre-procedure planning and sizing
- Procedural steps and device deployment
- Post-procedure assessment and complications
- Complete hemodynamic analysis

#### PCI Agent  
Manages percutaneous coronary interventions:
- Lesion assessment and preparation
- Stent selection and deployment
- TIMI flow and outcomes
- Complications and management

#### Angiogram Agent
Processes diagnostic catheterization:
- Coronary anatomy assessment
- Stenosis quantification
- Hemodynamic measurements
- Disease severity grading

#### Quick Letter Agent
Generates medical correspondence:
- Referral letters
- Follow-up communications
- Discharge summaries
- Test result notifications

## 🛠 Development

### Project Structure
```
reflow-medical-assistant/
├── src/
│   ├── agents/                 # Medical AI agents
│   │   ├── base/              # Base agent framework
│   │   ├── specialized/       # Medical specialty agents
│   │   └── router/           # Agent classification and routing
│   ├── services/             # Core services
│   │   ├── LMStudioService.ts # AI model integration
│   │   ├── TranscriptionService.ts # Speech processing
│   │   └── AudioProcessor.ts  # Audio handling
│   ├── sidepanel/            # Main UI components
│   │   ├── components/       # React components
│   │   └── styles/          # CSS and styling
│   ├── content/              # EMR integration scripts
│   ├── background/           # Service worker
│   └── types/               # TypeScript definitions
├── public/                   # Static assets
└── dist/                    # Built extension
```

### Development Commands
```bash
# Install dependencies
npm install

# Development build with hot reload
npm run dev

# Production build
npm run build

# Type checking
npm run type-check

# Linting
npm run lint

# Testing
npm run test:e2e  # Playwright E2E tests

# MLX Whisper transcription server
pip install -r requirements-whisper.txt
./start-whisper-server.sh      # Start transcription server
python3 whisper-server.py     # Direct server start
```

### Adding New Medical Agents
1. Create agent class extending `MedicalAgent`
2. Implement required methods: `process()`, `buildMessages()`, `parseResponse()`
3. Register agent in `AgentRouter`
4. Add system prompts and medical knowledge
5. Update types and configurations

### EMR Integration
Add support for new EMR systems by:
1. Updating `EMRSystem` interface in content script
2. Adding field selectors and navigation patterns
3. Implementing EMR-specific workflows
4. Testing field detection and insertion

## 🔧 Configuration

### AI Models Configuration
Recommended models for optimal performance:
- **Transcription**: MLX Whisper Large v3 Turbo (local `~/.cache/lm-studio/models/mlx-community/whisper-large-v3-turbo`)
- **Classifier**: MedGemma 4B (fast intent recognition via LMStudio)
- **Processor**: MedGemma 27B (comprehensive medical analysis via LMStudio)
- **Alternative**: Llama 3.1 8B/70B medical fine-tuned versions

### Settings
Accessible via extension popup or side panel:
- **Model Selection**: Choose LMStudio models
- **Voice Settings**: Sensitivity, auto-stop, continuous recording
- **EMR Configuration**: Field mappings, automation preferences
- **Agent Preferences**: Default agents, processing options

## 🏥 EMR Support

### Supported Systems
- **Xestro**: Full integration with native field detection
- **Epic**: Basic support with common field patterns
- **Cerner**: Basic support with documentation areas
- **Allscripts**: Basic support with note fields

### Field Automation
- Investigation Summary
- Background History
- Medications
- Clinical Notes
- Quick Letters
- Task Creation
- Appointment Wrap-up

## 📊 Medical Accuracy

### Quality Assurance
- **Medical Terminology**: Comprehensive correction database
- **Clinical Validation**: Evidence-based content verification
- **Structured Reports**: Standardized medical documentation
- **Compliance**: Australian medical writing standards

### Safety Features
- **Local Processing**: No cloud data transmission
- **Privacy First**: All AI processing on localhost
- **Error Detection**: Medical content validation
- **Review Workflow**: Manual verification before EMR insertion

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make changes following the medical accuracy guidelines
4. Add comprehensive tests
5. Update documentation
6. Submit a pull request

### Medical Content Guidelines
- All medical agents must use SystemPrompts architecture
- Clinical accuracy is paramount
- Australian spelling must be consistent
- Test with real medical scenarios
- Validate against clinical standards

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **MLX Whisper** - High-performance Apple Silicon transcription
- **LMStudio** - Local AI model serving
- **MedGemma** - Medical-focused language model
- **Chrome Extension APIs** - Manifest V3 framework
- **React & TypeScript** - Modern web development stack

---

**Version**: 2.4.2 | **Updated**: January 2025 | **Architecture**: SystemPrompts-based Medical AI

For detailed development information, see [CLAUDE.md](CLAUDE.md)

## ⚠️ Medical Disclaimer

This software is designed to assist healthcare professionals with medical documentation. It should not be used as a substitute for professional medical judgment. Always review AI-generated content for accuracy before using in patient care. The software is provided "as is" without warranty of any kind.

---

Built with ❤️ for healthcare professionals