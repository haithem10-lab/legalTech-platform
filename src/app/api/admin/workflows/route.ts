import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listWorkflows, createWorkflow } from "@/lib/db";
import { jsonError } from "@/lib/api/responses";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return jsonError("Unauthorized", 401);

    const workflows = await listWorkflows(session.user.orgId);
    const visible   = workflows.filter((w) => w.status !== "archived");
    return Response.json(visible);
  } catch (err) {
    console.error("[GET /api/admin/workflows]", err);
    return jsonError("Internal server error", 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return jsonError("Unauthorized", 401);

    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return jsonError("name is required", 400);

    const id = await createWorkflow({
      orgId: session.user.orgId,
      createdBy: session.user.id,
      name,
      status: "draft",
      schema: [],
      theme: {
        bgColor: "#FBF8F2",
        font: "Inter",
        radius: 6,
        buttonColor: "#44645D",
        buttonTextColor: "#FFFFFF",
        density: "spacious",
      },
      webhookUrl: "",
      hmacSecret: randomBytes(32).toString("hex"),
      allowedOrigins: [],
    });

    return Response.json({ id }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/workflows]", err);
    return jsonError("Internal server error", 500);
  }
}
