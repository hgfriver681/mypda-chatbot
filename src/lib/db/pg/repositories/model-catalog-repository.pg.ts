import { eq } from "drizzle-orm";
import { pgDb } from "../db.pg";
import { ModelCatalogConfigTable } from "../schema.pg";

const SINGLETON_ID = "singleton";

/**
 * Single-row store for the admin-managed model catalog (which OpenRouter
 * models + OpenAI-compatible providers are exposed). `config` is stored as
 * opaque JSON; callers (model-catalog.ts) validate the shape with zod.
 */
export const pgModelCatalogRepository = {
  get: async (): Promise<unknown | null> => {
    const [row] = await pgDb
      .select()
      .from(ModelCatalogConfigTable)
      .where(eq(ModelCatalogConfigTable.id, SINGLETON_ID));
    return row?.config ?? null;
  },
  upsert: async (config: unknown): Promise<void> => {
    await pgDb
      .insert(ModelCatalogConfigTable)
      .values({ id: SINGLETON_ID, config, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: ModelCatalogConfigTable.id,
        set: { config, updatedAt: new Date() },
      });
  },
};
