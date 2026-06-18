import { getSession } from "auth/auth-instance";
import { chatExportRepository, chatRepository } from "lib/db/repository";
import { getIsUserAdmin } from "lib/user/utils";

// GET: the global replay/demo list — visible to every logged-in account (no user
// filter; that's what makes it shared across accounts).
export async function GET() {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const demos = await chatExportRepository.selectDemos();
  return Response.json({ replays: demos });
}

// POST { threadId }: promote one of your own threads into the global replay list
// (admin only). Snapshots the messages so the replay stays reproducible even if
// the original thread later changes.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (!getIsUserAdmin(session.user)) {
    return new Response("Admin only", { status: 403 });
  }
  const { threadId } = (await req.json()) as { threadId?: string };
  if (!threadId) {
    return new Response("threadId required", { status: 400 });
  }
  const isAccess = await chatRepository.checkAccess(threadId, session.user.id);
  if (!isAccess) return new Response("Unauthorized", { status: 401 });

  const id = await chatExportRepository.exportChat({
    threadId,
    exporterId: session.user.id,
    demo: true,
  });
  return Response.json({ id });
}
