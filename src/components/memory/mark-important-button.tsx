"use client";
import useSWR from "swr";
import { useState } from "react";
import { fetcher, cn } from "lib/utils";
import { Button } from "ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { toast } from "sonner";
import { Bookmark, Loader } from "lucide-react";

type SessionStatus = { importantMessageIds: string[] };

// Per-answer toggle. Flagging a message marks it "important" on the thread's
// single session memory AND saves the whole conversation — there is no separate
// per-turn record, so one conversation is always exactly one memory row.
// Shares the SWR key with SaveSessionButton, so toggling refreshes both.
export function MarkImportantButton({
  threadId,
  messageId,
}: {
  threadId?: string;
  messageId: string;
}) {
  const [busy, setBusy] = useState(false);
  const { data, mutate } = useSWR<{ status: SessionStatus }>(
    threadId ? `/api/memory/session?threadId=${threadId}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  // Without a persisted thread there is nothing to reference; hide the action.
  if (!threadId) return null;

  const important =
    data?.status?.importantMessageIds?.includes(messageId) ?? false;

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch("/api/memory/session/highlight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, messageId }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast.success(
        important ? "已取消重要標記" : "已標記為重要,並存入整串對話",
      );
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-3! p-4!"
          data-testid="mark-important-button"
          disabled={busy}
          onClick={toggle}
        >
          {busy ? (
            <Loader className="animate-spin" />
          ) : (
            <Bookmark className={cn(important && "fill-amber-500 text-amber-500")} />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {important ? "已標記重要(點擊取消)" : "標記為重要(並存整串對話)"}
      </TooltipContent>
    </Tooltip>
  );
}
