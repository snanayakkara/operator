# DSPy Quick Start Guide

Get DSPy + GEPA optimization running in 5 minutes.

## Prerequisites

- Python 3.11+
- LMStudio running on localhost:1234 with MedGemma model
- Operator Chrome Extension already installed

## 1. Install Dependencies

```bash
pip install -r requirements-dspy.txt
```

## 2. Create Configuration

Create `config/llm.yaml`:

```yaml
api_base: "http://localhost:1234/v1"
api_key: "local"
model_name: "lmstudio-community/medgemma-27b-text-it-MLX-4bit"
use_dspy: false
cache_dir: ".cache/dspy"

agents:
  angiogram-pci:
    enabled: true
    max_tokens: 8000
    temperature: 0.3
  
  quick-letter:
    enabled: true
    max_tokens: 4000
    temperature: 0.2
```

## 3. Verify Setup

```bash
python -m llm.dspy_config --verify
```

Expected output:
```
✅ Configuration loaded successfully
✅ Python environment ready
✅ DSPy installed
⚠️  LLM server not accessible (start LMStudio)
```

## 4. Enable DSPy

```bash
export USE_DSPY=true
```

Or edit `config/llm.yaml`:
```yaml
use_dspy: true
```

## 5. Test Integration

In browser console:
```typescript
const dspyService = DSPyService.getInstance();
const status = await dspyService.verifyEnvironment();
console.log('Ready:', status.ready);
```

## 6. Run Evaluation

```bash
npm run eval:angiogram
```

## 7. Run Optimization

```bash
npm run optim:angiogram
```

## Next Steps

- Read the [full documentation](dspy_gepa.md)
- Add more agents in configuration
- Set up human feedback workflows
- Create custom evaluation sets

## Troubleshooting

**DSPy not working?**
1. Check LMStudio is running: `curl http://localhost:1234/v1/models`
2. Verify Python deps: `pip list | grep dspy`
3. Check config: `python -m llm.dspy_config --verify`

**Need help?** See [troubleshooting guide](dspy_gepa.md#troubleshooting) in the full documentation.