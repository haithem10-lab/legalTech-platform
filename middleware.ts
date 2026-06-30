import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Pending members can only visit /pending
    if (token?.status === "pending_approval" && pathname !== "/pending") {
      return NextResponse.redirect(new URL("/pending", req.url));
    }

    // Blocked members must sign out — defense-in-depth for any future path
    // that could issue a JWT with status "blocked"
    if (token?.status === "blocked") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Active admin restriction: /admin/settings/* is admin-only
    if (
      pathname.startsWith("/admin/settings") &&
      token?.role !== "admin"
    ) {
      return NextResponse.redirect(new URL("/admin/workflows", req.url));
    }

    return NextResponse.next();
  },
  {
    pages: { signIn: "/login" },
  }
);

// Authenticated routes:
//   /admin/:path*   all admin portal pages
//   /pending        shown to pending members (authenticated but not yet approved)
// Public routes (not in matcher — no middleware runs):
//   /  /login  /signup  /forgot-password  /reset-password  /invite/:token
export const config = {
  matcher: ["/admin/:path*", "/pending"],
};
