import "server-only";
import { getSession } from "auth/server";
import { filesStorageFromEnv, type FileEntry } from "./storage";

// Files are scoped to the Better Auth session user id — the same prefix the
// datapilot-pdf MCP server uses, so a file uploaded here is what the agent sees.
async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export function sanitizeFilename(name: string): string {
  // strip any directory components (handles / and \) then drop control chars,
  // keeping spaces / dots / hyphens / unicode.
  const base = (name || "").split(/[/\\]/).pop() || "";
  const clean = Array.from(base)
    .filter((c) => c.charCodeAt(0) >= 0x20)
    .join("")
    .trim();
  return clean || `file-${Date.now()}`;
}

export async function listMyFiles(): Promise<FileEntry[]> {
  const userId = await requireUserId();
  return filesStorageFromEnv().list(userId);
}

export async function uploadMyFile(
  name: string,
  bytes: Uint8Array | ArrayBuffer,
  contentType?: string,
): Promise<{ path: string }> {
  const userId = await requireUserId();
  const safe = sanitizeFilename(name);
  await filesStorageFromEnv().upload(userId, safe, bytes, contentType);
  return { path: safe };
}

export async function deleteMyFile(path: string): Promise<void> {
  const userId = await requireUserId();
  await filesStorageFromEnv().remove(userId, path);
}

export async function getMyDownloadUrl(path: string): Promise<string> {
  const userId = await requireUserId();
  return filesStorageFromEnv().signedDownloadUrl(userId, path);
}
