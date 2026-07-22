import { z } from "zod";

// ---------------------------------------------------------------------------
// Neon API client
// ---------------------------------------------------------------------------

const BranchSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  parent_id: z.string().nullable().optional(),
  name: z.string(),
  parent_lsn: z.string().nullable().optional(),
  parent_timestamp: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  logical_size: z.number().optional(),
  physical_size: z.number().optional(),
  protected: z.boolean().optional(),
  default: z.boolean().optional(),
  current_state: z.string().optional(),
  expires_at: z.string().nullable().optional(),
});

const NeonApiResponse = z.object({
  branches: z.array(BranchSchema).optional(),
  branch: BranchSchema.optional(),
  endpoints: z
    .array(
      z.object({
        id: z.string(),
        host: z.string(),
        port: z.number().optional(),
        type: z.enum(["read_write", "read_only"]),
        branch_id: z.string(),
      })
    )
    .optional(),
  roles: z
    .array(
      z.object({
        name: z.string(),
        password: z.string().optional(),
        protected: z.boolean().optional(),
        branch_id: z.string().optional(),
      })
    )
    .optional(),
  projects: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        platform_id: z.string(),
        region_id: z.string(),
        created_at: z.string(),
        updated_at: z.string(),
      })
    )
    .optional(),
});

export type NeonBranch = NonNullable<
  NonNullable<z.infer<typeof NeonApiResponse>["branches"]>[0]
>;

/** Maps an HTTP status code to a user-friendly guidance message. */
function statusHint(status: number): string {
  switch (status) {
    case 401:
      return (
        "Your API key is invalid or expired. Run `db auth` to set a new one, " +
        "or check your NEON_API_KEY environment variable."
      );
    case 403:
      return (
        "You don't have permission for this resource. " +
        "Check that your API key has the correct project access in the Neon Console."
      );
    case 404:
      return (
        "The resource was not found. " +
        "Verify your project ID and branch ID are correct."
      );
    case 409:
      return (
        "Conflict — the resource already exists or the operation conflicts with " +
        "the current state. Try a different name or check the branch state."
      );
    case 429:
      return (
        "Rate limit exceeded. Wait a moment and try again, " +
        "or check your usage at https://console.neon.tech."
      );
    default:
      if (status >= 500) {
        return (
          "Neon server error. This is usually temporary — try again in a few seconds. " +
          "Check https://status.neon.tech for ongoing incidents."
        );
      }
      return "An unexpected error occurred. Please try again.";
  }
}

export class NeonApiError extends Error {
  status: number;
  body: string;
  userMessage: string;

  constructor(status: number, body: string) {
    const detail = body ? ` — ${body}` : "";
    super(`Neon API returned ${status}${detail}`);
    this.status = status;
    this.body = body;
    this.userMessage = statusHint(status);
  }
}

export class NeonClient {
  private baseUrl = "https://console.neon.tech/api/v2";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
    };
    if (body) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      throw new NeonApiError(res.status, await res.text());
    }

    // 204 No Content
    if (res.status === 204) return undefined as unknown as T;

    const json = await res.json();
    return NeonApiResponse.parse(json) as unknown as T;
  }

  // -- Projects ---------------------------------------------------------------

  async listProjects() {
    return this.request<z.infer<typeof NeonApiResponse>>("GET", "/projects");
  }

  // -- Branches ---------------------------------------------------------------

  async listBranches(projectId: string) {
    return this.request<z.infer<typeof NeonApiResponse>>(
      "GET",
      `/projects/${projectId}/branches`
    );
  }

  async getBranch(projectId: string, branchId: string) {
    return this.request<z.infer<typeof NeonApiResponse>>(
      "GET",
      `/projects/${projectId}/branches/${branchId}`
    );
  }

  async createBranch(
    projectId: string,
    name: string,
    parentId?: string
  ) {
    const body: Record<string, unknown> = {
      endpoint: { type: "read_write" },
      branch: { name },
    };
    if (parentId) {
      (body.branch as Record<string, unknown>).parent_id = parentId;
    }

    return this.request<z.infer<typeof NeonApiResponse>>(
      "POST",
      `/projects/${projectId}/branches`,
      body
    );
  }

  async deleteBranch(projectId: string, branchId: string) {
    return this.request<z.infer<typeof NeonApiResponse>>(
      "DELETE",
      `/projects/${projectId}/branches/${branchId}`
    );
  }

  async updateBranch(
    projectId: string,
    branchId: string,
    updates: { name?: string; archived?: boolean; expires_at?: string | null }
  ) {
    return this.request<z.infer<typeof NeonApiResponse>>(
      "PATCH",
      `/projects/${projectId}/branches/${branchId}`,
      { branch: updates }
    );
  }

  async setBranchExpiration(
    projectId: string,
    branchId: string,
    expiresAt: string | null
  ) {
    return this.updateBranch(projectId, branchId, { expires_at: expiresAt });
  }

  async setDefaultBranch(projectId: string, branchId: string) {
    return this.request<z.infer<typeof NeonApiResponse>>(
      "POST",
      `/projects/${projectId}/branches/${branchId}/set_as_default`
    );
  }

  // -- Endpoints ---------------------------------------------------------------

  async listEndpoints(projectId: string) {
    return this.request<z.infer<typeof NeonApiResponse>>(
      "GET",
      `/projects/${projectId}/endpoints`
    );
  }

  async getEndpoint(projectId: string, endpointId: string) {
    return this.request<z.infer<typeof NeonApiResponse>>(
      "GET",
      `/projects/${projectId}/endpoints/${endpointId}`
    );
  }

  async createEndpoint(
    projectId: string,
    branchId: string,
    type: "read_write" | "read_only" = "read_write"
  ) {
    return this.request<z.infer<typeof NeonApiResponse>>(
      "POST",
      `/projects/${projectId}/endpoints`,
      {
        endpoint: {
          branch_id: branchId,
          type,
        },
      }
    );
  }

  async deleteEndpoint(projectId: string, endpointId: string) {
    return this.request<z.infer<typeof NeonApiResponse>>(
      "DELETE",
      `/projects/${projectId}/endpoints/${endpointId}`
    );
  }

  // -- Roles -------------------------------------------------------------------

  async listRoles(projectId: string, branchId: string) {
    return this.request<z.infer<typeof NeonApiResponse>>(
      "GET",
      `/projects/${projectId}/branches/${branchId}/roles`
    );
  }

  /**
   * Build a Postgres connection string for a branch.
   * Looks up the endpoint and the default role.
   */
  async getConnectionString(
    projectId: string,
    branchId: string,
    pooled = false
  ): Promise<string> {
    const [endpointsRes, rolesRes] = await Promise.all([
      this.listEndpoints(projectId),
      this.listRoles(projectId, branchId),
    ]);

    const endpoint = endpointsRes.endpoints?.find(
      (e) => e.branch_id === branchId
    );
    if (!endpoint) {
      throw new Error(
        `No endpoint found for branch ${branchId}. Create one with: db endpoint create`
      );
    }

    const role = rolesRes.roles?.[0];
    if (!role) {
      throw new Error(`No role found for branch ${branchId}`);
    }

    const host = pooled
      ? `${endpoint.id}.pooler.neon.tech`
      : endpoint.host;
    const port = pooled ? 5432 : endpoint.port ?? 5432;

    return `postgresql://${role.name}:${role.password}@${host}:${port}/${role.name}`;
  }
}
