import { Timestamp } from "firebase-admin/firestore";
import type { Workflow } from "@/types/workflow";

export const WORKFLOWS = "workflows";

export function tsToISO(v: unknown): string {
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (typeof v === "string") return v;
  return "";
}

export function toWorkflow(id: string, data: FirebaseFirestore.DocumentData): Workflow {
  return {
    ...(data as Workflow),
    id,
    // Pre-migration documents stored accountId; fall back so orgId is never undefined.
    orgId: (data.orgId ?? data.accountId ?? "") as string,
    createdAt: tsToISO(data.createdAt),
    updatedAt: tsToISO(data.updatedAt),
  };
}
