import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getWorkflow } from "@/lib/db";
import { BuilderClient } from "./BuilderClient";

export default async function BuildPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const workflow = await getWorkflow(params.id);

  // 403 semantics: never reveal whether the doc exists to a non-owner
  if (!workflow || workflow.orgId !== session.user.orgId) {
    notFound();
  }

  return <BuilderClient initialWorkflow={workflow} />;
}
