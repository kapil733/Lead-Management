import "server-only";

import { CaseStatus, CallOutcome, LeadStatus, Role } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "@/server/db";
import { getAppSettings } from "@/server/settings";
import { APP_TZ, startOfTodayIST } from "@/lib/dates";
import type { DashboardPeriod } from "@/lib/validators/dashboard";

function periodStart(period: DashboardPeriod, now = new Date()): Date {
  const today = startOfTodayIST(now);
  if (period === "today") return today;
  const daysBack = period === "7d" ? 6 : 29;
  return new Date(today.getTime() - daysBack * 24 * 60 * 60 * 1000);
}

function dayKeysIST(from: Date, to: Date): string[] {
  const keys: string[] = [];
  let cursor = new Date(from.getTime());
  const endYmd = formatInTimeZone(to, APP_TZ, "yyyy-MM-dd");
  for (let i = 0; i < 40; i++) {
    const ymd = formatInTimeZone(cursor, APP_TZ, "yyyy-MM-dd");
    keys.push(ymd);
    if (ymd === endYmd) break;
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
  return keys;
}

export async function getDashboardData(period: DashboardPeriod) {
  const now = new Date();
  const settings = await getAppSettings();
  const from = periodStart(period, now);
  const staleBefore = new Date(
    now.getTime() - settings.staleCaseMinutes * 60 * 1000,
  );

  const [
    leadCounts,
    closedInPeriod,
    joinedInPeriod,
    referralsInPeriod,
    openCases,
    telecallers,
    closedByEmployee,
  ] = await Promise.all([
    prisma.lead.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.case.findMany({
      where: {
        status: CaseStatus.CLOSED,
        closedAt: { gte: from },
      },
      select: {
        closedAt: true,
        outcome: true,
        rating: true,
        employeeId: true,
      },
    }),
    prisma.lead.count({
      where: {
        joined: true,
        joinedAt: { gte: from },
      },
    }),
    prisma.referral.count({
      where: { createdAt: { gte: from } },
    }),
    prisma.case.findMany({
      where: { status: CaseStatus.OPEN },
      orderBy: { startedAt: "asc" },
      select: {
        id: true,
        startedAt: true,
        callClickedAt: true,
        employee: { select: { id: true, name: true, email: true } },
        lead: {
          select: { id: true, phone: true, name: true, city: true, trade: true },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: Role.EMPLOYEE, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
    prisma.case.groupBy({
      by: ["employeeId"],
      where: {
        status: CaseStatus.CLOSED,
        closedAt: { gte: from },
      },
      _count: { _all: true },
      _avg: { rating: true },
    }),
  ]);

  const statusMap = new Map(
    leadCounts.map((r) => [r.status, r._count._all]),
  );
  const totalLeads = [...statusMap.values()].reduce((a, b) => a + b, 0);
  const newLeads = statusMap.get(LeadStatus.NEW) ?? 0;
  const inCase = statusMap.get(LeadStatus.IN_CASE) ?? 0;
  const poolLow =
    newLeads < 50 || (totalLeads > 0 && newLeads / totalLeads < 0.1);

  const closedCount = closedInPeriod.length;
  const connected = closedInPeriod.filter(
    (c) => c.outcome === CallOutcome.CONNECTED,
  ).length;
  let ratingSum = 0;
  let ratingN = 0;
  for (const c of closedInPeriod) {
    if (c.rating != null) {
      ratingSum += c.rating;
      ratingN += 1;
    }
  }

  const keys = dayKeysIST(from, now);
  const dayCounts = new Map(keys.map((k) => [k, 0]));
  for (const c of closedInPeriod) {
    if (!c.closedAt) continue;
    const key = formatInTimeZone(c.closedAt, APP_TZ, "yyyy-MM-dd");
    if (dayCounts.has(key)) {
      dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
    }
  }
  const chart = keys.map((date) => ({
    date,
    count: dayCounts.get(date) ?? 0,
  }));

  const live = openCases.map((c) => {
    const ageMinutes = Math.floor(
      (now.getTime() - c.startedAt.getTime()) / 60000,
    );
    const stale = c.startedAt <= staleBefore;
    return {
      id: c.id,
      startedAt: c.startedAt,
      ageMinutes,
      stale,
      callClicked: c.callClickedAt != null,
      employee: c.employee,
      lead: c.lead,
    };
  });
  const staleCount = live.filter((c) => c.stale).length;

  const closedMap = new Map(
    closedByEmployee.map((r) => [
      r.employeeId,
      { count: r._count._all, avgRating: r._avg.rating },
    ]),
  );
  const maxClosed = Math.max(
    1,
    ...telecallers.map((t) => closedMap.get(t.id)?.count ?? 0),
  );

  const telecallerRows = telecallers.map((t) => {
    const stats = closedMap.get(t.id);
    const closed = stats?.count ?? 0;
    const open = live.find((l) => l.employee.id === t.id) ?? null;
    return {
      id: t.id,
      name: t.name,
      email: t.email,
      closed,
      avgRating: stats?.avgRating ?? null,
      barPct: Math.round((closed / maxClosed) * 100),
      hasOpenCase: open != null,
      openStale: open?.stale ?? false,
    };
  });
  telecallerRows.sort((a, b) => b.closed - a.closed);

  return {
    period,
    settings: { staleCaseMinutes: settings.staleCaseMinutes },
    alerts: {
      poolLow,
      newLeads,
      totalLeads,
      staleCount,
    },
    pool: {
      newLeads,
      inCase,
      totalLeads,
      closedLeads: statusMap.get(LeadStatus.CLOSED) ?? 0,
      exhaustedLeads: statusMap.get(LeadStatus.EXHAUSTED) ?? 0,
    },
    kpis: {
      closed: closedCount,
      connected,
      connectedRate:
        closedCount > 0 ? Math.round((connected / closedCount) * 100) : null,
      avgRating:
        ratingN > 0 ? Math.round((ratingSum / ratingN) * 10) / 10 : null,
      referrals: referralsInPeriod,
      joined: joinedInPeriod,
    },
    chart,
    live,
    telecallers: telecallerRows,
  };
}
