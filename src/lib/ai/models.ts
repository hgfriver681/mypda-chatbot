import "server-only";

import { createOllama } from "ollama-ai-provider-v2";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { xai } from "@ai-sdk/xai";
import { LanguageModelV2, openrouter } from "@openrouter/ai-sdk-provider";
import { createGroq } from "@ai-sdk/groq";
import { LanguageModel } from "ai";
import { createOpenAICompatibleModels } from "./create-openai-compatiable";
import {
  defaultCatalog,
  getModelCatalog,
  type ModelCatalog,
} from "./model-catalog";
import { ChatModel } from "app-types/chat";
import {
  DEFAULT_FILE_PART_MIME_TYPES,
  OPENAI_FILE_MIME_TYPES,
  GEMINI_FILE_MIME_TYPES,
  ANTHROPIC_FILE_MIME_TYPES,
  XAI_FILE_MIME_TYPES,
} from "./file-support";

const ollama = createOllama({
  baseURL: process.env.OLLAMA_BASE_URL || "http://localhost:11434/api",
});
const groq = createGroq({
  baseURL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

// Providers fixed in code. OpenRouter + OpenAI-compatible (NCHC...) are NOT
// here — they come from the DB-backed, admin-editable catalog (model-catalog.ts).
const fixedStaticModels = {
  openai: {
    "gpt-4.1": openai("gpt-4.1"),
    "gpt-4.1-mini": openai("gpt-4.1-mini"),
    "o4-mini": openai("o4-mini"),
    o3: openai("o3"),
    "gpt-5.1-chat": openai("gpt-5.1-chat-latest"),
    "gpt-5.1": openai("gpt-5.1"),
    "gpt-5.1-codex": openai("gpt-5.1-codex"),
    "gpt-5.1-codex-mini": openai("gpt-5.1-codex-mini"),
  },
  google: {
    "gemini-2.5-flash-lite": google("gemini-2.5-flash-lite"),
    "gemini-2.5-flash": google("gemini-2.5-flash"),
    "gemini-3-pro": google("gemini-3-pro-preview"),
    "gemini-2.5-pro": google("gemini-2.5-pro"),
  },
  anthropic: {
    "sonnet-4.5": anthropic("claude-sonnet-4-5"),
    "haiku-4.5": anthropic("claude-haiku-4-5"),
    "opus-4.5": anthropic("claude-opus-4-5"),
  },
  xai: {
    "grok-4-1-fast": xai("grok-4-1-fast-non-reasoning"),
    "grok-4-1": xai("grok-4-1"),
    "grok-3-mini": xai("grok-3-mini"),
  },
  ollama: {
    "gemma3:1b": ollama("gemma3:1b"),
    "gemma3:4b": ollama("gemma3:4b"),
    "gemma3:12b": ollama("gemma3:12b"),
  },
  groq: {
    "kimi-k2-instruct": groq("moonshotai/kimi-k2-instruct"),
    "llama-4-scout-17b": groq("meta-llama/llama-4-scout-17b-16e-instruct"),
    "gpt-oss-20b": groq("openai/gpt-oss-20b"),
    "gpt-oss-120b": groq("openai/gpt-oss-120b"),
    "qwen3-32b": groq("qwen/qwen3-32b"),
  },
};

const fixedUnsupportedModels = new Set<LanguageModel>([
  fixedStaticModels.openai["o4-mini"],
  fixedStaticModels.ollama["gemma3:1b"],
  fixedStaticModels.ollama["gemma3:4b"],
  fixedStaticModels.ollama["gemma3:12b"],
]);

const staticSupportImageInputModels = {
  ...fixedStaticModels.google,
  ...fixedStaticModels.xai,
  ...fixedStaticModels.openai,
  ...fixedStaticModels.anthropic,
};

const staticFilePartSupportByModel = new Map<
  LanguageModel,
  readonly string[]
>();

const registerFileSupport = (
  model: LanguageModel | undefined,
  mimeTypes: readonly string[] = DEFAULT_FILE_PART_MIME_TYPES,
) => {
  if (!model) return;
  staticFilePartSupportByModel.set(model, Array.from(mimeTypes));
};

registerFileSupport(
  fixedStaticModels.openai["gpt-4.1"],
  OPENAI_FILE_MIME_TYPES,
);
registerFileSupport(
  fixedStaticModels.openai["gpt-4.1-mini"],
  OPENAI_FILE_MIME_TYPES,
);
registerFileSupport(
  fixedStaticModels.google["gemini-2.5-flash-lite"],
  GEMINI_FILE_MIME_TYPES,
);
registerFileSupport(
  fixedStaticModels.google["gemini-2.5-flash"],
  GEMINI_FILE_MIME_TYPES,
);
registerFileSupport(
  fixedStaticModels.google["gemini-2.5-pro"],
  GEMINI_FILE_MIME_TYPES,
);
registerFileSupport(
  fixedStaticModels.anthropic["sonnet-4.5"],
  ANTHROPIC_FILE_MIME_TYPES,
);
registerFileSupport(fixedStaticModels.xai["grok-3-mini"], XAI_FILE_MIME_TYPES);

const isImageInputUnsupportedModel = (model: LanguageModelV2) => {
  return !Object.values(staticSupportImageInputModels).includes(model);
};

export const getFilePartSupportedMimeTypes = (model: LanguageModel) => {
  return staticFilePartSupportByModel.get(model) ?? [];
};

// ---- dynamic catalog (OpenRouter + OpenAI-compatible) ----------------------

type ModelInfo = {
  provider: string;
  models: {
    name: string;
    isToolCallUnsupported: boolean;
    isImageInputUnsupported: boolean;
    supportedFileMimeTypes: string[];
  }[];
  hasAPIKey: boolean;
};

type BuiltCatalog = {
  allModels: Record<string, Record<string, LanguageModel>>;
  unsupported: Set<LanguageModel>;
  fallbackModel: LanguageModel;
  modelsInfo: ModelInfo[];
};

function buildOpenRouterModels(
  entries: ModelCatalog["openRouter"],
): Record<string, LanguageModel> {
  const out: Record<string, LanguageModel> = {};
  for (const e of entries) {
    out[e.uiName] = openrouter(e.apiName) as LanguageModel;
  }
  return out;
}

function build(catalog: ModelCatalog): BuiltCatalog {
  const openRouterModels = buildOpenRouterModels(catalog.openRouter);
  const { providers: oaiCompat, unsupportedModels: oaiUnsupported } =
    createOpenAICompatibleModels(catalog.openaiCompatible);

  const allModels: Record<string, Record<string, LanguageModel>> = {
    ...oaiCompat,
    ...fixedStaticModels,
    openRouter: openRouterModels,
  };

  const unsupported = new Set<LanguageModel>([
    ...fixedUnsupportedModels,
    ...oaiUnsupported,
  ]);
  for (const e of catalog.openRouter) {
    if (e.supportsTools === false) unsupported.add(openRouterModels[e.uiName]);
  }

  const fallbackModel =
    openRouterModels["minimax-m3"] ??
    Object.values(openRouterModels)[0] ??
    fixedStaticModels.openai["gpt-4.1"];

  const modelsInfo: ModelInfo[] = Object.entries(allModels).map(
    ([provider, models]) => ({
      provider,
      models: Object.entries(models).map(([name, model]) => ({
        name,
        isToolCallUnsupported: unsupported.has(model),
        isImageInputUnsupported: isImageInputUnsupportedModel(
          model as LanguageModelV2,
        ),
        supportedFileMimeTypes: [...getFilePartSupportedMimeTypes(model)],
      })),
      hasAPIKey: checkProviderAPIKey(provider),
    }),
  );

  return { allModels, unsupported, fallbackModel, modelsInfo };
}

const REFRESH_TTL_MS = 30_000;
let currentCatalog: ModelCatalog = defaultCatalog();
let built: BuiltCatalog = build(currentCatalog);
let lastRefresh = 0;
let refreshInFlight: Promise<void> | null = null;

/** Reload the catalog from DB and rebuild the in-memory model snapshot. */
export function refreshModelCatalog(): Promise<void> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const catalog = await getModelCatalog();
      currentCatalog = catalog;
      built = build(catalog);
      lastRefresh = Date.now();
    } catch {
      // keep the previous snapshot on failure
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

function maybeRefresh() {
  if (!refreshInFlight && Date.now() - lastRefresh > REFRESH_TTL_MS) {
    void refreshModelCatalog();
  }
}

// Kick off the first DB-backed refresh (non-blocking; import-time snapshot from
// defaults keeps the app working until this resolves).
void refreshModelCatalog();

export const isToolCallUnsupportedModel = (model: LanguageModel) => {
  return built.unsupported.has(model);
};

export const customModelProvider = {
  get modelsInfo(): ModelInfo[] {
    maybeRefresh();
    return built.modelsInfo;
  },
  getModel: (model?: ChatModel): LanguageModel => {
    maybeRefresh();
    if (!model) return built.fallbackModel;
    return (
      built.allModels[model.provider]?.[model.model] || built.fallbackModel
    );
  },
};

function checkProviderAPIKey(provider: string) {
  let key: string | undefined;
  switch (provider) {
    case "openai":
      key = process.env.OPENAI_API_KEY;
      break;
    case "google":
      key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      break;
    case "anthropic":
      key = process.env.ANTHROPIC_API_KEY;
      break;
    case "xai":
      key = process.env.XAI_API_KEY;
      break;
    case "groq":
      key = process.env.GROQ_API_KEY;
      break;
    case "openRouter":
      key = process.env.OPENROUTER_API_KEY;
      break;
    case "ollama":
      // Disabled on the platform by default (greys out like xai/anthropic).
      // Set OLLAMA_ENABLED=1 to surface it again.
      key = process.env.OLLAMA_ENABLED ? "ok" : undefined;
      break;
    default:
      return true; // OpenAI-compatible providers (NCHC...) carry their own key
  }
  return !!key && key != "****";
}
