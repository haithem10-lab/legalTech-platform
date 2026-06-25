import { NextRequest, NextResponse } from "next/server";
import { getWorkflow } from "@/lib/firestore";
import { getStorage } from "@/lib/storage";
import { isOriginAllowed, corsHeaders } from "@/lib/origin";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
];
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".jpg", ".jpeg", ".png"];

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  try {
    let body: { workflowId?: unknown; filename?: unknown; contentType?: unknown } = {};
    try {
      body = await request.json();
    } catch {
      return jsonWithCors(origin, { error: "Invalid JSON" }, 400);
    }

    const { workflowId, filename, contentType } = body;

    if (
      typeof workflowId !== "string" ||
      typeof filename !== "string" ||
      typeof contentType !== "string"
    ) {
      return jsonWithCors(origin, { error: "workflowId, filename, and contentType are required" }, 400);
    }

    const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
    if (!ALLOWED_TYPES.includes(contentType) || !ALLOWED_EXTENSIONS.includes(ext)) {
      return jsonWithCors(origin, { error: "File type not allowed. Accepted: PDF, DOCX, JPG, PNG" }, 400);
    }

    const workflow = await getWorkflow(workflowId);
    if (!workflow || workflow.status !== "published") {
      return jsonWithCors(origin, { error: "Workflow not found or not published" }, 404);
    }

    // Guard against undefined allowedOrigins on old Firestore docs
    const allowedOrigins: string[] = workflow.allowedOrigins ?? [];
    if (!isOriginAllowed(origin, allowedOrigins)) {
      return jsonWithCors(origin, { error: "Origin not allowed" }, 403);
    }

    const bucket = process.env.GCS_BUCKET_NAME;
    if (!bucket) {
      console.error("[upload-url] GCS_BUCKET_NAME is not set");
      return jsonWithCors(origin, { error: "Storage not configured — set GCS_BUCKET_NAME in .env.local" }, 500);
    }

    const safeFilename = filename.replace(/[^a-zA-Z0-9._\-]/g, "_").slice(0, 128);
    const fileId = crypto.randomUUID();
    const gcsPath = `submissions/${workflowId}/${fileId}/${safeFilename}`;

    let signedUrl: string;
    try {
      [signedUrl] = await getStorage()
        .bucket(bucket)
        .file(gcsPath)
        .getSignedUrl({
          version: "v4",
          action: "write",
          expires: Date.now() + 15 * 60 * 1000,
          contentType,
        });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[upload-url] getSignedUrl failed:", msg);
      return jsonWithCors(origin, { error: `GCS error: ${msg}` }, 500);
    }

    return jsonWithCors(origin, { uploadUrl: signedUrl, gcsPath }, 200);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[upload-url] Unhandled error:", msg, err);
    return jsonWithCors(origin, { error: `Unexpected error: ${msg}` }, 500);
  }
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

function jsonWithCors(origin: string | null, body: unknown, status: number): NextResponse {
  const res = NextResponse.json(body, { status });
  Object.entries(corsHeaders(origin)).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}
