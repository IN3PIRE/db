import { describe, it, expect } from "vitest";
import {
  formatBytes,
  formatDate,
  renderBranchTable,
  renderBranchDetail,
  renderDiff,
} from "./format.js";
import type { NeonBranch } from "./neon-api.js";

// ---------------------------------------------------------------------------
// formatBytes
// ---------------------------------------------------------------------------

describe("formatBytes", () => {
  it("returns an em dash for undefined", () => {
    expect(formatBytes(undefined)).toBe("—");
  });

  it("returns an em dash for zero bytes", () => {
    expect(formatBytes(0)).toBe("—");
  });

  it("formats bytes without a unit conversion", () => {
    expect(formatBytes(500)).toBe("500.00 B");
  });

  it("converts to kilobytes", () => {
    expect(formatBytes(2048)).toBe("2.00 KB");
  });

  it("converts to megabytes", () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.00 MB");
  });

  it("converts to gigabytes", () => {
    expect(formatBytes(3 * 1024 * 1024 * 1024)).toBe("3.00 GB");
  });

  it("handles fractional conversions", () => {
    expect(formatBytes(1536)).toBe("1.50 KB");
  });

  it("converts to terabytes", () => {
    expect(formatBytes(2048 * 1024 * 1024 * 1024)).toBe("2048.00 TB");
  });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

describe("formatDate", () => {
  it("formats an ISO date string to a human-readable short format", () => {
    const result = formatDate("2026-01-15T10:30:00Z");
    expect(result).toContain("Jan");
    expect(result).toContain("15");
    expect(result).toContain("10:30");
  });

  it("handles a date at midnight", () => {
    const result = formatDate("2026-06-01T00:00:00Z");
    expect(result).toContain("Jun");
    expect(result).toContain("1");
    expect(result).toContain("00:00");
  });

  it("formats timestamps with single-digit day", () => {
    const result = formatDate("2026-03-05T14:05:00Z");
    expect(result).toContain("Mar");
    expect(result).toContain("5");
    expect(result).toContain("14:05");
  });

  it("handles dates with timezone offsets", () => {
    // ISO string with timezone offset is parsed correctly by Date
    const result = formatDate("2026-12-25T08:15:30+02:00");
    expect(result).toContain("Dec");
    expect(result).toContain("25");
  });
});

// ---------------------------------------------------------------------------
// renderBranchTable
// ---------------------------------------------------------------------------

describe("renderBranchTable", () => {
  it("renders a table with branch data", () => {
    const branches: NeonBranch[] = [
      {
        id: "br-frosty-water-12345678",
        project_id: "p-123",
        name: "main",
        parent_lsn: null,
        parent_timestamp: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-06-01T00:00:00Z",
        logical_size: 1024,
      },
      {
        id: "br-shiny-leaf-87654321",
        project_id: "p-123",
        name: "feature/foo",
        parent_lsn: "0/12345678",
        parent_timestamp: "2026-03-15T12:00:00Z",
        created_at: "2026-03-15T12:01:00Z",
        updated_at: "2026-05-20T08:30:00Z",
        physical_size: 2048,
      },
    ];

    const table = renderBranchTable(branches);

    // Should contain branch names
    expect(table).toContain("main");
    expect(table).toContain("feature/foo");
    // Should truncate IDs
    expect(table).toContain("br-frost");
    expect(table).toContain("br-shiny");
    // Should show column headers
    expect(table).toContain("Name");
    expect(table).toContain("ID");
    expect(table).toContain("Created");
    expect(table).toContain("Size");
  });

  it("renders an empty string for an empty array", () => {
    const table = renderBranchTable([]);
    expect(table).toBe("");
  });
});

// ---------------------------------------------------------------------------
// renderBranchDetail
// ---------------------------------------------------------------------------

describe("renderBranchDetail", () => {
  const branch: NeonBranch = {
    id: "br-frosty-water-12345678",
    project_id: "p-123",
    name: "main",
    parent_lsn: null,
    parent_timestamp: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
    logical_size: 1024,
  };

  it("includes the branch name", () => {
    const detail = renderBranchDetail(branch);
    expect(detail).toContain("main");
  });

  it("includes the branch ID", () => {
    const detail = renderBranchDetail(branch);
    expect(detail).toContain("br-frosty-water-12345678");
  });

  it("includes both created and updated times", () => {
    const detail = renderBranchDetail(branch);
    expect(detail).toContain("Created");
    expect(detail).toContain("Updated");
  });

  it("shows an em dash for null parent LSN", () => {
    const detail = renderBranchDetail({
      ...branch,
      parent_lsn: null,
    });
    expect(detail).toContain("—");
  });

  it("shows the parent LSN when set", () => {
    const detail = renderBranchDetail({
      ...branch,
      parent_lsn: "0/12345678",
    });
    expect(detail).toContain("0/12345678");
  });

  it("includes size when logical_size is present", () => {
    const detail = renderBranchDetail(branch);
    expect(detail).toContain("1.00 KB");
  });

  it("falls back to physical_size when logical is absent", () => {
    const detail = renderBranchDetail({
      ...branch,
      logical_size: undefined,
      physical_size: 2048,
    });
    expect(detail).toContain("2.00 KB");
  });
});

// ---------------------------------------------------------------------------
// renderDiff
// ---------------------------------------------------------------------------

describe("renderDiff", () => {
  it("shows a sync message when there are no diffs", () => {
    const result = renderDiff("main", "feature", []);
    expect(result).toContain("No schema differences");
    expect(result).toContain("in sync");
  });

  it("renders added diff entries", () => {
    const result = renderDiff("main", "feature", [
      { type: "added", table: "users", detail: "new table" },
    ]);
    expect(result).toContain("+ added");
    expect(result).toContain("users");
    expect(result).toContain("feature");
    expect(result).toContain("main");
  });

  it("renders removed diff entries", () => {
    const result = renderDiff("main", "feature", [
      { type: "removed", table: "old_table" },
    ]);
    expect(result).toContain("- removed");
    expect(result).toContain("old_table");
  });

  it("renders modified diff entries", () => {
    const result = renderDiff("main", "feature", [
      { type: "modified", table: "posts", detail: "column: title varchar(255) → text" },
    ]);
    expect(result).toContain("~ modified");
    expect(result).toContain("posts");
    expect(result).toContain("varchar(255)");
  });

  it("renders multiple diffs of different types", () => {
    const diffs = [
      { type: "added" as const, table: "audit_log", detail: "new table" },
      { type: "removed" as const, table: "legacy_data" },
      { type: "modified" as const, table: "users", detail: "column: email varchar(100) → varchar(255)" },
    ];

    const result = renderDiff("prod", "staging", diffs);
    expect(result).toContain("+ added");
    expect(result).toContain("- removed");
    expect(result).toContain("~ modified");
    expect(result).toContain("audit_log");
    expect(result).toContain("legacy_data");
    expect(result).toContain("users");
    expect(result).toContain("prod");
    expect(result).toContain("staging");
  });

  it("shows branch names in the header", () => {
    const result = renderDiff("production", "feature-x", [
      { type: "added", table: "t1" },
    ]);
    expect(result).toContain("production");
    expect(result).toContain("feature-x");
  });
});
