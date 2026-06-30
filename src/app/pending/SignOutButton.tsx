"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={`text-sm font-medium px-5 py-2 rounded-md transition-opacity font-sans`}
      style={{
        background: "transparent",
        color: "#6B7280",
        border: "1px solid #E4E0D6",
        cursor: "pointer",
      }}
    >
      Sign out
    </button>
  );
}
