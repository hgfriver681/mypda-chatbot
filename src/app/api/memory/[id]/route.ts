import { NextResponse } from "next/server";
import { deleteMyMemory } from "lib/memory/server";
import { memoryErrorResponse } from "lib/memory/http";

// DELETE /api/memory/:id
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await deleteMyMemory(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}
