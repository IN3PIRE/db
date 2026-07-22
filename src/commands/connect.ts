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
    .option("--json", "Output as JSON")
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

        if (options.json) {
          const url = new URL(connStr);
          const out = {
            connectionString: connStr,
            branch: targetBranch.name,
            pooled: !!options.pooled,
            host: url.hostname,
            port: url.port ? Number(url.port) : null,
          };
          console.log(JSON.stringify(out, null, 2));
          return;
        }

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
