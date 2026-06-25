"use client";

import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { FileText, LogOut } from "lucide-react";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import { useWorkflowName } from "@/contexts/WorkflowNameContext";

const mono  = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500"] });
const inter = Inter({ subsets: ["latin"] });

interface Props { email?: string | null }

export function AdminNav({ email }: Props) {
  const { workflowName } = useWorkflowName();
  const pathname = usePathname();

  // Only show workflow name when inside the builder
  const inBuilder = /\/admin\/workflows\/[^/]+\/build/.test(pathname ?? "");
  const showName  = inBuilder && !!workflowName;

  // Derive initials from email
  const initials = email ? email.slice(0, 2).toUpperCase() : "–";

  return (
    <header
      className={`flex items-center h-14 px-6 gap-4 shrink-0 ${inter.className}`}
      style={{ background: "#1C2127", borderBottom: "1px solid #2A3038" }}
    >
      {/* Left: logo */}
      <div className="flex items-center gap-2 min-w-[160px]">
        <FileText size={18} color="#1F6F54" />
        <span className="font-semibold text-sm tracking-wide text-white">
          LegalTech
        </span>
      </div>

      {/* Center: active workflow name (builder only) */}
      <div className="flex-1 flex justify-center">
        {showName && (
          <span
            className={`text-sm truncate max-w-xs ${mono.className}`}
            style={{ color: "#7A8290", fontSize: 12 }}
          >
            {workflowName}
          </span>
        )}
      </div>

      {/* Right: avatar + sign-out */}
      <div className="min-w-[160px] flex items-center justify-end gap-3">
        {/* Avatar circle */}
        <div
          className="flex items-center justify-center flex-shrink-0 font-semibold"
          style={{
            width: 30, height: 30, borderRadius: "50%",
            background: "#1F6F54",
            color: "#fff", fontSize: 11,
            letterSpacing: "0.04em",
          }}
        >
          {initials}
        </div>

        {/* Sign out button */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1.5 font-medium transition-all"
          style={{
            fontSize: 12, color: "#7A8290",
            background: "transparent",
            border: "1px solid #2A3038",
            borderRadius: 7, padding: "5px 11px",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#242C36";
            (e.currentTarget as HTMLButtonElement).style.color = "#CBD5E1";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#3A4452";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = "#7A8290";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#2A3038";
          }}
        >
          <LogOut size={12} />
          Sign out
        </button>
      </div>
    </header>
  );
}
