"use client";

import { buildArtifactDocument } from "lib/artifacts/frame";
import { Boxes } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

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
          if (d.op === "list") {
            const j = await callApi("list", {});
            return j.ok
              ? respond(true, j.servers)
              : respond(false, undefined, j.error || "list failed");
          }
          if (d.op === "call") {
            if (
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
