"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import {
  ChevronLeft, Code2, Save, Check, Globe, Webhook,
  FileText, X, Copy, Eye, EyeOff, AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { Source_Serif_4, IBM_Plex_Mono } from "next/font/google";
import { useWorkflowName } from "@/contexts/WorkflowNameContext";
import { renderForm } from "@/lib/renderer";
import { FieldRow } from "./FieldRow";
import type { Field, Theme, Workflow, WorkflowStatus } from "@/types/workflow";

const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "600"] });
const ibmMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"] });

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PALETTE: { type: Field["type"]; label: string }[] = [
  { type: "text",         label: "Text" },
  { type: "email",        label: "Email" },
  { type: "dropdown",     label: "Dropdown" },
  { type: "radio",        label: "Radio" },
  { type: "file",         label: "File Upload" },
  { type: "dynamic-list", label: "Dynamic List" },
];

const BG_SWATCHES = [
  { color: "#FBF8F2", label: "Paper" },
  { color: "#1C2127", label: "Slate" },
  { color: "#EFEEE9", label: "Mist" },
];

const FONTS = ["Inter", "Georgia", "Courier New"];

function createField(type: Field["type"]): Field {
  const id = `field-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const base = { id, label: "New field", required: false };
  switch (type) {
    case "text":         return { ...base, type: "text" };
    case "email":        return { ...base, type: "email" };
    case "dropdown":     return { ...base, type: "dropdown", options: ["Option 1", "Option 2"] };
    case "radio":        return { ...base, type: "radio",    options: ["Option 1", "Option 2"] };
    case "file":         return { ...base, type: "file", acceptedTypes: [".pdf"], maxSizeBytes: 10_000_000 };
    case "dynamic-list": return {
      ...base, type: "dynamic-list",
      subFields: [{ id: `sf-${Date.now()}`, label: "Name", type: "text", required: true }],
    };
  }
}

// ─── Embed modal ──────────────────────────────────────────────────────────────

interface EmbedModalProps {
  workflowId: string;
  workflowName: string;
  allowedOrigins: string[];
  hmacSecret: string;
  onOriginsChange: (origins: string[]) => void;
  onSaveOrigins: (origins: string[]) => Promise<void>;
  onRegenerateSecret: () => Promise<string | null>;
  onClose: () => void;
}

function EmbedModal({
  workflowId,
  workflowName,
  allowedOrigins,
  hmacSecret,
  onOriginsChange,
  onSaveOrigins,
  onRegenerateSecret,
  onClose,
}: EmbedModalProps) {
  const appUrl =
    typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin)
      : "";

  const snippet = `<script\n  src="${appUrl}/embed.js"\n  data-workflow-id="${workflowId}"\n  async\n></script>`;

  const [tab, setTab]                   = useState<"script" | "security">("script");
  const [copied, setCopied]             = useState(false);
  const [revealed, setRevealed]         = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [originInput, setOriginInput]   = useState("");
  const [savingOrigins, setSavingOrigins] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleAddOrigin() {
    const val = originInput.trim().replace(/\/$/, "");
    if (!val || allowedOrigins.includes(val)) return;
    const next = [...allowedOrigins, val];
    onOriginsChange(next);
    setOriginInput("");
    setSavingOrigins(true);
    await onSaveOrigins(next);
    setSavingOrigins(false);
  }

  async function handleRemoveOrigin(origin: string) {
    const next = allowedOrigins.filter((o) => o !== origin);
    onOriginsChange(next);
    await onSaveOrigins(next);
  }

  async function handleRegenerate() {
    setRegenerating(true);
    await onRegenerateSecret();
    setRegenerating(false);
    setConfirmRegen(false);
    setRevealed(true);
  }

  const maskedSecret = hmacSecret
    ? `whsec_${"•".repeat(8)}${hmacSecret.slice(-4)}`
    : "whsec_(not set)";
  const fullSecret = hmacSecret ? `whsec_${hmacSecret}` : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(28,33,39,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-xl shadow-2xl overflow-hidden"
        style={{ maxWidth: 520, background: "#FBF8F2" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2.5 px-5 py-4"
          style={{ borderBottom: "1px solid #E8E2D9" }}
        >
          <FileText size={16} color="#1F6F54" />
          <span
            className={`flex-1 text-sm font-semibold truncate ${sourceSerif.className}`}
            style={{ color: "#1C2127" }}
          >
            {workflowName}
          </span>
          <button
            onClick={onClose}
            style={{ color: "#8A8270", background: "none", border: "none", cursor: "pointer", display: "flex" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex px-5"
          style={{ borderBottom: "1px solid #E8E2D9" }}
        >
          {(["script", "security"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="text-xs font-medium py-3 mr-6 border-b-2 transition-colors"
              style={{
                borderColor: tab === t ? "#1F6F54" : "transparent",
                color: tab === t ? "#1C2127" : "#8A8270",
                background: "none",
                cursor: "pointer",
              }}
            >
              {t === "script" ? "Script tag" : "Security setup"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5" style={{ maxHeight: "70vh", overflowY: "auto" }}>

          {/* ── Script tag tab ── */}
          {tab === "script" && (
            <div className="flex flex-col gap-4">
              <p className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>
                Paste this snippet inside your website&apos;s{" "}
                <code
                  className={ibmMono.className}
                  style={{ fontSize: 11, background: "#F3F1EC", padding: "1px 5px", borderRadius: 4, color: "#1C2127" }}
                >
                  &lt;body&gt;
                </code>{" "}
                tag. The form loads asynchronously and won&apos;t block your page.
              </p>

              {/* Code block */}
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    background: "#1C2127",
                    borderRadius: 8,
                    padding: "14px 16px",
                    paddingRight: 80,
                  }}
                >
                  <pre
                    className={ibmMono.className}
                    style={{
                      fontSize: 12.5,
                      lineHeight: 1.7,
                      color: "#86EFAC",
                      margin: 0,
                      whiteSpace: "pre",
                      overflowX: "auto",
                    }}
                  >
                    {snippet}
                  </pre>
                </div>
                <button
                  onClick={handleCopy}
                  className="absolute flex items-center gap-1.5"
                  style={{
                    top: 10,
                    right: 10,
                    fontSize: 11,
                    fontWeight: 500,
                    padding: "4px 10px",
                    borderRadius: 5,
                    border: "none",
                    cursor: "pointer",
                    background: copied ? "#1F6F54" : "#2D3748",
                    color: copied ? "#fff" : "#9CA3AF",
                    transition: "background 0.15s",
                  }}
                >
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? "Copied ✓" : "Copy"}
                </button>
              </div>

              <p className="text-xs" style={{ color: "#8A8270" }}>
                Changes you save in the builder go live on your site&apos;s next page load — no redeploy needed.
              </p>
            </div>
          )}

          {/* ── Security setup tab ── */}
          {tab === "security" && (
            <div className="flex flex-col gap-6">

              {/* Allowed domains */}
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-3"
                  style={{ color: "#8A8270", letterSpacing: "0.07em" }}
                >
                  Allowed domains
                </p>
                <p className="text-xs mb-3" style={{ color: "#6B7280" }}>
                  Only these origins can load this form. Leave empty to allow any domain.
                </p>

                {/* Existing pills */}
                {allowedOrigins.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {allowedOrigins.map((o) => (
                      <span
                        key={o}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                        style={{ background: "#F3F1EC", border: "1px solid #C9C2B4", color: "#374151" }}
                      >
                        {o}
                        <button
                          onClick={() => handleRemoveOrigin(o)}
                          style={{ color: "#8A8270", background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Add input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={originInput}
                    onChange={(e) => setOriginInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddOrigin(); } }}
                    placeholder="https://lawfirm.com"
                    className="flex-1 text-xs px-3 py-2 rounded-md border outline-none"
                    style={{ borderColor: "#C9C2B4", background: "#fff", color: "#1C2127" }}
                  />
                  <button
                    onClick={handleAddOrigin}
                    disabled={savingOrigins}
                    className="text-xs font-medium px-3 py-2 rounded-md text-white disabled:opacity-50"
                    style={{ background: "#1F6F54", border: "none", cursor: "pointer" }}
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* HMAC secret */}
              <div
                style={{
                  background: "#EFF6F3",
                  border: "1px solid #BCD9C8",
                  borderRadius: 8,
                  padding: 16,
                }}
              >
                <p className="text-xs font-semibold mb-1" style={{ color: "#1C2127" }}>
                  Webhook signing secret
                </p>
                <p className="text-xs mb-4 leading-relaxed" style={{ color: "#6B7280" }}>
                  Your webhook receiver should verify the{" "}
                  <code className={`${ibmMono.className}`} style={{ fontSize: 11, color: "#1F6F54" }}>
                    X-Signature
                  </code>{" "}
                  header using this secret and HMAC-SHA256.
                </p>

                {/* Secret display */}
                <div
                  className="flex items-center gap-2 mb-3 px-3 py-2.5 rounded-md"
                  style={{ background: "#fff", border: "1px solid #BCD9C8" }}
                >
                  <code
                    className={`flex-1 text-xs ${ibmMono.className}`}
                    style={{ color: "#1F6F54", wordBreak: "break-all" }}
                  >
                    {revealed ? fullSecret : maskedSecret}
                  </code>
                  <button
                    onClick={() => setRevealed((r) => !r)}
                    style={{ color: "#8A8270", background: "none", border: "none", cursor: "pointer", display: "flex", flexShrink: 0 }}
                    title={revealed ? "Hide" : "Reveal"}
                  >
                    {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                {/* Regenerate */}
                {!confirmRegen ? (
                  <button
                    onClick={() => setConfirmRegen(true)}
                    className="text-xs font-medium px-3 py-1.5 rounded-md"
                    style={{
                      background: "transparent",
                      border: "1px solid #B23A2E",
                      color: "#B23A2E",
                      cursor: "pointer",
                    }}
                  >
                    Regenerate
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div
                      className="flex items-start gap-2 text-xs p-2.5 rounded-md"
                      style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B23A2E" }}
                    >
                      <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>
                        This will break existing webhook receivers until they update their secret.
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmRegen(false)}
                        className="text-xs px-3 py-1.5 rounded-md border"
                        style={{ borderColor: "#C9C2B4", color: "#374151", background: "#fff", cursor: "pointer" }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleRegenerate}
                        disabled={regenerating}
                        className="text-xs font-medium px-3 py-1.5 rounded-md text-white disabled:opacity-50"
                        style={{ background: "#B23A2E", border: "none", cursor: "pointer" }}
                      >
                        {regenerating ? "Regenerating…" : "Confirm regenerate"}
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

interface Props {
  initialWorkflow: Workflow;
}

export function BuilderClient({ initialWorkflow }: Props) {
  const { setWorkflowName: setNavName } = useWorkflowName();

  // Working state
  const [schema, setSchema]               = useState<Field[]>(initialWorkflow.schema);
  const [theme, setTheme]                 = useState<Theme>(initialWorkflow.theme);
  const [webhookUrl, setWebhookUrl]       = useState(initialWorkflow.webhookUrl);
  const [allowedOrigins, setOrigins]      = useState<string[]>(initialWorkflow.allowedOrigins);
  const [workflowName, setWorkflowName]   = useState(initialWorkflow.name);
  const [status, setStatus]               = useState<WorkflowStatus>(initialWorkflow.status);
  const [hmacSecret, setHmacSecret]       = useState(initialWorkflow.hmacSecret);

  // UI state
  const [selectedId, setSelectedId]       = useState<string | null>(null);
  const [showPalette, setShowPalette]     = useState(false);
  const [showEmbed, setShowEmbed]         = useState(false);
  const [saving, setSaving]               = useState(false);
  const [saved, setSaved]                 = useState(false);
  const [originInput, setOriginInput]     = useState("");

  const previewRef = useRef<HTMLDivElement>(null);
  const id = initialWorkflow.id;

  useEffect(() => { setNavName(workflowName); }, [workflowName, setNavName]);

  useEffect(() => {
    if (!previewRef.current) return;
    return renderForm(previewRef.current, schema, theme);
  }, [schema, theme]);

  // ── DnD ─────────────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = schema.findIndex((f) => f.id === active.id);
      const newIdx = schema.findIndex((f) => f.id === over.id);
      setSchema(arrayMove(schema, oldIdx, newIdx));
    }
  }

  // ── Field mutations ──────────────────────────────────────────────────────────
  function addField(type: Field["type"]) {
    const f = createField(type);
    setSchema((prev) => [...prev, f]);
    setSelectedId(f.id);
    setShowPalette(false);
  }

  function deleteField(fieldId: string) {
    setSchema((prev) => prev.filter((f) => f.id !== fieldId));
    if (selectedId === fieldId) setSelectedId(null);
  }

  const updateField = useCallback((fieldId: string, updates: Partial<Field>) => {
    setSchema((prev) =>
      prev.map((f) => (f.id === fieldId ? ({ ...f, ...updates } as Field) : f))
    );
  }, []);

  // ── API ──────────────────────────────────────────────────────────────────────
  async function patchWorkflow(body: Record<string, unknown>) {
    await fetch(`/api/admin/workflows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function handleSave() {
    setSaving(true);
    await patchWorkflow({ schema, theme, webhookUrl, allowedOrigins });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleNameBlur() {
    const trimmed = workflowName.trim();
    if (!trimmed || trimmed === initialWorkflow.name) return;
    await patchWorkflow({ name: trimmed });
    setNavName(trimmed);
  }

  async function toggleStatus() {
    const next: WorkflowStatus = status === "published" ? "draft" : "published";
    setStatus(next);
    await patchWorkflow({ status: next });
  }

  async function handleSaveOrigins(origins: string[]) {
    await patchWorkflow({ allowedOrigins: origins });
  }

  async function handleRegenerateSecret(): Promise<string | null> {
    const res = await fetch(`/api/admin/workflows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenerateSecret: true }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.hmacSecret) setHmacSecret(data.hmacSecret);
    return data.hmacSecret ?? null;
  }

  // ── Origins (left pane) ──────────────────────────────────────────────────────
  function addOrigin() {
    const val = originInput.trim().replace(/\/$/, "");
    if (!val || allowedOrigins.includes(val)) return;
    setOrigins((prev) => [...prev, val]);
    setOriginInput("");
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 56px)" }}>

      {/* ── Top toolbar ── */}
      <div
        className="flex items-center gap-3 px-4 h-12 flex-shrink-0"
        style={{ background: "#FBF8F2", borderBottom: "1px solid #C9C2B4" }}
      >
        <Link
          href="/admin/workflows"
          className="text-gray-400 hover:text-gray-700 flex items-center gap-1 text-sm flex-shrink-0"
        >
          <ChevronLeft size={16} />
        </Link>

        <input
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          onBlur={handleNameBlur}
          className={`flex-1 min-w-0 text-base font-semibold bg-transparent outline-none border-b border-transparent focus:border-gray-300 transition-colors ${sourceSerif.className}`}
          style={{ color: "#1C2127" }}
        />

        <button
          onClick={toggleStatus}
          className="text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 transition-colors"
          style={
            status === "published"
              ? { background: "#1F6F54", color: "#fff" }
              : { background: "#E5E7EB", color: "#374151" }
          }
        >
          {status === "published" ? "Published" : "Draft"}
        </button>

        <button
          onClick={() => setShowEmbed(true)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border flex-shrink-0"
          style={{ borderColor: "#C9C2B4", color: "#374151" }}
        >
          <Code2 size={13} /> Embed code
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md text-white flex-shrink-0 transition-colors disabled:opacity-60"
          style={{ background: saved ? "#166534" : "#1F6F54" }}
        >
          {saved ? <Check size={13} /> : <Save size={13} />}
          {saving ? "Saving…" : saved ? "Saved" : "Save"}
        </button>
      </div>

      {/* ── 3-column body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT PANE */}
        <div
          className="flex flex-col overflow-y-auto flex-shrink-0"
          style={{ width: 260, background: "#F3F1EC", borderRight: "1px solid #C9C2B4" }}
        >
          <div className="px-3 pt-4 pb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6B7280" }}>
              Fields
            </span>
            <span className="text-xs tabular-nums" style={{ color: "#9CA3AF" }}>
              {schema.length}
            </span>
          </div>

          <div className="px-3 flex-1">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={schema.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                {schema.map((field, index) => (
                  <FieldRow
                    key={field.id}
                    field={field}
                    index={index}
                    isSelected={selectedId === field.id}
                    onSelect={() => setSelectedId(selectedId === field.id ? null : field.id)}
                    onDelete={() => deleteField(field.id)}
                    onUpdate={(updates) => updateField(field.id, updates)}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {schema.length === 0 && (
              <p className="text-xs text-center py-6" style={{ color: "#9CA3AF" }}>
                No fields yet
              </p>
            )}
          </div>

          <div className="px-3 pb-3 mt-2 relative">
            <button
              onClick={() => setShowPalette(!showPalette)}
              className="w-full text-xs py-2 rounded-md transition-colors"
              style={{
                border: "1px dashed #9CA3AF",
                color: "#6B7280",
                background: showPalette ? "#E5E7EB" : "transparent",
              }}
            >
              + Add field
            </button>

            {showPalette && (
              <div
                className="absolute bottom-12 left-3 right-3 rounded-lg shadow-lg overflow-hidden z-10"
                style={{ background: "#fff", border: "1px solid #E5E7EB" }}
              >
                {PALETTE.map(({ type, label }) => (
                  <button
                    key={type}
                    onClick={() => addField(type)}
                    className="w-full text-left text-xs px-3 py-2 hover:bg-gray-50 transition-colors"
                    style={{ color: "#1C2127" }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ borderTop: "1px solid #C9C2B4" }} />

          <div className="px-3 pt-3 pb-2">
            <label
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide mb-2"
              style={{ color: "#6B7280" }}
            >
              <Webhook size={12} /> Webhook
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://yourserver.com/hook"
              className="w-full px-2 py-1.5 text-xs border rounded outline-none"
              style={{ borderColor: "#D1D5DB", background: "#fff" }}
            />
          </div>

          <div className="px-3 pb-4">
            <label
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide mb-2"
              style={{ color: "#6B7280" }}
            >
              <Globe size={12} /> Allowed origins
            </label>

            <div className="flex gap-1 mb-2">
              <input
                type="text"
                value={originInput}
                onChange={(e) => setOriginInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOrigin(); } }}
                placeholder="https://lawfirm.com"
                className="flex-1 px-2 py-1.5 text-xs border rounded outline-none"
                style={{ borderColor: "#D1D5DB", background: "#fff" }}
              />
              <button
                onClick={addOrigin}
                className="px-2 py-1.5 text-xs rounded text-white"
                style={{ background: "#1F6F54" }}
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-1">
              {allowedOrigins.map((origin) => (
                <span
                  key={origin}
                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "#E5E7EB", color: "#374151" }}
                >
                  {origin}
                  <button
                    onClick={() => setOrigins(allowedOrigins.filter((o) => o !== origin))}
                    className="text-gray-400 hover:text-red-500 leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER PANE */}
        <div
          className="flex-1 overflow-y-auto flex flex-col"
          style={{ background: "#E8E6E0" }}
        >
          <div className="px-3 pt-4 pb-2 flex-shrink-0">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6B7280" }}>
              Live Preview
            </span>
          </div>
          <div className="flex-1 px-6 pb-8">
            <div
              className="min-h-full rounded-xl overflow-hidden shadow-sm"
              style={{ background: "#FBF8F2", borderLeft: "4px solid #E8B4AC" }}
            >
              <div ref={previewRef} className="p-6" />
            </div>
          </div>
        </div>

        {/* RIGHT PANE — Theme */}
        <div
          className="flex-col overflow-y-auto flex-shrink-0"
          style={{
            width: 280,
            background: "#F3F1EC",
            borderLeft: "1px solid #C9C2B4",
            display: "flex",
          }}
        >
          <div className="px-4 pt-4 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6B7280" }}>
              Theme
            </span>
          </div>

          <div className="px-4 flex flex-col gap-5 pb-4">
            {/* Background */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "#374151" }}>
                Background
              </label>
              <div className="flex gap-2 flex-wrap">
                {BG_SWATCHES.map(({ color, label }) => (
                  <button
                    key={color}
                    title={label}
                    onClick={() => setTheme((t) => ({ ...t, bgColor: color }))}
                    className="w-8 h-8 rounded-full border-2 transition-all"
                    style={{
                      background: color,
                      borderColor: theme.bgColor === color ? "#1F6F54" : "#C9C2B4",
                      transform: theme.bgColor === color ? "scale(1.15)" : "scale(1)",
                    }}
                  />
                ))}
                <label
                  title="Custom"
                  className="w-8 h-8 rounded-full border-2 flex items-center justify-center cursor-pointer overflow-hidden"
                  style={{ borderColor: "#C9C2B4" }}
                >
                  <input
                    type="color"
                    value={theme.bgColor}
                    onChange={(e) => setTheme((t) => ({ ...t, bgColor: e.target.value }))}
                    className="w-10 h-10 opacity-0 absolute cursor-pointer"
                  />
                  <span className="text-xs" style={{ color: "#9CA3AF" }}>+</span>
                </label>
              </div>
            </div>

            {/* Corner radius */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "#374151" }}>
                Corner radius — <span style={{ color: "#1F6F54" }}>{theme.radius}px</span>
              </label>
              <input
                type="range" min={0} max={16} value={theme.radius}
                onChange={(e) => setTheme((t) => ({ ...t, radius: Number(e.target.value) }))}
                className="w-full"
                style={{ accentColor: "#1F6F54" }}
              />
            </div>

            {/* Density */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "#374151" }}>
                Density
              </label>
              <div className="flex rounded-md overflow-hidden border" style={{ borderColor: "#C9C2B4" }}>
                {(["compact", "spacious"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setTheme((t) => ({ ...t, density: d }))}
                    className="flex-1 py-1.5 text-xs font-medium capitalize transition-colors"
                    style={
                      theme.density === d
                        ? { background: "#1F6F54", color: "#fff" }
                        : { background: "#fff", color: "#374151" }
                    }
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Font */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "#374151" }}>
                Font
              </label>
              <div className="flex flex-col gap-1">
                {FONTS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setTheme((t) => ({ ...t, font: f }))}
                    className="w-full text-left px-3 py-2 rounded text-sm border transition-colors"
                    style={{
                      fontFamily: `${f}, sans-serif`,
                      borderColor: theme.font === f ? "#1F6F54" : "#E5E7EB",
                      background: theme.font === f ? "#F0FDF4" : "#fff",
                      color: "#1C2127",
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Button color */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "#374151" }}>
                Button color
              </label>
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded border flex-shrink-0"
                  style={{ background: theme.buttonColor, borderColor: "#C9C2B4" }}
                />
                <input
                  type="color"
                  value={theme.buttonColor}
                  onChange={(e) => setTheme((t) => ({ ...t, buttonColor: e.target.value }))}
                  className="w-full h-8 rounded cursor-pointer border"
                  style={{ borderColor: "#D1D5DB" }}
                />
              </div>
            </div>

            {/* Button text color — item 4 */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "#374151" }}>
                Button text
              </label>
              <div className="flex rounded-md overflow-hidden border" style={{ borderColor: "#C9C2B4" }}>
                {([
                  { value: "#FFFFFF", label: "Light" },
                  { value: "#1C2127", label: "Dark" },
                ] as const).map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setTheme((t) => ({ ...t, buttonTextColor: value }))}
                    className="flex-1 py-1.5 text-xs font-medium transition-colors"
                    style={
                      theme.buttonTextColor === value
                        ? { background: "#1F6F54", color: "#fff" }
                        : { background: "#fff", color: "#374151" }
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-auto px-4 pb-4">
            <div
              className="rounded-lg p-3"
              style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}
            >
              <p className="text-xs font-medium mb-0.5" style={{ color: "#166534" }}>
                Synced live
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "#166534", opacity: 0.8 }}>
                After saving, changes appear on the embedded form on the next page load — no rebuild or redeploy needed.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Embed modal */}
      {showEmbed && (
        <EmbedModal
          workflowId={id}
          workflowName={workflowName}
          allowedOrigins={allowedOrigins}
          hmacSecret={hmacSecret}
          onOriginsChange={setOrigins}
          onSaveOrigins={handleSaveOrigins}
          onRegenerateSecret={handleRegenerateSecret}
          onClose={() => setShowEmbed(false)}
        />
      )}
    </div>
  );
}
