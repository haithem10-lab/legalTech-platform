"use client";

import { Seg, Eyebrow } from "./shared";
import type { Theme } from "@/types/workflow";

const BG_SWATCHES = [
  { color: "#FBF8F2", label: "Paper" },
  { color: "#1C2127", label: "Slate" },
  { color: "#EFEEE9", label: "Mist"  },
];

const FONTS = ["Inter", "Georgia", "Courier New"];

interface ThemePanelProps {
  theme: Theme;
  onChange: (theme: Theme) => void;
}

export function ThemePanel({ theme, onChange }: ThemePanelProps) {
  const set = (patch: Partial<Theme>) => onChange({ ...theme, ...patch });

  return (
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
              <button key={color} title={label} onClick={() => set({ bgColor: color })}
                className="flex flex-col items-center gap-1.5">
                <span style={{
                  display: "block", width: 34, height: 34, borderRadius: 8,
                  background: color, border: "none", cursor: "pointer",
                  boxShadow: active
                    ? "0 0 0 2px #FBF8F2, 0 0 0 4px #44645D"
                    : "inset 0 0 0 1px rgba(28,33,39,0.12)",
                  transition: "box-shadow 0.15s",
                }} />
                <span style={{ fontSize: 10, color: "#8A8270" }}>{label}</span>
              </button>
            );
          })}
          <label className="flex flex-col items-center gap-1.5 cursor-pointer" title="Custom">
            <span style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 34, height: 34, borderRadius: 8, overflow: "hidden",
              background: BG_SWATCHES.some((s) => s.color === theme.bgColor) ? "#fff" : theme.bgColor,
              boxShadow: "inset 0 0 0 1px rgba(28,33,39,0.12)", position: "relative",
            }}>
              <input type="color" value={theme.bgColor} onChange={(e) => set({ bgColor: e.target.value })}
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
          <span className="font-mono" style={{ fontSize: 12, color: "#44645D", fontWeight: 600 }}>{theme.radius}px</span>
        </div>
        <input type="range" min={0} max={16} value={theme.radius}
          onChange={(e) => set({ radius: Number(e.target.value) })}
          className="w-full" style={{ accentColor: "#44645D" }} />
      </div>

      {/* Density */}
      <div className="mb-5">
        <div className="mb-2"><Eyebrow>Density</Eyebrow></div>
        <Seg
          options={[{ value: "compact", label: "Compact" }, { value: "spacious", label: "Spacious" }]}
          value={theme.density}
          onChange={(v) => set({ density: v })}
        />
      </div>

      {/* Font */}
      <div className="mb-5">
        <div className="mb-2"><Eyebrow>Font</Eyebrow></div>
        <div className="flex flex-col gap-1.5">
          {FONTS.map((f) => (
            <button key={f} onClick={() => set({ font: f })}
              className="w-full text-left px-3 py-2.5 rounded-lg border-2 transition-colors text-sm"
              style={{
                fontFamily: `${f}, sans-serif`,
                borderColor: theme.font === f ? "#44645D" : "#E4E0D6",
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
          <span style={{ width: 32, height: 32, borderRadius: 8, background: theme.buttonColor, flexShrink: 0, border: "1px solid rgba(28,33,39,0.12)" }} />
          <input type="color" value={theme.buttonColor} onChange={(e) => set({ buttonColor: e.target.value })}
            style={{ width: 32, height: 32, padding: 0, border: "none", cursor: "pointer", background: "none", flexShrink: 0 }} />
          <input type="text" value={theme.buttonColor}
            onChange={(e) => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) set({ buttonColor: e.target.value }); }}
            className={`flex-1 px-2 py-1.5 border border-line rounded-md outline-none font-mono`}
            style={{ fontSize: 12, color: "#1C2127", background: "#fff" }} maxLength={7} />
        </div>
      </div>

      {/* Button text */}
      <div className="mb-5">
        <div className="mb-2"><Eyebrow>Button text</Eyebrow></div>
        <Seg
          options={[{ value: "#FFFFFF", label: "Light" }, { value: "#1C2127", label: "Dark" }]}
          value={theme.buttonTextColor === "#1C2127" ? "#1C2127" : "#FFFFFF"}
          onChange={(v) => set({ buttonTextColor: v })}
        />
      </div>

      {/* Button size */}
      <div className="mb-5">
        <div className="mb-2"><Eyebrow>Button size</Eyebrow></div>
        <Seg
          options={[{ value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }]}
          value={(theme.buttonSize ?? "md") as "sm" | "md" | "lg"}
          onChange={(v) => set({ buttonSize: v })}
        />
      </div>

    </div>
  );
}
