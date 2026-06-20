import { createHash } from "node:crypto";
import { type SkillManifest, SkillManifestSchema } from "app-types/skill";
import matter from "gray-matter";
import JSZip from "jszip";

// Parses and validates an uploaded skill package (a zip of the canonical
// agentskills.io layout: <skill-folder>/SKILL.md plus optional resources).
// Pure helper: no I/O, no session — safe to unit test.

export type ParsedSkillPackage = {
  manifest: SkillManifest;
  body: string;
  skillDir: string;
  files: string[];
  contentHash: string;
};

function toUint8(input: Uint8Array | Buffer | ArrayBuffer): Uint8Array {
  if (input instanceof Uint8Array) return input;
  return new Uint8Array(input);
}

// Ignore macOS archive cruft so it never counts as real content.
function isIgnored(path: string): boolean {
  const segments = path.split("/");
  const base = segments[segments.length - 1] ?? "";
  return (
    segments.includes("__MACOSX") ||
    base.startsWith("._") ||
    base === ".DS_Store"
  );
}

const SKILL_MD_AT_DEPTH_1 = /^[^/]+\/SKILL\.md$/;

// Absolute paths or any ".." segment are unsafe (path traversal). Kept as
// defense-in-depth for any future step that extracts files to disk.
export function isUnsafeZipPath(path: string): boolean {
  return path.startsWith("/") || path.split("/").includes("..");
}

export async function parseSkillPackage(
  zipBytes: Uint8Array | Buffer | ArrayBuffer,
): Promise<ParsedSkillPackage> {
  const bytes = toUint8(zipBytes);
  const contentHash = createHash("sha256").update(bytes).digest("hex");

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    throw new Error("Invalid zip archive");
  }

  const paths = Object.values(zip.files)
    .filter((f) => !f.dir)
    .map((f) => f.name)
    .filter((p) => !isIgnored(p));

  // Reject path traversal / absolute paths before reading anything.
  for (const p of paths) {
    if (isUnsafeZipPath(p)) {
      throw new Error(`Unsafe path in zip: ${p}`);
    }
  }

  // Enforce the "folder at the zip root" rule (claude.ai upload requirement).
  if (paths.includes("SKILL.md")) {
    throw new Error(
      "Zip must contain the skill folder at its root, not a bare SKILL.md",
    );
  }

  const skillMdPaths = paths.filter((p) => SKILL_MD_AT_DEPTH_1.test(p));
  if (skillMdPaths.length === 0) {
    throw new Error("No <skill-folder>/SKILL.md found in zip");
  }
  if (skillMdPaths.length > 1) {
    throw new Error(
      "Zip must contain exactly one skill (found multiple SKILL.md)",
    );
  }

  const skillMdPath = skillMdPaths[0];
  const skillDir = skillMdPath.slice(0, skillMdPath.indexOf("/"));

  const file = zip.file(skillMdPath);
  if (!file) throw new Error("SKILL.md could not be read");
  const raw = await file.async("string");

  const { data, content } = matter(raw);
  // Throws a ZodError with a clear message if the frontmatter is invalid.
  const manifest = SkillManifestSchema.parse(data);

  const files = paths
    .filter((p) => p === skillMdPath || p.startsWith(`${skillDir}/`))
    .sort();

  return {
    manifest,
    body: content.trim(),
    skillDir,
    files,
    contentHash,
  };
}
