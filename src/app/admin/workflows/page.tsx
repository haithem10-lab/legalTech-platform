import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Source_Serif_4, Inter, IBM_Plex_Mono } from "next/font/google";
import { FileText, PlusCircle } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { listWorkflows } from "@/lib/firestore";
import type { Workflow } from "@/types/workflow";

const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "600"] });
const inter      = Inter({ subsets: ["latin"] });
const ibmMono    = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400"] });

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function StatusBadge({ status }: { status: Workflow["status"] }) {
  const styles =
    status === "published"
      ? { background: "#E6F0EA", color: "#1F6F54", border: "1px solid #BCD9C8" }
      : { background: "#F3F1EC", color: "#8A8270", border: "1px solid #C9C2B4" };

  return (
    <span
      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${inter.className}`}
      style={styles}
    >
      {status}
    </span>
  );
}

function WorkflowCard({ workflow }: { workflow: Workflow }) {
  const fieldCount = workflow.schema?.length ?? 0;

  return (
    <div
      className="group flex flex-col gap-0 rounded-xl border overflow-hidden transition-shadow hover:shadow-md"
      style={{ background: "#FBF8F2", borderColor: "#C9C2B4" }}
    >
      {/* Card body */}
      <div className="flex flex-col gap-3 p-5 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h2
            className={`text-base font-semibold leading-snug ${sourceSerif.className}`}
            style={{ color: "#1C2127" }}
          >
            {workflow.name}
          </h2>
          <StatusBadge status={workflow.status} />
        </div>

        <div className="flex items-center gap-3 mt-auto">
          <span
            className={`text-xs ${ibmMono.className}`}
            style={{ color: "#8A8270" }}
          >
            {fieldCount} {fieldCount === 1 ? "field" : "fields"}
          </span>
          <span style={{ color: "#C9C2B4", fontSize: 10 }}>·</span>
          <span className={`text-xs ${inter.className}`} style={{ color: "#8A8270" }}>
            {formatDate(workflow.updatedAt || workflow.createdAt)}
          </span>
        </div>
      </div>

      {/* Card footer */}
      <div
        className="flex gap-0"
        style={{ borderTop: "1px solid #E8E2D9" }}
      >
        <Link
          href={`/admin/workflows/${workflow.id}/build`}
          className={`flex-1 text-center text-xs font-semibold py-2.5 transition-colors ${inter.className}`}
          style={{
            color: "#1F6F54",
            borderRight: "1px solid #E8E2D9",
          }}
        >
          Build
        </Link>
        <Link
          href={`/admin/workflows/${workflow.id}/submissions`}
          className={`flex-1 text-center text-xs font-semibold py-2.5 transition-colors ${inter.className}`}
          style={{ color: "#6B7280" }}
        >
          Submissions
        </Link>
      </div>
    </div>
  );
}

export default async function WorkflowsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const all = await listWorkflows(session.user.accountId);
  const workflows = all.filter((w) => w.status !== "archived");

  return (
    <div className="min-h-full px-6 py-8" style={{ background: "#F3F1EC" }}>
      {/* Header */}
      <div className="max-w-5xl mx-auto flex items-center justify-between mb-8">
        <h1
          className={`text-2xl font-semibold ${sourceSerif.className}`}
          style={{ color: "#1C2127" }}
        >
          Workflows
        </h1>
        <Link
          href="/admin/workflows/new"
          className={`flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-lg ${inter.className}`}
          style={{ background: "#1F6F54" }}
        >
          <PlusCircle size={15} />
          New workflow
        </Link>
      </div>

      {/* Grid or empty state */}
      <div className="max-w-5xl mx-auto">
        {workflows.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-24 gap-5 rounded-xl border"
            style={{ background: "#FBF8F2", borderColor: "#C9C2B4" }}
          >
            <div
              className="flex items-center justify-center rounded-xl"
              style={{ width: 56, height: 56, background: "#EDE8DD" }}
            >
              <FileText size={26} color="#A89F8C" />
            </div>
            <div className="text-center">
              <p
                className={`text-lg font-semibold mb-1 ${sourceSerif.className}`}
                style={{ color: "#1C2127" }}
              >
                No workflows yet
              </p>
              <p
                className={`text-sm ${inter.className}`}
                style={{ color: "#8A8270" }}
              >
                Create your first workflow to start embedding forms.
              </p>
            </div>
            <Link
              href="/admin/workflows/new"
              className={`flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-lg ${inter.className}`}
              style={{ background: "#1F6F54" }}
            >
              <PlusCircle size={15} />
              Create workflow
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflows.map((w) => (
              <WorkflowCard key={w.id} workflow={w} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
