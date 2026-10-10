import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit/write";
import type { SalaryStructureInput } from "@/lib/validators/payroll";

function parseYmd(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

export async function listSalaryHistory(employeeId: string) {
  return prisma.salaryStructure.findMany({
    where: { employeeId },
    orderBy: { effectiveFrom: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function getCurrentSalary(employeeId: string, onDate = new Date()) {
  const ymd = onDate.toISOString().slice(0, 10);
  return prisma.salaryStructure.findFirst({
    where: {
      employeeId,
      effectiveFrom: { lte: parseYmd(ymd) },
    },
    orderBy: { effectiveFrom: "desc" },
  });
}

export async function addSalaryStructure(input: {
  data: SalaryStructureInput;
  actorId: string;
  ip?: string | null;
}) {
  const emp = await prisma.contractEmployee.findUnique({
    where: { id: input.data.employeeId },
    select: { id: true, employeeCode: true },
  });
  if (!emp) {
    return { ok: false as const, error: "Employee not found" };
  }

  const effectiveFrom = parseYmd(input.data.effectiveFrom);
  const clash = await prisma.salaryStructure.findFirst({
    where: {
      employeeId: input.data.employeeId,
      effectiveFrom,
    },
  });
  if (clash) {
    return {
      ok: false as const,
      error: "A salary structure already exists for this effective date",
    };
  }

  const created = await prisma.salaryStructure.create({
    data: {
      employeeId: input.data.employeeId,
      effectiveFrom,
      monthlyGrossPaise: input.data.monthlyGrossPaise,
      components: input.data.components as unknown as Prisma.InputJsonValue,
      note: input.data.note || null,
      createdById: input.actorId,
    },
  });

  await writeAudit({
    actorId: input.actorId,
    action: "SALARY_STRUCTURE_CREATED",
    entityType: "SalaryStructure",
    entityId: created.id,
    meta: {
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      effectiveFrom: input.data.effectiveFrom,
      monthlyGrossPaise: input.data.monthlyGrossPaise,
    },
    ip: input.ip,
  });

  return { ok: true as const, data: created };
}
