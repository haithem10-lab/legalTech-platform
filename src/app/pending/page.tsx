import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { FileText, Clock } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { SignOutButton } from "./SignOutButton";

export default async function PendingPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  // Active members have no business on /pending
  if (session.user.status === "active") redirect("/admin/workflows");

  const orgName = session.user.orgName;

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#FBF8F2" }}>
      <div className="w-full max-w-sm px-6 py-10 text-center">

        {/* Logo */}
        <div className={`flex items-center justify-center gap-2 mb-10 font-sans`}>
          <FileText size={22} color="#44645D" />
          <span className="text-lg font-semibold" style={{ color: "#1C2127" }}>LegalTech</span>
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "#E6F0EA",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Clock size={30} color="#44645D" />
          </div>
        </div>

        {/* Heading */}
        <h1 className={`text-2xl font-semibold mb-3 font-serif`} style={{ color: "#1C2127" }}>
          Waiting for approval
        </h1>

        {/* Message */}
        <p className={`text-sm mb-2 font-sans`} style={{ color: "#1C2127" }}>
          Your request to join{" "}
          <span className="font-semibold">{orgName}</span>{" "}
          is pending review by your firm admin.
        </p>
        <p className={`text-sm mb-10 font-sans`} style={{ color: "#6B7280" }}>
          Once approved, you&apos;ll have full access to your firm&apos;s LegalTech workspace.
        </p>

        {/* Sign out */}
        <SignOutButton />
      </div>
    </div>
  );
}
