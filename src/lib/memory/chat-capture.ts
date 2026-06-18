// Pure helpers that turn a chat thread into a raw-transcript memory record.
// Kept free of server-only imports so they can be unit-tested without a DB,
// matching the repo's logic-only test setup.
//
// Model (decided 2026-06-18): ONE memory per conversation, keyed by
// `source = session:<threadId>` and upserted. We store the RAW transcript (no
// LLM summary) so capture is deterministic and update = "overwrite with current
// text". Individual answers are not stored as separate rows; instead a message
// can be flagged "important" — its id is recorded on the session record and its
// text is lifted into `highlights` (which double as strong retrieval handles
// for the otherwise weakly-matchable raw blob).

const MAX_TITLE = 80;
const MAX_HIGHLIGHT = 500;

// Minimal shape we need from a message. Parts follow the AI SDK UIMessage
// shape; we treat them defensively because their union is wide and evolving.
export type CaptureMessage = {
  id?: string;
  role: string;
  parts: unknown[];
};

export type Highlight = {
  id: string;
  role: string;
  text: string;
};

// Stored in MemoryTable.structured. `importantMessageIds` are the message ids
// the user flagged; `highlights` is their text, materialized at save time.
export type ChatCaptureMeta = {
  sourceSessionId: string;
  messageCountAtSave: number;
  lastMessageId?: string | null;
  importantMessageIds: string[];
  highlights: Highlight[];
};

export function sessionSource(threadId: string): string {
  return `session:${threadId}`;
}

function roleLabel(role: string): string {
  if (role === "user") return "User";
  if (role === "assistant") return "Assistant";
  if (role === "system") return "System";
  return role;
}

// Pull the human-meaningful text out of a message's parts. Text parts come
// through verbatim; tool calls are collapsed to a compact marker so the
// transcript stays readable without dumping raw tool JSON.
export function extractText(parts: unknown[]): string {
  if (!Array.isArray(parts)) return "";
  const out: string[] = [];
  for (const p of parts) {
    if (!p || typeof p !== "object") continue;
    const part = p as Record<string, unknown>;
    const type = part.type;
    if (type === "text" && typeof part.text === "string") {
      out.push(part.text);
    } else if (
      typeof type === "string" &&
      (type.startsWith("tool-") || type === "dynamic-tool")
    ) {
      const name =
        typeof part.toolName === "string"
          ? part.toolName
          : type.replace(/^tool-/, "");
      out.push(`[tool: ${name}]`);
    }
  }
  return out.join("\n").trim();
}

// Serialize a list of messages into a single markdown transcript. Messages
// whose parts yield no text (e.g. a lone step-start) are skipped.
export function serializeThread(messages: CaptureMessage[]): string {
  const blocks: string[] = [];
  for (const m of messages) {
    const text = extractText(m.parts);
    if (!text) continue;
    blocks.push(`## ${roleLabel(m.role)}\n\n${text}`);
  }
  return blocks.join("\n\n");
}

// Title = first user message, single-lined and truncated. No LLM needed.
export function firstUserTitle(messages: CaptureMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  const text = first ? extractText(first.parts) : "";
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (!oneLine) return "Chat session";
  return oneLine.length > MAX_TITLE
    ? `${oneLine.slice(0, MAX_TITLE - 1)}…`
    : oneLine;
}

// How many messages were added since the last save. 0 => up to date.
export function behindCount(
  currentCount: number,
  meta: { messageCountAtSave: number } | null | undefined,
): number {
  if (!meta) return currentCount;
  return Math.max(0, currentCount - meta.messageCountAtSave);
}

// Add the id if absent, remove it if present (toggle semantics for the
// "mark important" button).
export function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

// Materialize the text of the flagged messages, in thread order. Ids that no
// longer exist in the thread are dropped.
export function buildHighlights(
  messages: CaptureMessage[],
  ids: string[],
): Highlight[] {
  const wanted = new Set(ids);
  const out: Highlight[] = [];
  for (const m of messages) {
    if (!m.id || !wanted.has(m.id)) continue;
    const text = extractText(m.parts);
    if (!text) continue;
    out.push({
      id: m.id,
      role: m.role,
      text:
        text.length > MAX_HIGHLIGHT
          ? `${text.slice(0, MAX_HIGHLIGHT - 1)}…`
          : text,
    });
  }
  return out;
}

export type SessionCapture = {
  title: string;
  content: string;
  source: string;
  structured: ChatCaptureMeta;
};

// Build the full record for a session sync. `importantMessageIds` carries the
// flags forward; any pointing at messages no longer present are pruned.
// `content` empty => caller should treat as "nothing to save".
export function buildSessionCapture(
  threadId: string,
  messages: CaptureMessage[],
  importantMessageIds: string[] = [],
): SessionCapture {
  const present = new Set(
    messages.map((m) => m.id).filter((id): id is string => Boolean(id)),
  );
  const keptIds = importantMessageIds.filter((id) => present.has(id));
  return {
    title: firstUserTitle(messages),
    content: serializeThread(messages),
    source: sessionSource(threadId),
    structured: {
      sourceSessionId: threadId,
      messageCountAtSave: messages.length,
      lastMessageId: messages.at(-1)?.id ?? null,
      importantMessageIds: keptIds,
      highlights: buildHighlights(messages, keptIds),
    },
  };
}
