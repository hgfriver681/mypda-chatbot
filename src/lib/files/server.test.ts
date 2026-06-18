//@vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const fakeStore = {
  list: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  signedDownloadUrl: vi.fn(),
};
vi.mock("./storage", async () => {
  const actual = await vi.importActual<any>("./storage");
  return { ...actual, filesStorageFromEnv: () => fakeStore };
});

vi.mock("auth/server", () => ({ getSession: vi.fn() }));

const { getSession } = await import("auth/server");
const {
  listMyFiles,
  uploadMyFile,
  deleteMyFile,
  getMyDownloadUrl,
  sanitizeFilename,
} = await import("./server");

const ME = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  (getSession as any).mockResolvedValue({ user: { id: ME } });
});

describe("files server — auth gate", () => {
  it("throws Unauthorized with no session", async () => {
    (getSession as any).mockResolvedValue(null);
    await expect(listMyFiles()).rejects.toThrow(/unauthorized/i);
    expect(fakeStore.list).not.toHaveBeenCalled();
  });
});

describe("files server — tenant scoping", () => {
  it("lists only the session user's files", async () => {
    fakeStore.list.mockResolvedValue([{ path: "a.pdf", size: 1 }]);
    const r = await listMyFiles();
    expect(fakeStore.list).toHaveBeenCalledWith(ME);
    expect(r).toEqual([{ path: "a.pdf", size: 1 }]);
  });

  it("uploads under the session user, sanitizing the filename", async () => {
    await uploadMyFile("../../etc/passwd.pdf", new Uint8Array([1]), "application/pdf");
    const [acct, name] = fakeStore.upload.mock.calls[0];
    expect(acct).toBe(ME);
    expect(name).toBe("passwd.pdf"); // path components stripped
  });

  it("delete and download are scoped to the session user", async () => {
    await deleteMyFile("a.pdf");
    expect(fakeStore.remove).toHaveBeenCalledWith(ME, "a.pdf");
    fakeStore.signedDownloadUrl.mockResolvedValue("https://signed");
    expect(await getMyDownloadUrl("a.pdf")).toBe("https://signed");
    expect(fakeStore.signedDownloadUrl).toHaveBeenCalledWith(ME, "a.pdf");
  });
});

describe("sanitizeFilename", () => {
  it("keeps a normal name, strips directories and control chars", () => {
    expect(sanitizeFilename("report.pdf")).toBe("report.pdf");
    expect(sanitizeFilename("a/b/c.pdf")).toBe("c.pdf");
    expect(sanitizeFilename("..\\..\\x.pdf")).toBe("x.pdf");
  });
  it("falls back to a default when empty", () => {
    expect(sanitizeFilename("")).toMatch(/^file/);
  });
});
