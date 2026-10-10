import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient, Role } from "@prisma/client";
import { recalculatePayrollRun } from "@/server/payroll/runs";
import {
  lockAttendanceMonth,
  unlockAttendanceMonth,
} from "@/server/payroll/attendance/lock";
import { batchMarkAttendance } from "@/server/payroll/attendance/mark";

const prisma = new PrismaClient();
const MONTH = "2026-12";

describe("payroll run Phase 9", () => {
  let adminId: string;

  afterAll(async () => {
    const run = await prisma.payrollRun.findUnique({ where: { month: MONTH } });
    if (run) {
      await prisma.payrollLine.deleteMany({ where: { runId: run.id } });
      await prisma.payrollRun.delete({ where: { id: run.id } });
    }
    await prisma.attendanceRecord.deleteMany({
      where: {
        date: {
          gte: new Date("2026-12-01"),
          lte: new Date("2026-12-31"),
        },
      },
    });
    await prisma.$disconnect();
  });

  it("recalculates lines; lock freezes; recalc refused while locked", async () => {
    const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
    expect(admin).not.toBeNull();
    adminId = admin!.id;

    const emp = await prisma.contractEmployee.findFirst({
      where: { employeeCode: "CE001" },
    });
    expect(emp).not.toBeNull();

    // Mark a few December days so payable > 0
    await batchMarkAttendance({
      month: MONTH,
      cells: [
        {
          employeeId: emp!.id,
          date: "2026-12-01",
          status: "PRESENT",
        },
        {
          employeeId: emp!.id,
          date: "2026-12-02",
          status: "PRESENT",
        },
      ],
      actorId: adminId,
    });

    const calc = await recalculatePayrollRun({
      month: MONTH,
      actorId: adminId,
    });
    expect(calc.ok).toBe(true);
    if (!calc.ok) return;

    const lineBefore = await prisma.payrollLine.findFirst({
      where: { runId: calc.data.runId, employeeId: emp!.id },
    });
    expect(lineBefore).not.toBeNull();
    const netBefore = lineBefore!.netPayPaise;

    const lock = await lockAttendanceMonth({
      month: MONTH,
      treatUnmarkedAsAbsent: true,
      actorId: adminId,
    });
    expect(lock.ok).toBe(true);

    const recalcLocked = await recalculatePayrollRun({
      month: MONTH,
      actorId: adminId,
    });
    expect(recalcLocked.ok).toBe(false);

    const markLocked = await batchMarkAttendance({
      month: MONTH,
      cells: [
        {
          employeeId: emp!.id,
          date: "2026-12-03",
          status: "ABSENT",
        },
      ],
      actorId: adminId,
    });
    expect(markLocked.ok).toBe(false);

    const lineLocked = await prisma.payrollLine.findFirst({
      where: { runId: calc.data.runId, employeeId: emp!.id },
    });
    expect(lineLocked!.netPayPaise).toBe(netBefore);

    const unlock = await unlockAttendanceMonth({
      month: MONTH,
      actorId: adminId,
    });
    expect(unlock.ok).toBe(true);
  });
});
