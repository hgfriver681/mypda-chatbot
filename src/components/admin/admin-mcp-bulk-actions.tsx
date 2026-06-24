"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "ui/button";
import { Boxes, RefreshCw, Loader } from "lucide-react";
import {
  adminProvisionMcpForAllAction,
  adminRefreshAllMcpAction,
} from "@/app/api/admin/mcp-actions";

// The standard MCP every workshop user should get (files MCP + identity inject).
const STANDARD_MCP = {
  name: "files-mcp",
  config: {
    url: "https://files-mcp.mypda.ai/mcp",
    injectIdentity: true,
  },
};

export function AdminMcpBulkActions() {
  const [busy, setBusy] = useState<null | "provision" | "refresh">(null);

  const provision = async () => {
    if (
      !confirm(
        `把標準 MCP「${STANDARD_MCP.name}」(${STANDARD_MCP.config.url},自動帶入身分)發給所有非 admin 使用者?已有同名的會略過。`,
      )
    )
      return;
    setBusy("provision");
    try {
      const r = await adminProvisionMcpForAllAction(STANDARD_MCP);
      toast.success(
        `已發佈:新增 ${r.provisioned} 位、略過 ${r.skipped} 位(共 ${r.total} 位非 admin)`,
      );
    } catch (e: any) {
      toast.error(e?.message ?? "發佈失敗");
    } finally {
      setBusy(null);
    }
  };

  const refreshAll = async () => {
    if (!confirm("重整所有使用者的 MCP(重新連線,讓大家拿到最新工具)?")) return;
    setBusy("refresh");
    try {
      const r = await adminRefreshAllMcpAction();
      toast.success(`已重整 ${r.count}/${r.total} 個 MCP`);
    } catch (e: any) {
      toast.error(e?.message ?? "重整失敗");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={provision}
        disabled={busy !== null}
      >
        {busy === "provision" ? (
          <Loader className="size-4 animate-spin" />
        ) : (
          <Boxes className="size-4" />
        )}
        發佈標準 MCP 給所有 user
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={refreshAll}
        disabled={busy !== null}
      >
        {busy === "refresh" ? (
          <Loader className="size-4 animate-spin" />
        ) : (
          <RefreshCw className="size-4" />
        )}
        重整所有 user 的 MCP
      </Button>
    </div>
  );
}
