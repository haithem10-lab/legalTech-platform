import crypto from "crypto";
import { db } from "@/lib/firebase";
import type { UserStatus } from "@/types/workflow";

interface UserDoc {
  uid: string;
  email: string;
  name: string;
  orgId: string;
  role: "admin" | "lawyer";
  status: UserStatus;
  emailVerificationToken?: string;
  emailVerificationExpiry?: string;
  emailVerifiedAt?: string;
  createdAt: string;
}

export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) return null;
  return snap.data() as UserDoc;
}

export async function getUserByEmail(email: string): Promise<(UserDoc & { uid: string }) | null> {
  const snap = await db.collection("users").where("email", "==", email).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { uid: doc.id, ...(doc.data() as UserDoc) };
}

export async function setVerificationToken(uid: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await db.collection("users").doc(uid).update({
    emailVerificationToken: token,
    emailVerificationExpiry: expiry,
  });
  return token;
}

export async function verifyEmail(
  uid: string,
  token: string
): Promise<"success" | "invalid" | "expired"> {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) return "invalid";

  const data = snap.data() as UserDoc;
  if (data.emailVerificationToken !== token) return "invalid";
  if (!data.emailVerificationExpiry || new Date(data.emailVerificationExpiry) < new Date()) {
    return "expired";
  }

  await db.collection("users").doc(uid).update({
    status: "pending_approval" as UserStatus,
    emailVerifiedAt: new Date().toISOString(),
    emailVerificationToken: null,
    emailVerificationExpiry: null,
  });

  return "success";
}
