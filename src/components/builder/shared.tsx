"use client";

import type { WorkflowStatus } from "@/types/workflow";

export function StatusPill({ status }: { status: WorkflowStatus }) {
  const live = status === "published";
  return (
    <span className="inline-flex items-center gap-1.5 font-sans"
      style={{
        borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 600,
        background: live ? "#E6F0EA" : "#F3EDD9",
        border: `1px solid ${live ? "#BCD9C8" : "#E2D7B0"}`,
        color: live ? "#44645D" : "#8A6D1F",
      }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: live ? "#44645D" : "#B8902E", flexShrink: 0 }} />
      {live ? "Live" : "Draft"}
    </span>
  );
}

export function Seg<T extends string>({
  options, value, onChange,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex p-0.5 gap-0.5 rounded-md" style={{ background: "#F3F1EC", border: "1px solid #C9C2B4" }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button key={opt.value} onClick={() => onChange(opt.value)}
            className="flex-1 py-1.5 font-medium font-sans transition-all"
            style={{
              fontSize: 12, borderRadius: 6, border: "none", cursor: "pointer",
              background: active ? "#FBF8F2" : "transparent",
              color: active ? "#1C2127" : "#8A8270",
              fontWeight: active ? 600 : 500,
              boxShadow: active ? "0 1px 2px rgba(28,33,39,0.06)" : "none",
            }}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function Eyebrow({ children }: { children: string }) {
  return (
    <p className="uppercase font-bold font-sans"
      style={{ fontSize: 10, letterSpacing: "0.08em", color: "#8A8270", margin: 0 }}>
      {children}
    </p>
  );
}
