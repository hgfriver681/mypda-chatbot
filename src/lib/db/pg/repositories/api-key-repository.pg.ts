import { and, desc, eq, isNull } from "drizzle-orm";
import { pgDb as db } from "../db.pg";
import { MemoryApiKeyTable } from "../schema.pg";
import type { ApiKeyRepository } from "app-types/memory";

// Public projection: never select key_hash out of the DB.
const publicCols = {
  id: MemoryApiKeyTable.id,
  accountId: MemoryApiKeyTable.accountId,
  prefix: MemoryApiKeyTable.prefix,
  name: MemoryApiKeyTable.name,
  createdAt: MemoryApiKeyTable.createdAt,
  lastUsedAt: MemoryApiKeyTable.lastUsedAt,
  revokedAt: MemoryApiKeyTable.revokedAt,
};

export const pgApiKeyRepository: ApiKeyRepository = {
  async listApiKeys(accountId) {
    return db
      .select(publicCols)
      .from(MemoryApiKeyTable)
      .where(
        and(
          eq(MemoryApiKeyTable.accountId, accountId),
          isNull(MemoryApiKeyTable.revokedAt),
        ),
      )
      .orderBy(desc(MemoryApiKeyTable.createdAt));
  },

  async createApiKey(accountId, fields) {
    const [row] = await db
      .insert(MemoryApiKeyTable)
      .values({
        accountId,
        keyHash: fields.keyHash,
        prefix: fields.prefix,
        name: fields.name ?? null,
      })
      .returning(publicCols);
    return row;
  },

  async revokeApiKey(accountId, id) {
    await db
      .update(MemoryApiKeyTable)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(MemoryApiKeyTable.id, id),
          eq(MemoryApiKeyTable.accountId, accountId),
        ),
      );
  },
};
