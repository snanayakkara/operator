
# Changelog

All notable changes to this project will be documented in this file.

The format is based on "Keep a Changelog" and follows semantic versioning.

## [Unreleased]

- (Add upcoming changes here)

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
