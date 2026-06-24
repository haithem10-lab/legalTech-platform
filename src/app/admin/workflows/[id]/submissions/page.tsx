import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { Source_Serif_4, Inter, IBM_Plex_Mono } from "next/font/google";
import { ChevronLeft, FileText } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getWorkflow, getSubmissions } from "@/lib/firestore";
import { ExportButton } from "./ExportButton";
import type { Submission } from "@/types/workflow";

const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "600"] });
const inter   = Inter({ subsets: ["latin"] });
const ibmMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"] });

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const datePart = new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric",
  }).format(d);
  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(d);
  return `${datePart} · ${timePart}`;
}

function stripProtocol(origin: string): string {
  return origin.replace(/^https?:\/\//, "");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function WebhookBadge({ status }: { status: Submission["webhookStatus"] }) {
  if (!status) {
    return <span className={inter.className} style={{ fontSize: 12, color: "#8A8378" }}>—</span>;
  }
  const delivered = status === "delivered";
  return (
    <span
      className={inter.className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 8px",
        borderRadius: 20,
        background: delivered ? "#EFF6F3" : "#FBEAE8",
        color: delivered ? "#1F6F54" : "#B23A2E",
      }}
    >
      <span
        style={{
          width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
          background: delivered ? "#1F6F54" : "#B23A2E",
        }}
      />
      {delivered ? "Delivered" : "Failed"}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SubmissionsPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const workflow = await getWorkflow(params.id);
  if (!workflow || workflow.accountId !== session.user.accountId) notFound();

  const submissions = await getSubmissions(params.id);
  const labelMap = new Map(workflow.schema.map((f) => [f.id, f.label]));

  return (
    <div style={{ background: "#F3F1EC", minHeight: "100vh" }}>

      {/* ── Top bar ── */}
      <div
        style={{
          background: "#FBF8F2",
          borderBottom: "1px solid #C9C2B4",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <Link
          href={`/admin/workflows/${params.id}/build`}
          style={{ display: "flex", alignItems: "center", color: "#1C2127", textDecoration: "none", flexShrink: 0 }}
        >
          <ChevronLeft size={20} />
        </Link>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            className={sourceSerif.className}
            style={{ fontSize: 22, fontWeight: 600, color: "#1C2127", margin: 0, lineHeight: 1.2 }}
          >
            {workflow.name}
          </h1>
          <p
            className={inter.className}
            style={{ fontSize: 11, color: "#8A8378", margin: "2px 0 0", lineHeight: 1 }}
          >
            Workflows → {workflow.name} → Submissions
          </p>
        </div>

        <span
          className={inter.className}
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "4px 10px",
            borderRadius: 20,
            background: "#F3F1EC",
            border: "1px solid #C9C2B4",
            color: "#6B7280",
            flexShrink: 0,
          }}
        >
          {submissions.length} {submissions.length === 1 ? "submission" : "submissions"}
        </span>

        <ExportButton
          submissions={submissions}
          schema={workflow.schema}
          workflowName={workflow.name}
        />
      </div>

      {/* ── Content ── */}
      <div style={{ padding: "28px 24px", maxWidth: 1200, margin: "0 auto" }}>
        {submissions.length === 0 ? (

          /* Empty state */
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "80px 24px",
              gap: 12,
            }}
          >
            <FileText size={36} color="#C9C2B4" />
            <p
              className={sourceSerif.className}
              style={{ fontSize: 20, fontWeight: 600, color: "#1C2127", margin: 0 }}
            >
              No submissions yet
            </p>
            <p
              className={inter.className}
              style={{ fontSize: 14, color: "#8A8378", margin: 0 }}
            >
              Share your embed code to start collecting
            </p>
          </div>

        ) : (

          /* Table */
          <div
            style={{
              background: "#FBF8F2",
              border: "1px solid #C9C2B4",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              className={inter.className}
              style={{
                display: "grid",
                gridTemplateColumns: "140px 1fr 180px 160px 120px",
                background: "#F3F1EC",
                borderBottom: "1px solid #C9C2B4",
                padding: "10px 16px",
              }}
            >
              {["ID", "DATA", "SUBMITTED", "ORIGIN", "WEBHOOK"].map((h) => (
                <span
                  key={h}
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#8A8378",
                    padding: "0 8px",
                  }}
                >
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            {submissions.map((s, i) => {
              const entries = Object.entries(s.data);
              const shown   = entries.slice(0, 3);
              const more    = entries.length - 3;

              return (
                <div
                  key={s.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "140px 1fr 180px 160px 120px",
                    background: "#FBF8F2",
                    borderTop: i > 0 ? "1px solid #EFECE3" : undefined,
                    padding: "14px 16px",
                    alignItems: "start",
                  }}
                >
                  {/* ID */}
                  <div style={{ padding: "0 8px" }}>
                    <span
                      className={ibmMono.className}
                      style={{ fontSize: 11, color: "#1F6F54" }}
                    >
                      {s.id.slice(0, 8)}
                    </span>
                  </div>

                  {/* Data */}
                  <div style={{ padding: "0 8px", display: "flex", flexDirection: "column", gap: 3 }}>
                    {shown.map(([fieldId, value]) => {
                      const label   = labelMap.get(fieldId) ?? fieldId;
                      const display =
                        value === null || value === undefined
                          ? "—"
                          : typeof value === "object"
                          ? JSON.stringify(value)
                          : String(value) || "—";
                      return (
                        <span
                          key={fieldId}
                          className={inter.className}
                          style={{ fontSize: 12, lineHeight: 1.5 }}
                        >
                          <span style={{ color: "#8A8378" }}>{label}:</span>{" "}
                          <span style={{ color: "#1C2127", fontWeight: 500 }}>{display}</span>
                        </span>
                      );
                    })}
                    {more > 0 && (
                      <span
                        className={inter.className}
                        style={{ fontSize: 11, color: "#8A8378", marginTop: 1 }}
                      >
                        +{more} more
                      </span>
                    )}
                    {entries.length === 0 && (
                      <span
                        className={inter.className}
                        style={{ fontSize: 12, color: "#C9C2B4" }}
                      >
                        No data
                      </span>
                    )}
                  </div>

                  {/* Submitted */}
                  <div style={{ padding: "0 8px" }}>
                    <span
                      className={inter.className}
                      style={{ fontSize: 12, color: "#5C564C" }}
                    >
                      {formatDate(s.submittedAt)}
                    </span>
                  </div>

                  {/* Origin */}
                  <div style={{ padding: "0 8px" }}>
                    <span
                      className={ibmMono.className}
                      style={{ fontSize: 11, color: "#8A8378", wordBreak: "break-all" }}
                    >
                      {s.originHost ? stripProtocol(s.originHost) : "—"}
                    </span>
                  </div>

                  {/* Webhook */}
                  <div style={{ padding: "0 8px" }}>
                    <WebhookBadge status={s.webhookStatus} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
