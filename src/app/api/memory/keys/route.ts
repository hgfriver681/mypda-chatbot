import { NextResponse } from "next/server";
import { listMyApiKeys, createMyApiKey } from "lib/memory/server";
import { memoryErrorResponse } from "lib/memory/http";

// GET /api/memory/keys
export async function GET() {
  try {
    const keys = await listMyApiKeys();
    return NextResponse.json({ keys });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}

// POST /api/memory/keys  { name? }  ->  { key: {..., plaintext} }  (plaintext shown once)
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const key = await createMyApiKey(body);
    return NextResponse.json({ key }, { status: 201 });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}
