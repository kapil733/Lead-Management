import "server-only";

import {
  PayrollRunStatus,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit/write";
import { getAttendanceGrid } from "@/server/payroll/attendance/grid";
import {
  dateFromYmd,
  daysInMonth,
  parseMonthKey,
} from "@/server/payroll/attendance/resolve";
import { calculateEmployeeSalary } from "@/server/payroll/calc/salary";
import type {
  AdjustmentInput,
  SalaryComponent,
} from "@/server/payroll/calc/types";
import { buildEcrFile } from "@/server/payroll/calc/ecr";
import { getEffectiveStatutoryConfig } from "@/server/payroll/statutory";

function parseComponents(raw: unknown): SalaryComponent[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((c) => {
    const o = c as Record<string, unknown>;
    return {
      key: String(o.key ?? ""),
      label: String(o.label ?? ""),
      amountPaise: Number(o.amountPaise ?? 0),
      pfWage: Boolean(o.pfWage),
      esicWage: Boolean(o.esicWage),
    };
  });
}

export async function listPayrollRuns() {
  const runs = await prisma.payrollRun.findMany({
    orderBy: { month: "desc" },
    include: {
      _count: { select: { lines: true } },
      lockedBy: { select: { name: true, email: true } },
    },
  });
  return runs.map((r) => ({
    id: r.id,
    month: r.month,
    status: r.status,
    lockedAt: r.lockedAt?.toISOString() ?? null,
    lockedBy: r.lockedBy,
    lineCount: r._count.lines,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function ensurePayrollRun(month: string) {
  return prisma.payrollRun.upsert({
    where: { month },
    create: { month, status: PayrollRunStatus.DRAFT },
    update: {},
  });
}

export async function getPayrollRunDetail(month: string) {
  const run = await ensurePayrollRun(month);
  const lines = await prisma.payrollLine.findMany({
    where: { runId: run.id },
    include: {
      employee: {
        select: {
          id: true,
          employeeCode: true,
          fullName: true,
          uan: true,
          client: { select: { name: true } },
        },
      },
    },
    orderBy: { employee: { employeeCode: "asc" } },
  });

  const totals = lines.reduce(
    (a, l) => ({
      earnedGrossPaise: a.earnedGrossPaise + l.earnedGrossPaise,
      pfEmployeePaise: a.pfEmployeePaise + l.pfEmployeePaise,
      esicEmployeePaise: a.esicEmployeePaise + l.esicEmployeePaise,
      netPayPaise: a.netPayPaise + l.netPayPaise,
      employerPfPaise: a.employerPfPaise + l.employerPfPaise,
      employerEsicPaise: a.employerEsicPaise + l.employerEsicPaise,
    }),
    {
      earnedGrossPaise: 0,
      pfEmployeePaise: 0,
      esicEmployeePaise: 0,
      netPayPaise: 0,
      employerPfPaise: 0,
      employerEsicPaise: 0,
    },
  );

  const mapped = lines.map((l) => ({
    id: l.id,
    employeeId: l.employeeId,
    employeeCode: l.employee.employeeCode,
    fullName: l.employee.fullName,
    uan: l.employee.uan,
    clientName: l.employee.client?.name ?? null,
    payableDays: Number(l.payableDays),
    earnedGrossPaise: l.earnedGrossPaise,
    pfEmployeePaise: l.pfEmployeePaise,
    esicEmployeePaise: l.esicEmployeePaise,
    otherEarningsPaise: l.otherEarningsPaise,
    otherDeductionsPaise: l.otherDeductionsPaise,
    netPayPaise: l.netPayPaise,
    employerPfPaise: l.employerPfPaise,
    employerEsicPaise: l.employerEsicPaise,
    employerEdliPaise: l.employerEdliPaise,
    employerAdminPaise: l.employerAdminPaise,
    snapshot: l.snapshot,
  }));

  const { year, month: monthNum } = parseMonthKey(month);
  const dim = daysInMonth(year, monthNum);
  const monthEnd = `${month}-${String(dim).padStart(2, "0")}`;
  const config = await getEffectiveStatutoryConfig(monthEnd);
  const ecr = buildEcrFile(
    mapped,
    dim,
    config?.pfWageCeilingPaise ?? null,
  );

  return {
    id: run.id,
    month: run.month,
    status: run.status,
    lockedAt: run.lockedAt?.toISOString() ?? null,
    lockedById: run.lockedById,
    lines: mapped,
    totals,
    ecrSkipped: ecr.skipped,
  };
}

/** Recalculate all employees for a DRAFT month and upsert PayrollLines. */
export async function recalculatePayrollRun(input: {
  month: string;
  actorId: string;
  ip?: string | null;
}): Promise<
  | { ok: true; data: { lineCount: number; runId: string } }
  | { ok: false; error: string }
> {
  const run = await ensurePayrollRun(input.month);
  if (run.status === PayrollRunStatus.LOCKED) {
    return { ok: false, error: "Month is locked — unlock to recalculate" };
  }

  const { year, month: m } = parseMonthKey(input.month);
  const dim = daysInMonth(year, m);
  const monthEnd = `${input.month}-${String(dim).padStart(2, "0")}`;

  const config = await getEffectiveStatutoryConfig(monthEnd);
  if (!config) {
    return { ok: false, error: "No statutory config effective for this month" };
  }

  const grid = await getAttendanceGrid(input.month);
  const empIds = grid.employees.map((e) => e.id);

  const [structures, adjustments] = await Promise.all([
    prisma.salaryStructure.findMany({
      where: {
        employeeId: { in: empIds },
        effectiveFrom: { lte: dateFromYmd(monthEnd) },
      },
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.payrollAdjustment.findMany({
      where: { month: input.month, employeeId: { in: empIds } },
    }),
  ]);

  const structureByEmp = new Map<string, (typeof structures)[0]>();
  for (const s of structures) {
    if (!structureByEmp.has(s.employeeId)) {
      structureByEmp.set(s.employeeId, s);
    }
  }

  const adjByEmp = new Map<string, AdjustmentInput[]>();
  for (const a of adjustments) {
    const list = adjByEmp.get(a.employeeId) ?? [];
    list.push({
      type: a.type,
      amountPaise: a.amountPaise,
      note: a.note,
    });
    adjByEmp.set(a.employeeId, list);
  }

  const employees = await prisma.contractEmployee.findMany({
    where: { id: { in: empIds } },
    select: {
      id: true,
      pfApplicable: true,
      pfOnActualWage: true,
      esicApplicable: true,
    },
  });
  const flagMap = new Map(employees.map((e) => [e.id, e]));

  let lineCount = 0;
  await prisma.$transaction(async (tx) => {
    await tx.payrollLine.deleteMany({ where: { runId: run.id } });

    for (const emp of grid.employees) {
      const structure = structureByEmp.get(emp.id);
      const flags = flagMap.get(emp.id);
      if (!structure || !flags) continue;

      const woCount = emp.days.filter((d) =>
        emp.weeklyOffDays.includes(d.weekday),
      ).length;

      const result = calculateEmployeeSalary({
        month: input.month,
        daysInMonth: dim,
        payableDays: emp.payableDays,
        weeklyOffDaysInMonth: woCount,
        holidaysInMonth: grid.holidays.length,
        structure: {
          id: structure.id,
          monthlyGrossPaise: structure.monthlyGrossPaise,
          components: parseComponents(structure.components),
          effectiveFrom: structure.effectiveFrom.toISOString().slice(0, 10),
        },
        pfApplicable: flags.pfApplicable,
        pfOnActualWage: flags.pfOnActualWage,
        esicApplicableFlag: flags.esicApplicable,
        adjustments: adjByEmp.get(emp.id) ?? [],
        config,
      });

      await tx.payrollLine.create({
        data: {
          runId: run.id,
          employeeId: emp.id,
          snapshot: result.snapshot as Prisma.InputJsonValue,
          payableDays: result.payableDays,
          earnedGrossPaise: result.earnedGrossPaise,
          pfEmployeePaise: result.pfEmployeePaise,
          esicEmployeePaise: result.esicEmployeePaise,
          otherDeductionsPaise: result.otherDeductionsPaise,
          otherEarningsPaise: result.otherEarningsPaise,
          netPayPaise: result.netPayPaise,
          employerPfPaise: result.employerPfPaise,
          employerEsicPaise: result.employerEsicPaise,
          employerEdliPaise: result.employerEdliPaise,
          employerAdminPaise: result.employerAdminPaise,
        },
      });
      lineCount += 1;
    }
  });

  await writeAudit({
    actorId: input.actorId,
    action: "PAYROLL_RUN_RECALCULATED",
    entityType: "PayrollRun",
    entityId: run.id,
    meta: { month: input.month, lineCount },
    ip: input.ip,
  });

  return { ok: true, data: { lineCount, runId: run.id } };
}

/** Compute one employee's live calc (salary drawer) without persisting. */
export async function previewEmployeePayroll(input: {
  employeeId: string;
  month: string;
}) {
  const grid = await getAttendanceGrid(input.month);
  const emp = grid.employees.find((e) => e.id === input.employeeId);
  if (!emp) return { ok: false as const, error: "Employee not in month grid" };

  const { year, month: m } = parseMonthKey(input.month);
  const dim = daysInMonth(year, m);
  const monthEnd = `${input.month}-${String(dim).padStart(2, "0")}`;
  const config = await getEffectiveStatutoryConfig(monthEnd);
  if (!config) return { ok: false as const, error: "No statutory config" };

  const [structure, flags, adjustments] = await Promise.all([
    prisma.salaryStructure.findFirst({
      where: {
        employeeId: input.employeeId,
        effectiveFrom: { lte: dateFromYmd(monthEnd) },
      },
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.contractEmployee.findUnique({
      where: { id: input.employeeId },
      select: {
        pfApplicable: true,
        pfOnActualWage: true,
        esicApplicable: true,
      },
    }),
    prisma.payrollAdjustment.findMany({
      where: { employeeId: input.employeeId, month: input.month },
    }),
  ]);

  if (!structure || !flags) {
    return { ok: false as const, error: "Missing salary structure" };
  }

  const woCount = emp.days.filter((d) =>
    emp.weeklyOffDays.includes(d.weekday),
  ).length;

  const result = calculateEmployeeSalary({
    month: input.month,
    daysInMonth: dim,
    payableDays: emp.payableDays,
    weeklyOffDaysInMonth: woCount,
    holidaysInMonth: grid.holidays.length,
    structure: {
      id: structure.id,
      monthlyGrossPaise: structure.monthlyGrossPaise,
      components: parseComponents(structure.components),
      effectiveFrom: structure.effectiveFrom.toISOString().slice(0, 10),
    },
    pfApplicable: flags.pfApplicable,
    pfOnActualWage: flags.pfOnActualWage,
    esicApplicableFlag: flags.esicApplicable,
    adjustments: adjustments.map((a) => ({
      type: a.type,
      amountPaise: a.amountPaise,
      note: a.note,
    })),
    config,
  });

  return {
    ok: true as const,
    data: {
      employeeCode: emp.employeeCode,
      fullName: emp.fullName,
      clientName: emp.clientName,
      locked: grid.locked,
      result,
    },
  };
}
