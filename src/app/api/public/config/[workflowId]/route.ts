import { publicProjection } from "@/lib/projection";
import { handleOptions, publicHeaders } from "@/lib/api/responses";
import { validatePublicRequest } from "@/lib/guards/publicRoute";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/ratelimit";

export async function GET(
  request: Request,
  { params }: { params: { workflowId: string } }
) {
  const ip = getClientIp(request);
  const { success, resetAt } = rateLimit(`config:${ip}`, 30, 60_000);
  if (!success) return rateLimitResponse(resetAt);

  const result = await validatePublicRequest(request, params.workflowId);
  if (!result.ok) return result.response;

  const { workflow, origin } = result;
  return Response.json(publicProjection(workflow), { headers: publicHeaders(origin) });
}

export function OPTIONS(request: Request) {
  return handleOptions(request);
}
