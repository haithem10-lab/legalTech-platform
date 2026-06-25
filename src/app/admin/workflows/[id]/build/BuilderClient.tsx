"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  DndContext, closestCenter, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import {
  ChevronLeft, X, Copy, Check,
  Eye, EyeOff, AlertTriangle, FileText, Code2,
} from "lucide-react";
import Link from "next/link";
import { Source_Serif_4, IBM_Plex_Mono, Inter } from "next/font/google";
import { useWorkflowName } from "@/contexts/WorkflowNameContext";
import { renderForm } from "@/lib/renderer";
import { FieldRow } from "./FieldRow";
import type { Field, Theme, Workflow, WorkflowStatus } from "@/types/workflow";

const serif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "600"] });
const mono  = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"] });
const inter = Inter({ subsets: ["latin"] });

// ─── Constants ────────────────────────────────────────────────────────────────

const FIELD_TYPES: { type: Field["type"]; label: string }[] = [
  { type: "text",          label: "Text" },
  { type: "email",         label: "Email" },
  { type: "dropdown",      label: "Dropdown" },
  { type: "radio",         label: "Radio" },
  { type: "file",          label: "File" },
  { type: "dynamic-list",  label: "List" },
];

const BG_SWATCHES = [
  { color: "#FBF8F2", label: "Paper"  },
  { color: "#1C2127", label: "Slate"  },
  { color: "#EFEEE9", label: "Mist"   },
];

const FONTS = ["Inter", "Georgia", "Courier New"];

function createField(type: Field["type"]): Field {
  const id   = `field-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
  const base = { id, label: "New field", required: false };
  switch (type) {
    case "text":          return { ...base, type: "text" };
    case "email":         return { ...base, type: "email" };
    case "dropdown":      return { ...base, type: "dropdown", options: ["Option 1", "Option 2"] };
    case "radio":         return { ...base, type: "radio",    options: ["Option 1", "Option 2"] };
    case "file":          return { ...base, type: "file", acceptedTypes: [".pdf"], maxSizeBytes: 10_000_000 };
    case "dynamic-list":  return { ...base, type: "dynamic-list",
      subFields: [{ id: `sf-${Date.now()}`, label: "Name", type: "text", required: true }] };
  }
}

// ─── Shared pill styles ────────────────────────────────────────────────────────

function StatusPill({ status }: { status: WorkflowStatus }) {
  const live = status === "published";
  return (
    <span className={`inline-flex items-center gap-1.5 ${inter.className}`}
      style={{
        borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 600,
        background: live ? "#E6F0EA" : "#F3EDD9",
        border: `1px solid ${live ? "#BCD9C8" : "#E2D7B0"}`,
        color: live ? "#1F6F54" : "#8A6D1F",
      }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: live ? "#1F6F54" : "#B8902E", flexShrink: 0 }} />
      {live ? "Live" : "Draft"}
    </span>
  );
}

// ─── Segmented control ────────────────────────────────────────────────────────

function Seg<T extends string>({
  options, value, onChange,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex p-0.5 gap-0.5 rounded-md" style={{ background: "#F3F1EC", border: "1px solid #C9C2B4" }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button key={opt.value} onClick={() => onChange(opt.value)}
            className={`flex-1 py-1.5 font-medium transition-all ${inter.className}`}
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

// ─── Eyebrow label ────────────────────────────────────────────────────────────

function Eyebrow({ children }: { children: string }) {
  return (
    <p className={`uppercase font-bold ${inter.className}`}
      style={{ fontSize: 10, letterSpacing: "0.08em", color: "#8A8270", margin: 0 }}>
      {children}
    </p>
  );
}

// ─── Embed modal ──────────────────────────────────────────────────────────────

interface EmbedModalProps {
  workflowId: string;
  workflowName: string;
  allowedOrigins: string[];
  hmacSecret: string;
  onOriginsChange: (o: string[]) => void;
  onSaveOrigins: (o: string[]) => Promise<void>;
  onRegenerateSecret: () => Promise<string | null>;
  onClose: () => void;
}

function EmbedModal({ workflowId, workflowName, allowedOrigins, hmacSecret, onOriginsChange, onSaveOrigins, onRegenerateSecret, onClose }: EmbedModalProps) {
  const appUrl = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin) : "";
  const snippet = `<script\n  src="${appUrl}/embed.js"\n  data-workflow-id="${workflowId}"\n  async\n></script>`;

  const [tab, setTab]               = useState<"script" | "security">("script");
  const [copied, setCopied]         = useState(false);
  const [revealed, setRevealed]     = useState(false);
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
      <div className={`w-full overflow-hidden ${inter.className}`}
        style={{ maxWidth: 540, background: "#FBF8F2", borderRadius: 14, boxShadow: "0 24px 70px rgba(28,33,39,0.35)" }}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start gap-3 px-6 pt-5 pb-4" style={{ borderBottom: "1px solid #C9C2B4" }}>
          <FileText size={18} color="#1F6F54" style={{ flexShrink: 0, marginTop: 2 }} />
          <div className="flex-1 min-w-0">
            <h2 className={`font-semibold ${serif.className}`} style={{ fontSize: 21, color: "#1C2127", margin: 0 }}>
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
                borderBottom: `2px solid ${tab === t ? "#1F6F54" : "transparent"}`,
                color: tab === t ? "#1F6F54" : "#8A8270",
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
                <code className={mono.className} style={{ fontSize: 12, background: "#F3F1EC", padding: "2px 6px", borderRadius: 4, color: "#1C2127" }}>
                  &lt;body&gt;
                </code>{" "}
                tag. Loads asynchronously — won&apos;t block your page.
              </p>
              <div style={{ position: "relative" }}>
                <div style={{ background: "#1C2127", borderRadius: 10, padding: 18, paddingRight: 90, overflowX: "auto" }}>
                  <pre className={mono.className} style={{ fontSize: 12.5, lineHeight: 1.7, margin: 0, whiteSpace: "pre", color: "#C9E0D3" }}>
                    {snippet}
                  </pre>
                </div>
                <button onClick={handleCopy} className="absolute flex items-center gap-1.5"
                  style={{
                    top: 12, right: 12, fontSize: 11, fontWeight: 600, padding: "5px 11px", borderRadius: 6,
                    background: copied ? "#1F6F54" : "#2A3038",
                    border: `1px solid ${copied ? "#1F6F54" : "#3A424C"}`,
                    color: copied ? "#fff" : "#D8D2C4", cursor: "pointer",
                  }}>
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: "#E6F0EA", border: "1px solid #BCD9C8" }}>
                <Check size={14} color="#1F6F54" style={{ flexShrink: 0 }} />
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
                      <span key={o} className={`flex items-center gap-1 ${mono.className}`}
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
                    style={{ background: "#1F6F54", border: "none", cursor: "pointer" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#1A5E47"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#1F6F54"; }}>
                    Add
                  </button>
                </div>
              </div>

              <div style={{ background: "#E6F0EA", border: "1px solid #BCD9C8", borderRadius: 10, padding: 16 }}>
                <p className="font-semibold mb-1" style={{ fontSize: 14, color: "#1C2127" }}>Webhook signing secret</p>
                <p className="mb-4 leading-relaxed" style={{ fontSize: 13, color: "#3A6B57" }}>
                  Verify the <code className={mono.className} style={{ fontSize: 12 }}>X-Signature</code> header using HMAC-SHA256.
                </p>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-md mb-3" style={{ background: "#fff", border: "1px solid #BCD9C8" }}>
                  <code className={`flex-1 text-xs ${mono.className}`} style={{ color: "#1F6F54", wordBreak: "break-all" }}>
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

// ─── Main builder ─────────────────────────────────────────────────────────────

interface Props { initialWorkflow: Workflow; }

export function BuilderClient({ initialWorkflow }: Props) {
  const { setWorkflowName: setNavName } = useWorkflowName();

  const [schema, setSchema]             = useState<Field[]>(initialWorkflow.schema);
  const [theme, setTheme]               = useState<Theme>(initialWorkflow.theme);
  const [webhookUrl, setWebhookUrl]     = useState(initialWorkflow.webhookUrl);
  const [allowedOrigins, setOrigins]    = useState<string[]>(initialWorkflow.allowedOrigins);
  const [workflowName, setWorkflowName] = useState(initialWorkflow.name);
  const [status, setStatus]             = useState<WorkflowStatus>(initialWorkflow.status);
  const [hmacSecret, setHmacSecret]     = useState(initialWorkflow.hmacSecret);

  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [showPalette, setShowPalette]   = useState(false);
  const [showEmbed, setShowEmbed]       = useState(false);
  const [savedAt, setSavedAt]           = useState<Date | null>(null);
  const [saving, setSaving]             = useState(false);
  const [originInput, setOriginInput]   = useState("");

  // AI generator state
  const [showAI, setShowAI]             = useState(false);
  const [aiPrompt, setAiPrompt]         = useState("");
  const [aiLoading, setAiLoading]       = useState(false);
  const [aiError, setAiError]           = useState<string | null>(null);
  const [aiPreview, setAiPreview]       = useState<{ name: string; schema: Field[]; theme: Theme } | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);
  const id = initialWorkflow.id;

  useEffect(() => { setNavName(workflowName); }, [workflowName, setNavName]);
  useEffect(() => {
    if (!previewRef.current) return;
    return renderForm(previewRef.current, schema, theme, workflowName);
  }, [schema, theme, workflowName]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (over && active.id !== over.id) {
      const oi = schema.findIndex((f) => f.id === active.id);
      const ni = schema.findIndex((f) => f.id === over.id);
      setSchema(arrayMove(schema, oi, ni));
    }
  }

  function addField(type: Field["type"]) {
    const f = createField(type);
    setSchema((p) => [...p, f]);
    setSelectedId(f.id);
    setShowPalette(false);
  }

  function deleteField(fieldId: string) {
    setSchema((p) => p.filter((f) => f.id !== fieldId));
    if (selectedId === fieldId) setSelectedId(null);
  }

  const updateField = useCallback((fieldId: string, updates: Partial<Field>) => {
    setSchema((p) => p.map((f) => (f.id === fieldId ? ({ ...f, ...updates } as Field) : f)));
  }, []);

  async function patchWorkflow(body: Record<string, unknown>) {
    await fetch(`/api/admin/workflows/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function handleSave() {
    setSaving(true);
    const trimmed = workflowName.trim() || initialWorkflow.name;
    setWorkflowName(trimmed); setNavName(trimmed);
    await patchWorkflow({ name: trimmed, schema, theme, webhookUrl, allowedOrigins, status });
    setSaving(false); setSavedAt(new Date());
  }

  function toggleStatus() {
    const next: WorkflowStatus = status === "published" ? "draft" : "published";
    setStatus(next);
  }

  async function handleSaveOrigins(origins: string[]) { await patchWorkflow({ allowedOrigins: origins }); }

  async function handleAiGenerate() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true); setAiError(null); setAiPreview(null);
    try {
      const res = await fetch("/api/admin/ai/generate-layout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setAiError(data.error ?? "Generation failed"); return; }
      setAiPreview({ name: data.name, schema: data.schema, theme: data.theme });
    } catch {
      setAiError("Network error — please try again.");
    } finally {
      setAiLoading(false);
    }
  }

  function handleAiApply() {
    if (!aiPreview) return;
    setSchema(aiPreview.schema);
    setTheme(aiPreview.theme);
    setWorkflowName(aiPreview.name);
    setNavName(aiPreview.name);
    setAiPreview(null);
    setAiPrompt("");
    setShowAI(false);
  }

  async function handleRegenerateSecret(): Promise<string | null> {
    const res = await fetch(`/api/admin/workflows/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenerateSecret: true }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.hmacSecret) setHmacSecret(data.hmacSecret);
    return data.hmacSecret ?? null;
  }

  function addOrigin() {
    const val = originInput.trim().replace(/\/$/, "");
    if (!val || allowedOrigins.includes(val)) return;
    setOrigins((p) => [...p, val]); setOriginInput("");
  }

  const savedLabel = saving
    ? "Saving…"
    : savedAt
    ? `Saved ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : null;

  // ─── render ────────────────────────────────────────────────────────────────

  return (
    <div className={`flex flex-col ${inter.className}`} style={{ height: "calc(100vh - 56px)" }}>

      {/* ════ TOP BAR (60px) ════ */}
      <div className="flex items-center gap-3 px-4 flex-shrink-0"
        style={{ height: 60, background: "#FBF8F2", borderBottom: "1px solid #C9C2B4" }}>

        {/* Back → Workflows */}
        <Link href="/admin/workflows"
          className="flex items-center flex-shrink-0 transition-colors rounded-md p-1"
          style={{ color: "#8A8270" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#F3F1EC"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}>
          <ChevronLeft size={18} />
        </Link>

        {/* Name input */}
        <input value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}

          placeholder="Untitled workflow"
          className={`bg-transparent outline-none border-b border-transparent focus:border-line transition-colors min-w-0 ${serif.className}`}
          style={{ fontSize: 19, fontWeight: 600, color: "#1C2127", width: 220 }} />

        {/* Status pill */}
        <button onClick={toggleStatus}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
          <StatusPill status={status} />
        </button>

        {/* Saved indicator */}
        {savedLabel && (
          <span style={{ fontSize: 12, color: "#8A8270", flexShrink: 0 }}>{savedLabel}</span>
        )}

        <div className="flex-1" />

        {/* Embed code */}
        <button onClick={() => setShowEmbed(true)}
          className={`flex items-center font-semibold transition-colors ${inter.className}`}
          style={{ fontSize: 13, padding: "8px 14px", borderRadius: 8, color: "#1F6F54", background: "#FBF8F2", border: "1px solid #1F6F54", cursor: "pointer", flexShrink: 0 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#E6F0EA"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#FBF8F2"; }}>
          <Code2 size={13} style={{ marginRight: 6 }} />
          Embed code
        </button>

        {/* Save */}
        <button onClick={handleSave} disabled={saving}
          className={`flex items-center gap-1.5 font-semibold text-white transition-colors disabled:opacity-60 ${inter.className}`}
          style={{ fontSize: 13, padding: "9px 16px", borderRadius: 8, background: "#1F6F54", border: "none", cursor: "pointer", boxShadow: "0 1px 2px rgba(28,33,39,0.12)", flexShrink: 0 }}
          onMouseEnter={(e) => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = "#1A5E47"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#1F6F54"; }}>
          {saving ? "Saving…" : <><Check size={13} /> Save</>}
        </button>
      </div>

      {/* ════ 3-COL BODY ════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ════ LEFT PANEL (260px) ════ */}
        <div className="flex-shrink-0 flex flex-col"
          style={{ width: 260, background: "#FBF8F2", borderRight: "1px solid #C9C2B4" }}>

          {/* ── AI Generator panel ── */}
          <div style={{ borderBottom: "1px solid #EDE8DD", flexShrink: 0 }}>
            {/* Toggle button */}
            <button
              onClick={() => { setShowAI((p) => !p); setAiError(null); setAiPreview(null); }}
              className={`w-full flex items-center gap-2 px-4 py-2.5 font-medium transition-colors ${inter.className}`}
              style={{ fontSize: 12, background: "none", border: "none", cursor: "pointer", color: showAI ? "#1C2127" : "#5C564C" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#F3F1EC"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}>
              <span style={{ fontSize: 14 }}>✨</span>
              Generate with AI
              <span className="ml-auto" style={{ fontSize: 10, color: "#8A8270" }}>{showAI ? "▲" : "▼"}</span>
            </button>

            {/* Expanded panel */}
            {showAI && (
              <div className="px-3 pb-3 flex flex-col gap-2">
                {/* Preview / confirmation banner */}
                {aiPreview ? (
                  <div className="rounded-lg p-3 flex flex-col gap-2"
                    style={{ background: "#E6F0EA", border: "1px solid #BCD9C8" }}>
                    <p className={`font-semibold ${inter.className}`} style={{ fontSize: 12, color: "#1F6F54", margin: 0 }}>
                      ✓ Generated &ldquo;{aiPreview.name}&rdquo;
                    </p>
                    <p style={{ fontSize: 11, color: "#3A6B57", margin: 0 }}>
                      {aiPreview.schema.length} fields · {aiPreview.theme.font} · {aiPreview.theme.density}
                    </p>
                    <div className="flex gap-1.5 mt-1">
                      <button onClick={handleAiApply}
                        className={`flex-1 py-1.5 font-semibold rounded-md text-white ${inter.className}`}
                        style={{ fontSize: 12, background: "#1F6F54", border: "none", cursor: "pointer" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#1A5E47"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#1F6F54"; }}>
                        Apply
                      </button>
                      <button onClick={() => setAiPreview(null)}
                        className={`flex-1 py-1.5 font-semibold rounded-md ${inter.className}`}
                        style={{ fontSize: 12, background: "#fff", border: "1px solid #BCD9C8", color: "#5C564C", cursor: "pointer" }}>
                        Discard
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value.slice(0, 300))}
                      placeholder={"Describe your form… e.g. 'A friendly slip-and-fall intake form with light theme for personal injury clients'"}
                      rows={4}
                      className={`w-full resize-none rounded-lg border border-line px-3 py-2 outline-none bg-white ${inter.className}`}
                      style={{ fontSize: 12, color: "#1C2127", lineHeight: 1.5 }}
                    />
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: 10, color: "#B6AE9F" }}>{aiPrompt.length}/300</span>
                      <button onClick={handleAiGenerate} disabled={aiLoading || !aiPrompt.trim()}
                        className={`flex items-center gap-1.5 font-semibold text-white rounded-md disabled:opacity-50 ${inter.className}`}
                        style={{ fontSize: 12, padding: "6px 14px", background: "#1F6F54", border: "none", cursor: "pointer" }}
                        onMouseEnter={(e) => { if (!aiLoading) (e.currentTarget as HTMLButtonElement).style.background = "#1A5E47"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#1F6F54"; }}>
                        {aiLoading ? (
                          <><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} /> Generating…</>
                        ) : "Generate"}
                      </button>
                    </div>
                    {aiError && (
                      <p style={{ fontSize: 12, color: "#B23A2E", margin: 0 }}>{aiError}</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Top: scrollable fields area ── */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {/* Eyebrow */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <Eyebrow>Form Fields</Eyebrow>
              <span className={`${mono.className}`} style={{ fontSize: 11, color: "#8A8270" }}>{schema.length}</span>
            </div>

            {/* Field list */}
            <div className="px-2">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={schema.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                  {schema.map((field, index) => (
                    <FieldRow key={field.id} field={field} index={index}
                      isSelected={selectedId === field.id}
                      onSelect={() => setSelectedId(selectedId === field.id ? null : field.id)}
                      onDelete={() => deleteField(field.id)}
                      onUpdate={(u) => updateField(field.id, u)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              {schema.length === 0 && !showPalette && (
                <p className="text-center py-6" style={{ fontSize: 13, color: "#B6AE9F" }}>No fields yet</p>
              )}
            </div>

            {/* Field type palette — inline */}
            {showPalette && (
              <div className="mx-3 mt-2 mb-1 rounded-lg overflow-hidden"
                style={{ border: "1px solid #E4E0D6", background: "#FBF8F2" }}>
                <div className="grid grid-cols-2">
                  {FIELD_TYPES.map(({ type, label }, i) => (
                    <button key={type} onClick={() => addField(type)}
                      className={`py-2.5 text-left px-3 transition-colors ${inter.className}`}
                      style={{
                        fontSize: 13, fontWeight: 500, color: "#1C2127",
                        background: "none", cursor: "pointer", border: "none",
                        borderTop: i >= 2 ? "1px solid #F3F1EC" : "none",
                        borderRight: i % 2 === 0 ? "1px solid #F3F1EC" : "none",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#E6F0EA"; (e.currentTarget as HTMLButtonElement).style.color = "#1F6F54"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; (e.currentTarget as HTMLButtonElement).style.color = "#1C2127"; }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add field button */}
            <div className="px-3 py-2">
              <button onClick={() => setShowPalette((p) => !p)}
                className={`w-full py-2 font-semibold transition-colors ${inter.className}`}
                style={{
                  fontSize: 13, border: "1.5px dashed #C9C2B4", borderRadius: 8,
                  background: showPalette ? "#E6F0EA" : "transparent",
                  color: showPalette ? "#1F6F54" : "#8A8270", cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!showPalette) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#1F6F54";
                    (e.currentTarget as HTMLButtonElement).style.color = "#1F6F54";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showPalette) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#C9C2B4";
                    (e.currentTarget as HTMLButtonElement).style.color = "#8A8270";
                  }
                }}>
                {showPalette ? "↑ Close" : "+ Add field"}
              </button>
            </div>
          </div>

          {/* ── Bottom: pinned webhook + origins ── */}
          <div className="flex-shrink-0" style={{ borderTop: "1px solid #EDE8DD" }}>
            {/* Webhook */}
            <div className="px-4 pt-3 pb-3">
              <div className="mb-1.5"><Eyebrow>Webhook URL</Eyebrow></div>
              <input type="url" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://yourserver.com/hook"
                className={`w-full px-2.5 py-1.5 border border-line rounded-md outline-none bg-white ${mono.className}`}
                style={{ fontSize: 11, color: "#1C2127" }} />
            </div>

            {/* Allowed origins */}
            <div className="px-4 pb-4" style={{ borderTop: "1px solid #F3F1EC" }}>
              <div className="mb-1.5 pt-3"><Eyebrow>Allowed Origins</Eyebrow></div>
              {allowedOrigins.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {allowedOrigins.map((o) => (
                    <span key={o} className={`flex items-center gap-1 ${mono.className}`}
                      style={{ fontSize: 10, background: "#F3F1EC", border: "1px solid #E0D9CB", borderRadius: 20, padding: "2px 6px 2px 10px", color: "#1C2127" }}>
                      {o}
                      <button onClick={() => setOrigins(allowedOrigins.filter((x) => x !== o))}
                        style={{ color: "#8A8270", background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}>
                        <X size={9} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-1.5">
                <input type="text" value={originInput} onChange={(e) => setOriginInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOrigin(); } }}
                  placeholder="https://lawfirm.com"
                  className="flex-1 px-2.5 py-1.5 border border-line rounded-md outline-none bg-white"
                  style={{ fontSize: 11 }} />
                <button onClick={addOrigin} className="font-semibold text-white px-2.5 py-1.5 rounded-md"
                  style={{ fontSize: 11, background: "#1F6F54", border: "none", cursor: "pointer" }}>Add</button>
              </div>
            </div>
          </div>
        </div>

        {/* ════ CENTER — PREVIEW ════ */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center" style={{ background: "#E8E6E0" }}>
          <p className="mt-5 mb-4 uppercase font-bold tracking-widest text-muted"
            style={{ fontSize: 11, letterSpacing: "0.08em" }}>
            Live Preview
          </p>
          <div className="w-full px-6 pb-10" style={{ maxWidth: 560 }}>
            <div style={{
              position: "relative", overflow: "hidden",
              border: "1px solid #C9C2B4",
              borderRadius: theme.radius,
              boxShadow: "0 8px 28px rgba(28,33,39,0.08)",
            }}>
              {/* Legal-pad margin line */}
              <div style={{
                position: "absolute", left: 48, top: 0, bottom: 0,
                width: 1, background: "rgba(178,58,46,0.35)", zIndex: 1, pointerEvents: "none",
              }} />
              <div ref={previewRef} style={{ position: "relative", zIndex: 2 }} />
            </div>
          </div>
        </div>

        {/* ════ RIGHT PANEL — THEME (280px) ════ */}
        <div className="flex-shrink-0 overflow-y-auto"
          style={{ width: 280, background: "#FBF8F2", borderLeft: "1px solid #C9C2B4", padding: 18 }}>
          <div className="mb-4"><Eyebrow>Theme</Eyebrow></div>

          {/* Background */}
          <div className="mb-5">
            <div className="mb-2"><Eyebrow>Background</Eyebrow></div>
            <div className="flex gap-3 items-end flex-wrap">
              {BG_SWATCHES.map(({ color, label }) => {
                const active = theme.bgColor === color;
                return (
                  <button key={color} title={label} onClick={() => setTheme((t) => ({ ...t, bgColor: color }))}
                    className="flex flex-col items-center gap-1.5">
                    <span style={{
                      display: "block", width: 34, height: 34, borderRadius: 8,
                      background: color, border: "none", cursor: "pointer",
                      boxShadow: active
                        ? "0 0 0 2px #FBF8F2, 0 0 0 4px #1F6F54"
                        : "inset 0 0 0 1px rgba(28,33,39,0.12)",
                      transition: "box-shadow 0.15s",
                    }} />
                    <span style={{ fontSize: 10, color: "#8A8270" }}>{label}</span>
                  </button>
                );
              })}
              {/* Custom color */}
              <label className="flex flex-col items-center gap-1.5 cursor-pointer" title="Custom">
                <span style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 34, height: 34, borderRadius: 8, overflow: "hidden",
                  background: BG_SWATCHES.some((s) => s.color === theme.bgColor) ? "#fff" : theme.bgColor,
                  boxShadow: "inset 0 0 0 1px rgba(28,33,39,0.12)", position: "relative",
                }}>
                  <input type="color" value={theme.bgColor}
                    onChange={(e) => setTheme((t) => ({ ...t, bgColor: e.target.value }))}
                    style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }} />
                  <span style={{ fontSize: 14, color: "#8A8270", pointerEvents: "none" }}>+</span>
                </span>
                <span style={{ fontSize: 10, color: "#8A8270" }}>Custom</span>
              </label>
            </div>
          </div>

          {/* Corner radius */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <Eyebrow>Corner radius</Eyebrow>
              <span className={`${mono.className}`} style={{ fontSize: 12, color: "#1F6F54", fontWeight: 600 }}>{theme.radius}px</span>
            </div>
            <input type="range" min={0} max={16} value={theme.radius}
              onChange={(e) => setTheme((t) => ({ ...t, radius: Number(e.target.value) }))}
              className="w-full" style={{ accentColor: "#1F6F54" }} />
          </div>

          {/* Density */}
          <div className="mb-5">
            <div className="mb-2"><Eyebrow>Density</Eyebrow></div>
            <Seg
              options={[{ value: "compact", label: "Compact" }, { value: "spacious", label: "Spacious" }]}
              value={theme.density}
              onChange={(v) => setTheme((t) => ({ ...t, density: v }))}
            />
          </div>

          {/* Font */}
          <div className="mb-5">
            <div className="mb-2"><Eyebrow>Font</Eyebrow></div>
            <div className="flex flex-col gap-1.5">
              {FONTS.map((f) => (
                <button key={f} onClick={() => setTheme((t) => ({ ...t, font: f }))}
                  className="w-full text-left px-3 py-2.5 rounded-lg border-2 transition-colors text-sm"
                  style={{
                    fontFamily: `${f}, sans-serif`,
                    borderColor: theme.font === f ? "#1F6F54" : "#E4E0D6",
                    background: theme.font === f ? "#E6F0EA" : "#fff",
                    color: "#1C2127", cursor: "pointer",
                  }}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Button color */}
          <div className="mb-5">
            <div className="mb-2"><Eyebrow>Button color</Eyebrow></div>
            <div className="flex items-center gap-2">
              <span style={{
                width: 32, height: 32, borderRadius: 8, background: theme.buttonColor, flexShrink: 0,
                border: "1px solid rgba(28,33,39,0.12)",
              }} />
              <input type="color" value={theme.buttonColor}
                onChange={(e) => setTheme((t) => ({ ...t, buttonColor: e.target.value }))}
                style={{ width: 32, height: 32, padding: 0, border: "none", cursor: "pointer", background: "none", flexShrink: 0 }} />
              <input type="text" value={theme.buttonColor}
                onChange={(e) => {
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value))
                    setTheme((t) => ({ ...t, buttonColor: e.target.value }));
                }}
                className={`flex-1 px-2 py-1.5 border border-line rounded-md outline-none ${mono.className}`}
                style={{ fontSize: 12, color: "#1C2127", background: "#fff" }} maxLength={7} />
            </div>
          </div>

          {/* Button text color */}
          <div className="mb-5">
            <div className="mb-2"><Eyebrow>Button text</Eyebrow></div>
            <Seg
              options={[{ value: "#FFFFFF", label: "Light" }, { value: "#1C2127", label: "Dark" }]}
              value={theme.buttonTextColor === "#1C2127" ? "#1C2127" : "#FFFFFF"}
              onChange={(v) => setTheme((t) => ({ ...t, buttonTextColor: v }))}
            />
          </div>

          {/* Button size */}
          <div className="mb-5">
            <div className="mb-2"><Eyebrow>Button size</Eyebrow></div>
            <Seg
              options={[
                { value: "sm", label: "Small"  },
                { value: "md", label: "Medium" },
                { value: "lg", label: "Large"  },
              ]}
              value={(theme.buttonSize ?? "md") as "sm" | "md" | "lg"}
              onChange={(v) => setTheme((t) => ({ ...t, buttonSize: v }))}
            />
          </div>

          {/* Accent locked */}
          <div>
            <div className="mb-2"><Eyebrow>Accent</Eyebrow></div>
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-md border border-line"
              style={{ background: "#F3F1EC" }}>
              <span style={{ width: 18, height: 18, borderRadius: 4, background: "#1F6F54", flexShrink: 0 }} />
              <span className={`flex-1 ${mono.className}`} style={{ fontSize: 12, color: "#1F6F54" }}>#1F6F54</span>
              <span style={{ fontSize: 11, color: "#8A8270", fontWeight: 500 }}>Locked</span>
            </div>
          </div>
        </div>
      </div>

      {/* Embed modal */}
      {showEmbed && (
        <EmbedModal workflowId={id} workflowName={workflowName}
          allowedOrigins={allowedOrigins} hmacSecret={hmacSecret}
          onOriginsChange={setOrigins} onSaveOrigins={handleSaveOrigins}
          onRegenerateSecret={handleRegenerateSecret}
          onClose={() => setShowEmbed(false)} />
      )}
    </div>
  );
}
