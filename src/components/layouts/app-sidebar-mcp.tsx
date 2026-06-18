"use client";
import { useMcpList } from "@/hooks/queries/use-mcp-list";
import type { MCPServerInfo } from "app-types/mcp";
import { cn } from "lib/utils";
import {
  ActivityIcon,
  BrainIcon,
  ChevronRight,
  FolderIcon,
  KeyRoundIcon,
  ServerIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { MCPIcon } from "ui/mcp-icon";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "ui/sidebar";

// Custom feature panels mounted under a specific MCP server (matched by name).
// A server without an entry here is just a link to its tool-test page.
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
  "mypda-memory": [
    { key: "memories", label: "Memories", href: "/memory", icon: BrainIcon },
    {
      key: "requests",
      label: "Requests",
      href: "/memory/requests",
      icon: ActivityIcon,
    },
    {
      key: "keys",
      label: "API Keys",
      href: "/memory/keys",
      icon: KeyRoundIcon,
    },
  ],
};

const UNGROUPED = "__ungrouped__";

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

  // Is the current route one of a server's feature panels?
  const serverHasActivePanel = (name: string) =>
    (SERVER_PANELS[name] ?? []).some((p) => pathname === p.href);

  // null = follow default (open when active); boolean = explicit user toggle.
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>({});
  const [serverOpen, setServerOpen] = useState<Record<string, boolean>>({});

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

      {groups.map(([groupKey, servers]) => {
        const isGroupOpen = groupOpen[groupKey] ?? true;
        const label = groupKey === UNGROUPED ? t("MCP.ungrouped") : groupKey;
        return (
          <SidebarMenu key={groupKey} className="mt-1">
            <SidebarMenuItem>
              {/* Category label, not a nav item: small + muted, and (unlike the
                  clickable rows) it does NOT fill the whole row on hover. It only
                  collapses/expands its group — mirrors Claude's section headers. */}
              <button
                type="button"
                aria-expanded={isGroupOpen}
                onClick={() =>
                  setGroupOpen((prev) => ({
                    ...prev,
                    [groupKey]: !isGroupOpen,
                  }))
                }
                className="flex w-full items-center gap-1 px-2 py-1.5 text-xs font-medium text-muted-foreground/80 transition-colors hover:text-foreground"
              >
                <ChevronRight
                  className={cn(
                    "size-3 shrink-0 transition-transform",
                    isGroupOpen && "rotate-90",
                  )}
                />
                <span className="truncate">{label}</span>
                <span className="ml-auto text-[10px] tabular-nums opacity-60">
                  {servers.length}
                </span>
              </button>
            </SidebarMenuItem>

            {isGroupOpen && (
              <SidebarMenuSub>
                {servers.map((server) => {
                  const panels = SERVER_PANELS[server.name];
                  // Server without custom panels: a plain link to its test page.
                  if (!panels) {
                    return (
                      <SidebarMenuSubItem key={server.id}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname === `/mcp/test/${server.id}`}
                        >
                          <Link href={`/mcp/test/${server.id}`}>
                            <ServerIcon className="size-4" />
                            <span className="truncate">{server.name}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    );
                  }
                  // Server with custom panels: collapsible, panels nested under it.
                  const isOpen =
                    serverOpen[server.id] ?? serverHasActivePanel(server.name);
                  return (
                    <div key={server.id}>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={() =>
                            setServerOpen((prev) => ({
                              ...prev,
                              [server.id]: !isOpen,
                            }))
                          }
                          className="cursor-pointer"
                        >
                          <ChevronRight
                            className={cn(
                              "size-3.5 transition-transform",
                              isOpen && "rotate-90",
                            )}
                          />
                          <ServerIcon className="size-4" />
                          <span className="truncate">{server.name}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      {isOpen &&
                        panels.map((panel) => {
                          const Icon = panel.icon;
                          return (
                            <SidebarMenuSubItem
                              key={panel.key}
                              className="ml-3"
                            >
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === panel.href}
                              >
                                <Link href={panel.href}>
                                  <Icon className="size-4" />
                                  <span className="truncate">
                                    {panel.label}
                                  </span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                    </div>
                  );
                })}
              </SidebarMenuSub>
            )}
          </SidebarMenu>
        );
      })}
    </>
  );
}
