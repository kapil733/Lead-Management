import "server-only";

import { CaseStatus, Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { normalisePhone } from "@/lib/phone";
import type { CompletedFilters } from "@/lib/validators/completed";

function dayBounds(ymd: string, endOfDay: boolean): Date {
  const suffix = endOfDay ? "T23:59:59.999+05:30" : "T00:00:00+05:30";
  return new Date(`${ymd}${suffix}`);
}

export async function listCompletedCasesForEmployee(
  employeeId: string,
  filters: CompletedFilters,
) {
  const leadAnd: Prisma.LeadWhereInput[] = [];

  if (filters.joined === "yes") {
    leadAnd.push({ joined: true });
  } else if (filters.joined === "no") {
    leadAnd.push({ joined: false });
  }

  if (filters.q && filters.q.length > 0) {
    const digits = filters.q.replace(/\D/g, "");
    const phone = normalisePhone(filters.q);
    const or: Prisma.LeadWhereInput[] = [
      { name: { contains: filters.q, mode: "insensitive" } },
    ];
    if (phone) or.push({ phone });
    else if (digits.length > 0) or.push({ phone: { contains: digits } });
    leadAnd.push({ OR: or });
  }

  const where: Prisma.CaseWhereInput = {
    employeeId,
    status: CaseStatus.CLOSED,
  };

  if (filters.outcome) where.outcome = filters.outcome;
  if (filters.rating != null) where.rating = filters.rating;

  if (filters.from || filters.to) {
    where.closedAt = {};
    if (filters.from) where.closedAt.gte = dayBounds(filters.from, false);
    if (filters.to) where.closedAt.lte = dayBounds(filters.to, true);
  }

  if (leadAnd.length > 0) {
    where.lead = { AND: leadAnd };
  }

  const skip = (filters.page - 1) * filters.pageSize;

  const [total, rows] = await Promise.all([
    prisma.case.count({ where }),
    prisma.case.findMany({
      where,
      orderBy: { closedAt: "desc" },
      skip,
      take: filters.pageSize,
      select: {
        id: true,
        closedAt: true,
        startedAt: true,
        outcome: true,
        rating: true,
        remarks: true,
        durationSeconds: true,
        lead: {
          select: {
            id: true,
            name: true,
            joined: true,
          },
        },
        _count: { select: { referrals: true } },
      },
    }),
  ]);

  return {
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    rows: rows.map((r) => ({
      id: r.id,
      closedAt: r.closedAt,
      outcome: r.outcome,
      rating: r.rating,
      remarks: r.remarks,
      durationSeconds: r.durationSeconds,
      friendsCount: r._count.referrals,
      leadId: r.lead.id,
      name: r.lead.name,
      joined: r.lead.joined,
    })),
  };
}

export async function getCompletedCaseDetail(
  employeeId: string,
  caseId: string,
) {
  return prisma.case.findFirst({
    where: {
      id: caseId,
      employeeId,
      status: CaseStatus.CLOSED,
    },
    select: {
      id: true,
      closedAt: true,
      startedAt: true,
      outcome: true,
      rating: true,
      remarks: true,
      durationSeconds: true,
      lead: {
        select: {
          id: true,
          phone: true,
          name: true,
          city: true,
          trade: true,
          experienceYears: true,
          extra: true,
          source: true,
          attempts: true,
          joined: true,
        },
      },
      referrals: {
        select: {
          id: true,
          phone: true,
          name: true,
          experienceText: true,
          designation: true,
        },
      },
    },
  });
}
