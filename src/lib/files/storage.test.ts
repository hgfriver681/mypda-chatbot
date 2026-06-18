import { describe, it, expect, vi } from "vitest";
import { FilesStorage, scope, unscope } from "./storage";

// Per-account file storage over Supabase Storage. Files live under
// `<userId>/...`; the account prefix is hidden from callers (UI shows
// user-relative paths). Mirrors the Python MCP server's scheme so a file
// uploaded here is visible to the agent's list_files (same prefix).

describe("scope/unscope", () => {
  it("scopes a user-relative path under the account", () => {
    expect(scope("u1", "report.pdf")).toBe("u1/report.pdf");
    expect(scope("u1", "/a/b/")).toBe("u1/a/b");
    expect(scope("u1", "")).toBe("u1");
  });
  it("strips the account prefix on the way out", () => {
    expect(unscope("u1", "u1/report.pdf")).toBe("report.pdf");
    expect(unscope("u1", "other/x.pdf")).toBe("other/x.pdf");
  });
});

function fakeFetch(routes: Record<string, any>) {
  const calls: { url: string; init: any }[] = [];
  const f = vi.fn(async (url: string, init: any) => {
    calls.push({ url, init });
    for (const [pat, resp] of Object.entries(routes)) {
      if (url.includes(pat)) {
        return {
          ok: true,
          status: 200,
          json: async () => (typeof resp === "function" ? resp(url, init) : resp),
          arrayBuffer: async () => new TextEncoder().encode("PDFBYTES").buffer,
          text: async () => "",
        } as any;
      }
    }
    return { ok: false, status: 404, json: async () => ({}), text: async () => "not found" } as any;
  });
  return { f, calls };
}

function makeStore(fetchImpl: any) {
  return new FilesStorage({
    url: "https://proj.supabase.co",
    serviceKey: "svc",
    bucket: "datapilot",
    fetchImpl,
  });
}

describe("FilesStorage.list", () => {
  it("lists files under the user's prefix and returns user-relative paths", async () => {
    const { f } = fakeFetch({
      "/object/list/datapilot": (_u: string, init: any) => {
        const prefix = JSON.parse(init.body).prefix;
        if (prefix === "u1")
          return [{ name: "report.pdf", id: "1", metadata: { size: 100 } },
                  { name: "sub", id: null, metadata: null }];
        if (prefix === "u1/sub")
          return [{ name: "old.pdf", id: "2", metadata: { size: 200 } }];
        return [];
      },
    });
    const files = await makeStore(f).list("u1");
    const paths = files.map((x) => x.path).sort();
    expect(paths).toEqual(["report.pdf", "sub/old.pdf"]);
    expect(files.find((x) => x.path === "report.pdf")!.size).toBe(100);
  });
});

describe("FilesStorage.upload / remove / signedDownloadUrl", () => {
  it("uploads to the scoped object path", async () => {
    const { f, calls } = fakeFetch({ "/object/datapilot/u1/report.pdf": {} });
    await makeStore(f).upload("u1", "report.pdf", new Uint8Array([1, 2, 3]), "application/pdf");
    expect(calls[0].url).toContain("/object/datapilot/u1/report.pdf");
    expect(calls[0].init.method).toBe("POST");
  });

  it("deletes the scoped object path", async () => {
    const { f, calls } = fakeFetch({ "/object/datapilot/u1/report.pdf": {} });
    await makeStore(f).remove("u1", "report.pdf");
    expect(calls[0].init.method).toBe("DELETE");
    expect(calls[0].url).toContain("/object/datapilot/u1/report.pdf");
  });

  it("returns a full signed download URL", async () => {
    const { f } = fakeFetch({
      "/object/sign/datapilot/u1/report.pdf": { signedURL: "/object/sign/datapilot/u1/report.pdf?token=abc" },
    });
    const url = await makeStore(f).signedDownloadUrl("u1", "report.pdf");
    expect(url).toBe("https://proj.supabase.co/storage/v1/object/sign/datapilot/u1/report.pdf?token=abc");
  });
});
