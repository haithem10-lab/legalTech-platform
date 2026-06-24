import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { z } from "zod";
import { getWorkflow, writeSubmission, updateSubmission } from "@/lib/firestore";
import { isOriginAllowed } from "@/lib/origin";
import { corsHeaders, handleOptions } from "@/lib/cors";
import type { Field } from "@/types/workflow";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitize(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/<[^>]*>/g, "").trim();
}

function buildSchema(fields: Field[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    switch (field.type) {
      case "text": {
        let s: z.ZodString = z.string();
        if (field.validation?.maxLength) s = s.max(field.validation.maxLength);
        shape[field.id] = field.required
          ? s.min(1, `${field.label} is required`)
          : s.optional();
        break;
      }
      case "email": {
        const s = z.string().email(`${field.label}: invalid email address`);
        shape[field.id] = field.required
          ? s.min(1, `${field.label} is required`)
          : s.optional();
        break;
      }
      case "dropdown":
      case "radio": {
        const s = z.string();
        shape[field.id] = field.required
          ? s.min(1, `${field.label} is required`)
          : s.optional();
        break;
      }
      case "file":
        shape[field.id] = z.string().optional();
        break;
      case "dynamic-list":
        shape[field.id] = z.array(z.record(z.string(), z.unknown())).optional();
        break;
    }
  }

  return z.object(shape);
}

// ─── OPTIONS ──────────────────────────────────────────────────────────────────

export function OPTIONS(request: Request) {
  return handleOptions(request);
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: { workflowId: string } }
) {
  const { workflowId } = params;
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  let body: { data?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers });
  }

  const workflow = await getWorkflow(workflowId);

  if (!workflow || workflow.status !== "published") {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers });
  }

  if (!isOriginAllowed(origin, workflow.allowedOrigins)) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403, headers });
  }

  if (!body.data || typeof body.data !== "object" || Array.isArray(body.data)) {
    return NextResponse.json({ error: "Missing data object" }, { status: 400, headers });
  }

  const rawData = body.data as Record<string, unknown>;

  const sanitizedData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawData)) {
    if (typeof value === "string") {
      sanitizedData[key] = sanitize(value);
    } else if (Array.isArray(value)) {
      sanitizedData[key] = value.map((row) => {
        if (typeof row === "object" && row !== null) {
          return Object.fromEntries(
            Object.entries(row as Record<string, unknown>).map(([k, v]) => [
              k,
              typeof v === "string" ? sanitize(v) : v,
            ])
          );
        }
        return row;
      });
    } else {
      sanitizedData[key] = value;
    }
  }

  const zodSchema = buildSchema(workflow.schema);
  const result = zodSchema.safeParse(sanitizedData);

  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key) errors[key] = issue.message;
    }
    return NextResponse.json(
      { error: "Validation failed", errors },
      { status: 400, headers }
    );
  }

  const submittedAt = new Date().toISOString();
  const originHost = origin ?? "unknown";

  const submissionId = await writeSubmission(workflowId, {
    data: result.data as Record<string, unknown>,
    originHost,
  });

  if (workflow.webhookUrl) {
    const webhookPayload = JSON.stringify({
      workflowId,
      submissionId,
      data: result.data,
      submittedAt,
      originHost,
    });

    const sig = createHmac("sha256", workflow.hmacSecret)
      .update(webhookPayload)
      .digest("hex");

    fetch(workflow.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature": sig,
        "X-Workflow-Id": workflowId,
      },
      body: webhookPayload,
    })
      .then(async (wRes) => {
        const status = wRes.ok ? "delivered" : "failed";
        await updateSubmission(workflowId, submissionId, { webhookStatus: status });
      })
      .catch(async () => {
        console.error(`[webhook] delivery failed for ${workflowId}`);
        await updateSubmission(workflowId, submissionId, { webhookStatus: "failed" });
      });
  }

  return NextResponse.json({ ok: true, submissionId }, { status: 200, headers });
}
