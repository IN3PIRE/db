import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { getClient, getProjectId } from "../lib/client.js";
import { setConfig, getConfig } from "../lib/config.js";

export function registerProjectCmd(program: Command) {
  const project = program
    .command("project")
    .alias("proj")
    .description("Manage Neon projects");

  project
    .command("list")
    .description("List all projects")
    .option("--json", "Output in JSON format")
    .action(async (options) => {
      const spinner = ora("Fetching projects…").start();
      try {
        const client = getClient();
        const res = await client.listProjects();
        spinner.stop();

        const projects = res.projects ?? [];

        if (options.json) {
          console.log(JSON.stringify(projects, null, 2));
          return;
        }

        if (projects.length === 0) {
          console.log(chalk.dim("No projects found."));
          return;
        }

        const currentId = getConfig().NEON_PROJECT_ID;
        console.log(chalk.bold(`\n  Projects (${projects.length})\n`));
        for (const p of projects) {
          const isCurrent = p.id === currentId;
          const marker = isCurrent ? chalk.green("✓ ") : "  ";
          console.log(`  ${marker}${chalk.cyan(p.name)}  ${chalk.dim(p.id)}  ${chalk.dim(p.region_id)}`);
        }
        console.log();
      } catch (err) {
        spinner.fail("Failed to list projects");
        console.error(chalk.red(`  ${(err as Error).message}`));
        process.exit(1);
      }
    });

  project
    .command("switch")
    .description("Switch the default project")
    .argument("<project-id>", "Neon project ID")
    .action((projectId) => {
      setConfig("NEON_PROJECT_ID", projectId);
      console.log(chalk.green(`✓ Default project switched to: ${projectId}`));
    });

  project
    .command("current")
    .description("Show the current project")
    .action(() => {
      const id = getConfig().NEON_PROJECT_ID || process.env.NEON_PROJECT_ID;
      if (id) {
        console.log(chalk.cyan(id));
      } else {
        console.log(chalk.dim("No project set. Use: db project switch <id>"));
      }
    });

  project
    .command("inspect")
    .description("Show details about the current project")
    .option("-p, --project <id>", "Project ID")
    .option("--json", "Output in JSON format")
    .action(async (options) => {
      const spinner = ora("Fetching project details…").start();
      try {
        const client = getClient();
        const projectId = await getProjectId(options.project);

        const [branchesRes, endpointsRes] = await Promise.all([
          client.listBranches(projectId),
          client.listEndpoints(projectId),
        ]);

        spinner.stop();

        const branches = branchesRes.branches ?? [];
        const endpoints = endpointsRes.endpoints ?? [];

        if (options.json) {
          const projectData = {
            project_id: projectId,
            branches,
            endpoints,
          };
          console.log(JSON.stringify(projectData, null, 2));
          return;
        }

        console.log(chalk.bold(`\n  Project: ${projectId}\n`));
        console.log(`  ${chalk.dim("Branches:")}   ${branches.length}`);
        console.log(`  ${chalk.dim("Endpoints:")}  ${endpoints.length}`);
        console.log();

        for (const ep of endpoints) {
          const branch = branches.find((b) => b.id === ep.branch_id);
          console.log(`  ${chalk.green(ep.host)}:${ep.port}  ${chalk.dim(ep.type)}  ${chalk.dim(branch?.name ?? ep.branch_id.substring(0, 8))}`);
        }
        console.log();
      } catch (err) {
        spinner.fail("Failed to inspect project");
        console.error(chalk.red(`  ${(err as Error).message}`));
        process.exit(1);
      }
    });
}

