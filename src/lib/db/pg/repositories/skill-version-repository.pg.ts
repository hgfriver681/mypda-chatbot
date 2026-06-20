import type {
  SkillVersionRepository,
  SkillVersionSelect,
} from "app-types/skill";
import { desc, eq } from "drizzle-orm";
import { generateUUID } from "lib/utils";
import { pgDb as db } from "../db.pg";
import { SkillVersionTable } from "../schema.pg";

export const pgSkillVersionRepository: SkillVersionRepository = {
  async insert(version) {
    const [result] = await db
      .insert(SkillVersionTable)
      .values({
        id: version.id ?? generateUUID(),
        skillId: version.skillId,
        version: version.version,
        storageKey: version.storageKey ?? null,
        contentHash: version.contentHash ?? null,
        changelog: version.changelog ?? null,
        createdAt: new Date(),
      })
      .returning();
    return result as SkillVersionSelect;
  },

  async selectBySkillId(skillId) {
    const results = await db
      .select()
      .from(SkillVersionTable)
      .where(eq(SkillVersionTable.skillId, skillId))
      .orderBy(desc(SkillVersionTable.createdAt));
    return results as SkillVersionSelect[];
  },

  async selectLatest(skillId) {
    const [result] = await db
      .select()
      .from(SkillVersionTable)
      .where(eq(SkillVersionTable.skillId, skillId))
      .orderBy(desc(SkillVersionTable.createdAt))
      .limit(1);
    return (result as SkillVersionSelect) ?? null;
  },
};
