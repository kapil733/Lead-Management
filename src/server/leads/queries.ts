import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import type { LeadListFilters } from "@/lib/validators/leads";
import { normalisePhone } from "@/lib/phone";

export async function listLeads(filters: LeadListFilters) {
  const where: Prisma.LeadWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.source) where.source = filters.source;
  if (filters.importBatchId) where.importBatchId = filters.importBatchId;
  if (filters.joined === "yes") where.joined = true;
  if (filters.joined === "no") where.joined = false;

  if (filters.q && filters.q.length > 0) {
    const phone = normalisePhone(filters.q);
    where.OR = [
      ...(phone ? [{ phone }] : []),
      { phone: { contains: filters.q.replace(/\D/g, "") } },
      { name: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  const skip = (filters.page - 1) * filters.pageSize;

  const [total, rows] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: filters.pageSize,
      select: {
        id: true,
        phone: true,
        name: true,
        city: true,
        trade: true,
        source: true,
        status: true,
        attempts: true,
        joined: true,
        createdAt: true,
        importBatchId: true,
        cases: {
          where: { rating: { not: null } },
          orderBy: { closedAt: "desc" },
          take: 1,
          select: { rating: true },
        },
      },
    }),
  ]);

  return {
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    rows: rows.map((r) => ({
      id: r.id,
      phone: r.phone,
      name: r.name,
      city: r.city,
      trade: r.trade,
      source: r.source,
      status: r.status,
      attempts: r.attempts,
      joined: r.joined,
      createdAt: r.createdAt,
      importBatchId: r.importBatchId,
      lastRating: r.cases[0]?.rating ?? null,
    })),
  };
}

export async function getLeadDetail(id: string) {
  return prisma.lead.findUnique({
    where: { id },
    include: {
      importBatch: {
        select: { id: true, fileName: true, createdAt: true },
      },
      referredBy: {
        select: { id: true, phone: true, name: true },
      },
      referralsGiven: {
        select: { id: true, phone: true, name: true, status: true, source: true },
        take: 50,
      },
      cases: {
        orderBy: { startedAt: "desc" },
        include: {
          employee: { select: { id: true, name: true, email: true } },
          referrals: true,
        },
      },
      joinedMarkedBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function listLeadsForExport(
  filters: Omit<LeadListFilters, "page" | "pageSize">,
) {
  // Cap export at 10_000 for safety in Phase 2
  const where: Prisma.LeadWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.source) where.source = filters.source;
  if (filters.importBatchId) where.importBatchId = filters.importBatchId;
  if (filters.joined === "yes") where.joined = true;
  if (filters.joined === "no") where.joined = false;
  if (filters.q && filters.q.length > 0) {
    const phone = normalisePhone(filters.q);
    where.OR = [
      ...(phone ? [{ phone }] : []),
      { phone: { contains: filters.q.replace(/\D/g, "") } },
      { name: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10_000,
    select: {
      phone: true,
      name: true,
      city: true,
      trade: true,
      source: true,
      status: true,
      attempts: true,
      joined: true,
      createdAt: true,
      experienceYears: true,
    },
  });

  return { rows };
}
