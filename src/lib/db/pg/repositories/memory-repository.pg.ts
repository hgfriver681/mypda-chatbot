import { and, arrayContains, desc, eq, gte, sql } from "drizzle-orm";
import { pgDb as db } from "../db.pg";
import { MemoryTable, MemoryInvocationTable } from "../schema.pg";
import type {
  MemoryRepository,
  MemoryListQuery,
  CreateMemoryValues,
} from "app-types/memory";

function rangeSince(range: MemoryListQuery["range"]): Date | null {
  if (range === "7d") return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (range === "30d") return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return null;
}

export const pgMemoryRepository: MemoryRepository = {
  async listMemories(accountId, query) {
    const since = rangeSince(query?.range ?? "all");
    const conditions = [eq(MemoryTable.accountId, accountId)];
    if (since) conditions.push(gte(MemoryTable.createdAt, since));
    if (query?.category)
      conditions.push(arrayContains(MemoryTable.categories, [query.category]));
    return db
      .select()
      .from(MemoryTable)
      .where(and(...conditions))
      .orderBy(desc(MemoryTable.createdAt));
  },

  async createMemory(accountId, input: CreateMemoryValues) {
    const [row] = await db
      .insert(MemoryTable)
      .values({
        accountId,
        content: input.content,
        title: input.title ?? null,
        kind: input.kind,
        summary: input.summary ?? null,
        categories: input.categories,
        structured: input.structured ?? null,
        source: input.source ?? null,
      })
      .returning();
    return row;
  },

  async findMemoryBySource(accountId, source) {
    const [row] = await db
      .select()
      .from(MemoryTable)
      .where(
        and(
          eq(MemoryTable.accountId, accountId),
          eq(MemoryTable.source, source),
        ),
      )
      .limit(1);
    return row ?? null;
  },

  async upsertMemoryBySource(accountId, input: CreateMemoryValues) {
    if (!input.source) throw new Error("source is required for upsert");
    const existing = await pgMemoryRepository.findMemoryBySource(
      accountId,
      input.source,
    );
    if (existing) {
      const [row] = await db
        .update(MemoryTable)
        .set({
          content: input.content,
          title: input.title ?? null,
          kind: input.kind,
          summary: input.summary ?? null,
          categories: input.categories,
          structured: input.structured ?? null,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(MemoryTable.id, existing.id))
        .returning();
      return row;
    }
    return pgMemoryRepository.createMemory(accountId, input);
  },

  async deleteMemory(accountId, id) {
    await db
      .delete(MemoryTable)
      .where(and(eq(MemoryTable.id, id), eq(MemoryTable.accountId, accountId)));
  },

  async listInvocations(accountId, limit = 100) {
    return db
      .select()
      .from(MemoryInvocationTable)
      .where(eq(MemoryInvocationTable.accountId, accountId))
      .orderBy(desc(MemoryInvocationTable.createdAt))
      .limit(limit);
  },
};
