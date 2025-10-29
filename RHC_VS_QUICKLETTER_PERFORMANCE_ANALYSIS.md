# RHC Agent vs Quick Letter Agent - Processing Time Analysis

## Performance Difference

**User observation:**
- **RHC Agent:** ~7 seconds processing time
- **Quick Letter Agent:** ~30+ seconds processing time

**Question:** Why is there a 4x difference when both use the same model (medgemma-27b)?

---

## Root Cause Analysis

### RHC Agent: Single LLM Call (7 seconds)

**Processing workflow:**
1. Extract data from transcription using **regex patterns** (local, instant)
2. Calculate haemodynamics using **RHCCalculationService** (local, instant)
3. **Single LLM call** to generate report narrative using extracted data

**Code flow in `RightHeartCathAgent.ts:108-158`:**

```typescript
async process(input: string, context?: MedicalContext) {
  // 1. Local regex extraction (instant)
  const correctedInput = this.correctRHCTerminology(input);
  const rhcData = this.extractRHCData(correctedInput);
  const haemodynamicPressures = this.extractHaemodynamicPressures(correctedInput);
  const cardiacOutput = this.extractCardiacOutput(correctedInput);
  const patientData = this.extractPatientData(correctedInput);
  const exerciseHaemodynamics = this.extractExerciseHaemodynamics(correctedInput);
  const complications = this.identifyComplications(correctedInput);

  // 2. Local calculations (instant)
  const calculations = this.calculateDerivedHaemodynamics(
    haemodynamicPressures,
    cardiacOutput,
    patientData
  );

  // 3. SINGLE LLM call to generate narrative (~7 seconds)
  const reportContent = await this.generateStructuredReport(
    rhcData,
    haemodynamicPressures,
    cardiacOutput,
    exerciseHaemodynamics,
    complications,
    correctedInput
  );

  return report;
}
```

**LLM call in `generateStructuredReport()` (line 436-464):**
```typescript
private async generateStructuredReport(...): Promise<string> {
  // Prepare extracted data
  const extractedData = {
    rhcData,
    haemodynamicPressures,
    cardiacOutput,
    exerciseHaemodynamics,
    complications
  };

  // Single LLM call with extracted data context
  const contextualPrompt = `${systemPrompt}

EXTRACTED DATA CONTEXT:
${JSON.stringify(extractedData, null, 2)}

Generate a comprehensive report using the above extracted data...`;

  const rawReport = await this.lmStudioService.processWithAgent(contextualPrompt, originalInput);
  return rawReport;
}
```

**Total LLM calls: 1**

---

### Quick Letter Agent: Multiple LLM Calls (30+ seconds)

**Processing workflow:**
1. Normalize input text
2. **LLM Call #1:** Main letter generation (~10-12 seconds)
3. **LLM Call #2:** Missing information analysis (~10-12 seconds)
4. **Additional LLM calls** for enhanced processing (variable)

**Code flow in `QuickLetterAgent.ts:131-336`:**

```typescript
async process(input: string, _context?: MedicalContext) {
  // Enhanced processing path
  if (this.enableEnhanced) {
    return await this.processWithEnhancedAnalysis(input, _context, processingType);
  }

  // Legacy processing path (still used)
  return await this.processWithLegacy(input, _context, processingType);
}

private async processWithLegacy(input: string, ...): Promise<MedicalReport> {
  // 1. LLM Call #1: Main letter generation (~10-12 seconds)
  const rawOutput = await this.lmStudioService.processWithAgent(
    contextualPrompt,
    input,
    this.agentType
  );

  const { summary, letterContent } = this.parseStructuredResponse(rawOutput);
  const cleanedLetter = this.cleanNarrativeTextPreserveParagraphs(letterContent);
  const finalLetter = this.applyFallbackParagraphFormatting(cleanedLetter);

  // 2. LLM Call #2: Missing information analysis (~10-12 seconds)
  const missingInfo = await this.detectMissingInformation(input, extractedData.letterType);

  return report;
}
```

**Missing information detection in `detectMissingInformation()` (line 1313-1342):**
```typescript
private async detectMissingInformation(input: string, letterType: string): Promise<any> {
  // Load separate system prompt
  const missingInfoSystemPrompt = await systemPromptLoader.loadSystemPrompt('quick-letter', 'missingInfoDetection');

  // SECOND LLM call for analysis (~10-12 seconds)
  const response = await this.lmStudioService.processWithAgent(missingInfoPrompt, input);

  return JSON.parse(response);
}
```

**Enhanced processing adds more LLM calls** (`processWithEnhancedAnalysis()` line 165-200):
```typescript
private async processWithEnhancedAnalysis(...): Promise<MedicalReport | null> {
  // Step 1: Normalize input
  const normalizedInput = await this.enhancedNormalization(input);

  // Step 2: Extract enhanced summary (may include LLM calls)
  const summaryResult = await this.extractEnhancedSummary(normalizedInput, _context);

  // Step 3: Process with enhanced context (LLM call)
  const enhancedReport = await this.processWithEnhancedContext(normalizedInput, summaryResult, _context, processingType);

  // Step 4: Validate quality
  const qualityValidation = this.validateEnhancedQuality(input, enhancedReport, summaryResult);

  return enhancedReport;
}
```

**Total LLM calls: 2-4**

---

## Performance Breakdown

### RHC Agent (~7 seconds total)
| Step | Method | Time |
|------|--------|------|
| Terminology correction | Local regex | <1ms |
| Data extraction (22 fields) | Local regex | ~10ms |
| Haemodynamic calculations | RHCCalculationService | ~5ms |
| **Report generation** | **LLM call** | **~7 seconds** |
| **TOTAL** | | **~7 seconds** |

### Quick Letter Agent (~30+ seconds total)
| Step | Method | Time |
|------|--------|------|
| Input normalization | Local processing | ~50ms |
| Exemplar selection | Local processing | ~100ms |
| **Main letter generation** | **LLM call #1** | **~10-12 seconds** |
| Text cleaning | Local processing | ~50ms |
| Paragraph formatting | Local processing | ~50ms |
| **Missing info analysis** | **LLM call #2** | **~10-12 seconds** |
| Enhanced processing (optional) | **LLM call #3+** | **~10+ seconds** |
| **TOTAL** | | **~30+ seconds** |

---

## Key Differences Summary

| Aspect | RHC Agent | Quick Letter Agent |
|--------|-----------|-------------------|
| **LLM Calls** | 1 call | 2-4 calls |
| **Data Extraction** | Local regex patterns | LLM-based analysis |
| **Missing Info Detection** | Not performed | Separate LLM call |
| **Enhanced Processing** | Not used | Optional (adds more LLM calls) |
| **Processing Time** | ~7 seconds | ~30+ seconds |
| **Speed Factor** | **4x faster** | Baseline |

---

## Why This Design?

### RHC Agent Philosophy
- **Structured procedural data:** Haemodynamic pressures, cardiac output, pressures have **predictable formats**
- **Regex extraction works reliably:** "PA 50-22 mean 36" can be parsed with patterns
- **LLM only for narrative:** Uses extracted data to generate readable report
- **Trade-off:** Fast but requires well-formatted dictation

### Quick Letter Agent Philosophy
- **Unstructured correspondence:** Letters have variable formats, topics, and structures
- **LLM needed for understanding:** Extracts intent, clinical context, recommendations
- **Missing info analysis:** Ensures letters are complete before sending (quality gate)
- **Enhanced processing:** Multiple passes for higher quality output
- **Trade-off:** Thorough but slower

---

## Optimization Opportunities

If you want to speed up Quick Letter Agent:

### Option 1: Make Missing Info Detection Optional
**Change:** Only run `detectMissingInformation()` on user request or when confidence is low

**Estimated savings:** 10-12 seconds (33% faster)

**Code change in `QuickLetterAgent.ts:298-307`:**
```typescript
// Current (always runs)
const missingInfo = await this.detectMissingInformation(input, extractedData.letterType);

// Proposed (conditional)
let missingInfo = null;
if (confidence < 0.85 || _context?.requestMissingInfoAnalysis) {
  missingInfo = await this.detectMissingInformation(input, extractedData.letterType);
}
```

### Option 2: Disable Enhanced Processing (Use Legacy Only)
**Change:** Set `enableEnhanced = false` in constructor

**Estimated savings:** 10+ seconds (variable)

**Code change in `QuickLetterAgent.ts:96`:**
```typescript
// Current
private readonly enableEnhanced: boolean = true;

// Proposed
private readonly enableEnhanced: boolean = false;
```

### Option 3: Run Missing Info Analysis in Parallel (Background)
**Change:** Start missing info analysis in parallel with main letter generation

**Estimated savings:** 10-12 seconds (50% faster)

**Code change:** Use `Promise.all()` to run both LLM calls concurrently

### Option 4: Use Quick Model for Missing Info Analysis
**Change:** Use `qwen3-4b` instead of `medgemma-27b` for missing info detection

**Estimated savings:** 5-7 seconds (20% faster)

**Code change in `detectMissingInformation():`
```typescript
const response = await this.lmStudioService.processWithAgent(
  missingInfoPrompt,
  input,
  'quick-letter',
  MODEL_CONFIG.QUICK_MODEL  // Use fast model
);
```

---

## Recommendation

**If you want Quick Letter to be as fast as RHC:**

1. **Make missing info detection optional** (save 10-12s) ← **Easiest, biggest impact**
2. **Disable enhanced processing** (save 10s) ← **If you don't need extra quality checks**
3. **Use quick model for missing info** (save 5-7s) ← **Middle ground**

**Combined:** Could reduce Quick Letter from 30s → ~10s (similar to RHC)

**Trade-off:** Lower quality assurance, might miss incomplete dictations

---

## Current State

Both agents use medgemma-27b correctly:
- ✅ RHC: `MODEL_CONFIG.REASONING_MODEL = 'medgemma-27b-text-it-mlx'` (confirmed line 444)
- ✅ Quick Letter: Uses same model via `lmStudioService.processWithAgent()`

The 4x difference is **not about model choice**, it's about **number of LLM calls per workflow**.

---

## Date
2025-10-28

## Status
Analysis complete. User can choose optimization strategy based on speed vs. quality trade-offs.
