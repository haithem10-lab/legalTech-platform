"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewWorkflowPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a workflow name.");
      return;
    }

    setError("");
    setLoading(true);

    const res = await fetch("/api/admin/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Please try again.");
      return;
    }

    const { id } = await res.json();
    router.push(`/admin/workflows/${id}/build`);
  }

  return (
    <div
      className="flex items-start justify-center px-6 py-16"
      style={{ background: "#F3F1EC", flex: 1 }}
    >
      <div
        className="w-full max-w-md p-8 rounded-xl"
        style={{ background: "#FFFFFF", border: "1px solid #E4E0D6", boxShadow: "0 2px 12px rgba(28,33,39,0.06)" }}
      >
        <h1
          className={`text-2xl font-semibold mb-1 font-serif`}
          style={{ color: "#1C2127" }}
        >
          New workflow
        </h1>
        <p
          className={`text-sm mb-6 font-sans`}
          style={{ color: "#6B7280" }}
        >
          Give your workflow a name — you can change it later.
        </p>

        <form onSubmit={handleCreate} className={`space-y-4 font-sans`}>
          {error && (
            <div
              className="text-sm px-4 py-3 rounded-md"
              style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B23A2E" }}
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="workflow-name"
              className="block text-sm font-medium mb-1"
              style={{ color: "#1C2127" }}
            >
              Workflow name
            </label>
            <input
              id="workflow-name"
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Create a Company"
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

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => router.push("/admin/workflows")}
              className="flex-1 py-2 text-sm font-medium rounded-md border"
              style={{ borderColor: "#C9C2B4", color: "#374151" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 text-sm font-medium text-white rounded-md disabled:opacity-60"
              style={{ background: "#44645D" }}
            >
              {loading ? "Creating…" : "Create workflow"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
