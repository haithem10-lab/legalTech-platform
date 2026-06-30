import { getWorkflow } from "@/lib/db";
import { isOriginAllowed } from "@/lib/origin";
import { publicHeaders } from "@/lib/api/responses";
import type { Workflow } from "@/types/workflow";

type ValidateResult =
  | { ok: true; workflow: Workflow; origin: string | null }
  | { ok: false; response: Response };

export async function validatePublicRequest(
  request: Request,
  workflowId: string
): Promise<ValidateResult> {
  const origin  = request.headers.get("origin");
  const headers = publicHeaders(origin);

  const workflow = await getWorkflow(workflowId);

  if (!workflow || workflow.status !== "published") {
    return {
      ok: false,
      response: Response.json({ error: "Not found" }, { status: 404, headers }),
    };
  }

  if (!isOriginAllowed(origin, workflow.allowedOrigins ?? [])) {
    return {
      ok: false,
      response: Response.json({ error: "Origin not allowed" }, { status: 403, headers }),
    };
  }

  return { ok: true, workflow, origin };
}
