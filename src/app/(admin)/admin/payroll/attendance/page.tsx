import { getAttendanceGrid } from "@/server/payroll/attendance/grid";
import { AttendanceGrid } from "@/components/payroll/attendance-grid";
import { listHolidays } from "@/server/payroll/holidays";
import { PageIntro } from "@/components/shared/page-intro";

function defaultMonth(): string {
  // Demo seed centres on Sep 2026; fall back to IST current month later.
  return "2026-09";
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const month =
    sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : defaultMonth();
  const year = Number(month.slice(0, 4));
  const [grid, holidays] = await Promise.all([
    getAttendanceGrid(month),
    listHolidays(year),
  ]);

  return (
    <div className="space-y-3">
      <PageIntro
        kicker="Payroll · monthly grid"
        title="Attendance"
        description="Click a cell, press a hotkey, or Ctrl/Cmd+click to mark Present. Right-click for menus."
      />
      <AttendanceGrid key={grid.month} initial={grid} holidays={holidays} />
    </div>
  );
}
