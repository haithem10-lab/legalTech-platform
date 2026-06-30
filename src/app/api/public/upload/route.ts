import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { corsHeaders, handleOptions } from "@/lib/api/responses";
import { validatePublicRequest } from "@/lib/guards/publicRoute";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/ratelimit";

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".jpg", ".jpeg", ".png"];
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { success, resetAt } = rateLimit(`upload:${ip}`, 10, 60_000);
  if (!success) return rateLimitResponse(resetAt);

  const origin = request.headers.get("origin");

  try {
    const formData   = await request.formData();
    const file       = formData.get("file") as File | null;
    const workflowId = formData.get("workflowId") as string | null;

    if (!file)       return Response.json({ error: "No file provided" }, { status: 400, headers: corsHeaders(origin) });
    if (!workflowId) return Response.json({ error: "workflowId is required" }, { status: 400, headers: corsHeaders(origin) });

    const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (!ALLOWED_EXTENSIONS.includes(ext))
      return Response.json({ error: "File type not allowed. Accepted: PDF, DOCX, JPG, PNG" }, { status: 400, headers: corsHeaders(origin) });

    if (file.size > MAX_BYTES)
      return Response.json({ error: "File too large (max 10 MB)" }, { status: 400, headers: corsHeaders(origin) });

    const guard = await validatePublicRequest(request, workflowId);
    if (!guard.ok) return guard.response;

    const bytes     = await file.arrayBuffer();
    const buffer    = Buffer.from(bytes);
    const filename  = `${randomUUID()}${ext}`;
    const uploadDir = join(process.cwd(), "public", "uploads");

    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), buffer);

    return Response.json(
      { filePath: `/uploads/${filename}`, filename: file.name },
      { status: 200, headers: corsHeaders(origin) }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[upload]", msg);
    return Response.json({ error: `Upload failed: ${msg}` }, { status: 500, headers: corsHeaders(origin) });
  }
}

export function OPTIONS(request: Request) {
  return handleOptions(request);
}
