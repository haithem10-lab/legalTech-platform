import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listWorkflows, createWorkflow } from "@/lib/firestore";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workflows = await listWorkflows(session.user.accountId);
  // Exclude archived from the dashboard list
  const visible = workflows.filter((w) => w.status !== "archived");
  return NextResponse.json(visible);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const id = await createWorkflow({
    // accountId comes from the verified session — never from the request body
    accountId: session.user.accountId,
    name,
    status: "draft",
    schema: [],
    theme: {
      bgColor: "#FBF8F2",
      font: "Inter",
      radius: 6,
      buttonColor: "#1F6F54",
      buttonTextColor: "#FFFFFF",
      density: "spacious",
    },
    webhookUrl: "",
    hmacSecret: randomBytes(32).toString("hex"),
    allowedOrigins: [],
  });

  return NextResponse.json({ id }, { status: 201 });
}
