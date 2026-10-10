import "server-only";

import { AttendanceStatus, PayrollRunStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit/write";
import { getAttendanceGrid } from "@/server/payroll/attendance/grid";
import { dateFromYmd } from "@/server/payroll/attendance/resolve";
import { recalculatePayrollRun } from "@/server/payroll/runs";

/**
 * Lock month: treat unmarked as absent (optional), freeze attendance,
 * write PayrollLine snapshots via recalculate, then set LOCKED.
 */
export async function lockAttendanceMonth(input: {
  month: string;
  treatUnmarkedAsAbsent: boolean;
  actorId: string;
  ip?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const grid = await getAttendanceGrid(input.month);
  if (grid.locked) {
    return { ok: false, error: "Month is already locked" };
  }

  if (grid.unmarkedTotal > 0 && !input.treatUnmarkedAsAbsent) {
    return {
      ok: false,
      error: `${grid.unmarkedTotal} unmarked working day(s). Tick “treat unmarked as absent” or mark them first.`,
    };
  }

  if (input.treatUnmarkedAsAbsent && grid.unmarkedTotal > 0) {
    await prisma.$transaction(async (tx) => {
      for (const emp of grid.employees) {
        for (const d of emp.days) {
          if (d.effective !== "UNMARKED" || !d.editable) continue;
          const date = dateFromYmd(d.date);
          await tx.attendanceRecord.upsert({
            where: {
              employeeId_date: { employeeId: emp.id, date },
            },
            create: {
              employeeId: emp.id,
              date,
              status: AttendanceStatus.ABSENT,
              updatedById: input.actorId,
            },
            update: {
              status: AttendanceStatus.ABSENT,
              updatedById: input.actorId,
            },
          });
        }
      }
    });
  }

  // Ensure DRAFT run exists, then snapshot lines while still DRAFT
  await prisma.payrollRun.upsert({
    where: { month: input.month },
    create: { month: input.month, status: PayrollRunStatus.DRAFT },
    update: {},
  });

  const calc = await recalculatePayrollRun({
    month: input.month,
    actorId: input.actorId,
    ip: input.ip,
  });
  if (!calc.ok) return calc;

  const run = await prisma.payrollRun.update({
    where: { month: input.month },
    data: {
      status: PayrollRunStatus.LOCKED,
      lockedAt: new Date(),
      lockedById: input.actorId,
    },
  });

  await writeAudit({
    actorId: input.actorId,
    action: "PAYROLL_MONTH_LOCKED",
    entityType: "PayrollRun",
    entityId: run.id,
    meta: {
      month: input.month,
      treatUnmarkedAsAbsent: input.treatUnmarkedAsAbsent,
      lineCount: calc.data.lineCount,
    },
    ip: input.ip,
  });

  return { ok: true };
}

export async function unlockAttendanceMonth(input: {
  month: string;
  actorId: string;
  ip?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const run = await prisma.payrollRun.findUnique({
    where: { month: input.month },
  });
  if (!run) {
    return { ok: false, error: "No payroll run for this month" };
  }
  if (run.status !== PayrollRunStatus.LOCKED) {
    return { ok: false, error: "Month is not locked" };
  }

  const lineCount = await prisma.payrollLine.count({
    where: { runId: run.id },
  });

  await prisma.payrollRun.update({
    where: { id: run.id },
    data: {
      status: PayrollRunStatus.DRAFT,
      lockedAt: null,
      lockedById: null,
    },
  });

  await writeAudit({
    actorId: input.actorId,
    action: "PAYROLL_MONTH_UNLOCKED",
    entityType: "PayrollRun",
    entityId: run.id,
    meta: { month: input.month, hadLines: lineCount },
    ip: input.ip,
  });

  return { ok: true };
}
