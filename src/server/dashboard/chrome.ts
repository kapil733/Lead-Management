import "server-only";

import { LeadStatus, Role } from "@prisma/client";
import { prisma } from "@/server/db";

export type ConsoleChrome = {
  totalLeads: number;
  newLeads: number;
  poolLow: boolean;
  telecallers: number;
  employees: number;
  clients: number;
  run: { month: string; status: string } | null;
};

export async function getConsoleChrome(): Promise<ConsoleChrome> {
  const [leadGroups, telecallers, employees, clients, run] = await Promise.all([
    prisma.lead.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.user.count({
      where: { role: Role.EMPLOYEE, isActive: true },
    }),
    prisma.contractEmployee.count(),
    prisma.client.count(),
    prisma.payrollRun.findFirst({
      orderBy: { month: "desc" },
      select: { month: true, status: true },
    }),
  ]);

  const totalLeads = leadGroups.reduce((sum, row) => sum + row._count._all, 0);
  const newLeads =
    leadGroups.find((row) => row.status === LeadStatus.NEW)?._count._all ?? 0;
  const poolLow =
    newLeads < 50 || (totalLeads > 0 && newLeads / totalLeads < 0.1);

  return {
    totalLeads,
    newLeads,
    poolLow,
    telecallers,
    employees,
    clients,
    run: run ? { month: run.month, status: run.status } : null,
  };
}
