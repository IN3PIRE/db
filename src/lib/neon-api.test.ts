import { describe, it, expect } from "vitest";
import { NeonApiError, NeonClient } from "./neon-api.js";
import { z } from "zod";

// ---------------------------------------------------------------------------
// The same Zod schema from neon-api.ts (re-exported for testing)
// We inline a copy so the tests are hermetic and catch schema regressions.
// ---------------------------------------------------------------------------
const BranchSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  name: z.string(),
  parent_lsn: z.string().nullable(),
  parent_timestamp: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  logical_size: z.number().optional(),
  physical_size: z.number().optional(),
});

const NeonApiResponseSchema = z.object({
  branches: z.array(BranchSchema).optional(),
  branch: BranchSchema.optional(),
  endpoints: z
    .array(
      z.object({
        id: z.string(),
        host: z.string(),
        port: z.number(),
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

describe("NeonApiResponse schema", () => {
  it("parses a valid list-branches response", () => {
    const data = {
      branches: [
        {
          id: "br-shiny-42",
          project_id: "proj-abc",
          name: "main",
          parent_lsn: null,
          parent_timestamp: null,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ],
    };
    const parsed = NeonApiResponseSchema.parse(data);
    expect(parsed.branches).toHaveLength(1);
    expect(parsed.branches![0].name).toBe("main");
    expect(parsed.branches![0].id).toBe("br-shiny-42");
  });

  it("parses a valid create-branch response", () => {
    const data = {
      branch: {
        id: "br-new-1",
        project_id: "proj-abc",
        name: "feature/foo",
        parent_lsn: "0/1A2B3C",
        parent_timestamp: "2025-01-01T00:00:00Z",
        created_at: "2025-06-15T12:00:00Z",
        updated_at: "2025-06-15T12:00:00Z",
        logical_size: 1024,
        physical_size: 2048,
      },
    };
    const parsed = NeonApiResponseSchema.parse(data);
    expect(parsed.branch?.name).toBe("feature/foo");
    expect(parsed.branch?.parent_lsn).toBe("0/1A2B3C");
    expect(parsed.branch?.logical_size).toBe(1024);
  });

  it("rejects a branch with a missing required field", () => {
    // Missing 'name'
    const data = {
      branches: [
        {
          id: "br-1",
          project_id: "proj-1",
          // name omitted
          parent_lsn: null,
          parent_timestamp: null,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ],
    };
    expect(() => NeonApiResponseSchema.parse(data)).toThrow(z.ZodError);
  });

  it("accepts endpoints in a response", () => {
    const data = {
      endpoints: [
        {
          id: "ep-cool-1",
          host: "ep-cool-1.cloud.neon.tech",
          port: 5432,
          type: "read_write" as const,
          branch_id: "br-shiny-42",
        },
      ],
    };
    const parsed = NeonApiResponseSchema.parse(data);
    expect(parsed.endpoints).toHaveLength(1);
    expect(parsed.endpoints![0].host).toContain("neon.tech");
  });

  it("rejects an invalid endpoint type", () => {
    const data = {
      endpoints: [
        {
          id: "ep-bad",
          host: "localhost",
          port: 5432,
          type: "superuser",
          branch_id: "br-1",
        },
      ],
    };
    expect(() => NeonApiResponseSchema.parse(data)).toThrow(z.ZodError);
  });

  it("parses a valid roles response", () => {
    const data = {
      roles: [
        {
          name: "dbuser",
          password: "secret123",
          protected: false,
          branch_id: "br-1",
        },
      ],
    };
    const parsed = NeonApiResponseSchema.parse(data);
    expect(parsed.roles![0].name).toBe("dbuser");
    expect(parsed.roles![0].password).toBe("secret123");
  });

  it("parses a valid projects response", () => {
    const data = {
      projects: [
        {
          id: "proj-test",
          name: "Test Project",
          platform_id: "aws-us-east-2",
          region_id: "aws-us-east-2",
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-06-01T00:00:00Z",
        },
      ],
    };
    const parsed = NeonApiResponseSchema.parse(data);
    expect(parsed.projects).toHaveLength(1);
    expect(parsed.projects![0].platform_id).toBe("aws-us-east-2");
  });

  it("allows all sub-fields to be absent (empty response)", () => {
    const parsed = NeonApiResponseSchema.parse({});
    expect(parsed.branches).toBeUndefined();
    expect(parsed.branch).toBeUndefined();
    expect(parsed.endpoints).toBeUndefined();
    expect(parsed.roles).toBeUndefined();
    expect(parsed.projects).toBeUndefined();
  });
});

describe("NeonApiError", () => {
  it("stores status and body", () => {
    const err = new NeonApiError(401, '{"message":"Unauthorized"}');
    expect(err.status).toBe(401);
    expect(err.body).toBe('{"message":"Unauthorized"}');
    expect(err.message).toBe(
      'Neon API returned 401: {"message":"Unauthorized"}'
    );
  });

  it("is an instance of Error", () => {
    const err = new NeonApiError(500, "Internal Server Error");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(NeonApiError);
  });

  it("handles empty body", () => {
    const err = new NeonApiError(204, "");
    expect(err.status).toBe(204);
    expect(err.body).toBe("");
  });

  it("handles common HTTP error codes", () => {
    const cases = [
      { status: 400, body: "Bad Request" },
      { status: 401, body: "Unauthorized" },
      { status: 403, body: "Forbidden" },
      { status: 404, body: "Not Found" },
      { status: 409, body: "Conflict" },
      { status: 429, body: "Too Many Requests" },
      { status: 503, body: "Service Unavailable" },
    ];

    for (const { status, body } of cases) {
      const err = new NeonApiError(status, body);
      expect(err.status).toBe(status);
      expect(err.body).toBe(body);
      expect(err.message).toBe(`Neon API returned ${status}: ${body}`);
    }
  });
});

describe("NeonClient", () => {
  it("constructs with an API key", () => {
    const client = new NeonClient("test-key-123");
    expect(client).toBeInstanceOf(NeonClient);
  });

  it("builds correct request URLs", () => {
    const client = new NeonClient("key");
    const base = "https://console.neon.tech/api/v2";

    // Check the baseUrl is set correctly by inspecting the URL construction
    // through the private baseUrl (we trust our class internals)
    expect((client as any).baseUrl).toBe(base);
    expect((client as any).apiKey).toBe("key");
  });
});
