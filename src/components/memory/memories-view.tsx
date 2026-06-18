"use client";
import useSWR from "swr";
import { useMemo, useState } from "react";
import { fetcher } from "lib/utils";
import { Button } from "ui/button";
import { Badge } from "ui/badge";
import { Textarea } from "ui/textarea";
import { Input } from "ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "ui/dialog";
import { toast } from "sonner";
import { RefreshCw, Plus, Trash2, BrainIcon } from "lucide-react";
import type { Memory, MemoryRange } from "app-types/memory";
import { relativeTime, collectCategories } from "lib/memory/format";

const RANGES: MemoryRange[] = ["all", "7d", "30d"];
const RANGE_LABEL: Record<MemoryRange, string> = {
  all: "All Time",
  "7d": "7d",
  "30d": "30d",
};

export function MemoriesView() {
  const [range, setRange] = useState<MemoryRange>("all");
  const [category, setCategory] = useState<string | null>(null);

  const qs = new URLSearchParams({ range });
  if (category) qs.set("category", category);
  const { data, isLoading, mutate } = useSWR<{ memories: Memory[] }>(
    `/api/memory?${qs.toString()}`,
    fetcher,
    { revalidateOnFocus: false },
  );
  const memories = data?.memories ?? [];

  // Category chips are derived from the full (unfiltered) set.
  const { data: allData } = useSWR<{ memories: Memory[] }>(
    `/api/memory?range=all`,
    fetcher,
    { revalidateOnFocus: false },
  );
  const categories = useMemo(
    () => collectCategories(allData?.memories ?? []),
    [allData],
  );

  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [cats, setCats] = useState("");
  const [saving, setSaving] = useState(false);

  async function addMemory() {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          categories: cats
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast.success("Memory added");
      setContent("");
      setCats("");
      setOpen(false);
      mutate();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/memory/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Deleted");
      mutate();
    } else {
      toast.error("Delete failed");
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrainIcon className="size-6" />
          <h1 className="text-2xl font-bold">Memories</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button
            size="sm"
            data-testid="add-memory-button"
            onClick={() => setOpen(true)}
          >
            <Plus className="size-4" /> Add memory
          </Button>
        </div>
      </div>

      <p className="mt-1 text-sm text-muted-foreground">
        {memories.length} memories. Added via MCP or here, in sync.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <Badge
            key={r}
            variant={range === r ? "default" : "secondary"}
            className="cursor-pointer"
            onClick={() => setRange(r)}
          >
            {RANGE_LABEL[r]}
          </Badge>
        ))}
        {categories.length > 0 && <span className="mx-1 text-border">|</span>}
        <Badge
          variant={category === null ? "default" : "secondary"}
          className="cursor-pointer"
          onClick={() => setCategory(null)}
        >
          all
        </Badge>
        {categories.map((c) => (
          <Badge
            key={c}
            variant={category === c ? "default" : "secondary"}
            className="cursor-pointer"
            onClick={() => setCategory(c)}
          >
            {c}
          </Badge>
        ))}
      </div>

      <div className="mt-4 flex flex-col divide-y rounded-md border">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : memories.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No memories yet.
          </div>
        ) : (
          memories.map((m) => (
            <div
              key={m.id}
              data-testid="memory-row"
              className="group flex items-start gap-3 p-4"
            >
              <span className="w-16 shrink-0 pt-0.5 text-xs text-muted-foreground">
                {relativeTime(m.createdAt as unknown as string)}
              </span>
              <div className="min-w-0 flex-1">
                {m.title && <div className="font-medium">{m.title}</div>}
                <div className="truncate text-sm text-muted-foreground">
                  {m.content}
                </div>
                {m.categories.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {m.categories.map((c) => (
                      <Badge key={c} variant="outline" className="text-xs">
                        {c}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100"
                onClick={() => remove(m.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add memory</DialogTitle>
          </DialogHeader>
          <Textarea
            data-testid="memory-content-input"
            placeholder="What should I remember?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
          />
          <Input
            placeholder="categories (comma separated, optional)"
            value={cats}
            onChange={(e) => setCats(e.target.value)}
          />
          <DialogFooter>
            <Button
              data-testid="save-memory-button"
              disabled={saving || !content.trim()}
              onClick={addMemory}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
