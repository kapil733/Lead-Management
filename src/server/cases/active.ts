import "server-only";

import { CaseStatus } from "@prisma/client";
import type { PriorRemark } from "@/lib/outcomes";
import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit/write";
import { getAppSettings } from "@/server/settings";
import { APP_TZ, startOfTodayIST } from "@/lib/dates";

export async function getOpenCaseForEmployee(employeeId: string) {
  return prisma.case.findFirst({
    where: { employeeId, status: CaseStatus.OPEN },
    include: {
      lead: {
        select: {
          id: true,
          phone: true,
          name: true,
          city: true,
          location: true,
          bikeType: true,
          trade: true,
          experienceYears: true,
          extra: true,
          source: true,
          attempts: true,
          status: true,
        },
      },
    },
  });
}

/** Earlier remarks on this lead, newest first. Shown when the lead is opened again. */
export async function getPriorRemarks(
  leadId: string,
  currentCaseId: string,
): Promise<PriorRemark[]> {
  const rows = await prisma.case.findMany({
    where: {
      leadId,
      id: { not: currentCaseId },
      status: CaseStatus.CLOSED,
      remarks: { not: null },
    },
    orderBy: { closedAt: "desc" },
    take: 5,
    select: {
      id: true,
      remarks: true,
      outcome: true,
      closedAt: true,
    },
  });

  return rows.flatMap((row) => {
    const remarks = row.remarks?.trim();
    if (!remarks || !row.outcome || !row.closedAt) return [];
    return [
      {
        id: row.id,
        remarks,
        outcome: row.outcome,
        closedAt: row.closedAt.toISOString(),
      },
    ];
  });
}

export async function markCallClicked(input: {
  employeeId: string;
  caseId: string;
  ip?: string | null;
}) {
  const open = await prisma.case.findFirst({
    where: {
      id: input.caseId,
      employeeId: input.employeeId,
      status: CaseStatus.OPEN,
    },
    select: { id: true, callClickedAt: true },
  });
  if (!open) {
    return { ok: false as const, error: "Open case not found" };
  }
  if (open.callClickedAt) {
    return { ok: true as const, data: { already: true as const } };
  }
  await prisma.case.update({
    where: { id: open.id },
    data: { callClickedAt: new Date() },
  });
  await writeAudit({
    actorId: input.employeeId,
    action: "CASE_CALL_CLICK",
    entityType: "Case",
    entityId: open.id,
    ip: input.ip,
  });
  return { ok: true as const, data: { already: false as const } };
}

export async function getEmployeeHomeStats(employeeId: string) {
  const settings = await getAppSettings();
  const todayStart = startOfTodayIST();
  const ymd = formatInTimeZone(new Date(), APP_TZ, "yyyy-MM-dd");
  const [yy, mm] = ymd.split("-") as [string, string];
  const monthStart = new Date(`${yy}-${mm}-01T00:00:00+05:30`);

  const open = await getOpenCaseForEmployee(employeeId);

  const [
    closedToday,
    ratingAgg,
    referralsToday,
    joinedMonth,
    recent,
    todayStarted,
    poolNew,
  ] = await Promise.all([
    prisma.case.count({
      where: {
        employeeId,
        status: CaseStatus.CLOSED,
        closedAt: { gte: todayStart },
      },
    }),
    prisma.case.aggregate({
      where: {
        employeeId,
        status: CaseStatus.CLOSED,
        closedAt: { gte: todayStart },
        rating: { not: null },
      },
      _avg: { rating: true },
    }),
    prisma.referral.count({
      where: {
        case: {
          employeeId,
          status: CaseStatus.CLOSED,
          closedAt: { gte: todayStart },
        },
      },
    }),
    prisma.lead.count({
      where: {
        joined: true,
        joinedAt: { gte: monthStart },
        joinedMarkedById: employeeId,
      },
    }),
    prisma.case.findMany({
      where: { employeeId, status: CaseStatus.CLOSED },
      orderBy: { closedAt: "desc" },
      take: 5,
      select: {
        id: true,
        closedAt: true,
        outcome: true,
        rating: true,
        lead: { select: { name: true, phone: true } },
      },
    }),
    prisma.case.count({
      where: {
        employeeId,
        startedAt: { gte: todayStart },
        status: { in: [CaseStatus.OPEN, CaseStatus.CLOSED] },
      },
    }),
    prisma.lead.count({
      where: {
        status: "NEW",
        OR: [{ nextEligibleAt: null }, { nextEligibleAt: { lte: new Date() } }],
      },
    }),
  ]);

  const atCap = todayStarted >= settings.dailyCaseCap;
  const poolEmpty = poolNew === 0 && !open;

  return {
    settings,
    openCase: open
      ? {
          id: open.id,
          startedAt: open.startedAt.toISOString(),
          leadName: open.lead.name,
        }
      : null,
    kpis: {
      closedToday,
      avgRating: ratingAgg._avg.rating
        ? Math.round(ratingAgg._avg.rating * 10) / 10
        : null,
      referralsToday,
      joinedMonth,
    },
    progress: {
      used: todayStarted,
      cap: settings.dailyCaseCap,
    },
    recent: recent.map((c) => ({
      id: c.id,
      closedAt: c.closedAt?.toISOString() ?? null,
      outcome: c.outcome,
      rating: c.rating,
      name: c.lead.name,
      phoneLast4: c.lead.phone.slice(-4),
    })),
    canClaim: !atCap && !poolEmpty,
    claimBlockedReason: open
      ? null
      : atCap
        ? `Daily case cap of ${settings.dailyCaseCap} reached`
        : poolEmpty
          ? "No leads available in the pool right now"
          : null,
    maxAttempts: settings.maxAttempts,
  };
}

export async function getClosedCaseSummary(input: {
  employeeId: string;
  caseId: string;
}) {
  return prisma.case.findFirst({
    where: {
      id: input.caseId,
      employeeId: input.employeeId,
      status: CaseStatus.CLOSED,
    },
    select: {
      id: true,
      outcome: true,
      rating: true,
      remarks: true,
      closedAt: true,
      lead: { select: { name: true } },
      _count: { select: { referrals: true } },
    },
  });
}
