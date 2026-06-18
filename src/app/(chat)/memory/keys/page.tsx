import { redirect } from "next/navigation";

// API Keys is now a tab inside the consolidated /memory page.
export default function Page() {
  redirect("/memory?tab=keys");
}
