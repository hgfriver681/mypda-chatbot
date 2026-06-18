import { describe, it, expect } from "vitest";
import { relativeTime, collectCategories } from "./format";

describe("relativeTime", () => {
  const now = new Date("2026-06-17T12:00:00Z");
  it("shows 'just now' under a minute", () => {
    expect(relativeTime(new Date("2026-06-17T11:59:30Z"), now)).toBe("just now");
  });
  it("shows minutes / hours / days ago", () => {
    expect(relativeTime(new Date("2026-06-17T11:45:00Z"), now)).toBe("15m ago");
    expect(relativeTime(new Date("2026-06-17T09:00:00Z"), now)).toBe("3h ago");
    expect(relativeTime(new Date("2026-06-15T12:00:00Z"), now)).toBe("2d ago");
  });
  it("accepts an ISO string too", () => {
    expect(relativeTime("2026-06-17T09:00:00Z", now)).toBe("3h ago");
  });
});

describe("collectCategories", () => {
  it("returns sorted unique categories across memories", () => {
    const cats = collectCategories([
      { categories: ["sop", "fs-mcp"] },
      { categories: ["personal", "sop"] },
      { categories: [] },
    ]);
    expect(cats).toEqual(["fs-mcp", "personal", "sop"]);
  });
  it("is empty when there are no categories", () => {
    expect(collectCategories([{ categories: [] }])).toEqual([]);
  });
});
