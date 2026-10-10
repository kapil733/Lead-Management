"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { z } from "zod";
import { requireRole, isActionResult } from "@/server/auth/session";
import { fail, ok, type ActionResult } from "@/server/action-result";
import {
  countRevertEligible,
  revertImportBatch,
} from "@/server/leads/import-batch";
import { setLeadJoined } from "@/server/leads/joined";
import type { SessionUser } from "@/server/auth/session";

async function clientIp() {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null
  );
}

function requireAdminUser(
  gate: ActionResult<SessionUser> | SessionUser,
): ActionResult<SessionUser> | SessionUser {
  return gate;
}

function authFail<T>(
  gate: ActionResult<SessionUser>,
): ActionResult<T> {
  if (!gate.ok) {
    return fail(gate.error.code, gate.error.message, gate.error.fieldErrors);
  }
  return fail("FORBIDDEN", "Not authorised");
}

export async function revertImportBatchAction(
  input: unknown,
): Promise<ActionResult<{ deleted: number; batchId: string }>> {
  const gate = requireAdminUser(await requireRole(Role.ADMIN));
  if (isActionResult(gate)) {
    return authFail(gate);
  }

  const parsed = z.object({ batchId: z.string().min(1) }).safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION", "batchId is required");
  }

  const result = await revertImportBatch({
    batchId: parsed.data.batchId,
    actorId: gate.id,
    ip: await clientIp(),
  });

  if (!result.ok) {
    return fail("REVERT_FAILED", result.error);
  }

  revalidatePath("/admin/leads");
  revalidatePath("/admin/leads/import");
  return ok(result.data);
}

export async function getRevertEligibleCountAction(
  batchId: string,
): Promise<ActionResult<{ count: number }>> {
  const gate = requireAdminUser(await requireRole(Role.ADMIN));
  if (isActionResult(gate)) {
    return authFail(gate);
  }
  const count = await countRevertEligible(batchId);
  return ok({ count });
}

export async function setLeadJoinedAction(
  input: unknown,
): Promise<ActionResult<{ joined: boolean }>> {
  const gate = requireAdminUser(await requireRole(Role.ADMIN));
  if (isActionResult(gate)) {
    return authFail(gate);
  }

  const parsed = z
    .object({
      leadId: z.string().min(1),
      joined: z.boolean(),
    })
    .safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION", "Invalid input");
  }

  const result = await setLeadJoined({
    ...parsed.data,
    actorId: gate.id,
    actorRole: Role.ADMIN,
    ip: await clientIp(),
  });
  if (!result.ok) {
    return fail("NOT_FOUND", result.error);
  }

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${parsed.data.leadId}`);
  return ok({ joined: result.data.joined });
}
