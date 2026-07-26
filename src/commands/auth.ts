import { Command } from "commander";
import chalk from "chalk";
import { setConfig, getConfig, clearConfig, resolveApiKey } from "../lib/config.js";

export function registerAuthCmd(program: Command) {
  const auth = program.command("auth").description("Manage authentication");

  auth
    .command("login")
    .description("Authenticate with your Neon API key")
    .addHelpText("after", `
Examples:
   db auth login
   db auth login nq_abc123def456
  `)
    .argument("[api-key]", "Your Neon API key (will prompt if not provided)")
    .action(async (apiKey?: string) => {
      if (apiKey) {
        setConfig("NEON_API_KEY", apiKey);
        console.log(chalk.green("✓ API key saved."));
        return;
      }

      // Try env
      const envKey = process.env.NEON_API_KEY;
      if (envKey) {
        setConfig("NEON_API_KEY", envKey);
        console.log(chalk.green("✓ API key loaded from NEON_API_KEY env var."));
        return;
      }

      // Prompt
      const readline = (await import("node:readline")).default;
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question("Paste your Neon API key: ", (answer) => {
        const trimmed = answer.trim();
        if (!trimmed) {
          console.log(chalk.red("No API key provided."));
        } else {
          setConfig("NEON_API_KEY", trimmed);
          console.log(chalk.green("✓ API key saved."));
        }
        rl.close();
      });
    });

  auth
    .command("status")
    .description("Show authentication status")
    .addHelpText("after", `
Examples:
   db auth status
  `)
    .action(() => {
      const cfg = getConfig();
      const key = cfg.NEON_API_KEY || process.env.NEON_API_KEY;
      const project = cfg.NEON_PROJECT_ID || process.env.NEON_PROJECT_ID;

      console.log(chalk.bold("\n  Auth Status"));
      console.log(
        `  ${chalk.dim("API Key:")}    ${
          key ? chalk.green("✓ configured") : chalk.red("✗ not set")
        }`
      );
      console.log(
        `  ${chalk.dim("Project ID:")}  ${
          project ? chalk.green("✓ " + project) : chalk.dim("— not set")
        }`
      );
      console.log(
        `  ${chalk.dim("Source:")}     ${
          cfg.NEON_API_KEY
            ? "config file"
            : process.env.NEON_API_KEY
              ? "environment"
              : "—"
        }\n`
      );
    });

  auth
    .command("logout")
    .description("Remove stored credentials")
    .addHelpText("after", `
Examples:
   db auth logout
  `)
    .action(() => {
      clearConfig();
      console.log(chalk.green("✓ Credentials cleared."));
    });

  auth
    .command("set-project")
    .description("Set the default Neon project ID")
    .addHelpText("after", `
Examples:
   db auth set-project proj_abc123
  `)
    .argument("<project-id>", "Your Neon project ID")
    .action((projectId: string) => {
      setConfig("NEON_PROJECT_ID", projectId);
      console.log(chalk.green(`✓ Default project set to: ${projectId}`));
    });
}
