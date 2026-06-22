"use client";

import { appStore } from "@/app/store";
import { buildArtifactDocument } from "lib/artifacts/frame";
import { cn } from "lib/utils";
import { Boxes, Check, Pin, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";

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
  /**
   * Standalone = rendered on its own /artifact/[id] page (no chat context).
   * In that mode there is no chat "tools" toggle to scope against, so the
   * artifact's own saved `allowedServers` white-list governs instead, and the
   * view fills the viewport with a refresh control. Inline (chat) mode shows a
   * "pin to sidebar" button instead.
   */
  standalone?: boolean;
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
  standalone = false,
}: Props) {
  const t = useTranslations();
  const ref = useRef<HTMLIFrameElement>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [pinned, setPinned] = useState(false);
  const [pinning, setPinning] = useState(false);
  const srcDoc = useMemo(
    () => (html ? buildArtifactDocument(html, title) : ""),
    [html, title],
  );

  // In standalone mode the artifact may only reach the servers it was saved
  // with (its white-list); with no white-list, any server the user can access.
  const allowList = useMemo(
    () => (Array.isArray(allowedServers) ? new Set(allowedServers) : null),
    [allowedServers],
  );

  const pin = useCallback(async () => {
    if (!html || pinning || pinned) return;
    setPinning(true);
    try {
      const res = await fetch("/api/artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, html, allowedServers }),
      });
      if (!res.ok) throw new Error(await res.text());
      setPinned(true);
      mutate("/api/artifacts");
      toast.success(t("Artifact.pinned"));
    } catch {
      toast.error(t("Artifact.pinFailed"));
    } finally {
      setPinning(false);
    }
  }, [html, title, description, allowedServers, pinning, pinned, t]);

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

      // Is `server` reachable from this artifact? Reserved built-ins always are.
      // Inline (chat): must be enabled in the chat's tools toggle. Standalone:
      // governed by the saved allowedServers white-list (null = any accessible).
      const canReach = (server: string) => {
        if (RESERVED_SERVERS.has(server)) return true;
        if (standalone) return !allowList || allowList.has(server);
        if (!enabledServerNames().has(server)) return false;
        return !allowList || allowList.has(server);
      };

      (async () => {
        try {
          if (d.op === "list") {
            const j = await callApi("list", {});
            if (!j.ok)
              return respond(false, undefined, j.error || "list failed");
            const servers = (j.servers ?? []).filter(
              (s: { name: string }) =>
                RESERVED_SERVERS.has(s.name) || canReach(s.name),
            );
            return respond(true, servers);
          }
          if (d.op === "call") {
            if (!canReach(d.server || "")) {
              return respond(
                false,
                undefined,
                `server not available to this artifact: ${d.server}`,
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
  }, [allowList, standalone]);

  if (!html) return null;

  const iframeEl = (
    <iframe
      key={reloadKey}
      ref={ref}
      title={title}
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      className={cn(
        "w-full bg-[#0b0c0e] block",
        standalone && "flex-1 min-h-0",
      )}
      style={standalone ? { border: 0 } : { height, border: 0 }}
    />
  );

  return (
    <div
      className={cn(
        "rounded-lg border overflow-hidden",
        standalone ? "flex flex-col h-full min-h-0" : "my-1",
      )}
    >
      <div className="px-3 py-2 border-b bg-muted/40 flex items-center gap-2">
        <Boxes className="size-3.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{title}</div>
          {description && (
            <div className="text-xs text-muted-foreground truncate">
              {description}
            </div>
          )}
        </div>
        {standalone ? (
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <RefreshCw className="size-3.5" />
            {t("Artifact.refresh")}
          </button>
        ) : (
          <button
            type="button"
            onClick={pin}
            disabled={pinning || pinned}
            className="shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-60"
          >
            {pinned ? (
              <Check className="size-3.5" />
            ) : (
              <Pin className="size-3.5" />
            )}
            {pinned ? t("Artifact.pinned") : t("Artifact.pinToSidebar")}
          </button>
        )}
      </div>
      {iframeEl}
    </div>
  );
}
