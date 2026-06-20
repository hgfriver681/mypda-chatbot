import { exportSkillZip } from "lib/skills/skill-service";

export const runtime = "nodejs";

// GET /api/skills/:id/download -> the skill package zip as an attachment.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { bytes, filename } = await exportSkillZip(id);
    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status =
      message === "Unauthorized"
        ? 401
        : message === "Skill not found"
          ? 404
          : 400;
    return Response.json({ error: message }, { status });
  }
}
