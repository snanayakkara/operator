# Optimization Settings UX Redesign Plan

## Executive Summary

Transform the optimization settings from a fragmented 5-tab interface into a single, ordered workflow page that shows all optimization options with clear prerequisites, time estimates, and status indicators.

**Core Transformation**: From "5 disconnected tabs" → "One workflow showing optimization pipeline in order"

**User Context**: Single power user (developer/clinician) who wants to see all options, understand the technology, and choose which optimizations to run based on time/readiness.

## Current Problems

1. **Unclear workflow**: 5 tabs with no indication of order or dependencies
2. **Missing context**: No time estimates, prerequisites, or readiness indicators
3. **Fragmented experience**: Have to click through tabs to see what's ready to run
4. **Technical jargon without explanation**: Terms explained but pipeline relationship unclear
5. **No status visibility**: Can't quickly see what's been optimized and when

## Proposed Solution: Single Ordered Workflow Page

Replace 5-tab navigation with one scrollable page showing all optimization steps in pipeline order, each with:
- Plain English explanation + technical details
- Status (Not started | Ready | Complete | Blocked)
- Prerequisites and readiness indicators
- Time estimates
- Last run date/results
- Expandable sections for detailed configuration

## The 5-Step Optimization Pipeline

### Step 1: Transcription Optimization (~8-12 hours overnight)
**Plain English**: Improve Whisper's accuracy on medical terminology and your speaking style
**Technical**: ASR corrections + LoRA fine-tuning on collected transcription edits

**Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│ [1] TRANSCRIPTION OPTIMIZATION                      8-12h overnight │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                    │
│ 📝 What this does                                                 │
│ Trains Whisper to better recognize medical terms and your speech │
│ patterns, reducing transcription errors before AI processing      │
│                                                                    │
│ 🔧 How it works                                                   │
│ Uses your transcription corrections to fine-tune Whisper via LoRA│
│ (Low-Rank Adaptation). Runs overnight on local MLX.              │
│                                                                    │
│ 📊 Status: Ready ✓  |  Prerequisites: 50+ corrections collected  │
│ 📅 Last run: 3 days ago  |  Accuracy: 94% → 97% (+3%)            │
│                                                                    │
│ ┌──────────────────────────────────────────────────────────┐    │
│ │ A. Quick Wins (Immediate)                                │    │
│ │ • 47 corrections collected                               │    │
│ │ • Glossary: 23 terms | Rules: 12 patterns              │    │
│ │ [Preview Batch] [Apply Corrections]                     │    │
│ │                                                          │    │
│ │ B. Deep Training (Overnight)                            │    │
│ │ • Training set: 142 corrections with audio             │    │
│ │ • Estimated improvement: +2-4% accuracy                 │    │
│ │ [Prepare Training] [Start LoRA Fine-tune]               │    │
│ └──────────────────────────────────────────────────────────┘    │
│                                                                    │
│ [Expand for Details ▼]                                            │
└─────────────────────────────────────────────────────────────────┘
```

**Components**:
- Merged ASR Corrections + Whisper Fine-tune into one unified section
- Two subsections: A) Immediate corrections, B) Overnight training
- Status indicators: Corrections count, readiness, last run, results

### Step 2: Create Agent Training Examples (5-10 min per agent)
**Plain English**: Show AI agents what perfect output looks like for your dictations
**Technical**: Golden examples for DSPy dev set - transcript/output pairs for evaluation

**Layout**: Similar card structure with:
- Agent selector (Quick Letter, Angio/PCI, TAVI, etc.)
- Progress per agent: "Quick Letter: 7 examples ✓ | Angio: 3 examples ⚠️ Need 2 more"
- Form for adding examples (preserves existing DevSetManager functionality)
- Status: Shows which agents are ready for optimization (5+ examples)

### Step 3: Measure Agent Performance (~1 min per agent)
**Plain English**: Test how well agents perform on your training examples right now
**Technical**: DSPy evaluation - runs examples through agent, scores with medical rubric

**Layout**:
- Agent selector with readiness indicator
- Run button (disabled if <5 examples)
- Results display: Color-coded score (≥80% emerald, 70-79% blue, 60-69% yellow, <60% red)
- Interpretation: "68% - Good foundation. GEPA optimization expected +10-15%"
- Historical scores chart (if run multiple times)
- Status: Last run date, current score, readiness for Step 4

### Step 4: Auto-Improve Agent Instructions (2-3 min per agent)
**Plain English**: Let AI test different instruction variations to find what works best
**Technical**: GEPA (Generalized Evolutionary Prompt Augmentation) via DSPy MIPRO

**Layout**:
- Prerequisites check: "Need baseline score from Step 3" (link to Step 3 if missing)
- Agent selector + configuration: Quick (3 iter, 1 min) | Recommended (5 iter, 2 min) | Thorough (10 iter, 5 min)
- Live progress: "Testing variation 3 of 5... Current best: +6.2%"
- Results: Before/after metrics with delta, plain English summary, expandable prompt diff
- Status: Last optimized date, improvement achieved, option to rollback

### Step 5: Validate Improvement (~1 min per agent)
**Plain English**: Re-test to confirm optimization worked as expected
**Technical**: Re-run evaluation with optimized prompts, compare to baseline

**Layout**:
- Prerequisites: "Need completed optimization from Step 4"
- One-click re-test button
- Side-by-side comparison: Baseline 68% | Optimized 76% | Gain +8% ✓
- Historical timeline showing all optimization attempts
- Next steps checklist with links to relevant steps

## Plain English Glossary

Replace technical terms throughout the UI:

| Technical Term | Plain English | Tooltip Explanation |
|----------------|---------------|---------------------|
| Golden Examples | Training Examples | Sample dictations showing the AI what perfect output looks like |
| Dev Set | Training Library | Your collection of example dictations used to teach and test the AI |
| GEPA | Auto-Improve | Automatic system that tests variations to find better AI instructions |
| DSPy | Optimization System | Backend server that handles AI improvement (needs to be running) |
| Rubric Criteria | Quality Checklist | Specific things the AI should get right (accuracy, completeness, etc.) |
| Expected Elements | Required Facts | Key information that must appear in the output |
| Evaluation | Performance Test | See how well the AI performs on your training examples |
| Prompt | AI Instructions | The directions we give the AI on how to process dictations |

**Implementation**: Always show plain English primary, with technical term in tooltip on hover

## Visual Design Specifications

### Layout Structure
Single scrollable page with 5 sequential sections, all visible at once:
- No tabs or navigation - scroll to see full pipeline
- Each section is a numbered card with expand/collapse
- Sections stack vertically with consistent spacing
- Dense but readable layout (current Options page style)

### Color System (Extends Existing)
- **Step 1**: Slate/Gray accents (transcription/foundation)
- **Step 2**: Emerald accents (creation/training data)
- **Step 3**: Blue accents (analysis/measurement)
- **Step 4**: Purple accents (AI optimization/intelligence)
- **Step 5**: Teal accents (validation/completion)
- **Status colors**: Green (ready), Yellow (needs attention), Red (blocked), Gray (not started)
- **Base**: Monochrome gray scale (professional, clinical)

### Page Header (Overview)
```
┌──────────────────────────────────────────────────────────────────┐
│ OPTIMIZATION PIPELINE                                             │
│ Follow the 5-step process below to optimize your AI end-to-end  │
│                                                                   │
│ Quick Status:                                                     │
│ ① Transcription: Last run 3 days ago (97% accuracy)             │
│ ② Training Data: Quick Letter ✓ | Angio ⚠️ | TAVI ✗            │
│ ③ Baseline: Quick Letter 68% | Angio 62% | TAVI not tested      │
│ ④ Optimized: Quick Letter 76% (+8%) | Angio not optimized       │
│ ⑤ Validated: Quick Letter ✓                                     │
└──────────────────────────────────────────────────────────────────┘
```

### Step Card Layout
```
┌─────────────────────────────────────────────────────┐
│ [1] CREATE TRAINING EXAMPLES                  5-10 min │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                        │
│ 💡 WHY THIS MATTERS                                   │
│ Show the AI examples of perfect dictations so it     │
│ learns your style and requirements                     │
│                                                        │
│ ┌──────────────────────────────────────────────┐    │
│ │ Agent: [Quick Letter ▼]           3/5 ⚠️     │    │
│ │                                              │    │
│ │ Your Dictation:                              │    │
│ │ ┌──────────────────────────────────────────┐│    │
│ │ │ [Transcript text...]                     ││    │
│ │ └──────────────────────────────────────────┘│    │
│ │                                              │    │
│ │ Perfect Output:                              │    │
│ │ ┌──────────────────────────────────────────┐│    │
│ │ │ [Ideal letter text...]                   ││    │
│ │ └──────────────────────────────────────────┘│    │
│ │                                              │    │
│ │              [+ Add Example]                 │    │
│ └──────────────────────────────────────────────┘    │
│                                                        │
│ ✓ DONE WHEN: 5+ examples for at least one agent      │
│                                                        │
│                         [Continue to Step 2 →]        │
└─────────────────────────────────────────────────────┘
```

### Quick Tune Dashboard
```
┌─────────────────────────────────────────────────────┐
│ YOUR AGENTS                                          │
│                                                       │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│ │Quick Letter │  │Angio/PCI    │  │TAVI         │ │
│ │ Score: 76%  │  │ Score: 62%  │  │ Score: --   │ │
│ │ 7 examples  │  │ 5 examples  │  │ 2 examples  │ │
│ │ 3 days ago  │  │ Never       │  │ Not ready   │ │
│ │ [Optimize]  │  │ [Optimize]  │  │ [Add More]  │ │
│ └─────────────┘  └─────────────┘  └─────────────┘ │
│                                                       │
│              [Optimize All Ready Agents]              │
└─────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Create Unified Workflow Structure (Week 1)
**New Components**:
- `UnifiedOptimizationWorkflow.tsx` - Main container for single-page workflow
- `OptimizationStepCard.tsx` - Reusable collapsible step card component
- `PipelineStatusHeader.tsx` - Overview header showing quick status of all 5 steps
- `StatusBadge.tsx` - Reusable status indicator (Ready/Blocked/Complete/In Progress)

**Modified Components**:
- `OptimizationDashboard.tsx` - Replace 5-tab navigation with single workflow container

**Functionality**: Basic structure in place, all 5 steps visible as collapsed cards

### Phase 2: Integrate Existing Features into Steps 2-5 (Week 2)
**Modified Components**:
- `DevSetManagerSection.tsx` - Embed into Step 2 card (expandable section)
- `EvaluationDashboard.tsx` - Embed into Step 3 card
- `GEPAOptimizationSection.tsx` - Embed into Step 4 card
- Existing validation logic - Embed into Step 5 card

**New Wrapper Components**:
- `StepTwoWrapper.tsx` - Adds status, prerequisites, explanations around DevSet
- `StepThreeWrapper.tsx` - Adds status, readiness checks around Evaluation
- `StepFourWrapper.tsx` - Adds prerequisite checking, results tracking for GEPA
- `StepFiveWrapper.tsx` - Validation re-test with comparison view

**Functionality**: Steps 2-5 working with existing functionality, now with added context

### Phase 3: Build Step 1 (Transcription Optimization) (Week 3)
**New Component**:
- `TranscriptionOptimizationPanel.tsx` - Unified ASR + Whisper fine-tune

**Integration**:
- Merge `FullPageCorrectionsViewer.tsx` functionality (ASR section)
- Merge `WhisperTrainingPanel.tsx` functionality (Fine-tune section)
- Two subsections: A) Immediate corrections, B) Overnight training
- Status tracking: Corrections count, last run, accuracy metrics

**Functionality**: Complete transcription optimization workflow in Step 1

### Phase 4: Add Status Tracking & Prerequisites (Week 4)
**New Services/Hooks**:
- `useOptimizationStatus.ts` - Hook to track status of all 5 steps
- `OptimizationStatusService.ts` - Service to read/write status from Chrome storage
- Prerequisite checking logic for each step

**Enhanced Components**:
- Add prerequisite checking to each StepCard
- Add "Last run" timestamps to status
- Add readiness indicators (green checkmark, yellow warning, red X)
- Add agent-specific status breakdowns

**Functionality**: Real-time status updates, prerequisite enforcement, clear readiness

### Phase 5: Enhanced Explanations & Polish (Week 5)
**Content Updates**:
- Add "What this does" (plain English) to every step
- Add "How it works" (technical details) to every step
- Add inline tooltips for technical terms
- Add time estimates to every action button

**Visual Polish**:
- Smooth expand/collapse animations
- Color-coded status badges
- Consistent spacing and typography
- Loading states for async operations

**Functionality**: Professional, polished, easy to understand

### Phase 6: Testing & Refinement (Week 6)
**Testing**:
- Test full workflow end-to-end
- Verify prerequisite blocking works correctly
- Test all expand/collapse interactions
- Test with real optimization runs
- Performance testing

**Refinements**:
- Adjust spacing/layout based on real usage
- Refine status indicators based on feedback
- Add any missing explanations or context
- Bug fixes and edge cases

## Content Strategy

### Tone & Voice
- **Encouraging**: "You're making progress!" not "Configuration incomplete"
- **Directive**: "Add 2 more examples" not "Insufficient training data"
- **Confident**: "This will improve your AI by 10-15%" not "May potentially enhance performance"
- **Human**: "Let's make your AI better" not "Initiate optimization workflow"

### Key Phrases to Use
- "Training Examples" instead of "Golden Examples" or "Dev Set"
- "Auto-Improve" instead of "GEPA Optimization"
- "Performance Test" instead of "Evaluation"
- "See how well it works" instead of "Validate against rubric"
- "AI learns your style" instead of "Trains on your data distribution"

### Help Text Pattern
Every major action gets three pieces of context:
1. **WHY THIS MATTERS** (1 sentence): Motivation/benefit
2. **WHAT HAPPENS** (1-2 sentences): Plain English explanation
3. **TIME ESTIMATE** (upfront): Manage expectations

Example:
```
WHY THIS MATTERS: Establishes a baseline so you can measure improvement
WHAT HAPPENS: The AI processes your training examples and gets scored on accuracy
TIME ESTIMATE: ~1 minute
```

## Migration Strategy

### Backward Compatibility
- **Keep Advanced mode identical** to current interface (no breaking changes)
- **Progressive enhancement**: New users see Guided, existing users see Advanced by default
- **User preference**: Remember mode selection in Chrome storage

### First Launch Experience
1. Show welcome modal: "We've made optimization easier! Choose your experience:"
   - Guided Setup (Recommended) - Step-by-step for first-time users
   - Quick Tune - For users with training data already
   - Advanced - Full technical control (what you're used to)
2. Remember choice for future sessions
3. Allow switching modes anytime via selector

### Feature Flags
- `ENABLE_GUIDED_MODE` (default: true)
- `ENABLE_QUICK_TUNE` (default: true)
- `DEFAULT_MODE` (default: 'guided' for new users, 'advanced' for existing)

## Success Metrics (Single User Context)

### Quantitative Measures
- **Time to decision**: Can quickly scan all 5 steps and decide what to run (<30 sec)
- **Context visibility**: All status/readiness info visible without clicking into tabs
- **Optimization frequency**: Increase from monthly to weekly checks
- **Agent coverage**: Increase number of agents with training data (currently 2-3, target 5+)
- **Understanding**: Can explain what each step does and why it matters

### Qualitative Measures
- **Reduced friction**: No more "where do I start?" confusion
- **Clear prioritization**: Obvious which optimizations are ready vs blocked
- **Time awareness**: Always know how long each operation will take
- **Technical depth**: Can access technical details when needed without clutter
- **Confidence**: Feel confident running optimizations without second-guessing

## Critical Files

### To Modify
1. `/src/options/components/OptimizationDashboard.tsx` - Replace 5-tab nav with single workflow
2. `/src/components/settings/DevSetManagerSection.tsx` - Wrap in Step 2 context
3. `/src/components/settings/EvaluationDashboard.tsx` - Wrap in Step 3 context
4. `/src/components/settings/GEPAOptimizationSection.tsx` - Wrap in Step 4 context
5. `/src/options/components/FullPageCorrectionsViewer.tsx` - Merge into Step 1
6. `/src/options/components/WhisperTrainingPanel.tsx` - Merge into Step 1

### To Create
1. `/src/options/components/UnifiedOptimizationWorkflow.tsx` - Main container
2. `/src/options/components/workflow/OptimizationStepCard.tsx` - Reusable step card
3. `/src/options/components/workflow/PipelineStatusHeader.tsx` - Status overview
4. `/src/options/components/workflow/StatusBadge.tsx` - Status indicator
5. `/src/options/components/workflow/steps/TranscriptionOptimizationPanel.tsx` - Step 1
6. `/src/options/components/workflow/steps/StepTwoWrapper.tsx` - Step 2 wrapper
7. `/src/options/components/workflow/steps/StepThreeWrapper.tsx` - Step 3 wrapper
8. `/src/options/components/workflow/steps/StepFourWrapper.tsx` - Step 4 wrapper
9. `/src/options/components/workflow/steps/StepFiveWrapper.tsx` - Step 5 wrapper
10. `/src/hooks/useOptimizationStatus.ts` - Status tracking hook
11. `/src/services/OptimizationStatusService.ts` - Status persistence

### Reference Only (No Changes)
- `/src/services/OptimizationService.ts` - Existing APIs work perfectly
- `/src/services/ASRCorrectionsLog.ts` - Existing corrections storage
- `/src/types/optimization.ts` - Existing type definitions

## Design Decisions (Resolved)

1. **Single Workflow Structure**: ✓ Single scrollable page, all 5 steps visible
2. **Pipeline Order**: ✓ Transcription → Training Data → Baseline → Optimize → Validate
3. **Transcription Consolidation**: ✓ Merge ASR + Whisper into unified Step 1
4. **Status Indicators**: ✓ Show all: status, readiness, prerequisites, time, last run, benefit estimate
5. **Visual Density**: ✓ Balanced (current Options style), not too dense or spacious
6. **Explanations**: ✓ Both plain English + technical details in every step
7. **Target User**: ✓ Single power user (developer/clinician), no beginner modes needed

## Final Design Decisions

1. **Rollback UX**: ✓ Prominent rollback button if GEPA worsens agent score
   - Show warning banner at top of Step 4 results: "Optimization decreased score by 5%. [Rollback to Previous] | [Keep Anyway]"
   - Rollback button styled as warning (yellow/orange accent)

2. **Auto-Optimization**: ✓ Notification system, not automatic
   - Check last optimization date on each visit
   - Show banner if >30 days: "It's been 32 days since last optimization. Ready to optimize?"
   - User must click to initiate - never runs automatically

3. **Example Quality Checks**: ✓ Validate training examples
   - Check minimum length (transcript >50 chars, output >100 chars)
   - Check for placeholder text ([insert], TODO, etc.)
   - Check for duplicate examples
   - Show warnings on add, allow override with confirmation

4. **Batch Operations**: ✓ "Optimize All Ready Agents" available
   - Button in Step 4 header: "Optimize All Ready Agents (3)"
   - Runs sequentially with progress: "Optimizing Quick Letter (1/3)..."
   - Shows combined results after completion

5. **Historical Data**: ✓ Chart over time
   - Line chart showing score progression for each agent
   - Last 10 optimization runs per agent
   - Hover shows date, score, improvement delta
   - Filterable by agent

## Next Steps

1. **User Validation**: Show mockups to 2-3 target users for feedback
2. **Technical Spike**: Validate routing architecture works with existing components
3. **Content Review**: Have clinical user review all plain English explanations
4. **Phased Implementation**: Start with Phase 1 foundation
5. **A/B Testing**: Consider testing Guided vs Advanced as default for new users
