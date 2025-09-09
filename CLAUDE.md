# CLAUDE.md - Development Context

## Project Overview

**Operator Chrome Extension** - A sophisticated medical dictation and EMR integration tool that combines AI-powered transcription with 11 specialized medical agents for healthcare professionals, including advanced batch processing capabilities and Australian medical guideline compliance.

## Key Architecture Components

### 🎤 Audio Processing Pipeline
- **Browser Recording**: WebM/Opus format capture using Chrome MediaRecorder API
- **MLX Whisper Transcription**: Local `whisper-large-v3-turbo` model via dedicated Python server
- **Medical Terminology Correction**: Healthcare-specific term recognition and correction
- **Real-time Audio Analysis**: Voice activity detection with frequency visualization

### 🤖 AI Processing Stack
- **Transcription**: MLX Whisper server (localhost:8001) using `mlx-community/whisper-large-v3-turbo`
- **Generation**: MedGemma-27b MLX model (localhost:1234) for medical report creation
- **Workflow Selection**: Direct user selection via side panel buttons (no classification required)
- **Structured Prompts**: Dedicated SystemPrompts files for each medical specialty

### 🏥 Medical Agents Architecture

#### Implemented Agents (11 Total)
**Core Medical Procedure Agents:**
1. **TAVI Agent** (`TAVIAgent.ts` + `TAVISystemPrompts.ts`)
   - Transcatheter Aortic Valve Implantation procedures
   - Comprehensive haemodynamic assessment and valve sizing
   - Pre/post-procedural measurements with quantitative analysis

2. **Angiogram/PCI Agent** (`AngiogramPCIAgent.ts` + `AngiogramPCISystemPrompts.ts`)
   - Combined cardiac catheterization and PCI procedures
   - Percutaneous Coronary Intervention with vessel assessment
   - TIMI flow grading and comprehensive angiographic results

3. **mTEER Agent** (`MTEERAgent.ts` + `MTEERSystemPrompts.ts`)
   - Mitral Transcatheter Edge-to-Edge Repair procedures
   - MitraClip and PASCAL device deployment
   - Mitral regurgitation assessment and outcomes

4. **PFO Closure Agent** (`PFOClosureAgent.ts` + `PFOClosureSystemPrompts.ts`)
   - Patent Foramen Ovale closure procedures
   - Cryptogenic stroke prevention and device selection
   - Anatomical assessment and deployment guidance

5. **Right Heart Cath Agent** (`RightHeartCathAgent.ts` + `RightHeartCathSystemPrompts.ts`)
   - Right heart catheterization with haemodynamic assessment
   - Pulmonary hypertension evaluation
   - Exercise haemodynamics and cardiac output measurements

**Documentation and Review Agents:**
6. **Quick Letter Agent** (`QuickLetterAgent.ts` + `QuickLetterSystemPrompts.ts`)
   - Medical correspondence and consultation letters
   - Brief procedure notes and clinical summaries
   - Structured letter formatting with professional tone

7. **Consultation Agent** (`ConsultationAgent.ts`)
   - Comprehensive patient assessments
   - Clinical evaluation and management planning
   - Multi-system clinical reasoning

8. **Investigation Summary Agent** (`InvestigationSummaryAgent.ts` + `InvestigationSummarySystemPrompts.ts`)
   - Diagnostic test result summarization
   - Echo, CT, MRI, and stress test interpretation
   - Integrated clinical correlation and recommendations

**Advanced Specialized Agents:**
9. **Australian Medical Review Agent** (`AusMedicalReviewAgent.ts` + `AusMedicalReviewSystemPrompts.ts`)
   - Australian guideline compliance checking
   - Heart Foundation resource integration
   - Medication safety analysis with local standards

10. **Background Agent** (`BackgroundAgent.ts` + `BackgroundSystemPrompts.ts`)
    - Patient history and background analysis
    - Comorbidity assessment and risk stratification
    - Clinical context extraction and summarization

11. **Medication Agent** (`MedicationAgent.ts` + `MedicationSystemPrompts.ts`)
    - Comprehensive medication review and analysis
    - Drug interaction checking and safety alerts
    - Dosing optimization and therapeutic recommendations

#### SystemPrompts Architecture
Each agent now uses dedicated SystemPrompts files containing:
- **Primary system prompts** with medical terminology requirements
- **Medical knowledge databases** with comprehensive terminology
- **Validation patterns** for medical accuracy
- **Template structures** for consistent formatting
- **Quality assurance rules** for clinical accuracy

### 🔄 Batch Processing Architecture

#### Australian Medical Review Capabilities
The extension now includes sophisticated batch processing capabilities for multi-patient clinical review:

```typescript
// BatchAIReviewOrchestrator.ts - Multi-patient processing coordination
export class BatchAIReviewOrchestrator {
  // Patient pattern recognition with "Name (ID)" format
  parsePatientAppointments(html: string): PatientAppointment[]
  
  // Parallel patient processing with Australian guideline compliance
  async processBatchReview(input: BatchAIReviewInput): Promise<BatchAIReviewReport>
  
  // Enhanced data extraction from EMR systems
  async extractPatientData(patient: PatientAppointment): Promise<AusMedicalReviewInput>
}
```

**Key Features:**
- **Multi-Patient Processing**: Simultaneous review of appointment lists
- **Australian Guideline Integration**: Heart Foundation compliance checking
- **Enhanced Pattern Recognition**: "Name (ID)" format support (e.g., "Test Test (14524)")
- **Structured Data Extraction**: Background, medications, investigations, problem lists
- **Performance Monitoring**: CheckpointManager and MetricsCollector integration

#### Advanced Session Management
```typescript
// PatientSession interface - Enhanced multi-patient workflows
export interface PatientSession {
  id: string;
  patient: PatientInfo;
  transcription: string;
  results: string;
  summary?: string; // Enhanced summary for dual card display
  agentType: AgentType;
  agentName: string;
  status: SessionStatus; // 'recording' | 'transcribing' | 'processing' | 'completed' | 'error' | 'cancelled'
  processingTime?: number;
  warnings?: string[];
  errors?: string[];
  audioBlob?: Blob; // Audio storage for reprocessing
}
```

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

### 🎯 Unified Recording Interface Architecture

#### Consistent Recording Experience (v3.1.0)
The extension now provides a unified recording interface that ensures consistency regardless of how users initiate recording:

**Vertical Stacked Layout:**
```
┌─────────────────────────────────────────┐
│ LiveAudioVisualizer (Top Section)      │
│ ┌─────────────────────────────────────┐ │
│ │   VU Meter + Timer + Stop Button   │ │
│ │   Audio Waveform Visualization     │ │
│ │   Device Status + Audio Levels     │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ RecordingPromptCard (Bottom Section)   │
│ ┌─────────────────────────────────────┐ │
│ │ 📋 Recording Guide (CompactMode)   │ │
│ │ • Key elements to include          │ │
│ │ • Recording tips & terminology     │ │
│ │ (Collapsible sections)             │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Recording Entry Points:**
- **Workflow Recordings**: TAVI, PCI, Quick Letter, Consultation, etc.
- **Quick Action Recordings**: Investigation Summary, Background, Medications

**Universal Prompt Cards:**
All agents now have dedicated recording guidance:
```typescript
// recordingPrompts.ts - Universal prompt configuration
const RECORDING_PROMPTS = [
  'tavi', 'angiogram-pci', 'quick-letter', 'consultation',
  'mteer', 'pfo-closure', 'right-heart-cath',
  'investigation-summary', 'background', 'medication' // New quick action prompts
];
```

**CompactMode Implementation:**
- Optimized for narrow side panel interface
- Smaller fonts, reduced padding, condensed spacing
- Sections collapsed by default to maximize space efficiency
- Essential guidance always visible during recording

## Recent Major Updates

### Full-Page Settings System (v3.2.1 - September 2025)
- **Chrome Extension Options Page**: Complete full-page settings interface accessible via new tab
- **Enhanced Transcription Management**: Full-screen interface for viewing and editing ASR corrections with advanced filtering, sorting, pagination, and bulk operations
- **Professional Data Table**: 25 items per page with search, agent filtering, date ranges, and confidence levels
- **Expanded Optimization Panel**: Full-page layout for ASR and GEPA optimization with better spacing and organization
- **Functional Settings Button**: Fixed non-functional "Open Settings" button in StatusIndicator with proper Chrome extension API integration
- **Monochrome Design System**: Professional medical-appropriate interface with sidebar navigation and responsive layout
- **Enhanced UX**: Export functionality, bulk delete operations, advanced filtering, and comfortable editing experience

### Unified Recording Interface (v3.1.0 - August 2025)
- **Consistent Recording Experience**: Eliminated interface inconsistencies between workflow and quick action recordings
- **Vertical Stacked Layout**: LiveAudioVisualizer + RecordingPromptCard displayed together during ALL recordings
- **CompactMode Implementation**: Space-optimized RecordingPromptCard design for narrow side panel
- **Universal Prompt Cards**: Added recording guidance for quick action agents (investigation-summary, background, medication)
- **Enhanced UX Design**: Timer, stop button, and reference materials always visible regardless of entry point
- **Architectural Improvement**: Unified recording display logic replacing separate overlay and visualizer components

### Major Agent Expansion & Batch Processing (v3.0.3 - January 2025)
- **Agent Ecosystem Expansion**: Comprehensive expansion from 6 to 11 specialized medical agents
- **Australian Medical Compliance**: Full integration of Australian Heart Foundation guidelines and local medical standards
- **Batch Processing Capabilities**: Multi-patient clinical review workflows with enhanced pattern recognition
- **Advanced Session Management**: Patient session tracking with comprehensive state management
- **Enhanced UI Components**: PatientSelectionModal, SessionsPanel, AIReviewSection, and FieldIngestionOverlay
- **Comprehensive Testing**: 11 E2E test suites with advanced orchestration and medical report validation
- **Performance Optimizations**: Enhanced memory management and processing efficiency for large patient cohorts

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
- **Agent-Specific Model Configuration**: Investigation Summary agent now uses lighter google/gemma-3n-e4b model for simple formatting tasks, while other agents use powerful MedGemma-27b MLX for complex medical reports
- **Comprehensive Cancellation System**: AbortController integration across all processing phases (recording, transcription, processing) with proper cleanup and user feedback
- **UI Space Optimization**: 
  - Consolidated reprocessing functionality into transcription header with dropdown menu
  - Embedded transcription view within results panel when letters are generated
  - Eliminated duplicate UI elements for cleaner, more efficient workflow
- **Enhanced Letter Intelligence**: Smart summary generation with medical pattern recognition for diagnosis, procedures, and outcomes instead of simple first-sentence extraction
- **Integrated Warning Display**: Content warnings now appear within letter cards rather than separate alerts
- **App Architecture Optimization**: Migrated from App.tsx to OptimizedApp.tsx with useReducer state management, replacing 20+ useState hooks with centralized state, memoized components, and optimized re-rendering patterns

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
  processorModel: 'lmstudio-community/medgemma-27b-text-it-MLX-4bit',
  transcriptionModel: 'whisper-large-v3-turbo',
  timeout: 300000  // 5-minute timeout for complex medical reports
}
```

## Version Management

**CRITICAL**: Always update the version number in both `package.json` AND `manifest.json` when making significant changes:

- **Patch (x.x.X)**: Bug fixes, minor prompt adjustments, small UI tweaks
- **Minor (x.X.0)**: New features, major agent enhancements, new investigation types, UX improvements
- **Major (X.0.0)**: Breaking changes, architectural overhauls, new core functionality

**Current Version**: **3.2.1** (synchronized across package.json and manifest.json)

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
- **3.2.1**: Full-Page Settings System - Chrome extension options page with enhanced transcription management, professional data table with filtering/sorting/pagination, expanded optimization panel, functional settings button, monochrome design system
- **3.1.0**: Unified Recording Interface - consistent recording experience for all agent types, vertical stacked layout with LiveAudioVisualizer + RecordingPromptCard, universal prompt cards for quick actions, CompactMode implementation for space optimization
- **3.0.3**: Major expansion - 11 total agents, comprehensive batch processing with Australian Medical Review, advanced patient session management, enhanced UI components
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

# Development server management
./dev                                    # Ultra-short startup: all servers + dual models
npm run dev:start                        # Alternative npm script for ./dev
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
│   │   ├── specialized/                 # Medical specialty agents (11 total)
│   │   │   ├── TAVIAgent.ts + TAVISystemPrompts.ts
│   │   │   ├── AngiogramPCIAgent.ts + AngiogramPCISystemPrompts.ts  
│   │   │   ├── MTEERAgent.ts + MTEERSystemPrompts.ts
│   │   │   ├── PFOClosureAgent.ts + PFOClosureSystemPrompts.ts
│   │   │   ├── RightHeartCathAgent.ts + RightHeartCathSystemPrompts.ts
│   │   │   ├── QuickLetterAgent.ts + QuickLetterSystemPrompts.ts
│   │   │   ├── ConsultationAgent.ts
│   │   │   ├── InvestigationSummaryAgent.ts + InvestigationSummarySystemPrompts.ts
│   │   │   ├── AusMedicalReviewAgent.ts + AusMedicalReviewSystemPrompts.ts
│   │   │   ├── BackgroundAgent.ts + BackgroundSystemPrompts.ts
│   │   │   ├── MedicationAgent.ts + MedicationSystemPrompts.ts
│   │   │   └── index.ts                 # Agent exports
│   │   └── router/
│   │       └── AgentRouter.ts           # Direct agent routing
│   ├── options/                         # Full-page settings interface
│   │   ├── index.html                   # Options page HTML entry point
│   │   ├── index.tsx                    # React entry point for options
│   │   ├── OptionsApp.tsx               # Main options application
│   │   └── components/                  # Options-specific components
│   │       ├── FullPageOptimizationPanel.tsx  # Expanded optimization interface
│   │       └── FullPageCorrectionsViewer.tsx  # Enhanced transcription management
│   ├── orchestrators/                   # Advanced workflow orchestration
│   │   ├── BatchAIReviewOrchestrator.ts # Multi-patient processing
│   │   ├── CheckpointManager.ts         # Process state management
│   │   └── MetricsCollector.ts          # Performance analytics
│   ├── services/                        # Core service layer
│   │   ├── LMStudioService.ts          # AI model integration
│   │   ├── TranscriptionService.ts      # Audio processing orchestration
│   │   ├── WhisperServerService.ts      # MLX Whisper server management
│   │   ├── AgentFactory.ts             # Agent instantiation and processing
│   │   ├── LazyAgentFactory.ts         # Lazy-loaded agent management
│   │   ├── NotificationService.ts       # System notifications
│   │   └── ToastService.ts             # UI toast notifications
│   ├── config/                         # Configuration management
│   │   ├── workflowConfig.ts           # Workflow button configuration
│   │   ├── appointmentPresets.ts       # Appointment type configurations
│   │   └── recordingPrompts.ts         # Agent-specific recording prompts
│   ├── hooks/                          # React hooks
│   │   ├── useRecorder.ts              # Audio recording hook with voice activity
│   │   ├── useAppState.ts              # Optimized state management with useReducer
│   │   ├── useModelStatus.ts           # Service status monitoring
│   │   └── useAIProcessing.ts          # AI processing coordination
│   ├── sidepanel/                      # Main React UI
│   │   ├── OptimizedApp.tsx            # Main application component (useReducer-based)
│   │   ├── components/                 # UI components
│   │   │   ├── WorkflowButtons.tsx     # Workflow selection interface
│   │   │   ├── PatientSelectionModal.tsx # Multi-patient selection
│   │   │   ├── SessionsPanel.tsx       # Patient session management
│   │   │   ├── AIReviewSection.tsx     # Australian medical review display
│   │   │   ├── FieldIngestionOverlay.tsx # Enhanced EMR integration
│   │   │   ├── ProcessingPhaseIndicator.tsx # Detailed progress tracking
│   │   │   ├── TranscriptionDisplay.tsx # Audio transcription display
│   │   │   ├── results/
│   │   │   │   ├── OptimizedResultsPanel.tsx  # Optimized medical report results
│   │   │   │   ├── AIReviewCards.tsx   # Structured review display
│   │   │   │   └── [other results components]
│   │   │   ├── QuickActions.tsx        # EMR quick actions
│   │   │   ├── ModelStatus.tsx         # Service status monitoring
│   │   │   └── [other components]
│   │   ├── hooks/                      # UI-specific hooks
│   │   └── styles/                     # CSS and styling
│   ├── content/                        # EMR integration
│   │   └── content-script.ts          # Xestro EMR field detection
│   ├── background/                     # Chrome extension service worker
│   │   └── service-worker.ts          # Extension background processing
│   ├── utils/                         # Utility functions
│   │   ├── Logger.ts                  # Structured logging
│   │   ├── CacheManager.ts            # Performance caching
│   │   ├── ErrorRecoveryManager.ts    # Advanced error handling
│   │   └── [other utilities]
│   └── types/                         # TypeScript definitions
│       ├── medical.types.ts           # Medical domain types
│       └── BatchProcessingTypes.ts    # Batch processing types
├── whisper-server.py                  # MLX Whisper transcription server
├── start-whisper-server.sh           # Server startup script
├── auto-start-whisper.sh             # Development auto-start
├── requirements-whisper.txt          # Python dependencies
├── WHISPER_SETUP.md                  # Transcription setup guide
├── tests/                            # Comprehensive testing
│   ├── e2e/                         # Playwright end-to-end tests (11 test suites)
│   │   ├── 00-basic-extension-test.spec.ts
│   │   ├── 01-extension-loading.spec.ts
│   │   ├── 02-voice-recording.spec.ts
│   │   ├── 03-medical-agents.spec.ts
│   │   ├── 04-lmstudio-integration.spec.ts
│   │   ├── 05-full-workflow.spec.ts  # Complete workflow testing
│   │   ├── 06-performance.spec.ts
│   │   ├── 07-all-workflows.spec.ts
│   │   ├── 08-output-validation.spec.ts
│   │   ├── 09-ui-components.spec.ts
│   │   ├── 10-batch-processing.spec.ts
│   │   └── 11-error-scenarios.spec.ts
│   └── helpers/                     # Test utilities
│       ├── ExtensionTestHelper.ts   # Extension testing utilities
│       ├── LMStudioMock.ts         # Mock AI services
│       ├── TestOrchestrator.ts     # Advanced test coordination
│       ├── AutoFixOrchestrator.ts  # Automated error recovery testing
│       ├── MedicalReportValidator.ts # Clinical accuracy validation
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
- **Report Generation**: 
  - Investigation Summary: 1-3 seconds (google/gemma-3n-e4b lightweight model)
  - Complex Procedures: 3-8 seconds (MedGemma-27b MLX 4-bit)
- **Workflow Selection**: Instant (direct selection, no classification)
- **Batch Processing**: 5-15 patients per minute (depending on data complexity)
- **Memory Usage**: ~200MB extension + ~8GB model memory (11 agents)
- **Bundle Size**: ~1.5MB (optimized with code splitting)
- **Cold Start**: 30-60 seconds first transcription (model loading)
- **Warm Performance**: <2 seconds transcription + <5 seconds generation
- **Australian Review**: 2-4 seconds per patient (guideline compliance checking)

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

## UI Design System

### Monochrome Clean Design System (v3.2.0 - September 2025)

The application now uses a **clean celebratory stat-card + Apple-style blueprint line art** aesthetic with strict monochrome UI design principles.

#### Design Principles
- **Monochrome Foundation**: Primary design uses grayscale with sparing color usage only for semantic meaning
- **Minimalist Approach**: Clean, uncluttered interfaces with generous whitespace
- **Celebratory Elements**: Subtle stat-card styling for key metrics and results
- **Apple Blueprint Inspiration**: Precise line work, technical drawing aesthetics
- **Medical Professionalism**: Clean, trustworthy interface appropriate for healthcare settings

#### Color Palette
```css
/* Primary Monochrome Palette */
--surface-primary: #ffffff;      /* Pure white backgrounds */
--surface-secondary: #f8f9fa;    /* Light gray secondary backgrounds */
--surface-tertiary: #f1f3f4;     /* Subtle gray for cards */
--ink-primary: #1f2937;          /* Dark gray primary text */
--ink-secondary: #6b7280;        /* Medium gray secondary text */
--ink-tertiary: #9ca3af;         /* Light gray tertiary text */

/* Semantic Colors (Sparing Usage) */
--accent-success: #10b981;       /* Success states only */
--accent-warning: #f59e0b;       /* Warning states only */
--accent-error: #ef4444;         /* Error states only */
--accent-info: #3b82f6;          /* Recording/active states only */

/* Blueprint Line Art */
--line-primary: #e5e7eb;         /* Primary border color */
--line-secondary: #d1d5db;       /* Secondary border color */
--line-accent: #9ca3af;          /* Accent lines for technical elements */
```

#### Component Design Patterns

**Button Styles:**
```css
/* Primary Button - Monochrome with subtle elevation */
.mono-button-primary {
  @apply bg-white border-2 border-gray-300 text-gray-900 
         hover:border-gray-400 hover:shadow-sm 
         transition-all duration-200 ease-out
         font-medium rounded-lg px-4 py-2;
}

/* Secondary Button - Minimal ghost style */
.mono-button-secondary {
  @apply bg-transparent border border-gray-200 text-gray-700
         hover:bg-gray-50 hover:border-gray-300
         transition-all duration-200 ease-out
         rounded-lg px-3 py-1.5;
}

/* Icon Button - Subtle and minimal */
.mono-button-icon {
  @apply bg-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50
         transition-all duration-200 ease-out
         rounded-md p-2;
}
```

**Card Styles:**
```css
/* Stat Card - Celebratory but clean */
.mono-stat-card {
  @apply bg-white border border-gray-200 rounded-xl shadow-sm
         hover:shadow-md transition-all duration-300 ease-out
         p-6 space-y-4;
}

/* Content Card - Minimal container */
.mono-content-card {
  @apply bg-white border border-gray-100 rounded-lg
         p-4 space-y-3;
}

/* Blueprint Card - Technical drawing style */
.mono-blueprint-card {
  @apply bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg
         p-4 relative;
}
```

**Typography Scale:**
```css
/* Monochrome text hierarchy */
.mono-heading-xl { @apply text-3xl font-bold text-gray-900 tracking-tight; }
.mono-heading-lg { @apply text-2xl font-semibold text-gray-900; }
.mono-heading-md { @apply text-xl font-semibold text-gray-800; }
.mono-heading-sm { @apply text-lg font-medium text-gray-800; }
.mono-body-lg { @apply text-base text-gray-700 leading-relaxed; }
.mono-body-md { @apply text-sm text-gray-600; }
.mono-body-sm { @apply text-xs text-gray-500; }
.mono-label { @apply text-xs font-medium text-gray-800 uppercase tracking-wide; }
```

#### Animation Guidelines
- **Timing**: Medical-appropriate timing (300-500ms) for professional feel
- **Easing**: `ease-out` for natural, non-distracting motion
- **Subtlety**: Gentle animations that enhance usability without drawing attention
- **Purpose**: Animations should provide visual feedback and guide user flow

#### Implementation Notes
- **No Glass Effects**: Removed all glassmorphism styling (`glass-button`, backdrop-blur, etc.)
- **Subtle Shadows**: Minimal shadow usage for depth, primarily on hover states
- **Clean Borders**: Precise 1-2px borders in grayscale tones
- **Generous Spacing**: Adequate padding and margins for breathing room
- **Medical Context**: Professional appearance suitable for healthcare environments

#### Color Usage Guidelines
- **Primary UI**: Strictly monochrome (grays and whites)
- **Semantic Only**: Color reserved for:
  - Success indicators (green)
  - Warning states (amber) 
  - Error messages (red)
  - Recording/active states (blue)
- **No Decorative Color**: No color used purely for aesthetic purposes

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
- **11 Medical Agents**: Complete expansion including TAVI, AngiogramPCI, mTEER, PFO Closure, Right Heart Cath, Quick Letter, Consultation, Investigation Summary, Australian Medical Review, Background, and Medication agents
- **Full-Page Settings System**: Chrome extension options page with enhanced transcription management, professional data table, advanced filtering/sorting/pagination, bulk operations
- **SystemPrompts Architecture**: Dedicated medical knowledge files per agent with Australian compliance
- **Batch Processing Capabilities**: Multi-patient clinical review workflows with Australian guideline integration
- **Advanced Session Management**: Patient session tracking with comprehensive state management
- **Enhanced UI Components**: PatientSelectionModal, SessionsPanel, AIReviewSection, ProcessingPhaseIndicator, and full-page settings interface
- **MLX Whisper Integration**: High-performance local transcription
- **Direct Workflow Selection**: No classification step required
- **Comprehensive Testing**: 11 E2E test suites with advanced orchestration
- **EMR Integration**: Enhanced Xestro field detection and auto-insertion
- **Error Recovery**: Intelligent error handling and user guidance
- **Real-time Monitoring**: Service status and health checking
- **Australian Compliance**: Heart Foundation guideline integration and local medical standards
- **Professional Design System**: Monochrome medical-appropriate interface with responsive layout

### Development Roadmap
- **Additional Procedure Agents**: TTEER, ASD Closure, PVL Plug, Bypass Graft (defined in AgentType but not yet implemented)
- **Enhanced EMR Support**: Epic and Cerner deep integration beyond Xestro
- **Advanced Batch Features**: Multi-appointment type processing and workflow optimization
- **Custom Agent Training**: User-specific medical templates and personalization
- **Performance Optimization**: Model quantization and caching improvements for 11-agent architecture
- **Multi-language Support**: Non-English medical transcription and international guideline compliance
- **Cloud Integration**: Optional secure cloud backup for enterprise deployments

## Key Dependencies

### Runtime Stack
- **MLX Whisper**: Apple Silicon-optimized transcription (`mlx-whisper`)
- **LMStudio**: Local AI model serving (MedGemma-27b MLX 4-bit only)
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
# - Download MedGemma-27b MLX model
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

**Current Version**: 3.2.1
**Last Updated**: September 2025  
**Architecture**: 11-agent medical AI system with full-page settings interface, enhanced transcription management, unified recording interface, batch processing capabilities, Australian compliance, and advanced session management
**Primary Focus**: Comprehensive medical documentation automation with professional full-screen settings, advanced transcription management, consistent UX, multi-patient processing, and local-first AI
**Medical Accuracy**: Clinically validated system prompts with Australian guideline compliance, universal recording guidance, and enhanced data management capabilities