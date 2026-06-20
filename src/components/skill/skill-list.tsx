"use client";

import type { SkillSelect } from "app-types/skill";
import { useCallback, useEffect, useRef, useState } from "react";

// Slice 0 walking-skeleton UI: upload a skill zip, list skills, download,
// delete. Intentionally minimal — grouping, in-app editing, bundles, and i18n
// land in later slices (see docs/skill-platform/ROADMAP.md).

type LoadState = "loading" | "ready" | "error";

export function SkillList() {
  const [skills, setSkills] = useState<SkillSelect[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/skills");
      if (!res.ok) throw new Error((await res.json()).error ?? "載入失敗");
      const data = await res.json();
      setSkills(data.skills ?? []);
      setState("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "載入失敗");
      setState("error");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onUpload = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/skills", { method: "POST", body: form });
        if (!res.ok) throw new Error((await res.json()).error ?? "上傳失敗");
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "上傳失敗");
      } finally {
        setBusy(false);
        if (fileInput.current) fileInput.current.value = "";
      }
    },
    [refresh],
  );

  const onDelete = useCallback(
    async (id: string) => {
      setBusy(true);
      try {
        const res = await fetch(`/api/skills?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "刪除失敗");
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "刪除失敗");
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">技能</h1>
          <p className="text-sm text-muted-foreground">
            上傳 SKILL.md 技能包（.zip），在聊天中呼叫使用。
          </p>
        </div>
        <label className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 aria-disabled:opacity-50">
          {busy ? "處理中…" : "上傳技能 (.zip)"}
          <input
            ref={fileInput}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
            }}
          />
        </label>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {state === "loading" && (
        <p className="text-sm text-muted-foreground">載入中…</p>
      )}

      {state === "ready" && skills.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          還沒有技能。上傳一個 .zip 技能包開始（資料夾內含 SKILL.md）。
        </div>
      )}

      {state === "ready" && skills.length > 0 && (
        <ul className="flex flex-col gap-2">
          {skills.map((skill) => (
            <li
              key={skill.id}
              className="flex items-center justify-between gap-4 rounded-lg border p-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{skill.name}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    v{skill.version}
                  </span>
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {skill.description}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-sm">
                <a
                  href={`/api/skills/${skill.id}/download`}
                  className="text-primary hover:underline"
                >
                  下載
                </a>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onDelete(skill.id)}
                  className="text-destructive hover:underline disabled:opacity-50"
                >
                  刪除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
