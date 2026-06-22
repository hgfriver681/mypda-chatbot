"use client";
import { fetcher } from "lib/utils";
import { Boxes, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "ui/sidebar";

type ArtifactSummary = { id: string; title: string };

// Per-user saved (pinned) MCP Artifacts. Private — the API returns only the
// current account's artifacts. Click to open full-page at /artifact/[id];
// hover to delete (owner is always self).
export function AppSidebarArtifacts() {
  const t = useTranslations();
  const pathname = usePathname();
  const { data } = useSWR<{ artifacts: ArtifactSummary[] }>(
    "/api/artifacts",
    fetcher,
    { fallbackData: { artifacts: [] }, revalidateOnFocus: false },
  );

  const artifacts = data?.artifacts ?? [];
  if (artifacts.length === 0) return null;

  const remove = async (id: string) => {
    const res = await fetch(`/api/artifacts/${id}`, { method: "DELETE" });
    if (res.ok) {
      mutate("/api/artifacts");
      toast.success(t("Artifact.unpinned"));
    } else {
      toast.error(t("Artifact.deleteFailed"));
    }
  };

  return (
    <SidebarMenu className="mt-2">
      <div className="select-none px-2 pb-0.5 pt-1 text-xs font-medium text-muted-foreground/70">
        {t("Layout.savedArtifacts")}
      </div>
      {artifacts.map((a) => {
        const href = `/artifact/${a.id}`;
        return (
          <SidebarMenuItem key={a.id}>
            <Link href={href}>
              <SidebarMenuButton isActive={pathname === href}>
                <Boxes className="size-4" />
                <span className="truncate">{a.title}</span>
              </SidebarMenuButton>
            </Link>
            <SidebarMenuAction
              showOnHover
              onClick={() => remove(a.id)}
              className="text-muted-foreground hover:text-destructive"
              aria-label={t("Artifact.unpin")}
            >
              <Trash2 className="size-3.5" />
            </SidebarMenuAction>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
