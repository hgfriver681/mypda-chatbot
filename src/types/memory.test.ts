import { describe, it, expect } from "vitest";
import {
  CreateMemorySchema,
  CreateApiKeySchema,
  MemoryListQuerySchema,
} from "./memory";

describe("memory validations", () => {
  describe("CreateMemorySchema", () => {
    it("accepts minimal input and applies defaults", () => {
      const r = CreateMemorySchema.safeParse({ content: "remember this" });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.kind).toBe("text");
        expect(r.data.categories).toEqual([]);
      }
    });

    it("rejects empty content", () => {
      expect(CreateMemorySchema.safeParse({ content: "" }).success).toBe(false);
      expect(CreateMemorySchema.safeParse({}).success).toBe(false);
    });

    it("accepts categories and a trajectory kind", () => {
      const r = CreateMemorySchema.safeParse({
        content: "a trajectory",
        kind: "trajectory",
        categories: ["sop", "fs-mcp"],
      });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.categories).toEqual(["sop", "fs-mcp"]);
    });

    it("rejects an unknown kind", () => {
      expect(
        CreateMemorySchema.safeParse({ content: "x", kind: "video" }).success,
      ).toBe(false);
    });
  });

  describe("CreateApiKeySchema", () => {
    it("allows an absent name", () => {
      expect(CreateApiKeySchema.safeParse({}).success).toBe(true);
    });
    it("rejects an over-long name", () => {
      expect(
        CreateApiKeySchema.safeParse({ name: "x".repeat(101) }).success,
      ).toBe(false);
    });
  });

  describe("MemoryListQuerySchema", () => {
    it("defaults range to all", () => {
      const r = MemoryListQuerySchema.safeParse({});
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.range).toBe("all");
    });
    it("accepts 7d / 30d and rejects others", () => {
      expect(MemoryListQuerySchema.safeParse({ range: "7d" }).success).toBe(true);
      expect(MemoryListQuerySchema.safeParse({ range: "30d" }).success).toBe(true);
      expect(MemoryListQuerySchema.safeParse({ range: "1y" }).success).toBe(false);
    });
  });
});
