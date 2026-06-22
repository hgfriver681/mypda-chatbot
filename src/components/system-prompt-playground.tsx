"use client";

import { Button } from "ui/button";
import { Badge } from "ui/badge";
import { Label } from "ui/label";
import { Switch } from "ui/switch";
import { ScrollArea } from "ui/scroll-area";
import { Skeleton } from "ui/skeleton";
import { Check, Copy, Info, Loader2, ScrollText, Server } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { fetcher } from "lib/utils";

type ServerMeta = {
  id: string;
  name: string;
  toolCount: number;
  included: boolean;
  contributes: boolean;
  hasCustomization: boolean;
};

type ToolDef = {
  name: string;
  description?: string;
  parameters: unknown;
  server: string;
};

type PreviewResponse = {
  merged: string;
  tools: ToolDef[];
  meta: { servers: ServerMeta[] };
};

async function fetchPreview(
  mcpServerIds: string[] | null,
): Promise<PreviewResponse> {
  return fetcher("/api/chat/system-prompt-preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mcpServerIds }),
  });
}

export default function SystemPromptPlayground() {
  const t = useTranslations("SystemPromptPlayground");

  const [data, setData] = useState<PreviewResponse | null>(null);
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Initial load: send null so the server defaults to "all servers selected"
  // and returns the full server list to seed the toggles.
  useEffect(() => {
    let active = true;
    fetchPreview(null)
      .then((res) => {
        if (!active) return;
        setData(res);
        setSelected(
          new Set(res.meta.servers.filter((s) => s.included).map((s) => s.id)),
        );
      })
      .catch((e) => toast.error(e?.message ?? "Failed to load preview"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const refetch = useCallback((ids: Set<string>) => {
    setLoading(true);
    fetchPreview([...ids])
      .then((res) => setData(res))
      .catch((e) => toast.error(e?.message ?? "Failed to load preview"))
      .finally(() => setLoading(false));
  }, []);

  const toggle = useCallback(
    (id: string, on: boolean) => {
      setSelected((prev) => {
        const next = new Set(prev ?? []);
        if (on) next.add(id);
        else next.delete(id);
        refetch(next);
        return next;
      });
    },
    [refetch],
  );

  const onCopy = useCallback(() => {
    if (!data?.merged) return;
    navigator.clipboard.writeText(data.merged).then(() => {
      setCopied(true);
      toast.success(t("copied"));
      setTimeout(() => setCopied(false), 1500);
    });
  }, [data?.merged, t]);

  const servers = data?.meta.servers ?? [];
  const tools = data?.tools ?? [];

  return (
    <ScrollArea className="h-full w-full">
      <div className="pt-8 flex flex-col gap-6 px-8 max-w-5xl mx-auto pb-12">
        <div className="flex items-start gap-3">
          <ScrollText className="size-6 mt-1 shrink-0" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("description")}
            </p>
          </div>
          {loading && (
            <Loader2 className="size-4 animate-spin text-muted-foreground mt-2" />
          )}
        </div>

        {/* Anatomy explainer: what a model actually receives as input */}
        <div className="rounded-md border bg-muted/30 p-4 text-sm">
          <div className="flex items-center gap-2 font-semibold mb-2">
            <Info className="size-4" />
            {t("anatomyTitle")}
          </div>
          <p className="text-muted-foreground mb-2">{t("anatomyIntro")}</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>{t("anatomySystem")}</li>
            <li>{t("anatomyTools")}</li>
            <li>{t("anatomyMessages")}</li>
          </ol>
          <p className="text-muted-foreground mt-2 text-xs">
            {t("anatomyParams")}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {t("anatomyNote")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
          {/* Left: MCP server toggles */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Server className="size-4" />
              {t("serversTitle")}
            </div>
            {servers.length === 0 && !loading ? (
              <p className="text-sm text-muted-foreground">{t("noServers")}</p>
            ) : (
              <div className="flex flex-col gap-1">
                {servers.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/60 cursor-pointer"
                  >
                    <Switch
                      checked={selected?.has(s.id) ?? false}
                      onCheckedChange={(on) => toggle(s.id, on)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm truncate">{s.name}</span>
                        {s.contributes && (
                          <Badge variant="secondary" className="text-[10px]">
                            {t("contributes")}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {t("toolCount", { count: s.toolCount })}
                        {s.hasCustomization && ` · ${t("hasCustomization")}`}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Right: the two channels the model receives — system prompt + tools */}
          <div className="flex flex-col gap-6 min-w-0">
            {/* 1. System prompt — exact raw text */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">
                  {t("systemPromptTitle")}
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCopy}
                  disabled={!data?.merged}
                >
                  {copied ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {copied ? t("copied") : t("copy")}
                </Button>
              </div>
              {!data ? (
                <Skeleton className="h-72 w-full" />
              ) : (
                <pre className="rounded-md border bg-muted/30 px-4 py-3 text-xs whitespace-pre-wrap break-words font-mono leading-relaxed">
                  {data.merged}
                </pre>
              )}
            </div>

            {/* 2. Tools — definitions sent on the separate `tools` channel */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-semibold">
                {t("toolsTitle", { count: tools.length })}
              </Label>
              {!data ? (
                <Skeleton className="h-40 w-full" />
              ) : tools.length === 0 ? (
                <p className="rounded-md border border-dashed px-4 py-3 text-xs text-muted-foreground italic">
                  {t("toolsEmpty")}
                </p>
              ) : (
                <pre className="rounded-md border bg-muted/30 px-4 py-3 text-xs whitespace-pre-wrap break-words font-mono leading-relaxed">
                  {JSON.stringify(
                    tools.map((tool) => ({
                      name: tool.name,
                      description: tool.description,
                      parameters: tool.parameters,
                    })),
                    null,
                    2,
                  )}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
