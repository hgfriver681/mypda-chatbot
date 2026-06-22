import { tool as createTool } from "ai";
import { z } from "zod";

/**
 * MCP Artifact tool. The model writes a self-contained HTML UI that renders in
 * a locked-down sandboxed iframe. The artifact has NO backend of its own — its
 * only way to reach data is the injected `window.mcp` bridge, which proxies to
 * the user's MCP servers through an authenticated route. (CSP blocks all other
 * network access.)
 *
 * Like the visualization tools, this renders client-side from the tool INPUT;
 * `execute` just acknowledges.
 */
export const createMcpArtifactTool = createTool({
  description: [
    "Create an interactive HTML artifact that renders in a sandboxed panel.",
    "The artifact is FRONTEND-ONLY: HTML + CSS + JS, animations are fine.",
    "Its ONLY backend is MCP. Call MCP tools from inside the HTML via the",
    "injected global API:",
    "  await window.mcp.servers() -> [{id,name,tools:[{name,description}]}]",
    "  await window.mcp.call(serverName, toolName, argsObject) -> MCP result",
    "  window.mcp.text(result) / window.mcp.json(result) -> extract text/JSON",
    "fetch/XHR/WebSocket are blocked by CSP — window.mcp is the only data path.",
    "Use this when the user wants a custom UI/dashboard/viewer over MCP data.",
  ].join(" "),
  inputSchema: z.object({
    title: z.string().describe("Short title of the artifact. Max 5 words."),
    description: z
      .string()
      .nullable()
      .describe("Optional one-sentence description."),
    html: z
      .string()
      .describe(
        "Self-contained HTML body for the artifact (you may include <style> and <script>). " +
          "Do NOT include <html>/<head>/<body> wrappers — they are added automatically. " +
          "Use window.mcp for all data access.",
      ),
    allowedServers: z
      .array(z.string())
      .nullable()
      .describe(
        "MCP server names this artifact is allowed to call. Use the names from the system prompt. " +
          "Null means any server the user can access.",
      ),
  }),
  execute: async () => {
    return "Artifact created.";
  },
});
