"use client";

import Link from "next/link";

const COLS = "180px 1fr 160px 120px 150px";

function WebhookBadge({ status }: { status: string | null }) {
  if (!status) return <span style={{ fontSize: 13, color: "#C9C2B4" }}>—</span>;
  const ok = status === "delivered";
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold font-sans`}
      style={{
        fontSize: 12, borderRadius: 20, padding: "3px 10px",
        background: ok ? "#E6F0EA" : "#F6E5E2",
        border: `1px solid ${ok ? "#BCD9C8" : "#E2BBB4"}`,
        color: ok ? "#44645D" : "#B23A2E",
      }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: ok ? "#44645D" : "#B23A2E", flexShrink: 0 }} />
      {ok ? "Delivered" : "Failed"}
    </span>
  );
}

interface Props {
  id: string;
  workflowId: string;
  applicant: string;
  entityType: string;
  receivedLabel: string;
  webhookStatus: string | null;
  isFirst: boolean;
}

export function SubmissionRow({ id, workflowId, applicant, entityType, receivedLabel, webhookStatus, isFirst }: Props) {
  const href = `/admin/workflows/${workflowId}/submissions/${id}`;
  const shortId = `SUB_${id.slice(0, 8)}`;

  return (
    <Link href={href}
      className={`font-sans`}
      style={{
        display: "grid",
        gridTemplateColumns: COLS,
        alignItems: "center",
        height: 56,
        padding: "0 20px",
        textDecoration: "none",
        background: "#FFFFFF",
        borderTop: isFirst ? "none" : "1px solid #EFECE3",
        transition: "background 0.1s",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#F9F8F5"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#FFFFFF"; }}
    >
      {/* Submission ID */}
      <span className={`font-medium font-mono`} style={{ fontSize: 12, color: "#44645D" }}>
        {shortId}
      </span>

      {/* Applicant */}
      <span style={{ fontSize: 14, color: "#1C2127", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 16 }}>
        {applicant}
      </span>

      {/* Entity type */}
      <span style={{ fontSize: 13, color: "#5C564C", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 12 }}>
        {entityType}
      </span>

      {/* Received */}
      <span style={{ fontSize: 13, color: "#8A8270" }}>
        {receivedLabel}
      </span>

      {/* Webhook */}
      <WebhookBadge status={webhookStatus} />
    </Link>
  );
}

export { COLS };
