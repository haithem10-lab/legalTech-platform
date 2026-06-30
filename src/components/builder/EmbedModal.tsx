"use client";

import { useState } from "react";
import { X, Copy, Check, Eye, EyeOff, AlertTriangle, FileText } from "lucide-react";
import { Eyebrow } from "./shared";

export interface EmbedModalProps {
  workflowId: string;
  workflowName: string;
  allowedOrigins: string[];
  hmacSecret: string;
  onOriginsChange: (o: string[]) => void;
  onSaveOrigins: (o: string[]) => Promise<void>;
  onRegenerateSecret: () => Promise<string | null>;
  onClose: () => void;
}

export function EmbedModal({
  workflowId, workflowName, allowedOrigins, hmacSecret,
  onOriginsChange, onSaveOrigins, onRegenerateSecret, onClose,
}: EmbedModalProps) {
  const appUrl = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin) : "";
  const snippet = `<script\n  src="${appUrl}/embed.js"\n  data-workflow-id="${workflowId}"\n  async\n></script>`;

  const [tab, setTab]                   = useState<"script" | "security">("script");
  const [copied, setCopied]             = useState(false);
  const [revealed, setRevealed]         = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [originInput, setOriginInput]   = useState("");
  const [savingOrigins, setSavingOrigins] = useState(false);

  function handleCopy() { navigator.clipboard.writeText(snippet); setCopied(true); setTimeout(() => setCopied(false), 1600); }

  async function handleAddOrigin() {
    const val = originInput.trim().replace(/\/$/, "");
    if (!val || allowedOrigins.includes(val)) return;
    const next = [...allowedOrigins, val];
    onOriginsChange(next); setOriginInput(""); setSavingOrigins(true);
    await onSaveOrigins(next); setSavingOrigins(false);
  }

  async function handleRemoveOrigin(o: string) {
    const next = allowedOrigins.filter((x) => x !== o);
    onOriginsChange(next); await onSaveOrigins(next);
  }

  async function handleRegenerate() {
    setRegenerating(true); await onRegenerateSecret();
    setRegenerating(false); setConfirmRegen(false); setRevealed(true);
  }

  const maskedSecret = hmacSecret ? `whsec_${"•".repeat(8)}${hmacSecret.slice(-4)}` : "whsec_(not set)";
  const fullSecret   = hmacSecret ? `whsec_${hmacSecret}` : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(28,33,39,0.45)", backdropFilter: "blur(2px)" }}
      onClick={onClose}>
      <div className={`w-full overflow-hidden font-sans`}
        style={{ maxWidth: 540, background: "#FBF8F2", borderRadius: 14, boxShadow: "0 24px 70px rgba(28,33,39,0.35)" }}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start gap-3 px-6 pt-5 pb-4" style={{ borderBottom: "1px solid #C9C2B4" }}>
          <FileText size={18} color="#44645D" style={{ flexShrink: 0, marginTop: 2 }} />
          <div className="flex-1 min-w-0">
            <h2 className={`font-semibold font-serif`} style={{ fontSize: 21, color: "#1C2127", margin: 0 }}>
              Embed &ldquo;{workflowName}&rdquo;
            </h2>
            <p style={{ fontSize: 13, color: "#8A8270", margin: "3px 0 0" }}>
              Add your intake form to any website.
            </p>
          </div>
          <button onClick={onClose}
            className="hover:bg-[#F0EADD] transition-colors rounded-lg"
            style={{ color: "#8A8270", background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4, flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 gap-6" style={{ borderBottom: "1px solid #C9C2B4" }}>
          {(["script", "security"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                fontSize: 14, fontWeight: 600, paddingBottom: 13, paddingTop: 14,
                background: "none", cursor: "pointer", border: "none",
                borderBottom: `2px solid ${tab === t ? "#44645D" : "transparent"}`,
                color: tab === t ? "#44645D" : "#8A8270",
              }}>
              {t === "script" ? "Script tag" : "Security setup"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6" style={{ maxHeight: "70vh", overflowY: "auto" }}>
          {tab === "script" && (
            <div className="flex flex-col gap-4">
              <p style={{ fontSize: 13.5, color: "#3A4049", lineHeight: 1.6 }}>
                Paste inside your website&apos;s{" "}
                <code className="font-mono" style={{ fontSize: 12, background: "#F3F1EC", padding: "2px 6px", borderRadius: 4, color: "#1C2127" }}>
                  &lt;body&gt;
                </code>{" "}
                tag. Loads asynchronously — won&apos;t block your page.
              </p>
              <div style={{ position: "relative" }}>
                <div style={{ background: "#1C2127", borderRadius: 10, padding: 18, paddingRight: 90, overflowX: "auto" }}>
                  <pre className="font-mono" style={{ fontSize: 12.5, lineHeight: 1.7, margin: 0, whiteSpace: "pre", color: "#C9E0D3" }}>
                    {snippet}
                  </pre>
                </div>
                <button onClick={handleCopy} className="absolute flex items-center gap-1.5"
                  style={{
                    top: 12, right: 12, fontSize: 11, fontWeight: 600, padding: "5px 11px", borderRadius: 6,
                    background: copied ? "#44645D" : "#2A3038",
                    border: `1px solid ${copied ? "#44645D" : "#3A424C"}`,
                    color: copied ? "#fff" : "#D8D2C4", cursor: "pointer",
                  }}>
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: "#E6F0EA", border: "1px solid #BCD9C8" }}>
                <Check size={14} color="#44645D" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "#3A6B57" }}>Changes go live on the next page load — no redeploy needed.</span>
              </div>
            </div>
          )}

          {tab === "security" && (
            <div className="flex flex-col gap-6">
              <div>
                <Eyebrow>Allowed domains</Eyebrow>
                <p className="mt-1 mb-3" style={{ fontSize: 13, color: "#3A4049" }}>
                  Only these origins can embed your form. Leave empty to block all.
                </p>
                {allowedOrigins.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {allowedOrigins.map((o) => (
                      <span key={o} className={`flex items-center gap-1 font-mono`}
                        style={{ fontSize: 12, background: "#F3F1EC", border: "1px solid #C9C2B4", borderRadius: 20, padding: "5px 8px 5px 12px", color: "#1C2127" }}>
                        {o}
                        <button onClick={() => handleRemoveOrigin(o)} className="hover:text-danger transition-colors"
                          style={{ color: "#8A8270", background: "none", border: "none", cursor: "pointer", display: "flex", padding: "0 2px" }}>
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input type="text" value={originInput} onChange={(e) => setOriginInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddOrigin(); } }}
                    placeholder="https://lawfirm.com"
                    className="flex-1 px-3 py-2 text-sm border border-line rounded-md outline-none bg-white"
                    style={{ color: "#1C2127" }} />
                  <button onClick={handleAddOrigin} disabled={savingOrigins}
                    className="font-semibold text-sm px-4 py-2 rounded-md text-white disabled:opacity-60"
                    style={{ background: "#44645D", border: "none", cursor: "pointer" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#374F49"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#44645D"; }}>
                    Add
                  </button>
                </div>
              </div>

              <div style={{ background: "#E6F0EA", border: "1px solid #BCD9C8", borderRadius: 10, padding: 16 }}>
                <p className="font-semibold mb-1" style={{ fontSize: 14, color: "#1C2127" }}>Webhook signing secret</p>
                <p className="mb-4 leading-relaxed" style={{ fontSize: 13, color: "#3A6B57" }}>
                  Verify the <code className="font-mono" style={{ fontSize: 12 }}>X-Signature</code> header using HMAC-SHA256.
                </p>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-md mb-3" style={{ background: "#fff", border: "1px solid #BCD9C8" }}>
                  <code className={`flex-1 text-xs font-mono`} style={{ color: "#44645D", wordBreak: "break-all" }}>
                    {revealed ? fullSecret : maskedSecret}
                  </code>
                  <button onClick={() => setRevealed((r) => !r)}
                    style={{ color: "#8A8270", background: "none", border: "none", cursor: "pointer", display: "flex", flexShrink: 0 }}>
                    {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {!confirmRegen ? (
                  <button onClick={() => setConfirmRegen(true)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
                    style={{ background: "transparent", border: "1px solid #E2BBB4", color: "#B23A2E", cursor: "pointer" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#F6E5E2"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
                    Regenerate
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-2 text-xs p-2.5 rounded-md" style={{ background: "#F6E5E2", border: "1px solid #E2BBB4", color: "#B23A2E" }}>
                      <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>This will break existing webhook receivers until they update their secret.</span>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => setConfirmRegen(false)} className="text-xs font-semibold px-3 py-1.5 rounded-md border"
                        style={{ borderColor: "#C9C2B4", color: "#3A4049", background: "#fff", cursor: "pointer" }}>
                        Cancel
                      </button>
                      <button onClick={handleRegenerate} disabled={regenerating}
                        className="text-xs font-semibold px-3 py-1.5 rounded-md text-white disabled:opacity-50"
                        style={{ background: "#B23A2E", border: "none", cursor: "pointer" }}>
                        {regenerating ? "Regenerating…" : "Confirm"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
