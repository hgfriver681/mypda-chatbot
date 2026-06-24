"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "ui/button";
import { Input } from "ui/input";
import { Label } from "ui/label";
import { Switch } from "ui/switch";
import { Separator } from "ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "ui/card";
import { Plus, Trash2, Loader, Save } from "lucide-react";
import { adminSaveModelCatalogAction } from "@/app/api/admin/model-actions";

type OREntry = { apiName: string; uiName: string; supportsTools: boolean };
type OAIModel = { apiName: string; uiName: string; supportsTools: boolean };
type OAIProvider = {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  models: OAIModel[];
};
export type Catalog = {
  openRouter: OREntry[];
  openaiCompatible: OAIProvider[];
};

export function ModelCatalogEditor({ initial }: { initial: Catalog }) {
  const [openRouter, setOpenRouter] = useState<OREntry[]>(
    initial.openRouter ?? [],
  );
  const [providers, setProviders] = useState<OAIProvider[]>(
    initial.openaiCompatible ?? [],
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await adminSaveModelCatalogAction({
        openRouter,
        openaiCompatible: providers,
      });
      toast.success("模型清單已儲存,立即生效");
    } catch (e: any) {
      toast.error(e?.message ?? "儲存失敗");
    } finally {
      setSaving(false);
    }
  };

  // -- OpenRouter helpers --
  const addOR = () =>
    setOpenRouter((x) => [
      ...x,
      { apiName: "", uiName: "", supportsTools: true },
    ]);
  const setOR = (i: number, patch: Partial<OREntry>) =>
    setOpenRouter((x) => x.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const delOR = (i: number) =>
    setOpenRouter((x) => x.filter((_, j) => j !== i));

  // -- OpenAI-compatible provider helpers --
  const addProvider = () =>
    setProviders((x) => [
      ...x,
      { provider: "", apiKey: "", baseUrl: "", models: [] },
    ]);
  const setProvider = (i: number, patch: Partial<OAIProvider>) =>
    setProviders((x) => x.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const delProvider = (i: number) =>
    setProviders((x) => x.filter((_, j) => j !== i));
  const addModel = (pi: number) =>
    setProvider(pi, {
      models: [
        ...providers[pi].models,
        { apiName: "", uiName: "", supportsTools: true },
      ],
    });
  const setModel = (pi: number, mi: number, patch: Partial<OAIModel>) =>
    setProvider(pi, {
      models: providers[pi].models.map((m, j) =>
        j === mi ? { ...m, ...patch } : m,
      ),
    });
  const delModel = (pi: number, mi: number) =>
    setProvider(pi, {
      models: providers[pi].models.filter((_, j) => j !== mi),
    });

  return (
    <div className="space-y-6">
      {/* OpenRouter */}
      <Card>
        <CardHeader>
          <CardTitle>OpenRouter 模型</CardTitle>
          <CardDescription>
            填入要開放的 OpenRouter model id(例如 minimax/minimax-m3、
            openai/gpt-oss-120b)。只有列在這裡的才會出現在選單。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {openRouter.map((e, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[200px] space-y-1">
                <Label className="text-xs">model id (apiName)</Label>
                <Input
                  value={e.apiName}
                  placeholder="minimax/minimax-m3"
                  onChange={(ev) => setOR(i, { apiName: ev.target.value })}
                />
              </div>
              <div className="flex-1 min-w-[160px] space-y-1">
                <Label className="text-xs">顯示名稱 (uiName)</Label>
                <Input
                  value={e.uiName}
                  placeholder="minimax-m3"
                  onChange={(ev) => setOR(i, { uiName: ev.target.value })}
                />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch
                  checked={e.supportsTools}
                  onCheckedChange={(v) => setOR(i, { supportsTools: v })}
                />
                <span className="text-xs text-muted-foreground">支援工具</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => delOR(i)}
                className="text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addOR}>
            <Plus className="size-4" /> 新增 OpenRouter 模型
          </Button>
        </CardContent>
      </Card>

      {/* OpenAI-compatible providers (NCHC...) */}
      <Card>
        <CardHeader>
          <CardTitle>OpenAI 相容供應商(NCHC 等)</CardTitle>
          <CardDescription>
            每個供應商有自己的 base URL 與 API key,底下列出要開放的模型。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {providers.map((p, pi) => (
            <div key={pi} className="rounded-lg border p-3 space-y-3">
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[140px] space-y-1">
                  <Label className="text-xs">供應商名稱</Label>
                  <Input
                    value={p.provider}
                    placeholder="NCHC"
                    onChange={(ev) =>
                      setProvider(pi, { provider: ev.target.value })
                    }
                  />
                </div>
                <div className="flex-[2] min-w-[220px] space-y-1">
                  <Label className="text-xs">base URL</Label>
                  <Input
                    value={p.baseUrl ?? ""}
                    placeholder="https://portal.genai.nchc.org.tw/api/v1"
                    onChange={(ev) =>
                      setProvider(pi, { baseUrl: ev.target.value })
                    }
                  />
                </div>
                <div className="flex-1 min-w-[160px] space-y-1">
                  <Label className="text-xs">API key</Label>
                  <Input
                    value={p.apiKey}
                    type="password"
                    placeholder="sk-..."
                    onChange={(ev) =>
                      setProvider(pi, { apiKey: ev.target.value })
                    }
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => delProvider(pi)}
                  className="text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              <Separator />
              <div className="space-y-2 pl-1">
                {p.models.map((m, mi) => (
                  <div key={mi} className="flex flex-wrap items-end gap-2">
                    <div className="flex-1 min-w-[200px] space-y-1">
                      <Label className="text-xs">model id (apiName)</Label>
                      <Input
                        value={m.apiName}
                        placeholder="NVIDIA-Nemotron-3-Super-120B-A12B"
                        onChange={(ev) =>
                          setModel(pi, mi, { apiName: ev.target.value })
                        }
                      />
                    </div>
                    <div className="flex-1 min-w-[160px] space-y-1">
                      <Label className="text-xs">顯示名稱</Label>
                      <Input
                        value={m.uiName}
                        placeholder="Nemotron 3 Super 120B (NCHC)"
                        onChange={(ev) =>
                          setModel(pi, mi, { uiName: ev.target.value })
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2 pb-2">
                      <Switch
                        checked={m.supportsTools}
                        onCheckedChange={(v) =>
                          setModel(pi, mi, { supportsTools: v })
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        支援工具
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => delModel(pi, mi)}
                      className="text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addModel(pi)}
                >
                  <Plus className="size-4" /> 新增模型
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addProvider}>
            <Plus className="size-4" /> 新增供應商
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? (
            <Loader className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          儲存並套用
        </Button>
      </div>
    </div>
  );
}
