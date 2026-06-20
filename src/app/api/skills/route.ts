import {
  deleteMySkill,
  installSkillFromZip,
  listMySkills,
} from "lib/skills/skill-service";
import { NextResponse } from "next/server";

// zip parsing + hashing + storage need the Node runtime.
export const runtime = "nodejs";

function errorResponse(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : "Unknown error";
  const status =
    message === "Unauthorized"
      ? 401
      : message.includes("already exists")
        ? 409
        : 400;
  return NextResponse.json({ error: message }, { status });
}

// GET /api/skills -> { skills: SkillSelect[] }
export async function GET() {
  try {
    return NextResponse.json({ skills: await listMySkills() });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/skills  (multipart 'file': a skill zip) -> { skill }
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file (field 'file')" },
        { status: 400 },
      );
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const skill = await installSkillFromZip(bytes);
    return NextResponse.json({ skill }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/skills?id=<id>
export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    await deleteMySkill(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
