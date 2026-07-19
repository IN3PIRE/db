import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";

const REPO = "IN3PIRE/db";

interface GitHubRelease {
  tag_name: string;
  prerelease: boolean;
  draft: boolean;
}

export function registerUpdateCmd(program: Command) {
  program
    .command("update")
    .description("Check for updates and update the CLI to the latest version")
    .option("--check", "Only check for updates, don't install")
    .option("--canary", "Update to the latest canary release")
    .action(async (options: { check?: boolean; canary?: boolean }) => {
      try {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const pkgPath = path.resolve(__dirname, "../../package.json");
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        const currentVersion = pkg.version as string;

        const spinner = ora("Checking for updates…").start();

        let latestTag: string;
        if (options.canary) {
          const res = await fetch(
            `https://api.github.com/repos/${REPO}/releases?per_page=10`
          );
          const releases = (await res.json()) as GitHubRelease[];
          const canary = releases.find(
            (r) => r.prerelease && !r.draft
          );
          latestTag = canary?.tag_name ?? "";
        } else {
          const res = await fetch(
            `https://api.github.com/repos/${REPO}/releases/latest`
          );
          const release = (await res.json()) as GitHubRelease;
          latestTag = release.tag_name ?? "";
        }

        spinner.stop();

        if (!latestTag) {
          console.log(chalk.yellow("No update available."));
          return;
        }

        const latestVersion = latestTag.replace(/^v/, "");

        if (currentVersion === latestVersion) {
          console.log(chalk.green(`✓ Already up to date (v${currentVersion}).`));
          return;
        }

        console.log(chalk.dim(`  Current: v${currentVersion}`));
        console.log(chalk.green(`  Latest:  v${latestVersion}`));

        if (options.check) {
          console.log(chalk.cyan("\n  Run `db update` to install the latest version."));
          return;
        }

        const installSpinner = ora("Updating CLI…").start();
        try {
          execSync("npm install -g @in3pire/db", {
            stdio: "pipe",
            env: { ...process.env, NODE_ENV: "production" },
          });
          installSpinner.stop();
          console.log(chalk.green(`\n  ✓ Updated to v${latestVersion}.`));
        } catch {
          installSpinner.fail("Update failed");
          console.log(
            chalk.yellow(
              "\n  Try running manually: npm install -g @in3pire/db"
            )
          );
        }
      } catch (err) {
        console.error(chalk.red(`  ${(err as Error).message}`));
        process.exit(1);
      }
    });
}
