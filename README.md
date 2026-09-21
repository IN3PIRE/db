<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/db-Neon%20Branch%20CLI-6C47FF?style=for-the-badge&logo=postgresql&logoColor=white&labelColor=1a1a2e">
    <img alt="db — Neon Postgres Branching CLI" src="https://img.shields.io/badge/db-Neon%20Branch%20CLI-6C47FF?style=for-the-badge&logo=postgresql&logoColor=white&labelColor=f0f0ff">
  </picture>
</p>

<h1 align="center">db — Database Branching CLI</h1>

<p align="center">
  <b>Git-like branching for Neon Postgres.</b><br>
  Every PR, every experiment, every feature — its own isolated database in seconds.
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-why-db">Why</a> •
  <a href="#-features">Features</a> •
  <a href="#-cli-reference">CLI Reference</a> •
  <a href="#-installation">Install</a> •
  <a href="#-cicd-integration">CI/CD</a> •
  <a href="CHANGELOG.md">Changelog</a> •
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

<br>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-6C47FF?style=flat-square" alt="MIT"></a>
  <a href="https://github.com/IN3PIRE/db/releases"><img src="https://img.shields.io/github/v/release/IN3PIRE/db?style=flat-square&color=6C47FF&label=release" alt="Release"></a>
  <a href="https://github.com/IN3PIRE/db/stargazers"><img src="https://img.shields.io/github/stars/IN3PIRE/db?style=flat-square&color=6C47FF" alt="Stars"></a>
  <a href="#"><img src="https://img.shields.io/badge/TypeScript-7.0-3178C6?style=flat-square&logo=typescript" alt="TypeScript"></a>
  <a href="#"><img src="https://img.shields.io/badge/Node-22%2B-339933?style=flat-square&logo=nodedotjs" alt="Node"></a>
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

## 🚀 Quick Start

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

> **💡 Pro Tip**: Use `db git sync` to automatically mirror your Git branches to Neon branches!

---

## 💎 Why db?

| Problem | How `db` fixes it |
|---|---|
| **Shared dev database chaos** | Every developer gets their own branch. No stepping on each other. |
| **Schema changes without CI** | Diff branches locally before merging. Catch breaking changes early. |
| **Missing test environments** | Spin up a branch per PR. Auto-delete on merge. Zero config. |
| **"Works on my machine"** | Production-like data in every branch. Same schema, same seed data. |
| **Manual restore points** | `db restore main pre-migration` — instant snapshot before risky operations. |
| **Expensive staging databases** | Neon branches are copy-on-write. Share data across branches efficiently. |

### The Git Model, for Databases

```
main ──┬──> feat/user-auth ──┬──> fix/email-validation
       │                      └──> exp/oauth-flow
       ├──> feat/payments
       └──> staging
```

Each branch is a full Postgres database. Create, merge, delete — just like Git.

---

## ✨ Features

### 🌲 Branch Management
Create, list, rename, delete, search, and inspect branches — just like Git. Tag branches for organization, protect critical ones from accidental deletion, and set auto-expiration policies.

**Commands**: `create`, `list`, `delete`, `rename`, `inspect`, `search`, `protect`, `tag`, `set-default`, `set-expiration`

### 🔍 Schema Operations
Full schema inspection with `git diff`-style comparisons between any two branches. Preview schema changes with `--dry-run` before merging. Export schemas to SQL or migrate them between branches.

**Commands**: `diff`, `schema`, `tables`, `merge`, `export`

### 💾 Data Operations
Run ad-hoc SQL queries, export data to SQL files, and seed branches from migration files. Perfect for setting up reproducible test data or migrating production snapshots.

**Commands**: `query`, `export`, `seed`, `shell`

### 🔄 Git & CI Integration
Automatically mirror Git branches to Neon, provision ephemeral databases per PR, and clean up stale preview branches. Generate a complete GitHub Actions workflow with one command.

**Commands**: `git sync`, `git status`, `ci preview`, `ci cleanup`, `ci setup`

### 🛠️ Advanced Management
Manage compute endpoints, handle database roles, multi-project support, bulk prune stale branches, create restore points, and audit operation history.

**Commands**: `endpoint`, `role`, `project`, `prune`, `restore`, `reset`, `watch`, `doctor`

---

## 📚 CLI Reference

### Auth & Configuration
```bash
db auth login [api-key]         # Authenticate with Neon API key
db auth status                  # Show authentication status
db auth logout                  # Remove stored credentials
db auth set-project <id>        # Set default Neon project ID

db config list                  # Show all configuration (--json)
db config get <key>             # Get a specific config value
db config set <key> <value>     # Set a config value
```

### Branch Management
```bash
db branch list                  # List all branches (--json, --tags)
db branch create <name>         # Create a branch (--from, --latest)
db branch delete <name>         # Delete a branch (--force)
db branch rename <old> <new>    # Rename a branch
db branch inspect <name>        # Show branch details (--json)
db branch search <pattern>      # Find branches by name (--json)

# Organization & Safety
db branch protect <name>        # Lock branches from deletion/rename
db branch unprotect <name>      # Remove branch protection
db branch tag <name> <label>    # Label branches for organization
db branch untag <name>          # Remove a branch tag
db branch set-default <name>    # Set project default branch
db branch set-expiration <name> <ttl>  # Auto-delete after TTL
```

### Schema Operations
```bash
db branch diff <a> [b]          # Schema diff between branches
db branch schema <name>         # Full schema view (--json, --schema)
db branch tables <name>         # List tables (--schema)
db branch merge <a> <b>         # Merge schema changes (--dry-run)
```

### Data Operations
```bash
db query <branch> <sql>         # Run SQL (--json, --limit)
db export <branch> -o file.sql  # Export schema/data to SQL
db seed <branch> <file>         # Seed from SQL file
db shell [branch]               # Open psql for a branch
```

### Compute Endpoints
```bash
db endpoint list                # List endpoints (--json)
db endpoint create <branch-id>  # Create a compute endpoint (--read-only)
db endpoint delete <id>         # Delete an endpoint (--force)
db endpoint inspect <id>        # Show endpoint details
```

### Git & CI Integration
```bash
db git sync                     # Mirror Git branches → Neon branches
db git status                   # Show Git <-> Neon mapping

db ci preview <pr>              # Ephemeral PR preview branch
db ci cleanup                   # Clean stale preview branches
db ci setup                     # Generate GitHub Actions workflow
```

### Diagnostics & Utilities
```bash
db doctor                       # Validate config, API, connectivity
db role list <branch>           # List database roles

db project list                 # List all projects
db project switch <id>          # Switch active project

db prune                        # Bulk delete stale branches
db restore <branch> [name]      # Create restore points
db reset <branch> --to <target> # Reset branch to match another

db watch                        # Real-time branch monitor
db log show                     # View operation history (--json, -n)
db log clear                    # Clear operation history

db completion bash|zsh|fish     # Generate shell completions
```

---

## 📦 Installation

### Prerequisites

**Node.js 22+** is required (due to dependency requirements).

`@in3pire/db` is distributed via GitHub Packages. You need a GitHub [Personal Access Token](https://github.com/settings/tokens) with `read:packages` scope.

```bash
# Configure npm to use GitHub Packages
echo "@in3pire:registry=https://npm.pkg.github.com" >> ~/.npmrc
echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN" >> ~/.npmrc
```

### Install Globally

```bash
npm install -g @in3pire/db

# Verify installation
db --version
```

### Run Without Installing

```bash
npx @in3pire/db branch list
```

---

## ⚙️ Configuration

`db` resolves settings in this order: **CLI flag > env var > config file**.

| Key | Environment Variable | Default | Description |
|---|---|---|---|
| `NEON_API_KEY` | `NEON_API_KEY` | -- | Your Neon API key ([Get one](https://console.neon.tech/app/settings/api-keys)) |
| `NEON_PROJECT_ID` | `NEON_PROJECT_ID` | -- | Default project ID |
| `default_branch` | -- | `main` | Default parent branch |

### Setup via Auth

```bash
db auth login
# Interactive prompt for API key and project ID
```

### Setup via Environment Variables

Create a `.env` file in your project root:

```env
NEON_API_KEY=your-neon-api-key
NEON_PROJECT_ID=your-project-id
```

---

## 🔄 CI/CD Integration

### Database per Pull Request

Spin up an isolated Postgres database for every pull request — automatically.

```bash
db ci setup > .github/workflows/db-preview.yml
```

This generates a workflow that:
1. ✅ Creates a Neon branch for each PR
2. 🌱 Seeds it with your schema
3. 💬 Provides the connection string as a PR comment
4. 🧹 Cleans up when the PR is merged

**Setup Steps:**
1. Add `NEON_API_KEY` and `NEON_PROJECT_ID` to your [repo secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
2. Commit the generated workflow file
3. Open a PR and watch the magic happen! ✨

### Example Workflow Usage

```yaml
- name: Create preview database
  run: |
    BRANCH_NAME=$(echo "${{ github.head_ref }}" | sed 's/\//-/g')
    db branch create "pr-${{ github.event.number }}-$BRANCH_NAME"
    
- name: Get connection string
  id: db
  run: |
    CONNECTION=$(db connect "pr-${{ github.event.number }}-*")
    echo "connection=$CONNECTION" >> $GITHUB_OUTPUT
    
- name: Run migrations
  run: npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ steps.db.outputs.connection }}
```

### Cleanup Stale Branches

Keep your Neon project tidy:

```bash
# Delete pr-* branches older than 14 days
db ci cleanup --days 14

# Preview what would be deleted (safe mode)
db ci cleanup --dry-run
```

---

## 🔌 Integration Examples

### Prisma

```typescript
// schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Use with db CLI
// db connect feat/my-feature | prisma migrate dev
```

### Drizzle

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { execSync } from 'child_process';

const connectionString = execSync('db connect feat/my-feature')
  .toString()
  .trim();

const db = drizzle(connectionString);
```

### Direct psql

```bash
# Connect interactively
db shell feat/my-feature

# Or pipe connection string
psql $(db connect feat/my-feature)
```

---

## 🛠️ Development

```bash
# Clone the repository
git clone https://github.com/IN3PIRE/db.git
cd db

# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Branch Naming Rules

Branch names must:
- Start with an alphanumeric character
- Contain only: `a-z`, `A-Z`, `0-9`, `_`, `.`, `-`
- Be between 1-63 characters

**Examples:**
- ✅ `feat/user-auth`
- ✅ `staging_v2`
- ✅ `exp.oauth-flow`
- ❌ `-invalid` (starts with hyphen)
- ❌ `feat/my@branch` (contains @)

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Ways to Contribute

- 🐛 [Report bugs](https://github.com/IN3PIRE/db/issues/new?template=bug_report.md)
- 💡 [Request features](https://github.com/IN3PIRE/db/issues/new?template=feature_request.md)
- 📖 Improve documentation
- 🔧 Submit pull requests
- ⭐ Star the repo to show support

---

## 🌟 Why Star This Repo?

**Because database branching should be as natural as Git branching.**

If this tool saves you one debugging session, one corrupted dev database, or one "works on my machine" moment — it was worth the star.

Your star tells other developers:
- ✅ This project is actively maintained
- ✅ It solves real problems
- ✅ It's worth their time to try

**One click. Huge impact.** ⭐

<p align="center">
  <a href="https://github.com/IN3PIRE/db/stargazers">
    <img src="https://img.shields.io/github/stars/IN3PIRE/db?style=for-the-badge&color=6C47FF&logo=github" alt="Star this repo">
  </a>
</p>

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🔗 Links

<p align="center">
  <a href="https://github.com/IN3PIRE/db/stargazers">⭐ Star on GitHub</a> •
  <a href="https://github.com/IN3PIRE/db/issues/new">🐛 Report a Bug</a> •
  <a href="https://github.com/IN3PIRE/db/discussions">💬 Discussions</a> •
  <a href="https://neon.tech">🚀 Neon Console</a> •
  <a href="CHANGELOG.md">📋 Changelog</a>
</p>

<p align="center">
  <sub>Built with ❤️ using TypeScript • Powered by <a href="https://neon.tech">Neon</a> • MIT License</sub>
</p>
