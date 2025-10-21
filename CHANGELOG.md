
# Changelog

All notable changes to this project will be documented in this file.

The format is based on "Keep a Changelog" and follows semantic versioning.

## [Unreleased]

- (Add upcoming changes here)

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
