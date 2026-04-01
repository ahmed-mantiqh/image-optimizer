# AGENTS.md

## Project Overview

TypeScript CLI tool for image optimization (files, folders, zip archives).
Modular source in `src/`. Built with `tsup`, uses `pnpm`.

## Commands

```bash
pnpm build          # tsup build → dist/index.js (ESM)
pnpm dev            # watch mode, auto-runs on change
pnpm start          # run built output
pnpm test           # vitest run
pnpm lint           # eslint src/ tests/
pnpm format         # prettier --write src/ tests/
pnpm release        # np (publish + version bump)
pnpm build && pnpm start -- -s <path>  # build + run against a path
```

## Testing

Vitest with real PNG/JPG/WebP fixtures in `tests/fixtures/`.

```bash
pnpm test                    # run all tests
pnpm test:watch              # watch mode
pnpm build && node dist/index.js -s ./test-images  # manual test
```

## Project Structure

```
src/
  index.ts           # entry point, re-exports
  cli.ts             # CLI setup (commander), main()
  constants.ts       # SUPPORTED_EXTENSIONS
  helpers.ts         # isSupportedImage, determineOutputPath, logOutputPath
  optimizer.ts       # optimizeBuffer (sharp pipeline)
  processors.ts      # processDirectory, processZip, processSingleFile
dist/index.js        # built output (ESM bundle)
tests/
  fixtures/          # tiny PNG/JPG/WebP test images
  helpers.test.ts    # helper function tests
  optimize.test.ts   # optimizeBuffer tests
```

## Code Style

### Formatting
- 2-space indentation
- Double quotes for strings
- No trailing semicolons
- Enforced by Prettier + ESLint

### Imports
- ESM `import` syntax only (`"type": "module"` in package.json)
- Node built-ins first (`fs/promises`, `path`), then npm packages
- No `import *` — use named/default imports

```ts
import { Command } from "commander"
import fs from "fs/promises"
import path from "path"
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
- `cli.ts:main()` — entry point, CLI setup via `commander`, dispatches to processors
- `processors.ts` — `processDirectory()` / `processZip()` / `processSingleFile()` — mode-specific handlers
- `optimizer.ts` — `optimizeBuffer()` — core sharp-based optimization, returns original on failure
- `helpers.ts` — `isSupportedImage()` / `determineOutputPath()` / `logOutputPath()`
- `constants.ts` — `SUPPORTED_EXTENSIONS` set
- `index.ts` — re-exports for library use, runs CLI when executed directly

## Dependencies

- **sharp** — image processing (resize, compress, format conversion)
- **commander** — CLI argument parsing
- **chalk** — terminal colors
- **ora** — spinner/progress
- **jszip** — zip file handling

### Dev Dependencies
- **vitest** — test runner
- **eslint** + **typescript-eslint** — linting
- **prettier** — formatting
- **np** — release management
- **tsup** — bundling

## Key Config

- **tsconfig**: ES2022 target, NodeNext module resolution, strict mode
- **package manager**: pnpm 10.12.3
- **module type**: ESM (`"type": "module"`)
- **Node version**: ES2022 compatible (Node 18+, see `.nvmrc`)

## Gotchas

- SVG files are returned as-is (sharp corrupts SVGs)
- If optimized output is larger than input, original is returned
- Directory output appends `-1` if source === destination (loop prevention)
- `optimizeBuffer` silently catches all errors — don't add throw/rethrow without checking callers
- Version is read from `package.json` at runtime via `createRequire` — no hardcoded versions
- CLI only runs when executed directly (guarded by `import.meta.url` check in `index.ts`)
