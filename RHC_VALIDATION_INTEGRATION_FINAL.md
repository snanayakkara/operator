# RHC Validation - Final Integration Steps

## Status: 90% Complete

**✅ COMPLETED:**
- Type definitions (RHCFieldCorrection, RHCMissingField, RHCValidationResult, RHCExtractedData)
- Validation prompt (dataValidationPrompt in RightHeartCathSystemPrompts)
- Agent methods (validateAndDetectGaps, applyCorrections, mergeUserInput)
- Updated process() with validation checkpoint
- RHCFieldValidationPrompt.tsx modal component
- useRHCValidation.ts hook
- MedicalContext.userProvidedFields

**⬜ REMAINING (1-2 hours):**
- Integrate modal into RightHeartCathDisplay
- Wire validation detection in useAIProcessing
- Test complete workflow

---

## Quick Integration Guide

### Step 1: Update RightHeartCathDisplay.tsx

**File:** `src/sidepanel/components/results/RightHeartCathDisplay.tsx`

**Add imports:**
```typescript
import { RHCFieldValidationPrompt } from './RHCFieldValidationPrompt';
import { useRHCValidation } from '@/hooks/useRHCValidation';
```

**Add hook in component:**
```typescript
export const RightHeartCathDisplay: React.FC<RightHeartCathDisplayProps> = ({
  results,
  sessionId,
  onUpdate,
  context
}) => {
  // ... existing hooks ...

  // NEW: Validation hook
  const rhcValidation = useRHCValidation();

  // ... rest of component ...
```

**Add modal before closing tag:**
```typescript
  return (
    <div>
      {/* ... existing content ... */}

      {/* NEW: Validation modal */}
      {rhcValidation.showValidationModal && rhcValidation.validationResult && (
        <RHCFieldValidationPrompt
          validation={rhcValidation.validationResult}
          onCancel={rhcValidation.handleValidationCancel}
          onSkip={() => {
            rhcValidation.handleValidationSkip();
            // TODO: Force generation with incomplete data
          }}
          onContinue={(userFields) => {
            rhcValidation.handleValidationContinue(userFields);
            // Re-process with user-provided fields
            if (onReprocess) {
              onReprocess(sessionId, userFields);
            }
          }}
        />
      )}
    </div>
  );
};
```

**Detect validation state:**
```typescript
// In component body, check if report needs validation
useEffect(() => {
  if (rhcReport?.status === 'awaiting_validation' && rhcReport.validationResult) {
    rhcValidation.handleValidationRequired(rhcReport.validationResult);
  }
}, [rhcReport?.status]);
```

### Step 2: Update useAIProcessing.ts

**File:** `src/hooks/useAIProcessing.ts`

**Add import:**
```typescript
import type { RightHeartCathReport } from '@/types/medical.types';
```

**Check validation status after processing:**
```typescript
// In processAudio function, after agent.process() call:

const result = await agent.process(transcription, context);

// NEW: Check if RHC validation required
if (agentType === 'rhc') {
  const rhcResult = result as RightHeartCathReport;
  if (rhcResult.status === 'awaiting_validation') {
    console.log('⚠️ RHC validation required, waiting for user input');
    // Save partial result to session
    updateSession(sessionId, {
      result: rhcResult,
      status: 'awaiting_validation'
    });
    // Don't show error - this is expected behavior
    return;
  }
}

// Continue with normal flow...
```

**Add reprocessing function:**
```typescript
const reprocessWithUserInput = async (
  sessionId: string,
  userFields: Record<string, any>
) => {
  const session = getSession(sessionId);
  if (!session || !session.transcription) {
    console.error('Cannot reprocess: session not found');
    return;
  }

  // Re-run agent with user-provided fields in context
  const updatedContext = {
    ...session.context,
    userProvidedFields: userFields
  };

  // Process again (will skip validation this time)
  await processAudio(
    session.audioBlob,
    session.agentType,
    sessionId,
    updatedContext
  );
};

// Return from hook
return {
  // ... existing returns ...
  reprocessWithUserInput
};
```

### Step 3: Pass reprocess function to Display

**File:** `src/sidepanel/OptimizedApp.tsx` or wherever RightHeartCathDisplay is rendered

```typescript
<RightHeartCathDisplay
  results={session.result}
  sessionId={session.id}
  onUpdate={handleUpdate}
  context={session.context}
  onReprocess={reprocessWithUserInput} // NEW
/>
```

**Update RightHeartCathDisplay props:**
```typescript
interface RightHeartCathDisplayProps {
  // ... existing props ...
  onReprocess?: (sessionId: string, userFields: Record<string, any>) => void; // NEW
}
```

---

## Testing Workflow

### Test Case 1: Auto-Correction (No User Prompt)

**Input:**
```
24-year-old male chronic thromboembolic pulmonary hypertension RA 8-8 mean of 6, RV 65-8, RVEDP 13, PA 65-22, mean of 36, PCWP 6-6 mean of 5, cardiac output by thermodilution 5.4, height 172, weight 116, hemoglobin 122, mixed mean is oxygen saturation 58, arterial oxygen saturation 98, seven French swan GANS right internal jugular access with ultrasound.
```

**Expected:**
1. Regex extraction fails on SvO2 ("mixed mean is")
2. Quick model validates, finds SvO2 = 58, confidence 0.92
3. Auto-corrects SvO2 (>= 0.8 threshold)
4. No modal shown
5. Proceeds directly to calculations + report
6. Delay: ~10-30 seconds for validation

**Check logs:**
```
✅ Auto-corrected patientData.svo2: null → 58 (confidence: 0.92)
🧮 Calculated haemodynamics: { fickCO: 5.23, fickCI: 2.31, ... }
```

### Test Case 2: Missing Critical Field

**Input:**
```
24-year-old male chronic thromboembolic pulmonary hypertension, cardiac output 5.4, weight 116, hemoglobin 122, mixed venous oxygen saturation 58, arterial oxygen saturation 98.
```
*(Notice: missing height)*

**Expected:**
1. Regex extraction succeeds for all fields except height
2. Quick model validates, detects missing height (critical for BSA)
3. Returns status: 'awaiting_validation'
4. Modal shows:
   ```
   ⚠️ Critical Missing Fields
   Height (cm): [____]
   Required for BSA calculation but not mentioned in dictation
   ```
5. User enters 172 cm
6. Clicks "Validate & Continue"
7. Agent re-runs with userProvidedFields: { "patientData.height": 172 }
8. Completes report with Fick calculations

**Check logs:**
```
⚠️ RHC AGENT: Validation requires user input (1 critical fields missing)
[Modal shows]
👤 User provided patientData.height: 172
🧮 Calculated haemodynamics: { bsa: 2.26, fickCO: 5.23, ... }
```

### Test Case 3: Low-Confidence Correction

**Input:**
```
... PA sat 65 ... (ambiguous: PA saturation vs SvO2)
```

**Expected:**
1. Quick model suggests SvO2 = 65 but confidence 0.65
2. Returns status: 'awaiting_validation'
3. Modal shows:
   ```
   ✏️ Suggested Corrections
   Mixed Venous O₂ Saturation (%):
   Model found: 65
   Reason: Interpreted "PA sat 65" as mixed venous saturation
   [Accept] [Keep Original]
   ```
4. User reviews and chooses Accept or Keep Original
5. Proceeds with user choice

---

## Debug Commands

```bash
# Watch console for validation logs
# Look for:
🔍 RHC AGENT: Starting quick model validation...
   - Corrections: X
   - Missing critical: Y
   - Confidence: 0.XX
✅ Auto-corrected patientData.svo2: null → 58
⚠️ RHC AGENT: Validation requires user input

# Check session state
console.log(sessions[sessionId].result.status); // 'awaiting_validation' or 'complete'
console.log(sessions[sessionId].result.validationResult); // RHCValidationResult object

# Check if modal rendered
document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50'); // Should exist if modal shown
```

---

## Edge Cases

### Edge Case 1: Validation Fails (LLM Error)

**Behavior:**
- validateAndDetectGaps() catches error
- Returns empty validation (corrections: [], missingCritical: [], confidence: 0.5)
- Proceeds with regex extraction as-is (safe degradation)

**User Impact:**
- No modal shown
- May miss some corrections, but report still generates
- Better than blocking user completely

### Edge Case 2: User Cancels Modal

**Behavior:**
- `onCancel()` called
- Modal hidden
- Session remains in 'awaiting_validation' state
- User can re-open session later to try again

**Future Enhancement:**
- Add "Resume Validation" button in session timeline

### Edge Case 3: User Skips Validation

**Behavior:**
- `onSkip()` called
- Modal hidden
- Force generation with incomplete data (TODO)

**Implementation needed:**
```typescript
onSkip={() => {
  rhcValidation.handleValidationSkip();
  // Force process with context.skipValidation = true
  reprocessWithUserInput(sessionId, {}, true); // skipValidation flag
}
```

---

## Performance Expectations

| Scenario | Validation Time | Modal Time | Total Extra Time |
|----------|----------------|------------|------------------|
| Auto-correction (high confidence) | 10-30s | 0s | 10-30s |
| Missing critical field | 10-30s | User input | 10-30s + user |
| Low-confidence correction | 10-30s | User review | 10-30s + user |
| Validation LLM fails | 0s (fallback) | 0s | 0s |

**Total workflow time:**
- Without validation: 3-15 minutes (reasoning model only)
- With auto-correction: +10-30 seconds (acceptable)
- With user input: +10-30s validation + user time (better than 15min fail)

---

## Rollback Plan

If validation causes issues:

**Option 1: Disable for specific users**
```typescript
// In RightHeartCathAgent.process()
if (context?.skipValidation) {
  // Skip validation, proceed directly to calculations
  const finalData = regexExtracted;
  // ... continue ...
}
```

**Option 2: Disable globally**
```typescript
// In RightHeartCathAgent.process(), comment out validation
// const validation = await this.validateAndDetectGaps(...);
const validation = { corrections: [], missingCritical: [], missingOptional: [], confidence: 1.0 };
```

**Option 3: Increase confidence threshold**
```typescript
// Make validation less aggressive
const correctedData = this.applyCorrections(regexExtracted, validation.corrections, 0.95); // Was 0.8
```

---

## Future Enhancements

1. **Validation Analytics**
   - Track: auto-correction rate, user override rate, field accuracy
   - Dashboard showing validation effectiveness

2. **Extend to Other Agents**
   - Apply same pattern to TAVI, PCI, mTEER
   - Shared validation framework

3. **Smart Defaults**
   - Pre-fill fields based on patient history
   - "Use last session values" button

4. **Validation Cache**
   - Cache validated sessions
   - Skip re-validation if transcription unchanged

5. **Confidence Tuning**
   - A/B test different thresholds (0.7, 0.8, 0.9)
   - Per-field confidence thresholds

---

## Deployment Checklist

- [x] Type definitions added
- [x] Validation prompt created
- [x] Agent methods implemented
- [x] process() updated with checkpoint
- [x] Modal component created
- [x] Validation hook created
- [ ] RightHeartCathDisplay integration
- [ ] useAIProcessing integration
- [ ] Test Case 1 (auto-correction) passed
- [ ] Test Case 2 (missing field) passed
- [ ] Test Case 3 (low-confidence) passed
- [ ] Edge cases handled
- [ ] Documentation updated
- [ ] CHANGELOG.md updated

---

## Files Modified/Created

**Created:**
- `RHC_VALIDATION_IMPLEMENTATION.md` (full guide)
- `RHC_VALIDATION_INTEGRATION_FINAL.md` (this file)
- `src/sidepanel/components/results/RHCFieldValidationPrompt.tsx`
- `src/hooks/useRHCValidation.ts`

**Modified:**
- `src/types/medical.types.ts` (+4 interfaces, +1 field in MedicalContext, +3 fields in RightHeartCathReport)
- `src/agents/specialized/RightHeartCathSystemPrompts.ts` (+dataValidationPrompt)
- `src/agents/specialized/RightHeartCathAgent.ts` (+4 methods, updated process())

**Pending Modification:**
- `src/sidepanel/components/results/RightHeartCathDisplay.tsx` (add modal + validation detection)
- `src/hooks/useAIProcessing.ts` (add validation detection + reprocessing)
- `src/sidepanel/OptimizedApp.tsx` (pass onReprocess prop)

---

## Estimated Completion Time

**Remaining work:** 1-2 hours
- RightHeartCathDisplay integration: 30 minutes
- useAIProcessing integration: 30 minutes
- Testing (3 test cases): 30-60 minutes

**Total project time:** ~6 hours (as estimated in implementation doc)

---

**Status:** Ready for final integration
**Next Step:** Implement Step 1 (RightHeartCathDisplay integration)
**Version:** 3.28.0
**Created:** 2025-11-03
