"use client";
import { ActivityIcon, BrainIcon, KeyRoundIcon } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "ui/tabs";
import { ApiKeysView } from "./api-keys-view";
import { MemoriesView } from "./memories-view";
import { RequestsView } from "./requests-view";

const TABS = ["memories", "requests", "keys"] as const;
export type MemoryTab = (typeof TABS)[number];

// One page for the whole memory area: Memories is the primary view; Requests and
// API Keys (rarely viewed) live as secondary tabs here instead of separate routes.
export function MemoryTabs({
  initialTab = "memories",
}: {
  initialTab?: MemoryTab;
}) {
  const [tab, setTab] = useState<MemoryTab>(initialTab);
  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <div className="mb-4 flex items-center gap-2">
        <BrainIcon className="size-6" />
        <h1 className="text-2xl font-bold">Memories</h1>
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as MemoryTab)}>
        <TabsList>
          <TabsTrigger value="memories">
            <BrainIcon className="mr-1 size-3.5" />
            Memories
          </TabsTrigger>
          <TabsTrigger value="requests">
            <ActivityIcon className="mr-1 size-3.5" />
            Requests
          </TabsTrigger>
          <TabsTrigger value="keys">
            <KeyRoundIcon className="mr-1 size-3.5" />
            API Keys
          </TabsTrigger>
        </TabsList>
        <TabsContent value="memories" className="mt-4">
          <MemoriesView embedded />
        </TabsContent>
        <TabsContent value="requests" className="mt-4">
          <RequestsView embedded />
        </TabsContent>
        <TabsContent value="keys" className="mt-4">
          <ApiKeysView embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
