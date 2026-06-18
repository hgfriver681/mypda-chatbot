//@vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("lib/memory/server", () => ({
  syncSessionToMemory: vi.fn(),
  getSessionMemoryStatus: vi.fn(),
}));

const { syncSessionToMemory, getSessionMemoryStatus } = await import(
  "lib/memory/server"
);
const { GET, POST } = await import("./route");

beforeEach(() => vi.clearAllMocks());

describe("GET /api/memory/session", () => {
  it("returns the save status for a thread", async () => {
    (getSessionMemoryStatus as any).mockResolvedValue({ saved: true, behind: 0 });
    const res = await GET(
      new Request("http://x/api/memory/session?threadId=t1"),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: { saved: true, behind: 0 } });
    expect(getSessionMemoryStatus).toHaveBeenCalledWith("t1");
  });

  it("400s when threadId is missing", async () => {
    const res = await GET(new Request("http://x/api/memory/session"));
    expect(res.status).toBe(400);
    expect(getSessionMemoryStatus).not.toHaveBeenCalled();
  });

  it("maps the auth gate to 401", async () => {
    (getSessionMemoryStatus as any).mockRejectedValue(new Error("Unauthorized"));
    const res = await GET(
      new Request("http://x/api/memory/session?threadId=t1"),
    );
    expect(res.status).toBe(401);
  });
});

describe("POST /api/memory/session", () => {
  it("syncs the thread and returns the memory", async () => {
    (syncSessionToMemory as any).mockResolvedValue({ id: "m1" });
    const res = await POST(
      new Request("http://x/api/memory/session", {
        method: "POST",
        body: JSON.stringify({ threadId: "t1" }),
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ memory: { id: "m1" } });
    expect(syncSessionToMemory).toHaveBeenCalledWith("t1");
  });

  it("maps Forbidden to 403", async () => {
    (syncSessionToMemory as any).mockRejectedValue(new Error("Forbidden"));
    const res = await POST(
      new Request("http://x/api/memory/session", {
        method: "POST",
        body: JSON.stringify({ threadId: "t1" }),
      }),
    );
    expect(res.status).toBe(403);
  });
});
