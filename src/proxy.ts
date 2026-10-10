import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { Role } from "@prisma/client";

/**
 * Next.js 16 uses `proxy.ts` (nodejs runtime) instead of edge `middleware.ts`.
 * RBAC: employees blocked from /admin/**; unauthenticated redirected to /login.
 */
export default auth((req) => {
  const path = req.nextUrl.pathname;
  const user = req.auth?.user;
  const isLoggedIn = !!user?.id;

  if (
    path.startsWith("/_next") ||
    path.startsWith("/favicon") ||
    path.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  if (path === "/login") {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL(homeForRole(user.role), req.url));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const login = new URL("/login", req.url);
    login.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(login);
  }

  if (path.startsWith("/admin") && user.role !== Role.ADMIN) {
    return NextResponse.redirect(new URL("/app", req.url));
  }

  if (
    (path.startsWith("/app") || path === "/") &&
    user.role === Role.ADMIN &&
    !path.startsWith("/admin")
  ) {
    // Admins landing on employee routes go to admin dashboard
    if (path === "/" || path === "/app") {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }
  }

  if (user.mustChangePassword) {
    const allowed =
      path.startsWith("/app/profile") || path.startsWith("/api/auth");
    if (!allowed) {
      return NextResponse.redirect(new URL("/app/profile?force=1", req.url));
    }
  }

  if (path === "/") {
    return NextResponse.redirect(new URL(homeForRole(user.role), req.url));
  }

  return NextResponse.next();
});

function homeForRole(role: Role): string {
  return role === Role.ADMIN ? "/admin/dashboard" : "/app";
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

// Satisfy NextRequest import used by auth typings in some builds
export type { NextRequest };
