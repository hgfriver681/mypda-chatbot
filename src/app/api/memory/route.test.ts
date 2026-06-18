//@vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("lib/memory/server", () => ({
  listMyMemories: vi.fn(),
  createMyMemory: vi.fn(),
}));

const { listMyMemories, createMyMemory } = await import("lib/memory/server");
const { GET, POST } = await import("./route");

beforeEach(() => vi.clearAllMocks());

describe("GET /api/memory", () => {
  it("parses range/category from the query and returns the list", async () => {
    (listMyMemories as any).mockResolvedValue([{ id: "m1" }]);
    const res = await GET(
      new Request("http://x/api/memory?range=7d&category=sop"),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ memories: [{ id: "m1" }] });
    expect(listMyMemories).toHaveBeenCalledWith({ range: "7d", category: "sop" });
  });

  it("maps the Unauthorized gate to 401", async () => {
    (listMyMemories as any).mockRejectedValue(new Error("Unauthorized"));
    const res = await GET(new Request("http://x/api/memory"));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/memory", () => {
  it("creates a memory and returns 201", async () => {
    (createMyMemory as any).mockResolvedValue({ id: "m2", content: "hi" });
    const res = await POST(
      new Request("http://x/api/memory", {
        method: "POST",
        body: JSON.stringify({ content: "hi" }),
      }),
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ memory: { id: "m2", content: "hi" } });
    expect(createMyMemory).toHaveBeenCalledWith({ content: "hi" });
  });
});
