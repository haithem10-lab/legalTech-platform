"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import type { Field, DynamicListSubField, DropdownField, RadioField, DynamicListField, FileField, TextField } from "@/types/workflow";

const TYPE_BADGE: Record<Field["type"], { label: string; bg: string; color: string }> = {
  text:          { label: "Text",    bg: "#EFF6FF", color: "#1D4ED8" },
  email:         { label: "Email",   bg: "#F5F3FF", color: "#6D28D9" },
  dropdown:      { label: "Select",  bg: "#FFF7ED", color: "#C2410C" },
  radio:         { label: "Radio",   bg: "#FDF2F8", color: "#9D174D" },
  file:          { label: "File",    bg: "#F0FDF4", color: "#166534" },
  "dynamic-list":{ label: "List",   bg: "#FFFBEB", color: "#92400E" },
};

interface FieldRowProps {
  field: Field;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<Field>) => void;
}

function OptionsEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (opts: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-1 mt-1">
      {options.map((opt, i) => (
        <div key={i} className="flex gap-1">
          <input
            value={opt}
            onChange={(e) => {
              const next = [...options];
              next[i] = e.target.value;
              onChange(next);
            }}
            className="flex-1 px-2 py-1 text-xs border rounded outline-none"
            style={{ borderColor: "#D1D5DB" }}
          />
          <button
            type="button"
            onClick={() => onChange(options.filter((_, j) => j !== i))}
            className="px-2 text-xs text-gray-400 hover:text-red-500"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...options, `Option ${options.length + 1}`])}
        className="text-xs text-left mt-1"
        style={{ color: "#1F6F54" }}
      >
        + Add option
      </button>
    </div>
  );
}

function SubFieldsEditor({
  subFields,
  onChange,
}: {
  subFields: DynamicListSubField[];
  onChange: (sfs: DynamicListSubField[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2 mt-1">
      {subFields.map((sf, i) => (
        <div
          key={sf.id}
          className="flex gap-1 items-center p-2 rounded"
          style={{ background: "#F9FAFB" }}
        >
          <input
            value={sf.label}
            onChange={(e) => {
              const next = [...subFields];
              next[i] = { ...next[i], label: e.target.value };
              onChange(next);
            }}
            className="flex-1 px-2 py-1 text-xs border rounded outline-none"
            style={{ borderColor: "#D1D5DB" }}
            placeholder="Label"
          />
          <select
            value={sf.type}
            onChange={(e) => {
              const next = [...subFields];
              next[i] = { ...next[i], type: e.target.value as DynamicListSubField["type"] };
              onChange(next);
            }}
            className="px-2 py-1 text-xs border rounded outline-none"
            style={{ borderColor: "#D1D5DB" }}
          >
            <option value="text">Text</option>
            <option value="email">Email</option>
            <option value="number">Number</option>
          </select>
          <button
            type="button"
            onClick={() => onChange(subFields.filter((_, j) => j !== i))}
            className="text-xs text-gray-400 hover:text-red-500 px-1"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([
            ...subFields,
            {
              id: `sf-${Date.now()}`,
              label: "New sub-field",
              type: "text",
              required: false,
            },
          ])
        }
        className="text-xs text-left"
        style={{ color: "#1F6F54" }}
      >
        + Add sub-field
      </button>
    </div>
  );
}

function ConfigPanel({ field, onUpdate }: { field: Field; onUpdate: (u: Partial<Field>) => void }) {
  return (
    <div
      className="px-3 py-3 flex flex-col gap-3 text-xs"
      style={{ background: "#F9FAFB", borderTop: "1px solid #E5E7EB" }}
    >
      {/* Label */}
      <div>
        <label className="block font-medium mb-1" style={{ color: "#374151" }}>Label</label>
        <input
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="w-full px-2 py-1.5 border rounded outline-none text-xs"
          style={{ borderColor: "#D1D5DB" }}
        />
      </div>

      {/* Placeholder */}
      <div>
        <label className="block font-medium mb-1" style={{ color: "#374151" }}>Placeholder</label>
        <input
          value={field.placeholder ?? ""}
          onChange={(e) => onUpdate({ placeholder: e.target.value })}
          className="w-full px-2 py-1.5 border rounded outline-none text-xs"
          style={{ borderColor: "#D1D5DB" }}
        />
      </div>

      {/* Helper text */}
      <div>
        <label className="block font-medium mb-1" style={{ color: "#374151" }}>Helper text</label>
        <input
          value={field.helperText ?? ""}
          onChange={(e) => onUpdate({ helperText: e.target.value })}
          className="w-full px-2 py-1.5 border rounded outline-none text-xs"
          style={{ borderColor: "#D1D5DB" }}
        />
      </div>

      {/* Required */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={field.required}
          onChange={(e) => onUpdate({ required: e.target.checked })}
          className="w-4 h-4 rounded"
          style={{ accentColor: "#1F6F54" }}
        />
        <span style={{ color: "#374151" }}>Required</span>
      </label>

      {/* Dropdown / Radio options */}
      {(field.type === "dropdown" || field.type === "radio") && (
        <div>
          <label className="block font-medium mb-1" style={{ color: "#374151" }}>Options</label>
          <OptionsEditor
            options={(field as DropdownField | RadioField).options}
            onChange={(opts) => onUpdate({ options: opts } as Partial<Field>)}
          />
        </div>
      )}

      {/* Dynamic list sub-fields */}
      {field.type === "dynamic-list" && (
        <div>
          <label className="block font-medium mb-1" style={{ color: "#374151" }}>Sub-fields</label>
          <SubFieldsEditor
            subFields={(field as DynamicListField).subFields}
            onChange={(sfs) => onUpdate({ subFields: sfs } as Partial<Field>)}
          />
        </div>
      )}

      {/* File field settings */}
      {field.type === "file" && (
        <>
          <div>
            <label className="block font-medium mb-1" style={{ color: "#374151" }}>
              Accepted types (comma-separated)
            </label>
            <input
              value={(field as FileField).acceptedTypes.join(", ")}
              onChange={(e) =>
                onUpdate({
                  acceptedTypes: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                } as Partial<Field>)
              }
              className="w-full px-2 py-1.5 border rounded outline-none text-xs"
              style={{ borderColor: "#D1D5DB" }}
              placeholder=".pdf, .docx"
            />
          </div>
          <div>
            <label className="block font-medium mb-1" style={{ color: "#374151" }}>
              Max size (MB)
            </label>
            <input
              type="number"
              value={(field as FileField).maxSizeBytes / 1_000_000}
              onChange={(e) =>
                onUpdate({
                  maxSizeBytes: Number(e.target.value) * 1_000_000,
                } as Partial<Field>)
              }
              className="w-full px-2 py-1.5 border rounded outline-none text-xs"
              style={{ borderColor: "#D1D5DB" }}
              min={1}
              max={100}
            />
          </div>
        </>
      )}

      {/* Text field validation */}
      {field.type === "text" && (
        <div>
          <label className="block font-medium mb-1" style={{ color: "#374151" }}>
            Max length
          </label>
          <input
            type="number"
            value={(field as TextField).validation?.maxLength ?? ""}
            onChange={(e) =>
              onUpdate({
                validation: { maxLength: e.target.value ? Number(e.target.value) : undefined },
              } as Partial<Field>)
            }
            className="w-full px-2 py-1.5 border rounded outline-none text-xs"
            style={{ borderColor: "#D1D5DB" }}
            placeholder="Unlimited"
            min={1}
          />
        </div>
      )}
    </div>
  );
}

export function FieldRow({ field, index, isSelected, onSelect, onDelete, onUpdate }: FieldRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id });

  const badge = TYPE_BADGE[field.type];

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        border: "1px solid",
        borderColor: isSelected ? "#1F6F54" : "#E5E7EB",
        borderRadius: 6,
        background: "#FFFFFF",
        marginBottom: 6,
      }}
    >
      {/* Row header */}
      <div
        className="flex items-center gap-1.5 px-2 py-2 cursor-pointer select-none"
        onClick={onSelect}
      >
        {/* Drag handle — stop click propagation so clicking handle doesn't toggle config */}
        <span
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 flex-shrink-0"
        >
          <GripVertical size={14} />
        </span>

        {/* Clause number */}
        <span
          className="text-xs font-mono flex-shrink-0"
          style={{ color: "#1F6F54", minWidth: 26 }}
        >
          1.{index + 1}
        </span>

        {/* Label */}
        <span className="flex-1 text-xs truncate" style={{ color: "#1C2127" }}>
          {field.label || "Untitled field"}
        </span>

        {/* Type badge */}
        <span
          className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
          style={{ background: badge.bg, color: badge.color, fontSize: 10 }}
        >
          {badge.label}
        </span>

        {/* Chevron */}
        <span className="text-gray-400 flex-shrink-0">
          {isSelected ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </span>

        {/* Delete */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-gray-300 hover:text-red-500 flex-shrink-0 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Inline config panel */}
      {isSelected && <ConfigPanel field={field} onUpdate={onUpdate} />}
    </div>
  );
}
