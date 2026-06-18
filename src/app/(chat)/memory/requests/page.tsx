import { redirect } from "next/navigation";

// Requests is now a tab inside the consolidated /memory page.
export default function Page() {
  redirect("/memory?tab=requests");
}
