import { createHmac } from "crypto";
import { z } from "zod";
import { writeSubmission, updateSubmission } from "@/lib/db";
import { corsHeaders, handleOptions } from "@/lib/api/responses";
import { validatePublicRequest } from "@/lib/guards/publicRoute";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/ratelimit";
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
  const ip = getClientIp(request);
  const { success, resetAt } = rateLimit(`submit:${ip}`, 5, 60_000);
  if (!success) return rateLimitResponse(resetAt);

  const { workflowId } = params;

  const guard = await validatePublicRequest(request, workflowId);
  if (!guard.ok) return guard.response;

  const { workflow, origin } = guard;
  const headers = corsHeaders(origin);

  let body: { data?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400, headers });
  }

  if (!body.data || typeof body.data !== "object" || Array.isArray(body.data)) {
    return Response.json({ error: "Missing data object" }, { status: 400, headers });
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
  const parsed = zodSchema.safeParse(sanitizedData);

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key) errors[key] = issue.message;
    }
    return Response.json({ error: "Validation failed", errors }, { status: 400, headers });
  }

  const submittedAt = new Date().toISOString();
  const originHost  = origin ?? "unknown";

  const submissionId = await writeSubmission(workflowId, {
    orgId: workflow.orgId,
    data: parsed.data as Record<string, unknown>,
    originHost,
  });

  if (workflow.webhookUrl) {
    const webhookPayload = JSON.stringify({
      workflowId,
      submissionId,
      data: parsed.data,
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

  return Response.json({ ok: true, submissionId }, { status: 200, headers });
}
