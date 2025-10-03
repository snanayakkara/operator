# Repository Guidelines

## Project Structure & Module Organization
- `src/`: Extension source code
  - `background/`: Service worker and extension lifecycle
  - `content/`: Content script for EMR page interaction
  - `sidepanel/`: React UI (components, hooks, styles)
  - `agents/`: Medical agents and system prompts
  - `services/`: LM Studio, Whisper, notifications, audio, etc.
  - `orchestrators/`: Batch flows, checkpoints, metrics
  - `utils/`, `types/`, `workers/`, `config/`
- `tests/`: Playwright E2E (`tests/e2e`, `tests/helpers`)
- `dist/`: Built extension payload (load via Chrome “Load unpacked”)
- `rules/`: DeclarativeNetRequest JSON rules
- `docs/`: Dev and testing guides

## Build, Test, and Development Commands
- `npm run dev`: Vite dev server for rapid UI iteration
- `npm run build`: Production build to `dist/`
- `npm run build-with-types`: Type-check then build
- `npm run type-check`: TypeScript no-emit check
- `npm run lint` / `npm run lint:src`: ESLint over repo or `src/`
- `npm run test:e2e` (`:verbose`): Playwright E2E tests
- `npm run validate:full`: Build, type-check, lint, and E2E

## Coding Style & Naming Conventions
- TypeScript + React 18; strict TS enabled
- ESLint configured (TypeScript, React Hooks); no Prettier in repo
- Indentation 2 spaces; single quotes preferred; semicolons used
- File naming: React components `PascalCase.tsx` (e.g., `AgentSelector.tsx`), hooks `camelCase.ts`, workers `*.worker.ts`, types `*.types.ts`
- Use path aliases: `@/agents`, `@/services`, `@/types`, `@/components` (maps to `src/sidepanel/components`)
- `ChatMessage.content` is a union (`string | ChatMessageContentBlock[]`); when you require plain text, flatten via existing helpers (`normalizeMessageContent`, Gemma formatter) instead of calling string methods directly.

## Testing Guidelines
- Framework: Playwright (`@playwright/test`); tests live under `tests/e2e/*.spec.ts`
- Run locally with `npm run test:e2e`; verbose mode available
- Aim for deterministic flows; avoid network dependence beyond localhost services
- No unit tests currently via Vitest; add only where valuable and fast

## Commit & Pull Request Guidelines
- Commit style: Conventional Commits (e.g., `feat: ...`, `fix: ...`)
- PRs: include description, linked issues, and screenshots for UI changes
- Required checks before PR: `npm run validate:full`
- Update `docs/` and in-code comments when behavior changes

## Security & Configuration Tips
- Local services: LM Studio `http://localhost:1234`, Whisper `http://localhost:8001`
- If endpoints change, update `manifest.json` CSP `connect-src` and `rules/` allowlist
- Minimize permissions; keep host scopes narrow; avoid logging PHI—prefer `src/utils/Logger.ts` with production level
- When constructing LM Studio requests, wrap vision inputs as `{ type: 'image_url', image_url: { url } }` blocks alongside `{ type: 'text', text }`; avoid raw base64 strings in plain content fields.

## UI Implementation Notes
- Reuse the shared `.icon-compact` utility when placing icons alongside labels to keep glyphs aligned to the 16px baseline.
- Timeline/state visuals follow the monochrome + accent palette defined in `globals.css`; copy existing gradient/shadow tokens when adding new states.
- Micro-interactions (e.g., `animate-complete-pop`) are defined globally and already respect `prefers-reduced-motion`; reuse those classes instead of introducing bespoke animations.

## Agent-Specific Implementation Notes

### Investigation Summary Agent
The Investigation Summary agent formats voice-dictated medical investigation results into standardized summaries with precise medical abbreviations and formatting:

**Key Formatting Rules**:
- **Measurement Spacing**: Always use spaces before values: `LVEDD 59`, `EF 43`, `GLS -16`, `LAVI 45` (never hyphens)
- **Parentheses Placement**: Measurements quantifying findings go in parentheses: `dilated LV (LVEDD 59)`
- **Severity Abbreviations**: `moderate` → `mod`, `moderately dilated` → `mod dil`
- **Investigation Types**: Pre-normalized via ASR corrections before LLM processing (e.g., "Trans thoracic echocardiogram" → "TTE")
- **LLM Instruction**: System prompt explicitly prevents abbreviation expansion to preserve normalized input

**Processing Pipeline**:
1. **Pre-normalization** (ASRCorrectionEngine): Converts investigation types to abbreviations, fixes common ASR errors
2. **LLM Generation**: Receives normalized input with explicit instructions to preserve abbreviations
3. **Post-processing** (enforceAbbreviations): Final safety net to fix measurement spacing and enforce critical abbreviations

**Training Data**: Golden standard examples in `eval/devset/investigation-summary/` including ex002_tte_format.json for precise formatting guidance
