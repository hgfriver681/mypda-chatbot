"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";
import { Button } from "ui/button";
import { Badge } from "ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "ui/dialog";
import {
  Boxes,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  Loader,
  ShieldCheck,
} from "lucide-react";
import type { MCPServerConfig } from "app-types/mcp";
import MCPEditor from "@/components/mcp-editor";
import {
  adminListUserMcpAction,
  adminSaveMcpForUserAction,
  adminDeleteUserMcpAction,
  adminRefreshUserMcpAction,
} from "@/app/api/admin/mcp-actions";

type AdminUserMcp = Awaited<ReturnType<typeof adminListUserMcpAction>>[number];

export function UserMcpCard({ targetUserId }: { targetUserId: string }) {
  const key = `admin-user-mcp:${targetUserId}`;
  const { data, isLoading, mutate } = useSWR<AdminUserMcp[]>(key, () =>
    adminListUserMcpAction(targetUserId),
  );
  const [editing, setEditing] = useState<AdminUserMcp | null>(null);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const servers = data ?? [];

  const onRefresh = async (id: string) => {
    setBusyId(id);
    try {
      await adminRefreshUserMcpAction(id);
      toast.success("已重整(重新連線)");
      mutate();
    } catch (e: any) {
      toast.error(e?.message ?? "重整失敗");
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (s: AdminUserMcp) => {
    if (!confirm(`刪除這位使用者的 MCP「${s.name}」?`)) return;
    setBusyId(s.id);
    try {
      await adminDeleteUserMcpAction(s.id);
      toast.success("已刪除");
      mutate();
    } catch (e: any) {
      toast.error(e?.message ?? "刪除失敗");
    } finally {
      setBusyId(null);
    }
  };

  const dialogOpen = adding || editing !== null;

  return (
    <>
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Boxes className="h-5 w-5 text-primary" />
            MCP 伺服器(代管)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            以管理員身分檢視/管理這位使用者的 MCP 連線。設定可能含密鑰(headers),
            僅管理員可見。
          </p>
        </CardHeader>

        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader className="size-4 animate-spin" /> 載入中…
            </div>
          ) : servers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              這位使用者目前沒有 MCP 伺服器。
            </p>
          ) : (
            servers.map((s) => {
              const url = (s.config as { url?: string })?.url;
              const inject = (s.config as { injectIdentity?: boolean })
                ?.injectIdentity;
              const busy = busyId === s.id;
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{s.name}</span>
                      {inject && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] gap-1"
                        >
                          <ShieldCheck className="size-3" />
                          帶入身分
                        </Badge>
                      )}
                      {s.lastConnectionStatus && (
                        <Badge variant="outline" className="text-[10px]">
                          {s.lastConnectionStatus}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate font-mono">
                      {url ?? "(stdio)"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      disabled={busy}
                      title="重整"
                      onClick={() => onRefresh(s.id)}
                    >
                      {busy ? (
                        <Loader className="size-4 animate-spin" />
                      ) : (
                        <RefreshCw className="size-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      title="編輯"
                      onClick={() => setEditing(s)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      disabled={busy}
                      title="刪除"
                      onClick={() => onDelete(s)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}

          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setAdding(true)}
          >
            <Plus className="size-4" /> 幫這位使用者新增 MCP
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (!o) {
            setAdding(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[820px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? `編輯 MCP — ${editing.name}` : "幫使用者新增 MCP"}
            </DialogTitle>
            <DialogDescription>
              admin 檢視中:此設定將以這位使用者的身分儲存。
            </DialogDescription>
          </DialogHeader>
          <MCPEditor
            key={editing?.id ?? "new"}
            id={editing?.id}
            name={editing?.name}
            initialConfig={editing?.config as MCPServerConfig | undefined}
            onSubmit={async ({ name, config, id }) => {
              await adminSaveMcpForUserAction(targetUserId, {
                id,
                name,
                config,
              });
            }}
            onSaved={() => {
              setAdding(false);
              setEditing(null);
              mutate();
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
