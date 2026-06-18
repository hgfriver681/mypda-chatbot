"use client";
import type { ApiKey } from "app-types/memory";
import { relativeTime } from "lib/memory/format";
import { fetcher } from "lib/utils";
import { Copy, KeyRoundIcon, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { Button } from "ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "ui/dialog";
import { Input } from "ui/input";

export function ApiKeysView({ embedded = false }: { embedded?: boolean } = {}) {
  const { data, isLoading, mutate } = useSWR<{ keys: ApiKey[] }>(
    `/api/memory/keys`,
    fetcher,
    { revalidateOnFocus: false },
  );
  const keys = data?.keys ?? [];

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null); // plaintext, shown once

  async function createKey() {
    setCreating(true);
    try {
      const res = await fetch("/api/memory/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const { key } = await res.json();
      setRevealed(key.plaintext);
      setName("");
      mutate();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    const res = await fetch(`/api/memory/keys/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Revoked");
      mutate();
    } else {
      toast.error("Revoke failed");
    }
  }

  return (
    <div className={embedded ? "w-full" : "mx-auto w-full max-w-4xl p-6"}>
      {!embedded && (
        <div className="flex items-center gap-2">
          <KeyRoundIcon className="size-6" />
          <h1 className="text-2xl font-bold">API Keys</h1>
        </div>
      )}
      <p className="mt-1 text-sm text-muted-foreground">
        Keys let an MCP client (e.g. a chat agent) reach your memory. Shown
        once.
      </p>

      <div className="mt-4 flex gap-2">
        <Input
          placeholder="key name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="max-w-xs"
          data-testid="api-key-name-input"
        />
        <Button
          data-testid="create-key-button"
          disabled={creating}
          onClick={createKey}
        >
          <Plus className="size-4" /> {creating ? "Creating…" : "Create key"}
        </Button>
      </div>

      <div className="mt-4 flex flex-col divide-y rounded-md border">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : keys.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No keys yet.</div>
        ) : (
          keys.map((k) => (
            <div
              key={k.id}
              data-testid="api-key-row"
              className="group flex items-center gap-3 p-4"
            >
              <code className="rounded bg-muted px-2 py-1 text-xs">
                {k.prefix}…
              </code>
              <span className="flex-1 text-sm">{k.name ?? "—"}</span>
              <span className="text-xs text-muted-foreground">
                {relativeTime(k.createdAt as unknown as string)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100"
                onClick={() => revoke(k.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      <Dialog open={!!revealed} onOpenChange={(o) => !o && setRevealed(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your new API key</DialogTitle>
            <DialogDescription>
              Copy it now — it will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <code
              data-testid="revealed-key"
              className="flex-1 break-all rounded bg-muted px-2 py-1 text-sm"
            >
              {revealed}
            </code>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(revealed ?? "");
                toast.success("Copied");
              }}
            >
              <Copy className="size-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setRevealed(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
