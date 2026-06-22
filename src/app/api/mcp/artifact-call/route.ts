import { getSession } from "auth/server";
import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";
import {
  ARTIFACT_AI_SERVER,
  ARTIFACT_AI_SERVER_NAME,
  runArtifactAi,
} from "lib/artifacts/ai-tool";
import { selectMcpClientsAction } from "../actions";

function aiResult(text: string) {
  // Wrap in the MCP tool-result shape so window.mcp.text/json work uniformly.
  return { content: [{ type: "text", text }], isError: false };
}

/**
 * The ONLY backend channel an MCP Artifact can reach.
 *
 * An artifact runs in a locked-down sandboxed iframe (strict CSP, `connect-src
 * 'none'`), so it cannot make any network request itself. Its `window.mcp`
 * bridge postMessages to the parent app, and the parent calls this route. All
 * authorization happens here: the request must carry a valid session, and the
 * target server must be one the user can actually access. MCP credentials never
 * leave the server.
 *
 * Body:
 *   { op: "list" }                          -> accessible servers + tool names
 *   { op: "call", server, tool, args }      -> result of an MCP tool call
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}) as any);
  const op = body?.op;

  // Servers this user is allowed to use (their own + shared).
  const servers = await selectMcpClientsAction();

  if (op === "list") {
    return Response.json({
      ok: true,
      // Built-in platform AI tool first, then the user's MCP servers.
      servers: [
        ARTIFACT_AI_SERVER,
        ...servers.map((s) => ({
          id: s.id,
          name: s.name,
          tools: (s.toolInfo ?? []).map((t) => ({
            name: t.name,
            description: t.description,
          })),
        })),
      ],
    });
  }

  if (op === "call") {
    const { server, tool, args } = body ?? {};
    if (typeof server !== "string" || typeof tool !== "string") {
      return Response.json(
        { ok: false, error: "server and tool are required" },
        { status: 400 },
      );
    }

    // Built-in platform AI tool (stateless LLM exposed as an MCP-style tool).
    if (server === ARTIFACT_AI_SERVER_NAME) {
      try {
        const text = await runArtifactAi(tool, args ?? {});
        return Response.json({ ok: true, result: aiResult(text) });
      } catch (error: any) {
        return Response.json(
          { ok: false, error: error?.message ?? "AI call failed" },
          { status: 200 },
        );
      }
    }

    // Resolve by name to an id the user is authorized for; never trust a raw id.
    const target = servers.find((s) => s.name === server || s.id === server);
    if (!target) {
      return Response.json(
        { ok: false, error: `Server not accessible: ${server}` },
        { status: 403 },
      );
    }
    try {
      const result = await mcpClientsManager.toolCall(
        target.id,
        tool,
        args ?? {},
      );
      return Response.json({ ok: true, result });
    } catch (error: any) {
      return Response.json(
        { ok: false, error: error?.message ?? "Tool call failed" },
        { status: 200 },
      );
    }
  }

  return Response.json({ ok: false, error: "Unknown op" }, { status: 400 });
}
