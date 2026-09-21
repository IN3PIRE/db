<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/db-Neon%20Branch%20CLI-6C47FF?style=for-the-badge&logo=postgresql&logoColor=white&labelColor=1a1a2e">
  <img alt="db — Neon Postgres Branching CLI" src="https://img.shields.io/badge/db-Neon%20Branch%20CLI-6C47FF?style=for-the-badge&logo=postgresql&logoColor=white&labelColor=f0f0ff">
</picture>

# 🌿 db

**Git-like branching for Postgres. Because your database deserves version control too.**

<p>
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-why-branch-your-database">Why</a> •
  <a href="#-features">Features</a> •
  <a href="#-installation">Install</a> •
  <a href="#-cli-reference">CLI Docs</a> •
  <a href="CONTRIBUTING.md">Contribute</a>
</p>

<p>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-6C47FF?style=flat-square" alt="MIT"></a>
  <a href="https://github.com/IN3PIRE/db/releases"><img src="https://img.shields.io/github/v/release/IN3PIRE/db?style=flat-square&color=6C47FF&label=release" alt="Release"></a>
  <a href="https://github.com/IN3PIRE/db/stargazers"><img src="https://img.shields.io/github/stars/IN3PIRE/db?style=flat-square&color=6C47FF" alt="Stars"></a>
  <img src="https://img.shields.io/badge/TypeScript-7.0-3178C6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node-22%2B-339933?style=flat-square&logo=nodedotjs" alt="Node">
  <a href="https://console.neon.tech"><img src="https://img.shields.io/badge/powered_by-Neon-00E599?style=flat-square" alt="Neon"></a>
</p>

</div>

---

<div align="center">

### Every feature. Every experiment. Every PR.
### **Its own isolated Postgres database. In seconds.**

</div>

```bash
db branch create feat/payment-redesign
# ✓ Branch created in 2.3s

db connect feat/payment-redesign
# postgresql://user@ep-cool-wine-123456.us-east-2.aws.neon.tech/neondb

db branch diff feat/payment-redesign main
# + users           (new table)
# ~ orders          + payment_method column
# ~ subscriptions   + trial_ends_at column

db branch merge feat/payment-redesign main
# ✓ Merged 1 table, 2 schema changes

db branch delete feat/payment-redesign
# ✓ Branch deleted
```

<div align="center">

**Stop sharing dev databases. Stop waiting for infra. Start shipping faster.**

[⭐ Star this repo](https://github.com/IN3PIRE/db/stargazers) if you believe databases deserve the same workflow Git gave to code.

</div>

---

## 🎯 Why Branch Your Database?

<table>
<tr>
<td width="50%">

### The Old Way 😰

```
[DEV DATABASE]
    ↓
[10 developers]
    ↓
[Chaos]
```

- **Shared dev DB** → constant conflicts
- **No schema history** → "who changed this?"
- **Manual backups** → hope you remember
- **Testing in prod** → 🔥 this is fine 🔥
- **"Works on my machine"** → always

</td>
<td width="50%">

### The db Way ✨

```
main ──┬─→ alice/user-auth
       ├─→ bob/payments  
       ├─→ pr-123
       └─→ staging
```

- **Isolated branches** → work independently
- **Git-like diffs** → see what changed
- **Instant snapshots** → `db restore` anytime
- **Preview per PR** → test before merge
- **Reproducible** → same data everywhere

</td>
</tr>
</table>

<div align="center">

### Real Problems. Real Solutions.

| Challenge | How `db` Solves It |
|-----------|-------------------|
| 🔥 **Shared dev database chaos** | Every developer gets their own branch. Zero conflicts. |
| 🎲 **"Works on my machine"** | Copy production data to branches. Identical environments. |
| 🚫 **Breaking changes sneak to prod** | `db branch diff` shows schema changes before merge. |
| ⏰ **Waiting for staging databases** | Spin up a branch in 2 seconds. Delete when done. |
| 💸 **Expensive test environments** | Copy-on-write branches. Share data efficiently. |
| 🔙 **No database rollback** | `db restore` creates instant snapshots. Time-travel for data. |

</div>

---

## 🚀 Quick Start

```bash
# Authenticate
db auth login
# → Paste your Neon API key

# Create your first branch
db branch create feat/awesome-feature
# ✓ Created from main in 1.8s

# Get the connection string
db connect feat/awesome-feature
# postgresql://user@ep-cool-123.us-east-2.aws.neon.tech/neondb

# Make changes, then see what's different
db branch diff feat/awesome-feature main
# + products     (new table)
# ~ users        + avatar_url (new column)

# Merge when ready
db branch merge feat/awesome-feature main
# ✓ Merged successfully

# Clean up
db branch delete feat/awesome-feature
# ✓ Branch deleted
```

<div align="center">

> 💡 **Pro Tip**: Run `db git sync` to auto-create Neon branches that mirror your Git branches!

</div>

---

## ✨ Features

<table>
<tr>
<td width="33%">

### 🌲 Branch Management

Just like Git, but for databases.

- Create, list, delete branches
- Rename and search branches  
- Protect critical branches
- Tag for organization
- Auto-expiration policies

```bash
db branch create staging
db branch protect main
db branch tag dev team-alpha
```

</td>
<td width="33%">

### 🔍 Schema Inspection

Know exactly what changed.

- `git diff` style comparisons
- Full schema exports
- Table listing
- Dry-run merges
- Migration previews

```bash
db branch diff dev main
db branch schema staging
db branch merge --dry-run
```

</td>
<td width="33%">

### 🔄 CI/CD Ready

Automate everything.

- PR preview databases
- Auto-cleanup stale branches
- GitHub Actions workflows
- Git branch mirroring
- Connection string exports

```bash
db ci setup
db git sync
db ci cleanup --days 7
```

</td>
</tr>
</table>

<details>
<summary><b>📦 See All Features</b></summary>

- **Data Operations**: Query, export, seed, and shell access
- **Compute Management**: Create/delete endpoints, configure read-replicas
- **Multi-Project**: Switch between Neon projects seamlessly
- **Diagnostics**: `db doctor` validates your setup
- **Audit Log**: Track all operations with `db log show`
- **Real-time Monitor**: Watch branches with `db watch`
- **Restore Points**: Instant snapshots before risky operations
- **Bulk Operations**: Prune stale branches in one command

</details>

---

## 📦 Installation

### Prerequisites

- **Node.js 22+** (required for latest dependencies)
- **Neon account** ([Sign up free](https://console.neon.tech))
- **GitHub Personal Access Token** with `read:packages` scope ([Create one](https://github.com/settings/tokens))

### Setup GitHub Packages

```bash
# Add to ~/.npmrc
echo "@in3pire:registry=https://npm.pkg.github.com" >> ~/.npmrc
echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN" >> ~/.npmrc
```

### Install

```bash
# Global installation
npm install -g @in3pire/db

# Verify it works
db --version
# @in3pire/db v0.11.0

# Or run without installing
npx @in3pire/db branch list
```

---

## ⚙️ Configuration

Set up once, use everywhere.

```bash
# Interactive setup (recommended)
db auth login
# → Enter your Neon API key
# → Select default project

# Or via environment variables
export NEON_API_KEY=your-api-key
export NEON_PROJECT_ID=your-project-id

# Or create a .env file
cat > .env << EOF
NEON_API_KEY=your-api-key
NEON_PROJECT_ID=your-project-id
EOF
```

<details>
<summary><b>Configuration Priority</b></summary>

Settings are resolved in this order:

1. **CLI flags** (highest priority)
2. **Environment variables**
3. **Config file** (lowest priority)

Example:
```bash
# Flag overrides everything
db branch list --project custom-project-id

# Env var overrides config file
NEON_PROJECT_ID=other-id db branch list

# Config file used if nothing else set
db branch list
```

</details>

---

## 🎨 Integration Examples

### With Prisma

```typescript
// 1. Get connection string
const dbUrl = execSync('db connect feat/my-feature').toString().trim();

// 2. Use in Prisma
// prisma/.env
DATABASE_URL="${dbUrl}"

// 3. Run migrations
npx prisma migrate dev
```

### With Drizzle

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { execSync } from 'child_process';

const connectionString = execSync('db connect feat/my-feature')
  .toString()
  .trim();

export const db = drizzle(connectionString);
```

### With SQL Clients

```bash
# psql
db shell feat/my-feature

# Or with any client
CONNECTION_STRING=$(db connect feat/my-feature)
psql $CONNECTION_STRING
pgcli $CONNECTION_STRING
```

### In GitHub Actions

```yaml
name: Test with Preview DB

on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Create preview database
        run: |
          npm install -g @in3pire/db
          db auth login ${{ secrets.NEON_API_KEY }}
          db branch create pr-${{ github.event.number }}
        
      - name: Run tests
        env:
          DATABASE_URL: ${{ steps.db.outputs.url }}
        run: npm test
        
      - name: Cleanup
        if: always()
        run: db branch delete pr-${{ github.event.number }} --force
```

---

## 🔄 CI/CD Integration

### Automatic PR Preview Databases

Generate a complete workflow in one command:

```bash
db ci setup > .github/workflows/db-preview.yml
```

**What you get:**

- ✅ Database per PR (auto-created)
- 🌱 Seeded with your schema
- 💬 Connection string in PR comments
- 🧹 Auto-cleanup on merge/close

**Setup:**

1. Add secrets to your repo:
   - `NEON_API_KEY`
   - `NEON_PROJECT_ID`
2. Commit the workflow file
3. Open a PR → database created automatically!

### Manual CI Commands

```bash
# Create preview branch for PR #123
db ci preview 123

# List all pr-* branches
db branch list | grep "pr-"

# Clean up old preview branches
db ci cleanup --days 14 --dry-run  # Preview first
db ci cleanup --days 14            # Actually delete
```

### Git Branch Mirroring

Automatically sync Git branches to Neon:

```bash
# One-time sync
db git sync

# Check sync status
db git status
# main     → main     ✓
# staging  → staging  ✓
# feat/auth → feat-auth ✓

# Add to your Git hooks
echo "db git sync" >> .git/hooks/post-checkout
chmod +x .git/hooks/post-checkout
```

---

## 📚 CLI Reference

<details>
<summary><b>🔐 Authentication & Config</b></summary>

```bash
db auth login [api-key]         # Authenticate (interactive or with key)
db auth status                  # Show current auth status
db auth logout                  # Clear credentials
db auth set-project <id>        # Set default project

db config list                  # Show all config (--json)
db config get <key>             # Get specific value
db config set <key> <value>     # Set config value
```

</details>

<details>
<summary><b>🌲 Branch Management</b></summary>

```bash
# Core operations
db branch list                  # List all branches (--json, --tags)
db branch create <name>         # Create from main (--from other-branch)
db branch delete <name>         # Delete branch (--force)
db branch rename <old> <new>    # Rename branch
db branch inspect <name>        # Detailed info (--json)

# Organization
db branch search <pattern>      # Find by name (--json)
db branch tag <name> <label>    # Add organizational tag
db branch untag <name>          # Remove tag
db branch protect <name>        # Prevent deletion
db branch unprotect <name>      # Remove protection

# Configuration
db branch set-default <name>    # Set project default
db branch set-expiration <name> <ttl>  # Auto-delete after TTL
```

</details>

<details>
<summary><b>🔍 Schema & Diff</b></summary>

```bash
db branch diff <a> [b]          # Compare schemas (default: b=main)
db branch schema <name>         # Full schema dump (--json, --schema)
db branch tables <name>         # List tables only (--schema public)
db branch merge <src> <dest>    # Merge schemas (--dry-run)
```

</details>

<details>
<summary><b>💾 Data Operations</b></summary>

```bash
db query <branch> <sql>         # Execute SQL (--json, --limit)
db export <branch> -o file.sql  # Export schema + data
db seed <branch> <file.sql>     # Import from SQL file
db shell [branch]               # Open psql (uses main if omitted)
```

</details>

<details>
<summary><b>🔧 Advanced</b></summary>

```bash
# Compute endpoints
db endpoint list                # Show all endpoints
db endpoint create <branch-id>  # New endpoint (--read-only)
db endpoint delete <id>         # Remove endpoint

# Multi-project
db project list                 # All projects
db project switch <id>          # Change active project

# Utilities
db doctor                       # Health check
db prune                        # Delete stale branches (interactive)
db restore <branch> [name]      # Create snapshot
db reset <branch> --to <target> # Reset to match another branch
db watch                        # Live branch monitor
db log show                     # Operation history (--json, -n 50)
db completion bash|zsh|fish     # Shell completions
```

</details>

---

## 🛠️ Development

Want to contribute? Here's how to set up locally:

```bash
# Clone and install
git clone https://github.com/IN3PIRE/db.git
cd db
npm install

# Development commands
npm run dev          # Run with tsx (hot reload)
npm test             # Run test suite (Vitest)
npm run build        # Compile TypeScript → dist/

# Try your changes
npm run dev -- branch list
```

### Branch Naming Rules

✅ **Valid**: `feat/auth`, `staging_v2`, `exp.oauth`  
❌ **Invalid**: `-hyphen-start`, `my@branch`, `OVER-63-CHARACTERS...`

**Requirements:**
- Start with alphanumeric
- Only `a-z`, `A-Z`, `0-9`, `_`, `.`, `-`
- Max 63 characters

---

## 🤝 Contributing

We ❤️ contributions! Here's how you can help:

- 🐛 [Report bugs](https://github.com/IN3PIRE/db/issues/new?template=bug_report.md)
- 💡 [Request features](https://github.com/IN3PIRE/db/issues/new?template=feature_request.md)
- 📖 Improve docs
- 🔧 Submit PRs
- ⭐ Star the repo

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

<div align="center">

## 🌟 Why Star This Repo?

**Because database branching should be as natural as `git checkout -b`.**

Your ⭐ tells other developers:
- This project is **actively maintained**
- It solves **real problems**
- It's **worth trying**

<a href="https://github.com/IN3PIRE/db/stargazers">
  <img src="https://img.shields.io/github/stars/IN3PIRE/db?style=for-the-badge&color=6C47FF&logo=github&label=STAR%20THIS%20REPO" alt="Star this repo" height="40">
</a>

**One click. Huge impact. Help us grow! 🚀**

---

## 📊 By the Numbers

<p>
  <img src="https://img.shields.io/github/stars/IN3PIRE/db?style=social" alt="Stars">
  <img src="https://img.shields.io/github/forks/IN3PIRE/db?style=social" alt="Forks">
  <img src="https://img.shields.io/github/watchers/IN3PIRE/db?style=social" alt="Watchers">
</p>

---

## 🔗 Links

<p>
  <a href="https://github.com/IN3PIRE/db/stargazers">⭐ Star</a> •
  <a href="https://github.com/IN3PIRE/db/issues">🐛 Issues</a> •
  <a href="https://github.com/IN3PIRE/db/discussions">💬 Discuss</a> •
  <a href="https://neon.tech">🚀 Neon</a> •
  <a href="CHANGELOG.md">📋 Changelog</a> •
  <a href="CONTRIBUTING.md">🤝 Contribute</a>
</p>

---

<sub>Built with ❤️ and TypeScript • Powered by [Neon](https://neon.tech) • [MIT License](LICENSE)</sub>

</div>
