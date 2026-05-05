# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm build          # tsup → dist/index.js (ESM)
pnpm dev            # watch + auto-run
pnpm test           # vitest run
pnpm test:watch     # vitest watch
pnpm lint           # eslint src/ tests/
pnpm lint:fix       # eslint --fix
pnpm format         # prettier --write
pnpm release        # np (publish)
pnpm build && node dist/index.js -s <path>  # manual test
```

Single test file: `pnpm vitest run tests/helpers.test.ts`

## Architecture

- `cli.ts:main()` — commander setup, dispatches by input type (dir/zip/file)
- `processors.ts` — `processDirectory` / `processZip` / `processSingleFile`; directory batches 5 images concurrently
- `optimizer.ts:optimizeBuffer()` — sharp pipeline; returns original buffer if output is larger or on error
- `helpers.ts` — `isSupportedImage`, `determineOutputPath`, `logOutputPath`
- `index.ts` — re-exports for library use; guards CLI with `import.meta.url` check

## Conventions

- ESM only (`"type": "module"`); imports use `.js` extensions
- No classes — pure functions
- `config` params typed as `any` — follow existing pattern
- SVG files always passed through unchanged (sharp corrupts them)
- `optimizeBuffer` silently swallows errors — don't rethrow without checking callers
- Version read at runtime via `createRequire` from `package.json` — not hardcoded

## Code Style

- 2-space indent, double quotes, no semicolons (Prettier enforced)
- `camelCase` functions/vars, `UPPER_SNAKE_CASE` constants
- `async/await` only — no `.then()` chains
- `catch (error: any)` pattern throughout
