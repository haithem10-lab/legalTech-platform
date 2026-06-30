import { getAuth } from "firebase-admin/auth";
import { jsonError } from "@/lib/api/responses";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/ratelimit";

// Always returns 200 regardless of whether the email exists — prevents enumeration.
export async function POST(request: Request) {
  // IP-level guard — blocks one source hammering the endpoint
  const ip = getClientIp(request);
  const { success: ipOk, resetAt: ipReset } = rateLimit(`forgot-ip:${ip}`, 3, 15 * 60_000);
  if (!ipOk) return rateLimitResponse(ipReset);

  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) return jsonError("Email is required", 400);

    // Per-email guard — blocks distributed attacks targeting one account
    const { success: emailOk, resetAt: emailReset } = rateLimit(`forgot-email:${email}`, 3, 15 * 60_000);
    if (!emailOk) return rateLimitResponse(emailReset);

    let resetLink: string | null = null;
    try {
      const firebaseLink = await getAuth().generatePasswordResetLink(email, {
        url: `${env.appUrl}/reset-password`,
        handleCodeInApp: false,
      });
      const oobCode = new URL(firebaseLink).searchParams.get("oobCode");
      if (oobCode) {
        resetLink = `${env.appUrl}/reset-password?oobCode=${encodeURIComponent(oobCode)}`;
      }
    } catch (err) {
      // Swallow in production — prevents account enumeration
      if (process.env.NODE_ENV === "development") {
        console.error("[forgot-password] generatePasswordResetLink failed:", err);
      }
    }

    if (resetLink) {
      await sendEmail({
        to: email,
        subject: "Reset your LegalForm password",
        body: `Hi,

You requested a password reset for your LegalForm account.

Click the link below to reset your password.
This link expires in 1 hour.

Reset your password:
${resetLink}

If you didn't request this, you can safely ignore this email.

— The LegalForm Team`,
      }).catch((err) => {
        if (process.env.NODE_ENV === "development") {
          console.error("[forgot-password] sendEmail failed:", err);
        }
      });
    } else if (process.env.NODE_ENV === "development") {
      console.warn("[forgot-password] no reset link generated for:", email, "(user may not exist in Firebase)");
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("[POST /api/auth/forgot-password]", err);
    return jsonError("Internal server error", 500);
  }
}
