import {
  McpArtifact,
  McpArtifactCreateSchema,
  McpArtifactRepository,
  McpArtifactSummary,
} from "app-types/mcp-artifact";
import { and, eq, sql } from "drizzle-orm";
import z from "zod";
import { pgDb } from "../db.pg";
import { McpArtifactTable } from "../schema.pg";

function toMcpArtifact(
  data: typeof McpArtifactTable.$inferSelect,
): McpArtifact {
  return {
    id: data.id,
    userId: data.userId,
    title: data.title,
    description: data.description ?? undefined,
    html: data.html,
    allowedServers: data.allowedServers ?? undefined,
    createdAt: data.createdAt,
  };
}

export const pgMcpArtifactRepository: McpArtifactRepository = {
  insert: async (data) => {
    const { userId, ...rest } = data;
    const parsed = McpArtifactCreateSchema.parse(rest) as z.infer<
      typeof McpArtifactCreateSchema
    >;
    const result = await pgDb
      .insert(McpArtifactTable)
      .values({
        userId,
        title: parsed.title,
        description: parsed.description ?? null,
        html: parsed.html,
        allowedServers: parsed.allowedServers ?? null,
      })
      .returning();
    return result[0].id;
  },
  selectSummaryByUserId: async (userId) => {
    const result = await pgDb
      .select({
        id: McpArtifactTable.id,
        title: McpArtifactTable.title,
        createdAt: McpArtifactTable.createdAt,
      })
      .from(McpArtifactTable)
      .where(eq(McpArtifactTable.userId, userId))
      .orderBy(sql`${McpArtifactTable.createdAt} DESC`);
    return result as McpArtifactSummary[];
  },
  selectById: async (id) => {
    const [result] = await pgDb
      .select()
      .from(McpArtifactTable)
      .where(eq(McpArtifactTable.id, id));
    return result ? toMcpArtifact(result) : null;
  },
  checkAccess: async (id, userId) => {
    const result = await pgDb
      .select({ id: McpArtifactTable.id })
      .from(McpArtifactTable)
      .where(
        and(eq(McpArtifactTable.id, id), eq(McpArtifactTable.userId, userId)),
      );
    return result.length > 0;
  },
  deleteById: async (id) => {
    await pgDb.delete(McpArtifactTable).where(eq(McpArtifactTable.id, id));
  },
};
