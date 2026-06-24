import { NextResponse } from "next/server";
import { getWorkflow } from "@/lib/firestore";
import { getStorage } from "@/lib/storage";
import { isOriginAllowed, corsHeaders } from "@/lib/origin";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");

  let body: { workflowId?: unknown; filename?: unknown; contentType?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { workflowId, filename, contentType } = body;

  if (
    typeof workflowId !== "string" ||
    typeof filename !== "string" ||
    typeof contentType !== "string"
  ) {
    return NextResponse.json(
      { error: "workflowId, filename, and contentType are required" },
      { status: 400 }
    );
  }

  const workflow = await getWorkflow(workflowId);

  if (!workflow || workflow.status !== "published") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isOriginAllowed(origin, workflow.allowedOrigins)) {
    return jsonWithCors(origin, { error: "Origin not allowed" }, 403);
  }

  const bucket = process.env.GCS_BUCKET_NAME;
  if (!bucket) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
  }

  // Sanitise filename — strip path separators and non-printable chars
  const safeFilename = filename.replace(/[^a-zA-Z0-9._\-]/g, "_").slice(0, 128);
  const fileId = crypto.randomUUID();
  const gcsPath = `submissions/${workflowId}/${fileId}/${safeFilename}`;

  const [signedUrl] = await getStorage()
    .bucket(bucket)
    .file(gcsPath)
    .getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType,
    });

  return jsonWithCors(origin, { url: signedUrl, gcsPath }, 200);
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin") ?? "*";
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

function jsonWithCors(
  origin: string | null,
  body: unknown,
  status: number
): NextResponse {
  const res = NextResponse.json(body, { status });
  Object.entries(corsHeaders(origin)).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}
