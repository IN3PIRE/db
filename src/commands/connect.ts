import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { getClient, getProjectId, resolveBranch } from "../lib/client.js";

export function registerConnectCmd(program: Command) {
  const connect = program
    .command("connect")
    .alias("conn")
    .description("Get a connection string for a branch");

  connect
    .argument("[branch-name]", "Branch name or ID (default: main)")
    .option("-p, --project <id>", "Project ID")
    .option("--pooled", "Use pooled connection URL")
    .action(async (branchName, options) => {
      const spinner = ora("Resolving connection string…").start();
      try {
        const client = getClient();
        const projectId = await getProjectId(options.project);

        // Resolve branch name-or-ID or default to main
        let targetBranch;
        if (branchName) {
          targetBranch = await resolveBranch(client, projectId, branchName);
        } else {
          const res = await client.listBranches(projectId);
          targetBranch = res.branches?.find((b) => b.name === "main");
          if (!targetBranch) {
            spinner.fail('No "main" branch found');
            process.exit(1);
          }
        }

        const connStr = await client.getConnectionString(
          projectId,
          targetBranch.id,
          !!options.pooled
        );

        spinner.stop();

        console.log(chalk.green(`\n  ✓ ${targetBranch.name}\n`));
        console.log(`  ${connStr}\n`);

        // Also print copy hint
        console.log(chalk.dim("  Copy with:"));
        console.log(
          chalk.dim(
            `  echo "${connStr}" | pbcopy  # or use your clipboard tool\n`
          )
        );
      } catch (err) {
        spinner.fail("Failed to get connection string");
        console.error(chalk.red(`  ${(err as Error).message}`));
        process.exit(1);
      }
    });
}
