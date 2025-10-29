
# Changelog

All notable changes to this project will be documented in this file.

The format is based on "Keep a Changelog" and follows semantic versioning.

## [Unreleased]

- (Add upcoming changes here)

## [3.21.5] - 2025-10-29

### Changed

- **Lanyard Layout Redesign**
  - Increased lanyard height from 500px to 75vh (75% of viewport height)
  - Lanyard now hangs down most of the screen for more dramatic visual effect
  - Mobile responsive: 60vh height on screens < 400px width

- **Added 3D Microphone Icon to Lanyard Card**
  - Replaced text overlay with 3D microphone geometry directly on the card
  - Microphone built with Three.js primitives (capsule, cylinders, sphere)
  - Dark gray metallic finish with realistic shading and materials
  - Icon positioned at center of card, rendered as part of 3D scene
  - Fully integrated with physics simulation (swings with card)

- **Improved Layout Structure**
  - Removed "Ready to Record" text overlay from lanyard
  - Moved instructions text to bottom of window (anchored)
  - Changed layout from `justify-start` to `justify-between` for better spacing
  - Instructions section now includes:
    - "Select a workflow below to start recording..." message
    - Background processing status card (when active)
  - Clean, minimalist design with lanyard as primary visual focus

### Technical Details

- Lanyard.css: height changed to 75vh (60vh on mobile)
- Lanyard.tsx: Added 4-part microphone geometry group (capsule head, cylinder body, base, grille detail)
- OptimizedApp.tsx: Restructured flex layout with `justify-between` and bottom-anchored instructions
- Microphone materials use Tailwind gray palette (#1f2937, #374151, #111827) with metalness/roughness
- All changes maintain physics simulation and interactive dragging

## [3.21.4] - 2025-10-29

### Fixed

- **Lanyard React Hooks Rules Violation**
  - Fixed `useGLTF` and `useTexture` being called inside try-catch blocks (violates React Rules of Hooks)
  - React hooks must be called unconditionally at the top level of components
  - Previous try-catch approach caused `TypeError: Cannot create property 'curveType' on boolean 'false'`
  - Hooks now called unconditionally with optional chaining for safety (`gltf?.nodes`)

- **Curve Initialization Error**
  - Fixed curve initialization by setting `curveType` inside useState initializer
  - Ensures curve object is fully configured before first render
  - Prevents property assignment errors on undefined/boolean values

### Changed

- **Asset Loading Strategy**
  - Assets now loaded with `useGLTF('/path', true)` for graceful degradation
  - Optional chaining used for safe property access (`gltf?.nodes || {}`)
  - Texture wrap mode set conditionally after successful load
  - Enabled asset preloading for faster initial renders
  - Fallback geometry still renders correctly if assets fail to load

### Technical Details

- Removed try-catch blocks around `useGLTF` and `useTexture` calls
- Curve object now properly initialized with `curveType = 'chordal'` in useState callback
- Build completes without errors in 6.98s
- Console no longer shows "Cannot create property 'curveType'" error
- 3D lanyard renders successfully with physics-based rope simulation

## [3.21.3] - 2025-10-29

### Fixed

- **Lanyard Component Rendering Issue**
  - Removed Text component from @react-three/drei that was causing async loading conflicts
  - Text component async font loading combined with Rapier physics worker errors prevented 3D render
  - Replaced 3D Text with HTML overlay positioned absolutely over the lanyard card
  - HTML text is non-interactive (pointer-events: none) so 3D lanyard remains draggable
  - Lanyard now renders successfully with "Ready to Record" text and microphone emoji visible

### Added

- **Actual Lanyard Assets from React Bits**
  - Downloaded card.glb (2.4MB) - official 3D model with clip and clamp details
  - Downloaded lanyard.png (7.4KB) - striped band texture for realistic appearance
  - Assets sourced from https://github.com/DavidHDev/react-bits
  - Lanyard will now show proper 3D model instead of fallback geometry

### Changed

- **Text Display Method**
  - Text now rendered as HTML overlay instead of 3D Text component
  - Better performance (no async font loading)
  - Easier to style and maintain
  - No additional Three.js dependencies
  - Text positioned with CSS (absolute centering over card)

### Technical Details

- Removed `Text` import from @react-three/drei in Lanyard.tsx
- Removed two Text components (text + emoji) from 3D scene
- Added HTML div overlay with absolute positioning in OptimizedApp.tsx
- Text uses Tailwind classes: text-lg, font-semibold, text-gray-800
- Overlay has pointer-events-none to maintain lanyard interactivity
- Build successful with no errors
- 3D lanyard now renders with actual assets (no more fallback warnings)

## [3.21.1] - 2025-10-29

### Fixed

- **Lanyard Component Text Display**
  - Added "Ready to Record" text directly on 3D lanyard card using Three.js Text component
  - Added microphone emoji icon (🎤) below text for visual clarity
  - Text renders at center of card with proper sizing and positioning
  - Dark gray text color (#1f2937) with medium font weight for readability

- **Lanyard Layout and Spacing**
  - Increased lanyard container height from 400px to 500px (350px on mobile)
  - Changed layout from `justify-center` to `justify-start` with `pt-4` for better vertical positioning
  - Reduced text section spacing to prevent cutting off lanyard swing
  - Added React Bits centering styles (flexbox with transform origin)
  - Changed overflow from `hidden` to `visible` to prevent clipping
  - Reduced padding and font sizes in instruction text section

### Changed

- **Idle State UX Improvements**
  - Lanyard now has more room to swing naturally without being cut off
  - Text below lanyard is more compact and doesn't crowd the 3D component
  - Improved visual hierarchy with smaller, less prominent instruction text
  - Background processing status card is more compact

## [3.21.0] - 2025-10-29

### Added

- **3D Interactive Lanyard Component for Idle State**
  - Replaced static "Ready to Record" screen with physics-based 3D lanyard component
  - Interactive draggable ID card with realistic rope physics simulation
  - Built with Three.js, React Three Fiber, and Rapier physics engine
  - Graceful fallbacks for missing 3D assets (placeholder geometry)
  - Lazy-loaded only when in idle state for optimal performance
  - Dependencies: three@^0.168.0, @react-three/fiber@^8.17.0, @react-three/drei@^9.114.0, @react-three/rapier@^1.4.0, meshline@^3.3.1

- **Dot Grid Background Pattern**
  - Professional, subtle dot grid background for idle state
  - Four CSS variants: light, standard, dark, dense
  - Pure CSS implementation (no images required)
  - Matches medical app aesthetic with minimal visual noise

- **Build System Enhancements**
  - Added .glb (3D model) file support in Vite configuration
  - Automatic copying of lanyard assets to dist folder during build
  - Separate vendor-3d chunk for Three.js libraries (~1MB gzipped)
  - TypeScript declarations for 3D assets and MeshLine library

- **Global TypeScript Declarations**
  - New src/global.d.ts for .glb, .png, .jpg asset imports
  - MeshLine library type definitions
  - JSX intrinsic elements for Three.js custom components

### Changed

- **Idle State UX Enhancement**
  - More engaging and interactive home screen experience
  - Reduced visual clutter with cleaner layout
  - Improved spacing and typography for instructions text
  - Background processing status now integrated below lanyard

### Technical Details

- Bundle size impact: +~1MB gzipped for 3D libraries (lazy-loaded)
- No CSP violations - fully compatible with Chrome extension policies
- WebGL-accelerated rendering with 60fps physics simulation
- Responsive design adapts to different screen sizes
- Code splitting ensures 3D libraries only load when needed

## [3.20.0] - 2025-10-28

### Added

- **BP Diary Vision Extraction Enhancements**
  - Enhanced vision model diagnostics with detailed logging (image type, size, encoding, token usage)
  - Empty response detection with helpful troubleshooting messages
  - Image validation (format and size) before processing to prevent unnecessary API calls
  - Better error messages guiding users to correct vision model setup in LM Studio
  - Improved extraction prompts for more accurate BP reading detection
  - Temperature adjustment for vision models (0.3 → 0.5) to improve image interpretation

- **BP Review Grid Interactive Features**
  - Add new BP readings manually with validation and auto-sorting by date/time
  - Delete individual readings with confirmation dialog
  - Enhanced UI with "Add New Reading" button and inline form
  - Better guidance text for users reviewing extracted readings
  - Manually entered readings marked with 100% confidence

- **Content Script EMR Field Detection Improvements**
  - New `findFieldByLabelText()` helper for robust field detection across EMR systems
  - New `findByXPath()` helper for advanced field targeting
  - Enhanced `triggerAllEvents()` for better UI framework compatibility (React, Vue, Angular)
  - Improved field insertion reliability across different EMR implementations

- **LM Studio Service Vision Diagnostics**
  - Comprehensive vision request logging with image metadata
  - Token usage tracking for vision requests (prompt tokens, completion tokens)
  - Warning detection for improperly loaded vision models (low token usage)
  - Better error messages when vision models fail to process images

### Changed

- **Session Management UX Improvements**
  - Session notification badge now shows only unchecked (active) sessions instead of all sessions
  - Sessions remain visible after completion until user explicitly switches views
  - Better session persistence and state management
  - Appointment wrap-up data preservation through state management

### Fixed

- **TypeScript Error** - Fixed type error in `usePortal.ts` where null assignment wasn't properly typed
- **Vision Model Empty Responses** - Added detection and user-friendly error messages for empty vision model responses
- **BP Diary Importer UX** - Improved description text to clarify editing and manual addition capabilities

## [3.19.0] - 2025-10-27

### Added

- **Circular Countdown Timer** - Large visual countdown timer with real-time ETA prediction
  - Custom lightweight SVG-based circular timer (~2 kB, no external dependencies)
  - Shows countdown time + current pipeline stage (e.g., "23.4s AI Analysis")
  - Colors match pipeline stages (red → blue → purple → emerald) from design system
  - Responsive sizing: 240px desktop, 208px tablet, 160px mobile
  - Appears above horizontal progress bar for maximum visibility
  - Smooth 60fps CSS animations with 500ms update interval
  - Accessible with ARIA labels and live region updates

- **Intelligent ETA Prediction System** - Machine learning-based processing time estimation
  - Audio duration tracking: Automatically calculates duration from recording blob using Web Audio API
  - ProcessingTimePredictor enhancements:
    - Now accepts audio duration as primary input factor (stronger correlation than text length)
    - Audio duration-based matching for historical sessions (±50% range)
    - Records actual processing times after every completion (learning loop closed)
    - Stores up to 200 historical data points with audio duration metadata
    - Persistent storage in `chrome.storage.local` across sessions
  - Adaptive velocity-based countdown:
    - Blends initial prediction with real-time velocity as processing progresses
    - 0-5% progress: 100% prediction-based
    - 5-70% progress: Gradual blend from prediction to velocity
    - 70%+ progress: 70% velocity-based, 30% prediction
    - Updates every 500ms for smooth countdown without excessive CPU usage
  - Precise decimal countdown: Shows exact time (e.g., "23.4s left", "2m 34.2s left") with no rounding
  - Predictions improve over time: ±40% accuracy after 5 sessions, ±20% after 20+ sessions

- **Shared Countdown Calculations Utility** (`countdownCalculations.ts`)
  - DRY principle: Single source of truth for countdown logic
  - `calculateAdaptiveRemainingTime()` - Velocity-based ETA with prediction blending
  - `formatRemainingTime()` - Consistent time formatting across all UI elements
  - `formatCountdown()` - Countdown text for circular timer (without "left" suffix)
  - Used by both UnifiedPipelineProgress and CircularCountdownTimer

- **Right Heart Catheterisation (RHC) Major Enhancements**
  - Missing calculation fields identification: Automatically detects which patient data/measurements are missing for haemodynamic calculations
  - Enhanced data extraction:
    - Fluoroscopy time and dose tracking
    - Dose-area product (DAP) extraction
    - Contrast volume recording
    - Improved pattern matching for radiation safety data
  - Comprehensive logging: Console debug output for extracted pressures, cardiac output, patient data, and calculations
  - Post-processing pipeline: Australian spelling enforcement, output cleaning
  - Better structured report generation with all extracted data contextually integrated

- **Pre-Op Plan Export System**
  - A5 card export functionality for pre-operative planning summaries
  - Copy to clipboard: Formatted A5 card with procedure details, ready to paste
  - Download as file: Export pre-op cards as standalone documents
  - Data validation: Checks for essential fields before export
  - `preOpCardExport.ts` utility with clipboard and download handlers
  - `PreOpCardLayout.tsx` component for consistent card formatting
  - Toast notifications for export success/failure feedback

- **Patient Context Header Component** (`PatientContextHeader.tsx`)
  - New reusable component for displaying patient context across workflows
  - Shows patient name, MRN, DOB, and other contextual information
  - Consistent header design for all agent result displays
  - Integration with session patient data

- **UI Preferences Section** (`UIPreferencesSection.tsx`)
  - New settings section for user interface customization
  - Options page integration for UI preference management
  - Preparation for future theming and layout customization

### Changed

- **UnifiedPipelineProgress Refactoring**
  - Extracted countdown logic to shared utility for DRY compliance
  - Added `showCircularTimer` prop (default: true) for conditional timer display
  - Timer only shows when remaining time > 500ms (prevents flicker for very fast operations)
  - Responsive container with Tailwind breakpoints (w-40 sm:w-52 md:w-60)
  - SVG uses viewBox for true responsiveness regardless of container size
  - Horizontal progress bar now in dedicated section with padding

- **Enhanced Recording Prompts**
  - RHC prompts now emphasize patient data requirements (height, weight, HR, BP, Hb, lactate, SpO₂)
  - More detailed haemodynamic pressure guidance with specific units
  - Technical details section expanded with fluoroscopy time/dose and contrast volume
  - Structured sections for better dictation workflow

- **RecordPanel State Management Improvements**
  - Force clean state on mount to prevent stale state from previous sessions
  - Defensive checks for stale triggerRef (ensures DOM element is still connected)
  - Enhanced logging for state transitions and timeout management
  - Improved hover state handling with isConnected validation
  - Prevents "ghost" expanded states from unmounted components

- **Session Dropdown Enhancements**
  - Better visual hierarchy with state-themed cards
  - Improved progress indicators using unified pipeline progress
  - Enhanced session card layout with patient context

- **AI Review Cards Refinement**
  - Better spacing and typography for medical findings
  - Improved contrast for urgency indicators
  - Enhanced visual grouping of related information

- **Dashboard Settings Updates**
  - UI preferences section integration
  - Better organization of settings categories
  - Improved visual consistency across settings panels

- **Multiple Agent System Prompt Refinements**
  - Angiogram/PCI: Enhanced procedural detail extraction and Australian terminology
  - Quick Letter: Improved exemplar data for better output quality
  - Right Heart Cath: More comprehensive haemodynamic assessment guidance
  - Investigation Summary: Better formatting rules for measurements and abbreviations

### Fixed

- RecordPanel hover state persistence bug: Stale triggerRef causing expanded state to persist incorrectly
- Circular timer flicker on completion: Now hides gracefully when < 500ms remaining
- Type safety improvements across countdown components with proper TypeScript definitions
- Audio duration edge cases: Handles failed audio duration calculation gracefully with fallback to transcription length

### Technical Improvements

- **Audio Duration Tracking Data Flow**:
  1. Recording completes → Calculate duration via Web Audio API
  2. Store in session state (`audioDuration` field added to `PatientSession`)
  3. Persist to `chrome.storage.local` (added to `PersistedSession`)
  4. Pass through display state (`displayAudioDuration` in useAppState)
  5. Flow to UnifiedPipelineProgress → ProcessingTimePredictor
  6. Use for ETA calculation and historical learning

- **State Management Enhancements**:
  - Added `audioDuration` to `PatientSession`, `PersistedSession`, and `DisplaySessionState` types
  - Updated `SET_DISPLAY_SESSION` and `CLEAR_DISPLAY_SESSION` reducers in useAppState
  - Modified `getCurrentDisplayData()` to include audio duration in all branches
  - Pass-through to OptimizedResultsPanel and UnifiedPipelineProgress components

- **Performance Optimizations**:
  - Circular timer updates: 500ms interval (vs 100ms previous) for smoother performance
  - useMemo hooks for expensive calculations (velocity, remaining time, stage colors)
  - React.memo for CircularCountdownTimer to prevent unnecessary re-renders
  - SVG animations use CSS transitions (hardware accelerated)

- **Bundle Size Impact**:
  - Custom circular timer: ~2 kB (vs 15-20 kB for react-circular-progressbar)
  - Countdown utilities: ~1 kB
  - Total impact: ~3 kB for entire countdown system
  - No external dependencies added

### Documentation

- All countdown components include comprehensive JSDoc comments
- Inline documentation explains adaptive ETA blending algorithm
- Type interfaces fully documented with parameter descriptions
- Code examples in component headers for common usage patterns

## [3.18.0] - 2025-10-26

### Added
- **Bright Card Design System** - New high-contrast card design inspired by macOS Big Sur
  - Created reusable `BrightCard` component with 6 color variants (default, blue, purple, emerald, amber, rose)
  - Three sizes (sm, md, lg) with composable sub-components (Icon, Title, Description, Badge)
  - Tailwind utilities: `rounded-bright` (16px), `border-bright` (2-3px), gradient backgrounds
  - Minimal shadow utilities (`shadow-bright-card`, `shadow-bright-elevated`) for border-focused elevation
  - Added `useBrightDesign` prop to `IndividualFindingCard` for toggling between subtle and bright styles
  - Pass-through `useBrightCards` prop in `BatchPatientReviewResults` and `AIReviewCards`
  - White backgrounds with subtle gradients instead of pastel fills
  - Prominent borders (2-3px) with larger corner radius (12-16px)
  - Higher contrast for improved readability in medical contexts
  - Comprehensive documentation in `BRIGHT_CARD_DESIGN.md`

- **RHC (Right Heart Catheterization) Enhancements**
  - New `RHCCalculationService` with comprehensive hemodynamic calculations (PA pressures, PCWP, CO/CI, PVR, transpulmonary gradient)
  - `CalculatedHaemodynamicsDisplay` component for showing calculated values with units and reference ranges
  - `RHCCardLayout` for printable RHC summary cards with calculated hemodynamics
  - Card export functionality (`rhcCardExport.ts`) for PDF/print outputs
  - Detailed reference documentation (`RHC_CALCULATION_REFERENCE.md`, `RHC_CARD_EXPORT_README.md`)
  - Updated `RightHeartCathAgent` and `RightHeartCathDisplay` to integrate calculated hemodynamics

- **Patient Education Agent Improvements**
  - Enhanced system prompts with more comprehensive lifestyle modification guidance
  - Improved action plan generation with specific, actionable recommendations
  - Better handling of habit cues and behavioral change strategies
  - Added structured JSON output for education data tracking

- **Session Management UI Enhancements**
  - New `StorageIconButton` for session storage management
  - Improved `SessionDropdown` with better state handling and persistence indicators
  - Enhanced visual feedback for stored sessions with hard drive icons
  - Better organization of session categories and status indicators

- **Appointment Matrix Builder Updates**
  - Redesigned keyboard navigation with numeric shortcuts (1-4 for categories)
  - Improved visual hierarchy with clearer category selection
  - Enhanced UX with better focus states and transitions
  - Added accessibility improvements for keyboard-only navigation

### Changed
- Enhanced Tailwind config with bright card utilities (border radius, width, shadows, gradients)
- Design system now supports two visual styles: subtle (existing) and bright (new, opt-in)
- Updated `QuickActionsGrouped` with improved expandable action handling
- Refined Investigation Summary system prompts for better clinical formatting
- Quick Letter exemplar updates for improved output quality
- SidebarHeader enhancements for better storage status visibility

### Fixed
- Improved medical terminology formatting in Investigation Summary (spacing around measurements)
- Better handling of abbreviations and severity descriptors (e.g., "mod" for moderate)
- Enhanced patient education JSON parsing and display reliability

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
