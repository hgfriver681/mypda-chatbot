import { ReplayPlayer } from "@/components/replay/replay-player";
import { getSession } from "auth/server";
import { chatExportRepository } from "lib/db/repository";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Any logged-in account can open a replay; only `demo` snapshots are replayable
// here (private exports are not exposed through this route).
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session?.user) return redirect("/login");
  const { id } = await params;
  const replay = await chatExportRepository.selectById(id);
  if (!replay || !replay.demo) return notFound();
  return <ReplayPlayer title={replay.title} messages={replay.messages} />;
}
