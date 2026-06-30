import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/firebase";
import { env } from "@/lib/env";

// Verifies email + password against Firebase Auth via the REST API.
// Firebase Admin SDK cannot verify passwords — only the client-facing REST API can.
async function verifyFirebasePassword(
  email: string,
  password: string
): Promise<{ uid: string; email: string } | null> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${env.firebase.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.localId) return null;
  return { uid: data.localId, email: data.email };
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const verified = await verifyFirebasePassword(
          credentials.email,
          credentials.password
        );
        if (!verified) return null;

        // Fetch the user document written at signup to get orgId + role + status
        const userSnap = await db.collection("users").doc(verified.uid).get();
        if (!userSnap.exists) return null;
        const userData = userSnap.data()!;

        const status = (userData.status ?? "active") as "active" | "pending_approval" | "blocked";

        // Blocked members cannot log in at all
        if (status === "blocked") throw new Error("BLOCKED");

        const orgId = userData.orgId as string;
        const role  = (userData.role ?? "lawyer") as "admin" | "lawyer";

        // Fetch org name for all statuses — /pending page displays it for pending members
        const orgSnap = await db.collection("organizations").doc(orgId).get();
        const orgName = orgSnap.exists ? (orgSnap.data()!.name as string) : "";

        // Pending members get a JWT with status "pending_approval" so the middleware
        // can route them to /pending without erroring at the login page.
        return {
          id: verified.uid,
          email: verified.email,
          name: userData.name as string | undefined,
          orgId,
          orgName,
          role,
          status,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.orgId = user.orgId;
        token.orgName = user.orgName;
        token.role = user.role;
        token.status = user.status;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid;
      session.user.orgId = token.orgId;
      session.user.orgName = token.orgName;
      session.user.role = token.role;
      session.user.status = token.status;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
