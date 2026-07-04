import { randomUUID } from "crypto";
import { getAuth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebase";
import { getOrgByDomain } from "@/lib/db";
import { jsonError } from "@/lib/api/responses";
import { BLOCKED_DOMAINS } from "@/lib/blocked-domains";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/ratelimit";

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { success, resetAt } = rateLimit(`signup:${ip}`, 3, 15 * 60_000);
  if (!success) return rateLimitResponse(resetAt);

  try {
    const body = await request.json().catch(() => ({}));
    const { name, email, password, firmName, firmSize } = body;

    // ── Basic validation ──────────────────────────────────────────────────────
    if (!name || typeof name !== "string" || !name.trim()) {
      return jsonError("Full name is required", 400);
    }
    if (!email || !isValidEmail(email)) {
      return jsonError("A valid email address is required", 400);
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return jsonError("Password must be at least 8 characters", 400);
    }

    const cleanEmail   = email.trim().toLowerCase();
    const cleanName    = name.trim();
    const domain       = cleanEmail.split("@")[1];

    if (BLOCKED_DOMAINS.includes(domain)) {
      return jsonError(
        "Please use your work email address. Personal email addresses are not supported.",
        400
      );
    }

    // ── Domain lookup — determines first-member vs join path ─────────────────
    const existingOrg = await getOrgByDomain(domain);

    // ── Create Firebase Auth user ─────────────────────────────────────────────
    let uid: string;
    try {
      const userRecord = await getAuth().createUser({
        email: cleanEmail,
        password,
        displayName: cleanName,
      });
      uid = userRecord.uid;
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/email-already-exists") {
        return jsonError("An account with this email already exists", 400);
      }
      if (code === "auth/weak-password") {
        return jsonError("Password must be at least 8 characters", 400);
      }
      console.error("[POST /api/auth/signup] createUser failed:", err);
      return jsonError("Internal server error", 500);
    }

    const now = FieldValue.serverTimestamp();

    // ── PATH A: first from this domain → create org, become admin ────────────
    if (!existingOrg) {
      if (!firmName || typeof firmName !== "string" || !firmName.trim()) {
        await getAuth().deleteUser(uid).catch(() => {});
        return jsonError("Law firm name is required", 400);
      }
      const cleanFirmName = firmName.trim();
      const orgId = randomUUID();

      await Promise.all([
        db.collection("organizations").doc(orgId).set({
          name: cleanFirmName,
          domain,
          plan: "trial",
          ownerId: uid,
          firmSize: firmSize ?? null,
          createdAt: now,
        }),
        db.collection("organizations").doc(orgId).collection("members").doc(uid).set({
          userId: uid,
          orgId,
          email: cleanEmail,
          name: cleanName,
          role: "admin",
          status: "active",
          joinedAt: now,
        }),
        db.collection("users").doc(uid).set({
          name: cleanName,
          email: cleanEmail,
          orgId,
          role: "admin",
          status: "active",
          createdAt: now,
        }),
      ]);

      return Response.json(
        { success: true, isFirstMember: true, orgName: cleanFirmName },
        { status: 201 }
      );
    }

    // ── PATH B: org exists → join as pending lawyer ───────────────────────────
    const orgId = existingOrg.id;

    // Fetch the org owner's user doc so we can notify them
    const adminSnap = await db.collection("users").doc(existingOrg.ownerId).get();
    const adminData = adminSnap.exists ? adminSnap.data()! : null;

    await Promise.all([
      db.collection("organizations").doc(orgId).collection("members").doc(uid).set({
        userId: uid,
        orgId,
        email: cleanEmail,
        name: cleanName,
        role: "lawyer",
        status: "pending_approval",
        joinedAt: now,
      }),
      db.collection("users").doc(uid).set({
        name: cleanName,
        email: cleanEmail,
        orgId,
        role: "lawyer",
        status: "pending_approval",
        createdAt: now,
      }),
    ]);

    // Notify admin — non-blocking, failure must not block the signup response
    if (adminData) {
      sendEmail({
        to: adminData.email as string,
        subject: "New member request — LegalForm",
        body: `Hi ${adminData.name as string},

${cleanName} (${cleanEmail}) has requested to join ${existingOrg.name} on LegalForm.

Review and approve at:
${env.appUrl}/admin/settings/team

— The LegalForm Team`,
      }).catch((err) => console.error("[signup] admin notification failed:", err));
    }

    return Response.json(
      {
        success: true,
        isFirstMember: false,
        orgName: existingOrg.name,
        status: "pending_approval",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/auth/signup]", err);
    return jsonError("Internal server error", 500);
  }
}
