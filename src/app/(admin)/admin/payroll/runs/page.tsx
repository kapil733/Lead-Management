import Link from "next/link";
import { listPayrollRuns } from "@/server/payroll/runs";
import { Badge } from "@/components/ui/badge";
import { PageIntro } from "@/components/shared/page-intro";

export default async function PayrollRunsPage() {
  const runs = await listPayrollRuns();

  return (
    <div className="space-y-4">
      <PageIntro
        kicker="Payroll · monthly close"
        title="Payroll runs"
        description="Recalculate, lock, export the register, PF and ESIC files, and download payslips."
      />

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Month</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Lines</th>
              <th className="px-3 py-2 font-medium">Locked</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-muted">
                  No runs yet — open a month from Attendance or create via
                  Recalculate on a month detail.
                </td>
              </tr>
            ) : (
              runs.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2 tabular-nums">
                    <Link
                      href={`/admin/payroll/runs/${r.month}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {r.month}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant={r.status === "LOCKED" ? "warning" : "info"}
                    >
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{r.lineCount}</td>
                  <td className="px-3 py-2 text-muted">
                    {r.lockedAt
                      ? `${r.lockedAt.slice(0, 10)}${
                          r.lockedBy ? ` · ${r.lockedBy.name}` : ""
                        }`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link href={`/admin/payroll/runs/${r.month}`}>
                      Open →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted">
        Tip: open{" "}
        <Link
          href="/admin/payroll/runs/2026-09"
          className="underline-offset-2 hover:underline"
        >
          2026-09
        </Link>{" "}
        (seed DRAFT) to recalculate.
      </p>
    </div>
  );
}
