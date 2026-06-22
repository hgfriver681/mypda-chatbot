import { getSession } from "auth/server";
import { redirect } from "next/navigation";
import SystemPromptPlayground from "@/components/system-prompt-playground";

// Session-dependent: render dynamically.
export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await getSession();
  if (!session?.user) {
    return redirect("/login");
  }
  return <SystemPromptPlayground />;
}
