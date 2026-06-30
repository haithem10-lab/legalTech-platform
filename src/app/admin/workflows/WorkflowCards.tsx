"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import type { Workflow } from "@/types/workflow";

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
}

function StatusPill({ status }: { status: Workflow["status"] }) {
  const live  = status === "published";
  const style = live
    ? { background: "#E6F0EA", border: "1px solid #BCD9C8", color: "#44645D" }
    : { background: "#F3EDD9", border: "1px solid #E2D7B0", color: "#8A6D1F" };
  return (
    <span className={`inline-flex items-center gap-1.5 font-sans`}
      style={{ ...style, borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 600 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: live ? "#44645D" : "#B8902E", flexShrink: 0 }} />
      {live ? "LIVE" : "DRAFT"}
    </span>
  );
}

export function WorkflowCard({ workflow }: { workflow: Workflow }) {
  return (
    <div className={`flex flex-col rounded-xl transition-all duration-150 font-sans`}
      style={{ background: "#FBF8F2", border: "1px solid #C9C2B4", boxShadow: "0 1px 2px rgba(28,33,39,0.06)" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#44645D";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 20px rgba(28,33,39,0.09)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#C9C2B4";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 2px rgba(28,33,39,0.06)";
      }}>
      {/* Card body — clicking anywhere on it goes to builder */}
      <Link href={`/admin/workflows/${workflow.id}/build`} className="block no-underline flex-1"
        style={{ textDecoration: "none" }}>
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <StatusPill status={workflow.status} />
            <span className="font-mono" style={{ fontSize: 11, color: "#8A8270" }}>
              {workflow.id.slice(0, 8)}
            </span>
          </div>
          <h2 className={`font-semibold leading-snug font-serif`}
            style={{ fontSize: 20, color: "#1C2127", margin: "0 0 5px" }}>
            {workflow.name}
          </h2>
          <p style={{ fontSize: 13, color: "#8A8270", margin: 0 }}>
            {workflow.schema?.length ?? 0}{" "}
            {(workflow.schema?.length ?? 0) === 1 ? "field" : "fields"}
            {" · "}Edited {formatDate(workflow.updatedAt)}
          </p>
        </div>
      </Link>

      {/* Footer — two actions */}
      <div className="flex" style={{ borderTop: "1px solid #EDE8DD" }}>
        <Link href={`/admin/workflows/${workflow.id}/build`}
          className="flex-1 flex items-center justify-center py-3 font-semibold no-underline transition-colors"
          style={{ fontSize: 13, color: "#44645D", borderRight: "1px solid #EDE8DD", textDecoration: "none" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = "#E6F0EA";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
          }}>
          Build
        </Link>
        <Link href={`/admin/workflows/${workflow.id}/submissions`}
          className="flex-1 flex items-center justify-center py-3 font-semibold no-underline transition-colors"
          style={{ fontSize: 13, color: "#3A4049", textDecoration: "none" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = "#F3F1EC";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
          }}>
          Submissions
        </Link>
      </div>
    </div>
  );
}

export function NewFormCard() {
  return (
    <Link href="/admin/workflows/new" className="block no-underline" style={{ textDecoration: "none" }}>
      <div className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-150 font-sans`}
        style={{ borderColor: "#C9C2B4", minHeight: 164, cursor: "pointer", background: "transparent" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "#44645D";
          (e.currentTarget as HTMLDivElement).style.background = "#E6F0EA";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "#C9C2B4";
          (e.currentTarget as HTMLDivElement).style.background = "transparent";
        }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: "#F3F1EC", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
          <Plus size={18} color="#8A8270" />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#8A8270" }}>New form</span>
      </div>
    </Link>
  );
}
