import { Command } from "commander";
import chalk from "chalk";
import { getClient, getProjectId } from "../lib/client.js";
import { resolveApiKey, resolveProjectId, getConfig } from "../lib/config.js";

export function registerDoctorCmd(program: Command) {
  program
    .command("doctor")
    .description("Diagnose configuration and API connectivity")
    .option("-p, --project <id>", "Project ID")
    .action(async (options) => {
      console.log(chalk.bold("\n  🔍 db doctor — diagnostic report\n"));
      let allOk = true;

      const check = (label: string, ok: boolean, detail?: string) => {
        const icon = ok ? chalk.green("✓") : chalk.red("✗");
        console.log(`  ${icon}  ${chalk.bold(label)}`);
        if (detail) console.log(`       ${chalk.dim(detail)}`);
        if (!ok) allOk = false;
      };

      check("Node.js version", process.versions.node ? true : false, process.versions.node);

      const apiKey = resolveApiKey();
      check("API key configured", !!apiKey, apiKey ? `${apiKey.substring(0, 8)}…${apiKey.slice(-4)}` : "Set with: db auth login");

      const projectId = resolveProjectId() || options.project;
      check("Project ID set", !!projectId, projectId || "Set with: db project switch <id>");

      const config = getConfig();
      const hasProtected = config.protected_branches.length > 0;
      const hasTags = Object.keys(config.branch_tags).length > 0;
      const hasHistory = config.history.length > 0;
      check("Local config valid", true, [
        hasProtected ? `${config.protected_branches.length} protected` : "",
        hasTags ? `${Object.keys(config.branch_tags).length} tags` : "",
        hasHistory ? `${config.history.length} log entries` : "",
      ].filter(Boolean).join(", ") || "defaults only");

      if (apiKey && projectId) {
        const spinner = (await import("ora")).default;
        const sp = spinner("Testing API connectivity…").start();
        try {
          const client = getClient();
          const pid = await getProjectId(options.project);
          const [branchesRes, endpointsRes] = await Promise.all([
            client.listBranches(pid),
            client.listEndpoints(pid),
          ]);
          sp.stop();
          const bCount = branchesRes.branches?.length ?? 0;
          const eCount = endpointsRes.endpoints?.length ?? 0;
          check("API connectivity", true, `${bCount} branch(es), ${eCount} endpoint(s)`);
        } catch (err) {
          sp.stop();
          check("API connectivity", false, (err as Error).message);
        }
      }

      console.log(allOk ? chalk.green("\n  ✓ All checks passed\n") : chalk.yellow("\n  ⚠ Some issues found — see above\n"));
    });
}
