import { z } from "zod";

// A saved (pinned) MCP Artifact. Frozen snapshot: once saved the html does not
// change. Private to its owner — every read is filtered by userId.
export type McpArtifact = {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  html: string;
  // MCP server names the artifact may call. null/undefined = any accessible.
  allowedServers?: string[] | null;
  createdAt: Date;
};

// Sidebar list item — no html payload (kept light).
export type McpArtifactSummary = {
  id: string;
  title: string;
  createdAt: Date;
};

export const McpArtifactCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).nullish(),
  html: z.string().min(1),
  allowedServers: z.array(z.string()).nullish(),
});

export type McpArtifactRepository = {
  // Save a new pinned artifact for a user; returns the new id.
  insert(
    data: z.infer<typeof McpArtifactCreateSchema> & { userId: string },
  ): Promise<string>;
  // Sidebar list for one user (newest first).
  selectSummaryByUserId(userId: string): Promise<McpArtifactSummary[]>;
  // Full artifact for the standalone page; null if not found.
  selectById(id: string): Promise<McpArtifact | null>;
  // True if the artifact exists and belongs to the user.
  checkAccess(id: string, userId: string): Promise<boolean>;
  deleteById(id: string): Promise<void>;
};
