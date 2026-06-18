import { getSession } from "auth/server";
import { redirect } from "next/navigation";
import { FilesView } from "@/components/files/files-view";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await getSession();
  if (!session?.user) return redirect("/login");
  return <FilesView />;
}
