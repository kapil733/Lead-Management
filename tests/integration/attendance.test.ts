import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import {
  AttendanceStatus,
  PayrollRunStatus,
  PrismaClient,
  Role,
} from "@prisma/client";
import { getAttendanceGrid } from "@/server/payroll/attendance/grid";
import { batchMarkAttendance } from "@/server/payroll/attendance/mark";
import {
  lockAttendanceMonth,
  unlockAttendanceMonth,
} from "@/server/payroll/attendance/lock";
import {
  deleteHoliday,
  listHolidays,
  upsertHoliday,
} from "@/server/payroll/holidays";

const prisma = new PrismaClient();
const MONTH = "2026-11"; // isolated from seed Aug/Sep

describe("attendance + holidays Phase 8", () => {
  let adminId: string;
  let empId: string;
  let holidayId: string | undefined;

  afterAll(async () => {
    await prisma.attendanceRecord.deleteMany({
      where: {
        date: {
          gte: new Date("2026-11-01"),
          lte: new Date("2026-11-30"),
        },
      },
    });
    const run = await prisma.payrollRun.findUnique({ where: { month: MONTH } });
    if (run) {
      await prisma.payrollLine.deleteMany({ where: { runId: run.id } });
      await prisma.payrollRun.delete({ where: { id: run.id } });
    }
    if (holidayId) {
      await prisma.holiday.deleteMany({ where: { id: holidayId } });
    }
    await prisma.holiday.deleteMany({
      where: { date: new Date("2026-11-14T00:00:00.000Z") },
    });
    await prisma.$disconnect();
  });

  it("holidays CRUD + grid resolve + mark + lock/unlock", async () => {
    const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
    expect(admin).not.toBeNull();
    adminId = admin!.id;

    const emp = await prisma.contractEmployee.findFirst({
      where: { employeeCode: "CE001" },
    });
    expect(emp).not.toBeNull();
    empId = emp!.id;

    const upserted = await upsertHoliday({
      date: "2026-11-14",
      name: "Phase8 Test Holiday",
      isPaid: true,
      actorId: adminId,
    });
    expect(upserted.ok).toBe(true);
    if (upserted.ok) holidayId = upserted.data.id;

    const yearList = await listHolidays(2026);
    expect(yearList.some((h) => h.date === "2026-11-14")).toBe(true);

    const grid0 = await getAttendanceGrid(MONTH);
    expect(grid0.locked).toBe(false);
    const row = grid0.employees.find((e) => e.id === empId);
    expect(row).toBeDefined();
    const holDay = row!.days.find((d) => d.date === "2026-11-14");
    expect(holDay?.effective).toBe("HOLIDAY");

    const mark = await batchMarkAttendance({
      month: MONTH,
      cells: [
        {
          employeeId: empId,
          date: "2026-11-02",
          status: AttendanceStatus.PRESENT,
        },
        {
          employeeId: empId,
          date: "2026-11-03",
          status: AttendanceStatus.HALF_DAY,
        },
      ],
      actorId: adminId,
    });
    expect(mark.ok).toBe(true);

    const grid1 = await getAttendanceGrid(MONTH);
    const row1 = grid1.employees.find((e) => e.id === empId)!;
    expect(
      row1.days.find((d) => d.date === "2026-11-02")?.effective,
    ).toBe("PRESENT");
    expect(
      row1.days.find((d) => d.date === "2026-11-03")?.effective,
    ).toBe("HALF_DAY");

    // Lock without treat-as-absent should fail while unmarked remain
    const lockFail = await lockAttendanceMonth({
      month: MONTH,
      treatUnmarkedAsAbsent: false,
      actorId: adminId,
    });
    expect(lockFail.ok).toBe(false);

    const lockOk = await lockAttendanceMonth({
      month: MONTH,
      treatUnmarkedAsAbsent: true,
      actorId: adminId,
    });
    expect(lockOk.ok).toBe(true);

    const run = await prisma.payrollRun.findUnique({ where: { month: MONTH } });
    expect(run?.status).toBe(PayrollRunStatus.LOCKED);

    const markLocked = await batchMarkAttendance({
      month: MONTH,
      cells: [
        {
          employeeId: empId,
          date: "2026-11-04",
          status: AttendanceStatus.PRESENT,
        },
      ],
      actorId: adminId,
    });
    expect(markLocked.ok).toBe(false);

    const unlock = await unlockAttendanceMonth({
      month: MONTH,
      actorId: adminId,
    });
    expect(unlock.ok).toBe(true);

    if (holidayId) {
      const del = await deleteHoliday({ id: holidayId, actorId: adminId });
      expect(del.ok).toBe(true);
      holidayId = undefined;
    }
  });
});
