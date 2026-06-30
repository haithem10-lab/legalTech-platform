import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { approveMember, rejectMember, blockMember, unblockMember, getMemberByUserId } from "@/lib/db";
import { jsonError } from "@/lib/api/responses";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return jsonError("Unauthorized", 401);
    if (session.user.role !== "admin") return jsonError("Forbidden", 403);

    const body = await request.json().catch(() => ({}));
    const { userId, action } = body;

    if (!userId || typeof userId !== "string") {
      return jsonError("userId is required", 400);
    }
    const VALID_ACTIONS = ["approve", "reject", "block", "unblock"] as const;
    type Action = (typeof VALID_ACTIONS)[number];
    if (!VALID_ACTIONS.includes(action as Action)) {
      return jsonError("action must be approve | reject | block | unblock", 400);
    }

    if (userId === session.user.id) {
      return jsonError("Cannot modify your own account", 400);
    }

    const orgId = session.user.orgId;

    // Fetch member before the action (reject deletes the doc)
    const member = action === "approve"
      ? await getMemberByUserId(orgId, userId)
      : null;

    if (action === "approve")       await approveMember(orgId, userId);
    else if (action === "reject")   await rejectMember(orgId, userId);
    else if (action === "block")    await blockMember(orgId, userId);
    else                            await unblockMember(orgId, userId);

    // Notify the member when they are approved — non-blocking
    if (action === "approve" && member) {
      sendEmail({
        to: member.email,
        subject: "You have been approved — LegalForm",
        body: `Hi ${member.name},

Your request to join ${session.user.orgName} on LegalForm has been approved.

Sign in here:
${env.appUrl}/login

— The LegalForm Team`,
      }).catch((err) => console.error("[approve] member notification failed:", err));
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("[POST /api/admin/team/approve]", err);
    return jsonError("Internal server error", 500);
  }
}
