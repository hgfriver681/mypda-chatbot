import "server-only";
import type { SkillSelect } from "app-types/skill";
import { getSession } from "auth/server";
import { skillRepository, skillVersionRepository } from "lib/db/repository";
import { serverFileStorage } from "lib/file-storage";
import { parseSkillPackage } from "./skill-package";

async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function listMySkills(): Promise<SkillSelect[]> {
  const userId = await requireUserId();
  return skillRepository.selectAllForUser(userId);
}

// Slice 0: install a brand-new skill from an uploaded zip. Updating an existing
// skill (version bump) is M2 and handled separately.
export async function installSkillFromZip(
  zipBytes: Uint8Array,
): Promise<SkillSelect> {
  const userId = await requireUserId();
  const { manifest, contentHash } = await parseSkillPackage(zipBytes);

  if (await skillRepository.existsByName(userId, manifest.name)) {
    throw new Error(
      `A skill named "${manifest.name}" already exists. Use update instead.`,
    );
  }

  const upload = await serverFileStorage.upload(Buffer.from(zipBytes), {
    filename: `${manifest.name}-${manifest.version}.zip`,
    contentType: "application/zip",
  });

  const skill = await skillRepository.save({
    name: manifest.name,
    description: manifest.description,
    version: manifest.version,
    manifest,
    storageKey: upload.key,
    contentHash,
    userId,
  });

  await skillVersionRepository.insert({
    skillId: skill.id,
    version: manifest.version,
    storageKey: upload.key,
    contentHash,
  });

  return skill;
}

export async function exportSkillZip(
  id: string,
): Promise<{ bytes: Buffer; filename: string }> {
  const userId = await requireUserId();
  const skill = await skillRepository.selectById(id);
  if (!skill) throw new Error("Skill not found");
  // Only the owner or a public skill can be downloaded.
  if (skill.userId !== userId && skill.visibility !== "public") {
    throw new Error("Unauthorized");
  }
  if (!skill.storageKey) throw new Error("Skill has no stored package");

  const bytes = await serverFileStorage.download(skill.storageKey);
  return { bytes, filename: `${skill.name}-${skill.version}.zip` };
}

export async function deleteMySkill(id: string): Promise<void> {
  const userId = await requireUserId();
  const skill = await skillRepository.selectById(id);
  if (!skill) throw new Error("Skill not found");
  if (skill.userId !== userId) throw new Error("Unauthorized");

  if (skill.storageKey) {
    // Best-effort: don't fail the delete if the blob is already gone.
    await serverFileStorage.delete(skill.storageKey).catch(() => {});
  }
  await skillRepository.deleteById(id);
}
