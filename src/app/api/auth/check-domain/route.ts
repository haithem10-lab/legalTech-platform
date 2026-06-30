import { getOrgByDomain } from "@/lib/db";
import { jsonError } from "@/lib/api/responses";
import { BLOCKED_DOMAINS } from "@/lib/blocked-domains";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain")?.toLowerCase().trim();

    if (!domain) return jsonError("domain is required", 400);

    if (BLOCKED_DOMAINS.includes(domain)) {
      return Response.json({ blocked: true, exists: false });
    }

    const org = await getOrgByDomain(domain);
    return Response.json({
      blocked: false,
      exists: !!org,
      orgName: org?.name ?? null,
      orgId: org?.id ?? null,
    });
  } catch (err) {
    console.error("[GET /api/auth/check-domain]", err);
    return jsonError("Internal server error", 500);
  }
}
