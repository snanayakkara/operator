# DSPy + GEPA Integration Guide

This guide covers the fully implemented DSPy (Declarative Self-improving Python) integration with GEPA (Generalized Evolutionary Prompt Augmentation) optimization for the Operator Chrome Extension.

## Overview

The DSPy + GEPA integration provides a complete optimization layer for medical report generation that:

- **HTTP Server Architecture**: Chrome extension communicates with Flask-based DSPy server
- **Full GEPA Implementation**: Real evolutionary prompt optimization with medical rubric scoring
- **11 Medical Agents Supported**: All agents now have complete DSPy predictor implementations
- **3-Server Architecture**: LMStudio (1234) + Whisper (8001) + DSPy (8002)
- **Maintains privacy** with localhost-only processing
- **Health Monitoring Integration**: DSPy server status integrated with existing service monitoring
- **Enables continuous improvement** through evaluation and optimization

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  Chrome Extension Layer                        │
├─────────────────────────────────────────────────────────────────┤
│  LMStudioService.processWithAgent()                            │
│         │                                                       │
│         ▼                                                       │
│  DSPyService.processWithDSPy() ──HTTP──┐                       │
│         │                               │                       │
│         ▼                               ▼                       │
│  ┌─────────────────┐            ┌─────────────────┐             │
│  │ DSPy HTTP Client│            │ Direct LMStudio │             │
│  │ (port 8002)     │            │   (Fallback)    │             │
│  └─────────────────┘            └─────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
           │ HTTP Requests
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   DSPy HTTP Server (Flask)                     │
├─────────────────────────────────────────────────────────────────┤
│  dspy-server.py (localhost:8002)                               │
│  ├── /v1/dspy/process          │ Medical report generation      │
│  ├── /v1/dspy/evaluate         │ Quality evaluation            │
│  ├── /v1/dspy/optimize         │ GEPA optimization             │
│  ├── /v1/dspy/status           │ Server health monitoring      │
│  └── /v1/health                │ Service status endpoint       │
└─────────────────────────────────────────────────────────────────┘
           │ Uses Python DSPy
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Python DSPy Layer (llm/)                  │
├─────────────────────────────────────────────────────────────────┤
│  signatures.py     │ Complete typed DSPy signatures (11 agents)│
│  predictors.py     │ Full medical predictors with system prompts│
│  evaluate.py       │ Medical rubric evaluation framework      │
│  optim_gepa.py     │ Real GEPA optimization implementation     │
│  dspy_config.py    │ Configuration management                  │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Environment Setup

```bash
# Install Python dependencies for DSPy server
pip install -r requirements-dspy.txt

# Verify DSPy installation
python -c "import dspy; print('DSPy installed successfully')"
```

### 2. Server Management

The complete system requires three servers running simultaneously:

```bash
# Ultra-short startup command - starts all servers with dual models
./dev

# Alternative npm script
npm run dev:start

# Or start individually:
./start-whisper-server.sh  # MLX Whisper on port 8001
./start-dspy-server.sh     # DSPy server on port 8002
# LMStudio via CLI with dual models: lms server start && lms load [models]
```

### 3. Server Status Verification

```bash
# Check all server health
curl http://localhost:8001/v1/health  # Whisper server
curl http://localhost:8002/v1/health  # DSPy server
curl http://localhost:1234/v1/models  # LMStudio

# Check DSPy server status with stats
curl http://localhost:8002/v1/dspy/status
```

### 4. Enable DSPy Processing

DSPy processing is controlled by environment variables:

```bash
# Enable DSPy globally
export USE_DSPY=true

# Enable for specific tasks (examples)
npm run eval:quick-letter    # Quick letter evaluation
npm run eval:angiogram       # Angiogram evaluation  
npm run optim:quick-letter   # GEPA optimization
```

### 5. Verify Integration

The Chrome extension automatically detects DSPy server health. Check status in the extension:

```typescript
// Browser console verification
const modelStatus = await chrome.storage.session.get(['modelStatus']);
console.log('DSPy Server Status:', modelStatus.modelStatus.dspyServer);

// Should show:
// {
//   running: true,
//   ready: true, 
//   port: 8002,
//   lastChecked: timestamp,
//   stats: { requests_processed: N, errors_encountered: 0 }
// }
```

## Usage Patterns

### Medical Report Generation

When USE_DSPY=true, processing automatically routes through the HTTP server:

```typescript
// Extension code remains unchanged - DSPy integration is transparent
const result = await lmStudioService.processWithAgent(
  systemPrompt,
  userTranscript,
  'angiogram-pci'  // Any of the 11 supported agent types
);

// DSPy processing flow:
// 1. DSPyService.processWithDSPy() sends HTTP request to localhost:8002
// 2. Flask server processes using real DSPy predictors with medical rubrics
// 3. Response returns optimized medical report
// 4. Fallback to direct LMStudio if DSPy server unavailable
```

### Supported Medical Agents (11 Total)

All medical agents now have complete DSPy predictor implementations:

- **angiogram-pci**: Cardiac catheterization and PCI procedures
- **quick-letter**: Medical correspondence and letters  
- **tavi**: TAVI/TAVR procedure documentation
- **consultation**: Comprehensive medical consultations
- **investigation-summary**: Diagnostic test result formatting
- **medication**: Medication review and analysis
- **background**: Patient medical history summaries
- **mteer**: MitraClip/PASCAL edge-to-edge repair
- **pfo-closure**: Patent Foramen Ovale closure procedures
- **right-heart-cath**: Right heart catheterization
- **ai-medical-review**: Australian guideline compliance

### Evaluation Framework

Run comprehensive evaluations using the HTTP server:

```bash
# Evaluate specific agents with real DSPy
USE_DSPY=true npm run eval:quick-letter
USE_DSPY=true npm run eval:angiogram  
USE_DSPY=true npm run eval:tavi
USE_DSPY=true npm run eval:consultation
USE_DSPY=true npm run eval:investigation-summary

# Direct Python evaluation
USE_DSPY=true python -m llm.evaluate --task quick-letter
USE_DSPY=true python -m llm.evaluate --task angiogram-pci
```

Example evaluation output with medical rubric scoring:

```json
{
  "task": "angiogram-pci",
  "total_examples": 12,
  "average_score": 89.2,
  "passed": 11,
  "failed": 1,
  "rubric_breakdown": {
    "has_TIMI_flow": 0.95,
    "has_stenosis_quantification": 0.87,
    "narrative_flow": 0.92,
    "clinical_accuracy": 0.91,
    "australian_terminology": 0.86
  },
  "processing_time_avg": 4.2,
  "dspy_server_stats": {
    "requests_processed": 12,
    "cache_hits": 3,
    "optimization_applied": true
  }
}
```

### GEPA Optimization (Fully Implemented)

Run real evolutionary prompt optimization with medical feedback:

```bash
# GEPA optimization with 5 iterations
USE_DSPY=true npm run optim:quick-letter
USE_DSPY=true npm run optim:angiogram
USE_DSPY=true npm run optim:tavi

# With human-in-the-loop feedback
USE_DSPY=true python -m llm.optim_gepa --task quick-letter --iterations 5 --with-human
USE_DSPY=true python -m llm.optim_gepa --task angiogram-pci --iterations 3 --with-human
USE_DSPY=true python -m llm.optim_gepa --task consultation --iterations 3 --with-human
```

Real GEPA optimization process:

1. **Baseline Evaluation**: Current DSPy predictor performance on dev set
2. **Failure Analysis**: Identify specific medical rubric shortcomings  
3. **Evolutionary Candidates**: DSPy GEPA generates improved prompt variations
4. **Medical Validation**: Test candidates against clinical accuracy rubrics
5. **Human Expert Review**: Optional clinician feedback on medical accuracy
6. **Best Selection**: Choose optimal prompt based on combined scores
7. **Predictor Update**: Save optimized predictor with version control

## File Structure

```
operator/
├── HTTP Server Layer
│   ├── dspy-server.py             # Main Flask HTTP server (port 8002)
│   ├── start-dspy-server.sh       # Server startup script with auto-restart
│   ├── dev                        # Ultra-short server startup (all servers + dual models)
│   └── requirements-dspy.txt      # Python dependencies
├── Python DSPy Layer (llm/)
│   ├── __init__.py
│   ├── signatures.py              # Complete DSPy signatures (11 agents)
│   ├── predictors.py              # Full medical predictors with system prompts
│   ├── evaluate.py                # Medical rubric evaluation framework
│   ├── optim_gepa.py              # Real GEPA optimization implementation
│   └── dspy_config.py             # Configuration management
├── TypeScript Integration (src/)
│   ├── services/
│   │   ├── DSPyService.ts         # HTTP client for DSPy server
│   │   └── LMStudioService.ts     # DSPy health monitoring integration
│   └── types/
│       └── medical.types.ts       # DSPyServerStatus interface
├── Server Management Scripts
│   ├── start-whisper-server.sh    # MLX Whisper server (port 8001)
│   ├── start-dspy-server.sh       # DSPy HTTP server (port 8002)
│   └── dev                        # Ultra-short startup for complete environment
├── Package Configuration
│   ├── package.json               # Added DSPy server management scripts
│   │   ├── dspy:server:start      # Start DSPy server
│   │   ├── dspy:server:stop       # Stop DSPy server  
│   │   ├── dev:start              # Ultra-short server startup
│   │   ├── dspy:auto-start        # Alias for ./dev (backward compatibility)
│   │   ├── eval:quick-letter      # Evaluation scripts
│   │   ├── eval:angiogram         # All 11 agents supported
│   │   ├── eval:tavi
│   │   ├── eval:consultation
│   │   ├── eval:investigation-summary
│   │   ├── optim:quick-letter     # GEPA optimization scripts
│   │   ├── optim:angiogram
│   │   └── optim:tavi
├── Development & Testing
│   ├── eval/                      # Evaluation framework (all agents)
│   │   ├── devset/                # Development test sets
│   │   │   ├── angiogram-pci/
│   │   │   ├── quick-letter/
│   │   │   ├── tavi/
│   │   │   ├── consultation/
│   │   │   ├── investigation-summary/
│   │   │   ├── medication/
│   │   │   ├── background/
│   │   │   ├── mteer/
│   │   │   ├── pfo-closure/
│   │   │   ├── right-heart-cath/
│   │   │   └── ai-medical-review/
│   │   └── rubrics/               # Medical rubric scorers
│   │       ├── medical_rubric.py  # Base medical rubric
│   │       ├── angiogram_rubric.py
│   │       ├── letter_rubric.py
│   │       └── tavi_rubric.py
│   └── tests/
│       ├── unit/DSPyService.test.ts
│       ├── integration/dspy-http-server.test.ts
│       └── e2e/12-dspy-integration.spec.ts
└── Documentation
    └── docs/dspy_gepa.md          # This comprehensive guide
```

## Configuration Reference

### Environment Variables

The HTTP server architecture uses environment variables for configuration:

| Variable | Default | Description |
|----------|---------|-------------|
| `USE_DSPY` | `false` | Global DSPy feature flag (enables HTTP routing) |
| `DSPY_SERVER_HOST` | `localhost` | DSPy server hostname |
| `DSPY_SERVER_PORT` | `8002` | DSPy server port |
| `OPENAI_API_BASE` | `http://localhost:1234/v1` | LMStudio endpoint for DSPy predictors |
| `OPENAI_API_KEY` | `local` | API key for LMStudio (can be any value) |
| `DSPY_CACHE_DIR` | `.cache/dspy` | Cache directory for optimization results |
| `DSPY_DEBUG` | `false` | Enable debug logging for DSPy operations |
| `DSPY_TIMEOUT` | `30` | HTTP request timeout in seconds |

### Server Configuration

The DSPy HTTP server (dspy-server.py) configuration:

```python
# Server settings in dspy-server.py
HOST = os.getenv('DSPY_SERVER_HOST', 'localhost')
PORT = int(os.getenv('DSPY_SERVER_PORT', '8002'))
DEBUG_MODE = os.getenv('DSPY_DEBUG', 'false').lower() == 'true'

# LMStudio integration
OPENAI_API_BASE = os.getenv('OPENAI_API_BASE', 'http://localhost:1234/v1')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', 'local')
```

### Chrome Extension Integration

The extension automatically detects server availability and routes requests:

```typescript
// DSPyService configuration in TypeScript
private readonly serverUrl = 'http://localhost:8002';
private readonly defaultTimeout = 30000; // 30 seconds

// Health monitoring integration
dspyServer: {
  running: boolean;
  ready: boolean;
  port: 8002;
  lastChecked: number;
  stats?: {
    requests_processed: number;
    errors_encountered: number;
  }
}
```

### Fully Supported Agents (11 Total)

All medical agents have complete DSPy predictor implementations:

- `angiogram-pci`: Angiogram and PCI procedures ✅
- `quick-letter`: Medical correspondence ✅  
- `tavi`: TAVI/TAVR procedures ✅
- `consultation`: Medical consultations ✅
- `investigation-summary`: Diagnostic test formatting ✅
- `medication`: Medication review and analysis ✅
- `background`: Patient medical history ✅
- `mteer`: MitraClip/PASCAL edge-to-edge repair ✅
- `pfo-closure`: Patent Foramen Ovale closure ✅
- `right-heart-cath`: Right heart catheterization ✅
- `ai-medical-review`: Australian guideline compliance ✅

## Development Workflow

### Adding New Agent Support

1. **Create signature** in `llm/signatures.py`:

```python
class NewAgentSignature(dspy.Signature):
    """Generate medical report for new agent type."""
    transcript: str = dspy.InputField(desc="Medical dictation transcript")
    report_text: str = dspy.OutputField(desc="Formatted medical report")
```

2. **Create predictor** in `llm/predictors.py`:

```python
class NewAgentPredictor(MedicalPredictor):
    def __init__(self):
        super().__init__(NewAgentSignature, 'new-agent')
        self.system_instructions = """[Your existing system prompt]"""
```

3. **Create evaluation set** in `eval/devset/new-agent/`:

```json
{
  "id": "ex001_simple",
  "task": "new-agent",
  "transcript": "Sample medical dictation...",
  "expected_elements": ["key element 1", "key element 2"],
  "rubric_criteria": {
    "has_key_element": true,
    "min_score": 75
  }
}
```

4. **Add rubric scorer** in `eval/rubrics/new_agent_rubric.py`

5. **Enable in configuration**:

```yaml
agents:
  new-agent:
    enabled: true
    max_tokens: 6000
    temperature: 0.3
```

### Testing

```bash
# Unit tests
npm run test:unit

# Integration tests  
npm run test:integration

# E2E tests including DSPy
npm run test:e2e

# Python layer tests
python -m pytest llm/tests/
```

## Performance Characteristics

### Processing Times (Apple Silicon)

| Agent Type | Direct LMStudio | DSPy Layer | Optimization Overhead |
|------------|-----------------|------------|---------------------|
| `angiogram-pci` | 3-8 seconds | 4-10 seconds | +1-2 seconds |
| `quick-letter` | 1-3 seconds | 2-4 seconds | +1 second |
| `tavi` | 8-15 seconds | 10-18 seconds | +2-3 seconds |

### Memory Usage

- **DSPy Cache**: ~50-100MB per agent
- **Python Process**: ~200-500MB during processing
- **Model Memory**: No additional overhead (uses same LMStudio model)

### Optimization Times

- **Evaluation**: 30 seconds - 2 minutes per dev set
- **GEPA Optimization**: 5-30 minutes depending on iterations
- **Human Feedback**: Interactive, varies by reviewer time

## Troubleshooting

### Common Issues

**1. DSPy Server Not Running**
```
Error: Connection refused to localhost:8002
```
Solution:
```bash
# Check server status
curl http://localhost:8002/v1/health

# Start DSPy server
./start-dspy-server.sh start

# Or check server logs
./start-dspy-server.sh logs
```

**2. DSPy Server Health Issues**
```
Error: DSPy server not ready
```
Solution:
```bash
# Check detailed server status
curl http://localhost:8002/v1/dspy/status

# Restart server with debug logging
DSPY_DEBUG=true ./start-dspy-server.sh restart

# Check server logs for errors
tail -f dspy-server.log
```

**3. Python Dependencies Missing**
```
Error: No module named 'dspy' or Flask import error
```
Solution:
```bash
# Install all DSPy dependencies
pip install -r requirements-dspy.txt

# Verify DSPy installation
python -c "import dspy; print('DSPy available')"
python -c "import flask; print('Flask available')"

# Check Python environment
which python
python --version
```

**4. LMStudio Connection Issues**
```
Error: Failed to connect to LMStudio at localhost:1234
```
Solution:
```bash
# Verify LMStudio is running
curl http://localhost:1234/v1/models

# Check if model is loaded
curl http://localhost:1234/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "test", "messages": [{"role": "user", "content": "test"}]}'

# Start LMStudio and load MedGemma model
```

**5. Three-Server Startup Issues**
```
Error: Whisper or DSPy server startup failed
```
Solution:
```bash
# Use ultra-short startup script
./dev

# Or start servers individually with status checking
./start-whisper-server.sh &
sleep 5
./start-dspy-server.sh start &
sleep 5

# Verify all servers running
curl http://localhost:8001/v1/health  # Whisper
curl http://localhost:8002/v1/health  # DSPy  
curl http://localhost:1234/v1/models  # LMStudio
```

**6. Chrome Extension Integration Issues**
```
Error: DSPy processing failed or timeout
```
Solution:
```typescript
// Check extension integration in browser console
const modelStatus = await chrome.storage.session.get(['modelStatus']);
console.log('All Server Status:', modelStatus.modelStatus);

// Manual DSPy test
const dspyService = DSPyService.getInstance();
const testResult = await dspyService.processWithDSPy('quick-letter', 'test transcript');
console.log('DSPy Test Result:', testResult);
```

### Debugging

Enable comprehensive debugging:

```bash
# Enable debug mode for DSPy server
export DSPY_DEBUG=true
./start-dspy-server.sh restart

# Monitor server requests in real-time
tail -f dspy-server.log | grep -E "(ERROR|DEBUG|INFO)"

# Test individual components
curl -X POST http://localhost:8002/v1/dspy/process \
  -H "Content-Type: application/json" \
  -d '{
    "agent_type": "quick-letter",
    "transcript": "This is a test medical transcript."
  }'
```

Check Python DSPy layer directly:

```bash
# Test signature registry
python -c "from llm.signatures import list_available_signatures; list_available_signatures()"

# Test predictor instantiation
python -c "
from llm.predictors import get_predictor
predictor = get_predictor('quick-letter')
print(f'Predictor ready: {predictor is not None}')
"

# Test evaluation framework
USE_DSPY=true python -m llm.evaluate --task quick-letter --debug

# Test GEPA optimization
USE_DSPY=true python -m llm.optim_gepa --task quick-letter --iterations 1 --debug
```

### Server Status Monitoring

Monitor all three servers:

```bash
# Create monitoring script
cat > monitor-servers.sh << 'EOF'
#!/bin/bash
echo "=== Server Status ==="
echo "Whisper (8001): $(curl -s http://localhost:8001/v1/health | jq -r '.status' 2>/dev/null || echo 'DOWN')"
echo "DSPy (8002): $(curl -s http://localhost:8002/v1/health | jq -r '.status' 2>/dev/null || echo 'DOWN')"  
echo "LMStudio (1234): $(curl -s http://localhost:1234/v1/models | jq '.data | length' 2>/dev/null || echo 'DOWN')"
echo "===================="
EOF
chmod +x monitor-servers.sh

# Run monitoring
./monitor-servers.sh
```

## Security & Privacy

### Localhost-Only Processing

All DSPy processing occurs locally:

- **LLM API**: `http://localhost:1234/v1` (LMStudio)
- **Python Layer**: Local process execution
- **No External Calls**: Zero external API dependencies
- **HIPAA Compliance**: Patient data never leaves local machine

### Safety Checks

The system includes multiple safety mechanisms:

```python
def verify_localhost_only(api_base: str) -> bool:
    """Ensure API base is localhost only for privacy compliance."""
    parsed = urlparse(api_base)
    return parsed.hostname in ['localhost', '127.0.0.1', '::1']
```

### Data Handling

- **Transcripts**: Processed in memory, not persisted
- **Cache**: Only optimization metadata, no patient data
- **Logs**: Medical content excluded from logs
- **Cleanup**: Automatic memory cleanup after processing

## Migration & Rollback

### Safe Rollback

DSPy integration is designed for zero-risk rollback:

```bash
# Disable DSPy
export USE_DSPY=false

# Or in config
use_dspy: false

# Extension immediately falls back to direct LMStudio processing
```

### Gradual Migration

Recommended migration path:

1. Pilot DSPy on one agent (`quick-letter`)
2. Run evaluations, verify quality
3. Expand to complex agents (`angiogram-pci`)
4. Add optimization workflows
5. Enable human-in-the-loop feedback

### Data Migration

No data migration required:

- Existing prompts are wrapped, not replaced
- Configuration is additive
- No database schema changes
- Browser extension continues to function unchanged

## API Reference

### DSPyService

```typescript
class DSPyService {
  // Configuration
  static getInstance(): DSPyService
  loadConfig(): Promise<DSPyConfig>
  
  // Processing
  isDSPyEnabled(agentType?: string): Promise<boolean>
  processWithDSPy(agentType: string, transcript: string, options?: ProcessingOptions): Promise<DSPyResult>
  
  // Evaluation & Optimization
  runEvaluation(agentType: string, options?: EvaluationOptions): Promise<DSPyResult>
  runOptimization(agentType: string, options?: OptimizationOptions): Promise<DSPyResult>
  
  // Environment
  verifyEnvironment(): Promise<EnvironmentStatus>
}
```

### Configuration Types

```typescript
interface DSPyConfig {
  api_base: string;
  api_key: string;
  model_name: string;
  use_dspy: boolean;
  cache_dir: string;
  agents: Record<string, AgentConfig>;
}

interface AgentConfig {
  enabled: boolean;
  model_override?: string;
  max_tokens: number;
  temperature: number;
  timeout_ms?: number;
}
```

### Processing Results

```typescript
interface DSPyResult {
  success: boolean;
  result?: string;
  error?: string;
  processing_time?: number;
  cached?: boolean;
}
```

## Contributing

### Code Standards

- **TypeScript**: Strict mode enabled
- **Python**: Type hints required
- **Testing**: 90%+ coverage for new DSPy code
- **Documentation**: All public APIs documented
- **Privacy**: Localhost-only processing enforced

### Pull Request Process

1. **Feature Branch**: `feature/dspy-agent-support`
2. **Tests**: Add unit, integration, and E2E tests
3. **Documentation**: Update this guide for new features
4. **Privacy Review**: Ensure localhost-only processing
5. **Backwards Compatibility**: Verify existing workflows unaffected

### Evaluation Standards

New agents must meet evaluation criteria:

- **Medical Accuracy**: 85%+ rubric score
- **Performance**: <2x direct LMStudio processing time
- **Reliability**: 95%+ success rate on dev set
- **Fallback**: Graceful degradation on errors

## Roadmap

### Phase 1 (COMPLETED ✅)
- ✅ Complete DSPy HTTP server architecture with Flask endpoints
- ✅ Real GEPA optimization implementation with evolutionary algorithms
- ✅ Full medical agent support (11 agents with complete predictors)
- ✅ Medical rubric evaluation framework with clinical scoring
- ✅ Health monitoring integration with Chrome extension
- ✅ Server management scripts with auto-restart capabilities
- ✅ Comprehensive troubleshooting and debugging tools

### Phase 2 (Current - Production Optimization)
- 🔄 Performance tuning for medical report generation speeds  
- 🔄 Advanced medical rubric refinement with clinical validation
- 🔄 Human-in-the-loop feedback UI integration within extension
- 🔄 Multi-patient optimization workflows with batch processing
- 🔄 Extended evaluation datasets for all 11 medical agents

### Advanced Features (Q2 2025)
- 📋 Multi-agent ensemble optimization for complex procedures
- 📋 Custom medical rubric creation for specialized use cases  
- 📋 Optimization history tracking with version control
- 📋 A/B testing framework for prompt effectiveness
- 📋 Advanced medical terminology expansion and refinement

### Research & Development (Future)
- 📋 Federated learning with privacy-preserving medical optimization
- 📋 Custom medical model fine-tuning on institution-specific data
- 📋 Advanced prompt versioning with clinical validation workflows
- 📋 Collaborative optimization across medical institutions
- 📋 Real-time quality monitoring and adaptive optimization

### Implementation Status Summary

**✅ FULLY IMPLEMENTED:**
- DSPy framework integration with HTTP server architecture
- GEPA evolutionary prompt optimization with medical rubrics  
- Complete predictor implementations for all 11 medical agents
- Health monitoring integration with Chrome extension services
- Comprehensive evaluation and optimization workflows
- Server management, debugging, and troubleshooting tools

**🔄 IN PROGRESS:**
- Production performance optimization and clinical validation
- Advanced medical rubric refinement with expert feedback
- Extended evaluation datasets and benchmark development

**📋 PLANNED:**
- Advanced multi-agent optimization strategies
- Custom medical rubric creation and validation tools
- Enterprise-level features for medical institutions

---

For technical support or questions, refer to the main [CLAUDE.md](../CLAUDE.md) development guide or create an issue in the repository.
