import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { z } from "zod";
import { getWorkflow, writeSubmission } from "@/lib/firestore";
import { isOriginAllowed, corsHeaders } from "@/lib/origin";
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
        // Accepts a GCS path string written by the upload-url flow
        shape[field.id] = z.string().optional();
        break;
      case "dynamic-list":
        shape[field.id] = z.array(z.record(z.string(), z.unknown())).optional();
        break;
    }
  }

  return z.object(shape);
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: { workflowId: string } }
) {
  const { workflowId } = params;
  const origin = request.headers.get("origin");

  // Parse body early so we can return helpful errors
  let body: { data?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const workflow = await getWorkflow(workflowId);

  if (!workflow || workflow.status !== "published") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isOriginAllowed(origin, workflow.allowedOrigins)) {
    return json403(origin, "Origin not allowed");
  }

  // Validate shape of incoming data object
  if (!body.data || typeof body.data !== "object" || Array.isArray(body.data)) {
    return jsonErr(origin, 400, "Missing data object");
  }

  const rawData = body.data as Record<string, unknown>;

  // Sanitize all string inputs before validation
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

  // Dynamic Zod validation from schema
  const zodSchema = buildSchema(workflow.schema);
  const result = zodSchema.safeParse(sanitizedData);

  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key) errors[key] = issue.message;
    }
    return jsonErr(origin, 400, "Validation failed", errors);
  }

  const submittedAt = new Date().toISOString();
  const originHost = origin ?? "unknown";

  // Write to Firestore
  const submissionId = await writeSubmission(workflowId, {
    data: result.data as Record<string, unknown>,
    originHost,
  });

  // Webhook delivery (best-effort — never blocks the 200 response)
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
    }).catch((err) => {
      console.error(`[webhook] delivery failed for ${workflowId}:`, err);
    });
  }

  const res = NextResponse.json({ ok: true, submissionId }, { status: 200 });
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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

// ─── Response helpers ─────────────────────────────────────────────────────────

function json403(origin: string | null, message: string) {
  const res = NextResponse.json({ error: message }, { status: 403 });
  const cors = corsHeaders(origin);
  Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

function jsonErr(
  origin: string | null,
  status: number,
  message: string,
  errors?: Record<string, string>
) {
  const res = NextResponse.json(
    { error: message, ...(errors ? { errors } : {}) },
    { status }
  );
  const cors = corsHeaders(origin);
  Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}
