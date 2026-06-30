import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";

import { Plus } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { listWorkflows } from "@/lib/db";
import { WorkflowCard, NewFormCard } from "./WorkflowCards";

export default async function WorkflowsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const all       = await listWorkflows(session.user.orgId);
  const workflows = all.filter((w) => w.status !== "archived");
  const published = workflows.filter((w) => w.status === "published").length;
  const draft     = workflows.filter((w) => w.status === "draft").length;

  return (
    <div className="flex-1 font-sans" style={{ background: "#F3F1EC" }}>

      {/* Header band */}
      <div style={{ background: "#FBF8F2", borderBottom: "1px solid #C9C2B4", padding: "20px 36px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="flex items-end justify-between">
            <div>
              <h1 className={`font-semibold font-serif`}
                style={{ fontSize: 30, color: "#1C2127", margin: 0, lineHeight: 1.15 }}>
                Workflows
              </h1>
            </div>
            <Link href="/admin/workflows/new"
              className={`flex items-center gap-2 text-white font-semibold no-underline font-sans`}
              style={{ fontSize: 13, padding: "9px 16px", borderRadius: 8, background: "#44645D", boxShadow: "0 1px 2px rgba(28,33,39,0.12)", textDecoration: "none" }}>
              <Plus size={15} /> New form
            </Link>
          </div>

          {/* Stats */}
          <div className="flex gap-9 mt-4">
            {[
              { value: workflows.length, label: "Total forms" },
              { value: published,        label: "Published"   },
              { value: draft,            label: "Drafts"      },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className={`font-semibold font-serif`}
                  style={{ fontSize: 28, color: "#1C2127", margin: 0, lineHeight: 1 }}>
                  {value}
                </p>
                <p style={{ fontSize: 12, color: "#8A8270", margin: "3px 0 0" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 36px" }}>
        <p className="uppercase font-bold text-muted mb-5"
          style={{ fontSize: 11, letterSpacing: "0.08em" }}>
          All forms
        </p>
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {workflows.map((w) => <WorkflowCard key={w.id} workflow={w} />)}
          <NewFormCard />
        </div>
      </div>
    </div>
  );
}
