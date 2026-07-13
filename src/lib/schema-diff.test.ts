import { describe, it, expect } from "vitest";
import type { DiffEntry } from "./format.js";

describe("DiffEntry type", () => {
  it("accepts added entries", () => {
    const entry: DiffEntry = { type: "added", table: "users", detail: "Schema: public" };
    expect(entry.type).toBe("added");
  });

  it("accepts removed entries", () => {
    const entry: DiffEntry = { type: "removed", table: "old_table" };
    expect(entry.type).toBe("removed");
  });

  it("accepts modified entries", () => {
    const entry: DiffEntry = {
      type: "modified",
      table: "posts",
      detail: "~ title: varchar(100) → varchar(255)",
    };
    expect(entry.type).toBe("modified");
  });

  it("optional detail defaults to undefined", () => {
    const entry: DiffEntry = { type: "added", table: "users" };
    expect(entry.detail).toBeUndefined();
  });
});
