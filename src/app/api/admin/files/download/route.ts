import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStorage } from "@/lib/storage";
import { jsonError } from "@/lib/api/responses";
import { env } from "@/lib/env";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return jsonError("Unauthorized", 401);

    const path = req.nextUrl.searchParams.get("path") ?? "";
    if (!path.startsWith("submissions/") || path.includes("..")) {
      return jsonError("Invalid path", 400);
    }

    const bucket = env.gcs.bucketName;
    if (!bucket) return jsonError("Storage not configured", 500);

    const filename = path.split("/").pop() ?? "file";
    const [signedUrl] = await getStorage().bucket(bucket).file(path).getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 15 * 60 * 1000,
    });

    return Response.json({ downloadUrl: signedUrl, filename });
  } catch (err) {
    console.error("[GET /api/admin/files/download]", err);
    return jsonError("Internal server error", 500);
  }
}
