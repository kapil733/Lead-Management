"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  lockMonthAction,
  recalculateRunAction,
  unlockMonthAction,
} from "@/server/payroll/actions";
import { formatINR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Line = {
  id: string;
  employeeId: string;
  employeeCode: string;
  fullName: string;
  clientName: string | null;
  payableDays: number;
  earnedGrossPaise: number;
  pfEmployeePaise: number;
  esicEmployeePaise: number;
  otherEarningsPaise: number;
  otherDeductionsPaise: number;
  netPayPaise: number;
  employerPfPaise: number;
  employerEsicPaise: number;
};

type EcrSkip = {
  employeeCode: string;
  fullName: string;
};

type Totals = {
  earnedGrossPaise: number;
  pfEmployeePaise: number;
  esicEmployeePaise: number;
  netPayPaise: number;
  employerPfPaise: number;
  employerEsicPaise: number;
};

export function RunDetail({
  month,
  status,
  lines,
  totals,
  unmarkedHint,
  ecrSkipped,
}: {
  month: string;
  status: "DRAFT" | "LOCKED";
  lines: Line[];
  totals: Totals;
  unmarkedHint: number;
  ecrSkipped: EcrSkip[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lockOpen, setLockOpen] = useState(false);
  const [treatAbsent, setTreatAbsent] = useState(false);
  const locked = status === "LOCKED";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={locked ? "warning" : "info"}>{status}</Badge>
        <span className="text-sm text-muted">{lines.length} employees</span>
        <div className="ml-auto flex flex-wrap gap-2">
          {!locked ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const res = await recalculateRunAction({ month });
                  if (!res.ok) {
                    toast.error(res.error.message);
                    return;
                  }
                  toast.success(`Recalculated ${res.data.lineCount} lines`);
                  router.refresh();
                });
              }}
            >
              Recalculate
            </Button>
          ) : null}
          {!locked ? (
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={() => setLockOpen(true)}
            >
              Lock
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const res = await unlockMonthAction({ month });
                  if (!res.ok) {
                    toast.error(res.error.message);
                    return;
                  }
                  toast.success("Unlocked");
                  router.refresh();
                });
              }}
            >
              Unlock
            </Button>
          )}
          <a href={`/api/admin/payroll/runs/${month}/export?kind=register`}>
            <Button type="button" size="sm" variant="secondary">
              Register
            </Button>
          </a>
          <a href={`/api/admin/payroll/runs/${month}/export?kind=pf`}>
            <Button type="button" size="sm" variant="secondary">
              PF
            </Button>
          </a>
          <a href={`/api/admin/payroll/runs/${month}/export?kind=ecr`}>
            <Button type="button" size="sm" variant="secondary">
              ECR
            </Button>
          </a>
          <a href={`/api/admin/payroll/runs/${month}/export?kind=esic`}>
            <Button type="button" size="sm" variant="secondary">
              ESIC
            </Button>
          </a>
          <a href={`/api/admin/payroll/runs/${month}/export?kind=payslips`}>
            <Button type="button" size="sm" variant="secondary">
              Payslip ZIP
            </Button>
          </a>
        </div>
      </div>

      {ecrSkipped.length > 0 ? (
        <p className="text-sm text-muted">
          Left out of ECR (UAN missing or not 12 digits):{" "}
          {ecrSkipped
            .map((row) => `${row.fullName} (${row.employeeCode})`)
            .join(", ")}
        </p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6 text-sm">
        <Stat label="Earned gross" value={formatINR(totals.earnedGrossPaise)} />
        <Stat label="PF emp." value={formatINR(totals.pfEmployeePaise)} />
        <Stat label="ESIC emp." value={formatINR(totals.esicEmployeePaise)} />
        <Stat label="Net pay" value={formatINR(totals.netPayPaise)} />
        <Stat label="Employer PF" value={formatINR(totals.employerPfPaise)} />
        <Stat label="Employer ESIC" value={formatINR(totals.employerEsicPaise)} />
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-xs">
          <thead className="bg-surface-2 text-left">
            <tr>
              <th className="px-2 py-2 font-medium">Code</th>
              <th className="px-2 py-2 font-medium">Name</th>
              <th className="px-2 py-2 font-medium text-right">Days</th>
              <th className="px-2 py-2 font-medium text-right">Gross</th>
              <th className="px-2 py-2 font-medium text-right">PF</th>
              <th className="px-2 py-2 font-medium text-right">ESIC</th>
              <th className="px-2 py-2 font-medium text-right">Net</th>
              <th className="px-2 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-muted">
                  No lines — click Recalculate
                </td>
              </tr>
            ) : (
              lines.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-2 py-1.5 tabular-nums">{l.employeeCode}</td>
                  <td className="px-2 py-1.5">
                    <div>{l.fullName}</div>
                    {l.clientName ? (
                      <div className="text-[10px] text-muted">{l.clientName}</div>
                    ) : null}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {l.payableDays}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatINR(l.earnedGrossPaise)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatINR(l.pfEmployeePaise)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatINR(l.esicEmployeePaise)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums font-medium">
                    {formatINR(l.netPayPaise)}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <a
                      href={`/api/admin/payroll/payslip/${l.employeeId}/${month}`}
                      className="underline-offset-2 hover:underline"
                    >
                      PDF
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted">
        Attendance:{" "}
        <Link
          href={`/admin/payroll/attendance?month=${month}`}
          className="underline-offset-2 hover:underline"
        >
          open grid
        </Link>
      </p>

      <Dialog open={lockOpen} onOpenChange={setLockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lock {month}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted">
            Recalculates PayrollLines and freezes attendance + lines. Later
            statutory changes will not alter locked snapshots.
          </p>
          {unmarkedHint > 0 ? (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={treatAbsent}
                onChange={(e) => setTreatAbsent(e.target.checked)}
              />
              <span>
                Treat {unmarkedHint} unmarked working day(s) as Absent
              </span>
            </label>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const res = await lockMonthAction({
                    month,
                    treatUnmarkedAsAbsent: treatAbsent,
                  });
                  if (!res.ok) {
                    toast.error(res.error.message);
                    return;
                  }
                  toast.success("Month locked with snapshots");
                  setLockOpen(false);
                  router.refresh();
                });
              }}
            >
              Lock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted">
        {label}
      </div>
      <div className="tabular-nums font-medium">{value}</div>
    </div>
  );
}
