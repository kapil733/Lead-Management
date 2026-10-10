import "server-only";

import { auth } from "@/server/auth";
import type { Role } from "@prisma/client";
import { fail, type ActionResult } from "@/server/action-result";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  mustChangePassword: boolean;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) {
    return null;
  }
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    role: session.user.role,
    mustChangePassword: session.user.mustChangePassword ?? false,
  };
}

export async function requireUser(): Promise<
  ActionResult<SessionUser> | SessionUser
> {
  const user = await getSessionUser();
  if (!user) {
    return fail("UNAUTHORIZED", "You must be signed in");
  }
  return user;
}

export async function requireRole(
  ...roles: Role[]
): Promise<ActionResult<SessionUser> | SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    return fail("UNAUTHORIZED", "You must be signed in");
  }
  if (!roles.includes(user.role)) {
    return fail("FORBIDDEN", "You do not have access to this resource");
  }
  return user;
}

export function isActionResult<T>(
  value: ActionResult<T> | T,
): value is ActionResult<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    typeof (value as ActionResult<T>).ok === "boolean"
  );
}
