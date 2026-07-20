import { Command } from "commander";
import chalk from "chalk";
import { getClient, getProjectId } from "../lib/client.js";
import { formatDate } from "../lib/format.js";
import type { NeonBranch } from "../lib/neon-api.js";

interface BranchNode {
  branch: NeonBranch;
  children: BranchNode[];
  depth: number;
}

function buildTree(
  branches: NeonBranch[],
  parentId: string | null,
  depth: number,
  visited: Set<string>
): BranchNode[] {
  const nodes: BranchNode[] = [];
  for (const b of branches) {
    const pid = b.parent_id ?? null;
    if (pid === parentId && !visited.has(b.id)) {
      visited.add(b.id);
      const children = buildTree(branches, b.id, depth + 1, visited);
      nodes.push({ branch: b, children, depth });
    }
  }
  return nodes.sort((a, b) =>
    a.branch.created_at.localeCompare(b.branch.created_at)
  );
}

function renderTree(nodes: BranchNode[], prefix = ""): string[] {
  const lines: string[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const isLast = i === nodes.length - 1;
    const node = nodes[i];
    const connector = isLast ? "└── " : "├── ";
    const childPrefix = isLast ? "    " : "│   ";

    const tag = node.branch.default ? chalk.cyan(" [default]") : "";
    const protectedTag = node.branch.protected ? chalk.yellow(" [protected]") : "";
    const size = node.branch.logical_size ?? node.branch.physical_size;
    const sizeStr = size
      ? chalk.dim(
          ` (${(size / 1024 / 1024).toFixed(1)} MB)`
        )
      : "";

    lines.push(
      `${prefix}${connector}${chalk.green(node.branch.name)}${tag}${protectedTag}${sizeStr}`
    );

    const childLines = renderTree(node.children, prefix + childPrefix);
    lines.push(...childLines);
  }
  return lines;
}

function findLineage(
  branches: NeonBranch[],
  branchId: string,
  ancestors: NeonBranch[] = []
): NeonBranch[] {
  const branch = branches.find((b) => b.id === branchId);
  if (!branch) return ancestors;
  ancestors.unshift(branch);
  if (branch.parent_id) {
    return findLineage(branches, branch.parent_id, ancestors);
  }
  return ancestors;
}

export function registerTimelineCmd(program: Command) {
  program
    .command("timeline [branch]")
    .description("Show branch lineage as a tree or ancestry chain")
    .option("-p, --project <id>", "Project ID")
    .option("--json", "Output as JSON")
    .addHelpText(
      "after",
      `
Examples:
   db timeline                 Show full branch tree for the project
   db timeline feat/awesome    Show ancestry chain for a specific branch
   db timeline --json          Output branch tree as JSON
      `
    )
    .action(async (branchArg, options) => {
      const client = getClient();
      const projectId = await getProjectId(options.project);

      const spinner = (await import("ora")).default;
      const sp = spinner("Fetching branches…").start();

      try {
        const res = await client.listBranches(projectId);
        const branches = res.branches ?? [];
        sp.stop();

        if (branches.length === 0) {
          console.log(chalk.dim("\n  No branches found in this project.\n"));
          return;
        }

        // Build a lookup by ID/name
        const byName = new Map<string, NeonBranch>();
        for (const b of branches) {
          byName.set(b.name, b);
          byName.set(b.id, b);
        }

        if (branchArg) {
          // Show lineage for a specific branch
          const target = byName.get(branchArg);
          if (!target) {
            console.error(
              chalk.red(`\n  Branch "${branchArg}" not found.\n`)
            );
            process.exit(1);
          }

          const lineage = findLineage(branches, target.id);

          if (options.json) {
            console.log(JSON.stringify(lineage, null, 2));
            return;
          }

          console.log(
            chalk.bold(`\n  Lineage of ${chalk.green(target.name)}\n`)
          );
          for (let i = 0; i < lineage.length; i++) {
            const b = lineage[i];
            const prefix = i === lineage.length - 1 ? "└── " : "├── ";
            const tag = b.default ? chalk.cyan(" [default]") : "";
            console.log(
              `  ${prefix}${chalk.green(b.name)}${tag} ${chalk.dim(
                formatDate(b.created_at)
              )}`
            );
            if (i < lineage.length - 1) {
              console.log(`  │   ${chalk.dim("parent")}`);
            }
          }
          console.log();
        } else {
          // Show full tree
          const roots = buildTree(branches, null, 0, new Set());

          if (options.json) {
            console.log(JSON.stringify(roots, null, 2));
            return;
          }

          console.log(chalk.bold("\n  Branch Timeline\n"));
          if (roots.length === 0) {
            console.log(chalk.dim("  (no root branches — all have parents)\n"));
          }
          const lines = renderTree(roots);
          console.log(lines.join("\n"));
          console.log();
        }
      } catch (err) {
        sp.stop();
        console.error(
          chalk.red(
            `\n  Failed to build timeline: ${(err as Error).message}\n`
          )
        );
        process.exit(1);
      }
    });
}
