import { describe, it, expect } from "vitest";
import { z } from "zod";
import { memoryErrorResponse } from "./http";

describe("memoryErrorResponse", () => {
  it("maps the Unauthorized gate to 401", async () => {
    const res = memoryErrorResponse(new Error("Unauthorized"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("maps a ZodError to 400 with issues", async () => {
    const err = z.object({ a: z.string() }).safeParse({});
    expect(err.success).toBe(false);
    const res = memoryErrorResponse((err as any).error);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input");
    expect(Array.isArray(body.issues)).toBe(true);
  });

  it("maps anything else to 500 with the message", async () => {
    const res = memoryErrorResponse(new Error("boom"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "boom" });
  });
});
