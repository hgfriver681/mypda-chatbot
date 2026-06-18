import { describe, it, expect } from "vitest";
import {
  extractText,
  serializeThread,
  firstUserTitle,
  behindCount,
  toggleId,
  buildHighlights,
  buildSessionCapture,
  sessionSource,
} from "./chat-capture";

const text = (t: string) => ({ type: "text", text: t });

describe("extractText", () => {
  it("joins text parts and skips empties", () => {
    expect(extractText([text("hello"), text("world")])).toBe("hello\nworld");
  });
  it("collapses tool calls to a compact marker", () => {
    expect(
      extractText([text("checking"), { type: "tool-list_files", toolName: "list_files" }]),
    ).toBe("checking\n[tool: list_files]");
  });
  it("derives tool name from the type when toolName is absent", () => {
    expect(extractText([{ type: "tool-compare_pdfs" }])).toBe("[tool: compare_pdfs]");
  });
  it("ignores step-start and unknown non-text parts", () => {
    expect(extractText([{ type: "step-start" }, text("hi")])).toBe("hi");
  });
  it("is defensive against non-array / junk input", () => {
    expect(extractText(undefined as never)).toBe("");
    expect(extractText([null, 3, "x"] as never)).toBe("");
  });
});

describe("serializeThread", () => {
  it("renders a role-labelled markdown transcript", () => {
    const out = serializeThread([
      { role: "user", parts: [text("hi there")] },
      { role: "assistant", parts: [text("hello!")] },
    ]);
    expect(out).toBe("## User\n\nhi there\n\n## Assistant\n\nhello!");
  });
  it("skips messages with no extractable text", () => {
    const out = serializeThread([
      { role: "user", parts: [text("q")] },
      { role: "assistant", parts: [{ type: "step-start" }] },
    ]);
    expect(out).toBe("## User\n\nq");
  });
});

describe("firstUserTitle", () => {
  it("uses the first user message, single-lined", () => {
    expect(
      firstUserTitle([{ role: "user", parts: [text("how do\nI  do  this?")] }]),
    ).toBe("how do I do this?");
  });
  it("truncates long titles with an ellipsis", () => {
    const long = "a".repeat(200);
    const out = firstUserTitle([{ role: "user", parts: [text(long)] }]);
    expect(out.length).toBe(80);
    expect(out.endsWith("…")).toBe(true);
  });
  it("falls back when there is no user text", () => {
    expect(firstUserTitle([{ role: "assistant", parts: [text("a")] }])).toBe(
      "Chat session",
    );
  });
});

describe("behindCount", () => {
  it("equals current count when never saved", () => {
    expect(behindCount(5, null)).toBe(5);
  });
  it("is the delta since the last save", () => {
    expect(behindCount(8, { messageCountAtSave: 5 })).toBe(3);
  });
  it("never goes negative", () => {
    expect(behindCount(4, { messageCountAtSave: 6 })).toBe(0);
  });
});

describe("toggleId", () => {
  it("adds an id that is absent", () => {
    expect(toggleId([], "a")).toEqual(["a"]);
    expect(toggleId(["a"], "b")).toEqual(["a", "b"]);
  });
  it("removes an id that is present", () => {
    expect(toggleId(["a", "b"], "a")).toEqual(["b"]);
  });
});

describe("buildHighlights", () => {
  const messages = [
    { id: "u1", role: "user", parts: [text("the question")] },
    { id: "a1", role: "assistant", parts: [text("the answer")] },
    { id: "a2", role: "assistant", parts: [text("another answer")] },
  ];
  it("lifts the flagged messages' text, in thread order", () => {
    expect(buildHighlights(messages, ["a2", "u1"])).toEqual([
      { id: "u1", role: "user", text: "the question" },
      { id: "a2", role: "assistant", text: "another answer" },
    ]);
  });
  it("ignores ids that are not in the thread", () => {
    expect(buildHighlights(messages, ["ghost"])).toEqual([]);
  });
});

describe("sessionSource", () => {
  it("namespaces by thread id", () => {
    expect(sessionSource("abc")).toBe("session:abc");
  });
});

describe("buildSessionCapture", () => {
  const messages = [
    { id: "u1", role: "user", parts: [text("first question")] },
    { id: "a1", role: "assistant", parts: [text("answer")] },
  ];

  it("packs title, content, source and meta", () => {
    const cap = buildSessionCapture("thread-1", messages);
    expect(cap.source).toBe("session:thread-1");
    expect(cap.title).toBe("first question");
    expect(cap.content).toContain("## Assistant");
    expect(cap.structured).toMatchObject({
      sourceSessionId: "thread-1",
      messageCountAtSave: 2,
      lastMessageId: "a1",
      importantMessageIds: [],
      highlights: [],
    });
  });

  it("carries important flags forward and materializes their highlights", () => {
    const cap = buildSessionCapture("thread-1", messages, ["a1"]);
    expect(cap.structured.importantMessageIds).toEqual(["a1"]);
    expect(cap.structured.highlights).toEqual([
      { id: "a1", role: "assistant", text: "answer" },
    ]);
  });

  it("prunes flags pointing at messages no longer in the thread", () => {
    const cap = buildSessionCapture("thread-1", messages, ["a1", "deleted"]);
    expect(cap.structured.importantMessageIds).toEqual(["a1"]);
  });
});
