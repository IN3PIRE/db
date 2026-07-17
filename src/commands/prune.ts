import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { getClient, getProjectId } from "../lib/client.js";
import { addLogEntry } from "../lib/config.js";

export function registerPruneCmd(program: Command) {
  program
    .command("prune")
    .description("Bulk delete stale or unused branches")
    .option("-p, --project <id>", "Project ID")
    .option("--older-than <days>", "Delete branches not modified in N days (default: 30)", "30")
    .option("--except <names...>", "Branch names to exclude from pruning")
    .option("--dry-run", "Show what would be deleted without deleting")
    .option("-f, --force", "Skip confirmation")
    .option("-y, --yes", "Skip confirmation (alias for --force)")
    .action(async (options) => {
      try {
        const client = getClient();
        const projectId = await getProjectId(options.project);
        const spinner = ora("Fetching branches…").start();
        const res = await client.listBranches(projectId);
        const branches = res.branches ?? [];
        spinner.stop();

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - parseInt(options.olderThan, 10));
        const except = (options.except as string[]) ?? [];

        const candidates = branches.filter((b) => {
          if (b.name === "main" || b.name === "production") return false;
          if (b.default) return false;
          if (except.includes(b.name)) return false;
          if (b.parent_lsn === null) return false;
          const updated = new Date(b.updated_at);
          return updated < cutoff;
        });

        if (candidates.length === 0) {
          console.log(chalk.green("✓ No stale branches to prune.\n"));
          return;
        }

        console.log(chalk.bold(`\n  Stale branches (not updated since ${cutoff.toLocaleDateString()}):\n`));
        for (const b of candidates) {
          const tag = b.parent_lsn ? chalk.dim(`(parent LSN: ${b.parent_lsn.substring(0, 12)}…)`) : "";
          console.log(`  ${chalk.yellow(b.name)}  ${chalk.dim(b.id.substring(0, 8))}  ${chalk.dim(new Date(b.updated_at).toLocaleDateString())}  ${tag}`);
        }
        console.log(chalk.dim(`\n  ${candidates.length} branch(es) to delete\n`));

        if (options.dryRun) {
          console.log(chalk.yellow("  (dry run — no branches deleted)\n"));
          return;
        }

        if (!(options.force || options.yes)) {
          const readline = (await import("node:readline")).default;
          const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
          const answer = await new Promise<string>((resolve) =>
            rl.question(chalk.yellow(`Delete ${candidates.length} branch(es)? [y/N] `), resolve)
          );
          rl.close();
          if (answer.toLowerCase() !== "y") {
            console.log(chalk.dim("Cancelled."));
            return;
          }
        }

        const delSpinner = ora("Pruning branches…").start();
        let deleted = 0;
        let failed = 0;
        for (const b of candidates) {
          try {
            await client.deleteBranch(projectId, b.id);
            addLogEntry({ timestamp: new Date().toISOString(), action: "prune", branch: b.name });
            deleted++;
          } catch {
            failed++;
          }
        }
        delSpinner.stop();

        if (failed > 0) {
          console.log(chalk.yellow(`\n  Pruned ${deleted} branch(es). ${failed} failed.\n`));
        } else {
          console.log(chalk.green(`\n  ✓ Pruned ${deleted} branch(es).\n`));
        }
      } catch (err) {
        console.error(chalk.red(`  ${(err as Error).message}`));
        process.exit(1);
      }
    });
}
