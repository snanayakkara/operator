# UI Consistency Guide

This document explains the UI consistency framework implemented across the Operator application and identifies which components have custom layouts vs standardized layouts.

## Core Principle

**"Same task = Same UI"** - If two agents perform the same underlying action (showing progress, copying text, displaying results), they use the **same component** with the **same visual design**.

Agent-specific complexity lives in designated content areas, not in chrome/buttons/status displays.

---

## Standardized Components

### 1. Progress Indicators
**Single Source of Truth:** `UnifiedPipelineProgress`

- **Used by:** ALL agents (TAVI, QuickLetter, AI Review, Consultation, etc.)
- **Display:** Segmented progress bar with 4 stages:
  - Audio Processing (0-10%)
  - Transcribing (10-40%)
  - AI Analysis (40-90%)
  - Generation (90-100%)
- **Features:** Live elapsed time, adaptive ETA, model identification
- **Colors:** Derived from shared `stateColors.ts`

**Replaced components:**
- ❌ `ProcessingPhaseIndicator` (removed)
- ❌ `FieldIngestionOverlay` (removed)
- ❌ Custom `ProcessingIndicator` for TAVI (removed)

---

### 2. State Colors
**Single Source of Truth:** `utils/stateColors.ts`

Consistent color theming across all components:
- 🔴 **Recording**: Red gradients
- 🔵 **Transcribing**: Blue gradients
- 🟣 **AI Analysis**: Purple gradients
- 🟢 **Generation**: Emerald gradients
- 🟦 **Completed**: Teal gradients
- 🟡 **Needs Review**: Amber gradients
- 🔴 **Error**: Rose gradients

**Used by:**
- `UnifiedPipelineProgress` (pipeline stages)
- `SessionDropdown` (timeline cards)
- Status indicators across the app

---

### 3. Transcription Section
**Single Source of Truth:** `TranscriptionSection`

- **Used by:** ALL agents that produce transcriptions
- **Display:** Expandable/collapsible section with audio playback
- **Actions:** Copy, Insert, Edit (consistent across all agents)
- **Features:**
  - Transcription approval controls (Perfect/Edit/Skip) for training data quality
  - Audio playback with timestamps
  - Editing with auto-save
  - Reprocess option

**Implementation locations:**
- `OptimizedResultsPanel` (default for most agents)
- `RightHeartCathDisplay` (embedded)
- `TAVIWorkupDisplay` (shown via parent)
- All other agents (shown via OptimizedResultsPanel)

---

### 4. Action Buttons
**Single Source of Truth:** `ActionButtons`

Standard actions with extensible custom actions:
- **Core actions:** Copy, Insert to EMR, Download
- **Optional:** AI Reasoning viewer (when artifacts available)
- **Custom actions:** Agent-specific via `customActions` prop

**Example:**
```typescript
<ActionButtons
  results={results}
  agentType="quick-letter"
  onCopy={handleCopy}
  onInsertToEMR={handleInsert}
  customActions={[
    {
      id: 'patient-version',
      label: 'Patient Version',
      icon: Users,
      onClick: handleGeneratePatientVersion,
      variant: 'primary'
    }
  ]}
/>
```

**Used by:** Generic agents (Background, Medication, Imaging, etc.)

---

### 5. Results Container (Optional)
**Component:** `ResultsContainer`

Provides standardized layout wrapper for future use:
- Header (title, metadata, status) - consistent
- Transcription section (always visible when available)
- Agent-specific content area (flexible slot)
- Action buttons footer (standardized)

**Status:** Created for future expansion, not yet fully adopted

---

## Custom Layout Components

Some agents have specialized workflows that warrant custom displays. These are **intentionally different** because they serve unique purposes:

### 1. Quick Letter (Dual/Triple Card)
**Component:** Custom layout in `OptimizedResultsPanel`

**Why custom:**
- Shows **Summary** + **Letter** + optional **Patient Version** as separate cards
- Each card has its own Copy/Insert/Download actions
- "Generate Patient Version" button creates third card
- Workflow requires side-by-side comparison

**Custom elements:**
- Three color-coded cards (Emerald/Blue/Purple)
- Per-card action buttons
- Dynamic card appearance (Patient Version optional)

**Justification:** The multi-card comparison workflow is unique to QuickLetter and cannot be standardized without losing functionality.

---

### 2. Patient Education
**Component:** `PatientEducationOutputCard`

**Why custom:**
- Dual-box layout: **Letter** + **Structured JSON Metadata**
- Letter box: Patient-friendly advice with copy/insert
- JSON box: Structured action plan with export to PDF
- Metadata section: Priority, modules, Australian guidelines, resources
- Warnings/errors display specific to education generation

**Custom elements:**
- Two-box vertical layout
- Priority badges (high/medium/low)
- Guidelines and resources lists
- PDF export functionality
- Custom disclaimer section

**Justification:** Patient Education produces structured JSON alongside letter content, requiring a specialized two-panel view for clinical and structured data.

---

### 3. TAVI Workup
**Component:** `TAVIWorkupDisplay`

**Why custom:**
- Complex structured medical data (patient info, pre-op, intra-op, post-op)
- Expandable sections with medical terminology preservation
- Data grid layout for clinical values
- Section-specific copy functionality

**Custom elements:**
- Grouped expandable sections
- Clinical data grids
- Medical term highlighting
- Section navigation

**Justification:** TAVI reports contain dense clinical data organized into specific phases (pre/intra/post-op) that require specialized structured display.

---

### 4. Right Heart Catheterization
**Component:** `RightHeartCathDisplay`

**Why custom:**
- Haemodynamic data tables (pressures, cardiac output, resistances)
- Clinical calculations and derived values
- Structured medical findings
- Severity indicators

**Custom elements:**
- Data tables with clinical ranges
- Calculated values display
- Severity color coding
- Embedded transcription section

**Justification:** RHC produces quantitative haemodynamic data requiring table-based display with clinical context.

---

### 5. AI Review Cards
**Component:** `AIReviewCards`

**Why custom:**
- Finding cards with severity levels
- Guideline compliance checks
- Recommendation prioritization
- Multiple findings organized by category

**Custom elements:**
- Finding cards with severity badges
- Category grouping (high/medium/low priority)
- Guideline reference links
- Action recommendations

**Justification:** AI Medical Review produces multiple discrete findings that require card-based organization with severity indicators.

---

## Design Decision Tree

Use this to determine whether to use standard or custom components:

```
Does the agent produce...

├─ Simple text report?
│  └─ Use: ActionButtons + ReportDisplay ✅
│
├─ Report with transcription?
│  └─ Use: TranscriptionSection + ActionButtons ✅
│
├─ Multiple distinct outputs (summary + letter)?
│  ├─ Can they share actions? → Use ActionButtons with custom content
│  └─ Need separate actions? → Custom layout (like QuickLetter)
│
├─ Structured medical data (tables/grids)?
│  └─ Custom display component (like TAVI/RHC) ✅
│
├─ Multiple findings/recommendations?
│  └─ Card-based custom layout (like AI Review) ✅
│
└─ Mixed text + structured JSON?
   └─ Dual-panel custom layout (like Patient Education) ✅
```

---

## Consistency Checklist

When adding a new agent, ensure:

### ✅ Always Use:
- [ ] `UnifiedPipelineProgress` for all processing states
- [ ] `TranscriptionSection` if agent produces transcription
- [ ] Shared state colors from `stateColors.ts`
- [ ] Consistent typography and spacing

### ✅ Use When Possible:
- [ ] `ActionButtons` for Copy/Insert/Download actions
- [ ] `ResultsContainer` for simple reports
- [ ] Standard card variants from animation utilities

### ✅ Custom Layout Justified When:
- [ ] Multiple distinct outputs requiring separate actions
- [ ] Structured data requiring tables/grids
- [ ] Specialized workflow (e.g., multi-step comparison)
- [ ] Unique data format (e.g., JSON + letter)

---

## Migration Status

### ✅ Fully Standardized:
- All agents → `UnifiedPipelineProgress`
- All agents → Shared state colors (`stateColors.ts`)
- All agents with transcription → `TranscriptionSection`

### ⚠️ Intentionally Custom (No Migration Needed):
- QuickLetter → Dual/triple card layout
- Patient Education → Two-box layout (letter + JSON)
- TAVI Workup → Structured medical display
- Right Heart Cath → Haemodynamic tables
- AI Medical Review → Finding cards

### ✅ Using Standard Components:
- Background, Medication, Bloods, Imaging, Investigation Summary, Consultation → `ActionButtons` + `ReportDisplay`

---

## Future Considerations

### Potential Enhancements:
1. **ResultsContainer Adoption**: Gradually migrate simple agents to use `ResultsContainer` wrapper
2. **Custom Action Library**: Build library of common custom actions (PDF export, patient version generation, etc.)
3. **Layout Templates**: Create template layouts for common patterns (dual-card, data-grid, finding-cards)

### Do NOT Standardize:
- Components with fundamentally different data structures (TAVI, RHC, Patient Ed)
- Workflows requiring unique user interactions (QuickLetter comparison, AI Review prioritization)
- Specialized medical displays (clinical tables, severity indicators)

---

## Summary

**Standardized:** Progress bars, colors, transcription section, basic actions
**Custom (Justified):** QuickLetter, Patient Education, TAVI, RHC, AI Review

This balance ensures consistency where it matters (core UX) while preserving specialized functionality where needed (complex medical displays).
