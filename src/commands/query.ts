import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import Table from "cli-table3";
import { getClient, getProjectId, resolveBranch } from "../lib/client.js";

export function registerQueryCmd(program: Command) {
  program
    .command("query")
    .description("Run a SQL query against a branch")
    .argument("<branch>", "Branch name or ID")
    .argument("<sql>", "SQL query to run")
    .option("-p, --project <id>", "Project ID")
    .option("--json", "Output results as JSON")
    .option("--limit <n>", "Maximum rows to return", "100")
    .action(async (identifier, sql, options) => {
      let spinner: ReturnType<typeof ora> | undefined;
      try {
        const client = getClient();
        const projectId = await getProjectId(options.project);
        const branch = await resolveBranch(client, projectId, identifier);
        const connStr = await client.getConnectionString(projectId, branch.id);

        spinner = ora("Running query…").start();

        const pg = (await import("pg")).default;
        const pgClient = new pg.Client(connStr);
        await pgClient.connect();

        const limit = parseInt(options.limit, 10);
        const finalSql = sql.trim().toLowerCase().startsWith("select")
          ? `${sql} LIMIT ${limit}`
          : sql;

        const res = await pgClient.query(finalSql);
        await pgClient.end();

        spinner.stop();

        if (options.json) {
          console.log(JSON.stringify({ rows: res.rows, rowCount: res.rowCount }, null, 2));
          return;
        }

        if (res.rows.length === 0) {
          console.log(chalk.dim("Query returned no rows."));
          return;
        }

        const fields = res.fields.map((f: any) => f.name);
        const table = new Table({
          head: fields.map((f: string) => chalk.cyan(f)),
          style: { head: [] },
        });

        for (const row of res.rows) {
          table.push(fields.map((f: string) => {
            const val = row[f];
            if (val === null) return chalk.dim("NULL");
            if (val === undefined) return chalk.dim("—");
            return String(val);
          }));
        }

        console.log(chalk.bold(`\n  Query on ${branch.name}\n`));
        console.log(table.toString());
        console.log(chalk.dim(`\n  ${res.rowCount} row(s) returned\n`));
      } catch (err) {
        spinner?.stop();
        console.error(chalk.red(`  ${(err as Error).message}`));
        process.exit(1);
      }
    });
}