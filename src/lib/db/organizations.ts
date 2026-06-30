import { FieldValue, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebase";
import type { Organization, OrgMember } from "@/types/workflow";
import { tsToISO } from "./utils";

const ORGS = "organizations";

function toOrganization(id: string, data: FirebaseFirestore.DocumentData): Organization {
  return {
    id,
    name: data.name as string,
    domain: data.domain as string,
    plan: data.plan as Organization["plan"],
    ownerId: data.ownerId as string,
    firmSize: data.firmSize as string | undefined,
    createdAt: tsToISO(data.createdAt),
  };
}

function toMember(data: FirebaseFirestore.DocumentData): OrgMember {
  return {
    userId: data.userId as string,
    orgId: data.orgId as string,
    email: data.email as string,
    name: data.name as string,
    role: data.role as OrgMember["role"],
    status: data.status as OrgMember["status"],
    joinedAt: tsToISO(data.joinedAt),
  };
}

export async function createOrganization(
  orgId: string,
  data: Omit<Organization, "id" | "createdAt">
): Promise<void> {
  await db.collection(ORGS).doc(orgId).set({
    ...data,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function getOrganization(orgId: string): Promise<Organization | null> {
  const snap = await db.collection(ORGS).doc(orgId).get();
  if (!snap.exists) return null;
  return toOrganization(snap.id, snap.data()!);
}

export async function addMember(
  orgId: string,
  userId: string,
  data: Omit<OrgMember, "userId" | "orgId" | "joinedAt">
): Promise<void> {
  await db
    .collection(ORGS)
    .doc(orgId)
    .collection("members")
    .doc(userId)
    .set({
      userId,
      orgId,
      ...data,
      joinedAt: FieldValue.serverTimestamp(),
    });
}

export async function getMembers(orgId: string): Promise<OrgMember[]> {
  const snap = await db
    .collection(ORGS)
    .doc(orgId)
    .collection("members")
    .get();
  return snap.docs.map((doc: QueryDocumentSnapshot) => toMember(doc.data()));
}

export async function getMemberByUserId(
  orgId: string,
  userId: string
): Promise<OrgMember | null> {
  const snap = await db
    .collection(ORGS)
    .doc(orgId)
    .collection("members")
    .doc(userId)
    .get();
  if (!snap.exists) return null;
  return toMember(snap.data()!);
}

export async function getOrgByDomain(domain: string): Promise<Organization | null> {
  const snap = await db
    .collection(ORGS)
    .where("domain", "==", domain)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return toOrganization(doc.id, doc.data());
}

export async function getPendingMembers(orgId: string): Promise<OrgMember[]> {
  const snap = await db
    .collection(ORGS)
    .doc(orgId)
    .collection("members")
    .where("status", "==", "pending_approval")
    .get();
  return snap.docs.map((doc: QueryDocumentSnapshot) => toMember(doc.data()));
}

export async function approveMember(orgId: string, userId: string): Promise<void> {
  const batch = db.batch();
  batch.update(
    db.collection(ORGS).doc(orgId).collection("members").doc(userId),
    { status: "active" }
  );
  batch.update(db.collection("users").doc(userId), { status: "active" });
  await batch.commit();
}

export async function rejectMember(orgId: string, userId: string): Promise<void> {
  const batch = db.batch();
  batch.delete(db.collection(ORGS).doc(orgId).collection("members").doc(userId));
  batch.delete(db.collection("users").doc(userId));
  await batch.commit();
  // Firebase Auth deletion outside the batch — Admin SDK doesn't support it in batches
  await getAuth().deleteUser(userId);
}

export async function blockMember(orgId: string, userId: string): Promise<void> {
  const batch = db.batch();
  batch.update(
    db.collection(ORGS).doc(orgId).collection("members").doc(userId),
    { status: "blocked" }
  );
  batch.update(db.collection("users").doc(userId), { status: "blocked" });
  await batch.commit();
  // Disable the Firebase Auth account so any active refresh tokens stop working
  await getAuth().updateUser(userId, { disabled: true });
}

export async function unblockMember(orgId: string, userId: string): Promise<void> {
  const batch = db.batch();
  batch.update(
    db.collection(ORGS).doc(orgId).collection("members").doc(userId),
    { status: "active" }
  );
  batch.update(db.collection("users").doc(userId), { status: "active" });
  await batch.commit();
  await getAuth().updateUser(userId, { disabled: false });
}

export async function getBlockedMembers(orgId: string): Promise<OrgMember[]> {
  const snap = await db
    .collection(ORGS)
    .doc(orgId)
    .collection("members")
    .where("status", "==", "blocked")
    .get();
  return snap.docs.map((doc: QueryDocumentSnapshot) => toMember(doc.data()));
}
