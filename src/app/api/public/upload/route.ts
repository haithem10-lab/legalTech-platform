import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getWorkflow } from "@/lib/firestore";
import { isOriginAllowed, corsHeaders } from "@/lib/origin";

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".jpg", ".jpeg", ".png"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function withCors(origin: string | null, body: unknown, status: number): NextResponse {
  const res = NextResponse.json(body, { status });
  Object.entries(corsHeaders(origin)).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");

  try {
    const formData   = await request.formData();
    const file       = formData.get("file") as File | null;
    const workflowId = formData.get("workflowId") as string | null;

    if (!file)       return withCors(origin, { error: "No file provided" }, 400);
    if (!workflowId) return withCors(origin, { error: "workflowId is required" }, 400);

    const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (!ALLOWED_EXTENSIONS.includes(ext))
      return withCors(origin, { error: "File type not allowed. Accepted: PDF, DOCX, JPG, PNG" }, 400);

    if (file.size > MAX_BYTES)
      return withCors(origin, { error: "File too large (max 10 MB)" }, 400);

    const workflow = await getWorkflow(workflowId);
    if (!workflow || workflow.status !== "published")
      return withCors(origin, { error: "Workflow not found or not published" }, 404);

    if (!isOriginAllowed(origin, workflow.allowedOrigins ?? []))
      return withCors(origin, { error: "Origin not allowed" }, 403);

    const bytes    = await file.arrayBuffer();
    const buffer   = Buffer.from(bytes);
    const filename = `${randomUUID()}${ext}`;
    const uploadDir = join(process.cwd(), "public", "uploads");

    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), buffer);

    return withCors(origin, { filePath: `/uploads/${filename}`, filename: file.name }, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[upload] Error:", msg);
    return withCors(origin, { error: `Upload failed: ${msg}` }, 500);
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
