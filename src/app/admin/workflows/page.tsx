import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Source_Serif_4 } from "next/font/google";
import { authOptions } from "@/lib/auth";
import { listWorkflows } from "@/lib/firestore";
import type { Workflow } from "@/types/workflow";

const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "600"] });

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
      ? { background: "#1F6F54", color: "#FFFFFF" }
      : { background: "#E5E7EB", color: "#374151" };

  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full capitalize"
      style={styles}
    >
      {status}
    </span>
  );
}

function WorkflowCard({ workflow }: { workflow: Workflow }) {
  return (
    <div
      className="flex flex-col gap-4 p-5 rounded-xl border"
      style={{ background: "#FBF8F2", borderColor: "#C9C2B4" }}
    >
      <div className="flex items-start justify-between gap-2">
        <h2
          className={`text-lg font-semibold leading-snug ${sourceSerif.className}`}
          style={{ color: "#1C2127" }}
        >
          {workflow.name}
        </h2>
        <StatusBadge status={workflow.status} />
      </div>

      <p className="text-xs" style={{ color: "#6B7280" }}>
        Created {formatDate(workflow.createdAt)}
      </p>

      <div className="flex gap-2 mt-auto">
        <Link
          href={`/admin/workflows/${workflow.id}/build`}
          className="flex-1 text-center text-sm font-medium py-1.5 rounded-md border transition-colors"
          style={{
            borderColor: "#1F6F54",
            color: "#1F6F54",
            background: "transparent",
          }}
        >
          Build
        </Link>
        <Link
          href={`/admin/workflows/${workflow.id}/submissions`}
          className="flex-1 text-center text-sm font-medium py-1.5 rounded-md border transition-colors"
          style={{ borderColor: "#C9C2B4", color: "#374151" }}
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
    <div
      className="min-h-full px-6 py-8"
      style={{ background: "#F3F1EC" }}
    >
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
          className="text-sm font-medium text-white px-4 py-2 rounded-md"
          style={{ background: "#1F6F54" }}
        >
          + New Workflow
        </Link>
      </div>

      {/* Grid or empty state */}
      <div className="max-w-5xl mx-auto">
        {workflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <p className="text-base" style={{ color: "#6B7280" }}>
              No workflows yet.
            </p>
            <Link
              href="/admin/workflows/new"
              className="text-sm font-medium text-white px-4 py-2 rounded-md"
              style={{ background: "#1F6F54" }}
            >
              Create your first workflow
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
