import type { SkillRepository, SkillSelect } from "app-types/skill";
import { DEFAULT_SKILL_VERSION } from "app-types/skill";
import { and, desc, eq, or } from "drizzle-orm";
import { generateUUID } from "lib/utils";
import { pgDb as db } from "../db.pg";
import { SkillTable, UserTable } from "../schema.pg";

export const pgSkillRepository: SkillRepository = {
  async save(skill) {
    const now = new Date();
    const [result] = await db
      .insert(SkillTable)
      .values({
        id: skill.id ?? generateUUID(),
        name: skill.name,
        description: skill.description,
        version: skill.version ?? DEFAULT_SKILL_VERSION,
        category: skill.category ?? null,
        manifest: skill.manifest ?? null,
        storageKey: skill.storageKey ?? null,
        contentHash: skill.contentHash ?? null,
        enabled: skill.enabled ?? true,
        userId: skill.userId,
        visibility: skill.visibility ?? "private",
        createdAt: now,
        updatedAt: now,
      })
      // Upsert by id (editing an existing skill). Creating a new skill that
      // collides on (user_id, name) is rejected by the unique constraint —
      // callers look up by name first (see existsByName/selectByName).
      .onConflictDoUpdate({
        target: [SkillTable.id],
        set: {
          name: skill.name,
          description: skill.description,
          version: skill.version ?? DEFAULT_SKILL_VERSION,
          manifest: skill.manifest ?? null,
          storageKey: skill.storageKey ?? null,
          contentHash: skill.contentHash ?? null,
          updatedAt: now,
        },
      })
      .returning();

    return result as SkillSelect;
  },

  async selectById(id) {
    const [result] = await db
      .select()
      .from(SkillTable)
      .where(eq(SkillTable.id, id));
    return (result as SkillSelect) ?? null;
  },

  async selectByName(userId, name) {
    const [result] = await db
      .select()
      .from(SkillTable)
      .where(and(eq(SkillTable.userId, userId), eq(SkillTable.name, name)));
    return (result as SkillSelect) ?? null;
  },

  async selectAllForUser(userId) {
    // The user's own skills plus any public ones.
    const results = await db
      .select({
        id: SkillTable.id,
        name: SkillTable.name,
        description: SkillTable.description,
        version: SkillTable.version,
        category: SkillTable.category,
        manifest: SkillTable.manifest,
        storageKey: SkillTable.storageKey,
        contentHash: SkillTable.contentHash,
        enabled: SkillTable.enabled,
        userId: SkillTable.userId,
        visibility: SkillTable.visibility,
        createdAt: SkillTable.createdAt,
        updatedAt: SkillTable.updatedAt,
        userName: UserTable.name,
        userAvatar: UserTable.image,
      })
      .from(SkillTable)
      .leftJoin(UserTable, eq(SkillTable.userId, UserTable.id))
      .where(
        or(eq(SkillTable.userId, userId), eq(SkillTable.visibility, "public")),
      )
      .orderBy(desc(SkillTable.createdAt));
    return results as SkillSelect[];
  },

  async deleteById(id) {
    await db.delete(SkillTable).where(eq(SkillTable.id, id));
  },

  async existsByName(userId, name) {
    const [result] = await db
      .select({ id: SkillTable.id })
      .from(SkillTable)
      .where(and(eq(SkillTable.userId, userId), eq(SkillTable.name, name)));
    return !!result;
  },

  async setEnabled(id, enabled) {
    await db
      .update(SkillTable)
      .set({ enabled, updatedAt: new Date() })
      .where(eq(SkillTable.id, id));
  },

  async updateVisibility(id, visibility) {
    await db
      .update(SkillTable)
      .set({ visibility, updatedAt: new Date() })
      .where(eq(SkillTable.id, id));
  },

  async updateCategory(id, category) {
    // Normalize empty/whitespace to null (ungrouped). Mirrors mcp_server.
    const value = category?.trim() ? category.trim() : null;
    await db
      .update(SkillTable)
      .set({ category: value, updatedAt: new Date() })
      .where(eq(SkillTable.id, id));
  },

  async renameCategory(userId, oldName, newName) {
    // Move a whole group in one shot, scoped to the user's own skills.
    const value = newName.trim();
    if (!value) return;
    await db
      .update(SkillTable)
      .set({ category: value, updatedAt: new Date() })
      .where(
        and(eq(SkillTable.userId, userId), eq(SkillTable.category, oldName)),
      );
  },
};
