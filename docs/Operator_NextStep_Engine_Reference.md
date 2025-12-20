# Operator – Next-Step Engine (Reference Specification)

## Purpose

The Next-Step Engine is a post-letter clinical reasoning feature in Operator.
Its purpose is to identify **optional, patient-specific next clinical steps**
that the clinician may wish to consider, based on:

- Patient background and comorbidities
- Medications
- Investigation summaries
- The *final generated clinic letter*, including the clinician’s plan

This engine is **not** a replacement for letter generation.
It is an additive, opt-in intelligence layer.

Its output is surfaced as a **separate UI card** containing suggested next steps.
Only with explicit user action may those suggestions be integrated into the letter.

---

## What the Next-Step Engine IS

- A clinical gap-detection and planning assistant
- A second-pass reasoning agent
- An asynchronous, non-blocking process
- A suggestion engine, not an executor
- A system that respects clinician autonomy

---

## What the Next-Step Engine IS NOT

- Not a generic text editor
- Not an automatic plan generator
- Not a task manager
- Not a guideline enforcer
- Not allowed to silently modify letters
- Not allowed to introduce new diagnoses or clinical facts

---

## Position in the Pipeline

1. Audio dictation → Whisper transcription
2. Transcription → Letter generation (Reasoning Agent, e.g. MedGemma-27B)
3. Letter + Summary rendered in UI
4. **Next-Step Engine runs asynchronously**
5. Next-Step suggestions appear in a separate card

The engine must never block steps 1–3.

---

## Inputs to the Next-Step Engine

- Final letter text (current version at time of execution)
- Structured patient context, including:
  - Background / comorbidities
  - Medication list
  - Investigation summaries (echo, CT, angiogram, ECG, labs where available)
- Optional patient summary object (if present)

---

## Outputs

The engine returns **zero or more suggestions**.
Each suggestion includes:

- A short title
- A brief reason (why this is relevant and currently missing)
- Suggested plan-level text suitable for insertion
- A priority value (low | medium | high) used for ordering only

If zero suggestions are found, this is a valid and expected outcome.

---

## UI Behaviour

### Card Placement
- A new card titled **“Next-Step Suggestions”**
- Appears below existing Letter and Summary cards
- Independent and non-blocking

### Zero-Suggestion Case
- Card appears in a collapsed state
- Displays:
  “No additional next steps identified for this patient”
- Expanding the card shows a brief explanatory note

### Suggestions Present
- Suggestions displayed as a selectable list
- Ordered by priority
- No aggressive visual emphasis
- User may:
  - Read and ignore
  - Manually incorporate ideas
  - Select suggestions and click **Integrate into Letter**

---

## Integration Behaviour

Integration occurs **only** when explicitly triggered by the user.

When integration is requested:
- Operator takes the **current letter version** (including any manual edits)
- Selected suggestions are incorporated
- A **full-letter rewrite** is performed

### Rewrite Rules
- Unified, smooth prose
- Matches the clinician’s existing voice
- Mild structural reorganisation permitted
- No new clinical inference allowed
- No new diagnoses
- No new recommendations beyond selected suggestions
- Terminology preserved with light meaning-equivalent normalisation only

---

## Undo / Versioning

- Every rewrite triggered by integration must be reversible
- A single-action “Revert to previous version” must be available
- Undo affects only the letter rewrite step
- Prior versions must be retained locally for the session

---

## Safety Constraints (Critical)

- The engine may not invent new diagnoses
- The engine may not add treatments or investigations not implied by context
- The engine must not duplicate content already present
- The engine must not override clinician intent
- Suggestions are always optional

---

## Design Philosophy

This feature behaves like a senior registrar quietly reviewing a plan and saying:

“Given this patient, would you also like to consider…”

It must feel supportive, conservative, and respectful of clinical judgement.

Silence is acceptable.
No suggestion is better than a bad suggestion.