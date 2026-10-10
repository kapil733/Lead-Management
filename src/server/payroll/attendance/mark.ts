import "server-only";

import { AttendanceStatus, PayrollRunStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import { dateFromYmd } from "@/server/payroll/attendance/resolve";

const STATUSES = new Set<string>(Object.values(AttendanceStatus));

export type MarkCell = {
  employeeId: string;
  date: string; // YYYY-MM-DD
  /** null = clear explicit mark */
  status: AttendanceStatus | null;
};

export async function batchMarkAttendance(input: {
  month: string;
  cells: MarkCell[];
  actorId: string;
}): Promise<
  | { ok: true; data: { written: number; cleared: number } }
  | { ok: false; error: string }
> {
  if (input.cells.length === 0) {
    return { ok: true, data: { written: 0, cleared: 0 } };
  }
  if (input.cells.length > 5000) {
    return { ok: false, error: "Too many cells in one batch (max 5000)" };
  }

  const run = await prisma.payrollRun.findUnique({
    where: { month: input.month },
  });
  if (run?.status === PayrollRunStatus.LOCKED) {
    return { ok: false, error: "Month is locked — unlock to edit attendance" };
  }

  // Validate all dates belong to month
  for (const c of input.cells) {
    if (!c.date.startsWith(input.month)) {
      return { ok: false, error: `Date ${c.date} is outside ${input.month}` };
    }
    if (c.status != null && !STATUSES.has(c.status)) {
      return { ok: false, error: `Invalid status ${c.status}` };
    }
  }

  const empIds = [...new Set(input.cells.map((c) => c.employeeId))];
  const emps = await prisma.contractEmployee.findMany({
    where: { id: { in: empIds } },
    select: { id: true, dateOfJoining: true, dateOfExit: true },
  });
  const empMap = new Map(emps.map((e) => [e.id, e]));

  let written = 0;
  let cleared = 0;

  await prisma.$transaction(async (tx) => {
    for (const cell of input.cells) {
      const emp = empMap.get(cell.employeeId);
      if (!emp) continue;
      const doj = emp.dateOfJoining.toISOString().slice(0, 10);
      const doe = emp.dateOfExit
        ? emp.dateOfExit.toISOString().slice(0, 10)
        : null;
      if (cell.date < doj || (doe && cell.date > doe)) continue;

      const date = dateFromYmd(cell.date);
      if (cell.status == null) {
        const del = await tx.attendanceRecord.deleteMany({
          where: { employeeId: cell.employeeId, date },
        });
        cleared += del.count;
      } else {
        await tx.attendanceRecord.upsert({
          where: {
            employeeId_date: { employeeId: cell.employeeId, date },
          },
          create: {
            employeeId: cell.employeeId,
            date,
            status: cell.status,
            updatedById: input.actorId,
          },
          update: {
            status: cell.status,
            updatedById: input.actorId,
          },
        });
        written += 1;
      }
    }
  });

  return { ok: true, data: { written, cleared } };
}
