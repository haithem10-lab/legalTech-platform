import { NextResponse } from "next/server";
import { getWorkflow } from "@/lib/firestore";
import { publicProjection } from "@/lib/projection";
import { isOriginAllowed, corsHeaders } from "@/lib/origin";

export async function GET(
  request: Request,
  { params }: { params: { workflowId: string } }
) {
  const workflow = await getWorkflow(params.workflowId);

  if (!workflow || workflow.status !== "published") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const origin = request.headers.get("origin");

  if (!isOriginAllowed(origin, workflow.allowedOrigins)) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  }

  const projected = publicProjection(workflow);
  const res = NextResponse.json(projected);

  const cors = corsHeaders(origin);
  Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));

  return res;
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin") ?? "*";
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
