import { env } from "@/lib/env";
import { jsonError } from "@/lib/api/responses";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { oobCode, newPassword } = body;

    if (!oobCode || typeof oobCode !== "string") {
      return jsonError("oobCode is required", 400);
    }
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return jsonError("Password must be at least 8 characters", 400);
    }

    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${env.firebase.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oobCode, newPassword }),
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const code = (data?.error?.message as string | undefined) ?? "";
      if (code === "EXPIRED_OOB_CODE" || code === "INVALID_OOB_CODE") {
        return jsonError("INVALID_CODE", 400);
      }
      return jsonError("Failed to reset password", 400);
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("[POST /api/auth/reset-password]", err);
    return jsonError("Internal server error", 500);
  }
}
