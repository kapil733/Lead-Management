"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { CallOutcome, Role } from "@prisma/client";
import { z } from "zod";
import {
  requireRole,
  isActionResult,
  type SessionUser,
} from "@/server/auth/session";
import { fail, ok, type ActionResult } from "@/server/action-result";
import { claimNextCase } from "@/server/cases/claim";
import { reopenReconnectCase } from "@/server/cases/reopen";
import { closeCase } from "@/server/cases/close";
import { markCallClicked } from "@/server/cases/active";
import { getCompletedCaseDetail } from "@/server/cases/completed";
import { setLeadJoined } from "@/server/leads/joined";
import {
  consumeRateLimit,
  RATE_LIMITS,
} from "@/server/security/rate-limit";

async function clientIp() {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null
  );
}

function authFail<T>(gate: ActionResult<SessionUser>): ActionResult<T> {
  if (!gate.ok) {
    return fail(gate.error.code, gate.error.message, gate.error.fieldErrors);
  }
  return fail("FORBIDDEN", "Not authorised");
}

async function requireEmployee() {
  return requireRole(Role.EMPLOYEE);
}

export async function claimNextCaseAction(): Promise<
  ActionResult<{ caseId: string; leadId: string; resumed: boolean }>
> {
  const gate = await requireEmployee();
  if (isActionResult(gate)) return authFail(gate);

  const rl = consumeRateLimit(`claim:${gate.id}`, RATE_LIMITS.claim);
  if (!rl.ok) {
    return fail(
      "RATE_LIMIT",
      `Too many claim attempts. Try again in ${rl.retryAfterSeconds}s.`,
    );
  }

  const result = await claimNextCase({
    employeeId: gate.id,
    ip: await clientIp(),
  });
  if (!result.ok) {
    return fail(result.error.code, result.error.message);
  }

  revalidatePath("/app");
  revalidatePath("/app/case");
  return ok(result.data);
}

/** Open a reconnect from history so she can call that person again. */
export async function reopenReconnectAction(
  caseId: string,
): Promise<ActionResult<{ caseId: string; leadId: string; resumed: boolean }>> {
  const gate = await requireEmployee();
  if (isActionResult(gate)) return authFail(gate);

  const parsed = z.object({ caseId: z.string().min(1) }).safeParse({ caseId });
  if (!parsed.success) {
    return fail("VALIDATION", "caseId is required");
  }

  const rl = consumeRateLimit(`claim:${gate.id}`, RATE_LIMITS.claim);
  if (!rl.ok) {
    return fail(
      "RATE_LIMIT",
      `Too many attempts. Try again in ${rl.retryAfterSeconds}s.`,
    );
  }

  const result = await reopenReconnectCase({
    employeeId: gate.id,
    historyCaseId: parsed.data.caseId,
    ip: await clientIp(),
  });
  if (!result.ok) {
    return fail(result.error.code, result.error.message);
  }

  revalidatePath("/app");
  revalidatePath("/app/case");
  revalidatePath("/app/completed");
  return ok(result.data);
}

export async function closeCaseAction(
  input: unknown,
): Promise<
  ActionResult<{
    caseId: string;
    outcome: string;
    rating: number | null;
    referralsSaved: number;
    referralNotes: string[];
  }>
> {
  const gate = await requireEmployee();
  if (isActionResult(gate)) return authFail(gate);

  const result = await closeCase({
    employeeId: gate.id,
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

  revalidatePath("/app");
  revalidatePath("/app/case");
  revalidatePath("/app/completed");
  return ok(result.data);
}

export async function markCallClickedAction(
  input: unknown,
): Promise<ActionResult<{ already: boolean }>> {
  const gate = await requireEmployee();
  if (isActionResult(gate)) return authFail(gate);

  const parsed = z.object({ caseId: z.string().min(1) }).safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION", "caseId is required");
  }

  const result = await markCallClicked({
    employeeId: gate.id,
    caseId: parsed.data.caseId,
    ip: await clientIp(),
  });
  if (!result.ok) {
    return fail("NOT_FOUND", result.error);
  }
  return ok(result.data);
}

/** One history row, opened by the employee who closed it. Phone stays off the list. */
export async function openCompletedCaseAction(caseId: string): Promise<
  ActionResult<{
    id: string;
    closedAt: string | null;
    outcome: CallOutcome | null;
    rating: number | null;
    remarks: string | null;
    leadId: string;
    phone: string;
    name: string | null;
    joined: boolean;
    friends: {
      id: string;
      name: string | null;
      designation: string | null;
      experienceText: string | null;
    }[];
  }>
> {
  const gate = await requireEmployee();
  if (isActionResult(gate)) return authFail(gate);

  const parsed = z.object({ caseId: z.string().min(1) }).safeParse({ caseId });
  if (!parsed.success) {
    return fail("VALIDATION", "caseId is required");
  }

  const row = await getCompletedCaseDetail(gate.id, parsed.data.caseId);
  if (!row) {
    return fail("NOT_FOUND", "That case is not in your history");
  }

  return ok({
    id: row.id,
    closedAt: row.closedAt?.toISOString() ?? null,
    outcome: row.outcome,
    rating: row.rating,
    remarks: row.remarks,
    leadId: row.lead.id,
    phone: row.lead.phone,
    name: row.lead.name,
    joined: row.lead.joined,
    friends: row.referrals.map((r) => ({
      id: r.id,
      name: r.name,
      designation: r.designation,
      experienceText: r.experienceText,
    })),
  });
}

/** Employee: toggle Joined on a lead they closed. */
export async function setOwnLeadJoinedAction(
  input: unknown,
): Promise<ActionResult<{ joined: boolean }>> {
  const gate = await requireEmployee();
  if (isActionResult(gate)) return authFail(gate);

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
    actorRole: Role.EMPLOYEE,
    ip: await clientIp(),
  });
  if (!result.ok) {
    return fail("FORBIDDEN", result.error);
  }

  revalidatePath("/app/completed");
  revalidatePath("/app");
  return ok({ joined: result.data.joined });
}
