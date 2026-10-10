import "server-only";

import { CaseStatus, Role } from "@prisma/client";
import { prisma } from "@/server/db";
import { startOfTodayIST } from "@/lib/dates";

export async function listTelecallers() {
  const users = await prisma.user.findMany({
    where: { role: Role.EMPLOYEE },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      mustChangePassword: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  const todayStart = startOfTodayIST();
  const ids = users.map((u) => u.id);

  const [closedToday, openCases, closedAll] = await Promise.all([
    prisma.case.groupBy({
      by: ["employeeId"],
      where: {
        employeeId: { in: ids },
        status: CaseStatus.CLOSED,
        closedAt: { gte: todayStart },
      },
      _count: { _all: true },
    }),
    prisma.case.groupBy({
      by: ["employeeId"],
      where: {
        employeeId: { in: ids },
        status: CaseStatus.OPEN,
      },
      _count: { _all: true },
    }),
    prisma.case.groupBy({
      by: ["employeeId"],
      where: {
        employeeId: { in: ids },
        status: CaseStatus.CLOSED,
      },
      _count: { _all: true },
      _avg: { rating: true },
    }),
  ]);

  const todayMap = new Map(
    closedToday.map((r) => [r.employeeId, r._count._all]),
  );
  const openMap = new Map(openCases.map((r) => [r.employeeId, r._count._all]));
  const allMap = new Map(
    closedAll.map((r) => [
      r.employeeId,
      { count: r._count._all, avgRating: r._avg.rating },
    ]),
  );

  return users.map((u) => ({
    ...u,
    closedToday: todayMap.get(u.id) ?? 0,
    hasOpenCase: (openMap.get(u.id) ?? 0) > 0,
    closedTotal: allMap.get(u.id)?.count ?? 0,
    avgRating: allMap.get(u.id)?.avgRating ?? null,
  }));
}

export async function getTelecallerById(userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, role: Role.EMPLOYEE },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      mustChangePassword: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
}

export async function getTelecallerPerformance(userId: string) {
  const user = await getTelecallerById(userId);
  if (!user) return null;

  const since = new Date();
  since.setDate(since.getDate() - 29);
  const sinceYmd = since.toISOString().slice(0, 10);
  const rangeStart = new Date(`${sinceYmd}T00:00:00+05:30`);

  const cases = await prisma.case.findMany({
    where: {
      employeeId: userId,
      status: CaseStatus.CLOSED,
      closedAt: { gte: rangeStart },
    },
    orderBy: { closedAt: "desc" },
    select: {
      id: true,
      closedAt: true,
      outcome: true,
      rating: true,
      remarks: true,
      durationSeconds: true,
      lead: {
        select: {
          id: true,
          phone: true,
          name: true,
          joined: true,
        },
      },
      _count: { select: { referrals: true } },
    },
  });

  const dayCounts = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + i);
    const key = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    dayCounts.set(key, 0);
  }

  let ratingSum = 0;
  let ratingN = 0;
  let referrals = 0;
  let joined = 0;

  for (const c of cases) {
    if (c.closedAt) {
      const key = c.closedAt.toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
      });
      dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
    }
    if (c.rating != null) {
      ratingSum += c.rating;
      ratingN += 1;
    }
    referrals += c._count.referrals;
    if (c.lead.joined) joined += 1;
  }

  const chart = [...dayCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  return {
    user,
    kpis: {
      closed30d: cases.length,
      avgRating: ratingN > 0 ? Math.round((ratingSum / ratingN) * 10) / 10 : null,
      referrals,
      joined,
    },
    chart,
    cases: cases.slice(0, 50).map((c) => ({
      id: c.id,
      closedAt: c.closedAt,
      outcome: c.outcome,
      rating: c.rating,
      friendsCount: c._count.referrals,
      phone: c.lead.phone,
      name: c.lead.name,
      joined: c.lead.joined,
    })),
  };
}
