import { McpArtifactView } from "@/components/tool-invocation/mcp-artifact";
import { getSession } from "auth/server";
import { mcpArtifactRepository } from "lib/db/repository";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Standalone full-page view of a saved (pinned) MCP Artifact. Private: only the
// owner can open it. Renders the frozen snapshot with no chat context.
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session?.user?.id) return redirect("/login");
  const { id } = await params;
  const artifact = await mcpArtifactRepository.selectById(id);
  if (!artifact || artifact.userId !== session.user.id) return notFound();

  return (
    <div className="flex flex-col h-full w-full p-2 sm:p-4">
      <McpArtifactView
        title={artifact.title}
        description={artifact.description}
        html={artifact.html}
        allowedServers={artifact.allowedServers}
        standalone
      />
    </div>
  );
}
