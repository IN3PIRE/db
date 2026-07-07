# @in3pire/db

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

**Database branch CLI — Git-like branching for Neon Postgres.**

Create, diff, merge, and manage database branches from your terminal. Designed for modern development workflows where every PR, feature, or experiment gets its own isolated database.

```bash
# Authenticate
db auth login

# List branches
db branch list

# Create a branch from main
db branch create feat/awesome-feature

# Diff two branches
db branch diff feat/awesome-feature main

# Clean up when done
db branch delete feat/awesome-feature
```

## Features

- **🔀 Git-like branching** — `db branch create`, `db branch list`, `db branch delete`
- **📊 Schema diff** — See what changed between branches before merging
- **🔗 CI/CD integration** — Spin up ephemeral branches for PR preview environments
- **⚡ Auto-connect** — Print connection strings for any branch
- **🧹 Cleanup** — Auto-delete stale branches

## Installation

> **⚠️ Note:** `@in3pire/db` is published exclusively on **GitHub Packages**. The public npm registry (`npmjs.com`) is **not used**, so `npm install @in3pire/db` or `npx @in3pire/db` will **not work** without configuring GitHub Packages first.

### Prerequisites

- A GitHub [Personal Access Token](https://github.com/settings/tokens) with `read:packages` scope
- Your `~/.npmrc` must be configured to resolve the `@in3pire` scope to GitHub Packages

### Setup

```bash
# Configure npm to use GitHub Packages for the @in3pire scope
echo "@in3pire:registry=https://npm.pkg.github.com" >> ~/.npmrc
echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN" >> ~/.npmrc
```

### Install globally

```bash
npm install -g @in3pire/db
```

### Run directly (from release tarball, no install needed)

```bash
npx https://github.com/IN3PIRE/db/releases/download/v0.1.1/in3pire-db-0.1.1.tgz --help
```

## Quick Start

```bash
# Set up your Neon API key
db auth login

# See all branches
db branch list

# Create a branch for your feature
db branch create my-feature --from main

# Get the connection string
db connect my-feature
```

## Usage

### Authentication

```bash
# Login with your Neon API key
db auth login

# Check current auth status
db auth status

# Log out
db auth logout
```

### Branch Management

```bash
# List all branches
db branch list

# Create a branch
db branch create <name>
db branch create <name> --from <parent-branch>    # default: main
db branch create <name> --latest                   # use latest snapshot

# Delete a branch
db branch delete <name>

# Rename a branch
db branch rename <old-name> <new-name>
```

### Diff & Inspect

```bash
# Show schema diff between branches
db branch diff <branch-a> <branch-b>

# Show branch details (size, LSN, created)
db branch inspect <name>

# List all tables in a branch
db branch tables <name>
```

### Connect

```bash
# Get connection string for a branch
db connect <branch-name>
db connect <branch-name> --pooled    # use pooled connection
```

### CI / Preview Environments

```bash
# Create an ephemeral branch for a PR (auto-delete after merge)
db ci preview <pr-number>

# Clean up stale preview branches
db ci cleanup --days 7

# Set up a GitHub Action workflow
db ci setup
```

## CI/CD Integration

`db` comes with built-in CI support. Run `db ci setup` to generate a GitHub Actions workflow:

```yaml
name: Database Preview
on: [pull_request]
jobs:
  preview:
    steps:
      - uses: actions/checkout@v4
      - run: npx @in3pire/db ci preview ${{ github.event.number }}
```

The preview branch is automatically cleaned up when the PR is merged or closed.

## Configuration

`db` stores config in `~/.config/in3pire-db/config.json`:

| Key | Description | Default |
|---|---|---|
| `NEON_API_KEY` | Neon API key | — |
| `NEON_PROJECT_ID` | Default project ID | — |
| `default_branch` | Default parent branch | `main` |

Set via env vars (`.env` supported) or `db auth login`.

## License

MIT — see [LICENSE](LICENSE)
