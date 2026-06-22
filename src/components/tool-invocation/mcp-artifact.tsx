"use client";

import { appStore } from "@/app/store";
import { buildArtifactDocument } from "lib/artifacts/frame";
import { Boxes } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

/**
 * Names of MCP servers enabled in the current chat (the "tools" menu). Artifacts
 * are scoped to the same servers as direct tool use, so an artifact cannot reach
 * a server the user has toggled off. Read fresh on each call so toggling takes
 * effect immediately. Undefined allowedMcpServers = not yet configured = allow all.
 */
function enabledServerNames(): Set<string> {
  const { allowedMcpServers, mcpList } = appStore.getState();
  const list = mcpList ?? [];
  return new Set(
    list
      .filter(
        (s) =>
          !allowedMcpServers ||
          (allowedMcpServers[s.id]?.tools?.length ?? 0) > 0,
      )
      .map((s) => s.name),
  );
}

// Platform built-in pseudo-servers that are always available to artifacts,
// regardless of the chat's MCP server toggle (e.g. the stateless "ai" tool).
const RESERVED_SERVERS = new Set(["ai"]);

type Props = {
  title?: string;
  description?: string | null;
  html?: string;
  /** MCP server names the artifact may call. null/undefined = any accessible. */
  allowedServers?: string[] | null;
  height?: number;
};

type BridgeRequest = {
  __mcpArtifact: true;
  dir: "request";
  id: number;
  op: "list" | "call";
  server?: string;
  tool?: string;
  args?: unknown;
};

/**
 * Renders an MCP Artifact (model-generated HTML) inside a locked-down sandboxed
 * iframe and bridges its `window.mcp` calls to the authenticated
 * /api/mcp/artifact-call route.
 *
 * Security: the iframe is sandboxed (allow-scripts only -> opaque origin) and
 * the document carries a strict CSP (connect-src 'none') via
 * buildArtifactDocument, so it has no network of its own. The only data path is
 * postMessage -> here -> the auth-checked server route. The optional
 * allowedServers white-list is enforced here; per-user access is enforced on the
 * server.
 */
export function McpArtifactView({
  title = "MCP Artifact",
  description,
  html,
  allowedServers,
  height = 540,
}: Props) {
  const ref = useRef<HTMLIFrameElement>(null);
  const srcDoc = useMemo(
    () => (html ? buildArtifactDocument(html, title) : ""),
    [html, title],
  );

  useEffect(() => {
    async function callApi(op: "list" | "call", body: Record<string, unknown>) {
      const res = await fetch("/api/mcp/artifact-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op, ...body }),
      });
      return res.json();
    }

    function onMessage(e: MessageEvent) {
      const iframe = ref.current;
      if (!iframe || e.source !== iframe.contentWindow) return;
      const d = e.data as BridgeRequest;
      if (!d || d.__mcpArtifact !== true || d.dir !== "request") return;

      const respond = (ok: boolean, payload?: unknown, error?: string) =>
        iframe.contentWindow?.postMessage(
          {
            __mcpArtifact: true,
            dir: "response",
            id: d.id,
            ok,
            payload,
            error,
          },
          "*",
        );

      (async () => {
        try {
          const enabled = enabledServerNames();
          if (d.op === "list") {
            const j = await callApi("list", {});
            if (!j.ok)
              return respond(false, undefined, j.error || "list failed");
            // Expose reserved built-ins + servers enabled in this chat.
            const servers = (j.servers ?? []).filter(
              (s: { name: string }) =>
                RESERVED_SERVERS.has(s.name) || enabled.has(s.name),
            );
            return respond(true, servers);
          }
          if (d.op === "call") {
            const reserved = RESERVED_SERVERS.has(d.server || "");
            // Respect the chat's MCP server toggle (reserved built-ins bypass it).
            if (!reserved && !enabled.has(d.server || "")) {
              return respond(
                false,
                undefined,
                `server not enabled in this chat: ${d.server}`,
              );
            }
            // Respect the artifact's own declared white-list, if any.
            if (
              !reserved &&
              Array.isArray(allowedServers) &&
              !allowedServers.includes(d.server || "")
            ) {
              return respond(
                false,
                undefined,
                `server not allowed: ${d.server}`,
              );
            }
            const j = await callApi("call", {
              server: d.server,
              tool: d.tool,
              args: d.args,
            });
            return j.ok
              ? respond(true, j.result)
              : respond(false, undefined, j.error || "call failed");
          }
          respond(false, undefined, "unknown op");
        } catch (err: any) {
          respond(false, undefined, err?.message ?? "bridge error");
        }
      })();
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [allowedServers]);

  if (!html) return null;

  return (
    <div className="rounded-lg border overflow-hidden my-1">
      <div className="px-3 py-2 border-b bg-muted/40 flex items-center gap-2">
        <Boxes className="size-3.5 shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{title}</div>
          {description && (
            <div className="text-xs text-muted-foreground truncate">
              {description}
            </div>
          )}
        </div>
      </div>
      <iframe
        ref={ref}
        title={title}
        srcDoc={srcDoc}
        sandbox="allow-scripts"
        className="w-full bg-[#0b0c0e] block"
        style={{ height, border: 0 }}
      />
    </div>
  );
}
