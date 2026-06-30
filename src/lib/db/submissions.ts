import { FieldValue, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { db } from "@/lib/firebase";
import type { Submission } from "@/types/workflow";
import { WORKFLOWS, tsToISO } from "./utils";

function toSubmission(id: string, data: FirebaseFirestore.DocumentData): Submission {
  return {
    id,
    orgId: (data.orgId as string) ?? "",
    data: (data.data ?? {}) as Record<string, unknown>,
    submittedAt: tsToISO(data.submittedAt),
    originHost: (data.originHost as string) ?? "",
    webhookStatus: data.webhookStatus as Submission["webhookStatus"],
  };
}

export async function writeSubmission(
  workflowId: string,
  payload: { orgId: string; data: Record<string, unknown>; originHost: string }
): Promise<string> {
  const ref = await db
    .collection(WORKFLOWS)
    .doc(workflowId)
    .collection("entries")
    .add({
      orgId: payload.orgId,
      data: payload.data,
      originHost: payload.originHost,
      submittedAt: FieldValue.serverTimestamp(),
    });
  return ref.id;
}

export async function getSubmissions(workflowId: string): Promise<Submission[]> {
  const snap = await db
    .collection(WORKFLOWS)
    .doc(workflowId)
    .collection("entries")
    .orderBy("submittedAt", "desc")
    .limit(200)
    .get();
  return snap.docs.map((doc: QueryDocumentSnapshot) => toSubmission(doc.id, doc.data()));
}

export async function getSubmission(
  workflowId: string,
  submissionId: string
): Promise<Submission | null> {
  const snap = await db
    .collection(WORKFLOWS)
    .doc(workflowId)
    .collection("entries")
    .doc(submissionId)
    .get();
  if (!snap.exists) return null;
  return toSubmission(snap.id, snap.data()!);
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
