"use server";

import { z } from "zod";
import type { MCPServerConfig } from "app-types/mcp";
import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";
import { mcpRepository } from "lib/db/repository";
import { requireAdminPermission } from "lib/auth/permissions";
import { pgDb } from "lib/db/pg/db.pg";
import { UserTable } from "lib/db/pg/schema.pg";

const nameSchema = z.string().regex(/^[a-zA-Z0-9\-]+$/, {
  message:
    "Name must contain only alphanumeric characters (A-Z, a-z, 0-9) and hyphens (-)",
});

type AdminUserMcp = {
  id: string;
  name: string;
  config: MCPServerConfig;
  visibility: "public" | "private";
  lastConnectionStatus: string | null;
};

/** List one user's MCP servers (admin sees config, incl. headers). */
export async function adminListUserMcpAction(
  targetUserId: string,
): Promise<AdminUserMcp[]> {
  await requireAdminPermission("manage user MCP servers");
  const all = await mcpRepository.selectAll();
  return all
    .filter((s) => s.userId === targetUserId)
    .map((s) => ({
      id: s.id,
      name: s.name,
      config: s.config,
      visibility: s.visibility,
      lastConnectionStatus: s.lastConnectionStatus ?? null,
    }));
}

/**
 * Create/update an MCP server owned by `targetUserId` (the unblock — the normal
 * save hardcodes the owner to the caller). DB write only; the client connects
 * lazily when the user (or a refresh) materializes it, so a row is never lost
 * just because the target isn't online right now.
 */
export async function adminSaveMcpForUserAction(
  targetUserId: string,
  input: { id?: string; name: string; config: MCPServerConfig },
): Promise<{ id: string }> {
  await requireAdminPermission("manage user MCP servers");
  const parsed = nameSchema.safeParse(input.name);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }
  const saved = await mcpRepository.save({
    id: input.id,
    name: input.name,
    config: input.config,
    userId: targetUserId,
    visibility: "private",
  });
  return { id: saved.id };
}

export async function adminDeleteUserMcpAction(
  serverId: string,
): Promise<{ success: true }> {
  await requireAdminPermission("manage user MCP servers");
  await mcpClientsManager.removeClient(serverId);
  return { success: true };
}

export async function adminRefreshUserMcpAction(
  serverId: string,
): Promise<{ success: true }> {
  await requireAdminPermission("manage user MCP servers");
  await mcpClientsManager.refreshClient(serverId);
  return { success: true };
}

/**
 * Provision a standard MCP config to every NON-admin user (skipping anyone who
 * already has a server with the same name). DB write only — no eager connect.
 */
export async function adminProvisionMcpForAllAction(input: {
  name: string;
  config: MCPServerConfig;
}): Promise<{ provisioned: number; skipped: number; total: number }> {
  await requireAdminPermission("provision MCP servers");
  const parsed = nameSchema.safeParse(input.name);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const users = await pgDb
    .select({ id: UserTable.id, role: UserTable.role })
    .from(UserTable);
  const targets = users.filter((u) => u.role !== "admin");

  const existing = await mcpRepository.selectAll();
  let provisioned = 0;
  let skipped = 0;
  for (const u of targets) {
    if (existing.some((s) => s.userId === u.id && s.name === input.name)) {
      skipped++;
      continue;
    }
    await mcpRepository.save({
      name: input.name,
      config: input.config,
      userId: u.id,
      visibility: "private",
    });
    provisioned++;
  }
  return { provisioned, skipped, total: targets.length };
}

/**
 * Refresh (reconnect) every MCP server so running clients pick up the latest
 * tools. Best-effort per server.
 */
export async function adminRefreshAllMcpAction(): Promise<{
  count: number;
  total: number;
}> {
  await requireAdminPermission("refresh MCP servers");
  const all = await mcpRepository.selectAll();
  const results = await Promise.allSettled(
    all.map((s) => mcpClientsManager.refreshClient(s.id)),
  );
  const count = results.filter((r) => r.status === "fulfilled").length;
  return { count, total: all.length };
}

/**
 * Inverse of provision: remove every MCP server whose name is in `names` (the
 * standard provisioned set, e.g. files-mcp / memory-mcp) from ALL users. The
 * admin's own public servers use different names (datapilot-pdf / mypda-memory)
 * so they are not touched. Best-effort per server.
 */
export async function adminUnprovisionMcpForAllAction(input: {
  names: string[];
}): Promise<{ removed: number; matched: number }> {
  await requireAdminPermission("unprovision MCP servers");
  const names = new Set((input.names ?? []).filter(Boolean));
  const all = await mcpRepository.selectAll();
  const targets = all.filter((s) => names.has(s.name));
  let removed = 0;
  for (const s of targets) {
    try {
      await mcpClientsManager.removeClient(s.id);
      removed++;
    } catch {
      // ignore individual failures
    }
  }
  return { removed, matched: targets.length };
}
