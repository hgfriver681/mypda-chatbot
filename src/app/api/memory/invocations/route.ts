import { NextResponse } from "next/server";
import { listMyInvocations } from "lib/memory/server";
import { memoryErrorResponse } from "lib/memory/http";

// GET /api/memory/invocations?limit=100
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limitRaw = url.searchParams.get("limit");
    const limit = limitRaw ? Math.min(Math.max(1, Number(limitRaw)), 500) : 100;
    const invocations = await listMyInvocations(limit);
    return NextResponse.json({ invocations });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}
