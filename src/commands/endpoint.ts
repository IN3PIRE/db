import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import Table from "cli-table3";
import { getClient, getProjectId } from "../lib/client.js";
import { addLogEntry } from "../lib/config.js";

export function registerEndpointCmd(program: Command) {
  const endpoint = program
    .command("endpoint")
    .alias("ep")
    .description("Manage Neon compute endpoints");

  endpoint
    .command("list")
    .description("List all endpoints in a project")
    .option("-p, --project <id>", "Project ID")
    .option("--json", "Output in JSON format")
    .action(async (options) => {
      const spinner = ora("Fetching endpoints…").start();
      try {
        const client = getClient();
        const projectId = await getProjectId(options.project);
        const res = await client.listEndpoints(projectId);
        const endpoints = res.endpoints ?? [];
        spinner.stop();

        if (options.json) {
          console.log(JSON.stringify({ endpoints, total: endpoints.length }, null, 2));
          return;
        }

        if (endpoints.length === 0) {
          console.log(chalk.dim("No endpoints found."));
          return;
        }

        const table = new Table({
          head: ["ID", "Branch ID", "Type", "Host", "Port"],
          style: { head: ["cyan"] },
        });

        for (const ep of endpoints) {
          table.push([
            ep.id.substring(0, 8) + "…",
            ep.branch_id.substring(0, 8) + "…",
            ep.type === "read_write" ? chalk.green("RW") : chalk.blue("RO"),
            ep.host,
            (ep.port ?? 5432).toString(),
          ]);
        }

        console.log(table.toString());
        console.log(chalk.dim(`\n  ${endpoints.length} endpoint(s)\n`));
      } catch (err) {
        spinner.fail("Failed to list endpoints");
        console.error(chalk.red(`  ${(err as Error).message}`));
        process.exit(1);
      }
    });

  endpoint
    .command("create")
    .description("Create a compute endpoint for a branch")
    .argument("<branch-id>", "Branch ID to attach the endpoint to")
    .option("-p, --project <id>", "Project ID")
    .option("--read-only", "Create a read-only endpoint instead of read-write")
    .action(async (branchId, options) => {
      const spinner = ora("Creating endpoint…").start();
      try {
        const client = getClient();
        const projectId = await getProjectId(options.project);
        const epType = options.readOnly ? "read_only" : "read_write";
        const res = await client.createEndpoint(projectId, branchId, epType);
        spinner.stop();

        const ep = res.endpoints?.[0];
        if (ep) {
          console.log(chalk.green(`\n  ✓ Endpoint created\n`));
          console.log(`  ${chalk.dim("ID:")}     ${ep.id}`);
          console.log(`  ${chalk.dim("Host:")}   ${ep.host}`);
          console.log(`  ${chalk.dim("Port:")}   ${ep.port}`);
          console.log(`  ${chalk.dim("Type:")}   ${ep.type}`);
          console.log();
        }

        addLogEntry({
          timestamp: new Date().toISOString(),
          action: "endpoint-create",
          branch: branchId,
          detail: epType,
        });
      } catch (err) {
        spinner.fail("Failed to create endpoint");
        console.error(chalk.red(`  ${(err as Error).message}`));
        process.exit(1);
      }
    });

  endpoint
    .command("delete")
    .alias("rm")
    .description("Delete a compute endpoint")
    .argument("<endpoint-id>", "Endpoint ID")
    .option("-p, --project <id>", "Project ID")
    .option("-f, --force", "Skip confirmation")
    .option("-y, --yes", "Skip confirmation")
    .action(async (endpointId, options) => {
      if (!(options.force || options.yes)) {
        const readline = (await import("node:readline")).default;
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const answer = await new Promise<string>((resolve) =>
          rl.question(chalk.yellow(`Delete endpoint "${endpointId.substring(0, 8)}…"? [y/N] `), resolve)
        );
        rl.close();
        if (answer.toLowerCase() !== "y") {
          console.log(chalk.dim("Cancelled."));
          return;
        }
      }

      const spinner = ora("Deleting endpoint…").start();
      try {
        const client = getClient();
        const projectId = await getProjectId(options.project);
        await client.deleteEndpoint(projectId, endpointId);
        spinner.stop();
        console.log(chalk.green(`✓ Endpoint "${endpointId.substring(0, 8)}…" deleted.`));

        addLogEntry({
          timestamp: new Date().toISOString(),
          action: "endpoint-delete",
          branch: endpointId,
        });
      } catch (err) {
        spinner.fail("Failed to delete endpoint");
        console.error(chalk.red(`  ${(err as Error).message}`));
        process.exit(1);
      }
    });

  endpoint
    .command("inspect")
    .description("Show endpoint details")
    .argument("<endpoint-id>", "Endpoint ID")
    .option("-p, --project <id>", "Project ID")
    .action(async (endpointId, options) => {
      const spinner = ora("Fetching endpoint details…").start();
      try {
        const client = getClient();
        const projectId = await getProjectId(options.project);
        const res = await client.getEndpoint(projectId, endpointId);
        spinner.stop();

        const ep = res.endpoints?.[0];
        if (ep) {
          console.log(`\n  ${chalk.bold(ep.id)}`);
          console.log(`  ${chalk.dim("Host:")}     ${ep.host}`);
          console.log(`  ${chalk.dim("Port:")}     ${ep.port}`);
          console.log(`  ${chalk.dim("Type:")}     ${ep.type === "read_write" ? chalk.green("Read/Write") : chalk.blue("Read Only")}`);
          console.log(`  ${chalk.dim("Branch:")}   ${ep.branch_id}`);
          console.log();
        }
      } catch (err) {
        spinner.fail("Failed to fetch endpoint");
        console.error(chalk.red(`  ${(err as Error).message}`));
        process.exit(1);
      }
    });
}
