"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import {
  requireRole,
  isActionResult,
  type SessionUser,
} from "@/server/auth/session";
import { fail, ok, type ActionResult } from "@/server/action-result";
import { releaseCase } from "@/server/cases/release";

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

export async function releaseCaseAction(
  input: unknown,
): Promise<ActionResult<{ caseId: string; leadId: string }>> {
  const gate = await requireRole(Role.ADMIN);
  if (isActionResult(gate)) return authFail(gate);

  const result = await releaseCase({
    actorId: gate.id,
    payload: input,
    ip: await clientIp(),
  });
  if (!result.ok) {
    return fail(
      result.error.code,
      result.error.message,
      result.error.fieldErrors,
    );
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/leads");
  revalidatePath("/admin/employees");
  revalidatePath("/admin/audit-log");
  revalidatePath("/app");
  return ok(result.data);
}
