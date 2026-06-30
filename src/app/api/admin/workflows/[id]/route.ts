import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getWorkflow, saveWorkflow } from "@/lib/db";
import { jsonError } from "@/lib/api/responses";
import type { Workflow } from "@/types/workflow";

type Ctx = { params: { id: string } };

// Fields a caller is allowed to update. Everything else is silently ignored.
const PATCHABLE = ["name", "schema", "theme", "webhookUrl", "allowedOrigins", "status"] as const;
type PatchableKey = (typeof PATCHABLE)[number];

async function resolveOwned(id: string, orgId: string): Promise<Workflow | Response> {
  const workflow = await getWorkflow(id);
  if (!workflow || workflow.orgId !== orgId) {
    // Return 403 rather than 404 — never confirm a document exists to the wrong caller
    return jsonError("Forbidden", 403);
  }
  return workflow;
}

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return jsonError("Unauthorized", 401);

    const result = await resolveOwned(params.id, session.user.orgId);
    if (result instanceof Response) return result;
    return Response.json(result);
  } catch (err) {
    console.error("[GET /api/admin/workflows/:id]", err);
    return jsonError("Internal server error", 500);
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return jsonError("Unauthorized", 401);

    const result = await resolveOwned(params.id, session.user.orgId);
    if (result instanceof Response) return result;

    const body = await request.json().catch(() => ({}));

    // Secret regeneration — handled separately; never allowed via PATCHABLE loop
    if (body.regenerateSecret === true) {
      const newSecret = randomBytes(32).toString("hex");
      await saveWorkflow(params.id, { hmacSecret: newSecret });
      return Response.json({ ok: true, hmacSecret: newSecret });
    }

    const update: Partial<Workflow> = {};
    for (const key of PATCHABLE) {
      if (key in body) (update as Record<PatchableKey, unknown>)[key] = body[key];
    }

    if (Object.keys(update).length === 0) {
      return jsonError("No patchable fields provided", 400);
    }

    await saveWorkflow(params.id, update);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/admin/workflows/:id]", err);
    return jsonError("Internal server error", 500);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return jsonError("Unauthorized", 401);

    const result = await resolveOwned(params.id, session.user.orgId);
    if (result instanceof Response) return result;

    await saveWorkflow(params.id, { status: "archived" });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/admin/workflows/:id]", err);
    return jsonError("Internal server error", 500);
  }
}
