# Appointment Wrap-up UI Design

## Overview
The appointment wrap-up system now offers two modes:
1. **Quick Presets** - Common appointment types for fast selection
2. **Custom Builder** - Matrix-based builder for any combination

## UI Flow

```
┌─────────────────────────────────────────┐
│  Appointment Wrap-up                    │
│  Quick presets or custom builder        │
├─────────────────────────────────────────┤
│  [Quick Presets] [Custom Builder]  ◄── Toggle
├─────────────────────────────────────────┤
│                                         │
│  MODE 1: Quick Presets                 │
│  ┌─────────────────────────────────┐   │
│  │ ☐ Simple F2F Review + 3mth      │   │
│  │   Item Code: 116                │   │
│  ├─────────────────────────────────┤   │
│  │ ☐ Simple TH Review + 3mth       │   │
│  │   Item Code: 91825              │   │
│  ├─────────────────────────────────┤   │
│  │ ☐ Simple F2F New + 3mth         │   │
│  │   Item Code: 23                 │   │
│  ├─────────────────────────────────┤   │
│  │ ☐ Simple TH New + 3mth          │   │
│  │   Item Code: 91824              │   │
│  ├─────────────────────────────────┤   │
│  │ ☐ Complex TH Review + 3mth      │   │
│  │   Item Code: 92423              │   │
│  ├─────────────────────────────────┤   │
│  │ ☐ Complex F2F New + 3mth        │   │
│  │   Item Code: 132                │   │
│  └─────────────────────────────────┘   │
│                                         │
│  OR                                     │
│                                         │
│  MODE 2: Custom Builder                │
│  ┌─────────────────────────────────┐   │
│  │ 1. Complexity                    │   │
│  │  [Simple]  [Complex]             │   │
│  ├─────────────────────────────────┤   │
│  │ 2. Modality                      │   │
│  │  [Face to Face]  [Telehealth]    │   │
│  ├─────────────────────────────────┤   │
│  │ 3. Appointment Type              │   │
│  │  [New]  [Review]                 │   │
│  ├─────────────────────────────────┤   │
│  │ 4. Follow-up Period              │   │
│  │  [3 Months] [12 Months] [None]   │   │
│  ├─────────────────────────────────┤   │
│  │ Preview:                         │   │
│  │ Item Code: 116                   │   │
│  │ Notes: "F2F follow up in 3..."   │   │
│  │                                  │   │
│  │ [Apply This Appointment]         │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Appointment Matrix Logic

### Item Code Mapping

| Complexity | Modality | Type   | Item Code |
|-----------|----------|--------|-----------|
| Simple    | F2F      | New    | 110       |
| Simple    | F2F      | Review | 116       |
| Complex   | F2F      | New    | 132       |
| Complex   | F2F      | Review | 133       |
| Simple    | TH       | New    | 91824     |
| Simple    | TH       | Review | 91825     |
| Complex   | TH       | New    | 92422     |
| Complex   | TH       | Review | 92423     |

### Notes Generation

**Format:** `{Modality} follow up in {Period} please`

Examples:
- `F2F follow up in 3 months please`
- `TH follow up in 12 months please`
- `no follow up required` (when Period = none)

## Key Features

### Quick Presets
- **6 most common appointment types** for instant selection
- One-click application
- Shows item code and notes preview
- Optimized for speed and frequent use cases

### Custom Builder
- **4-step matrix builder** for any combination
- Visual selection with color-coded sections:
  - Blue: Complexity
  - Emerald: Modality
  - Purple: Appointment Type
  - Orange: Follow-up Period
- **Live preview** of generated item code and notes
- **Apply button** to confirm selection
- Supports all possible combinations (2×3×2×4 = 48 possibilities)

## User Experience

1. User clicks "Wrap Up" in Quick Actions
2. Modal opens showing Quick Presets by default
3. User can either:
   - **Fast path:** Click a preset → Applied immediately
   - **Custom path:** Switch to Custom Builder → Select 4 options → Preview → Apply

4. Either path populates the EMR with:
   - Item Code field
   - Appointment Notes field

## Technical Implementation

### Files Modified/Created:
- `src/config/appointmentPresets.ts` - Matrix logic and item code mapping
- `src/sidepanel/components/AppointmentMatrixBuilder.tsx` - New matrix builder component
- `src/sidepanel/components/QuickActions.tsx` - Updated to support both modes

### Type Safety:
- `AppointmentComplexity`: 'simple' | 'complex'
- `AppointmentModality`: 'f2f' | 'telehealth'
- `AppointmentType`: 'new' | 'review'
- `FollowUpPeriod`: '6wk' | '3mth' | '12mth' | 'none'

### Functions:
- `getItemCodeFromMatrix()` - Maps matrix selections to item codes
- `getNotesFromMatrix()` - Generates appointment notes
- `generatePresetFromMatrix()` - Creates complete preset object

## Benefits

✅ **Speed:** Quick presets for common cases (80% of appointments)
✅ **Flexibility:** Custom builder for edge cases (20% of appointments)
✅ **Discoverability:** Users can learn the system through the matrix
✅ **Consistency:** Standardized notes and item codes
✅ **Type Safety:** Full TypeScript coverage prevents errors
✅ **Extensibility:** Easy to add new item codes or options

## Future Enhancements

- [ ] Remember user's most frequent presets
- [ ] Custom preset creation and saving
- [ ] Bulk appointment scheduling
- [ ] Integration with calendar systems
- [ ] Analytics on most-used combinations
