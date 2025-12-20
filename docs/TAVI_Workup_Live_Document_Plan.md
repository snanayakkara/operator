# TAVI Workup "Live Document" System - Final Implementation Plan

## 🎯 Executive Summary

Transform TAVI Workup from a **one-off document generator** to a **persistent, Notion-synced workup list** with incremental editing and bento box presentation mode + Synoptic imaging viewer integration.

**Key Changes:**
- Replace single-use TAVI quick action with persistent workup list
- Notion acts as patient list source (one-way fetch)
- Extension stores all workup data locally (chrome.storage.local)
- Audio dictation can append to any section at any time
- Presentation mode generates bento box HTML with iframe embed of Synoptic viewer

---

## ✅ User Requirements (Confirmed)

### Notion Database Schema
From screenshot:
- **Patient** (title), **Referral Date**, **Referrer**, **Notes**, **Location**
- **Status** (pending/in-progress/completed/presented)
- **Procedure Date**, **Days to procedure**, **Ready To Present**, **Category**, **Date Presented**

### Workflows
- **Auto-extraction from Xestro EMR**: When workup is opened/created, automatically pull Background, Investigation Summary, and Medications from EMR (uses existing agent extraction methods)
- **Audio dictation**: Parse and auto-fill fields → manual entry fills gaps
- **Completeness tracking**: Automatic (detects filled sections)
- **Presentation mode**: Button → bento box HTML + Synoptic iframe
- **Syncing**: Notion = patient list source (fetch), Extension = workup data source (local)
- **List**: Group by Status, sort by Procedure Date, show progress %

### Synoptic Integration (Explored `/synoptic/`)
- **Project type**: Standalone React SPA (Vite, CornerstoneJS 3.0, Zustand)
- **Data format**: DICOM directory ingest → IndexedDB storage
- **NOT an npm package** (monolithic SPA, no component exports)
- **Integration approach**: Iframe embed (localhost:8080 or static deploy)
- **Communication**: PostMessage API for passing DICOM URLs ↔ measurements

---

## 🏗️ Architecture

### Data Model: `TAVIWorkupItem`

```typescript
// src/types/taviWorkup.types.ts (NEW FILE)
export interface TAVIWorkupItem {
  // Identity
  id: string; // UUID

  // Notion sync
  notionPageId?: string;
  notionStatus?: 'pending' | 'in-progress' | 'presented';
  notionUrl?: string;
  lastSyncedAt?: number;

  // Notion fields (from database)
  patient: string;
  referralDate?: string; // YYYY-MM-DD
  referrer?: string;
  location?: string;
  procedureDate?: string;
  readyToPresent?: boolean;
  category?: string;
  datePresented?: string;

  // Workup data (existing structure)
  structuredSections: TAVIWorkupStructuredSections; // 12 sections

  // EMR auto-extracted data (cached from Xestro)
  emrBackground?: string; // Auto-pulled from EMR Background field
  emrInvestigations?: string; // Auto-pulled from EMR Investigations field
  emrMedications?: string; // Auto-pulled from EMR Medications field
  emrLastExtracted?: number; // Timestamp of last extraction

  // Metadata
  createdAt: number;
  lastUpdatedAt: number;
  completionPercentage: number; // 0-100
  status: 'draft' | 'ready' | 'presented';

  // Validation
  validationResult?: ValidationResult;
  extractedData?: TAVIExtractedData;

  // Version history (optional Phase 2)
  versionHistory?: TAVIWorkupVersion[];
}
```

### Storage: `TAVIWorkupStorageService`

**Pattern**: Singleton with subscriber pattern (mirrors `RoundsStorageService`)

```typescript
// src/services/TAVIWorkupStorageService.ts (NEW FILE)
export class TAVIWorkupStorageService {
  private static STORAGE_KEY = 'TAVI_WORKUPS_V1';
  private static SAVE_DEBOUNCE_MS = 250;

  private cache: TAVIWorkupItem[] = [];
  private listeners = new Set<(workups: TAVIWorkupItem[]) => void>();

  // CRUD
  async loadWorkups(): Promise<TAVIWorkupItem[]>
  async saveWorkups(workups: TAVIWorkupItem[]): Promise<void>
  async updateWorkup(id: string, updater: (w: TAVIWorkupItem) => TAVIWorkupItem): Promise<void>
  async deleteWorkup(id: string): Promise<void>

  // Subscription
  subscribe(listener: (workups: TAVIWorkupItem[]) => void): () => void

  // Debounced persistence (250ms)
  private schedulePersist(): void
  private async persist(): Promise<void>
}
```

### Notion Sync: `NotionStructuralWorkupService`

**Pattern**: Similar to `NotionBillingService` (one-way fetch + smart schema detection)

```typescript
// src/services/NotionStructuralWorkupService.ts (NEW FILE)
export class NotionStructuralWorkupService {
  // Fetch patient list from Notion (one-way)
  async fetchPatientList(): Promise<NotionTAVIPatient[]> {
    // Query Notion database with filter (Status != 'Presented')
    // Sort by Procedure Date ASC
    // Parse properties → NotionTAVIPatient objects
  }

  // Push status updates to Notion (one-way)
  async updateWorkupStatus(notionPageId: string, status: 'pending' | 'in-progress' | 'presented'): Promise<void>

  async markReadyToPresent(notionPageId: string, ready: boolean): Promise<void>

  // Config
  async isAvailable(): Promise<boolean>
  async reloadConfig(): Promise<void>
}
```

### Context: `TAVIWorkupContext`

**Pattern**: React Context with producer functions (mirrors `RoundsContext`)

```typescript
// src/contexts/TAVIWorkupContext.tsx (NEW FILE)
interface TAVIWorkupContextValue {
  workups: TAVIWorkupItem[];
  loading: boolean;
  selectedWorkupId: string | null;
  selectedWorkup: TAVIWorkupItem | null;
  notionAvailable: boolean;
  notionPatients: NotionTAVIPatient[];

  // CRUD
  setSelectedWorkupId: (id: string | null) => void;
  createWorkup: (notionPatient?: NotionTAVIPatient) => Promise<TAVIWorkupItem>;
  updateWorkup: (id: string, updater: (w: TAVIWorkupItem) => TAVIWorkupItem) => Promise<void>;
  deleteWorkup: (id: string) => Promise<void>;

  // Dictation
  generateFullWorkup: (dictation: string) => Promise<TAVIWorkupItem>; // Initial generation
  appendToSection: (workupId: string, section: string, dictation: string) => Promise<void>; // Incremental

  // Notion
  refreshNotionList: () => Promise<void>;
  syncWorkupStatus: (workupId: string, status: string) => Promise<void>;

  // Presentation
  generatePresentation: (workupId: string) => Promise<string>; // Returns file path
}

// Provider polls Notion every 60s, subscribes to storage changes
```

---

## 📁 Critical Files (Create/Modify)

### New Files (Create)

**Types:**
1. `src/types/taviWorkup.types.ts` - `TAVIWorkupItem`, `NotionTAVIPatient`, `TAVIWorkupVersion`

**Services:**
2. `src/services/TAVIWorkupStorageService.ts` - Local storage with debounced persistence
3. `src/services/NotionStructuralWorkupService.ts` - Notion API integration
4. `src/services/TAVIWorkupIncrementalService.ts` - Parse + merge incremental dictation
5. `src/services/TAVIWorkupPresentationService.ts` - Generate bento box HTML
6. `src/services/TAVIWorkupMigrationService.ts` - Migrate old sessions (if needed)

**Context:**
7. `src/contexts/TAVIWorkupContext.tsx` - React Context provider

**Components:**
8. `src/sidepanel/components/taviWorkup/TAVIWorkupListView.tsx` - Sidebar list (status groups)
9. `src/sidepanel/components/taviWorkup/TAVIWorkupDetailEditor.tsx` - Main editor panel
10. `src/sidepanel/components/taviWorkup/EditableTAVIWorkupDisplay.tsx` - Editable section display
11. `src/sidepanel/components/taviWorkup/DictateSectionModal.tsx` - Incremental dictation modal
12. `src/sidepanel/components/taviWorkup/NotionPatientCard.tsx` - Import card for Notion patients
13. `src/sidepanel/components/taviWorkup/MetadataField.tsx` - Editable field component

### Modified Files (Update)

14. `src/config/unifiedActionsConfig.ts` - Remove `tavi-workup` action, add `open-structural-workups`
15. `src/config/notionConfig.ts` - Add `databases.structuralWorkup` field (already exists)
16. `src/services/ActionExecutor.ts` - Remove `tavi-workup` case, add `open-structural-workups` handler
17. `src/sidepanel/OptimizedApp.tsx` - Add `structural-workups` view + tab button
18. `src/options/components/NotionSettingsSection.tsx` - Already has Structural Workup DB ID field ✅
19. `src/types/medical.types.ts` - Mark `TAVIWorkupReport` as deprecated (optional)

---

## 🔄 Implementation Phases

### Phase 1: Foundation (Data + Storage) — 2-3 days
**Goal**: Persistent workup storage with CRUD operations

**Tasks:**
1. Create `TAVIWorkupItem` type definition (`src/types/taviWorkup.types.ts`)
2. Implement `TAVIWorkupStorageService` (CRUD + debounced persistence + subscription)
3. Write unit tests for storage (load/save/update/delete)
4. Create empty `TAVIWorkupContext` provider
5. Add "Structural Workups" tab to `OptimizedApp.tsx` (empty state)

**Deliverables:**
- Can create/list/delete workups in memory
- State persists to `chrome.storage.local`
- Empty "Workups" tab shows in main UI

---

### Phase 2: Notion Integration — 2-3 days
**Goal**: Fetch patient list from Notion, sync status updates

**Tasks:**
1. Implement `NotionStructuralWorkupService`
   - `fetchPatientList()` - query database with filter/sort
   - `updateWorkupStatus()` - push status to Notion
   - Schema detection for field name flexibility
2. Add polling in `TAVIWorkupContext` (every 60s)
3. Build `NotionPatientCard` component (import button → creates workup)
4. Handle offline mode (cache last-fetched list, show warning banner)

**Deliverables:**
- Notion patient list fetches and displays in UI
- Can import Notion patient → creates new workup
- Status syncs back to Notion (pending → in-progress → presented)
- Works offline (local-first)

---

### Phase 3: Core Editing UI + EMR Auto-Extraction — 3-4 days
**Goal**: View and edit workup details with auto-populated EMR data

**Tasks:**
1. **EMR Auto-Extraction**: Integrate existing EMR extraction methods
   - Reuse `extractEMRData()` pattern from agents (already calls content script)
   - On workup open/create: auto-pull Background, Investigations, Medications
   - Cache extracted data in workup (`emrBackground`, `emrInvestigations`, `emrMedications`)
   - Pre-populate relevant sections (Background → `background` section, Investigations → `investigations` section, Meds → `medications` section)
   - Show "Extracted from EMR" badge + refresh button
2. Build `TAVIWorkupListView` (sidebar overlay)
   - Status groups (Draft/Ready/Presented)
   - Progress indicators (completion %)
   - Click to select workup
3. Build `TAVIWorkupDetailEditor` (main panel)
   - Metadata fields (patient, dates, referrer, location) - editable
   - Section display (reuse `TAVIWorkupDisplay` but make editable)
   - Action buttons (Dictate, Copy, Insert, Present, Sync Status)
   - EMR data refresh button (re-extract from EMR)
4. Implement inline editing for sections (click → textarea → save)
5. Add progress calculation (count filled sections / 12)

**Deliverables:**
- Can view workup details in main panel
- EMR Background/Investigations/Medications auto-populate on open
- Can manually refresh EMR data with button
- Can edit metadata fields
- Can manually edit section content (textarea)
- Progress updates automatically

---

### Phase 4: Incremental Dictation — 3-4 days
**Goal**: Dictate additional content to any section

**Tasks:**
1. Implement `TAVIWorkupIncrementalService`
   - `appendToSection()` - parse dictation → merge into existing content
   - Merge strategy: append with separator (default) or replace
   - Version history tracking (snapshots)
2. Build `DictateSectionModal`
   - Record audio → Whisper transcription
   - Parse with lightweight model (no full validation workflow)
   - Show preview → merge into workup
3. Add "Dictate Section" button to each section in editor
4. Implement undo/redo via version snapshots (optional)

**Deliverables:**
- Can dictate additional content to any section
- Content intelligently merges (append mode)
- Version history allows undo (optional)

---

### Phase 5: Full Generation Workflow — 2 days
**Goal**: Initial workup generation from scratch

**Tasks:**
1. Integrate existing `TAVIWorkupAgent` into `TAVIWorkupContext.generateFullWorkup()`
2. Preserve validation workflow (Regex → Quick Model → User Validation → LLM)
3. Populate new `TAVIWorkupItem` with generated sections
4. Add "Generate Full Workup" button (creates workup → runs agent → saves)
5. Handle migration from old sessions (optional script)

**Deliverables:**
- Can generate complete workup from scratch (existing flow)
- New workup saved as `TAVIWorkupItem` instead of `PatientSession`
- Old quick action removed from command bar

---

### Phase 6: Presentation Mode (Bento Box + Synoptic) — 4-5 days
**Goal**: Generate beautiful presentation HTML with imaging viewer

**Tasks:**
1. Implement `TAVIWorkupPresentationService`
   - Generate bento box HTML (responsive grid layout)
   - Large cards: Patient, CT, Clinical
   - Small cards: Labs, ECG, Echo, Medications, etc.
   - Alert card highlighted (red border)
   - CSS styling (Material-inspired, print-friendly)
2. Synoptic integration:
   - Build Synoptic: `cd /synoptic && npm run build` → `dist/`
   - Serve Synoptic: `pnpm -F mitral-flow dev` (localhost:8080)
   - Embed in presentation HTML via iframe
   - PostMessage API: Operator sends DICOM URLs → Synoptic loads → sends measurements back
3. Add "Present" button in `TAVIWorkupDetailEditor`
   - Generates HTML file
   - Saves to Downloads folder
   - Opens in default browser
4. Test bento box layout on desktop/tablet/print

**Deliverables:**
- "Present" button generates beautiful HTML page
- Bento box layout displays all 12 sections
- Synoptic iframe embedded (shows DICOM viewer)
- Opens in browser automatically

**Synoptic Integration Details:**
- **Build Synoptic**: `cd /Users/shane/SynologyDrive/Cloud/githubrepo/snanayakkara.github.io/synoptic && npm run build`
- **Serve**: `pnpm -F mitral-flow dev` (backend on port 8080)
- **Iframe src**: `http://localhost:8080/?mode=viewer&sessionId={workupId}`
- **PostMessage API**:
  ```typescript
  // Operator → Synoptic
  iframeRef.contentWindow.postMessage({
    type: 'LOAD_DICOM',
    payload: { dicomUrls: [...], workupId: '...' }
  }, 'http://localhost:8080');

  // Synoptic → Operator
  window.addEventListener('message', (event) => {
    if (event.data.type === 'TAVI_MEASUREMENTS') {
      updateWorkup(workupId, w => ({
        ...w,
        ctMeasurements: event.data.payload
      }));
    }
  });
  ```

---

### Phase 7: Polish + Migration — 1-2 days
**Goal**: Production readiness

**Tasks:**
1. Remove old TAVI Workup quick action from `unifiedActionsConfig.ts`
2. Add `open-structural-workups` action to command bar (shortcut: `Shift+W`)
3. Update keyboard shortcuts documentation
4. Add loading states and error handling
5. Test edge cases:
   - Notion API offline → show warning, continue locally
   - Conflicting data (two dictations with different values) → append mode
   - Workup edited in Notion while extension open → manual refresh button
6. Optional: Migrate old TAVI sessions to new format

**Deliverables:**
- Old quick action removed
- New "Structural Workups" accessible via command bar
- Robust error handling
- Clean migration path

---

## 🚨 Edge Cases & Mitigations

### 1. Notion API Down
**Mitigation**: Cache last-fetched patient list in storage; queue status updates for retry; show warning banner

### 2. Conflicting Data (e.g., dictate two valve sizes)
**Mitigation**: Append mode (default) - new content adds to existing with separator; user manually resolves conflicts; version history allows rollback

### 3. Partial Validation in Incremental Mode
**Mitigation**: Validation only runs for full generation; incremental updates skip checkpoint; show warnings for suspicious values (non-blocking)

### 4. Workup Edited in Notion During Extension Session
**Mitigation**: Extension only syncs status (one-way push); manual "Refresh from Notion" button; show diff modal if local changes exist

### 5. Synoptic Not Available (Port 8080 Closed)
**Mitigation**: Presentation mode still generates bento box HTML; iframe shows "Imaging viewer unavailable" message; graceful degradation

---

## 📊 Progress Tracking

**Completion Calculation:**
```typescript
function calculateCompletion(sections: TAVIWorkupStructuredSections): number {
  const totalSections = 11; // Exclude missing_summary
  let completed = 0;

  Object.keys(sections).forEach(key => {
    if (key === 'missing_summary') return;
    const section = sections[key];
    if (section?.content && section.content !== 'Not provided') {
      completed++;
    }
  });

  return Math.round((completed / totalSections) * 100);
}
```

**Visual Indicators:**
- Sidebar: Percentage badge (e.g., "73%")
- Detail view: Large circular progress ring
- Section-level: Green checkmark vs gray circle

---

## 🔗 Integration Points

### Remove Old TAVI Workup
- `src/config/unifiedActionsConfig.ts`: Delete `tavi-workup` entry
- `src/services/ActionExecutor.ts`: Remove `case 'tavi-workup'`

### Add New Structural Workups
- `src/config/unifiedActionsConfig.ts`: Add `open-structural-workups` action
- `src/sidepanel/OptimizedApp.tsx`: Add `structural-workups` view type + tab button + router
- Keyboard shortcut: `Shift+W`

---

## 🎨 UI Design Constraints (Chrome Sidepanel)

**Critical**: This entire application lives inside a **Chrome sidepanel extension** with LIMITED horizontal width (~400-450px default).

###Layout Pattern (from Rounds Reference)
- **Collapsed state** (default): Full-width detail panel, list hidden
- **Expanded state**: Overlay sidebar (max-w-md ~384px) slides in from left, detail panel remains visible
- **Mobile-first mindset**: All components must work in narrow viewports

### TAVIWorkupListView (Sidebar)
- **Width**: max-w-md (384px max)
- **Position**: Fixed overlay with backdrop blur when expanded
- **Layout**: Vertical stack
  - Header (patient count badge, refresh button)
  - Notion patient import section (collapsible)
  - Status groups (Draft/Ready/Presented) with expand/collapse
  - Each card: compact (name, procedure date, progress %, status badge)
- **Interaction**: Click card → selects workup → auto-collapses sidebar → detail panel shows

### TAVIWorkupDetailEditor (Main Panel)
- **Width**: 100% of sidepanel (400-450px)
- **Layout**: Vertical scroll
  - Compact header: patient name, status dropdown, progress ring (60px diameter)
  - **EMR data banner**: "Extracted from EMR [timestamp]" + refresh icon (shows when EMR data exists)
  - Metadata grid: 2 columns on desktop (dates/referrer/location), stacked on narrow
  - Section accordion: Each section collapsible with icon, title, completion indicator
    - Sections with EMR data show "Auto-filled" badge (blue)
  - Sticky action bar at bottom: Present | Dictate | Copy buttons (icon + text on >400px, icon-only on <400px)
- **Typography**: Small font sizes (text-sm default, text-xs secondary)
- **No horizontal scroll**: All content wraps

### EditableTAVIWorkupDisplay (Section Cards)
- **Pattern**: Reuse existing TAVIWorkupDisplay component structure
- **Edit mode**: Click section → textarea overlay (full-width)
- **Actions per section**:
  - Dictate button (microphone icon + "Add")
  - Edit button (pencil icon)
  - Collapse/expand toggle
- **Compact**: No side-by-side layouts (everything stacks vertically)

### DictateSectionModal
- **Width**: Full sidepanel width minus 32px padding
- **Height**: Max 80vh, scroll if needed
- **Controls**: Large touch targets (min 44px height for buttons)
- **Audio visualizer**: Simplified (no complex waveforms, just live level meter)

### NotionPatientCard (Import Card)
- **Compact**: Single column, small padding
- **Info**: Name (bold), procedure date, status badge
- **Action**: "Import" button (icon + text, full width)
- **Badge**: Completion % if partially filled

### Key UI Principles
1. **Vertical-first**: Stack all elements vertically, no horizontal layouts
2. **Icon + text labels**: Use icons with text on buttons (helps narrow widths)
3. **Collapsible everything**: Reduce scrolling with accordions
4. **Touch-friendly**: 44px min hit targets for interactive elements
5. **Sticky actions**: Keep critical buttons (Present, Dictate) always visible at bottom
6. **Progressive disclosure**: Hide complexity (Notion sync details, version history) behind expand/info icons

### Reference Existing Patterns
- **Rounds patient list**: Status groups, compact cards, drag handles
- **Session timeline**: Gradient status colors, completion badges
- **Command bar**: Keyboard shortcuts, fuzzy search

---

## 🎯 Success Criteria

**MVP Definition:**
1. ✅ Can create/edit/delete workups persistently
2. ✅ Notion patient list fetches and imports
3. ✅ Status syncs back to Notion
4. ✅ EMR Background/Investigations/Medications auto-extract on workup open
5. ✅ Can dictate full workup (initial generation)
6. ✅ Can dictate incremental updates to any section
7. ✅ Presentation mode generates bento box HTML
8. ✅ Synoptic iframe embedded in presentation
9. ✅ Progress indicators work
10. ✅ Old TAVI quick action removed

**Future Enhancements:**
- Version history with visual diff
- Smart conflict detection (LLM-based)
- Synoptic measurement auto-import
- Export to PDF (jsPDF)
- Multi-workup comparison view

---

## 📝 Next Steps

1. **Confirm plan approval** with user
2. **Start Phase 1**: Create types + storage service + context
3. **Iterate through phases** with regular user testing
4. **Test Synoptic integration** early (Phase 6 dependency)

---

**Estimated Total Time**: 18-23 days
**Recommended Approach**: Incremental delivery (1 phase per week)
**Risk Areas**: Synoptic PostMessage API (needs testing), Notion schema changes (needs validation)
