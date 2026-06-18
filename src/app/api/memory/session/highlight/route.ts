import { NextResponse } from "next/server";
import { toggleSessionHighlight } from "lib/memory/server";
import { memoryErrorResponse } from "lib/memory/http";

// POST /api/memory/session/highlight  { threadId, messageId }
// Toggles a message's "important" flag on the thread's session memory (and
// saves the whole thread as a side effect). Returns the updated record.
export async function POST(request: Request) {
  try {
    const { threadId, messageId } = await request.json();
    if (!threadId || !messageId)
      return NextResponse.json(
        { error: "Missing threadId or messageId" },
        { status: 400 },
      );
    const memory = await toggleSessionHighlight(threadId, messageId);
    return NextResponse.json({ memory });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}
