# RHC Interactive Validation Implementation Guide

## Overview

This document provides complete implementation instructions for the RHC Interactive Validation workflow. This feature adds a validation checkpoint between regex extraction and report generation, using the quick model to validate data and prompt users for missing critical fields.

**Status:** Types & prompts complete. Agent methods, UI components, and integration pending.

---

## Workflow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Whisper Transcription                                        │
│    → ASR Corrections                                            │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Regex Extraction (RightHeartCathAgent)                       │
│    - extractHaemodynamicPressures()                             │
│    - extractCardiacOutput()                                     │
│    - extractPatientData()                                       │
│    - extractRHCData()                                           │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Quick Model Validation (NEW - validateAndDetectGaps())       │
│    Model: qwen/qwen3-4b-2507                                    │
│    Time: ~10-30 seconds                                         │
│    Output: RHCValidationResult                                  │
│      - corrections (regex errors found by model)                │
│      - missingCritical (fields needed for Fick)                 │
│      - missingOptional (nice-to-have fields)                    │
│      - confidence (overall validation confidence)               │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Auto-Apply High-Confidence Corrections (NEW)                 │
│    - If correction.confidence >= 0.8 → auto-apply               │
│    - If correction.confidence < 0.8 → add to user review        │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
                 ┌───┴───┐
                 │       │
         Missing │       │ All Complete
        Critical │       │
                 ↓       ↓
    ┌────────────────┐  ┌──────────────────────────────────────┐
    │ 5a. STOP &     │  │ 5b. Continue to Calculations         │
    │ Prompt User    │  │     - calculateDerivedHaemodynamics()│
    │ (UI Modal)     │  │     - Auto-populate Fick CO/CI       │
    └────┬───────────┘  └───────────┬──────────────────────────┘
         │                          │
         │ User Fills Fields        │
         │ Clicks "Continue"        │
         └──────────┬───────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. Merge User Input (NEW - mergeUserInput())                    │
│    Combine auto-corrected data + user-provided fields           │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. Calculations (calculateDerivedHaemodynamics())                │
│    Now guaranteed to have all required inputs                   │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. Reasoning Model Report Generation                            │
│    Model: medgemma-27b-text-it-mlx                              │
│    Time: ~3-15 minutes                                          │
│    ONLY runs after validation passes                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Checklist

### ✅ Phase 1: Type Definitions (COMPLETED)

**File:** `src/types/medical.types.ts`

Added interfaces:
- ✅ `RHCFieldCorrection` - represents a model-suggested correction
- ✅ `RHCMissingField` - represents a missing field
- ✅ `RHCValidationResult` - validation output from quick model
- ✅ `RHCExtractedData` - structured regex extraction output

Updated `RightHeartCathReport`:
- ✅ Added `status?: 'complete' | 'awaiting_validation'`
- ✅ Added `validationResult?: RHCValidationResult`
- ✅ Added `extractedData?: RHCExtractedData`

### ✅ Phase 2: Validation Prompt (COMPLETED)

**File:** `src/agents/specialized/RightHeartCathSystemPrompts.ts`

Added:
- ✅ `dataValidationPrompt` - comprehensive validation instructions for quick model
  - Critical fields list (height, weight, Hb, SaO2, SvO2, pressures, CO)
  - Validation rules (compare regex vs transcription)
  - Confidence scoring guidelines (0.95-1.0 = unambiguous, 0.8-0.94 = clear, etc.)
  - JSON output format with examples

### 🔄 Phase 3: Agent Methods (PENDING)

**File:** `src/agents/specialized/RightHeartCathAgent.ts`

#### 3.1 Add Helper Method: `setNestedField()`

```typescript
/**
 * Set a nested field value using dot notation (e.g., "patientData.svo2")
 */
private setNestedField(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key]) {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}
```

#### 3.2 Add Helper Method: `getNestedField()`

```typescript
/**
 * Get a nested field value using dot notation
 */
private getNestedField(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}
```

#### 3.3 Implement: `validateAndDetectGaps()`

```typescript
import type { RHCValidationResult, RHCExtractedData } from '@/types/medical.types';

/**
 * Validate regex-extracted data using quick model and detect missing fields
 *
 * @param extracted - Regex-extracted RHC data
 * @param transcription - Original corrected transcription
 * @returns Validation result with corrections and missing fields
 */
private async validateAndDetectGaps(
  extracted: RHCExtractedData,
  transcription: string
): Promise<RHCValidationResult> {
  console.log('🔍 RHC AGENT: Starting quick model validation...');

  try {
    // Prepare validation request
    const validationPrompt = `${RightHeartCathSystemPrompts.dataValidationPrompt}

REGEX EXTRACTED DATA:
${JSON.stringify(extracted, null, 2)}

TRANSCRIPTION:
${transcription}

Validate the extraction and output JSON only.`;

    // Call quick model for validation
    const response = await this.lmStudioService.chat({
      model: MODEL_CONFIG.QUICK_MODEL,
      messages: [
        { role: 'system', content: RightHeartCathSystemPrompts.dataValidationPrompt },
        { role: 'user', content: `REGEX EXTRACTED:\n${JSON.stringify(extracted, null, 2)}\n\nTRANSCRIPTION:\n${transcription}` }
      ],
      max_tokens: 1500,
      temperature: 0.1 // Low temperature for deterministic validation
    });

    // Parse validation result
    let validationResult: RHCValidationResult;

    // Handle potential markdown code fences
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : response;

    try {
      validationResult = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('❌ Failed to parse validation JSON:', parseError);
      console.log('Raw response:', response);

      // Fallback: return empty validation (proceed with regex data as-is)
      return {
        corrections: [],
        missingCritical: [],
        missingOptional: [],
        confidence: 0.5
      };
    }

    console.log('✅ RHC AGENT: Validation complete');
    console.log(`   - Corrections: ${validationResult.corrections.length}`);
    console.log(`   - Missing critical: ${validationResult.missingCritical.length}`);
    console.log(`   - Missing optional: ${validationResult.missingOptional.length}`);
    console.log(`   - Confidence: ${validationResult.confidence.toFixed(2)}`);

    return validationResult;

  } catch (error) {
    console.error('❌ RHC AGENT: Validation failed:', error);

    // Fallback: proceed with regex extraction as-is
    return {
      corrections: [],
      missingCritical: [],
      missingOptional: [],
      confidence: 0.5
    };
  }
}
```

#### 3.4 Implement: `applyCorrections()`

```typescript
import type { RHCFieldCorrection } from '@/types/medical.types';

/**
 * Apply high-confidence corrections automatically
 * Low-confidence corrections are added to user validation list
 *
 * @param extracted - Original regex-extracted data
 * @param corrections - Corrections suggested by quick model
 * @param confidenceThreshold - Minimum confidence for auto-apply (default 0.8)
 * @returns Corrected data with metadata tracking
 */
private applyCorrections(
  extracted: RHCExtractedData,
  corrections: RHCFieldCorrection[],
  confidenceThreshold: number = 0.8
): RHCExtractedData {
  // Deep clone to avoid mutations
  const result = JSON.parse(JSON.stringify(extracted));

  for (const correction of corrections) {
    if (correction.confidence >= confidenceThreshold) {
      // Auto-apply high-confidence corrections
      this.setNestedField(result, correction.field, correction.correctValue);
      console.log(`✅ Auto-corrected ${correction.field}: ${correction.regexValue} → ${correction.correctValue} (confidence: ${correction.confidence.toFixed(2)})`);
    } else {
      // Low confidence - will be shown to user for review
      console.log(`⚠️ Low-confidence correction for ${correction.field} (${correction.confidence.toFixed(2)}), requiring user review`);
    }
  }

  return result;
}
```

#### 3.5 Implement: `mergeUserInput()`

```typescript
/**
 * Merge user-provided field values with extracted data
 *
 * @param extracted - Auto-corrected extracted data
 * @param userFields - User-provided field values from validation modal
 * @returns Merged data with user inputs
 */
private mergeUserInput(
  extracted: RHCExtractedData,
  userFields: Record<string, any>
): RHCExtractedData {
  const result = JSON.parse(JSON.stringify(extracted));

  for (const [fieldPath, value] of Object.entries(userFields)) {
    if (value !== null && value !== undefined && value !== '') {
      this.setNestedField(result, fieldPath, value);
      console.log(`👤 User provided ${fieldPath}: ${value}`);
    }
  }

  return result;
}
```

#### 3.6 Update: `process()` Method

**Location:** Around line 119-195 in `RightHeartCathAgent.ts`

**Changes:**

```typescript
async process(input: string, context?: MedicalContext): Promise<RightHeartCathReport> {
  console.log('🚨 RHC AGENT: Starting RHC processing');
  console.log('🚨 RHC AGENT: Input preview:', input.substring(0, 200));

  const startTime = Date.now();

  try {
    // ... (existing ASR corrections and terminology corrections)

    // STEP 1: Regex extraction (existing code - lines 132-150)
    const rhcData = this.extractRHCData(correctedInput);
    const haemodynamicPressures = this.extractHaemodynamicPressures(correctedInput);
    const cardiacOutput = this.extractCardiacOutput(correctedInput);
    const patientData = this.extractPatientData(correctedInput);

    const regexExtracted: RHCExtractedData = {
      rhcData,
      haemodynamicPressures,
      cardiacOutput,
      patientData
    };

    // STEP 2: Quick model validation (NEW)
    console.log('🚨 RHC AGENT: Starting validation phase...');
    const validation = await this.validateAndDetectGaps(regexExtracted, correctedInput);

    // STEP 3: Apply high-confidence corrections automatically (NEW)
    console.log('🚨 RHC AGENT: Applying corrections...');
    const correctedData = this.applyCorrections(regexExtracted, validation.corrections, 0.8);

    // STEP 4: Check for critical gaps - INTERACTIVE CHECKPOINT (NEW)
    if (validation.missingCritical.length > 0 ||
        validation.corrections.some(c => c.confidence < 0.8)) {

      console.log(`⚠️ RHC AGENT: Validation requires user input (${validation.missingCritical.length} critical fields missing)`);

      // Return incomplete report with validation state
      // UI will show validation modal and re-run process() with user input
      return {
        title: 'Right Heart Catheterisation - Validation Required',
        content: '',
        sections: [],
        status: 'awaiting_validation',
        validationResult: validation,
        extractedData: correctedData,
        rhcData: correctedData.rhcData,
        haemodynamicPressures: correctedData.haemodynamicPressures,
        cardiacOutput: correctedData.cardiacOutput,
        exerciseHaemodynamics: null,
        complications: [],
        patientData: correctedData.patientData
      } as RightHeartCathReport;
    }

    // STEP 5: Merge user input if provided (NEW)
    let finalData = correctedData;
    if (context?.userProvidedFields) {
      console.log('🚨 RHC AGENT: Merging user-provided fields...');
      finalData = this.mergeUserInput(correctedData, context.userProvidedFields);
    }

    // STEP 6: Extract exercise/complications (existing code)
    const exerciseHaemodynamics = this.extractExerciseHaemodynamics(correctedInput);
    const complications = this.identifyComplications(correctedInput);

    // STEP 7: Calculations - now guaranteed to have all inputs (existing code)
    console.log('🚨 RHC AGENT: Calling calculateDerivedHaemodynamics()...');
    const calculations = this.calculateDerivedHaemodynamics(
      finalData.haemodynamicPressures,
      finalData.cardiacOutput,
      finalData.patientData
    );
    console.log('🧮 Calculated haemodynamics:', JSON.stringify(calculations, null, 2));

    // Auto-populate calculated CI and Fick CO/CI (existing code - lines 167-176)
    if (calculations.cardiacIndex !== undefined && !finalData.cardiacOutput.thermodilution.ci) {
      finalData.cardiacOutput.thermodilution.ci = calculations.cardiacIndex.toFixed(2);
    }
    if (calculations.fickCO !== undefined && !finalData.cardiacOutput.fick.co) {
      finalData.cardiacOutput.fick.co = calculations.fickCO.toFixed(2);
    }
    if (calculations.fickCI !== undefined && !finalData.cardiacOutput.fick.ci) {
      finalData.cardiacOutput.fick.ci = calculations.fickCI.toFixed(2);
    }

    // STEP 8: Generate structured report (existing code - lines 178-192)
    let reportContent = await this.generateStructuredReport(
      finalData.rhcData,
      finalData.haemodynamicPressures,
      finalData.cardiacOutput,
      exerciseHaemodynamics,
      complications,
      correctedInput
    );

    reportContent = this.formatReportOutput(reportContent);
    const sections = this.parseResponse(reportContent, context);

    // Return complete report (existing code - lines 194+)
    return {
      title: 'Right Heart Catheterisation Report',
      content: reportContent,
      sections,
      status: 'complete', // NEW
      rhcData: finalData.rhcData,
      haemodynamicPressures: finalData.haemodynamicPressures,
      cardiacOutput: finalData.cardiacOutput,
      exerciseHaemodynamics,
      complications,
      calculations,
      patientData: finalData.patientData,
      missingCalculationFields: this.identifyMissingCalculationFields(
        finalData.haemodynamicPressures,
        finalData.cardiacOutput,
        finalData.patientData
      )
    };

  } catch (error) {
    // ... (existing error handling)
  }
}
```

**Key Changes:**
1. Wrap extracted data in `RHCExtractedData` object
2. Call `validateAndDetectGaps()` after regex extraction
3. Call `applyCorrections()` to auto-fix high-confidence issues
4. **CHECKPOINT**: If `missingCritical.length > 0`, return `status: 'awaiting_validation'`
5. If `context.userProvidedFields` exists, merge with `mergeUserInput()`
6. Continue to calculations and report generation only after validation passes

#### 3.7 Update MedicalContext Type

**File:** `src/types/medical.types.ts`

```typescript
export interface MedicalContext {
  // ... existing fields ...

  // NEW: User-provided fields after validation modal
  userProvidedFields?: Record<string, any>; // e.g., { "patientData.height": 172 }
}
```

---

### 🔄 Phase 4: UI Components (PENDING)

#### 4.1 Create: `RHCFieldValidationPrompt.tsx`

**File:** `src/sidepanel/components/results/RHCFieldValidationPrompt.tsx`

```typescript
import React, { useState } from 'react';
import type { RHCValidationResult, RHCFieldCorrection, RHCMissingField } from '@/types/medical.types';

interface RHCFieldValidationPromptProps {
  validation: RHCValidationResult;
  onCancel: () => void;
  onSkip: () => void;
  onContinue: (userFields: Record<string, any>) => void;
}

export const RHCFieldValidationPrompt: React.FC<RHCFieldValidationPromptProps> = ({
  validation,
  onCancel,
  onSkip,
  onContinue
}) => {
  const [userFields, setUserFields] = useState<Record<string, any>>({});
  const [acceptedCorrections, setAcceptedCorrections] = useState<Set<string>>(new Set());

  const lowConfidenceCorrections = validation.corrections.filter(c => c.confidence < 0.8);

  const handleFieldChange = (fieldPath: string, value: string) => {
    setUserFields(prev => ({
      ...prev,
      [fieldPath]: value
    }));
  };

  const handleCorrectionToggle = (correction: RHCFieldCorrection, accept: boolean) => {
    const newAccepted = new Set(acceptedCorrections);
    if (accept) {
      newAccepted.add(correction.field);
      setUserFields(prev => ({
        ...prev,
        [correction.field]: correction.correctValue
      }));
    } else {
      newAccepted.delete(correction.field);
      setUserFields(prev => {
        const updated = { ...prev };
        delete updated[correction.field];
        return updated;
      });
    }
    setAcceptedCorrections(newAccepted);
  };

  const handleContinue = () => {
    onContinue(userFields);
  };

  // Field label helper
  const getFieldLabel = (fieldPath: string): string => {
    const labels: Record<string, string> = {
      'patientData.height': 'Height (cm)',
      'patientData.weight': 'Weight (kg)',
      'patientData.haemoglobin': 'Hemoglobin (g/L)',
      'patientData.sao2': 'Arterial O₂ Saturation (%)',
      'patientData.svo2': 'Mixed Venous O₂ Saturation (%)',
      'patientData.heartRate': 'Heart Rate (bpm)',
      'cardiacOutput.thermodilution.co': 'Thermodilution CO (L/min)'
    };
    return labels[fieldPath] || fieldPath;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          RHC Data Validation Required
        </h2>

        {/* Critical Missing Fields */}
        {validation.missingCritical.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-red-600 font-medium">⚠️ Critical Missing Fields</span>
              <span className="text-xs text-gray-500">(required for Fick calculations)</span>
            </div>
            <div className="space-y-3">
              {validation.missingCritical.map((field) => (
                <div key={field.field} className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">
                    {getFieldLabel(field.field)}
                  </label>
                  <input
                    type="number"
                    step="any"
                    className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={field.reason}
                    onChange={(e) => handleFieldChange(field.field, e.target.value)}
                  />
                  <span className="text-xs text-gray-500">{field.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Low-Confidence Corrections */}
        {lowConfidenceCorrections.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-yellow-600 font-medium">✏️ Suggested Corrections</span>
              <span className="text-xs text-gray-500">(please review)</span>
            </div>
            <div className="space-y-3">
              {lowConfidenceCorrections.map((correction) => (
                <div key={correction.field} className="border border-gray-200 rounded p-3">
                  <div className="text-sm font-medium text-gray-700 mb-1">
                    {getFieldLabel(correction.field)}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {correction.regexValue !== null ? (
                      <>Regex found: <strong>{correction.regexValue}</strong> → Model suggests: <strong>{correction.correctValue}</strong></>
                    ) : (
                      <>Model found: <strong>{correction.correctValue}</strong></>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mb-2">{correction.reason}</div>
                  <div className="flex gap-2">
                    <button
                      className={`px-3 py-1 text-sm rounded ${
                        acceptedCorrections.has(correction.field)
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      onClick={() => handleCorrectionToggle(correction, true)}
                    >
                      Accept
                    </button>
                    <button
                      className={`px-3 py-1 text-sm rounded ${
                        !acceptedCorrections.has(correction.field)
                          ? 'bg-gray-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      onClick={() => handleCorrectionToggle(correction, false)}
                    >
                      Keep Original
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Optional Missing Fields */}
        {validation.missingOptional.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-blue-600 font-medium">ℹ️ Optional Fields</span>
              <span className="text-xs text-gray-500">(improves accuracy)</span>
            </div>
            <div className="space-y-3">
              {validation.missingOptional.map((field) => (
                <div key={field.field} className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">
                    {getFieldLabel(field.field)}
                  </label>
                  <input
                    type="number"
                    step="any"
                    className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional"
                    onChange={(e) => handleFieldChange(field.field, e.target.value)}
                  />
                  <span className="text-xs text-gray-500">{field.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={onSkip}
            className="px-4 py-2 text-sm text-gray-700 bg-yellow-200 rounded hover:bg-yellow-300"
          >
            Skip & Generate Anyway
          </button>
          <button
            onClick={handleContinue}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
            disabled={validation.missingCritical.length > 0 && Object.keys(userFields).length === 0}
          >
            Validate & Continue
          </button>
        </div>
      </div>
    </div>
  );
};
```

#### 4.2 Create: `useRHCValidation.ts` Hook

**File:** `src/hooks/useRHCValidation.ts`

```typescript
import { useState, useCallback } from 'react';
import type { RHCValidationResult } from '@/types/medical.types';

interface UseRHCValidationReturn {
  isValidating: boolean;
  validationResult: RHCValidationResult | null;
  showValidationModal: boolean;
  handleValidationRequired: (result: RHCValidationResult) => void;
  handleValidationContinue: (userFields: Record<string, any>) => void;
  handleValidationCancel: () => void;
  handleValidationSkip: () => void;
  getUserProvidedFields: () => Record<string, any> | undefined;
}

export const useRHCValidation = (): UseRHCValidationReturn => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<RHCValidationResult | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [userProvidedFields, setUserProvidedFields] = useState<Record<string, any>>({});

  const handleValidationRequired = useCallback((result: RHCValidationResult) => {
    setValidationResult(result);
    setShowValidationModal(true);
    setIsValidating(true);
  }, []);

  const handleValidationContinue = useCallback((fields: Record<string, any>) => {
    setUserProvidedFields(fields);
    setShowValidationModal(false);
    setIsValidating(false);
    // Caller should re-run processing with fields
  }, []);

  const handleValidationCancel = useCallback(() => {
    setShowValidationModal(false);
    setValidationResult(null);
    setIsValidating(false);
    setUserProvidedFields({});
  }, []);

  const handleValidationSkip = useCallback(() => {
    setShowValidationModal(false);
    setIsValidating(false);
    // Caller should proceed with incomplete data
  }, []);

  const getUserProvidedFields = useCallback(() => {
    return Object.keys(userProvidedFields).length > 0 ? userProvidedFields : undefined;
  }, [userProvidedFields]);

  return {
    isValidating,
    validationResult,
    showValidationModal,
    handleValidationRequired,
    handleValidationContinue,
    handleValidationCancel,
    handleValidationSkip,
    getUserProvidedFields
  };
};
```

---

### 🔄 Phase 5: Integration (PENDING)

#### 5.1 Update: `useAIProcessing.ts` Hook

**File:** `src/hooks/useAIProcessing.ts`

Add RHC validation handling:

```typescript
// In processAudio function, after agent.process() call:

if (agentType === 'rhc' && result.status === 'awaiting_validation') {
  // RHC validation required - show modal
  rhcValidationHook.handleValidationRequired(result.validationResult!);
  // Wait for user input via modal
  // When user clicks "Continue", re-run with userProvidedFields
  return;
}
```

#### 5.2 Update: `RightHeartCathDisplay.tsx`

**File:** `src/sidepanel/components/results/RightHeartCathDisplay.tsx`

Add validation modal rendering:

```typescript
import { RHCFieldValidationPrompt } from './RHCFieldValidationPrompt';
import { useRHCValidation } from '@/hooks/useRHCValidation';

// In component:
const rhcValidation = useRHCValidation();

// In JSX:
{rhcValidation.showValidationModal && rhcValidation.validationResult && (
  <RHCFieldValidationPrompt
    validation={rhcValidation.validationResult}
    onCancel={rhcValidation.handleValidationCancel}
    onSkip={rhcValidation.handleValidationSkip}
    onContinue={(fields) => {
      rhcValidation.handleValidationContinue(fields);
      // Re-run RHC agent with userProvidedFields
      reprocessWithUserInput(fields);
    }}
  />
)}
```

---

## Testing Plan

### Unit Tests

**File:** `tests/rhc-validation.test.ts`

```typescript
describe('RHC Validation', () => {
  test('validateAndDetectGaps finds missing SvO2', async () => {
    const extracted = {
      patientData: { sao2: 98, height: 172, weight: 116, haemoglobin: 122 }
      // Missing svo2
    };
    const transcription = "mixed mean is oxygen saturation 58, arterial oxygen saturation 98";

    const validation = await agent.validateAndDetectGaps(extracted, transcription);

    expect(validation.corrections).toHaveLength(1);
    expect(validation.corrections[0].field).toBe('patientData.svo2');
    expect(validation.corrections[0].correctValue).toBe(58);
    expect(validation.corrections[0].confidence).toBeGreaterThan(0.8);
  });

  test('applyCorrections auto-applies high-confidence fixes', () => {
    const corrections = [{
      field: 'patientData.svo2',
      regexValue: null,
      correctValue: 58,
      reason: 'ASR error',
      confidence: 0.92
    }];

    const result = agent.applyCorrections(extracted, corrections, 0.8);

    expect(result.patientData.svo2).toBe(58);
  });

  test('mergeUserInput overwrites with user values', () => {
    const userFields = { 'patientData.height': 175 };

    const result = agent.mergeUserInput(extracted, userFields);

    expect(result.patientData.height).toBe(175);
  });
});
```

### Integration Test

**Scenario:** User's exact transcription with "mixed mean is" error

```typescript
test('Full validation workflow with ASR error', async () => {
  const transcription = "24-year-old male chronic thromboembolic pulmonary hypertension RA 8-8 mean of 6, RV 65-8, RVEDP 13, PA 65-22, mean of 36, PCWP 6-6 mean of 5, cardiac output by thermodilution 5.4, height 172, weight 116, hemoglobin 122, mixed mean is oxygen saturation 58, arterial oxygen saturation 98, seven French swan GANS right internal jugular access with ultrasound.";

  const report = await rhcAgent.process(transcription);

  // Should auto-correct SvO2 and proceed without user prompt
  expect(report.status).toBe('complete');
  expect(report.patientData?.svo2).toBe(58);
  expect(report.calculations?.fickCO).toBeDefined();
});
```

---

## Configuration

### Model Selection

**File:** `src/services/LMStudioService.ts`

Ensure quick model is configured:

```typescript
export const MODEL_CONFIG = {
  REASONING_MODEL: 'medgemma-27b-text-it-mlx',
  QUICK_MODEL: 'qwen/qwen3-4b-2507', // Used for validation
  OCR_MODEL: 'qwen3-vl-8b-instruct-mlx'
} as const;
```

### Confidence Threshold

**File:** `src/agents/specialized/RightHeartCathAgent.ts`

Adjustable in `applyCorrections()` call:

```typescript
const correctedData = this.applyCorrections(regexExtracted, validation.corrections, 0.8);
//                                                                                  ^^^
//                                                          Confidence threshold (0-1)
//                                                          0.8 = 80% confidence required for auto-apply
```

**Tuning guidance:**
- **0.95+**: Very strict - only obvious corrections auto-apply
- **0.80** (recommended): Balanced - catches clear ASR errors
- **0.60**: Permissive - may auto-apply ambiguous corrections

---

## Performance Expectations

### Timing

| Scenario | Validation Time | Total Time | User Interaction |
|----------|----------------|------------|------------------|
| Complete data | +10-30s | 3-15 min | None |
| Auto-correctable ASR error | +10-30s | 3-15 min | None |
| Missing critical fields | +10-30s + user input | N/A until user responds | Modal prompt |
| Low-confidence corrections | +10-30s + user review | N/A until user responds | Modal prompt |

### Cost

- **Quick model validation**: ~$0.001 per validation
- **Reasoning model report**: ~$0.05+ per report
- **Savings**: Skip expensive reasoning model if data incomplete

---

## Migration Notes

### Backward Compatibility

- Existing RHC reports without validation will continue to work
- `status` field defaults to `'complete'` if undefined
- `validationResult` and `extractedData` are optional fields

### Rollback Plan

If validation causes issues:

1. Comment out validation call in `process()`:
   ```typescript
   // const validation = await this.validateAndDetectGaps(regexExtracted, correctedInput);
   ```

2. Use regex-extracted data directly:
   ```typescript
   const finalData = regexExtracted; // Skip validation
   ```

3. Validation prompt and types remain for future re-enable

---

## Next Steps

### Immediate (to complete feature)

1. ✅ Commit type definitions and validation prompt
2. ⬜ Implement agent methods (3.1-3.6)
3. ⬜ Create UI components (4.1-4.2)
4. ⬜ Integrate with existing hooks (5.1-5.2)
5. ⬜ Test with user's transcription
6. ⬜ Build and validate

### Future Enhancements

1. **Extend to other agents**: Apply to TAVI, PCI, mTEER (same pattern)
2. **Confidence tuning**: A/B test different thresholds (0.7, 0.8, 0.9)
3. **Validation caching**: Store validated sessions to avoid re-validation
4. **Advanced corrections**: Support value transformations (unit conversions)
5. **Analytics**: Track validation accuracy, user override frequency

---

## References

### Related Files

- Types: `src/types/medical.types.ts` (lines 1013-1051)
- Prompts: `src/agents/specialized/RightHeartCathSystemPrompts.ts` (lines 190-254)
- Agent: `src/agents/specialized/RightHeartCathAgent.ts` (process method ~line 119)
- Services: `src/services/LMStudioService.ts` (MODEL_CONFIG line 25)

### Design Decisions

**Why quick model for validation?**
- Fast (~10-30s vs 3-15min for reasoning model)
- Sufficient accuracy for structured data extraction
- Cost-effective ($0.001 vs $0.05+)

**Why stop before reasoning model?**
- Expensive reasoning model only runs with complete data
- User fixes gaps before 3-15min wait
- Clear separation: validation (fast) → input → generation (slow)

**Why confidence threshold 0.8?**
- Catches obvious ASR errors (0.95+ confidence)
- Catches clear contextual corrections (0.80-0.94)
- Requires review for ambiguous cases (<0.80)
- Balanced between automation and safety

---

## Status: Ready for Implementation

**Completed:**
- ✅ Type definitions (RHCFieldCorrection, RHCMissingField, RHCValidationResult, RHCExtractedData)
- ✅ Updated RightHeartCathReport interface
- ✅ Validation prompt (dataValidationPrompt)

**Remaining:**
- ⬜ Agent helper methods (setNestedField, getNestedField)
- ⬜ validateAndDetectGaps() implementation
- ⬜ applyCorrections() implementation
- ⬜ mergeUserInput() implementation
- ⬜ Updated process() method
- ⬜ RHCFieldValidationPrompt.tsx component
- ⬜ useRHCValidation.ts hook
- ⬜ Integration with useAIProcessing and RightHeartCathDisplay
- ⬜ Testing
- ⬜ Build validation

**Estimated implementation time:** 4-6 hours for experienced developer

**File:** RHC_VALIDATION_IMPLEMENTATION.md
**Created:** 2025-11-03
**Version:** 3.27.0
