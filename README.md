# @in3pire/db

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

**Database branch CLI — Git-like branching for Neon Postgres.**

[Changelog](CHANGELOG.md)

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
- **🎯 Branch validation** — Branch names validated on creation (alphanumeric start, safe characters only)
- **📋 JSON output** — `--json` flag on `db branch list` for programmatic consumption

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
npx https://github.com/IN3PIRE/db/releases/download/v0.1.2/in3pire-db-0.1.2.tgz --help
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

| Command | Description |
|---|---|
| `db auth login` | Store your Neon API key (prompts interactively or reads stdin) |
| `db auth status` | Show whether an API key is configured |
| `db auth logout` | Remove stored credentials |

```bash
# Login with your Neon API key
db auth login

# Check current auth status
db auth status

# Log out
db auth logout
```

### Branch Management

| Command | Description | Options |
|---|---|---|
| `db branch list` | List all branches in a project | `-p, --project <id>` — Project ID (overrides config) |
| | | `--json` — Output as JSON (no spinner, full field names) |
| `db branch create <name>` | Create a new branch | `--from <branch>` — Parent branch (default: `main`) |
| | | `--latest` — Create from the latest snapshot |
| | | `-p, --project <id>` — Project ID |
| `db branch rename <old> <new>` | Rename a branch | `-p, --project <id>` — Project ID |
| `db branch delete <name>` | Delete a branch (with confirmation prompt) | `-y, --yes` — Skip confirmation |
| | | `-p, --project <id>` — Project ID |
| `db branch inspect <name>` | Show detailed branch info (size, LSN, timestamps) | `-p, --project <id>` — Project ID |
| `db branch diff <a> <b>` | Show schema diff between two branches | `-p, --project <id>` — Project ID |

```bash
# List all branches
db branch list

# List all branches as JSON
db branch list --json

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
```

### Connect

| Command | Description | Options |
|---|---|---|
| `db connect <branch>` | Get a PostgreSQL connection string for the branch | `--pooled` — Use pooled connection string |
| | | `--role <name>` — Database role (default: the branch's primary role) |
| | | `-p, --project <id>` — Project ID |

```bash
# Get connection string for a branch
db connect <branch-name>
db connect <branch-name> --pooled    # use pooled connection
```

### CI / Preview Environments

| Command | Description | Options |
|---|---|---|
| `db ci preview <pr-number>` | Create an ephemeral branch for a PR | `-p, --project <id>` — Project ID |
| `db ci cleanup` | Remove stale preview branches | `--days <n>` — Max age in days (default: 7) |
| | | `-p, --project <id>` — Project ID |
| `db ci setup` | Generate a GitHub Actions workflow file | See output for generated YAML |

```bash
# Create an ephemeral branch for a PR (auto-delete after merge)
db ci preview <pr-number>

# Clean up stale preview branches
db ci cleanup --days 7

# Set up a GitHub Action workflow
db ci setup
```

### Branch Name Rules

Branch names must:
- Start with an alphanumeric character (`a-z`, `A-Z`, `0-9`)
- Contain only alphanumeric characters, underscores (`_`), dots (`.`), and hyphens (`-`)
- Be at least 1 character long

Invalid names: `-starts-with-hyphen`, `.starts-with-dot`, `with spaces`, `with/slashes`

## CI/CD Integration

`db` comes with built-in CI support. Run `db ci setup` to generate a GitHub Actions workflow:

```yaml
name: Database Preview
on: [pull_request]
jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx @in3pire/db ci preview ${{ github.event.number }}
        env:
          NEON_API_KEY: ${{ secrets.NEON_API_KEY }}
          NEON_PROJECT_ID: ${{ secrets.NEON_PROJECT_ID }}
```

The preview branch is automatically cleaned up when the PR is merged or closed.

### GitHub Actions Workflow for PR Previews

Add the following secret to your GitHub repository:

| Secret | Value |
|---|---|
| `NEON_API_KEY` | Your Neon API key |
| `NEON_PROJECT_ID` | (Optional) Your Neon project ID |

### Cleanup Cron

To automatically clean up stale preview branches, add a scheduled workflow:

```yaml
name: Cleanup Preview Branches
on:
  schedule:
    - cron: "0 6 * * 1"  # Every Monday at 6 AM

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx @in3pire/db ci cleanup --days 14
        env:
          NEON_API_KEY: ${{ secrets.NEON_API_KEY }}
          NEON_PROJECT_ID: ${{ secrets.NEON_PROJECT_ID }}
```

## Configuration

`db` stores config in `~/.config/in3pire-db/config.json`:

| Key | Description | Default | Env var |
|---|---|---|---|
| `NEON_API_KEY` | Neon API key | — | `NEON_API_KEY` |
| `NEON_PROJECT_ID` | Default project ID | — | `NEON_PROJECT_ID` |
| `default_branch` | Default parent branch | `main` | — |

**Resolution order** (for API key and project ID):
1. Command-line option (e.g. `--project <id>`)
2. Environment variable (`NEON_API_KEY`, `NEON_PROJECT_ID`)
3. Stored config file (`~/.config/in3pire-db/config.json`)

Set via `db auth login`, or by creating a `.env` file in your working directory:

```env
NEON_API_KEY=your-neon-api-key
NEON_PROJECT_ID=your-project-id
```

## Troubleshooting

### "401 Unauthorized" when installing/running

**Cause:** GitHub Packages authentication is not configured.

**Solution:**
1. Create a GitHub PAT with `read:packages` scope
2. Add it to `~/.npmrc`:
   ```bash
   echo "@in3pire:registry=https://npm.pkg.github.com" >> ~/.npmrc
   echo "//npm.pkg.github.com/:_authToken=YOUR_PAT" >> ~/.npmrc
   ```
3. Verify with `npm ping`

### "API key not configured" or authentication errors

**Cause:** No Neon API key has been set.

**Solution:**
```bash
# Via CLI (interactive)
db auth login

# Via env var
export NEON_API_KEY="your-neon-api-key"
# Or create a .env file in your project root
```

Get your API key from the [Neon Console](https://console.neon.tech/docs/keys).

### "Project not found" or 404 errors

**Cause:** The project ID is wrong or missing.

**Solution:**
```bash
# Pass it explicitly
db branch list --project <your-project-id>

# Or set a default
export NEON_PROJECT_ID="your-project-id"
db auth login   # stores it permanently
```

### "Branch not found" when using diff, inspect, connect

**Cause:** The branch name doesn't exist in the project, or there are multiple branches with similar names and the wrong one was matched.

**Solution:**
- List branches first: `db branch list`
- Use the full branch name, not a prefix
- Verify the branch exists in the listed output

### "Branch name contains invalid characters"

**Cause:** Branch names must start with an alphanumeric character and contain only letters, numbers, underscores, hyphens, and dots.

**Solution:** Rename the branch using valid characters:
```bash
db branch rename "bad/name" "good-name"
```

### `db ci setup` did nothing

**Cause:** The command outputs the workflow to stdout — it doesn't write files automatically.

**Solution:** Redirect the output:
```bash
db ci setup > .github/workflows/db-preview.yml
```

### Connection string does not connect

**Cause:** The branch may not have an active endpoint, or the IP isn't allow-listed.

**Solution:**
1. Verify the endpoint exists: `db branch inspect <name>`
2. Check Neon Console for IP allow-list settings
3. Ensure your compute is not suspended (cold start can take a few seconds)

### Tests are failing

**Cause:** Missing dependencies or incorrect Node.js version.

**Solution:**
```bash
# Minimum Node.js version
node --version   # should be >= 18

# Reinstall dependencies
npm ci

# Run tests
npm test
```

### "No branches found" on a new project

**Cause:** A freshly created Neon project has no branches yet (beyond the initial `main`).

**Solution:** Create your first branch:
```bash
db branch create staging
db branch list
```

## Development

### Prerequisites
- Node.js 18+
- npm

### Setup
```bash
git clone https://github.com/IN3PIRE/db.git
cd db
npm install
```

### Scripts
| Command | Description |
|---|---|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run dev` | Run the CLI in development mode (tsx watch) |
| `npm test` | Run all unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |

### Branch Name Validation

Branch names are validated with the pattern `/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/`. This ensures compatibility with Neon's API, file systems, and URL path segments.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed version history.

## License

MIT — see [LICENSE](LICENSE)
