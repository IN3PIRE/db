#!/usr/bin/env node
import { Command } from "commander";
import { registerAuthCmd } from "./commands/auth.js";
import { registerBranchCmd } from "./commands/branch.js";
import { registerConnectCmd } from "./commands/connect.js";
import { registerCiCmd } from "./commands/ci.js";
import { registerConfigCmd } from "./commands/config.js";
import { registerProjectCmd } from "./commands/project.js";
import { registerRestoreCmd } from "./commands/restore.js";
import { registerResetCmd } from "./commands/reset.js";
import { registerExportCmd } from "./commands/export.js";
import { registerQueryCmd } from "./commands/query.js";
import { registerLogCmd } from "./commands/log.js";
import { registerWatchCmd } from "./commands/watch.js";
import { registerCompletionCmd } from "./commands/completion.js";
import { registerPruneCmd } from "./commands/prune.js";
import { registerSeedCmd } from "./commands/seed.js";
import { registerGitCmd } from "./commands/git.js";
import { registerDoctorCmd } from "./commands/doctor.js";
import { registerEndpointCmd } from "./commands/endpoint.js";
import { registerRoleCmd } from "./commands/role.js";
import { registerVersionCmd } from "./commands/version.js";
import { registerUpdateCmd } from "./commands/update.js";
import { registerShellCmd } from "./commands/shell.js";
import { registerTimelineCmd } from "./commands/timeline.js";

// Load .env if available
try {
  const { config } = await import("dotenv");
  config();
} catch {
  // dotenv not installed or no .env — that's fine
}

const program = new Command();

program
  .name("db")
  .description("Database branch CLI — Git-like branching for Neon Postgres")
  .version("0.7.0")
  .helpOption("-h, --help", "Show help")
  .addHelpText(
    "after",
    `
Examples:
   db auth login                          Set up your Neon API key
   db branch list                         List all branches
   db branch create feat/awesome          Create a branch
   db branch protect main                 Protect a branch from deletion
   db branch diff feat/awesome main       Show schema diff
   db branch merge feat/awesome main      Merge schema changes
   db connect                             Get connection string for main
   db ci preview 42                       Create ephemeral branch for PR #42
   db ci cleanup --days 7                 Clean stale preview branches
   db project list                        List all Neon projects
   db config list                         Show local configuration
   db restore                             Restore a branch from parent LSN
   db reset feat/awesome --to main        Reset branch to match main
   db export main -o schema.sql           Export schema to file
   db query main "SELECT * FROM users"    Run SQL query
   db log show                            Show branch operation history
    db watch                               Watch branches in real-time
    db branch set-default main             Set branch as project default
    db branch set-expiration feat ...       Set TTL on a branch
    db branch schema main                  Show full schema (tables, columns, indexes)
    db prune --older-than 30               Bulk delete stale branches
    db seed my-branch ./data.sql           Seed branch with data from SQL file
    db git sync                            Sync Git branches with Neon branches
    db git status                          Show Git ↔ Neon branch mapping
    db completion bash                     Generate bash completions
     db version                             Show version information
     db update                              Update CLI to the latest version
     db update --check                      Check for updates without installing
     db update --canary                     Update to the latest canary release
     db shell [branch]                      Open interactive psql shell for a branch
     db timeline [branch]                   Show branch lineage as a tree

📖 Docs: https://github.com/IN3PIRE/db
  `
  );

registerAuthCmd(program);
registerBranchCmd(program);
registerConnectCmd(program);
registerCiCmd(program);
registerConfigCmd(program);
registerProjectCmd(program);
registerRestoreCmd(program);
registerResetCmd(program);
registerExportCmd(program);
registerQueryCmd(program);
registerLogCmd(program);
registerWatchCmd(program);
registerCompletionCmd(program);
registerPruneCmd(program);
registerSeedCmd(program);
registerGitCmd(program);
registerDoctorCmd(program);
registerEndpointCmd(program);
registerRoleCmd(program);
registerShellCmd(program);
registerTimelineCmd(program);
registerVersionCmd(program);
registerUpdateCmd(program);

// Allow `db <cmd>` without subcommand prefix for common ops
program
  .command("list", { hidden: true })
  .description("Alias for: db branch list")
  .argument("[project-id]", "Project ID")
  .action(async (projectId) => {
    // Delegate to branch list
    const listCmd = program.commands
      .find((c) => c.name() === "branch")
      ?.commands.find((c) => c.name() === "list");
    if (listCmd) {
      await listCmd.parseAsync(
        ["node", "db", ...(projectId ? ["--project", projectId] : [])],
        { from: "user" }
      );
    }
  });

program.parse(process.argv);
