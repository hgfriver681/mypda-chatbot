"use client";
import useSWR from "swr";
import { useRef, useState } from "react";
import { fetcher } from "lib/utils";
import { Button } from "ui/button";
import { toast } from "sonner";
import { FolderIcon, Upload, Trash2, FileIcon, RefreshCw } from "lucide-react";
import { relativeTime } from "lib/memory/format";
import type { FileEntry } from "lib/files/storage";

function humanSize(n: number | null): string {
  if (n == null) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function FilesView() {
  const { data, isLoading, mutate } = useSWR<{ files: FileEntry[] }>(
    "/api/files",
    fetcher,
    { revalidateOnFocus: false },
  );
  const files = data?.files ?? [];
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/files", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json()).error ?? "Upload failed");
      toast.success(`已上傳 ${file.name}`);
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(path: string) {
    const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("已刪除");
      mutate();
    } else {
      toast.error("刪除失敗");
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderIcon className="size-6" />
          <h1 className="text-2xl font-bold">Files</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button
            size="sm"
            data-testid="upload-file-button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="size-4" /> {busy ? "上傳中…" : "Upload"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            data-testid="file-input"
            onChange={onPick}
          />
        </div>
      </div>

      <p className="mt-1 text-sm text-muted-foreground">
        {files.length === 1 ? "1 file" : `${files.length} files`}
      </p>

      <div className="mt-4 flex flex-col divide-y rounded-md border">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : files.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            還沒有檔案。用右上角 Upload 上傳。
          </div>
        ) : (
          files.map((f) => (
            <div
              key={f.path}
              data-testid="file-row"
              className="group flex items-center gap-3 p-3"
            >
              <FileIcon className="size-4 shrink-0 text-muted-foreground" />
              <a
                href={`/api/files/download?path=${encodeURIComponent(f.path)}`}
                className="min-w-0 flex-1 truncate text-sm hover:underline"
                title="點擊下載"
              >
                {f.path}
              </a>
              <span className="shrink-0 text-xs text-muted-foreground">
                {humanSize(f.size)}
              </span>
              {f.updatedAt && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {relativeTime(f.updatedAt)}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100"
                onClick={() => remove(f.path)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
