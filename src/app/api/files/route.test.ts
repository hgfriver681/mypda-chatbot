//@vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("lib/files/server", () => ({
  listMyFiles: vi.fn(),
  uploadMyFile: vi.fn(),
  deleteMyFile: vi.fn(),
}));

const { listMyFiles, deleteMyFile } = await import("lib/files/server");
const { GET, DELETE } = await import("./route");

beforeEach(() => vi.clearAllMocks());

describe("GET /api/files", () => {
  it("returns the user's files", async () => {
    (listMyFiles as any).mockResolvedValue([{ path: "a.pdf", size: 1 }]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ files: [{ path: "a.pdf", size: 1 }] });
  });
  it("maps Unauthorized to 401", async () => {
    (listMyFiles as any).mockRejectedValue(new Error("Unauthorized"));
    expect((await GET()).status).toBe(401);
  });
});

describe("DELETE /api/files", () => {
  it("deletes by ?path", async () => {
    const res = await DELETE(new Request("http://x/api/files?path=a.pdf", { method: "DELETE" }));
    expect(res.status).toBe(200);
    expect(deleteMyFile).toHaveBeenCalledWith("a.pdf");
  });
  it("400 when path missing", async () => {
    const res = await DELETE(new Request("http://x/api/files", { method: "DELETE" }));
    expect(res.status).toBe(400);
    expect(deleteMyFile).not.toHaveBeenCalled();
  });
});
