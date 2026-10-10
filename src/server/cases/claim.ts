import "server-only";

import { CaseStatus, LeadStatus, Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit/write";
import { getAppSettings } from "@/server/settings";
import { startOfTodayIST } from "@/lib/dates";

export type ClaimResult =
  | {
      ok: true;
      data: {
        caseId: string;
        leadId: string;
        resumed: boolean;
      };
    }
  | {
      ok: false;
      error: { code: string; message: string };
    };

type LeadLockRow = { id: string };

async function pickLeadId(
  tx: Prisma.TransactionClient,
  employeeId: string,
  now: Date,
  preferUnattempted: boolean,
): Promise<string | null> {
  if (preferUnattempted) {
    const rows = await tx.$queryRaw<LeadLockRow[]>`
      SELECT l.id
      FROM "Lead" l
      WHERE l.status = 'NEW'::"LeadStatus"
        AND (l."nextEligibleAt" IS NULL OR l."nextEligibleAt" <= ${now})
        AND NOT EXISTS (
          SELECT 1 FROM "Case" c
          WHERE c."leadId" = l.id AND c."employeeId" = ${employeeId}
        )
      ORDER BY l.priority DESC, l."createdAt" ASC
      LIMIT 1
      FOR UPDATE OF l SKIP LOCKED
    `;
    if (rows[0]?.id) return rows[0].id;
  }

  const rows = await tx.$queryRaw<LeadLockRow[]>`
    SELECT l.id
    FROM "Lead" l
    WHERE l.status = 'NEW'::"LeadStatus"
      AND (l."nextEligibleAt" IS NULL OR l."nextEligibleAt" <= ${now})
    ORDER BY l.priority DESC, l."createdAt" ASC
    LIMIT 1
    FOR UPDATE OF l SKIP LOCKED
  `;
  return rows[0]?.id ?? null;
}

export async function claimNextCase(input: {
  employeeId: string;
  ip?: string | null;
}): Promise<ClaimResult> {
  const settings = await getAppSettings();
  const now = new Date();
  const todayStart = startOfTodayIST(now);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const open = await tx.case.findFirst({
        where: { employeeId: input.employeeId, status: CaseStatus.OPEN },
        select: { id: true, leadId: true },
      });
      if (open) {
        return {
          caseId: open.id,
          leadId: open.leadId,
          resumed: true,
        };
      }

      const todayStarted = await tx.case.count({
        where: {
          employeeId: input.employeeId,
          startedAt: { gte: todayStart },
          status: { in: [CaseStatus.OPEN, CaseStatus.CLOSED] },
        },
      });
      if (todayStarted >= settings.dailyCaseCap) {
        throw Object.assign(new Error("DAILY_CAP"), {
          code: "DAILY_CAP",
          message: `Daily case cap of ${settings.dailyCaseCap} reached`,
        });
      }

      let leadId = await pickLeadId(tx, input.employeeId, now, true);
      if (!leadId) {
        leadId = await pickLeadId(tx, input.employeeId, now, false);
      }
      if (!leadId) {
        throw Object.assign(new Error("POOL_EMPTY"), {
          code: "POOL_EMPTY",
          message: "No leads available in the pool right now",
        });
      }

      const lead = await tx.lead.findUnique({
        where: { id: leadId },
        select: { id: true, status: true },
      });
      if (!lead || lead.status !== LeadStatus.NEW) {
        throw Object.assign(new Error("POOL_EMPTY"), {
          code: "POOL_EMPTY",
          message: "No leads available in the pool right now",
        });
      }

      await tx.lead.update({
        where: { id: leadId },
        data: { status: LeadStatus.IN_CASE },
      });

      const created = await tx.case.create({
        data: {
          leadId,
          employeeId: input.employeeId,
          status: CaseStatus.OPEN,
          startedAt: now,
        },
        select: { id: true, leadId: true },
      });

      return {
        caseId: created.id,
        leadId: created.leadId,
        resumed: false,
      };
    });

    await writeAudit({
      actorId: input.employeeId,
      action: result.resumed ? "CASE_RESUME" : "CASE_CLAIM",
      entityType: "Case",
      entityId: result.caseId,
      meta: { leadId: result.leadId, resumed: result.resumed },
      ip: input.ip,
    });

    return { ok: true, data: result };
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e.code === "DAILY_CAP" || e.code === "POOL_EMPTY") {
      return {
        ok: false,
        error: {
          code: e.code,
          message: e.message ?? "Could not claim a case",
        },
      };
    }
    // Unique partial index race → treat as busy/retry message
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return {
        ok: false,
        error: {
          code: "CONFLICT",
          message: "That lead was just claimed. Try again.",
        },
      };
    }
    throw err;
  }
}
