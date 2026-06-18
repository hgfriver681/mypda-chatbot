import { z } from "zod";
import type {
  MemoryEntity,
  MemoryApiKeyEntity,
  MemoryInvocationEntity,
} from "lib/db/pg/schema.pg";

// Entity types (rows as stored). The API key never exposes its hash to clients.
export type Memory = MemoryEntity;
export type MemoryInvocation = MemoryInvocationEntity;
export type ApiKey = Omit<MemoryApiKeyEntity, "keyHash">;

export const MEMORY_KINDS = [
  "text",
  "trajectory",
  // A captured chat transcript (raw, not summarized): one upserted record per
  // thread. Individual answers are flagged via structured.importantMessageIds
  // rather than stored as separate rows.
  "chat_session",
] as const;
export type MemoryKind = (typeof MEMORY_KINDS)[number];

export const CreateMemorySchema = z.object({
  content: z.string().min(1, "content is required"),
  title: z.string().max(200).optional(),
  kind: z.enum(MEMORY_KINDS).default("text"),
  summary: z.string().max(500).optional(),
  categories: z.array(z.string().min(1)).max(32).default([]),
  structured: z.unknown().optional(),
  source: z.string().max(100).optional(),
});
// What a caller provides (defaults still optional)…
export type CreateMemoryInput = z.input<typeof CreateMemorySchema>;
// …and what the repository receives after validation (defaults applied).
export type CreateMemoryValues = z.output<typeof CreateMemorySchema>;

export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
});
export type CreateApiKeyInput = z.infer<typeof CreateApiKeySchema>;

export const MEMORY_RANGES = ["all", "7d", "30d"] as const;
export type MemoryRange = (typeof MEMORY_RANGES)[number];

export const MemoryListQuerySchema = z.object({
  range: z.enum(MEMORY_RANGES).default("all"),
  category: z.string().min(1).optional(),
});
export type MemoryListQuery = z.infer<typeof MemoryListQuerySchema>;

// Repository contract — implemented by the drizzle pg repository, mocked in tests.
export interface MemoryRepository {
  listMemories(accountId: string, query?: MemoryListQuery): Promise<Memory[]>;
  createMemory(accountId: string, input: CreateMemoryValues): Promise<Memory>;
  deleteMemory(accountId: string, id: string): Promise<void>;
  listInvocations(accountId: string, limit?: number): Promise<MemoryInvocation[]>;
  // Source-keyed upsert, used for captured chat transcripts. The `source`
  // string (e.g. `session:<threadId>`) is the natural key: saving the same
  // session again overwrites the existing record instead of inserting a copy.
  findMemoryBySource(accountId: string, source: string): Promise<Memory | null>;
  upsertMemoryBySource(
    accountId: string,
    input: CreateMemoryValues,
  ): Promise<Memory>;
}

export interface ApiKeyRepository {
  listApiKeys(accountId: string): Promise<ApiKey[]>;
  createApiKey(
    accountId: string,
    fields: { keyHash: string; prefix: string; name?: string },
  ): Promise<ApiKey>;
  revokeApiKey(accountId: string, id: string): Promise<void>;
}
