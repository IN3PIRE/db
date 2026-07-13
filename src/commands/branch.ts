import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { getClient, getProjectId, resolveBranch } from "../lib/client.js";
import { renderBranchTable, renderBranchDetail, renderDiff } from "../lib/format.js";
import { computeSchemaDiff } from "../lib/schema-diff.js";

export function registerBranchCmd(program: Command) {
  const branch = program
    .command("branch")
    .alias("br")
    .description("Manage database branches");

  // -- list -------------------------------------------------------------------
  branch
    .command("list")
    .description("List all branches in a project")
    .option("-p, --project <id>", "Project ID")
    .option("--json", "Output in JSON format (no spinner)")
    .action(async (options) => {
      const spinner = ora("Fetching branches…").start();
      try {
        const client = getClient();
        const projectId = await getProjectId(options.project);
        const res = await client.listBranches(projectId);
        spinner.stop();

        if (options.json) {
          const out = {
            branches: res.branches.map((b: any) => ({
              id: b.id,
              name: b.name,
              project_id: b.project_id,
              parent_id: b.parent_id ?? null,
              branch_type: b.branch_type ?? "branch",
              state: b.state ?? "active",
              logical_size: b.logical_size ?? null,
              cpu_seconds_used: b.cpu_seconds_used ?? 0,
              created_at: b.created_at,
              updated_at: b.updated_at,
            })),
            total: res.branches.length,
          };
          console.log(JSON.stringify(out, null, 2));
          return;
        }

        if (!res.branches || res.branches.length === 0) {
          console.log(chalk.dim("No branches found."));
          return;
        }

        console.log(renderBranchTable(res.branches));
        console.log(
          chalk.dim(`\n  ${res.branches.length} branch(es) total\n`)
        );
      } catch (err) {
        spinner.fail("Failed to list branches");
        console.error(chalk.red(`  ${(err as Error).message}`));
        process.exit(1);
      }
    });

  // -- create -----------------------------------------------------------------
  branch
    .command("create")
    .description("Create a new database branch")
    .argument("<name>", "Branch name")
    .option("-p, --project <id>", "Project ID")
    .option("-f, --from <branch>", "Parent branch name or ID")
    .option("--latest", "Create from latest snapshot")
    .action(async (name, options) => {
      // Issue #15: validate branch name
      if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(name)) {
        console.error(
          chalk.red(
            "Invalid branch name. Must start with a letter or number and contain only letters, numbers, hyphens, underscores, and dots."
          )
        );
        process.exit(1);
      }

      const spinner = ora("Creating branch…").start();
      try {
        const client = getClient();
        const projectId = await getProjectId(options.project);

        let parentId: string | undefined;

        // Resolve parent branch
        if (options.from) {
          const parent = await resolveBranch(client, projectId, options.from);
          parentId = parent.id;
        }

        const res = await client.createBranch(projectId, name, parentId);
        spinner.stop();

        const b = res.branch;
        if (b) {
          console.log(chalk.green(`\n  ✓ Branch "${name}" created\n`));
          console.log(renderBranchDetail(b));
          // Also print connection hint
          console.log(
            chalk.dim(
              `\n  Connect: db connect ${b.id} --project ${projectId}`
            )
          );
        }
      } catch (err) {
        spinner.fail("Failed to create branch");
        console.error(chalk.red(`  ${(err as Error).message}`));
        process.exit(1);
      }
    });

  // -- delete -----------------------------------------------------------------
  branch
    .command("delete")
    .alias("rm")
    .description("Delete a database branch")
    .argument("<name-or-id>", "Branch name or ID")
    .option("-p, --project <id>", "Project ID")
    .option("-f, --force", "Skip confirmation")
    .action(async (identifier, options) => {
      try {
        const client = getClient();
        const projectId = await getProjectId(options.project);

        const branch = await resolveBranch(client, projectId, identifier);

        if (!options.force) {
          const readline = (await import("node:readline")).default;
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });
          const answer = await new Promise<string>((resolve) =>
            rl.question(
              chalk.yellow(
                `Delete branch "${branch.name}" (${branch.id.substring(0, 8)}…)? [y/N] `
              ),
              resolve
            )
          );
          rl.close();
          if (answer.toLowerCase() !== "y") {
            console.log(chalk.dim("Cancelled."));
            return;
          }
        }

        const spinner = ora("Deleting branch…").start();
        await client.deleteBranch(projectId, branch.id);
        spinner.stop();
        console.log(chalk.green(`✓ Branch "${branch.name}" deleted.`));
      } catch (err) {
        console.error(chalk.red(`  ${(err as Error).message}`));
        process.exit(1);
      }
    });

  // -- rename -----------------------------------------------------------------
  branch
    .command("rename")
    .description("Rename a branch")
    .argument("<old-name>", "Current branch name or ID")
    .argument("<new-name>", "New branch name")
    .option("-p, --project <id>", "Project ID")
    .action(async (oldName, newName, options) => {
      const spinner = ora("Renaming branch…").start();
      try {
        const client = getClient();
        const projectId = await getProjectId(options.project);

        const branch = await resolveBranch(client, projectId, oldName);

        await client.updateBranch(projectId, branch.id, { name: newName });
        spinner.stop();
        console.log(
          chalk.green(`✓ Branch renamed: "${oldName}" → "${newName}"`)
        );
      } catch (err) {
        spinner.fail("Failed to rename branch");
        console.error(chalk.red(`  ${(err as Error).message}`));
        process.exit(1);
      }
    });

  // -- inspect ----------------------------------------------------------------
  branch
    .command("inspect")
    .description("Show detailed branch information")
    .argument("<name-or-id>", "Branch name or ID")
    .option("-p, --project <id>", "Project ID")
    .action(async (identifier, options) => {
      const spinner = ora("Fetching branch details…").start();
      try {
        const client = getClient();
        const projectId = await getProjectId(options.project);

        const branch = await resolveBranch(client, projectId, identifier);

        spinner.stop();
        console.log(renderBranchDetail(branch));
        console.log(); // trailing newline
      } catch (err) {
        spinner.fail("Failed to inspect branch");
        console.error(chalk.red(`  ${(err as Error).message}`));
        process.exit(1);
      }
    });

  // -- diff -------------------------------------------------------------------
  branch
    .command("diff")
    .description("Show schema diff between two branches")
    .argument("<branch-a>", "First branch name or ID")
    .argument("[branch-b]", "Second branch name or ID (default: parent)")
    .option("-p, --project <id>", "Project ID")
    .option("--schema <schema>", "Database schema to compare (default: public)")
    .action(async (branchA, branchB, options) => {
      const spinner = ora("Computing diff…").start();
      try {
        const client = getClient();
        const projectId = await getProjectId(options.project);

        const bA = await resolveBranch(client, projectId, branchA);

        let bB: { id: string; name: string };
        if (branchB) {
          bB = await resolveBranch(client, projectId, branchB);
        } else {
          const res = await client.listBranches(projectId);
          const main = res.branches?.find((b) => b.name === "main");
          if (main) {
            bB = main;
          } else if (res.branches && res.branches.length > 0) {
            bB = res.branches[0];
          } else {
            spinner.fail("No reference branch found");
            process.exit(1);
          }
        }

        spinner.text = "Fetching connection strings…";
        const [connA, connB] = await Promise.all([
          client.getConnectionString(projectId, bA.id),
          client.getConnectionString(projectId, bB.id),
        ]);

        spinner.text = "Comparing schemas…";
        const schema = options.schema || "public";
        const diffs = await computeSchemaDiff(connA, connB, schema);

        spinner.stop();
        console.log(renderDiff(bA.name, bB.name, diffs));
      } catch (err) {
        spinner.fail("Failed to compute diff");
        console.error(chalk.red(`  ${(err as Error).message}`));
        process.exit(1);
      }
    });
}
