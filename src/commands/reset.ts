import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { getClient, getProjectId, resolveBranch } from "../lib/client.js";
import { isBranchProtected, addLogEntry } from "../lib/config.js";

export function registerResetCmd(program: Command) {
  program
    .command("reset")
    .description("Reset a branch by recreating it from another branch")
    .argument("<branch>", "Branch to reset")
    .option("-p, --project <id>", "Project ID")
    .option("--to <branch>", "Reset to match this branch (default: main)")
    .option("-f, --force", "Skip confirmation")
    .option("-y, --yes", "Skip confirmation (alias for --force)")
    .action(async (identifier, options) => {
      try {
        const client = getClient();
        const projectId = await getProjectId(options.project);

        const branch = await resolveBranch(client, projectId, identifier);

        if (isBranchProtected(branch.name)) {
          console.error(chalk.red(`Branch "${branch.name}" is protected. Unprotect it first.`));
          process.exit(1);
        }

        const targetName = options.to || "main";
        const target = await resolveBranch(client, projectId, targetName);

        if (branch.id === target.id) {
          console.log(chalk.yellow("Source and target are the same branch. Nothing to do."));
          return;
        }

        if (!(options.force || options.yes)) {
          const readline = (await import("node:readline")).default;
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });
          const answer = await new Promise<string>((resolve) =>
            rl.question(
              chalk.yellow(`Reset "${branch.name}" to match "${target.name}"? This will delete and recreate the branch. [y/N] `),
              resolve
            )
          );
          rl.close();
          if (answer.toLowerCase() !== "y") {
            console.log(chalk.dim("Cancelled."));
            return;
          }
        }

        const spinner = ora(`Resetting "${branch.name}" → "${target.name}"…`).start();

        // Delete the branch
        await client.deleteBranch(projectId, branch.id);

        // Recreate from target
        const res = await client.createBranch(projectId, branch.name, target.id);
        spinner.stop();

        const b = res.branch;
        if (b) {
          console.log(chalk.green(`\n  ✓ Branch "${branch.name}" reset to match "${target.name}"\n`));
          console.log(`  ${chalk.dim("New ID:")}  ${b.id}`);
          const connStr = await client.getConnectionString(projectId, b.id);
          console.log(`  ${chalk.dim("DSN:")}    ${connStr}\n`);
        }

        addLogEntry({
          timestamp: new Date().toISOString(),
          action: "reset",
          branch: branch.name,
          detail: `to ${target.name}`,
        });
      } catch (err) {
        console.error(chalk.red(`  ${(err as Error).message}`));
        process.exit(1);
      }
    });
}
