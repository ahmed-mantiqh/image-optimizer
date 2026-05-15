# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.5] - 2026-05-12

### Added

- Enforced 100% test coverage and added a Husky pre-push hook

### Changed

- Upgraded the test stack to Vitest v4
- Updated CI to test on Node.js 20 only

### Fixed

- Improved input validation, SVG handling, TypeScript typing, and zip processing parallelism
- Applied formatting fixes in `optimize.test.ts`

## [1.2.4] - 2026-05-05

### Fixed

- Fixed CLI execution when invoked through an `npx` symlink

## [1.2.3] - 2026-05-05

### Added

- Added an auto-publish workflow when version changes land on `main`

### Changed

- Dropped Node.js 18 support (runtime is now Node.js 20+)

### Fixed

- Cleaned up CI pnpm configuration and relied on the `packageManager` field
- Improved input validation, zip extension case handling, and GIF quality behavior

## [1.2.2] - 2026-04-01

### Added

- Introduced ESLint, Prettier, and Vitest to the project

### Changed

- Modularized the source layout
- Replaced the deploy script workflow with `np` releases

## [1.2.1] - 2024-01-01

### Fixed

- Deploy script improvements

## [1.2.0] - 2024-01-01

### Added

- Parallel processing for directory optimization (batches of 5)
- Progress tracking with spinner status updates
- Deploy script for automated releases

### Improved

- Error handling in file optimization

## [1.1.1] - 2024-01-01

### Fixed

- Minor bug fixes

## [1.1.0] - 2024-01-01

### Added

- Folder processing support
- Single file processing support

## [1.0.1] - 2024-01-01

### Fixed

- Initial bug fixes

## [1.0.0] - 2024-01-01

### Added

- Initial release
- Zip file optimization
- Support for JPG, PNG, WebP, GIF, AVIF, TIFF, SVG
- Quality and width configuration options
