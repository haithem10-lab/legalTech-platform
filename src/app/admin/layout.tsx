import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getPendingMembers } from "@/lib/db";
import { AdminNav } from "@/components/AdminNav";
import { WorkflowNameProvider } from "@/contexts/WorkflowNameContext";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense-in-depth: middleware already blocks unauthenticated requests,
  // but we re-check here so the layout never renders without a valid session.
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  // Only admins can have pending members; skip the query for lawyers
  const pendingCount =
    session.user.role === "admin"
      ? (await getPendingMembers(session.user.orgId)).length
      : 0;

  return (
    <WorkflowNameProvider>
      <div
        className="min-h-screen flex flex-col"
        style={{ background: "#F3F1EC" }}
      >
        <AdminNav
          name={session.user?.name}
          email={session.user?.email}
          orgName={session.user?.orgName}
          role={session.user?.role}
          pendingCount={pendingCount}
        />
        <main className="flex-1 flex flex-col">{children}</main>
      </div>
    </WorkflowNameProvider>
  );
}
