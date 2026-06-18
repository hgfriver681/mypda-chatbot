"use client";
import { useMcpList } from "@/hooks/queries/use-mcp-list";
import type { MCPServerInfo } from "app-types/mcp";
import { BrainIcon, FolderIcon, ServerIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { MCPIcon } from "ui/mcp-icon";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "ui/sidebar";

// Feature panels mounted under a specific MCP server (matched by name). A server
// with panels shows those panels as its sidebar items; a server without panels
// shows its own name (links to its tool-test page).
type Panel = {
  key: string;
  label: string;
  href: string;
  icon: typeof FolderIcon;
};
const SERVER_PANELS: Record<string, Panel[]> = {
  "datapilot-pdf": [
    { key: "files", label: "Files", href: "/files", icon: FolderIcon },
  ],
  // Requests + API Keys are tabs inside the single /memory page.
  "mypda-memory": [
    { key: "memories", label: "Memories", href: "/memory", icon: BrainIcon },
  ],
};

const UNGROUPED = "__ungrouped__";

// Flat, ChatGPT-style: no expand/collapse. Categories are quiet text labels;
// every server/panel is a flat, full-row-highlight clickable item.
export function AppSidebarMcp() {
  const t = useTranslations();
  const pathname = usePathname();
  const { data: mcpList } = useMcpList();

  // Group servers by their user-defined category; ungrouped go last.
  const groups = useMemo(() => {
    const byCat = new Map<string, MCPServerInfo[]>();
    for (const server of mcpList ?? []) {
      const key = server.category?.trim() ? server.category.trim() : UNGROUPED;
      const list = byCat.get(key) ?? [];
      list.push(server);
      byCat.set(key, list);
    }
    return [...byCat.entries()].sort(([a], [b]) => {
      if (a === UNGROUPED) return 1;
      if (b === UNGROUPED) return -1;
      return a.localeCompare(b);
    });
  }, [mcpList]);

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <Link href="/mcp">
            <SidebarMenuButton
              className="font-semibold"
              isActive={pathname === "/mcp"}
            >
              <MCPIcon className="size-4 fill-accent-foreground" />
              {t("Layout.mcpServers")}
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      </SidebarMenu>

      {groups.map(([groupKey, servers]) => (
        <SidebarMenu key={groupKey} className="mt-2">
          {/* Category label: a quiet, non-clickable text header (no hover fill,
              no collapse) — mirrors ChatGPT's section labels. */}
          <div className="select-none px-2 pb-0.5 pt-1 text-xs font-medium text-muted-foreground/70">
            {groupKey === UNGROUPED ? t("MCP.ungrouped") : groupKey}
          </div>
          {servers.flatMap((server) => {
            const panels = SERVER_PANELS[server.name];
            // No custom panels: the server itself is the item (-> test page).
            if (!panels) {
              const href = `/mcp/test/${server.id}`;
              return [
                <SidebarMenuItem key={server.id}>
                  <Link href={href}>
                    <SidebarMenuButton isActive={pathname === href}>
                      <ServerIcon className="size-4" />
                      <span className="truncate">{server.name}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>,
              ];
            }
            // Has panels: list each panel as a flat item.
            return panels.map((panel) => {
              const Icon = panel.icon;
              return (
                <SidebarMenuItem key={`${server.id}-${panel.key}`}>
                  <Link href={panel.href}>
                    <SidebarMenuButton isActive={pathname === panel.href}>
                      <Icon className="size-4" />
                      <span className="truncate">{panel.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              );
            });
          })}
        </SidebarMenu>
      ))}
    </>
  );
}
