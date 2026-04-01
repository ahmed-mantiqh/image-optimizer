# AGENTS.md

## Project Overview

TypeScript CLI tool for image optimization (files, folders, zip archives).
Single source file: `src/index.ts`. Built with `tsup`, uses `pnpm`.

## Commands

```bash
pnpm build          # tsup build → dist/index.js (ESM)
pnpm dev            # watch mode, auto-runs on change
pnpm start          # run built output
pnpm build && pnpm start -- -s <path>  # build + run against a path
```

No test framework, linter, or formatter configured. No `pnpm test` or `pnpm lint`.

## Testing

No automated tests exist. To verify changes, build and run manually:

```bash
pnpm build && node dist/index.js -s ./test-images
```

## Project Structure

```
src/index.ts        # entire application (~314 lines)
dist/index.js       # built output (ESM bundle)
test-images/        # manual test assets
```

## Code Style

### Formatting
- 2-space indentation
- Double quotes for strings
- No trailing semicolons (inconsistent in codebase, but prefer omitting)

### Imports
- ESM `import` syntax only (`"type": "module"` in package.json)
- Node built-ins first (`fs/promises`, `path`), then npm packages
- No `import *` — use named/default imports

```ts
import { Command } from "commander";
import fs from "fs/promises";
import path from "path";
```

### Naming
- `camelCase` for functions and variables (`processDirectory`, `optimizeBuffer`)
- `UPPER_SNAKE_CASE` for constants (`SUPPORTED_EXTENSIONS`)
- No classes — use pure functions

### Types
- TypeScript strict mode enabled (`tsconfig.json: strict: true`)
- `config` parameter is loosely typed as `any` throughout — follow this pattern for now
- Declare explicit return types on key functions (`Promise<Buffer>`, `void`)
- Use `catch (error: any)` pattern for error handling

### Error Handling
- `try/catch` blocks around processing logic
- Silent fallback: return original data on optimization failure (see `optimizeBuffer`)
- `process.exit(1)` for fatal errors (missing source, unsupported type)
- Use `spinner.fail()` for user-facing error messages via `ora`

### Async
- `async/await` everywhere — no callbacks, no `.then()` chains

### Comments
- Section headers: `// --- Section Name ---` (e.g. `// --- Processors ---`)
- Inline `//` comments for clarification
- No JSDoc

### Architecture Pattern
- `main()` — entry point, CLI setup via `commander`, dispatches to processors
- `processDirectory()` / `processZip()` / `processSingleFile()` — mode-specific handlers
- `optimizeBuffer()` — core sharp-based optimization, returns original on failure
- `isSupportedImage()` / `determineOutputPath()` — helpers

## Dependencies

- **sharp** — image processing (resize, compress, format conversion)
- **commander** — CLI argument parsing
- **chalk** — terminal colors
- **ora** — spinner/progress
- **jszip** — zip file handling

## Key Config

- **tsconfig**: ES2022 target, NodeNext module resolution, strict mode
- **package manager**: pnpm 10.12.3
- **module type**: ESM (`"type": "module"`)
- **Node version**: ES2022 compatible (Node 18+)

## Gotchas

- SVG files are returned as-is (sharp corrupts SVGs)
- If optimized output is larger than input, original is returned
- Directory output appends `-1` if source === destination (loop prevention)
- `optimizeBuffer` silently catches all errors — don't add throw/rethrow without checking callers
