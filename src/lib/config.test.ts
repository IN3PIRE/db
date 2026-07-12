import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock conf before importing config module
const mockStore = new Map<string, unknown>();

vi.mock("conf", () => ({
  default: vi.fn().mockImplementation(() => ({
    get: (key: string) => mockStore.get(key),
    set: (key: string, value: unknown) => {
      mockStore.set(key, value);
    },
    clear: () => mockStore.clear(),
    has: (key: string) => mockStore.has(key),
    delete: (key: string) => mockStore.delete(key),
    path: "/mock/config/path",
  })),
}));

// Set up env vars before importing
const ORIGINAL_ENV = { ...process.env };

import { getConfig, setConfig, clearConfig, resolveApiKey, resolveProjectId } from "./config.js";

describe("config", () => {
  beforeEach(() => {
    mockStore.clear();
    // Restore env for each test
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  describe("getConfig", () => {
    it("should return an empty config when nothing is stored", () => {
      const cfg = getConfig();
      expect(cfg).toEqual({
        NEON_API_KEY: undefined,
        NEON_PROJECT_ID: undefined,
        default_branch: undefined,
      });
    });

    it("should return stored values", () => {
      mockStore.set("NEON_API_KEY", "stored-key");
      mockStore.set("default_branch", "staging");
      const cfg = getConfig();
      expect(cfg.NEON_API_KEY).toBe("stored-key");
      expect(cfg.default_branch).toBe("staging");
      expect(cfg.NEON_PROJECT_ID).toBeUndefined();
    });
  });

  describe("setConfig", () => {
    it("should store values and make them retrievable", () => {
      setConfig({ NEON_API_KEY: "new-key", NEON_PROJECT_ID: "proj-123" });
      expect(mockStore.get("NEON_API_KEY")).toBe("new-key");
      expect(mockStore.get("NEON_PROJECT_ID")).toBe("proj-123");
    });

    it("should not set undefined values", () => {
      setConfig({ NEON_API_KEY: undefined, default_branch: "main" });
      expect(mockStore.has("NEON_API_KEY")).toBe(false);
      expect(mockStore.get("default_branch")).toBe("main");
    });
  });

  describe("clearConfig", () => {
    it("should clear all stored values", () => {
      mockStore.set("NEON_API_KEY", "key");
      mockStore.set("NEON_PROJECT_ID", "proj");
      clearConfig();
      expect(mockStore.size).toBe(0);
    });
  });

  describe("resolveApiKey", () => {
    it("should return env var when set", () => {
      process.env.NEON_API_KEY = "env-key";
      expect(resolveApiKey()).toBe("env-key");
    });

    it("should return stored key when no env var", () => {
      mockStore.set("NEON_API_KEY", "stored-key");
      expect(resolveApiKey()).toBe("stored-key");
    });

    it("should return undefined when nowhere set", () => {
      expect(resolveApiKey()).toBeUndefined();
    });

    it("should prefer env var over stored key", () => {
      process.env.NEON_API_KEY = "env-key";
      mockStore.set("NEON_API_KEY", "stored-key");
      expect(resolveApiKey()).toBe("env-key");
    });
  });

  describe("resolveProjectId", () => {
    it("should return explicit argument when provided", () => {
      expect(resolveProjectId("explicit-id")).toBe("explicit-id");
    });

    it("should return env var when no argument", () => {
      process.env.NEON_PROJECT_ID = "env-proj";
      expect(resolveProjectId(undefined)).toBe("env-proj");
    });

    it("should return stored id when no arg or env", () => {
      mockStore.set("NEON_PROJECT_ID", "stored-proj");
      expect(resolveProjectId(undefined)).toBe("stored-proj");
    });

    it("should return undefined when nowhere set", () => {
      expect(resolveProjectId(undefined)).toBeUndefined();
    });

    it("should prefer argument over env var", () => {
      process.env.NEON_PROJECT_ID = "env-proj";
      expect(resolveProjectId("arg-proj")).toBe("arg-proj");
    });

    it("should prefer env var over stored", () => {
      process.env.NEON_PROJECT_ID = "env-proj";
      mockStore.set("NEON_PROJECT_ID", "stored-proj");
      expect(resolveProjectId(undefined)).toBe("env-proj");
    });
  });
});
