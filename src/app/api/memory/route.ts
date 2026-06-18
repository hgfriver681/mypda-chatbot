import { NextResponse } from "next/server";
import { listMyMemories, createMyMemory } from "lib/memory/server";
import { memoryErrorResponse } from "lib/memory/http";

// GET /api/memory?range=all|7d|30d&category=foo
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const range = url.searchParams.get("range") ?? undefined;
    const category = url.searchParams.get("category") ?? undefined;
    const memories = await listMyMemories({ range: range as any, category });
    return NextResponse.json({ memories });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}

// POST /api/memory  { content, title?, kind?, summary?, categories?, structured?, source? }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const memory = await createMyMemory(body);
    return NextResponse.json({ memory }, { status: 201 });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}
