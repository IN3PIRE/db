import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { getClient, getProjectId, resolveBranch } from "../lib/client.js";

export function registerCiCmd(program: Command) {
  const ci = program.command("ci").description("CI/CD integration commands");

  // -- preview ----------------------------------------------------------------
  ci.command("preview")
    .description("Create an ephemeral branch for a PR")
    .argument("<pr-number>", "Pull request number")
    .option("-p, --project <id>", "Project ID")
    .option("-f, --from <branch>", "Parent branch (default: main)")
    .action(async (prNumber, options) => {
      const spinner = ora(`Creating preview branch for PR #${prNumber}…`).start();
      try {
        const client = getClient();
        const projectId = await getProjectId(options.project);
        const branchName = `pr-${prNumber}`;

        // Resolve parent
        let parentId: string | undefined;
        if (options.from) {
          const parent = await resolveBranch(client, projectId, options.from);
          parentId = parent.id;
        }

        const res = await client.createBranch(
          projectId,
          branchName,
          parentId
        );

        const branch = res.branch;
        spinner.stop();
        console.log(
          chalk.green(`\n  ✓ Preview branch created: ${branchName}\n`)
        );
        if (branch) {
          console.log(`  ${chalk.dim("Branch ID:")}  ${branch.id}`);
          const connStr = await client.getConnectionString(
            projectId,
            branch.id
          );
          console.log(`  ${chalk.dim("DSN:")}       ${connStr}`);
          console.log(
            chalk.dim(
              `\n  TIP: Set NEON_BRANCH_ID=${branch.id} in your CI env.\n`
            )
          );
        }
      } catch (err) {
        spinner.fail("Failed to create preview branch");
        console.error(chalk.red(`  ${(err as Error).message}`));
        process.exit(1);
      }
    });

  // -- cleanup ----------------------------------------------------------------
  ci.command("cleanup")
    .description("Delete stale preview branches")
    .option("-p, --project <id>", "Project ID")
    .option("-d, --days <days>", "Delete branches older than N days", "7")
    .option("--dry-run", "Show what would be deleted without deleting")
    .action(async (options) => {
      const days = parseInt(options.days, 10);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const spinner = ora("Scanning for stale branches…").start();
      try {
        const client = getClient();
        const projectId = await getProjectId(options.project);
        const res = await client.listBranches(projectId);

        const staleBranches = (res.branches || []).filter((b) => {
          // Only target pr-* branches
          if (!b.name.startsWith("pr-")) return false;
          // Don't delete main
          if (b.name === "main") return false;
          const created = new Date(b.created_at);
          return created < cutoff;
        });

        spinner.stop();

        if (staleBranches.length === 0) {
          console.log(chalk.green("✓ No stale preview branches found."));
          return;
        }

        console.log(
          chalk.yellow(
            `\n  Found ${staleBranches.length} stale preview branch(es):\n`
          )
        );
        for (const b of staleBranches) {
          console.log(
            `  ${chalk.dim(b.id.substring(0, 8))}  ${b.name}  (created ${new Date(b.created_at).toLocaleDateString()})`
          );
        }

        if (options.dryRun) {
          console.log(chalk.dim("\n  (dry run — no branches deleted)\n"));
          return;
        }

        const deleteSpinner = ora("Deleting stale branches…").start();
        for (const b of staleBranches) {
          await client.deleteBranch(projectId, b.id);
        }
        deleteSpinner.stop();
        console.log(
          chalk.green(`\n  ✓ Deleted ${staleBranches.length} branch(es)\n`)
        );
      } catch (err) {
        spinner.fail("Cleanup failed");
        console.error(chalk.red(`  ${(err as Error).message}`));
        process.exit(1);
      }
    });

  // -- setup ------------------------------------------------------------------
  ci.command("setup")
    .description("Generate a GitHub Actions workflow for DB previews")
    .action(() => {
      const workflow = `name: Database Preview
on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Create preview branch
        if: github.event.action != 'closed'
        run: |
          npx @in3pire/db ci preview \${{ github.event.number }} \\
            --project \${{ secrets.NEON_PROJECT_ID }} \\
            --from main
        env:
          NEON_API_KEY: \${{ secrets.NEON_API_KEY }}

      - name: Teardown preview branch
        if: github.event.action == 'closed'
        run: |
          npx @in3pire/db branch delete pr-\${{ github.event.number }} --force
        env:
          NEON_API_KEY: \${{ secrets.NEON_API_KEY }}
`;

      console.log(
        chalk.green("\n  ✓ GitHub Actions workflow generated\n")
      );
      console.log(workflow);
      console.log(
        chalk.dim(
          "  Save this to .github/workflows/db-preview.yml in your repo.\n"
        )
      );
      console.log(
        chalk.dim(
          "  Set secrets: NEON_API_KEY and NEON_PROJECT_ID in your repo settings.\n"
        )
      );
    });
}
