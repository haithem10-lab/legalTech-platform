"use client";

import { useState } from "react";
import Link from "next/link";

import { FileText, CheckCircle } from "lucide-react";

type View = "form" | "success" | "link_error";

function getStrength(password: string): number {
  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

const STRENGTH_LEVELS = [
  { label: "Weak",   color: "#DC2626", segments: 1 },
  { label: "Weak",   color: "#DC2626", segments: 1 },
  { label: "Fair",   color: "#D97706", segments: 2 },
  { label: "Fair",   color: "#D97706", segments: 2 },
  { label: "Strong", color: "#16A34A", segments: 3 },
  { label: "Great",  color: "#15803D", segments: 4 },
] as const;

function StrengthBar({ password }: { password: string }) {
  if (!password) return null;
  const { label, color, segments } = STRENGTH_LEVELS[getStrength(password)];
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-1 flex-1 rounded-full transition-all duration-200"
            style={{ background: i < segments ? color : "#E4E0D6" }} />
        ))}
      </div>
      <p style={{ fontSize: 11, color, fontWeight: 500 }}>{label}</p>
    </div>
  );
}

export default function ResetPasswordClient({ oobCode }: { oobCode: string | null }) {
  const [view, setView] = useState<View>(oobCode ? "form" : "link_error");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oobCode, newPassword: password }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data?.error === "INVALID_CODE") {
        setView("link_error");
      } else {
        setError(data?.error ?? "Something went wrong. Please try again.");
      }
      return;
    }

    setView("success");
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#FBF8F2" }}>
      <div className={`w-full max-w-sm px-6 font-sans`}>

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <FileText size={22} color="#44645D" />
          <span className="text-lg font-semibold" style={{ color: "#1C2127" }}>LegalTech</span>
        </div>

        {/* ── Invalid / expired link ──────────────────────────────── */}
        {view === "link_error" && (
          <div className="text-center">
            <h1 className={`text-2xl font-semibold mb-3 font-serif`} style={{ color: "#1C2127" }}>
              Invalid reset link
            </h1>
            <p className="text-sm mb-6" style={{ color: "#6B7280" }}>
              This reset link has expired or has already been used.
            </p>
            <Link
              href="/forgot-password"
              className="text-sm font-medium"
              style={{ color: "#44645D", textDecoration: "none" }}
            >
              Request a new one →
            </Link>
          </div>
        )}

        {/* ── Success ─────────────────────────────────────────────── */}
        {view === "success" && (
          <div className="text-center">
            <div className="flex justify-center mb-5">
              <CheckCircle size={48} color="#44645D" />
            </div>
            <h1 className={`text-2xl font-semibold mb-2 font-serif`} style={{ color: "#1C2127" }}>
              Password reset!
            </h1>
            <p className="text-sm mb-8" style={{ color: "#6B7280" }}>
              You can now sign in with your new password.
            </p>
            <Link
              href="/login"
              className="inline-block text-sm font-medium px-5 py-2.5 rounded-md text-white"
              style={{ background: "#44645D", textDecoration: "none" }}
            >
              Sign in →
            </Link>
          </div>
        )}

        {/* ── Form ────────────────────────────────────────────────── */}
        {view === "form" && (
          <>
            <h1 className={`text-2xl font-semibold text-center mb-1 font-serif`} style={{ color: "#1C2127" }}>
              Reset your password
            </h1>
            <p className="text-sm text-center mb-8" style={{ color: "#6B7280" }}>
              Enter your new password below.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-sm px-4 py-3 rounded-md" style={{ background: "#FEE2E2", color: "#991B1B" }}>
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1" style={{ color: "#1C2127" }}>
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-3 py-2 text-sm border rounded-md outline-none"
                  style={{ background: "#FFFFFF", borderColor: "#D1D5DB", color: "#1C2127" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#44645D")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
                />
                <StrengthBar password={password} />
              </div>

              <div>
                <label htmlFor="confirm" className="block text-sm font-medium mb-1" style={{ color: "#1C2127" }}>
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat your new password"
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
                {loading ? "Resetting…" : "Reset password"}
              </button>
            </form>

            <p className="text-center text-sm mt-6" style={{ color: "#6B7280" }}>
              Remember it?{" "}
              <Link href="/login" style={{ color: "#44645D", fontWeight: 500, textDecoration: "none" }}>
                Sign in →
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
