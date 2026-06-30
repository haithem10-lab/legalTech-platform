"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, ShieldOff, ShieldCheck } from "lucide-react";

type Action = "approve" | "reject" | "block" | "unblock";

function ActionButton({
  action, loading, onClick, label, loadingLabel, icon, variant,
}: {
  action: Action; loading: Action | null; onClick: () => void;
  label: string; loadingLabel: string; icon: React.ReactNode;
  variant: "green" | "red-outline" | "grey-outline";
}) {
  const styles: Record<string, React.CSSProperties> = {
    "green":        { background: "#44645D", color: "#fff", border: "none" },
    "red-outline":  { background: "transparent", color: "#B23A2E", border: "1px solid #B23A2E" },
    "grey-outline": { background: "transparent", color: "#6B7280", border: "1px solid #D1D5DB" },
  };
  return (
    <button onClick={onClick} disabled={!!loading} title={label}
      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-opacity disabled:opacity-50"
      style={{ ...styles[variant], cursor: "pointer" }}>
      {icon}
      {loading === action ? loadingLabel : label}
    </button>
  );
}

function useAction(userId: string) {
  const router = useRouter();
  const [loading, setLoading] = useState<Action | null>(null);
  async function act(action: Action) {
    setLoading(action);
    await fetch("/api/admin/team/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });
    setLoading(null);
    router.refresh();
  }
  return { loading, act };
}

// Shown on pending rows — Approve + Reject
export function PendingMemberActions({ userId }: { userId: string }) {
  const { loading, act } = useAction(userId);
  return (
    <div className="flex items-center gap-2">
      <ActionButton action="approve" loading={loading} onClick={() => act("approve")}
        label="Approve" loadingLabel="Approving…" icon={<Check size={13} />} variant="green" />
      <ActionButton action="reject" loading={loading} onClick={() => act("reject")}
        label="Reject" loadingLabel="Rejecting…" icon={<X size={13} />} variant="red-outline" />
    </div>
  );
}

// Shown on active rows — Block
export function ActiveMemberActions({ userId, isSelf }: { userId: string; isSelf: boolean }) {
  const { loading, act } = useAction(userId);
  if (isSelf) return null; // admins can't block themselves
  return (
    <ActionButton action="block" loading={loading} onClick={() => act("block")}
      label="Block" loadingLabel="Blocking…" icon={<ShieldOff size={13} />} variant="grey-outline" />
  );
}

// Shown on blocked rows — Unblock
export function BlockedMemberActions({ userId }: { userId: string }) {
  const { loading, act } = useAction(userId);
  return (
    <ActionButton action="unblock" loading={loading} onClick={() => act("unblock")}
      label="Unblock" loadingLabel="Unblocking…" icon={<ShieldCheck size={13} />} variant="green" />
  );
}

// Legacy export kept for any existing import
export { PendingMemberActions as MemberActions };

