import "server-only";

import ExcelJS from "exceljs";
import { AttendanceStatus } from "@prisma/client";
import { getAttendanceGrid } from "@/server/payroll/attendance/grid";
import { batchMarkAttendance } from "@/server/payroll/attendance/mark";
import {
  daysInMonth,
  parseMonthKey,
  type ExplicitStatus,
} from "@/server/payroll/attendance/resolve";
import type {
  ImportDiffRow,
  ImportPreview,
} from "@/lib/payroll/attendance-types";

export type { ImportDiffRow, ImportPreview };

const CODE_TO_STATUS: Record<string, AttendanceStatus> = {
  P: AttendanceStatus.PRESENT,
  PRESENT: AttendanceStatus.PRESENT,
  "½": AttendanceStatus.HALF_DAY,
  HD: AttendanceStatus.HALF_DAY,
  HALF: AttendanceStatus.HALF_DAY,
  HALF_DAY: AttendanceStatus.HALF_DAY,
  A: AttendanceStatus.ABSENT,
  ABSENT: AttendanceStatus.ABSENT,
  PL: AttendanceStatus.PAID_LEAVE,
  PAID_LEAVE: AttendanceStatus.PAID_LEAVE,
  L: AttendanceStatus.PAID_LEAVE,
  WO: AttendanceStatus.WEEKLY_OFF,
  WEEKLY_OFF: AttendanceStatus.WEEKLY_OFF,
  W: AttendanceStatus.WEEKLY_OFF,
  HW: AttendanceStatus.HOLIDAY_WORKED,
  HOLIDAY_WORKED: AttendanceStatus.HOLIDAY_WORKED,
  H: AttendanceStatus.HOLIDAY_WORKED,
};

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v).trim();
  if (typeof v === "object" && "text" in v && typeof v.text === "string") {
    return v.text.trim();
  }
  if (typeof v === "object" && "result" in v) {
    return cellText(v.result as ExcelJS.CellValue);
  }
  return String(v).trim();
}

function parseStatus(raw: string): AttendanceStatus | null | "invalid" {
  if (!raw) return null; // clear / unmarked
  const key = raw.toUpperCase().replace(/\s+/g, "_");
  if (CODE_TO_STATUS[raw] != null) return CODE_TO_STATUS[raw]!;
  if (CODE_TO_STATUS[key] != null) return CODE_TO_STATUS[key]!;
  return "invalid";
}

/**
 * Matrix Excel: col A = Employee Code, cols B… = day 1..N of month.
 * Header row optional (Employee Code | 1 | 2 | …).
 */
export async function previewAttendanceImport(input: {
  month: string;
  buffer: Buffer;
}): Promise<ImportPreview> {
  const { year, month } = parseMonthKey(input.month);
  const dim = daysInMonth(year, month);
  const errors: string[] = [];

  const workbook = new ExcelJS.Workbook();
  // exceljs accepts Buffer
  await workbook.xlsx.load(input.buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return {
      month: input.month,
      diffs: [],
      setCount: 0,
      clearCount: 0,
      unchangedCount: 0,
      skipCount: 0,
      errors: ["Workbook has no worksheets"],
    };
  }

  const grid = await getAttendanceGrid(input.month);
  if (grid.locked) {
    return {
      month: input.month,
      diffs: [],
      setCount: 0,
      clearCount: 0,
      unchangedCount: 0,
      skipCount: 0,
      errors: ["Month is locked"],
    };
  }

  const byCode = new Map(
    grid.employees.map((e) => [e.employeeCode.toUpperCase(), e]),
  );

  const diffs: ImportDiffRow[] = [];
  let setCount = 0;
  let clearCount = 0;
  let unchangedCount = 0;
  let skipCount = 0;

  sheet.eachRow((row, rowNumber) => {
    const code = cellText(row.getCell(1).value);
    if (!code || /^employee/i.test(code)) return;
    const emp = byCode.get(code.toUpperCase());
    if (!emp) {
      errors.push(`Row ${rowNumber}: unknown employee code ${code}`);
      skipCount += 1;
      return;
    }

    for (let day = 1; day <= dim; day++) {
      const raw = cellText(row.getCell(day + 1).value);
      // Skip entirely blank cells (no change)
      if (raw === "" && row.getCell(day + 1).value == null) {
        continue;
      }
      const date = `${input.month}-${String(day).padStart(2, "0")}`;
      const dayResolved = emp.days.find((d) => d.date === date);
      if (!dayResolved || !dayResolved.editable) {
        if (raw) {
          skipCount += 1;
          diffs.push({
            employeeId: emp.id,
            employeeCode: emp.employeeCode,
            fullName: emp.fullName,
            date,
            current: dayResolved?.code ?? "",
            incoming: raw,
            action: "skip",
          });
        }
        continue;
      }

      const parsed = parseStatus(raw);
      if (parsed === "invalid") {
        errors.push(`Row ${rowNumber} day ${day}: invalid status "${raw}"`);
        skipCount += 1;
        continue;
      }

      const currentExplicit = dayResolved.explicit;
      const incoming: ExplicitStatus | null = parsed;
      const currentLabel = currentExplicit ?? "";
      const incomingLabel = incoming ?? "";

      if (currentExplicit === incoming) {
        unchangedCount += 1;
        continue;
      }

      if (incoming == null) {
        if (currentExplicit == null) {
          unchangedCount += 1;
          continue;
        }
        clearCount += 1;
        diffs.push({
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          fullName: emp.fullName,
          date,
          current: currentLabel,
          incoming: "",
          action: "clear",
        });
      } else {
        setCount += 1;
        diffs.push({
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          fullName: emp.fullName,
          date,
          current: currentLabel,
          incoming: incomingLabel,
          action: "set",
        });
      }
    }
  });

  return {
    month: input.month,
    diffs,
    setCount,
    clearCount,
    unchangedCount,
    skipCount,
    errors: errors.slice(0, 50),
  };
}

export async function applyAttendanceImport(input: {
  month: string;
  diffs: ImportDiffRow[];
  actorId: string;
}): Promise<
  | { ok: true; data: { written: number; cleared: number } }
  | { ok: false; error: string }
> {
  const cells: {
    employeeId: string;
    date: string;
    status: AttendanceStatus | null;
  }[] = [];
  for (const d of input.diffs) {
    if (d.action === "clear") {
      cells.push({ employeeId: d.employeeId, date: d.date, status: null });
      continue;
    }
    if (d.action !== "set") continue;
    const st =
      CODE_TO_STATUS[d.incoming] ??
      CODE_TO_STATUS[d.incoming.toUpperCase()] ??
      null;
    if (!st) {
      return { ok: false, error: `Cannot apply status ${d.incoming}` };
    }
    cells.push({ employeeId: d.employeeId, date: d.date, status: st });
  }

  return batchMarkAttendance({
    month: input.month,
    cells,
    actorId: input.actorId,
  });
}

export async function buildAttendanceTemplate(
  month: string,
): Promise<Buffer> {
  const grid = await getAttendanceGrid(month);
  const { year, month: m } = parseMonthKey(month);
  const dim = daysInMonth(year, m);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Attendance");
  const header = ["Employee Code", "Name"];
  for (let d = 1; d <= dim; d++) header.push(String(d));
  ws.addRow(header);
  for (const emp of grid.employees) {
    const row: (string | number)[] = [emp.employeeCode, emp.fullName];
    for (const day of emp.days) {
      row.push(day.explicit ? day.code : "");
    }
    ws.addRow(row);
  }
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
