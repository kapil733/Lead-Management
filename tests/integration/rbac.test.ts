import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";

/**
 * Phase 1: document expected RBAC redirects.
 * Full HTTP integration against a running server lands in later hardening.
 * Proxy rules under test here as pure path logic.
 */

function resolveAccess(opts: {
  path: string;
  role: Role | null;
  mustChangePassword?: boolean;
}): "allow" | "login" | "app" | "admin" | "force-profile" {
  const { path, role, mustChangePassword } = opts;
  if (!role) {
    if (path.startsWith("/login") || path.startsWith("/api/auth")) return "allow";
    return "login";
  }
  if (path.startsWith("/admin") && role !== Role.ADMIN) return "app";
  if (mustChangePassword && !path.startsWith("/app/profile") && !path.startsWith("/api/auth")) {
    return "force-profile";
  }
  if (path === "/" || path === "/app") {
    return role === Role.ADMIN ? "admin" : "allow";
  }
  return "allow";
}

describe("RBAC path rules", () => {
  it("blocks EMPLOYEE from /admin", () => {
    expect(
      resolveAccess({ path: "/admin/dashboard", role: Role.EMPLOYEE }),
    ).toBe("app");
  });

  it("allows ADMIN on /admin", () => {
    expect(
      resolveAccess({ path: "/admin/dashboard", role: Role.ADMIN }),
    ).toBe("allow");
  });

  it("sends unauthenticated users to login", () => {
    expect(resolveAccess({ path: "/app", role: null })).toBe("login");
  });

  it("forces password change", () => {
    expect(
      resolveAccess({
        path: "/app",
        role: Role.EMPLOYEE,
        mustChangePassword: true,
      }),
    ).toBe("force-profile");
  });
});
