import { requireAdminPermission } from "auth/permissions";
import { getSession } from "auth/server";
import { redirect, unauthorized } from "next/navigation";
import { getModelCatalog } from "lib/ai/model-catalog";
import {
  ModelCatalogEditor,
  type Catalog,
} from "@/components/admin/model-catalog-editor";

// Session-dependent; never statically generate.
export const dynamic = "force-dynamic";

export default async function AdminModelsPage() {
  try {
    await requireAdminPermission();
  } catch (_error) {
    unauthorized();
  }
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const cat = await getModelCatalog();
  const initial: Catalog = {
    openRouter: cat.openRouter.map((e) => ({
      apiName: e.apiName,
      uiName: e.uiName,
      supportsTools: e.supportsTools !== false,
    })),
    openaiCompatible: cat.openaiCompatible.map((p) => ({
      provider: p.provider,
      apiKey: p.apiKey,
      baseUrl: p.baseUrl,
      models: p.models.map((m) => ({
        apiName: m.apiName,
        uiName: m.uiName,
        supportsTools: m.supportsTools !== false,
      })),
    })),
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">模型管理</h1>
        <p className="text-sm text-muted-foreground">
          管理 OpenRouter 與 OpenAI
          相容(NCHC)模型清單。儲存後立即生效,不需重新部署。
          其他供應商(OpenAI/Google/Anthropic/XAI/Groq/Ollama)維持由系統設定。
        </p>
      </div>
      <ModelCatalogEditor initial={initial} />
    </div>
  );
}
