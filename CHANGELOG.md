
# Changelog

All notable changes to this project will be documented in this file.

The format is based on "Keep a Changelog" and follows semantic versioning.

## [Unreleased]

- (Add upcoming changes here)

## [3.17.0] - 2025-10-23

### Added
- **Pre-Op Plan Agent** – new cath lab workflow producing A5-ready summary cards and structured JSON for angiogram, RHC, TAVI, and mTEER procedures
  - Quick action hook opens the workflow directly from the footer launcher
  - Lazy-loaded agent routes through standard LM Studio service with reasoning model defaults, timeout, and token limits tuned for procedure planning
- **Structured Plan Persistence & Display**
  - Session objects, persistence service, and dropdown state now retain `preOpPlanData`
  - Optimized results panel renders dedicated `PreOpPlanDisplay` with print/export controls and warning surfacing
- **Ecosystem Registration** – updated system prompt loader, processing predictor, notification service, metrics dashboards, and agent category helpers to recognise the new workflow across the app

### Fixed
- Removed unused "mark session complete" plumbing to keep lint passes clean after the session dropdown refactor

## [3.16.0] - 2025-10-22

### Added
- **Session Persistence System** - Local storage persistence for sessions with intelligent expiry management
  - Sessions automatically persist to `chrome.storage.local` when completed
  - Smart expiry: 7 days for unchecked sessions, 24 hours for checked sessions
  - Hourly background cleanup removes expired sessions automatically
  - Hard drive icon indicates which sessions are stored locally
  - Storage usage indicator with color-coded alerts (green <50%, blue 50-80%, amber 80-90%, red >90%)
  - Storage management modal with bulk delete operations (Delete All Checked, Delete >7 days, Delete >3 days)
  - Auto-pruning when storage reaches 90% quota
  - Sessions persist across browser restarts and extension reloads

- **Category-Based Session Organization** - Visual categorization of sessions by agent type
  - 4 distinct categories with unique color schemes:
    - **Letters** (Blue): Quick Letter, Consultation, Patient Education
    - **Clinical Data** (Emerald): Background, Investigation Summary, Medication, Bloods, Imaging
    - **Procedures** (Purple): TAVI, PCI, mTEER, RHC, PFO, and other procedural reports
    - **AI Review** (Amber): AI Medical Review, Batch AI Review, Australian Medical Review
  - Category icons and colored borders in session dropdown
  - Gradient backgrounds and accent edges for quick visual identification

- **New Persistence Service Infrastructure**
  - `SessionPersistenceService`: Singleton service managing all storage operations
  - `persistence.types.ts`: Comprehensive type definitions for persistence layer
  - `agentCategories.ts`: Category definitions with color schemes and agent mappings
  - `StorageIndicator` component: Compact clickable storage usage display
  - `StorageManagementModal` component: Full storage management interface with session list and bulk actions

### Improved
- **Session State Management** - Enhanced state architecture for persistence
  - Added `persistedSessionIds` to global app state
  - Added `storageMetadata` tracking for real-time usage statistics
  - New action creators: `setPersistedSessionIds`, `addPersistedSessionId`, `removePersistedSessionId`, `setStorageMetadata`
  - Auto-save on session completion with proper error handling

### Fixed
- **TypeScript Type Safety** - Resolved all TypeScript errors
  - Fixed `ToastService` static method calls (7 instances) to use `getInstance()`
  - Removed duplicate `handleToggleSessionCheck` declaration
  - Fixed await expression in `onEnd` callback by making it async
  - Zero TypeScript errors in production build

### Technical Details
- Compression strategy: Stores transcriptions and results, excludes audio blobs to save space
- Storage quota: 5MB limit with intelligent pruning
- Persistence metadata: Tracks `persistedAt`, `lastAccessedAt`, `markedCompleteAt` timestamps
- Background cleanup runs every 60 minutes
- Warning thresholds: 80% (amber), 90% (red)

## [3.15.2] - 2025-10-22

### Fixed
- **Session Dropdown Checkbox Persistence** - Checkbox state now persists across dropdown open/close cycles and browser restarts
  - Moved checkbox state from local component state to persistent Chrome storage
  - Checkbox selections are saved automatically and restored on app reload
  - Merged manual checkbox selections with auto-checked sessions (from EMR insertion)
  - Fixed issue where checkbox selections were lost when closing the dropdown

### Improved
- **Session Dropdown UI Cleanup** - Removed redundant "Mark complete" button
  - Eliminated duplicate functionality between checkbox and "Mark complete" button
  - Cleaner session card layout with checkbox serving as the primary completion toggle
  - Consistent UX with checkbox as the single source of truth for session completion status

## [3.15.1] - 2025-10-21

### Fixed
- **Chrome Side Panel Width Constraints** - Adjusted both importers to fit 320px side panel width
  - LipidProfileImporter: Removed 600px max-width, reduced padding and font sizes for compact display
  - TTETrendImporter: Removed 540px max-width, reduced padding and font sizes for compact display
  - Shortened button labels ("Import from EMR" → "Import", "Load last capture" → "Load last")
  - Reduced header text sizes and spacing for better space utilization
  - All modals now use full available width (w-full) with responsive spacing

## [3.15.0] - 2025-10-21

### Added
- **TTE Trend Importer** - Complete transthoracic echocardiography trend tracking system
  - Import and parse TTE/Echo reports from EMR or clipboard
  - Extract key cardiac measurements over time: LVEF, LVEDD, LVESD, GLS, valve function (MR/AR/TR/AS), diastolic function (E/e', LA), RV function (TAPSE), and pulmonary pressures (RVSP)
  - Interactive trend visualization with multi-series charting
  - Clinical insights generation: identifies deteriorating/improving metrics, calculates slopes and trends, highlights significant changes
  - Manual editing of extracted values
  - Session persistence and review
  - Quick action integration for easy access

### Enhanced
- **Lipid Profile Importer Improvements**
  - Therapy phases timeline: Visual display of medication periods with start/end dates
  - Inline results table showing parsed lipid values before charting
  - Narrower, more focused modal layout (600px width)
  - Enhanced clinical insights with improved recommendations
  - Better visual hierarchy and component organization
  - Refined chart interactions and data display

### Improved
- **Live Audio Visualizer** - Enhanced visual feedback during recording
- **Quick Actions** - Added TTE Trend Importer to quick actions menu

## [3.14.0] - 2025-10-21

### Added
- **Enhanced Session Dropdown UX**
  - Larger, more visible checkboxes (20x20px) with prominent hover states
  - Smart session reordering: unchecked sessions float to top, checked sessions sink to bottom
  - Compact display mode for checked sessions (smaller cards, reduced opacity)
  - Increased dropdown height to maximize viewport usage (calc(100vh - 80px))
  - Auto-check sessions when "Insert to EMR" button is pressed
  - Smooth transitions and animations for all state changes

## [3.13.0] - 2025-10-20

- feat: introduce Lipid Profile Importer with EMR capture, charting, and clinical insights
- fix: restore Create Task quick action alongside new lipid shortcut
- docs: update README badge and release notes for 3.13.0

## [3.12.4] - 2025-10-17

- chore: bump version to 3.12.4 and update README badge
- Updated version numbers in `package.json` and `manifest.json`.
- Updated README version badge to `3.12.4`.

## [3.12.3] - 2025-10-14

- chore: bump version to 3.12.3
- Version bump for patch release.

## [3.12.2] - 2025-10-11

- chore: bump version to 3.12.2

## How to add a release

1. Update `package.json` and `manifest.json` versions.
2. Add an entry under `## [Unreleased]` describing the changes.
3. Commit with a conventional message like `chore: bump version to X.Y.Z`.
4. Tag the release and push tags:

```bash
git tag -a vX.Y.Z -m "Release X.Y.Z"
git push origin vX.Y.Z
```
