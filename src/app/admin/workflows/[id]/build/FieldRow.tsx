"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp } from "lucide-react";
import type {
  Field, DynamicListSubField, DropdownField, RadioField,
  DynamicListField, FileField, TextField,
} from "@/types/workflow";

const TYPE_LABEL: Record<Field["type"], string> = {
  text:           "Text",
  email:          "Email",
  dropdown:       "Select",
  radio:          "Radio",
  file:           "File",
  "dynamic-list": "List",
};

// ─── Sub-editors ──────────────────────────────────────────────────────────────

function OptionsEditor({ options, onChange }: { options: string[]; onChange: (o: string[]) => void }) {
  return (
    <div className="flex flex-col gap-1.5 mt-1">
      {options.map((opt, i) => (
        <div key={i} className="flex gap-1.5">
          <input value={opt}
            onChange={(e) => { const n = [...options]; n[i] = e.target.value; onChange(n); }}
            className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-line rounded-xs outline-none text-ink"
          />
          <button type="button" onClick={() => onChange(options.filter((_, j) => j !== i))}
            className="px-2 text-sm text-line hover:text-danger transition-colors">×</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...options, `Option ${options.length + 1}`])}
        className="text-xs text-left text-primary hover:underline mt-0.5">
        + Add option
      </button>
    </div>
  );
}

function SubFieldsEditor({ subFields, onChange }: { subFields: DynamicListSubField[]; onChange: (s: DynamicListSubField[]) => void }) {
  return (
    <div className="flex flex-col gap-2 mt-1">
      {subFields.map((sf, i) => (
        <div key={sf.id} className="flex gap-1.5 items-center p-2 rounded-xs bg-canvas border border-line-divider">
          <input value={sf.label}
            onChange={(e) => { const n = [...subFields]; n[i] = { ...n[i], label: e.target.value }; onChange(n); }}
            className="flex-1 px-2 py-1 text-xs bg-white border border-line rounded-xs outline-none" placeholder="Label" />
          <select value={sf.type}
            onChange={(e) => { const n = [...subFields]; n[i] = { ...n[i], type: e.target.value as DynamicListSubField["type"] }; onChange(n); }}
            className="px-2 py-1 text-xs bg-white border border-line rounded-xs outline-none">
            <option value="text">Text</option>
            <option value="email">Email</option>
            <option value="number">Number</option>
          </select>
          <button type="button" onClick={() => onChange(subFields.filter((_, j) => j !== i))}
            className="text-sm text-line hover:text-danger transition-colors">×</button>
        </div>
      ))}
      <button type="button"
        onClick={() => onChange([...subFields, { id: `sf-${Date.now()}`, label: "New sub-field", type: "text", required: false }])}
        className="text-xs text-primary hover:underline text-left">+ Add sub-field</button>
    </div>
  );
}

function ConfigPanel({ field, onUpdate }: { field: Field; onUpdate: (u: Partial<Field>) => void }) {
  const lbl = "block text-xs font-medium text-muted mb-1";
  const inp = "w-full px-2.5 py-1.5 text-xs bg-white border border-line rounded-xs outline-none text-ink focus:border-primary transition-colors";
  return (
    <div className="px-3 py-3 bg-canvas border-t border-line-divider flex flex-col gap-3">
      <div><label className={lbl}>Label</label>
        <input value={field.label} onChange={(e) => onUpdate({ label: e.target.value })} className={inp} placeholder="e.g. Full name" /></div>
      <div><label className={lbl}>Placeholder</label>
        <input value={field.placeholder ?? ""} onChange={(e) => onUpdate({ placeholder: e.target.value })} className={inp} /></div>
      <div><label className={lbl}>Helper text</label>
        <input value={field.helperText ?? ""} onChange={(e) => onUpdate({ helperText: e.target.value })} className={inp} /></div>
      <label className="flex items-center gap-2 text-xs text-body2 cursor-pointer select-none">
        <input type="checkbox" checked={field.required}
          onChange={(e) => onUpdate({ required: e.target.checked })}
          className="w-3.5 h-3.5 rounded-xs accent-primary" />Required
      </label>
      {(field.type === "dropdown" || field.type === "radio") && (
        <div><p className={lbl}>Options</p>
          <OptionsEditor options={(field as DropdownField | RadioField).options}
            onChange={(o) => onUpdate({ options: o } as Partial<Field>)} /></div>
      )}
      {field.type === "dynamic-list" && (
        <div><p className={lbl}>Sub-fields</p>
          <SubFieldsEditor subFields={(field as DynamicListField).subFields}
            onChange={(s) => onUpdate({ subFields: s } as Partial<Field>)} /></div>
      )}
      {field.type === "file" && (<>
        <div><p className={lbl}>Accepted types</p>
          <input value={(field as FileField).acceptedTypes.join(", ")}
            onChange={(e) => onUpdate({ acceptedTypes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } as Partial<Field>)}
            className={inp} placeholder=".pdf, .docx" /></div>
        <div><p className={lbl}>Max size (MB)</p>
          <input type="number"
            value={(field as FileField).maxSizeBytes / 1_000_000}
            onChange={(e) => onUpdate({ maxSizeBytes: Number(e.target.value) * 1_000_000 } as Partial<Field>)}
            className={inp} min={1} max={100} /></div>
      </>)}
      {field.type === "text" && (
        <div><p className={lbl}>Max length</p>
          <input type="number"
            value={(field as TextField).validation?.maxLength ?? ""}
            onChange={(e) => onUpdate({ validation: { maxLength: e.target.value ? Number(e.target.value) : undefined } } as Partial<Field>)}
            className={inp} placeholder="Unlimited" min={1} /></div>
      )}
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

interface FieldRowProps {
  field: Field;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<Field>) => void;
}

function DotHandle() {
  return (
    <span style={{ display: "grid", gridTemplateColumns: "repeat(2, 3px)", gap: 2.5, flexShrink: 0 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <span key={i} style={{ width: 3, height: 3, borderRadius: "50%", background: "#C9C2B4", display: "block" }} />
      ))}
    </span>
  );
}

export function FieldRow({ field, index, isSelected, onSelect, onDelete, onUpdate }: FieldRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });

  return (
    <div
      ref={setNodeRef}
      className="group"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        boxShadow: isSelected ? "inset 0 0 0 1px #BCD9C8" : undefined,
        background: isSelected ? "#E6F0EA" : undefined,
        borderRadius: 6,
        marginBottom: 1,
      }}
    >
      {/* Main row */}
      <div
        className="flex items-center gap-2.5 cursor-pointer select-none transition-colors"
        style={{ height: 40, padding: "0 10px 0 8px" }}
        onClick={onSelect}
        onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "#F3F1EC"; }}
        onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = ""; }}
      >
        {/* 6-dot drag handle — hover only */}
        <span
          {...attributes} {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing flex-shrink-0"
        >
          <DotHandle />
        </span>

        {/* Clause number */}
        <span className="font-mono flex-shrink-0 text-primary font-semibold" style={{ fontSize: 11, minWidth: 24 }}>
          1.{index + 1}
        </span>

        {/* Label */}
        <span className="flex-1 min-w-0 truncate font-sans text-ink font-medium" style={{ fontSize: 13 }}>
          {field.label || "Untitled field"}
        </span>

        {/* Type badge */}
        <span className="flex-shrink-0 font-sans uppercase font-semibold bg-canvas border border-line-light rounded-xs px-1.5 py-0.5"
          style={{ fontSize: 10, color: "#8A8270" }}>
          {TYPE_LABEL[field.type]}
        </span>

        {/* Chevron */}
        <span className="flex-shrink-0 text-line">
          {isSelected ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </span>

        {/* Delete — hover only */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-line hover:text-danger"
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0, fontSize: 14, lineHeight: 1 }}
        >×</button>
      </div>

      {isSelected && <ConfigPanel field={field} onUpdate={onUpdate} />}
    </div>
  );
}
