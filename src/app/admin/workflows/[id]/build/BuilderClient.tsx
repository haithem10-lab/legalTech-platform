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
import { ChevronLeft, Code2, Save, Check, Globe, Webhook } from "lucide-react";
import Link from "next/link";
import { Source_Serif_4 } from "next/font/google";
import { useWorkflowName } from "@/contexts/WorkflowNameContext";
import { renderForm } from "@/lib/renderer";
import { FieldRow } from "./FieldRow";
import type { Field, Theme, Workflow, WorkflowStatus } from "@/types/workflow";

const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "600"] });

// ─── helpers ──────────────────────────────────────────────────────────────────

const PALETTE: { type: Field["type"]; label: string }[] = [
  { type: "text",          label: "Text" },
  { type: "email",         label: "Email" },
  { type: "dropdown",      label: "Dropdown" },
  { type: "radio",         label: "Radio" },
  { type: "file",          label: "File Upload" },
  { type: "dynamic-list",  label: "Dynamic List" },
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

function EmbedModal({ workflowId, onClose }: { workflowId: string; onClose: () => void }) {
  const appUrl =
    typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin)
      : "";
  const snippet = `<script\n  src="${appUrl}/embed.js"\n  data-workflow-id="${workflowId}"\n></script>`;
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl p-6 shadow-xl"
        style={{ background: "#FBF8F2" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className={`text-lg font-semibold mb-1 ${sourceSerif.className}`}
          style={{ color: "#1C2127" }}
        >
          Embed this workflow
        </h2>
        <p className="text-sm mb-4" style={{ color: "#6B7280" }}>
          Paste this snippet inside your website's{" "}
          <code className="text-xs bg-gray-100 px-1 rounded">&lt;body&gt;</code>.
          Changes you save will appear instantly on the next page load — no rebuild needed.
        </p>
        <pre
          className="text-xs p-4 rounded-lg overflow-x-auto mb-4"
          style={{ background: "#1C2127", color: "#86EFAC", fontFamily: "monospace" }}
        >
          {snippet}
        </pre>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md border"
            style={{ borderColor: "#C9C2B4", color: "#374151" }}
          >
            Close
          </button>
          <button
            onClick={copy}
            className="px-4 py-2 text-sm rounded-md text-white flex items-center gap-2"
            style={{ background: copied ? "#166534" : "#1F6F54" }}
          >
            {copied ? <Check size={14} /> : <Code2 size={14} />}
            {copied ? "Copied!" : "Copy snippet"}
          </button>
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

  // Working state (not yet saved)
  const [schema, setSchema]               = useState<Field[]>(initialWorkflow.schema);
  const [theme, setTheme]                 = useState<Theme>(initialWorkflow.theme);
  const [webhookUrl, setWebhookUrl]       = useState(initialWorkflow.webhookUrl);
  const [allowedOrigins, setOrigins]      = useState<string[]>(initialWorkflow.allowedOrigins);
  const [workflowName, setWorkflowName]   = useState(initialWorkflow.name);
  const [status, setStatus]               = useState<WorkflowStatus>(initialWorkflow.status);

  // UI state
  const [selectedId, setSelectedId]       = useState<string | null>(null);
  const [showPalette, setShowPalette]     = useState(false);
  const [showEmbed, setShowEmbed]         = useState(false);
  const [saving, setSaving]               = useState(false);
  const [saved, setSaved]                 = useState(false);
  const [originInput, setOriginInput]     = useState("");

  const previewRef = useRef<HTMLDivElement>(null);
  const id = initialWorkflow.id;

  // Sync AdminNav workflow name
  useEffect(() => { setNavName(workflowName); }, [workflowName, setNavName]);

  // Live preview — re-render whenever schema or theme changes
  useEffect(() => {
    if (!previewRef.current) return;
    return renderForm(previewRef.current, schema, theme);
  }, [schema, theme]);

  // ── DnD sensors ─────────────────────────────────────────────────────────────
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

  // ── API helpers ──────────────────────────────────────────────────────────────
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

  // ── Origins manager ──────────────────────────────────────────────────────────
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

        {/* Editable name */}
        <input
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          onBlur={handleNameBlur}
          className={`flex-1 min-w-0 text-base font-semibold bg-transparent outline-none border-b border-transparent focus:border-gray-300 transition-colors ${sourceSerif.className}`}
          style={{ color: "#1C2127" }}
        />

        {/* Status toggle */}
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

        {/* Embed code */}
        <button
          onClick={() => setShowEmbed(true)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border flex-shrink-0"
          style={{ borderColor: "#C9C2B4", color: "#374151" }}
        >
          <Code2 size={13} /> Embed code
        </button>

        {/* Save */}
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

        {/* LEFT PANE — 260px */}
        <div
          className="flex flex-col overflow-y-auto flex-shrink-0"
          style={{
            width: 260,
            background: "#F3F1EC",
            borderRight: "1px solid #C9C2B4",
          }}
        >
          <div className="px-3 pt-4 pb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6B7280" }}>
              Fields
            </span>
            <span className="text-xs tabular-nums" style={{ color: "#9CA3AF" }}>
              {schema.length}
            </span>
          </div>

          {/* Sortable field list */}
          <div className="px-3 flex-1">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={schema.map((f) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                {schema.map((field, index) => (
                  <FieldRow
                    key={field.id}
                    field={field}
                    index={index}
                    isSelected={selectedId === field.id}
                    onSelect={() =>
                      setSelectedId(selectedId === field.id ? null : field.id)
                    }
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

          {/* Add field */}
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

          {/* Divider */}
          <div style={{ borderTop: "1px solid #C9C2B4" }} />

          {/* Webhook URL */}
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

          {/* Allowed Origins */}
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

        {/* CENTER PANE — flex-1 */}
        <div
          className="flex-1 overflow-y-auto flex flex-col"
          style={{ background: "#E8E6E0" }}
        >
          <div className="px-3 pt-4 pb-2 flex-shrink-0">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6B7280" }}>
              Live Preview
            </span>
          </div>

          {/* Legal pad */}
          <div className="flex-1 px-6 pb-8">
            <div
              className="min-h-full rounded-xl overflow-hidden shadow-sm"
              style={{
                background: "#FBF8F2",
                borderLeft: "4px solid #E8B4AC",
                paddingLeft: 0,
              }}
            >
              <div ref={previewRef} className="p-6" />
            </div>
          </div>
        </div>

        {/* RIGHT PANE — 280px */}
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
            {/* Background color swatches */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "#374151" }}>
                Background
              </label>
              <div className="flex gap-2">
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
                {/* Custom color picker */}
                <label title="Custom color" className="w-8 h-8 rounded-full border-2 flex items-center justify-center cursor-pointer overflow-hidden" style={{ borderColor: "#C9C2B4" }}>
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
                type="range"
                min={0}
                max={16}
                value={theme.radius}
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
          </div>

          {/* Synced live info box */}
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
        <EmbedModal workflowId={id} onClose={() => setShowEmbed(false)} />
      )}
    </div>
  );
}
