
# Changelog

All notable changes to this project will be documented in this file.

The format is based on "Keep a Changelog" and follows semantic versioning.

## [Unreleased]

- (Add upcoming changes here)

## [3.31.0] - 2025-11-09

### Added

- **RHC 18×10 Card Export - Comprehensive Redesign**
  - **Column 1 (Haemodynamic Pressures)**: Enhanced display format
    - RA: Shows mean pressure in large text with a/v-waves below in small grey text when available
    - PCWP: Same pattern as RA - mean in large text, a/v-waves below
    - PA: All three values on one line: "51/25 (34) mmHg" (systolic/diastolic (mean))
    - Improved spacing optimization (12px padding, reduced gaps)

  - **Column 2 (Cardiac Output)**: Restructured layout
    - Thermodilution: CO in large text, CI below in small grey text
    - Fick Method: CO and CI with same formatting
    - Added "Assumed VO₂" display showing gender/BSA-based estimation with formula note
    - Removed redundant Mixed Venous O₂ standalone section

  - **Column 3 (Calculated Parameters)**: Expanded from 8 to 16 advanced haemodynamic metrics
    - **Basic**: PVR, PVRI, TPG, DPG, SVR, SVRI, SVI
    - **Advanced**: PAPi, RVSWI, PAC, RC Time, Ea, RAP:PCWP ratio
    - **Specialized**: O₂ER, CPO, RV CPO
    - All displayed in compact 2-column grid with proper formatting

- **RHC Enhanced Calculation Engine**
  - Comprehensive computation of Tier 1, 2, and 3 calculations from RHCCalculationService
  - Gender-based VO₂ estimation (Male: 150, Female: 130, Other: 125 mL/min/m² × BSA)
  - MAP calculation from systemic BP when available
  - Oxygen extraction ratio (O₂ER) from SaO₂ and SvO₂
  - All calculations follow Australian/ESC 2022 guidelines and AHA 2021 standards

- **RHC Patient Demographics Panel**
  - New structured panel in Procedure Details section showing all extracted patient data
  - Displays: Height (cm), Weight (kg), BMI (kg/m²), BSA (m²), Heart Rate (bpm)
  - Green-themed panel with 2-column grid layout for compact display
  - Only appears when patient data is available

### Fixed

- **RHC Card Export - Empty Calculated Parameters Column**
  - Fixed issue where calculations weren't being computed before export
  - Added fallback calculation logic matching UI display behavior
  - Ensures all haemodynamic calculations are populated in exported cards

- **RHC Card Export - Border Overflow**
  - Fixed bottom borders being cut off due to content overflow
  - Added `overflow: hidden` and `boxSizing: border-box` to all column divs
  - Reduced parent container padding from 16px to 12px
  - Ensured all four borders (top, right, bottom, left) are fully visible

- **Validation Workflow - Property Name Consistency**
  - Fixed `rapPcwpRatio` typo (should be `rapPawpRatio` per type definitions)
  - Updated both RHCCardLayout and RightHeartCathDisplay for consistency

### Changed

- **RHC Card Layout Spacing Optimization**
  - Reduced column padding: 16px → 12px (all three columns)
  - Reduced column gaps: 12px/10px → 10px/6px
  - Reduced header margins: 8px → 4px (marginBottom)
  - Optimized font sizes in Column 3: labels 9px→8px, values 14px→13px, units 8px→7px
  - Prevents future content overflow while maintaining visual hierarchy

## [3.30.2] - 2025-11-08

### Fixed

- **Pre-Op Plan Validation Checkpoint Improvements**
  - Added enhanced diagnostic logging to track validation decisions and checkpoint triggers
  - Logs validation result structure (missing critical fields, low-confidence corrections)
  - Logs checkpoint decision logic (hasCriticalGaps, willTriggerCheckpoint)
  - Fixed typo in logging code (`correctedValue` → `correctValue`)

### Changed

- **Pre-Op Plan Quick Model Instructions**
  - Strengthened validation prompt to explicitly require `"critical": true` for missing REQUIRED fields
  - Added clear examples of correct vs incorrect `missingCritical` array formatting
  - Emphasized that items in `missingCritical` MUST ALWAYS have `critical: true`
  - Added warning against using `critical: false` in `missingCritical` (should use `missingOptional` instead)

- **Pre-Op Card Display**
  - Updated `PreOpCardLayout` to show "Not specified" values instead of hiding them
  - Added visual styling for "Not specified" values (gray, italic) for transparency
  - Created `formatValue()` helper to distinguish between empty fields and unspecified REQUIRED fields
  - Ensures cards aren't empty when LLM generates "Not specified" for missing fields
  - Applied formatting to key fields: indication, access, sheath size, NOK information

## [3.30.1] - 2025-11-05

### Fixed

- **Pre-Op Plan Critical Bugfixes**
  - Fixed NOK regex patterns to handle flexible formats (e.g., "Next-of-kin Andrew (son) 0413571525")
  - Changed from strict punctuation requirements to flexible patterns accepting `[\s:;,]+` and hyphens
  - Fixed LLM ignoring validated data by creating enriched prompt with `VALIDATED DATA` JSON block
  - Fixed validated JSON being overwritten by updating `parsePreOpResponse()` to accept optional `providedJsonData` parameter
  - Updated system prompt to instruct LLM to use VALIDATED DATA instead of regenerating JSON
  - Created `PreOpCardLayout` visual component for clean A5 card display with procedure-type aware rendering
  - Fixed raw markdown display by replacing line-by-line rendering with visual card component
  - Added Pre-Op validation fields to `PatientSession` interface (`preOpValidationResult`, `preOpValidationStatus`, `preOpExtractedData`)
  - Fixed validation modal detection in `PreOpPlanDisplay` to use session validation fields
  - Fixed `PreOpCardLayout` props in export utility to match correct interface (jsonData + procedureInfo)
  - Added `PROCEDURE_TYPE_LABELS` to export utility for procedure info creation
  - Added `onReprocessWithValidation` prop to `PreOpPlanDisplay` component signature

### Changed

- **Pre-Op Display & Export**
  - Pre-Op cards now render as clean visual components matching RHC display style
  - Export functions now properly create `procedureInfo` objects from procedure types
  - Validation modal now uses session-level validation state instead of report-level state
  - All export functions (copy, download, preview) use consistent PreOpCardLayout rendering

## [3.30.0] - 2025-11-05

### Added

- **Pre-Op Plan Interactive Validation Workflow**
  - Implemented comprehensive validation workflow matching RHC pattern (Regex → Quick Model → Checkpoint → Reasoning)
  - Quick model (qwen/qwen3-4b-2507) validates extracted pre-op fields before expensive card generation
  - Auto-applies high-confidence corrections (≥0.8) for ASR errors (e.g., "rate deal" → "Right radial")
  - Interactive checkpoint pauses workflow if critical fields missing (procedure, indication, access, NOK info)
  - User fills missing fields via validation modal → reprocesses with validated data
  - Only runs reasoning model (MedGemma-27B) AFTER validation passes
  - Saves 3-15min of wasted generation time with incomplete dictation
  - Supports all 4 procedure types: Angiogram/PCI, RHC, TAVI, mTEER

- **Pre-Op Field Configuration System**
  - Added `PREOP_FIELD_CONFIG` with 28 procedure fields (labels, input types, placeholders, helper text)
  - Added `PREOP_VALIDATION_COPY` for validation modal UI text
  - Registered `'pre-op-plan'` in centralized `VALIDATION_CONFIG_MAP`
  - Generic `FieldValidationPrompt` component now supports Pre-Op Plan

- **Pre-Op Data Validation Prompt**
  - Added `PRE_OP_PLAN_DATA_VALIDATION_PROMPT` for quick model validation
  - Critical field lists per procedure type (Angio: access/NOK; TAVI: valve sizing/pacing; RHC: CO measurement; mTEER: clip details)
  - Confidence scoring guidance (0.95-1.0 unambiguous → 0.0-0.59 uncertain)
  - ASR correction patterns for common transcription errors

- **Pre-Op Type Definitions**
  - Added `PreOpExtractedData` interface with all procedure-specific fields
  - Updated `PreOpPlanReport` to support validation workflow with `status` and `extractedData`
  - Reuses generic `ValidationResult`, `FieldCorrection`, `MissingField` types

- **Pre-Op Agent Validation Methods**
  - `extractPreOpFields()` - Regex extraction with 25+ field patterns for all procedure types
  - `validateAndDetectGaps()` - Quick model validation with JSON response parsing
  - `applyCorrections()` - Auto-apply high-confidence corrections (≥0.8 threshold)
  - `mergeUserInput()` - Merge user-provided fields from validation modal (dot-notation support)
  - `convertToJSON()` - Convert camelCase extracted data → snake_case JSON format
  - Helper methods: `normalizeAccessSite()`, `setNestedField()`

### Changed

- **Pre-Op Agent Processing Flow**
  - Complete rewrite of `process()` method to integrate 8-step validation workflow
  - Now follows: Detect type → Regex → Validate → Auto-correct → Checkpoint → Merge user input → Convert JSON → Reasoning model
  - Agent pauses at checkpoint if critical gaps or low-confidence corrections
  - Returns `status: 'awaiting_validation'` with `validationResult` and `extractedData` for UI modal
  - Reprocesses with `context.userProvidedFields` after user fills missing fields

- **Pre-Op Export Validation**
  - Changed `validatePreOpDataForExport()` from blocking mode to warning mode
  - Now allows export with partial data, shows completeness percentage
  - Only blocks if completely empty (no fields at all)
  - Warning toast shows missing fields but allows export to proceed
  - Success messages indicate completeness: "A5 card copied (67% complete)!"

### Fixed

- **Pre-Op JSON Parsing**
  - Enhanced `parsePreOpResponse()` with robust regex patterns to strip `CARD:` and `JSON:` markers
  - Now correctly extracts JSON content with or without markdown code fences
  - Added multiple fallback patterns for reliable JSON extraction
  - Fixed empty `{"fields": {}}` display bug - now shows all extracted fields

- **Pre-Op Export Validation**
  - Removed overly strict validation that blocked export when ANY required field was missing
  - Users can now export incomplete cards and manually fill missing fields after paste
  - Export validation shows informative warnings instead of blocking with cryptic errors

- **Pre-Op LLM Output Display**
  - Fixed mixed output format showing raw `CARD:`, `JSON:`, and code fence markers
  - Display now shows clean card content without structural markup
  - Structured JSON metadata displays correctly in collapsible section

- **ESLint Errors**
  - Fixed unused variable `lowerInput` in `extractPreOpFields()` method
  - Fixed unnecessary escape character in NOK relationship regex pattern

## [3.28.0] - 2025-11-04

### Added

- **RHC Interactive Validation Workflow**
  - Intelligent validation checkpoint between regex extraction and report generation
  - Quick model (qwen/qwen3-4b-2507) validates extracted data before expensive reasoning model run
  - Auto-applies high-confidence corrections (≥0.8) automatically
  - Shows modal for missing critical fields (height, weight, Hb, SaO2, SvO2 for Fick calculations)
  - User fills missing fields → reprocesses with `context.userProvidedFields`
  - Prevents wasted 3-15min reasoning model runs with incomplete data
  - Saves time: ~10-30s validation vs full regeneration
  - Efficient: Lightweight quick model validates before running resource-intensive reasoning model

- **RHC Validation Modal Component**
  - Three sections: Critical Missing Fields (red), Low-Confidence Corrections (yellow), Optional Fields (blue)
  - Field-specific labels (e.g., "Mixed Venous O₂ Saturation (%)")
  - Accept/Reject buttons for low-confidence suggestions
  - Input fields with validation for missing critical data
  - Cancel/Skip/Continue workflow options

- **Session Status Types**
  - Added `'awaiting_validation'` status for interactive checkpoints
  - Added `'failed'` status for error handling
  - Enhanced SessionStatus type for better workflow state management

### Changed

- **RHC Agent Processing Flow**
  - Updated process() to pause at validation checkpoint if critical fields missing
  - Agent returns `status: 'awaiting_validation'` with `validationResult` and `extractedData`
  - Merges user-provided fields via `mergeUserInput()` method
  - Only runs expensive reasoning model after validation passes

- **State Management**
  - OptimizedApp detects `awaiting_validation` status and pauses workflow
  - Added `handleRHCReprocessWithValidation()` callback for user input flow
  - Wired validation detection through component hierarchy
  - Added `reprocessWithUserInput()` to useAIProcessing hook

### Fixed

- **Lint Errors**
  - Removed unused `CalculatedHaemodynamics` import from RHCCardLayout
  - Removed unused `RHCMissingField` import from RHCFieldValidationPrompt
  - Removed invalid `react/no-unknown-property` ESLint disable comment from Lanyard
  - Added ESLint disable comment for `STORAGE_KEY_CARD_THEME` export in UIPreferencesSection

## [3.27.0] - 2025-11-03

### Fixed

- **RHC Thermodilution CO Extraction**
  - Fixed regex pattern to match `"cardiac output by thermodilution 5.4"` format
  - Added alternative pattern: `cardiac\s+output\s+(?:via|by)\s+thermodilution[:\s,]+(\d+\.?\d*)`
  - Now correctly extracts CO value regardless of word order

- **RHC Catheter Extraction**
  - Made French size pattern more flexible: `(\d+)[-\s]?f(?:rench)?`
  - Made Swan-Ganz pattern more flexible: `swan[-\s]?(?:g[ae]n[zs]|gans)`
  - Now correctly handles `"7 French SWAN GANS"` with space between words
  - Added debug logging to catheter extraction for troubleshooting

- **RHC LLM Hallucination Prevention**
  - Added explicit anti-hallucination instructions for vascular access
  - System prompt now requires: "If vascular access site is NOT explicitly dictated, write: 'Vascular access was obtained [site not specified]'"
  - Prevents LLM from inferring common access sites (e.g., "right femoral") when not dictated

- **RHC Card Export Dimensions**
  - Fixed card dimensions from CSS units (`18cm`) to exact pixels (`680px × 378px`)
  - Added `overflow: 'hidden'` to prevent content bleeding outside canvas
  - Card preview now matches downloaded PNG exactly
  - Resolves cut-off content in exported cards

### Added

- **RHC Arterial Saturation Display**
  - Added SaO2 display in "Other Measurements" section of cardiac output
  - Shows `"Arterial O₂ Saturation: X%"` when available from patientData
  - Updated `renderCardiacOutputSection()` to accept optional `patientData` parameter
  - Also shows SvO2 from patientData as fallback for mixed venous O2

- **RHC Field Editor Debug Logging**
  - Added comprehensive debug logs for CI auto-calculation
  - Added debug logs for field editor save operations
  - Added debug logs for display component receiving updated data
  - Logs show calculation triggers, values, and data flow for troubleshooting

## [3.26.0] - 2025-11-03

### Fixed

- **RHC Catheter Display**
  - Fixed catheter extraction showing "undefinedF catheter" instead of "7F Swan-Ganz catheter"
  - Rewrote `extractCatheterDetails()` to combine French size and Swan-Ganz type intelligently
  - Now correctly displays combined catheter descriptions when both attributes present

- **RHC Preamble Formatting**
  - Added `formatReportOutput()` post-processor to ensure consistent formatting
  - Fixed unit spacing: "168 cm" → "168cm", "72 kg" → "72kg"
  - Fixed conjunction: "mmHg, heart rate" → "mmHg with a heart rate"
  - Fixed capitalization: "SWAN GANS" → "Swan-Ganz"
  - Added "right heart catheterisation was performed" phrasing

- **RHC Auto-Calculations**
  - Fixed Cardiac Index not auto-calculating from thermodilution CO + BSA
  - Fixed Fick CO/CI not auto-calculating from saturations + haemoglobin + BSA
  - Added auto-population logic to copy calculated values back to `cardiacOutput` fields
  - Values now appear in initial extraction (not just after field editor edits)

- **RHC Calculated Haemodynamics Display**
  - Fixed "No calculated haemodynamics available" appearing when calculations existed
  - Enhanced check to handle empty calculation objects `{}`
  - Calculated haemodynamics section now appears correctly when data present

- **RHC Conclusion Format**
  - Changed from verbose paragraphs to extremely concise 1-2 sentence summaries
  - Removed management recommendations and follow-up plans from conclusions
  - Added explicit example: "Moderate pulmonary hypertension, with preserved cardiac output and normal left sided pressures. Significant anaemia noted."
  - Updated system prompts to enforce concise clinical format

### Added

- **RHC Extraction Debug Logging**
  - Added comprehensive console logging for height, weight, and SaO2 extraction
  - Logs show input text preview, match confirmations, and final extracted data
  - Improves debugging of data flow issues from transcription to display

- **RHC Free-Text Indication Input**
  - Added `indicationOther?: string` field to `RightHeartCathData` interface
  - Added `'other'`, `'cardiogenic_shock'`, `'valvular_disease'` to `RHCIndication` type
  - Added conditional text input in field editor when "Other" indication selected
  - Users can now specify custom indication text (e.g., "Chronic thromboembolic disease")

- **Lanyard Asset Fix**
  - Fixed missing lanyard texture file causing build failures
  - Updated import path from `lanyard.png` to `lanyard_blue.png`

## [3.22.0] - 2025-11-02

### Added

- **RHC Card Preview Modal**
  - New preview modal for 18×10cm RHC cards before export
  - **Copy to Clipboard** button using Clipboard API for images
  - **Download PNG** button for saving cards
  - Modal dismissable by clicking outside (overlay click handler)
  - Shows card preview at full quality (300 DPI)

- **RHC Custom Fields Functionality**
  - "+ Add Custom Field" button for adding arbitrary key-value pairs
  - Inline form for quick field entry (field name + value)
  - Fields displayed in expandable emerald-colored panel
  - Remove individual custom fields with X button
  - Press Enter to add field quickly
  - Perfect for ad-hoc fields like "Fluoroscopy time: 8.2 minutes"

- **Inline Field Editor Components**
  - Created reusable `InlineFieldEditor` and `ClickableField` components
  - Support for immediate save on blur/Enter
  - Warning indicators for out-of-range values
  - Escape key to cancel edits

### Changed

- **RHC Card Font Update**
  - Changed card font from system fonts to **Avenir** with fallback stack
  - Font stack: `'Avenir, "Avenir Next", system-ui, -apple-system, sans-serif'`
  - More professional, medical-grade typography

- **RHC Card Display Improvements**
  - Removed "Normal: X-Y mmHg" text from all pressure boxes on cards
  - Cleaner, more compact card display
  - Reduced visual clutter while maintaining color-coded severity indicators

- **Patient Name Integration**
  - Patient name now flows properly: `OptimizedApp` → `OptimizedResultsPanel` → `RightHeartCathDisplay`
  - Fixed hardcoded `undefined` for patient name display
  - Cards now show patient name instead of "MRN: rhc-display"
  - Proper prop passing through component hierarchy

### Fixed

- **Type Errors**
  - Fixed unused `label` parameter in InlineFieldEditor (prefixed with underscore)
  - Fixed `title` prop on Lucide AlertTriangle icon (wrapped in div)
  - Removed unused `ClickableField` import from RightHeartCathDisplay
  - Removed unused `handleFieldEdit` function (incomplete implementation)
  - Added missing `X` icon import from lucide-react

- **ESLint Errors**
  - Fixed unnecessary escape characters in regex patterns (PatientEducationAgent, RightHeartCathAgent, BPDiaryExtractor)
  - Prefixed all unused variables with underscore across 13 files
  - Fixed `FocusEvent` undefined errors in content-script with eslint-disable comments
  - Reduced lint errors from 33 to 3 (non-critical config warnings only)

### Technical Details

- New `generateRHCCardBlob()` function returns both blob and data URL for preview
- RHCCardPreviewModal component with copy/download functionality
- Custom fields stored in component state with add/remove handlers
- Card export workflow: validate → generate → preview → copy/download

## [3.21.8] - 2025-11-01

### Changed

- **Lanyard Starting Position Raised**
  - Moved lanyard attachment point from `[0, 4, 0]` to `[0, 10, 0]`
  - Lanyard now appears to hang from near the top edge (header/content border)
  - More realistic hanging appearance from the top of the viewport

### Removed

- **Microphone HTML Overlay**
  - Removed non-functional HTML emoji overlay that wasn't attached to card
  - Card now shows only the embedded texture from card.glb
  - Simplified implementation without floating overlays

- **Unused Microphone Texture Files**
  - Deleted `microphone-card.png` (72KB)
  - Deleted `microphone-card.svg` (1.2KB)
  - Removed from vite.config.ts copy list
  - Removed unused texture loading and preload code
  - Cleaned up debug logging

### Technical Details

- Card now uses original embedded texture from card.glb file
- The atom-like logo on the card is baked into the GLB model itself
- Lanyard.tsx: Removed microphoneTexture loading, debug useEffect
- OptimizedApp.tsx: Removed microphone emoji HTML overlay
- Reduced bundle size by removing unused assets
- Cleaner codebase with no unused texture manipulation code

### Note

The card logo (atom design) is embedded in the card.glb 3D model file downloaded from React Bits. To change it would require editing the GLB file in a 3D editor like Blender.

## [3.21.7] - 2025-10-29

### Fixed

- **Microphone Texture Aspect Ratio**
  - Recreated microphone icon with correct aspect ratio (1024x1440) to match card dimensions (1.6 x 2.25)
  - Previous 512x768 texture was stretched and distorted on the card
  - New texture properly fills card without stretching
  - Microphone now centered and properly proportioned
  - Increased from 39KB to 72KB for better quality
  - Added rounded corners to card background for polish

- **Lanyard Band Texture Proportions**
  - Adjusted texture repeat from `[-4, 1]` to `[-3, 1]`
  - Reduced stretching of logos/pattern on lanyard rope
  - Better visual balance along the band
  - Stripe pattern now displays at correct aspect ratio

### Technical Details

- Microphone texture dimensions changed from 512x768 to 1024x1440
- Aspect ratio now matches card geometry (0.711 vs 0.711)
- SVG source updated with proper viewBox and scaling
- Card background uses light gray (#f3f4f6) with 40px rounded corners
- Lanyard material repeat parameter optimized for texture dimensions (1025x250)

## [3.21.6] - 2025-10-29

### Changed

- **Replaced 3D Microphone with 2D Texture**
  - Removed 3D geometric microphone meshes (capsule, cylinders, sphere)
  - Created clean 2D microphone icon (512x768 PNG, 39KB)
  - Icon features rounded capsule head with grille lines and stand design
  - Applied microphone texture directly to lanyard card material
  - Simpler, cleaner approach that integrates better with card design
  - Light gray background (#f8f9fa) with dark gray microphone (#1f2937)

- **Improved Texture Management**
  - Separated `lanyardTexture` (band) from `microphoneTexture` (card)
  - Card texture uses ClampToEdgeWrapping (displays once, no repeat)
  - Lanyard band texture uses RepeatWrapping (striped pattern)
  - Added microphone-card.png to preload list for faster initial render

### Technical Details

- Created microphone icon with ImageMagick from SVG design
- Lanyard.tsx: Load two separate textures, apply microphone to card material
- vite.config.ts: Added 'microphone-card.png' to asset copy list
- Card material properties: clearcoat, low roughness, minimal metalness
- Maintains all physics simulation and interactive dragging
- Fallback geometry also displays microphone texture when model fails to load

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
