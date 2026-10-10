import type { ContractEmployeeStatus } from "@prisma/client";
import type {
  ExplicitStatus,
  ResolvedDay,
} from "@/server/payroll/attendance/resolve";

export type AttendanceEmployeeRow = {
  id: string;
  employeeCode: string;
  fullName: string;
  clientName: string | null;
  status: ContractEmployeeStatus;
  weeklyOffDays: number[];
  dateOfJoining: string;
  dateOfExit: string | null;
  days: ResolvedDay[];
  payableDays: number;
  unmarkedWorking: number;
};

export type AttendanceGridData = {
  month: string;
  dates: string[];
  locked: boolean;
  lockedAt: string | null;
  runId: string | null;
  holidays: { date: string; name: string; isPaid: boolean }[];
  employees: AttendanceEmployeeRow[];
  unmarkedTotal: number;
};

export type ImportDiffRow = {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  date: string;
  current: string;
  incoming: string;
  action: "set" | "clear" | "unchanged" | "skip";
};

export type ImportPreview = {
  month: string;
  diffs: ImportDiffRow[];
  setCount: number;
  clearCount: number;
  unchangedCount: number;
  skipCount: number;
  errors: string[];
};

export type { ExplicitStatus, ResolvedDay };
