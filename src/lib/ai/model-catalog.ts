import "server-only";

import { z } from "zod";
import {
  OpenAICompatibleProviderSchema,
  openaiCompatibleModelsSafeParse,
} from "./create-openai-compatiable";
import { modelCatalogRepository } from "lib/db/repository";

/**
 * Admin-managed model catalog: which OpenRouter models and which
 * OpenAI-compatible providers (e.g. NCHC) are exposed in the model picker.
 * Stored in DB (single row) and edited from the admin UI — no redeploy needed.
 * The fixed providers (openai/google/anthropic/xai/groq/ollama) stay in code.
 */
export const OpenRouterModelEntrySchema = z.object({
  // The OpenRouter model id, e.g. "minimax/minimax-m3" or "openai/gpt-oss-120b".
  apiName: z.string().min(1),
  // Display name in the picker.
  uiName: z.string().min(1),
  supportsTools: z.boolean().optional().default(true),
});
export type OpenRouterModelEntry = z.infer<typeof OpenRouterModelEntrySchema>;

export const ModelCatalogSchema = z.object({
  openRouter: z.array(OpenRouterModelEntrySchema).default([]),
  openaiCompatible: z.array(OpenAICompatibleProviderSchema).default([]),
});
export type ModelCatalog = z.infer<typeof ModelCatalogSchema>;

/** Defaults used to seed the DB on first run (and as the import-time fallback). */
export function defaultCatalog(): ModelCatalog {
  return {
    openRouter: [
      {
        apiName: "minimax/minimax-m3",
        uiName: "minimax-m3",
        supportsTools: true,
      },
    ],
    openaiCompatible: openaiCompatibleModelsSafeParse(
      process.env.OPENAI_COMPATIBLE_DATA,
    ),
  };
}

/** Read the catalog from DB; seed it from defaults on first run. */
export async function getModelCatalog(): Promise<ModelCatalog> {
  try {
    const raw = await modelCatalogRepository.get();
    if (raw) {
      const parsed = ModelCatalogSchema.safeParse(raw);
      if (parsed.success) return parsed.data;
    }
  } catch {
    // DB not reachable yet — fall through to seed/default.
  }
  const seed = defaultCatalog();
  try {
    await modelCatalogRepository.upsert(seed);
  } catch {
    // ignore seed write failures (e.g. read-only / migration not applied yet)
  }
  return seed;
}

export async function saveModelCatalog(config: ModelCatalog): Promise<void> {
  const parsed = ModelCatalogSchema.parse(config);
  await modelCatalogRepository.upsert(parsed);
}
