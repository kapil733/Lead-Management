"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { z } from "zod";
import { signIn, signOut, auth } from "@/server/auth";
import { fail, ok, type ActionResult } from "@/server/action-result";
import { prisma } from "@/server/db";
import {
  hashPassword,
  validatePasswordStrength,
  verifyPassword,
} from "@/server/auth/password";
import { Role } from "@prisma/client";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function loginAction(
  input: unknown,
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION", "Invalid email or password");
  }

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";

  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      ip,
      redirect: false,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return fail("INVALID_CREDENTIALS", "Invalid email or password");
    }
    throw err;
  }

  const session = await auth();
  const role = session?.user?.role;
  const mustChange = session?.user?.mustChangePassword;

  if (mustChange) {
    return ok({ redirectTo: "/app/profile?force=1" });
  }
  if (role === Role.ADMIN) {
    return ok({ redirectTo: "/admin/dashboard" });
  }
  return ok({ redirectTo: "/app" });
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10),
});

export async function changePasswordAction(
  input: unknown,
): Promise<ActionResult<{ ok: true }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("UNAUTHORIZED", "You must be signed in");
  }

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION", "Invalid input", {
      newPassword: parsed.error.flatten().fieldErrors.newPassword ?? [],
    });
  }

  const strength = validatePasswordStrength(parsed.data.newPassword);
  if (strength) {
    return fail("VALIDATION", strength, {
      newPassword: [strength],
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) {
    return fail("UNAUTHORIZED", "User not found");
  }

  const valid = await verifyPassword(
    parsed.data.currentPassword,
    user.passwordHash,
  );
  if (!valid) {
    return fail("INVALID_CREDENTIALS", "Current password is incorrect", {
      currentPassword: ["Current password is incorrect"],
    });
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });

  return ok({ ok: true });
}
