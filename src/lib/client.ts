import chalk from "chalk";
import { NeonClient, type NeonBranch } from "./neon-api.js";
import { resolveApiKey, resolveProjectId } from "./config.js";

/**
 * Resolve the API key from config or env, exiting with a message if missing.
 */
export function getClient(): NeonClient {
  const key = resolveApiKey();
  if (!key) {
    console.error(chalk.red("No API key configured. Run: db auth login"));
    process.exit(1);
  }
  return new NeonClient(key);
}

/**
 * Resolve the project ID from flag, config, or env, exiting with a message if missing.
 */
export async function getProjectId(provided?: string): Promise<string> {
  if (provided) return provided;
  const id = resolveProjectId();
  if (!id) {
    console.error(
      chalk.red(
        "No project ID set. Run: db auth set-project <id> or pass --project"
      )
    );
    process.exit(1);
  }
  return id;
}

/**
 * Resolve a branch name-or-ID to a full NeonBranch object.
 * Lists all branches and finds by exact name match or ID prefix.
 * Exits with a message if not found.
 */
export async function resolveBranch(
  client: NeonClient,
  projectId: string,
  identifier: string
): Promise<NeonBranch> {
  const res = await client.listBranches(projectId);
  const branch = res.branches?.find(
    (b) => b.name === identifier || b.id.startsWith(identifier)
  );
  if (!branch) {
    console.error(chalk.red(`Branch "${identifier}" not found`));
    process.exit(1);
  }
  return branch;
}

/**
 * Resolve a branch name-or-ID returning the ID string.
 * Convenience wrapper around `resolveBranch` when only the ID is needed.
 */
export async function resolveBranchId(
  client: NeonClient,
  projectId: string,
  identifier: string
): Promise<string> {
  const branch = await resolveBranch(client, projectId, identifier);
  return branch.id;
}
