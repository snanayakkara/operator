# Operator UI Intent & Design Constitution

This document defines the **non-negotiable UI and interaction intent** for Operator.

It exists to prevent design drift.
All UI decisions, refactors, and new features MUST align with this document.

Operator is a **clinical productivity instrument**, not a consumer app.

---

## 0. Core Identity

Operator is:

- A **Chrome-native side panel extension**
- Always open, always present beside a web-based EMR
- Keyboard-first, deterministic, and fast
- Calm, mechanical, and precise in feel
- Designed for expert, repeat daily use under time pressure

Operator is **not**:
- A marketing UI
- A modal-heavy app
- A playful or decorative interface
- A separate desktop application

---

## 1. Mental Model

Operator behaves like:

- An **RTS control deck**
- An **instrument panel**
- A **command-driven system**

The EMR is the “game world”.  
Operator is the control surface.

The user’s hands should stay on the keyboard.

---

## 2. Command Bar (Primary Interface)

### 2.1 Canonical Role

The command bar is the **primary interface** to Operator.

Every action that exists anywhere in the UI:
- MUST be reachable via the command bar
- MUST resolve to a single underlying action definition

UI buttons are **secondary affordances**, not sources of truth.

---

### 2.2 Collapse / Expand Behaviour

**Collapsed**
- Command bar is visually collapsed
- A subtle ghost affordance remains (e.g. “Search or ⌘K”)
- The favourites bar is ALWAYS visible

**Expanded**
- Command bar expands downward
- Favourites bar recedes slightly (fade / blur / small slide)
- No full-screen overlays
- No background dimming
- Focus goes directly into the command input

The side panel itself is **never closed**.

---

### 2.3 Keyboard Behaviour

- One shortcut toggles command bar focus
- `Esc` collapses the command bar
- Keyboard input always has priority
- No mouse required for core flows

---

## 3. Keyboard-First & Deterministic Actions

### 3.1 Determinism

Core actions:
- Have **unique shortcuts**
- Do **not** require selecting or focusing a card
- Must never be ambiguous

Examples:
- “Insert Letter” ≠ “Insert Summary”
- Each is a separate action with a separate shortcut

No “active card” dependency for high-value actions.

---

### 3.2 Discoverability

- Shortcut hints are shown on hover or in command bar help
- Shortcuts are NOT always visible by default
- UI remains visually quiet

---

## 4. Central Action Registry (Architectural Mandate)

Operator must use a **single central action registry**.

All actions flow through it:
- command bar
- keyboard shortcuts
- card footers
- agent footers
- favourites bar
- help / discovery

Each action definition includes:
- stable ID
- terse label
- light group (Insert / Generate / Navigate / Capture / Review)
- optional description
- shortcut(s)
- availability rules (context required)
- execution handler

UI components must NEVER bypass the registry.

---

## 5. Agent Panels (Hard Consistency Rule)

All agent panels share **identical chrome**.

### 5.1 Header (fixed structure)
- Agent name
- Status
- Breadcrumbs / context (small font allowed)
- Compact agent-specific controls allowed

### 5.2 Body
- Scrollable
- Content only

### 5.3 Footer (fixed position)
- Agent-level actions only (e.g. regenerate, rerun)

Agents may differ ONLY inside the body.

---

## 6. Artefact Cards Inside Agents

Some agents produce multiple artefacts (e.g. Letter, Summary, Patient Version).

Rules:
- Each artefact is a CARD
- All cards use a shared Card component
- Each card has an ALWAYS-VISIBLE, VERY COMPACT footer

### Card Footer Rules
- Inline actions = common / muscle-memory actions
- Overflow (⋯) = rare actions
- Inline actions capped; overflow preferred over clutter
- Actions remain shortcut-driven and deterministic

Keyboard shortcuts must target specific artefacts without selection.

---

## 7. Motion & Animation Language

Motion should feel:
- Mechanical
- Realistic
- Fast
- Purposeful

Think:
- Sliding panels
- Docking components
- Physical movement on rails

### Motion Rules
- Fast durations (~120–160ms)
- Soft ease-out
- Prefer translate + opacity
- No bounce, wobble, or overshoot
- GPU-friendly CSS only

### Absolute Rule
**No motion during typing or text editing.**
Typing surfaces must remain completely stable.

---

## 8. Errors & Failure States

Errors are **events**, not decorations.

Rules:
- Errors surface primarily in the command bar
- Tone is gently corrective
- State what’s missing
- Suggest the next step
- No alarmist language unless truly dangerous

Persistence:
- Error remains until the next command replaces it
- No auto-dismiss
- No forced dismissal

---

## 9. Conversational Clarification

When an action is blocked due to missing input:

- Ask follow-up questions IN the command bar
- Conversational tone, form-like mechanics

Rules:
- ≤3 fields → ask all at once
- Tab between fields
- Enter submits
- >3 fields → staged steps
- No modals
- No focus jumps
- Keyboard only

---

## 10. Memory & Defaults

Operator may remember past choices.

Rules:
- Defaults are conservative
- Never act silently
- Always show subtle transparency:
  - “Using last choice”
  - “Default: Letter”

Memory assists; it never assumes.

---

## 11. Visual Tone

- Clean, modern, engineered
- Higher contrast surfaces are acceptable
- Calm productivity > decoration
- Dense but readable
- Optimised for narrow side panel width

---

## 12. Explicit Non-Goals

Operator should NOT:
- Introduce new UI paradigms casually
- Use modals for core flows
- Animate text entry
- Add visual flair without purpose
- Drift toward consumer-app aesthetics