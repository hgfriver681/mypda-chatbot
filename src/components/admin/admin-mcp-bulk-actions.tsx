"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "ui/button";
import { Boxes, RefreshCw, Loader, Trash2 } from "lucide-react";
import {
  adminProvisionMcpForAllAction,
  adminRefreshAllMcpAction,
  adminUnprovisionMcpForAllAction,
} from "@/app/api/admin/mcp-actions";

// The standard private MCPs every workshop user should get — each with identity
// injection (no shared api-key), so files are isolated per user and memory
// starts blank per user.
const STANDARD_MCPS = [
  {
    name: "files-mcp",
    config: { url: "https://files-mcp.mypda.ai/mcp", injectIdentity: true },
  },
  {
    name: "memory-mcp",
    config: { url: "https://memory-mcp.mypda.ai/mcp", injectIdentity: true },
  },
];

export function AdminMcpBulkActions() {
  const [busy, setBusy] = useState<
    null | "provision" | "refresh" | "unprovision"
  >(null);

  const unprovision = async () => {
    const names = STANDARD_MCPS.map((m) => m.name);
    if (
      !confirm(
        `從所有 user 移除標準 MCP「${names.join(" + ")}」?(只移除這些名稱的;你自己的 datapilot-pdf / mypda-memory 不受影響)`,
      )
    )
      return;
    setBusy("unprovision");
    try {
      const r = await adminUnprovisionMcpForAllAction({ names });
      toast.success(`已回收:移除 ${r.removed} 台(符合 ${r.matched} 台)`);
    } catch (e: any) {
      toast.error(e?.message ?? "回收失敗");
    } finally {
      setBusy(null);
    }
  };

  const provision = async () => {
    const names = STANDARD_MCPS.map((m) => m.name).join(" + ");
    if (
      !confirm(
        `把標準 MCP「${names}」(都自動帶入身分、各自獨立)發給所有非 admin 使用者?已有同名的會略過。`,
      )
    )
      return;
    setBusy("provision");
    try {
      const results = await Promise.all(
        STANDARD_MCPS.map((m) => adminProvisionMcpForAllAction(m)),
      );
      const summary = STANDARD_MCPS.map(
        (m, i) =>
          `${m.name}: 新增 ${results[i].provisioned}、略過 ${results[i].skipped}`,
      ).join(";");
      toast.success(
        `已發佈 — ${summary}(共 ${results[0]?.total ?? 0} 位非 admin)`,
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
        發佈標準 MCP(files + memory)給所有 user
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
      <Button
        variant="destructive"
        size="sm"
        onClick={unprovision}
        disabled={busy !== null}
      >
        {busy === "unprovision" ? (
          <Loader className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4" />
        )}
        從所有 user 移除標準 MCP
      </Button>
    </div>
  );
}
