import { NextResponse } from "next/server";
import { getWorkflow } from "@/lib/firestore";
import { publicProjection } from "@/lib/projection";
import { isOriginAllowed } from "@/lib/origin";
import { corsHeaders, handleOptions } from "@/lib/cors";

export async function GET(
  request: Request,
  { params }: { params: { workflowId: string } }
) {
  const origin = request.headers.get("origin");

  const headers = {
    ...corsHeaders(origin),
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    "Pragma": "no-cache",
    "Expires": "0",
    "Vary": "Origin",
  };

  const workflow = await getWorkflow(params.workflowId);

  if (!workflow || workflow.status !== "published") {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers });
  }

  console.log("[config] origin:", origin, "| allowed:", workflow.allowedOrigins, "| result:", isOriginAllowed(origin, workflow.allowedOrigins));

  if (!isOriginAllowed(origin, workflow.allowedOrigins)) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403, headers });
  }

  return NextResponse.json(publicProjection(workflow), { headers });
}

export function OPTIONS(request: Request) {
  return handleOptions(request);
}
