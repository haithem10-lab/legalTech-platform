import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getWorkflow, saveWorkflow } from "@/lib/firestore";
import type { Workflow } from "@/types/workflow";

type Ctx = { params: { id: string } };

// Fields a caller is allowed to update. Everything else is silently ignored.
const PATCHABLE = [
  "name",
  "schema",
  "theme",
  "webhookUrl",
  "allowedOrigins",
  "status",
] as const;
type PatchableKey = (typeof PATCHABLE)[number];

async function resolveOwned(
  id: string,
  accountId: string
): Promise<{ workflow: Workflow } | NextResponse> {
  const workflow = await getWorkflow(id);
  if (!workflow) {
    // Return 403 rather than 404 — never confirm a document exists to the wrong caller
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (workflow.accountId !== accountId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { workflow };
}

export async function GET(_req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await resolveOwned(params.id, session.user.accountId);
  if (result instanceof NextResponse) return result;
  return NextResponse.json(result.workflow);
}

export async function PATCH(request: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await resolveOwned(params.id, session.user.accountId);
  if (result instanceof NextResponse) return result;

  const body = await request.json().catch(() => ({}));

  // Secret regeneration — handled separately; never allowed via PATCHABLE loop
  if (body.regenerateSecret === true) {
    const newSecret = randomBytes(32).toString("hex");
    await saveWorkflow(params.id, { hmacSecret: newSecret });
    return NextResponse.json({ ok: true, hmacSecret: newSecret });
  }

  const update: Partial<Workflow> = {};
  for (const key of PATCHABLE) {
    if (key in body) (update as Record<PatchableKey, unknown>)[key] = body[key];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No patchable fields provided" }, { status: 400 });
  }

  await saveWorkflow(params.id, update);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await resolveOwned(params.id, session.user.accountId);
  if (result instanceof NextResponse) return result;

  await saveWorkflow(params.id, { status: "archived" });
  return NextResponse.json({ ok: true });
}
