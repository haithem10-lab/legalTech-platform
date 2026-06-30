"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { FileText } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      if (result.error === "BLOCKED") setError("BLOCKED");
      else                            setError("Invalid email or password.");
      return;
    }

    // Pending members get a valid session; middleware routes them to /pending
    router.push("/admin/workflows");
  }

  const isBlocked = error === "BLOCKED";

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#FBF8F2" }}
    >
      <div className="w-full max-w-sm px-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <FileText size={22} color="#44645D" />
          <span
            className={`text-lg font-semibold font-sans`}
            style={{ color: "#1C2127" }}
          >
            LegalTech
          </span>
        </div>

        {/* Heading */}
        <h1
          className={`text-2xl font-semibold text-center mb-1 font-serif`}
          style={{ color: "#1C2127" }}
        >
          Sign in to your account
        </h1>
        <p
          className={`text-sm text-center mb-8 font-sans`}
          style={{ color: "#6B7280" }}
        >
          Manage your legal workflow forms
        </p>

        <form
          onSubmit={handleSubmit}
          className={`space-y-4 font-sans`}
        >
          {error && (
            <div
              className="text-sm px-4 py-3 rounded-md"
              style={{
                background: isBlocked ? "#FEF2F2" : "#FEE2E2",
                color: isBlocked ? "#7F1D1D" : "#991B1B",
                border: isBlocked ? "1px solid #FECACA" : "none",
              }}
            >
              {isBlocked
                ? "Your account has been blocked by your firm admin. Please contact them for more information."
                : error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium mb-1"
              style={{ color: "#1C2127" }}
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@lawfirm.com"
              className="w-full px-3 py-2 text-sm border rounded-md outline-none"
              style={{
                background: "#FFFFFF",
                borderColor: "#D1D5DB",
                color: "#1C2127",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#44645D")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="password"
                className="block text-sm font-medium"
                style={{ color: "#1C2127" }}
              >
                Password
              </label>
              <Link href="/forgot-password" className={`text-xs font-sans`}
                style={{ color: "#44645D", textDecoration: "none", fontWeight: 500 }}>
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-sm border rounded-md outline-none"
              style={{
                background: "#FFFFFF",
                borderColor: "#D1D5DB",
                color: "#1C2127",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#44645D")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 text-sm font-medium text-white rounded-md transition-opacity disabled:opacity-60"
            style={{ background: "#44645D" }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className={`text-center text-sm mt-6 font-sans`} style={{ color: "#6B7280" }}>
          Don&apos;t have an account?{" "}
          <Link href="/signup" style={{ color: "#44645D", fontWeight: 500, textDecoration: "none" }}>
            Sign up →
          </Link>
        </p>
      </div>
    </div>
  );
}
