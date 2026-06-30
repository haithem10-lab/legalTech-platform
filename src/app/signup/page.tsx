"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { FileText, Clock } from "lucide-react";
import { BLOCKED_DOMAINS } from "@/lib/blocked-domains";

const FIRM_SIZES = [
  "Solo practitioner",
  "2–10 lawyers",
  "11–50 lawyers",
  "50+ lawyers",
];

function isPersonalDomain(email: string) {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? BLOCKED_DOMAINS.includes(domain) : false;
}

type OrgInfo = { exists: false } | { exists: true; orgName: string };

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

function TextInput({
  id, label, type = "text", placeholder, value, onChange, autoComplete, hint, error,
}: {
  id: string; label: string; type?: string; placeholder: string;
  value: string; onChange: (v: string) => void; autoComplete?: string;
  hint?: string; error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1" style={{ color: "#1C2127" }}>
        {label}
      </label>
      <input
        id={id} type={type} required autoComplete={autoComplete}
        value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border rounded-md outline-none"
        style={{
          background: "#FFFFFF",
          borderColor: error ? "#B23A2E" : "#D1D5DB",
          color: "#1C2127",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = error ? "#B23A2E" : "#44645D")}
        onBlur={(e) => (e.currentTarget.style.borderColor = error ? "#B23A2E" : "#D1D5DB")}
      />
      {hint && !error && (
        <p className="mt-1" style={{ fontSize: 11, color: "#8A8378" }}>{hint}</p>
      )}
      {error && (
        <p className="mt-1" style={{ fontSize: 12, color: "#B23A2E" }}>{error}</p>
      )}
    </div>
  );
}

function ProgressBar({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 mb-7">
      {[1, 2].map((n) => {
        const active = step === n;
        const done = step > n;
        return (
          <div key={n} className="flex items-center gap-2 flex-1">
            <div
              className="flex items-center justify-center rounded-full text-xs font-semibold flex-shrink-0"
              style={{
                width: 24, height: 24,
                background: active || done ? "#44645D" : "#E4E0D6",
                color: active || done ? "#FBF8F2" : "#8A8270",
              }}
            >
              {done ? "✓" : n}
            </div>
            <span className={`text-xs font-sans`}
              style={{ color: active ? "#1C2127" : "#8A8270", fontWeight: active ? 600 : 400 }}>
              {n === 1 ? "Personal info" : "Firm info"}
            </span>
            {n < 2 && (
              <div className="flex-1 h-px" style={{ background: step > 1 ? "#44645D" : "#E4E0D6" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);
  const [pendingOrgName, setPendingOrgName] = useState<string | null>(null);

  // Step 1 fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailError, setEmailError] = useState("");

  // Step 2 — Scenario A only
  const [firmName, setFirmName] = useState("");
  const [firmSize, setFirmSize] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setEmailError("");

    if (isPersonalDomain(email)) {
      setEmailError(
        "Please use your work email address. Personal email addresses (Gmail, Yahoo, etc.) are not supported."
      );
      return;
    }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }

    setLoading(true);
    const domain = email.trim().toLowerCase().split("@")[1];
    const res = await fetch(`/api/auth/check-domain?domain=${encodeURIComponent(domain)}`);
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok || data.blocked) {
      setEmailError(
        "Please use your work email address. Personal email addresses are not supported."
      );
      return;
    }

    setOrgInfo(data.exists ? { exists: true, orgName: data.orgName } : { exists: false });
    setStep(2);
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Scenario A only requires firmName
    if (orgInfo && !orgInfo.exists && !firmName.trim()) {
      setError("Law firm name is required.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, email, password,
        firmName: firmName.trim() || undefined,
        firmSize: firmSize || undefined,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    // Scenario B — pending, don't sign in
    if (!data.isFirstMember) {
      setLoading(false);
      setPendingOrgName(data.orgName);
      return;
    }

    // Scenario A — auto sign in
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (result?.error) {
      setError("Account created but sign-in failed. Please sign in manually.");
      return;
    }

    router.push("/admin/workflows");
  }

  // ── Pending state ──────────────────────────────────────────────────────────
  if (pendingOrgName) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FBF8F2" }}>
        <div className="w-full max-w-sm px-6 py-10 text-center">
          <div className="flex items-center justify-center gap-2 mb-8">
            <FileText size={22} color="#44645D" />
            <span className={`text-lg font-semibold font-sans`} style={{ color: "#1C2127" }}>
              LegalTech
            </span>
          </div>
          <div className="flex justify-center mb-5">
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "#E6F0EA", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Clock size={26} color="#44645D" />
            </div>
          </div>
          <h1 className={`text-2xl font-semibold mb-3 font-serif`} style={{ color: "#1C2127" }}>
            Request sent!
          </h1>
          <p className={`text-sm mb-2 font-sans`} style={{ color: "#1C2127" }}>
            The admin at <strong>{pendingOrgName}</strong> will review your request.
          </p>
          <p className={`text-sm mb-8 font-sans`} style={{ color: "#6B7280" }}>
            You&apos;ll receive access once they approve it.
          </p>
          <Link href="/login" className={`text-sm font-medium font-sans`}
            style={{ color: "#44645D", textDecoration: "none" }}>
            Already approved? Sign in →
          </Link>
        </div>
      </div>
    );
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#FBF8F2" }}>
      <div className="w-full max-w-sm px-6 py-10">
        <div className="flex items-center justify-center gap-2 mb-6">
          <FileText size={22} color="#44645D" />
          <span className={`text-lg font-semibold font-sans`} style={{ color: "#1C2127" }}>
            LegalTech
          </span>
        </div>

        <h1 className={`text-2xl font-semibold text-center mb-1 font-serif`} style={{ color: "#1C2127" }}>
          {step === 1
            ? "Create your account"
            : orgInfo?.exists
            ? "Your firm is already on LegalTech!"
            : "Tell us about your firm"}
        </h1>
        <p className={`text-sm text-center mb-6 font-sans`} style={{ color: "#6B7280" }}>
          {step === 1
            ? "Start building legal intake forms in minutes"
            : orgInfo?.exists
            ? "Request access to join your team"
            : "We'll set up your firm's workspace"}
        </p>

        <ProgressBar step={step} />

        {error && (
          <div className={`text-sm px-4 py-3 rounded-md mb-4 font-sans`}
            style={{ background: "#FEE2E2", color: "#991B1B" }}>
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleStep1} className={`space-y-4 font-sans`}>
            <TextInput id="name" label="Full name" placeholder="Jane Smith"
              value={name} onChange={setName} autoComplete="name" />
            <TextInput id="email" label="Email address" type="email"
              placeholder="you@lawfirm.com" value={email}
              onChange={(v) => { setEmail(v); setEmailError(""); }}
              autoComplete="email"
              hint="Use your work email (e.g. sarah@smithlaw.com)"
              error={emailError} />
            <div>
              <TextInput id="password" label="Password" type="password"
                placeholder="Min. 8 characters" value={password}
                onChange={setPassword} autoComplete="new-password" />
              <StrengthBar password={password} />
            </div>
            <TextInput id="confirmPassword" label="Confirm password" type="password"
              placeholder="Repeat your password" value={confirmPassword}
              onChange={setConfirmPassword} autoComplete="new-password" />
            <button type="submit" disabled={loading}
              className="w-full py-2 px-4 text-sm font-medium text-white rounded-md disabled:opacity-60"
              style={{ background: "#44645D" }}>
              {loading ? "Checking…" : "Continue →"}
            </button>
          </form>
        ) : orgInfo?.exists ? (
          // ── Scenario B — org exists, request to join ─────────────────────
          <form onSubmit={handleStep2} className={`space-y-4 font-sans`}>
            <div className="rounded-lg px-4 py-4" style={{ background: "#E6F0EA", border: "1px solid #BCD9C8" }}>
              <p className="text-sm font-semibold mb-1" style={{ color: "#1C2127" }}>
                {orgInfo.orgName}
              </p>
              <p className="text-sm" style={{ color: "#5C564C" }}>
                Your request will be sent to the firm admin for approval.
              </p>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2 px-4 text-sm font-medium text-white rounded-md disabled:opacity-60"
              style={{ background: "#44645D" }}>
              {loading ? "Sending request…" : "Request access"}
            </button>
            <button type="button" onClick={() => { setStep(1); setError(""); setOrgInfo(null); }}
              className="w-full py-2 px-4 text-sm font-medium rounded-md"
              style={{ background: "transparent", color: "#6B7280", border: "1px solid #E4E0D6" }}>
              ← Back
            </button>
          </form>
        ) : (
          // ── Scenario A — new org, first member ───────────────────────────
          <form onSubmit={handleStep2} className={`space-y-4 font-sans`}>
            <div className="rounded-lg px-4 py-3 mb-1"
              style={{ background: "#F3F1EC", border: "1px solid #E4E0D6", fontSize: 12, color: "#5C564C" }}>
              You&apos;re the first from your firm — you&apos;ll be set up as admin.
            </div>
            <TextInput id="firmName" label="Law firm name"
              placeholder="Smith & Associates" value={firmName}
              onChange={setFirmName} autoComplete="organization" />
            <div>
              <label htmlFor="firmSize" className="block text-sm font-medium mb-1" style={{ color: "#1C2127" }}>
                Firm size <span style={{ color: "#8A8270", fontWeight: 400 }}>(optional)</span>
              </label>
              <select id="firmSize" value={firmSize}
                onChange={(e) => setFirmSize(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md outline-none"
                style={{ background: "#FFFFFF", borderColor: "#D1D5DB", color: firmSize ? "#1C2127" : "#9CA3AF" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#44645D")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}>
                <option value="">Select firm size</option>
                {FIRM_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2 px-4 text-sm font-medium text-white rounded-md disabled:opacity-60"
              style={{ background: "#44645D" }}>
              {loading ? "Creating account…" : "Create account"}
            </button>
            <button type="button" onClick={() => { setStep(1); setError(""); setOrgInfo(null); }}
              className="w-full py-2 px-4 text-sm font-medium rounded-md"
              style={{ background: "transparent", color: "#6B7280", border: "1px solid #E4E0D6" }}>
              ← Back
            </button>
          </form>
        )}

        <p className={`text-center text-sm mt-6 font-sans`} style={{ color: "#6B7280" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#44645D", fontWeight: 500, textDecoration: "none" }}>
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  );
}
