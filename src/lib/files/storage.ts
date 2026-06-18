// Per-account file storage over Supabase Storage (the single "file home").
// Files live under `<userId>/...`; the account prefix is hidden from callers,
// matching the Python MCP server (datapilot-pdf) so a file uploaded in the UI
// is visible to the agent's list_files for the same user.
//
// Server-side only: uses the Supabase service_role key over the Storage REST
// API (no @supabase/supabase-js dependency).

export function scope(account: string, path = ""): string {
  const p = (path || "").replace(/^\/+|\/+$/g, "");
  return p ? `${account}/${p}` : account;
}

export function unscope(account: string, full: string): string {
  const pre = `${account}/`;
  return full.startsWith(pre) ? full.slice(pre.length) : full;
}

export interface FileEntry {
  path: string; // user-relative
  size: number | null;
  updatedAt?: string | null;
}

const MAX_DEPTH = 6;

export class FilesStorage {
  private base: string;
  private bucket: string;
  private headers: Record<string, string>;
  private fetchImpl: typeof fetch;

  constructor(opts: {
    url: string;
    serviceKey: string;
    bucket: string;
    fetchImpl?: typeof fetch;
  }) {
    this.base = opts.url.replace(/\/$/, "");
    this.bucket = opts.bucket;
    this.headers = {
      apikey: opts.serviceKey,
      Authorization: `Bearer ${opts.serviceKey}`,
    };
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private async listOne(prefix: string): Promise<any[]> {
    const res = await this.fetchImpl(
      `${this.base}/storage/v1/object/list/${this.bucket}`,
      {
        method: "POST",
        headers: { ...this.headers, "Content-Type": "application/json" },
        body: JSON.stringify({ prefix, limit: 1000, offset: 0 }),
      },
    );
    if (!res.ok) throw new Error(`list failed: ${res.status}`);
    return (await res.json()) || [];
  }

  async list(account: string, prefix = "", _depth = 0): Promise<FileEntry[]> {
    const out: FileEntry[] = [];
    for (const entry of await this.listOne(scope(account, prefix))) {
      const name = entry?.name;
      if (!name) continue;
      const rel = prefix ? `${prefix}/${name}` : name;
      const isFolder = entry.id == null;
      if (isFolder) {
        if (_depth < MAX_DEPTH) out.push(...(await this.list(account, rel, _depth + 1)));
      } else {
        out.push({
          path: rel,
          size: entry.metadata?.size ?? null,
          updatedAt: entry.updated_at ?? null,
        });
      }
    }
    return out;
  }

  async upload(
    account: string,
    path: string,
    bytes: Uint8Array | ArrayBuffer,
    contentType = "application/octet-stream",
  ): Promise<void> {
    const res = await this.fetchImpl(
      `${this.base}/storage/v1/object/${this.bucket}/${scope(account, path)}`,
      {
        method: "POST",
        headers: { ...this.headers, "Content-Type": contentType, "x-upsert": "true" },
        body: bytes as any,
      },
    );
    if (!res.ok) throw new Error(`upload failed: ${res.status} ${await res.text()}`);
  }

  async remove(account: string, path: string): Promise<void> {
    const res = await this.fetchImpl(
      `${this.base}/storage/v1/object/${this.bucket}/${scope(account, path)}`,
      { method: "DELETE", headers: this.headers },
    );
    if (!res.ok) throw new Error(`delete failed: ${res.status}`);
  }

  async signedDownloadUrl(
    account: string,
    path: string,
    expiresIn = 3600,
  ): Promise<string> {
    const res = await this.fetchImpl(
      `${this.base}/storage/v1/object/sign/${this.bucket}/${scope(account, path)}`,
      {
        method: "POST",
        headers: { ...this.headers, "Content-Type": "application/json" },
        body: JSON.stringify({ expiresIn }),
      },
    );
    if (!res.ok) throw new Error(`sign failed: ${res.status}`);
    const { signedURL } = await res.json();
    return `${this.base}/storage/v1${signedURL}`;
  }
}

export function filesStorageFromEnv(): FilesStorage {
  return new FilesStorage({
    url: process.env.SUPABASE_URL!,
    serviceKey: process.env.SUPABASE_SERVICE_KEY!,
    bucket: process.env.STORAGE_BUCKET || "datapilot",
  });
}
