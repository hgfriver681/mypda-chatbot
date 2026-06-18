"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "ui/sidebar";
import {
  ActivityIcon,
  BrainIcon,
  ChevronRight,
  KeyRoundIcon,
} from "lucide-react";
import { cn } from "lib/utils";

// Memory section. Requests and API Keys are sub-routes of /memory, so they are
// nested *under* Memories rather than shown as parallel top-level items.
// Collapsed by default; auto-expanded while inside the /memory section.
export function AppSidebarMemory() {
  const pathname = usePathname();
  const inMemory = pathname.startsWith("/memory");
  const [expanded, setExpanded] = useState(inMemory);

  return (
    <SidebarMenu>
      <SidebarMenuItem className="flex items-center">
        <Link href="/memory" className="min-w-0 flex-1">
          <SidebarMenuButton
            className="font-semibold"
            isActive={pathname === "/memory"}
          >
            <BrainIcon className="size-4" />
            Memories
          </SidebarMenuButton>
        </Link>
        <button
          type="button"
          aria-label="Toggle memory section"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="rounded p-1 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <ChevronRight
            className={cn(
              "size-4 transition-transform",
              expanded && "rotate-90",
            )}
          />
        </button>
      </SidebarMenuItem>

      {expanded && (
        <SidebarMenuSub>
          <SidebarMenuSubItem>
            <SidebarMenuSubButton
              asChild
              isActive={pathname === "/memory/requests"}
            >
              <Link href="/memory/requests">
                <ActivityIcon className="size-4" />
                <span>Requests</span>
              </Link>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
          <SidebarMenuSubItem>
            <SidebarMenuSubButton
              asChild
              isActive={pathname === "/memory/keys"}
            >
              <Link href="/memory/keys">
                <KeyRoundIcon className="size-4" />
                <span>API Keys</span>
              </Link>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        </SidebarMenuSub>
      )}
    </SidebarMenu>
  );
}
