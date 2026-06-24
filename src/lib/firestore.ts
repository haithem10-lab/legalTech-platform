import {
  FieldValue,
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { db } from "@/lib/firebase";
import type { Workflow, Submission } from "@/types/workflow";

const WORKFLOWS = "workflows";

function tsToISO(v: unknown): string {
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (typeof v === "string") return v;
  return "";
}

function toWorkflow(id: string, data: FirebaseFirestore.DocumentData): Workflow {
  return {
    ...(data as Workflow),
    id,
    createdAt: tsToISO(data.createdAt),
    updatedAt: tsToISO(data.updatedAt),
  };
}

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

export async function listWorkflows(accountId: string): Promise<Workflow[]> {
  const snap = await db
    .collection(WORKFLOWS)
    .where("accountId", "==", accountId)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc: QueryDocumentSnapshot) =>
    toWorkflow(doc.id, doc.data())
  );
}

export async function getSubmissions(workflowId: string): Promise<Submission[]> {
  const snap = await db
    .collection(WORKFLOWS)
    .doc(workflowId)
    .collection("entries")
    .orderBy("submittedAt", "desc")
    .limit(200)
    .get();

  return snap.docs.map((doc: QueryDocumentSnapshot) => ({
    id: doc.id,
    data: (doc.data().data ?? {}) as Record<string, unknown>,
    submittedAt: tsToISO(doc.data().submittedAt),
    originHost: (doc.data().originHost as string) ?? "",
    webhookStatus: doc.data().webhookStatus as Submission["webhookStatus"],
  }));
}

export async function updateSubmission(
  workflowId: string,
  submissionId: string,
  patch: Partial<Pick<Submission, "webhookStatus">>
): Promise<void> {
  await db
    .collection(WORKFLOWS)
    .doc(workflowId)
    .collection("entries")
    .doc(submissionId)
    .set(patch, { merge: true });
}

export async function writeSubmission(
  workflowId: string,
  payload: {
    data: Record<string, unknown>;
    originHost: string;
  }
): Promise<string> {
  const ref = await db
    .collection(WORKFLOWS)
    .doc(workflowId)
    .collection("entries")
    .add({
      data: payload.data,
      originHost: payload.originHost,
      submittedAt: FieldValue.serverTimestamp(),
    });
  return ref.id;
}
