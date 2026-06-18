import { type MemoryTab, MemoryTabs } from "@/components/memory/memory-tabs";
import { getSession } from "auth/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const VALID_TABS = ["memories", "requests", "keys"];

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session?.user) return redirect("/login");
  const { tab } = await searchParams;
  const initialTab: MemoryTab = VALID_TABS.includes(tab ?? "")
    ? (tab as MemoryTab)
    : "memories";
  return <MemoryTabs initialTab={initialTab} />;
}
