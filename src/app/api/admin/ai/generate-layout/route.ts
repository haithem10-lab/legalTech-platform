import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import OpenAI from "openai";
import { authOptions } from "@/lib/auth";
import type { Field, Theme } from "@/types/workflow";

const systemPrompt = `You are a legal form builder assistant.
When given a description of a legal intake form,
you generate a complete form configuration.

You must respond with ONLY valid JSON matching
this exact structure — no markdown, no explanation,
no backticks, just raw JSON:

{
  "name": "string — workflow name",
  "schema": [
    {
      "id": "field-1",
      "type": "text" | "email" | "dropdown" | "radio" | "file" | "dynamic-list",
      "label": "string",
      "placeholder": "string (optional)",
      "required": true | false,
      "options": ["option1", "option2"],
      "subFields": [
        { "id": "sub-1", "label": "string", "type": "text" }
      ]
    }
  ],
  "theme": {
    "bgColor": "#hex",
    "font": "Inter" | "Georgia" | "Courier New",
    "radius": 0-16,
    "density": "compact" | "spacious",
    "buttonColor": "#hex",
    "buttonTextColor": "#FFFFFF" | "#1C2127"
  }
}

Rules:
- Generate 3-7 fields appropriate for the legal use case
- Choose theme colors appropriate for the tone described (friendly/light = warm colors, formal = dark/navy)
- Always include at least one text or email field
- File upload field only when documents are needed
- Dynamic list only when multiple parties are involved
- Required = true for critical legal fields
- Return ONLY the JSON object, nothing else`;

function validateField(f: unknown, index: number): Field {
  if (!f || typeof f !== "object") throw new Error("Invalid field");
  const field = f as Record<string, unknown>;
  const validTypes = ["text", "email", "dropdown", "radio", "file", "dynamic-list"];
  if (!validTypes.includes(field.type as string)) throw new Error(`Invalid type: ${field.type}`);

  const id = (typeof field.id === "string" && field.id)
    ? field.id
    : `field-${Date.now()}-${index}`;

  const base = {
    id,
    type: field.type as Field["type"],
    label: typeof field.label === "string" ? field.label : "Field",
    required: field.required === true,
    ...(field.placeholder ? { placeholder: String(field.placeholder) } : {}),
  };

  if (field.type === "dropdown" || field.type === "radio") {
    return { ...base, type: field.type, options: Array.isArray(field.options) ? field.options.map(String) : ["Option 1", "Option 2"] };
  }
  if (field.type === "file") {
    return { ...base, type: "file", acceptedTypes: [".pdf", ".doc", ".docx"], maxSizeBytes: 10_000_000 };
  }
  if (field.type === "dynamic-list") {
    const subs = Array.isArray(field.subFields) ? field.subFields : [];
    return {
      ...base, type: "dynamic-list",
      subFields: subs.length > 0
        ? subs.map((s, si) => ({
            id: (s as Record<string, unknown>).id ? String((s as Record<string, unknown>).id) : `sub-${si}`,
            label: String((s as Record<string, unknown>).label ?? "Item"),
            type: "text" as const,
            required: true,
          }))
        : [{ id: "sub-0", label: "Name", type: "text" as const, required: true }],
    };
  }
  return base as Field;
}

function validateTheme(t: unknown): Theme {
  if (!t || typeof t !== "object") return fallbackTheme();
  const theme = t as Record<string, unknown>;
  return {
    bgColor:         typeof theme.bgColor === "string"         ? theme.bgColor         : "#FBF8F2",
    font:            ["Inter","Georgia","Courier New"].includes(theme.font as string) ? (theme.font as string) : "Inter",
    radius:          typeof theme.radius === "number"          ? Math.min(16, Math.max(0, theme.radius)) : 8,
    density:         theme.density === "spacious"              ? "spacious"            : "compact",
    buttonColor:     typeof theme.buttonColor === "string"     ? theme.buttonColor     : "#1F6F54",
    buttonTextColor: theme.buttonTextColor === "#1C2127"       ? "#1C2127"             : "#FFFFFF",
  };
}

function fallbackTheme(): Theme {
  return { bgColor: "#FBF8F2", font: "Inter", radius: 8, density: "compact", buttonColor: "#1F6F54", buttonTextColor: "#FFFFFF" };
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prompt } = await req.json();
  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let raw: string;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: prompt.trim().slice(0, 300) },
      ],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });
    raw = completion.choices[0]?.message?.content ?? "";
  } catch {
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid AI response" }, { status: 500 });
  }

  if (!Array.isArray(parsed.schema) || !parsed.theme) {
    return NextResponse.json({ error: "Schema validation failed" }, { status: 500 });
  }

  let schema: Field[];
  try {
    schema = (parsed.schema as unknown[]).map((f, i) => validateField(f, i));
  } catch {
    return NextResponse.json({ error: "Schema validation failed" }, { status: 500 });
  }

  const theme  = validateTheme(parsed.theme);
  const name   = typeof parsed.name === "string" ? parsed.name : "Generated Form";

  return NextResponse.json({ name, schema, theme });
}
