"use client";

import { signOut } from "next-auth/react";
import { FileText } from "lucide-react";
import { useWorkflowName } from "@/contexts/WorkflowNameContext";

export function AdminNav() {
  const { workflowName } = useWorkflowName();

  return (
    <header
      className="flex items-center h-14 px-6 gap-4 shrink-0"
      style={{ background: "#1C2127", borderBottom: "1px solid #2a3038" }}
    >
      {/* Left: logo */}
      <div className="flex items-center gap-2 min-w-[160px]">
        <FileText size={20} color="#1F6F54" />
        <span className="font-semibold text-sm tracking-wide text-white">
          LegalTech
        </span>
      </div>

      {/* Center: active workflow name */}
      <div className="flex-1 flex justify-center">
        {workflowName && (
          <span
            className="text-sm truncate max-w-xs"
            style={{ color: "#9CA3AF" }}
          >
            {workflowName}
          </span>
        )}
      </div>

      {/* Right: sign-out */}
      <div className="min-w-[160px] flex justify-end">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm transition-colors"
          style={{ color: "#9CA3AF" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "#FFFFFF")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "#9CA3AF")
          }
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
