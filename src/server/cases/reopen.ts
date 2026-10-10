import "server-only";

import { CallOutcome, CaseStatus, LeadStatus, Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit/write";

export type ReopenResult =
  | { ok: true; data: { caseId: string; leadId: string; resumed: boolean } }
  | { ok: false; error: { code: string; message: string } };

/**
 * Start the same lead again from a reconnect the employee already closed.
 * She is calling that person now, so cooldown does not apply.
 */
export async function reopenReconnectCase(input: {
  employeeId: string;
  historyCaseId: string;
  ip?: string | null;
}): Promise<ReopenResult> {
  const history = await prisma.case.findFirst({
    where: {
      id: input.historyCaseId,
      employeeId: input.employeeId,
      status: CaseStatus.CLOSED,
      outcome: CallOutcome.CALL_BACK_LATER,
    },
    select: { id: true, leadId: true },
  });
  if (!history) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "That reconnect call was not found" },
    };
  }

  const now = new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const open = await tx.case.findFirst({
        where: { employeeId: input.employeeId, status: CaseStatus.OPEN },
        select: { id: true, leadId: true },
      });
      if (open) {
        if (open.leadId === history.leadId) {
          return { caseId: open.id, leadId: open.leadId, resumed: true };
        }
        throw Object.assign(new Error("ALREADY_OPEN"), {
          code: "ALREADY_OPEN",
          message: "Close the case you have open before calling this person again",
        });
      }

      const locked = await tx.$queryRaw<Array<{ id: string; status: LeadStatus }>>`
        SELECT id, status
        FROM "Lead"
        WHERE id = ${history.leadId}
        FOR UPDATE
      `;
      const lead = locked[0];
      if (!lead) {
        throw Object.assign(new Error("NOT_FOUND"), {
          code: "NOT_FOUND",
          message: "That lead is no longer available",
        });
      }
      if (lead.status === LeadStatus.CLOSED) {
        throw Object.assign(new Error("CLOSED"), {
          code: "CLOSED",
          message: "This lead is already closed",
        });
      }

      const otherOpen = await tx.case.findFirst({
        where: { leadId: lead.id, status: CaseStatus.OPEN },
        select: { id: true },
      });
      if (otherOpen) {
        throw Object.assign(new Error("CONFLICT"), {
          code: "CONFLICT",
          message: "Someone else is already on this call",
        });
      }

      await tx.lead.update({
        where: { id: lead.id },
        data: { status: LeadStatus.IN_CASE, nextEligibleAt: null },
      });

      const created = await tx.case.create({
        data: {
          leadId: lead.id,
          employeeId: input.employeeId,
          status: CaseStatus.OPEN,
          startedAt: now,
        },
        select: { id: true, leadId: true },
      });

      return { caseId: created.id, leadId: created.leadId, resumed: false };
    });

    await writeAudit({
      actorId: input.employeeId,
      action: result.resumed ? "CASE_RESUME" : "CASE_REOPEN",
      entityType: "Case",
      entityId: result.caseId,
      meta: { leadId: result.leadId, fromCaseId: history.id, resumed: result.resumed },
      ip: input.ip,
    });

    return { ok: true, data: result };
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (
      e.code === "ALREADY_OPEN" ||
      e.code === "NOT_FOUND" ||
      e.code === "CLOSED" ||
      e.code === "CONFLICT"
    ) {
      return {
        ok: false,
        error: { code: e.code, message: e.message ?? "Could not open this call" },
      };
    }
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return {
        ok: false,
        error: {
          code: "CONFLICT",
          message: "Someone else is already on this call",
        },
      };
    }
    throw err;
  }
}
