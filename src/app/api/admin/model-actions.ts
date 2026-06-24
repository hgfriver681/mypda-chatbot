"use server";

import { requireAdminPermission } from "lib/auth/permissions";
import {
  ModelCatalogSchema,
  getModelCatalog,
  saveModelCatalog,
  type ModelCatalog,
} from "lib/ai/model-catalog";
import { refreshModelCatalog } from "lib/ai/models";

/** Current admin-managed model catalog (seeds from defaults on first run). */
export async function adminGetModelCatalogAction(): Promise<ModelCatalog> {
  await requireAdminPermission("manage the model catalog");
  return getModelCatalog();
}

/** Persist the catalog and immediately rebuild the in-memory model snapshot. */
export async function adminSaveModelCatalogAction(
  config: ModelCatalog,
): Promise<{ ok: true }> {
  await requireAdminPermission("manage the model catalog");
  const parsed = ModelCatalogSchema.parse(config);
  await saveModelCatalog(parsed);
  await refreshModelCatalog();
  return { ok: true };
}
