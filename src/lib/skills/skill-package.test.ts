import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { isUnsafeZipPath, parseSkillPackage } from "./skill-package";

async function makeZip(files: Record<string, string>): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content);
  }
  return zip.generateAsync({ type: "uint8array" });
}

const VALID_SKILL_MD = `---
name: pdf-tools
description: Work with PDF files.
---
# PDF Tools

Use pdfplumber to extract text.`;

describe("parseSkillPackage", () => {
  it("parses a valid skill package", async () => {
    const zip = await makeZip({
      "pdf-tools/SKILL.md": VALID_SKILL_MD,
      "pdf-tools/references/REFERENCE.md": "details",
    });
    const result = await parseSkillPackage(zip);

    expect(result.manifest.name).toBe("pdf-tools");
    expect(result.manifest.description).toBe("Work with PDF files.");
    expect(result.manifest.version).toBe("0.0.1");
    expect(result.skillDir).toBe("pdf-tools");
    expect(result.body).toContain("Use pdfplumber");
    expect(result.files).toContain("pdf-tools/SKILL.md");
    expect(result.files).toContain("pdf-tools/references/REFERENCE.md");
    expect(result.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces a deterministic content hash for identical bytes", async () => {
    const a = await makeZip({ "pdf-tools/SKILL.md": VALID_SKILL_MD });
    const b = await parseSkillPackage(a);
    const c = await parseSkillPackage(a);
    expect(b.contentHash).toBe(c.contentHash);
  });

  it("ignores __MACOSX cruft", async () => {
    const zip = await makeZip({
      "pdf-tools/SKILL.md": VALID_SKILL_MD,
      "__MACOSX/pdf-tools/._SKILL.md": "junk",
    });
    const result = await parseSkillPackage(zip);
    expect(result.files).not.toContain("__MACOSX/pdf-tools/._SKILL.md");
    expect(result.skillDir).toBe("pdf-tools");
  });

  it("rejects a bare root SKILL.md (folder must be at the root)", async () => {
    const zip = await makeZip({ "SKILL.md": VALID_SKILL_MD });
    await expect(parseSkillPackage(zip)).rejects.toThrow(/folder at its root/);
  });

  it("rejects a zip with no SKILL.md", async () => {
    const zip = await makeZip({ "pdf-tools/readme.md": "x" });
    await expect(parseSkillPackage(zip)).rejects.toThrow(/No .*SKILL\.md/);
  });

  it("rejects multiple skills in one zip", async () => {
    const zip = await makeZip({
      "pdf-tools/SKILL.md": VALID_SKILL_MD,
      "csv-tools/SKILL.md": VALID_SKILL_MD.replace("pdf-tools", "csv-tools"),
    });
    await expect(parseSkillPackage(zip)).rejects.toThrow(/exactly one skill/);
  });

  it("rejects invalid frontmatter (uppercase name)", async () => {
    const zip = await makeZip({
      "PdfTools/SKILL.md": VALID_SKILL_MD.replace("pdf-tools", "PdfTools"),
    });
    await expect(parseSkillPackage(zip)).rejects.toThrow();
  });

  it("ignores stray root-level files outside the skill folder", async () => {
    const zip = await makeZip({
      "pdf-tools/SKILL.md": VALID_SKILL_MD,
      "notes.txt": "loose file at root",
    });
    const result = await parseSkillPackage(zip);
    expect(result.files).toEqual(["pdf-tools/SKILL.md"]);
  });
});

describe("isUnsafeZipPath", () => {
  it("flags absolute paths and parent-dir traversal", () => {
    for (const p of ["/etc/passwd", "../evil", "a/../b", "a/b/../../c"]) {
      expect(isUnsafeZipPath(p)).toBe(true);
    }
  });

  it("allows normal nested paths", () => {
    for (const p of ["pdf-tools/SKILL.md", "a/b/c.txt", "x.md"]) {
      expect(isUnsafeZipPath(p)).toBe(false);
    }
  });
});
