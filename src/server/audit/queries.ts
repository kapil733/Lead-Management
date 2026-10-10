import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import type { AuditFilters } from "@/lib/validators/audit";

function dayBounds(ymd: string, endOfDay: boolean): Date {
  const suffix = endOfDay ? "T23:59:59.999+05:30" : "T00:00:00+05:30";
  return new Date(`${ymd}${suffix}`);
}

export async function listAuditLogs(filters: AuditFilters) {
  const where: Prisma.AuditLogWhereInput = {};

  if (filters.action) {
    where.action = filters.action;
  }

  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) where.createdAt.gte = dayBounds(filters.from, false);
    if (filters.to) where.createdAt.lte = dayBounds(filters.to, true);
  }

  if (filters.q && filters.q.length > 0) {
    where.OR = [
      { entityId: { contains: filters.q, mode: "insensitive" } },
      { entityType: { contains: filters.q, mode: "insensitive" } },
      { actor: { email: { contains: filters.q, mode: "insensitive" } } },
      { actor: { name: { contains: filters.q, mode: "insensitive" } } },
    ];
  }

  const skip = (filters.page - 1) * filters.pageSize;

  const [total, rows, actions] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: filters.pageSize,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        meta: true,
        ip: true,
        createdAt: true,
        actor: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.auditLog.findMany({
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" },
      take: 200,
    }),
  ]);

  return {
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    actionOptions: actions.map((a) => a.action),
    rows,
  };
}
