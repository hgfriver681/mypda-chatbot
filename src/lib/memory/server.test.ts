//@vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("lib/db/repository", () => ({
  memoryRepository: {
    listMemories: vi.fn(),
    createMemory: vi.fn(),
    deleteMemory: vi.fn(),
    listInvocations: vi.fn(),
    findMemoryBySource: vi.fn(),
    upsertMemoryBySource: vi.fn(),
  },
  apiKeyRepository: {
    listApiKeys: vi.fn(),
    createApiKey: vi.fn(),
    revokeApiKey: vi.fn(),
  },
  chatRepository: {
    checkAccess: vi.fn(),
    selectMessagesByThreadId: vi.fn(),
  },
}));

vi.mock("auth/server", () => ({ getSession: vi.fn() }));

const { memoryRepository, apiKeyRepository, chatRepository } = await import(
  "lib/db/repository"
);
const { getSession } = await import("auth/server");
const {
  listMyMemories,
  createMyMemory,
  deleteMyMemory,
  listMyApiKeys,
  createMyApiKey,
  revokeMyApiKey,
  syncSessionToMemory,
  getSessionMemoryStatus,
  toggleSessionHighlight,
} = await import("./server");

const ME = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  (getSession as any).mockResolvedValue({ user: { id: ME } });
});

describe("memory server — auth gate", () => {
  it("throws Unauthorized when there is no session", async () => {
    (getSession as any).mockResolvedValue(null);
    await expect(listMyMemories()).rejects.toThrow(/unauthorized/i);
    expect(memoryRepository.listMemories).not.toHaveBeenCalled();
  });
});

describe("memory server — tenant scoping", () => {
  it("always scopes reads to the session user id, never a caller-supplied id", async () => {
    (memoryRepository.listMemories as any).mockResolvedValue([]);
    await listMyMemories({ range: "7d" });
    expect(memoryRepository.listMemories).toHaveBeenCalledWith(ME, {
      range: "7d",
    });
  });

  it("createMyMemory validates input and tags it with the session id", async () => {
    (memoryRepository.createMemory as any).mockImplementation(
      (_id: string, input: any) => ({ id: "m1", ...input }),
    );
    await createMyMemory({ content: "hi", categories: ["sop"] });
    expect(memoryRepository.createMemory).toHaveBeenCalledWith(
      ME,
      expect.objectContaining({ content: "hi", kind: "text", categories: ["sop"] }),
    );
  });

  it("createMyMemory rejects empty content before hitting the repo", async () => {
    await expect(createMyMemory({ content: "" } as any)).rejects.toBeTruthy();
    expect(memoryRepository.createMemory).not.toHaveBeenCalled();
  });

  it("deleteMyMemory passes both the session id and the target id", async () => {
    await deleteMyMemory("mem-9");
    expect(memoryRepository.deleteMemory).toHaveBeenCalledWith(ME, "mem-9");
  });
});

describe("memory server — api keys", () => {
  it("createMyApiKey returns the plaintext once and stores only hash+prefix", async () => {
    (apiKeyRepository.createApiKey as any).mockImplementation(
      (_id: string, fields: any) => ({
        id: "k1",
        accountId: _id,
        prefix: fields.prefix,
        name: fields.name ?? null,
        createdAt: new Date(),
        lastUsedAt: null,
        revokedAt: null,
      }),
    );

    const result = await createMyApiKey({ name: "laptop" });

    // plaintext surfaced to caller, in the mpda_ format
    expect(result.plaintext).toMatch(/^mpda_[A-Za-z0-9_-]{32}$/);

    // repo received hash + prefix, NEVER the plaintext
    const [accountId, fields] = (apiKeyRepository.createApiKey as any).mock
      .calls[0];
    expect(accountId).toBe(ME);
    expect(fields.keyHash).toMatch(/^[0-9a-f]{64}$/);
    expect(fields.prefix).toBe(result.plaintext.slice(0, 14));
    expect(JSON.stringify(fields)).not.toContain(result.plaintext);
  });

  it("listMyApiKeys / revokeMyApiKey are scoped to the session id", async () => {
    (apiKeyRepository.listApiKeys as any).mockResolvedValue([]);
    await listMyApiKeys();
    expect(apiKeyRepository.listApiKeys).toHaveBeenCalledWith(ME);
    await revokeMyApiKey("key-7");
    expect(apiKeyRepository.revokeApiKey).toHaveBeenCalledWith(ME, "key-7");
  });
});

const text = (t: string) => ({ type: "text", text: t });
const THREAD = "thread-77";

describe("chat capture — syncSessionToMemory", () => {
  beforeEach(() => {
    (chatRepository.checkAccess as any).mockResolvedValue(true);
    (memoryRepository.upsertMemoryBySource as any).mockImplementation(
      (_id: string, input: any) => ({ id: "m1", ...input }),
    );
  });

  it("checks access, serializes the thread, and upserts a chat_session memory", async () => {
    (chatRepository.selectMessagesByThreadId as any).mockResolvedValue([
      { id: "u1", role: "user", parts: [text("first question here")] },
      { id: "a1", role: "assistant", parts: [text("the answer")] },
    ]);

    await syncSessionToMemory(THREAD);

    expect(chatRepository.checkAccess).toHaveBeenCalledWith(THREAD, ME);
    const [accountId, input] = (memoryRepository.upsertMemoryBySource as any)
      .mock.calls[0];
    expect(accountId).toBe(ME);
    expect(input.kind).toBe("chat_session");
    expect(input.source).toBe("session:thread-77");
    expect(input.title).toBe("first question here");
    expect(input.content).toContain("## Assistant");
    expect(input.structured.messageCountAtSave).toBe(2);
  });

  it("refuses to save when the thread is not owned by the session user", async () => {
    (chatRepository.checkAccess as any).mockResolvedValue(false);
    await expect(syncSessionToMemory(THREAD)).rejects.toThrow(/forbidden/i);
    expect(memoryRepository.upsertMemoryBySource).not.toHaveBeenCalled();
  });

  it("refuses to save an empty thread", async () => {
    (chatRepository.selectMessagesByThreadId as any).mockResolvedValue([]);
    await expect(syncSessionToMemory(THREAD)).rejects.toThrow(/empty/i);
    expect(memoryRepository.upsertMemoryBySource).not.toHaveBeenCalled();
  });
});

describe("chat capture — getSessionMemoryStatus", () => {
  beforeEach(() => {
    (chatRepository.checkAccess as any).mockResolvedValue(true);
  });

  it("reports unsaved with behind = current count when no memory exists", async () => {
    (chatRepository.selectMessagesByThreadId as any).mockResolvedValue([
      { id: "u1", role: "user", parts: [text("q")] },
      { id: "a1", role: "assistant", parts: [text("a")] },
    ]);
    (memoryRepository.findMemoryBySource as any).mockResolvedValue(null);

    const status = await getSessionMemoryStatus(THREAD);
    expect(status).toMatchObject({
      saved: false,
      savedCount: 0,
      currentCount: 2,
      behind: 2,
      memoryId: null,
      importantMessageIds: [],
    });
  });

  it("computes how many messages were added and surfaces the flagged ids", async () => {
    (chatRepository.selectMessagesByThreadId as any).mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({
        id: `m${i}`,
        role: i % 2 ? "assistant" : "user",
        parts: [text("x")],
      })),
    );
    (memoryRepository.findMemoryBySource as any).mockResolvedValue({
      id: "m1",
      updatedAt: new Date("2026-06-18T00:00:00Z"),
      structured: {
        sourceSessionId: THREAD,
        messageCountAtSave: 3,
        importantMessageIds: ["m1"],
      },
    });

    const status = await getSessionMemoryStatus(THREAD);
    expect(status).toMatchObject({
      saved: true,
      savedCount: 3,
      currentCount: 5,
      behind: 2,
      memoryId: "m1",
      importantMessageIds: ["m1"],
    });
  });
});

describe("chat capture — toggleSessionHighlight", () => {
  beforeEach(() => {
    (chatRepository.checkAccess as any).mockResolvedValue(true);
    (chatRepository.selectMessagesByThreadId as any).mockResolvedValue([
      { id: "u1", role: "user", parts: [text("the prompt")] },
      { id: "a1", role: "assistant", parts: [text("the answer")] },
    ]);
    (memoryRepository.upsertMemoryBySource as any).mockImplementation(
      (_id: string, input: any) => ({ id: "m1", ...input }),
    );
  });

  it("flags a message and saves the whole thread as one chat_session", async () => {
    (memoryRepository.findMemoryBySource as any).mockResolvedValue(null);

    await toggleSessionHighlight(THREAD, "a1");

    const [accountId, input] = (memoryRepository.upsertMemoryBySource as any)
      .mock.calls[0];
    expect(accountId).toBe(ME);
    expect(input.kind).toBe("chat_session");
    expect(input.source).toBe("session:thread-77");
    expect(input.content).toContain("## Assistant");
    expect(input.structured.importantMessageIds).toEqual(["a1"]);
    expect(input.structured.highlights).toEqual([
      { id: "a1", role: "assistant", text: "the answer" },
    ]);
  });

  it("un-flags a message that was already important", async () => {
    (memoryRepository.findMemoryBySource as any).mockResolvedValue({
      id: "m1",
      structured: { sourceSessionId: THREAD, importantMessageIds: ["a1"] },
    });

    await toggleSessionHighlight(THREAD, "a1");

    const [, input] = (memoryRepository.upsertMemoryBySource as any).mock
      .calls[0];
    expect(input.structured.importantMessageIds).toEqual([]);
    expect(input.structured.highlights).toEqual([]);
  });

  it("throws when the message id is not in the thread", async () => {
    await expect(toggleSessionHighlight(THREAD, "nope")).rejects.toThrow(
      /not found/i,
    );
    expect(memoryRepository.upsertMemoryBySource).not.toHaveBeenCalled();
  });
});
