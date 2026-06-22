import { McpArtifactCreateSchema } from "app-types/mcp-artifact";
import { getSession } from "auth/server";
import { mcpArtifactRepository } from "lib/db/repository";

// GET: this user's saved (pinned) artifacts for the sidebar. Private — filtered
// by the session user, never global.
export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const artifacts = await mcpArtifactRepository.selectSummaryByUserId(
    session.user.id,
  );
  return Response.json({ artifacts });
}

// POST: pin an artifact to the sidebar. Body is the artifact snapshot
// { title, description?, html, allowedServers? }. Frozen at save time.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = McpArtifactCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid artifact", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const id = await mcpArtifactRepository.insert({
    ...parsed.data,
    userId: session.user.id,
  });
  return Response.json({ id });
}
