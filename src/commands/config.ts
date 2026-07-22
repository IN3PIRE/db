import { Command } from "commander";
import chalk from "chalk";
import { getConfig, setConfig } from "../lib/config.js";

export function registerConfigCmd(program: Command) {
  const cfg = program
    .command("config")
    .description("Manage local configuration");

  cfg
    .command("list")
    .description("Show all configuration values")
    .option("--json", "Output as JSON")
    .action((options) => {
      const c = getConfig();

      if (options.json) {
        console.log(JSON.stringify(c, null, 2));
        return;
      }

      console.log(chalk.bold("\n  Configuration\n"));
      console.log(`  ${chalk.dim("NEON_API_KEY:")}       ${c.NEON_API_KEY ? chalk.green("✓ set") : chalk.dim("— not set")}`);
      console.log(`  ${chalk.dim("NEON_PROJECT_ID:")}     ${c.NEON_PROJECT_ID ? chalk.green(c.NEON_PROJECT_ID) : chalk.dim("— not set")}`);
      console.log(`  ${chalk.dim("default_branch:")}      ${chalk.cyan(c.default_branch)}`);
      console.log(`  ${chalk.dim("protected_branches:")}  ${c.protected_branches.length > 0 ? chalk.yellow(c.protected_branches.join(", ")) : chalk.dim("none")}`);
      console.log(`  ${chalk.dim("branch_tags:")}         ${Object.keys(c.branch_tags).length > 0 ? chalk.cyan(JSON.stringify(c.branch_tags)) : chalk.dim("none")}`);
      console.log(`  ${chalk.dim("history_entries:")}     ${c.history.length}\n`);
    });

  cfg
    .command("get")
    .description("Get a specific config value")
    .argument("<key>", "Config key (NEON_API_KEY, NEON_PROJECT_ID, default_branch)")
    .action((key) => {
      const c = getConfig();
      const val = (c as any)[key];
      if (val === undefined) {
        console.log(chalk.dim("—"));
      } else {
        console.log(val);
      }
    });

  cfg
    .command("set")
    .description("Set a config value")
    .argument("<key>", "Config key")
    .argument("<value>", "Config value")
    .action((key, value) => {
      const validKeys = ["NEON_API_KEY", "NEON_PROJECT_ID", "default_branch"];
      if (!validKeys.includes(key)) {
        console.error(chalk.red(`Invalid key. Valid keys: ${validKeys.join(", ")}`));
        process.exit(1);
      }
      setConfig(key as any, value);
      console.log(chalk.green(`✓ ${key} set.`));
    });
}
