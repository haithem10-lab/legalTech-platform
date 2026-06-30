"use client";

import { useState } from "react";
import Link from "next/link";

import { FileText } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#FBF8F2" }}>
      <div className="w-full max-w-sm px-6 py-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <FileText size={22} color="#44645D" />
          <span className={`text-lg font-semibold font-sans`} style={{ color: "#1C2127" }}>
            LegalTech
          </span>
        </div>

        <h1 className={`text-2xl font-semibold text-center mb-1 font-serif`} style={{ color: "#1C2127" }}>
          Reset your password
        </h1>
        <p className={`text-sm text-center mb-8 font-sans`} style={{ color: "#6B7280" }}>
          Enter your email and we&apos;ll send a reset link
        </p>

        {submitted ? (
          <div className={`text-center font-sans`}>
            <div className="px-4 py-4 rounded-md mb-6" style={{ background: "#E6F0EA", color: "#1C2127" }}>
              <p className="text-sm font-medium mb-1">Check your inbox</p>
              <p className="text-sm" style={{ color: "#6B7280" }}>
                If an account exists with that email, you&apos;ll receive a reset link shortly.
              </p>
            </div>
            <Link href="/login" className="text-sm font-medium" style={{ color: "#44645D", textDecoration: "none" }}>
              ← Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className={`space-y-4 font-sans`}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: "#1C2127" }}>
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
                  style={{ background: "#FFFFFF", borderColor: "#D1D5DB", color: "#1C2127" }}
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
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>

            <p className={`text-center text-sm mt-6 font-sans`} style={{ color: "#6B7280" }}>
              <Link href="/login" style={{ color: "#44645D", fontWeight: 500, textDecoration: "none" }}>
                ← Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
