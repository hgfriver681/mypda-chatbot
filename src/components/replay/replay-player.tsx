"use client";
import type { ChatExport } from "app-types/chat-export";
import { useTranslations } from "next-intl";
import { PreviewMessage } from "../message";

// Shows a frozen conversation snapshot as a static, read-only transcript (no
// playback, no LLM call) — reproducible demo content. Reuses the real chat
// bubble (PreviewMessage).
export function ReplayPlayer({
  title,
  messages,
}: {
  title: string;
  messages: ChatExport["messages"];
}) {
  const t = useTranslations();
  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-3xl px-6 pb-2 pt-8">
        <h1 className="truncate text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("Replay.demoNotice")}
        </p>
      </div>
      <div className="flex flex-col gap-2 overflow-y-auto pb-20">
        {messages.map((m, i) => (
          <PreviewMessage
            key={m.id}
            message={m as any}
            isLastMessage={i === messages.length - 1}
            readonly={true}
          />
        ))}
      </div>
    </div>
  );
}
