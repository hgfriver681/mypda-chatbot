"use client";
import type { ChatExport } from "app-types/chat-export";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "ui/button";
import { PreviewMessage } from "../message";

// Plays back a frozen conversation snapshot message-by-message (no LLM call, so
// it is fully reproducible). Reuses the real chat bubble (PreviewMessage).
export function ReplayPlayer({
  title,
  messages,
}: {
  title: string;
  messages: ChatExport["messages"];
}) {
  const t = useTranslations();
  const [revealed, setRevealed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [typing, setTyping] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!playing) return;
    if (revealed >= messages.length) {
      setPlaying(false);
      return;
    }
    const next = messages[revealed];
    const isAssistant = next?.role === "assistant";
    // Assistant messages get a short "typing" beat before they appear.
    if (isAssistant) {
      setTyping(true);
      timer.current = setTimeout(() => {
        setTyping(false);
        setRevealed((r) => r + 1);
      }, 900);
    } else {
      timer.current = setTimeout(() => setRevealed((r) => r + 1), 500);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [playing, revealed, messages]);

  const done = revealed >= messages.length;
  const shown = messages.slice(0, revealed);

  const restart = () => {
    if (timer.current) clearTimeout(timer.current);
    setRevealed(0);
    setTyping(false);
    setPlaying(true);
  };
  const skip = () => {
    if (timer.current) clearTimeout(timer.current);
    setTyping(false);
    setRevealed(messages.length);
    setPlaying(false);
  };
  const toggle = () => {
    if (done) return restart();
    setPlaying((p) => !p);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-3xl px-6 pb-2 pt-8">
        <div className="flex items-center justify-between gap-2">
          <h1 className="truncate text-2xl font-bold">{title}</h1>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="outline" size="sm" onClick={toggle}>
              {done ? (
                <RotateCcw className="size-4" />
              ) : playing ? (
                <Pause className="size-4" />
              ) : (
                <Play className="size-4" />
              )}
              {done
                ? t("Replay.replayAgain")
                : playing
                  ? t("Replay.pause")
                  : t("Replay.play")}
            </Button>
            {!done && (
              <Button variant="ghost" size="sm" onClick={skip}>
                <SkipForward className="size-4" />
                {t("Replay.skip")}
              </Button>
            )}
          </div>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("Replay.demoNotice")}
        </p>
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto pb-20">
        {shown.map((m, i) => (
          <PreviewMessage
            key={m.id}
            message={m as any}
            isLastMessage={i === shown.length - 1}
            readonly={true}
          />
        ))}
        {typing && (
          <div className="mx-auto w-full max-w-3xl px-6">
            <div className="flex w-fit items-center gap-1 rounded-2xl bg-muted px-4 py-3">
              <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
              <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
              <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
