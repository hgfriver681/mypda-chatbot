import { getSession } from "auth/server";
import { mcpArtifactRepository } from "lib/db/repository";

// DELETE: unpin one of your own artifacts. Owner-only.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { id } = await params;
  const isOwner = await mcpArtifactRepository.checkAccess(id, session.user.id);
  if (!isOwner) {
    return new Response("Forbidden", { status: 403 });
  }
  await mcpArtifactRepository.deleteById(id);
  return Response.json({ success: true });
}
