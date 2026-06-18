import "server-only";
import { getSession } from "auth/server";
import {
  memoryRepository,
  apiKeyRepository,
  chatRepository,
} from "lib/db/repository";
import {
  buildSessionCapture,
  behindCount,
  toggleId,
  sessionSource,
  type CaptureMessage,
  type ChatCaptureMeta,
} from "./chat-capture";
import {
  CreateApiKeySchema,
  CreateMemorySchema,
  MemoryListQuerySchema,
  type ApiKey,
  type CreateApiKeyInput,
  type CreateMemoryInput,
  type Memory,
  type MemoryInvocation,
  type MemoryListQuery,
} from "app-types/memory";
import { generateApiKey } from "./api-key";

// Tenant boundary: every memory operation is scoped to the Better Auth session
// user id. We never accept a caller-supplied account id — same principle the
// Python MCP server uses (api_key -> account_id), applied at the app layer.
async function requireAccountId(): Promise<string> {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function listMyMemories(
  query?: Partial<MemoryListQuery>,
): Promise<Memory[]> {
  const accountId = await requireAccountId();
  return memoryRepository.listMemories(
    accountId,
    MemoryListQuerySchema.parse(query ?? {}),
  );
}

export async function createMyMemory(
  input: CreateMemoryInput,
): Promise<Memory> {
  const accountId = await requireAccountId();
  return memoryRepository.createMemory(accountId, CreateMemorySchema.parse(input));
}

export async function deleteMyMemory(id: string): Promise<void> {
  const accountId = await requireAccountId();
  await memoryRepository.deleteMemory(accountId, id);
}

export async function listMyInvocations(
  limit = 100,
): Promise<MemoryInvocation[]> {
  const accountId = await requireAccountId();
  return memoryRepository.listInvocations(accountId, limit);
}

export async function listMyApiKeys(): Promise<ApiKey[]> {
  const accountId = await requireAccountId();
  return apiKeyRepository.listApiKeys(accountId);
}

// The plaintext is returned exactly once (to show the user); only the sha256
// hash and a display prefix are persisted.
export async function createMyApiKey(
  input: CreateApiKeyInput,
): Promise<ApiKey & { plaintext: string }> {
  const accountId = await requireAccountId();
  const { name } = CreateApiKeySchema.parse(input);
  const key = generateApiKey();
  const row = await apiKeyRepository.createApiKey(accountId, {
    keyHash: key.hash,
    prefix: key.prefix,
    name,
  });
  return { ...row, plaintext: key.plaintext };
}

export async function revokeMyApiKey(id: string): Promise<void> {
  const accountId = await requireAccountId();
  await apiKeyRepository.revokeApiKey(accountId, id);
}

// ── Chat capture ──────────────────────────────────────────────────────────
// Save a chat thread (or a single turn) into Memory as a raw transcript.
// One record per session, keyed by `source = session:<threadId>` and upserted,
// so re-saving a growing thread overwrites rather than piling up copies.

export type SessionMemoryStatus = {
  saved: boolean;
  savedCount: number;
  currentCount: number;
  behind: number;
  memoryId: string | null;
  updatedAt: Date | null;
  importantMessageIds: string[];
};

// Access check + load. We verify the thread belongs to the session user before
// reading any messages — same tenant boundary the rest of the module enforces.
async function loadOwnedThread(
  threadId: string,
  accountId: string,
): Promise<CaptureMessage[]> {
  const ok = await chatRepository.checkAccess(threadId, accountId);
  if (!ok) throw new Error("Forbidden");
  const messages = await chatRepository.selectMessagesByThreadId(threadId);
  return messages as unknown as CaptureMessage[];
}

function existingImportantIds(memory: Memory | null): string[] {
  const meta = (memory?.structured ?? null) as ChatCaptureMeta | null;
  return meta?.importantMessageIds ?? [];
}

// Persist the whole thread, carrying any existing "important" flags forward.
async function upsertSession(
  accountId: string,
  threadId: string,
  messages: CaptureMessage[],
  importantMessageIds: string[],
): Promise<Memory> {
  const capture = buildSessionCapture(threadId, messages, importantMessageIds);
  if (!capture.content) throw new Error("Nothing to save: the chat is empty");
  return memoryRepository.upsertMemoryBySource(accountId, {
    content: capture.content,
    title: capture.title,
    kind: "chat_session",
    categories: [],
    structured: capture.structured,
    source: capture.source,
  });
}

export async function syncSessionToMemory(threadId: string): Promise<Memory> {
  const accountId = await requireAccountId();
  const messages = await loadOwnedThread(threadId, accountId);
  const existing = await memoryRepository.findMemoryBySource(
    accountId,
    sessionSource(threadId),
  );
  return upsertSession(
    accountId,
    threadId,
    messages,
    existingImportantIds(existing),
  );
}

// Toggle a message's "important" flag. This also (re)saves the whole thread,
// so flagging an answer in an unsaved chat captures the session too. Returns
// the updated record so the caller can refresh the flagged set.
export async function toggleSessionHighlight(
  threadId: string,
  messageId: string,
): Promise<Memory> {
  const accountId = await requireAccountId();
  const messages = await loadOwnedThread(threadId, accountId);
  if (!messages.some((m) => m.id === messageId))
    throw new Error("Message not found");
  const existing = await memoryRepository.findMemoryBySource(
    accountId,
    sessionSource(threadId),
  );
  const nextIds = toggleId(existingImportantIds(existing), messageId);
  return upsertSession(accountId, threadId, messages, nextIds);
}

export async function getSessionMemoryStatus(
  threadId: string,
): Promise<SessionMemoryStatus> {
  const accountId = await requireAccountId();
  const ok = await chatRepository.checkAccess(threadId, accountId);
  if (!ok) throw new Error("Forbidden");
  const messages = await chatRepository.selectMessagesByThreadId(threadId);
  const currentCount = messages.length;
  const existing = await memoryRepository.findMemoryBySource(
    accountId,
    sessionSource(threadId),
  );
  const meta = (existing?.structured ?? null) as ChatCaptureMeta | null;
  return {
    saved: Boolean(existing),
    savedCount: meta?.messageCountAtSave ?? 0,
    currentCount,
    behind: existing ? behindCount(currentCount, meta) : currentCount,
    memoryId: existing?.id ?? null,
    updatedAt: existing?.updatedAt ?? null,
    importantMessageIds: meta?.importantMessageIds ?? [],
  };
}
