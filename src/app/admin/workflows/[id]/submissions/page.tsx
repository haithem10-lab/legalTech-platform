import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";

import { ChevronLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getWorkflow, getSubmissions } from "@/lib/db";
import { ExportButton } from "./ExportButton";
import { SubmissionRow, COLS } from "./SubmissionRow";
import type { Field, Submission } from "@/types/workflow";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  if (!iso) return "—";
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  <  1) return "Just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  ===1) return "Yesterday";
  return `${days}d ago`;
}

function extractCols(submission: Submission, schema: Field[]) {
  const val = (id: string) => {
    const v = submission.data[id];
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };

  // Applicant: first text or email field
  const applicantField = schema.find((f) => f.type === "text" || f.type === "email");
  const applicant = applicantField ? val(applicantField.id) : "—";

  // Entity type: second non-file non-list field (different from applicant)
  const usable = schema.filter((f) => f.type !== "file" && f.type !== "dynamic-list");
  const entityField = usable.find((f) => f.id !== applicantField?.id);
  const entityType = entityField ? val(entityField.id) : "—";

  // State: field whose label contains "state" / "jurisdiction"
  const stateField = schema.find((f) => /state|jurisdiction/i.test(f.label));
  const state = stateField ? val(stateField.id).slice(0, 3).toUpperCase() : "—";

  return { applicant, entityType, state };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SubmissionsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const workflow    = await getWorkflow(params.id);
  if (!workflow || workflow.orgId !== session.user.orgId) notFound();

  const submissions = await getSubmissions(params.id);
  const schema      = workflow.schema;

  const failedCount = submissions.filter((s) => s.webhookStatus === "failed").length;
  const subtitle = !workflow.webhookUrl
    ? `${submissions.length} ${submissions.length === 1 ? "submission" : "submissions"}`
    : failedCount > 0
    ? `${submissions.length} submissions · ${failedCount} webhook${failedCount === 1 ? "" : "s"} failed`
    : `${submissions.length} submissions · all webhooks delivered`;

  return (
    <div className="flex-1 font-sans" style={{ background: "#F3F1EC" }}>

      {/* ── Header ── */}
      <div style={{ background: "#FBF8F2", borderBottom: "1px solid #C9C2B4", padding: "20px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>

          {/* Back link */}
          <Link href="/admin/workflows"
            className="inline-flex items-center gap-1 mb-4 transition-colors"
            style={{ fontSize: 13, color: "#5C564C", textDecoration: "none" }}
            onMouseEnter={undefined}>
            <ChevronLeft size={14} /> All workflows
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className={`font-semibold font-serif`}
                style={{ fontSize: 24, color: "#1C2127", margin: "0 0 4px", lineHeight: 1.2 }}>
                {workflow.name}
              </h1>
              <p style={{ fontSize: 13, color: "#8A8270", margin: 0 }}>{subtitle}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ExportButton submissions={submissions} schema={workflow.schema} workflowName={workflow.name} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ maxWidth: 1100, margin: "28px auto", padding: "0 32px" }}>
        {submissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl py-20 gap-3"
            style={{ background: "#FFFFFF" }}>
            <p className={`font-semibold font-serif`} style={{ fontSize: 20, color: "#1C2127", margin: 0 }}>
              No submissions yet
            </p>
            <p style={{ fontSize: 13, color: "#8A8270", margin: 0 }}>
              Your form hasn&apos;t received any submissions yet.
            </p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF" }}>
            {/* Column headers */}
            <div className={`font-sans`}
              style={{ display: "grid", gridTemplateColumns: COLS, padding: "12px 20px", background: "#FBF8F2", borderBottom: "1px solid #EFECE3" }}>
              {["Submission ID", "Applicant", "Entity type", "State", "Received", "Webhook"].map((h) => (
                <span key={h} style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8A8270" }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            {submissions.map((s, i) => {
              const { applicant, entityType, state } = extractCols(s, schema);
              return (
                <SubmissionRow
                  key={s.id}
                  id={s.id}
                  workflowId={params.id}
                  applicant={applicant}
                  entityType={entityType}
                  state={state}
                  receivedLabel={relativeTime(s.submittedAt)}
                  webhookStatus={s.webhookStatus ?? null}
                  isFirst={i === 0}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
