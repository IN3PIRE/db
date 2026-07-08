# Contributing to @in3pire/db

Thanks for taking the time to contribute. This project is a TypeScript CLI for
working with Neon Postgres database branches, so most changes should stay small,
focused, and easy to verify from the command line.

## Prerequisites

- Node.js 18 or newer
- npm
- A GitHub account
- A GitHub personal access token with `read:packages` if you need to install
  the published `@in3pire` package from GitHub Packages
- A Neon account, project, and API key for commands that call the Neon API

## Local Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/IN3PIRE/db.git
cd db
npm install
```

For local development from source, GitHub Packages authentication is not needed
for the repository dependencies in `package-lock.json`. It is only needed when
installing the published `@in3pire/db` package.

If you do need GitHub Packages access, add the scoped registry to your npm
configuration. Prefer a project-level `.npmrc` for repository work so repeated
setup does not duplicate lines in your global npm config:

```bash
cat > .npmrc <<'EOF'
@in3pire:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
EOF
```

## Environment Configuration

Commands that call Neon need credentials. You can either use the CLI auth
commands or environment variables.

Use these variables when working locally:

```bash
NEON_API_KEY=your-neon-api-key
NEON_PROJECT_ID=your-neon-project-id
```

`NEON_PROJECT_ID` can also be persisted with `npm run dev -- auth set-project
<project-id>` if you prefer not to set it for every shell session.

The CLI also stores configuration in:

```text
~/.config/in3pire-db/config.json
```

Useful auth commands:

```bash
npm run dev -- auth login
npm run dev -- auth status
npm run dev -- auth set-project <project-id>
```

Do not commit API keys, project secrets, `.env` files, or generated local
configuration.

## Project Structure

```text
src/
  cli.ts              CLI entry point and command registration
  commands/
    auth.ts           Login, logout, status, and project configuration
    branch.ts         Branch list/create/delete/rename/inspect/diff commands
    ci.ts             Preview branch and cleanup workflow helpers
    connect.ts        Connection string command
  lib/
    config.ts         Config resolution and persisted config schema
    format.ts         Terminal table, date, byte, and diff formatting
    neon-api.ts       Neon REST API client and response validation
```

## Development Commands

Run the CLI from source:

```bash
npm run dev -- --help
npm run dev -- auth status
npm run dev -- branch list --project <project-id>
```

Build the project:

```bash
npm run build
```

Run tests:

```bash
npm test
npm run test:watch
```

## Common Workflows

### Add or update a command

1. Add command logic under `src/commands/`.
2. Register new top-level commands from `src/cli.ts`.
3. Keep user-facing output consistent with the existing `chalk`, `ora`, and
   `cli-table3` patterns.
4. Prefer shared formatting helpers in `src/lib/format.ts` instead of duplicating
   table or display logic.

### Add a Neon API call

1. Add the request method to `src/lib/neon-api.ts`.
2. Validate returned data with the existing Zod schema pattern.
3. Keep errors actionable and avoid printing secrets in terminal output.

### Test a change manually

For changes that do not need live Neon access, run:

```bash
npm run build
npm run dev -- --help
```

For changes that call Neon, run the smallest command that exercises the changed
path and include the command in your pull request notes.

## Code Style

- Use TypeScript and ES modules.
- Keep command handlers small and focused.
- Use `zod` for API response/config validation.
- Use `chalk` for terminal emphasis and `ora` for long-running operations.
- Stop with a clear error message when required credentials or project IDs are
  missing.
- Do not introduce unrelated formatting churn in files you are not changing.

## Testing Guidelines

The project is configured for Vitest. When adding logic that can be tested
without live Neon credentials, add focused unit tests and run:

```bash
npm test
```

When a change depends on the Neon API, document what was manually verified and
avoid checking in real account data.

## Pull Request Process

1. Fork the repository.
2. Create a focused branch:

```bash
git checkout -b fix/short-description
```

3. Make one logical change per pull request.
4. Run the relevant checks, usually:

```bash
npm run build
npm test
```

5. In the pull request description, include:
   - What changed
   - Why it changed
   - Commands you ran
   - Any Neon/API behavior that was not run locally and why

## Reporting Issues

When opening an issue, include:

- The command you ran
- Expected behavior
- Actual behavior
- Node.js and npm versions
- CLI version, for example `npx @in3pire/db --version`
- Whether credentials were provided through config or environment variables
- Redacted error output when relevant

Never include API keys, connection strings, access tokens, or project secrets in
issues or pull requests.
