import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock conf before importing config module
const mockData: Record<string, unknown> = {};

vi.mock("conf", () => ({
  default: vi.fn(function MockConf() {
    return {
      get store() {
        return { ...mockData };
      },
      get: (key: string) => mockData[key],
      set: (key: string, value: unknown) => {
        mockData[key] = value;
      },
      clear: () => {
        Object.keys(mockData).forEach((k) => delete mockData[k]);
      },
      has: (key: string) => key in mockData,
      delete: (key: string) => { delete mockData[key]; },
      path: "/mock/config/path",
    };
  }),
}));

const ORIGINAL_ENV = { ...process.env };

import { getConfig, setConfig, clearConfig, resolveApiKey, resolveProjectId } from "./config.js";

describe("config", () => {
  beforeEach(() => {
    Object.keys(mockData).forEach((k) => delete mockData[k]);
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  describe("getConfig", () => {
    it("should return defaults when nothing is stored", () => {
      const cfg = getConfig();
      expect(cfg).toEqual({
        NEON_API_KEY: undefined,
        NEON_PROJECT_ID: undefined,
        default_branch: "main",
      });
    });

    it("should return stored values", () => {
      mockData.NEON_API_KEY = "stored-key";
      mockData.default_branch = "staging";
      const cfg = getConfig();
      expect(cfg.NEON_API_KEY).toBe("stored-key");
      expect(cfg.default_branch).toBe("staging");
      expect(cfg.NEON_PROJECT_ID).toBeUndefined();
    });
  });

  describe("setConfig", () => {
    it("should store values and make them retrievable", () => {
      setConfig("NEON_API_KEY", "new-key");
      setConfig("NEON_PROJECT_ID", "proj-123");
      expect(mockData.NEON_API_KEY).toBe("new-key");
      expect(mockData.NEON_PROJECT_ID).toBe("proj-123");
    });
  });

  describe("clearConfig", () => {
    it("should clear all stored values", () => {
      mockData.NEON_API_KEY = "key";
      mockData.NEON_PROJECT_ID = "proj";
      clearConfig();
      expect(Object.keys(mockData).length).toBe(0);
    });
  });

  describe("resolveApiKey", () => {
    it("should return env var when set", () => {
      process.env.NEON_API_KEY = "env-key";
      expect(resolveApiKey()).toBe("env-key");
    });

    it("should return stored key when no env var", () => {
      mockData.NEON_API_KEY = "stored-key";
      expect(resolveApiKey()).toBe("stored-key");
    });

    it("should return undefined when nowhere set", () => {
      expect(resolveApiKey()).toBeUndefined();
    });

    it("should prefer stored key over env var", () => {
      process.env.NEON_API_KEY = "env-key";
      mockData.NEON_API_KEY = "stored-key";
      expect(resolveApiKey()).toBe("stored-key");
    });
  });

  describe("resolveProjectId", () => {
    it("should return env var when set", () => {
      process.env.NEON_PROJECT_ID = "env-proj";
      expect(resolveProjectId()).toBe("env-proj");
    });

    it("should return stored id when no env var", () => {
      mockData.NEON_PROJECT_ID = "stored-proj";
      expect(resolveProjectId()).toBe("stored-proj");
    });

    it("should return undefined when nowhere set", () => {
      expect(resolveProjectId()).toBeUndefined();
    });

    it("should prefer stored over env var", () => {
      process.env.NEON_PROJECT_ID = "env-proj";
      mockData.NEON_PROJECT_ID = "stored-proj";
      expect(resolveProjectId()).toBe("stored-proj");
    });
  });
});
