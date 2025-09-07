# DSPy Integration Rollback Plan

## 🚨 Emergency Rollback Procedures

### Immediate Rollback (< 30 seconds)

#### Option 1: Environment Variable Override
```bash
export USE_DSPY=false
```

#### Option 2: Configuration File Disable
Edit `config/llm.yaml`:
```yaml
use_dspy: false
```

#### Option 3: Browser Console Override
```javascript
// In browser console
localStorage.setItem('dspy_override', 'disabled');
location.reload();
```

**Result**: Extension immediately reverts to direct LMStudio processing with zero downtime.

---

## 🔧 Systematic Rollback Procedures

### Level 1: Feature Disable (Recommended)

**When to use**: Minor issues, want to keep DSPy code but disable functionality

```bash
# 1. Disable globally
export USE_DSPY=false

# 2. Or disable specific agents
# Edit config/llm.yaml:
agents:
  angiogram-pci:
    enabled: false
  quick-letter:
    enabled: false

# 3. Verify fallback
curl -X POST http://localhost:1234/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "lmstudio-community/medgemma-27b-text-it-MLX-4bit", "messages": [{"role": "user", "content": "Test"}]}'
```

**Impact**: Zero impact on existing workflows, DSPy code remains for future use.

### Level 2: Service Isolation (If TypeScript Issues)

**When to use**: TypeScript compilation errors or service integration issues

```bash
# 1. Comment out DSPy import in LMStudioService.ts
# Line 9: // import { DSPyService } from './DSPyService';

# 2. Comment out DSPy integration block (lines 347-388)
# 3. Rebuild extension
npm run build

# 4. Reload extension in Chrome
```

**Impact**: Removes DSPy integration from build, guarantees no interference with existing functionality.

### Level 3: File Removal (If Python Dependencies Issue)

**When to use**: Python dependency conflicts or environment issues

```bash
# 1. Remove Python DSPy files
rm -rf llm/
rm requirements-dspy.txt

# 2. Remove TypeScript service
rm src/services/DSPyService.ts

# 3. Remove DSPy import from LMStudioService
sed -i '' '/import.*DSPyService/d' src/services/LMStudioService.ts

# 4. Remove DSPy integration block from LMStudioService
# (Lines 347-388 in processWithAgent method)

# 5. Rebuild
npm run build
```

**Impact**: Complete removal of DSPy functionality, extension returns to pre-integration state.

### Level 4: Git Revert (Nuclear Option)

**When to use**: Major integration issues, need immediate return to previous version

```bash
# 1. Identify commit hash before DSPy integration
git log --oneline | grep -v "dspy\|DSPy\|GEPA"

# 2. Create rollback branch
git checkout -b rollback-dspy-integration

# 3. Revert to pre-integration state
git revert <commit-hash>

# 4. Force push if needed (after team approval)
git push origin rollback-dspy-integration --force
```

**Impact**: Complete rollback to previous version, all DSPy changes removed.

---

## 🔍 Verification Procedures

### Post-Rollback Testing Checklist

#### ✅ Extension Loading
- [ ] Extension loads without errors in Chrome DevTools console
- [ ] Side panel opens successfully
- [ ] No TypeScript compilation errors

#### ✅ Core Functionality
- [ ] All workflow buttons visible and clickable
- [ ] Audio recording starts/stops correctly
- [ ] Transcription service functioning (localhost:8001)
- [ ] Report generation working (localhost:1234)

#### ✅ Medical Agents
- [ ] Angiogram/PCI workflow completes successfully
- [ ] Quick Letter workflow generates proper output
- [ ] TAVI workflow (if used) functioning normally
- [ ] Investigation Summary quick action working

#### ✅ Performance
- [ ] Processing times return to pre-DSPy baseline
- [ ] Memory usage normalized (check Chrome Task Manager)
- [ ] No Python processes running in background

#### ✅ Integration Points
- [ ] LMStudio API calls working (check network tab)
- [ ] Whisper transcription working
- [ ] EMR field insertion functioning
- [ ] Clipboard operations working

### Rollback Verification Commands

```bash
# Test LMStudio connectivity
curl http://localhost:1234/v1/models

# Test Whisper service
curl http://localhost:8001/v1/health

# Check for Python DSPy processes
ps aux | grep "llm\|dspy"

# Verify extension build
npm run build && echo "✅ Build successful"

# Run tests to confirm no regressions
npm run test:e2e
```

---

## 🚨 Emergency Contacts & Escalation

### Issue Severity Levels

#### Severity 1: Extension Non-Functional
- **Symptoms**: Extension won't load, white screen, critical errors
- **Action**: Immediate Level 3 or 4 rollback
- **Timeline**: < 5 minutes
- **Escalation**: Notify development team immediately

#### Severity 2: Workflows Failing
- **Symptoms**: Specific workflows fail, partial functionality lost
- **Action**: Level 1 or 2 rollback
- **Timeline**: < 15 minutes
- **Escalation**: Create incident ticket, investigate during business hours

#### Severity 3: Performance Issues
- **Symptoms**: Slow processing, high memory usage, timeout errors
- **Action**: Level 1 rollback (disable DSPy)
- **Timeline**: < 30 minutes
- **Escalation**: Monitor and optimize during next maintenance window

### Communication Template

```
ROLLBACK EXECUTED: DSPy Integration

Severity: [1/2/3]
Rollback Level: [1/2/3/4]
Affected Systems: Chrome Extension - Operator
Root Cause: [Brief description]
Rollback Action: [Specific steps taken]
Verification: [Tests completed]
Timeline: [Start - Complete times]
Next Steps: [Investigation/fix plan]

Status: ✅ System Stable | ⚠️ Monitoring | 🚨 Investigating
```

---

## 🔄 Re-deployment Procedures

### After Rollback: Safe Re-deployment

#### Phase 1: Environment Preparation
```bash
# 1. Verify clean state
python -m llm.dspy_config --verify
npm run build
npm run test:e2e

# 2. Deploy with DSPy disabled
export USE_DSPY=false
```

#### Phase 2: Gradual Re-enabling
```bash
# 1. Enable for single agent
# config/llm.yaml:
agents:
  quick-letter:  # Start with simplest agent
    enabled: true

# 2. Test thoroughly
npm run eval:quick-letter

# 3. Monitor for 24 hours before expanding
```

#### Phase 3: Full Re-deployment
```bash
# 1. Enable all tested agents
export USE_DSPY=true

# 2. Run comprehensive evaluation
npm run eval:angiogram
npm run eval:quick-letter

# 3. Monitor performance metrics
```

---

## 📋 Rollback Decision Matrix

| Issue Type | Recommended Level | Timeline | Risk Level |
|-----------|-------------------|----------|------------|
| Python dependency conflict | Level 3 | 5 minutes | High |
| TypeScript compilation error | Level 2 | 3 minutes | Medium |
| Slow processing times | Level 1 | 1 minute | Low |
| Individual agent failure | Level 1 (agent-specific) | 2 minutes | Low |
| Extension crash | Level 4 | 10 minutes | Critical |
| Memory leak | Level 1 | 1 minute | Medium |
| Evaluation errors | Level 1 | 1 minute | Low |
| Configuration loading issues | Level 1 | 1 minute | Low |

---

## 🧪 Testing Rollback Procedures

### Pre-production Rollback Testing

```bash
# 1. Test Level 1 rollback
export USE_DSPY=false
npm run test:e2e
export USE_DSPY=true

# 2. Test Level 2 rollback (comment DSPy import)
npm run build
npm run test:e2e

# 3. Test Level 3 rollback (file removal)
git stash push -m "DSPy files backup"
npm run build
npm run test:e2e
git stash pop

# 4. Document rollback times and verify functionality
```

### Rollback Performance Benchmarks

- **Level 1 (Environment Variable)**: < 10 seconds
- **Level 2 (Service Isolation)**: < 2 minutes (rebuild time)
- **Level 3 (File Removal)**: < 5 minutes (rebuild + test time)
- **Level 4 (Git Revert)**: < 10 minutes (depends on CI/CD pipeline)

---

## 📝 Post-Rollback Documentation

### Required Documentation After Rollback

1. **Incident Report**: Root cause analysis and resolution steps
2. **Performance Impact**: Comparison of before/during/after metrics  
3. **User Impact Assessment**: Affected workflows and recovery time
4. **Lessons Learned**: Process improvements for future deployments
5. **Re-deployment Plan**: Safe path forward with additional safeguards

### Rollback Success Criteria

- ✅ Extension functionality fully restored
- ✅ Processing times return to baseline
- ✅ All medical workflows operational
- ✅ No residual Python processes
- ✅ Memory usage normalized
- ✅ All tests passing
- ✅ Team notified and aware

---

**Last Updated**: January 2025  
**Tested**: All rollback levels verified  
**Review**: Required before each DSPy deployment  
**Owner**: Medical AI Integration Team