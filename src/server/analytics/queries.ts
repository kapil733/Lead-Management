import "server-only";

import {
  CallOutcome,
  CaseStatus,
  Prisma,
  Role,
} from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "@/server/db";
import { APP_TZ, startOfTodayIST } from "@/lib/dates";
import {
  ANALYTICS_EXPORT_MAX,
  type AnalyticsFilters,
} from "@/lib/validators/analytics";

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function defaultAnalyticsRange(now = new Date()): {
  from: string;
  to: string;
} {
  const to = formatInTimeZone(now, APP_TZ, "yyyy-MM-dd");
  const fromDate = new Date(startOfTodayIST(now).getTime() - 29 * 86400000);
  const from = formatInTimeZone(fromDate, APP_TZ, "yyyy-MM-dd");
  return { from, to };
}

function dayBounds(ymd: string, endOfDay: boolean): Date {
  const suffix = endOfDay ? "T23:59:59.999+05:30" : "T00:00:00+05:30";
  return new Date(`${ymd}${suffix}`);
}

function resolveRange(filters: AnalyticsFilters) {
  const defaults = defaultAnalyticsRange();
  const fromYmd = filters.from || defaults.from;
  const toYmd = filters.to || defaults.to;
  return {
    fromYmd,
    toYmd,
    from: dayBounds(fromYmd, false),
    to: dayBounds(toYmd, true),
  };
}

type CaseRow = {
  id: string;
  closedAt: Date | null;
  startedAt: Date;
  outcome: CallOutcome | null;
  rating: number | null;
  remarks: string | null;
  durationSeconds: number | null;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  leadId: string;
  phone: string;
  leadName: string | null;
  city: string | null;
  trade: string | null;
  joined: boolean;
  joinedAt: Date | null;
  referralsCount: number;
};

function matchesCrossFilters(
  closedAt: Date,
  filters: AnalyticsFilters,
): boolean {
  if (filters.hour != null) {
    const hour = Number(formatInTimeZone(closedAt, APP_TZ, "H"));
    if (hour !== filters.hour) return false;
  }
  if (filters.dow != null) {
    // date-fns-tz: 'i' is ISO day 1=Mon..7=Sun — use local via en-US weekday
    const dowName = formatInTimeZone(closedAt, APP_TZ, "EEE");
    const map: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    if (map[dowName] !== filters.dow) return false;
  }
  return true;
}

async function loadClosedCases(filters: AnalyticsFilters): Promise<CaseRow[]> {
  const { from, to } = resolveRange(filters);

  const where: Prisma.CaseWhereInput = {
    status: CaseStatus.CLOSED,
    closedAt: { gte: from, lte: to },
  };
  if (filters.employeeId) where.employeeId = filters.employeeId;
  if (filters.outcome) where.outcome = filters.outcome;
  if (filters.rating != null) where.rating = filters.rating;

  const leadFilter: Prisma.LeadWhereInput = {};
  if (filters.city) {
    leadFilter.city = { equals: filters.city, mode: "insensitive" };
  }
  if (filters.trade) {
    leadFilter.trade = { equals: filters.trade, mode: "insensitive" };
  }
  if (Object.keys(leadFilter).length > 0) {
    where.lead = leadFilter;
  }

  const rows = await prisma.case.findMany({
    where,
    orderBy: { closedAt: "desc" },
    take: ANALYTICS_EXPORT_MAX,
    select: {
      id: true,
      closedAt: true,
      startedAt: true,
      outcome: true,
      rating: true,
      remarks: true,
      durationSeconds: true,
      employeeId: true,
      employee: { select: { name: true, email: true } },
      lead: {
        select: {
          id: true,
          phone: true,
          name: true,
          city: true,
          trade: true,
          joined: true,
          joinedAt: true,
        },
      },
      _count: { select: { referrals: true } },
    },
  });

  return rows
    .filter((r) => r.closedAt && matchesCrossFilters(r.closedAt, filters))
    .map((r) => ({
      id: r.id,
      closedAt: r.closedAt,
      startedAt: r.startedAt,
      outcome: r.outcome,
      rating: r.rating,
      remarks: r.remarks,
      durationSeconds: r.durationSeconds,
      employeeId: r.employeeId,
      employeeName: r.employee.name,
      employeeEmail: r.employee.email,
      leadId: r.lead.id,
      phone: r.lead.phone,
      leadName: r.lead.name,
      city: r.lead.city,
      trade: r.lead.trade,
      joined: r.lead.joined,
      joinedAt: r.lead.joinedAt,
      referralsCount: r._count.referrals,
    }));
}

function dayKeys(fromYmd: string, toYmd: string): string[] {
  const keys: string[] = [];
  let cursor = dayBounds(fromYmd, false);
  for (let i = 0; i < 400; i++) {
    const ymd = formatInTimeZone(cursor, APP_TZ, "yyyy-MM-dd");
    keys.push(ymd);
    if (ymd === toYmd) break;
    cursor = new Date(cursor.getTime() + 86400000);
  }
  return keys;
}

export async function getAnalyticsFilterOptions() {
  const [employees, cities, trades] = await Promise.all([
    prisma.user.findMany({
      where: { role: Role.EMPLOYEE },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, isActive: true },
    }),
    prisma.lead.findMany({
      where: { city: { not: null } },
      distinct: ["city"],
      select: { city: true },
      orderBy: { city: "asc" },
      take: 200,
    }),
    prisma.lead.findMany({
      where: { trade: { not: null } },
      distinct: ["trade"],
      select: { trade: true },
      orderBy: { trade: "asc" },
      take: 200,
    }),
  ]);

  return {
    employees,
    cities: cities.map((c) => c.city!).filter(Boolean),
    trades: trades.map((t) => t.trade!).filter(Boolean),
  };
}

export async function getAnalyticsData(filters: AnalyticsFilters) {
  const range = resolveRange(filters);
  const cases = await loadClosedCases(filters);

  const connected = cases.filter(
    (c) => c.outcome === CallOutcome.CONNECTED,
  ).length;
  let ratingSum = 0;
  let ratingN = 0;
  let referrals = 0;
  let joined = 0;
  for (const c of cases) {
    if (c.rating != null) {
      ratingSum += c.rating;
      ratingN += 1;
    }
    referrals += c.referralsCount;
    if (c.joined) joined += 1;
  }

  const keys = dayKeys(range.fromYmd, range.toYmd);
  const byDay = new Map(keys.map((k) => [k, 0]));
  const referralsByDay = new Map(keys.map((k) => [k, 0]));
  const joinedByDay = new Map(keys.map((k) => [k, 0]));

  const outcomeCounts = new Map<string, number>();
  for (const o of Object.values(CallOutcome)) outcomeCounts.set(o, 0);
  const ratingCounts = new Map<number, number>(
    [0, 1, 2, 3, 4, 5].map((n) => [n, 0]),
  );
  const hourCounts = Array.from({ length: 24 }, () => 0);
  const dowCounts = Array.from({ length: 7 }, () => 0);

  type EmpAgg = {
    id: string;
    name: string;
    email: string;
    closed: number;
    connected: number;
    ratingSum: number;
    ratingN: number;
    referrals: number;
    joined: number;
  };
  const byEmp = new Map<string, EmpAgg>();

  for (const c of cases) {
    if (!c.closedAt) continue;
    const day = formatInTimeZone(c.closedAt, APP_TZ, "yyyy-MM-dd");
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
    referralsByDay.set(
      day,
      (referralsByDay.get(day) ?? 0) + c.referralsCount,
    );
    if (c.joined) {
      joinedByDay.set(day, (joinedByDay.get(day) ?? 0) + 1);
    }

    if (c.outcome) {
      outcomeCounts.set(c.outcome, (outcomeCounts.get(c.outcome) ?? 0) + 1);
    }
    if (c.rating != null) {
      ratingCounts.set(c.rating, (ratingCounts.get(c.rating) ?? 0) + 1);
    }

    const hour = Number(formatInTimeZone(c.closedAt, APP_TZ, "H"));
    hourCounts[hour] = (hourCounts[hour] ?? 0) + 1;
    const dowName = formatInTimeZone(c.closedAt, APP_TZ, "EEE");
    const dowMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    const dow = dowMap[dowName] ?? 0;
    dowCounts[dow] = (dowCounts[dow] ?? 0) + 1;

    let emp = byEmp.get(c.employeeId);
    if (!emp) {
      emp = {
        id: c.employeeId,
        name: c.employeeName,
        email: c.employeeEmail,
        closed: 0,
        connected: 0,
        ratingSum: 0,
        ratingN: 0,
        referrals: 0,
        joined: 0,
      };
      byEmp.set(c.employeeId, emp);
    }
    emp.closed += 1;
    if (c.outcome === CallOutcome.CONNECTED) emp.connected += 1;
    if (c.rating != null) {
      emp.ratingSum += c.rating;
      emp.ratingN += 1;
    }
    emp.referrals += c.referralsCount;
    if (c.joined) emp.joined += 1;
  }

  // Joined in range (by joinedAt) for referrals tab KPI — also count lead joined within range even if case outside
  const joinedInRange = await prisma.lead.count({
    where: {
      joined: true,
      joinedAt: { gte: range.from, lte: range.to },
      ...(filters.employeeId
        ? { joinedMarkedById: filters.employeeId }
        : {}),
      ...(filters.city
        ? { city: { equals: filters.city, mode: "insensitive" as const } }
        : {}),
      ...(filters.trade
        ? { trade: { equals: filters.trade, mode: "insensitive" as const } }
        : {}),
    },
  });

  const referralsCreated = await prisma.referral.count({
    where: {
      createdAt: { gte: range.from, lte: range.to },
      ...(filters.employeeId
        ? { case: { employeeId: filters.employeeId } }
        : {}),
    },
  });

  const telecallers = [...byEmp.values()]
    .map((e) => ({
      id: e.id,
      name: e.name,
      email: e.email,
      closed: e.closed,
      connected: e.connected,
      connectedRate:
        e.closed > 0 ? Math.round((e.connected / e.closed) * 100) : null,
      avgRating:
        e.ratingN > 0 ? Math.round((e.ratingSum / e.ratingN) * 10) / 10 : null,
      referrals: e.referrals,
      joined: e.joined,
    }))
    .sort((a, b) => b.closed - a.closed);

  const maxClosed = Math.max(1, ...telecallers.map((t) => t.closed));

  const skip = (filters.page - 1) * filters.pageSize;
  const drillRows = cases.slice(skip, skip + filters.pageSize);

  return {
    range: { from: range.fromYmd, to: range.toYmd },
    filters,
    kpis: {
      closed: cases.length,
      connected,
      connectedRate:
        cases.length > 0
          ? Math.round((connected / cases.length) * 100)
          : null,
      avgRating:
        ratingN > 0 ? Math.round((ratingSum / ratingN) * 10) / 10 : null,
      referrals: referralsCreated,
      referralsOnCases: referrals,
      joined: joinedInRange,
      joinedOnClosed: joined,
    },
    series: {
      byDay: keys.map((date) => ({ date, count: byDay.get(date) ?? 0 })),
      referralsByDay: keys.map((date) => ({
        date,
        count: referralsByDay.get(date) ?? 0,
      })),
      joinedByDay: keys.map((date) => ({
        date,
        count: joinedByDay.get(date) ?? 0,
      })),
      byOutcome: [...outcomeCounts.entries()].map(([outcome, count]) => ({
        outcome,
        count,
      })),
      byRating: [0, 1, 2, 3, 4, 5].map((rating) => ({
        rating,
        count: ratingCounts.get(rating) ?? 0,
      })),
      byHour: hourCounts.map((count, hour) => ({ hour, count })),
      byDow: dowCounts.map((count, dow) => ({
        dow,
        label: DOW_LABELS[dow]!,
        count,
      })),
    },
    telecallers: telecallers.map((t) => ({
      ...t,
      barPct: Math.round((t.closed / maxClosed) * 100),
    })),
    drill: {
      total: cases.length,
      page: filters.page,
      pageSize: filters.pageSize,
      rows: drillRows.map((r) => ({
        id: r.id,
        closedAt: r.closedAt,
        outcome: r.outcome,
        rating: r.rating,
        durationSeconds: r.durationSeconds,
        employeeName: r.employeeName,
        employeeId: r.employeeId,
        phone: r.phone,
        leadName: r.leadName,
        leadId: r.leadId,
        city: r.city,
        trade: r.trade,
        joined: r.joined,
        referralsCount: r.referralsCount,
        remarks: r.remarks,
      })),
    },
  };
}

export async function listAnalyticsCasesForExport(filters: AnalyticsFilters) {
  const data = await getAnalyticsData({
    ...filters,
    page: 1,
    pageSize: ANALYTICS_EXPORT_MAX,
  });
  return data.drill.rows;
}
