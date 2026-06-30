import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";

import { ChevronLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getWorkflow, getSubmission } from "@/lib/db";
import { FileRow } from "./FileRow";

function isFilePath(value: string) {
  return value.startsWith("/uploads/") || value.startsWith("submissions/");
}
import type { Field } from "@/types/workflow";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFull(iso: string): string {
  if (!iso) return "—";
  const d    = new Date(iso);
  const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).format(d);
  return `${date} · ${time}`;
}

function fieldValue(data: Record<string, unknown>, field: Field): string {
  const v = data[field.id];
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <p className={`uppercase font-bold font-sans`}
      style={{ fontSize: 10, letterSpacing: "0.08em", color: "#8A8270", margin: 0 }}>
      {children}
    </p>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg overflow-hidden ${className}`}
      style={{ background: "#FFFFFF", border: "1px solid #E4E0D6" }}>
      {children}
    </div>
  );
}

function WebhookStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  const ok = status === "delivered";
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold font-sans`}
      style={{
        fontSize: 12, borderRadius: 20, padding: "4px 11px",
        background: ok ? "#E6F0EA" : "#F6E5E2",
        border: `1px solid ${ok ? "#BCD9C8" : "#E2BBB4"}`,
        color: ok ? "#44645D" : "#B23A2E",
      }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: ok ? "#44645D" : "#B23A2E", flexShrink: 0 }} />
      {ok ? "Delivered" : "Failed"}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SubmissionDetailPage({
  params,
}: {
  params: { id: string; submissionId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [workflow, submission] = await Promise.all([
    getWorkflow(params.id),
    getSubmission(params.id, params.submissionId),
  ]);

  if (!workflow || workflow.orgId !== session.user.orgId) notFound();
  if (!submission) notFound();

  // Primary name from first text/email field
  const nameField  = workflow.schema.find((f) => f.type === "text" || f.type === "email");
  const primaryName = nameField ? fieldValue(submission.data, nameField) : "Submission";
  const shortId    = `SUB_${submission.id.slice(0, 8)}`;

  const webhookOk  = submission.webhookStatus === "delivered";

  return (
    <div className="flex-1 font-sans" style={{ background: "#F3F1EC" }}>

      {/* ── Top bar ── */}
      <div style={{ background: "#FBF8F2", borderBottom: "1px solid #C9C2B4", padding: "0 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Link href={`/admin/workflows/${params.id}/submissions`}
            className="inline-flex items-center gap-1 py-4 transition-colors"
            style={{ fontSize: 13, color: "#5C564C", textDecoration: "none" }}>
            <ChevronLeft size={14} /> All submissions
          </Link>
        </div>
      </div>

      {/* ── Header ── */}
      <div style={{ background: "#FBF8F2", borderBottom: "1px solid #C9C2B4", padding: "24px 32px 28px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {/* Name + ID badge */}
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className={`font-semibold font-serif`}
                  style={{ fontSize: 28, color: "#1C2127", margin: 0, lineHeight: 1.15 }}>
                  {primaryName}
                </h1>
                <span className={`font-mono`}
                  style={{ fontSize: 12, background: "#F3F1EC", border: "1px solid #E4E0D6", borderRadius: 6, padding: "3px 8px", color: "#5C564C" }}>
                  {shortId}
                </span>
              </div>
              {/* Meta line */}
              <p style={{ fontSize: 13, color: "#8A8270", margin: 0 }}>
                Received {formatFull(submission.submittedAt)} · {workflow.name}
              </p>
            </div>
            {/* Webhook status badge */}
            <div className="flex-shrink-0 pt-1">
              <WebhookStatusBadge status={submission.webhookStatus} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-column body ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 32px" }}>
        <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 340px", alignItems: "start" }}>

          {/* ── Left — Submitted Answers ── */}
          <Card>
            <div className="flex items-center px-5 py-4" style={{ borderBottom: "1px solid #F3F1EC" }}>
              <SectionLabel>Submitted Answers</SectionLabel>
            </div>
            {workflow.schema.length === 0 ? (
              <p className="px-5 py-6" style={{ fontSize: 13, color: "#8A8270", margin: 0 }}>No fields in this form.</p>
            ) : (
              workflow.schema.map((field, idx) => {
                const value = fieldValue(submission.data, field);
                const isLast = idx === workflow.schema.length - 1;
                const isFile = field.type === "file" && isFilePath(value);
                return (
                  <div key={field.id} className="flex gap-4 px-5 py-4"
                    style={{ borderBottom: isLast ? "none" : "1px solid #F3F1EC", alignItems: "flex-start" }}>
                    {/* Clause number */}
                    <span className={`flex-shrink-0 font-semibold font-mono`}
                      style={{ fontSize: 12, color: "#44645D", minWidth: 32, paddingTop: 2 }}>
                      1.{idx + 1}
                    </span>
                    {/* Label + value */}
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 13, color: "#8A8270", margin: "0 0 6px", fontWeight: 400 }}>
                        {field.label}
                      </p>
                      {isFile ? (
                        <FileRow filePath={value} />
                      ) : (
                        <p style={{ fontSize: 14, color: "#1C2127", margin: 0, fontWeight: 500, wordBreak: "break-word", lineHeight: 1.5 }}>
                          {value}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </Card>

          {/* ── Right column ── */}
          <div className="flex flex-col gap-4">

            {/* Webhook Delivery */}
            <Card>
              <div className="px-4 py-3" style={{ borderBottom: "1px solid #F3F1EC" }}>
                <SectionLabel>Webhook Delivery</SectionLabel>
              </div>
              <div className="px-4 py-4 flex flex-col gap-3">
                {workflow.webhookUrl ? (
                  <>
                    {/* Endpoint */}
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <span style={{ fontSize: 11, color: "#8A8270", flexShrink: 0 }}>POST</span>
                      <span className={`font-mono truncate`}
                        style={{ fontSize: 11, color: "#5C564C" }}>
                        {workflow.webhookUrl}
                      </span>
                    </div>

                    {/* Status row */}
                    {submission.webhookStatus ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: webhookOk ? "#44645D" : "#B23A2E", flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: "#1C2127", fontWeight: 500 }}>
                          {webhookOk ? "Delivered" : "Failed"}
                        </span>
                        <span className={`font-mono`}
                          style={{
                            fontSize: 11, borderRadius: 4, padding: "2px 7px",
                            background: webhookOk ? "#E6F0EA" : "#F6E5E2",
                            color: webhookOk ? "#44645D" : "#B23A2E",
                          }}>
                          {webhookOk ? "200 OK" : "5xx Error"}
                        </span>
                        <span style={{ fontSize: 12, color: "#8A8270" }}>
                          {formatFull(submission.submittedAt)}
                        </span>
                      </div>
                    ) : (
                      <p style={{ fontSize: 13, color: "#8A8270", margin: 0 }}>Pending delivery</p>
                    )}
                  </>
                ) : (
                  <p style={{ fontSize: 13, color: "#8A8270", margin: 0 }}>No webhook configured</p>
                )}
              </div>
            </Card>

            {/* Metadata */}
            <Card>
              <div className="px-4 py-3" style={{ borderBottom: "1px solid #F3F1EC" }}>
                <SectionLabel>Metadata</SectionLabel>
              </div>
              {[
                {
                  label: "Origin host",
                  value: submission.originHost || "—",
                  mono: true,
                  color: "#5C564C",
                },
                {
                  label: "Submission ID",
                  value: submission.id,
                  mono: true,
                  color: "#44645D",
                },
                {
                  label: "Submitted at",
                  value: formatFull(submission.submittedAt),
                  mono: false,
                  color: "#1C2127",
                },
                {
                  label: "Signature",
                  value: webhookOk ? "verified" : submission.webhookStatus === "failed" ? "failed" : "—",
                  mono: true,
                  color: webhookOk ? "#44645D" : submission.webhookStatus === "failed" ? "#B23A2E" : "#8A8270",
                },
              ].map(({ label, value, mono: isMono, color }, i, arr) => (
                <div key={label}
                  className="flex items-start justify-between gap-3 px-4 py-3"
                  style={{ borderBottom: i < arr.length - 1 ? "1px solid #F3F1EC" : "none" }}>
                  <span style={{ fontSize: 13, color: "#8A8270", flexShrink: 0 }}>{label}</span>
                  <span className={isMono ? "font-mono" : ""}
                    style={{ fontSize: isMono ? 12 : 13, color, wordBreak: "break-all", textAlign: "right" }}>
                    {value}
                  </span>
                </div>
              ))}
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}
