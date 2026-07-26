import { Command } from "commander";
import chalk from "chalk";
import Table from "cli-table3";
import { getHistory, clearHistory } from "../lib/config.js";

export function registerLogCmd(program: Command) {
  const log = program
    .command("log")
    .description("Show branch operation history (local audit trail)");

  log
    .command("show")
    .aliases(["list", "ls"])
    .description("Show recent branch operations")
    .addHelpText("after", `
Examples:
   db log show
   db log show --json
   db log show -n 10
  `)
    .option("--json", "Output as JSON")
    .option("-n, --number <n>", "Number of entries to show", "50")
    .action((options) => {
      const history = getHistory();
      const count = Math.min(parseInt(options.number, 10), history.length);

      if (history.length === 0) {
        console.log(chalk.dim("No history entries yet."));
        return;
      }

      const entries = history.slice(-count);

      if (options.json) {
        console.log(JSON.stringify({ entries, total: history.length }, null, 2));
        return;
      }

      const actionColors: Record<string, (s: string) => string> = {
        create: chalk.green,
        delete: chalk.red,
        rename: chalk.yellow,
        protect: chalk.yellow,
        unprotect: chalk.dim,
        merge: chalk.magenta,
        restore: chalk.cyan,
        reset: chalk.red,
        tag: chalk.cyan,
        untag: chalk.dim,
      };

      const table = new Table({
        head: ["Timestamp", "Action", "Branch", "Detail"],
        style: { head: ["cyan"] },
      });

      for (const entry of entries) {
        const color = actionColors[entry.action] || chalk.white;
        table.push([
          new Date(entry.timestamp).toLocaleString(),
          color(entry.action),
          entry.branch,
          entry.detail || chalk.dim("—"),
        ]);
      }

      console.log(chalk.bold(`\n  Operation History (last ${entries.length} of ${history.length})\n`));
      console.log(table.toString());
      console.log();
    });

  log
    .command("clear")
    .description("Clear the local operation history")
    .addHelpText("after", `
Examples:
   db log clear
  `)
    .action(() => {
      clearHistory();
      console.log(chalk.green("✓ History cleared."));
    });
}
