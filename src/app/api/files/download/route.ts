import { NextResponse } from "next/server";
import { getMyDownloadUrl } from "lib/files/server";

// GET /api/files/download?path=foo.pdf -> 302 to a short-lived signed URL.
// Clicking a file in the UI hits this and the browser downloads it (no preview).
export async function GET(request: Request) {
  try {
    const path = new URL(request.url).searchParams.get("path");
    if (!path) return NextResponse.json({ error: "Missing path" }, { status: 400 });
    const url = await getMyDownloadUrl(path);
    // `download` makes Supabase serve Content-Disposition: attachment (no
    // in-browser preview), per the decision to keep this download-only.
    const name = path.split("/").pop() || "download";
    const sep = url.includes("?") ? "&" : "?";
    return NextResponse.redirect(`${url}${sep}download=${encodeURIComponent(name)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
