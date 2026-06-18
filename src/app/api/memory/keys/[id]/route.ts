import { NextResponse } from "next/server";
import { revokeMyApiKey } from "lib/memory/server";
import { memoryErrorResponse } from "lib/memory/http";

// DELETE /api/memory/keys/:id  (revoke)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await revokeMyApiKey(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}
