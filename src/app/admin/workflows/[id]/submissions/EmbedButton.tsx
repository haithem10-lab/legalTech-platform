"use client";

import { useState } from "react";
import { X, Copy, Check } from "lucide-react";

interface Props { workflowId: string; workflowName: string; }

export function EmbedButton({ workflowId, workflowName }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const appUrl = typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin) : "";
  const snippet = `<script\n  src="${appUrl}/embed.js"\n  data-workflow-id="${workflowId}"\n  async\n></script>`;

  function handleCopy() {
    navigator.clipboard.writeText(snippet);
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className={`flex items-center gap-2 font-semibold text-white transition-colors font-sans`}
        style={{ fontSize: 13, padding: "9px 16px", borderRadius: 8, background: "#44645D", border: "none", cursor: "pointer", boxShadow: "0 1px 2px rgba(28,33,39,0.12)" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#374F49"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#44645D"; }}>
        Embed code
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(28,33,39,0.45)", backdropFilter: "blur(2px)" }}
          onClick={() => setOpen(false)}>
          <div className={`w-full overflow-hidden font-sans`}
            style={{ maxWidth: 520, background: "#FBF8F2", borderRadius: 14, boxShadow: "0 24px 70px rgba(28,33,39,0.35)" }}
            onClick={(e) => e.stopPropagation()}>

            <div className="flex items-start gap-3 px-6 pt-5 pb-4" style={{ borderBottom: "1px solid #C9C2B4" }}>
              <div className="flex-1 min-w-0">
                <h2 className={`font-semibold font-serif`} style={{ fontSize: 21, color: "#1C2127", margin: 0 }}>
                  Embed &ldquo;{workflowName}&rdquo;
                </h2>
                <p style={{ fontSize: 13, color: "#8A8270", margin: "3px 0 0" }}>
                  Paste this snippet into your website&apos;s &lt;body&gt; tag.
                </p>
              </div>
              <button onClick={() => setOpen(false)}
                style={{ color: "#8A8270", background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4, borderRadius: 7 }}>
                <X size={16} />
              </button>
            </div>

            <div className="p-6">
              <div style={{ position: "relative" }}>
                <div style={{ background: "#1C2127", borderRadius: 10, padding: 18, paddingRight: 90, overflowX: "auto" }}>
                  <pre className="font-mono"
                    style={{ fontSize: 12.5, lineHeight: 1.7, margin: 0, whiteSpace: "pre", color: "#C9E0D3" }}>
                    {snippet}
                  </pre>
                </div>
                <button onClick={handleCopy}
                  className="absolute flex items-center gap-1.5"
                  style={{
                    top: 12, right: 12, fontSize: 11, fontWeight: 600,
                    padding: "5px 11px", borderRadius: 6,
                    background: copied ? "#44645D" : "#2A3038",
                    border: `1px solid ${copied ? "#44645D" : "#3A424C"}`,
                    color: copied ? "#fff" : "#D8D2C4", cursor: "pointer",
                  }}>
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-3" style={{ fontSize: 13, color: "#8A8270" }}>
                Manage allowed domains and the signing secret in the{" "}
                <a href={`/admin/workflows/${workflowId}/build`} style={{ color: "#44645D", textDecoration: "underline" }}>
                  builder
                </a>.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
