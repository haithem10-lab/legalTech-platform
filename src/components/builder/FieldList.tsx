"use client";

import { useState, useCallback } from "react";
import { X } from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { FieldRow } from "@/app/admin/workflows/[id]/build/FieldRow";
import { Eyebrow } from "./shared";
import type { Field, Theme } from "@/types/workflow";

const FIELD_TYPES: { type: Field["type"]; label: string }[] = [
  { type: "text",         label: "Text"     },
  { type: "email",        label: "Email"    },
  { type: "dropdown",     label: "Dropdown" },
  { type: "radio",        label: "Radio"    },
  { type: "file",         label: "File"     },
  { type: "dynamic-list", label: "List"     },
];

function createField(type: Field["type"]): Field {
  const id   = `field-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
  const base = { id, label: "", required: false };
  switch (type) {
    case "text":         return { ...base, type: "text" };
    case "email":        return { ...base, type: "email" };
    case "dropdown":     return { ...base, type: "dropdown", options: ["Option 1", "Option 2"] };
    case "radio":        return { ...base, type: "radio",    options: ["Option 1", "Option 2"] };
    case "file":         return { ...base, type: "file", acceptedTypes: [".pdf"], maxSizeBytes: 10_000_000 };
    case "dynamic-list": return { ...base, type: "dynamic-list",
      subFields: [{ id: `sf-${Date.now()}`, label: "Name", type: "text", required: true }] };
  }
}

export interface FieldListProps {
  schema: Field[];
  selectedId: string | null;
  webhookUrl: string;
  allowedOrigins: string[];
  onSchemaChange: (schema: Field[]) => void;
  onSelectField: (id: string | null) => void;
  onWebhookUrlChange: (url: string) => void;
  onOriginsChange: (origins: string[]) => void;
  onAiApply: (result: { name: string; schema: Field[]; theme: Theme }) => void;
}

export function FieldList({
  schema, selectedId, webhookUrl, allowedOrigins,
  onSchemaChange, onSelectField, onWebhookUrlChange, onOriginsChange, onAiApply,
}: FieldListProps) {
  const [showPalette, setShowPalette] = useState(false);
  const [originInput, setOriginInput] = useState("");

  // AI state (local — only affects this panel until Apply is pressed)
  const [showAI,    setShowAI]    = useState(false);
  const [aiPrompt,  setAiPrompt]  = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError,   setAiError]   = useState<string | null>(null);
  const [aiPreview, setAiPreview] = useState<{ name: string; schema: Field[]; theme: Theme } | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (over && active.id !== over.id) {
      const oi = schema.findIndex((f) => f.id === active.id);
      const ni = schema.findIndex((f) => f.id === over.id);
      onSchemaChange(arrayMove(schema, oi, ni));
    }
  }

  function addField(type: Field["type"]) {
    const f = createField(type);
    onSchemaChange([...schema, f]);
    onSelectField(f.id);
    setShowPalette(false);
  }

  function deleteField(fieldId: string) {
    onSchemaChange(schema.filter((f) => f.id !== fieldId));
    if (selectedId === fieldId) onSelectField(null);
  }

  const updateField = useCallback((fieldId: string, updates: Partial<Field>) => {
    onSchemaChange(schema.map((f) => (f.id === fieldId ? ({ ...f, ...updates } as Field) : f)));
  }, [schema, onSchemaChange]);

  function addOrigin() {
    const val = originInput.trim().replace(/\/$/, "");
    if (!val || allowedOrigins.includes(val)) return;
    onOriginsChange([...allowedOrigins, val]);
    setOriginInput("");
  }

  async function handleAiGenerate() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true); setAiError(null); setAiPreview(null);
    try {
      const res  = await fetch("/api/admin/ai/generate-layout", {
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
    onAiApply(aiPreview);
    setAiPreview(null);
    setAiPrompt("");
    setShowAI(false);
  }

  return (
    <div className="flex-shrink-0 flex flex-col"
      style={{ width: 260, background: "#FBF8F2", borderRight: "1px solid #C9C2B4" }}>

      {/* AI Generator */}
      <div style={{ borderBottom: "1px solid #EDE8DD", flexShrink: 0 }}>
        <button
          onClick={() => { setShowAI((p) => !p); setAiError(null); setAiPreview(null); }}
          className={`w-full flex items-center gap-2 px-4 py-2.5 font-medium transition-colors font-sans`}
          style={{ fontSize: 12, background: "none", border: "none", cursor: "pointer", color: showAI ? "#1C2127" : "#5C564C" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#F3F1EC"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}>
          <span style={{ fontSize: 14 }}>✨</span>
          Generate with AI
          <span className="ml-auto" style={{ fontSize: 10, color: "#8A8270" }}>{showAI ? "▲" : "▼"}</span>
        </button>

        {showAI && (
          <div className="px-3 pb-3 flex flex-col gap-2">
            {aiPreview ? (
              <div className="rounded-lg p-3 flex flex-col gap-2"
                style={{ background: "#E6F0EA", border: "1px solid #BCD9C8" }}>
                <p className={`font-semibold font-sans`} style={{ fontSize: 12, color: "#44645D", margin: 0 }}>
                  ✓ Generated &ldquo;{aiPreview.name}&rdquo;
                </p>
                <p style={{ fontSize: 11, color: "#3A6B57", margin: 0 }}>
                  {aiPreview.schema.length} fields · {aiPreview.theme.font} · {aiPreview.theme.density}
                </p>
                <div className="flex gap-1.5 mt-1">
                  <button onClick={handleAiApply}
                    className={`flex-1 py-1.5 font-semibold rounded-md text-white font-sans`}
                    style={{ fontSize: 12, background: "#44645D", border: "none", cursor: "pointer" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#374F49"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#44645D"; }}>
                    Apply
                  </button>
                  <button onClick={() => setAiPreview(null)}
                    className={`flex-1 py-1.5 font-semibold rounded-md font-sans`}
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
                  className={`w-full resize-none rounded-lg border border-line px-3 py-2 outline-none bg-white font-sans`}
                  style={{ fontSize: 12, color: "#1C2127", lineHeight: 1.5 }}
                />
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 10, color: "#B6AE9F" }}>{aiPrompt.length}/300</span>
                  <button onClick={handleAiGenerate} disabled={aiLoading || !aiPrompt.trim()}
                    className={`flex items-center gap-1.5 font-semibold text-white rounded-md disabled:opacity-50 font-sans`}
                    style={{ fontSize: 12, padding: "6px 14px", background: "#44645D", border: "none", cursor: "pointer" }}
                    onMouseEnter={(e) => { if (!aiLoading) (e.currentTarget as HTMLButtonElement).style.background = "#374F49"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#44645D"; }}>
                    {aiLoading ? (
                      <><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} /> Generating…</>
                    ) : "Generate"}
                  </button>
                </div>
                {aiError && <p style={{ fontSize: 12, color: "#B23A2E", margin: 0 }}>{aiError}</p>}
              </>
            )}
          </div>
        )}
      </div>

      {/* Scrollable field list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <Eyebrow>Form Fields</Eyebrow>
          <span className="font-mono" style={{ fontSize: 11, color: "#8A8270" }}>{schema.length}</span>
        </div>

        <div className="px-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={schema.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              {schema.map((field, index) => (
                <FieldRow key={field.id} field={field} index={index}
                  isSelected={selectedId === field.id}
                  onSelect={() => onSelectField(selectedId === field.id ? null : field.id)}
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

        {/* Palette */}
        {showPalette && (
          <div className="mx-3 mt-2 mb-1 rounded-lg overflow-hidden"
            style={{ border: "1px solid #E4E0D6", background: "#FBF8F2" }}>
            <div className="grid grid-cols-2">
              {FIELD_TYPES.map(({ type, label }, i) => (
                <button key={type} onClick={() => addField(type)}
                  className={`py-2.5 text-left px-3 transition-colors font-sans`}
                  style={{
                    fontSize: 13, fontWeight: 500, color: "#1C2127",
                    background: "none", cursor: "pointer", border: "none",
                    borderTop: i >= 2 ? "1px solid #F3F1EC" : "none",
                    borderRight: i % 2 === 0 ? "1px solid #F3F1EC" : "none",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#E6F0EA"; (e.currentTarget as HTMLButtonElement).style.color = "#44645D"; }}
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
            className={`w-full py-2 font-semibold transition-colors font-sans`}
            style={{
              fontSize: 13, border: "1.5px dashed #C9C2B4", borderRadius: 8,
              background: showPalette ? "#E6F0EA" : "transparent",
              color: showPalette ? "#44645D" : "#8A8270", cursor: "pointer",
            }}
            onMouseEnter={(e) => { if (!showPalette) { (e.currentTarget as HTMLButtonElement).style.borderColor = "#44645D"; (e.currentTarget as HTMLButtonElement).style.color = "#44645D"; } }}
            onMouseLeave={(e) => { if (!showPalette) { (e.currentTarget as HTMLButtonElement).style.borderColor = "#C9C2B4"; (e.currentTarget as HTMLButtonElement).style.color = "#8A8270"; } }}>
            {showPalette ? "↑ Close" : "+ Add field"}
          </button>
        </div>
      </div>

      {/* Pinned bottom: webhook + origins */}
      <div className="flex-shrink-0" style={{ borderTop: "1px solid #EDE8DD" }}>
        <div className="px-4 pt-3 pb-3">
          <div className="mb-1.5"><Eyebrow>Webhook URL</Eyebrow></div>
          <input type="url" value={webhookUrl} onChange={(e) => onWebhookUrlChange(e.target.value)}
            placeholder="https://yourserver.com/hook"
            className={`w-full px-2.5 py-1.5 border border-line rounded-md outline-none bg-white font-mono`}
            style={{ fontSize: 11, color: "#1C2127" }} />
        </div>
        <div className="px-4 pb-4" style={{ borderTop: "1px solid #F3F1EC" }}>
          <div className="mb-1.5 pt-3"><Eyebrow>Allowed Origins</Eyebrow></div>
          {allowedOrigins.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {allowedOrigins.map((o) => (
                <span key={o} className={`flex items-center gap-1 font-mono`}
                  style={{ fontSize: 10, background: "#F3F1EC", border: "1px solid #E0D9CB", borderRadius: 20, padding: "2px 6px 2px 10px", color: "#1C2127" }}>
                  {o}
                  <button onClick={() => onOriginsChange(allowedOrigins.filter((x) => x !== o))}
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
              style={{ fontSize: 11, background: "#44645D", border: "none", cursor: "pointer" }}>Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}
