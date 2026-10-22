import Link from "next/link";
import { getPayrollRunDetail } from "@/server/payroll/runs";
import { getAttendanceGrid } from "@/server/payroll/attendance/grid";
import { RunDetail } from "@/components/payroll/run-detail";

export default async function PayrollRunMonthPage({
  params,
}: {
  params: Promise<{ month: string }>;
}) {
  const { month } = await params;
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return <p className="text-sm text-muted">Invalid month</p>;
  }

  const [detail, grid] = await Promise.all([
    getPayrollRunDetail(month),
    getAttendanceGrid(month),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/admin/payroll/runs"
          className="text-sm text-muted underline-offset-2 hover:underline"
        >
          ← Runs
        </Link>
        <h1 className="page-title mt-2">Payroll · {month}</h1>
      </div>
      <RunDetail
        month={month}
        status={detail.status}
        lines={detail.lines}
        totals={detail.totals}
        unmarkedHint={grid.unmarkedTotal}
        ecrSkipped={detail.ecrSkipped}
      />
    </div>
  );
}
