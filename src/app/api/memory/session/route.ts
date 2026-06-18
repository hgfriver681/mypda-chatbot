import { NextResponse } from "next/server";
import {
  syncSessionToMemory,
  getSessionMemoryStatus,
} from "lib/memory/server";
import { memoryErrorResponse } from "lib/memory/http";

// GET /api/memory/session?threadId=... -> save state for the dirty indicator.
export async function GET(request: Request) {
  try {
    const threadId = new URL(request.url).searchParams.get("threadId");
    if (!threadId)
      return NextResponse.json({ error: "Missing threadId" }, { status: 400 });
    const status = await getSessionMemoryStatus(threadId);
    return NextResponse.json({ status });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}

// POST /api/memory/session  { threadId } -> upsert the whole thread transcript.
export async function POST(request: Request) {
  try {
    const { threadId } = await request.json();
    if (!threadId)
      return NextResponse.json({ error: "Missing threadId" }, { status: 400 });
    const memory = await syncSessionToMemory(threadId);
    return NextResponse.json({ memory });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}
