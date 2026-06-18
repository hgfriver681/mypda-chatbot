import { NextResponse } from "next/server";
import { ZodError } from "zod";

// Shared error mapping for the /api/memory* route handlers. The server layer
// (lib/memory/server) throws "Unauthorized" for the auth gate and ZodError for
// invalid input; everything else is a 500.
export function memoryErrorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid input", issues: error.issues },
      { status: 400 },
    );
  }
  const message = error instanceof Error ? error.message : "Unknown error";
  if (message === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (message === "Forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (/not found/i.test(message)) {
    return NextResponse.json({ error: message }, { status: 404 });
  }
  if (/empty|nothing to save/i.test(message)) {
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return NextResponse.json({ error: message }, { status: 500 });
}
