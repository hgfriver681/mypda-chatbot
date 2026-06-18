"use client";
import useSWR from "swr";
import { useState } from "react";
import { fetcher } from "lib/utils";
import { Button } from "ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { toast } from "sonner";
import { BrainCircuit, Check, Loader } from "lucide-react";
import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";

type SessionStatus = {
  saved: boolean;
  savedCount: number;
  currentCount: number;
  behind: number;
  memoryId: string | null;
  updatedAt: string | null;
  importantMessageIds: string[];
};

// Header button that saves the whole current chat into Memory (raw transcript).
// One memory per thread, upserted — re-saving a growing thread overwrites it.
// Shows a "dirty" state: unsaved / synced / N messages behind.
export function SaveSessionButton() {
  const [threadId] = appStore(useShallow((s) => [s.currentThreadId]));
  const [busy, setBusy] = useState(false);

  const { data, mutate } = useSWR<{ status: SessionStatus }>(
    threadId ? `/api/memory/session?threadId=${threadId}` : null,
    fetcher,
    { revalidateOnFocus: true },
  );

  if (!threadId) return null;

  const status = data?.status;
  const behind = status?.behind ?? 0;
  const saved = status?.saved ?? false;
  const importantCount = status?.importantMessageIds?.length ?? 0;
  const upToDate = saved && behind === 0;

  async function save() {
    if (!threadId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/memory/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId }),
      });
      if (!res.ok)
        throw new Error((await res.json()).error ?? "Save failed");
      toast.success("已存入 Memory");
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const importantSuffix = importantCount > 0 ? `,${importantCount} 則重要` : "";
  const label = upToDate
    ? `已同步到 Memory(${status?.currentCount ?? 0} 則${importantSuffix})`
    : saved
      ? `Memory 落後 ${behind} 則，點擊更新`
      : "存整個對話到 Memory";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="bg-secondary/40 relative"
          data-testid="save-session-button"
          disabled={busy}
          onClick={save}
        >
          {busy ? (
            <Loader className="size-4 animate-spin" />
          ) : upToDate ? (
            <Check className="size-4 text-green-500" />
          ) : (
            <BrainCircuit className="size-4" />
          )}
          {saved && behind > 0 && !busy && (
            <span className="absolute right-1 top-1 size-2 rounded-full bg-amber-500" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent align="end" side="bottom">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
