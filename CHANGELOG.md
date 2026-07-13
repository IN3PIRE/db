# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.3] - 2026-07-13
### Added
- Added v0.1.2 changelog entry to CHANGELOG.md

## [0.1.2] - 2026-07-12
### Added
- Added CHANGELOG.md to track project releases and version history
- Added CONTRIBUTING.md with development setup and PR guidelines
- NPM cache, shared client helpers, branch validation, and unit tests

### Changed
- Clarified installation docs for GitHub Packages-only distribution (no public npm registry)

### Fixed
- Resolved branch validation edge cases with improved error handling

## [0.1.1] - 2026-07-07
### Fixed
- Corrected the `bin` path and `publishConfig` for GitHub Packages so the CLI installs and resolves correctly

### Changed
- Removed a build artifact that had been committed to the repo
- Added `.gitignore` to prevent build artifacts from being committed going forward

## [0.1.0] - 2026-07-07
### Added
- Initial release of `@in3pire/db`, distributed via GitHub Packages (not published to the public npm registry)
- Git-like database branching CLI:
  - `db branch list` — list all branches
  - `db branch create <name> [--from <parent>] [--latest]` — create a branch
  - `db branch delete <name>` — delete a branch
  - `db branch rename <old-name> <new-name>` — rename a branch
  - `db branch diff <branch-a> <branch-b>` — schema diff between branches
  - `db branch inspect <name>` — show branch details (size, LSN, created)
  - `db branch tables <name>` — list all tables in a branch
- `db connect <branch-name> [--pooled]` — print a connection string for a branch
- CI/CD integration for ephemeral PR preview branches:
  - `db ci preview <pr-number>` — create a preview branch for a PR
  - `db ci cleanup --days <n>` — remove stale preview branches
  - `db ci setup` — generate a GitHub Actions workflow for preview branches
- Authentication management:
  - `db auth login` — authenticate with a Neon API key
  - `db auth logout` — clear stored credentials
  - `db auth status` — show current auth status
- Persistent configuration via `conf`, stored at `~/.config/in3pire-db/config.json` and validated with Zod (`NEON_API_KEY`, `NEON_PROJECT_ID`, `default_branch`), with `.env` support via `dotenv`

[Unreleased]: https://github.com/IN3PIRE/db/compare/v0.1.3...main
[0.1.3]: https://github.com/IN3PIRE/db/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/IN3PIRE/db/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/IN3PIRE/db/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/IN3PIRE/db/releases/tag/v0.1.0
