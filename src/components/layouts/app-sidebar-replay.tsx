"use client";
import { authClient } from "auth/client";
import { getIsUserAdmin } from "lib/user/utils";
import { fetcher } from "lib/utils";
import { Clapperboard, Trash2 } from "lucide-react";
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

type ReplaySummary = { id: string; title: string };

// Global replay/demo list — the same for every account (the API returns it with
// no user filter). Admins get a hover delete; everyone can open & replay.
export function AppSidebarReplay() {
  const t = useTranslations();
  const pathname = usePathname();
  const { data } = useSWR<{ replays: ReplaySummary[] }>(
    "/api/replays",
    fetcher,
    { fallbackData: { replays: [] }, revalidateOnFocus: false },
  );
  const { data: session } = authClient.useSession();
  const isAdmin = getIsUserAdmin(session?.user);

  const replays = data?.replays ?? [];
  if (replays.length === 0) return null;

  const remove = async (id: string) => {
    const res = await fetch(`/api/replays/${id}`, { method: "DELETE" });
    if (res.ok) {
      mutate("/api/replays");
      toast.success(t("Chat.Thread.removedFromReplay"));
    } else {
      toast.error(t("Chat.Thread.failedToAddToReplay"));
    }
  };

  return (
    <SidebarMenu className="mt-2">
      <div className="select-none px-2 pb-0.5 pt-1 text-xs font-medium text-muted-foreground/70">
        {t("Layout.replays")}
      </div>
      {replays.map((r) => {
        const href = `/replay/${r.id}`;
        return (
          <SidebarMenuItem key={r.id}>
            <Link href={href}>
              <SidebarMenuButton isActive={pathname === href}>
                <Clapperboard className="size-4" />
                <span className="truncate">{r.title}</span>
              </SidebarMenuButton>
            </Link>
            {isAdmin && (
              <SidebarMenuAction
                showOnHover
                onClick={() => remove(r.id)}
                className="text-muted-foreground hover:text-destructive"
                aria-label={t("Chat.Thread.removedFromReplay")}
              >
                <Trash2 className="size-3.5" />
              </SidebarMenuAction>
            )}
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
