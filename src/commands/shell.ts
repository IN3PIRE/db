import { Command } from "commander";
import chalk from "chalk";
import { spawn } from "child_process";
import { getClient, getProjectId, resolveBranch } from "../lib/client.js";
import { getConfig } from "../lib/config.js";

export function registerShellCmd(program: Command) {
  program
    .command("shell [branch]")
    .description("Open an interactive psql shell for a branch")
    .option("-p, --project <id>", "Project ID")
    .option("--pooled", "Use pooled connection")
    .addHelpText(
      "after",
      `
Examples:
   db shell                    Open psql for the default branch
   db shell feat/awesome       Open psql for feat/awesome branch
   db shell --pooled           Use pooled connection string
      `
    )
    .action(async (branchArg, options) => {
      const client = getClient();
      const projectId = await getProjectId(options.project);
      const branchName = branchArg || getConfig().default_branch || "main";

      const branch = await resolveBranch(client, projectId, branchName);
      const spinner = (await import("ora")).default;
      const sp = spinner(`Connecting to ${branchName}…`).start();

      try {
        const connStr = await client.getConnectionString(
          projectId,
          branch.id,
          options.pooled
        );
        sp.stop();

        console.log(
          chalk.dim(
            `\n  Opening psql shell for ${chalk.green(branchName)}…\n`
          )
        );
        console.log(
          chalk.dim(`  Type ${chalk.italic("\\q")} to exit.\n`)
        );

        const psql = spawn("psql", [connStr], {
          stdio: "inherit",
          env: { ...process.env },
        });

        psql.on("exit", (code) => {
          if (code !== 0 && code !== null) {
            console.error(
              chalk.red(`\n  psql exited with code ${code}\n`)
            );
          }
          process.exit(code ?? 0);
        });
      } catch (err) {
        sp.stop();
        console.error(
          chalk.red(`\n  Failed to open psql shell: ${(err as Error).message}\n`)
        );
        process.exit(1);
      }
    });
}
