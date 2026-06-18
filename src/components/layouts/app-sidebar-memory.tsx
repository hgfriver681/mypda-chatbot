"use client";
import Link from "next/link";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "ui/sidebar";
import { BrainIcon, ActivityIcon, KeyRoundIcon } from "lucide-react";

// Memory section — ports the myPDA-memory sidebar (Memories / Requests / API
// Keys) into better-chatbot's sidebar.
export function AppSidebarMemory() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Link href="/memory">
          <SidebarMenuButton className="font-semibold">
            <BrainIcon className="size-4" />
            Memories
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <Link href="/memory/requests">
          <SidebarMenuButton className="font-semibold">
            <ActivityIcon className="size-4" />
            Requests
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <Link href="/memory/keys">
          <SidebarMenuButton className="font-semibold">
            <KeyRoundIcon className="size-4" />
            API Keys
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
