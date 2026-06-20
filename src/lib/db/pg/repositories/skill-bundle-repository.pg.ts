import type { SkillBundleRepository, SkillBundleSelect } from "app-types/skill";
import { desc, eq } from "drizzle-orm";
import { generateUUID } from "lib/utils";
import { pgDb as db } from "../db.pg";
import { SkillBundleTable } from "../schema.pg";

export const pgSkillBundleRepository: SkillBundleRepository = {
  async save(bundle) {
    const now = new Date();
    const [result] = await db
      .insert(SkillBundleTable)
      .values({
        id: bundle.id ?? generateUUID(),
        name: bundle.name,
        description: bundle.description ?? null,
        memberSkillIds: bundle.memberSkillIds,
        lock: bundle.lock ?? null,
        userId: bundle.userId,
        visibility: bundle.visibility ?? "private",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [SkillBundleTable.id],
        set: {
          name: bundle.name,
          description: bundle.description ?? null,
          memberSkillIds: bundle.memberSkillIds,
          lock: bundle.lock ?? null,
          visibility: bundle.visibility ?? "private",
          updatedAt: now,
        },
      })
      .returning();
    return result as SkillBundleSelect;
  },

  async selectById(id) {
    const [result] = await db
      .select()
      .from(SkillBundleTable)
      .where(eq(SkillBundleTable.id, id));
    return (result as SkillBundleSelect) ?? null;
  },

  async selectAllForUser(userId) {
    const results = await db
      .select()
      .from(SkillBundleTable)
      .where(eq(SkillBundleTable.userId, userId))
      .orderBy(desc(SkillBundleTable.createdAt));
    return results as SkillBundleSelect[];
  },

  async deleteById(id) {
    await db.delete(SkillBundleTable).where(eq(SkillBundleTable.id, id));
  },
};
