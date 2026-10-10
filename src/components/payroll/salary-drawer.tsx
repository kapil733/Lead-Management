"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { previewPayrollAction } from "@/server/payroll/actions";
import { formatINR } from "@/lib/money";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Preview = {
  employeeCode: string;
  fullName: string;
  clientName: string | null;
  locked: boolean;
  result: {
    payableDays: number;
    factor: number;
    earnedGrossPaise: number;
    pfEmployeePaise: number;
    esicEmployeePaise: number;
    otherEarningsPaise: number;
    otherDeductionsPaise: number;
    netPayPaise: number;
    netShortfallPaise: number;
    employerEpsPaise: number;
    employerEpfPaise: number;
    employerEsicPaise: number;
    componentsEarned: { label: string; earnedPaise: number }[];
  };
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; data: Preview };

export function SalaryDrawer({
  employeeId,
  month,
  open,
  onOpenChange,
}: {
  employeeId: string | null;
  month: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Salary · {month}</DialogTitle>
        </DialogHeader>
        {open && employeeId ? (
          <SalaryDrawerBody
            key={`${employeeId}-${month}`}
            employeeId={employeeId}
            month={month}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SalaryDrawerBody({
  employeeId,
  month,
}: {
  employeeId: string;
  month: string;
}) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void previewPayrollAction({ employeeId, month }).then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setState({ status: "error", message: res.error.message });
        return;
      }
      setState({ status: "ok", data: res.data as Preview });
    });
    return () => {
      cancelled = true;
    };
  }, [employeeId, month]);

  if (state.status === "loading") {
    return <p className="text-sm text-muted">Calculating…</p>;
  }
  if (state.status === "error") {
    return <p className="text-sm text-danger">{state.message}</p>;
  }

  const data = state.data;
  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="font-medium">{data.fullName}</p>
        <p className="text-muted">
          {data.employeeCode}
          {data.clientName ? ` · ${data.clientName}` : ""}
        </p>
      </div>
      <Row label="Payable days" value={String(data.result.payableDays)} />
      <Row label="Factor" value={data.result.factor.toFixed(4)} />
      {data.result.componentsEarned.map((c) => (
        <Row key={c.label} label={c.label} value={formatINR(c.earnedPaise)} />
      ))}
      <Row
        label="Earned gross"
        value={formatINR(data.result.earnedGrossPaise)}
      />
      <Row
        label="PF (employee)"
        value={formatINR(data.result.pfEmployeePaise)}
      />
      <Row
        label="ESIC (employee)"
        value={formatINR(data.result.esicEmployeePaise)}
      />
      {data.result.otherEarningsPaise > 0 ? (
        <Row
          label="Other earnings"
          value={formatINR(data.result.otherEarningsPaise)}
        />
      ) : null}
      {data.result.otherDeductionsPaise > 0 ? (
        <Row
          label="Other deductions"
          value={formatINR(data.result.otherDeductionsPaise)}
        />
      ) : null}
      <Row
        label="Net pay"
        value={formatINR(data.result.netPayPaise)}
        strong
      />
      {data.result.netShortfallPaise > 0 ? (
        <p className="text-xs text-danger">
          Shortfall {formatINR(data.result.netShortfallPaise)} (net floored at 0
          — not auto-loaned)
        </p>
      ) : null}
      <p className="text-xs text-muted">
        Employer PF{" "}
        {formatINR(
          data.result.employerEpsPaise + data.result.employerEpfPaise,
        )}{" "}
        · ESIC {formatINR(data.result.employerEsicPaise)}
      </p>
      <div className="flex flex-wrap gap-3 pt-1">
        <Link
          href={`/admin/payroll/employees/${employeeId}`}
          className="underline-offset-2 hover:underline"
        >
          Profile →
        </Link>
        <Link
          href={`/admin/payroll/runs/${month}`}
          className="underline-offset-2 hover:underline"
        >
          Run →
        </Link>
        <a
          href={`/api/admin/payroll/payslip/${employeeId}/${month}`}
          className="underline-offset-2 hover:underline"
        >
          Payslip PDF
        </a>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-1">
      <span className="text-muted">{label}</span>
      <span className={strong ? "font-semibold tabular-nums" : "tabular-nums"}>
        {value}
      </span>
    </div>
  );
}
