import "server-only";

import { PayrollRunStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import { listHolidaysInRange } from "@/server/payroll/holidays";
import {
  countUnmarkedWorking,
  monthDateList,
  parseMonthKey,
  resolveDayStatus,
  sumPayable,
  ymdFromDate,
  type ExplicitStatus,
} from "@/server/payroll/attendance/resolve";
import type {
  AttendanceEmployeeRow,
  AttendanceGridData,
} from "@/lib/payroll/attendance-types";

export type { AttendanceEmployeeRow, AttendanceGridData };

export async function getAttendanceGrid(
  month: string,
): Promise<AttendanceGridData> {
  parseMonthKey(month); // validate
  const dates = monthDateList(month);
  const from = dates[0]!;
  const to = dates[dates.length - 1]!;

  const [run, holidayMap, employees, records] = await Promise.all([
    prisma.payrollRun.findUnique({ where: { month } }),
    listHolidaysInRange(from, to),
    prisma.contractEmployee.findMany({
      where: {
        dateOfJoining: { lte: new Date(`${to}T00:00:00.000Z`) },
        OR: [
          { dateOfExit: null },
          { dateOfExit: { gte: new Date(`${from}T00:00:00.000Z`) } },
        ],
      },
      include: { client: { select: { name: true } } },
      orderBy: { employeeCode: "asc" },
    }),
    prisma.attendanceRecord.findMany({
      where: {
        date: {
          gte: new Date(`${from}T00:00:00.000Z`),
          lte: new Date(`${to}T00:00:00.000Z`),
        },
      },
    }),
  ]);

  const byEmp = new Map<string, Map<string, ExplicitStatus>>();
  for (const r of records) {
    let m = byEmp.get(r.employeeId);
    if (!m) {
      m = new Map();
      byEmp.set(r.employeeId, m);
    }
    m.set(ymdFromDate(r.date), r.status as ExplicitStatus);
  }

  const holidays = [...holidayMap.entries()].map(([date, h]) => ({
    date,
    name: h.name,
    isPaid: h.isPaid,
  }));

  const rows: AttendanceEmployeeRow[] = [];
  let unmarkedTotal = 0;

  for (const emp of employees) {
    // Include if any day in month could be in range
    const doj = ymdFromDate(emp.dateOfJoining);
    const doe = emp.dateOfExit ? ymdFromDate(emp.dateOfExit) : null;
    if (doe && doe < from) continue;
    if (doj > to) continue;

    const marks = byEmp.get(emp.id) ?? new Map();
    const days = dates.map((date) =>
      resolveDayStatus({
        date,
        explicit: marks.get(date) ?? null,
        holiday: holidayMap.get(date) ?? null,
        weeklyOffDays: emp.weeklyOffDays,
        dateOfJoining: doj,
        dateOfExit: doe,
      }),
    );
    const unmarkedWorking = countUnmarkedWorking(days);
    unmarkedTotal += unmarkedWorking;
    rows.push({
      id: emp.id,
      employeeCode: emp.employeeCode,
      fullName: emp.fullName,
      clientName: emp.client?.name ?? null,
      status: emp.status,
      weeklyOffDays: emp.weeklyOffDays,
      dateOfJoining: doj,
      dateOfExit: doe,
      days,
      payableDays: sumPayable(days),
      unmarkedWorking,
    });
  }

  return {
    month,
    dates,
    locked: run?.status === PayrollRunStatus.LOCKED,
    lockedAt: run?.lockedAt?.toISOString() ?? null,
    runId: run?.id ?? null,
    holidays,
    employees: rows,
    unmarkedTotal,
  };
}
