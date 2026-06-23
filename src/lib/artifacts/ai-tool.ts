import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { customModelProvider } from "lib/ai/models";

/**
 * A platform-provided, stateless "AI" capability exposed to MCP Artifacts under
 * the reserved server name "ai". Artifacts call it through the same window.mcp
 * bridge — `window.mcp.call("ai", "summarize" | "complete" | "ocr", args)` — so
 * the artifact still only ever talks to window.mcp (the security model is
 * intact), but gets an LLM (text + vision) without the customer hosting their
 * own model server.
 *
 * Stateless by design: every call is independent, no memory. Everything the
 * model needs must be in the args.
 *
 * Models:
 *   - Text (summarize / complete without image) -> the platform default model
 *     (customModelProvider.getModel(), currently minimax-m3 via OpenRouter).
 *   - Vision (ocr / complete with image) -> a vision-capable model over
 *     OpenRouter, default google/gemini-3-flash-preview (override with
 *     ARTIFACT_OCR_MODEL). The default text model is text-only, so image input
 *     must go to a separate vision model.
 */
export const ARTIFACT_AI_SERVER_NAME = "ai";

const OCR_MODEL =
  process.env.ARTIFACT_OCR_MODEL || "google/gemini-3-flash-preview";

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
        "General-purpose LLM completion. args: { system?: string, prompt: string, image?: string }. If `image` is given (http(s) URL, data: URL, or raw base64) the call uses a vision model. Stateless.",
    },
    {
      name: "ocr",
      description:
        "Read text from an image with a vision model (OCR). args: { image: string (http(s) URL, data: URL, or raw base64), instruction?: string, mimeType?: string }. Returns the extracted text; pass an instruction to get structured fields instead. Stateless.",
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

function clamp(prompt: string): string {
  return prompt.length > MAX_PROMPT_CHARS
    ? `${prompt.slice(0, MAX_PROMPT_CHARS)}\n…(truncated)`
    : prompt;
}

/**
 * Normalize an image argument into a value the AI SDK accepts for an image
 * content part: an http(s) URL or a data: URL pass through; a bare base64 string
 * is wrapped into a data: URL (default image/png, or args.mimeType).
 */
function toImage(image: unknown, mimeType?: unknown): string {
  if (typeof image !== "string" || !image.trim()) {
    throw new Error("image is required (http(s) URL, data: URL, or base64)");
  }
  const v = image.trim();
  if (
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("data:")
  ) {
    return v;
  }
  const mt = typeof mimeType === "string" && mimeType ? mimeType : "image/png";
  return `data:${mt};base64,${v}`;
}

async function visionGenerate(
  system: string | undefined,
  instruction: string,
  image: string,
): Promise<string> {
  const { text } = await generateText({
    // Vision goes to a separate vision-capable model over OpenRouter; the
    // platform default text model can't read images.
    model: openrouter(OCR_MODEL),
    system,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: instruction },
          { type: "image", image },
        ],
      },
    ],
  });
  return text;
}

export async function runArtifactAi(tool: string, args: any): Promise<string> {
  const a = args ?? {};

  if (tool === "ocr") {
    const instruction =
      typeof a.instruction === "string" && a.instruction.trim()
        ? a.instruction.trim()
        : "Extract all text from this image. Preserve the reading order and line breaks. Return only the transcribed text.";
    return visionGenerate(
      "You are an OCR engine. Transcribe the image faithfully. Do not translate, summarize, or invent content.",
      instruction,
      toImage(a.image, a.mimeType),
    );
  }

  if (tool === "complete" && a.image) {
    // Vision completion: free-form prompt about an image.
    const system = typeof a.system === "string" ? a.system : undefined;
    const prompt = clamp(asText(a.prompt) || "Describe the image.");
    return visionGenerate(system, prompt, toImage(a.image, a.mimeType));
  }

  // ---- text-only paths: keep using the platform default model -------------
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

  const { text } = await generateText({
    // Stateless single call; uses the platform's default (text) model.
    model: customModelProvider.getModel(),
    system,
    prompt: clamp(prompt),
  });
  return text;
}
