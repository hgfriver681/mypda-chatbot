//@vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("lib/memory/server", () => ({
  toggleSessionHighlight: vi.fn(),
}));

const { toggleSessionHighlight } = await import("lib/memory/server");
const { POST } = await import("./route");

beforeEach(() => vi.clearAllMocks());

function post(body: unknown) {
  return POST(
    new Request("http://x/api/memory/session/highlight", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/memory/session/highlight", () => {
  it("toggles the flag and returns the updated memory", async () => {
    (toggleSessionHighlight as any).mockResolvedValue({ id: "m1" });
    const res = await post({ threadId: "t1", messageId: "a1" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ memory: { id: "m1" } });
    expect(toggleSessionHighlight).toHaveBeenCalledWith("t1", "a1");
  });

  it("400s when messageId is missing", async () => {
    const res = await post({ threadId: "t1" });
    expect(res.status).toBe(400);
    expect(toggleSessionHighlight).not.toHaveBeenCalled();
  });

  it("maps a missing message to 404", async () => {
    (toggleSessionHighlight as any).mockRejectedValue(
      new Error("Message not found"),
    );
    const res = await post({ threadId: "t1", messageId: "x" });
    expect(res.status).toBe(404);
  });
});
