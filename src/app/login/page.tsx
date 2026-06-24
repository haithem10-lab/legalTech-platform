"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Source_Serif_4, Inter } from "next/font/google";
import { FileText } from "lucide-react";

const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "600"] });
const inter = Inter({ subsets: ["latin"] });

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
      setError("Invalid email or password.");
      return;
    }

    router.push("/admin/workflows");
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#FBF8F2" }}
    >
      <div className="w-full max-w-sm px-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <FileText size={22} color="#1F6F54" />
          <span
            className={`text-lg font-semibold ${inter.className}`}
            style={{ color: "#1C2127" }}
          >
            LegalTech
          </span>
        </div>

        {/* Heading */}
        <h1
          className={`text-2xl font-semibold text-center mb-1 ${sourceSerif.className}`}
          style={{ color: "#1C2127" }}
        >
          Sign in to your account
        </h1>
        <p
          className={`text-sm text-center mb-8 ${inter.className}`}
          style={{ color: "#6B7280" }}
        >
          Manage your legal workflow forms
        </p>

        <form
          onSubmit={handleSubmit}
          className={`space-y-4 ${inter.className}`}
        >
          {error && (
            <div
              className="text-sm px-4 py-3 rounded-md"
              style={{ background: "#FEE2E2", color: "#991B1B" }}
            >
              {error}
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
              onFocus={(e) => (e.currentTarget.style.borderColor = "#1F6F54")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1"
              style={{ color: "#1C2127" }}
            >
              Password
            </label>
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
              onFocus={(e) => (e.currentTarget.style.borderColor = "#1F6F54")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 text-sm font-medium text-white rounded-md transition-opacity disabled:opacity-60"
            style={{ background: "#1F6F54" }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
