import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import pg from "pg";
import { getClient, getProjectId, resolveBranch } from "../lib/client.js";
import {
  isBranchProtected,
  addProtectedBranch,
  removeProtectedBranch,
  getTag,
  setTag,
  removeTag,
  addLogEntry,
} from "../lib/config.js";
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
    .option("--tags", "Show local tags alongside branches")
    .action(async (options) => {
      const spinner = ora("Fetching branches…").start();
      try {
        const client = getClient();
        const projectId = await getProjectId(options.project);
        const res = await client.listBranches(projectId);
        const branches = res.branches ?? [];
        spinner.stop();

        if (options.json) {
          const out = {
            branches: branches.map((b: any) => ({
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
              protected: isBranchProtected(b.name),
              tag: getTag(b.name) ?? null,
            })),
            total: branches.length,
          };
          console.log(JSON.stringify(out, null, 2));
          return;
        }

        if (branches.length === 0) {
          console.log(chalk.dim("No branches found."));
          return;
        }

        console.log(renderBranchTable(branches));
        // Show tags & protection markers
        for (const b of branches) {
          const tag = getTag(b.name);
          const prot = isBranchProtected(b.name);
          if (tag || prot) {
            const parts: string[] = [];
            if (prot) parts.push(chalk.yellow("🔒 protected"));
            if (tag) parts.push(chalk.cyan(`🏷 ${tag}`));
            console.log(`  ${chalk.dim(b.name)}  ${parts.join("  ")}`);
          }
        }
        console.log(chalk.dim(`\n  ${branches.length} branch(es) total\n`));
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
          console.log(chalk.dim(`\n  Connect: db connect ${b.id} --project ${projectId}`));
        }

        addLogEntry({
          timestamp: new Date().toISOString(),
          action: "create",
          branch: name,
          detail: options.from ? `from ${options.from}` : undefined,
        });
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
    .option("-y, --yes", "Skip confirmation (alias for --force)")
    .action(async (identifier, options) => {
      try {
        const client = getClient();
        const projectId = await getProjectId(options.project);

        const branch = await resolveBranch(client, projectId, identifier);

        if (isBranchProtected(branch.name)) {
          console.error(chalk.red(`Branch "${branch.name}" is protected. Unprotect it first with: db branch unprotect ${branch.name}`));
          process.exit(1);
        }

        if (!(options.force || options.yes)) {
          const readline = (await import("node:readline")).default;
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });
          const answer = await new Promise<string>((resolve) =>
            rl.question(
              chalk.yellow(`Delete branch "${branch.name}" (${branch.id.substring(0, 8)}…)? [y/N] `),
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

        addLogEntry({
          timestamp: new Date().toISOString(),
          action: "delete",
          branch: branch.name,
        });
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
      let spinner: ReturnType<typeof ora> | undefined;
      try {
        const client = getClient();
        const projectId = await getProjectId(options.project);
        const branch = await resolveBranch(client, projectId, oldName);

        if (isBranchProtected(branch.name)) {
          console.error(chalk.red(`Branch "${branch.name}" is protected. Unprotect it first with: db branch unprotect ${branch.name}`));
          process.exit(1);
        }

        spinner = ora("Renaming branch…").start();
        await client.updateBranch(projectId, branch.id, { name: newName });
        spinner.stop();
        console.log(chalk.green(`✓ Branch renamed: "${oldName}" → "${newName}"`));

        addLogEntry({
          timestamp: new Date().toISOString(),
          action: "rename",
          branch: oldName,
          detail: `to ${newName}`,
        });
      } catch (err) {
        spinner?.fail("Failed to rename branch");
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
        const tag = getTag(branch.name);
        if (tag) console.log(`  ${chalk.dim("Tag:")}       ${chalk.cyan(tag)}`);
        if (isBranchProtected(branch.name)) console.log(`  ${chalk.dim("Status:")}    ${chalk.yellow("protected")}`);
        console.log();
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
          const branches = res.branches ?? [];
          const main = branches.find((b) => b.name === "main");
          if (main) {
            bB = main;
          } else if (branches.length > 0) {
            bB = branches[0];
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

  // -- protect ----------------------------------------------------------------
  branch
    .command("protect")
    .description("Protect a branch from accidental deletion or rename")
    .argument("<name-or-id>", "Branch name or ID")
    .option("-p, --project <id>", "Project ID")
    .action(async (identifier, options) => {
      try {
        const client = getClient();
        const projectId = await getProjectId(options.project);
        const branch = await resolveBranch(client, projectId, identifier);
        addProtectedBranch(branch.name);
        console.log(chalk.green(`✓ Branch "${branch.name}" is now protected.`));
      } catch (err) {
        console.error(chalk.red(`  ${(err as Error).message}`));
        process.exit(1);
      }
    });

  // -- unprotect --------------------------------------------------------------
  branch
    .command("unprotect")
    .description("Remove protection from a branch")
    .argument("<name-or-id>", "Branch name or ID")
    .option("-p, --project <id>", "Project ID")
    .action(async (identifier, options) => {
      try {
        const client = getClient();
        const projectId = await getProjectId(options.project);
        const branch = await resolveBranch(client, projectId, identifier);
        removeProtectedBranch(branch.name);
        console.log(chalk.green(`✓ Protection removed from "${branch.name}".`));
      } catch (err) {
        console.error(chalk.red(`  ${(err as Error).message}`));
        process.exit(1);
      }
    });

  // -- tag --------------------------------------------------------------------
  branch
    .command("tag")
    .description("Tag a branch with a label for easier identification")
    .argument("<name-or-id>", "Branch name or ID")
    .argument("<tag>", "Tag label")
    .option("-p, --project <id>", "Project ID")
    .action(async (identifier, tag, options) => {
      try {
        const client = getClient();
        const projectId = await getProjectId(options.project);
        const branch = await resolveBranch(client, projectId, identifier);
        setTag(branch.name, tag);
        console.log(chalk.green(`✓ Tag "${tag}" set on branch "${branch.name}".`));
      } catch (err) {
        console.error(chalk.red(`  ${(err as Error).message}`));
        process.exit(1);
      }
    });

  // -- untag ------------------------------------------------------------------
  branch
    .command("untag")
    .description("Remove a tag from a branch")
    .argument("<name-or-id>", "Branch name or ID")
    .option("-p, --project <id>", "Project ID")
    .action(async (identifier, options) => {
      try {
        const client = getClient();
        const projectId = await getProjectId(options.project);
        const branch = await resolveBranch(client, projectId, identifier);
        removeTag(branch.name);
        console.log(chalk.green(`✓ Tag removed from "${branch.name}".`));
      } catch (err) {
        console.error(chalk.red(`  ${(err as Error).message}`));
        process.exit(1);
      }
    });

  // -- tables -----------------------------------------------------------------
  branch
    .command("tables")
    .description("List all tables in a branch")
    .argument("<name-or-id>", "Branch name or ID")
    .option("-p, --project <id>", "Project ID")
    .option("--schema <schema>", "Database schema (default: public)")
    .action(async (identifier, options) => {
      const spinner = ora("Fetching tables…").start();
      try {
        const client = getClient();
        const projectId = await getProjectId(options.project);
        const branch = await resolveBranch(client, projectId, identifier);
        const connStr = await client.getConnectionString(projectId, branch.id);
        const schema = options.schema || "public";

        const pgClient = new pg.Client(connStr);
        await pgClient.connect();
        const res = await pgClient.query(
          `SELECT table_name, table_type
           FROM information_schema.tables
           WHERE table_schema = $1
           ORDER BY table_name`,
          [schema]
        );
        await pgClient.end();
        spinner.stop();

        if (res.rows.length === 0) {
          console.log(chalk.dim(`No tables found in schema "${schema}".`));
          return;
        }
        console.log(chalk.bold(`\n  Tables in ${branch.name} (${schema}):\n`));
        for (const row of res.rows) {
          console.log(`  ${chalk.green(row.table_name)}  ${chalk.dim(row.table_type)}`);
        }
        console.log(chalk.dim(`\n  ${res.rows.length} table(s)\n`));
      } catch (err) {
        spinner.fail("Failed to list tables");
        console.error(chalk.red(`  ${(err as Error).message}`));
        process.exit(1);
      }
    });

  // -- set-default ------------------------------------------------------------
  branch
    .command("set-default")
    .description("Set a branch as the project default")
    .argument("<name-or-id>", "Branch name or ID")
    .option("-p, --project <id>", "Project ID")
    .action(async (identifier, options) => {
      const spinner = ora("Setting default branch…").start();
      try {
        const client = getClient();
        const projectId = await getProjectId(options.project);
        const branch = await resolveBranch(client, projectId, identifier);
        await client.setDefaultBranch(projectId, branch.id);
        spinner.stop();
        console.log(chalk.green(`✓ Branch "${branch.name}" is now the project default.`));
        addLogEntry({ timestamp: new Date().toISOString(), action: "set-default", branch: branch.name });
      } catch (err) {
        spinner.fail("Failed to set default branch");
        console.error(chalk.red(`  ${(err as Error).message}`));
        process.exit(1);
      }
    });

  // -- set-expiration ---------------------------------------------------------
  branch
    .command("set-expiration")
    .description("Set auto-deletion TTL on a branch (ISO date or 'never')")
    .argument("<name-or-id>", "Branch name or ID")
    .argument("<expires-at>", 'Expiration ISO date (e.g. 2026-08-01T00:00:00Z) or "never" to clear')
    .option("-p, --project <id>", "Project ID")
    .action(async (identifier, expiresAt, options) => {
      const spinner = ora("Setting branch expiration…").start();
      try {
        const client = getClient();
        const projectId = await getProjectId(options.project);
        const branch = await resolveBranch(client, projectId, identifier);
        const value = expiresAt === "never" ? null : expiresAt;
        await client.setBranchExpiration(projectId, branch.id, value);
        spinner.stop();
        if (value) {
          console.log(chalk.green(`✓ Branch "${branch.name}" will expire at ${value}.`));
        } else {
          console.log(chalk.green(`✓ Expiration cleared for branch "${branch.name}".`));
        }
        addLogEntry({ timestamp: new Date().toISOString(), action: "set-expiration", branch: branch.name, detail: value ?? "cleared" });
      } catch (err) {
        spinner.fail("Failed to set expiration");
        console.error(chalk.red(`  ${(err as Error).message}`));
        process.exit(1);
      }
    });

  // -- schema -----------------------------------------------------------------
  branch
    .command("schema")
    .description("Show full schema details (tables, columns, types, indexes) for a branch")
    .argument("<name-or-id>", "Branch name or ID")
    .option("-p, --project <id>", "Project ID")
    .option("--schema <schema>", "Database schema (default: public)")
    .option("--json", "Output in JSON format")
    .action(async (identifier, options) => {
      const spinner = ora("Fetching schema…").start();
      try {
        const client = getClient();
        const projectId = await getProjectId(options.project);
        const branch = await resolveBranch(client, projectId, identifier);
        const connStr = await client.getConnectionString(projectId, branch.id);
        const schema = options.schema || "public";

        const pgClient = new pg.Client(connStr);
        await pgClient.connect();

        const [tablesRes, columnsRes, indexesRes] = await Promise.all([
          pgClient.query(
            `SELECT table_name, table_type
             FROM information_schema.tables
             WHERE table_schema = $1
             ORDER BY table_name`,
            [schema]
          ),
          pgClient.query(
            `SELECT c.table_name, c.column_name, c.data_type, c.is_nullable,
                    c.column_default, c.character_maximum_length
             FROM information_schema.columns c
             WHERE c.table_schema = $1
             ORDER BY c.table_name, c.ordinal_position`,
            [schema]
          ),
          pgClient.query(
            `SELECT tablename, indexname, indexdef
             FROM pg_indexes
             WHERE schemaname = $1
             ORDER BY tablename, indexname`,
            [schema]
          ),
        ]);

        await pgClient.end();
        spinner.stop();

        if (options.json) {
          const out = {
            branch: branch.name,
            schema,
            tables: tablesRes.rows.map((t: any) => ({
              name: t.table_name,
              type: t.table_type,
              columns: columnsRes.rows
                .filter((c: any) => c.table_name === t.table_name)
                .map((c: any) => ({
                  name: c.column_name,
                  type: c.data_type,
                  nullable: c.is_nullable === "YES",
                  default: c.column_default,
                  max_length: c.character_maximum_length,
                })),
              indexes: indexesRes.rows
                .filter((ix: any) => ix.tablename === t.table_name)
                .map((ix: any) => ({
                  name: ix.indexname,
                  definition: ix.indexdef,
                })),
            })),
          };
          console.log(JSON.stringify(out, null, 2));
          return;
        }

        if (tablesRes.rows.length === 0) {
          console.log(chalk.dim(`No tables found in schema "${schema}".`));
          return;
        }

        console.log(chalk.bold(`\n  Schema: ${branch.name} (${schema})\n`));
        for (const t of tablesRes.rows) {
          console.log(`  ${chalk.green("📦 " + t.table_name)}  ${chalk.dim(t.table_type)}`);
          const cols = columnsRes.rows.filter((c: any) => c.table_name === t.table_name);
          for (const c of cols) {
            const nullable = c.is_nullable === "YES" ? chalk.dim(" NULL") : chalk.yellow(" NOT NULL");
            const def = c.column_default ? chalk.cyan(` DEFAULT ${c.column_default}`) : "";
            console.log(`    ${chalk.blue("│")} ${chalk.white(c.column_name)}  ${chalk.magenta(c.data_type)}${nullable}${def}`);
          }
          const ix = indexesRes.rows.filter((ix: any) => ix.tablename === t.table_name);
          for (const i of ix) {
            console.log(`    ${chalk.yellow("├")} ${chalk.dim("INDEX")} ${i.indexname}`);
          }
          console.log();
        }
        console.log(chalk.dim(`  ${tablesRes.rows.length} table(s), ${columnsRes.rows.length} column(s), ${indexesRes.rows.length} index(es)\n`));
      } catch (err) {
        spinner.fail("Failed to fetch schema");
        console.error(chalk.red(`  ${(err as Error).message}`));
        process.exit(1);
      }
    });

  // -- merge ------------------------------------------------------------------
  branch
    .command("merge")
    .description("Merge schema changes from source branch into target branch")
    .argument("<source>", "Source branch (changes from)")
    .argument("<target>", "Target branch (changes into)")
    .option("-p, --project <id>", "Project ID")
    .option("--schema <schema>", "Database schema (default: public)")
    .option("--dry-run", "Show what would be done without applying changes")
    .action(async (source, target, options) => {
      const spinner = ora("Preparing merge…").start();
      try {
        const client = getClient();
        const projectId = await getProjectId(options.project);

        const src = await resolveBranch(client, projectId, source);
        const tgt = await resolveBranch(client, projectId, target);

        if (isBranchProtected(tgt.name)) {
          spinner.stop();
          console.error(chalk.red(`Target branch "${tgt.name}" is protected. Unprotect it first.`));
          process.exit(1);
        }

        spinner.text = "Fetching connection strings…";
        const [connSrc, connTgt] = await Promise.all([
          client.getConnectionString(projectId, src.id),
          client.getConnectionString(projectId, tgt.id),
        ]);

        const schema = options.schema || "public";
        spinner.text = "Comparing schemas…";
        const diffs = await computeSchemaDiff(connTgt, connSrc, schema);

        spinner.stop();
        console.log(renderDiff(src.name, tgt.name, diffs));

        if (diffs.length === 0) {
          console.log(chalk.green("✓ Branches are already in sync. Nothing to merge.\n"));
          return;
        }

        if (options.dryRun) {
          console.log(chalk.yellow("  (dry run — no changes applied)\n"));
          return;
        }

        // Apply changes to target
        const pgClient = new pg.Client(connTgt);
        await pgClient.connect();

        let applied = 0;
        for (const d of diffs) {
          if (d.type === "added") {
            // Table exists in source but not target — we can't recreate it from diff info alone
            console.log(chalk.yellow(`  ⚠ Table "${d.table}" exists in source but not target.`));
            console.log(chalk.dim(`    Create it manually or use: pg_dump --table ${d.table} ...`));
          }
        }

        // For column-level changes, generate ALTER TABLE statements
        for (const d of diffs) {
          if (d.type === "modified" && d.detail) {
            const changes = d.detail.split("; ");
            for (const change of changes) {
              const trimmed = change.trim();
              if (trimmed.startsWith("+ ")) {
                const colName = trimmed.slice(2).split(" (")[0];
                const colType = trimmed.slice(2).match(/\(([^)]+)\)/)?.[1] || "text";
                const sql = `ALTER TABLE "${schema}"."${d.table}" ADD COLUMN "${colName}" ${colType};`;
                try {
                  await pgClient.query(sql);
                  console.log(chalk.green(`  ✓ ${sql}`));
                  applied++;
                } catch (e) {
                  console.log(chalk.red(`  ✗ ${sql} — ${(e as Error).message}`));
                }
              }
            }
          }
        }

        await pgClient.end();
        console.log(chalk.green(`\n  ✓ Merge complete. ${applied} change(s) applied.\n`));

        addLogEntry({
          timestamp: new Date().toISOString(),
          action: "merge",
          branch: target,
          detail: `from ${source} (${applied} changes)`,
        });
      } catch (err) {
        spinner.fail("Merge failed");
        console.error(chalk.red(`  ${(err as Error).message}`));
        process.exit(1);
      }
    });

  // -- search ----------------------------------------------------------------
  branch
    .command("search")
    .description("Search branches by name pattern")
    .argument("<pattern>", "Branch name pattern (case-insensitive substring match)")
    .option("-p, --project <id>", "Project ID")
    .option("--json", "Output in JSON format")
    .option("--tags", "Show local tags alongside branches")
    .action(async (pattern, options) => {
      const spinner = ora("Searching branches…").start();
      try {
        const client = getClient();
        const projectId = await getProjectId(options.project);
        const res = await client.listBranches(projectId);
        const branches = res.branches ?? [];
        spinner.stop();

        const re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        const matches = branches.filter((b) => re.test(b.name));

        if (matches.length === 0) {
          console.log(chalk.dim(`No branches matching "${pattern}".`));
          return;
        }

        if (options.json) {
          const out = {
            pattern,
            matches: matches.map((b) => ({
              id: b.id,
              name: b.name,
              project_id: b.project_id,
              parent_id: b.parent_id ?? null,
              logical_size: b.logical_size ?? null,
              created_at: b.created_at,
              updated_at: b.updated_at,
              protected: isBranchProtected(b.name),
              tag: getTag(b.name) ?? null,
            })),
            total: matches.length,
          };
          console.log(JSON.stringify(out, null, 2));
          return;
        }

        console.log(chalk.bold(`\n  Branches matching "${pattern}" (${matches.length}):\n`));
        console.log(renderBranchTable(matches));

        for (const b of matches) {
          const tag = getTag(b.name);
          const prot = isBranchProtected(b.name);
          if (tag || prot) {
            const parts: string[] = [];
            if (prot) parts.push(chalk.yellow("protected"));
            if (tag) parts.push(chalk.cyan(`tag: ${tag}`));
            console.log(`  ${chalk.dim(b.name)}  ${parts.join("  ")}`);
          }
        }
        console.log();
      } catch (err) {
        spinner.fail("Search failed");
        console.error(chalk.red(`  ${(err as Error).message}`));
        process.exit(1);
      }
    });
}
