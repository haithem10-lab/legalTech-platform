import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// Verifies email + password against Firebase Auth via the REST API.
// Firebase Admin SDK cannot verify passwords — only the client-facing REST API can.
async function verifyFirebasePassword(
  email: string,
  password: string
): Promise<{ uid: string; email: string } | null> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`,
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
        // Firebase UID becomes the accountId scoping all Firestore writes
        return {
          id: verified.uid,
          email: verified.email,
          accountId: verified.uid,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.accountId = user.accountId;
      return token;
    },
    session({ session, token }) {
      session.user.accountId = token.accountId;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
