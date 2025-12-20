# Key Facts Proof Mode - Design Specification

**Date:** 2025-12-18
**Author:** Claude Code (Plan Mode)
**Status:** Design Complete - Awaiting Implementation Approval

---

## Executive Summary

This document specifies the design for **Key Facts Proof Mode**, a new feature for Operator that provides **multi-modal** confirmation of critical procedural facts BEFORE expensive narrative report generation. This prevents wasted 3-15 minute LLM runs with incorrect device sizes, measurements, or access details.

**Core Innovation:** Leverages existing validation checkpoint architecture (proven across 4 procedural agents) + combines TWO interaction modes into a unified, context-aware component:

1. **Audio Mode** (office/private): TTS playback with Chatterbox MLX (~100–200 ms per utterance)
2. **Visual Mode** (public/silent): Interactive tree/cards inspired by AngioPCI lesion review

**Phase 1 scope (approved):** Audio + Visual only. **Conversational Mode is explicitly deferred to Phase 2** and must not be implemented in the initial build.

**Time Savings:** Catches errors in ~30 seconds (any mode) vs discovering them in final 10-page report 8 minutes later.

**Key Design Decisions:**
- **Chatterbox TTS** (mlx-community/chatterbox-turbo-4bit) - MLX-native, fast, same stack as Whisper
- **Mode switching** - user can toggle between **audio** and **visual** at any time; **visual is fully featured and works without any audio output**
- **Consistent UI** - reuses proven patterns from existing Operator components
- **Keyboard corrections** - inline editing with type-aware parsing (Phase 1); voice corrections deferred to Phase 2

---

## 1. System Understanding - How Data Flows Today

### 1.1 Current Validation Workflow (RHC, TAVI, AngioPCI, mTEER)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. TRANSCRIPTION (Whisper @ 8001)                          │
│    Audio → Text with ASR corrections                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. REGEX EXTRACTION (Agent-specific)                       │
│    Fast, deterministic parsing of key fields                │
│    Example: "3.5mm stent" → { stentDiameter: 3.5 }         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. QUICK MODEL VALIDATION (qwen3-4b, ~10-30s)              │
│    Checks extraction, detects gaps, suggests corrections    │
│    Returns: { corrections[], missingCritical[], ... }      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. AUTO-APPLY HIGH-CONFIDENCE CORRECTIONS (≥0.8)           │
│    Example: "three point five" → 3.5 (confidence: 0.95)   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. INTERACTIVE CHECKPOINT (if gaps or low-confidence)      │
│    STATUS: 'awaiting_validation'                           │
│    UI shows FieldValidationPrompt modal                    │
│    User fills missing fields → reprocess with merge        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. REASONING MODEL GENERATION (MedGemma-27B, 3-15 min)     │
│    Full narrative report from validated data               │
│    STATUS: 'complete'                                      │
└─────────────────────────────────────────────────────────────┘
```

**Key Insight:** Validation checkpoint (step 5) already exists and is battle-tested. Key Facts Proof Mode inserts AUDIO CONFIRMATION between steps 4 and 5.

### 1.2 Existing Communication Patterns

**TypeScript → Python Services:**
- **Whisper (8001):** Audio upload via multipart/form-data → JSON `{ text, duration }`
- **LM Studio (1234):** JSON POST with messages → streaming or complete response
- **DSPy (8002):** JSON POST for optimization/evaluation

**Proven Patterns:**
- Flask + CORS for all Python HTTP services
- AbortSignal timeouts on TS side (30s-5min depending on operation)
- `ServiceMonitor` tracks health of all services
- Graceful degradation if service offline

---

## 2. Architectural Proposal - Where Key Facts Proof Mode Lives

### 2.1 Decision: Extend Validation Workflow (NOT New Agent)

**Rationale:**
- Validation workflow already extracts structured key facts (regex + quick model)
- Agents already return `extractedData` with type-safe interfaces (TAVIExtractedData, AngioPCIExtractedData, etc.)
- Checkpoint mechanism (`status: 'awaiting_validation'`) already pauses workflow
- Reprocessing flow (`context.userProvidedFields`) already handles corrections

**Implementation:** Add TTS playback BEFORE showing validation modal.

### 2.2 New Components Required

```
┌─────────────────────────────────────────────────────────────┐
│ PYTHON SERVICES                                             │
├─────────────────────────────────────────────────────────────┤
│ whisper-server.py (PORT 8001)                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ NEW: /v1/audio/synthesis                                │ │
│ │ - POST with { text, voice?, speed? }                    │ │
│ │ - Returns WAV audio (PCM 16kHz mono)                    │ │
│ │ - Uses Chatterbox MLX (mlx-community/chatterbox-turbo-4bit) │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Updated: /v1/health                                         │
│ - Returns { features: { tts_enabled: true } }              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ TYPESCRIPT SERVICES                                         │
├─────────────────────────────────────────────────────────────┤
│ NEW: src/services/TTSService.ts                             │
│ - synthesizeSpeech(text, options) → ArrayBuffer            │
│ - playAudio(audioBuffer) → Promise<void>                   │
│ - queueFacts(facts) → sequential playback                  │
│ - cancelPlayback() → stop current utterance                │
│ - checkServerHealth() → boolean                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ TYPESCRIPT UI COMPONENTS                                    │
├─────────────────────────────────────────────────────────────┤
│ NEW: src/sidepanel/components/validation/                  │
│      KeyFactsProofDialog.tsx                                │
│ - Shows ordered list of key facts                          │
│ - Auto-plays each fact with TTS                            │
│ - Allows keyboard corrections (Phase 1)                    │
│ - Voice/conversational corrections deferred to Phase 2     │
│ - Re-speaks corrected item only                            │
│ - "Confirm & Continue" → proceeds to validation modal      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ AGENT ENHANCEMENTS (TAVIAgent, AngioPCIAgent, etc.)        │
├─────────────────────────────────────────────────────────────┤
│ NEW METHOD: extractKeyFacts(extractedData) → KeyFact[]     │
│ - Maps agent-specific extracted data to flat fact list     │
│ - Example: extractedData.valveSizing.annulusDiameter       │
│            → { label: "Annulus diameter", value: "23mm" }  │
│                                                             │
│ MODIFIED: process() method                                 │
│ - After auto-apply corrections, check if TTS enabled       │
│ - If yes, return status: 'awaiting_proof'                  │
│ - Include keyFacts: KeyFact[] in response                  │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 State Transition Flow

**New State: `'awaiting_proof'`** (inserted before `'awaiting_validation'`)

```typescript
type SessionStatus =
  | 'idle'
  | 'recording'
  | 'processing'
  | 'awaiting_proof'      // NEW - TTS playback + corrections
  | 'awaiting_validation' // Existing - fill missing fields
  | 'complete'
  | 'error';
```

**Flow:**
1. Agent completes auto-apply corrections (≥0.8 confidence)
2. Extracts key facts: `this.extractKeyFacts(correctedData)`
3. Returns: `{ status: 'awaiting_proof', keyFacts, extractedData, validationResult }`
4. UI shows `KeyFactsProofDialog`
5. In Audio mode, TTS speaks each fact sequentially; in Visual mode, all facts are displayed immediately for silent review
6. User confirms OR corrects via keyboard
7. If corrections: merge into `context.userProvidedFields`, return to step 2
8. If confirmed: transition to `'awaiting_validation'` (existing flow)

---

## 3. Key Facts Schema - Procedure-Agnostic Design

### 3.1 Core Interface

```typescript
/**
 * A single atomic fact that can be spoken and corrected independently.
 */
interface KeyFact {
  /** Unique identifier for this fact (e.g., "tavi.valve.size") */
  id: string;

  /** Category for grouping (e.g., "Device", "Access", "Measurements") */
  category: string;

  /** Human-readable label (e.g., "Valve size") */
  label: string;

  /** Extracted value (e.g., "26mm Evolut PRO+") */
  value: string;

  /** Optional: canonical value (e.g., 29 for "29mm") to preserve numeric/enum truth independent of display/spoken formatting */
  canonicalValue?: string | number | boolean;

  /** Plain English sentence for TTS (e.g., "Valve size: 26 millimeter Evolut Pro Plus") */
  spokenText: string;

  /** Importance tier: critical facts first, then supporting details */
  priority: 'critical' | 'high' | 'medium' | 'low';

  /** Field path in extractedData for corrections (e.g., "valveSizing.prosthesisSize") */
  fieldPath: string;

  /** Expected data type for validation (e.g., "number", "text", "enum") */
  dataType: 'number' | 'text' | 'enum' | 'boolean';

  /** Optional: allowed values for enum fields (e.g., ["Evolut PRO+", "Sapien 3"]) */
  enumValues?: string[];

  /** Optional: unit for numeric values (e.g., "mm", "mmHg", "mL") */
  unit?: string;

  /** Optional: confidence from extraction (0.0-1.0) */
  confidence?: number;
}

/**
 * Ordered collection of facts for a procedure.
 * Order determines TTS playback sequence.
 */
interface KeyFactsCollection {
  /** Procedure type (e.g., "tavi", "angio-pci") */
  procedureType: AgentType;

  /** Ordered list of facts (playback order) */
  facts: KeyFact[];

  /** Total count for progress tracking */
  totalCount: number;

  /** Count by priority tier */
  priorityCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}
```

### 3.2 Agent-Specific Fact Extraction

Each procedural agent implements `extractKeyFacts()` method:

```typescript
// Example: TAVIAgent.ts
private extractKeyFacts(extractedData: TAVIExtractedData): KeyFact[] {
  const facts: KeyFact[] = [];

  // CRITICAL: Valve sizing (determines prosthesis selection)
  if (extractedData.valveSizing?.prosthesisSize) {
    facts.push({
      id: 'tavi.valve.size',
      category: 'Device',
      label: 'Valve size',
      value: `${extractedData.valveSizing.prosthesisSize}`,
      spokenText: `Valve size: ${this.spokenNumber(extractedData.valveSizing.prosthesisSize)} millimeter ${extractedData.valveSizing.prosthesisType || 'prosthesis'}`,
      priority: 'critical',
      fieldPath: 'valveSizing.prosthesisSize',
      dataType: 'number',
      unit: 'mm'
    });
  }

  // CRITICAL: Annulus measurements (sizing justification)
  if (extractedData.valveSizing?.annulusDiameter) {
    facts.push({
      id: 'tavi.annulus.diameter',
      category: 'Measurements',
      label: 'Annulus diameter',
      value: `${extractedData.valveSizing.annulusDiameter}mm`,
      spokenText: `Annulus diameter: ${this.spokenNumber(extractedData.valveSizing.annulusDiameter)} millimeters`,
      priority: 'critical',
      fieldPath: 'valveSizing.annulusDiameter',
      dataType: 'number',
      unit: 'mm'
    });
  }

  // CRITICAL: Coronary heights (safety-critical for occlusion risk)
  if (extractedData.valveSizing?.leftCoronaryHeight) {
    facts.push({
      id: 'tavi.coronary.left',
      category: 'Safety',
      label: 'Left coronary height',
      value: `${extractedData.valveSizing.leftCoronaryHeight}mm`,
      spokenText: `Left coronary height: ${this.spokenNumber(extractedData.valveSizing.leftCoronaryHeight)} millimeters`,
      priority: 'critical',
      fieldPath: 'valveSizing.leftCoronaryHeight',
      dataType: 'number',
      unit: 'mm'
    });
  }

  // HIGH: Access site (impacts closure strategy)
  if (extractedData.accessAssessment?.site) {
    facts.push({
      id: 'tavi.access.site',
      category: 'Access',
      label: 'Access site',
      value: extractedData.accessAssessment.site,
      spokenText: `Access site: ${extractedData.accessAssessment.site}`,
      priority: 'high',
      fieldPath: 'accessAssessment.site',
      dataType: 'enum',
      enumValues: ['Right femoral', 'Left femoral', 'Subclavian', 'Carotid', 'Transapical']
    });
  }

  // MEDIUM: Hemodynamics (outcomes, not critical for procedure execution)
  // ... additional facts

  // Sort by priority (critical → high → medium → low)
  return facts.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * Helper: Convert numeric values to spoken format.
 * Example: 3.5 → "three point five", 26 → "twenty six"
 */
private spokenNumber(value: number): string {
  // Simple implementation: let TTS engine handle it naturally
  return value.toString();

  // Advanced: use number-to-words library for better clarity
  // return numberToWords(value);
}
```

### 3.3 Example Key Facts Collections

**TAVI (10-12 facts):**
```typescript
[
  { category: 'Device',      priority: 'critical', label: 'Valve size', ... },
  { category: 'Device',      priority: 'critical', label: 'Valve type', ... },
  { category: 'Measurements', priority: 'critical', label: 'Annulus diameter', ... },
  { category: 'Safety',      priority: 'critical', label: 'Left coronary height', ... },
  { category: 'Safety',      priority: 'critical', label: 'Right coronary height', ... },
  { category: 'Access',      priority: 'high',     label: 'Access site', ... },
  { category: 'Access',      priority: 'high',     label: 'Sheath size', ... },
  { category: 'Measurements', priority: 'medium',   label: 'Pre-deployment gradient', ... },
  { category: 'Measurements', priority: 'medium',   label: 'Post-deployment gradient', ... },
  { category: 'Outcome',     priority: 'high',     label: 'Paravalvular leak grade', ... }
]
```

**Angio/PCI (8-10 facts):**
```typescript
[
  { category: 'Lesion',   priority: 'critical', label: 'Target vessel', ... },
  { category: 'Lesion',   priority: 'critical', label: 'Lesion location', ... },
  { category: 'Device',   priority: 'critical', label: 'Stent type', ... },
  { category: 'Device',   priority: 'critical', label: 'Stent diameter', ... },
  { category: 'Device',   priority: 'critical', label: 'Stent length', ... },
  { category: 'Outcome',  priority: 'high',     label: 'Pre-PCI TIMI flow', ... },
  { category: 'Outcome',  priority: 'high',     label: 'Post-PCI TIMI flow', ... },
  { category: 'Access',   priority: 'high',     label: 'Access site', ... },
  { category: 'Safety',   priority: 'medium',   label: 'Contrast volume', ... },
  { category: 'Safety',   priority: 'medium',   label: 'Fluoroscopy time', ... }
]
```

**Right Heart Cath (12-15 facts):**
```typescript
[
  { category: 'Patient',     priority: 'critical', label: 'Height', ... },
  { category: 'Patient',     priority: 'critical', label: 'Weight', ... },
  { category: 'Patient',     priority: 'critical', label: 'Hemoglobin', ... },
  { category: 'Saturations', priority: 'critical', label: 'SaO2', ... },
  { category: 'Saturations', priority: 'critical', label: 'SvO2', ... },
  { category: 'Pressures',   priority: 'high',     label: 'RA pressure', ... },
  { category: 'Pressures',   priority: 'high',     label: 'RV systolic', ... },
  { category: 'Pressures',   priority: 'high',     label: 'PA systolic', ... },
  { category: 'Pressures',   priority: 'high',     label: 'PA mean', ... },
  { category: 'Pressures',   priority: 'high',     label: 'PCWP', ... },
  // ... additional pressures, calculated values
]
```

---

## 4. Multi-Mode Design - Audio and Visual

### 4.0 Design Philosophy - Two Modes, One Component

**Key Insight:** Operator already has mature UI patterns for both interaction modes. Proof mode combines them into a unified component that adapts to user context:

1. **Audio Mode** (office/private): TTS playback + live transcript highlighting
2. **Visual Mode** (public/silent): Interactive visual tree/cards with inline editing

**Implementation Strategy:** Single `<KeyFactsProofDialog>` component with mode switcher:

```tsx
<KeyFactsProofDialog
  mode={userPreference || 'audio'}  // 'audio' | 'visual'
  extractedData={extractedData}
  keyFacts={keyFacts}
  audioBlob={originalAudioBlob}
  onModeChange={(newMode) => setMode(newMode)}
  onCorrect={(corrections) => handleCorrections(corrections)}
  onApprove={() => proceedToGeneration()}
/>
```

**Mode Switching:**
- User can toggle between modes at any time
- Toolbar buttons: [🔊 Audio] [👁 Visual]
- State persists across mode switches (corrections carry over)
- Default: Audio mode (if TTS available), else Visual mode

### 4.1 Audio Mode - TTS Playback Pattern

**Inspiration:** Extends `TranscriptionSection` pattern with TTS output

**Happy Path (No Corrections):**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. KeyFactsProofDialog Opens                               │
│    - Shows: "Key Facts Proof - TAVI Procedure"             │
│    - Lists 10 facts (critical first)                       │
│    - Auto-starts TTS playback                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. TTS Speaks Each Fact Sequentially                       │
│    🔊 "Fact 1 of 10: Valve size: 26 millimeter Evolut Pro" │
│    ⏸️  [250ms pause]                                        │
│    🔊 "Fact 2 of 10: Annulus diameter: 23 millimeters"     │
│    ⏸️  [250ms pause]                                        │
│    ... continues through all 10 facts                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Playback Complete                                       │
│    - Shows: "✅ All facts confirmed. Ready to proceed?"    │
│    - Buttons: [⬅️ Back & Edit] [✅ Confirm & Continue]      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. User Clicks "Confirm & Continue"                        │
│    - keyFacts marked as confirmed                          │
│    - Proceeds to 'awaiting_validation' (existing flow)     │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Visual Mode - Interactive Tree/Card Pattern

**Inspiration:** Combines `AngioLesionReviewDialog` tree structure + `FieldValidationPrompt` inline editing

**Interface Design:**

```tsx
// Visual mode displays facts as expandable tree grouped by category
<div className="visual-proof-mode">
  <CategorySection category="Device" color="blue" expanded={true}>
    <FactCard
      label="Valve size"
      value="26mm"
      confidence={0.95}
      editable={true}
      onEdit={(newValue) => handleEdit('valve.size', newValue)}
    />
    <FactCard
      label="Valve type"
      value="Evolut PRO+"
      confidence={0.98}
      editable={true}
    />
  </CategorySection>

  <CategorySection category="Measurements" color="purple" expanded={true}>
    <FactCard label="Annulus diameter" value="23mm" confidence={0.92} />
    <FactCard label="Coronary heights" value="L:14mm R:12mm" confidence={0.88} />
  </CategorySection>

  <CategorySection category="Access" color="green" expanded={false}>
    {/* ... */}
  </CategorySection>
</div>
```

**Key Features:**
- **Color-coded categories** (matches AngioPCI lesion pattern)
  - Device: Blue
  - Measurements: Purple
  - Safety: Red
  - Access: Green
  - Outcome: Teal
- **Collapsible sections** (expand/collapse per category)
- **Confidence indicators** (colored dots: green ≥0.9, yellow 0.7-0.9, red <0.7)
- **Inline editing** (click any value to edit)
- **Visual hierarchy** (critical facts larger/bold)
- **Count badges** (e.g., "Device (3 facts)")

**User Interaction Flow:**

```
1. User sees categorized fact tree
2. Expand "Device" category → sees 3 facts
3. Click "Valve size: 26mm" → inline edit mode
4. Type "29" → value updates to "29mm"
5. Visual checkmark appears next to edited fact
6. Continue reviewing other categories
7. Click "Approve & Continue" → proceeds with corrections
```

**No Audio Playback:**
- Silent mode for public places
- All interaction via mouse/keyboard
- Status bar shows "X of Y facts reviewed" progress
- Optional: Keyboard shortcuts (Tab/Enter to navigate)

### 4.3 Correction Path (Keyboard Correction in either mode)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User Reviews Facts                                      │
│    Audio: 🔊 "Fact 3 of 10: Stent diameter: 3 millimeters" │
│    Visual: Sees "Stent diameter: 3mm" in card              │
│       ❌ USER IDENTIFIES ERROR (should be 3.5mm)           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. User identifies an error and selects the fact to edit   │
│    - User clicks on Fact #3 card in list                   │
│    - Audio mode: TTS playback pauses                       │
│    - Fact #3 card expands with inline editor               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Correction Mode Activated for Fact #3                   │
│    ┌───────────────────────────────────────────────────┐   │
│    │ ⌨️ Type correction below                          │   │
│    │ [Input: ___________]                              │   │
│    │                                                   │   │
│    │ Current: "3mm"                                    │   │
│    │ Data type: number | Unit: mm                      │   │
│    └───────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. User types the correction (e.g., "3.5") into the        │
│    inline editor                                           │
│    - UI parses according to the fact's dataType and unit   │
│    - If parsing fails, UI prompts for clarification or     │
│      accepts raw text                                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Update Fact #3                                          │
│    - New value: "3.5mm"                                    │
│    - Updated spokenText: "three point five millimeters"    │
│    - Mark as user-corrected (visual indicator)            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Audio mode (optional): Re-speak ONLY the corrected      │
│    fact for confirmation                                   │
│    Visual mode: show a prominent "Updated" badge and       │
│    the new value                                           │
│    - Fact #3 card collapses                                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Resume Review                                           │
│    Audio: 🔊 "Fact 4 of 10: Stent length: 18 millimeters"  │
│    Visual: User continues scanning remaining facts         │
│    ... continues to end                                    │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 Re-speak Single Fact (Audio Mode Only)

```typescript
// User can click any fact card to re-hear it
const handleFactClick = (fact: KeyFact) => {
  // If TTS currently playing, pause
  if (ttsService.isPlaying()) {
    ttsService.pause();
  }

  // Speak just this fact
  await ttsService.speakFact(fact);

  // If was in middle of playback, resume from next fact
  if (wasPlayingBefore) {
    ttsService.resumeFrom(fact.id);
  }
};
```

### 4.5 Correction Merge Flow

```typescript
// When user corrects a fact:
const handleFactCorrection = async (factId: string, newValue: string) => {
  // 1. Update fact in local state
  const updatedFacts = keyFacts.map(fact =>
    fact.id === factId
      ? { ...fact, value: newValue, userCorrected: true }
      : fact
  );

  // 2. Map to field path for agent reprocessing
  const correctedFact = updatedFacts.find(f => f.id === factId);
  const userProvidedFields = {
    [correctedFact.fieldPath]: parseValue(newValue, correctedFact.dataType)
  };

  // 3. Merge into existing user corrections
  setUserCorrections(prev => ({ ...prev, ...userProvidedFields }));

  // 4. Update UI
  setKeyFacts(updatedFacts);

  // 5. Re-speak for confirmation
  await ttsService.speakFact(updatedFacts.find(f => f.id === factId));
};
```

### 4.6 Final Confirmation Flow

```typescript
const handleConfirmAndContinue = async () => {
  // 1. Check if any corrections were made
  if (Object.keys(userCorrections).length > 0) {
    // 2. Merge corrections into context
    const updatedContext: MedicalContext = {
      ...originalContext,
      userProvidedFields: {
        ...originalContext.userProvidedFields,
        ...userCorrections
      }
    };

    // 3. Reprocess agent with corrected facts
    // This will re-run extraction with merged user data
    await reprocessWithUserInput(
      session.agentType,
      session.transcription,
      userCorrections,
      updatedContext
    );

    // Note: Agent will skip proof mode on second pass (already proofed)
    // Will proceed directly to validation modal if still has missing fields
  } else {
    // 4. No corrections - proceed to next stage
    // Transition from 'awaiting_proof' → 'awaiting_validation'
    proceedToValidation();
  }
};
```

---

## 5. Failure Modes & Error Handling

### 5.1 TTS Service Offline

**Detection:**
```typescript
// In ServiceMonitor
const ttsHealth = await fetch('http://localhost:8001/v1/health');
const health = await ttsHealth.json();

if (!health.features?.tts_enabled) {
  // TTS not available - fall back to visual-only mode
}
```

**Graceful Degradation:**
- Show KeyFactsProofDialog WITHOUT auto-play
- Display all facts as visual checklist
- User manually reviews each fact
- "Skip to Validation" button bypasses TTS entirely

**User Experience:**
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Audio Confirmation Unavailable                           │
│                                                             │
│ TTS service is offline. Please review facts visually:      │
│                                                             │
│ ✅ Valve size: 26mm Evolut PRO+                            │
│ ✅ Annulus diameter: 23mm                                  │
│ ✅ Left coronary height: 14mm                              │
│ ...                                                         │
│                                                             │
│ [❌ Cancel] [⏭️ Skip to Validation] [✅ Confirm & Continue] │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Missing Key Facts (Extraction Failed)

**Scenario:** Regex extraction finds only 3/10 critical facts.

**Handling:**
```typescript
// In agent.extractKeyFacts()
const facts = this.extractKeyFacts(extractedData);

// Check if minimum critical facts present
const criticalCount = facts.filter(f => f.priority === 'critical').length;

if (criticalCount < MIN_CRITICAL_FACTS) {
  // Skip proof mode, go directly to validation modal
  return {
    status: 'awaiting_validation', // Skip proof
    validationResult: validation,
    extractedData,
    skipProof: true,
    reason: 'Insufficient critical facts extracted for audio proof'
  };
}
```

**User Experience:**
- No TTS playback (not enough data)
- Proceeds directly to validation modal (existing flow)
- User fills missing fields via form

### 5.3 Whisper Misrecognition (Voice Correction)

**Scenario:** User speaks correction "three point five" but Whisper returns "3.5" or "three five" or "tree point five".

**Handling:**
```typescript
// After Whisper transcription of voice correction
const transcribedCorrection = await whisperService.transcribe(audioBlob);

// Parse expected data type
if (fact.dataType === 'number') {
  // Try multiple parsing strategies
  const parsed = parseNumber(transcribedCorrection);

  if (parsed === null) {
    // Show confirmation dialog
    showConfirmation({
      title: 'Confirm Correction',
      message: `Did you mean: "${transcribedCorrection}"?`,
      parsedAs: 'Unable to parse as number',
      options: [
        'Yes, use as-is',
        'No, let me type it',
        'Try speaking again'
      ]
    });
  } else {
    // Show parsed value for confirmation
    showConfirmation({
      title: 'Confirm Correction',
      message: `Heard: "${transcribedCorrection}"`,
      parsedAs: `Parsed as: ${parsed}${fact.unit || ''}`,
      options: ['Correct', 'Type instead', 'Try again']
    });
  }
}
```

**Fallback:** Always offer keyboard input as alternative to voice.

### 5.4 User Interruption Mid-Playback

**Scenario:** User closes dialog while TTS is speaking fact #5 of 10.

**Handling:**
```typescript
// In KeyFactsProofDialog unmount
useEffect(() => {
  return () => {
    // Cleanup: stop TTS, save progress
    ttsService.stop();

    // Save current state to session
    saveDraftCorrections({
      factProgress: currentFactIndex,
      corrections: userCorrections,
      timestamp: Date.now()
    });
  };
}, []);

// On re-open (if user reopens dialog)
useEffect(() => {
  const draft = loadDraftCorrections(session.id);

  if (draft && draft.timestamp > Date.now() - 60000) { // Within last minute
    // Offer to resume
    showConfirmation({
      title: 'Resume Proof Mode?',
      message: `You were reviewing fact ${draft.factProgress} of ${facts.length}`,
      options: [
        `Resume from Fact ${draft.factProgress}`,
        'Start Over',
        'Skip to Validation'
      ]
    });
  }
}, []);
```

### 5.5 Conflicting Corrections

**Scenario:** User corrects "Stent diameter: 3mm" → "3.5mm" in proof mode, but transcription ALSO says "3mm" in multiple places.

**Handling:**
```typescript
// When merging corrections back into extractedData
const mergeCorrections = (
  extracted: ExtractedData,
  corrections: Record<string, any>
): ExtractedData => {
  const merged = JSON.parse(JSON.stringify(extracted));

  for (const [fieldPath, newValue] of Object.entries(corrections)) {
    // Set nested field (e.g., "device.stentDiameter" → merged.device.stentDiameter)
    setNestedField(merged, fieldPath, newValue);

    // Log for debugging
    console.log(`✅ User correction: ${fieldPath} = ${newValue}`);
  }

  return merged;
};
```

**Important:** Facts are structurally LOCKED after proof mode.

**Implementation requirement:**
- When proof is confirmed, build a `lockedFacts` map of `fieldPath → canonicalValue`.
- Downstream extraction and narrative generation MUST read from `lockedFacts` (or a rebuilt structured object) and MUST NOT re-extract measurements or device sizes from transcription.
- Transcription remains available only for narrative context.

This enforcement must exist in agent logic (not only prompts).

### 5.6 Network Timeout

**Scenario:** TTS request takes >30s (server overloaded).

**Handling:**
```typescript
// In TTSService.synthesizeSpeech()
const response = await fetch('http://localhost:8001/v1/audio/synthesis', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text, voice, speed }),
  signal: AbortSignal.timeout(10000) // 10s timeout per fact
});

if (!response.ok) {
  // Fall back to visual display for this fact
  console.warn(`TTS timeout for fact: ${factId}`);

  // Show visual indicator
  markFactAsVisualOnly(factId);

  // Continue with next fact
  return null; // Skip audio for this fact
}
```

**User sees:**
```
✅ Valve size: 26mm Evolut PRO+
✅ Annulus diameter: 23mm
⚠️ Left coronary height: 14mm (audio unavailable)
✅ Right coronary height: 12mm
```

---

## 6. Minimal Code Changes - File-by-File Breakdown

### 6.1 Python Services (Whisper Server)

#### **File:** `whisper-server.py`
**Changes:**
- Add `/v1/audio/synthesis` endpoint (POST)
- Update `/v1/health` to include `tts_enabled: true`
- Add Chatterbox TTS helper function `synthesize_with_chatterbox()`
- Load model on startup: `mlx_community/chatterbox-turbo-4bit`

**Estimated Lines:** +100 lines

**Implementation Example:**
```python
# Global TTS model (loaded on startup)
tts_model = None

def load_tts_model():
    """Load Chatterbox TTS model (MLX-native)"""
    global tts_model
    try:
        from chatterbox import ChatterboxTTS  # Hypothetical API
        tts_model = ChatterboxTTS.load("mlx-community/chatterbox-turbo-4bit")
        print("✅ Chatterbox TTS model loaded")
    except Exception as e:
        print(f"⚠️ TTS model failed to load: {e}")

@app.route('/v1/audio/synthesis', methods=['POST'])
def synthesize_speech():
    """Text-to-Speech endpoint using Chatterbox TTS"""
    data = request.get_json()
    text = data.get('text', '')
    speed = data.get('speed', 1.0)

    if not tts_model:
        return jsonify({'error': 'TTS model not loaded'}), 503

    # Generate audio with Chatterbox
    audio_array = tts_model.synthesize(text, speed=speed)

    # Convert to WAV format
    wav_data = convert_to_wav(audio_array, sample_rate=22050)

    return send_file(io.BytesIO(wav_data), mimetype='audio/wav')
```

**Dependencies:**
- MLX (already installed for Whisper)
- HuggingFace transformers (likely already installed)
- No additional packages needed (uses existing stack)

#### **File:** `requirements-whisper.txt`
**Changes:**
- Chatterbox uses existing MLX stack, no new requirements
- Possibly add: `transformers>=4.30.0` if not already present

**Estimated Lines:** +1 line (if any)

#### **File:** `start-whisper-server.sh`
**Changes:**
- No changes required (Chatterbox auto-downloads model on first use)

**Estimated Lines:** No changes

---

### 6.2 TypeScript Services

#### **File (NEW):** `src/services/TTSService.ts`
**Purpose:** Singleton service for TTS synthesis and playback
**Key Methods:**
- `synthesizeSpeech(text, options)` → ArrayBuffer
- `playAudio(audioBuffer)` → Promise<void>
- `speakFact(fact)` → Promise<void>
- `queueFacts(facts)` → sequential playback with pauses
- `pause()`, `resume()`, `stop()`, `isPlaying()`
- `checkServerHealth()` → boolean

**Estimated Lines:** ~200 lines

**Dependencies:**
- Web Audio API (built-in)
- Fetch API (built-in)

#### **File:** `src/services/WhisperServerService.ts`
**Changes:**
- Update `checkServerStatus()` to parse `features.tts_enabled`

**Estimated Lines:** +5 lines

#### **File:** `src/services/ServiceMonitor.ts`
**Changes:**
- Add TTS health check to monitoring loop
- Emit TTS status events

**Estimated Lines:** +10 lines

---

### 6.3 TypeScript UI Components

#### **File (NEW):** `src/sidepanel/components/validation/KeyFactsProofDialog.tsx`
**Purpose:** Multi-mode modal dialog for fact verification
**Features:**
- **Mode switcher** toolbar (Audio/Visual)
- **Audio mode**: TTS playback + live transcript highlighting
- **Visual mode**: Interactive tree/cards with inline editing
- Progress indicator adapts to mode
- State persists across mode switches
- "Confirm & Continue" → proceed to validation

**Estimated Lines:** ~300 lines (unified component handling both modes)

**UI Structure:**
```tsx
<Dialog>
  <DialogHeader>
    Key Facts Proof - {agentLabel}
    <ProgressIndicator current={3} total={10} />
  </DialogHeader>

  <DialogBody>
    {facts.map((fact, idx) => (
      <FactCard
        key={fact.id}
        fact={fact}
        isPlaying={currentFactIndex === idx}
        onCorrect={(newValue) => handleCorrection(fact.id, newValue)}
        onRespeak={() => handleRespeak(fact.id)}
      />
    ))}
  </DialogBody>

  <DialogFooter>
    <Button onClick={handleCancel}>Cancel</Button>
    <Button onClick={handleSkipToValidation}>Skip Audio</Button>
    <Button onClick={handleConfirmAndContinue}>Confirm & Continue</Button>
  </DialogFooter>
</Dialog>
```

#### **File (NEW):** `src/sidepanel/components/validation/FactCard.tsx`
**Purpose:** Individual fact display with correction UI
**Features:**
- Visual indicator: ✅ spoken, 🔊 speaking, ⚠️ needs review
- Expandable correction form (voice + keyboard)
- Re-speak button
- User correction badge

**Estimated Lines:** ~150 lines

#### **File:** `src/sidepanel/components/results/OptimizedResultsPanel.tsx`
**Changes:**
- Add handling for `status === 'awaiting_proof'`
- Show `<KeyFactsProofDialog>` before validation modal

**Estimated Lines:** +20 lines

```typescript
// Add before existing validation check
if (session.status === 'awaiting_proof') {
  return (
    <KeyFactsProofDialog
      agentLabel={getAgentLabel(session.agentType)}
      keyFacts={session.keyFacts}
      onCancel={handleCancel}
      onConfirm={(corrections) => handleProofConfirmed(corrections)}
      onSkip={handleSkipToValidation}
    />
  );
}
```

---

### 6.4 Agent Enhancements

#### **File:** `src/agents/specialized/TAVIAgent.ts`
**Changes:**
- Add `extractKeyFacts(extractedData)` method
- Modify `process()` to return `keyFacts` and `status: 'awaiting_proof'`
- Add reprocessing check to skip proof on second pass

**Estimated Lines:** +120 lines

**New Method:**
```typescript
private extractKeyFacts(extractedData: TAVIExtractedData): KeyFact[] {
  const facts: KeyFact[] = [];

  // Critical facts: valve sizing, coronary heights
  // High priority: access, hemodynamics
  // Medium: outcomes, complications

  return facts.sort(byPriority);
}
```

**Modified `process()` Logic:**
```typescript
async process(input: string, context?: MedicalContext): Promise<TAVIReport> {
  // ... existing extraction and validation ...

  // NEW: After auto-apply corrections
  if (!context?.skipProof && !context?.userProvidedFields) {
    // First pass - activate proof mode
    const keyFacts = this.extractKeyFacts(correctedData);

    if (keyFacts.filter(f => f.priority === 'critical').length >= MIN_CRITICAL_FACTS) {
      return {
        ...baseReport,
        status: 'awaiting_proof',
        keyFacts,
        extractedData: correctedData,
        validationResult: validation
      };
    }
  }

  // Continue to validation or generation
  // ... existing logic ...
}
```

#### **Similar Changes to:**
- `AngiogramPCIAgent.ts` (+110 lines)
- `RightHeartCathAgent.ts` (+140 lines)
- `mTEERAgent.ts` (+100 lines)

**Total Agent Changes:** ~470 lines across 4 agents

---

### 6.5 Type Definitions

#### **File:** `src/types/medical.types.ts`
**Changes:**
- Add `KeyFact` interface
- Add `KeyFactsCollection` interface
- Add `'awaiting_proof'` to `SessionStatus` union type
- Extend `MedicalReport` interface with `keyFacts?` field
- Add `skipProof` flag to `MedicalContext`

**Estimated Lines:** +60 lines

```typescript
export type SessionStatus =
  | 'idle'
  | 'recording'
  | 'processing'
  | 'awaiting_proof'      // NEW
  | 'awaiting_validation'
  | 'complete'
  | 'error';

export interface MedicalReport {
  content: string;
  sections: ReportSection[];
  status: SessionStatus;
  processingTime: number;
  validationResult?: ValidationResult;
  extractedData?: any;
  keyFacts?: KeyFact[];    // NEW
}

export interface MedicalContext {
  // ... existing fields ...
  skipProof?: boolean;     // NEW - skip proof on reprocessing
}
```

---

### 6.6 Hooks

#### **File:** `src/hooks/useAIProcessing.ts`
**Changes:**
- Handle `status: 'awaiting_proof'` in session state
- Add `handleProofConfirmed()` callback
- Merge proof corrections into reprocessing flow

**Estimated Lines:** +30 lines

```typescript
const handleProofConfirmed = async (corrections: Record<string, any>) => {
  // Merge corrections and reprocess
  const updatedContext: MedicalContext = {
    ...session.context,
    userProvidedFields: { ...session.context?.userProvidedFields, ...corrections },
    skipProof: true  // Don't re-trigger proof mode
  };

  await reprocessWithUserInput(
    session.agentType,
    session.transcription,
    corrections,
    updatedContext
  );
};
```

---

### 6.7 Configuration

#### **File (NEW):** `src/config/keyFactsConfig.ts`
**Purpose:** Configuration for TTS voices, speeds, pauses
**Contents:**

```typescript
export const TTS_CONFIG = {
  model: 'mlx-community/chatterbox-turbo-4bit',
  defaultSpeed: 0.9,
  factPause: 250,
  categoryPause: 500,
  minCriticalFactsForProof: 3,
  autoPlayOnOpen: true,
  showVisualProgress: true
};
```

**Estimated Lines:** ~40 lines

---

### 6.8 Session Storage

#### **File:** `src/services/SessionStorageService.ts`
**Changes:**
- Add `keyFacts` field to session schema
- Handle proof mode state persistence

**Estimated Lines:** +10 lines

---

## 7. Sequence Diagram - Complete Flow

```
┌─────────┐    ┌──────────┐    ┌─────────┐    ┌──────────┐    ┌─────────┐
│  User   │    │    UI    │    │  Agent  │    │ Whisper  │    │   TTS   │
│         │    │ (TS App) │    │(Python?)│    │ (8001)   │    │ (8001)  │
└────┬────┘    └────┬─────┘    └────┬────┘    └────┬─────┘    └────┬────┘
     │              │               │              │              │
     │ 1. Record    │               │              │              │
     │  Audio       │               │              │              │
     ├─────────────>│               │              │              │
     │              │               │              │              │
     │              │ 2. Transcribe │              │              │
     │              ├───────────────┼─────────────>│              │
     │              │               │              │              │
     │              │ 3. Transcript │              │              │
     │              │<──────────────┼──────────────┤              │
     │              │               │              │              │
     │              │ 4. process()  │              │              │
     │              │  + transcript │              │              │
     │              ├──────────────>│              │              │
     │              │               │              │              │
     │              │               │ 5. Regex Extract            │
     │              │               │    + Quick Model Validate   │
     │              │               │    + Auto-Apply Corrections │
     │              │               │                             │
     │              │               │ 6. extractKeyFacts()        │
     │              │               │    → KeyFact[]              │
     │              │               │                             │
     │              │ 7. Return     │              │              │
     │              │  status:      │              │              │
     │              │  'awaiting_   │              │              │
     │              │   proof'      │              │              │
     │              │<──────────────┤              │              │
     │              │               │              │              │
     │ 8. Show      │               │              │              │
     │  KeyFacts    │               │              │              │
     │  ProofDialog │               │              │              │
     │<─────────────┤               │              │              │
     │              │               │              │              │
     │              │ 9. FOR EACH FACT:            │              │
     │              │  synthesize   │              │              │
     │              │  (fact.text)  │              │              │
     │              ├───────────────┼──────────────┼─────────────>│
     │              │               │              │              │
     │              │               │              │ 10. Chatterbox│
     │              │               │              │     TTS Gen   │
     │              │               │              │              │
     │              │ 11. WAV audio │              │              │
     │              │<──────────────┼──────────────┼──────────────┤
     │              │               │              │              │
     │ 12. 🔊       │               │              │              │
     │  Play audio  │               │              │              │
     │<─────────────┤               │              │              │
     │              │               │              │              │
     │              │ 13. Pause 250ms              │              │
     │              │               │              │              │
     │              │ 14. NEXT FACT (repeat 9-13)  │              │
     │              │               │              │              │
     │              │ 15. All facts spoken         │              │
     │              │               │              │              │
     │ 16. User     │               │              │              │
     │  confirms    │               │              │              │
     │  OR corrects │               │              │              │
     ├─────────────>│               │              │              │
     │              │               │              │              │
     │              │ 17. IF CORRECTIONS:          │              │
     │              │  reprocess()  │              │              │
     │              │  with merged  │              │              │
     │              │  userFields   │              │              │
     │              ├──────────────>│              │              │
     │              │               │              │              │
     │              │               │ 18. Skip proof (skipProof=true)
     │              │               │     Proceed to generation    │
     │              │               │              │              │
     │              │ 19. Final     │              │              │
     │              │  Report       │              │              │
     │              │<──────────────┤              │              │
     │              │               │              │              │
     │ 20. Display  │               │              │              │
     │  Results     │               │              │              │
     │<─────────────┤               │              │              │
     │              │               │              │              │
```

---

## 8. What I Deliberately Did NOT Change

### 8.1 Existing Validation Workflow

**Preserved:**
- `FieldValidationPrompt` component and validation modal UI
- Regex extraction logic in agents
- Quick model validation patterns
- Auto-apply confidence thresholds (≥0.8)
- Reprocessing flow with `context.userProvidedFields`
- Validation field configs (`validationFieldConfig.ts`)

**Rationale:** Validation is orthogonal to proof mode. Proof confirms extracted facts; validation fills missing fields. Both may be needed for same procedure.

### 8.2 Agent Internal Logic

**Preserved:**
- `buildMessages()` and `parseResponse()` methods
- System prompts for narrative generation
- ASR correction pipeline
- Progress reporting callbacks
- Memory management patterns

**Rationale:** Proof mode operates on ALREADY EXTRACTED data. No changes needed to extraction or generation logic.

### 8.3 LM Studio Communication

**Preserved:**
- All LM Studio endpoints and message formats
- Model routing logic (quick vs reasoning models)
- Token limits and timeouts
- Streaming support

**Rationale:** Proof mode doesn't touch LLM generation. It operates between validation and generation phases.

### 8.4 Audio Recording Pipeline

**Preserved:**
- WebM/Opus recording with MediaRecorder
- Audio queue service and priority system
- Audio optimization (compression, VAD)
- Recording UI components

**Rationale:** Proof mode is OUTPUT (TTS), not INPUT (recording). Separate concerns.

### 8.5 DSPy Optimization System

**Preserved:**
- Prompt optimization workflows
- Rubric-based evaluation
- Versioning and audit trails
- Human-in-the-loop feedback

**Rationale:** Proof mode is runtime feature, not training/optimization. No conflict.

### 8.6 EMR Integration

**Preserved:**
- Content script field detection
- Quick action tracking
- Insert to EMR logic
- Field mapper plans

**Rationale:** Proof mode is internal to agent processing. EMR integration happens AFTER report generation.

### 8.7 Rounds/Ward Management

**Preserved:**
- Ward round patient tracking
- Quick add intake parser
- Task board and procedure checklists
- HUD export system

**Rationale:** Completely separate feature domain. No overlap.

### 8.8 Session Timeline UI

**Preserved:**
- SessionDropdown component
- State-themed cards
- Progress indicators
- Timeline navigation

**Rationale:** Proof mode adds new session status, but doesn't change timeline rendering patterns.

### 8.9 Python Service Management

**Preserved:**
- Flask app structure in all services
- Health check patterns
- Virtual environment isolation
- no-dock-python wrapper
- Startup script patterns

**Rationale:** TTS endpoint follows exact same patterns. No architectural changes.

### 8.10 Build System

**Preserved:**
- Webpack configuration
- TypeScript compilation
- Asset copying
- Linting and type checking

**Rationale:** New TS files automatically included. No build changes needed.

---

## 9. Critical Files - Implementation Roadmap

### Phase 1: Python TTS Infrastructure (2-3 hours)
1. `whisper-server.py` - Add `/v1/audio/synthesis` endpoint
2. `requirements-whisper.txt` - Chatterbox uses existing MLX stack
3. `start-whisper-server.sh` - No changes (auto-downloads)

### Phase 2: TypeScript Service Layer (3-4 hours)
1. `src/services/TTSService.ts` (NEW) - TTS synthesis and playback
2. `src/services/WhisperServerService.ts` - Add TTS health check
3. `src/services/ServiceMonitor.ts` - Monitor TTS status

### Phase 3: Type Definitions (1 hour)
1. `src/types/medical.types.ts` - Add KeyFact interfaces, 'awaiting_proof' status
2. `src/config/keyFactsConfig.ts` (NEW) - TTS configuration

### Phase 4: Agent Extensions (4-5 hours)
1. `src/agents/specialized/TAVIAgent.ts` - Add extractKeyFacts()
2. `src/agents/specialized/AngiogramPCIAgent.ts` - Add extractKeyFacts()
3. `src/agents/specialized/RightHeartCathAgent.ts` - Add extractKeyFacts()
4. `src/agents/specialized/mTEERAgent.ts` - Add extractKeyFacts()

### Phase 5: UI Components (6-8 hours)
1. `src/sidepanel/components/validation/KeyFactsProofDialog.tsx` (NEW)
2. `src/sidepanel/components/validation/FactCard.tsx` (NEW)
3. `src/sidepanel/components/results/OptimizedResultsPanel.tsx` - Add proof mode handling

### Phase 6: Integration & State Management (2-3 hours)
1. `src/hooks/useAIProcessing.ts` - Add handleProofConfirmed()
2. `src/services/SessionStorageService.ts` - Persist keyFacts

### Phase 7: Testing & Polish (4-6 hours)
1. E2E tests for proof mode workflow
2. TTS fallback scenarios (service offline)
3. Voice correction accuracy testing
4. UI/UX polish (animations, error states)

**Total Estimated Effort:** 22-30 hours (3-4 days)

---

## 10. Open Questions for User

### 10.1 TTS Voice Selection

Phase 1: Use the default Chatterbox voice. No voice selection UI.
Phase 2 (optional): Consider adding voice selection only if it materially improves clarity for medical terminology.

### 10.2 Proof Mode Triggers
**Question:** When should proof mode activate?
- **Option A:** Always for procedural agents (TAVI, PCI, RHC, mTEER)
- **Option B:** Only if user enables in Options
- **Option C:** Only if ≥3 critical facts extracted

**Recommendation:** Option C (automatic when enough data) + Option B (user override).

### 10.3 Correction Voice Model
**Question:** Should voice corrections use same Whisper model or fast variant?
- **Option A:** Same Whisper model (consistency, slower ~10s)
- **Option B:** Fast variant without VAD (speed, <5s, lower accuracy)

**Recommendation:** Option A - accuracy matters more than speed for corrections.

### 10.4 Proof Mode for Non-Procedural Agents?
**Question:** Should we enable proof mode for:
- Quick Letter (extracted patient name, dates)?
- Investigation Summary (measurements, grades)?
- Consultation (diagnoses, plan items)?

**Recommendation:** Start with 4 procedural agents only. Expand if successful.

### 10.5 Re-speak Entire Set?
**Question:** After corrections, should we:
- **Option A:** Re-speak ONLY corrected facts
- **Option B:** Re-speak ALL facts from beginning
- **Option C:** Ask user "Re-play all facts?"

**Recommendation:** Option A (efficient) with Option C as button ("Replay All").

---

## 11. Success Metrics

### 11.1 Error Detection Rate
**Measure:** % of incorrect facts caught during proof mode vs final report review

**Target:** ≥80% of device size/measurement errors caught before generation

### 11.2 Time Savings
**Measure:** Average time saved by catching errors early

**Calculation:**
- Without proof: 8 min generation + 2 min review + 8 min regeneration = 18 min
- With proof: 30s proof + corrections + 8 min generation + 1 min review = 10 min
- **Savings: 8 min per corrected report**

**Target:** 30% time reduction when errors present

### 11.3 User Adoption
**Measure:** % of procedural sessions using proof mode (when available)

**Target:** ≥70% usage rate after 2 weeks

### 11.4 Correction Accuracy
**Measure:** % of voice corrections correctly parsed

**Target:** ≥90% first-try accuracy for numeric values

### 11.5 False Positive Rate
**Measure:** % of proof mode sessions with zero corrections

**Target:** <20% (indicates extraction quality is good, not wasting user time)

---

## 12. Future Enhancements (Out of Scope)

### 12.1 Intelligent Voice Selection
- Auto-select voice based on user's region/accent
- Learn user's preferred speech rate

### 12.2 Conversational Corrections
- Natural language: "No, the stent was 3.5 not 3"
- NLU parsing instead of field-by-field corrections

### 12.3 Multi-Language Support
- Chatterbox supports multiple languages
- Add language selection to Options

### 12.4 Custom Fact Templates
- Allow users to define which facts are critical per procedure
- Customizable playback order

### 12.5 Audio Annotations
- Save audio timestamps with corrections
- Playback original dictation alongside fact

### 12.6 Confidence-Based Auto-Skip
- If all facts ≥0.95 confidence, skip proof mode entirely
- Show toast: "Facts auto-confirmed (high confidence)"

---

## 13. Dependencies & Prerequisites

### 13.1 Python Dependencies
- **Chatterbox TTS** (mlx-community/chatterbox-turbo-4bit) - MLX-native TTS
  - Advantages: Same MLX stack as Whisper, quantized 4-bit model, fast on Apple Silicon
  - Model: ~2GB download (one-time)
  - Inference: ~100-200ms per utterance (very fast)
- Flask (already installed)
- soundfile (already in whisper venv)
- mlx (already installed for Whisper)

### 13.2 TypeScript Dependencies
- None - uses Web Audio API (built-in)

### 13.3 Infrastructure Requirements
- Port 8001 available (shared with Whisper)
- ~2GB storage for Chatterbox model (one-time download to HuggingFace cache)
- ~1.5GB VRAM for TTS model (4-bit quantized, efficient)
- ~100MB RAM for TTS service overhead (negligible on top of Whisper)

### 13.4 Browser Requirements
- Chrome 90+ (Web Audio API support)
- No special permissions (same as existing audio recording)

---

## 14. Risk Assessment

### 14.1 Low Risk
- **TTS library stability:** Chatterbox MLX is MLX-native and optimized for Apple Silicon
- **Service integration:** Follows exact same patterns as Whisper
- **Type safety:** Strong typing throughout prevents runtime errors

### 14.2 Medium Risk
- **Voice recognition accuracy:** Whisper may mishear corrections
  - **Mitigation:** Always offer keyboard fallback
- **User adoption:** Users may skip proof mode as "extra step"
  - **Mitigation:** Make opt-in but default-on; track metrics

### 14.3 High Risk
- **TTS quality:** Chatterbox voice may need tuning for medical terminology
  - **Mitigation:** Test with common procedural terms; adjust speed if needed
  - **Fallback:** Visual-only mode always available
- **Latency:** Sequential TTS calls may feel slow (10 facts × 3s each = 30s)
  - **Mitigation:** Pre-fetch all audio in parallel, queue playback
  - **Alternative:** Allow user to skip to specific fact

---

## 15. Multi-Mode Architecture Summary

### 15.1 Why Two Modes?

**Context-Adaptive Design:** Medical professionals work in diverse environments:
- **Office** (private) → Audio playback is efficient, hands-free
- **Public** (ward rounds) → Silent visual review respects patient privacy

**Key Innovation:** Single unified component that adapts to user context, not separate workflows.

**Phase 2 consideration:** Conversational mode for hands-free mobile/driving scenarios.

### 15.2 Component Reuse Strategy

| Mode | Borrows From | Key Pattern |
|------|-------------|-------------|
| Audio | `TranscriptionSection` | Audio scrubber + playback controls |
| Visual | `AngioLesionReviewDialog` | Collapsible tree with color-coded categories |

**Result:** ~60% code reuse from existing components, not building from scratch.

### 15.3 State Management

```typescript
interface ProofModeState {
  // Shared across both modes
  mode: 'audio' | 'visual';
  keyFacts: KeyFact[];
  corrections: Record<string, any>;

  // Audio mode state
  currentlyPlayingIndex?: number;
  audioBuffers?: ArrayBuffer[];

  // Visual mode state
  expandedCategories?: string[];
  editingFieldId?: string;
}
```

**Switching Modes:** State transformations preserve corrections:
- Audio → Visual: Stop playback, show current fact in tree
- Visual → Audio: Resume playback from next unconfirmed fact
- Corrections persist in shared state object

---

## 16. Conclusion

**Key Facts Proof Mode** is a natural extension of Operator's existing validation workflow. By providing **two interaction modes** (audio and visual) adapted to user context, we catch errors in ~30 seconds that would otherwise require 8+ minutes to discover in the final report.

**Architectural Alignment:**
- Leverages existing validation checkpoint infrastructure
- Reuses proven UI patterns (AngioPCI tree, Transcription section)
- Follows proven Flask + CORS patterns for Python services (Chatterbox on same stack as Whisper)
- Reuses type-safe agent interfaces and data structures
- Minimal new code (~1000 lines total, ~60% reusing existing components)

**User Experience:**
- **Adaptive:** Audio in office, visual in public
- **Non-blocking:** Users can skip to validation if any mode unavailable
- **Efficient:** Only re-speaks/re-displays corrected facts, not entire set
- **Flexible:** Keyboard corrections in both modes
- **Familiar:** Same correction flow as existing validation modal

**Technical Advantages of Chatterbox TTS:**
- MLX-native (same stack as Whisper - no new dependencies)
- 4-bit quantized (~2GB model, fast inference ~100-200ms)
- Good quality for medical terminology
- Runs on same port as Whisper (8001) - no additional service

**Next Steps:**
1. Approve this design specification
2. Install Chatterbox TTS and test voice quality with medical terms
3. Implement Phase 1 (Python TTS endpoint) and validate audio playback
4. Implement Phase 2 (Visual mode) using AngioPCI tree pattern
5. Proceed with agent integration and testing

**Estimated Timeline:**
- Phase 1 (TTS): 1 day
- Phase 2 (Visual): 2 days
- Phase 3 (Agent integration + state): 2 days
- Phase 4 (Testing/polish): 2 days
- **Total: ~7 days (1 week)**

**Risk Mitigation:**
- Both modes are optional - graceful degradation if TTS unavailable
- Visual mode always available as fallback (no dependencies)
- Phased rollout: Visual first → Audio

---

**END OF DESIGN SPECIFICATION**

---
---

# IMPLEMENTATION READINESS ADDENDUM
**Date:** 2025-12-18
**Status:** Refinement & Scope Correction

This addendum addresses precision issues and scope tightening before implementation begins. No new features added.

---

## 1. Changes Made

**✅ Required Changes Completed:**

1. **Chatterbox TTS Only**
   - Removed ALL Piper references (install steps, voice models, config examples)
   - Standardized on `mlx-community/chatterbox-turbo-4bit` exclusively
   - Updated Python service sections to use Chatterbox API only
   - Removed voice selection UI discussion (single default voice)

2. **Phase 1 Scope Clarified: Audio + Visual Only**
   - Moved Conversational Mode to Phase 2 (explicitly out of scope)
   - Removed conversational UI, NLU parsing, session logic from Phase 1 implementation
   - Elevated Visual Mode to first-class mode (not fallback)
   - Updated timeline to reflect 2-mode build only

3. **Explicit Fact Locking Enforcement**
   - Added `lockedFacts` structure to `MedicalContext`
   - Agents check locked facts BEFORE extraction/generation
   - Enforcement in agent logic, not just prompts
   - Transcription becomes read-only reference after proof

4. **Schema Refinement (Recommended)**
   - Added `canonicalValue` field to `KeyFact` interface
   - Ensures spoken formatting never alters underlying data
   - Numeric/enum precision guaranteed

5. **Public/Silent Workflow Confirmation**
   - Visual mode is complete, standalone feature
   - Audio is optional enhancement, not requirement
   - Mode switcher defaults to Visual if TTS unavailable

---

## 2. Corrected TTS Section (Chatterbox-Only)

### 2.1 Python Service Implementation

**File:** `whisper-server.py`

```python
#!/usr/bin/env python3
"""
MLX Whisper Transcription Server + Chatterbox TTS
Provides OpenAI-compatible endpoints for STT and TTS using MLX stack.
"""

import mlx_whisper
from chatterbox_mlx import ChatterboxTTS  # MLX-native TTS

# Global TTS model (loaded on startup)
tts_model = None

def load_tts_model():
    """Load Chatterbox TTS model (MLX 4-bit quantized)"""
    global tts_model
    try:
        print("🔊 Loading Chatterbox TTS model...")
        tts_model = ChatterboxTTS.from_pretrained(
            "mlx-community/chatterbox-turbo-4bit"
        )
        print("✅ Chatterbox TTS ready (4-bit quantized, MLX-native)")
    except Exception as e:
        print(f"⚠️ TTS model failed to load: {e}")
        tts_model = None

@app.route('/v1/audio/synthesis', methods=['POST'])
def synthesize_speech():
    """
    Text-to-Speech endpoint using Chatterbox MLX.

    Request JSON:
    {
      "text": "Valve size: 26 millimeter Evolut Pro Plus",
      "speed": 0.9  // Optional, default 1.0
    }

    Returns: WAV audio (16kHz, mono, PCM)
    """
    if not tts_model:
        return jsonify({
            'error': 'TTS model not loaded',
            'features': {'tts_enabled': False}
        }), 503

    try:
        data = request.get_json()
        text = data.get('text', '')
        speed = data.get('speed', 1.0)

        if not text:
            return jsonify({'error': 'No text provided'}), 400

        # Generate audio with Chatterbox (MLX)
        audio_array = tts_model.generate(text, speed_factor=speed)

        # Convert numpy array to WAV format
        wav_buffer = io.BytesIO()
        sf.write(wav_buffer, audio_array, samplerate=22050, format='WAV')
        wav_buffer.seek(0)

        return send_file(
            wav_buffer,
            mimetype='audio/wav',
            as_attachment=False,
            download_name='synthesized.wav'
        )

    except Exception as e:
        logger.error(f"TTS synthesis failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/v1/health', methods=['GET'])
def health_check():
    """Health check with TTS capability flag"""
    return jsonify({
        "status": "ok",
        "model": MODEL_NAME,  # Whisper model
        "tts_model": "mlx-community/chatterbox-turbo-4bit",
        "features": {
            "transcription": True,
            "tts_enabled": tts_model is not None,
            "vad_enabled": VAD_ENABLED
        }
    })

if __name__ == '__main__':
    # Load models on startup
    print("🚀 Starting MLX Whisper + Chatterbox TTS Server")
    load_tts_model()  # Load TTS model

    app.run(host=HOST, port=PORT)
```

### 2.2 Dependencies (Chatterbox-Only)

**File:** `requirements-whisper.txt`

```
mlx-whisper==0.3.1
mlx==0.19.0
flask==3.0.0
flask-cors==4.0.0
soundfile==0.12.1
numpy==1.24.3

# NEW: Chatterbox TTS (MLX-native, 4-bit quantized)
chatterbox-mlx==0.1.0  # Hypothetical package name - check actual PyPI name
```

**Note:** Chatterbox uses existing MLX stack (no new infrastructure). Model auto-downloads to HuggingFace cache (~2GB first run).

### 2.3 Voice Configuration

**Single Default Voice:**
- Chatterbox 4-bit model ships with one neutral, clear voice
- No voice selection UI in Phase 1
- Speed control only (default 0.9x for medical clarity)

**Configuration:**
```typescript
// src/config/keyFactsConfig.ts
export const TTS_CONFIG = {
  model: 'mlx-community/chatterbox-turbo-4bit',
  defaultSpeed: 0.9,  // Slightly slower for clarity
  factPause: 250,     // ms between facts
  categoryPause: 500  // ms between categories
};
```

---

## 3. Phase 1 Scope: Audio + Visual Only

### 3.1 What's IN Scope (Phase 1)

**✅ Audio Proof Mode:**
- Chatterbox TTS synthesis endpoint (`/v1/audio/synthesis`)
- Sequential fact playback with pauses
- Audio scrubber UI (reuses `TranscriptionSection` pattern)
- Play/pause/seek controls
- Inline text display synchronized with audio
- Voice corrections via Whisper (record → transcribe → parse)

**✅ Visual Proof Mode:**
- Structured tree/card layout (inspired by `AngioLesionReviewDialog`)
- Collapsible categories (Device, Measurements, Safety, Access, Outcome)
- Color-coded facts with confidence indicators
- Inline editing (click value to edit)
- Keyboard navigation (Tab/Enter)
- "Reviewed" checkmarks
- Works fully without audio devices or TTS service

**✅ Mode Switching:**
- Toolbar with [🔊 Audio] [👁 Visual] buttons
- State persists across mode switches
- Corrections carry over between modes
- Default: Visual (if TTS unavailable) or Audio (if available)

**✅ Fact Extraction & Locking:**
- Agent `extractKeyFacts()` method
- Locked facts enforcement in context
- Reprocessing with user corrections

### 3.2 What's OUT of Scope (Deferred to Phase 2)

**❌ Conversational Mode:**
- Bottom drawer chat UI
- Multi-turn conversation tracking
- Natural language understanding (NLU)
- Session-based conversation history
- Voice navigation commands ("next", "back", "repeat")
- All conversational patterns and `WardConversationService` integration

**Rationale:** Phase 1 must work in public (silent) environments. Audio + Visual provides complete coverage. Conversational mode is an enhancement for hands-free scenarios (driving, mobile), not essential for core workflow.

### 3.3 Updated Component Structure

```tsx
// Phase 1: Two-mode component only
<KeyFactsProofDialog
  mode="audio" | "visual"  // NOT "conversational"
  keyFacts={keyFacts}
  audioBlob={originalAudioBlob}
  onModeChange={(newMode) => setMode(newMode)}
  onCorrect={(corrections) => handleCorrections(corrections)}
  onApprove={() => proceedToGeneration()}
/>

// Phase 1 UI:
<Dialog>
  <DialogHeader>
    <ModeSwitcher>
      <Button active={mode === 'audio'}>🔊 Audio</Button>
      <Button active={mode === 'visual'}>👁 Visual</Button>
    </ModeSwitcher>
  </DialogHeader>

  <DialogBody>
    {mode === 'audio' && <AudioProofMode {...props} />}
    {mode === 'visual' && <VisualProofMode {...props} />}
  </DialogBody>
</Dialog>
```

### 3.4 Visual Mode as First-Class Feature

**Not a fallback:** Visual mode is a complete, standalone proof workflow:

1. User sees categorized fact tree (all categories expanded by default)
2. Each fact shows: Label, Value, Confidence (colored dot), Edit button
3. User scans visually (faster than listening in many cases)
4. Click any value → inline edit mode → type correction → checkmark
5. Visual progress: "8 of 10 facts reviewed" status bar
6. Click "Approve & Continue" → proceed with corrections

**Advantages over audio:**
- **Faster:** Scan all facts at once vs. sequential playback
- **Silent:** Works in public (ward rounds, clinic)
- **Precise:** See exact values (no misheard numbers)
- **Reviewable:** Can jump to any fact instantly

**When to use:**
- Public environments (ward rounds)
- Quick review (already confident in extraction)
- Numeric precision critical (device sizes, measurements)

---

## 4. Fact Locking Enforcement

### 4.1 Problem Statement

**Before locking:** Downstream agents could re-parse transcription and overwrite user corrections:
```
1. Proof Mode: User corrects "26mm" → "29mm"
2. Agent stores correction in userProvidedFields
3. Narrative generation re-reads transcription: "twenty six millimeter"
4. Agent overwrites with "26mm" from transcription
5. ❌ User correction lost!
```

**Solution:** Structural lock prevents re-extraction after proof confirmation.

### 4.2 Technical Implementation

#### 4.2.1 Schema Changes

**Add to `MedicalContext`:**
```typescript
interface MedicalContext {
  // ... existing fields ...

  // NEW: Locked facts from proof mode
  lockedFacts?: Record<string, any>;  // Field path → locked value
  proofModeCompleted?: boolean;       // Flag: proof mode confirmed
  proofSessionId?: string;            // Audit trail
}
```

**Add to `KeyFact`:**
```typescript
interface KeyFact {
  // ... existing fields ...

  // RECOMMENDED: Canonical value for precision
  canonicalValue?: any;  // Underlying truth (e.g., 29 for "29mm")

  // Ensures spokenText formatting never alters data
  // Example: spokenText = "twenty nine millimeters", canonicalValue = 29
}
```

#### 4.2.2 Proof Mode Confirmation Flow

```typescript
// When user clicks "Approve & Continue" in proof dialog
const handleProofConfirmed = (corrections: Record<string, any>) => {
  // 1. Merge user corrections into extracted data
  const finalFacts = applyCorrections(extractedData, corrections);

  // 2. Create locked facts map (field path → canonical value)
  const lockedFacts: Record<string, any> = {};
  keyFacts.forEach(fact => {
    const finalValue = corrections[fact.fieldPath] ?? fact.canonicalValue ?? fact.value;
    lockedFacts[fact.fieldPath] = finalValue;
  });

  // 3. Update context with locked facts
  const updatedContext: MedicalContext = {
    ...originalContext,
    lockedFacts,
    proofModeCompleted: true,
    proofSessionId: session.id,
    userProvidedFields: corrections  // Also keep for backward compat
  };

  // 4. Reprocess agent with locked context
  await reprocessWithLockedFacts(
    session.agentType,
    session.transcription,
    updatedContext
  );
};
```

#### 4.2.3 Agent Enforcement Logic

**In each procedural agent's `process()` method:**

```typescript
async process(input: string, context?: MedicalContext): Promise<Report> {
  // PHASE 1: Check for locked facts BEFORE extraction
  if (context?.lockedFacts && context.proofModeCompleted) {
    console.log('🔒 Using locked facts from proof mode');

    // Skip extraction entirely - use locked facts directly
    const extractedData = this.buildFromLockedFacts(context.lockedFacts);

    // Proceed directly to narrative generation (skip validation)
    return this.generateNarrative(extractedData, input, context);
  }

  // PHASE 2: Normal extraction workflow (if no locked facts)
  const extracted = this.extractValidationData(input);
  const validated = await this.validateAndDetectGaps(extracted, input);

  // ... rest of extraction logic ...
}

/**
 * Build extractedData structure from locked facts.
 * Locked facts take precedence over ALL other sources.
 */
private buildFromLockedFacts(lockedFacts: Record<string, any>): ExtractedData {
  const data: ExtractedData = {};

  for (const [fieldPath, value] of Object.entries(lockedFacts)) {
    setNestedField(data, fieldPath, value);
  }

  return data;
}
```

#### 4.2.4 Narrative Generation Enforcement

**Updated system prompts (example for TAVI):**

```typescript
export const TAVISystemPrompts = {
  primaryPrompt: `You are a specialist interventional cardiologist...

  CRITICAL DATA HANDLING:
  - You will receive STRUCTURED DATA with user-confirmed facts
  - These facts have been verified via Proof Mode
  - DO NOT re-extract values from the transcription
  - DO NOT override structured data with transcription text
  - Transcription is for CONTEXT ONLY (narrative flow, patient response, etc.)
  - All measurements, device sizes, and technical details MUST come from structured data

  Example:
  ✅ CORRECT: Use structuredData.valveSizing.prosthesisSize = 29
  ❌ WRONG: Parse "twenty six millimeter" from transcription → 26mm

  If structured data is missing a field, note "not documented" - do not invent values.
  `,

  // ... rest of prompts ...
};
```

#### 4.2.5 Audit Trail

```typescript
// Save proof mode session for audit
interface ProofModeAudit {
  sessionId: string;
  timestamp: number;
  agentType: AgentType;
  originalFacts: KeyFact[];
  corrections: Record<string, any>;
  finalLockedFacts: Record<string, any>;
  userId?: string;  // If available
}

// Stored in SessionStorageService
const auditRecord: ProofModeAudit = {
  sessionId: session.id,
  timestamp: Date.now(),
  agentType: 'tavi',
  originalFacts: keyFacts,
  corrections: userCorrections,
  finalLockedFacts: context.lockedFacts,
};

await sessionStorage.saveProofAudit(auditRecord);
```

### 4.3 Enforcement Checklist

**✅ Fact locking is enforced at:**
1. **Agent entry point** - `process()` checks `lockedFacts` first
2. **Data structure** - `lockedFacts` map is authoritative
3. **Generation prompts** - Explicit instructions to use structured data only
4. **Type safety** - `MedicalContext` interface requires `lockedFacts?` field
5. **Audit trail** - Proof sessions logged for review

**❌ NOT enforced by:**
- System prompt wording alone (agents check context first)
- User guidelines (structural enforcement, not policy)
- Downstream validation (lock happens BEFORE validation)

---

## 5. Public/Silent Workflow Confirmation

### 5.1 Visual Mode is Complete & Standalone

**Scenario:** User is on ward rounds (public, silent environment).

**Workflow:**
1. User dictates TAVI procedure in office (private)
2. Whisper transcribes → Agent extracts facts
3. Proof Mode opens in **Visual mode** (default if in public)
4. User sees 10 facts in categorized tree
5. User scans visually, clicks "Annulus diameter: 23mm"
6. Inline edit: types "25" → value updates to "25mm"
7. Visual checkmark appears next to corrected fact
8. User clicks "Approve & Continue"
9. Agent generates narrative with locked facts
10. ✅ Complete workflow with ZERO audio

**No audio required:**
- No TTS synthesis calls
- No audio playback
- No speaker/headphones needed
- Works in airplane mode (after models loaded)

### 5.2 Audio is Optional Enhancement

**Audio mode advantages:**
- Hands-free (eyes on patient charts while listening)
- Efficient for long fact lists (passive listening vs. active reading)
- Accessibility (visually impaired users)

**When audio unavailable:**
- TTS service offline → Visual mode auto-selected
- Public environment → User manually switches to Visual
- No audio device → Visual mode works perfectly

**Graceful degradation:**
```typescript
// On proof mode open
const defaultMode = await detectDefaultMode();

async function detectDefaultMode(): Promise<'audio' | 'visual'> {
  // Check 1: TTS service available?
  const ttsAvailable = await ttsService.checkServerHealth();
  if (!ttsAvailable) return 'visual';

  // Check 2: Audio output device available?
  const hasAudioOutput = await navigator.mediaDevices.enumerateDevices()
    .then(devices => devices.some(d => d.kind === 'audiooutput'));
  if (!hasAudioOutput) return 'visual';

  // Check 3: User preference from settings
  const userPref = await getUserPreference('proofModeDefault');
  if (userPref) return userPref;

  // Default: Audio (if all checks pass)
  return 'audio';
}
```

### 5.3 Mode Switcher Always Visible

```tsx
<ModeSwitcher>
  <Button
    icon={<Volume2 />}
    active={mode === 'audio'}
    disabled={!ttsAvailable}
    onClick={() => setMode('audio')}
  >
    Audio
  </Button>

  <Button
    icon={<Eye />}
    active={mode === 'visual'}
    onClick={() => setMode('visual')}
  >
    Visual
  </Button>
</ModeSwitcher>

{!ttsAvailable && (
  <Notice variant="info">
    TTS service offline - using Visual mode
  </Notice>
)}
```

---

## 6. Updated Timeline (Audio + Visual Only)

### Phase 1: Core Implementation (7 days)

**Day 1: Python TTS Service**
- Add Chatterbox endpoint to `whisper-server.py`
- Test voice quality with medical terminology
- Health check integration

**Day 2-3: Visual Mode**
- `VisualProofMode` component (tree/card layout)
- Category sections (collapsible, color-coded)
- Inline editing with confidence indicators
- Keyboard navigation

**Day 4: Audio Mode**
- `AudioProofMode` component (reuses TranscriptionSection pattern)
- TTS playback with audio scrubber
- Sequential fact reading with pauses
- Play/pause/seek controls

**Day 5: Mode Switching & State**
- Unified `KeyFactsProofDialog` wrapper
- Mode switcher toolbar
- State persistence across mode changes
- Correction merging

**Day 6: Agent Integration**
- Add `extractKeyFacts()` to TAVI, AngioPCI, RHC, mTEER
- Fact locking enforcement (`lockedFacts` in context)
- Reprocessing flow updates

**Day 7: Testing & Polish**
- E2E tests (both modes)
- TTS offline fallback scenarios
- Visual mode accessibility (keyboard-only)
- UI/UX polish (animations, error states)

**Total: 7 days (1 week)**

### Phase 2: Conversational Mode (Future)

**Scope:**
- Bottom drawer chat UI (WardConversation pattern)
- NLU parsing for natural corrections
- Session tracking and resumption
- Voice navigation commands
- Multi-turn conversation history

**Timeline:** +3-4 days (after Phase 1 validated)

---

## 7. Final Confirmation

**✅ Public/Silent Workflows Fully Supported:**
- Visual mode is complete, first-class feature (not fallback)
- Works without TTS, audio devices, or network (after models loaded)
- Faster than audio for quick scans (see all facts at once)

**✅ Audio is Optional, Not Assumed:**
- TTS service offline → Visual mode auto-selected
- Mode switcher always visible
- User can switch modes anytime
- Graceful degradation with clear UI feedback

**✅ Fact Locking is Structurally Enforced:**
- `lockedFacts` map in `MedicalContext`
- Agents check locked facts BEFORE extraction
- Transcription becomes read-only after proof
- Audit trail for corrections

**✅ Chatterbox MLX Only:**
- No Piper references remaining
- Single default voice (neutral, clear)
- MLX-native (~2GB model, 100-200ms inference)
- Same stack as Whisper (no new dependencies)

**✅ Phase 1 Scope is Tight:**
- Audio + Visual modes only
- Conversational mode explicitly deferred to Phase 2
- Timeline reduced to 7 days (1 week)

---

## 8. Implementation Readiness Checklist

Before implementation begins, confirm:

- [ ] Chatterbox TTS model tested with medical terms (valve sizes, measurements)
- [ ] Visual mode UI reviewed against AngioPCI lesion dialog pattern
- [ ] Fact locking enforcement pattern approved
- [ ] Phase 1 scope confirmed (Audio + Visual only, no conversational)
- [ ] Default mode logic approved (Visual if TTS unavailable)
- [ ] `canonicalValue` in `KeyFact` schema approved (recommended)
- If TTS is unavailable or muted, the system must never warn or error — it simply defaults to Visual mode.
---

**END OF IMPLEMENTATION READINESS ADDENDUM**
