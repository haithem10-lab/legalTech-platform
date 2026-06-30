import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getMembers, getPendingMembers, getBlockedMembers } from "@/lib/db";
import { PendingMemberActions, ActiveMemberActions, BlockedMemberActions } from "./MemberActions";
import type { OrgMember } from "@/types/workflow";

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
}

function RoleBadge({ role }: { role: OrgMember["role"] }) {
  const isAdmin = role === "admin";
  return (
    <span style={{
      display: "inline-block",
      fontSize: 10, fontWeight: 700, textTransform: "uppercase",
      letterSpacing: "0.07em", borderRadius: 20, padding: "3px 10px",
      background: isAdmin ? "#E6F0EA" : "#F3F1EC",
      color: isAdmin ? "#44645D" : "#8A8270",
      border: `1px solid ${isAdmin ? "#BCD9C8" : "#DDD8CE"}`,
      whiteSpace: "nowrap",
    }}>
      {role}
    </span>
  );
}

export default async function TeamPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/admin/workflows");

  const orgId = session.user.orgId;
  const currentUserId = session.user.id;

  const [allMembers, pendingMembers, blockedMembers] = await Promise.all([
    getMembers(orgId),
    getPendingMembers(orgId),
    getBlockedMembers(orgId),
  ]);

  // Admins first, then alphabetically by name
  const activeMembers = allMembers
    .filter((m) => m.status === "active")
    .sort((a, b) => {
      if (a.role === "admin" && b.role !== "admin") return -1;
      if (a.role !== "admin" && b.role === "admin") return 1;
      return a.name.localeCompare(b.name);
    });

  return (
    <div style={{ flex: 1, background: "#F3F1EC" }}>

      {/* Page header */}
      <div style={{ background: "#FBF8F2", borderBottom: "1px solid #D5D0C5", padding: "22px 40px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <h1 className="font-serif font-semibold" style={{ fontSize: 22, color: "#1C2127", margin: "0 0 3px" }}>
            Team
          </h1>
          <p style={{ fontSize: 13, color: "#8A8270", margin: 0 }}>
            {session.user.orgName} · {activeMembers.length} active {activeMembers.length === 1 ? "member" : "members"}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "32px auto", padding: "0 40px" }}>

        {/* ── Pending approvals ────────────────────────────────────── */}
        {pendingMembers.length > 0 && (
          <div className="rounded-xl overflow-hidden mb-5"
            style={{ background: "#FFFBEB", border: "1px solid #F0D060", boxShadow: "0 1px 4px rgba(28,33,39,0.07)" }}>
            <div style={{ padding: "13px 20px", borderBottom: "1px solid #F0D060" }}>
              <span className="font-semibold" style={{ fontSize: 12, color: "#92400E", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                ⚠ Pending approval · {pendingMembers.length}
              </span>
            </div>
            {pendingMembers.map((member, i) => (
              <div key={member.userId} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 20px", gap: 16,
                borderBottom: i < pendingMembers.length - 1 ? "1px solid #F0D060" : "none",
              }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1C2127", margin: "0 0 2px" }}>{member.name}</p>
                  <p style={{ fontSize: 12, color: "#8A8270", margin: 0 }}>{member.email} · Requested {formatDate(member.joinedAt)}</p>
                </div>
                <PendingMemberActions userId={member.userId} />
              </div>
            ))}
          </div>
        )}

        {/* ── Active members table ──────────────────────────────────── */}
        <div className="rounded-xl overflow-hidden mb-5"
          style={{ background: "#FFFFFF", border: "1px solid #DDD8CE", boxShadow: "0 2px 8px rgba(28,33,39,0.06)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "26%" }} />
              <col style={{ width: "32%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "12%" }} />
            </colgroup>
            <thead>
              <tr style={{ background: "#F7F4EE", borderBottom: "1px solid #DDD8CE" }}>
                {["Name", "Email", "Role", "Joined", ""].map((h, idx) => (
                  <th key={idx} style={{
                    padding: idx === 0 ? "11px 16px 11px 24px" : idx === 4 ? "11px 24px 11px 0" : "11px 16px 11px 0",
                    textAlign: idx === 4 ? "right" : "left",
                    fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.09em", color: "#9B9285",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "40px 24px", textAlign: "center", fontSize: 14, color: "#9B9285" }}>
                    No active members yet.
                  </td>
                </tr>
              ) : activeMembers.map((member, i) => (
                <tr key={member.userId} style={{
                  borderBottom: i < activeMembers.length - 1 ? "1px solid #F0EDE6" : "none",
                }}>
                  <td style={{ padding: "15px 16px 15px 24px", fontSize: 13, fontWeight: 600, color: "#1C2127", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {member.name}
                  </td>
                  <td style={{ padding: "15px 16px 15px 0", fontSize: 13, color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {member.email}
                  </td>
                  <td style={{ padding: "15px 16px 15px 0" }}>
                    <RoleBadge role={member.role} />
                  </td>
                  <td style={{ padding: "15px 16px 15px 0", fontSize: 12, color: "#9B9285", whiteSpace: "nowrap" }}>
                    {formatDate(member.joinedAt)}
                  </td>
                  <td style={{ padding: "15px 24px 15px 0", textAlign: "right" }}>
                    <ActiveMemberActions userId={member.userId} isSelf={member.userId === currentUserId} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Blocked members ───────────────────────────────────────── */}
        {blockedMembers.length > 0 && (
          <div className="rounded-xl overflow-hidden"
            style={{ background: "#FFFFFF", border: "1px solid #DDD8CE", boxShadow: "0 2px 8px rgba(28,33,39,0.06)" }}>
            <div style={{ padding: "13px 20px", background: "#FEF2F2", borderBottom: "1px solid #FECACA" }}>
              <span className="font-semibold" style={{ fontSize: 12, color: "#7F1D1D", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                🚫 Blocked · {blockedMembers.length}
              </span>
            </div>
            {blockedMembers.map((member, i) => (
              <div key={member.userId} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 20px", gap: 16,
                borderBottom: i < blockedMembers.length - 1 ? "1px solid #F0EDE6" : "none",
                opacity: 0.75,
              }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1C2127", margin: "0 0 2px" }}>{member.name}</p>
                  <p style={{ fontSize: 12, color: "#8A8270", margin: 0 }}>{member.email} · Joined {formatDate(member.joinedAt)}</p>
                </div>
                <BlockedMemberActions userId={member.userId} />
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
