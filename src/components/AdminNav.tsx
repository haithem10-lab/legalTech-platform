"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { FileText, LogOut, LayoutGrid, Users } from "lucide-react";

import { useWorkflowName } from "@/contexts/WorkflowNameContext";

interface Props {
  name?: string | null;
  email?: string | null;
  orgName?: string | null;
  role?: "admin" | "lawyer" | null;
  pendingCount?: number;
}

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  lawyer: "Lawyer",
};

export function AdminNav({ name, email, orgName, role, pendingCount = 0 }: Props) {
  const { workflowName } = useWorkflowName();
  const pathname = usePathname();

  const inBuilder = /\/admin\/workflows\/[^/]+\/build/.test(pathname ?? "");
  const showWorkflowName = inBuilder && !!workflowName;

  const inSettings = (pathname ?? "").startsWith("/admin/settings");
  const inWorkflows = !inSettings;

  // Initials: prefer display name, fall back to email
  const initials = name
    ? name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
    : email
    ? email.slice(0, 2).toUpperCase()
    : "–";

  const displayName = name ?? email ?? "";

  return (
    <header
      className={`flex items-center h-14 px-6 gap-4 shrink-0 font-sans`}
      style={{ background: "#1C2127", borderBottom: "1px solid #2A3038" }}
    >
      {/* Left: logo */}
      <div className="flex items-center gap-2" style={{ minWidth: 160 }}>
        <FileText size={18} color="#44645D" />
        <span className="font-semibold text-sm tracking-wide" style={{ color: "#F1EFE9" }}>
          LegalTech
        </span>
      </div>

      {/* Center: nav links (normal pages) or workflow name (builder) */}
      <div className="flex-1 flex justify-center">
        {showWorkflowName ? (
          <span className="truncate max-w-xs font-sans" style={{ fontSize: 12, color: "#7A8290" }}>
            {workflowName}
          </span>
        ) : (
          <nav className="flex items-center gap-1">
            <Link
              href="/admin/workflows"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{
                color: inWorkflows ? "#E8E4DC" : "#7A8290",
                background: inWorkflows ? "#2A3038" : "transparent",
                textDecoration: "none",
              }}
            >
              <LayoutGrid size={13} />
              Workflows
            </Link>
            {role === "admin" && (
              <Link
                href="/admin/settings/team"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                style={{
                  color: inSettings ? "#E8E4DC" : "#7A8290",
                  background: inSettings ? "#2A3038" : "transparent",
                  textDecoration: "none",
                  position: "relative",
                }}
              >
                <Users size={13} />
                Team
                {pendingCount > 0 && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 16, height: 16, borderRadius: "50%",
                    background: "#E53E3E", color: "#fff",
                    fontSize: 9, fontWeight: 700, marginLeft: 2,
                  }}>
                    {pendingCount}
                  </span>
                )}
              </Link>
            )}
          </nav>
        )}
      </div>

      {/* Right: name + role badge + sign out */}
      <div className="flex items-center justify-end gap-3" style={{ minWidth: 160 }}>
        {/* Avatar + name */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center flex-shrink-0 font-semibold"
            style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "#44645D", color: "#fff",
              fontSize: 10, letterSpacing: "0.04em",
            }}
          >
            {initials}
          </div>
          <div className="flex flex-col leading-none gap-0.5 hidden sm:flex">
            <span style={{ fontSize: 12, color: "#CBD5E1", fontWeight: 500 }}>{displayName}</span>
            {role && (
              <span
                style={{
                  fontSize: 10, fontWeight: 600,
                  color: role === "admin" ? "#44645D" : "#7A8290",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}
              >
                {ROLE_LABEL[role] ?? role}
              </span>
            )}
          </div>
        </div>

        {/* Sign out */}
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
