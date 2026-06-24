import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
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

  return (
    <WorkflowNameProvider>
      <div
        className="min-h-screen flex flex-col"
        style={{ background: "#FBF8F2" }}
      >
        <AdminNav />
        <main className="flex-1">{children}</main>
      </div>
    </WorkflowNameProvider>
  );
}
