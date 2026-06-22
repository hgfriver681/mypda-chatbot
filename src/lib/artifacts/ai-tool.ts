import { generateText } from "ai";
import { customModelProvider } from "lib/ai/models";

/**
 * A platform-provided, stateless "AI" capability exposed to MCP Artifacts under
 * the reserved server name "ai". Artifacts call it through the same window.mcp
 * bridge — `window.mcp.call("ai", "summarize" | "complete", args)` — so the
 * artifact still only ever talks to window.mcp (the security model is intact),
 * but gets an LLM without the customer hosting their own model server.
 *
 * Stateless by design: every call is independent, no memory. Everything the
 * model needs must be in the args.
 */
export const ARTIFACT_AI_SERVER_NAME = "ai";

export const ARTIFACT_AI_SERVER = {
  id: ARTIFACT_AI_SERVER_NAME,
  name: ARTIFACT_AI_SERVER_NAME,
  tools: [
    {
      name: "summarize",
      description:
        "Summarize/condense text or data with an LLM. args: { instruction?: string, data: string|object }. Stateless.",
    },
    {
      name: "complete",
      description:
        "General-purpose LLM completion. args: { system?: string, prompt: string }. Stateless.",
    },
  ],
};

// Guard against runaway prompts from a generated artifact.
const MAX_PROMPT_CHARS = 100_000;

function asText(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value ?? "", null, 2);
  } catch {
    return String(value ?? "");
  }
}

export async function runArtifactAi(tool: string, args: any): Promise<string> {
  const a = args ?? {};
  let system: string | undefined;
  let prompt: string;

  if (tool === "summarize") {
    const instruction =
      typeof a.instruction === "string" && a.instruction.trim()
        ? a.instruction.trim()
        : "Summarize the following clearly and concisely.";
    system =
      "You are a precise summarization assistant. Be faithful to the input and do not invent facts.";
    prompt = `${instruction}\n\n--- INPUT ---\n${asText(a.data)}`;
  } else if (tool === "complete") {
    system = typeof a.system === "string" ? a.system : undefined;
    prompt = asText(a.prompt);
  } else {
    throw new Error(`Unknown ai tool: ${tool}`);
  }

  if (prompt.length > MAX_PROMPT_CHARS) {
    prompt = `${prompt.slice(0, MAX_PROMPT_CHARS)}\n…(truncated)`;
  }

  const { text } = await generateText({
    // Stateless single call; uses the platform's default model.
    model: customModelProvider.getModel(),
    system,
    prompt,
  });
  return text;
}
