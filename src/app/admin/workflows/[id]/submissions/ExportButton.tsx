"use client";

import { Inter } from "next/font/google";
import type { Submission, Field } from "@/types/workflow";

const inter = Inter({ subsets: ["latin"] });

interface Props {
  submissions: Submission[];
  schema: Field[];
  workflowName: string;
}

export function ExportButton({ submissions, schema, workflowName }: Props) {
  function handleExport() {
    if (submissions.length === 0) return;

    const labelMap = new Map(schema.map((f) => [f.id, f.label]));
    const fieldIds = schema.map((f) => f.id);

    // Header row
    const headers = ["ID", "Submitted", "Origin", "Webhook", ...schema.map((f) => f.label)];

    const rows = submissions.map((s) => {
      const fieldValues = fieldIds.map((id) => {
        const val = s.data[id];
        if (val === null || val === undefined) return "";
        if (typeof val === "object") return JSON.stringify(val);
        return String(val);
      });
      return [
        s.id,
        s.submittedAt ? new Date(s.submittedAt).toLocaleString() : "",
        s.originHost,
        s.webhookStatus ?? "",
        ...fieldValues,
      ];
    });

    const escape = (v: string) =>
      v.includes(",") || v.includes('"') || v.includes("\n")
        ? `"${v.replace(/"/g, '""')}"`
        : v;

    const csv = [headers, ...rows]
      .map((row) => row.map(escape).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workflowName.replace(/\s+/g, "_")}_submissions.csv`;
    a.click();
    URL.revokeObjectURL(url);

    // suppress unused variable warning
    void labelMap;
  }

  return (
    <button
      onClick={handleExport}
      disabled={submissions.length === 0}
      className={inter.className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
        fontWeight: 500,
        color: "#1C2127",
        border: "1px solid #C9C2B4",
        borderRadius: 7,
        padding: "7px 14px",
        background: "#FBF8F2",
        cursor: submissions.length === 0 ? "not-allowed" : "pointer",
        opacity: submissions.length === 0 ? 0.5 : 1,
      }}
    >
      Export CSV
    </button>
  );
}
