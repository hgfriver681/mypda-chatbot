import { NextResponse } from "next/server";
import { listMyFiles, uploadMyFile, deleteMyFile } from "lib/files/server";

function errorResponse(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : "Unknown error";
  const status = message === "Unauthorized" ? 401 : 500;
  return NextResponse.json({ error: message }, { status });
}

// GET /api/files -> { files: [{path, size, updatedAt}] }
export async function GET() {
  try {
    return NextResponse.json({ files: await listMyFiles() });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/files  (multipart 'file') -> { path }
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file (field 'file')" }, { status: 400 });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const res = await uploadMyFile(file.name, bytes, file.type || undefined);
    return NextResponse.json(res, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/files?path=foo.pdf
export async function DELETE(request: Request) {
  try {
    const path = new URL(request.url).searchParams.get("path");
    if (!path) return NextResponse.json({ error: "Missing path" }, { status: 400 });
    await deleteMyFile(path);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
