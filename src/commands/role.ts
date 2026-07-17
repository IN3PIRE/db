import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import Table from "cli-table3";
import { getClient, getProjectId, resolveBranchId } from "../lib/client.js";

export function registerRoleCmd(program: Command) {
  const role = program
    .command("role")
    .description("Manage database roles");

  role
    .command("list")
    .description("List all roles in a branch")
    .argument("<branch>", "Branch name or ID")
    .option("-p, --project <id>", "Project ID")
    .option("--json", "Output in JSON format")
    .action(async (identifier, options) => {
      const spinner = ora("Fetching roles…").start();
      try {
        const client = getClient();
        const projectId = await getProjectId(options.project);
        const branchId = await resolveBranchId(client, projectId, identifier);
        const res = await client.listRoles(projectId, branchId);
        const roles = res.roles ?? [];
        spinner.stop();

        if (options.json) {
          console.log(JSON.stringify({ branch: identifier, roles, total: roles.length }, null, 2));
          return;
        }

        if (roles.length === 0) {
          console.log(chalk.dim("No roles found."));
          return;
        }

        const table = new Table({
          head: ["Name", "Password", "Protected"],
          style: { head: ["cyan"] },
        });

        for (const r of roles) {
          table.push([
            chalk.green(r.name),
            r.password ? chalk.dim("••••••••") : chalk.dim("—"),
            r.protected ? chalk.yellow("yes") : chalk.dim("no"),
          ]);
        }

        console.log(chalk.bold(`\n  Roles in ${identifier}\n`));
        console.log(table.toString());
        console.log(chalk.dim(`\n  ${roles.length} role(s)\n`));
      } catch (err) {
        spinner.fail("Failed to list roles");
        console.error(chalk.red(`  ${(err as Error).message}`));
        process.exit(1);
      }
    });
}
