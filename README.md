<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/db-Neon%20Branch%20CLI-6C47FF?style=for-the-badge&logo=postgresql&logoColor=white&labelColor=1a1a2e">
    <img alt="db — Neon Postgres Branching CLI" src="https://img.shields.io/badge/db-Neon%20Branch%20CLI-6C47FF?style=for-the-badge&logo=postgresql&logoColor=white&labelColor=f0f0ff">
  </picture>
</p>

<p align="center">
  <b>Git-like branching for Neon Postgres.</b><br>
  Every PR, every experiment, every feature — its own isolated database in seconds.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#why">Why</a> •
  <a href="#features">Features</a> •
  <a href="#cli-reference">CLI Reference</a> •
  <a href="#installation">Install</a> •
  <a href="#ci-cd">CI/CD</a> •
  <a href="CHANGELOG.md">Changelog</a>
</p>

<br>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-6C47FF?style=flat-square" alt="MIT"></a>
  <a href="https://github.com/IN3PIRE/db/releases"><img src="https://img.shields.io/github/v/release/IN3PIRE/db?style=flat-square&color=6C47FF&label=release" alt="Release"></a>
  <a href="https://github.com/IN3PIRE/db/stargazers"><img src="https://img.shields.io/github/stars/IN3PIRE/db?style=flat-square&color=6C47FF" alt="Stars"></a>
  <a href="#"><img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square" alt="TypeScript"></a>
  <a href="#"><img src="https://img.shields.io/badge/Node-18%2B-339933?style=flat-square&logo=nodedotjs" alt="Node"></a>
  <a href="https://console.neon.tech"><img src="https://img.shields.io/badge/powered_by-Neon-00E599?style=flat-square" alt="Neon"></a>
</p>

<br>

```bash
# One command → one isolated Postgres database
db branch create feat/payment-redesign
db connect feat/payment-redesign
# → postgresql://user@ep-cool-123.us-east-2.aws.neon.tech/neondb

# Diff before you merge
db branch diff feat/payment-redesign main
# → + users (new table)
# → ~ orders + payment_method (new column)

# Merge when ready. Delete when done.
db branch merge feat/payment-redesign main
db branch delete feat/payment-redesign
```

<br>

<p align="center">
  <b>Stop sharing databases. Stop waiting for infra. Start shipping.</b><br>
  <a href="https://github.com/IN3PIRE/db/stargazers">⭐ Star this repo</a> if you believe in branching for databases the way Git revolutionized code.
</p>

---

## Quick Start

```bash
# 1. Authenticate with Neon
db auth login

# 2. See your branches
db branch list

# 3. Create a branch for your feature
db branch create feat/awesome

# 4. Connect any tool (psql, Prisma, Drizzle…)
db connect feat/awesome

# 5. Diff before merging
db branch diff feat/awesome main

# 6. Merge schema changes
db branch merge feat/awesome main

# 7. Clean up
db branch delete feat/awesome
```

---

## Why

| Problem | How `db` fixes it |
|---|---|
| Sharing a single dev DB | Every dev gets their own branch. No stepping on each other. |
| Schema changes without CI | Diff branches locally before merging. Catch issues early. |
| Ephemeral test environments | Spin up a branch per PR. Auto-delete on merge. |
| "Works on my machine" | Production-like data in every branch. Same schema, same seed data. |
| Manual restore points | `db restore main pre-migration` — instant snapshot before risky operations. |

---

## Features

### Branch Management
Create, list, rename, delete, search, and inspect branches — just like Git.

### Safety & Organization
Protect critical branches, tag them for organization, set auto-expiration, and control defaults.

### Schema Operations
Full schema inspection, table listing, and `git diff`-style schema diffs between any two branches. Merge schema changes with `--dry-run` preview.

### Data Operations
Run ad-hoc queries, export schemas and data to SQL, and seed branches from files.

### Git & CI Integration
Mirror Git branches to Neon, auto-provision ephemeral databases per PR, and clean up stale preview branches. Generate a GitHub Actions workflow with one command.

### Diagnostics & Management
Validate configuration, manage compute endpoints, handle database roles, multi-project support, bulk prune, restore points, and an operation audit log.

---

## CLI Reference

### Auth
```
db auth login [api-key]         Authenticate with Neon API key
db auth status                  Show authentication status
db auth logout                  Remove stored credentials
db auth set-project <id>        Set default Neon project ID
```

### Branch Management
```
db branch list                  List all branches (--json, --tags)
db branch create <name>         Create a branch (--from, --latest)
db branch delete <name>         Delete a branch (--force)
db branch rename <old> <new>    Rename a branch
db branch inspect <name>        Show branch details (--json)
db branch search <pattern>      Find branches by name (--json)
db branch protect <name>        Lock branches from deletion/rename
db branch unprotect <name>      Remove branch protection
db branch tag <name> <label>    Label branches for organization
db branch untag <name>          Remove a branch tag
db branch set-default <name>    Set project default branch
db branch set-expiration <name> <t>  Auto-delete after TTL
```

### Schema
```
db branch diff <a> [b]          Schema diff between branches
db branch schema <name>         Full schema view (--json, --schema)
db branch tables <name>         List tables (--schema)
db branch merge <a> <b>         Merge schema changes (--dry-run)
```

### Data
```
db query <branch> <sql>         Run SQL (--json, --limit)
db export <branch> -o file.sql  Export schema/data to SQL
db seed <branch> <file>         Seed from SQL file
```

### Endpoints
```
db endpoint list                List endpoints (--json)
db endpoint create <branch-id>  Create a compute endpoint (--read-only)
db endpoint delete <id>         Delete an endpoint (--force)
db endpoint inspect <id>        Show endpoint details
```

### Git & CI
```
db git sync                     Mirror Git branches -> Neon branches
db git status                   Show Git <-> Neon mapping
db ci preview <pr>              Ephemeral PR preview branch
db ci cleanup                   Clean stale preview branches
db ci setup                     Generate GitHub Actions workflow
```

### Diagnostics & Utilities
```
db doctor                       Validate config, API, connectivity
db role list <branch>           List database roles
db project list                 List projects
db project switch <id>          Switch active project
db prune                        Bulk delete stale branches
db restore <branch> [name]      Create restore points
db reset <branch> --to <target> Reset branch to match another
db shell [branch]               Open psql for a branch
db log show                     View operation history (--json, -n)
db log clear                    Clear operation history
db watch                        Real-time branch monitor
db completion bash/zsh          Generate shell completions
db config list                  Show configuration (--json)
db config get <key>             Get a specific config value
db config set <key> <value>     Set a config value
```

---

## Installation

<details>
<summary><b>Prerequisite: GitHub Packages authentication</b></summary>

`@in3pire/db` is distributed via GitHub Packages. You need a GitHub [Personal Access Token](https://github.com/settings/tokens) with `read:packages` scope.

```bash
echo "@in3pire:registry=https://npm.pkg.github.com" >> ~/.npmrc
echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN" >> ~/.npmrc
```
</details>

```bash
npm install -g @in3pire/db

# Or run directly without installing:
npx @in3pire/db --help
```

---

## Configuration

`db` resolves settings in this order: **CLI flag > env var > config file**.

| Key | Env var | Default | Description |
|---|---|---|---|
| `NEON_API_KEY` | `NEON_API_KEY` | -- | Your Neon API key |
| `NEON_PROJECT_ID` | `NEON_PROJECT_ID` | -- | Default project ID |
| `default_branch` | -- | `main` | Default parent branch |

Set via `db auth login`, environment variables, or a `.env` file:

```env
NEON_API_KEY=your-neon-api-key
NEON_PROJECT_ID=your-project-id
```

---

## CI/CD

### Database per Pull Request

Spin up an isolated Postgres database for every pull request -- automatically.

```bash
db ci setup > .github/workflows/db-preview.yml
```

This generates a workflow that:
1. Creates a branch for each PR
2. Seeds it with your schema
3. Provides the connection string as a PR comment
4. Cleans up when the PR is merged

Add `NEON_API_KEY` and `NEON_PROJECT_ID` to your repo secrets, and you're done.

### Cleanup

Keep your Neon project tidy by removing stale preview branches:

```bash
# Delete pr-* branches older than 14 days
db ci cleanup --days 14

# Preview what would be deleted
db ci cleanup --dry-run
```

---

## Development

```bash
git clone https://github.com/IN3PIRE/db.git
cd db
npm install
npm run dev          # Run in dev mode
npm test             # Run tests (Vitest)
npm run build        # Compile to dist/
```

Branch naming rules: start with alphanumeric, use `a-z`, `A-Z`, `0-9`, `_`, `.`, `-`.

---

## Why Star This Repo

**Because database branching should be as natural as Git branching.**

If this tool saves you one debugging session, one corrupted dev database, or one "works on my machine" moment -- it was worth the star.

Your star tells other developers:
- This project is actively maintained
- It solves real problems
- It's worth their time to try

**One click. Huge impact.** ⭐

<a href="https://github.com/IN3PIRE/db/stargazers">
  <img src="https://img.shields.io/github/stars/IN3PIRE/db?style=for-the-badge&color=6C47FF" alt="Star this repo">
</a>

---

<p align="center">
  <a href="https://github.com/IN3PIRE/db/stargazers">⭐ Star on GitHub</a> |
  <a href="https://github.com/IN3PIRE/db/issues/new">🐛 Report a bug</a> |
  <a href="https://github.com/IN3PIRE/db/discussions">💬 Join the discussion</a>
</p>

<p align="center"><sub>MIT License · Built with TypeScript · Powered by <a href="https://neon.tech">Neon</a></sub></p>
