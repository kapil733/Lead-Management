"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DayDivisor } from "@prisma/client";
import { createStatutoryConfigAction } from "@/server/payroll/actions";
import { formatINR } from "@/lib/money";
import type { StatutoryRates } from "@/server/payroll/calc/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function StatutorySettings({
  configs,
}: {
  configs: StatutoryRates[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const latest = configs[0];

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const pct = (name: string) => Number(fd.get(name)) / 100;
    const payload = {
      effectiveFrom: String(fd.get("effectiveFrom") ?? ""),
      pfEmployeeRate: pct("pfEmployeeRate"),
      pfEmployerEpsRate: pct("pfEmployerEpsRate"),
      pfEmployerEpfRate: pct("pfEmployerEpfRate"),
      pfWageCeilingPaise: Math.round(Number(fd.get("pfWageCeiling")) * 100),
      edliRate: pct("edliRate"),
      pfAdminRate: pct("pfAdminRate"),
      esicEmployeeRate: pct("esicEmployeeRate"),
      esicEmployerRate: pct("esicEmployerRate"),
      esicWageCeilingPaise: Math.round(Number(fd.get("esicWageCeiling")) * 100),
      dayDivisor: String(fd.get("dayDivisor")) as DayDivisor,
    };
    startTransition(async () => {
      const res = await createStatutoryConfigAction(payload);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Statutory config saved");
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        Verify rates with your CA / EPFO / ESIC notifications before relying on
        payroll.
      </p>

      <form
        onSubmit={onSubmit}
        className="grid gap-3 rounded-md border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <h2 className="sm:col-span-2 lg:col-span-3 text-sm font-semibold">
          Add new effective-dated config
        </h2>
        <Field
          label="Effective from"
          name="effectiveFrom"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          required
        />
        <Field
          label="PF employee %"
          name="pfEmployeeRate"
          type="number"
          step="0.01"
          defaultValue={String((latest?.pfEmployeeRate ?? 0.12) * 100)}
          required
        />
        <Field
          label="Employer EPS %"
          name="pfEmployerEpsRate"
          type="number"
          step="0.01"
          defaultValue={String((latest?.pfEmployerEpsRate ?? 0.0833) * 100)}
          required
        />
        <Field
          label="Employer EPF % (info)"
          name="pfEmployerEpfRate"
          type="number"
          step="0.01"
          defaultValue={String((latest?.pfEmployerEpfRate ?? 0.0367) * 100)}
          required
        />
        <Field
          label="PF wage ceiling (₹)"
          name="pfWageCeiling"
          type="number"
          defaultValue={String((latest?.pfWageCeilingPaise ?? 1500000) / 100)}
          required
        />
        <Field
          label="EDLI %"
          name="edliRate"
          type="number"
          step="0.01"
          defaultValue={String((latest?.edliRate ?? 0.005) * 100)}
          required
        />
        <Field
          label="PF admin %"
          name="pfAdminRate"
          type="number"
          step="0.01"
          defaultValue={String((latest?.pfAdminRate ?? 0.005) * 100)}
          required
        />
        <Field
          label="ESIC employee %"
          name="esicEmployeeRate"
          type="number"
          step="0.01"
          defaultValue={String((latest?.esicEmployeeRate ?? 0.0075) * 100)}
          required
        />
        <Field
          label="ESIC employer %"
          name="esicEmployerRate"
          type="number"
          step="0.01"
          defaultValue={String((latest?.esicEmployerRate ?? 0.0325) * 100)}
          required
        />
        <Field
          label="ESIC wage ceiling (₹)"
          name="esicWageCeiling"
          type="number"
          defaultValue={String((latest?.esicWageCeilingPaise ?? 2100000) / 100)}
          required
        />
        <div className="space-y-1">
          <Label htmlFor="dayDivisor">Day divisor</Label>
          <select
            id="dayDivisor"
            name="dayDivisor"
            className="flex h-10 w-full rounded-[var(--radius-control)] border border-border px-3 text-sm"
            defaultValue={latest?.dayDivisor ?? "CALENDAR_DAYS"}
          >
            <option value="CALENDAR_DAYS">Calendar days</option>
            <option value="FIXED_30">Fixed 30</option>
            <option value="WORKING_DAYS">Working days</option>
          </select>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <Button type="submit" disabled={isPending}>
            Save new config
          </Button>
        </div>
      </form>

      <div>
        <h2 className="mb-2 text-sm font-semibold">History</h2>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left">
              <tr>
                <th className="px-3 py-2">Effective</th>
                <th className="px-3 py-2">PF %</th>
                <th className="px-3 py-2">EPS %</th>
                <th className="px-3 py-2">PF ceiling</th>
                <th className="px-3 py-2">ESIC emp %</th>
                <th className="px-3 py-2">ESIC ceiling</th>
                <th className="px-3 py-2">Divisor</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-3 py-2 tabular-nums">{c.effectiveFrom}</td>
                  <td className="px-3 py-2">{(c.pfEmployeeRate * 100).toFixed(2)}</td>
                  <td className="px-3 py-2">
                    {(c.pfEmployerEpsRate * 100).toFixed(2)}
                  </td>
                  <td className="px-3 py-2">
                    {formatINR(c.pfWageCeilingPaise)}
                  </td>
                  <td className="px-3 py-2">
                    {(c.esicEmployeeRate * 100).toFixed(2)}
                  </td>
                  <td className="px-3 py-2">
                    {formatINR(c.esicWageCeilingPaise)}
                  </td>
                  <td className="px-3 py-2">{c.dayDivisor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Field(props: {
  label: string;
  name: string;
  type?: string;
  step?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={props.name}>{props.label}</Label>
      <Input
        id={props.name}
        name={props.name}
        type={props.type ?? "text"}
        step={props.step}
        defaultValue={props.defaultValue}
        required={props.required}
      />
    </div>
  );
}
