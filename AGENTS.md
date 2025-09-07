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

