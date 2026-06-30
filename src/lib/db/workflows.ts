import { FieldValue, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { db } from "@/lib/firebase";
import type { Workflow } from "@/types/workflow";
import { WORKFLOWS, toWorkflow } from "./utils";

export async function getWorkflow(id: string): Promise<Workflow | null> {
  const snap = await db.collection(WORKFLOWS).doc(id).get();
  if (!snap.exists) return null;
  return toWorkflow(snap.id, snap.data()!);
}

export async function createWorkflow(
  data: Omit<Workflow, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = await db.collection(WORKFLOWS).add({
    ...data,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function saveWorkflow(
  id: string,
  data: Partial<Omit<Workflow, "id" | "createdAt">>
): Promise<void> {
  await db
    .collection(WORKFLOWS)
    .doc(id)
    .set({ ...data, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

export async function listWorkflows(orgId: string): Promise<Workflow[]> {
  const snap = await db
    .collection(WORKFLOWS)
    .where("orgId", "==", orgId)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc: QueryDocumentSnapshot) => toWorkflow(doc.id, doc.data()));
}

export async function deleteWorkflow(id: string): Promise<void> {
  await db.collection(WORKFLOWS).doc(id).delete();
}
