# CLAUDE.md - Development Context

## Project Overview

**Xestro EMR Assistant Chrome Extension** - A sophisticated medical dictation and EMR integration tool that combines AI-powered transcription with specialized medical agents for healthcare professionals.

## Key Architecture Components

### 🎤 Audio Processing Pipeline
- **Browser Recording**: WebM/Opus format capture using Chrome MediaRecorder API
- **MLX Whisper Transcription**: Local `whisper-large-v3-turbo` model via dedicated Python server
- **Medical Terminology Correction**: Healthcare-specific term recognition and correction
- **Real-time Audio Analysis**: Voice activity detection with frequency visualization

### 🤖 AI Processing Stack
- **Transcription**: MLX Whisper server (localhost:8001) using `mlx-community/whisper-large-v3-turbo`
- **Generation**: MedGemma-27b-it model (localhost:1234) for medical report creation
- **Workflow Selection**: Direct user selection via side panel buttons (no classification required)
- **Structured Prompts**: Dedicated SystemPrompts files for each medical specialty

### 🏥 Medical Agents Architecture

#### Implemented Agents (6 Total)
1. **TAVI Agent** (`TAVIAgent.ts` + `TAVISystemPrompts.ts`)
   - Transcatheter Aortic Valve Implantation procedures
   - Comprehensive hemodynamic assessment and valve sizing
   - Pre/post-procedural measurements with quantitative analysis

2. **PCI Agent** (`PCIAgent.ts` + `PCISystemPrompts.ts`)
   - Percutaneous Coronary Intervention procedures
   - Detailed vessel assessment and intervention planning
   - TIMI flow grading and angiographic results

3. **Angiogram Agent** (`AngiogramAgent.ts` + `AngiogramSystemPrompts.ts`)
   - Cardiac catheterization and coronary angiography
   - Comprehensive vessel territory analysis
   - Left/right heart catheterization support

4. **Quick Letter Agent** (`QuickLetterAgent.ts` + `QuickLetterSystemPrompts.ts`)
   - Medical correspondence and consultation letters
   - Brief procedure notes and clinical summaries
   - Structured letter formatting with professional tone

5. **Consultation Agent** (`ConsultationAgent.ts`)
   - Comprehensive patient assessments
   - Clinical evaluation and management planning
   - Multi-system clinical reasoning

6. **Investigation Summary Agent** (`InvestigationSummaryAgent.ts` + `InvestigationSummarySystemPrompts.ts`)
   - Diagnostic test result summarization
   - Echo, CT, MRI, and stress test interpretation
   - Integrated clinical correlation and recommendations

#### SystemPrompts Architecture
Each agent now uses dedicated SystemPrompts files containing:
- **Primary system prompts** with medical terminology requirements
- **Medical knowledge databases** with comprehensive terminology
- **Validation patterns** for medical accuracy
- **Template structures** for consistent formatting
- **Quality assurance rules** for clinical accuracy

### Base Agent Framework
```typescript
// MedicalAgent.ts - Abstract base class
export abstract class MedicalAgent {
  // Core processing methods
  abstract process(input: string, context?: MedicalContext): Promise<MedicalReport>;
  protected abstract buildMessages(input: string, context?: MedicalContext): ChatMessage[];
  protected abstract parseResponse(response: string, context?: MedicalContext): ReportSection[];
  
  // Medical terminology extraction with enhanced patterns
  protected extractMedicalTerms(text: string): string[] {
    // Comprehensive medical pattern recognition
    // Stenosis grading preservation (mild/moderate/severe)
    // TIMI flow descriptive language maintenance
    // Percentage patterns with clinical context
  }
}
```

## Recent Major Updates

### SystemPrompts Architecture Implementation (January 2025)
- **Enhancement**: Extracted comprehensive medical knowledge from Reflow2 implementation
- **Structure**: Dedicated SystemPrompts file for each medical specialty
- **Benefits**:
  - Improved medical accuracy with specialty-specific terminology
  - Consistent clinical language preservation
  - Enhanced stenosis grading (avoids percentage assumptions)
  - TIMI flow descriptive language maintenance
  - Australian spelling compliance throughout

### Major Architectural Improvements (v2.5.0 - January 2025)
- **Agent-Specific Model Configuration**: Investigation Summary agent now uses lighter google/gemma-3n-e4b model for simple formatting tasks, while other agents use powerful MedGemma-27b-it for complex medical reports
- **Comprehensive Cancellation System**: AbortController integration across all processing phases (recording, transcription, processing) with proper cleanup and user feedback
- **UI Space Optimization**: 
  - Consolidated reprocessing functionality into transcription header with dropdown menu
  - Embedded transcription view within results panel when letters are generated
  - Eliminated duplicate UI elements for cleaner, more efficient workflow
- **Enhanced Letter Intelligence**: Smart summary generation with medical pattern recognition for diagnosis, procedures, and outcomes instead of simple first-sentence extraction
- **Integrated Warning Display**: Content warnings now appear within letter cards rather than separate alerts

### MLX Whisper Integration (January 2025)
- **Issue**: LMStudio doesn't support `/v1/audio/transcriptions` endpoint
- **Solution**: Created dedicated Python transcription server using `mlx-whisper` package
- **Benefits**: 
  - ~50x real-time transcription speed on Apple Silicon
  - Direct access to local `whisper-large-v3-turbo` model
  - OpenAI-compatible API endpoints
  - Complete local processing (no external APIs)

### Technical Implementation
```python
# whisper-server.py - MLX Whisper transcription server
- Uses official mlx-whisper package
- Flask server with OpenAI-compatible endpoints
- Runs on localhost:8001 (separate from LMStudio)
- Direct model access via path_or_hf_repo="mlx-community/whisper-large-v3-turbo"
- Health check endpoint for service monitoring
```

### Extension Configuration
```typescript
// LMStudioService.ts updated configuration
{
  baseUrl: 'http://localhost:1234',           // LMStudio for report generation
  transcriptionUrl: 'http://localhost:8001', // Separate MLX Whisper server
  processorModel: 'unsloth/medgemma27b/medgemma-27b-it-q4_k_m.gguf',
  transcriptionModel: 'whisper-large-v3-turbo',
  timeout: 300000  // 5-minute timeout for complex medical reports
}
```

## Version Management

**CRITICAL**: Always update the version number in both `package.json` AND `manifest.json` when making significant changes:

- **Patch (x.x.X)**: Bug fixes, minor prompt adjustments, small UI tweaks
- **Minor (x.X.0)**: New features, major agent enhancements, new investigation types, UX improvements
- **Major (X.0.0)**: Breaking changes, architectural overhauls, new core functionality

**Current Version**: **2.5.0** (synchronized across package.json and manifest.json)

## Recent Code Quality Improvements (January 2025)

### ✅ Codebase Cleanup and Optimization
- **TypeScript Compilation**: Fixed all compilation errors including `offsetParent` property access
- **ESLint Issues**: Resolved critical errors including unused variables and missing const assertions
- **Version Synchronization**: Aligned version numbers across package.json and manifest.json (2.5.0)
- **Legacy Code Removal**: Removed 782-line `BatchAIReviewOrchestrator.legacy.ts` file
- **Documentation Organization**: Moved temporary documentation files to `docs/` folder
- **Agent Architecture**: Cleaned up unused imports and exports in specialized agents
- **Structured Logging**: Implemented `Logger.ts` utility for production-appropriate logging levels
- **Build Optimization**: Confirmed successful production build with optimized bundle sizes

### ✅ Batch Processing Workflow Alignment (January 2025)
- **Patient Pattern Recognition**: Updated to use "Name (ID)" format (e.g., "Test Test (14524)") instead of DOB patterns
- **Search Logic Enhancement**: Double-click patient selection now uses ID-based pattern matching
- **Workflow Validation**: Ensures proper sequence: Double-click → "Patient Record" → Extract fields → "Appointment Book"
- **Field Extraction**: Confirmed extraction of Background, Medications, Problem List, and Investigation Summary
- **Backward Compatibility**: Maintains support for legacy DOB patterns while prioritizing new ID format
- **Enhanced Debugging**: Improved logging with pattern type detection and detailed error messages
- **Type Updates**: Updated `PatientAppointment` interface to reflect ID-based pattern usage

**Recent Version History**:
- **2.5.0**: Major architectural improvements - agent-specific model configuration, comprehensive cancellation system, UI space optimization with embedded transcription, enhanced letter intelligence with medical pattern recognition
- **2.4.2**: SystemPrompts architecture implementation - comprehensive medical knowledge extraction from Reflow2, enhanced stenosis grading preservation, TIMI flow terminology, Australian spelling compliance
- **2.4.1**: Enhanced stenosis grading and TIMI flow terminology handling
- **2.3.0**: Investigation Summary Agent enhancements with advanced medical terminology
- **2.2.0**: MLX Whisper integration and Investigation Summary Agent

**Version Update Triggers**:
- Adding new investigation types or agents
- Significant UI/UX changes 
- New system prompt enhancements
- Architecture modifications (like SystemPrompts extraction)
- Performance improvements
- Medical terminology accuracy improvements

**Always increment version in BOTH files before committing significant changes!**

## Development Workflow

### Essential Commands
```bash
# Extension development
npm run dev                    # Development build with hot reload
npm run build                  # Production build
npm run build-with-types      # Build with TypeScript validation
npm run type-check            # TypeScript validation only
npm run lint                  # ESLint code validation
npm run lint:src              # Source-specific linting
npm run validate:production   # Full production validation pipeline
npm run validate:full         # Complete validation including E2E tests

# Transcription server management
pip install -r requirements-whisper.txt  # Install MLX Whisper dependencies
./start-whisper-server.sh                # Start MLX Whisper server with auto-restart
./auto-start-whisper.sh                  # Auto-start script for development
python3 whisper-server.py               # Direct server start
curl http://localhost:8001/v1/health     # Health check endpoint

# Testing infrastructure
npm run test:e2e              # End-to-end testing (Playwright)
npm run test:e2e:verbose      # Verbose E2E testing with detailed output
npx playwright test           # Direct Playwright execution
node run-e2e-tests.js         # Custom E2E test runner
```

### Project Structure
```
xestro-investigation-extension/
├── src/
│   ├── agents/                           # Medical AI agents architecture
│   │   ├── base/
│   │   │   ├── MedicalAgent.ts          # Abstract base agent class
│   │   │   └── NarrativeLetterAgent.ts  # Narrative letter functionality
│   │   ├── specialized/                 # Medical specialty agents
│   │   │   ├── TAVIAgent.ts + TAVISystemPrompts.ts
│   │   │   ├── PCIAgent.ts + PCISystemPrompts.ts  
│   │   │   ├── AngiogramAgent.ts + AngiogramSystemPrompts.ts
│   │   │   ├── QuickLetterAgent.ts + QuickLetterSystemPrompts.ts
│   │   │   ├── ConsultationAgent.ts
│   │   │   ├── InvestigationSummaryAgent.ts + InvestigationSummarySystemPrompts.ts
│   │   │   └── index.ts                 # Agent exports
│   │   └── router/
│   │       └── AgentRouter.ts           # Direct agent routing
│   ├── services/                        # Core service layer
│   │   ├── LMStudioService.ts          # AI model integration
│   │   ├── TranscriptionService.ts      # Audio processing orchestration
│   │   ├── WhisperServerService.ts      # MLX Whisper server management
│   │   └── AgentFactory.ts             # Agent instantiation and processing
│   ├── config/                         # Configuration management
│   │   ├── workflowConfig.ts           # Workflow button configuration
│   │   └── appointmentPresets.ts       # Appointment type configurations
│   ├── hooks/                          # React hooks
│   │   └── useRecorder.ts              # Audio recording hook with voice activity
│   ├── sidepanel/                      # Main React UI
│   │   ├── App.tsx                     # Main application component
│   │   ├── components/                 # UI components
│   │   │   ├── WorkflowButtons.tsx     # Workflow selection interface
│   │   │   ├── TranscriptionDisplay.tsx # Audio transcription display
│   │   │   ├── ResultsPanel.tsx        # Medical report results
│   │   │   ├── QuickActions.tsx        # EMR quick actions
│   │   │   ├── ModelStatus.tsx         # Service status monitoring
│   │   │   └── [other components]
│   │   ├── hooks/                      # UI-specific hooks
│   │   └── styles/                     # CSS and styling
│   ├── content/                        # EMR integration
│   │   └── content-script.ts          # Xestro EMR field detection
│   ├── background/                     # Chrome extension service worker
│   │   └── service-worker.ts          # Extension background processing
│   └── types/                         # TypeScript definitions
│       └── medical.types.ts           # Medical domain types
├── whisper-server.py                  # MLX Whisper transcription server
├── start-whisper-server.sh           # Server startup script
├── auto-start-whisper.sh             # Development auto-start
├── requirements-whisper.txt          # Python dependencies
├── WHISPER_SETUP.md                  # Transcription setup guide
├── tests/                            # Comprehensive testing
│   ├── e2e/                         # Playwright end-to-end tests
│   │   ├── 01-extension-loading.spec.ts
│   │   ├── 02-voice-recording.spec.ts
│   │   ├── 05-full-workflow.spec.ts  # Complete workflow testing
│   │   └── [other test files]
│   └── helpers/                     # Test utilities
│       ├── ExtensionTestHelper.ts   # Extension testing utilities
│       ├── LMStudioMock.ts         # Mock AI services
│       └── [other helpers]
├── vite.config.ts                   # Vite build configuration
├── playwright.config.ts             # Playwright test configuration
├── tsconfig.json                    # TypeScript configuration
├── tailwind.config.js              # Tailwind CSS configuration
└── dist/                           # Built extension output
```

## Medical Agent Development

### Enhanced Base Agent Pattern
```typescript
export abstract class MedicalAgent implements IMedicalAgent {
  public readonly name: string;
  public readonly specialty: string; 
  public readonly description: string;
  public readonly agentType: AgentType;
  protected memory: AgentMemory;
  protected systemPrompt: string;

  // Core abstract methods
  abstract process(input: string, context?: MedicalContext): Promise<MedicalReport>;
  protected abstract buildMessages(input: string, context?: MedicalContext): ChatMessage[];
  protected abstract parseResponse(response: string, context?: MedicalContext): ReportSection[];

  // Enhanced medical terminology extraction
  protected extractMedicalTerms(text: string): string[] {
    const medicalPatterns = [
      // Stenosis terminology - preserve qualitative terms
      /\b(?:mild|moderate|severe|critical)\s+(?:stenosis|regurgitation|insufficiency)\b/gi,
      // TIMI flow patterns - preserve descriptive language  
      /\b(?:TIMI|timi)\s+(?:flow\s+)?(?:0|I|II|III|zero|one|two|three)\b/gi,
      /\b(?:normal|delayed|absent|complete)\s+(?:flow|perfusion)\b/gi,
      // Hemodynamic measurements with units
      /\b(?:mg|mcg|g|ml|cc|units?)\b/gi,
      /\b\d+\s*(?:mg|mcg|g|ml|cc|units?)\b/gi,
      /\b(?:systolic|diastolic|blood pressure|BP)\b/gi,
      /\b(?:EF|ejection fraction)\s*(?:of\s*)?\d+%?\b/gi,
    ];
    // Returns comprehensive medical term extraction with context preservation
  }

  // Agent memory management
  protected updateMemory(key: string, value: any, isLongTerm = false): void;
  protected addProcedureMemory(type: string, details: Record<string, any>, outcome?: string): void;
}
```

### SystemPrompts Integration Pattern
```typescript
// Example: TAVIAgent.ts with TAVISystemPrompts.ts
import { TAVISystemPrompts, TAVIMedicalPatterns, TAVIValidationRules } from './TAVISystemPrompts';

export class TAVIAgent extends MedicalAgent {
  constructor() {
    super(
      'TAVI Specialist', 
      'Interventional Cardiology',
      'TAVI/TAVR procedure documentation',
      'tavi',
      TAVISystemPrompts.taviProcedureAgent.systemPrompt  // From SystemPrompts file
    );
  }

  protected buildMessages(input: string, context?: MedicalContext): ChatMessage[] {
    return [
      { 
        role: 'system', 
        content: TAVISystemPrompts.taviProcedureAgent.systemPrompt 
      },
      { 
        role: 'user', 
        content: TAVISystemPrompts.taviProcedureAgent.userPromptTemplate.replace('{input}', input)
      }
    ];
  }
}
```

### Direct Workflow Selection (No Classification)
```typescript
// User selects workflow directly via UI button
const handleWorkflowSelect = useCallback((workflowId: AgentType) => {
  console.log('🎯 Workflow selected:', workflowId);
  
  if (recorder.isRecording && activeWorkflow === workflowId) {
    // Stop recording for active workflow
    recorder.stopRecording();
    // Processing will be handled in handleRecordingComplete callback
  } else if (!recorder.isRecording) {
    // Start recording for selected workflow
    setActiveWorkflow(workflowId);
    activeWorkflowRef.current = workflowId; // Maintain ref for reliability
    recorder.startRecording();
  }
}, [recorder, activeWorkflow]);

// Processing with selected agent (no classification step)
const result = await AgentFactory.processWithAgent(workflowId, transcriptionText);
```

## EMR Integration

### Supported Systems
- **Xestro**: Primary target with comprehensive field detection and auto-insertion
- **Epic**: Basic support with common text field patterns
- **Cerner**: Basic support with documentation areas

### Content Script Architecture
```typescript
// content-script.ts - EMR field detection and content insertion
class XestroFieldManager {
  detectFields(): XestroField[]
  insertContent(fieldId: string, content: string): Promise<boolean>
  navigateToSection(section: string): Promise<boolean>
  
  // Quick Actions integration
  async handleQuickAction(actionId: string, data: any): Promise<void> {
    switch (actionId) {
      case 'investigation-summary':
        await this.insertInvestigationSummary(data.content);
        break;
      case 'insertText':
        await this.insertIntoActiveField(data.text);
        break;
      // Additional quick actions...
    }
  }
}
```

### Chrome Extension Messaging
```typescript
// Background service worker communication
chrome.runtime.sendMessage({
  type: 'EXECUTE_ACTION',
  action: 'investigation-summary',
  data: { content: reportContent }
});
```

## Testing Infrastructure

### Comprehensive Playwright E2E Tests
```typescript
// Complete workflow testing: Recording → Transcription → Agent Processing → EMR Integration
tests/e2e/
├── 00-basic-extension-test.spec.ts  # Extension build and loading verification
├── 01-extension-loading.spec.ts     # Extension permissions and initialization
├── 02-voice-recording.spec.ts       # Audio recording functionality
├── 03-medical-agents.spec.ts        # Agent processing and medical accuracy
├── 04-lmstudio-integration.spec.ts  # AI model integration testing
├── 05-full-workflow.spec.ts         # Complete user workflows (TAVI, PCI, Angiogram)
└── 06-performance.spec.ts           # Performance benchmarking and optimization
```

### Advanced Test Features
- **Full Workflow Testing**: Complete TAVI, PCI, and Angiogram workflows
- **Workflow Interruption Recovery**: Error handling and recovery testing
- **Multi-step Correction**: Transcription editing and re-processing
- **Agent Switching**: Mid-workflow agent changing capabilities  
- **Clipboard Integration**: EMR field copying and pasting
- **Performance Testing**: Large dictation processing benchmarks
- **Error Scenarios**: Service failure and recovery testing

### Mock Services & Test Utilities
- **ExtensionTestHelper**: Chrome extension testing utilities with permission management
- **LMStudioMock**: AI response mocking for consistent testing
- **MockAudio**: Browser MediaRecorder API simulation
- **TestOrchestrator**: Advanced test workflow coordination
- **AutoFixOrchestrator**: Automated error detection and correction

## Error Handling & Diagnostics

### Comprehensive Service Monitoring
```typescript
// Multi-service health monitoring
class ServiceMonitor {
  async checkLMStudioConnection(): Promise<boolean>
  async checkWhisperServerStatus(): Promise<WhisperServerStatus>
  async ensureWhisperServerRunning(): Promise<ServerStartResult>
  
  // Real-time service status updates
  getModelStatus(): ModelStatus {
    isConnected: boolean;
    processorModel: string;
    whisperServer: {
      running: boolean;
      model: string;
      lastChecked: number;
    };
    latency: number;
  }
}
```

### Error Recovery & User Guidance
```typescript
// Intelligent error handling with user guidance
try {
  const transcription = await lmStudioService.transcribeAudio(audioBlob);
} catch (error) {
  if (error.message.includes('timeout')) {
    return `[MLX Whisper transcription timed out. The model may be loading for the first time.]`;
  } else if (error.message.includes('8001')) {
    console.warn('💡 To fix this:');
    console.warn('   1. Check server status: curl http://localhost:8001/v1/health');
    console.warn('   2. Start server: ./start-whisper-server.sh');
    return `[MLX Whisper server not running. Please start the server manually.]`;
  }
}
```

### Common Issues & Solutions
1. **LMStudio Connection**: Verify localhost:1234 accessibility and MedGemma model loading
2. **Whisper Server**: Check localhost:8001, Python dependencies, and MLX Whisper installation  
3. **Browser Permissions**: Ensure microphone and clipboard permissions granted
4. **Model Loading**: First-time model initialization can take 2-5 minutes
5. **Extension Loading**: Verify manifest V3 compliance and proper build output

## Performance Characteristics

### Expected Performance (Apple Silicon M1/M2/M3)
- **Transcription**: ~50x real-time speed (MLX optimization)
- **Report Generation**: 3-8 seconds (MedGemma-27b-it Q4_K_M)
- **Workflow Selection**: Instant (direct selection, no classification)
- **Memory Usage**: ~150MB extension + ~8GB model memory
- **Bundle Size**: ~1.2MB (optimized with code splitting)
- **Cold Start**: 30-60 seconds first transcription (model loading)
- **Warm Performance**: <2 seconds transcription + <5 seconds generation

### Optimization Features
- **Code Splitting**: Vendor, agents, and services bundles
- **Lazy Loading**: Components loaded on demand
- **Caching**: Model responses and transcription results
- **Background Processing**: Non-blocking audio processing
- **Efficient Re-rendering**: React memoization and optimization

## Security & Privacy

### Local-First Architecture
- **Zero Cloud Dependencies**: All processing on localhost (ports 1234, 8001)
- **Private Data**: Patient information never transmitted externally
- **HIPAA Compliance**: Designed for healthcare privacy requirements
- **Encrypted Storage**: Chrome's secure local storage for temporary data
- **Memory Management**: Automatic cleanup of sensitive audio data
- **CSP Compliance**: Content Security Policy enforcement

### Security Features
```typescript
// Content Security Policy configuration
"content_security_policy": {
  "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; 
                      connect-src 'self' http://localhost:1234 http://localhost:8001;"
}
```

## Development Best Practices

### Code Quality Standards
- **TypeScript Strict Mode**: Complete type safety with strict checking
- **ESLint Configuration**: Medical-specific linting rules with 30 warning limit
- **Component Architecture**: Modular React components with clear separation
- **Testing Coverage**: Comprehensive E2E testing with Playwright
- **Error Boundaries**: React error handling and user feedback
- **Logging Strategy**: Structured console logging for debugging and monitoring

### Medical Accuracy Assurance
- **Terminology Preservation**: Original clinical language maintained
- **Validation Patterns**: Medical term extraction and verification
- **Australian Spelling**: Consistent medical terminology spelling
- **Clinical Review**: System prompts validated against medical standards
- **Safety Indicators**: Clear placeholders for missing or uncertain data
- **Quality Assurance**: Built-in medical content validation

## Current Architecture Status

### Implemented Features ✅
- **6 Medical Agents**: TAVI, PCI, Angiogram, QuickLetter, Consultation, InvestigationSummary
- **SystemPrompts Architecture**: Dedicated medical knowledge files per agent
- **MLX Whisper Integration**: High-performance local transcription
- **Direct Workflow Selection**: No classification step required
- **Comprehensive Testing**: Full E2E workflow coverage
- **EMR Integration**: Xestro field detection and auto-insertion
- **Error Recovery**: Intelligent error handling and user guidance
- **Real-time Monitoring**: Service status and health checking

### Development Roadmap
- **Additional Agents**: MTEER, TTEER, PFO Closure, ASD Closure (commented in index.ts)
- **Enhanced EMR Support**: Epic and Cerner deep integration
- **Custom Agent Training**: User-specific medical templates
- **Performance Optimization**: Model quantization and caching improvements
- **Multi-language Support**: Non-English medical transcription

## Key Dependencies

### Runtime Stack
- **MLX Whisper**: Apple Silicon-optimized transcription (`mlx-whisper`)
- **LMStudio**: Local AI model serving (MedGemma-27b-it Q4_K_M only)
- **Chrome Extension APIs**: Manifest V3, Side Panel, MediaRecorder, Clipboard
- **React 18**: UI framework with hooks and modern patterns
- **TypeScript 5**: Type system with strict mode enabled
- **Tailwind CSS**: Utility-first styling framework

### Development & Build Tools
- **Vite**: Build tool with Chrome extension optimization
- **Playwright**: E2E testing framework with Chrome extension support
- **ESLint**: Code quality with TypeScript and React plugins
- **PostCSS**: CSS processing with Tailwind integration
- **Terser**: JavaScript minification and optimization

## Deployment Guide

### Local Development Setup
```bash
# 1. Install Node.js dependencies
npm install

# 2. Set up MLX Whisper server
pip install -r requirements-whisper.txt
./start-whisper-server.sh

# 3. Configure LMStudio
# - Download MedGemma-27b-it model
# - Start server on localhost:1234
# - Load model in LMStudio interface

# 4. Build and load extension
npm run build
# Load dist/ folder as unpacked extension in Chrome

# 5. Verify setup
curl http://localhost:8001/v1/health  # Whisper server
curl http://localhost:1234/v1/models  # LMStudio
```

### Production Deployment
1. **Environment Validation**: Ensure Apple Silicon Mac with sufficient RAM (16GB+)
2. **Service Configuration**: MLX Whisper and LMStudio server setup
3. **Extension Packaging**: Production build with optimized bundles  
4. **Healthcare Compliance**: Local processing verification and audit trails
5. **User Training**: Workflow selection and medical terminology guidance

---

**Current Version**: 2.5.0
**Last Updated**: January 2025  
**Architecture**: Agent-specific model configuration with MLX Whisper transcription and comprehensive cancellation system
**Primary Focus**: Local-first medical AI with optimized UI workflow and EMR integration
**Medical Accuracy**: Clinically validated system prompts with enhanced letter intelligence