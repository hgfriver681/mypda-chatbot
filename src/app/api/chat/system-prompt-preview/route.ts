import { getSession } from "auth/server";
import { userRepository } from "lib/db/repository";
import {
  buildMcpServerCustomizationsSystemPrompt,
  buildMcpServerInstructionsSystemPrompt,
  buildUserSystemPrompt,
} from "lib/ai/prompts";
import { createMCPToolId } from "lib/ai/mcp/mcp-tool-id";
import { VercelAIMcpTool } from "app-types/mcp";

import {
  mergeSystemPrompt,
  filterMcpServerCustomizations,
} from "../shared.chat";
import { rememberMcpServerCustomizationsAction } from "../actions";
import { selectMcpClientsAction } from "../../mcp/actions";

/**
 * Read-only preview of the system prompt that a *new* chat would send.
 *
 * It reuses the exact same builders as the real chat route
 * (`buildUserSystemPrompt` + `buildMcpServerCustomizationsSystemPrompt` +
 * `mergeSystemPrompt`), so the preview can never drift from reality.
 *
 * MVP simulation: a selected MCP server is treated as "all of its tools are in
 * scope" (mirrors `filterMcpServerCustomizations`, which keys off the tools that
 * are active in a request). `toolChoice` / `@mention` simulation is intentionally
 * out of scope for this version.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  // null/undefined => default to every accessible server selected.
  const requestedIds: string[] | null = Array.isArray(body?.mcpServerIds)
    ? body.mcpServerIds
    : null;

  const [servers, userPreferences, customizations] = await Promise.all([
    selectMcpClientsAction(),
    userRepository.getPreferences(session.user.id),
    rememberMcpServerCustomizationsAction(session.user.id),
  ]);

  const selectedIds = new Set(
    requestedIds ?? servers.map((server) => server.id),
  );

  // Build a synthetic MCP_TOOLS map: every tool of each selected server, so
  // `filterMcpServerCustomizations` keeps that server's customization prompt.
  // `toolDefs` collects the same tools in the shape the model actually receives
  // on the separate `tools` channel (name + description + parameter schema).
  const simulatedTools: Record<string, VercelAIMcpTool> = {};
  const toolDefs: {
    name: string;
    description?: string;
    parameters: unknown;
    server: string;
  }[] = [];
  for (const server of servers) {
    if (!selectedIds.has(server.id)) continue;
    for (const tool of server.toolInfo ?? []) {
      const id = createMCPToolId(server.name, tool.name);
      simulatedTools[id] = {
        description: tool.description,
        _mcpServerName: server.name,
        _mcpServerId: server.id,
        _originToolName: tool.name,
      } as VercelAIMcpTool;
      toolDefs.push({
        name: id,
        description: tool.description,
        parameters: tool.inputSchema ?? {},
        server: server.name,
      });
    }
  }

  const filteredCustomizations = filterMcpServerCustomizations(
    simulatedTools,
    customizations,
  );

  // Server-declared instructions for the selected servers.
  const serverInstructions = servers.reduce<Record<string, string>>(
    (acc, server) => {
      if (selectedIds.has(server.id) && server.instructions?.trim()) {
        acc[server.name] = server.instructions;
      }
      return acc;
    },
    {},
  );

  const userSegment = buildUserSystemPrompt(
    session.user,
    userPreferences || undefined,
    undefined,
  );
  const instructionsSegment =
    buildMcpServerInstructionsSystemPrompt(serverInstructions);
  const mcpSegment = buildMcpServerCustomizationsSystemPrompt(
    filteredCustomizations,
  );
  const merged = mergeSystemPrompt(
    userSegment,
    instructionsSegment,
    mcpSegment,
  );

  return Response.json({
    merged,
    tools: toolDefs,
    meta: {
      servers: servers.map((server) => {
        const custom = customizations[server.id];
        const hasCustomization = Boolean(
          custom?.prompt || Object.keys(custom?.tools ?? {}).length,
        );
        return {
          id: server.id,
          name: server.name,
          toolCount: server.toolInfo?.length ?? 0,
          included: selectedIds.has(server.id),
          contributes: Boolean(filteredCustomizations[server.id]),
          hasCustomization,
        };
      }),
    },
  });
}
