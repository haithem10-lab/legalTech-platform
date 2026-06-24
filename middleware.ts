import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

// Only /admin/* is protected. Public routes — /api/public/*, /login, /embed.js —
// are never matched and therefore never blocked.
export const config = {
  matcher: ["/admin/:path*"],
};
