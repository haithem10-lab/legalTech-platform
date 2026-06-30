"use client";

import type { RefObject } from "react";
import type { Theme } from "@/types/workflow";

interface PreviewPaneProps {
  previewRef: RefObject<HTMLDivElement>;
  theme: Theme;
}

export function PreviewPane({ previewRef, theme }: PreviewPaneProps) {
  return (
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
          <div style={{ position: "absolute", left: 48, top: 0, bottom: 0, width: 1, background: "rgba(178,58,46,0.35)", zIndex: 1, pointerEvents: "none" }} />
          <div ref={previewRef} style={{ position: "relative", zIndex: 2 }} />
        </div>
      </div>
    </div>
  );
}
