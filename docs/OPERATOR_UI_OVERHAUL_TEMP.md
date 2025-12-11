# OPERATOR UI OVERHAUL - Design Document

> **TEMPORARY DESIGN DOC** - SAFE TO DELETE AFTER UI OVERHAUL IS COMPLETE.

**Version**: 3.43.0 (Proposed)
**Date**: December 2025
**Status**: Design Phase

---

## 1. Overview

This document specifies the UI overhaul for Operator's Chrome side panel, transitioning from a **footer-based quick actions** pattern to a **header-command-bar-first** design.

### Goals
- **Command bar as the brain**: Single entry point for all actions via search (Cmd+K)
- **Favourites row**: 4 quick-access actions always visible
- **Grouped actions drawer**: All 27+ actions organized into 6 collapsible groups
- **Remove RecordPanel**: Unify all workflow launching through the header
- **Minimal second row**: Session dropdown, queue status, mobile jobs in compact row

### Design Mood
- **70%** Calm productivity app (Notion/Linear-style minimalism)
- **30%** Clinical instrument panel (precision, information-oriented)
- Light theme first, violet accent (#8B5CF6)
- Quick, snappy animations (120-220ms)

---

## 2. Layout Structure

### Current (Footer-Based)
```
┌─────────────────────────────────┐
│ SidebarHeader                   │  ← Logo, state chip, icons (row 1)
│ Device Summary Button           │  ← Row 2 (collapsible)
├─────────────────────────────────┤
│                                 │
│         Main Content            │  ← Scrollable
│                                 │
├─────────────────────────────────┤
│ QuickActionsGrouped (footer)    │  ← RecordPanel + action buttons
└─────────────────────────────────┘
```

### Proposed (Header-Command-Bar)
```
┌─────────────────────────────────┐
│ Row 1: Logo | Patient | Gear    │  ← Mini header (40px)
├─────────────────────────────────┤
│ Row 2: Sessions | Queue | Jobs  │  ← Utility row (32px)
├─────────────────────────────────┤
│ Command Bar [Type or Cmd+K...] │  ← Search input (44px)
├─────────────────────────────────┤
│ Favourites: L | B | I | Wrap   │  ← 4 action buttons (48px)
├─────────────────────────────────┤
│                                 │
│         Main Content            │  ← Scrollable (no footer)
│                                 │
└─────────────────────────────────┘
```

When command bar is focused, ActionsDrawer replaces Favourites:
```
├─────────────────────────────────┤
│ Command Bar [search query...]   │  ← Focused
├─────────────────────────────────┤
│ ┌─ Workflows ──────────────┐    │
│ │ Quick Letter  Consult... │    │  ← Grouped actions
│ └──────────────────────────┘    │
│ ┌─ Patient Context ────────┐    │
│ │ Background   Medications │    │
│ └──────────────────────────┘    │
└─────────────────────────────────┘
```

---

## 3. Component Specifications

### 3.1 AppHeader (Master Container)

**File**: `src/sidepanel/components/AppHeader.tsx`

**Structure**:
```
AppHeader
├── Row 1: MiniHeader
│   ├── Left: Logo badge ("O") + "Operator" text
│   ├── Center: (empty)
│   └── Right: Patient indicator (if active) + Settings gear
│
├── Row 2: UtilityRow (NEW - to add)
│   ├── SessionDropdown (compact icon + badge)
│   ├── QueueStatusDisplay (compact)
│   └── MobileJobsButton (icon + badge)
│
├── Row 3: CommandBar
│   └── Search input with Cmd+K hint
│
├── Row 4a: FavouritesRow (when command closed)
│   └── 4 action buttons (Quick Letter, Background, Investigations, Wrap Up)
│
└── Row 4b: ActionsDrawer (when command open)
    └── Grouped, collapsible action sections
```

**Current State**: Missing Row 2 (UtilityRow). Device summary should move to QuickSettingsDrawer.

**Required Changes**:
1. Add `UtilityRow` component between MiniHeader and CommandBar
2. Import SessionDropdown, QueueStatusDisplay, MobileJobsPanel from SidebarHeader
3. Add device summary section to QuickSettingsDrawer
4. Pass session/queue/mobile props through AppHeader

### 3.2 UtilityRow (NEW)

**Purpose**: Compact row for secondary header elements (sessions, queue, mobile jobs)

**Props**:
```typescript
interface UtilityRowProps {
  // State display
  status: ProcessingStatus;
  isRecording: boolean;
  micAvailable: boolean;

  // Session management
  patientSessions: PatientSession[];
  selectedSessionId?: string;
  currentSessionId?: string;
  checkedSessionIds?: Set<string>;
  onSessionSelect: (session: PatientSession) => void;
  onRemoveSession: (sessionId: string) => void;
  onClearAllSessions: () => void;
  onToggleSessionCheck: (sessionId: string) => void;
  onResumeRecording: (session: PatientSession) => void;
  onAgentReprocess: (agentType: AgentType) => void;
  persistedSessionIds?: Set<string>;

  // Queue status
  // (uses existing QueueStatusDisplay internally)

  // Mobile jobs
  mobileJobs: MobileJobSummary[];
  mobileJobsLoading: boolean;
  mobileJobsError?: string;
  onRefreshMobileJobs: () => void;
  onAttachMobileJob: (job: MobileJobSummary) => void;
  onDeleteMobileJob: (job: MobileJobSummary) => void;
  attachingMobileJobId?: string;
  deletingMobileJobId?: string;
  attachedMobileJobIds?: Set<string>;

  // Quick Add
  onOpenQuickAdd?: () => void;
}
```

**Layout**: Horizontal row, height 32px
```
┌─────────────────────────────────────────────┐
│ [●] | [+] | [📊 3] | [📱 2] | [🔔 5]        │
│  ↑     ↑      ↑        ↑        ↑           │
│State  Add   Queue   Mobile  Sessions        │
└─────────────────────────────────────────────┘
```

**Visual Design**:
- Background: transparent (inherits from header)
- Icons: 16px, neutral-500, with violet hover
- Badges: Colored pills (blue for sessions, emerald for mobile, etc.)
- Spacing: 8px gap between items
- Border: subtle bottom border (neutral-200)

### 3.3 CommandBar

**File**: `src/sidepanel/components/CommandBar.tsx`

**Current State**: Complete and functional. Features:
- Search input with Cmd+K keyboard shortcut
- Fuzzy search across all actions
- Inline dropdown with grouped results
- Arrow key navigation
- Single-key shortcuts when search empty

**No changes required** - works as designed.

### 3.4 FavouritesRow

**File**: `src/sidepanel/components/FavouritesRow.tsx`

**Current State**: Complete. Shows 4 buttons:
1. Quick Letter (DualModeButton - Dictate/Type)
2. Background (DualModeButton - Dictate/Type)
3. Investigations (TriModeButton - Dictate/Type/Vision)
4. Wrap Up (ActionButton - single click)

**No changes required** - works as designed.

### 3.5 ActionsDrawer

**File**: `src/sidepanel/components/ActionsDrawer.tsx`

**Current State**: Complete. Features:
- 6 collapsible action groups
- Grid layout (3 columns) for compact display
- Smart button type selection (Dual/Tri/Action)
- Persisted expand/collapse state

**No changes required** - works as designed.

### 3.6 QuickSettingsDrawer

**File**: `src/sidepanel/components/QuickSettingsDrawer.tsx`

**Current State**: Basic implementation with dark mode toggle.

**Required Changes**:
1. Add device selection section (move from SidebarHeader row 2)
2. Add microphone selector dropdown
3. Add speaker selector dropdown
4. Show audio permission status

**New Structure**:
```
QuickSettingsDrawer
├── Header: "Quick Settings" + close button
├── Section: Appearance
│   └── Dark mode toggle
├── Section: Audio Devices (NEW)
│   ├── Microphone dropdown
│   ├── Speaker dropdown
│   └── Permission status indicator
├── Section: Status
│   └── System health indicator
└── Footer: "Open Full Settings" button
```

### 3.7 DualModeButton

**File**: `src/sidepanel/components/ui/DualModeButton.tsx`

**Current State**: Complete. Hover-expand split button for Dictate/Type modes.

**Behavior**:
- Default: Shows icon + label (collapsed)
- Hover: Expands to 2-column split (Dictate | Type)
- Click left: Calls onDictate
- Click right: Calls onType

**No changes required**.

### 3.8 TriModeButton

**File**: `src/sidepanel/components/ui/TriModeButton.tsx`

**Current State**: Complete. Same pattern but 3-column (Dictate | Type | Vision).

**No changes required**.

---

## 4. Action Registry

### 4.1 UnifiedAction Type

**File**: `src/config/unifiedActionsConfig.ts`

```typescript
interface UnifiedAction {
  id: string;
  label: string;
  alias?: string;
  description: string;
  icon: LucideIcon;
  group: ActionGroup;
  shortcut?: string;
  modes: InputMode[];  // 'dictate' | 'type' | 'vision' | 'click'
  agentType?: AgentType;
  quickActionField?: string;
  estimatedTime?: string;
  complexity?: 'low' | 'medium' | 'high';
  comingSoon?: boolean;
  colorTheme?: 'blue' | 'purple' | 'emerald' | 'amber' | 'red' | 'cyan' | 'violet';
}
```

### 4.2 Action Groups

| Group | Label | Actions |
|-------|-------|---------|
| `workflows` | Workflows | Quick Letter, Consultation, TAVI Workup, Angiogram/PCI, TAVI Report, mTEER, PFO Closure, Right Heart Cath |
| `patient-context` | Patient Context | Background, Medications, Social History, Bloods, Imaging |
| `documentation` | Documentation | Investigations, Patient Education, Pre-Op Plan |
| `ai-tools` | AI Tools | AI Medical Review, Batch AI Review |
| `analysis` | Analysis | BP Diary, Lipid Profile, Echo (TTE) Trends |
| `utilities` | Utilities | Canvas, Photo, Create Task |

### 4.3 Default Favourites

```typescript
const DEFAULT_FAVOURITES = [
  'quick-letter',
  'background',
  'investigation-summary',
  'appointment-wrap-up'  // Special action (not in drawer)
];
```

---

## 5. Motion System

### 5.1 Duration Tokens

| Token | Duration | Use Case |
|-------|----------|----------|
| `fast` | 120ms | Micro-interactions, hover states, focus rings |
| `normal` | 180ms | Standard transitions, button states |
| `slow` | 220ms | Success animations, completion celebrations |
| `slower` | 300ms | Major transitions, drawer open/close |

### 5.2 Easing Curves

| Curve | CSS | Use Case |
|-------|-----|----------|
| `out` | cubic-bezier(0, 0, 0.2, 1) | Entrance animations |
| `in` | cubic-bezier(0.4, 0, 1, 1) | Exit animations |
| `inOut` | cubic-bezier(0.4, 0, 0.2, 1) | Symmetric transitions |
| `spring` | cubic-bezier(0.34, 1.56, 0.64, 1) | Playful, bouncy feel |

### 5.3 Animation Guidelines

**Animate**:
- Command bar dropdown open/close
- Actions drawer expand/collapse
- Favourites row entrance (staggered)
- Settings drawer slide in/out
- Button hover/active states
- Session cards state transitions

**Don't Over-Animate**:
- Text input/typing
- Scrolling
- High-frequency updates (progress bars)
- Background state changes

**GPU-Accelerated Properties Only**:
- `transform` (translate, scale, rotate)
- `opacity`
- Avoid animating `width`, `height`, `margin`, `padding`

### 5.4 Reduced Motion

All animations respect `prefers-reduced-motion: reduce`:
- Durations become `0ms` or minimal
- Transforms become instant
- Only essential animations remain (e.g., success checkmark)

---

## 6. Color System

### 6.1 Primary Accent: Violet

```css
--color-primary: #8B5CF6;
--color-primary-hover: #7C3AED;
--color-primary-active: #6D28D9;
--color-primary-light: #EDE9FE;
--color-primary-subtle: #F5F3FF;
```

### 6.2 Action Themes

| Theme | Background | Border | Text | Icon |
|-------|------------|--------|------|------|
| blue | #EFF6FF | #BFDBFE | #1D4ED8 | #3B82F6 |
| purple | #F5F3FF | #DDD6FE | #7C3AED | #8B5CF6 |
| emerald | #ECFDF5 | #A7F3D0 | #059669 | #10B981 |
| amber | #FFFBEB | #FDE68A | #D97706 | #F59E0B |
| red | #FEF2F2 | #FECACA | #DC2626 | #EF4444 |
| cyan | #ECFEFF | #A5F3FC | #0891B2 | #06B6D4 |

### 6.3 State Colors

| State | Gradient | Use Case |
|-------|----------|----------|
| recording | red-50 → rose-50 | Active recording |
| transcribing | blue-50 → indigo-50 | Whisper processing |
| ai-analysis | purple-50 → violet-50 | LLM thinking |
| generation | emerald-50 → teal-50 | Report generation |
| completed | emerald-50 → teal-50 | Finished |
| error | rose-50 → pink-50 | Failed |
| needs_review | amber-50 → yellow-50 | Validation required |

---

## 7. Typography

### 7.1 Font Stack

```css
font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### 7.2 Size Scale

| Token | Size | Line Height | Use Case |
|-------|------|-------------|----------|
| `xs` | 11px | 1.4 | Labels, hints, badges |
| `sm` | 12px | 1.5 | Secondary text, metadata |
| `base` | 13px | 1.5 | Body text, buttons, inputs |
| `md` | 14px | 1.5 | Section headers |
| `lg` | 16px | 1.4 | Titles |

### 7.3 Weights

- **Normal (400)**: Body text
- **Medium (500)**: Interactive elements, labels
- **Semibold (600)**: Section headers, emphasis
- **Bold (700)**: Titles, badges

---

## 8. Spacing System

### 8.1 Base Unit: 4px

| Token | Value | Use Case |
|-------|-------|----------|
| `xs` | 4px | Tight gaps, icon padding |
| `sm` | 8px | Button padding, small gaps |
| `md` | 12px | Standard padding |
| `base` | 16px | Section spacing |
| `lg` | 24px | Large gaps, section margins |
| `xl` | 32px | Major separations |

### 8.2 Header Heights

| Element | Height |
|---------|--------|
| Mini header row | 40px |
| Utility row | 32px |
| Command bar row | 44px |
| Favourites row | 48px |
| **Total header** | ~164px (collapsed) |

---

## 9. Implementation Steps

### Phase 1: Design Refinement
1. [x] Create design document (this file)
2. [ ] Review with user
3. [ ] Address feedback

### Phase 2: Component Updates
1. [ ] Create UtilityRow component
2. [ ] Update AppHeader to include UtilityRow
3. [ ] Add device selection to QuickSettingsDrawer
4. [ ] Wire up all props through AppHeader

### Phase 3: Integration
1. [ ] Import AppHeader in OptimizedApp.tsx
2. [ ] Create handler functions for action callbacks
3. [ ] Remove QuickActionsGrouped from footer
4. [ ] Remove RecordPanel (or repurpose)
5. [ ] Simplify/remove SidebarHeader

### Phase 4: Polish
1. [ ] Test all workflows through new header
2. [ ] Verify keyboard shortcuts (Cmd+K, single keys)
3. [ ] Add missing animations
4. [ ] Accessibility audit (ARIA, focus management)

### Phase 5: Cleanup
1. [ ] Remove unused legacy components
2. [ ] Update CLAUDE.md with new patterns
3. [ ] Mark this document as complete

---

## 10. Old → New Mapping

### Components

| Old Component | New Component | Notes |
|---------------|---------------|-------|
| SidebarHeader (row 1) | AppHeader MiniHeader | Logo, state chip → logo, patient, gear |
| SidebarHeader (row 2) | QuickSettingsDrawer | Device summary moves to settings |
| SidebarHeader (icons) | UtilityRow | Sessions, queue, mobile in row 2 |
| QuickActionsGrouped | Removed | Replaced by header system |
| RecordPanel | Removed | Workflows via CommandBar/Favourites |

### Actions/Workflows

All actions remain the same, just accessed differently:

| Action | Old Access | New Access |
|--------|------------|------------|
| Quick Letter | Footer button / RecordPanel hover | Cmd+K → search / Favourites row / L key |
| Background | Footer button | Cmd+K / Favourites row / B key |
| Investigations | Footer button | Cmd+K / Favourites row / I key |
| Wrap Up | Footer button | Favourites row / W key |
| TAVI Report | RecordPanel hover | Cmd+K → search / ActionsDrawer |
| All others | Footer or RecordPanel | Cmd+K → search / ActionsDrawer |

---

## 11. Resolved Questions

1. **StateChip**: ✅ Move to UtilityRow (leftmost position, before Quick Add)

2. **Quick Add button**: ✅ Include in UtilityRow (after StateChip)

3. **Keyboard focus**: When Cmd+K opens command bar, Escape should close dropdown and blur input (return focus to main content) - standard command palette behavior.

---

## 12. Files Summary

### To Create
- `src/sidepanel/components/UtilityRow.tsx` (NEW)

### To Modify
- `src/sidepanel/components/AppHeader.tsx` - Add UtilityRow, wire props
- `src/sidepanel/components/QuickSettingsDrawer.tsx` - Add device selection
- `src/sidepanel/OptimizedApp.tsx` - Replace footer with header

### To Remove (After Migration)
- `src/sidepanel/components/QuickActionsGrouped.tsx`
- `src/sidepanel/components/RecordPanel.tsx`
- `src/sidepanel/components/SidebarHeader.tsx` (or significantly simplify)

---

*Generated with Claude Code - December 2025*
