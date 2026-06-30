"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, Check, Code2 } from "lucide-react";
import Link from "next/link";
import { useWorkflowName } from "@/contexts/WorkflowNameContext";
import { renderForm } from "@/lib/renderer";
import { StatusPill } from "@/components/builder/shared";
import { FieldList } from "@/components/builder/FieldList";
import { ThemePanel } from "@/components/builder/ThemePanel";
import { PreviewPane } from "@/components/builder/PreviewPane";
import { EmbedModal } from "@/components/builder/EmbedModal";
import type { Field, Theme, Workflow, WorkflowStatus } from "@/types/workflow";

interface Props { initialWorkflow: Workflow; }

export function BuilderClient({ initialWorkflow }: Props) {
  const { setWorkflowName: setNavName } = useWorkflowName();

  const [schema,        setSchema]        = useState<Field[]>(initialWorkflow.schema);
  const [theme,         setTheme]         = useState<Theme>(initialWorkflow.theme);
  const [webhookUrl,    setWebhookUrl]    = useState(initialWorkflow.webhookUrl);
  const [allowedOrigins, setOrigins]      = useState<string[]>(initialWorkflow.allowedOrigins);
  const [workflowName,  setWorkflowName]  = useState(initialWorkflow.name);
  const [status,        setStatus]        = useState<WorkflowStatus>(initialWorkflow.status);
  const [hmacSecret,    setHmacSecret]    = useState(initialWorkflow.hmacSecret);
  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [showEmbed,     setShowEmbed]     = useState(false);
  const [savedAt,       setSavedAt]       = useState<Date | null>(null);
  const [saving,        setSaving]        = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const id = initialWorkflow.id;

  useEffect(() => { setNavName(workflowName); }, [workflowName, setNavName]);
  useEffect(() => {
    if (!previewRef.current) return;
    return renderForm(previewRef.current, schema, theme, workflowName);
  }, [schema, theme, workflowName]);

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

  async function handleSaveOrigins(origins: string[]) {
    await patchWorkflow({ allowedOrigins: origins });
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

  function handleAiApply(result: { name: string; schema: Field[]; theme: Theme }) {
    setSchema(result.schema);
    setTheme(result.theme);
    setWorkflowName(result.name);
    setNavName(result.name);
  }

  const savedLabel = saving
    ? "Saving…"
    : savedAt
    ? `Saved ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : null;

  return (
    <div className={`flex flex-col font-sans`} style={{ height: "calc(100vh - 56px)" }}>

      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 flex-shrink-0"
        style={{ height: 60, background: "#FBF8F2", borderBottom: "1px solid #C9C2B4" }}>

        <Link href="/admin/workflows"
          className="flex items-center flex-shrink-0 transition-colors rounded-md p-1"
          style={{ color: "#8A8270" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#F3F1EC"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}>
          <ChevronLeft size={18} />
        </Link>

        <input value={workflowName} onChange={(e) => setWorkflowName(e.target.value)}
          placeholder="Untitled workflow"
          className={`bg-transparent outline-none border-b border-transparent focus:border-line transition-colors min-w-0 font-serif`}
          style={{ fontSize: 19, fontWeight: 600, color: "#1C2127", width: 220 }} />

        <button onClick={toggleStatus}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
          <StatusPill status={status} />
        </button>

        {savedLabel && (
          <span style={{ fontSize: 12, color: "#8A8270", flexShrink: 0 }}>{savedLabel}</span>
        )}

        <div className="flex-1" />

        <button onClick={() => setShowEmbed(true)}
          className={`flex items-center font-semibold transition-colors font-sans`}
          style={{ fontSize: 13, padding: "8px 14px", borderRadius: 8, color: "#44645D", background: "#FBF8F2", border: "1px solid #44645D", cursor: "pointer", flexShrink: 0 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#E6F0EA"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#FBF8F2"; }}>
          <Code2 size={13} style={{ marginRight: 6 }} />
          Embed code
        </button>

        <button onClick={handleSave} disabled={saving}
          className={`flex items-center gap-1.5 font-semibold text-white transition-colors disabled:opacity-60 font-sans`}
          style={{ fontSize: 13, padding: "9px 16px", borderRadius: 8, background: "#44645D", border: "none", cursor: "pointer", boxShadow: "0 1px 2px rgba(28,33,39,0.12)", flexShrink: 0 }}
          onMouseEnter={(e) => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = "#374F49"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#44645D"; }}>
          {saving ? "Saving…" : <><Check size={13} /> Save</>}
        </button>
      </div>

      {/* 3-column body */}
      <div className="flex flex-1 overflow-hidden">
        <FieldList
          schema={schema}
          selectedId={selectedId}
          webhookUrl={webhookUrl}
          allowedOrigins={allowedOrigins}
          onSchemaChange={setSchema}
          onSelectField={setSelectedId}
          onWebhookUrlChange={setWebhookUrl}
          onOriginsChange={setOrigins}
          onAiApply={handleAiApply}
        />

        <PreviewPane previewRef={previewRef} theme={theme} />

        <ThemePanel theme={theme} onChange={setTheme} />
      </div>

      {showEmbed && (
        <EmbedModal
          workflowId={id} workflowName={workflowName}
          allowedOrigins={allowedOrigins} hmacSecret={hmacSecret}
          onOriginsChange={setOrigins} onSaveOrigins={handleSaveOrigins}
          onRegenerateSecret={handleRegenerateSecret}
          onClose={() => setShowEmbed(false)}
        />
      )}
    </div>
  );
}
