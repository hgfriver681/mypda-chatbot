import { getSession } from "auth/auth-instance";
import { chatExportRepository } from "lib/db/repository";
import { getIsUserAdmin } from "lib/user/utils";

// DELETE: remove a snapshot from the global replay list (admin only).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (!getIsUserAdmin(session.user)) {
    return new Response("Admin only", { status: 403 });
  }
  const { id } = await params;
  await chatExportRepository.deleteById(id);
  return Response.json({ success: true });
}
