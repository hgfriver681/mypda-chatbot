import { describe, expect, it } from "vitest";
import {
  DEFAULT_SKILL_VERSION,
  SEMVER_REGEX,
  SkillManifestSchema,
} from "./skill";

describe("SkillManifestSchema", () => {
  it("accepts a minimal manifest and defaults the version", () => {
    const parsed = SkillManifestSchema.parse({
      name: "pdf-tools",
      description: "Work with PDF files.",
    });
    expect(parsed.version).toBe(DEFAULT_SKILL_VERSION);
    expect(parsed.tags).toBeUndefined();
  });

  it("accepts valid semver, including pre-release", () => {
    for (const version of ["0.0.1", "1.2.3", "10.20.30", "1.2.3-beta.1"]) {
      const parsed = SkillManifestSchema.parse({
        name: "x",
        description: "y",
        version,
      });
      expect(parsed.version).toBe(version);
    }
  });

  it("rejects non-semver versions", () => {
    for (const version of ["1", "1.2", "v1.2.3", "1.2.3.4", "latest"]) {
      expect(() =>
        SkillManifestSchema.parse({ name: "x", description: "y", version }),
      ).toThrow();
    }
  });

  it("requires name and description", () => {
    expect(() => SkillManifestSchema.parse({ description: "y" })).toThrow();
    expect(() => SkillManifestSchema.parse({ name: "x" })).toThrow();
    expect(() =>
      SkillManifestSchema.parse({ name: "", description: "y" }),
    ).toThrow();
  });

  it("keeps optional tags and allowedTools when provided", () => {
    const parsed = SkillManifestSchema.parse({
      name: "x",
      description: "y",
      tags: ["pdf", "docs"],
      allowedTools: ["Bash(ls:*)"],
    });
    expect(parsed.tags).toEqual(["pdf", "docs"]);
    expect(parsed.allowedTools).toEqual(["Bash(ls:*)"]);
  });
});

describe("SEMVER_REGEX", () => {
  it("matches release and pre-release versions", () => {
    expect(SEMVER_REGEX.test("1.2.3")).toBe(true);
    expect(SEMVER_REGEX.test("1.2.3-rc.1")).toBe(true);
  });

  it("does not match partial or prefixed versions", () => {
    expect(SEMVER_REGEX.test("1.2")).toBe(false);
    expect(SEMVER_REGEX.test("v1.2.3")).toBe(false);
  });
});
