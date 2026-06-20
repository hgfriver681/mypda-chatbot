import { z } from "zod";

// --- Skill Platform types -------------------------------------------------
// A "skill" is a packaged unit of agent capability, modelled on the Anthropic
// Agent Skills format: a SKILL.md (YAML frontmatter + body) plus optional
// resource files, distributed as a zip. Runtime semantics (ADR-1) is prompt
// injection: only name + description stay resident; the body is loaded into the
// system prompt when the skill is invoked (progressive disclosure).
// See docs/skill-platform/.

// Semver MAJOR.MINOR.PATCH with optional pre-release (e.g. 1.2.3-beta.1).
export const SEMVER_REGEX = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
export const DEFAULT_SKILL_VERSION = "0.0.1";

// SKILL.md YAML frontmatter (the manifest). `name` + `description` are required
// by the Agent Skills spec; the rest are optional.
export const SkillManifestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1024),
  version: z.string().regex(SEMVER_REGEX).default(DEFAULT_SKILL_VERSION),
  tags: z.array(z.string()).optional(),
  allowedTools: z.array(z.string()).optional(),
});
export type SkillManifest = z.infer<typeof SkillManifestSchema>;

export type SkillVisibility = "public" | "private";

export type SkillSelect = {
  id: string;
  name: string;
  description: string;
  version: string;
  category?: string | null;
  manifest?: SkillManifest | null;
  storageKey?: string | null;
  contentHash?: string | null;
  enabled: boolean;
  userId: string;
  visibility: SkillVisibility;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  userName?: string | null;
  userAvatar?: string | null;
};

export type SkillInsert = {
  id?: string;
  name: string;
  description: string;
  version?: string;
  category?: string | null;
  manifest?: SkillManifest | null;
  storageKey?: string | null;
  contentHash?: string | null;
  enabled?: boolean;
  userId: string;
  visibility?: SkillVisibility;
};

export interface SkillRepository {
  save(skill: SkillInsert): Promise<SkillSelect>;
  selectById(id: string): Promise<SkillSelect | null>;
  selectByName(userId: string, name: string): Promise<SkillSelect | null>;
  selectAllForUser(userId: string): Promise<SkillSelect[]>;
  deleteById(id: string): Promise<void>;
  existsByName(userId: string, name: string): Promise<boolean>;
  setEnabled(id: string, enabled: boolean): Promise<void>;
  updateVisibility(id: string, visibility: SkillVisibility): Promise<void>;
  updateCategory(id: string, category: string | null): Promise<void>;
  renameCategory(
    userId: string,
    oldName: string,
    newName: string,
  ): Promise<void>;
}

// --- Versions (M3: version control) ---------------------------------------

export type SkillVersionSelect = {
  id: string;
  skillId: string;
  version: string;
  storageKey?: string | null;
  contentHash?: string | null;
  changelog?: string | null;
  createdAt?: Date | string;
};

export type SkillVersionInsert = {
  id?: string;
  skillId: string;
  version: string;
  storageKey?: string | null;
  contentHash?: string | null;
  changelog?: string | null;
};

export interface SkillVersionRepository {
  insert(version: SkillVersionInsert): Promise<SkillVersionSelect>;
  selectBySkillId(skillId: string): Promise<SkillVersionSelect[]>;
  selectLatest(skillId: string): Promise<SkillVersionSelect | null>;
}

// --- Bundles (M4: standard skill-set packaging) ---------------------------
// A bundle is a manifest whose body is an array of member skill ids, installed
// as one unit. Like a VS Code Extension Pack / Dify .difybndl, members are
// independently installable and have no functional coupling. `lock` pins each
// member's exact version + content hash for reproducibility.

export type SkillBundleLockEntry = {
  skillId: string;
  version: string;
  contentHash?: string | null;
};

export type SkillBundleSelect = {
  id: string;
  name: string;
  description?: string | null;
  memberSkillIds: string[];
  lock?: SkillBundleLockEntry[] | null;
  userId: string;
  visibility: SkillVisibility;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type SkillBundleInsert = {
  id?: string;
  name: string;
  description?: string | null;
  memberSkillIds: string[];
  lock?: SkillBundleLockEntry[] | null;
  userId: string;
  visibility?: SkillVisibility;
};

export interface SkillBundleRepository {
  save(bundle: SkillBundleInsert): Promise<SkillBundleSelect>;
  selectById(id: string): Promise<SkillBundleSelect | null>;
  selectAllForUser(userId: string): Promise<SkillBundleSelect[]>;
  deleteById(id: string): Promise<void>;
}
