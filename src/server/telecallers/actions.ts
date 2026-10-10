"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { requireRole, isActionResult } from "@/server/auth/session";
import { fail, ok, type ActionResult } from "@/server/action-result";
import type { SessionUser } from "@/server/auth/session";
import {
  createTelecallerSchema,
  telecallerIdSchema,
} from "@/lib/validators/telecallers";
import {
  createTelecaller,
  resetTelecallerPassword,
  setTelecallerActive,
} from "@/server/telecallers/mutations";
import { z } from "zod";

async function clientIp() {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null
  );
}

function authFail<T>(
  gate: ActionResult<SessionUser>,
): ActionResult<T> {
  if (!gate.ok) {
    return fail(gate.error.code, gate.error.message, gate.error.fieldErrors);
  }
  return fail("FORBIDDEN", "Not authorised");
}

export async function createTelecallerAction(
  input: unknown,
): Promise<
  ActionResult<{
    id: string;
    name: string;
    email: string;
    tempPassword: string;
  }>
> {
  const gate = await requireRole(Role.ADMIN);
  if (isActionResult(gate)) return authFail(gate);

  const parsed = createTelecallerSchema.safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION", "Invalid input", {
      form: parsed.error.issues.map((i) => i.message),
    });
  }

  const result = await createTelecaller({
    data: parsed.data,
    actorId: gate.id,
    ip: await clientIp(),
  });
  if (!result.ok) {
    return fail("CONFLICT", result.error);
  }

  revalidatePath("/admin/employees");
  return ok(result.data);
}

export async function resetTelecallerPasswordAction(
  input: unknown,
): Promise<ActionResult<{ id: string; email: string; tempPassword: string }>> {
  const gate = await requireRole(Role.ADMIN);
  if (isActionResult(gate)) return authFail(gate);

  const parsed = telecallerIdSchema.safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION", "userId is required");
  }

  const result = await resetTelecallerPassword({
    userId: parsed.data.userId,
    actorId: gate.id,
    ip: await clientIp(),
  });
  if (!result.ok) {
    return fail("NOT_FOUND", result.error);
  }

  revalidatePath("/admin/employees");
  revalidatePath(`/admin/employees/${parsed.data.userId}`);
  return ok(result.data);
}

export async function setTelecallerActiveAction(
  input: unknown,
): Promise<ActionResult<{ id: string; isActive: boolean }>> {
  const gate = await requireRole(Role.ADMIN);
  if (isActionResult(gate)) return authFail(gate);

  const parsed = telecallerIdSchema
    .extend({ isActive: z.boolean() })
    .safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION", "Invalid input");
  }

  const result = await setTelecallerActive({
    userId: parsed.data.userId,
    isActive: parsed.data.isActive,
    actorId: gate.id,
    ip: await clientIp(),
  });
  if (!result.ok) {
    return fail("NOT_FOUND", result.error);
  }

  revalidatePath("/admin/employees");
  revalidatePath(`/admin/employees/${parsed.data.userId}`);
  return ok(result.data);
}
